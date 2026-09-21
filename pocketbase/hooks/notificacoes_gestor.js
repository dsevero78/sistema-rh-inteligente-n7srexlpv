// ============================================================================
// Hook: Notificações por E-mail Institucionais SouYess (People Hub)
// Identidade visual:
// - Laranja SouYess: #E9530E
// - Azul Profundo: #212B55 (Header/Surfaces)
// - Fundo neutro: #F8FAFC
//
// Regra JSVM PocketBase: todas as funções utilitárias devem ser declaradas
// inline dentro do escopo do callback para evitar erros de isolamento de VM pool.
// ============================================================================

// ----------------------------------------------------------------------------
// 1. Hook para quando uma notificação RH é inserida no banco (notificacoes_rh)
// Envia e-mail institucional para o RH quando for parecer/decisão urgente.
// ----------------------------------------------------------------------------
onRecordAfterCreateSuccess((e) => {
  try {
    const notif = e.record
    const tipo = notif.getString('tipo')
    const titulo = notif.getString('titulo')
    const mensagem = notif.getString('mensagem')
    const autorNome = notif.getString('autor_nome') || 'Gestão SouYess'
    const linkRelativo = notif.getString('link') || '/gestor-portal'

    const baseUrl =
      $os.getenv('APP_URL') || $os.getenv('PUBLIC_APP_URL') || 'https://peoplehub.souyess.com.br'

    const fullLink = baseUrl + (linkRelativo.startsWith('/') ? linkRelativo : '/' + linkRelativo)

    // Apenas disparar email para notificações urgentes de decisão (gestor / jurídico / aditivo)
    const tiposUrgentes = [
      'vaga_aprovada',
      'vaga_ajustes',
      'candidato_parecer',
      'candidato_avancar',
      'candidato_reprovado',
      'aditivo_juridico',
    ]

    if (!tiposUrgentes.includes(tipo)) {
      return e.next()
    }

    // Buscar e-mails cadastrados do RH
    const destinatarios = []
    try {
      const rhUsers = $app.findRecordsByFilter(
        'users',
        "cargo_funcao = 'RH / Recrutador' || cargo_funcao = '' || cargo_funcao = null",
        '-created',
        10,
        0,
      )
      for (let i = 0; i < rhUsers.length; i++) {
        const em = rhUsers[i].getString('email')
        if (em && em.includes('@') && !destinatarios.includes(em)) {
          destinatarios.push(em)
        }
      }
    } catch (errRh) {
      console.log('Aviso ao buscar usuários RH:', errRh)
    }

    if (destinatarios.length === 0) {
      destinatarios.push('rh@souyess.com.br')
    }

    let badgeDecisao = 'Decisão Registrada'
    let badgeCor = '#212B55'
    let badgeBg = '#EEF2FF'

    if (tipo === 'vaga_aprovada' || tipo === 'candidato_avancar') {
      badgeDecisao = 'Aprovado / Avançar'
      badgeCor = '#166534'
      badgeBg = '#DCFCE7'
    } else if (tipo === 'vaga_ajustes') {
      badgeDecisao = 'Ajustes Solicitados'
      badgeCor = '#991B1B'
      badgeBg = '#FEE2E2'
    } else if (tipo === 'candidato_reprovado') {
      badgeDecisao = 'Reprovado / Recusar'
      badgeCor = '#991B1B'
      badgeBg = '#FEE2E2'
    } else if (tipo === 'aditivo_juridico') {
      badgeDecisao = 'Trâmite Jurídico PJ'
      badgeCor = '#5B21B6'
      badgeBg = '#F3E8FF'
    }

    const agoraStr = new Date().toLocaleString('pt-BR')

    const htmlEmail =
      '<!DOCTYPE html>' +
      '<html lang="pt-BR">' +
      '<head><meta charset="UTF-8"><title>Notificação SouYess</title></head>' +
      '<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; color: #1E293B;">' +
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 24px 12px;">' +
      '<tr><td align="center">' +
      '<table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 14px; overflow: hidden; border: 1px solid #E2E8F0; box-shadow: 0 4px 12px rgba(33, 43, 85, 0.06);">' +
      // Topo institucional SouYess
      '<tr>' +
      '<td style="background-color: #212B55; padding: 26px 30px; text-align: left; border-bottom: 4px solid #E9530E;">' +
      '<table role="presentation" width="100%" cellspacing="0" cellpadding="0">' +
      '<tr>' +
      '<td>' +
      '<div style="font-size: 22px; font-weight: 800; color: #FFFFFF; letter-spacing: -0.5px;">' +
      'Sou<span style="color: #E9530E;">Yess</span> <span style="font-weight: 400; font-size: 15px; color: #CBD5E1;">People Hub</span>' +
      '</div>' +
      '<p style="margin: 4px 0 0 0; font-size: 13px; color: #94A3B8;">Gente & Gestão — Decisão Registrada</p>' +
      '</td>' +
      '<td align="right">' +
      '<span style="display: inline-block; background-color: rgba(233, 83, 14, 0.2); color: #FF9B71; border: 1px solid rgba(233, 83, 14, 0.4); font-size: 11px; font-weight: 700; text-transform: uppercase; padding: 4px 10px; border-radius: 999px;">' +
      'Urgente RH' +
      '</span>' +
      '</td>' +
      '</tr>' +
      '</table>' +
      '</td>' +
      '</tr>' +
      // Conteúdo
      '<tr>' +
      '<td style="padding: 32px 30px 24px 30px;">' +
      '<div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #E9530E; margin-bottom: 6px;">' +
      'Parecer & Decisão do Gestor / Jurídico' +
      '</div>' +
      '<h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 700; color: #212B55; line-height: 1.35;">' +
      titulo +
      '</h2>' +
      '<div style="margin-bottom: 20px;">' +
      '<span style="display: inline-block; background-color: ' +
      badgeBg +
      '; color: ' +
      badgeCor +
      '; font-weight: 700; font-size: 13px; padding: 5px 12px; border-radius: 6px;">' +
      badgeDecisao +
      '</span>' +
      '</div>' +
      '<div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 18px; margin-bottom: 24px;">' +
      '<p style="margin: 0 0 8px 0; font-size: 13px; color: #64748B; font-weight: 600;">Resumo da Decisão:</p>' +
      '<div style="font-size: 14px; color: #1E293B; line-height: 1.6; background-color: #FFFFFF; padding: 14px; border-radius: 8px; border: 1px solid #E2E8F0;">' +
      mensagem +
      '</div>' +
      '<p style="margin: 12px 0 0 0; font-size: 12px; color: #64748B;">' +
      '<strong>Autor da Ação:</strong> ' +
      autorNome +
      '</p>' +
      '</div>' +
      // Botão CTA
      '<div style="text-align: center; margin: 26px 0 16px 0;">' +
      '<a href="' +
      fullLink +
      '" style="display: inline-block; background-color: #E9530E; color: #FFFFFF; font-weight: 700; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 6px rgba(233, 83, 14, 0.3);">' +
      'Visualizar no Sistema RH' +
      '</a>' +
      '</div>' +
      '</td>' +
      '</tr>' +
      // Rodapé
      '<tr>' +
      '<td style="background-color: #F8FAFC; padding: 18px 30px; border-top: 1px solid #E2E8F0; text-align: center;">' +
      '<p style="margin: 0 0 4px 0; font-size: 12px; color: #64748B;">' +
      'Mensagem gerada pelo <strong>SouYess People Hub</strong> para a equipe de Gente & Gestão.' +
      '</p>' +
      '<p style="margin: 0; font-size: 11px; color: #94A3B8;">' +
      agoraStr +
      '</p>' +
      '</td>' +
      '</tr>' +
      '</table>' +
      '</td>' +
      '</tr>' +
      '</table>' +
      '</body></html>'

    const senderAddress = $app.settings().meta.senderAddress || 'notificacoes@souyess.com.br'
    const senderName = 'SouYess People Hub'
    const mailClient = $app.newMailClient()
    const msg = new MailerMessage({
      from: { address: senderAddress, name: senderName },
      to: destinatarios.map((d) => ({ address: d })),
      subject: '[SouYess People Hub] ' + titulo,
      html: htmlEmail,
    })

    mailClient.send(msg)
    console.log('E-mail institucional enviado para:', destinatarios.join(', '))
  } catch (err) {
    console.log('Aviso ao enviar e-mail via hook de notificacoes_rh:', err)
  }

  return e.next()
}, 'notificacoes_rh')

