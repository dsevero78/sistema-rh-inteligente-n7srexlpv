migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'
    let pessoasColId = ''
    let contratosColId = ''
    let prestadoresColId = ''

    try {
      pessoasColId = app.findCollectionByNameOrId('pessoas').id
    } catch (_) {}

    try {
      contratosColId = app.findCollectionByNameOrId('contratos_pj').id
    } catch (_) {}

    try {
      prestadoresColId = app.findCollectionByNameOrId('prestadores_pj').id
    } catch (_) {}

    // 1. Coleção apontamentos_horas
    // pessoa (relação), vínculo/contrato de referência, competência (AAAA-MM), data, horas (decimal), tipo, descrição, status, auditoria
    const apontamentosFields = [
      {
        name: 'pessoa',
        type: 'relation',
        collectionId: pessoasColId,
        cascadeDelete: true,
        maxSelect: 1,
        required: true,
      },
      { name: 'competencia', type: 'text', required: true }, // Formato 'AAAA-MM'
      { name: 'data', type: 'date', required: true },
      { name: 'horas', type: 'number', required: true },
      {
        name: 'tipo',
        type: 'select',
        required: true,
        values: ['Normal', 'Extra', 'Sobreaviso', 'Compensação'],
        maxSelect: 1,
      },
      { name: 'descricao', type: 'text', required: false },
      {
        name: 'status',
        type: 'select',
        required: true,
        values: ['Pendente', 'Aprovado', 'Rejeitado'],
        maxSelect: 1,
      },
      { name: 'vinculo_referencia', type: 'text', required: false },
      { name: 'criado_por', type: 'text', required: false },
      { name: 'atualizado_por', type: 'text', required: false },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ]

    if (contratosColId) {
      apontamentosFields.push({
        name: 'contrato',
        type: 'relation',
        collectionId: contratosColId,
        cascadeDelete: false,
        maxSelect: 1,
        required: false,
      })
    }

    const apontamentosCol = new Collection({
      name: 'apontamentos_horas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: apontamentosFields,
      indexes: [],
    })
    app.save(apontamentosCol)
    const apontamentosSavedId = app.findCollectionByNameOrId('apontamentos_horas').id

    // 2. Coleção fechamentos_competencia
    // pessoa + vínculo + competência, total de horas, valor/hora congelado, valor total calculado, status do ciclo, histórico de eventos
    const fechamentosFields = [
      {
        name: 'pessoa',
        type: 'relation',
        collectionId: pessoasColId,
        cascadeDelete: true,
        maxSelect: 1,
        required: true,
      },
      { name: 'competencia', type: 'text', required: true }, // 'AAAA-MM'
      { name: 'total_horas', type: 'number', required: true },
      { name: 'horas_normais', type: 'number', required: false },
      { name: 'horas_extras', type: 'number', required: false },
      { name: 'horas_sobreaviso', type: 'number', required: false },
      { name: 'horas_base_contrato', type: 'number', required: false }, // ex: 160
      { name: 'valor_hora_congelado', type: 'number', required: true },
      { name: 'valor_total_calculado', type: 'number', required: true },
      {
        name: 'status_ciclo',
        type: 'select',
        required: true,
        values: [
          'Em apontamento',
          'Aguardando validação do gestor',
          'Devolvido para ajustes',
          'Validado',
          'NF solicitada',
          'NF recebida',
          'Fechado',
        ],
        maxSelect: 1,
      },
      {
        name: 'gestor_validador',
        type: 'relation',
        collectionId: usersColId,
        cascadeDelete: false,
        maxSelect: 1,
        required: false,
      },
      { name: 'gestor_nome', type: 'text', required: false },
      { name: 'data_validacao', type: 'date', required: false },
      { name: 'parecer_gestor', type: 'text', required: false },
      { name: 'historico_eventos', type: 'json', required: false }, // array de { data, autor, acao, observacao }
      { name: 'vinculo_referencia', type: 'text', required: false },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ]

    if (contratosColId) {
      fechamentosFields.push({
        name: 'contrato',
        type: 'relation',
        collectionId: contratosColId,
        cascadeDelete: false,
        maxSelect: 1,
        required: false,
      })
    }

    if (prestadoresColId) {
      fechamentosFields.push({
        name: 'prestador',
        type: 'relation',
        collectionId: prestadoresColId,
        cascadeDelete: false,
        maxSelect: 1,
        required: false,
      })
    }

    const fechamentosCol = new Collection({
      name: 'fechamentos_competencia',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: fechamentosFields,
      indexes: [],
    })
    app.save(fechamentosCol)
    const fechamentosSavedId = app.findCollectionByNameOrId('fechamentos_competencia').id

    // 3. Coleção notas_fiscais
    // fechamento de origem, pessoa/prestador, competência, valor, número da NF, data de emissão, data_limite_envio, arquivo da NF (upload real), status, histórico de cobranças
    const nfsFields = [
      {
        name: 'fechamento',
        type: 'relation',
        collectionId: fechamentosSavedId,
        cascadeDelete: false,
        maxSelect: 1,
        required: false,
      },
      {
        name: 'pessoa',
        type: 'relation',
        collectionId: pessoasColId,
        cascadeDelete: false,
        maxSelect: 1,
        required: true,
      },
      { name: 'competencia', type: 'text', required: true }, // 'AAAA-MM'
      { name: 'valor', type: 'number', required: true },
      { name: 'numero_nf', type: 'text', required: false },
      { name: 'data_emissao', type: 'date', required: false },
      { name: 'data_limite_envio', type: 'date', required: false },
      {
        name: 'status',
        type: 'select',
        required: true,
        values: ['Solicitada', 'Recebida', 'Em atraso', 'Conciliada'],
        maxSelect: 1,
      },
      {
        name: 'arquivo_nf',
        type: 'file',
        required: false,
        maxSelect: 1,
        maxSize: 10485760, // 10MB
        mimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'application/xml', 'text/xml'],
      },
      { name: 'historico_cobrancas', type: 'json', required: false }, // array de { data, canal, cobrado_por, observacao }
      { name: 'data_recebimento', type: 'date', required: false },
      { name: 'data_conciliacao', type: 'date', required: false },
      { name: 'conciliado_por', type: 'text', required: false },
      { name: 'observacao', type: 'text', required: false },
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ]

    if (prestadoresColId) {
      nfsFields.push({
        name: 'prestador',
        type: 'relation',
        collectionId: prestadoresColId,
        cascadeDelete: false,
        maxSelect: 1,
        required: false,
      })
    }

    const nfsCol = new Collection({
      name: 'notas_fiscais',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: nfsFields,
      indexes: [],
    })
    app.save(nfsCol)

    // 4. Seeds de demonstração coerentes:
    // Pessoas PJ:
    // 1) Renato Albuquerque (Nexus Cloud) - competência 2026-08 fechada e com NF; competência 2026-09 com apontamentos de horas e fechamento em "Aguardando validação do gestor"
    // 2) Camila Vasconcelos (Vértice Mídia) - competência 2026-08 com NF em atraso; competência 2026-09 em apontamento
    // 3) Dr. Eduardo Silveira (Silveira Advocacia) - competência 2026-08 com NF solicitada
    try {
      const pessoasCol = app.findCollectionByNameOrId('pessoas')
      const apontamentosTable = app.findCollectionByNameOrId('apontamentos_horas')
      const fechamentosTable = app.findCollectionByNameOrId('fechamentos_competencia')
      const nfsTable = app.findCollectionByNameOrId('notas_fiscais')

      let pRenato = null
      let pCamila = null
      let pEduardo = null

      try {
        pRenato = app.findFirstRecordByData(
          'pessoas',
          'email',
          'renato.albuquerque@nexuscloud.tech',
        )
      } catch (_) {}
      try {
        pCamila = app.findFirstRecordByData('pessoas', 'email', 'camila@verticemidia.com.br')
      } catch (_) {}
      try {
        pEduardo = app.findFirstRecordByData('pessoas', 'email', 'eduardo@silveiraadvocacia.com.br')
      } catch (_) {}

      // SEED 1: Renato Albuquerque - Competência 2026-08 (Mês anterior - Fechado e Conciliado)
      if (pRenato) {
        const fechAgo = new Record(fechamentosTable)
        fechAgo.set('pessoa', pRenato.id)
        fechAgo.set('competencia', '2026-08')
        fechAgo.set('total_horas', 160)
        fechAgo.set('horas_normais', 160)
        fechAgo.set('horas_extras', 0)
        fechAgo.set('horas_sobreaviso', 0)
        fechAgo.set('horas_base_contrato', 160)
        fechAgo.set('valor_hora_congelado', 153.13)
        fechAgo.set('valor_total_calculado', 24500)
        fechAgo.set('status_ciclo', 'Fechado')
        fechAgo.set('gestor_nome', 'Carlos Mendonça')
        fechAgo.set('data_validacao', '2026-09-02 10:30:00.000Z')
        fechAgo.set(
          'parecer_gestor',
          'Horas integrais de sprint de Cloud/DevOps aprovadas com excelência.',
        )
        fechAgo.set('vinculo_referencia', 'CT-PJ-2025-014 (Nexus Cloud)')
        fechAgo.set('historico_eventos', [
          {
            data: '2026-08-31T18:00:00Z',
            autor: 'Douglas Severo (RH)',
            acao: 'Envio para validação do gestor',
            observacao: 'Fechamento de competência 2026-08 com 160h normais',
          },
          {
            data: '2026-09-02T10:30:00Z',
            autor: 'Carlos Mendonça (Gestor)',
            acao: 'Validação do gestor',
            observacao: 'Aprovado 160h sem ressalvas',
          },
          {
            data: '2026-09-02T11:00:00Z',
            autor: 'Douglas Severo (RH)',
            acao: 'Solicitação de NF em lote',
            observacao: 'NF solicitada com prazo de 5 dias úteis',
          },
          {
            data: '2026-09-05T15:20:00Z',
            autor: 'Renato Albuquerque',
            acao: 'Upload da NF 2026-891',
            observacao: 'NF recebida e validada',
          },
          {
            data: '2026-09-06T09:00:00Z',
            autor: 'Douglas Severo (RH)',
            acao: 'Conciliação e Fechamento',
            observacao: 'Ciclo encerrado com sucesso',
          },
        ])
        if (pRenato.get('prestador_origem')) {
          fechAgo.set('prestador', pRenato.get('prestador_origem'))
        }
        app.save(fechAgo)

        // NF correspondente de Renato
        const nfRenatoAgo = new Record(nfsTable)
        nfRenatoAgo.set('fechamento', fechAgo.id)
        nfRenatoAgo.set('pessoa', pRenato.id)
        nfRenatoAgo.set('competencia', '2026-08')
        nfRenatoAgo.set('valor', 24500)
        nfRenatoAgo.set('numero_nf', 'NFS-2026-891')
        nfRenatoAgo.set('data_emissao', '2026-09-04 14:00:00.000Z')
        nfRenatoAgo.set('data_limite_envio', '2026-09-09 23:59:59.000Z')
        nfRenatoAgo.set('status', 'Conciliada')
        nfRenatoAgo.set('data_recebimento', '2026-09-05 15:20:00.000Z')
        nfRenatoAgo.set('data_conciliacao', '2026-09-06 09:00:00.000Z')
        nfRenatoAgo.set('conciliado_por', 'Douglas Severo')
        nfRenatoAgo.set('observacao', 'Nota fiscal Nexus Cloud autorizada e conciliada')
        if (pRenato.get('prestador_origem')) {
          nfRenatoAgo.set('prestador', pRenato.get('prestador_origem'))
        }
        app.save(nfRenatoAgo)

        // SEED 2: Renato Albuquerque - Competência 2026-09 (Mês atual - Em validação do Gestor Carlos Mendonça)
        // Apontamentos diários/semanais de horas
        const apontamentosRenato = [
          {
            data: '2026-09-04 18:00:00.000Z',
            horas: 40,
            tipo: 'Normal',
            desc: 'Semana 1: Migração dos clusters Kubernetes e CI/CD',
          },
          {
            data: '2026-09-11 18:00:00.000Z',
            horas: 40,
            tipo: 'Normal',
            desc: 'Semana 2: Otimização de custos AWS/Skip Cloud e réplicas',
          },
          {
            data: '2026-09-18 18:00:00.000Z',
            horas: 40,
            tipo: 'Normal',
            desc: 'Semana 3: Plantão de sustentação e observabilidade Datadog',
          },
          {
            data: '2026-09-20 20:00:00.000Z',
            horas: 8,
            tipo: 'Extra',
            desc: 'Incidente crítico de rede fora do horário comercial',
          },
          {
            data: '2026-09-21 18:00:00.000Z',
            horas: 32,
            tipo: 'Normal',
            desc: 'Semana 4: Revisão de segurança e governança de infra',
          },
        ]

        for (const ap of apontamentosRenato) {
          const recAp = new Record(apontamentosTable)
          recAp.set('pessoa', pRenato.id)
          recAp.set('competencia', '2026-09')
          recAp.set('data', ap.data)
          recAp.set('horas', ap.horas)
          recAp.set('tipo', ap.tipo)
          recAp.set('descricao', ap.desc)
          recAp.set('status', 'Aprovado')
          recAp.set('vinculo_referencia', 'CT-PJ-2025-014')
          recAp.set('criado_por', 'Renato Albuquerque')
          app.save(recAp)
        }

        // Fechamento 2026-09 aguardando validação do gestor Carlos Mendonça
        const fechSet = new Record(fechamentosTable)
        fechSet.set('pessoa', pRenato.id)
        fechSet.set('competencia', '2026-09')
        fechSet.set('total_horas', 160)
        fechSet.set('horas_normais', 152)
        fechSet.set('horas_extras', 8)
        fechSet.set('horas_sobreaviso', 0)
        fechSet.set('horas_base_contrato', 160)
        fechSet.set('valor_hora_congelado', 153.13)
        // 160h x 153.13 = 24.500,80
        fechSet.set('valor_total_calculado', 24500.8)
        fechSet.set('status_ciclo', 'Aguardando validação do gestor')
        fechSet.set('gestor_nome', 'Carlos Mendonça')
        if (pRenato.get('gestor_responsavel')) {
          fechSet.set('gestor_validador', pRenato.get('gestor_responsavel'))
        }
        fechSet.set('vinculo_referencia', 'CT-PJ-2025-014 (Nexus Cloud)')
        fechSet.set('historico_eventos', [
          {
            data: '2026-09-21T16:00:00Z',
            autor: 'Douglas Severo (RH)',
            acao: 'Envio para validação do gestor',
            observacao: 'Fechamento de competência 2026-09 enviado com 152h normais + 8h extras',
          },
        ])
        if (pRenato.get('prestador_origem')) {
          fechSet.set('prestador', pRenato.get('prestador_origem'))
        }
        app.save(fechSet)
      }

      // SEED 3: Camila Vasconcelos (Vértice Mídia)
      // Competência 2026-08 Validada, NF Solicitada e EM ATRASO (dispara cobrança no Meu Dia)
      if (pCamila) {
        const fechCamila = new Record(fechamentosTable)
        fechCamila.set('pessoa', pCamila.id)
        fechCamila.set('competencia', '2026-08')
        fechCamila.set('total_horas', 160)
        fechCamila.set('horas_normais', 160)
        fechCamila.set('horas_extras', 0)
        fechCamila.set('horas_sobreaviso', 0)
        fechCamila.set('horas_base_contrato', 160)
        fechCamila.set('valor_hora_congelado', 87.5)
        fechCamila.set('valor_total_calculado', 14000)
        fechCamila.set('status_ciclo', 'NF solicitada')
        fechCamila.set('gestor_nome', 'Mariana Siqueira')
        fechCamila.set('data_validacao', '2026-09-03 11:00:00.000Z')
        fechCamila.set(
          'parecer_gestor',
          'Entregas de Employer Branding e cases audiovisuais validadas.',
        )
        fechCamila.set('vinculo_referencia', 'CT-PJ-2025-089 (Vértice Mídia)')
        fechCamila.set('historico_eventos', [
          {
            data: '2026-09-03T11:00:00Z',
            autor: 'Mariana Siqueira (Gestora)',
            acao: 'Validação de horas',
            observacao: '160h aprovadas',
          },
          {
            data: '2026-09-04T10:00:00Z',
            autor: 'Douglas Severo (RH)',
            acao: 'Solicitação de NF em lote',
            observacao: 'NF solicitada no valor de R$ 14.000,00',
          },
        ])
        if (pCamila.get('prestador_origem')) {
          fechCamila.set('prestador', pCamila.get('prestador_origem'))
        }
        app.save(fechCamila)

        // NF em atraso da Camila (prazo venceu em 2026-09-11)
        const nfCamila = new Record(nfsTable)
        nfCamila.set('fechamento', fechCamila.id)
        nfCamila.set('pessoa', pCamila.id)
        nfCamila.set('competencia', '2026-08')
        nfCamila.set('valor', 14000)
        nfCamila.set('data_limite_envio', '2026-09-11 23:59:59.000Z')
        nfCamila.set('status', 'Em atraso')
        nfCamila.set('observacao', 'NF de agosto pendente de emissão pela Vértice Mídia')
        nfCamila.set('historico_cobrancas', [
          {
            data: '2026-09-12T14:00:00Z',
            canal: 'Email',
            cobrado_por: 'Douglas Severo',
            observacao: 'Lembrete automático de atraso no envio da NF',
          },
        ])
        if (pCamila.get('prestador_origem')) {
          nfCamila.set('prestador', pCamila.get('prestador_origem'))
        }
        app.save(nfCamila)

        // Competência 2026-09 de Camila: Em apontamento com 120h lançadas até agora
        const recApCamila = new Record(apontamentosTable)
        recApCamila.set('pessoa', pCamila.id)
        recApCamila.set('competencia', '2026-09')
        recApCamila.set('data', '2026-09-15 18:00:00.000Z')
        recApCamila.set('horas', 120)
        recApCamila.set('tipo', 'Normal')
        recApCamila.set('descricao', 'Campanha Employer Branding Q3 e produção de vídeos')
        recApCamila.set('status', 'Pendente')
        recApCamila.set('vinculo_referencia', 'CT-PJ-2025-089')
        recApCamila.set('criado_por', 'Camila Vasconcelos')
        app.save(recApCamila)

        const fechCamilaSet = new Record(fechamentosTable)
        fechCamilaSet.set('pessoa', pCamila.id)
        fechCamilaSet.set('competencia', '2026-09')
        fechCamilaSet.set('total_horas', 120)
        fechCamilaSet.set('horas_normais', 120)
        fechCamilaSet.set('horas_extras', 0)
        fechCamilaSet.set('horas_sobreaviso', 0)
        fechCamilaSet.set('horas_base_contrato', 160)
        fechCamilaSet.set('valor_hora_congelado', 87.5)
        fechCamilaSet.set('valor_total_calculado', 10500)
        fechCamilaSet.set('status_ciclo', 'Em apontamento')
        fechCamilaSet.set('gestor_nome', 'Mariana Siqueira')
        fechCamilaSet.set('vinculo_referencia', 'CT-PJ-2025-089 (Vértice Mídia)')
        if (pCamila.get('prestador_origem')) {
          fechCamilaSet.set('prestador', pCamila.get('prestador_origem'))
        }
        app.save(fechCamilaSet)
      }

      // SEED 4: Dr. Eduardo Silveira (Silveira Advocacia)
      // Competência 2026-08 Validada, NF Solicitada (dentro do prazo de entrega)
      if (pEduardo) {
        const fechEduardo = new Record(fechamentosTable)
        fechEduardo.set('pessoa', pEduardo.id)
        fechEduardo.set('competencia', '2026-08')
        fechEduardo.set('total_horas', 160)
        fechEduardo.set('horas_normais', 160)
        fechEduardo.set('horas_extras', 0)
        fechEduardo.set('horas_sobreaviso', 0)
        fechEduardo.set('horas_base_contrato', 160)
        fechEduardo.set('valor_hora_congelado', 70.0)
        fechEduardo.set('valor_total_calculado', 11200)
        fechEduardo.set('status_ciclo', 'Validado')
        fechEduardo.set('gestor_nome', 'Mariana Siqueira')
        fechEduardo.set('data_validacao', '2026-09-04 15:00:00.000Z')
        fechEduardo.set('parecer_gestor', 'Consultoria jurídica trabalhista e aditivos aprovados.')
        fechEduardo.set('vinculo_referencia', 'CT-PJ-2024-003 (Silveira Advocacia)')
        if (pEduardo.get('prestador_origem')) {
          fechEduardo.set('prestador', pEduardo.get('prestador_origem'))
        }
        app.save(fechEduardo)
      }
    } catch (err) {
      console.log('Aviso ao popular seeds de horas e NFs:', err)
    }
  },
  (app) => {
    try {
      const col3 = app.findCollectionByNameOrId('notas_fiscais')
      app.delete(col3)
    } catch (_) {}
    try {
      const col2 = app.findCollectionByNameOrId('fechamentos_competencia')
      app.delete(col2)
    } catch (_) {}
    try {
      const col1 = app.findCollectionByNameOrId('apontamentos_horas')
      app.delete(col1)
    } catch (_) {}
  },
)
