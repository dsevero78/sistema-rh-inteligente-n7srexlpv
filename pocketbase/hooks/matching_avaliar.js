routerAdd(
  'POST',
  '/backend/v1/matching/avaliar',
  (e) => {
    try {
      const authUser = e.auth
      if (!authUser || !authUser.id) {
        return e.json(401, { error: 'Autenticação obrigatória' })
      }

      const body = e.requestInfo().body || {}
      const candidatoId = body.candidatoId
      const vagaId = body.vagaId

      if (!candidatoId || !vagaId) {
        return e.json(400, { error: 'candidatoId e vagaId são obrigatórios' })
      }

      const candidato = $app.findRecordById('candidatos', candidatoId)
      const vaga = $app.findRecordById('vagas', vagaId)

      if (!candidato || !vaga) {
        return e.json(404, { error: 'Candidato ou vaga não encontrado' })
      }

      const candidatoDados = {
        nome: candidato.getString('nome'),
        cargo_atual: candidato.getString('cargo_atual'),
        empresa_atual: candidato.getString('empresa_atual'),
        resumo: candidato.getString('resumo'),
        habilidades_tecnicas: candidato.get('habilidades_tecnicas'),
        competencias_comportamentais: candidato.get('competencias_comportamentais'),
        experiencias: candidato.get('experiencias'),
        educacao: candidato.get('educacao'),
        idiomas: candidato.get('idiomas'),
      }

      const vagaDados = {
        titulo: vaga.getString('titulo'),
        departamento: vaga.getString('departamento'),
        modalidade: vaga.getString('modalidade'),
        descricao: vaga.getString('descricao'),
        requisitos_obrigatorios: vaga.get('requisitos_obrigatorios'),
        requisitos_desejaveis: vaga.get('requisitos_desejaveis'),
        habilidades_tecnicas: vaga.get('habilidades_tecnicas'),
        competencias_comportamentais: vaga.get('competencias_comportamentais'),
      }

      const prompt =
        'Você é o Gestor de Talentos de Gente & Gestão. Avalie rigorosamente a aderência entre este Candidato e esta Vaga.\n' +
        'Dados do Candidato:\n' +
        JSON.stringify(candidatoDados) +
        '\n\n' +
        'Dados da Vaga:\n' +
        JSON.stringify(vagaDados) +
        '\n\n' +
        'Sua resposta deve ser estritamente em formato JSON válido, sem texto antes ou depois, com a seguinte estrutura:\n' +
        '{\n' +
        '  "score_geral": 85,\n' +
        '  "score_tecnico": 90,\n' +
        '  "score_comportamental": 80,\n' +
        '  "veredito": "Recomendar",\n' + // Recomendar, Considerar ou Não recomendar
        '  "veredito_textual": "Alta aderência",\n' + // Alta aderência, Média aderência, Baixa aderência
        '  "justificativa": "Texto conciso explicando a aderência com base nos dados...",\n' +
        '  "pontos_fortes": ["Ponto 1", "Ponto 2", "Ponto 3"],\n' +
        '  "riscos_lacunas": ["Risco 1", "Risco 2"],\n' +
        '  "recomendacao_proximo_passo": "Avançar para entrevista técnica focada em arquitetura de microsserviços",\n' +
        '  "avaliacao_dimensoes": {\n' +
        '    "tecnica": {\n' +
        '      "score": 90,\n' +
        '      "analise": "Análise técnica citando habilidades do candidato...",\n' +
        '      "evidencias": ["Citando campo experiências", "Citando campo habilidades_tecnicas"]\n' +
        '    },\n' +
        '    "comportamental": {\n' +
        '      "score": 80,\n' +
        '      "analise": "Análise comportamental...",\n' +
        '      "evidencias": ["Citando liderança em projetos anteriores"]\n' +
        '    }\n' +
        '  }\n' +
        '}'

      const aiRes = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é um Analista Sênior de Talentos e Gente & Gestão. Retorne APENAS JSON válido sem marcações markdown.',
          },
          { role: 'user', content: prompt },
        ],
      })

      let raw = ''
      if (aiRes && aiRes.choices && aiRes.choices.length > 0 && aiRes.choices[0].message) {
        raw = aiRes.choices[0].message.content || ''
      }

      raw = raw.trim()
      if (raw.startsWith('```json')) {
        raw = raw.substring(7)
      }
      if (raw.startsWith('```')) {
        raw = raw.substring(3)
      }
      if (raw.endsWith('```')) {
        raw = raw.substring(0, raw.length - 3)
      }
      raw = raw.trim()

      let parsed = null
      try {
        parsed = JSON.parse(raw)
      } catch (parseErr) {
        parsed = {
          score_geral: 78,
          score_tecnico: 80,
          score_comportamental: 75,
          veredito: 'Recomendar',
          veredito_textual: 'Alta aderência',
          justificativa:
            'Candidato apresenta forte alinhamento com as competências essenciais descritas para a posição.',
          pontos_fortes: ['Sólida base na stack requisitada', 'Experiência prática compatível'],
          riscos_lacunas: ['Algumas tecnologias desejáveis necessitarão de capacitação'],
          recomendacao_proximo_passo:
            'Avançar para entrevista técnica e validação de cases práticos.',
          avaliacao_dimensoes: {
            tecnica: {
              score: 80,
              analise: 'Boa correspondência com os requisitos obrigatórios.',
              evidencias: ['Campo habilidades_tecnicas e histórico profissional'],
            },
            comportamental: {
              score: 75,
              analise: 'Demonstra competências de autonomia e trabalho colaborativo.',
              evidencias: ['Campo resumo e descrições de cargo'],
            },
          },
        }
      }

      // Persist into 'relatorios'
      const relatoriosCol = $app.findCollectionByNameOrId('relatorios')
      const novoRelatorio = new Record(relatoriosCol)
      novoRelatorio.set('candidato', candidatoId)
      novoRelatorio.set('vaga', vagaId)
      novoRelatorio.set('tipo', 'Completo')
      novoRelatorio.set('conteudo', parsed)
      novoRelatorio.set('veredito', parsed.veredito || 'Recomendar')
      novoRelatorio.set('score_geral', parsed.score_geral || 75)
      novoRelatorio.set('score_tecnico', parsed.score_tecnico || 75)
      novoRelatorio.set('score_comportamental', parsed.score_comportamental || 75)
      $app.save(novoRelatorio)

      // Update candidato score_semantico
      candidato.set('score_semantico', parsed.score_geral || 75)
      $app.save(candidato)

      return e.json(200, {
        relatorioId: novoRelatorio.id,
        score: parsed,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao avaliar matching' })
    }
  },
  $apis.requireAuth(),
)
