routerAdd(
  'POST',
  '/backend/v1/triagem/submeter',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const candidatoId = body.candidatoId
      const vagaId = body.vagaId
      const respostas = body.respostas || [] // [{ perguntaId, resposta }]

      if (!candidatoId || !vagaId) {
        return e.json(400, { error: 'candidatoId e vagaId são obrigatórios' })
      }

      const candidato = $app.findRecordById('candidatos', candidatoId)
      const vaga = $app.findRecordById('vagas', vagaId)
      if (!candidato || !vaga) {
        return e.json(404, { error: 'Candidato ou vaga não encontrado' })
      }

      // Buscar questionário ativo da vaga
      let questionarioRecord = null
      let perguntasDef = []
      try {
        const qList = $app.findRecordsByFilter(
          'questionarios_vaga',
          "vaga = '" + vagaId + "' && ativo = true",
          '-created',
          1,
          0,
        )
        if (qList && qList.length > 0) {
          questionarioRecord = qList[0]
          perguntasDef = questionarioRecord.get('perguntas') || []
        }
      } catch (errQ) {
        console.log('Erro ao buscar questionário da vaga:', errQ)
      }

      let reprovado = false
      let motivoReprovacao = ''
      let eliminatoriasAtendidas = 0
      let totalPerguntas = perguntasDef.length || respostas.length
      const respostasProcessadas = []

      for (let i = 0; i < perguntasDef.length; i++) {
        const p = perguntasDef[i]
        const userRespObj = respostas.find(function (r) {
          return r.perguntaId === p.id
        })
        const valorResp = userRespObj ? userRespObj.resposta : null
        let atendeu = true
        let falhaMotivo = ''

        if (p.eliminatoria) {
          if (p.tipo === 'sim_nao') {
            const esperada = p.resposta_esperada || 'Sim'
            if (String(valorResp).toLowerCase() !== String(esperada).toLowerCase()) {
              atendeu = false
              falhaMotivo =
                p.mensagem_reprovacao ||
                'Não atendeu ao critério eliminatório: ' +
                  p.enunciado +
                  ' (Esperado: ' +
                  esperada +
                  ')'
            }
          } else if (p.tipo === 'numero') {
            const numVal = parseFloat(valorResp)
            if (isNaN(numVal)) {
              atendeu = false
              falhaMotivo =
                p.mensagem_reprovacao || 'Valor numérico obrigatório para: ' + p.enunciado
            } else {
              if (
                p.valor_minimo !== undefined &&
                p.valor_minimo !== null &&
                numVal < p.valor_minimo
              ) {
                atendeu = false
                falhaMotivo =
                  p.mensagem_reprovacao ||
                  'Valor abaixo do mínimo permitido (' + p.valor_minimo + ') para: ' + p.enunciado
              }
              if (
                p.valor_maximo !== undefined &&
                p.valor_maximo !== null &&
                numVal > p.valor_maximo
              ) {
                atendeu = false
                falhaMotivo =
                  p.mensagem_reprovacao ||
                  'Valor acima do máximo permitido (' + p.valor_maximo + ') para: ' + p.enunciado
              }
            }
          } else if (p.tipo === 'escolha_unica') {
            const validas = p.respostas_validas || []
            if (validas.length > 0 && !validas.includes(valorResp)) {
              atendeu = false
              falhaMotivo =
                p.mensagem_reprovacao ||
                'Opção selecionada inválida para o critério eliminatório: ' + p.enunciado
            }
          }

          if (!atendeu) {
            reprovado = true
            if (!motivoReprovacao) {
              motivoReprovacao = 'Reprovado na triagem automática: ' + falhaMotivo
            }
          } else {
            eliminatoriasAtendidas++
          }
        } else {
          // Pergunta não-eliminatória
          eliminatoriasAtendidas++
        }

        respostasProcessadas.push({
          perguntaId: p.id,
          pergunta: p.enunciado,
          tipo: p.tipo,
          resposta: valorResp,
          eliminatoria: !!p.eliminatoria,
          atendeu: atendeu,
        })
      }

      // Salvar ou atualizar registro em respostas_triagem
      const respostasCol = $app.findCollectionByNameOrId('respostas_triagem')
      let respRecord = null
      try {
        const jaExiste = $app.findRecordsByFilter(
          'respostas_triagem',
          "candidato = '" + candidatoId + "' && vaga = '" + vagaId + "'",
          '-created',
          1,
          0,
        )
        if (jaExiste && jaExiste.length > 0) {
          respRecord = jaExiste[0]
        }
      } catch (_) {}

      if (!respRecord) {
        respRecord = new Record(respostasCol)
        respRecord.set('candidato', candidatoId)
        respRecord.set('vaga', vagaId)
      }

      if (questionarioRecord) {
        respRecord.set('questionario', questionarioRecord.id)
      }
      respRecord.set('respostas', respostasProcessadas)
      respRecord.set('reprovado_automaticamente', reprovado)
      respRecord.set('motivo_reprovacao', motivoReprovacao)
      respRecord.set('total_perguntas', totalPerguntas)
      respRecord.set('total_eliminatorias_atendidas', eliminatoriasAtendidas)
      $app.save(respRecord)

      // Se reprovado automaticamente, atualizar candidato e pipeline
      if (reprovado) {
        candidato.set('status', 'Recusado')
        candidato.set('reprovado_triagem_auto', true)
        candidato.set('motivo_reprovacao_triagem', motivoReprovacao)
        $app.save(candidato)

        // Atualizar pipeline se existir
        try {
          const pList = $app.findRecordsByFilter(
            'pipeline',
            "candidato = '" + candidatoId + "' && vaga = '" + vagaId + "'",
            '-created',
            1,
            0,
          )
          if (pList && pList.length > 0) {
            const p = pList[0]
            const historico = p.get('historico') || []
            historico.push({
              data: new Date().toISOString(),
              estagio: 'Recusado',
              autor: 'Sistema de Triagem Automática',
              nota: motivoReprovacao,
            })
            p.set('estagio', 'Recusado')
            p.set('motivo_recusa', motivoReprovacao)
            p.set('historico', historico)
            $app.save(p)
          }
        } catch (errP) {
          console.log('Erro ao atualizar pipeline na reprovação automática:', errP)
        }
      }

      return e.json(200, {
        reprovado: reprovado,
        motivo_reprovacao: motivoReprovacao,
        total_perguntas: totalPerguntas,
        eliminatorias_atendidas: eliminatoriasAtendidas,
        respostaId: respRecord.id,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao processar triagem' })
    }
  },
  $apis.requireAuth(),
)
