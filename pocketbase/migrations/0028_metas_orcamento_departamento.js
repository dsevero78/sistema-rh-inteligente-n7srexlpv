/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Criar coleção 'metas_orcamento_departamento'
    let col = null
    try {
      col = app.findCollectionByNameOrId('metas_orcamento_departamento')
    } catch (_) {}

    if (!col) {
      col = new Collection({
        name: 'metas_orcamento_departamento',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'departamento',
            type: 'text',
            required: true,
          },
          {
            name: 'limite_mensal',
            type: 'number',
            min: 0,
            required: true,
          },
          {
            name: 'ativo',
            type: 'bool',
          },
          {
            name: 'criado_por',
            type: 'text',
          },
          {
            name: 'atualizado_por',
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
        indexes: [
          'CREATE UNIQUE INDEX idx_metas_departamento ON metas_orcamento_departamento (departamento)',
          'CREATE INDEX idx_metas_ativo ON metas_orcamento_departamento (ativo)',
        ],
      })
      app.save(col)
    }

    // 2. Seed idempotente de metas para departamentos existentes alinhados aos prestadores e vagas:
    // - TI (Tecnologia): Nexus Cloud R$ 24.500 + Backend Sênior proposta/vaga ~R$ 16.500 = ~R$ 41.000.
    //   Definimos limite_mensal = 38000 -> Estourado (> 100% de uso: ~107%) -> semáforo VERMELHO
    // - Marketing: Vértice Mídia R$ 14.000 (com aditivo R$ 16.500) + vaga R$ 8.000 = ~R$ 22.000.
    //   Definimos limite_mensal = 23000 -> Em atenção (≥ 90% e ≤ 100%: ~95%) -> semáforo ÂMBAR
    // - Jurídico: Silveira Advocacia R$ 9.800.
    //   Definimos limite_mensal = 15000 -> Dentro do orçamento (< 90%: ~65%) -> semáforo VERDE
    const seedMetas = [
      {
        departamento: 'Tecnologia',
        limite_mensal: 38000,
        ativo: true,
        criado_por: 'Diretoria de Gente & Gestão',
        atualizado_por: 'Diretoria de Gente & Gestão',
      },
      {
        departamento: 'Marketing',
        limite_mensal: 23000,
        ativo: true,
        criado_por: 'Coordenação de RH',
        atualizado_por: 'Coordenação de RH',
      },
      {
        departamento: 'Jurídico',
        limite_mensal: 15000,
        ativo: true,
        criado_por: 'Gestão Financeira & RH',
        atualizado_por: 'Gestão Financeira & RH',
      },
    ]

    for (let i = 0; i < seedMetas.length; i++) {
      const item = seedMetas[i]
      try {
        app.findFirstRecordByData('metas_orcamento_departamento', 'departamento', item.departamento)
        // Já existe, não recriar
      } catch (_) {
        const targetCol = app.findCollectionByNameOrId('metas_orcamento_departamento')
        const rec = new Record(targetCol)
        rec.set('departamento', item.departamento)
        rec.set('limite_mensal', item.limite_mensal)
        rec.set('ativo', item.ativo)
        rec.set('criado_por', item.criado_por)
        rec.set('atualizado_por', item.atualizado_por)
        app.save(rec)
      }
    }

    // 3. Atualizar Agente "Gestor de Talentos" com acesso de leitura à nova coleção e nova diretriz
    try {
      $ai.agents.putTools(app, 'gestor-de-talentos', [
        {
          collection: 'metas_orcamento_departamento',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
      ])

      $ai.agents.putMemories(app, 'gestor-de-talentos', [
        {
          type: 'text',
          payload: {
            text:
              'Metas de Orçamento por Departamento:\n' +
              'Gente & Gestão define limites mensais de orçamento (limite_mensal em R$) por departamento (coleção metas_orcamento_departamento).\n' +
              'O gasto e a projeção departamental somam as prestações PJ do setor, notas fiscais previstas e a folha estimada de novas contratações ativas (ofertas aceitas e onboardings).\n' +
              'Classificação de status por departamento:\n' +
              '- Dentro do orçamento: Projeção < 90% do limite mensal (status verde);\n' +
              '- Em atenção: Projeção entre 90% e 100% do limite mensal (status âmbar/amarelo);\n' +
              '- Estourado / Ultrapassado: Projeção > 100% do limite mensal (status vermelho com alerta prioritário no sino).\n' +
              'Quando o usuário perguntar sobre orçamento departamental, limite ou estouro de custos por área, consulte as metas e os custos de prestadores e vagas para responder com precisão executiva.',
          },
        },
      ])
    } catch (agentErr) {
      console.log('Aviso ao registrar metas_orcamento_departamento no agente:', agentErr)
    }
  },
  (app) => {
    // Down migration
    try {
      $ai.agents.deleteTools(app, 'gestor-de-talentos', ['metas_orcamento_departamento'])
    } catch (_) {}

    try {
      const col = app.findCollectionByNameOrId('metas_orcamento_departamento')
      if (col) {
        app.delete(col)
      }
    } catch (_) {}
  },
)