// ----------------------------------------------------------------------------
// 2. Notificação quando o gestor avalia/aprova a vaga (vagas)
// ----------------------------------------------------------------------------
onRecordAfterUpdateSuccess((e) => {
  try {
    const vaga = e.record
    const statusAprovacao = vaga.getString('status_aprovacao_gestor')

    if (statusAprovacao !== 'Aprovada pelo gestor' && statusAprovacao !== 'Ajustes solicitados') {
      return e.next()
    }

    const vagaId = vaga.id
    const vagaTitulo = vaga.getString('titulo')
    const parecerTexto = vaga.getString('parecer_gestor_vaga') || 'Sem parecer descritivo.'
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

    // Criar notificação formal na coleção notificacoes_rh (que dispara o email acima)
    try {
      const notifCol = $app.findCollectionByNameOrId('notificacoes_rh')
      const novaNotif = new Record(notifCol)
      novaNotif.set(
        'titulo',
        statusAprovacao === 'Aprovada pelo gestor'
          ? 'Vaga Aprovada pelo Gestor: ' + vagaTitulo
          : 'Ajustes Solicitados na Vaga: ' + vagaTitulo,
      )
      novaNotif.set(
        'mensagem',
        'O gestor ' +
          gestorNome +
          ' concluiu a avaliação da vaga "' +
          vagaTitulo +
          '". Parecer: "' +
          parecerTexto +
          '"',
      )
      novaNotif.set(
        'tipo',
        statusAprovacao === 'Aprovada pelo gestor' ? 'vaga_aprovada' : 'vaga_ajustes',
      )
      novaNotif.set('link', '/vagas/' + vagaId)
      novaNotif.set('autor_nome', gestorNome)
      novaNotif.set('lida', false)
      novaNotif.set('referencia_tipo', 'vaga')
      novaNotif.set('referencia_id', vagaId)
      $app.save(novaNotif)
    } catch (nErr) {
      console.log('Aviso ao criar registro em notificacoes_rh para vaga:', nErr)
    }
  } catch (err) {
    console.log('Erro no gatilho de aprovação de vaga:', err)
  }

  return e.next()
}, 'vagas')

