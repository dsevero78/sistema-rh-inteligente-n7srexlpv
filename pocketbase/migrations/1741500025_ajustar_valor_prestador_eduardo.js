migrate(
  (app) => {
    // Ajustar o valor mensal do prestador Dr. Eduardo Silveira para R$ 9.800
    // conforme escopo padrão contratual de retenção
    try {
      const prestador = app.findFirstRecordByData('prestadores_pj', 'cnpj', '19.340.892/0001-30')
      if (prestador) {
        prestador.set('valor_mensal_atual', 9800)
        app.save(prestador)
      }
    } catch (_) {}

    // Ajustar também na ficha da pessoa vinculada se existir
    try {
      const pessoa = app.findFirstRecordByData('pessoas', 'cpf_cnpj', '19.340.892/0001-30')
      if (pessoa) {
        pessoa.set('valor_contratado', 9800)
        pessoa.set('valor_hora', 61.25)
        app.save(pessoa)
      }
    } catch (_) {}

    // Ajustar também no contrato unificado correspondente se existir
    try {
      const contrato = app.findFirstRecordByData('contratos', 'codigo_contrato', 'CT-PJ-2024-003')
      if (contrato) {
        contrato.set('valor_mensal', 9800)
        contrato.set('valor_hora', 61.25)
        app.save(contrato)
      }
    } catch (_) {}
  },
  (app) => {
    // Reversão
    try {
      const prestador = app.findFirstRecordByData('prestadores_pj', 'cnpj', '19.340.892/0001-30')
      if (prestador) {
        prestador.set('valor_mensal_atual', 11200)
        app.save(prestador)
      }
    } catch (_) {}
  },
)
