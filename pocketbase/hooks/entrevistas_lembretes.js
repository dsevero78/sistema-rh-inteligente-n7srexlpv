cronAdd('enviar_lembretes_entrevistas', '*/15 * * * *', () => {
  try {
    const agora = new Date()
    // Buscar entrevistas agendadas cujo horário esteja dentro das próximas 24h a 25h (ou até atrasadas sem lembrete nas próximas 24h)
    // Janela: agora até agora + 26 horas
    const limiteSuperior = new Date(agora.getTime() + 26 * 60 * 60 * 1000)

    const agoraIso = agora.toISOString().replace('T', ' ').substring(0, 19) + 'Z'
    const limiteIso = limiteSuperior.toISOString().replace('T', ' ').substring(0, 19) + 'Z'

    const filter =
      "status = 'Agendada' && lembrete_enviado != true && data_hora >= '" +
      agoraIso +
      "' && data_hora <= '" +
      limiteIso +
      "'"

    const entrevistas = $app.findRecordsByFilter('entrevistas', filter, 'data_hora', 50, 0)

    if (!entrevistas || entrevistas.length === 0) {
      return
    }

    const mailClient = $app.newMailClient()
    const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
    const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'

    for (let i = 0; i < entrevistas.length; i++) {
      const ent = entrevistas[i]
      try {
        const candId = ent.getString('candidato')
        const vagaId = ent.getString('vaga')

        const cand = $app.findRecordById('candidatos', candId)
        const vaga = $app.findRecordById('vagas', vagaId)

        if (!cand || !vaga) continue

        const candEmail = cand.getString('email')
        const candNome = cand.getString('nome')
        const vagaTitulo = vaga.getString('titulo')
        const formato = ent.getString('formato')
        const responsavel = ent.getString('responsavel')
        const duracao = ent.getInt('duracao_minutos') || 45
        const rawDataHora = ent.getString('data_hora')

        const dataFormatada = rawDataHora
          ? rawDataHora.substring(0, 16).replace(' ', ' às ')
          : 'A definir'

        const html =
          '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
          '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
          '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
          '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Lembrete Oficial de Entrevista</p>' +
          '</div>' +
          '<p style="color: #334155; font-size: 15px; line-height: 1.6;">Olá, <strong>' +
          candNome +
          '</strong>!</p>' +
          '<p style="color: #334155; font-size: 14px; line-height: 1.6;">Este é um lembrete de que sua entrevista para a oportunidade <strong>' +
          vagaTitulo +
          '</strong> está agendada para as próximas 24 horas.</p>' +
          '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0;">' +
          '<h3 style="color: #1d4ed8; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Detalhes do Agendamento</h3>' +
          '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Vaga:</strong> ' +
          vagaTitulo +
          '</p>' +
          '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Data e Horário:</strong> ' +
          dataFormatada +
          '</p>' +
          '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Duração estimada:</strong> ' +
          duracao +
          ' minutos</p>' +
          '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Formato:</strong> ' +
          formato +
          '</p>' +
          '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Responsável:</strong> ' +
          responsavel +
          '</p>' +
          '</div>' +
          '<p style="color: #64748b; font-size: 13px; line-height: 1.5;">Caso precise reagendar ou tenha qualquer imprevisto, responda a este e-mail ou entre em contato com a equipe de Gente & Gestão.</p>' +
          '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Equipe de Gente & Gestão</strong></p>' +
          '</div>'

        const msg = new MailerMessage({
          from: {
            address: senderAddress,
            name: senderName,
          },
          to: [{ address: candEmail }],
          subject: 'Lembrete de Entrevista: ' + vagaTitulo + ' (' + formato + ')',
          html: html,
        })

        mailClient.send(msg)

        ent.set('lembrete_enviado', true)
        ent.set(
          'lembrete_enviado_em',
          new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z',
        )
        $app.save(ent)
      } catch (errOne) {
        console.log('Falha ao enviar lembrete para entrevista ' + ent.id + ':', errOne)
      }
    }
  } catch (errAll) {
    console.log('Erro no job de lembretes de entrevista:', errAll)
  }
})

// Rota manual para disparar ou testar o envio de lembrete em tempo real
routerAdd(
  'POST',
  '/backend/v1/entrevistas/{id}/lembrete',
  (e) => {
    try {
      const authUser = e.auth
      if (!authUser || !authUser.id) {
        return e.json(401, { error: 'Autenticação obrigatória' })
      }

      const id = e.request.pathValue('id')
      const ent = $app.findRecordById('entrevistas', id)
      if (!ent) {
        return e.json(404, { error: 'Entrevista não encontrada' })
      }

      const candId = ent.getString('candidato')
      const vagaId = ent.getString('vaga')

      const cand = $app.findRecordById('candidatos', candId)
      const vaga = $app.findRecordById('vagas', vagaId)

      if (!cand || !vaga) {
        return e.json(404, { error: 'Candidato ou vaga vinculada não encontrada' })
      }

      const candEmail = cand.getString('email')
      const candNome = cand.getString('nome')
      const vagaTitulo = vaga.getString('titulo')
      const formato = ent.getString('formato')
      const responsavel = ent.getString('responsavel')
      const duracao = ent.getInt('duracao_minutos') || 45
      const rawDataHora = ent.getString('data_hora')

      const dataFormatada = rawDataHora
        ? rawDataHora.substring(0, 16).replace(' ', ' às ')
        : 'A definir'

      const mailClient = $app.newMailClient()
      const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
      const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'

      const html =
        '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
        '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
        '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
        '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Lembrete de Entrevista</p>' +
        '</div>' +
        '<p style="color: #334155; font-size: 15px; line-height: 1.6;">Olá, <strong>' +
        candNome +
        '</strong>!</p>' +
        '<p style="color: #334155; font-size: 14px; line-height: 1.6;">Confirmamos os detalhes da sua entrevista para a vaga <strong>' +
        vagaTitulo +
        '</strong>.</p>' +
        '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0;">' +
        '<h3 style="color: #1d4ed8; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Detalhes do Agendamento</h3>' +
        '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Vaga:</strong> ' +
        vagaTitulo +
        '</p>' +
        '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Data e Horário:</strong> ' +
        dataFormatada +
        '</p>' +
        '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Duração:</strong> ' +
        duracao +
        ' minutos</p>' +
        '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Formato:</strong> ' +
        formato +
        '</p>' +
        '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Responsável:</strong> ' +
        responsavel +
        '</p>' +
        '</div>' +
        '<p style="color: #64748b; font-size: 13px; line-height: 1.5;">Caso necessite de suporte ou reagendamento, entre em contato com nossa equipe de Gente & Gestão.</p>' +
        '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Equipe de Gente & Gestão</strong></p>' +
        '</div>'

      const msg = new MailerMessage({
        from: {
          address: senderAddress,
          name: senderName,
        },
        to: [{ address: candEmail }],
        subject: 'Lembrete de Entrevista: ' + vagaTitulo + ' (' + formato + ')',
        html: html,
      })

      mailClient.send(msg)

      ent.set('lembrete_enviado', true)
      ent.set(
        'lembrete_enviado_em',
        new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z',
      )
      $app.save(ent)

      return e.json(200, {
        success: true,
        message: 'Lembrete enviado com sucesso para ' + candEmail,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao enviar lembrete' })
    }
  },
  $apis.requireAuth(),
)
