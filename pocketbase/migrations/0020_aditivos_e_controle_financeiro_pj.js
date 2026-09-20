/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 0. Se já existir coleção aditivos_pj corrompida sem campos, deleta e recria
    try {
      const oldCol = app.findCollectionByNameOrId('aditivos_pj')
      if (oldCol) {
        app.delete(oldCol)
      }
    } catch (_) {}

    // 1. Obter IDs das coleções existentes
    const prestadoresCol = app.findCollectionByNameOrId('prestadores_pj')
    const contratosCol = app.findCollectionByNameOrId('contratos_pj')

    // 2. Adicionar campo contador_aditivos em contratos_pj se ainda não existir
    if (contratosCol) {
      let jaTemContador = false
      try {
        const fld = contratosCol.fields.getByName('contador_aditivos')
        if (fld) jaTemContador = true
      } catch (_) {}

      if (!jaTemContador) {
        contratosCol.fields.add(
          new NumberField({
            name: 'contador_aditivos',
            min: 0,
          }),
        )
        app.save(contratosCol)
      }
    }

    // 3. Criar coleção aditivos_pj com os campos exatos
    const aditivosCol = new Collection({
      name: 'aditivos_pj',
      type: 'base',
      system: false,
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'numero_aditivo',
          type: 'text',
          required: true,
          min: 1,
          max: 50,
        },
        {
          name: 'sequencia',
          type: 'number',
          required: true,
          min: 1,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'Reajuste de valor',
            'Prolongamento de vigência',
            'Reajuste e Prolongamento',
            'Mudança de escopo',
            'Outro',
          ],
          maxSelect: 1,
        },
        {
          name: 'contrato',
          type: 'relation',
          required: true,
          collectionId: contratosCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'prestador',
          type: 'relation',
          required: true,
          collectionId: prestadoresCol.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'data_assinatura',
          type: 'date',
          required: false,
        },
        {
          name: 'nova_vigencia_fim',
          type: 'date',
          required: false,
        },
        {
          name: 'novo_valor_mensal',
          type: 'number',
          required: false,
          min: 0,
        },
        {
          name: 'valor_anterior',
          type: 'number',
          required: false,
          min: 0,
        },
        {
          name: 'vigencia_anterior_fim',
          type: 'date',
          required: false,
        },
        {
          name: 'descricao',
          type: 'text',
          required: false,
          max: 3000,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Rascunho', 'Pendente de assinatura', 'Vigente'],
          maxSelect: 1,
        },
        {
          name: 'anexo_aditivo',
          type: 'file',
          required: false,
          maxSelect: 1,
          maxSize: 15728640,
          mimeTypes: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/jpeg',
            'image/png',
          ],
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
        'CREATE INDEX idx_aditivos_contrato ON aditivos_pj (contrato)',
        'CREATE INDEX idx_aditivos_prestador ON aditivos_pj (prestador)',
        'CREATE INDEX idx_aditivos_status ON aditivos_pj (status)',
      ],
    })
    app.save(aditivosCol)

    // 4. Conectar agente gestor-de-talentos à nova coleção e atualizar memória
    try {
      $ai.agents.putTools(app, 'gestor-de-talentos', [
        {
          collection: 'aditivos_pj',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
      ])

      $ai.agents.putMemories(app, 'gestor-de-talentos', [
        {
          type: 'text',
          payload: {
            text:
              'Módulo de Aditivos Contratuais e Controle Financeiro PJ:\n' +
              '1. Aditivos Contratuais (aditivos_pj): Cada contrato pode possuir múltiplos aditivos formalizados (Reajuste de valor, Prolongamento de vigência, Reajuste e Prolongamento, Mudança de escopo, Outro). Possui status (Rascunho, Pendente de assinatura, Vigente).\n' +
              '2. Efeito dos Aditivos: Quando um aditivo do tipo prolongamento entra em vigor (Vigente), a nova vigência final do contrato é atualizada; quando do tipo reajuste de valor entra em vigor, o valor mensal do contrato é atualizado, preservando o valor e vigência anteriores no histórico do aditivo.\n' +
              '3. Controle de Valor-Hora: O valor-hora dos prestadores é calculado automaticamente com base na premissa padrão de 160 horas por mês (Valor Mensal ÷ 160h). Para contratos por projeto ou por hora, exibe-se a equivalência estimada.\n' +
              '4. Prazos e Alertas: Contratos vencendo em até 30 dias geram alerta. Aditivos com status "Pendente de assinatura" há mais de 7 dias também acionam alertas prioritários de compliance no sino e no e-mail de Gente & Gestão.',
          },
        },
      ])
    } catch (agentErr) {
      console.log('Aviso ao atualizar agente gestor-de-talentos com aditivos_pj:', agentErr)
    }

    // 5. Inserir Seeds Realistas
    try {
      // Seed 1 para Nexus Cloud (id: 2hpaeyv6fptjt23, contrato: 8v4mrmounlzwyff)
      const ad1 = new Record(aditivosCol)
      ad1.set('numero_aditivo', 'ADIT-2025-01')
      ad1.set('sequencia', 1)
      ad1.set('tipo', 'Reajuste de valor')
      ad1.set('contrato', '8v4mrmounlzwyff')
      ad1.set('prestador', '2hpaeyv6fptjt23')
      ad1.set('data_assinatura', '2025-07-01 00:00:00.000Z')
      ad1.set('valor_anterior', 20000)
      ad1.set('novo_valor_mensal', 24500)
      ad1.set('vigencia_anterior_fim', '2025-12-31 00:00:00.000Z')
      ad1.set('nova_vigencia_fim', '2025-12-31 00:00:00.000Z')
      ad1.set(
        'descricao',
        'Reajuste anual inflacionário e inclusão de sustentação 24x7 para novos clusters de microsserviços em São Paulo e Virgínia.',
      )
      ad1.set('status', 'Vigente')
      app.save(ad1)

      // Seed 2 para Nexus Cloud: Aditivo 02 - Prolongamento de Vigência
      const ad2 = new Record(aditivosCol)
      ad2.set('numero_aditivo', 'ADIT-2025-02')
      ad2.set('sequencia', 2)
      ad2.set('tipo', 'Prolongamento de vigência')
      ad2.set('contrato', '8v4mrmounlzwyff')
      ad2.set('prestador', '2hpaeyv6fptjt23')
      ad2.set('data_assinatura', '2025-11-20 00:00:00.000Z')
      ad2.set('valor_anterior', 24500)
      ad2.set('novo_valor_mensal', 24500)
      ad2.set('vigencia_anterior_fim', '2025-12-31 00:00:00.000Z')
      ad2.set('nova_vigencia_fim', '2026-12-31 00:00:00.000Z')
      ad2.set(
        'descricao',
        'Prorrogação da vigência contratual por mais 12 (doze) meses, mantendo o escopo e SLA acordados no aditivo anterior.',
      )
      ad2.set('status', 'Vigente')
      app.save(ad2)

      // Atualizar contrato Nexus Cloud com contador
      try {
        const ctNexus = app.findRecordById('contratos_pj', '8v4mrmounlzwyff')
        ctNexus.set('contador_aditivos', 2)
        app.save(ctNexus)
      } catch (_) {}

      // Seed 3 para Vértice Mídia (id: 5r0iaorzoycr27j, contrato: ic3d5zlkyi7kiy0)
      const ad3 = new Record(aditivosCol)
      ad3.set('numero_aditivo', 'ADIT-2026-01')
      ad3.set('sequencia', 1)
      ad3.set('tipo', 'Reajuste e Prolongamento')
      ad3.set('contrato', 'ic3d5zlkyi7kiy0')
      ad3.set('prestador', '5r0iaorzoycr27j')
      ad3.set('data_assinatura', '')
      ad3.set('valor_anterior', 14000)
      ad3.set('novo_valor_mensal', 16500)
      ad3.set('vigencia_anterior_fim', '2026-10-10 00:00:00.000Z')
      ad3.set('nova_vigencia_fim', '2027-10-10 00:00:00.000Z')
      ad3.set(
        'descricao',
        'Renovação antecipada do contrato de Employer Branding por mais 12 meses, com acréscimo de podcasts com líderes e reajuste para R$ 16.500/mês.',
      )
      ad3.set('status', 'Pendente de assinatura')
      app.save(ad3)

      // Atualizar contrato Vértice Mídia com contador
      try {
        const ctVertice = app.findRecordById('contratos_pj', 'ic3d5zlkyi7kiy0')
        ctVertice.set('contador_aditivos', 1)
        app.save(ctVertice)
      } catch (_) {}

      // Atualizar marco de aditivo_contrato para Vértice Mídia
      try {
        const marcosVertice = app.findRecordsByFilter(
          'marcos_lifecycle_pj',
          "prestador = '5r0iaorzoycr27j' && chave_marco = 'aditivo_contrato'",
          '',
          1,
          0,
        )
        if (marcosVertice && marcosVertice.length > 0) {
          const m = marcosVertice[0]
          m.set('status', 'PENDENTE DO PJ')
          m.set(
            'observacao',
            'Aditivo ADIT-2026-01 gerado e aguardando assinatura da sócia Camila Vasconcelos',
          )
          app.save(m)
        }
      } catch (_) {}

      // Criar alerta para aditivo pendente de assinatura da Vértice Mídia
      try {
        const alertasCol = app.findCollectionByNameOrId('alertas')
        if (alertasCol) {
          const al = new Record(alertasCol)
          al.set('prestador', '5r0iaorzoycr27j')
          al.set('score', 92)
          al.set('tipo', 'aditivo_pj_pendente')
          al.set('status', 'Novo')
          al.set(
            'resumo_ia',
            'Aditivo Contratual Pendente de Assinatura: O Aditivo ADIT-2026-01 (Renovação & Reajuste para R$ 16.500) com Vértice Mídia & Branding aguarda assinatura da contratada há mais de 7 dias.',
          )
          al.set('criado_em', '2026-09-12 10:00:00.000Z')
          app.save(al)
        }
      } catch (alErr) {
        console.log('Aviso ao criar alerta inicial de aditivo:', alErr)
      }
    } catch (seedErr) {
      console.log('Aviso ao inserir seeds de aditivos_pj:', seedErr)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('aditivos_pj')
      if (col) app.delete(col)
    } catch (_) {}
  },
)
