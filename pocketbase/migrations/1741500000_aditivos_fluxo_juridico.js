/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const collection = app.findCollectionByNameOrId('aditivos_pj')

    // 1. Atualizar opções do campo select "status" para contemplar o fluxo jurídico
    const statusField = collection.fields.getByName('status')
    if (statusField) {
      statusField.values = [
        'Rascunho',
        'Minuta gerada',
        'Em análise pelo jurídico',
        'Aprovado pelo jurídico',
        'Ajustes solicitados',
        'Pendente de assinatura',
        'Vigente',
      ]
    }

    // 2. Adicionar campo parecer_juridico (texto)
    if (!collection.fields.getByName('parecer_juridico')) {
      collection.fields.add(
        new TextField({
          name: 'parecer_juridico',
          required: false,
        }),
      )
    }

    // 3. Adicionar campo aprovado_por (relation -> users)
    if (!collection.fields.getByName('aprovado_por')) {
      const usersCol = app.findCollectionByNameOrId('users')
      collection.fields.add(
        new RelationField({
          name: 'aprovado_por',
          required: false,
          collectionId: usersCol.id,
          cascadeDelete: false,
          maxSelect: 1,
        }),
      )
    }

    // 4. Adicionar campo data_aprovacao_juridico (date)
    if (!collection.fields.getByName('data_aprovacao_juridico')) {
      collection.fields.add(
        new DateField({
          name: 'data_aprovacao_juridico',
          required: false,
        }),
      )
    }

    // 5. Adicionar campo historico_aprovacao (json) para timeline detalhada
    if (!collection.fields.getByName('historico_aprovacao')) {
      collection.fields.add(
        new JSONField({
          name: 'historico_aprovacao',
          required: false,
        }),
      )
    }

    app.save(collection)
  },
  (app) => {
    const collection = app.findCollectionByNameOrId('aditivos_pj')
    const statusField = collection.fields.getByName('status')
    if (statusField) {
      statusField.values = ['Rascunho', 'Pendente de assinatura', 'Vigente']
    }
    collection.fields.removeByName('parecer_juridico')
    collection.fields.removeByName('aprovado_por')
    collection.fields.removeByName('data_aprovacao_juridico')
    collection.fields.removeByName('historico_aprovacao')
    app.save(collection)
  },
)
