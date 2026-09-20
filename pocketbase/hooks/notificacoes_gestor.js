// ============================================================================
// Hook: Notificações para o RH em ações do Gestor Contratante
// Disparos automáticos:
// 1. onRecordAfterUpdateSuccess('vagas'): quando o gestor aprova ou solicita ajustes na vaga
// 2. onRecordAfterCreateSuccess('feedbacks_gestor'): quando o gestor emite parecer sobre candidato
// 3. onRecordAfterUpdateSuccess('feedbacks_gestor'): quando o gestor atualiza parecer
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Notificação quando o gestor avalia/aprova a vaga
// ----------------------------------------------------------------------------
onRecordAfterUpdateSuccess((e) => {
  try {
    const vaga = e.record
    const statusAprovacao = vaga.getString('status_aprovacao_gestor')

    // Só dispara se houver status de aprovação definido diferente do rascunho/aguardando
    if (statusAprovacao !== 'Aprovada pelo gestor' && statusAprovacao !== 'Ajustes solicitados') {
      return e.next()
    }

    const vagaId = vaga.id
    const vagaTitulo = vaga.getString('titulo')
    const parecerTexto = vaga.getString('parecer_gestor_vaga') || 'Sem observações adicionais.'
    const gestorId = vaga.getString('gestor_responsavel')

    let gestorNome = 'Gestor Responsável'
    if (gestorId) {
      try {
        const gestorRec = $app.findRecordById('users', gestorId)
        if (gestorRec) {
          gestorNome = gestorRec.getString('name') || gestorRec.getString('email')
        }
      } catch (_) {}
    }

    // Achar um candidato vinculado à vaga para satisfazer a relation NOT NULL de alertas
    let candidatoId = ''
    try {
      const candList = $app.findRecordsByFilter(
        'candidatos',
        "vaga = '" + vagaId + "'",
        '-created',
        1,
        0,
      )
      if (candList && candList.length > 0) {
        candidatoId = candList[0].id
      } else {
        const anyCand = $app.findRecordsByFilter('candidatos', '', '-created', 1, 0)
        if (anyCand && anyCand.length > 0) candidatoId = anyCand[0].id
      }
    } catch (_) {}

    if (!candidatoId) {
      console.log('Nenhum candidato encontrado no sistema para associar ao alerta da vaga.')
      return e.next()
    }

    const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
    const alertasCol = $app.findCollectionByNameOrId('alertas')

    const decisaoBadge =
      statusAprovacao === 'Aprovada pelo gestor'
        ? 'Aprovou a Descrição'
        : 'Solicitou Ajustes na Descrição'

    const resumo =
      'O gestor ' +
      gestorNome +
      ' ' +
      decisaoBadge.toLowerCase() +
      ' da vaga "' +
      vagaTitulo +
      '". Parecer: "' +
      parecerTexto +
      '"'

    const novoAlerta = new Record(alertasCol)
    novoAlerta.set('vaga', vagaId)
    novoAlerta.set('candidato', candidatoId)
    novoAlerta.set('score', statusAprovacao === 'Aprovada pelo gestor' ? 100 : 60)
    novoAlerta.set('tipo', 'aprovacao_vaga_gestor')
    novoAlerta.set('status', 'Novo')
    novoAlerta.set('resumo_ia', resumo)
    novoAlerta.set('criado_em', agoraIso)
    $app.save(novoAlerta)

    // Encontrar e-mails do RH para disparo do e-mail
    const destinatariosRH = []
    try {
      const rhUsers = $app.findRecordsByFilter(
        'users',
        "cargo_funcao = 'RH / Recrutador' || cargo_funcao = '' || cargo_funcao = null",
        '-created',
        10,
        0,
      )
      for (let r = 0; r < rhUsers.length; r++) {
        const em = rhUsers[r].getString('email')
        if (em && !destinatariosRH.includes(em)) destinatariosRH.push(em)
      }
    } catch (_) {}
    if (destinatariosRH.length === 0) {
      destinatariosRH.push('severo.douglas2@gmail.com')
    }

    // Enviar e-mail para o RH
    try {
      const mailClient = $app.newMailClient()
      const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
      const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'

      const htmlEmail =
        '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
        '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
        '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
        '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Parecer do Gestor sobre Vaga</p>' +
        '</div>' +
        '<p style="color: #334155; font-size: 15px; line-height: 1.6;">O gestor contratante <strong>' +
        gestorNome +
        '</strong> registrou um parecer sobre a vaga <strong>' +
        vagaTitulo +
        '</strong>.</p>' +
        '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0;">' +
        '<p style="margin: 0 0 10px 0; font-size: 14px; color: #475569;"><strong>Decisão:</strong> <span style="background-color: ' +
        (statusAprovacao === 'Aprovada pelo gestor'
          ? '#dcfce7; color: #166534'
          : '#fee2e2; color: #991b1b') +
        '; font-weight: bold; padding: 3px 8px; border-radius: 4px;">' +
        statusAprovacao +
        '</span></p>' +
        '<p style="margin: 8px 0; font-size: 14px; color: #475569;"><strong>Parecer / Orientações:</strong></p>' +
        '<p style="margin: 4px 0; color: #1e293b; font-size: 14px; font-style: italic; background-color: #f1f5f9; padding: 12px; border-radius: 6px;">' +
        parecerTexto +
        '</p>' +
        '</div>' +
        '<p style="color: #64748b; font-size: 13px; line-height: 1.5;">Acesse a plataforma para verificar a vaga e prosseguir com o alinhamento e divulgação.</p>' +
        '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Sistema RH Inteligente — Gente & Gestão</strong></p>' +
        '</div>'

      const msg = new MailerMessage({
        from: { address: senderAddress, name: senderName },
        to: destinatariosRH.map((d) => ({ address: d })),
        subject: '[Gestor Contratante] ' + statusAprovacao + ': ' + vagaTitulo,
        html: htmlEmail,
      })
      mailClient.send(msg)
    } catch (mailErr) {
      console.log('Falha ao enviar e-mail de aprovação de vaga:', mailErr)
    }
  } catch (err) {
    console.log('Erro no gatilho onRecordAfterUpdateSuccess de vagas (parecer gestor):', err)
  }

  return e.next()
}, 'vagas')

