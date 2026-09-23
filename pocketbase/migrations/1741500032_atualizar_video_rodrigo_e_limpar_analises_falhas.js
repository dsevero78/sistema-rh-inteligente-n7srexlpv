/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Atualizar candidato Rodrigo Silveira Duarte (qb11bve852h5c6w)
    try {
      const cand = app.findRecordById('candidatos', 'qb11bve852h5c6w')
      cand.set('video_link', 'https://youtu.be/GMc46jaxEGw')
      cand.set('video_apresentacao', '')
      cand.set('video_conflito_identidade', false)
      cand.set('video_nome_detectado', '')
      app.save(cand)
    } catch (err) {
      console.log('[migration] Erro ao atualizar candidato qb11bve852h5c6w:', err.message)
    }

    // 2. Excluir análises antigas falhas do Rodrigo Silveira Duarte
    try {
      const analisesFalhas = app.findRecordsByFilter(
        'analises_video_ia',
        "candidato = 'qb11bve852h5c6w'",
        '-created',
        50,
      )
      for (const an of analisesFalhas) {
        try {
          app.delete(an)
        } catch (eDel) {
          console.log('[migration] Falha ao deletar análise antiga:', an.id, eDel.message)
        }
      }
    } catch (err) {
      console.log('[migration] Erro ao buscar análises antigas do candidato:', err.message)
    }
  },
  (app) => {
    // Revert opcional
  },
)
