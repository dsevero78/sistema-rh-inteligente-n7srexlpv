// ============================================================================
// Hook: Programa de Indicação de Talentos
// Promotores (NPS 9-10) convidam e indicam novos profissionais para vagas ativas
//
// Rotas Públicas (sem login):
// - GET  /backend/v1/public/indicar/{token} -> Valida elegibilidade do indicador e lista vagas ativas
// - POST /backend/v1/public/indicar/{token} -> Submete nova indicação de talento
//
// Rotas Autenticadas (RH):
// - GET  /backend/v1/indicacoes/metricas -> KPIs e contadores de conversão e promotores
// - POST /backend/v1/indicacoes/{id}/converter -> Converte indicação em Candidato + Pipeline em Triagem
// - POST /backend/v1/indicacoes/{id}/recusar -> Recusa indicação com justificativa
// - POST /backend/v1/indicacoes/gerar-link -> Gera ou recupera token_indicador para candidato promotor
// ============================================================================

// 1. Consulta Pública do Indicador e Vagas Ativas
routerAdd('GET', '/backend/v1/public/indicar/{token}', (e) => {
  try {
    const token = (e.request.pathValue('token') || '').trim()
    if (!token) {
      return e.json(400, { error: 'Token de indicação não fornecido.' })
    }

    // Buscar avaliação promotora com este token_indicador ou derivado
    let avaliacao = null
    try {
      const avals = $app.findRecordsByFilter(
        'avaliacoes_experiencia',
        "token_indicador = '" + token + "'",
        '-created',
        1,
        0,
      )
      if (avals && avals.length > 0) {
        avaliacao = avals[0]
      }
    } catch (_) {}

    // Fallback: tentar casar com token_pesquisa se veio como exp-...
    if (!avaliacao && token.startsWith('ind-')) {
      const tokenExp = 'exp-' + token.replace(/^ind-/, '')
      try {
        const avals = $app.findRecordsByFilter(
          'avaliacoes_experiencia',
          "token_pesquisa = '" + tokenExp + "'",
          '-created',
          1,
          0,
        )
        if (avals && avals.length > 0) {
          avaliacao = avals[0]
        }
      } catch (_) {}
    }

    if (!avaliacao) {
      return e.json(404, {
        error:
          'Link de indicação não localizado ou inválido. Verifique o link enviado pelo nosso time.',
      })
    }

    // Verificar se o candidato é realmente promotor (NPS 9-10 ou nota geral 9-10)
    const nps = avaliacao.getInt('nps_score') || 0
    const notaGeral = avaliacao.getInt('nota_geral') || 0
    const respondido = avaliacao.getBool('respondido')

    if (!respondido || (nps < 9 && notaGeral < 9)) {
      return e.json(403, {
        error:
          'O Programa de Indicação é exclusivo para candidatos promotores do nosso processo seletivo (NPS 9 ou 10).',
        naoElegivel: true,
      })
    }

    // Buscar o candidato indicador para saudação personalizada
    let indicadorNome = 'Talento Parceiro'
    let indicadorId = avaliacao.getString('candidato')
    try {
      const cand = $app.findRecordById('candidatos', indicadorId)
      if (cand) {
        indicadorNome = cand.getString('nome') || indicadorNome
      }
    } catch (_) {}

    // Listar vagas ativas e aprovadas pelo gestor
    const vagasRecords = $app.findRecordsByFilter(
      'vagas',
      "status = 'Ativa' && status_aprovacao_gestor = 'Aprovada pelo gestor'",
      '-created',
      50,
      0,
    )

    // Se nenhuma vaga tiver status_aprovacao_gestor explicitamente setado, pegar vagas ativas
    let vagasFinal = vagasRecords
    if (!vagasFinal || vagasFinal.length === 0) {
      vagasFinal = $app.findRecordsByFilter('vagas', "status = 'Ativa'", '-created', 50, 0)
    }

    const vagasDisponiveis = []
    for (let i = 0; i < vagasFinal.length; i++) {
      const v = vagasFinal[i]
      vagasDisponiveis.push({
        id: v.id,
        titulo: v.getString('titulo'),
        departamento: v.getString('departamento'),
        localizacao: v.getString('localizacao'),
        modalidade: v.getString('modalidade'),
        faixa_salarial: v.getString('faixa_salarial'),
        descricao: v.getString('descricao'),
        requisitos_obrigatorios: v.get('requisitos_obrigatorios') || [],
        requisitos_desejaveis: v.get('requisitos_desejaveis') || [],
        habilidades_tecnicas: v.get('habilidades_tecnicas') || [],
      })
    }

    // Contar indicações já feitas por este indicador
    let totalIndicadas = 0
    let totalConvertidas = 0
    try {
      const minhasInds = $app.findRecordsByFilter(
        'indicacoes',
        "indicador = '" + indicadorId + "'",
        '-created',
        100,
        0,
      )
      totalIndicadas = minhasInds.length
      totalConvertidas = minhasInds.filter(function (ind) {
        return ind.getString('status') === 'Convertida'
      }).length
    } catch (_) {}

    return e.json(200, {
      token: token,
      indicador: {
        id: indicadorId,
        nome: indicadorNome,
        nps: nps || notaGeral,
        total_indicadas: totalIndicadas,
        total_convertidas: totalConvertidas,
      },
      vagas: vagasDisponiveis,
    })
  } catch (err) {
    console.log('Erro ao carregar página de indicação pública:', err)
    return e.json(500, { error: err.message || 'Falha ao processar requisição.' })
  }
})