// ----------------------------------------------------------------------------
// 2. Notificação quando o gestor cria parecer em candidato (feedbacks_gestor)
// ----------------------------------------------------------------------------
onRecordAfterCreateSuccess((e) => {
  try {
    const feedback = e.record
    const candidatoId = feedback.getString('candidato')
    const vagaId = feedback.getString('vaga')
    const recomendacao = feedback.getString('recomendacao') || 'Avançar'
    const comentario = feedback.getString('comentario') || ''
    const pontosPos = feedback.getString('pontos_positivos') || ''
    const pontosAtenc = feedback.getString('pontos_atencao') || ''
    const gestorId = feedback.getString('gestor')

    let candidatoNome = 'Candidato'
    if (candidatoId) {
      try {
        const cRec = $app.findRecordById('candidatos', candidatoId)
        if (cRec) candidatoNome = cRec.getString('nome')
      } catch (_) {}
    }

    let vagaTitulo = 'Posição em aberto'
    if (vagaId) {
      try {
        const vRec = $app.findRecordById('vagas', vagaId)
        if (vRec) vagaTitulo = vRec.getString('titulo')
      } catch (_) {}
    }

    let gestorNome = 'Gestor Contratante'
    if (gestorId) {
      try {
        const gRec = $app.findRecordById('users', gestorId)
        if (gRec) gestorNome = gRec.getString('name') || gRec.getString('email')
      } catch (_) {}
    }

    const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
    const alertasCol = $app.findCollectionByNameOrId('alertas')

    let detalheTexto = comentario
    if (pontosPos && !detalheTexto) detalheTexto = 'Pontos fortes: ' + pontosPos
    if (!detalheTexto) detalheTexto = 'Recomendação formal registrada.'

    const resumo =
      'Parecer do Gestor (' +
      gestorNome +
      '): Recomendação "' +
      recomendacao +
      '" para ' +
      candidatoNome +
      ' na vaga "' +
      vagaTitulo +
      '". "' +
      detalheTexto +
      '"'

    let scoreAlerta = 80
    if (recomendacao === 'Avançar') scoreAlerta = 90
    else if (recomendacao === 'Recusar') scoreAlerta = 40

    const novoAlerta = new Record(alertasCol)
    novoAlerta.set('vaga', vagaId)
    novoAlerta.set('candidato', candidatoId)
    novoAlerta.set('score', scoreAlerta)
    novoAlerta.set('tipo', 'parecer_gestor_candidato')
    novoAlerta.set('status', 'Novo')
    novoAlerta.set('resumo_ia', resumo)
    novoAlerta.set('criado_em', agoraIso)
    $app.save(novoAlerta)

    // Enviar e-mail de notificação para o RH
    try {
      const destinatariosRH = []
      try {
        const rhUsers = $app.findRecordsByFilter(
          'users',
          "cargo_funcao = 'RH / Recrutador' || cargo_funcao = '' || cargo_funcao = null",
          '-created',
          10,
          0,
        )
        for (let r = 0; r < rhUsers.length; r++) {
          const em = rhUsers[r].getString('email')
          if (em && !destinatariosRH.includes(em)) destinatariosRH.push(em)
        }
      } catch (_) {}
      if (destinatariosRH.length === 0) {
        destinatariosRH.push('severo.douglas2@gmail.com')
      }

      const mailClient = $app.newMailClient()
      const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
      const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'

      const htmlEmail =
        '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
        '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
        '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
        '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Novo Parecer Formal do Gestor Contratante</p>' +
        '</div>' +
        '<p style="color: #334155; font-size: 15px; line-height: 1.6;">O gestor <strong>' +
        gestorNome +
        '</strong> registrou uma avaliação sobre o candidato <strong>' +
        candidatoNome +
        '</strong> para a vaga <strong>' +
        vagaTitulo +
        '</strong>.</p>' +
        '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0;">' +
        '<p style="margin: 0 0 10px 0; font-size: 14px; color: #475569;"><strong>Recomendação:</strong> <span style="background-color: ' +
        (recomendacao === 'Avançar'
          ? '#dcfce7; color: #166534'
          : recomendacao === 'Em dúvida'
            ? '#fef3c7; color: #92400e'
            : '#fee2e2; color: #991b1b') +
        '; font-weight: bold; padding: 3px 8px; border-radius: 4px;">' +
        recomendacao +
        '</span></p>' +
        '<p style="margin: 8px 0; font-size: 14px; color: #475569;"><strong>Justificativa do Gestor:</strong></p>' +
        '<p style="margin: 4px 0; color: #1e293b; font-size: 14px; font-style: italic; background-color: #f1f5f9; padding: 12px; border-radius: 6px;">' +
        (comentario || 'Nenhum comentário adicional registrado.') +
        '</p>' +
        (pontosPos
          ? '<p style="margin: 8px 0 4px 0; color: #166534; font-size: 13px;"><strong>Pontos Fortes:</strong> ' +
            pontosPos +
            '</p>'
          : '') +
        (pontosAtenc
          ? '<p style="margin: 4px 0; color: #991b1b; font-size: 13px;"><strong>Pontos de Atenção:</strong> ' +
            pontosAtenc +
            '</p>'
          : '') +
        '</div>' +
        '<p style="color: #64748b; font-size: 13px; line-height: 1.5;">Acesse o sistema para verificar o perfil completo e encaminhar os próximos passos do pipeline.</p>' +
        '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Sistema RH Inteligente — Gente & Gestão</strong></p>' +
        '</div>'

      const msg = new MailerMessage({
        from: { address: senderAddress, name: senderName },
        to: destinatariosRH.map((d) => ({ address: d })),
        subject:
          '[Parecer do Gestor] ' + recomendacao + ': ' + candidatoNome + ' (' + vagaTitulo + ')',
        html: htmlEmail,
      })
      mailClient.send(msg)
    } catch (mailErr) {
      console.log('Falha ao enviar e-mail de parecer do gestor:', mailErr)
    }
  } catch (err) {
    console.log('Erro ao processar parecer do gestor para alerta:', err)
  }

  return e.next()
}, 'feedbacks_gestor')

