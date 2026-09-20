// ============================================================================
// Hook: Onboarding do Contratado
// - Rota: POST /backend/v1/onboarding/iniciar
//   Cria o onboarding com template de checklist padronizado em pt-BR,
//   calcula o percentual_conclusao inicial e dispara o e-mail caloroso de boas-vindas
//   com log em 'logs_emails_status'
// - Hook de modelo: onRecordBeforeSave('onboardings')
//   Recalcula automaticamente percentual_conclusao a partir dos itens json
// ============================================================================

// 1. Recálculo automático do percentual ao salvar qualquer onboarding
onRecordBeforeSave((e) => {
  try {
    const rec = e.record
    const itens = rec.get('itens') || []
    if (Array.isArray(itens) && itens.length > 0) {
      let concluidos = 0
      for (let i = 0; i < itens.length; i++) {
        if (itens[i].concluido === true) {
          concluidos++
        }
      }
      const perc = Math.round((concluidos / itens.length) * 100)
      rec.set('percentual_conclusao', perc)

      // Se atingir 100% e estiver ativo, sugerir Concluído
      if (perc === 100 && rec.getString('status') === 'Ativo') {
        rec.set('status', 'Concluído')
      }
    }
  } catch (err) {
    console.log('Erro ao calcular percentual de onboarding:', err)
  }
  return e.next()
}, 'onboardings')

