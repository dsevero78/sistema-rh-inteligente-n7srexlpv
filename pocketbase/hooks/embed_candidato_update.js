onRecordAfterUpdateSuccess((e) => {
  const resumoChanged = e.record.getString('resumo') !== e.record.original().getString('resumo')
  const habsChanged =
    JSON.stringify(e.record.get('habilidades_tecnicas')) !==
    JSON.stringify(e.record.original().get('habilidades_tecnicas'))
  const expsChanged =
    JSON.stringify(e.record.get('experiencias')) !==
    JSON.stringify(e.record.original().get('experiencias'))

  if (!resumoChanged && !habsChanged && !expsChanged) {
    return e.next()
  }

  const resumo = e.record.getString('resumo') || ''
  const habs = JSON.stringify(e.record.get('habilidades_tecnicas') || [])
  const comps = JSON.stringify(e.record.get('competencias_comportamentais') || [])
  const exps = JSON.stringify(e.record.get('experiencias') || [])
  const text = (resumo + '\n' + habs + '\n' + comps + '\n' + exps).trim()

  if (!text) return e.next()

  try {
    const res = $ai.embed({ input: text })
    if (res && res.data && res.data[0] && res.data[0].embedding) {
      const record = $app.findRecordById('candidatos', e.record.id)
      record.set('vector', res.data[0].embedding)
      $app.save(record)
    }
  } catch (err) {
    console.log('Falha ao atualizar embedding do candidato: ' + e.record.id, err.message)
  }

  return e.next()
}, 'candidatos')
