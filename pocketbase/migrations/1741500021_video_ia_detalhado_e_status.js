/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Atualizar coleção candidatos com campos de status de vídeo e dimensões
    const candCol = app.findCollectionByNameOrId('candidatos')

    const fieldsToAdd = [
      {
        name: 'video_status',
        type: 'select',
        values: [
          'sem_video',
          'enviado_aguardando',
          'analisando',
          'analise_concluida',
          'erro_processamento',
        ],
        maxSelect: 1,
      },
      {
        name: 'video_score_geral',
        type: 'number',
        min: 0,
        max: 100,
      },
      {
        name: 'video_analise_dimensoes',
        type: 'json',
      },
      {
        name: 'video_analisado_em',
        type: 'date',
      },
      {
        name: 'video_versao',
        type: 'number',
      },
    ]

    fieldsToAdd.forEach((f) => {
      try {
        candCol.fields.add(f)
      } catch (_) {
        // Ignora se o campo já existe
      }
    })

    app.save(candCol)

    // 2. Garantir ou atualizar campos na coleção analises_video_ia
    let analisesCol
    try {
      analisesCol = app.findCollectionByNameOrId('analises_video_ia')
    } catch (_) {
      analisesCol = null
    }

    if (analisesCol) {
      const analiseFields = [
        { name: 'score_geral', type: 'number', min: 0, max: 100 },
        { name: 'clareza_comunicacao', type: 'number', min: 0, max: 100 },
        { name: 'estrutura_narrativa', type: 'number', min: 0, max: 100 },
        { name: 'energia_postura', type: 'number', min: 0, max: 100 },
        { name: 'aderencia_vaga', type: 'number', min: 0, max: 100 },
        { name: 'red_flags', type: 'json' },
        { name: 'transcricao_resumida', type: 'text' },
        { name: 'versao_video', type: 'number' },
        { name: 'arquivo_analisado', type: 'text' },
        {
          name: 'status_analise',
          type: 'select',
          values: ['concluida', 'erro', 'processando'],
          maxSelect: 1,
        },
        { name: 'erro_detalhes', type: 'text' },
      ]

      analiseFields.forEach((f) => {
        try {
          analisesCol.fields.add(f)
        } catch (_) {
          // Ignora se já existir
        }
      })

      app.save(analisesCol)
    }

    // 3. Atualizar dados do seed para Lucas Ferreira Lima se ele existir
    try {
      const records = app.findRecordsByFilter(
        'candidatos',
        "email = 'lucas.ferreira@exemplo.com'",
        '-created',
        1,
      )
      if (records && records.length > 0) {
        const lucas = records[0]
        lucas.set('video_status', 'analise_concluida')
        lucas.set('video_score_geral', 92)
        lucas.set('video_analise_dimensoes', {
          clareza_comunicacao: 94,
          estrutura_narrativa: 90,
          energia_postura: 92,
          aderencia_vaga: 93,
          red_flags: [],
        })
        lucas.set('video_analisado_em', new Date().toISOString())
        lucas.set('video_versao', 1)
        app.save(lucas)

        // Atualizar também na analises_video_ia se houver registro para ele
        const analiseRecs = app.findRecordsByFilter(
          'analises_video_ia',
          "candidato = '" + lucas.id + "'",
          '-created',
          1,
        )
        if (analiseRecs && analiseRecs.length > 0) {
          const a = analiseRecs[0]
          a.set('score_geral', 92)
          a.set('clareza_comunicacao', 94)
          a.set('estrutura_narrativa', 90)
          a.set('energia_postura', 92)
          a.set('aderencia_vaga', 93)
          a.set('status_analise', 'concluida')
          a.set('versao_video', 1)
          a.set('arquivo_analisado', 'video_link')
          if (!a.get('red_flags') || a.get('red_flags').length === 0) {
            a.set('red_flags', [
              'Nenhum comportamento desfavorável detectado; atenção apenas a compatibilidade salarial/escalas na entrevista.',
            ])
          }
          app.save(a)
        }
      }
    } catch (err) {
      console.log('Aviso ao atualizar seed de Lucas Ferreira:', err)
    }
  },
  (app) => {
    // Revert opcional
  },
)
