/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de teste de sintaxe
 */
/**
 * Verificação do método expand / expanded nos registros do PocketBase
 */
routerAdd('GET', '/backend/v1/test-enrich-check', (e) => {
  let errTest = null
  try {
    if (typeof onRecordEnrich !== 'undefined') {
      onRecordEnrich((evt) => {
        // test
      })
    }
  } catch (err) {
    errTest = err.message
  }

  return e.json(200, {
    hasOnRecordEnrich: typeof onRecordEnrich !== 'undefined',
    typeOnRecordEnrich: typeof onRecordEnrich,
    hasOnRecordsListRequest: typeof onRecordsListRequest !== 'undefined',
    hasOnRecordViewRequest: typeof onRecordViewRequest !== 'undefined',
    errTest: errTest,
  })
})
