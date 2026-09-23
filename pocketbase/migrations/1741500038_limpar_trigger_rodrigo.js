migrate(
  (app) => {
    const cand = app.findRecordById('candidatos', 'qb11bve852h5c6w')
    cand.set('motivo_reprovacao_triagem', '')
    app.save(cand)
  },
  (app) => {},
)
