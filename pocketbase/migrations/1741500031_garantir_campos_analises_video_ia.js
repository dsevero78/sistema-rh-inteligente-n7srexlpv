/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Garantir que analises_video_ia tenha todos os campos necessários e status_analise seguro
    let analisesCol
    try {
      analisesCol = app.findCollectionByNameOrId('analises_video_ia')
    } catch (_) {
      analisesCol = null
    }

    if (analisesCol) {
      // Garantir campo status_analise
      const fStatus = analisesCol.fields.getByName('status_analise')
      if (!fStatus) {
        analisesCol.fields.add(
          new SelectField({
            name: 'status_analise',
            values: ['concluida', 'erro', 'processando', 'erro_acesso'],
            maxSelect: 1,
            required: false,
          }),
        )
      }

      // Garantir campo erro_detalhes
      if (!analisesCol.fields.getByName('erro_detalhes')) {
        analisesCol.fields.add(
          new TextField({
            name: 'erro_detalhes',
            required: false,
          }),
        )
      }

      // Garantir campo score_geral
      if (!analisesCol.fields.getByName('score_geral')) {
        analisesCol.fields.add(
          new NumberField({
            name: 'score_geral',
            min: 0,
            max: 100,
            required: false,
          }),
        )
      }

      // Garantir campo clareza_comunicacao
      if (!analisesCol.fields.getByName('clareza_comunicacao')) {
        analisesCol.fields.add(
          new NumberField({
            name: 'clareza_comunicacao',
            min: 0,
            max: 100,
            required: false,
          }),
        )
      }

      // Garantir campo estrutura_narrativa
      if (!analisesCol.fields.getByName('estrutura_narrativa')) {
        analisesCol.fields.add(
          new NumberField({
            name: 'estrutura_narrativa',
            min: 0,
            max: 100,
            required: false,
          }),
        )
      }

      // Garantir campo energia_postura
      if (!analisesCol.fields.getByName('energia_postura')) {
        analisesCol.fields.add(
          new NumberField({
            name: 'energia_postura',
            min: 0,
            max: 100,
            required: false,
          }),
        )
      }

      // Garantir campo aderencia_vaga
      if (!analisesCol.fields.getByName('aderencia_vaga')) {
        analisesCol.fields.add(
          new NumberField({
            name: 'aderencia_vaga',
            min: 0,
            max: 100,
            required: false,
          }),
        )
      }

      // Garantir campo red_flags
      if (!analisesCol.fields.getByName('red_flags')) {
        analisesCol.fields.add(
          new JSONField({
            name: 'red_flags',
            required: false,
          }),
        )
      }

      // Garantir campo versao_video
      if (!analisesCol.fields.getByName('versao_video')) {
        analisesCol.fields.add(
          new NumberField({
            name: 'versao_video',
            required: false,
          }),
        )
      }

      // Garantir campo arquivo_analisado
      if (!analisesCol.fields.getByName('arquivo_analisado')) {
        analisesCol.fields.add(
          new TextField({
            name: 'arquivo_analisado',
            required: false,
          }),
        )
      }

      // Campo adicional para texto livre original da recomendacao da IA caso extenso
      if (!analisesCol.fields.getByName('recomendacao_detalhada')) {
        analisesCol.fields.add(
          new TextField({
            name: 'recomendacao_detalhada',
            required: false,
          }),
        )
      }

      app.save(analisesCol)
    }

    // 2. Garantir que candidatos tenha video_versao, video_score_geral, video_analise_dimensoes, video_analisado_em
    try {
      const candCol = app.findCollectionByNameOrId('candidatos')
      if (!candCol.fields.getByName('video_versao')) {
        candCol.fields.add(new NumberField({ name: 'video_versao', required: false }))
      }
      if (!candCol.fields.getByName('video_score_geral')) {
        candCol.fields.add(
          new NumberField({ name: 'video_score_geral', min: 0, max: 100, required: false }),
        )
      }
      if (!candCol.fields.getByName('video_analise_dimensoes')) {
        candCol.fields.add(new JSONField({ name: 'video_analise_dimensoes', required: false }))
      }
      if (!candCol.fields.getByName('video_analisado_em')) {
        candCol.fields.add(new DateField({ name: 'video_analisado_em', required: false }))
      }
      app.save(candCol)
    } catch (eCand) {
      console.log('Aviso ao garantir campos em candidatos:', eCand.message)
    }
  },
  (app) => {
    // Revert opcional
  },
)
