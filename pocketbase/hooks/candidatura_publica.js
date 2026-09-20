// ============================================================================
// Hook: Candidatura Pública (/backend/v1/public/candidatar)
// Endpoint público dedicado com suporte a multipart/form-data:
// - Dados cadastrais e LGPD do candidato
// - Anexo de currículo (PDF até 10MB)
// - Upload de vídeo (MP4/WebM/MOV até 100MB) ou link externo (Loom/YouTube/Drive)
// - Respostas do questionário de triagem com avaliação automática de eliminatórias
// - Criação do pipeline em 'Triagem' (ou 'Recusado' se descumprir eliminatória)
// - Origem registrada como "Página de Carreira"
// - Envio de confirmação de recebimento inicial
// ============================================================================

routerAdd('POST', '/backend/v1/public/candidatar', (e) => {
  try {
    const reqInfo = e.requestInfo()
    const body = reqInfo.body || {}

    // 1. Extração e validação de campos obrigatórios
    const nome = (body.nome || '').trim()
    const email = (body.email || '').trim().toLowerCase()
    const telefone = (body.telefone || '').trim()
    const vagaId = (body.vagaId || '').trim()
    const videoLink = (body.videoLink || '').trim()
    const linkedin = (body.linkedin || '').trim()
    const github = (body.github || '').trim()
    const cargoAtual = (body.cargoAtual || '').trim()
    const resumo = (body.resumo || '').trim()

    // LGPD
    const consentimentoLgpd =
      body.consentimento_lgpd === true ||
      body.consentimento_lgpd === 'true' ||
      body.consentimento_lgpd === 1 ||
      body.consentimento_lgpd === '1'

    if (!consentimentoLgpd) {
      return e.json(400, {
        error:
          'É obrigatório autorizar o tratamento de dados pessoais conforme a LGPD para prosseguir com a candidatura.',
      })
    }

    if (!nome || !email || !vagaId) {
      return e.json(400, {
        error: 'Nome completo, e-mail e vaga são campos obrigatórios.',
      })
    }

    // Validação básica de formato de e-mail
    if (!email.includes('@') || !email.includes('.')) {
      return e.json(400, {
        error: 'Por favor, informe um endereço de e-mail válido.',
      })
    }

    // 2. Validar se a vaga existe, está ativa e aberta a candidaturas
    let vagaRecord = null
    try {
      vagaRecord = $app.findRecordById('vagas', vagaId)
    } catch (_) {}

    if (!vagaRecord) {
      return e.json(404, { error: 'A vaga selecionada não foi encontrada ou foi encerrada.' })
    }

    const vagaStatus = vagaRecord.getString('status')
    if (vagaStatus !== 'Ativa') {
      return e.json(400, {
        error: 'Esta vaga não está recebendo novas candidaturas no momento.',
      })
    }

    // 3. Tratar e-mail duplicado de forma elegante e segura
    try {
      const candidatoExistente = $app.findFirstRecordByData('candidatos', 'email', email)
      if (candidatoExistente) {
        // Se já existe candidato com este e-mail nesta mesma vaga, informar cordialmente sem expor dados
        const vagaAtualDoCand = candidatoExistente.getString('vaga')
        if (vagaAtualDoCand === vagaId) {
          return e.json(409, {
            error:
              'Já identificamos uma candidatura com este e-mail para esta mesma vaga. Agradecemos seu interesse! Nosso time de Gente & Gestão entrará em contato pelos canais informados.',
            jaCandidatado: true,
          })
        }
      }
    } catch (_) {
      // E-mail livre — pode prosseguir
    }

    // 4. Parse das listas estruturadas (habilidades, experiências, respostas de triagem)
    let habilidades = []
    let competencias = []
    let experiencias = []
    let educacao = []
    let idiomas = []
    let respostasTriagem = []

    try {
      if (typeof body.habilidades_tecnicas === 'string') {
        habilidades = JSON.parse(body.habilidades_tecnicas)
      } else if (Array.isArray(body.habilidades_tecnicas)) {
        habilidades = body.habilidades_tecnicas
      }
    } catch (_) {}

    try {
      if (typeof body.competencias_comportamentais === 'string') {
        competencias = JSON.parse(body.competencias_comportamentais)
      } else if (Array.isArray(body.competencias_comportamentais)) {
        competencias = body.competencias_comportamentais
      }
    } catch (_) {}

    try {
      if (typeof body.experiencias === 'string') {
        experiencias = JSON.parse(body.experiencias)
      } else if (Array.isArray(body.experiencias)) {
        experiencias = body.experiencias
      }
    } catch (_) {}

    try {
      if (typeof body.educacao === 'string') {
        educacao = JSON.parse(body.educacao)
      } else if (Array.isArray(body.educacao)) {
        educacao = body.educacao
      }
    } catch (_) {}

    try {
      if (typeof body.idiomas === 'string') {
        idiomas = JSON.parse(body.idiomas)
      } else if (Array.isArray(body.idiomas)) {
        idiomas = body.idiomas
      }
    } catch (_) {}

    try {
      if (typeof body.respostas_triagem === 'string') {
        respostasTriagem = JSON.parse(body.respostas_triagem)
      } else if (Array.isArray(body.respostas_triagem)) {
        respostasTriagem = body.respostas_triagem
      }
    } catch (_) {}

    // 5. Avaliar Questionário de Triagem da Vaga (se houver perguntas eliminatórias)
    let questionarioRecord = null
    let perguntasDef = []
    try {
      const qList = $app.findRecordsByFilter(
        'questionarios_vaga',
        "vaga = '" + vagaId + "' && ativo = true",
        '-created',
        1,
        0,
      )
      if (qList && qList.length > 0) {
        questionarioRecord = qList[0]
        perguntasDef = questionarioRecord.get('perguntas') || []
      }
    } catch (errQ) {
      console.log('Aviso ao buscar questionário da vaga:', errQ)
    }

    let reprovadoAuto = false
    let motivoReprovacao = ''
    let eliminatoriasAtendidas = 0
    let totalPerguntas = perguntasDef.length || respostasTriagem.length
    const respostasProcessadas = []

    for (let i = 0; i < perguntasDef.length; i++) {
      const p = perguntasDef[i]
      const userRespObj = respostasTriagem.find(function (r) {
        return r.perguntaId === p.id
      })
      const valorResp = userRespObj ? userRespObj.resposta : null
      let atendeu = true
      let falhaMotivo = ''

      if (p.eliminatoria) {
        if (p.tipo === 'sim_nao') {
          const esperada = p.resposta_esperada || 'Sim'
          if (String(valorResp).toLowerCase() !== String(esperada).toLowerCase()) {
            atendeu = false
            falhaMotivo =
              p.mensagem_reprovacao ||
              'Não atendeu ao critério eliminatório: ' +
                p.enunciado +
                ' (Esperado: ' +
                esperada +
                ')'
          }
        } else if (p.tipo === 'numero') {
          const numVal = parseFloat(valorResp)
          if (isNaN(numVal)) {
            atendeu = false
            falhaMotivo = p.mensagem_reprovacao || 'Valor numérico obrigatório para: ' + p.enunciado
          } else {
            if (
              p.valor_minimo !== undefined &&
              p.valor_minimo !== null &&
              numVal < p.valor_minimo
            ) {
              atendeu = false
              falhaMotivo =
                p.mensagem_reprovacao ||
                'Valor abaixo do mínimo permitido (' + p.valor_minimo + ') para: ' + p.enunciado
            }
            if (
              p.valor_maximo !== undefined &&
              p.valor_maximo !== null &&
              numVal > p.valor_maximo
            ) {
              atendeu = false
              falhaMotivo =
                p.mensagem_reprovacao ||
                'Valor acima do máximo permitido (' + p.valor_maximo + ') para: ' + p.enunciado
            }
          }
        } else if (p.tipo === 'escolha_unica') {
          const validas = p.respostas_validas || []
          if (validas.length > 0 && !validas.includes(valorResp)) {
            atendeu = false
            falhaMotivo =
              p.mensagem_reprovacao ||
              'Opção selecionada incompatível com o critério eliminatório: ' + p.enunciado
          }
        }

        if (!atendeu) {
          reprovadoAuto = true
          if (!motivoReprovacao) {
            motivoReprovacao = 'Reprovado na triagem automática: ' + falhaMotivo
          }
        } else {
          eliminatoriasAtendidas++
        }
      } else {
        eliminatoriasAtendidas++
      }

      respostasProcessadas.push({
        perguntaId: p.id,
        pergunta: p.enunciado,
        tipo: p.tipo,
        resposta: valorResp,
        eliminatoria: !!p.eliminatoria,
        atendeu: atendeu,
      })
    }

    // 6. Criar ou atualizar o registro em 'candidatos'
    const candidatosCol = $app.findCollectionByNameOrId('candidatos')
    let candidatoRecord = null
    try {
      candidatoRecord = $app.findFirstRecordByData('candidatos', 'email', email)
    } catch (_) {}

    if (!candidatoRecord) {
      candidatoRecord = new Record(candidatosCol)
      candidatoRecord.set('email', email)
    }

    candidatoRecord.set('nome', nome)
    candidatoRecord.set('telefone', telefone)
    candidatoRecord.set('vaga', vagaId)
    candidatoRecord.set('cargo_atual', cargoAtual)
    candidatoRecord.set('linkedin', linkedin)
    candidatoRecord.set('github', github)
    candidatoRecord.set('resumo', resumo)
    candidatoRecord.set('habilidades_tecnicas', habilidades)
    candidatoRecord.set('competencias_comportamentais', competencias)
    candidatoRecord.set('experiencias', experiencias)
    candidatoRecord.set('educacao', educacao)
    candidatoRecord.set('idiomas', idiomas)

    // Canal de origem oficial: "Página de Carreira"
    candidatoRecord.set('canal_origem', 'Página de Carreira')

    // Registro de Consentimento LGPD
    const clientIp =
      reqInfo.headers['x-forwarded-for'] || reqInfo.headers['x-real-ip'] || 'Origem pública web'
    const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
    candidatoRecord.set('consentimento_lgpd', true)
    candidatoRecord.set('consentimento_lgpd_data', agoraIso)
    candidatoRecord.set('consentimento_lgpd_ip', String(clientIp).split(',')[0].trim())

    // Vídeo link se fornecido
    if (videoLink) {
      candidatoRecord.set('video_link', videoLink)
    }

    // Status inicial: se reprovado na triagem automática, 'Recusado'; senão 'Triagem'
    if (reprovadoAuto) {
      candidatoRecord.set('status', 'Recusado')
      candidatoRecord.set('reprovado_triagem_auto', true)
      candidatoRecord.set('motivo_reprovacao_triagem', motivoReprovacao)
    } else {
      candidatoRecord.set('status', 'Triagem')
      candidatoRecord.set('reprovado_triagem_auto', false)
      candidatoRecord.set('motivo_reprovacao_triagem', '')
    }

    // Tratamento de arquivos enviados via multipart (currículo PDF e vídeo de apresentação)
    const files = reqInfo.files || {}

    // 6.1 Currículo
    const curriculoFile = files.curriculo || files.file
    if (curriculoFile) {
      // Validar tipo e tamanho (10MB)
      if (curriculoFile.size > 10 * 1024 * 1024) {
        return e.json(400, { error: 'O currículo deve ter no máximo 10MB.' })
      }
      candidatoRecord.set('curriculo', curriculoFile)
    }

    // 6.2 Vídeo de apresentação
    const videoFile = files.video_apresentacao || files.video
    if (videoFile) {
      // Validar tamanho (100MB)
      if (videoFile.size > 100 * 1024 * 1024) {
        return e.json(400, { error: 'O vídeo de apresentação deve ter no máximo 100MB.' })
      }
      candidatoRecord.set('video_apresentacao', videoFile)
    }

    // Salvar candidato
    $app.save(candidatoRecord)

    // 7. Salvar Respostas da Triagem
    if (perguntasDef.length > 0 || respostasProcessadas.length > 0) {
      const respostasCol = $app.findCollectionByNameOrId('respostas_triagem')
      let respRecord = null
      try {
        const jaExiste = $app.findRecordsByFilter(
          'respostas_triagem',
          "candidato = '" + candidatoRecord.id + "' && vaga = '" + vagaId + "'",
          '-created',
          1,
          0,
        )
        if (jaExiste && jaExiste.length > 0) {
          respRecord = jaExiste[0]
        }
      } catch (_) {}

      if (!respRecord) {
        respRecord = new Record(respostasCol)
        respRecord.set('candidato', candidatoRecord.id)
        respRecord.set('vaga', vagaId)
      }

      if (questionarioRecord) {
        respRecord.set('questionario', questionarioRecord.id)
      }
      respRecord.set('respostas', respostasProcessadas)
      respRecord.set('reprovado_automaticamente', reprovadoAuto)
      respRecord.set('motivo_reprovacao', motivoReprovacao)
      respRecord.set('total_perguntas', totalPerguntas)
      respRecord.set('total_eliminatorias_atendidas', eliminatoriasAtendidas)
      $app.save(respRecord)
    }

    // 8. Criar ou sincronizar o registro no Pipeline
    const pipelineCol = $app.findCollectionByNameOrId('pipeline')
    let pipeRecord = null
    try {
      const pList = $app.findRecordsByFilter(
        'pipeline',
        "candidato = '" + candidatoRecord.id + "' && vaga = '" + vagaId + "'",
        '-created',
        1,
        0,
      )
      if (pList && pList.length > 0) {
        pipeRecord = pList[0]
      }
    } catch (_) {}

    const estagioInicial = reprovadoAuto ? 'Recusado' : 'Triagem'

    if (!pipeRecord) {
      pipeRecord = new Record(pipelineCol)
      pipeRecord.set('candidato', candidatoRecord.id)
      pipeRecord.set('vaga', vagaId)
      pipeRecord.set('estagio', estagioInicial)
      pipeRecord.set('motivo_recusa', reprovadoAuto ? motivoReprovacao : '')
      pipeRecord.set('anotacoes', 'Candidatura submetida através da Página de Carreira pública.')
      pipeRecord.set('historico', [
        {
          data: new Date().toISOString(),
          estagio: estagioInicial,
          autor: 'Página de Carreira (Candidato)',
          nota: reprovadoAuto
            ? 'Triagem automática: ' + motivoReprovacao
            : 'Candidatura pública recebida com sucesso.',
        },
      ])
    } else {
      pipeRecord.set('estagio', estagioInicial)
      const hist = pipeRecord.get('historico') || []
      hist.push({
        data: new Date().toISOString(),
        estagio: estagioInicial,
        autor: 'Página de Carreira (Candidato)',
        nota: reprovadoAuto
          ? 'Triagem automática: ' + motivoReprovacao
          : 'Candidatura pública recebida.',
      })
      pipeRecord.set('historico', hist)
    }

    $app.save(pipeRecord)

    // 9. Enviar e-mail de Confirmação de Recebimento de Candidatura
    // (Apenas se o e-mail não for reprovado de imediato ou para dar o fechamento educado)
    try {
      const mailClient = $app.newMailClient()
      const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
      const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'
      const vagaTitulo = vagaRecord.getString('titulo')

      const html =
        '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
        '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
        '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
        '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Confirmação de Candidatura</p>' +
        '</div>' +
        '<p style="color: #334155; font-size: 15px; line-height: 1.6;">Olá, <strong>' +
        nome +
        '</strong>!</p>' +
        '<p style="color: #334155; font-size: 14px; line-height: 1.6;">Recebemos com sucesso sua candidatura para a oportunidade <strong>' +
        vagaTitulo +
        '</strong>.</p>' +
        '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0;">' +
        '<h3 style="color: #1d4ed8; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Status Atual</h3>' +
        '<p style="margin: 0; color: #1e293b; font-size: 14px;"><strong>Estágio:</strong> ' +
        (reprovadoAuto ? 'Triagem Concluída' : 'Em Análise / Triagem') +
        '</p>' +
        '<p style="margin: 8px 0 0 0; color: #64748b; font-size: 13px;">' +
        (reprovadoAuto
          ? 'Agradecemos sua disponibilidade e respostas ao nosso questionário. No momento, daremos andamento com perfis que atendam integralmente aos requisitos específicos desta posição, mas seus dados permanecerão em nossa base para futuras oportunidades compatíveis.'
          : 'Nossa equipe de Gente & Gestão está avaliando seu currículo e suas respostas. Em breve, enviaremos atualizações sobre os próximos passos do processo seletivo.') +
        '</p>' +
        '</div>' +
        '<p style="color: #64748b; font-size: 12px; line-height: 1.5;">Esta mensagem foi enviada de acordo com o seu consentimento LGPD registrado para este processo seletivo.</p>' +
        '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Equipe de Gente & Gestão</strong></p>' +
        '</div>'

      const msg = new MailerMessage({
        from: { address: senderAddress, name: senderName },
        to: [{ address: email }],
        subject: 'Candidatura Recebida: ' + vagaTitulo,
        html: html,
      })

      mailClient.send(msg)

      // Registrar no log de auditoria
      try {
        const logsCol = $app.findCollectionByNameOrId('logs_emails_status')
        const logRec = new Record(logsCol)
        logRec.set('candidato', candidatoRecord.id)
        logRec.set('vaga', vagaId)
        logRec.set('estagio', 'Candidatura Recebida')
        logRec.set('candidato_nome', nome)
        logRec.set('candidato_email', email)
        logRec.set('vaga_titulo', vagaTitulo)
        logRec.set('assunto', 'Candidatura Recebida: ' + vagaTitulo)
        logRec.set('status_envio', 'Enviado')
        logRec.set(
          'mensagem_resumo',
          'Confirmação de recebimento inicial de candidatura via Página de Carreira pública.',
        )
        logRec.set('data_envio', agoraIso)
        $app.save(logRec)
      } catch (errLog) {
        console.log('Aviso ao registrar log de e-mail de recebimento:', errLog)
      }
    } catch (mailErr) {
      console.log('Aviso ao enviar e-mail de confirmação de candidatura:', mailErr)
    }

    // 10. Retorno limpo e seguro
    return e.json(200, {
      success: true,
      mensagem:
        'Candidatura registrada com sucesso! Nosso time de Gente & Gestão entrará em contato.',
      reprovado: reprovadoAuto,
      candidatoId: candidatoRecord.id,
      vagaTitulo: vagaRecord.getString('titulo'),
    })
  } catch (err) {
    console.log('Erro no endpoint público de candidatura:', err)
    return e.json(500, {
      error: err.message || 'Ocorreu um erro interno ao processar a candidatura. Tente novamente.',
    })
  }
})

