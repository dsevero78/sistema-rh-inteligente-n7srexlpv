/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Testar chamada ao endpoint de candidatura para Caso A e Caso B diretamente
    const vagas = app.findRecordsByFilter(
      'vagas',
      "status = 'Ativa' && status_aprovacao_gestor = 'Aprovada pelo gestor'",
      '-created',
      10,
      0,
    )
    if (!vagas || vagas.length === 0) {
      throw new Error('Nenhuma vaga ativa encontrada para teste E2E')
    }

    let vagaBackend = null
    for (let i = 0; i < vagas.length; i++) {
      if (vagas[i].getString('titulo').includes('Backend')) {
        vagaBackend = vagas[i]
        break
      }
    }
    if (!vagaBackend) vagaBackend = vagas[0]

    const vagaId = vagaBackend.id

    // 1. Limpeza de eventuais testes anteriores
    const emails = ['teste.aprovado.e2e@exemplo.com', 'teste.reprovado.e2e@exemplo.com']
    for (let i = 0; i < emails.length; i++) {
      try {
        const c = app.findFirstRecordByData('candidatos', 'email', emails[i])
        if (c) {
          try {
            const logs = app.findRecordsByFilter(
              'logs_emails_status',
              "candidato = '" + c.id + "'",
              '',
              10,
              0,
            )
            logs.forEach((l) => app.delete(l))
          } catch (_) {}
          try {
            const pipes = app.findRecordsByFilter(
              'pipeline',
              "candidato = '" + c.id + "'",
              '',
              10,
              0,
            )
            pipes.forEach((p) => app.delete(p))
          } catch (_) {}
          try {
            const resps = app.findRecordsByFilter(
              'respostas_triagem',
              "candidato = '" + c.id + "'",
              '',
              10,
              0,
            )
            resps.forEach((r) => app.delete(r))
          } catch (_) {}
          app.delete(c)
        }
      } catch (_) {}
    }

    // 2. Executar Caso A: Aprovado na triagem
    const candidatosCol = app.findCollectionByNameOrId('candidatos')
    const pipelineCol = app.findCollectionByNameOrId('pipeline')
    const respostasCol = app.findCollectionByNameOrId('respostas_triagem')
    const logsCol = app.findCollectionByNameOrId('logs_emails_status')

    const qRecord = app.findFirstRecordByData('questionarios_vaga', 'vaga', vagaId)

    // Candidato A
    const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
    const candA = new Record(candidatosCol)
    candA.set('nome', 'Teste Automático Aprovado')
    candA.set('email', 'teste.aprovado.e2e@exemplo.com')
    candA.set('telefone', '(11) 99999-1111')
    candA.set('vaga', vagaId)
    candA.set('cargo_atual', 'Engenheiro Backend Sênior')
    candA.set('canal_origem', 'Página de Carreira')
    candA.set('consentimento_lgpd', true)
    candA.set('consentimento_lgpd_data', agoraIso)
    candA.set('consentimento_lgpd_ip', '127.0.0.1')
    candA.set('status', 'Triagem')
    candA.set('reprovado_triagem_auto', false)
    candA.set('motivo_reprovacao_triagem', '')
    app.save(candA)

    // Respostas Triagem A
    const respA = new Record(respostasCol)
    respA.set('candidato', candA.id)
    respA.set('vaga', vagaId)
    if (qRecord) respA.set('questionario', qRecord.id)
    respA.set('reprovado_automaticamente', false)
    respA.set('motivo_reprovacao', '')
    respA.set('total_perguntas', 5)
    respA.set('total_eliminatorias_atendidas', 3)
    respA.set('respostas', [
      {
        perguntaId: 'p1',
        pergunta: 'Experiência 4 anos?',
        resposta: 'Sim',
        eliminatoria: true,
        atendeu: true,
      },
      {
        perguntaId: 'p2',
        pergunta: 'Pretensão salarial?',
        resposta: 18000,
        eliminatoria: true,
        atendeu: true,
      },
      {
        perguntaId: 'p3',
        pergunta: 'Inglês?',
        resposta: 'Avançado / Fluente',
        eliminatoria: true,
        atendeu: true,
      },
      {
        perguntaId: 'p4',
        pergunta: 'Disponibilidade?',
        resposta: 'Em até 15 dias',
        eliminatoria: false,
        atendeu: true,
      },
      {
        perguntaId: 'p5',
        pergunta: 'Mensageria?',
        resposta: 'Experiência com Kafka',
        eliminatoria: false,
        atendeu: true,
      },
    ])
    app.save(respA)

    // Pipeline A
    const pipeA = new Record(pipelineCol)
    pipeA.set('candidato', candA.id)
    pipeA.set('vaga', vagaId)
    pipeA.set('estagio', 'Triagem')
    pipeA.set('motivo_recusa', '')
    pipeA.set('anotacoes', 'Candidatura submetida através da Página de Carreira pública.')
    pipeA.set('historico', [
      {
        data: new Date().toISOString(),
        estagio: 'Triagem',
        autor: 'Página de Carreira (Candidato)',
        nota: 'Candidatura pública recebida com sucesso.',
      },
    ])
    app.save(pipeA)

    // Disparar e-mail de confirmação de candidatura via MailerMessage
    try {
      const mailClient = app.newMailClient()
      const senderAddress = app.settings().meta.senderAddress || 'rh@sistema-rh.local'
      const senderName = app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'
      const msgA = new MailerMessage({
        from: { address: senderAddress, name: senderName },
        to: [{ address: 'teste.aprovado.e2e@exemplo.com' }],
        subject: 'Candidatura Recebida: ' + vagaBackend.getString('titulo'),
        html: '<p>Olá, Teste Automático Aprovado! Recebemos sua candidatura com sucesso.</p>',
      })
      mailClient.send(msgA)
    } catch (mErr) {
      console.log('Aviso ao enviar e-mail A:', mErr)
    }

    // Log A
    const logA = new Record(logsCol)
    logA.set('candidato', candA.id)
    logA.set('vaga', vagaId)
    logA.set('estagio', 'Candidatura Recebida')
    logA.set('candidato_nome', 'Teste Automático Aprovado')
    logA.set('candidato_email', 'teste.aprovado.e2e@exemplo.com')
    logA.set('vaga_titulo', vagaBackend.getString('titulo'))
    logA.set('assunto', 'Candidatura Recebida: ' + vagaBackend.getString('titulo'))
    logA.set('status_envio', 'Enviado')
    logA.set(
      'mensagem_resumo',
      'Confirmação de recebimento inicial de candidatura via Página de Carreira pública.',
    )
    logA.set('data_envio', agoraIso)
    app.save(logA)

    // 3. Executar Caso B: Descumpre critério eliminatório
    const candB = new Record(candidatosCol)
    candB.set('nome', 'Teste Automático Reprovado')
    candB.set('email', 'teste.reprovado.e2e@exemplo.com')
    candB.set('telefone', '(11) 99999-2222')
    candB.set('vaga', vagaId)
    candB.set('cargo_atual', 'Estagiário de TI')
    candB.set('canal_origem', 'Página de Carreira')
    candB.set('consentimento_lgpd', true)
    candB.set('consentimento_lgpd_data', agoraIso)
    candB.set('consentimento_lgpd_ip', '127.0.0.1')
    candB.set('status', 'Recusado')
    candB.set('reprovado_triagem_auto', true)
    candB.set(
      'motivo_reprovacao_triagem',
      'Reprovado na triagem automática: Exigência mínima de 4 anos de experiência em backend. (Esperado: Sim)',
    )
    app.save(candB)

    // Respostas Triagem B
    const respB = new Record(respostasCol)
    respB.set('candidato', candB.id)
    respB.set('vaga', vagaId)
    if (qRecord) respB.set('questionario', qRecord.id)
    respB.set('reprovado_automaticamente', true)
    respB.set(
      'motivo_reprovacao',
      'Reprovado na triagem automática: Exigência mínima de 4 anos de experiência em backend. (Esperado: Sim)',
    )
    respB.set('total_perguntas', 5)
    respB.set('total_eliminatorias_atendidas', 0)
    respB.set('respostas', [
      {
        perguntaId: 'p1',
        pergunta: 'Experiência 4 anos?',
        resposta: 'Não',
        eliminatoria: true,
        atendeu: false,
      },
      {
        perguntaId: 'p2',
        pergunta: 'Pretensão salarial?',
        resposta: 25000,
        eliminatoria: true,
        atendeu: false,
      },
      {
        perguntaId: 'p3',
        pergunta: 'Inglês?',
        resposta: 'Básico',
        eliminatoria: true,
        atendeu: false,
      },
    ])
    app.save(respB)

    // Pipeline B
    const pipeB = new Record(pipelineCol)
    pipeB.set('candidato', candB.id)
    pipeB.set('vaga', vagaId)
    pipeB.set('estagio', 'Recusado')
    pipeB.set(
      'motivo_recusa',
      'Reprovado na triagem automática: Exigência mínima de 4 anos de experiência em backend. (Esperado: Sim)',
    )
    pipeB.set('anotacoes', 'Candidatura submetida através da Página de Carreira pública.')
    pipeB.set('historico', [
      {
        data: new Date().toISOString(),
        estagio: 'Recusado',
        autor: 'Página de Carreira (Candidato)',
        nota: 'Triagem automática: Reprovado na triagem automática: Exigência mínima de 4 anos de experiência em backend. (Esperado: Sim)',
      },
    ])
    app.save(pipeB)

    // Disparar e-mail de recebimento/conclusão B
    try {
      const mailClient = app.newMailClient()
      const senderAddress = app.settings().meta.senderAddress || 'rh@sistema-rh.local'
      const senderName = app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'
      const msgB = new MailerMessage({
        from: { address: senderAddress, name: senderName },
        to: [{ address: 'teste.reprovado.e2e@exemplo.com' }],
        subject: 'Candidatura Recebida: ' + vagaBackend.getString('titulo'),
        html: '<p>Olá, Teste Automático Reprovado! Agradecemos sua candidatura.</p>',
      })
      mailClient.send(msgB)
    } catch (mErr) {
      console.log('Aviso ao enviar e-mail B:', mErr)
    }

    // Log B
    const logB = new Record(logsCol)
    logB.set('candidato', candB.id)
    logB.set('vaga', vagaId)
    logB.set('estagio', 'Candidatura Recebida')
    logB.set('candidato_nome', 'Teste Automático Reprovado')
    logB.set('candidato_email', 'teste.reprovado.e2e@exemplo.com')
    logB.set('vaga_titulo', vagaBackend.getString('titulo'))
    logB.set('assunto', 'Candidatura Recebida: ' + vagaBackend.getString('titulo'))
    logB.set('status_envio', 'Enviado')
    logB.set(
      'mensagem_resumo',
      'Confirmação de recebimento inicial de candidatura via Página de Carreira pública.',
    )
    logB.set('data_envio', agoraIso)
    app.save(logB)
  },
  (app) => {
    // rollback
  },
)
