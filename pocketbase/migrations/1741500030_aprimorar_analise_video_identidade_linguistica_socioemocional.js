/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const analisesCol = app.findCollectionByNameOrId('analises_video_ia')

    const novosCampos = [
      new TextField({
        name: 'nome_detectado_no_video',
        required: false,
      }),
      new BoolField({
        name: 'conflito_identidade',
        required: false,
      }),
      new TextField({
        name: 'detalhes_conflito_identidade',
        required: false,
      }),
      new BoolField({
        name: 'conflito_confirmado_rh',
        required: false,
      }),
      new NumberField({
        name: 'indice_naturalidade',
        min: 0,
        max: 100,
        required: false,
      }),
      new TextField({
        name: 'veredito_naturalidade',
        required: false,
      }),
      new JSONField({
        name: 'analise_linguistica',
        required: false,
      }),
      new JSONField({
        name: 'pontos_cegos',
        required: false,
      }),
      new JSONField({
        name: 'expressao_socioemocional',
        required: false,
      }),
    ]

    for (const field of novosCampos) {
      if (!analisesCol.fields.getByName(field.name)) {
        analisesCol.fields.add(field)
      }
    }

    app.save(analisesCol)

    // Adicionar também campos de conflito e naturalidade em candidatos caso útil
    try {
      const candCol = app.findCollectionByNameOrId('candidatos')
      const candCampos = [
        new BoolField({
          name: 'video_conflito_identidade',
          required: false,
        }),
        new TextField({
          name: 'video_nome_detectado',
          required: false,
        }),
      ]
      for (const cf of candCampos) {
        if (!candCol.fields.getByName(cf.name)) {
          candCol.fields.add(cf)
        }
      }
      app.save(candCol)
    } catch (eCand) {
      console.log('Aviso ao adicionar campos em candidatos:', eCand.message)
    }
  },
  (app) => {
    try {
      const analisesCol = app.findCollectionByNameOrId('analises_video_ia')
      const nomes = [
        'nome_detectado_no_video',
        'conflito_identidade',
        'detalhes_conflito_identidade',
        'conflito_confirmado_rh',
        'indice_naturalidade',
        'veredito_naturalidade',
        'analise_linguistica',
        'pontos_cegos',
        'expressao_socioemocional',
      ]
      for (const n of nomes) {
        if (analisesCol.fields.getByName(n)) {
          analisesCol.fields.removeByName(n)
        }
      }
      app.save(analisesCol)
    } catch (_) {}
  },
)
