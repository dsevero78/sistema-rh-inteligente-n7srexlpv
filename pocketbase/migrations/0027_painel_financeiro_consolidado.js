/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Garantir campo 'orcamento_mensal' na coleção 'vagas'
    const vagasCol = app.findCollectionByNameOrId('vagas')
    if (vagasCol) {
      let hasOrcamento = false
      try {
        if (vagasCol.fields.getByName('orcamento_mensal')) {
          hasOrcamento = true
        }
      } catch (_) {}

      if (!hasOrcamento) {
        vagasCol.fields.add(
          new NumberField({
            name: 'orcamento_mensal',
            min: 0,
          }),
        )
        app.save(vagasCol)
      }
    }

    // 2. Atualizar orçamento estimado nas vagas existentes para cruzar com folha e prestadores
    try {
      const vagasExistentes = app.findRecordsByFilter('vagas', '', '', 50, 0)
      for (let i = 0; i < vagasExistentes.length; i++) {
        const v = vagasExistentes[i]
        const tit = v.getString('titulo') || ''
        let orc = 12000
        if (tit.includes('Backend Sênior')) {
          orc = 18000
        } else if (tit.includes('Marketing')) {
          orc = 8000
        } else if (tit.includes('Product Designer')) {
          orc = 12000
        } else if (tit.includes('Gente & Gestão')) {
          orc = 9000
        }
        v.set('orcamento_mensal', orc)
        app.save(v)
      }
    } catch (errVagas) {
      console.log('Aviso ao atualizar orcamento_mensal em vagas:', errVagas)
    }

    // 3. Obter IDs dos 3 prestadores existentes e seus contratos
    const notasCol = app.findCollectionByNameOrId('notas_fiscais_pj')
    let p1 = null
    let p2 = null
    let p3 = null
    let c1 = null
    let c2 = null
    let c3 = null

    try {
      p1 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '28.491.503/0001-82')
    } catch (_) {}
    try {
      p2 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '34.819.204/0001-95')
    } catch (_) {}
    try {
      p3 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '19.340.892/0001-30')
    } catch (_) {}

    try {
      c1 = app.findFirstRecordByData('contratos_pj', 'numero_contrato', 'CT-PJ-2025-014')
    } catch (_) {}
    try {
      c2 = app.findFirstRecordByData('contratos_pj', 'numero_contrato', 'CT-PJ-2025-089')
    } catch (_) {}
    try {
      c3 = app.findFirstRecordByData('contratos_pj', 'numero_contrato', 'CT-PJ-2024-003')
    } catch (_) {}

    // 4. Semear NFs de competências passadas, do mês corrente e futuras previstas
    // Assegura idempotência verificando se a NF já existe por 'numero_nf'
    if (notasCol && p1 && c1) {
      const nfsNexus = [
        // Passada Paga
        {
          numero: 'NF-1025',
          comp: '08/2026',
          valor: 24500,
          emissao: '2026-08-01 00:00:00.000Z',
          venc: '2026-08-15 00:00:00.000Z',
          pag: '2026-08-15 00:00:00.000Z',
          status: 'Paga',
          obs: 'Competência Agosto quitada.',
        },
        // Futura Prevista Nov/2026
        {
          numero: 'NF-1120',
          comp: '11/2026',
          valor: 24500,
          emissao: '2026-11-01 00:00:00.000Z',
          venc: '2026-11-15 00:00:00.000Z',
          pag: '',
          status: 'Recebida',
          obs: 'Projeção de pagamento referente à sustentação de clusters.',
        },
        // Futura Prevista Dez/2026
        {
          numero: 'NF-1145',
          comp: '12/2026',
          valor: 24500,
          emissao: '2026-12-01 00:00:00.000Z',
          venc: '2026-12-15 00:00:00.000Z',
          pag: '',
          status: 'Recebida',
          obs: 'Encerramento de ciclo anual de sustentação Cloud.',
        },
      ]

      for (let j = 0; j < nfsNexus.length; j++) {
        const item = nfsNexus[j]
        try {
          const exist = app.findRecordsByFilter(
            'notas_fiscais_pj',
            `numero_nf = '${item.numero}'`,
            '',
            1,
            0,
          )
          if (!exist || exist.length === 0) {
            const nf = new Record(notasCol)
            nf.set('prestador', p1.id)
            nf.set('contrato', c1.id)
            nf.set('numero_nf', item.numero)
            nf.set('competencia', item.comp)
            nf.set('valor', item.valor)
            nf.set('data_emissao', item.emissao)
            nf.set('data_vencimento', item.venc)
            if (item.pag) nf.set('data_pagamento', item.pag)
            nf.set('status', item.status)
            nf.set('observacao', item.obs)
            app.save(nf)
          }
        } catch (_) {}
      }
    }

    if (notasCol && p2 && c2) {
      const nfsVertice = [
        // Passada Paga
        {
          numero: 'NF-4380',
          comp: '08/2026',
          valor: 14000,
          emissao: '2026-08-01 00:00:00.000Z',
          venc: '2026-08-16 00:00:00.000Z',
          pag: '2026-08-16 00:00:00.000Z',
          status: 'Paga',
          obs: 'Liquidado via transferência bancária Bradesco.',
        },
        // Futura Out/2026
        {
          numero: 'NF-4460',
          comp: '10/2026',
          valor: 14000,
          emissao: '2026-10-01 00:00:00.000Z',
          venc: '2026-10-16 00:00:00.000Z',
          pag: '',
          status: 'Em conferência',
          obs: 'Produção de 4 vídeos e anúncios de atração de candidatos.',
        },
        // Futura Nov/2026 com reajuste previsto do aditivo
        {
          numero: 'NF-4500',
          comp: '11/2026',
          valor: 16500,
          emissao: '2026-11-01 00:00:00.000Z',
          venc: '2026-11-16 00:00:00.000Z',
          pag: '',
          status: 'Recebida',
          obs: 'Competência com novo valor pactuado em aditivo contratual.',
        },
      ]

      for (let j = 0; j < nfsVertice.length; j++) {
        const item = nfsVertice[j]
        try {
          const exist = app.findRecordsByFilter(
            'notas_fiscais_pj',
            `numero_nf = '${item.numero}'`,
            '',
            1,
            0,
          )
          if (!exist || exist.length === 0) {
            const nf = new Record(notasCol)
            nf.set('prestador', p2.id)
            nf.set('contrato', c2.id)
            nf.set('numero_nf', item.numero)
            nf.set('competencia', item.comp)
            nf.set('valor', item.valor)
            nf.set('data_emissao', item.emissao)
            nf.set('data_vencimento', item.venc)
            if (item.pag) nf.set('data_pagamento', item.pag)
            nf.set('status', item.status)
            nf.set('observacao', item.obs)
            app.save(nf)
          }
        } catch (_) {}
      }
    }

    if (notasCol && p3 && c3) {
      const nfsSilveira = [
        // Passada Paga
        {
          numero: 'NF-0780',
          comp: '08/2026',
          valor: 9800,
          emissao: '2026-08-01 00:00:00.000Z',
          venc: '2026-08-10 00:00:00.000Z',
          pag: '2026-08-10 00:00:00.000Z',
          status: 'Paga',
          obs: 'Honorários advocatícios trabalhistas quitados.',
        },
        // Futura Nov/2026
        {
          numero: 'NF-0845',
          comp: '11/2026',
          valor: 9800,
          emissao: '2026-11-01 00:00:00.000Z',
          venc: '2026-11-10 00:00:00.000Z',
          pag: '',
          status: 'Recebida',
          obs: 'Pareceres jurídicos e adequação de compliance trabalhista.',
        },
      ]

      for (let j = 0; j < nfsSilveira.length; j++) {
        const item = nfsSilveira[j]
        try {
          const exist = app.findRecordsByFilter(
            'notas_fiscais_pj',
            `numero_nf = '${item.numero}'`,
            '',
            1,
            0,
          )
          if (!exist || exist.length === 0) {
            const nf = new Record(notasCol)
            nf.set('prestador', p3.id)
            nf.set('contrato', c3.id)
            nf.set('numero_nf', item.numero)
            nf.set('competencia', item.comp)
            nf.set('valor', item.valor)
            nf.set('data_emissao', item.emissao)
            nf.set('data_vencimento', item.venc)
            if (item.pag) nf.set('data_pagamento', item.pag)
            nf.set('status', item.status)
            nf.set('observacao', item.obs)
            app.save(nf)
          }
        } catch (_) {}
      }
    }

    // 5. Atualizar agente "gestor-de-talentos" com as coleções financeiras para responder no chat
    try {
      $ai.agents.putTools(app, 'gestor-de-talentos', [
        {
          collection: 'prestadores_pj',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'contratos_pj',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'notas_fiscais_pj',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'ofertas',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
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
            text:
              'Painel Financeiro Consolidado de Gente & Gestão:\n' +
              '1. Comprometido Mensal PJ: Soma do valor_mensal_atual de todos os prestadores de serviços PJ ativos. Cada prestador possui valor-hora médio calculado na base de 160 horas úteis por mês (Valor Mensal ÷ 160h).\n' +
              '2. Projeção Mensal de Pagamentos: Consolidação das prestações de contratos PJ vigentes somadas às notas fiscais emitidas/previstas (por competência) e à folha de novas contratações (propostas aceitas e onboardings ativos).\n' +
              '3. Cruzamento com Orçamento de Vagas: Vagas possuem campo orcamento_mensal e faixa salarial. Ao contratar CLT, o custo estimado total inclui encargos e benefícios (fator padrão ~1.6x a 1.7x do salário base CLT) versus prestação PJ direta. A análise compara headcount aberto vs. preenchido e despesas de fornecedores alocados por departamento.',
          },
        },
      ])
    } catch (agentErr) {
      console.log('Aviso ao atualizar ferramentas financeiras no agente:', agentErr)
    }
  },
  (app) => {
    // Reversão
    try {
      const vagasCol = app.findCollectionByNameOrId('vagas')
      if (vagasCol && vagasCol.fields.getByName('orcamento_mensal')) {
        vagasCol.fields.removeByName('orcamento_mensal')
        app.save(vagasCol)
      }
    } catch (_) {}
  },
)