// Rota auxiliar pública para listar as vagas ativas e com dados públicos para a página de carreira
routerAdd('GET', '/backend/v1/public/vagas', (e) => {
  try {
    const filter = "status = 'Ativa' && status_aprovacao_gestor = 'Aprovada pelo gestor'"
    const vagas = $app.findRecordsByFilter('vagas', filter, '-created', 50, 0)

    const resultado = []
    for (let i = 0; i < vagas.length; i++) {
      const v = vagas[i]
      resultado.push({
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
        competencias_comportamentais: v.get('competencias_comportamentais') || [],
        created: v.getString('created'),
      })
    }

    return e.json(200, { items: resultado })
  } catch (err) {
    return e.json(500, { error: err.message || 'Falha ao buscar vagas públicas' })
  }
})

// Rota auxiliar pública para obter detalhes de uma vaga e seu questionário ativo
routerAdd('GET', '/backend/v1/public/vagas/{id}', (e) => {
  try {
    const id = e.request.pathValue('id')
    const vaga = $app.findRecordById('vagas', id)
    if (!vaga || vaga.getString('status') !== 'Ativa') {
      return e.json(404, { error: 'Vaga não encontrada ou inativa' })
    }

    // Buscar questionário ativo da vaga
    let questionario = null
    try {
      const qList = $app.findRecordsByFilter(
        'questionarios_vaga',
        "vaga = '" + id + "' && ativo = true",
        '-created',
        1,
        0,
      )
      if (qList && qList.length > 0) {
        const q = qList[0]
        const perguntas = q.get('perguntas') || []
        // Sanitizar perguntas para o público: não revelar respostas esperadas nem mensagens de reprovação
        const perguntasSanitizadas = perguntas.map(function (p) {
          return {
            id: p.id,
            enunciado: p.enunciado,
            tipo: p.tipo,
            opcoes: p.opcoes || [],
            eliminatoria: !!p.eliminatoria,
          }
        })
        questionario = {
          id: q.id,
          titulo: q.getString('titulo'),
          descricao: q.getString('descricao'),
          perguntas: perguntasSanitizadas,
        }
      }
    } catch (_) {}

    return e.json(200, {
      vaga: {
        id: vaga.id,
        titulo: vaga.getString('titulo'),
        departamento: vaga.getString('departamento'),
        localizacao: vaga.getString('localizacao'),
        modalidade: vaga.getString('modalidade'),
        faixa_salarial: vaga.getString('faixa_salarial'),
        descricao: vaga.getString('descricao'),
        requisitos_obrigatorios: vaga.get('requisitos_obrigatorios') || [],
        requisitos_desejaveis: vaga.get('requisitos_desejaveis') || [],
        habilidades_tecnicas: vaga.get('habilidades_tecnicas') || [],
        competencias_comportamentais: vaga.get('competencias_comportamentais') || [],
      },
      questionario: questionario,
    })
  } catch (err) {
    return e.json(500, { error: err.message || 'Falha ao buscar detalhes da vaga' })
  }
})
