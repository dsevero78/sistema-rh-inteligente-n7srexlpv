/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const candidatosCol = app.findCollectionByNameOrId('candidatos')
    const vagasCol = app.findCollectionByNameOrId('vagas')

    // ----------------------------------------------------
    // 1. Criar Coleção 'onboardings'
    // ----------------------------------------------------
    let onboardingsCol = null
    try {
      onboardingsCol = app.findCollectionByNameOrId('onboardings')
    } catch (_) {}

    if (!onboardingsCol) {
      onboardingsCol = new Collection({
        name: 'onboardings',
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
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'data_admissao',
            type: 'date',
            required: false,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['Ativo', 'Concluído', 'Cancelado'],
            maxSelect: 1,
          },
          {
            name: 'percentual_conclusao',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            name: 'itens',
            type: 'json',
            maxSize: 2000000,
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
          'CREATE INDEX idx_onboardings_cand ON onboardings (candidato)',
          'CREATE INDEX idx_onboardings_vaga ON onboardings (vaga)',
          'CREATE INDEX idx_onboardings_status ON onboardings (status)',
          'CREATE INDEX idx_onboardings_admissao ON onboardings (data_admissao)',
        ],
      })
      app.save(onboardingsCol)
    }

    // ----------------------------------------------------
    // 2. Atualizar estágio do pipeline e candidato Juliana Mendes para 'Aprovado'
    //    e semear 1 Onboarding de exemplo com progresso parcial
    // ----------------------------------------------------
    try {
      let candJuliana = null
      try {
        candJuliana = app.findFirstRecordByData('candidatos', 'email', 'juliana.mendes@exemplo.com')
      } catch (_) {}

      let vagaJuliana = null
      if (candJuliana) {
        try {
          vagaJuliana = app.findRecordById('vagas', candJuliana.getString('vaga'))
        } catch (_) {}

        candJuliana.set('status', 'Aprovado')
        app.save(candJuliana)

        // Atualizar pipeline de Juliana
        try {
          const pipeJ = app.findFirstRecordByData('pipeline', 'candidato', candJuliana.id)
          if (pipeJ) {
            pipeJ.set('estagio', 'Aprovado')
            const hist = pipeJ.get('historico') || []
            hist.push({
              data: new Date().toISOString(),
              estagio: 'Aprovado',
              autor: 'Gente & Gestão',
              nota: 'Candidata contratada com proposta aceita.',
            })
            pipeJ.set('historico', hist)
            app.save(pipeJ)
          }
        } catch (_) {}

        // Atualizar oferta para 'Aceita'
        try {
          const ofJ = app.findFirstRecordByData('ofertas', 'candidato', candJuliana.id)
          if (ofJ) {
            ofJ.set('status', 'Aceita')
            app.save(ofJ)
          }
        } catch (_) {}

        // Verificar se já existe onboarding para Juliana
        let onboardingExiste = false
        try {
          const onbList = app.findRecordsByFilter(
            'onboardings',
            "candidato = '" + candJuliana.id + "'",
            '',
            1,
            0,
          )
          if (onbList && onbList.length > 0) {
            onboardingExiste = true
          }
        } catch (_) {}

        if (!onboardingExiste && vagaJuliana) {
          const itensExemplo = [
            // Documentos
            {
              id: 'doc-1',
              titulo: 'Cópia do RG e CPF / CNH digital',
              categoria: 'Documentos',
              responsavel: 'Juliana Mendes (Contratado)',
              prazo: '2026-10-01',
              concluido: true,
              observacao: 'Documentos recebidos e validados pelo DP.',
            },
            {
              id: 'doc-2',
              titulo: 'Comprovante de residência atualizado (últimos 90 dias)',
              categoria: 'Documentos',
              responsavel: 'Juliana Mendes (Contratado)',
              prazo: '2026-10-01',
              concluido: true,
              observacao: 'Comprovante de energia aprovado.',
            },
            {
              id: 'doc-3',
              titulo: 'Carteira de Trabalho Digital (CTPS) e PIS/PASEP',
              categoria: 'Documentos',
              responsavel: 'Juliana Mendes (Contratado)',
              prazo: '2026-10-01',
              concluido: true,
              observacao: 'Qualificação cadastral eSocial regular.',
            },
            {
              id: 'doc-4',
              titulo: 'Agendamento e realização do ASO (Exame Médico Admissional)',
              categoria: 'Documentos',
              responsavel: 'Equipe de Gente & Gestão (RH)',
              prazo: '2026-10-03',
              concluido: true,
              observacao: 'ASO Apto emitido pela clínica credenciada.',
            },
            {
              id: 'doc-5',
              titulo: 'Dados bancários para folha de pagamento (Conta Corrente)',
              categoria: 'Documentos',
              responsavel: 'Juliana Mendes (Contratado)',
              prazo: '2026-10-04',
              concluido: false,
              observacao: 'Aguardando envio do extrato ou comprovante Itaú.',
            },

            // Acesso & Sistemas
            {
              id: 'sis-1',
              titulo: 'Criação da conta de e-mail corporativo (Google Workspace)',
              categoria: 'Acesso & Sistemas',
              responsavel: 'TI Corporativa',
              prazo: '2026-10-04',
              concluido: true,
              observacao: 'Conta juliana.castro@empresa.com gerada.',
            },
            {
              id: 'sis-2',
              titulo: 'Acessos às ferramentas do cargo (ATS, Slack, Notion, HRMS)',
              categoria: 'Acesso & Sistemas',
              responsavel: 'TI Corporativa',
              prazo: '2026-10-05',
              concluido: true,
              observacao: 'Convites disparados.',
            },
            {
              id: 'sis-3',
              titulo: 'Envio de notebook corporativo e kit de periféricos',
              categoria: 'Acesso & Sistemas',
              responsavel: 'Facilities & TI',
              prazo: '2026-10-05',
              concluido: false,
              observacao: 'Em trânsito via transportadora particular.',
            },

            // Primeiros Dias
            {
              id: 'day-1',
              titulo: 'Reunião 1:1 de boas-vindas com o Gestor Direto',
              categoria: 'Primeiros Dias',
              responsavel: 'Gestor Contratante',
              prazo: '2026-10-06',
              concluido: false,
              observacao: 'Agendado no Google Calendar para 10h do primeiro dia.',
            },
            {
              id: 'day-2',
              titulo: 'Apresentação à equipe de Gente & Gestão e tour institucional',
              categoria: 'Primeiros Dias',
              responsavel: 'Douglas Severo (RH)',
              prazo: '2026-10-06',
              concluido: false,
              observacao: 'Momento de integração na tarde do dia 1.',
            },
            {
              id: 'day-3',
              titulo: 'Entrega do kit de boas-vindas corporativo (Welcome Kit)',
              categoria: 'Primeiros Dias',
              responsavel: 'People Experience',
              prazo: '2026-10-06',
              concluido: false,
              observacao: 'Mochila, camiseta, caderno e caneca institucional.',
            },

            // Treinamento
            {
              id: 'tre-1',
              titulo: 'Onboarding cultural: Missão, Valores, Governança e Compliance',
              categoria: 'Treinamento',
              responsavel: 'Gente & Gestão',
              prazo: '2026-10-08',
              concluido: false,
              observacao: 'Trilha LMS obrigatória de boas práticas.',
            },
            {
              id: 'tre-2',
              titulo: 'Trilha de formação específica da vaga (Sistemas de RH e Políticas Internas)',
              categoria: 'Treinamento',
              responsavel: 'Gestor Contratante',
              prazo: '2026-10-15',
              concluido: false,
              observacao: 'Shadowing com a equipe na primeira semana.',
            },
          ]

          const concluidos = itensExemplo.filter(function (i) {
            return i.concluido
          }).length
          const perc = Math.round((concluidos / itensExemplo.length) * 100)

          const onb = new Record(onboardingsCol)
          onb.set('candidato', candJuliana.id)
          onb.set('vaga', vagaJuliana.id)
          onb.set('data_admissao', '2026-10-06 09:00:00.000Z')
          onb.set('status', 'Ativo')
          onb.set('percentual_conclusao', perc)
          onb.set('itens', itensExemplo)
          app.save(onb)

          // Registrar e-mail de boas-vindas para Juliana
          try {
            const logsCol = app.findCollectionByNameOrId('logs_emails_status')
            const logRec = new Record(logsCol)
            logRec.set('candidato', candJuliana.id)
            logRec.set('vaga', vagaJuliana.id)
            logRec.set('estagio', 'Aprovado')
            logRec.set('candidato_nome', candJuliana.getString('nome'))
            logRec.set('candidato_email', candJuliana.getString('email'))
            logRec.set('vaga_titulo', vagaJuliana.getString('titulo'))
            logRec.set(
              'assunto',
              '🎉 Boas-vindas ao time! Início do seu Onboarding: ' +
                vagaJuliana.getString('titulo'),
            )
            logRec.set('status_envio', 'Enviado')
            logRec.set(
              'mensagem_resumo',
              'Boas-vindas institucionais e checklist de documentos e primeiros dias.',
            )
            logRec.set(
              'data_envio',
              new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z',
            )
            app.save(logRec)
          } catch (_) {}
        }
      }
    } catch (seedErr) {
      console.log('Aviso ao semear onboarding de Juliana Mendes:', seedErr)
    }

    // ----------------------------------------------------
    // 3. Atualizar agente nativo 'gestor-de-talentos'
    //    com permissão para ler a coleção 'onboardings'
    //    e memórias sobre processos de Onboarding
    // ----------------------------------------------------
    try {
      $ai.agents.putTools(app, 'gestor-de-talentos', [
        {
          collection: 'onboardings',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
      ])

      $ai.agents.putMemories(app, 'gestor-de-talentos', [
        {
          type: 'text',
          payload: {
            text: 'Módulo de Onboarding do Contratado:\nO sistema gerencia a recepção e o dia 1 de candidatos aprovados na coleção "onboardings". Cada registro contém o candidato, vaga, data de admissão, status geral (Ativo, Concluído, Cancelado), percentual de conclusão calculado e checklist dividido em categorias: Documentos, Acesso & Sistemas, Primeiros Dias e Treinamento. Você pode consultar prazos, pendências documentais e orientar líderes sobre os primeiros dias do colaborador.',
          },
        },
      ])
    } catch (agentErr) {
      console.log('Aviso ao atualizar agente gestor-de-talentos para onboardings:', agentErr)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('onboardings')
      if (col) app.delete(col)
    } catch (_) {}
  },
)
