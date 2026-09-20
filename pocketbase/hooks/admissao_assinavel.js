// ============================================================================
// Hook: Checklist Admissional Assinável pelo Contratado
// Rotas Públicas:
// - GET  /backend/v1/public/admissao/{token} -> Consulta checklist e status
// - POST /backend/v1/public/admissao/{token}/confirmar-item -> Marca/desmarca item e salva nota
// - POST /backend/v1/public/admissao/{token}/assinar -> Assinatura digital LGPD com IP e data
// Rotas Autenticadas (RH):
// - POST /backend/v1/onboarding/{id}/gerar-link -> Gera novo token ou reativa
// - POST /backend/v1/onboarding/{id}/enviar-email -> Dispara e-mail com link ao contratado e loga
// - POST /backend/v1/onboarding/{id}/invalidar-link -> Invalida/revoga link
// ============================================================================

// 1. Consulta Pública do Onboarding pelo Token
routerAdd('GET', '/backend/v1/public/admissao/{token}', (e) => {
  try {
    const token = (e.request.pathValue('token') || '').trim()
    if (!token) {
      return e.json(400, { error: 'Token não informado' })
    }

    const onbList = $app.findRecordsByFilter(
      'onboardings',
      "token_admissao = '" + token + "'",
      '-created',
      1,
      0,
    )

    if (!onbList || onbList.length === 0) {
      return e.json(404, { error: 'Link de admissão não encontrado ou inválido.' })
    }

    const onb = onbList[0]
    if (onb.getBool('link_ativo') === false) {
      return e.json(403, {
        error: 'Este link de admissão foi desativado ou reaberto pela equipe de Gente & Gestão.',
        linkInvalido: true,
      })
    }

    let cand = null
    let vaga = null
    try {
      cand = $app.findRecordById('candidatos', onb.getString('candidato'))
    } catch (_) {}
    try {
      vaga = $app.findRecordById('vagas', onb.getString('vaga'))
    } catch (_) {}

    const itens = onb.get('itens') || []
    const totalItens = itens.length
    let concluidos = 0
    let totalContratado = 0
    let concluidosContratado = 0
    let totalEmpresa = 0
    let concluidosEmpresa = 0

    for (let i = 0; i < itens.length; i++) {
      const it = itens[i]
      if (it.concluido) concluidos++
      if (it.aCargoDoContratado) {
        totalContratado++
        if (it.confirmadoPorMim || it.concluido) concluidosContratado++
      } else {
        totalEmpresa++
        if (it.concluido) concluidosEmpresa++
      }
    }

    return e.json(200, {
      onboarding: {
        id: onb.id,
        data_admissao: onb.getString('data_admissao'),
        status_geral: onb.getString('status'),
        status_admissao: onb.getString('status_admissao') || 'Enviado ao contratado',
        percentual_conclusao: onb.getInt('percentual_conclusao') || 0,
        itens: itens,
        total_itens: totalItens,
        concluidos: concluidos,
        total_itens_contratado: totalContratado,
        concluidos_contratado: concluidosContratado,
        total_itens_empresa: totalEmpresa,
        concluidos_empresa: concluidosEmpresa,
        assinatura_nome: onb.getString('assinatura_nome'),
        assinatura_data: onb.getString('assinatura_data'),
        assinatura_declaracao_lgpd: onb.getBool('assinatura_declaracao_lgpd'),
      },
      candidato: {
        nome: cand ? cand.getString('nome') : 'Contratado(a)',
        email: cand ? cand.getString('email') : '',
        telefone: cand ? cand.getString('telefone') : '',
      },
      vaga: {
        titulo: vaga ? vaga.getString('titulo') : 'Posição Profissional',
        departamento: vaga ? vaga.getString('departamento') : 'Empresa',
        modalidade: vaga ? vaga.getString('modalidade') : 'Presencial / Híbrido',
      },
    })
  } catch (err) {
    console.log('Erro ao consultar admissão pública:', err)
    return e.json(500, { error: err.message || 'Falha ao carregar admissão.' })
  }
})

