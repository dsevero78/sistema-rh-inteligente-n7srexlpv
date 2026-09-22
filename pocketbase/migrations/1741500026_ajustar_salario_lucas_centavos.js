migrate(
  (app) => {
    // Ajustar o valor contratado do Lucas Ferreira Lima para exatamente R$ 5.870
    // (eliminando resíduo de 0.01 centavo)
    try {
      const lucas = app.findFirstRecordByData('pessoas', 'cpf_cnpj', '389.472.918-44')
      if (lucas) {
        lucas.set('valor_contratado', 5870)
        lucas.set('valor_hora', 36.6875)
        app.save(lucas)
      }
    } catch (_) {}
  },
  (app) => {
    try {
      const lucas = app.findFirstRecordByData('pessoas', 'cpf_cnpj', '389.472.918-44')
      if (lucas) {
        lucas.set('valor_contratado', 5870.01)
        app.save(lucas)
      }
    } catch (_) {}
  },
)
