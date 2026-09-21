// ============================================================================
// Hook: Portal Público de Experiência do Candidato
// Endpoints Públicos (sem auth):
// - GET  /backend/v1/public/candidato-portal/{token} -> Dados completos do portal
// - POST /backend/v1/public/candidato-portal/{token}/escolher-horario -> Confirma agendamento de entrevista
// - POST /backend/v1/public/candidato-portal/{token}/pedir-reagendamento -> Solicita nova janela
// - POST /backend/v1/public/candidato-portal/{token}/feedback-nps -> Envia avaliação pós-processo
//
// Endpoints Autenticados (RH):
// - POST /backend/v1/candidato/{id}/propor-janelas -> RH propõe lista de janelas para entrevista
// - POST /backend/v1/candidato/{id}/gerar-token-portal -> Gera ou recupera token_portal
// ============================================================================

// 1. GET /backend/v1/public/candidato-portal/{token}
routerAdd('GET', '/backend/v1/public/candidato-portal/{token}', (e) => {
  try {
    const token = (e.request.pathValue('token') || '').trim()
    if (!token) {
      return e.json(400, { error: 'Token não fornecido.' })
    }

    const cands = $app.findRecordsByFilter(
      'candidatos',
      "token_portal = '" + token + "'",
      '-created',
      1,
      0,
    )

    if (!cands || cands.length === 0) {
      return e.json(404, { error: 'Candidato não encontrado ou link inválido.' })
    }

    const cand = cands[0]

    // Buscar Vaga
    let vaga = null
    const vagaId = cand.getString('vaga') || cand.getString('vaga_origem')
    if (vagaId) {
      try {
        vaga = $app.findRecordById('vagas', vagaId)
      } catch (_) {}
    }

    // Buscar Pipeline
    let pipeline = null
    try {
      const pList = $app.findRecordsByFilter(
        'pipeline',
        "candidato = '" + cand.id + "'",
        '-updated',
        1,
        0,
      )
      if (pList && pList.length > 0) {
        pipeline = pList[0]
      }
    } catch (_) {}

    // Buscar Janela de Agendamento Ativa
    let janelaAgendamento = null
    try {
      const jList = $app.findRecordsByFilter(
        'janelas_entrevista_candidato',
        "candidato = '" + cand.id + "'",
        '-updated',
        1,
        0,
      )
      if (jList && jList.length > 0) {
        const j = jList[0]
        janelaAgendamento = {
          id: j.id,
          status: j.getString('status'),
          janelas_propostas: j.get('janelas_propostas') || [],
          janela_escolhida: j.get('janela_escolhida') || null,
          motivo_reagendamento: j.getString('motivo_reagendamento'),
          formato: j.getString('formato') || 'Online',
          duracao_minutos: j.getInt('duracao_minutos') || 60,
          responsavel_nome: j.getString('responsavel_nome') || 'Time de Recrutamento',
          link_reuniao: j.getString('link_reuniao') || '',
          observacoes_rh: j.getString('observacoes_rh') || '',
          updated: j.getString('updated'),
        }
      }
    } catch (_) {}

    // Buscar Entrevista Realizada ou Agendada
    let entrevistaAtual = null
    try {
      const eList = $app.findRecordsByFilter(
        'entrevistas',
        "candidato = '" + cand.id + "'",
        '-data_hora',
        1,
        0,
      )
      if (eList && eList.length > 0) {
        const ent = eList[0]
        entrevistaAtual = {
          id: ent.id,
          data_hora: ent.getString('data_hora'),
          formato: ent.getString('formato'),
          duracao_minutos: ent.getInt('duracao_minutos') || 60,
          responsavel: ent.getString('responsavel'),
          status: ent.getString('status'),
          observacoes: ent.getString('observacoes'),
        }
      }
    } catch (_) {}

    // Buscar Feedback NPS existente (se houver)
    let feedbackExistente = null
    try {
      const fList = $app.findRecordsByFilter(
        'avaliacoes_experiencia',
        "candidato = '" + cand.id + "'",
        '-created',
        1,
        0,
      )
      if (fList && fList.length > 0) {
        const f = fList[0]
        feedbackExistente = {
          id: f.id,
          token_pesquisa: f.getString('token_pesquisa'),
          respondido: f.getBool('respondido'),
          data_resposta: f.getString('data_resposta'),
          nota_geral: f.getInt('nota_geral'),
          nps_score: f.getInt('nps_score'),
          clareza_processo: f.getInt('clareza_processo'),
          tempo_resposta: f.getInt('tempo_resposta'),
          tratamento_rh: f.getInt('tratamento_rh'),
          clareza_vaga: f.getInt('clareza_vaga'),
          recomendaria_empresa: f.getString('recomendaria_empresa'),
          comentario: f.getString('comentario'),
        }
      }
    } catch (_) {}

    // Mapeamento das etapas padrão do processo SouYess
    const etapasPipeline = [
      {
        chave: 'inscricao',
        titulo: 'Inscrição Recebida',
        descricao: 'Currículo e dados iniciais recebidos com sucesso pela nossa plataforma.',
      },
      {
        chave: 'triagem',
        titulo: 'Triagem & Matching IA',
        descricao:
          'Análise de compatibilidade de perfil e competências conduzida pela IA e Gente & Gestão.',
      },
      {
        chave: 'entrevista_rh',
        titulo: 'Entrevista com RH',
        descricao: 'Alinhamento comportamental, cultura da empresa e expectativas mútuas.',
      },
      {
        chave: 'entrevista_tecnica',
        titulo: 'Entrevista Técnica',
        descricao:
          'Avaliação aprofundada de requisitos práticos com o time de especialistas e gestor.',
      },
      {
        chave: 'decisao',
        titulo: 'Decisão & Proposta',
        descricao: 'Consolidação das avaliações e definição de proposta salarial.',
      },
      {
        chave: 'contratacao',
        titulo: 'Contratação & Admissão',
        descricao: 'Boas-vindas ao time SouYess com trilha de onboarding digital.',
      },
    ]

    const statusAtual = cand.getString('status') || 'Triagem'
    const reprovadoTriagem = cand.getBool('reprovado_triagem_auto')

    return e.json(200, {
      candidato: {
        id: cand.id,
        nome: cand.getString('nome'),
        email: cand.getString('email'),
        telefone: cand.getString('telefone'),
        status: statusAtual,
        reprovado_triagem_auto: reprovadoTriagem,
        token_portal: cand.getString('token_portal'),
        data_inscricao: cand.getString('created'),
      },
      vaga: vaga
        ? {
            id: vaga.id,
            titulo: vaga.getString('titulo'),
            departamento: vaga.getString('departamento'),
            localizacao: vaga.getString('localizacao'),
            modalidade: vaga.getString('modalidade'),
            descricao: vaga.getString('descricao'),
          }
        : null,
      pipeline: pipeline
        ? {
            id: pipeline.id,
            estagio: pipeline.getString('estagio'),
            historico: pipeline.get('historico') || [],
            updated: pipeline.getString('updated'),
          }
        : null,
      etapas: etapasPipeline,
      janelaAgendamento: janelaAgendamento,
      entrevistaAtual: entrevistaAtual,
      feedbackExistente: feedbackExistente,
    })
  } catch (err) {
    console.log('Erro no portal do candidato:', err)
    return e.json(500, { error: err.message || 'Falha ao consultar portal do candidato.' })
  }
})

