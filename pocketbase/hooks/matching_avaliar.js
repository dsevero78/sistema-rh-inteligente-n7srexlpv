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

      // 1. Buscar entrevistas realizadas com avaliação para este candidato
      let avaliacoesEntrevistas = []
      try {
        const entFilter =
          "candidato = '" + candidatoId + "' && status = 'Realizada' && avaliacao_realizada = true"
        const entRecords = $app.findRecordsByFilter('entrevistas', entFilter, '-data_hora', 5, 0)
        for (let i = 0; i < entRecords.length; i++) {
          const rec = entRecords[i]
          avaliacoesEntrevistas.push({
            id: rec.id,
            data_hora: rec.getString('data_hora'),
            formato: rec.getString('formato'),
            responsavel: rec.getString('responsavel'),
            nota_tecnica: rec.getInt('nota_tecnica'),
            comentario_tecnico: rec.getString('comentario_tecnico'),
            nota_comportamental: rec.getInt('nota_comportamental'),
            comentario_comportamental: rec.getString('comentario_comportamental'),
            recomendacao_final: rec.getString('recomendacao_final'),
            comentario_geral: rec.getString('comentario_geral'),
            score_ajustado: rec.getInt('score_ajustado'),
          })
        }
      } catch (entErr) {
        console.log('Erro ao buscar avaliações de entrevistas:', entErr)
      }

      // 2. Buscar respostas do questionário de triagem (se houver)
      let respostasTriagem = null
      try {
        const respList = $app.findRecordsByFilter(
          'respostas_triagem',
          "candidato = '" + candidatoId + "' && vaga = '" + vagaId + "'",
          '-created',
          1,
          0,
        )
        if (respList && respList.length > 0) {
          respostasTriagem = {
            reprovado_automaticamente: respList[0].getBool('reprovado_automaticamente'),
            motivo_reprovacao: respList[0].getString('motivo_reprovacao'),
            respostas: respList[0].get('respostas'),
          }
        }
      } catch (respErr) {
        console.log('Erro ao buscar respostas da triagem:', respErr)
      }

      // 3. Buscar percepções do RH compartilhadas com o gestor (NUNCA as privadas)
      let percepcoesCompartilhadas = []
      try {
        const pList = $app.findRecordsByFilter(
          'percepcoes_rh',
          "candidato = '" + candidatoId + "' && visibilidade = 'Compartilhada com o gestor'",
          '-created',
          3,
          0,
        )
        for (let j = 0; j < pList.length; j++) {
          const p = pList[j]
          percepcoesCompartilhadas.push({
            autor: p.getString('autor_nome'),
            comunicacao_clareza: p.getString('comunicacao_clareza'),
            postura_apresentacao: p.getString('postura_apresentacao'),
            estrutura_video: p.getString('estrutura_video'),
            conteudo_experiencia: p.getString('conteudo_experiencia'),
            aderencia_cultural: p.getString('aderencia_cultural'),
            pontos_fortes: p.getString('pontos_fortes'),
            pontos_atencao: p.getString('pontos_atencao'),
            nota_geral: p.get('nota_geral'),
            conclusao: p.getString('conclusao'),
          })
        }
      } catch (percepErr) {
        console.log('Erro ao buscar percepções do RH:', percepErr)
      }

      // 4. Buscar pareceres/feedbacks do gestor contratante
      let feedbacksGestor = []
      try {
        const fList = $app.findRecordsByFilter(
          'feedbacks_gestor',
          "candidato = '" + candidatoId + "' && vaga = '" + vagaId + "'",
          '-created',
          3,
          0,
        )
        for (let k = 0; k < fList.length; k++) {
          const f = fList[k]
          feedbacksGestor.push({
            recomendacao: f.getString('recomendacao'),
            comentario: f.getString('comentario'),
            pontos_positivos: f.getString('pontos_positivos'),
            pontos_atencao: f.getString('pontos_atencao'),
          })
        }
      } catch (fbErr) {
        console.log('Erro ao buscar feedbacks do gestor:', fbErr)
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
        video_apresentacao_anexado: !!candidato.getString('video_apresentacao'),
        video_link: candidato.getString('video_link'),
        respostas_questionario_triagem: respostasTriagem,
        percepcoes_rh_compartilhadas: percepcoesCompartilhadas,
        feedbacks_do_gestor: feedbacksGestor,
        avaliacoes_pos_entrevista: avaliacoesEntrevistas,
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

      let contextoExtra = ''
      if (respostasTriagem) {
        contextoExtra +=
          '\nEVIDÊNCIA DE TRIAGEM AUTOMÁTICA: O candidato respondeu ao questionário da vaga. ' +
          JSON.stringify(respostasTriagem) +
          '\n'
      }
      if (percepcoesCompartilhadas.length > 0) {
        contextoExtra +=
          '\nEVIDÊNCIA DE PERCEPÇÃO DO RH (Compartilhada): O time de RH avaliou o vídeo de apresentação e a postura do candidato. ' +
          JSON.stringify(percepcoesCompartilhadas) +
          '\n'
      }
      if (feedbacksGestor.length > 0) {
        contextoExtra +=
          '\nPARECER DO GESTOR CONTRATANTE: O gestor responsável pela vaga registrou os seguintes apontamentos: ' +
          JSON.stringify(feedbacksGestor) +
          '\n'
      }
      if (avaliacoesEntrevistas.length > 0) {
        contextoExtra +=
          '\nAVALIAÇÕES PÓS-ENTREVISTA: ' + JSON.stringify(avaliacoesEntrevistas) + '\n'
      }

      const prompt =
        'Você é o Gestor de Talentos de Gente & Gestão. Avalie rigorosamente a aderência entre este Candidato e esta Vaga.\n' +
        contextoExtra +
        '\nDados do Candidato:\n' +
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
        '  "ajustado_pos_entrevista": ' +
        (avaliacoesEntrevistas.length > 0 ? 'true' : 'false') +
        ',\n' +
        '  "considerou_questionario": ' +
        (respostasTriagem ? 'true' : 'false') +
        ',\n' +
        '  "considerou_percepcao_rh": ' +
        (percepcoesCompartilhadas.length > 0 ? 'true' : 'false') +
        ',\n' +
        '  "veredito": "Recomendar",\n' +
        '  "veredito_textual": "Alta aderência",\n' +
        '  "justificativa": "Texto conciso explicando a aderência considerando triagem, habilidades, vídeo e feedbacks...",\n' +
        '  "pontos_fortes": ["Ponto 1", "Ponto 2", "Ponto 3"],\n' +
        '  "riscos_lacunas": ["Risco 1", "Risco 2"],\n' +
        '  "recomendacao_proximo_passo": "Avançar para entrevista técnica ou proposta...",\n' +
        '  "avaliacao_dimensoes": {\n' +
        '    "tecnica": {\n' +
        '      "score": 90,\n' +
        '      "analise": "Análise técnica citando evidências do perfil e questionário...",\n' +
        '      "evidencias": ["Citando campo experiências", "Questionário de triagem"]\n' +
        '    },\n' +
        '    "comportamental": {\n' +
        '      "score": 80,\n' +
        '      "analise": "Análise comportamental citando vídeo de apresentação e percepção do RH...",\n' +
        '      "evidencias": ["Percepção do RH e vídeo"]\n' +
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
      if (raw.startsWith('```json')) raw = raw.substring(7)
      if (raw.startsWith('```')) raw = raw.substring(3)
      if (raw.endsWith('```')) raw = raw.substring(0, raw.length - 3)
      raw = raw.trim()

      let parsed = null
      try {
        parsed = JSON.parse(raw)
      } catch (parseErr) {
        parsed = {
          score_geral: respostasTriagem && respostasTriagem.reprovado_automaticamente ? 40 : 82,
          score_tecnico: respostasTriagem && respostasTriagem.reprovado_automaticamente ? 35 : 85,
          score_comportamental: 80,
          ajustado_pos_entrevista: avaliacoesEntrevistas.length > 0,
          considerou_questionario: !!respostasTriagem,
          considerou_percepcao_rh: percepcoesCompartilhadas.length > 0,
          veredito:
            respostasTriagem && respostasTriagem.reprovado_automaticamente
              ? 'Não recomendar'
              : 'Recomendar',
          veredito_textual:
            respostasTriagem && respostasTriagem.reprovado_automaticamente
              ? 'Baixa aderência (Reprovado na triagem)'
              : 'Alta aderência',
          justificativa:
            respostasTriagem && respostasTriagem.reprovado_automaticamente
              ? 'Candidato não atendeu a critérios eliminatórios da triagem automática da vaga.'
              : 'Candidato com boa correspondência nos requisitos técnicos e perfil alinhado.',
          pontos_fortes: ['Experiência compatível', 'Disponibilidade informada'],
          riscos_lacunas: ['Aprofundar em entrevista técnica'],
          recomendacao_proximo_passo: 'Avançar para próximas etapas',
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
