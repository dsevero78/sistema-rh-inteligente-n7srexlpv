// ============================================================================
// Hook: Avaliação de Experiência do Candidato (Candidate Experience)
// Rotas Públicas:
// - GET  /backend/v1/public/experiencia/{token} -> Consulta status e dados da pesquisa
// - POST /backend/v1/public/experiencia/{token}/responder -> Submete as notas e feedback
// Rotas Autenticadas (RH):
// - GET  /backend/v1/experiencia/metricas -> KPIs consolidados, NPS, médias por dimensão e distribuição
// - POST /backend/v1/experiencia/gerar-pesquisa -> Dispara pesquisa manual para candidato/vaga
// ============================================================================

// 1. Consulta Pública da Pesquisa de Experiência
routerAdd('GET', '/backend/v1/public/experiencia/{token}', (e) => {
  try {
    const token = (e.request.pathValue('token') || '').trim()
    if (!token) {
      return e.json(400, { error: 'Token não informado' })
    }

    const col = $app.findRecordsByFilter(
      'avaliacoes_experiencia',
      "token_pesquisa = '" + token + "'",
      '-created',
      1,
      0,
    )

    if (!col || col.length === 0) {
      return e.json(404, { error: 'Pesquisa não encontrada ou link inválido.' })
    }

    const aval = col[0]
    let cand = null
    let vaga = null
    try {
      cand = $app.findRecordById('candidatos', aval.getString('candidato'))
    } catch (_) {}
    try {
      vaga = $app.findRecordById('vagas', aval.getString('vaga'))
    } catch (_) {}

    return e.json(200, {
      id: aval.id,
      token: token,
      respondido: aval.getBool('respondido'),
      data_resposta: aval.getString('data_resposta'),
      status_processo: aval.getString('status_processo'),
      candidato_nome: cand ? cand.getString('nome') : 'Candidato(a)',
      vaga_titulo: vaga ? vaga.getString('titulo') : 'Oportunidade',
      vaga_departamento: vaga ? vaga.getString('departamento') : '',
    })
  } catch (err) {
    console.log('Erro ao carregar pesquisa pública:', err)
    return e.json(500, { error: err.message || 'Falha ao carregar pesquisa.' })
  }
})

