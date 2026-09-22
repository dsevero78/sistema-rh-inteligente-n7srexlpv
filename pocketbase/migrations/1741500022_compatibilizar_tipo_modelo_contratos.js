migrate(
  (app) => {
    try {
      const contratosCol = app.findCollectionByNameOrId('contratos')
      if (!contratosCol) return

      // Buscar todos os contratos existentes para garantir que tipo_modelo esteja preenchido
      const records = app.findRecordsByFilter('contratos', '1=1', '', 0, 0)

      for (let i = 0; i < records.length; i++) {
        const ct = records[i]
        const tipoModeloAtual = ct.get('tipo_modelo')
        const modalidade = ct.get('modalidade') || 'PJ'

        if (!tipoModeloAtual || tipoModeloAtual.trim() === '') {
          const novoTipo = modalidade === 'CLT' ? 'CLT_INDETERMINADO' : 'PJ_PRESTACAO_SERVICOS'
          ct.set('tipo_modelo', novoTipo)
          app.save(ct)
        }
      }
    } catch (e) {
      // Ignora caso a tabela ainda não exista ou já esteja em conformidade
    }
  },
  () => {
    // Reversão não é necessária pois compatibilização é não-destrutiva
  },
)
