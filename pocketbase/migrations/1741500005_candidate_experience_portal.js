migrate(
  (app) => {
    // 1. Adicionar campo token_portal à coleção candidatos se não existir
    const candidatosCol = app.findCollectionByNameOrId('candidatos')
    if (!candidatosCol.fields.getByName('token_portal')) {
      candidatosCol.fields.add(
        new TextField({
          name: 'token_portal',
          required: false,
        }),
      )
      candidatosCol.addIndex('idx_candidatos_token_portal', false, 'token_portal', '')
      app.save(candidatosCol)
    }

    // 2. Criar coleção janelas_entrevista_candidato para agendamento self-service
    let janelasCol = null
    try {
      janelasCol = app.findCollectionByNameOrId('janelas_entrevista_candidato')
    } catch (_) {
      janelasCol = new Collection({
        name: 'janelas_entrevista_candidato',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: "@request.auth.id != ''",
        updateRule: '',
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
            required: true,
            collectionId: app.findCollectionByNameOrId('vagas').id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'entrevista_existente',
            type: 'relation',
            required: false,
            collectionId: app.findCollectionByNameOrId('entrevistas').id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'Aguardando escolha',
              'Confirmado',
              'Reagendamento solicitado',
              'Cancelado',
              'Expirado',
            ],
            maxSelect: 1,
          },
          {
            name: 'janelas_propostas',
            type: 'json',
            required: false,
          },
          {
            name: 'janela_escolhida',
            type: 'json',
            required: false,
          },
          {
            name: 'motivo_reagendamento',
            type: 'text',
            required: false,
          },
          {
            name: 'observacoes_rh',
            type: 'text',
            required: false,
          },
          {
            name: 'formato',
            type: 'select',
            required: false,
            values: ['Online', 'Presencial', 'Telefonema'],
            maxSelect: 1,
          },
          {
            name: 'duracao_minutos',
            type: 'number',
            required: false,
          },
          {
            name: 'responsavel_nome',
            type: 'text',
            required: false,
          },
          {
            name: 'link_reuniao',
            type: 'url',
            required: false,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_janelas_cand ON janelas_entrevista_candidato (candidato)',
          'CREATE INDEX idx_janelas_vaga ON janelas_entrevista_candidato (vaga)',
          'CREATE INDEX idx_janelas_status ON janelas_entrevista_candidato (status)',
        ],
      })
      app.save(janelasCol)
    }

    // 3. Atualizar tipos de notificações do RH para incluir agendamento e feedback do candidato
    try {
      const notifCol = app.findCollectionByNameOrId('notificacoes_rh')
      const tipoField = notifCol.fields.getByName('tipo')
      if (tipoField) {
        // Garantir que aceita os novos tipos
        tipoField.values = [
          'vaga_aprovada',
          'vaga_ajustes',
          'parecer_candidato',
          'aditivo_juridico',
          'sistema',
          'candidato_agendamento',
          'candidato_reagendamento',
          'candidato_feedback',
        ]
        tipoField.maxSelect = 1
        app.save(notifCol)
      }
    } catch (errNotif) {
      console.log('Aviso ao calibrar tipos de notificacoes_rh:', errNotif)
    }

    // 4. Semear tokens nos candidatos e criar dados de demonstração
    // 4.1 Lucas Ferreira (entrevista agendada / janelas para escolha)
    try {
      const candLucas = app.findFirstRecordByData(
        'candidatos',
        'email',
        'lucas.ferreira@exemplo.com',
      )
      candLucas.set('token_portal', 'cand-lucas-ferreira-seed')
      app.save(candLucas)

      // Criar ou atualizar janela de agendamento de exemplo para Lucas Ferreira
      const janelasRecordCol = app.findCollectionByNameOrId('janelas_entrevista_candidato')
      let janelaLucas = null
      try {
        janelaLucas = app.findFirstRecordByData(
          'janelas_entrevista_candidato',
          'candidato',
          candLucas.id,
        )
      } catch (_) {}

      if (!janelaLucas) {
        janelaLucas = new Record(janelasRecordCol)
        janelaLucas.set('candidato', candLucas.id)
        janelaLucas.set('vaga', candLucas.getString('vaga'))
        janelaLucas.set('status', 'Aguardando escolha')
        janelaLucas.set('formato', 'Online')
        janelaLucas.set('duracao_minutos', 60)
        janelaLucas.set('responsavel_nome', 'Douglas Severo (RH) & Tech Lead')
        janelaLucas.set('link_reuniao', 'https://meet.google.com/yess-tech-interview')
        janelaLucas.set(
          'observacoes_rh',
          'Etapa técnica com foco em arquitetura Go/Node e microsserviços.',
        )

        const hoje = new Date()
        const d1 = new Date(hoje.getTime() + 24 * 60 * 60 * 1000)
        d1.setHours(10, 0, 0, 0)
        const d2 = new Date(hoje.getTime() + 24 * 60 * 60 * 1000)
        d2.setHours(14, 30, 0, 0)
        const d3 = new Date(hoje.getTime() + 48 * 60 * 60 * 1000)
        d3.setHours(11, 0, 0, 0)
        const d4 = new Date(hoje.getTime() + 48 * 60 * 60 * 1000)
        d4.setHours(16, 0, 0, 0)

        janelaLucas.set('janelas_propostas', [
          {
            id: 'slot-1',
            data_inicio: d1.toISOString(),
            label:
              d1.toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
              }) + ' às 10:00',
            disponivel: true,
          },
          {
            id: 'slot-2',
            data_inicio: d2.toISOString(),
            label:
              d2.toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
              }) + ' às 14:30',
            disponivel: true,
          },
          {
            id: 'slot-3',
            data_inicio: d3.toISOString(),
            label:
              d3.toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
              }) + ' às 11:00',
            disponivel: true,
          },
          {
            id: 'slot-4',
            data_inicio: d4.toISOString(),
            label:
              d4.toLocaleDateString('pt-BR', {
                weekday: 'short',
                day: '2-digit',
                month: '2-digit',
              }) + ' às 16:00',
            disponivel: true,
          },
        ])

        try {
          const ent = app.findFirstRecordByData('entrevistas', 'candidato', candLucas.id)
          janelaLucas.set('entrevista_existente', ent.id)
        } catch (_) {}

        app.save(janelaLucas)
      }
    } catch (errLucas) {
      console.log('Aviso ao semear token/janela de Lucas:', errLucas)
    }

    // 4.2 Juliana Mendes (Aprovada/Contratada, processo finalizado)
    try {
      const candJuliana = app.findFirstRecordByData(
        'candidatos',
        'email',
        'juliana.mendes@exemplo.com',
      )
      candJuliana.set('token_portal', 'cand-juliana-mendes-seed')
      app.save(candJuliana)
    } catch (errJuliana) {
      console.log('Aviso ao semear token de Juliana:', errJuliana)
    }

    // 4.3 Leonardo Bastos (Recusado, banco de talentos, feedback preenchido)
    try {
      const candLeo = app.findFirstRecordByData(
        'candidatos',
        'email',
        'leonardo.bastos@exemplo.com',
      )
      candLeo.set('token_portal', 'cand-leonardo-bastos-seed')
      app.save(candLeo)
    } catch (errLeo) {
      console.log('Aviso ao semear token de Leonardo:', errLeo)
    }

    // 4.4 Garantir que qualquer outro candidato receba um token_portal se não tiver
    try {
      const todosCands = app.findRecordsByFilter(
        'candidatos',
        "token_portal = '' || token_portal = null",
        '',
        200,
        0,
      )
      for (let i = 0; i < todosCands.length; i++) {
        const c = todosCands[i]
        const emailPrefix = c
          .getString('email')
          .split('@')[0]
          .replace(/[^a-zA-Z0-9]/g, '-')
        c.set('token_portal', 'cand-' + emailPrefix + '-' + $security.randomString(8).toLowerCase())
        app.save(c)
      }
    } catch (errTokens) {
      console.log('Aviso ao gerar tokens para demais candidatos:', errTokens)
    }
  },
  (app) => {
    try {
      const janelasCol = app.findCollectionByNameOrId('janelas_entrevista_candidato')
      app.delete(janelasCol)
    } catch (_) {}
  },
)
