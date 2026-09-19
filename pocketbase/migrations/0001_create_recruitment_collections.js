/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. vagas
    const vagas = new Collection({
      name: 'vagas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'titulo', type: 'text', required: true },
        { name: 'departamento', type: 'text' },
        { name: 'localizacao', type: 'text' },
        {
          name: 'modalidade',
          type: 'select',
          values: ['Remoto', 'Presencial', 'Híbrido'],
          maxSelect: 1,
        },
        { name: 'faixa_salarial', type: 'text' },
        { name: 'descricao', type: 'text' },
        { name: 'requisitos_obrigatorios', type: 'json' },
        { name: 'requisitos_desejaveis', type: 'json' },
        { name: 'habilidades_tecnicas', type: 'json' },
        { name: 'competencias_comportamentais', type: 'json' },
        {
          name: 'status',
          type: 'select',
          values: ['Ativa', 'Pausada', 'Preenchida', 'Arquivada'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_vagas_status ON vagas (status)',
        'CREATE INDEX idx_vagas_departamento ON vagas (departamento)',
      ],
    })
    app.save(vagas)

    const vagasColId = app.findCollectionByNameOrId('vagas').id

    // 2. candidatos
    const candidatos = new Collection({
      name: 'candidatos',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        { name: 'email', type: 'email', required: true },
        { name: 'telefone', type: 'text' },
        { name: 'cargo_atual', type: 'text' },
        { name: 'empresa_atual', type: 'text' },
        { name: 'localizacao', type: 'text' },
        {
          name: 'vaga',
          type: 'relation',
          collectionId: vagasColId,
          maxSelect: 1,
          cascadeDelete: false,
        },
        { name: 'linkedin', type: 'url' },
        { name: 'github', type: 'url' },
        {
          name: 'curriculo',
          type: 'file',
          maxSelect: 1,
          maxSize: 10485760,
          mimeTypes: ['application/pdf'],
        },
        { name: 'resumo', type: 'text' },
        { name: 'habilidades_tecnicas', type: 'json' },
        { name: 'competencias_comportamentais', type: 'json' },
        { name: 'experiencias', type: 'json' },
        { name: 'educacao', type: 'json' },
        { name: 'idiomas', type: 'json' },
        {
          name: 'status',
          type: 'select',
          values: [
            'Triagem',
            'Entrevista com RH',
            'Entrevista técnica',
            'Match técnico/comportamental (IA)',
            'Proposta',
            'Aprovado',
            'Recusado',
          ],
          maxSelect: 1,
        },
        { name: 'score_semantico', type: 'number' },
        { name: 'vector', type: 'vector', dimensions: 1536, distance: 'cosine' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_candidatos_email ON candidatos (email)',
        'CREATE INDEX idx_candidatos_status ON candidatos (status)',
        'CREATE INDEX idx_candidatos_vaga ON candidatos (vaga)',
      ],
    })
    app.save(candidatos)

    const candidatosColId = app.findCollectionByNameOrId('candidatos').id

    // 3. pipeline
    const pipeline = new Collection({
      name: 'pipeline',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'candidato',
          type: 'relation',
          required: true,
          collectionId: candidatosColId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'vaga',
          type: 'relation',
          required: true,
          collectionId: vagasColId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'estagio',
          type: 'select',
          values: [
            'Triagem',
            'Entrevista com RH',
            'Entrevista técnica',
            'Match técnico/comportamental (IA)',
            'Proposta',
            'Aprovado',
            'Recusado',
          ],
          maxSelect: 1,
        },
        { name: 'motivo_recusa', type: 'text' },
        { name: 'anotacoes', type: 'text' },
        { name: 'historico', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_pipeline_candidato ON pipeline (candidato)',
        'CREATE INDEX idx_pipeline_vaga ON pipeline (vaga)',
        'CREATE INDEX idx_pipeline_estagio ON pipeline (estagio)',
      ],
    })
    app.save(pipeline)

    // 4. relatorios
    const relatorios = new Collection({
      name: 'relatorios',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'candidato',
          type: 'relation',
          required: true,
          collectionId: candidatosColId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'vaga',
          type: 'relation',
          required: true,
          collectionId: vagasColId,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'tipo',
          type: 'select',
          values: ['Técnico', 'Comportamental', 'Completo'],
          maxSelect: 1,
        },
        { name: 'conteudo', type: 'json' },
        {
          name: 'veredito',
          type: 'select',
          values: ['Recomendar', 'Considerar', 'Não recomendar'],
          maxSelect: 1,
        },
        { name: 'score_geral', type: 'number' },
        { name: 'score_tecnico', type: 'number' },
        { name: 'score_comportamental', type: 'number' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_relatorios_candidato ON relatorios (candidato)',
        'CREATE INDEX idx_relatorios_vaga ON relatorios (vaga)',
      ],
    })
    app.save(relatorios)

    // 5. chat_mensagens
    const chatMensagens = new Collection({
      name: 'chat_mensagens',
      type: 'base',
      listRule: "@request.auth.id != '' && usuario = @request.auth.id",
      viewRule: "@request.auth.id != '' && usuario = @request.auth.id",
      createRule: "@request.auth.id != '' && usuario = @request.auth.id",
      updateRule: "@request.auth.id != '' && usuario = @request.auth.id",
      deleteRule: "@request.auth.id != '' && usuario = @request.auth.id",
      fields: [
        {
          name: 'usuario',
          type: 'relation',
          required: true,
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: true,
        },
        { name: 'sessao', type: 'text' },
        { name: 'papel', type: 'select', values: ['user', 'agent'], maxSelect: 1 },
        { name: 'conteudo', type: 'text' },
        { name: 'metadados', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_chat_usuario ON chat_mensagens (usuario)',
        'CREATE INDEX idx_chat_sessao ON chat_mensagens (sessao)',
      ],
    })
    app.save(chatMensagens)
  },
  (app) => {
    const toDelete = ['chat_mensagens', 'relatorios', 'pipeline', 'candidatos', 'vagas']
    for (let i = 0; i < toDelete.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(toDelete[i])
        app.delete(col)
      } catch (_) {}
    }
  },
)