// 2. Submissão Pública de Nova Indicação (com upload de currículo e questionário opcional)
routerAdd('POST', '/backend/v1/public/indicar/{token}', (e) => {
  try {
    const token = (e.request.pathValue('token') || '').trim()
    const reqInfo = e.requestInfo()
    const body = reqInfo.body || {}

    if (!token) {
      return e.json(400, { error: 'Token de indicação obrigatório.' })
    }

    // 1. Validar elegibilidade do indicador
    let avaliacao = null
    try {
      const avals = $app.findRecordsByFilter(
        'avaliacoes_experiencia',
        "token_indicador = '" + token + "'",
        '-created',
        1,
        0,
      )
      if (avals && avals.length > 0) {
        avaliacao = avals[0]
      }
    } catch (_) {}

    if (!avaliacao && token.startsWith('ind-')) {
      const tokenExp = 'exp-' + token.replace(/^ind-/, '')
      try {
        const avals = $app.findRecordsByFilter(
          'avaliacoes_experiencia',
          "token_pesquisa = '" + tokenExp + "'",
          '-created',
          1,
          0,
        )
        if (avals && avals.length > 0) {
          avaliacao = avals[0]
        }
      } catch (_) {}
    }

    if (!avaliacao) {
      return e.json(404, { error: 'Indicador não localizado pelo token informado.' })
    }

    const nps = avaliacao.getInt('nps_score') || 0
    const notaGeral = avaliacao.getInt('nota_geral') || 0
    if (nps < 9 && notaGeral < 9) {
      return e.json(403, { error: 'Indicador não possui perfil de promotor elegível (NPS 9-10).' })
    }

    const indicadorId = avaliacao.getString('candidato')
    let indicadorCand = null
    try {
      indicadorCand = $app.findRecordById('candidatos', indicadorId)
    } catch (_) {}

    // 2. Extrair dados da pessoa indicada
    const indicadoNome = (body.indicado_nome || body.nome || '').trim()
    const indicadoEmail = (body.indicado_email || body.email || '').trim().toLowerCase()
    const indicadoTelefone = (body.indicado_telefone || body.telefone || '').trim()
    const indicadoLinkedin = (body.indicado_linkedin || body.linkedin || '').trim()
    const vagaId = (body.vagaId || body.vaga || '').trim()
    const mensagemIndicador = (body.mensagem_indicador || body.mensagem || '').trim()

    // Validação de consentimento LGPD obrigatório
    const consentimentoLgpd =
      body.consentimento_lgpd === true ||
      body.consentimento_lgpd === 'true' ||
      body.consentimento_lgpd === 1 ||
      body.consentimento_lgpd === '1'

    if (!consentimentoLgpd) {
      return e.json(400, {
        error:
          'É obrigatório declarar o consentimento para o tratamento dos dados do profissional indicado conforme a LGPD.',
      })
    }

    if (!indicadoNome || !indicadoEmail || !vagaId) {
      return e.json(400, {
        error: 'Nome do indicado, e-mail e seleção de vaga são obrigatórios.',
      })
    }

    if (!indicadoEmail.includes('@') || !indicadoEmail.includes('.')) {
      return e.json(400, { error: 'Informe um e-mail válido para a pessoa indicada.' })
    }

    // 3. Validar vaga
    let vagaRec = null
    try {
      vagaRec = $app.findRecordById('vagas', vagaId)
    } catch (_) {}

    if (!vagaRec || vagaRec.getString('status') !== 'Ativa') {
      return e.json(400, { error: 'A vaga escolhida não está ativa no momento.' })
    }

    // 4. Anti-duplicidade na mesma vaga
    try {
      const duplicada = $app.findRecordsByFilter(
        'indicacoes',
        "indicado_email = '" +
          indicadoEmail +
          "' && vaga = '" +
          vagaId +
          "' && status != 'Recusada'",
        '-created',
        1,
        0,
      )
      if (duplicada && duplicada.length > 0) {
        return e.json(409, {
          error:
            'Este profissional já foi indicado para esta vaga recentemente e está em nosso funil de Gente & Gestão.',
        })
      }
    } catch (_) {}

    // 5. Parse das respostas de triagem (se fornecidas)
    let respostasTriagem = []
    try {
      if (typeof body.respostas_triagem === 'string') {
        respostasTriagem = JSON.parse(body.respostas_triagem)
      } else if (Array.isArray(body.respostas_triagem)) {
        respostasTriagem = body.respostas_triagem
      }
    } catch (_) {}

    // 6. Criar registro na coleção 'indicacoes'
    const indicacoesCol = $app.findCollectionByNameOrId('indicacoes')
    const novaIndicacao = new Record(indicacoesCol)
    novaIndicacao.set('token_indicador', token)
    novaIndicacao.set('indicador', indicadorId)
    novaIndicacao.set('vaga', vagaId)
    novaIndicacao.set('indicado_nome', indicadoNome)
    novaIndicacao.set('indicado_email', indicadoEmail)
    novaIndicacao.set('indicado_telefone', indicadoTelefone)
    novaIndicacao.set('indicado_linkedin', indicadoLinkedin)
    novaIndicacao.set('mensagem_indicador', mensagemIndicador)
    novaIndicacao.set('status', 'Nova')

    const clientIp =
      reqInfo.headers['x-forwarded-for'] || reqInfo.headers['x-real-ip'] || 'Web Pública'
    const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
    novaIndicacao.set('consentimento_lgpd', true)
    novaIndicacao.set('consentimento_lgpd_data', agoraIso)
    novaIndicacao.set('consentimento_lgpd_ip', String(clientIp).split(',')[0].trim())

    if (respostasTriagem.length > 0) {
      novaIndicacao.set('respostas_triagem', respostasTriagem)
    }

    // Anexo de currículo (se enviado via multipart)
    const files = reqInfo.files || {}
    const curriculoFile = files.curriculo || files.file
    if (curriculoFile) {
      if (curriculoFile.size > 10 * 1024 * 1024) {
        return e.json(400, { error: 'O currículo deve ter até 10MB em formato PDF.' })
      }
      novaIndicacao.set('curriculo', curriculoFile)
    }

    $app.save(novaIndicacao)

    // 7. Notificação no sino do RH (coleção alertas)
    try {
      const alertasCol = $app.findCollectionByNameOrId('alertas')
      const alertaRec = new Record(alertasCol)
      alertaRec.set('vaga', vagaId)
      alertaRec.set('score', 90)
      alertaRec.set('tipo', 'indicacao_recebida')
      alertaRec.set('status', 'Novo')
      const nomeIndicadorStr = indicadorCand ? indicadorCand.getString('nome') : 'Promotor NPS'
      alertaRec.set(
        'resumo_ia',
        'Nova Indicação Recebida: ' +
          indicadoNome +
          ' foi indicado(a) por ' +
          nomeIndicadorStr +
          ' para a vaga ' +
          vagaRec.getString('titulo') +
          '. Justificativa: "' +
          (mensagemIndicador ? mensagemIndicador.substring(0, 120) : 'Sem mensagem') +
          '..."',
      )
      alertaRec.set('criado_em', agoraIso)
      $app.save(alertaRec)
    } catch (alertaErr) {
      console.log('Aviso ao registrar alerta de indicação:', alertaErr)
    }

    // 8. E-mail de confirmação cordial ao indicador (agradecendo)
    try {
      if (indicadorCand && indicadorCand.getString('email')) {
        const mailClient = $app.newMailClient()
        const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
        const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'
        const indEmail = indicadorCand.getString('email')
        const indNome = indicadorCand.getString('nome') || 'Parceiro(a)'
        const vagaNome = vagaRec.getString('titulo')

        const html =
          '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
          '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
          '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
          '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Programa de Indicação de Talentos</p>' +
          '</div>' +
          '<p style="color: #334155; font-size: 15px; line-height: 1.6;">Olá, <strong>' +
          indNome +
          '</strong>!</p>' +
          '<p style="color: #334155; font-size: 14px; line-height: 1.6;">Recebemos com muito entusiasmo sua indicação de <strong>' +
          indicadoNome +
          '</strong> para a vaga de <strong>' +
          vagaNome +
          '</strong>.</p>' +
          '<p style="color: #334155; font-size: 14px; line-height: 1.6;">Como você avaliou nosso processo de forma tão positiva (promotor de nossa marca empregadora), a opinião e o seu selo de confiança têm peso prioritário em nossa triagem.</p>' +
          '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 20px 0;">' +
          '<p style="margin: 0; font-size: 13px; color: #475569;"><strong>Profissional Indicado:</strong> ' +
          indicadoNome +
          ' (' +
          indicadoEmail +
          ')</p>' +
          '<p style="margin: 6px 0 0 0; font-size: 13px; color: #475569;"><strong>Status:</strong> Em avaliação inicial pelo time de Gente & Gestão</p>' +
          '</div>' +
          '<p style="color: #64748b; font-size: 12px; line-height: 1.5;">Você receberá notificações sempre que a indicação evoluir pelas etapas do nosso processo seletivo.</p>' +
          '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Com carinho,<br><strong>Equipe de Gente & Gestão</strong></p>' +
          '</div>'

        const msg = new MailerMessage({
          from: { address: senderAddress, name: senderName },
          to: [{ address: indEmail }],
          subject: 'Obrigado pela sua indicação: ' + indicadoNome + ' (' + vagaNome + ')',
          html: html,
        })
        mailClient.send(msg)

        // Registrar no log
        try {
          const logsCol = $app.findCollectionByNameOrId('logs_emails_status')
          const logRec = new Record(logsCol)
          logRec.set('candidato', indicadorId)
          logRec.set('vaga', vagaId)
          logRec.set('estagio', 'Candidatura Recebida')
          logRec.set('candidato_nome', indNome)
          logRec.set('candidato_email', indEmail)
          logRec.set('vaga_titulo', vagaNome)
          logRec.set(
            'assunto',
            'Obrigado pela sua indicação: ' + indicadoNome + ' (' + vagaNome + ')',
          )
          logRec.set('status_envio', 'Enviado')
          logRec.set(
            'mensagem_resumo',
            'Agradecimento de indicação ao promotor ' +
              indNome +
              ' pela indicação de ' +
              indicadoNome,
          )
          logRec.set('data_envio', agoraIso)
          $app.save(logRec)
        } catch (_) {}
      }
    } catch (mailIndErr) {
      console.log('Aviso ao enviar e-mail de agradecimento ao indicador:', mailIndErr)
    }

    return e.json(200, {
      success: true,
      message:
        'Indicação enviada com sucesso! Agradecemos muito por compartilhar talentos conosco.',
      id: novaIndicacao.id,
      indicado: indicadoNome,
      vaga: vagaRec.getString('titulo'),
    })
  } catch (err) {
    console.log('Erro ao salvar indicação:', err)
    return e.json(500, { error: err.message || 'Falha ao gravar indicação.' })
  }
})

