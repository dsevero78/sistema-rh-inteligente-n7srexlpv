/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const vagasCol = app.findCollectionByNameOrId('vagas')
    const candidatosCol = app.findCollectionByNameOrId('candidatos')

    // ----------------------------------------------------
    // 1. Atualizar coleção 'users' com campo 'cargo_funcao'
    // ----------------------------------------------------
    if (!usersCol.fields.getByName('cargo_funcao')) {
      usersCol.fields.add(
        new SelectField({
          name: 'cargo_funcao',
          values: ['RH / Recrutador', 'Gestor Contratante', 'Diretoria / Executivo'],
          maxSelect: 1,
        }),
      )
      app.save(usersCol)
    }

    // ----------------------------------------------------
    // 2. Atualizar coleção 'vagas':
    //    - gestor_responsavel (relation -> users)
    //    - status_aprovacao_gestor (select)
    //    - parecer_gestor_vaga (text)
    //    - data_aprovacao_gestor (date)
    // ----------------------------------------------------
    if (!vagasCol.fields.getByName('gestor_responsavel')) {
      vagasCol.fields.add(
        new RelationField({
          name: 'gestor_responsavel',
          collectionId: usersCol.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }

    if (!vagasCol.fields.getByName('status_aprovacao_gestor')) {
      vagasCol.fields.add(
        new SelectField({
          name: 'status_aprovacao_gestor',
          values: ['Aprovada pelo gestor', 'Aguardando aprovação', 'Ajustes solicitados'],
          maxSelect: 1,
        }),
      )
    }

    if (!vagasCol.fields.getByName('parecer_gestor_vaga')) {
      vagasCol.fields.add(
        new TextField({
          name: 'parecer_gestor_vaga',
        }),
      )
    }

    if (!vagasCol.fields.getByName('data_aprovacao_gestor')) {
      vagasCol.fields.add(
        new DateField({
          name: 'data_aprovacao_gestor',
        }),
      )
    }

    app.save(vagasCol)

    // ----------------------------------------------------
    // 3. Atualizar coleção 'candidatos':
    //    - video_apresentacao (file: mp4, webm, mov, mkv)
    //    - video_link (url)
    //    - reprovado_triagem_auto (bool)
    //    - motivo_reprovacao_triagem (text)
    // ----------------------------------------------------
    if (!candidatosCol.fields.getByName('video_apresentacao')) {
      candidatosCol.fields.add(
        new FileField({
          name: 'video_apresentacao',
          maxSelect: 1,
          maxSize: 104857600, // 100MB
          mimeTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'],
        }),
      )
    }

    if (!candidatosCol.fields.getByName('video_link')) {
      candidatosCol.fields.add(
        new URLField({
          name: 'video_link',
        }),
      )
    }

    if (!candidatosCol.fields.getByName('reprovado_triagem_auto')) {
      candidatosCol.fields.add(
        new BoolField({
          name: 'reprovado_triagem_auto',
        }),
      )
    }

    if (!candidatosCol.fields.getByName('motivo_reprovacao_triagem')) {
      candidatosCol.fields.add(
        new TextField({
          name: 'motivo_reprovacao_triagem',
        }),
      )
    }

    app.save(candidatosCol)

    // ----------------------------------------------------
    // 4. Nova coleção: 'feedbacks_gestor' (Módulo 1)
    // ----------------------------------------------------
    let feedbacksGestor = null
    try {
      feedbacksGestor = app.findCollectionByNameOrId('feedbacks_gestor')
    } catch (_) {
      feedbacksGestor = new Collection({
        name: 'feedbacks_gestor',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'vaga',
            type: 'relation',
            required: true,
            collectionId: vagasCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'candidato',
            type: 'relation',
            required: true,
            collectionId: candidatosCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'gestor',
            type: 'relation',
            required: true,
            collectionId: usersCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'recomendacao',
            type: 'select',
            required: true,
            values: ['Avançar', 'Em dúvida', 'Recusar'],
            maxSelect: 1,
          },
          { name: 'comentario', type: 'text' },
          { name: 'pontos_positivos', type: 'text' },
          { name: 'pontos_atencao', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_feedbacks_gestor_vaga ON feedbacks_gestor (vaga)',
          'CREATE INDEX idx_feedbacks_gestor_cand ON feedbacks_gestor (candidato)',
          'CREATE INDEX idx_feedbacks_gestor_user ON feedbacks_gestor (gestor)',
        ],
      })
      app.save(feedbacksGestor)
    }

    // ----------------------------------------------------
    // 5. Nova coleção: 'questionarios_vaga' (Módulo 2)
    //    Perguntas de triagem configuradas por vaga
    // ----------------------------------------------------
    let questionariosCol = null
    try {
      questionariosCol = app.findCollectionByNameOrId('questionarios_vaga')
    } catch (_) {
      questionariosCol = new Collection({
        name: 'questionarios_vaga',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'vaga',
            type: 'relation',
            required: true,
            collectionId: vagasCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          { name: 'titulo', type: 'text', required: true },
          { name: 'descricao', type: 'text' },
          { name: 'perguntas', type: 'json' }, // array de perguntas
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_quest_vaga ON questionarios_vaga (vaga)'],
      })
      app.save(questionariosCol)
    }

    // ----------------------------------------------------
    // 6. Nova coleção: 'respostas_triagem' (Módulo 2)
    //    Respostas do candidato com flag de reprovação
    // ----------------------------------------------------
    let respostasCol = null
    try {
      respostasCol = app.findCollectionByNameOrId('respostas_triagem')
    } catch (_) {
      respostasCol = new Collection({
        name: 'respostas_triagem',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'vaga',
            type: 'relation',
            required: true,
            collectionId: vagasCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'candidato',
            type: 'relation',
            required: true,
            collectionId: candidatosCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'questionario',
            type: 'relation',
            required: false,
            collectionId: questionariosCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'respostas', type: 'json' }, // [{ perguntaId, pergunta, tipo, resposta, eliminatoria, atendeu }]
          { name: 'reprovado_automaticamente', type: 'bool' },
          { name: 'motivo_reprovacao', type: 'text' },
          { name: 'total_perguntas', type: 'number' },
          { name: 'total_eliminatorias_atendidas', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_resp_vaga ON respostas_triagem (vaga)',
          'CREATE INDEX idx_resp_candidato ON respostas_triagem (candidato)',
        ],
      })
      app.save(respostasCol)
    }

    // ----------------------------------------------------
    // 7. Nova coleção: 'percepcoes_rh' (Módulo 3)
    //    Análise estruturada do RH com visibilidade privada ou compartilhada
    // ----------------------------------------------------
    let percepcoesCol = null
    try {
      percepcoesCol = app.findCollectionByNameOrId('percepcoes_rh')
    } catch (_) {
      percepcoesCol = new Collection({
        name: 'percepcoes_rh',
        type: 'base',
        // RLS: Se privada, apenas autor pode listar/ver. Se compartilhada, qualquer autenticado pode ver.
        listRule:
          "@request.auth.id != '' && (visibilidade = 'Compartilhada com o gestor' || autor = @request.auth.id)",
        viewRule:
          "@request.auth.id != '' && (visibilidade = 'Compartilhada com o gestor' || autor = @request.auth.id)",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' && autor = @request.auth.id",
        deleteRule: "@request.auth.id != '' && autor = @request.auth.id",
        fields: [
          {
            name: 'candidato',
            type: 'relation',
            required: true,
            collectionId: candidatosCol.id,
            maxSelect: 1,
            cascadeDelete: true,
          },
          {
            name: 'vaga',
            type: 'relation',
            required: false,
            collectionId: vagasCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          {
            name: 'autor',
            type: 'relation',
            required: true,
            collectionId: usersCol.id,
            maxSelect: 1,
            cascadeDelete: false,
          },
          { name: 'autor_nome', type: 'text' },
          {
            name: 'visibilidade',
            type: 'select',
            required: true,
            values: ['Privada (só o RH autor)', 'Compartilhada com o gestor'],
            maxSelect: 1,
          },
          {
            name: 'status_documento',
            type: 'select',
            required: true,
            values: ['Rascunho', 'Finalizada'],
            maxSelect: 1,
          },
          // Pontos guiados estruturados:
          { name: 'comunicacao_clareza', type: 'text' }, // oralidade, objetividade, organização do raciocínio
          { name: 'postura_apresentacao', type: 'text' }, // linguagem corporal, energia, presença
          { name: 'estrutura_video', type: 'text' }, // tempo, qualidade técnica, atendeu a proposta
          { name: 'conteudo_experiencia', type: 'text' }, // clareza das entregas e motivação
          { name: 'aderencia_cultural', type: 'text' }, // valores, estilo de trabalho, fit cultural
          { name: 'pontos_fortes', type: 'text' },
          { name: 'pontos_atencao', type: 'text' },
          { name: 'nota_geral', type: 'number', min: 0, max: 10 },
          {
            name: 'conclusao',
            type: 'select',
            values: ['Avançar', 'Em dúvida', 'Reprovar'],
            maxSelect: 1,
          },
          { name: 'observacoes_confidenciais', type: 'text' }, // anotação extra
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_percepcoes_cand ON percepcoes_rh (candidato)',
          'CREATE INDEX idx_percepcoes_vaga ON percepcoes_rh (vaga)',
          'CREATE INDEX idx_percepcoes_autor ON percepcoes_rh (autor)',
          'CREATE INDEX idx_percepcoes_visib ON percepcoes_rh (visibilidade)',
        ],
      })
      app.save(percepcoesCol)
    }
  },
  (app) => {
    const toDelete = [
      'percepcoes_rh',
      'respostas_triagem',
      'questionarios_vaga',
      'feedbacks_gestor',
    ]
    for (let i = 0; i < toDelete.length; i++) {
      try {
        const col = app.findCollectionByNameOrId(toDelete[i])
        app.delete(col)
      } catch (_) {}
    }
  },
)
