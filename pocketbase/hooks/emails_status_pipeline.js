// ============================================================================
// Hook: Automação de E-mails de Status ao Candidato
// Gatilho: onRecordAfterUpdateSuccess('pipeline')
// Dispara automaticamente quando houver mudança de estágio no pipeline.
// Regras e Proteções:
// - Deduplicação: não reenviar para o mesmo estágio consecutivo
// - Respeita o toggle global em 'config_emails_status' (vaga = null)
// - Respeita o toggle específico da vaga se configurado
// - Mensagens contextuais amigáveis, empáticas e profissionais em pt-BR
// - Registra log em 'logs_emails_status' para auditoria
// ============================================================================

onRecordAfterUpdateSuccess((e) => {
  try {
    const pipelineRecord = e.record
    const estagioNovo = pipelineRecord.getString('estagio')
    const estagioAnterior = pipelineRecord.original().getString('estagio')

    // Se o estágio não mudou, ignorar (evita duplicidade e spam em simples anotações)
    if (!estagioNovo || estagioNovo === estagioAnterior) {
      return e.next()
    }

    const candidatoId = pipelineRecord.getString('candidato')
    const vagaId = pipelineRecord.getString('vaga')

    if (!candidatoId || !vagaId) {
      return e.next()
    }

    // 1. Verificar Toggles de Envio de E-mail de Status
    // 1.1 Toggle Global
    let ativoGlobal = true
    try {
      const globais = $app.findRecordsByFilter(
        'config_emails_status',
        "vaga = '' || vaga = null",
        '-created',
        1,
        0,
      )
      if (globais && globais.length > 0) {
        ativoGlobal = globais[0].getBool('ativo')
      }
    } catch (_) {}

    if (!ativoGlobal) {
      console.log('Automação de e-mails de status desativada globalmente.')
      return e.next()
    }

    // 1.2 Toggle por Vaga (se existir configuração específica para esta vaga)
    let ativoVaga = true
    try {
      const configVagas = $app.findRecordsByFilter(
        'config_emails_status',
        "vaga = '" + vagaId + "'",
        '-created',
        1,
        0,
      )
      if (configVagas && configVagas.length > 0) {
        ativoVaga = configVagas[0].getBool('ativo')
      }
    } catch (_) {}

    if (!ativoVaga) {
      console.log('Automação de e-mails de status desativada para a vaga:', vagaId)
      return e.next()
    }

    // 2. Carregar Candidato e Vaga
    let cand = null
    let vaga = null
    try {
      cand = $app.findRecordById('candidatos', candidatoId)
      vaga = $app.findRecordById('vagas', vagaId)
    } catch (_) {}

    if (!cand || !vaga) {
      return e.next()
    }

    const candEmail = cand.getString('email')
    const candNome = cand.getString('nome') || 'Candidato'
    const vagaTitulo = vaga.getString('titulo') || 'Oportunidade'

    if (!candEmail) {
      return e.next()
    }

    // 3. Verificar se já foi enviado e-mail deste mesmo estágio recentemente para este candidato
    try {
      const logExistente = $app.findRecordsByFilter(
        'logs_emails_status',
        "candidato = '" +
          candidatoId +
          "' && vaga = '" +
          vagaId +
          "' && estagio = '" +
          estagioNovo +
          "'",
        '-created',
        1,
        0,
      )
      if (logExistente && logExistente.length > 0) {
        console.log(
          'E-mail já enviado anteriormente para o estágio ' +
            estagioNovo +
            ' do candidato ' +
            candEmail,
        )
        return e.next()
      }
    } catch (_) {}

    // 4. Montar Assunto e Mensagem Contextual por Estágio
    let assunto = 'Atualização do Processo Seletivo: ' + vagaTitulo
    let mensagemDestaque = ''
    let mensagemContextual = ''
    let badgeCor = '#1d4ed8'
    let badgeTexto = estagioNovo

    switch (estagioNovo) {
      case 'Triagem':
        assunto = 'Recebemos sua candidatura: ' + vagaTitulo
        badgeTexto = 'Triagem Inicial'
        badgeCor = '#64748b'
        mensagemDestaque = 'Recebemos sua candidatura e vamos analisar.'
        mensagemContextual =
          'Sua candidatura está em análise pelo nosso time de Gente & Gestão. Estamos avaliando a compatibilidade curricular e suas respostas com os requisitos da posição.'
        break

      case 'Entrevista com RH':
        assunto = 'Parabéns! Você avançou para a Entrevista com RH: ' + vagaTitulo
        badgeTexto = 'Entrevista com RH'
        badgeCor = '#2563eb'
        mensagemDestaque = 'Ficamos felizes em seguir com você!'
        mensagemContextual =
          'Seu perfil chamou a atenção do nosso time! Você avançou para a etapa de Entrevista com Gente & Gestão. Em breve entraremos em contato com as opções de data e horário para o nosso bate-papo.'
        break

      case 'Entrevista técnica':
        assunto = 'Próxima Etapa: Entrevista Técnica — ' + vagaTitulo
        badgeTexto = 'Entrevista Técnica'
        badgeCor = '#d97706'
        mensagemDestaque = 'Você avançou para a Avaliação Técnica!'
        mensagemContextual =
          'Parabéns pela conversa com RH! Sua candidatura foi aprovada para a fase de Entrevista Técnica com as lideranças da área. Nosso time compartilhará em breve os detalhes de agendamento.'
        break

      case 'Match técnico/comportamental (IA)':
        assunto = 'Atualização sobre a etapa de Avaliação de Fit: ' + vagaTitulo
        badgeTexto = 'Consolidação de Fit'
        badgeCor = '#7c3aed'
        mensagemDestaque = 'Sua avaliação está em consolidação!'
        mensagemContextual =
          'Finalizamos as etapas de entrevistas e estamos consolidando os relatórios de aderência técnica e comportamental junto à liderança contratante.'
        break

      case 'Proposta':
        assunto = 'Boas Notícias: Proposta em Elaboração — ' + vagaTitulo
        badgeTexto = 'Etapa de Proposta'
        badgeCor = '#0284c7'
        mensagemDestaque = 'Temos excelentes notícias sobre sua jornada!'
        mensagemContextual =
          'Você se destacou ao longo de todo o processo seletivo! Estamos preparando a proposta formal com detalhes da remuneração e pacote de benefícios para alinhamento conjunto.'
        break

      case 'Aprovado':
        assunto = '🎉 Parabéns! Você foi Aprovado(a) na vaga ' + vagaTitulo
        badgeTexto = 'Aprovado / Contratado'
        badgeCor = '#16a34a'
        mensagemDestaque = 'Parabéns e boas-vindas ao nosso time!'
        mensagemContextual =
          'É com enorme alegria que confirmamos sua contratação para a vaga de ' +
          vagaTitulo +
          '! Nosso time de People & Onboarding entrará em contato com as orientações para envio de documentos e início da sua jornada conosco.'
        break

      case 'Recusado':
        assunto = 'Atualização sobre o Processo Seletivo: ' + vagaTitulo
        badgeTexto = 'Processo Concluído'
        badgeCor = '#475569'
        mensagemDestaque = 'Agradecemos sua participação e dedicação!'
        // Mensagem empática e construtiva, sem expor pareceres internos ou notas
        mensagemContextual =
          'Agradecemos sinceramente pelo tempo e dedicação que você investiu em nosso processo seletivo. Neste momento, optamos por seguir com outro perfil cujas experiências atendiam de maneira mais próxima aos desafios imediatos desta vaga.\n\nSeu perfil continuará ativo em nosso Banco de Talentos para futuras oportunidades que combinem com sua trajetória. Desejamos muito sucesso na sua caminhada profissional!'
        break

      default:
        mensagemDestaque = 'Seu processo seletivo avançou para uma nova fase.'
        mensagemContextual =
          'Informamos que sua candidatura para a vaga ' +
          vagaTitulo +
          ' avançou para a etapa de ' +
          estagioNovo +
          '.'
    }

    // 5. Montar Template HTML Institucional Clean & Premium
    const htmlEmail =
      '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
      '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
      '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
      '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Atualização Oficial de Processo Seletivo</p>' +
      '</div>' +
      '<p style="color: #334155; font-size: 15px; line-height: 1.6;">Olá, <strong>' +
      candNome +
      '</strong>!</p>' +
      '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin: 20px 0;">' +
      '<div style="display: inline-block; background-color: ' +
      badgeCor +
      '; color: #ffffff; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 4px; margin-bottom: 12px;">' +
      badgeTexto +
      '</div>' +
      '<h2 style="color: #0f172a; margin: 0 0 8px 0; font-size: 16px; font-weight: 700;">' +
      vagaTitulo +
      '</h2>' +
      '<p style="color: #1e293b; font-size: 14px; font-weight: 600; line-height: 1.5; margin: 8px 0;">' +
      mensagemDestaque +
      '</p>' +
      '<p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 12px 0 0 0; white-space: pre-line;">' +
      mensagemContextual +
      '</p>' +
      '</div>' +
      '<p style="color: #64748b; font-size: 12px; line-height: 1.5;">Esta notificação foi enviada automaticamente pelo Sistema RH Inteligente de Gente & Gestão para mantê-lo(a) informado(a) sobre cada etapa da sua candidatura.</p>' +
      '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Equipe de Gente & Gestão</strong></p>' +
      '</div>'

    // 6. Disparar E-mail
    let envioSucesso = true
    try {
      const mailClient = $app.newMailClient()
      const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
      const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'

      const msg = new MailerMessage({
        from: { address: senderAddress, name: senderName },
        to: [{ address: candEmail }],
        subject: assunto,
        html: htmlEmail,
      })

      mailClient.send(msg)
    } catch (sendErr) {
      envioSucesso = false
      console.log('Falha ao enviar e-mail de status para ' + candEmail + ':', sendErr)
    }

    // 7. Gravar Log de Auditoria na coleção 'logs_emails_status'
    try {
      const logsCol = $app.findCollectionByNameOrId('logs_emails_status')
      const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
      const logRec = new Record(logsCol)
      logRec.set('candidato', candidatoId)
      logRec.set('vaga', vagaId)
      logRec.set('estagio', estagioNovo)
      logRec.set('candidato_nome', candNome)
      logRec.set('candidato_email', candEmail)
      logRec.set('vaga_titulo', vagaTitulo)
      logRec.set('assunto', assunto)
      logRec.set('status_envio', envioSucesso ? 'Enviado' : 'Falhou')
      logRec.set('mensagem_resumo', mensagemDestaque + ' ' + mensagemContextual.substring(0, 150))
      logRec.set('data_envio', agoraIso)
      $app.save(logRec)
    } catch (logErr) {
      console.log('Aviso ao persistir log de auditoria de e-mail de status:', logErr)
    }

    // 8. Gatilho Automático: Pesquisa de Experiência do Candidato ao encerrar processo (Contratado/Aprovado ou Recusado)
    if (estagioNovo === 'Aprovado' || estagioNovo === 'Recusado') {
      try {
        const avalCol = $app.findCollectionByNameOrId('avaliacoes_experiencia')
        // Anti-duplicidade: verificar se já existe pesquisa registrada para este candidato e vaga
        const pesquisasExistentes = $app.findRecordsByFilter(
          'avaliacoes_experiencia',
          "candidato = '" + candidatoId + "' && vaga = '" + vagaId + "'",
          '-created',
          1,
          0,
        )

        if (!pesquisasExistentes || pesquisasExistentes.length === 0) {
          const statusProcesso = estagioNovo === 'Aprovado' ? 'Contratado' : 'Recusado'
          const tokenPesquisa = 'exp-' + $security.randomString(20).toLowerCase()
          const novaAval = new Record(avalCol)
          novaAval.set('candidato', candidatoId)
          novaAval.set('vaga', vagaId)
          novaAval.set('token_pesquisa', tokenPesquisa)
          novaAval.set('status_processo', statusProcesso)
          novaAval.set('respondido', false)
          novaAval.set('alerta_oportunidade', false)
          $app.save(novaAval)

          // Disparar e-mail de pesquisa com link público se houver e-mail
          if (candEmail) {
            let emailPesquisaOk = true
            try {
              const mailClient = $app.newMailClient()
              const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
              const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'
              const assuntoPesquisa =
                'Sua opinião é fundamental: Pesquisa de Experiência (' + vagaTitulo + ')'
              const linkPesquisa = '/experiencia/' + tokenPesquisa

              const htmlPesquisa =
                '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
                '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
                '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
                '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Pesquisa de Experiência do Candidato</p>' +
                '</div>' +
                '<p style="color: #334155; font-size: 15px; line-height: 1.6;">Olá, <strong>' +
                candNome +
                '</strong>!</p>' +
                '<p style="color: #334155; font-size: 14px; line-height: 1.6;">Com o encerramento do processo seletivo para <strong>' +
                vagaTitulo +
                '</strong>, gostaríamos muito de ouvir como foi sua experiência com nosso time de RH.</p>' +
                '<p style="color: #334155; font-size: 14px; line-height: 1.6;">Leva apenas <strong>1 minuto</strong> e suas respostas são totalmente confidenciais para os avaliadores.</p>' +
                '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center;">' +
                '<a href="' +
                linkPesquisa +
                '" style="display: inline-block; background-color: #1d4ed8; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 24px; border-radius: 6px;">Avaliar Minha Experiência</a>' +
                '</div>' +
                '<p style="color: #64748b; font-size: 12px; line-height: 1.5;">Obrigado por contribuir com a evolução dos nossos processos de Gente & Gestão!</p>' +
                '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Equipe de Gente & Gestão</strong></p>' +
                '</div>'

              const msgPesquisa = new MailerMessage({
                from: { address: senderAddress, name: senderName },
                to: [{ address: candEmail }],
                subject: assuntoPesquisa,
                html: htmlPesquisa,
              })

              mailClient.send(msgPesquisa)
            } catch (errSendPesquisa) {
              emailPesquisaOk = false
              console.log('Aviso ao enviar e-mail de pesquisa de experiência:', errSendPesquisa)
            }

            // Registrar no log de auditoria
            try {
              const logsCol = $app.findCollectionByNameOrId('logs_emails_status')
              const agoraIsoPesquisa =
                new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
              const logPesqRec = new Record(logsCol)
              logPesqRec.set('candidato', candidatoId)
              logPesqRec.set('vaga', vagaId)
              logPesqRec.set('estagio', estagioNovo)
              logPesqRec.set('candidato_nome', candNome)
              logPesqRec.set('candidato_email', candEmail)
              logPesqRec.set('vaga_titulo', vagaTitulo)
              logPesqRec.set(
                'assunto',
                'Sua opinião é fundamental: Pesquisa de Experiência (' + vagaTitulo + ')',
              )
              logPesqRec.set('status_envio', emailPesquisaOk ? 'Enviado' : 'Falhou')
              logPesqRec.set(
                'mensagem_resumo',
                'Convite automático para pesquisa de Candidate Experience pós-encerramento.',
              )
              logPesqRec.set('data_envio', agoraIsoPesquisa)
              $app.save(logPesqRec)
            } catch (_) {}
          }
        }
      } catch (errGatilhoExp) {
        console.log('Aviso no gatilho automático de pesquisa de experiência:', errGatilhoExp)
      }
    }
  } catch (errGlobal) {
    console.log('Erro geral no hook de e-mails de status do pipeline:', errGlobal)
  }

  return e.next()
}, 'pipeline')
