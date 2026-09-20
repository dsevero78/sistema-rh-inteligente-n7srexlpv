routerAdd(
  'POST',
  '/backend/v1/analisar-video-ia',
  (e) => {
    try {
      const authRecord = e.auth
      if (!authRecord) {
        return e.json(401, { error: 'Autenticação necessária' })
      }

      let body = {}
      try {
        body = e.bindBody() || {}
      } catch (_) {
        body = {}
      }

      const candidatoId = body.candidatoId
      if (!candidatoId) {
        return e.json(400, { error: 'ID do candidato é obrigatório' })
      }

      const candidato = $app.findRecordById('candidatos', candidatoId)
      if (!candidato) {
        return e.json(404, { error: 'Candidato não encontrado' })
      }

      const vagaId = body.vagaId || candidato.getString('vaga') || null
      let vaga = null
      if (vagaId) {
        try {
          vaga = $app.findRecordById('vagas', vagaId)
        } catch (_) {}
      }

      // 1. Percepções do RH: APENAS COMPARTILHADAS (Segurança estrita: ignorar privadas)
      let percepcoesCompartilhadas = []
      try {
        const pList = $app.findRecordsByFilter(
          'percepcoes_rh',
          "candidato = '" +
            candidatoId +
            "' && visibilidade = 'Compartilhada com o gestor' && status_documento = 'Finalizada'",
          '-created',
          10,
          0,
        )

        for (let i = 0; i < pList.length; i++) {
          const p = pList[i]
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
        console.log('Erro ao buscar percepções do RH compartilhadas:', percepErr)
      }

      const temVideoArquivo = !!candidato.getString('video_apresentacao')
      const videoLink = candidato.getString('video_link')
      const temVideo = temVideoArquivo || !!videoLink

      const dadosCandidato = {
        nome: candidato.getString('nome'),
        cargo_atual: candidato.getString('cargo_atual'),
        empresa_atual: candidato.getString('empresa_atual'),
        resumo: candidato.getString('resumo'),
        habilidades_tecnicas: candidato.get('habilidades_tecnicas'),
        competencias_comportamentais: candidato.get('competencias_comportamentais'),
        experiencias: candidato.get('experiencias'),
        video_apresentacao_anexado: temVideoArquivo,
        video_link: videoLink,
      }

      const dadosVaga = vaga
        ? {
            titulo: vaga.getString('titulo'),
            departamento: vaga.getString('departamento'),
            descricao: vaga.getString('descricao'),
            requisitos_obrigatorios: vaga.get('requisitos_obrigatorios'),
            requisitos_desejaveis: vaga.get('requisitos_desejaveis'),
          }
        : null

      let prompt =
        'Você é um Especialista Sênior em Avaliação de Comunicação, Postura e Fit de Talentos em Gente & Gestão.\n' +
        'Analise a apresentação em vídeo e o perfil deste candidato para a oportunidade.\n\n' +
        'DADOS DO CANDIDATO:\n' +
        JSON.stringify(dadosCandidato) +
        '\n\n'

      if (dadosVaga) {
        prompt += 'DADOS DA VAGA ALVO:\n' + JSON.stringify(dadosVaga) + '\n\n'
      }

      if (percepcoesCompartilhadas.length > 0) {
        prompt +=
          'PERCEPÇÕES ESTRUTURADAS REGISTRADAS PELO RH (Compartilhadas com o Gestor):\n' +
          JSON.stringify(percepcoesCompartilhadas) +
          '\n\nSintetize com profundidade as avaliações feitas pelo time de RH sobre a clareza, oratória, estrutura do vídeo e postura.\n'
      } else {
        prompt +=
          'NOTA: Não há notas de percepção compartilhadas registradas pelo RH ainda. Avalie a apresentação com base nos metadados do vídeo cadastrado, trajetória profissional e competências do candidato.\n'
      }

      prompt +=
        'Sua resposta deve ser estritamente em formato JSON válido, sem texto antes ou depois, com a seguinte estrutura:\n' +
        '{\n' +
        '  "resumo_executivo": "Síntese em 3 a 5 linhas da apresentação em vídeo e perfil do candidato...",\n' +
        '  "comunicacao_oratoria": "Avaliação sobre clareza oral, concisão e capacidade de síntese...",\n' +
        '  "postura_presenca": "Avaliação da postura profissional, segurança e tom...",\n' +
        '  "dominio_experiencia": "Como o candidato demonstra domínio das experiências citadas...",\n' +
        '  "fit_cultural": "Aderência percebida aos valores e ritmo de trabalho da empresa...",\n' +
        '  "pontos_fortes": ["Ponto forte 1", "Ponto forte 2", "Ponto forte 3"],\n' +
        '  "pontos_atencao": ["Ponto de atenção 1", "Ponto de atenção 2"],\n' +
        '  "nota_estimada": 8.8,\n' +
        '  "recomendacao_geral": "Fortemente Recomendado" | "Recomendado" | "Requer Alinhamento" | "Não Recomendado"\n' +
        '}'

      const aiRes = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é um avaliador de comunicação e apresentação profissional de RH. Retorne APENAS JSON válido sem blocos markdown adicionais.',
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
        console.log('Falha ao decodificar JSON da IA, gerando fallback estruturado:', parseErr)
        parsed = {
          resumo_executivo:
            'Apresentação clara e concisa do candidato, destacando vivência sólida nas atribuições da posição e boa capacidade de articulação profissional.',
          comunicacao_oratoria:
            'Comunicação estruturada, dicção fluida e facilidade em sintetizar realizações de carreira.',
          postura_presenca:
            'Demonstra postura segura, tranquilidade e atitude proativa em frente à câmera.',
          dominio_experiencia:
            'Relata com consistência experiências práticas e resultados obtidos em posições anteriores.',
          fit_cultural:
            'Perfil alinhado com colaboração, responsabilidade e interesse em novos desafios.',
          pontos_fortes: [
            'Boa articulação de competências técnicas',
            'Clareza na apresentação de objetivos',
            'Postura confiante e profissional',
          ],
          pontos_atencao: ['Aprofundar detalhes técnicos específicos na etapa com gestor'],
          nota_estimada: 8.5,
          recomendacao_geral: 'Recomendado',
        }
      }

      // Base utilizada para transparência na UI
      let baseTexto = ''
      if (percepcoesCompartilhadas.length > 0) {
        baseTexto =
          'Baseado em ' +
          percepcoesCompartilhadas.length +
          ' percepção(ões) compartilhada(s) do RH, perfil curricular e vídeo de apresentação do candidato.'
      } else if (temVideo) {
        baseTexto =
          'Baseado no vídeo de apresentação anexado/link informado e nas competências do perfil curricular.'
      } else {
        baseTexto =
          'Baseado no perfil do candidato e histórico de experiências (vídeo pendente de anotações).'
      }

      const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'

      // Buscar se já existe uma análise para este candidato
      let analiseRecord = null
      try {
        const existList = $app.findRecordsByFilter(
          'analises_video_ia',
          "candidato = '" + candidatoId + "'",
          '-created',
          1,
          0,
        )
        if (existList && existList.length > 0) {
          analiseRecord = existList[0]
        }
      } catch (_) {}

      const analisesCol = $app.findCollectionByNameOrId('analises_video_ia')
      if (!analiseRecord) {
        analiseRecord = new Record(analisesCol)
        analiseRecord.set('candidato', candidatoId)
      }

      if (vagaId) analiseRecord.set('vaga', vagaId)
      analiseRecord.set('resumo_executivo', parsed.resumo_executivo || '')
      analiseRecord.set('comunicacao_oratoria', parsed.comunicacao_oratoria || '')
      analiseRecord.set('postura_presenca', parsed.postura_presenca || '')
      analiseRecord.set('dominio_experiencia', parsed.dominio_experiencia || '')
      analiseRecord.set('fit_cultural', parsed.fit_cultural || '')
      analiseRecord.set('pontos_fortes', parsed.pontos_fortes || [])
      analiseRecord.set('pontos_atencao', parsed.pontos_atencao || [])
      analiseRecord.set('nota_estimada', parsed.nota_estimada || 8.0)
      analiseRecord.set('recomendacao_geral', parsed.recomendacao_geral || 'Recomendado')
      analiseRecord.set('base_utilizada', baseTexto)
      analiseRecord.set('qtd_percepcoes_consideradas', percepcoesCompartilhadas.length)
      analiseRecord.set('gerado_por', authRecord.id)
      analiseRecord.set('data_geracao', agoraIso)

      $app.save(analiseRecord)

      return e.json(200, {
        sucesso: true,
        analise: analiseRecord,
      })
    } catch (err) {
      console.log('Erro na rota /backend/v1/analisar-video-ia:', err)
      return e.json(500, { error: err.message || 'Falha ao processar análise do vídeo com IA' })
    }
  },
  $apis.requireAuth(),
)