// 2. POST /backend/v1/public/candidato-portal/{token}/escolher-horario
routerAdd('POST', '/backend/v1/public/candidato-portal/{token}/escolher-horario', (e) => {
  try {
    const token = (e.request.pathValue('token') || '').trim()
    const body = e.requestInfo().body || {}
    const slotId = (body.slotId || '').trim()
    const dataInicio = (body.dataInicio || '').trim()

    if (!token || !slotId) {
      return e.json(400, { error: 'Token e slotId são obrigatórios.' })
    }

    const cands = $app.findRecordsByFilter(
      'candidatos',
      "token_portal = '" + token + "'",
      '-created',
      1,
      0,
    )
    if (!cands || cands.length === 0) {
      return e.json(404, { error: 'Candidato não encontrado.' })
    }
    const cand = cands[0]

    // Buscar registro de janelas
    const jList = $app.findRecordsByFilter(
      'janelas_entrevista_candidato',
      "candidato = '" + cand.id + "'",
      '-updated',
      1,
      0,
    )
    if (!jList || jList.length === 0) {
      return e.json(404, {
        error: 'Nenhuma proposta de horário ativa encontrada para este candidato.',
      })
    }
    const janelaRec = jList[0]

    const propostas = janelaRec.get('janelas_propostas') || []
    let slotEscolhido = null
    for (let i = 0; i < propostas.length; i++) {
      if (propostas[i].id === slotId) {
        slotEscolhido = propostas[i]
        break
      }
    }

    if (!slotEscolhido && dataInicio) {
      slotEscolhido = {
        id: slotId,
        data_inicio: dataInicio,
        label: body.label || dataInicio,
      }
    }

    if (!slotEscolhido) {
      return e.json(400, { error: 'Horário selecionado não encontrado na lista de opções.' })
    }

    // Atualizar registro de janelas
    janelaRec.set('status', 'Confirmado')
    janelaRec.set('janela_escolhida', slotEscolhido)
    janelaRec.set('motivo_reagendamento', '')
    $app.save(janelaRec)

    // Atualizar ou criar registro na coleção entrevistas
    let entRec = null
    const entId = janelaRec.getString('entrevista_existente')
    if (entId) {
      try {
        entRec = $app.findRecordById('entrevistas', entId)
      } catch (_) {}
    }

    const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
    const horaEntrevista = slotEscolhido.data_inicio || dataInicio

    if (!entRec) {
      const entCol = $app.findCollectionByNameOrId('entrevistas')
      entRec = new Record(entCol)
      entRec.set('candidato', cand.id)
      entRec.set('vaga', cand.getString('vaga') || cand.getString('vaga_origem'))
      entRec.set('status', 'Agendada')
      entRec.set('formato', janelaRec.getString('formato') || 'Online')
      entRec.set('duracao_minutos', janelaRec.getInt('duracao_minutos') || 60)
      entRec.set('responsavel', janelaRec.getString('responsavel_nome') || 'Time de Recrutamento')
    }

    entRec.set('data_hora', horaEntrevista)
    entRec.set('status', 'Agendada')
    entRec.set(
      'observacoes',
      'Horário confirmado diretamente pelo candidato via Portal Self-Service.',
    )
    $app.save(entRec)

    if (!janelaRec.getString('entrevista_existente')) {
      janelaRec.set('entrevista_existente', entRec.id)
      $app.save(janelaRec)
    }

    // Criar Notificação no sino do RH
    try {
      const notifCol = $app.findCollectionByNameOrId('notificacoes_rh')
      const notif = new Record(notifCol)
      notif.set('titulo', 'Entrevista confirmada pelo candidato')
      notif.set(
        'mensagem',
        cand.getString('nome') +
          ' confirmou o horário da entrevista para ' +
          (slotEscolhido.label || horaEntrevista) +
          '. O agendamento foi adicionado à rotina "Meu Dia".',
      )
      notif.set('tipo', 'candidato_agendamento')
      notif.set('lida', false)
      notif.set('link', '/candidatos/' + cand.id)
      notif.set('autor_nome', cand.getString('nome'))
      notif.set('autor_email', cand.getString('email'))
      notif.set('referencia_tipo', 'entrevista')
      notif.set('referencia_id', entRec.id)
      notif.set('metadata', {
        candidatoId: cand.id,
        vagaId: cand.getString('vaga'),
        dataHora: horaEntrevista,
      })
      $app.save(notif)
    } catch (errNotif) {
      console.log('Aviso ao gerar notificacao de agendamento:', errNotif)
    }

    // Registrar na Linha do Tempo do Candidato
    try {
      const tlCol = $app.findCollectionByNameOrId('eventos_timeline_candidato')
      const ev = new Record(tlCol)
      ev.set('candidato', cand.id)
      ev.set('categoria', 'ENTREVISTA')
      ev.set('titulo', 'Entrevista confirmada pelo candidato (Self-service)')
      ev.set(
        'complemento',
        'Candidato escolheu a janela: ' +
          (slotEscolhido.label || horaEntrevista) +
          ' (' +
          (janelaRec.getString('formato') || 'Online') +
          ').',
      )
      ev.set('autor', cand.getString('nome'))
      ev.set('origem', 'usuario')
      ev.set('data_evento', agoraIso)
      ev.set('referencia_tipo', 'entrevistas')
      ev.set('referencia_id', entRec.id)
      $app.save(ev)
    } catch (errTl) {
      console.log('Aviso ao registrar evento de timeline:', errTl)
    }

    // Disparar e-mail de confirmação ao RH e ao candidato
    try {
      const mailClient = $app.newMailClient()
      const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
      const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'
      const candEmail = cand.getString('email')

      if (candEmail) {
        const msg = new MailerMessage({
          from: { address: senderAddress, name: senderName },
          to: [{ address: candEmail }],
          subject: 'Entrevista Confirmada: Processo Seletivo SouYess',
          html:
            '<div style="font-family: sans-serif; padding: 20px; color: #1e293b;">' +
            '<h2>Entrevista Agendada com Sucesso!</h2>' +
            '<p>Olá <strong>' +
            cand.getString('nome') +
            '</strong>,</p>' +
            '<p>Sua entrevista foi confirmada para: <strong>' +
            (slotEscolhido.label || horaEntrevista) +
            '</strong>.</p>' +
            '<p>Formato: <strong>' +
            (janelaRec.getString('formato') || 'Online') +
            '</strong>.</p>' +
            (janelaRec.getString('link_reuniao')
              ? '<p>Link de acesso: <a href="' +
                janelaRec.getString('link_reuniao') +
                '">' +
                janelaRec.getString('link_reuniao') +
                '</a></p>'
              : '') +
            '<p>Atenciosamente,<br>Equipe de Gente & Gestão</p>' +
            '</div>',
        })
        mailClient.send(msg)
      }
    } catch (errMail) {
      console.log('Aviso ao enviar e-mail de agendamento:', errMail)
    }

    return e.json(200, {
      success: true,
      message: 'Horário confirmado com sucesso!',
      escolha: slotEscolhido,
      entrevistaId: entRec.id,
    })
  } catch (err) {
    console.log('Erro ao escolher horário:', err)
    return e.json(500, { error: err.message || 'Falha ao confirmar horário.' })
  }
})

