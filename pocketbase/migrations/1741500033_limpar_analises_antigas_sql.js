/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Executar deleção direta via SQL no SQLite
    try {
      app
        .db()
        .newQuery("DELETE FROM analises_video_ia WHERE candidato = 'qb11bve852h5c6w'")
        .execute()
      console.log('[migration] Análises antigas de qb11bve852h5c6w excluídas via SQL.')
    } catch (err) {
      console.log('[migration] Erro ao deletar via SQL:', err.message)
    }
  },
  (app) => {},
)