// 2. Submissão Pública de Resposta da Pesquisa
routerAdd('POST', '/backend/v1/public/experiencia/{token}/responder', (e) => {
  try {
    const token = (e.request.pathValue('token') || '').trim()
    const body = e.requestInfo().body || {}

    if (!token) {
      return e.json(400, { error: 'Token obrigatório.' })
    }

    const col = $app.findRecordsByFilter(
      'avaliacoes_experiencia',
      "token_pesquisa = '" + token + "'",
      '-created',
      1,
      0,
    )

    if (!col || col.length === 0) {
      return e.json(404, { error: 'Pesquisa não encontrada ou expirada.' })
    }

    const aval = col[0]

    // Anti-duplicidade: se já respondeu, retorna cordial
    if (aval.getBool('respondido')) {
      return e.json(200, {
        success: true,
        jaRespondido: true,
        message: 'Esta pesquisa já foi respondida com sucesso. Agradecemos sua avaliação!',
        data_resposta: aval.getString('data_resposta'),
      })
    }

    // Extrair notas (0 a 10)
    const notaGeral = Math.min(10, Math.max(0, parseInt(body.nota_geral, 10) || 0))
    const clarezaProcesso = Math.min(10, Math.max(0, parseInt(body.clareza_processo, 10) || 0))
    const tempoResposta = Math.min(10, Math.max(0, parseInt(body.tempo_resposta, 10) || 0))
    const tratamentoRh = Math.min(10, Math.max(0, parseInt(body.tratamento_rh, 10) || 0))
    const clarezaVaga = Math.min(10, Math.max(0, parseInt(body.clareza_vaga, 10) || 0))
    const npsScore = Math.min(10, Math.max(0, parseInt(body.nps_score, 10) || notaGeral))
    const recomendaria = (body.recomendaria_empresa || '').trim()
    const comentario = (body.comentario || '').trim()

    // Regra de Alerta de Oportunidade: se nota geral <= 6 ou NPS <= 6
    const isAlerta = notaGeral <= 6 || npsScore <= 6

    const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'

    aval.set('respondido', true)
    aval.set('data_resposta', agoraIso)
    aval.set('nota_geral', notaGeral)
    aval.set('clareza_processo', clarezaProcesso)
    aval.set('tempo_resposta', tempoResposta)
    aval.set('tratamento_rh', tratamentoRh)
    aval.set('clareza_vaga', clarezaVaga)
    aval.set('nps_score', npsScore)
    if (recomendaria) aval.set('recomendaria_empresa', recomendaria)
    aval.set('comentario', comentario)
    aval.set('alerta_oportunidade', isAlerta)
    $app.save(aval)

    // Se disparar alerta de oportunidade, criar notificação no sino do RH
    if (isAlerta) {
      try {
        let cand = null
        let vaga = null
        try {
          cand = $app.findRecordById('candidatos', aval.getString('candidato'))
        } catch (_) {}
        try {
          vaga = $app.findRecordById('vagas', aval.getString('vaga'))
        } catch (_) {}

        const candNome = cand ? cand.getString('nome') : 'Candidato'
        const vagaNome = vaga ? vaga.getString('titulo') : 'Vaga'

        const alertasCol = $app.findCollectionByNameOrId('alertas')
        const alertaRec = new Record(alertasCol)
        if (vaga) alertaRec.set('vaga', vaga.id)
        if (cand) alertaRec.set('candidato', cand.id)
        alertaRec.set('score', npsScore * 10)
        alertaRec.set('tipo', 'experiencia_candidato_detrator')
        alertaRec.set('status', 'Novo')
        alertaRec.set(
          'resumo_ia',
          'Alerta de Experiência (Nota ' +
            notaGeral +
            '/10 · NPS ' +
            npsScore +
            '): ' +
            candNome +
            ' avaliou o processo da vaga ' +
            vagaNome +
            '. ' +
            (comentario
              ? 'Comentário: "' + comentario.substring(0, 150) + '"'
              : 'Avaliação detratora registrada.'),
        )
        alertaRec.set('criado_em', agoraIso)
        $app.save(alertaRec)
      } catch (errAlerta) {
        console.log('Aviso ao registrar alerta de oportunidade de experiência:', errAlerta)
      }
    }

    return e.json(200, {
      success: true,
      message:
        'Muito obrigado! Sua resposta foi gravada com sucesso e apoiará a evolução contínua dos nossos processos de Gente & Gestão.',
      alerta_oportunidade: isAlerta,
    })
  } catch (err) {
    console.log('Erro ao submeter resposta de experiência:', err)
    return e.json(500, { error: err.message || 'Falha ao salvar resposta.' })
  }
})