// ----------------------------------------------------------------------------
// 3. Notificação quando o gestor atualiza parecer em candidato (feedbacks_gestor)
// ----------------------------------------------------------------------------
onRecordAfterUpdateSuccess((e) => {
  try {
    const feedback = e.record
    const candidatoId = feedback.getString('candidato')
    const vagaId = feedback.getString('vaga')
    const recomendacao = feedback.getString('recomendacao') || 'Avançar'
    const comentario = feedback.getString('comentario') || ''
    const gestorId = feedback.getString('gestor')

    let candidatoNome = 'Candidato'
    if (candidatoId) {
      try {
        const cRec = $app.findRecordById('candidatos', candidatoId)
        if (cRec) candidatoNome = cRec.getString('nome')
      } catch (_) {}
    }

    let vagaTitulo = 'Posição em aberto'
    if (vagaId) {
      try {
        const vRec = $app.findRecordById('vagas', vagaId)
        if (vRec) vagaTitulo = vRec.getString('titulo')
      } catch (_) {}
    }

    let gestorNome = 'Gestor Contratante'
    if (gestorId) {
      try {
        const gRec = $app.findRecordById('users', gestorId)
        if (gRec) gestorNome = gRec.getString('name') || gRec.getString('email')
      } catch (_) {}
    }

    const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
    const alertasCol = $app.findCollectionByNameOrId('alertas')

    const resumo =
      'Parecer Atualizado (' +
      gestorNome +
      '): Decisão "' +
      recomendacao +
      '" para ' +
      candidatoNome +
      ' na vaga "' +
      vagaTitulo +
      '". "' +
      (comentario || 'Parecer reavaliado pelo gestor.') +
      '"'

    let scoreAlerta = 80
    if (recomendacao === 'Avançar') scoreAlerta = 90
    else if (recomendacao === 'Recusar') scoreAlerta = 40

    const novoAlerta = new Record(alertasCol)
    novoAlerta.set('vaga', vagaId)
    novoAlerta.set('candidato', candidatoId)
    novoAlerta.set('score', scoreAlerta)
    novoAlerta.set('tipo', 'parecer_gestor_candidato')
    novoAlerta.set('status', 'Novo')
    novoAlerta.set('resumo_ia', resumo)
    novoAlerta.set('criado_em', agoraIso)
    $app.save(novoAlerta)
  } catch (err) {
    console.log('Erro ao processar atualização de parecer do gestor:', err)
  }

  return e.next()
}, 'feedbacks_gestor')