// 3. POST /backend/v1/public/candidato-portal/{token}/pedir-reagendamento
routerAdd('POST', '/backend/v1/public/candidato-portal/{token}/pedir-reagendamento', (e) => {
  try {
    const token = (e.request.pathValue('token') || '').trim()
    const body = e.requestInfo().body || {}
    const motivo = (body.motivo || '').trim()

    if (!token || !motivo) {
      return e.json(400, { error: 'Token e motivo do reagendamento são obrigatórios.' })
    }

    const cands = $app.findRecordsByFilter(
      'candidatos',
      "token_portal = '" + token + "'",
      '-created',
      1,
      0,
    )
    if (!cands || cands.length === 0) {
      return e.json(404, { error: 'Candidato não encontrado.' })
    }
    const cand = cands[0]

    const jList = $app.findRecordsByFilter(
      'janelas_entrevista_candidato',
      "candidato = '" + cand.id + "'",
      '-updated',
      1,
      0,
    )
    if (!jList || jList.length === 0) {
      return e.json(404, { error: 'Nenhuma solicitação de entrevista vinculada.' })
    }
    const janelaRec = jList[0]

    janelaRec.set('status', 'Reagendamento solicitado')
    janelaRec.set('motivo_reagendamento', motivo)
    $app.save(janelaRec)

    // Criar Notificação no sino do RH
    try {
      const notifCol = $app.findCollectionByNameOrId('notificacoes_rh')
      const notif = new Record(notifCol)
      notif.set('titulo', 'Solicitação de reagendamento de entrevista')
      notif.set(
        'mensagem',
        cand.getString('nome') +
          ' solicitou reagendamento de entrevista. Motivo: "' +
          (motivo.length > 120 ? motivo.substring(0, 117) + '...' : motivo) +
          '". Por favor, proponha novas janelas.',
      )
      notif.set('tipo', 'candidato_reagendamento')
      notif.set('lida', false)
      notif.set('link', '/candidatos/' + cand.id)
      notif.set('autor_nome', cand.getString('nome'))
      notif.set('autor_email', cand.getString('email'))
      notif.set('referencia_tipo', 'candidato')
      notif.set('referencia_id', cand.id)
      notif.set('metadata', {
        candidatoId: cand.id,
        motivo: motivo,
      })
      $app.save(notif)
    } catch (errNotif) {
      console.log('Aviso ao gerar notificacao de reagendamento:', errNotif)
    }

    // Registrar na Linha do Tempo
    try {
      const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
      const tlCol = $app.findCollectionByNameOrId('eventos_timeline_candidato')
      const ev = new Record(tlCol)
      ev.set('candidato', cand.id)
      ev.set('categoria', 'ENTREVISTA')
      ev.set('titulo', 'Candidato solicitou reagendamento de horário')
      ev.set('complemento', 'Motivo informado: ' + motivo)
      ev.set('autor', cand.getString('nome'))
      ev.set('origem', 'usuario')
      ev.set('data_evento', agoraIso)
      ev.set('referencia_tipo', 'candidato')
      ev.set('referencia_id', cand.id)
      $app.save(ev)
    } catch (errTl) {
      console.log('Aviso ao registrar evento de timeline:', errTl)
    }

    return e.json(200, {
      success: true,
      message:
        'Solicitação de reagendamento enviada com sucesso! O RH apresentará novas opções em breve.',
    })
  } catch (err) {
    console.log('Erro ao solicitar reagendamento:', err)
    return e.json(500, { error: err.message || 'Falha ao solicitar reagendamento.' })
  }
})