// 2. Atualizar Confirmação / Observação de Item pelo Contratado
routerAdd('POST', '/backend/v1/public/admissao/{token}/confirmar-item', (e) => {
  try {
    const token = (e.request.pathValue('token') || '').trim()
    const body = e.requestInfo().body || {}
    const itemId = (body.itemId || '').trim()
    const confirmado = body.confirmado === true || body.confirmado === 'true'
    const observacao = (body.observacao || '').trim()

    if (!token || !itemId) {
      return e.json(400, { error: 'Token e itemId são obrigatórios.' })
    }

    const onbList = $app.findRecordsByFilter(
      'onboardings',
      "token_admissao = '" + token + "'",
      '-created',
      1,
      0,
    )

    if (!onbList || onbList.length === 0) {
      return e.json(404, { error: 'Processo admissional não encontrado.' })
    }

    const onb = onbList[0]
    if (onb.getBool('link_ativo') === false) {
      return e.json(403, { error: 'Este link não está mais ativo.' })
    }

    // Se já foi assinado, bloqueia edições
    if (onb.getString('status_admissao') === 'Assinado pelo contratado') {
      return e.json(400, {
        error: 'Este checklist já foi formalmente assinado e enviado ao RH.',
        jaAssinado: true,
      })
    }

    const itens = onb.get('itens') || []
    const idx = itens.findIndex(function (it) {
      return it.id === itemId
    })

    if (idx === -1) {
      return e.json(404, { error: 'Item não encontrado no checklist.' })
    }

    const itemAlvo = itens[idx]

    // REGRA DE SEGURANÇA: itens da empresa não podem ser confirmados pelo contratado
    if (!itemAlvo.aCargoDoContratado) {
      return e.json(403, {
        error:
          'Este item é de responsabilidade interna da empresa e não pode ser confirmado pelo contratado.',
      })
    }

    const agoraIso = new Date().toISOString()
    itens[idx] = {
      ...itemAlvo,
      concluido: confirmado,
      confirmadoPorMim: confirmado,
      confirmadoEm: confirmado ? agoraIso : null,
      observacaoContratado: observacao || itemAlvo.observacaoContratado || '',
    }

    // Recalcular métricas
    let concluidos = 0
    let totalContratado = 0
    let concluidosContratado = 0
    let totalEmpresa = 0
    let concluidosEmpresa = 0

    for (let i = 0; i < itens.length; i++) {
      const it = itens[i]
      if (it.concluido) concluidos++
      if (it.aCargoDoContratado) {
        totalContratado++
        if (it.confirmadoPorMim || it.concluido) concluidosContratado++
      } else {
        totalEmpresa++
        if (it.concluido) concluidosEmpresa++
      }
    }

    const percGeral = Math.round((concluidos / itens.length) * 100)
    onb.set('itens', itens)
    onb.set('percentual_conclusao', percGeral)
    onb.set('total_itens_contratado', totalContratado)
    onb.set('concluidos_contratado', concluidosContratado)
    onb.set('total_itens_empresa', totalEmpresa)
    onb.set('concluidos_empresa', concluidosEmpresa)

    if (onb.getString('status_admissao') === 'Enviado ao contratado') {
      onb.set('status_admissao', 'Em preenchimento')
    }

    $app.save(onb)

    return e.json(200, {
      success: true,
      message: 'Item atualizado com sucesso.',
      itens: itens,
      percentual_conclusao: percGeral,
      concluidos_contratado: concluidosContratado,
    })
  } catch (err) {
    console.log('Erro ao confirmar item pelo contratado:', err)
    return e.json(500, { error: err.message || 'Falha ao atualizar item.' })
  }
})

