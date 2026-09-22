/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('candidatos')
    const existingField = col.fields.getByName('video_apresentacao')

    const allowedMimes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-matroska',
      'video/ogg',
      'video/x-msvideo',
    ]
    const maxSize = 104857600 // 100 MB em bytes

    if (existingField) {
      existingField.maxSize = maxSize
      existingField.mimeTypes = allowedMimes
      existingField.maxSelect = 1
    } else {
      col.fields.add(
        new FileField({
          name: 'video_apresentacao',
          maxSelect: 1,
          maxSize: maxSize,
          mimeTypes: allowedMimes,
        }),
      )
    }

    app.save(col)
  },
  (app) => {
    // Revert opcional: mantém o campo funcional com os mimes básicos
    try {
      const col = app.findCollectionByNameOrId('candidatos')
      const field = col.fields.getByName('video_apresentacao')
      if (field) {
        field.maxSize = 104857600
        field.mimeTypes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']
        app.save(col)
      }
    } catch (_) {}
  },
)