// 3. Métricas Consolidadas para o Dashboard do RH (Autenticado)
routerAdd(
  'GET',
  '/backend/v1/experiencia/metricas',
  (e) => {
    try {
      const records = $app.findRecordsByFilter('avaliacoes_experiencia', '', '-created', 500, 0)

      let totalEnviadas = records.length
      let totalRespondidas = 0
      let somaGeral = 0
      let somaClarezaProc = 0
      let somaTempo = 0
      let somaRh = 0
      let somaClarezaVaga = 0
      let promotores = 0
      let neutros = 0
      let detratores = 0
      let alertasTotal = 0

      const distribuicaoNotas = {
        '0-4': 0,
        '5-6': 0,
        '7-8': 0,
        '9-10': 0,
      }

      for (let i = 0; i < records.length; i++) {
        const r = records[i]
        if (r.getBool('respondido')) {
          totalRespondidas++
          const nGeral = r.getInt('nota_geral') || 0
          const nClareza = r.getInt('clareza_processo') || 0
          const nTempo = r.getInt('tempo_resposta') || 0
          const nRh = r.getInt('tratamento_rh') || 0
          const nVaga = r.getInt('clareza_vaga') || 0
          const nps = r.getInt('nps_score') || nGeral

          somaGeral += nGeral
          somaClarezaProc += nClareza
          somaTempo += nTempo
          somaRh += nRh
          somaClarezaVaga += nVaga

          if (r.getBool('alerta_oportunidade')) {
            alertasTotal++
          }

          if (nps >= 9) {
            promotores++
          } else if (nps >= 7) {
            neutros++
          } else {
            detratores++
          }

          if (nGeral >= 9) distribuicaoNotas['9-10']++
          else if (nGeral >= 7) distribuicaoNotas['7-8']++
          else if (nGeral >= 5) distribuicaoNotas['5-6']++
          else distribuicaoNotas['0-4']++
        }
      }

      const mediaGeral =
        totalRespondidas > 0 ? parseFloat((somaGeral / totalRespondidas).toFixed(1)) : 0
      const mediaClareza =
        totalRespondidas > 0 ? parseFloat((somaClarezaProc / totalRespondidas).toFixed(1)) : 0
      const mediaTempo =
        totalRespondidas > 0 ? parseFloat((somaTempo / totalRespondidas).toFixed(1)) : 0
      const mediaRh = totalRespondidas > 0 ? parseFloat((somaRh / totalRespondidas).toFixed(1)) : 0
      const mediaVaga =
        totalRespondidas > 0 ? parseFloat((somaClarezaVaga / totalRespondidas).toFixed(1)) : 0

      // NPS = (% promotores - % detratores) * 100
      let npsFinal = 0
      if (totalRespondidas > 0) {
        npsFinal = Math.round(((promotores - detratores) / totalRespondidas) * 100)
      }

      const taxaResposta =
        totalEnviadas > 0 ? Math.round((totalRespondidas / totalEnviadas) * 100) : 0

      return e.json(200, {
        kpis: {
          total_enviadas: totalEnviadas,
          total_respondidas: totalRespondidas,
          taxa_resposta: taxaResposta,
          nota_media_geral: mediaGeral,
          nps: npsFinal,
          promotores: promotores,
          neutros: neutros,
          detratores: detratores,
          alertas_oportunidade: alertasTotal,
        },
        dimensoes: [
          { nome: 'Clareza do Processo', media: mediaClareza },
          { nome: 'Tempo de Resposta', media: mediaTempo },
          { nome: 'Tratamento do RH', media: mediaRh },
          { nome: 'Alinhamento da Vaga', media: mediaVaga },
        ],
        distribuicao: distribuicaoNotas,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao consolidar métricas' })
    }
  },
  $apis.requireAuth(),
)

// 4. Disparo Manual de Pesquisa de Experiência (Autenticado)
routerAdd(
  'POST',
  '/backend/v1/experiencia/gerar-pesquisa',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const candidatoId = (body.candidatoId || '').trim()
      const vagaId = (body.vagaId || '').trim()
      const statusProcesso = (body.statusProcesso || 'Recusado').trim()

      if (!candidatoId || !vagaId) {
        return e.json(400, { error: 'candidatoId e vagaId são obrigatórios' })
      }

      const cand = $app.findRecordById('candidatos', candidatoId)
      const vaga = $app.findRecordById('vagas', vagaId)
      if (!cand || !vaga) {
        return e.json(404, { error: 'Candidato ou Vaga não encontrado' })
      }

      // Anti-duplicidade: verificar se já existe pesquisa para este candidato e vaga
      let jaExiste = null
      try {
        const achados = $app.findRecordsByFilter(
          'avaliacoes_experiencia',
          "candidato = '" + candidatoId + "' && vaga = '" + vagaId + "'",
          '-created',
          1,
          0,
        )
        if (achados && achados.length > 0) {
          jaExiste = achados[0]
        }
      } catch (_) {}

      if (jaExiste) {
        return e.json(200, {
          success: true,
          jaExistia: true,
          token: jaExiste.getString('token_pesquisa'),
          link: '/experiencia/' + jaExiste.getString('token_pesquisa'),
          respondido: jaExiste.getBool('respondido'),
        })
      }

      const tokenNovo = 'exp-' + $security.randomString(20).toLowerCase()
      const col = $app.findCollectionByNameOrId('avaliacoes_experiencia')
      const rec = new Record(col)
      rec.set('candidato', candidatoId)
      rec.set('vaga', vagaId)
      rec.set('token_pesquisa', tokenNovo)
      rec.set('status_processo', statusProcesso)
      rec.set('respondido', false)
      rec.set('alerta_oportunidade', false)
      $app.save(rec)

      // Disparar e-mail cordial de pesquisa
      const candEmail = cand.getString('email')
      const candNome = cand.getString('nome') || 'Candidato'
      const vagaTitulo = vaga.getString('titulo')
      const linkPublico = '/experiencia/' + tokenNovo

      let emailEnviado = false
      if (candEmail) {
        try {
          const mailClient = $app.newMailClient()
          const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
          const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'
          const assunto =
            'Sua opinião é fundamental: Experiência no Processo Seletivo (' + vagaTitulo + ')'

          const html =
            '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
            '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
            '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
            '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Pesquisa de Experiência do Candidato</p>' +
            '</div>' +
            '<p style="color: #334155; font-size: 15px; line-height: 1.6;">Olá, <strong>' +
            candNome +
            '</strong>!</p>' +
            '<p style="color: #334155; font-size: 14px; line-height: 1.6;">Queremos agradecer sua participação no processo seletivo para a posição de <strong>' +
            vagaTitulo +
            '</strong>. Buscamos melhorar continuamente o acolhimento, o respeito ao seu tempo e a transparência de nossas etapas.</p>' +
            '<p style="color: #334155; font-size: 14px; line-height: 1.6;">Gostaríamos de convidá-lo(a) a responder uma breve pesquisa de apenas <strong>1 minuto</strong>. Sua resposta é tratada com total sigilo e contribui diretamente para a evolução do nosso time.</p>' +
            '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">' +
            '<a href="' +
            linkPublico +
            '" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 24px; border-radius: 6px;">Responder Pesquisa de Experiência</a>' +
            '</div>' +
            '<p style="color: #64748b; font-size: 12px; line-height: 1.5;">Agradecemos mais uma vez pela oportunidade de conhecer sua trajetória profissional!</p>' +
            '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Equipe de Gente & Gestão</strong></p>' +
            '</div>'

          const msg = new MailerMessage({
            from: { address: senderAddress, name: senderName },
            to: [{ address: candEmail }],
            subject: assunto,
            html: html,
          })

          mailClient.send(msg)
          emailEnviado = true
        } catch (sendErr) {
          console.log('Falha ao enviar e-mail de pesquisa de experiência:', sendErr)
        }

        // Registrar no log de auditoria
        try {
          const logsCol = $app.findCollectionByNameOrId('logs_emails_status')
          const logRec = new Record(logsCol)
          logRec.set('candidato', cand.id)
          logRec.set('vaga', vaga.id)
          logRec.set('estagio', statusProcesso === 'Contratado' ? 'Aprovado' : 'Recusado')
          logRec.set('candidato_nome', candNome)
          logRec.set('candidato_email', candEmail)
          logRec.set('vaga_titulo', vagaTitulo)
          logRec.set(
            'assunto',
            'Sua opinião é fundamental: Experiência no Processo Seletivo (' + vagaTitulo + ')',
          )
          logRec.set('status_envio', emailEnviado ? 'Enviado' : 'Falhou')
          logRec.set(
            'mensagem_resumo',
            'Convite para pesquisa de satisfação e experiência do candidato (' + linkPublico + ').',
          )
          logRec.set(
            'data_envio',
            new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z',
          )
          $app.save(logRec)
        } catch (_) {}
      }

      return e.json(200, {
        success: true,
        message: 'Pesquisa gerada e convite encaminhado ao candidato!',
        token: tokenNovo,
        link: linkPublico,
        emailEnviado: emailEnviado,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao gerar pesquisa' })
    }
  },
  $apis.requireAuth(),
)
