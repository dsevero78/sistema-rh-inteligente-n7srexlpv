migrate(
  (app) => {
    // ----------------------------------------------------
    // 1. Coleção 'analises_video_ia'
    //    Armazena a síntese inteligente sobre o vídeo de apresentação
    //    e percepções do RH compartilhadas.
    // ----------------------------------------------------
    let analisesCol = null
    try {
      analisesCol = app.findCollectionByNameOrId('analises_video_ia')
    } catch (_) {}

    if (!analisesCol) {
      analisesCol = new Collection({
        name: 'analises_video_ia',
        type: 'base',
        system: false,
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'candidato',
            type: 'relation',
            required: true,
            collectionId: app.findCollectionByNameOrId('candidatos').id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'vaga',
            type: 'relation',
            required: false,
            collectionId: app.findCollectionByNameOrId('vagas').id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'resumo_executivo',
            type: 'text',
            required: true,
          },
          {
            name: 'comunicacao_oratoria',
            type: 'text',
          },
          {
            name: 'postura_presenca',
            type: 'text',
          },
          {
            name: 'dominio_experiencia',
            type: 'text',
          },
          {
            name: 'fit_cultural',
            type: 'text',
          },
          {
            name: 'pontos_fortes',
            type: 'json',
          },
          {
            name: 'pontos_atencao',
            type: 'json',
          },
          {
            name: 'nota_estimada',
            type: 'number',
          },
          {
            name: 'recomendacao_geral',
            type: 'select',
            values: [
              'Fortemente Recomendado',
              'Recomendado',
              'Requer Alinhamento',
              'Não Recomendado',
            ],
          },
          {
            name: 'base_utilizada',
            type: 'text',
          },
          {
            name: 'qtd_percepcoes_consideradas',
            type: 'number',
          },
          {
            name: 'gerado_por',
            type: 'relation',
            required: false,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          {
            name: 'data_geracao',
            type: 'date',
          },
        ],
        indexes: [
          'CREATE INDEX idx_analises_candidato ON analises_video_ia (candidato)',
          'CREATE INDEX idx_analises_vaga ON analises_video_ia (vaga)',
        ],
      })
      app.save(analisesCol)
    }

    // ----------------------------------------------------
    // 2. Conectar agente nativo 'gestor-de-talentos' à nova coleção
    //    e adicionar memórias contextuais
    // ----------------------------------------------------
    try {
      $ai.agents.putTools(app, 'gestor-de-talentos', [
        {
          collection: 'analises_video_ia',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
      ])

      $ai.agents.putMemories(app, 'gestor-de-talentos', [
        {
          type: 'text',
          payload: {
            text: 'Módulo de Análise Inteligente de Vídeo:\nVocê tem acesso às análises geradas por IA sobre vídeos de apresentação dos candidatos na coleção "analises_video_ia". Essa análise sintetiza a comunicação oral, postura profissional, clareza e aderência das percepções compartilhadas do RH, sem nunca violar informações confidenciais/privadas.',
          },
        },
      ])
    } catch (agentErr) {
      console.log('Aviso ao atualizar agente gestor-de-talentos na migration 0010:', agentErr)
    }

    // ----------------------------------------------------
    // 3. Seed idempotente: Análise de exemplo para Lucas Ferreira
    // ----------------------------------------------------
    try {
      let lucasCand = null
      try {
        const cands = app.findRecordsByFilter(
          'candidatos',
          "nome ~ 'Lucas Ferreira'",
          '-created',
          1,
          0,
        )
        if (cands && cands.length > 0) lucasCand = cands[0]
      } catch (_) {}

      if (lucasCand) {
        let jaExiste = false
        try {
          const exist = app.findRecordsByFilter(
            'analises_video_ia',
            "candidato = '" + lucasCand.id + "'",
            '',
            1,
            0,
          )
          if (exist && exist.length > 0) jaExiste = true
        } catch (_) {}

        if (!jaExiste) {
          const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
          const analiseRec = new Record(analisesCol)
          analiseRec.set('candidato', lucasCand.id)
          analiseRec.set('vaga', lucasCand.get('vaga') || null)
          analiseRec.set(
            'resumo_executivo',
            'Lucas demonstra alta maturidade técnica e comunicação extremamente estruturada no vídeo de apresentação. Articula com segurança desafios complexos de arquitetura de microsserviços e mensageria com Kafka, mantendo tom propositivo e postura colaborativa condizente com a senioridade esperada para a posição.',
          )
          analiseRec.set(
            'comunicacao_oratoria',
            'Dicção impecável, cadência pausada e raciocínio lógico sequencial. Consegue sintetizar projetos de grande escala sem prolixidade.',
          )
          analiseRec.set(
            'postura_presenca',
            'Excelente enquadramento, contato visual direto com a câmera, ambiente silencioso e postura profissional segura.',
          )
          analiseRec.set(
            'dominio_experiencia',
            'Evidencia domínio prático de Go, TypeScript e migrações resilientes, citando métricas reais de performance (redução de 40% na latência).',
          )
          analiseRec.set(
            'fit_cultural',
            'Forte alinhamento com os valores de ownership, aprendizado contínuo e autonomia com responsabilidade.',
          )
          analiseRec.set('pontos_fortes', [
            'Clareza na exposição de decisões arquiteturais',
            'Postura executiva e liderança técnica visível',
            'Sinergia comprovada com os requisitos críticos da vaga',
          ])
          analiseRec.set('pontos_atencao', [
            'Alinhar na entrevista com gestor expectativas sobre disponibilidade para eventuais escalas/plantões',
          ])
          analiseRec.set('nota_estimada', 9.2)
          analiseRec.set('recomendacao_geral', 'Fortemente Recomendado')
          analiseRec.set(
            'base_utilizada',
            'Baseado em 1 percepção compartilhada do RH, perfil curricular e vídeo de apresentação do candidato.',
          )
          analiseRec.set('qtd_percepcoes_consideradas', 1)
          analiseRec.set('data_geracao', agoraIso)
          app.save(analiseRec)
        }
      }
    } catch (seedErr) {
      console.log('Aviso ao semear análise de vídeo de exemplo:', seedErr)
    }

    // ----------------------------------------------------
    // 4. Seeds idempotentes de notificações de alertas para o RH:
    //    - Gestor aprovou a vaga Backend
    //    - Gestor deu parecer formal "Avançar" em Lucas Ferreira
    // ----------------------------------------------------
    try {
      const alertasCol = app.findCollectionByNameOrId('alertas')
      const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'

      // Notificação 1: Aprovação de Vaga
      let vagaBackend = null
      try {
        const vList = app.findRecordsByFilter('vagas', "titulo ~ 'Backend'", '-created', 1, 0)
        if (vList && vList.length > 0) vagaBackend = vList[0]
      } catch (_) {}

      let candidatoLucas = null
      try {
        const cList = app.findRecordsByFilter(
          'candidatos',
          "nome ~ 'Lucas Ferreira'",
          '-created',
          1,
          0,
        )
        if (cList && cList.length > 0) candidatoLucas = cList[0]
      } catch (_) {}

      if (vagaBackend && candidatoLucas) {
        // Verificar se já existe notificação de aprovacao_vaga_gestor
        let temAprovVaga = false
        try {
          const exAprov = app.findRecordsByFilter(
            'alertas',
            "tipo = 'aprovacao_vaga_gestor' && vaga = '" + vagaBackend.id + "'",
            '',
            1,
            0,
          )
          if (exAprov && exAprov.length > 0) temAprovVaga = true
        } catch (_) {}

        if (!temAprovVaga) {
          const alAprov = new Record(alertasCol)
          alAprov.set('vaga', vagaBackend.id)
          alAprov.set('candidato', candidatoLucas.id) // atende a constraint obrigatória
          alAprov.set('score', 95)
          alAprov.set('tipo', 'aprovacao_vaga_gestor')
          alAprov.set('status', 'Novo')
          alAprov.set(
            'resumo_ia',
            'O Gestor Contratante (gestor@empresa.com) aprovou formalmente a descrição da vaga "Desenvolvedor(a) Backend Sênior" e liberou a busca ativa no mercado.',
          )
          alAprov.set('criado_em', agoraIso)
          app.save(alAprov)
        }

        // Notificação 2: Parecer do Gestor em Candidato
        let temParecerGestor = false
        try {
          const exParecer = app.findRecordsByFilter(
            'alertas',
            "tipo = 'parecer_gestor_candidato' && candidato = '" + candidatoLucas.id + "'",
            '',
            1,
            0,
          )
          if (exParecer && exParecer.length > 0) temParecerGestor = true
        } catch (_) {}

        if (!temParecerGestor) {
          const alParecer = new Record(alertasCol)
          alParecer.set('vaga', vagaBackend.id)
          alParecer.set('candidato', candidatoLucas.id)
          alParecer.set('score', 92)
          alParecer.set('tipo', 'parecer_gestor_candidato')
          alParecer.set('status', 'Novo')
          alParecer.set(
            'resumo_ia',
            'Parecer do Gestor: Recomendação "Avançar" registrada para Lucas Ferreira Lima na vaga "Desenvolvedor(a) Backend Sênior". "Perfil técnico excelente com Kafka e Go."',
          )
          alParecer.set('criado_em', agoraIso)
          app.save(alParecer)
        }
      }
    } catch (alertaSeedErr) {
      console.log('Aviso ao semear alertas de exemplo do gestor:', alertaSeedErr)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('analises_video_ia')
      if (col) app.delete(col)
    } catch (_) {}
  },
)
