/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const vagasCol = app.findCollectionByNameOrId('vagas')
    const candidatosCol = app.findCollectionByNameOrId('candidatos')
    const pipelineCol = app.findCollectionByNameOrId('pipeline')

    // ----------------------------------------------------
    // 1. Coleção 'ofertas'
    // ----------------------------------------------------
    const ofertas = new Collection({
      name: 'ofertas',
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
        {
          name: 'pipeline',
          type: 'relation',
          required: false,
          collectionId: pipelineCol.id,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'salario_ofertado', type: 'number', required: true },
        { name: 'beneficios', type: 'text' },
        { name: 'data_proposta', type: 'date', required: true },
        { name: 'data_limite_resposta', type: 'date', required: true },
        {
          name: 'status',
          type: 'select',
          values: ['Enviada', 'Aceita', 'Recusada', 'Em negociação', 'Expirada'],
          maxSelect: 1,
          required: true,
        },
        { name: 'motivo_recusa', type: 'text' },
        { name: 'contramedida', type: 'text' },
        { name: 'observacoes', type: 'text' },
        { name: 'criado_em', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ofertas_vaga ON ofertas (vaga)',
        'CREATE INDEX idx_ofertas_candidato ON ofertas (candidato)',
        'CREATE INDEX idx_ofertas_status ON ofertas (status)',
        'CREATE INDEX idx_ofertas_data_proposta ON ofertas (data_proposta)',
      ],
    })
    app.save(ofertas)

    // ----------------------------------------------------
    // 2. Coleção 'preferencias_alerta'
    // ----------------------------------------------------
    const preferenciasAlerta = new Collection({
      name: 'preferencias_alerta',
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
          required: false,
          collectionId: vagasCol.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'ativo', type: 'bool' },
        { name: 'limiar_score', type: 'number' },
        { name: 'destinatarios', type: 'json' }, // lista de emails: ["severo.douglas2@gmail.com", ...]
        { name: 'silenciar_ate', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_pref_alerta_vaga ON preferencias_alerta (vaga)'],
    })
    app.save(preferenciasAlerta)

    // ----------------------------------------------------
    // 3. Atualizar o agente nativo 'gestor-de-talentos' com ofertas
    // ----------------------------------------------------
    try {
      const ofertasCol = app.findCollectionByNameOrId('ofertas')
      $ai.agents.putTools(app, 'gestor-de-talentos', [
        {
          collection: ofertasCol.id,
          perms: { read: true, list: true, create: true, update: true },
          actAs: 'admin',
        },
      ])

      $ai.agents.putMemories(app, 'gestor-de-talentos', [
        {
          type: 'text',
          payload: {
            text: 'Módulo de Ofertas e Propostas Salariais:\n1. A coleção "ofertas" armazena as propostas de contratação formalizadas para os candidatos. Campos: vaga, candidato, pipeline, salario_ofertado, beneficios, data_proposta, data_limite_resposta, status ("Enviada", "Aceita", "Recusada", "Em negociação", "Expirada"), motivo_recusa, contramedida, observacoes e criado_em.\n2. Quando o usuário perguntar sobre propostas ("quantas propostas enviadas?", "qual o status da oferta de X?", "propostas aceitas ou recusadas"), consulte a coleção ofertas.\n3. Se uma oferta for recusada, analise o motivo_recusa e sugira contramedidas ou encaminhamento para o Banco de Talentos.',
          },
        },
      ])
    } catch (agentErr) {
      console.log('Aviso ao adicionar coleção ofertas ao agente gestor-de-talentos:', agentErr)
    }

    // ----------------------------------------------------
    // 4. Seeds Idempotentes: Preferências de alerta iniciais
    // ----------------------------------------------------
    try {
      const prefCol = app.findCollectionByNameOrId('preferencias_alerta')

      // Configuração Global (vaga = null)
      try {
        const existeGlobal = app.findRecordsByFilter(
          'preferencias_alerta',
          "vaga = '' || vaga = null",
          '',
          1,
          0,
        )
        if (!existeGlobal || existeGlobal.length === 0) {
          const prefGlobal = new Record(prefCol)
          prefGlobal.set('vaga', null)
          prefGlobal.set('ativo', true)
          prefGlobal.set('limiar_score', 75)
          prefGlobal.set('destinatarios', ['severo.douglas2@gmail.com', 'gente.gestao@empresa.com'])
          app.save(prefGlobal)
        }
      } catch (errGlobal) {
        console.log('Aviso ao semear preferência global:', errGlobal)
      }

      // Configuração específica para vaga Backend Sênior (limiar mais alto: 85)
      try {
        const vagaBackend = app.findFirstRecordByData(
          'vagas',
          'titulo',
          'Desenvolvedor(a) Backend Sênior',
        )
        if (vagaBackend) {
          const existeVaga = app.findRecordsByFilter(
            'preferencias_alerta',
            "vaga = '" + vagaBackend.id + "'",
            '',
            1,
            0,
          )
          if (!existeVaga || existeVaga.length === 0) {
            const prefVaga = new Record(prefCol)
            prefVaga.set('vaga', vagaBackend.id)
            prefVaga.set('ativo', true)
            prefVaga.set('limiar_score', 85)
            prefVaga.set('destinatarios', ['severo.douglas2@gmail.com', 'techlead@empresa.com'])
            app.save(prefVaga)
          }
        }
      } catch (errVaga) {
        console.log('Aviso ao semear preferência para vaga backend:', errVaga)
      }
    } catch (prefSeedErr) {
      console.log('Aviso ao semear preferencias_alerta:', prefSeedErr)
    }

    // ----------------------------------------------------
    // 5. Seeds Idempotentes: Ofertas e propostas realistas
    // ----------------------------------------------------
    try {
      const ofertasCol = app.findCollectionByNameOrId('ofertas')

      // Candidatos
      let candJuliana = null
      let candLeonardo = null
      let candCamila = null
      let candLucas = null

      try {
        candJuliana = app.findFirstRecordByData('candidatos', 'email', 'juliana.mendes@exemplo.com')
      } catch (_) {}
      try {
        candLeonardo = app.findFirstRecordByData(
          'candidatos',
          'email',
          'leonardo.bastos@exemplo.com',
        )
      } catch (_) {}
      try {
        candCamila = app.findFirstRecordByData('candidatos', 'email', 'camila.ribeiro@exemplo.com')
      } catch (_) {}
      try {
        candLucas = app.findFirstRecordByData('candidatos', 'email', 'lucas.ferreira@exemplo.com')
      } catch (_) {}

      // Vagas
      let vagaRh = null
      let vagaBackend = null
      let vagaDesign = null

      try {
        vagaRh = app.findFirstRecordByData('vagas', 'titulo', 'Analista de Gente & Gestão')
      } catch (_) {}
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

      // Pipeline Juliana (se existir)
      let pipelineJuliana = null
      if (candJuliana) {
        try {
          const pList = app.findRecordsByFilter(
            'pipeline',
            "candidato = '" + candJuliana.id + "'",
            '-created',
            1,
            0,
          )
          if (pList && pList.length > 0) pipelineJuliana = pList[0]
        } catch (_) {}
      }

      const agora = new Date()
      const d1 =
        new Date(agora.getTime() - 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19) + 'Z'
      const dLimite1 =
        new Date(agora.getTime() + 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19) + 'Z'

      const d2 =
        new Date(agora.getTime() - 15 * 24 * 60 * 60 * 1000)
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19) + 'Z'
      const dLimite2 =
        new Date(agora.getTime() - 8 * 24 * 60 * 60 * 1000)
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19) + 'Z'

      const d3 =
        new Date(agora.getTime() - 5 * 24 * 60 * 60 * 1000)
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19) + 'Z'
      const dLimite3 =
        new Date(agora.getTime() + 2 * 24 * 60 * 60 * 1000)
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19) + 'Z'

      // Oferta 1: Juliana Mendes (Status: Enviada / Em negociação)
      if (candJuliana && vagaRh) {
        try {
          const jaTem = app.findRecordsByFilter(
            'ofertas',
            "candidato = '" + candJuliana.id + "'",
            '',
            1,
            0,
          )
          if (!jaTem || jaTem.length === 0) {
            const of1 = new Record(ofertasCol)
            of1.set('vaga', vagaRh.id)
            of1.set('candidato', candJuliana.id)
            if (pipelineJuliana) of1.set('pipeline', pipelineJuliana.id)
            of1.set('salario_ofertado', 8500)
            of1.set(
              'beneficios',
              'Vale Alimentação/Refeição R$ 1.200, Plano de Saúde Bradesco Top Nacional, Seguro de Vida, Auxílio Home Office R$ 350, Gympass.',
            )
            of1.set('data_proposta', d1)
            of1.set('data_limite_resposta', dLimite1)
            of1.set('status', 'Em negociação')
            of1.set(
              'observacoes',
              'Candidata solicitou flexibilização no auxílio creche e ajuste na data de admissão.',
            )
            of1.set(
              'contramedida',
              'Aprovado abono para admissão no início do próximo mês e inclusão no plano de previdência corporativo.',
            )
            of1.set('criado_em', d1)
            app.save(of1)
          }
        } catch (e1) {
          console.log('Aviso ao semear oferta 1:', e1)
        }
      }

      // Oferta 2: Leonardo Bastos (Status: Recusada - motivo salarial, gerou ida ao Banco)
      if (candLeonardo && vagaBackend) {
        try {
          const jaTem = app.findRecordsByFilter(
            'ofertas',
            "candidato = '" + candLeonardo.id + "'",
            '',
            1,
            0,
          )
          if (!jaTem || jaTem.length === 0) {
            const of2 = new Record(ofertasCol)
            of2.set('vaga', vagaBackend.id)
            of2.set('candidato', candLeonardo.id)
            of2.set('salario_ofertado', 16500)
            of2.set(
              'beneficios',
              'VR/VA R$ 1.500, Plano de Saúde SulAmérica Executivo, Bônus semestral de até 2 salários, Equipamento Apple M3.',
            )
            of2.set('data_proposta', d2)
            of2.set('data_limite_resposta', dLimite2)
            of2.set('status', 'Recusada')
            of2.set(
              'motivo_recusa',
              'Recebeu contraproposta da empresa atual com promoção para Staff Engineer e remuneração superior.',
            )
            of2.set(
              'contramedida',
              'Mantido relacionamento no Banco de Talentos com prioridade absoluta para futuras posições de Tech Lead/Especialista.',
            )
            of2.set(
              'observacoes',
              'Leonardo deixou portas abertas e destacou o alto profissionalismo do processo de R&S.',
            )
            of2.set('criado_em', d2)
            app.save(of2)
          }
        } catch (e2) {
          console.log('Aviso ao semear oferta 2:', e2)
        }
      }

      // Oferta 3: Camila Ribeiro (Status: Aceita)
      if (candCamila && vagaDesign) {
        try {
          const jaTem = app.findRecordsByFilter(
            'ofertas',
            "candidato = '" + candCamila.id + "'",
            '',
            1,
            0,
          )
          if (!jaTem || jaTem.length === 0) {
            const of3 = new Record(ofertasCol)
            of3.set('vaga', vagaDesign.id)
            of3.set('candidato', candCamila.id)
            of3.set('salario_ofertado', 11000)
            of3.set(
              'beneficios',
              'VR/VA R$ 1.300, Plano de Saúde Amil Dental/Médico, Licença Figma Enterprise, Budget Anual de Treinamentos R$ 4.000.',
            )
            of3.set('data_proposta', d3)
            of3.set('data_limite_resposta', dLimite3)
            of3.set('status', 'Aceita')
            of3.set(
              'observacoes',
              'Proposta aceita formalmente por e-mail com início programado para o dia 1º do próximo mês.',
            )
            of3.set('criado_em', d3)
            app.save(of3)
          }
        } catch (e3) {
          console.log('Aviso ao semear oferta 3:', e3)
        }
      }

      // Oferta 4: Lucas Ferreira (Status: Enviada)
      if (candLucas && vagaBackend) {
        try {
          const jaTem = app.findRecordsByFilter(
            'ofertas',
            "candidato = '" + candLucas.id + "'",
            '',
            1,
            0,
          )
          if (!jaTem || jaTem.length === 0) {
            const of4 = new Record(ofertasCol)
            of4.set('vaga', vagaBackend.id)
            of4.set('candidato', candLucas.id)
            of4.set('salario_ofertado', 15500)
            of4.set(
              'beneficios',
              'VR/VA R$ 1.400, Plano de Saúde Bradesco Saúde, Auxílio Home Office R$ 400, Gympass Platinum.',
            )
            of4.set('data_proposta', d1)
            of4.set('data_limite_resposta', dLimite1)
            of4.set('status', 'Enviada')
            of4.set(
              'observacoes',
              'Carta oferta formal enviada para assinatura digital via DocuSign.',
            )
            of4.set('criado_em', d1)
            app.save(of4)
          }
        } catch (e4) {
          console.log('Aviso ao semear oferta 4:', e4)
        }
      }
    } catch (seedOfertasErr) {
      console.log('Aviso ao semear coleção ofertas:', seedOfertasErr)
    }
  },
  (app) => {
    try {
      $ai.agents.deleteTools(app, 'gestor-de-talentos', ['ofertas'])
    } catch (_) {}

    try {
      const ofertas = app.findCollectionByNameOrId('ofertas')
      app.delete(ofertas)
    } catch (_) {}

    try {
      const preferenciasAlerta = app.findCollectionByNameOrId('preferencias_alerta')
      app.delete(preferenciasAlerta)
    } catch (_) {}
  },
)