// 2. Rota de criação e disparo de boas-vindas
routerAdd(
  'POST',
  '/backend/v1/onboarding/iniciar',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const candidatoId = (body.candidatoId || '').trim()
      const vagaId = (body.vagaId || '').trim()
      const dataAdmissao = (body.dataAdmissao || '').trim()
      const itensPersonalizados = body.itens || null

      if (!candidatoId) {
        return e.json(400, { error: 'candidatoId é obrigatório' })
      }

      const candidato = $app.findRecordById('candidatos', candidatoId)
      if (!candidato) {
        return e.json(404, { error: 'Candidato não encontrado' })
      }

      const resolvedVagaId = vagaId || candidato.getString('vaga')
      if (!resolvedVagaId) {
        return e.json(400, { error: 'Vaga é obrigatória' })
      }

      const vaga = $app.findRecordById('vagas', resolvedVagaId)
      if (!vaga) {
        return e.json(404, { error: 'Vaga não encontrada' })
      }

      // Verificar se já existe onboarding ativo para este candidato
      let onboardingExistente = null
      try {
        const jaExiste = $app.findRecordsByFilter(
          'onboardings',
          "candidato = '" + candidatoId + "' && status != 'Cancelado'",
          '-created',
          1,
          0,
        )
        if (jaExiste && jaExiste.length > 0) {
          onboardingExistente = jaExiste[0]
        }
      } catch (_) {}

      if (onboardingExistente) {
        return e.json(200, {
          success: true,
          message: 'Onboarding já existente para este candidato',
          onboardingId: onboardingExistente.id,
          onboarding: onboardingExistente,
        })
      }

      // Template padrão de checklist em pt-BR
      const candNome = candidato.getString('nome') || 'Novo Colaborador'
      const candEmail = candidato.getString('email') || ''
      const vagaTitulo = vaga.getString('titulo') || 'Cargo'

      const itensPadrao = itensPersonalizados || [
        // Documentos
        {
          id: 'doc-1',
          titulo: 'Cópia do RG e CPF / CNH Digital',
          categoria: 'Documentos',
          responsavel: candNome + ' (Contratado)',
          prazo: '',
          concluido: false,
          observacao: 'Frente e verso nítidos.',
        },
        {
          id: 'doc-2',
          titulo: 'Comprovante de residência atualizado (últimos 90 dias)',
          categoria: 'Documentos',
          responsavel: candNome + ' (Contratado)',
          prazo: '',
          concluido: false,
          observacao: 'Conta de consumo recente.',
        },
        {
          id: 'doc-3',
          titulo: 'Carteira de Trabalho Digital (CTPS) e qualificação cadastral eSocial',
          categoria: 'Documentos',
          responsavel: candNome + ' (Contratado)',
          prazo: '',
          concluido: false,
          observacao: 'PDF emitido pelo app da CTPS Digital.',
        },
        {
          id: 'doc-4',
          titulo: 'Agendamento e realização do Exame Admissional (ASO)',
          categoria: 'Documentos',
          responsavel: 'Equipe de Gente & Gestão (RH)',
          prazo: '',
          concluido: false,
          observacao: 'Atestado de Saúde Ocupacional com clínica credenciada.',
        },
        {
          id: 'doc-5',
          titulo: 'Dados bancários para folha de pagamento (Conta Corrente)',
          categoria: 'Documentos',
          responsavel: candNome + ' (Contratado)',
          prazo: '',
          concluido: false,
          observacao: 'Comprovante de titularidade bancária.',
        },

        // Acesso & Sistemas
        {
          id: 'sis-1',
          titulo: 'Criação de e-mail corporativo e credenciais no SSO',
          categoria: 'Acesso & Sistemas',
          responsavel: 'TI Corporativa',
          prazo: '',
          concluido: false,
          observacao: 'Conta Google Workspace / Microsoft 365.',
        },
        {
          id: 'sis-2',
          titulo: 'Concessão de acessos aos sistemas do cargo (Slack, Jira, GitHub, ATS)',
          categoria: 'Acesso & Sistemas',
          responsavel: 'TI Corporativa & Gestor',
          prazo: '',
          concluido: false,
          observacao: 'Permissões específicas do departamento.',
        },
        {
          id: 'sis-3',
          titulo: 'Configuração e envio do notebook de trabalho e periféricos',
          categoria: 'Acesso & Sistemas',
          responsavel: 'Facilities & Logística',
          prazo: '',
          concluido: false,
          observacao: 'Rastreio informado ao colaborador.',
        },

        // Primeiros Dias
        {
          id: 'day-1',
          titulo: 'Boas-vindas institucionais e apresentação à equipe',
          categoria: 'Primeiros Dias',
          responsavel: 'Douglas Severo (RH)',
          prazo: '',
          concluido: false,
          observacao: 'Reunião virtual de acolhimento no primeiro dia.',
        },
        {
          id: 'day-2',
          titulo: 'Reunião de alinhamento de expectativas e metas com o Gestor',
          categoria: 'Primeiros Dias',
          responsavel: 'Gestor Contratante',
          prazo: '',
          concluido: false,
          observacao: 'Definição dos objetivos dos primeiros 30/60/90 dias.',
        },
        {
          id: 'day-3',
          titulo: 'Entrega do kit de boas-vindas da empresa (Welcome Kit)',
          categoria: 'Primeiros Dias',
          responsavel: 'People Experience',
          prazo: '',
          concluido: false,
          observacao: 'Swag institucional e carta do CEO.',
        },

        // Treinamento
        {
          id: 'tre-1',
          titulo: 'Trilha de Onboarding Cultural, Governança e Compliance',
          categoria: 'Treinamento',
          responsavel: 'Gente & Gestão',
          prazo: '',
          concluido: false,
          observacao: 'Código de Conduta, Segurança da Informação e Valores.',
        },
        {
          id: 'tre-2',
          titulo: 'Treinamento técnico e processos do time (Buddy & Shadowing)',
          categoria: 'Treinamento',
          responsavel: 'Gestor & Time',
          prazo: '',
          concluido: false,
          observacao: 'Acompanhamento com mentor nas duas primeiras semanas.',
        },
      ]

      const onbCol = $app.findCollectionByNameOrId('onboardings')
      const onbRecord = new Record(onbCol)
      onbRecord.set('candidato', candidatoId)
      onbRecord.set('vaga', resolvedVagaId)
      if (dataAdmissao) {
        onbRecord.set('data_admissao', dataAdmissao)
      }
      onbRecord.set('status', 'Ativo')
      onbRecord.set('percentual_conclusao', 0)
      onbRecord.set('itens', itensPadrao)
      $app.save(onbRecord)

      // Atualizar status do candidato para 'Aprovado' se ainda não for
      if (candidato.getString('status') !== 'Aprovado') {
        candidato.set('status', 'Aprovado')
        $app.save(candidato)
      }

      // Disparar E-mail Caloroso de Boas-vindas ao Contratado
      let emailEnviado = false
      if (candEmail) {
        try {
          const mailClient = $app.newMailClient()
          const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
          const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'

          const dataAdmFormatada = dataAdmissao
            ? new Date(dataAdmissao).toLocaleDateString('pt-BR')
            : 'a ser alinhada com nosso time'

          const html =
            '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
            '<div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 28px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
            '<span style="display: inline-block; background-color: #22c55e; color: #ffffff; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 10px; border-radius: 4px; margin-bottom: 8px;">Contratação Confirmada</span>' +
            '<h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800;">🎉 Parabéns e Boas-Vindas ao Time!</h1>' +
            '<p style="color: #cbd5e1; margin: 6px 0 0 0; font-size: 14px;">Gente & Gestão · Programa de Integração</p>' +
            '</div>' +
            '<p style="color: #334155; font-size: 15px; line-height: 1.6;">Olá, <strong>' +
            candNome +
            '</strong>!</p>' +
            '<p style="color: #334155; font-size: 14px; line-height: 1.6;">É com grande entusiasmo que oficializamos sua chegada para o time na posição de <strong>' +
            vagaTitulo +
            '</strong>!</p>' +
            '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px; margin: 20px 0;">' +
            '<h3 style="color: #1d4ed8; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Primeiros Passos do Seu Onboarding</h3>' +
            '<p style="margin: 0 0 8px 0; color: #1e293b; font-size: 14px;"><strong>Data Prevista de Início:</strong> ' +
            dataAdmFormatada +
            '</p>' +
            '<p style="margin: 0; color: #475569; font-size: 13px; line-height: 1.6;">' +
            'Nosso time de People já iniciou a preparação dos seus acessos, equipamentos e cronograma do Dia 1. Em breve, você receberá a lista detalhada para conferência de documentos e orientações da clínica para o exame admissional.' +
            '</p>' +
            '</div>' +
            '<div style="background-color: #f1f5f9; border-left: 4px solid #3b82f6; padding: 14px 16px; border-radius: 4px; margin: 20px 0;">' +
            '<p style="margin: 0; color: #1e293b; font-size: 13px; line-height: 1.5;"><strong>Dica:</strong> Se tiver qualquer dúvida sobre documentação ou benefícios, responda diretamente a esta mensagem ou procure nosso time de Gente & Gestão.</p>' +
            '</div>' +
            '<p style="color: #64748b; font-size: 12px; line-height: 1.5;">Estamos muito felizes em construir essa história com você!</p>' +
            '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Com carinho,<br><strong>Equipe de Gente & Gestão</strong></p>' +
            '</div>'

          const msg = new MailerMessage({
            from: { address: senderAddress, name: senderName },
            to: [{ address: candEmail }],
            subject: '🎉 Boas-vindas ao time! Início do seu Onboarding: ' + vagaTitulo,
            html: html,
          })

          mailClient.send(msg)
          emailEnviado = true
        } catch (sendErr) {
          console.log('Aviso ao enviar e-mail de onboarding para ' + candEmail + ':', sendErr)
        }

        // Registrar no log de auditoria
        try {
          const logsCol = $app.findCollectionByNameOrId('logs_emails_status')
          const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
          const logRec = new Record(logsCol)
          logRec.set('candidato', candidatoId)
          logRec.set('vaga', resolvedVagaId)
          logRec.set('estagio', 'Aprovado')
          logRec.set('candidato_nome', candNome)
          logRec.set('candidato_email', candEmail)
          logRec.set('vaga_titulo', vagaTitulo)
          logRec.set('assunto', '🎉 Boas-vindas ao time! Início do seu Onboarding: ' + vagaTitulo)
          logRec.set('status_envio', emailEnviado ? 'Enviado' : 'Falhou')
          logRec.set(
            'mensagem_resumo',
            'Boas-vindas institucionais e checklist de documentos e primeiros dias.',
          )
          logRec.set('data_envio', agoraIso)
          $app.save(logRec)
        } catch (logErr) {
          console.log('Aviso ao persistir log de auditoria do onboarding:', logErr)
        }
      }

      return e.json(200, {
        success: true,
        message: 'Onboarding iniciado com sucesso e e-mail de boas-vindas enviado!',
        onboardingId: onbRecord.id,
        emailEnviado: emailEnviado,
      })
    } catch (err) {
      console.log('Erro ao iniciar onboarding:', err)
      return e.json(500, { error: err.message || 'Falha ao iniciar onboarding' })
    }
  },
  $apis.requireAuth(),
)