// 3. Assinatura Digital de Reconhecimento e Veracidade com LGPD
routerAdd('POST', '/backend/v1/public/admissao/{token}/assinar', (e) => {
  try {
    const token = (e.request.pathValue('token') || '').trim()
    const body = e.requestInfo().body || {}
    const nomeDigitado = (body.nome || '').trim()
    const declaracaoLgpd =
      body.declaracao_lgpd === true || body.declaracao_lgpd === 'true' || body.declaracao_lgpd === 1

    if (!token) {
      return e.json(400, { error: 'Token obrigatório.' })
    }

    if (!declaracaoLgpd) {
      return e.json(400, {
        error: 'É obrigatório aceitar a declaração de veracidade e autorização LGPD.',
      })
    }

    if (!nomeDigitado || nomeDigitado.length < 3) {
      return e.json(400, {
        error: 'Por favor, digite seu nome completo exatamente como no cadastro para assinar.',
      })
    }

    const onbList = $app.findRecordsByFilter(
      'onboardings',
      "token_admissao = '" + token + "'",
      '-created',
      1,
      0,
    )

    if (!onbList || onbList.length === 0) {
      return e.json(404, { error: 'Processo de admissão não encontrado.' })
    }

    const onb = onbList[0]
    if (onb.getBool('link_ativo') === false) {
      return e.json(403, { error: 'Este link não está ativo para assinatura.' })
    }

    if (onb.getString('status_admissao') === 'Assinado pelo contratado') {
      return e.json(200, {
        success: true,
        message: 'Este checklist já foi assinado anteriormente.',
        jaAssinado: true,
        assinatura_data: onb.getString('assinatura_data'),
      })
    }

    let cand = null
    let vaga = null
    try {
      cand = $app.findRecordById('candidatos', onb.getString('candidato'))
    } catch (_) {}
    try {
      vaga = $app.findRecordById('vagas', onb.getString('vaga'))
    } catch (_) {}

    // Validação cordial do nome
    const candNomeReal = cand ? cand.getString('nome') : ''
    if (candNomeReal) {
      const normalizar = function (s) {
        return s
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, ' ')
          .trim()
      }
      const partesReal = normalizar(candNomeReal).split(' ')
      const partesDigitado = normalizar(nomeDigitado).split(' ')
      const primeiroNomeReal = partesReal[0] || ''
      const primeiroNomeDigitado = partesDigitado[0] || ''

      if (primeiroNomeReal !== primeiroNomeDigitado) {
        return e.json(400, {
          error:
            'O nome digitado ("' +
            nomeDigitado +
            '") difere do nome cadastrado no processo ("' +
            candNomeReal +
            '"). Por favor, confira o preenchimento.',
        })
      }
    }

    // Captura de Evidências (IP e Data/Hora ISO)
    const reqInfo = e.requestInfo()
    const clientIp =
      reqInfo.headers['x-forwarded-for'] || reqInfo.headers['x-real-ip'] || 'Origem pública web'
    const ipLimpo = String(clientIp).split(',')[0].trim()
    const agoraIso = new Date().toISOString()
    const agoraFormatada = agoraIso.replace('T', ' ').substring(0, 19) + 'Z'

    onb.set('status_admissao', 'Assinado pelo contratado')
    onb.set('assinatura_nome', nomeDigitado)
    onb.set('assinatura_declaracao_lgpd', true)
    onb.set('assinatura_data', agoraFormatada)
    onb.set('assinatura_ip', ipLimpo)
    $app.save(onb)

    // Disparar E-mail ao RH Responsável
    const nomeColaborador = candNomeReal || nomeDigitado
    const tituloVaga = vaga ? vaga.getString('titulo') : 'Posição'
    let emailDisparado = false

    try {
      const mailClient = $app.newMailClient()
      const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
      const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'

      // Encontrar e-mail do RH ou gestor
      let destEmail = 'rh@sistema-rh.local'
      try {
        const usersCol = $app.findCollectionByNameOrId('users')
        const adminUsers = $app.findRecordsByFilter(
          'users',
          "cargo_funcao = 'RH / Recrutador' || email != ''",
          '-created',
          1,
          0,
        )
        if (adminUsers && adminUsers.length > 0) {
          destEmail = adminUsers[0].getString('email') || destEmail
        }
      } catch (_) {}

      const assunto = '✅ ' + nomeColaborador + ' concluiu o checklist admissional'
      const htmlRh =
        '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
        '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
        '<span style="background-color: #16a34a; color: #ffffff; font-size: 11px; font-weight: bold; text-transform: uppercase; padding: 4px 10px; border-radius: 4px;">Checklist Assinado</span>' +
        '<h1 style="color: #ffffff; margin: 10px 0 0 0; font-size: 20px; font-weight: 700;">Checklist Admissional Concluído</h1>' +
        '</div>' +
        '<p style="color: #334155; font-size: 15px; line-height: 1.6;">Olá, equipe de Gente & Gestão!</p>' +
        '<p style="color: #334155; font-size: 14px; line-height: 1.6;">O(A) contratado(a) <strong>' +
        nomeColaborador +
        '</strong> para a vaga <strong>' +
        tituloVaga +
        '</strong> concluiu a conferência dos itens admissionais e realizou a assinatura digital de concordância.</p>' +
        '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0;">' +
        '<h3 style="color: #1d4ed8; margin: 0 0 10px 0; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Evidência de Assinatura Digital</h3>' +
        '<p style="margin: 0 0 6px 0; color: #1e293b; font-size: 13px;"><strong>Nome Assinado:</strong> ' +
        nomeDigitado +
        '</p>' +
        '<p style="margin: 0 0 6px 0; color: #1e293b; font-size: 13px;"><strong>Data e Hora:</strong> ' +
        new Date().toLocaleString('pt-BR') +
        '</p>' +
        '<p style="margin: 0 0 6px 0; color: #1e293b; font-size: 13px;"><strong>IP Registrado:</strong> ' +
        ipLimpo +
        '</p>' +
        '<p style="margin: 0; color: #16a34a; font-size: 13px;"><strong>Declaração LGPD:</strong> Aceita com consentimento integral</p>' +
        '</div>' +
        '<p style="color: #64748b; font-size: 12px; line-height: 1.5;">Acesse o módulo de Onboarding no sistema para dar seguimento à liberação dos equipamentos e acessos corporativos.</p>' +
        '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Sistema RH Inteligente</strong></p>' +
        '</div>'

      const msg = new MailerMessage({
        from: { address: senderAddress, name: senderName },
        to: [{ address: destEmail }],
        subject: assunto,
        html: htmlRh,
      })

      mailClient.send(msg)
      emailDisparado = true

      // Gravar no log de auditoria
      try {
        const logsCol = $app.findCollectionByNameOrId('logs_emails_status')
        const logRec = new Record(logsCol)
        if (cand) logRec.set('candidato', cand.id)
        if (vaga) logRec.set('vaga', vaga.id)
        logRec.set('estagio', 'Aprovado')
        logRec.set('candidato_nome', nomeColaborador)
        logRec.set('candidato_email', cand ? cand.getString('email') : '')
        logRec.set('vaga_titulo', tituloVaga)
        logRec.set('assunto', assunto)
        logRec.set('status_envio', 'Enviado')
        logRec.set(
          'mensagem_resumo',
          'Notificação automática ao RH: checklist admissional concluído e assinado com IP ' +
            ipLimpo,
        )
        logRec.set('data_envio', agoraFormatada)
        $app.save(logRec)
      } catch (_) {}
    } catch (mailErr) {
      console.log('Aviso ao enviar notificação de assinatura de onboarding ao RH:', mailErr)
    }

    return e.json(200, {
      success: true,
      message: 'Assinatura digital registrada com sucesso! Agradecemos sua colaboração.',
      assinatura: {
        nome: nomeDigitado,
        data: agoraFormatada,
        ip: ipLimpo,
      },
      emailDisparado: emailDisparado,
    })
  } catch (err) {
    console.log('Erro ao assinar checklist:', err)
    return e.json(500, { error: err.message || 'Falha ao registrar assinatura.' })
  }
})

