/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook de teste de sintaxe
 */
onRecordsListRequest((e) => {
  console.log('[PROBE HOOK listRequest] auth:', e.auth ? e.auth.id : 'anon')
  e.next()
}, 'pessoas')

onRecordViewRequest((e) => {
  console.log('[PROBE HOOK viewRequest] auth:', e.auth ? e.auth.id : 'anon', 'record:', e.record ? e.record.id : 'no record')
  if (e.record) {
    e.record.set('valor_contratado', 0)
    e.record.set('valor_hora', 0)
  }
  e.next()
}, 'pessoas')
