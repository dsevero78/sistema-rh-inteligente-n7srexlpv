/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const vagasCol = app.findCollectionByNameOrId('vagas')
    const candidatosCol = app.findCollectionByNameOrId('candidatos')
    const pipelineCol = app.findCollectionByNameOrId('pipeline')

    // ----------------------------------------------------
    // 1. Adicionar campos em 'candidatos' para LGPD e Origem de Candidatura
    // ----------------------------------------------------
    if (!candidatosCol.fields.getByName('canal_origem')) {
      candidatosCol.fields.add(
        new SelectField({
          name: 'canal_origem',
          values: [
            'Página de Carreira',
            'LinkedIn',
            'Indicação interna',
            'Site da empresa',
            'Banco de talentos',
            'Outros canais',
          ],
          maxSelect: 1,
        }),
      )
    }

    if (!candidatosCol.fields.getByName('consentimento_lgpd')) {
      candidatosCol.fields.add(
        new BoolField({
          name: 'consentimento_lgpd',
        }),
      )
    }

    if (!candidatosCol.fields.getByName('consentimento_lgpd_data')) {
      candidatosCol.fields.add(
        new DateField({
          name: 'consentimento_lgpd_data',
        }),
      )
    }

    if (!candidatosCol.fields.getByName('consentimento_lgpd_ip')) {
      candidatosCol.fields.add(
        new TextField({
          name: 'consentimento_lgpd_ip',
        }),
      )
    }

    app.save(candidatosCol)

    // ----------------------------------------------------
    // 2. Coleção 'config_emails_status' (Toggles globais e por vaga)
    // ----------------------------------------------------
    let configEmailsCol = null
    try {
      configEmailsCol = app.findCollectionByNameOrId('config_emails_status')
    } catch (_) {}

    if (!configEmailsCol) {
      configEmailsCol = new Collection({
        name: 'config_emails_status',
        type: 'base',
        system: false,
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'vaga',
            type: 'relation',
            required: false,
            collectionId: vagasCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'ativo',
            type: 'bool',
          },
          {
            name: 'assunto_personalizado',
            type: 'text',
          },
          {
            name: 'mensagem_adicional',
            type: 'text',
          },
          {
            name: 'created',
            type: 'autodate',
            onCreate: true,
            onUpdate: false,
          },
          {
            name: 'updated',
            type: 'autodate',
            onCreate: true,
            onUpdate: true,
          },
        ],
        indexes: ['CREATE INDEX idx_config_emails_vaga ON config_emails_status (vaga)'],
      })
      app.save(configEmailsCol)
    }

    // ----------------------------------------------------
    // 3. Coleção 'logs_emails_status' (Auditoria de envios aos candidatos)
    // ----------------------------------------------------
    let logsEmailsCol = null
    try {
      logsEmailsCol = app.findCollectionByNameOrId('logs_emails_status')
    } catch (_) {}

    if (!logsEmailsCol) {
      logsEmailsCol = new Collection({
        name: 'logs_emails_status',
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
            collectionId: candidatosCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'vaga',
            type: 'relation',
            required: true,
            collectionId: vagasCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'estagio',
            type: 'select',
            required: true,
            values: [
              'Candidatura Recebida',
              'Triagem',
              'Entrevista com RH',
              'Entrevista técnica',
              'Match técnico/comportamental (IA)',
              'Proposta',
              'Aprovado',
              'Recusado',
            ],
            maxSelect: 1,
          },
          {
            name: 'candidato_nome',
            type: 'text',
          },
          {
            name: 'candidato_email',
            type: 'text',
          },
          {
            name: 'vaga_titulo',
            type: 'text',
          },
          {
            name: 'assunto',
            type: 'text',
          },
          {
            name: 'status_envio',
            type: 'select',
            required: true,
            values: ['Enviado', 'Falhou', 'Simulado'],
            maxSelect: 1,
          },
          {
            name: 'mensagem_resumo',
            type: 'text',
          },
          {
            name: 'data_envio',
            type: 'date',
          },
          {
            name: 'created',
            type: 'autodate',
            onCreate: true,
            onUpdate: false,
          },
          {
            name: 'updated',
            type: 'autodate',
            onCreate: true,
            onUpdate: true,
          },
        ],
        indexes: [
          'CREATE INDEX idx_logs_emails_cand ON logs_emails_status (candidato)',
          'CREATE INDEX idx_logs_emails_vaga ON logs_emails_status (vaga)',
          'CREATE INDEX idx_logs_emails_estagio ON logs_emails_status (estagio)',
          'CREATE INDEX idx_logs_emails_data ON logs_emails_status (data_envio)',
        ],
      })
      app.save(logsEmailsCol)
    }

    // ----------------------------------------------------
    // 4. Seeds Idempotentes:
    //    4.1 Configuração Global de E-mails de Status (ativo = true)
    // ----------------------------------------------------
    try {
      const existGlobal = app.findRecordsByFilter(
        'config_emails_status',
        "vaga = '' || vaga = null",
        '',
        1,
        0,
      )
      if (!existGlobal || existGlobal.length === 0) {
        const confGlobal = new Record(configEmailsCol)
        confGlobal.set('vaga', null)
        confGlobal.set('ativo', true)
        confGlobal.set(
          'assunto_personalizado',
          'Atualização sobre seu processo seletivo na {{empresa}}',
        )
        confGlobal.set(
          'mensagem_adicional',
          'Nosso time de Gente & Gestão preza pela transparência em todas as etapas da sua jornada.',
        )
        app.save(confGlobal)
      }
    } catch (errConf) {
      console.log('Aviso ao semear configuração global de e-mails:', errConf)
    }

    // ----------------------------------------------------
    //    4.2 Vaga Ativa e Aprovada para Candidatura Pública
    //    Garantir que a vaga Desenvolvedor(a) Backend Sênior está 100% pronta
    //    e criar/garantir uma segunda vaga para variedade
    // ----------------------------------------------------
    let vagaBackend = null
    try {
      const vList = app.findRecordsByFilter(
        'vagas',
        "titulo ~ 'Backend' && status = 'Ativa'",
        '-created',
        1,
        0,
      )
      if (vList && vList.length > 0) {
        vagaBackend = vList[0]
        vagaBackend.set('status_aprovacao_gestor', 'Aprovada pelo gestor')
        app.save(vagaBackend)
      }
    } catch (_) {}

    // Garantir vaga Tech Lead / Frontend ou Designer aprovada para ter opções no portal
    let vagaDesign = null
    try {
      const dList = app.findRecordsByFilter(
        'vagas',
        "titulo ~ 'Designer' && status = 'Ativa'",
        '-created',
        1,
        0,
      )
      if (dList && dList.length > 0) {
        vagaDesign = dList[0]
        vagaDesign.set('status_aprovacao_gestor', 'Aprovada pelo gestor')
        vagaDesign.set(
          'parecer_gestor_vaga',
          'Aprovada para recebimento de candidaturas públicas e portfólio.',
        )
        app.save(vagaDesign)
      }
    } catch (_) {}

    // ----------------------------------------------------
    //    4.3 Seeds de 2-3 logs de exemplo para a auditoria de e-mails de status
    // ----------------------------------------------------
    try {
      let candLucas = null
      try {
        const cands = app.findRecordsByFilter(
          'candidatos',
          "nome ~ 'Lucas Ferreira'",
          '-created',
          1,
          0,
        )
        if (cands && cands.length > 0) candLucas = cands[0]
      } catch (_) {}

      if (candLucas && vagaBackend) {
        const logsCount = app.countRecords('logs_emails_status')
        if (logsCount === 0) {
          const agora = new Date()

          // Log 1: Triagem
          const data1 =
            new Date(agora.getTime() - 48 * 60 * 60 * 1000)
              .toISOString()
              .replace('T', ' ')
              .substring(0, 19) + 'Z'
          const log1 = new Record(logsEmailsCol)
          log1.set('candidato', candLucas.id)
          log1.set('vaga', vagaBackend.id)
          log1.set('estagio', 'Triagem')
          log1.set('candidato_nome', candLucas.getString('nome'))
          log1.set('candidato_email', candLucas.getString('email'))
          log1.set('vaga_titulo', vagaBackend.getString('titulo'))
          log1.set('assunto', 'Recebemos sua candidatura: Desenvolvedor(a) Backend Sênior')
          log1.set('status_envio', 'Enviado')
          log1.set(
            'mensagem_resumo',
            'Recebemos sua candidatura com sucesso. Nossa equipe de Gente & Gestão está analisando suas informações.',
          )
          log1.set('data_envio', data1)
          app.save(log1)

          // Log 2: Entrevista com RH
          const data2 =
            new Date(agora.getTime() - 24 * 60 * 60 * 1000)
              .toISOString()
              .replace('T', ' ')
              .substring(0, 19) + 'Z'
          const log2 = new Record(logsEmailsCol)
          log2.set('candidato', candLucas.id)
          log2.set('vaga', vagaBackend.id)
          log2.set('estagio', 'Entrevista com RH')
          log2.set('candidato_nome', candLucas.getString('nome'))
          log2.set('candidato_email', candLucas.getString('email'))
          log2.set('vaga_titulo', vagaBackend.getString('titulo'))
          log2.set('assunto', 'Parabéns! Você avançou para a Entrevista com RH')
          log2.set('status_envio', 'Enviado')
          log2.set(
            'mensagem_resumo',
            'Ficamos muito felizes em seguir com você. Sua candidatura avançou para o estágio de Entrevista com RH.',
          )
          log2.set('data_envio', data2)
          app.save(log2)

          // Log 3: Proposta
          const data3 =
            new Date(agora.getTime() - 2 * 60 * 60 * 1000)
              .toISOString()
              .replace('T', ' ')
              .substring(0, 19) + 'Z'
          const log3 = new Record(logsEmailsCol)
          log3.set('candidato', candLucas.id)
          log3.set('vaga', vagaBackend.id)
          log3.set('estagio', 'Proposta')
          log3.set('candidato_nome', candLucas.getString('nome'))
          log3.set('candidato_email', candLucas.getString('email'))
          log3.set('vaga_titulo', vagaBackend.getString('titulo'))
          log3.set('assunto', 'Proposta de Contratação: Desenvolvedor(a) Backend Sênior')
          log3.set('status_envio', 'Enviado')
          log3.set(
            'mensagem_resumo',
            'Temos ótimas notícias! Seu perfil foi altamente aprovado e nossa proposta formal foi gerada.',
          )
          log3.set('data_envio', data3)
          app.save(log3)
        }
      }
    } catch (logSeedErr) {
      console.log('Aviso ao semear logs de e-mails de status:', logSeedErr)
    }

    // ----------------------------------------------------
    // 5. Conectar o agente nativo 'gestor-de-talentos'
    //    às novas coleções 'config_emails_status' e 'logs_emails_status'
    // ----------------------------------------------------
    try {
      $ai.agents.putTools(app, 'gestor-de-talentos', [
        {
          collection: 'config_emails_status',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'logs_emails_status',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
      ])

      $ai.agents.putMemories(app, 'gestor-de-talentos', [
        {
          type: 'text',
          payload: {
            text: 'Módulo de E-mails Automáticos de Status:\nO sistema mantém um log de auditoria de e-mails enviados aos candidatos a cada mudança de estágio no pipeline ("logs_emails_status"). As configurações globais e por vaga residem em "config_emails_status". Você pode consultar se um candidato já foi notificado sobre determinado estágio e orientar a equipe de RH com transparência.',
          },
        },
      ])
    } catch (agentErr) {
      console.log('Aviso ao atualizar agente gestor-de-talentos na migration 0011:', agentErr)
    }
  },
  (app) => {
    try {
      const logsCol = app.findCollectionByNameOrId('logs_emails_status')
      if (logsCol) app.delete(logsCol)
    } catch (_) {}
    try {
      const confCol = app.findCollectionByNameOrId('config_emails_status')
      if (confCol) app.delete(confCol)
    } catch (_) {}
  },
)