// ----------------------------------------------------------------------------
// 3. Notificação quando o gestor cria parecer em candidato (feedbacks_gestor)
// ----------------------------------------------------------------------------
onRecordAfterCreateSuccess((e) => {
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

    let tipoNotif = 'candidato_parecer'
    if (recomendacao === 'Avançar') tipoNotif = 'candidato_avancar'
    else if (recomendacao === 'Recusar') tipoNotif = 'candidato_reprovado'

    try {
      const notifCol = $app.findCollectionByNameOrId('notificacoes_rh')
      const novaNotif = new Record(notifCol)
      novaNotif.set('titulo', 'Parecer do Gestor: ' + candidatoNome + ' (' + recomendacao + ')')
      novaNotif.set(
        'mensagem',
        'O gestor ' +
          gestorNome +
          ' emitiu parecer sobre ' +
          candidatoNome +
          ' para a vaga "' +
          vagaTitulo +
          '". Recomendação: ' +
          recomendacao +
          '. Justificativa: "' +
          (comentario || 'Sem observações adicionais.') +
          '"',
      )
      novaNotif.set('tipo', tipoNotif)
      novaNotif.set('link', '/candidatos/' + candidatoId)
      novaNotif.set('autor_nome', gestorNome)
      novaNotif.set('lida', false)
      novaNotif.set('referencia_tipo', 'candidato')
      novaNotif.set('referencia_id', candidatoId)
      $app.save(novaNotif)
    } catch (nErr) {
      console.log('Aviso ao criar registro em notificacoes_rh para feedback do gestor:', nErr)
    }
  } catch (err) {
    console.log('Erro ao processar feedback de gestor para notificação RH:', err)
  }

  return e.next()
}, 'feedbacks_gestor')