// 4. Ações do RH: Gerar / Copiar Link (Autenticado)
routerAdd(
  'POST',
  '/backend/v1/onboarding/{id}/gerar-link',
  (e) => {
    try {
      const id = e.request.pathValue('id')
      const onb = $app.findRecordById('onboardings', id)
      if (!onb) {
        return e.json(404, { error: 'Onboarding não encontrado' })
      }

      // Gerar token opaco seguro se não houver ou se for regenerado
      const tokenNovo = 'adm-' + $security.randomString(20).toLowerCase()
      onb.set('token_admissao', tokenNovo)
      onb.set('link_ativo', true)
      if (!onb.getString('status_admissao')) {
        onb.set('status_admissao', 'Pendente de envio')
      }
      $app.save(onb)

      return e.json(200, {
        success: true,
        token: tokenNovo,
        status_admissao: onb.getString('status_admissao'),
        link_ativo: true,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao gerar link' })
    }
  },
  $apis.requireAuth(),
)

// 5. Ações do RH: (Re)enviar Link por E-mail ao Contratado (Autenticado)
routerAdd(
  'POST',
  '/backend/v1/onboarding/{id}/enviar-email',
  (e) => {
    try {
      const id = e.request.pathValue('id')
      const onb = $app.findRecordById('onboardings', id)
      if (!onb) {
        return e.json(404, { error: 'Onboarding não encontrado' })
      }

      let cand = null
      let vaga = null
      try {
        cand = $app.findRecordById('candidatos', onb.getString('candidato'))
      } catch (_) {}
      try {
        vaga = $app.findRecordById('vagas', onb.getString('vaga'))
      } catch (_) {}

      if (!cand || !cand.getString('email')) {
        return e.json(400, { error: 'Candidato não possui e-mail cadastrado.' })
      }

      let token = onb.getString('token_admissao')
      if (!token) {
        token = 'adm-' + $security.randomString(20).toLowerCase()
        onb.set('token_admissao', token)
      }
      onb.set('link_ativo', true)
      onb.set('status_admissao', 'Enviado ao contratado')
      $app.save(onb)

      const candNome = cand.getString('nome') || 'Novo Colaborador'
      const candEmail = cand.getString('email')
      const vagaTitulo = vaga ? vaga.getString('titulo') : 'Oportunidade'

      // Montar e-mail com link público
      const linkPublico = '/admissao/' + token
      const mailClient = $app.newMailClient()
      const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
      const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'
      const assunto = '📋 Seu Checklist Admissional: ' + vagaTitulo

      const html =
        '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
        '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
        '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
        '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Checklist Admissional Digital</p>' +
        '</div>' +
        '<p style="color: #334155; font-size: 15px; line-height: 1.6;">Olá, <strong>' +
        candNome +
        '</strong>!</p>' +
        '<p style="color: #334155; font-size: 14px; line-height: 1.6;">Para formalizarmos sua chegada na posição de <strong>' +
        vagaTitulo +
        '</strong>, disponibilizamos seu portal de admissão exclusivo. Nele você pode conferir as etapas do seu primeiro dia, marcar seus documentos e assinar digitalmente o termo de reconhecimento.</p>' +
        '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">' +
        '<a href="' +
        linkPublico +
        '" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 24px; border-radius: 6px;">Acessar Checklist Admissional</a>' +
        '<p style="margin: 12px 0 0 0; color: #64748b; font-size: 12px;">Link seguro e nominal — não compartilhe este acesso com terceiros.</p>' +
        '</div>' +
        '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Com carinho,<br><strong>Equipe de Gente & Gestão</strong></p>' +
        '</div>'

      let envioOk = true
      try {
        const msg = new MailerMessage({
          from: { address: senderAddress, name: senderName },
          to: [{ address: candEmail }],
          subject: assunto,
          html: html,
        })
        mailClient.send(msg)
      } catch (sendErr) {
        envioOk = false
        console.log('Falha ao enviar e-mail de link admissional:', sendErr)
      }

      // Registrar log de auditoria
      try {
        const logsCol = $app.findCollectionByNameOrId('logs_emails_status')
        const logRec = new Record(logsCol)
        logRec.set('candidato', cand.id)
        if (vaga) logRec.set('vaga', vaga.id)
        logRec.set('estagio', 'Aprovado')
        logRec.set('candidato_nome', candNome)
        logRec.set('candidato_email', candEmail)
        logRec.set('vaga_titulo', vagaTitulo)
        logRec.set('assunto', assunto)
        logRec.set('status_envio', envioOk ? 'Enviado' : 'Falhou')
        logRec.set(
          'mensagem_resumo',
          'Envio do link público de checklist admissional (' + linkPublico + ').',
        )
        logRec.set('data_envio', new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z')
        $app.save(logRec)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: 'Link admissional enviado com sucesso por e-mail!',
        token: token,
        email: candEmail,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao enviar e-mail' })
    }
  },
  $apis.requireAuth(),
)

// 6. Ações do RH: Invalidar / Reabrir Link (Autenticado)
routerAdd(
  'POST',
  '/backend/v1/onboarding/{id}/invalidar-link',
  (e) => {
    try {
      const id = e.request.pathValue('id')
      const onb = $app.findRecordById('onboardings', id)
      if (!onb) {
        return e.json(404, { error: 'Onboarding não encontrado' })
      }

      const body = e.requestInfo().body || {}
      const reabrir = body.reabrir === true || body.reabrir === 'true'

      if (reabrir) {
        onb.set('link_ativo', true)
        onb.set('status_admissao', 'Em preenchimento')
        onb.set('assinatura_nome', '')
        onb.set('assinatura_declaracao_lgpd', false)
        onb.set('assinatura_data', null)
        onb.set('assinatura_ip', '')
      } else {
        onb.set('link_ativo', false)
      }

      $app.save(onb)

      return e.json(200, {
        success: true,
        link_ativo: onb.getBool('link_ativo'),
        status_admissao: onb.getString('status_admissao'),
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao alterar link' })
    }
  },
  $apis.requireAuth(),
)
