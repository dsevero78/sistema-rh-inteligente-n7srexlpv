/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Tornar os campos 'vaga' e 'candidato' opcionais em 'alertas' para suportar alertas de prestadores PJ
    try {
      const alertasCol = app.findCollectionByNameOrId('alertas')
      const vagaF = alertasCol.fields.getByName('vaga')
      if (vagaF) vagaF.required = false
      const candF = alertasCol.fields.getByName('candidato')
      if (candF) candF.required = false

      // Adicionar relação com prestadores_pj se não existir
      if (!alertasCol.fields.getByName('prestador')) {
        const prestCol = app.findCollectionByNameOrId('prestadores_pj')
        alertasCol.fields.add(
          new RelationField({
            name: 'prestador',
            collectionId: prestCol.id,
            required: false,
            maxSelect: 1,
          }),
        )
      }

      app.save(alertasCol)
    } catch (err) {
      console.log('Aviso ao ajustar campos em alertas:', err)
    }

    // 2. Semear os 3 alertas de demonstração agora que vaga e candidato são opcionais
    try {
      const alertasCol = app.findCollectionByNameOrId('alertas')
      let p2 = null
      try {
        p2 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '34.819.204/0001-95')
      } catch (_) {}

      // Alerta 1: Contrato Vencendo
      try {
        const a1Exist = app.findRecordsByFilter(
          'alertas',
          "tipo = 'contrato_pj_vencendo'",
          '',
          1,
          0,
        )
        if (!a1Exist || a1Exist.length === 0) {
          const a1 = new Record(alertasCol)
          if (p2) a1.set('prestador', p2.id)
          a1.set('score', 90)
          a1.set('tipo', 'contrato_pj_vencendo')
          a1.set('status', 'Novo')
          a1.set(
            'resumo_ia',
            'Renovação Contratual: O contrato "Gestão de Employer Branding" com Vértice Mídia & Branding vence em ~20 dias. Valor mensal de R$ 14.000,00. Avaliação do prestador: 8.8/10 (Recomendação: Renovar com ressalvas).',
          )
          a1.set('criado_em', new Date().toISOString())
          app.save(a1)
        }
      } catch (errA1) {
        console.log('Aviso ao criar alerta 1 PJ:', errA1)
      }

      // Alerta 2: Documento Vencido
      try {
        const a2Exist = app.findRecordsByFilter(
          'alertas',
          "tipo = 'documento_pj_vencido'",
          '',
          1,
          0,
        )
        if (!a2Exist || a2Exist.length === 0) {
          const a2 = new Record(alertasCol)
          if (p2) a2.set('prestador', p2.id)
          a2.set('score', 95)
          a2.set('tipo', 'documento_pj_vencido')
          a2.set('status', 'Novo')
          a2.set(
            'resumo_ia',
            'Documento Fiscal Vencido: A "Certidão negativa federal" do prestador Vértice Mídia & Branding (CNPJ 34.819.204/0001-95) está vencida há 10 dias. Regularização prioritária necessária.',
          )
          a2.set('criado_em', new Date().toISOString())
          app.save(a2)
        }
      } catch (errA2) {
        console.log('Aviso ao criar alerta 2 PJ:', errA2)
      }

      // Alerta 3: NF Atrasada
      try {
        const a3Exist = app.findRecordsByFilter(
          'alertas',
          "tipo = 'nota_fiscal_pj_atrasada'",
          '',
          1,
          0,
        )
        if (!a3Exist || a3Exist.length === 0) {
          const a3 = new Record(alertasCol)
          if (p2) a3.set('prestador', p2.id)
          a3.set('score', 85)
          a3.set('tipo', 'nota_fiscal_pj_atrasada')
          a3.set('status', 'Novo')
          a3.set(
            'resumo_ia',
            'Alerta Financeiro PJ: A nota fiscal NF-4420 de Vértice Mídia & Branding no valor de R$ 14.000,00 ultrapassou a data de vencimento sem confirmação de pagamento no sistema.',
          )
          a3.set('criado_em', new Date().toISOString())
          app.save(a3)
        }
      } catch (errA3) {
        console.log('Aviso ao criar alerta 3 PJ:', errA3)
      }
    } catch (seedErr) {
      console.log('Aviso ao semear alertas PJ:', seedErr)
    }
  },
  (app) => {},
)