// 4. POST /backend/v1/public/candidato-portal/{token}/feedback-nps
routerAdd('POST', '/backend/v1/public/candidato-portal/{token}/feedback-nps', (e) => {
  try {
    const token = (e.request.pathValue('token') || '').trim()
    const body = e.requestInfo().body || {}

    if (!token) {
      return e.json(400, { error: 'Token obrigatório.' })
    }

    const cands = $app.findRecordsByFilter(
      'candidatos',
      "token_portal = '" + token + "'",
      '-created',
      1,
      0,
    )
    if (!cands || cands.length === 0) {
      return e.json(404, { error: 'Candidato não encontrado.' })
    }
    const cand = cands[0]

    const notaGeral = Math.min(10, Math.max(0, parseInt(body.nota_geral, 10) || 0))
    const npsScore = Math.min(10, Math.max(0, parseInt(body.nps_score, 10) || notaGeral))
    const clarezaProcesso = Math.min(10, Math.max(0, parseInt(body.clareza_processo, 10) || 10))
    const tempoResposta = Math.min(10, Math.max(0, parseInt(body.tempo_resposta, 10) || 10))
    const tratamentoRh = Math.min(10, Math.max(0, parseInt(body.tratamento_rh, 10) || 10))
    const clarezaVaga = Math.min(10, Math.max(0, parseInt(body.clareza_vaga, 10) || 10))
    const recomendaria = (body.recomendaria_empresa || 'Sim, com certeza').trim()
    const comentario = (body.comentario || '').trim()

    const isAlerta = notaGeral <= 6 || npsScore <= 6
    const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'

    // Localizar ou criar avaliação de experiência
    let aval = null
    const aList = $app.findRecordsByFilter(
      'avaliacoes_experiencia',
      "candidato = '" + cand.id + "'",
      '-created',
      1,
      0,
    )
    if (aList && aList.length > 0) {
      aval = aList[0]
    } else {
      const aCol = $app.findCollectionByNameOrId('avaliacoes_experiencia')
      aval = new Record(aCol)
      aval.set('candidato', cand.id)
      aval.set('vaga', cand.getString('vaga') || cand.getString('vaga_origem'))
      aval.set('token_pesquisa', 'exp-' + $security.randomString(20).toLowerCase())
      aval.set(
        'status_processo',
        cand.getString('status') === 'Aprovado' ? 'Contratado' : 'Recusado',
      )
    }

    aval.set('respondido', true)
    aval.set('data_resposta', agoraIso)
    aval.set('nota_geral', notaGeral)
    aval.set('nps_score', npsScore)
    aval.set('clareza_processo', clarezaProcesso)
    aval.set('tempo_resposta', tempoResposta)
    aval.set('tratamento_rh', tratamentoRh)
    aval.set('clareza_vaga', clarezaVaga)
    aval.set('recomendaria_empresa', recomendaria)
    aval.set('comentario', comentario)
    aval.set('alerta_oportunidade', isAlerta)
    $app.save(aval)

    // Criar Notificação no sino do RH
    try {
      const notifCol = $app.findCollectionByNameOrId('notificacoes_rh')
      const notif = new Record(notifCol)
      notif.set('titulo', 'Novo feedback de candidato (NPS ' + npsScore + '/10)')
      notif.set(
        'mensagem',
        cand.getString('nome') +
          ' enviou avaliação de experiência: Nota Geral ' +
          notaGeral +
          '/10, NPS ' +
          npsScore +
          '.' +
          (comentario ? ' Comentário: "' + comentario.substring(0, 100) + '"' : ''),
      )
      notif.set('tipo', 'candidato_feedback')
      notif.set('lida', false)
      notif.set('link', '/experiencia')
      notif.set('autor_nome', cand.getString('nome'))
      notif.set('autor_email', cand.getString('email'))
      notif.set('referencia_tipo', 'avaliacao_experiencia')
      notif.set('referencia_id', aval.id)
      notif.set('metadata', {
        candidatoId: cand.id,
        npsScore: npsScore,
        notaGeral: notaGeral,
        isAlerta: isAlerta,
      })
      $app.save(notif)
    } catch (errNotif) {
      console.log('Aviso ao notificar feedback:', errNotif)
    }

    return e.json(200, {
      success: true,
      message: 'Feedback registrado com sucesso! Agradecemos sua colaboração.',
      avaliacaoId: aval.id,
    })
  } catch (err) {
    console.log('Erro ao submeter feedback NPS:', err)
    return e.json(500, { error: err.message || 'Falha ao salvar feedback.' })
  }
})

