migrate(
  (app) => {
    const pessoasCol = app.findCollectionByNameOrId('pessoas')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const empresasCol = app.findCollectionByNameOrId('empresas')

    const collection = new Collection({
      name: 'offboardings',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'pessoa',
          type: 'relation',
          collectionId: pessoasCol.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        { name: 'vinculo_origem_id', type: 'text' },
        { name: 'modalidade', type: 'select', values: ['CLT', 'PJ'], maxSelect: 1, required: true },
        {
          name: 'tipo_desligamento',
          type: 'select',
          values: [
            'Pedido de demissão',
            'Demissão sem justa causa',
            'Demissão por justa causa',
            'Acordo mútuo (Art. 484-A CLT)',
            'Término de contrato de experiência',
            'Término de contrato PJ',
            'Rescisão antecipada PJ',
            'Não renovação PJ',
          ],
          maxSelect: 1,
          required: true,
        },
        { name: 'data_aviso', type: 'date', required: true },
        { name: 'data_desligamento', type: 'date', required: true },
        {
          name: 'aviso_previo_tipo',
          type: 'select',
          values: ['Trabalhado', 'Indenizado', 'Dispensado', 'Não aplicável'],
          maxSelect: 1,
        },
        { name: 'dias_aviso_previo', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['Em andamento', 'Aguardando homologação', 'Concluído', 'Cancelado'],
          maxSelect: 1,
          required: true,
        },
        { name: 'responsavel_rh', type: 'relation', collectionId: usersCol.id, maxSelect: 1 },
        { name: 'responsavel_nome', type: 'text' },
        { name: 'empresa', type: 'relation', collectionId: empresasCol.id, maxSelect: 1 },
        { name: 'motivo_detalhado', type: 'text' },
        { name: 'itens_checklist', type: 'json' },
        { name: 'calculo_rescisorio', type: 'json' },
        { name: 'total_rescisorio', type: 'number' },
        { name: 'observacoes_finais', type: 'text' },
        { name: 'data_conclusao', type: 'date' },
        { name: 'concluido_por', type: 'text' },
        { name: 'termo_rescisao_arquivo', type: 'file', maxSelect: 1, maxSize: 10485760 },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_offboarding_pessoa ON offboardings (pessoa)',
        'CREATE INDEX idx_offboarding_status ON offboardings (status)',
        'CREATE INDEX idx_offboarding_empresa ON offboardings (empresa)',
        'CREATE INDEX idx_offboarding_data ON offboardings (data_desligamento DESC)',
      ],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('offboardings')
      app.delete(col)
    } catch (_) {}
  },
)
