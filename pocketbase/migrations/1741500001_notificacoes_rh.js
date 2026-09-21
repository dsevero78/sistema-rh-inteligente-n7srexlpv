/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const notificacoes = new Collection({
      name: 'notificacoes_rh',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'titulo',
          type: 'text',
          required: true,
        },
        {
          name: 'mensagem',
          type: 'text',
          required: true,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'vaga_aprovada',
            'vaga_ajustes',
            'parecer_candidato',
            'aditivo_juridico',
            'sistema',
          ],
        },
        {
          name: 'lida',
          type: 'bool',
          required: false,
        },
        {
          name: 'link',
          type: 'text',
          required: false,
        },
        {
          name: 'autor_nome',
          type: 'text',
          required: false,
        },
        {
          name: 'autor_email',
          type: 'text',
          required: false,
        },
        {
          name: 'referencia_tipo',
          type: 'text',
          required: false,
        },
        {
          name: 'referencia_id',
          type: 'text',
          required: false,
        },
        {
          name: 'metadata',
          type: 'json',
          required: false,
        },
      ],
      indexes: [
        'CREATE INDEX idx_notif_rh_lida ON notificacoes_rh (lida)',
        'CREATE INDEX idx_notif_rh_tipo ON notificacoes_rh (tipo)',
      ],
    })

    app.save(notificacoes)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('notificacoes_rh')
    if (col) {
      app.delete(col)
    }
  },
)