// 5. POST /backend/v1/candidato/{id}/propor-janelas (Autenticado RH)
routerAdd(
  'POST',
  '/backend/v1/candidato/{id}/propor-janelas',
  (e) => {
    try {
      const id = (e.request.pathValue('id') || '').trim()
      const body = e.requestInfo().body || {}
      const janelasPropostas = body.janelas || []
      const formato = body.formato || 'Online'
      const duracaoMinutos = parseInt(body.duracaoMinutos, 10) || 60
      const responsavelNome = body.responsavelNome || 'Gente & Gestão'
      const linkReuniao = body.linkReuniao || ''
      const observacoes = body.observacoes || ''

      if (!id || !Array.isArray(janelasPropostas) || janelasPropostas.length === 0) {
        return e.json(400, {
          error: 'É necessário informar ao menos 1 janela de horário disponível.',
        })
      }

      const cand = $app.findRecordById('candidatos', id)
      if (!cand) {
        return e.json(404, { error: 'Candidato não encontrado.' })
      }

      // Garantir token_portal
      let token = cand.getString('token_portal')
      if (!token) {
        const emailPrefix = cand
          .getString('email')
          .split('@')[0]
          .replace(/[^a-zA-Z0-9]/g, '-')
        token = 'cand-' + emailPrefix + '-' + $security.randomString(8).toLowerCase()
        cand.set('token_portal', token)
        $app.save(cand)
      }

      // Buscar ou criar registro de janelas
      let janelaRec = null
      const jList = $app.findRecordsByFilter(
        'janelas_entrevista_candidato',
        "candidato = '" + cand.id + "'",
        '-updated',
        1,
        0,
      )
      if (jList && jList.length > 0) {
        janelaRec = jList[0]
      } else {
        const jCol = $app.findCollectionByNameOrId('janelas_entrevista_candidato')
        janelaRec = new Record(jCol)
        janelaRec.set('candidato', cand.id)
        janelaRec.set('vaga', cand.getString('vaga') || cand.getString('vaga_origem'))
      }

      janelaRec.set('status', 'Aguardando escolha')
      janelaRec.set('janelas_propostas', janelasPropostas)
      janelaRec.set('janela_escolhida', null)
      janelaRec.set('motivo_reagendamento', '')
      janelaRec.set('formato', formato)
      janelaRec.set('duracao_minutos', duracaoMinutos)
      janelaRec.set('responsavel_nome', responsavelNome)
      janelaRec.set('link_reuniao', linkReuniao)
      janelaRec.set('observacoes_rh', observacoes)
      $app.save(janelaRec)

      // Registrar na timeline do candidato
      try {
        const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
        const tlCol = $app.findCollectionByNameOrId('eventos_timeline_candidato')
        const ev = new Record(tlCol)
        ev.set('candidato', cand.id)
        ev.set('categoria', 'ENTREVISTA')
        ev.set('titulo', 'Horários de entrevista propostos pelo RH')
        ev.set(
          'complemento',
          janelasPropostas.length +
            ' janelas de horário foram disponibilizadas no Portal do Candidato (' +
            formato +
            ').',
        )
        ev.set('autor', responsavelNome)
        ev.set('origem', 'usuario')
        ev.set('data_evento', agoraIso)
        ev.set('referencia_tipo', 'janelas_entrevista')
        ev.set('referencia_id', janelaRec.id)
        $app.save(ev)
      } catch (errTl) {
        console.log('Aviso ao registrar evento de timeline:', errTl)
      }

      return e.json(200, {
        success: true,
        message: 'Horários propostos com sucesso! O candidato já pode escolher via portal.',
        token: token,
        linkPortal: '/candidato/' + token,
        janelaId: janelaRec.id,
      })
    } catch (err) {
      console.log('Erro ao propor janelas:', err)
      return e.json(500, { error: err.message || 'Falha ao cadastrar janelas.' })
    }
  },
  $apis.requireAuth(),
)

// 6. POST /backend/v1/candidato/{id}/gerar-token-portal (Autenticado RH)
routerAdd(
  'POST',
  '/backend/v1/candidato/{id}/gerar-token-portal',
  (e) => {
    try {
      const id = (e.request.pathValue('id') || '').trim()
      const cand = $app.findRecordById('candidatos', id)
      if (!cand) {
        return e.json(404, { error: 'Candidato não encontrado.' })
      }

      let token = cand.getString('token_portal')
      if (!token) {
        const emailPrefix = cand
          .getString('email')
          .split('@')[0]
          .replace(/[^a-zA-Z0-9]/g, '-')
        token = 'cand-' + emailPrefix + '-' + $security.randomString(8).toLowerCase()
        cand.set('token_portal', token)
        $app.save(cand)
      }

      return e.json(200, {
        success: true,
        token: token,
        linkPortal: '/candidato/' + token,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao obter token do candidato.' })
    }
  },
  $apis.requireAuth(),
)
