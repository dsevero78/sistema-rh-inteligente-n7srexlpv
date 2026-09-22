/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    try {
      const benCol = app.findCollectionByNameOrId('beneficios_vinculo')
      const progCol = app.findCollectionByNameOrId('programacoes_descanso')
      const pessoasCol = app.findCollectionByNameOrId('pessoas')

      // 1. Cadastrar benefícios adicionais acordados para Camila PJ (Marketing & Mídia)
      let pCamila = null
      try {
        pCamila = app.findFirstRecordByFilter(
          'pessoas',
          "nome ~ 'Camila' || cpf_cnpj ~ '34.819.204'",
        )
      } catch (_) {}

      if (pCamila && benCol) {
        // Auxílio Home Office / Ferramentas Digitais de Design
        const bc1 = new Record(benCol)
        bc1.set('pessoa', pCamila.id)
        bc1.set('vinculo_origem_id', `ficha-${pCamila.id}`)
        bc1.set('tipo', 'auxilio_home_office')
        bc1.set('nome_personalizado', 'Subsídio Adobe Creative Cloud & Conectividade')
        bc1.set('valor_mensal', 750)
        bc1.set('data_inicio', '2025-06-01 00:00:00.000Z')
        bc1.set('ativo', true)
        bc1.set('observacao', 'Subsídio de licenças de software e infraestrutura de mídia digital.')
        app.save(bc1)

        // Plano de Saúde PJ coparticipado
        const bc2 = new Record(benCol)
        bc2.set('pessoa', pCamila.id)
        bc2.set('vinculo_origem_id', `ficha-${pCamila.id}`)
        bc2.set('tipo', 'plano_saude')
        bc2.set('nome_personalizado', 'Porto Seguro Saúde PJ Empresarial')
        bc2.set('valor_mensal', 950)
        bc2.set('data_inicio', '2025-06-01 00:00:00.000Z')
        bc2.set('ativo', true)
        bc2.set('observacao', 'Plano médico saúde empresarial estendido à prestadora.')
        app.save(bc2)
      }
    } catch (err) {
      console.warn('[Migration 1741500017] Aviso ao popular benefícios para Camila PJ:', err)
    }
  },
  (app) => {
    // Reversão
  },
)