// 3. Métricas Consolidadas do Programa de Indicação (RH)
routerAdd(
  'GET',
  '/backend/v1/indicacoes/metricas',
  (e) => {
    try {
      const records = $app.findRecordsByFilter('indicacoes', '', '-created', 500, 0)
      const totalRecebidas = records.length
      let novas = 0
      let emAvaliacao = 0
      let convertidas = 0
      let recusadas = 0

      const indicadoresSet = {}
      for (let i = 0; i < records.length; i++) {
        const r = records[i]
        const st = r.getString('status')
        const ind = r.getString('indicador')
        if (ind) indicadoresSet[ind] = true

        if (st === 'Nova') novas++
        else if (st === 'Em avaliação') emAvaliacao++
        else if (st === 'Convertida') convertidas++
        else if (st === 'Recusada') recusadas++
      }

      const indicadoresAtivos = Object.keys(indicadoresSet).length
      const taxaConversao =
        totalRecebidas > 0 ? Math.round((convertidas / totalRecebidas) * 100) : 0

      // Promotores elegíveis (avaliacoes_experiencia com nota >= 9)
      let promotoresElegiveis = 0
      try {
        const promotores = $app.findRecordsByFilter(
          'avaliacoes_experiencia',
          'nps_score >= 9 || nota_geral >= 9',
          '-created',
          500,
          0,
        )
        promotoresElegiveis = promotores.length
      } catch (_) {}

      return e.json(200, {
        kpis: {
          total_recebidas: totalRecebidas,
          novas: novas,
          em_avaliacao: emAvaliacao,
          convertidas: convertidas,
          recusadas: recusadas,
          taxa_conversao: taxaConversao,
          indicadores_ativos: indicadoresAtivos,
          promotores_elegiveis: promotoresElegiveis,
          pendentes_contato: novas + emAvaliacao,
        },
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao gerar métricas de indicação' })
    }
  },
  $apis.requireAuth(),
)

// 4. Aceitar e Converter Indicação em Candidato + Pipeline em Triagem (RH)
routerAdd(
  'POST',
  '/backend/v1/indicacoes/{id}/converter',
  (e) => {
    try {
      const id = e.request.pathValue('id')
      const indicacao = $app.findRecordById('indicacoes', id)
      if (!indicacao) {
        return e.json(404, { error: 'Indicação não encontrada.' })
      }

      if (indicacao.getString('status') === 'Convertida') {
        return e.json(200, {
          success: true,
          jaConvertida: true,
          message: 'Esta indicação já havia sido convertida.',
          candidatoId: indicacao.getString('candidato_gerado'),
        })
      }

      const indicadoNome = indicacao.getString('indicado_nome')
      const indicadoEmail = indicacao.getString('indicado_email')
      const indicadoTelefone = indicacao.getString('indicado_telefone')
      const indicadoLinkedin = indicacao.getString('indicado_linkedin')
      const vagaId = indicacao.getString('vaga')
      const indicadorId = indicacao.getString('indicador')
      const mensagemIndicador = indicacao.getString('mensagem_indicador')

      // Buscar vaga e indicador
      let vagaRec = null
      let indicadorCand = null
      try {
        vagaRec = $app.findRecordById('vagas', vagaId)
      } catch (_) {}
      try {
        indicadorCand = $app.findRecordById('candidatos', indicadorId)
      } catch (_) {}

      const vagaTitulo = vagaRec ? vagaRec.getString('titulo') : 'Posição em Aberto'
      const nomeIndicador = indicadorCand ? indicadorCand.getString('nome') : 'Promotor do Programa'

      // 1. Criar ou atualizar registro em 'candidatos'
      const candCol = $app.findCollectionByNameOrId('candidatos')
      let candidatoRecord = null
      try {
        candidatoRecord = $app.findFirstRecordByData('candidatos', 'email', indicadoEmail)
      } catch (_) {}

      if (!candidatoRecord) {
        candidatoRecord = new Record(candCol)
        candidatoRecord.set('email', indicadoEmail)
      }

      candidatoRecord.set('nome', indicadoNome)
      if (indicadoTelefone) candidatoRecord.set('telefone', indicadoTelefone)
      if (indicadoLinkedin) candidatoRecord.set('linkedin', indicadoLinkedin)
      candidatoRecord.set('vaga', vagaId)
      candidatoRecord.set('status', 'Triagem')
      candidatoRecord.set('canal_origem', 'Indicação')
      candidatoRecord.set('score_semantico', 88)
      candidatoRecord.set(
        'resumo',
        'Profissional indicado(a) por ' +
          nomeIndicador +
          ' através do Programa de Indicação de Promotores. Justificativa: "' +
          mensagemIndicador +
          '"',
      )
      candidatoRecord.set('consentimento_lgpd', true)
      candidatoRecord.set(
        'consentimento_lgpd_data',
        new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z',
      )
      candidatoRecord.set(
        'consentimento_lgpd_ip',
        indicacao.getString('consentimento_lgpd_ip') || 'Origem Indicação',
      )

      // Se houver currículo na indicação, repassar
      const curriculoArquivo = indicacao.getString('curriculo')
      if (curriculoArquivo) {
        candidatoRecord.set('curriculo', curriculoArquivo)
      }

      $app.save(candidatoRecord)

      // 2. Criar ou sincronizar o pipeline em Triagem
      const pipeCol = $app.findCollectionByNameOrId('pipeline')
      let pipeRecord = null
      try {
        const plist = $app.findRecordsByFilter(
          'pipeline',
          "candidato = '" + candidatoRecord.id + "' && vaga = '" + vagaId + "'",
          '-created',
          1,
          0,
        )
        if (plist && plist.length > 0) {
          pipeRecord = plist[0]
        }
      } catch (_) {}

      const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
      if (!pipeRecord) {
        pipeRecord = new Record(pipeCol)
        pipeRecord.set('candidato', candidatoRecord.id)
        pipeRecord.set('vaga', vagaId)
        pipeRecord.set('estagio', 'Triagem')
        pipeRecord.set(
          'anotacoes',
          'Candidato proveniente do Programa de Indicação. Indicado por: ' +
            nomeIndicador +
            '. Justificativa: ' +
            mensagemIndicador,
        )
        pipeRecord.set('historico', [
          {
            data: agoraIso,
            estagio: 'Triagem',
            autor: 'Programa de Indicação (RH)',
            nota: 'Indicação aceita e convertida no pipeline de seleção em Triagem.',
          },
        ])
      } else {
        pipeRecord.set('estagio', 'Triagem')
        const hist = pipeRecord.get('historico') || []
        hist.push({
          data: agoraIso,
          estagio: 'Triagem',
          autor: 'Programa de Indicação (RH)',
          nota: 'Indicação convertida em Triagem.',
        })
        pipeRecord.set('historico', hist)
      }
      $app.save(pipeRecord)

      // 3. Atualizar a indicação para Convertida
      indicacao.set('status', 'Convertida')
      indicacao.set('candidato_gerado', candidatoRecord.id)
      $app.save(indicacao)

      // 4. Enviar E-mail ao Indicador ("Sua indicação foi aceita!")
      let emailIndicadorEnviado = false
      if (indicadorCand && indicadorCand.getString('email')) {
        try {
          const mailClient = $app.newMailClient()
          const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
          const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'
          const indEmail = indicadorCand.getString('email')
          const assuntoInd = 'Ótima notícia! Sua indicação de ' + indicadoNome + ' foi aceita!'

          const htmlInd =
            '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
            '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
            '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
            '<p style="color: #38bdf8; margin: 4px 0 0 0; font-size: 13px;">Programa de Indicação · Conexão Aceita</p>' +
            '</div>' +
            '<p style="color: #334155; font-size: 15px; line-height: 1.6;">Olá, <strong>' +
            nomeIndicador +
            '</strong>!</p>' +
            '<p style="color: #334155; font-size: 14px; line-height: 1.6;">Temos o prazer de informar que sua indicação de <strong>' +
            indicadoNome +
            '</strong> para a posição de <strong>' +
            vagaTitulo +
            '</strong> foi analisada e <strong>aceita</strong> pela nossa equipe de Recrutamento & Seleção!</p>' +
            '<div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 18px; margin: 20px 0;">' +
            '<h3 style="color: #065f46; margin: 0 0 8px 0; font-size: 14px;">✓ Entrada Oficial no Funil de Seleção</h3>' +
            '<p style="margin: 0; color: #047857; font-size: 13px;">O perfil agora está ativo no estágio de <strong>Triagem</strong> e entra em contato prioritário com nosso time de People.</p>' +
            '<p style="margin: 8px 0 0 0; color: #065f46; font-size: 12px;">Você acumulou reconhecimento em nossa base de promotores de marca empregadora!</p>' +
            '</div>' +
            '<p style="color: #64748b; font-size: 12px; line-height: 1.5;">Manteremos você atualizado conforme as etapas avançarem. Muito obrigado pela confiança!</p>' +
            '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Equipe de Gente & Gestão</strong></p>' +
            '</div>'

          const msgInd = new MailerMessage({
            from: { address: senderAddress, name: senderName },
            to: [{ address: indEmail }],
            subject: assuntoInd,
            html: htmlInd,
          })
          mailClient.send(msgInd)
          emailIndicadorEnviado = true

          // Registrar log
          const logsCol = $app.findCollectionByNameOrId('logs_emails_status')
          const logRec = new Record(logsCol)
          logRec.set('candidato', indicadorId)
          logRec.set('vaga', vagaId)
          logRec.set('estagio', 'Triagem')
          logRec.set('candidato_nome', nomeIndicador)
          logRec.set('candidato_email', indEmail)
          logRec.set('vaga_titulo', vagaTitulo)
          logRec.set('assunto', assuntoInd)
          logRec.set('status_envio', 'Enviado')
          logRec.set(
            'mensagem_resumo',
            'Notificação de conversão de indicação enviada ao indicador ' +
              nomeIndicador +
              ' para ' +
              indicadoNome,
          )
          logRec.set('data_envio', agoraIso)
          $app.save(logRec)
        } catch (mErr) {
          console.log('Aviso ao enviar e-mail de conversão ao indicador:', mErr)
        }
      }

      // 5. Enviar E-mail ao Indicado (Apresentação cordial de contato)
      let emailIndicadoEnviado = false
      if (indicadoEmail) {
        try {
          const mailClient = $app.newMailClient()
          const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
          const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'
          const assuntoCand =
            'Você foi indicado(a) para uma oportunidade em nosso time: ' + vagaTitulo

          const htmlCand =
            '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
            '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
            '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
            '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Oportunidade Profissional</p>' +
            '</div>' +
            '<p style="color: #334155; font-size: 15px; line-height: 1.6;">Olá, <strong>' +
            indicadoNome +
            '</strong>!</p>' +
            '<p style="color: #334155; font-size: 14px; line-height: 1.6;">Você recebeu uma indicação carinhosa de <strong>' +
            nomeIndicador +
            '</strong> para participar do processo seletivo da posição de <strong>' +
            vagaTitulo +
            '</strong>.</p>' +
            '<p style="color: #334155; font-size: 14px; line-height: 1.6;">Nossa equipe de Gente & Gestão recebeu seu perfil e ficará muito honrada em conversar com você para apresentar a empresa, os desafios do projeto e conhecer melhor sua trajetória.</p>' +
            '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0;">' +
            '<p style="margin: 0; color: #1e293b; font-size: 14px;"><strong>Vaga:</strong> ' +
            vagaTitulo +
            '</p>' +
            '<p style="margin: 6px 0 0 0; color: #64748b; font-size: 13px;"><strong>Estágio:</strong> Triagem e Primeiro Contato</p>' +
            '</div>' +
            '<p style="color: #64748b; font-size: 12px; line-height: 1.5;">Em breve entraremos em contato via e-mail ou WhatsApp para combinarmos um papo inicial sem compromisso.</p>' +
            '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Equipe de Gente & Gestão</strong></p>' +
            '</div>'

          const msgCand = new MailerMessage({
            from: { address: senderAddress, name: senderName },
            to: [{ address: indicadoEmail }],
            subject: assuntoCand,
            html: htmlCand,
          })
          mailClient.send(msgCand)
          emailIndicadoEnviado = true

          // Registrar log
          const logsCol = $app.findCollectionByNameOrId('logs_emails_status')
          const logRec = new Record(logsCol)
          logRec.set('candidato', candidatoRecord.id)
          logRec.set('vaga', vagaId)
          logRec.set('estagio', 'Candidatura Recebida')
          logRec.set('candidato_nome', indicadoNome)
          logRec.set('candidato_email', indicadoEmail)
          logRec.set('vaga_titulo', vagaTitulo)
          logRec.set('assunto', assuntoCand)
          logRec.set('status_envio', 'Enviado')
          logRec.set(
            'mensagem_resumo',
            'Primeiro contato enviado ao indicado ' +
              indicadoNome +
              ' via indicação de ' +
              nomeIndicador,
          )
          logRec.set('data_envio', agoraIso)
          $app.save(logRec)
        } catch (mErr2) {
          console.log('Aviso ao enviar e-mail ao indicado:', mErr2)
        }
      }

      return e.json(200, {
        success: true,
        message: 'Indicação convertida em candidatura no pipeline com sucesso!',
        candidatoId: candidatoRecord.id,
        emailIndicadorEnviado: emailIndicadorEnviado,
        emailIndicadoEnviado: emailIndicadoEnviado,
      })
    } catch (err) {
      console.log('Erro ao converter indicação:', err)
      return e.json(500, { error: err.message || 'Falha ao converter indicação' })
    }
  },
  $apis.requireAuth(),
)

// 5. Recusar Indicação com Motivo (RH)
routerAdd(
  'POST',
  '/backend/v1/indicacoes/{id}/recusar',
  (e) => {
    try {
      const id = e.request.pathValue('id')
      const body = e.requestInfo().body || {}
      const motivo = (body.motivo || 'Perfil incompatível com o momento da vaga').trim()

      const indicacao = $app.findRecordById('indicacoes', id)
      if (!indicacao) {
        return e.json(404, { error: 'Indicação não encontrada.' })
      }

      indicacao.set('status', 'Recusada')
      indicacao.set('motivo_recusa', motivo)
      $app.save(indicacao)

      return e.json(200, {
        success: true,
        message: 'Indicação recusada e arquivada.',
        motivo: motivo,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao recusar indicação' })
    }
  },
  $apis.requireAuth(),
)

// 6. Gerar ou Obter Token de Indicação para Candidato Promotor (RH)
routerAdd(
  'POST',
  '/backend/v1/indicacoes/gerar-link',
  (e) => {
    try {
      const body = e.requestInfo().body || {}
      const avaliacaoId = (body.avaliacaoId || '').trim()
      const candidatoId = (body.candidatoId || '').trim()

      let avaliacao = null
      if (avaliacaoId) {
        avaliacao = $app.findRecordById('avaliacoes_experiencia', avaliacaoId)
      } else if (candidatoId) {
        const avals = $app.findRecordsByFilter(
          'avaliacoes_experiencia',
          "candidato = '" + candidatoId + "'",
          '-created',
          1,
          0,
        )
        if (avals && avals.length > 0) avaliacao = avals[0]
      }

      if (!avaliacao) {
        return e.json(404, { error: 'Avaliação de experiência não encontrada.' })
      }

      const nps = avaliacao.getInt('nps_score') || 0
      const notaGeral = avaliacao.getInt('nota_geral') || 0
      if (nps < 9 && notaGeral < 9) {
        return e.json(400, {
          error:
            'Apenas candidatos promotores (NPS 9-10) são elegíveis a receber o link do Programa de Indicação.',
        })
      }

      let token = avaliacao.getString('token_indicador')
      if (!token) {
        const base =
          avaliacao.getString('token_pesquisa') || $security.randomString(16).toLowerCase()
        token = 'ind-' + base.replace(/^exp-/, '')
        avaliacao.set('token_indicador', token)
        $app.save(avaliacao)
      }

      const linkPublico = '/indicar/' + token

      return e.json(200, {
        success: true,
        token: token,
        link: linkPublico,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao gerar link de indicação' })
    }
  },
  $apis.requireAuth(),
)
