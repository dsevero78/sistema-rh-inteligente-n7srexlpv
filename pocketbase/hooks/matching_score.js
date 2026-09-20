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

      // Checar se há entrevista realizada com avaliação para esse candidato
      let temAvaliacao = false
      let ultimaAvaliacao = null
      try {
        let entFilter =
          "candidato = '" + candidatoId + "' && status = 'Realizada' && avaliacao_realizada = true"
        if (vagaId) {
          entFilter += " && vaga = '" + vagaId + "'"
        }
        const entRecords = $app.findRecordsByFilter('entrevistas', entFilter, '-data_hora', 1, 0)
        if (entRecords && entRecords.length > 0) {
          temAvaliacao = true
          const ent = entRecords[0]
          ultimaAvaliacao = {
            id: ent.id,
            data_hora: ent.getString('data_hora'),
            nota_tecnica: ent.getInt('nota_tecnica'),
            comentario_tecnico: ent.getString('comentario_tecnico'),
            nota_comportamental: ent.getInt('nota_comportamental'),
            comentario_comportamental: ent.getString('comentario_comportamental'),
            recomendacao_final: ent.getString('recomendacao_final'),
            comentario_geral: ent.getString('comentario_geral'),
            score_ajustado: ent.getInt('score_ajustado'),
          }
        }
      } catch (checkErr) {
        console.log('Erro ao checar avaliação da entrevista:', checkErr)
      }

      // Look for latest relatorios record for this pair
      let filter = "candidato = '" + candidatoId + "'"
      if (vagaId) {
        filter += " && vaga = '" + vagaId + "'"
      }

      const relatorios = $app.findRecordsByFilter('relatorios', filter, '-created', 1, 0)
      if (relatorios && relatorios.length > 0) {
        const rel = relatorios[0]
        const scoreConteudo = rel.get('conteudo') || {
          score_geral: rel.get('score_geral'),
          score_tecnico: rel.get('score_tecnico'),
          score_comportamental: rel.get('score_comportamental'),
          veredito: rel.getString('veredito'),
        }

        if (temAvaliacao) {
          scoreConteudo.ajustado_pos_entrevista = true
          scoreConteudo.ultima_avaliacao = ultimaAvaliacao
          if (ultimaAvaliacao.score_ajustado) {
            scoreConteudo.score_geral = ultimaAvaliacao.score_ajustado
          }
        }

        return e.json(200, {
          relatorioId: rel.id,
          score: scoreConteudo,
          ajustado_pos_entrevista: temAvaliacao,
          ultima_avaliacao: ultimaAvaliacao,
        })
      }

      // If no existing report, return candidate's default or semantic score
      const cand = $app.findRecordById('candidatos', candidatoId)
      let scoreVal = cand.get('score_semantico') || 75
      if (temAvaliacao && ultimaAvaliacao.score_ajustado) {
        scoreVal = ultimaAvaliacao.score_ajustado
      }

      return e.json(200, {
        relatorioId: null,
        score: {
          score_geral: scoreVal,
          score_tecnico: scoreVal,
          score_comportamental: Math.min(100, Math.max(50, scoreVal - 5)),
          ajustado_pos_entrevista: temAvaliacao,
          ultima_avaliacao: ultimaAvaliacao,
          veredito:
            scoreVal >= 75 ? 'Recomendar' : scoreVal >= 50 ? 'Considerar' : 'Não recomendar',
          veredito_textual:
            scoreVal >= 75
              ? 'Alta aderência'
              : scoreVal >= 50
                ? 'Média aderência'
                : 'Baixa aderência',
          justificativa: temAvaliacao
            ? 'Score ajustado pós-entrevista com base na avaliação realizada pelo entrevistador.'
            : 'Score baseado na triagem inicial de perfil e habilidades cadastradas.',
          pontos_fortes: ['Perfil cadastrado com dados e histórico profissional'],
          riscos_lacunas: ['Relatório aprofundado de IA ainda não gerado'],
          recomendacao_proximo_passo: temAvaliacao
            ? 'Candidato já realizou entrevista com avaliação pós-entrevista.'
            : 'Gerar relatório completo de IA para análise detalhada.',
        },
        ajustado_pos_entrevista: temAvaliacao,
        ultima_avaliacao: ultimaAvaliacao,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao consultar score' })
    }
  },
  $apis.requireAuth(),
)
