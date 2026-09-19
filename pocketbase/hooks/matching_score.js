routerAdd(
  'GET',
  '/backend/v1/matching/score',
  (e) => {
    try {
      const authUser = e.auth
      if (!authUser || !authUser.id) {
        return e.json(401, { error: 'Autenticação obrigatória' })
      }

      const candidatoId = e.requestInfo().query.candidatoId
      const vagaId = e.requestInfo().query.vagaId

      if (!candidatoId) {
        return e.json(400, { error: 'candidatoId é obrigatório' })
      }

      // Look for latest relatorios record for this pair
      let filter = "candidato = '" + candidatoId + "'"
      if (vagaId) {
        filter += " && vaga = '" + vagaId + "'"
      }

      const relatorios = $app.findRecordsByFilter('relatorios', filter, '-created', 1, 0)
      if (relatorios && relatorios.length > 0) {
        const rel = relatorios[0]
        return e.json(200, {
          relatorioId: rel.id,
          score: rel.get('conteudo') || {
            score_geral: rel.get('score_geral'),
            score_tecnico: rel.get('score_tecnico'),
            score_comportamental: rel.get('score_comportamental'),
            veredito: rel.getString('veredito'),
          },
        })
      }

      // If no existing report, return candidate's default or semantic score
      const cand = $app.findRecordById('candidatos', candidatoId)
      const scoreVal = cand.get('score_semantico') || 75
      return e.json(200, {
        relatorioId: null,
        score: {
          score_geral: scoreVal,
          score_tecnico: scoreVal,
          score_comportamental: Math.min(100, Math.max(50, scoreVal - 5)),
          veredito:
            scoreVal >= 75 ? 'Recomendar' : scoreVal >= 50 ? 'Considerar' : 'Não recomendar',
          veredito_textual:
            scoreVal >= 75
              ? 'Alta aderência'
              : scoreVal >= 50
                ? 'Média aderência'
                : 'Baixa aderência',
          justificativa: 'Score baseado na triagem inicial de perfil e habilidades cadastradas.',
          pontos_fortes: ['Perfil cadastrado com dados e histórico profissional'],
          riscos_lacunas: ['Relatório aprofundado de IA ainda não gerado'],
          recomendacao_proximo_passo: 'Gerar relatório completo de IA para análise detalhada.',
        },
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao consultar score' })
    }
  },
  $apis.requireAuth(),
)
