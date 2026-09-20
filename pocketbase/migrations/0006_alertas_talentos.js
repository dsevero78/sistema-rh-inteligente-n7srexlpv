/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const vagasCol = app.findCollectionByNameOrId('vagas')
    const candidatosCol = app.findCollectionByNameOrId('candidatos')

    // 1. Criar coleção 'alertas'
    const alertas = new Collection({
      name: 'alertas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'vaga',
          type: 'relation',
          required: true,
          collectionId: vagasCol.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'candidato',
          type: 'relation',
          required: true,
          collectionId: candidatosCol.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'score', type: 'number', required: true },
        { name: 'tipo', type: 'text', required: true }, // ex: "talento_para_vaga"
        {
          name: 'status',
          type: 'select',
          values: ['Novo', 'Visualizado', 'Descartado'],
          maxSelect: 1,
          required: true,
        },
        { name: 'resumo_ia', type: 'text' },
        { name: 'criado_em', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_alertas_status ON alertas (status)',
        'CREATE INDEX idx_alertas_vaga ON alertas (vaga)',
        'CREATE INDEX idx_alertas_candidato ON alertas (candidato)',
        'CREATE INDEX idx_alertas_vaga_candidato ON alertas (vaga, candidato)',
      ],
    })
    app.save(alertas)

    // 2. Atualizar o agente nativo 'gestor-de-talentos' para ter acesso à coleção 'alertas'
    try {
      const alertasCol = app.findCollectionByNameOrId('alertas')
      $ai.agents.putTools(app, 'gestor-de-talentos', [
        {
          collection: alertasCol.id,
          perms: { read: true, list: true },
          actAs: 'admin',
        },
      ])

      $ai.agents.putMemories(app, 'gestor-de-talentos', [
        {
          type: 'text',
          payload: {
            text: 'Módulo de Alertas Automáticos de Talentos:\n1. A coleção "alertas" armazena notificações automáticas geradas quando um talento do Banco de Talentos (banco_talentos=true) atinge alta aderência técnica/comportamental (score >= 75) para uma vaga aberta.\n2. Campos de cada alerta: vaga (relação com vagas), candidato (relação com candidatos), score (0 a 100), status ("Novo", "Visualizado", "Descartado"), resumo_ia (justificativa de 1 a 2 frases) e criado_em.\n3. Quando o usuário perguntar por alertas ("quais alertas de talentos tenho?", "alertas desta semana", etc.), consulte a coleção alertas filtrando por status Novo ou Visualizado e traga os detalhes do candidato e da vaga.',
          },
        },
      ])
    } catch (agentErr) {
      console.log('Aviso ao adicionar coleção alertas ao agente gestor-de-talentos:', agentErr)
    }

    // 3. Seed inicial idempotente de alertas entre candidatos do banco de talentos e vagas ativas
    try {
      const alertasCol = app.findCollectionByNameOrId('alertas')

      // Vagas ativas
      let vagaBackend = null
      let vagaDesign = null
      let vagaMarketing = null

      try {
        vagaBackend = app.findFirstRecordByData(
          'vagas',
          'titulo',
          'Desenvolvedor(a) Backend Sênior',
        )
      } catch (_) {}
      try {
        vagaDesign = app.findFirstRecordByData('vagas', 'titulo', 'Product Designer Pleno')
      } catch (_) {}
      try {
        vagaMarketing = app.findFirstRecordByData(
          'vagas',
          'titulo',
          'Analista de Marketing Digital',
        )
      } catch (_) {}

      // Candidatos do banco
      let candLeonardo = null
      let candBeatriz = null
      let candVinicius = null

      try {
        candLeonardo = app.findFirstRecordByData(
          'candidatos',
          'email',
          'leonardo.bastos@exemplo.com',
        )
      } catch (_) {}
      try {
        candBeatriz = app.findFirstRecordByData('candidatos', 'email', 'beatriz.fontes@exemplo.com')
      } catch (_) {}
      try {
        candVinicius = app.findFirstRecordByData(
          'candidatos',
          'email',
          'vinicius.moreira@exemplo.com',
        )
      } catch (_) {}

      const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'

      // Alerta 1: Leonardo Bastos para vaga Backend Sênior (Score 92%)
      if (candLeonardo && vagaBackend) {
        try {
          const jaExiste = app.findRecordsByFilter(
            'alertas',
            "vaga = '" + vagaBackend.id + "' && candidato = '" + candLeonardo.id + "'",
            '',
            1,
            0,
          )
          if (!jaExiste || jaExiste.length === 0) {
            const al1 = new Record(alertasCol)
            al1.set('vaga', vagaBackend.id)
            al1.set('candidato', candLeonardo.id)
            al1.set('score', 92)
            al1.set('tipo', 'talento_para_vaga')
            al1.set('status', 'Novo')
            al1.set(
              'resumo_ia',
              'Leonardo possui 7 anos de experiência sólida em Go, Docker, microsserviços e Kubernetes, atingindo 92% de aderência aos requisitos críticos da posição.',
            )
            al1.set('criado_em', agoraIso)
            app.save(al1)
          }
        } catch (err1) {
          console.log('Aviso ao semear alerta 1:', err1)
        }
      }

      // Alerta 2: Beatriz Nogueira Fontes para vaga Product Designer Pleno (Score 88%)
      if (candBeatriz && vagaDesign) {
        try {
          const jaExiste = app.findRecordsByFilter(
            'alertas',
            "vaga = '" + vagaDesign.id + "' && candidato = '" + candBeatriz.id + "'",
            '',
            1,
            0,
          )
          if (!jaExiste || jaExiste.length === 0) {
            const al2 = new Record(alertasCol)
            al2.set('vaga', vagaDesign.id)
            al2.set('candidato', candBeatriz.id)
            al2.set('score', 88)
            al2.set('tipo', 'talento_para_vaga')
            al2.set('status', 'Novo')
            al2.set(
              'resumo_ia',
              'Beatriz domina discovery contínuo, prototipação em Figma e design system avançado, correspondendo perfeitamente ao perfil de Product Designer Pleno.',
            )
            al2.set('criado_em', agoraIso)
            app.save(al2)
          }
        } catch (err2) {
          console.log('Aviso ao semear alerta 2:', err2)
        }
      }

      // Alerta 3: Vinicius Moreira para vaga Analista de Marketing Digital (Score 83%)
      if (candVinicius && vagaMarketing) {
        try {
          const jaExiste = app.findRecordsByFilter(
            'alertas',
            "vaga = '" + vagaMarketing.id + "' && candidato = '" + candVinicius.id + "'",
            '',
            1,
            0,
          )
          if (!jaExiste || jaExiste.length === 0) {
            const al3 = new Record(alertasCol)
            al3.set('vaga', vagaMarketing.id)
            al3.set('candidato', candVinicius.id)
            al3.set('score', 83)
            al3.set('tipo', 'talento_para_vaga')
            al3.set('status', 'Visualizado')
            al3.set(
              'resumo_ia',
              'Vinicius tem forte bagagem técnica em tráfego pago (Meta Ads e Google Ads) e métricas de aquisição de clientes, com ótima sinergia para a vaga.',
            )
            al3.set('criado_em', agoraIso)
            app.save(al3)
          }
        } catch (err3) {
          console.log('Aviso ao semear alerta 3:', err3)
        }
      }
    } catch (seedErr) {
      console.log('Aviso ao executar seed da coleção alertas:', seedErr)
    }
  },
  (app) => {
    try {
      $ai.agents.deleteTools(app, 'gestor-de-talentos', ['alertas'])
    } catch (_) {}

    try {
      const alertas = app.findCollectionByNameOrId('alertas')
      app.delete(alertas)
    } catch (_) {}
  },
)
