/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook routerAdd para análise de vídeo de apresentação via IA Gateway do Skip.
 * Rota: POST /backend/v1/analisar-video-ia
 * Rota: POST /backend/v1/confirmar-conflito-video
 *
 * Avalia o vídeo de apresentação do candidato (link externo ou arquivo anexado),
 * integrando 3 camadas avançadas:
 * 1. Verificação de identidade (nome extraído do vídeo vs cadastro do candidato para evitar anexos errados)
 * 2. Análise linguística de autenticidade (discurso natural vs ensaiado/decorado para conquistar a vaga)
 * 3. Pontos cegos da fala e expressão sócio-emocional (regulação, congruência, empatia, ansiedade)
 *
 * Além das métricas existentes (score geral, comunicação, postura, domínio, fit cultural).
 *
 * NOTA CRÍTICA DO RUNTIME (PocketBase / Goja):
 * Toda a lógica interna dos endpoints DEVE residir dentro da função de callback de routerAdd
 * para respeitar o escopo do pool de VMs. Não use funções auxiliares no nível do arquivo.
 */
routerAdd('POST', '/backend/v1/analisar-video-ia', (e) => {
  // ----------------------------------------------------
  // Autenticação: usuário autenticado ou trigger interno do sistema
  // ----------------------------------------------------
  const internalTrigger = e.requestInfo().headers['x-internal-trigger']
  if (!e.auth && internalTrigger !== 'sistema-rh-dev') {
    return e.json(401, {
      success: false,
      error: 'Não autorizado. Autenticação obrigatória.',
      code: 'UNAUTHORIZED',
    })
  }

  // ----------------------------------------------------
  // Funções auxiliares com escopo interno à callback
  // ----------------------------------------------------

  // Normaliza a recomendação retornada pela IA ou pelo fallback para os valores válidos do enum do PB:
  // 'Fortemente Recomendado' | 'Recomendado' | 'Requer Alinhamento' | 'Não Recomendado'
  const normalizarRecomendacaoSelect = (valorRaw, ehErroAcesso) => {
    if (ehErroAcesso) {
      return 'Requer Alinhamento'
    }
    const str = String(valorRaw || '')
      .trim()
      .toLowerCase()
    if (!str) return 'Recomendado'

    if (
      str.includes('fortemente') ||
      str.includes('altamente') ||
      str.includes('excelente recomend') ||
      str.includes('aprovado com louvor')
    ) {
      return 'Fortemente Recomendado'
    }

    if (
      str.includes('não recomend') ||
      str.includes('nao recomend') ||
      str.includes('reprovad') ||
      str.includes('recusad') ||
      str.includes('inadequado') ||
      str.includes('incompatível') ||
      str.includes('incompativel') ||
      str.includes('desfavorável') ||
      str.includes('desfavoravel')
    ) {
      return 'Não Recomendado'
    }

    if (
      str.includes('alinhamento') ||
      str.includes('ressalva') ||
      str.includes('dúvida') ||
      str.includes('duvida') ||
      str.includes('atenção') ||
      str.includes('atencao') ||
      str.includes('incomplet') ||
      str.includes('falta de evidência') ||
      str.includes('falta de evidencia') ||
      str.includes('parcial') ||
      str.includes('falha')
    ) {
      return 'Requer Alinhamento'
    }

    if (str.includes('recomend')) {
      return 'Recomendado'
    }

    return 'Requer Alinhamento'
  }

  // Adiciona log claro quando o download do vídeo retornar HTML em vez de mídia
  const registrarLogErroDownload = (candidatoNome, urlVideo, contentType, bodySnippet) => {
    console.log(
      `[analisar_video_ia] FALHA DE ACESSO AO VÍDEO DO CANDIDATO (${candidatoNome}): A URL retornou HTML (${contentType || 'desconhecido'}) em vez de stream de vídeo/mídia. O Google Drive está bloqueando o acesso público direto. Detalhes: ${sanitizarTexto(bodySnippet, 200)}`,
    )
  }

  // Trunca texto com segurança evitando estourar limites
  const sanitizarTexto = (val, maxLen) => {
    if (val === null || val === undefined) return ''
    const str = String(val).trim()
    if (!maxLen || str.length <= maxLen) return str
    return str.substring(0, maxLen)
  }

  // Normaliza número entre min e max com fallback seguro
  const sanitizarNumero = (val, min, max, padrao) => {
    const num = Number(val)
    if (isNaN(num)) return padrao
    return Math.min(max, Math.max(min, Math.round(num)))
  }

  // Garante que o valor é um array de strings
  const sanitizarArrayStrings = (arr, maxItems) => {
    if (!Array.isArray(arr)) return []
    const res = []
    const limite = maxItems || 20
    for (let i = 0; i < arr.length && res.length < limite; i++) {
      const item = String(arr[i] || '').trim()
      if (item) res.push(item.substring(0, 500))
    }
    return res
  }

  // ----------------------------------------------------
  // Validação inicial do payload
  // ----------------------------------------------------
  let body = {}
  try {
    body = e.requestInfo().body || {}
  } catch (_) {}
  const candidatoId = body.candidatoId
  const permitirDivergencia = Boolean(body.permitirDivergencia)

  if (!candidatoId) {
    return e.json(400, {
      success: false,
      error: 'candidatoId é obrigatório',
      code: 'MISSING_CANDIDATE_ID',
    })
  }

  // Obter registro do candidato
  let candidato
  try {
    candidato = $app.findRecordById('candidatos', candidatoId)
  } catch (err) {
    return e.json(404, {
      success: false,
      error: 'Candidato não encontrado no sistema',
      code: 'CANDIDATE_NOT_FOUND',
    })
  }

  const videoLink = candidato.getString('video_link') || ''
  const videoFile = candidato.getString('video_apresentacao') || ''

  // Validação: precisa ter link ou arquivo de vídeo cadastrado
  if (!videoLink && !videoFile) {
    return e.json(422, {
      success: false,
      error:
        'Nenhum vídeo disponível para este candidato. Anexe um arquivo de vídeo ou insira um link (Google Drive, Loom, YouTube).',
      code: 'NO_VIDEO_AVAILABLE',
    })
  }

  // Obter vaga associada se houver
  let vaga = null
  const vagaId = candidato.getString('vaga')
  if (vagaId) {
    try {
      vaga = $app.findRecordById('vagas', vagaId)
    } catch (err) {
      console.log('Vaga não encontrada ou sem acesso:', err.message)
    }
  }

  // Obter percepções de entrevista existentes para enriquecer o contexto
  let percepcoes = []
  try {
    percepcoes = $app.findRecordsByFilter(
      'percepcoes_rh',
      `candidato = '${candidatoId}'`,
      '-created',
      5,
    )
  } catch (err) {
    console.log('Sem percepções prévias:', err.message)
  }

  const percepcoesTexto = percepcoes
    .map(
      (p, idx) =>
        `[Percepção ${idx + 1} - ${p.getString('autor_nome') || 'RH'}]: ${p.getString('comunicacao_clareza') || ''} ${p.getString('postura_apresentacao') || ''}`,
    )
    .join('\n')

  // Detectar tipo e origem do vídeo
  let linkProcessado = videoLink ? videoLink.trim() : ''
  let driveFileId = ''
  let youtubeVideoId = ''
  let isYoutube = false
  let isDrive = false
  let isLoom = false
  let isDropbox = false

  if (linkProcessado) {
    // YouTube: detectar youtu.be/ID ou youtube.com/watch?v=ID ou youtube.com/embed/ID ou youtube.com/shorts/ID
    const ytMatch = linkProcessado.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/))([a-zA-Z0-9_-]{11})/i,
    )
    if (ytMatch && ytMatch[1]) {
      youtubeVideoId = ytMatch[1]
      isYoutube = true
      linkProcessado = `https://www.youtube.com/watch?v=${youtubeVideoId}`
    }

    // Google Drive: converter para download direto
    const driveMatch =
      linkProcessado.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/i) ||
      linkProcessado.match(
        /drive\.google\.com\/(?:open|uc)\?(?:[a-zA-Z0-9_=&-]*&)?id=([a-zA-Z0-9_-]+)/i,
      )
    if (driveMatch && driveMatch[1]) {
      driveFileId = driveMatch[1]
      isDrive = true
      linkProcessado = `https://drive.google.com/uc?export=download&id=${driveMatch[1]}`
    }

    // Dropbox: trocar dl=0 por raw=1
    if (/dropbox\.com/i.test(linkProcessado)) {
      isDropbox = true
      if (/([?&])dl=[01]/i.test(linkProcessado)) {
        linkProcessado = linkProcessado.replace(/([?&])dl=[01]/i, '$1raw=1')
      } else if (!/[?&]raw=1/i.test(linkProcessado)) {
        linkProcessado += linkProcessado.includes('?') ? '&raw=1' : '?raw=1'
      }
    }

    // Loom: converter para embed
    const loomMatch = linkProcessado.match(/loom\.com\/share\/([a-zA-Z0-9_-]+)/i)
    if (loomMatch && loomMatch[1]) {
      isLoom = true
      linkProcessado = `https://www.loom.com/embed/${loomMatch[1]}`
    }
  }

  // Extração robusta de metadados e transcrição para YouTube
  let youtubeTranscricao = ''
  let youtubeTitulo = ''
  let youtubeAutor = ''
  let youtubeDescricao = ''
  let youtubeFalhaTranscricao = false

  if (isYoutube && youtubeVideoId) {
    // 1. Obter metadados oEmbed oficiais da API pública do YouTube
    try {
      const oembedResp = $http.send({
        url: `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeVideoId}&format=json`,
        method: 'GET',
        headers: { 'User-Agent': 'Mozilla/5.0 SkipCloud/1.0' },
        timeout: 8,
      })
      if (oembedResp.statusCode === 200) {
        const oembedData = oembedResp.json || JSON.parse(String(oembedResp.raw || '{}'))
        youtubeTitulo = oembedData.title || ''
        youtubeAutor = oembedData.author_name || ''
      }
    } catch (oembedErr) {
      console.log('[analisar_video_ia] Aviso ao consultar oEmbed do YouTube:', oembedErr.message)
    }

    // 2. Obter página de visualização para extrair captionTracks (legendas/transcrição da fala)
    try {
      const ytResp = $http.send({
        url: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        },
        timeout: 12,
      })
      const ytHtml = ytResp.raw ? String(ytResp.raw) : ''

      if (!youtubeTitulo) {
        const tMatch = ytHtml.match(/<title>([^<]+)<\/title>/i)
        if (tMatch && tMatch[1]) {
          youtubeTitulo = tMatch[1].replace(/\s*-\s*YouTube\s*$/i, '').trim()
        }
      }

      // Tentar extrair descrição
      const dMatch = ytHtml.match(/"shortDescription":\s*"([^"]+)"/i)
      if (dMatch && dMatch[1]) {
        youtubeDescricao = dMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"').trim()
      }

      // Extrair captionTracks da resposta do player do YouTube
      const captionTracksMatch = ytHtml.match(/"captionTracks":\s*(\[[^\]]+\])/)
      if (captionTracksMatch && captionTracksMatch[1]) {
        try {
          const tracks = JSON.parse(captionTracksMatch[1])
          // Preferir pt / pt-BR ou a primeira faixa disponível
          let chosenTrack =
            tracks.find(
              (t) => t.languageCode && String(t.languageCode).toLowerCase().startsWith('pt'),
            ) || tracks[0]

          if (chosenTrack && chosenTrack.baseUrl) {
            const transcriptUrl = chosenTrack.baseUrl + '&fmt=json3'
            const trResp = $http.send({
              url: transcriptUrl,
              method: 'GET',
              headers: { 'User-Agent': 'Mozilla/5.0' },
              timeout: 10,
            })
            if (trResp.statusCode === 200 && trResp.raw) {
              const trRawStr = String(trResp.raw)
              if (trRawStr.startsWith('{')) {
                const trJson = JSON.parse(trRawStr)
                const events = trJson.events || []
                const textSegments = []
                for (let evIdx = 0; evIdx < events.length; evIdx++) {
                  const ev = events[evIdx]
                  if (Array.isArray(ev.segs)) {
                    for (let segIdx = 0; segIdx < ev.segs.length; segIdx++) {
                      const sText = ev.segs[segIdx]?.utf8 || ''
                      if (sText && sText.trim()) {
                        textSegments.push(sText.trim())
                      }
                    }
                  }
                }
                youtubeTranscricao = textSegments.join(' ')
              } else {
                // Fallback para formato XML timedtext
                const matches = trRawStr.matchAll(/<text[^>]*>([^<]*)<\/text>/gi)
                const parts = []
                for (const m of matches) {
                  if (m[1])
                    parts.push(
                      m[1]
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&#39;/g, "'"),
                    )
                }
                youtubeTranscricao = parts.join(' ')
              }
            }
          }
        } catch (trParseErr) {
          console.log(
            '[analisar_video_ia] Aviso ao parsear captionTracks do YouTube:',
            trParseErr.message,
          )
        }
      }
    } catch (ytHttpErr) {
      console.log('[analisar_video_ia] Aviso ao carregar página do YouTube:', ytHttpErr.message)
    }

    if (!youtubeTranscricao) {
      youtubeFalhaTranscricao = true
    }
  }

  // Pré-validação ativa de acesso HTTP para links do Google Drive e arquivos genéricos
  let preFalhaAcessoHttp = false
  let preFalhaMotivo = ''
  let preFalhaTipo = '' // 'drive' | 'youtube' | 'generico'
  let preContentType = ''

  if (linkProcessado && !videoFile && !isYoutube) {
    try {
      const httpCheck = $http.send({
        url: linkProcessado,
        method: 'GET',
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        timeout: 15,
      })
      const checkHeaders = httpCheck.headers || {}
      for (const hk in checkHeaders) {
        if (hk.toLowerCase() === 'content-type') {
          preContentType = Array.isArray(checkHeaders[hk])
            ? checkHeaders[hk].join('; ')
            : String(checkHeaders[hk])
          break
        }
      }
      const checkBody = httpCheck.raw ? String(httpCheck.raw) : ''
      const checkIsHtml =
        preContentType.toLowerCase().includes('text/html') ||
        checkBody.includes('<!DOCTYPE html>') ||
        checkBody.includes('<html')
      const checkIsLoginOuNegado =
        checkBody.includes('accounts.google.com') ||
        checkBody.includes('ServiceLogin') ||
        checkBody.includes('Google Drive – Acesso Negado') ||
        checkBody.includes('Access Denied') ||
        checkBody.includes('Sign in') ||
        checkBody.includes('Fazer login')

      if (isDrive && checkIsHtml) {
        preFalhaAcessoHttp = true
        preFalhaTipo = 'drive'
        preFalhaMotivo = checkIsLoginOuNegado
          ? 'O Google Drive exige autenticação ou está negando o acesso direto (página HTML de login retornada pelo link).'
          : 'O link do Google Drive retornou uma página HTML em vez do arquivo de mídia de vídeo.'
        registrarLogErroDownload(
          candidato.getString('nome') || candidatoId,
          linkProcessado,
          preContentType,
          checkBody.substring(0, 300),
        )
      }
    } catch (errCheck) {
      console.log('[analisar_video_ia] Aviso na pré-checagem HTTP do vídeo:', errCheck.message)
    }
  }

  // Metadados do vídeo para contextualizar a IA
  const urlVideoParaIA = linkProcessado || videoLink
  const fonteVideo = videoFile
    ? `Arquivo local: ${videoFile}`
    : isYoutube
      ? `YouTube (${urlVideoParaIA}) · Vídeo ID: ${youtubeVideoId}`
      : `Link externo: ${urlVideoParaIA}`
  const versaoAtual = (candidato.getInt('video_versao') || 0) + 1
  const nomeCadastro = candidato.getString('nome') || ''

  // Se for YouTube e não obteve transcrição de áudio/legenda, marcar preFalhaAcessoHttp
  if (isYoutube && !youtubeTranscricao && !youtubeTitulo) {
    preFalhaAcessoHttp = true
    preFalhaTipo = 'youtube'
    preFalhaMotivo =
      'Não foi possível extrair a transcrição ou metadados públicos do vídeo no YouTube. Verifique se o vídeo está configurado como "Não listado" ou "Público" e se possui legendas/áudio habilitados.'
  }

  // Prompt estruturado para o Skip AI Gateway
  const systemPrompt = `Você é um perito executivo sênior em Talent Acquisition, Linguística Forense Aplicada a RH e Psicologia Comportamental & Socioemocional.
Você analisa apresentações de candidatos gravadas em vídeo (incluindo transcrições fiéis da fala do vídeo quando hospedado em plataformas de streaming como YouTube).

Sua análise possui 3 camadas críticas OBRIGATÓRIAS:
1. IDENTIDADE E EXTRAÇÃO DE NOME:
Identifique o nome com o qual a pessoa se apresenta no vídeo/áudio (na saudação inicial, introdução ou contexto). Compare com o nome de cadastro: "${nomeCadastro}".
Verifique se há correspondência (mesma pessoa, primeiro nome ou sobrenome coincidente) ou CONFLITO DE IDENTIDADE RELEVANTE (o vídeo é de outra pessoa, ex: cadastro é Rodrigo e a pessoa diz "Olá, sou Gabriel", ou o candidato se apresenta com outro nome). Se o nome não for explicitamente verbalizado na introdução mas não houver nenhuma evidência de ser outra pessoa, assinale conflito_identidade: false com a observação cabível.

2. ANÁLISE LINGUÍSTICA DE AUTENTICIDADE (NATURAL vs FORÇADO/DECORADO):
Analise a estrutura da fala e vocabulário:
- Avalie se o discurso soa genuíno, fluido e espontâneo com pausas naturais de raciocínio, ou se é uma recitação mecânica e decorada somente para agradar a banca e passar na vaga.
- Verifique se usa exemplos concretos com propriedade ou clichês vazios de entrevista ("sou perfeccionista", "sou proativo", "trabalho bem sob pressão" sem detalhar fatos reais).
- Forneça "indice_naturalidade" (número de 0 a 100, onde 100 é totalmente natural e 0 é totalmente falso/mecanizado).
- Veredito: "Natural", "Parcialmente ensaiado" ou "Decorado / Forçado".
- Justificativa textual com trechos/evidências da fala.

3. PONTOS CEGOS DA FALA E EXPRESSÃO SÓCIO-EMOCIONAL:
- Pontos cegos: O que o candidato NÃO percebe sobre si mesmo ao falar (inseguranças mascaradas, evasivas, mudança de assunto em temas desafiadores, contradição entre postura e discurso, excesso de autoconfiança sem embasamento prático, sinais de estresse não-verbal ou hesitação verbal).
- Expressão sócio-emocional: Nível de regulação emocional, maturidade interpessoal, abertura para aprender, empatia, autocrítica e congruência entre o tom do discurso e o que está sendo dito. (Caso analisado a partir de transcrição/áudio do YouTube, infira pelas escolhas lexicais, ritmo do discurso e cadência da fala, explicitando isso).

Mantenha também todas as dimensões tradicionais (score_geral, clareza_comunicacao, estrutura_narrativa, energia_postura, aderencia_vaga, resumo_executivo, recomendacao_geral, pontos_fortes, pontos_atencao, red_flags).

IMPORTANTE SOBRE RECOMENDAÇÃO GERAL:
O campo "recomendacao_geral" DEVE ser EXATAMENTE um dos 4 valores permitidos:
- "Fortemente Recomendado"
- "Recomendado"
- "Requer Alinhamento"
- "Não Recomendado"
NUNCA adicione frases longas ou justificativas dentro do campo "recomendacao_geral". Justificativas devem ficar no campo "resumo_executivo".

Responda EXCLUSIVAMENTE em formato JSON válido, sem texto introdutório ou markdown (não use \`\`\`json).

Estrutura JSON obrigatória:
{
  "nome_detectado_no_video": "<nome que a pessoa disse no vídeo ou 'Não mencionado explicitamente'>",
  "conflito_identidade": false,
  "detalhes_conflito_identidade": "<explicação se houver conflito ou justificativa da correspondência>",
  "indice_naturalidade": 85,
  "veredito_naturalidade": "Natural",
  "analise_linguistica": {
    "estrutura_fala": "<diagnóstico da fluência, cadência, pausas de raciocínio vs memorização>",
    "uso_exemplos_vs_cliches": "<análise de substantividade dos exemplos dados vs frases feitas>",
    "justificativa": "<síntese da autenticidade>",
    "trechos_evidencia": ["<citação ou paráfrase 1>", "<citação ou paráfrase 2>"]
  },
  "pontos_cegos": {
    "sintese_inconsciente": "<o que o candidato transmite sem perceber>",
    "evasivas_ou_insegurancas": "<temas onde houve hesitação, mudança de foco ou defesa mascarada>",
    "sinais_estresse_tensao": "<tensões verbais ou hesitações perceptíveis>",
    "sugestoes_investigacao_entrevista": ["<pergunta ou tema para o gestor aprofundar>"]
  },
  "expressao_socioemocional": {
    "regulacao_emocional": "<Alta | Equilibrada | Moderada | Sob Tensão>",
    "maturidade_autocritica": "<descrição da capacidade de reconhecer limites e aprendizados>",
    "empatia_conexao": "<capacidade de criar vínculo com quem assiste/escuta>",
    "congruencia_verbal_nao_verbal": "<se o tom e conteúdo são congruentes>",
    "evidencias_observadas": ["<evidência 1>", "<evidência 2>"]
  },
  "score_geral": 80,
  "clareza_comunicacao": 80,
  "estrutura_narrativa": 80,
  "energia_postura": 80,
  "aderencia_vaga": 80,
  "resumo_executivo": "<Parágrafo analítico em pt-BR com síntese crítica>",
  "comunicacao_oratoria": "<Avaliação de ritmo, clareza e dicção>",
  "postura_presenca": "<Postura e presença profissional>",
  "dominio_experiencia": "<Domínio conceitual dos projetos e tecnologias citados>",
  "fit_cultural": "<Aderência aos valores da empresa>",
  "pontos_fortes": ["<ponto forte 1>", "<ponto forte 2>"],
  "pontos_atencao": ["<ponto de atenção 1>"],
  "red_flags": [],
  "recomendacao_geral": "Recomendado"
}`

  // Construção contextualizada dos dados do vídeo (incluindo transcrição real extraída do YouTube se disponível)
  let blocoTranscricaoYouTube = ''
  if (isYoutube) {
    blocoTranscricaoYouTube = `
METADADOS E CONTEÚDO EXTRAÍDO DO YOUTUBE:
- Plataforma: YouTube (${urlVideoParaIA})
- Título do Vídeo: ${youtubeTitulo || 'Vídeo de Apresentação'}
- Canal/Autor: ${youtubeAutor || 'Não informado'}
- Descrição: ${youtubeDescricao || 'Sem descrição'}
- Transcrição da Fala no Vídeo:
"""
${youtubeTranscricao || 'Transcrição não extraível diretamente; utilize os metadados do vídeo e o perfil detalhado para avaliação.'}
"""`
  }

  const userPrompt = `Analise a apresentação em vídeo do candidato a seguir:

CADASTRO DO CANDIDATO NO SISTEMA:
- ID: ${candidatoId}
- Nome Cadastrado: ${nomeCadastro}
- Cargo Atual: ${candidato.getString('cargo_atual') || 'Não informado'} em ${candidato.getString('empresa_atual') || 'Não informada'}
- Resumo Curricular: ${candidato.getString('resumo') || 'Não informado'}
- Competências Técnicas: ${candidato.getString('habilidades_tecnicas') || '[]'}
- Competências Comportamentais: ${candidato.getString('competencias_comportamentais') || '[]'}
- Fonte do Vídeo Anexado: ${fonteVideo}
- Link Normalizado para Acesso: ${urlVideoParaIA}
${blocoTranscricaoYouTube}

VAGA ALVO:
- Título: ${vaga ? vaga.getString('titulo') : 'Não especificada'}
- Departamento: ${vaga ? vaga.getString('departamento') : 'Geral'}
- Requisitos: ${vaga ? vaga.getString('requisitos_obrigatorios') : 'Requisitos da função'}

OBSERVAÇÕES E PERCEPÇÕES PRÉVIAS DO RH:
${percepcoesTexto || 'Nenhuma percepção prévia registrada.'}

INSTRUÇÕES ESPECÍFICAS DESTA EXECUÇÃO:
1. Extraia o nome com o qual o candidato se apresenta no vídeo/áudio e valide contra "${nomeCadastro}". Se for outro nome ou outra pessoa evidente, aponte conflito_identidade: true com justificativa precisa.
2. Identifique se o discurso é NATURAL ou FORÇADO/DECORADO para conquistar a vaga, pontuando de 0 a 100 em indice_naturalidade com evidências e citações da fala.
3. Descreva os PONTOS CEGOS que ele não percebe que demonstra e a EXPRESSÃO SÓCIO-EMOCIONAL detalhada.
4. ATENÇÃO: O campo recomendacao_geral DEVE ser rigorosamente um destes valores exatos: "Fortemente Recomendado", "Recomendado", "Requer Alinhamento" ou "Não Recomendado". Caso o vídeo não possa ser acessado, utilize "Requer Alinhamento" e detalhe o ocorrido no resumo_executivo.`
  let parsed = null
  try {
    const aiResponse = $ai.chat({
      model: 'fast',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    })

    const rawContent = aiResponse.choices[0].message.content.trim()
    const cleanedJson = rawContent
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim()
    parsed = JSON.parse(cleanedJson)
  } catch (aiErr) {
    console.log('Erro ao chamar ou parsear resposta do AI Gateway:', aiErr.message)
    return e.json(502, {
      success: false,
      error:
        'Não foi possível obter a resposta da inteligência artificial no momento. Tente novamente em instantes.',
      details: aiErr.message,
      code: 'AI_GATEWAY_ERROR',
    })
  }

  try {
    const conflitoDetectado = Boolean(parsed.conflito_identidade)
    const nomeDetectado = sanitizarTexto(parsed.nome_detectado_no_video, 250)
    const detalhesConflito = sanitizarTexto(parsed.detalhes_conflito_identidade, 1000)
    const rawResumoExecutivo = sanitizarTexto(parsed.resumo_executivo, 3000)
    const rawRecomendacao = String(parsed.recomendacao_geral || '').trim()

    // Verificar se a IA reportou impossibilidade de acesso/leitura do vídeo
    const textoCompletoAnalise =
      `${rawResumoExecutivo} ${rawRecomendacao} ${String(parsed.analise_linguistica?.estrutura_fala || '')} ${String(parsed.analise_linguistica?.justificativa || '')}`.toLowerCase()

    const ehErroAcessoVideo =
      preFalhaAcessoHttp ||
      textoCompletoAnalise.includes('não pôde ser acessado') ||
      textoCompletoAnalise.includes('nao pode ser acessado') ||
      textoCompletoAnalise.includes('não foi possível realizar a análise') ||
      textoCompletoAnalise.includes('nao foi possivel realizar a analise') ||
      textoCompletoAnalise.includes('impossibilidade de visualização') ||
      textoCompletoAnalise.includes('impossibilidade de visualizacao') ||
      textoCompletoAnalise.includes('impossibilidade de assistir') ||
      textoCompletoAnalise.includes('falta de acesso ao vídeo') ||
      textoCompletoAnalise.includes('falta de acesso ao video') ||
      textoCompletoAnalise.includes('indisponibilidade do vídeo') ||
      textoCompletoAnalise.includes('indisponibilidade do video') ||
      textoCompletoAnalise.includes('conteúdo audiovisual não acessível') ||
      textoCompletoAnalise.includes('não foi possível analisar o vídeo')

    // Mapeamento seguro e defensivo da recomendação geral para o select do PB
    // Valores permitidos no banco: 'Fortemente Recomendado' | 'Recomendado' | 'Requer Alinhamento' | 'Não Recomendado'
    const recomendacaoValida = normalizarRecomendacaoSelect(rawRecomendacao, ehErroAcessoVideo)

    // Conflito pendente de confirmação pelo RH
    const ehConflitoPendente = !ehErroAcessoVideo && conflitoDetectado && !permitirDivergencia

    // Buscar registro existente ou instanciar novo Record
    let analiseRecord = null
    try {
      const existing = $app.findRecordsByFilter(
        'analises_video_ia',
        `candidato = '${candidatoId}'`,
        '-created',
        1,
      )
      if (existing.length > 0) {
        analiseRecord = existing[0]
      }
    } catch (_) {}

    if (!analiseRecord) {
      const colAnalises = $app.findCollectionByNameOrId('analises_video_ia')
      analiseRecord = new Record(colAnalises)
      analiseRecord.set('candidato', candidatoId)
    }

    if (vagaId) {
      analiseRecord.set('vaga', vagaId)
    }

    if (e.auth) {
      analiseRecord.set('gerado_por', e.auth.id)
    }

    const agoraIso = new Date().toISOString()
    analiseRecord.set('data_geracao', agoraIso)
    analiseRecord.set('versao_video', versaoAtual)
    analiseRecord.set('arquivo_analisado', videoFile ? 'arquivo' : 'link')

    if (ehErroAcessoVideo) {
      // Fluxo de Falha no Acesso ao Vídeo (Preserva score do candidato sem zerar nem punir)
      let msgErro = preFalhaMotivo || rawResumoExecutivo || ''
      let erroDetalhes = ''

      if (isYoutube) {
        msgErro =
          msgErro ||
          'Não foi possível acessar o vídeo no YouTube pelo link fornecido. Verifique se o vídeo está configurado como público ou não listado e se a URL está correta.'
        erroDetalhes =
          'Falha de acesso ao YouTube: o link retornou bloqueio ou não permitiu a extração do conteúdo audiovisual. Verifique se o vídeo está marcado como "Não listado" ou "Público".'
      } else if (isDrive) {
        msgErro =
          msgErro ||
          'Não foi possível acessar o arquivo no Google Drive. Verifique se o compartilhamento está configurado como "Qualquer pessoa com o link" (Visualizador).'
        erroDetalhes =
          'O Google Drive está bloqueando o acesso direto — verifique o compartilhamento (Qualquer pessoa com o link / Leitor) ou use link alternativo via YouTube (não listado) ou Loom.'
      } else {
        msgErro =
          msgErro ||
          'Não foi possível acessar o vídeo pelo link fornecido. Verifique se o link está público e acessível sem login.'
        erroDetalhes =
          'Falha de acesso ao link de vídeo externo. O servidor retornou página HTML ou bloqueio de autorização.'
      }

      analiseRecord.set('resumo_executivo', msgErro)
      analiseRecord.set('comunicacao_oratoria', 'Não avaliado devido a falha de acesso')
      analiseRecord.set('postura_presenca', 'Não avaliado devido a falha de acesso')
      analiseRecord.set('dominio_experiencia', 'Não avaliado devido a falha de acesso')
      analiseRecord.set('fit_cultural', 'Não avaliado devido a falha de acesso')
      analiseRecord.set('pontos_fortes', [])
      analiseRecord.set('pontos_atencao', [
        isYoutube
          ? 'Verificar se o vídeo do YouTube está definido como Não Listado ou Público e sem restrição de idade.'
          : isDrive
            ? 'Verificar se o arquivo do Google Drive está como "Qualquer pessoa com o link" (Visualizador).'
            : 'Verificar se o link do vídeo está público para acesso externo.',
      ])
      analiseRecord.set('nota_estimada', null)
      analiseRecord.set('score_geral', null)
      analiseRecord.set('clareza_comunicacao', null)
      analiseRecord.set('estrutura_narrativa', null)
      analiseRecord.set('energia_postura', null)
      analiseRecord.set('aderencia_vaga', null)
      analiseRecord.set('red_flags', [])

      // O select de analises_video_ia aceita apenas os 4 valores definidos na migration 0010:
      // 'Fortemente Recomendado' | 'Recomendado' | 'Requer Alinhamento' | 'Não Recomendado'.
      // Gravamos 'Requer Alinhamento' para ser 100% compatível com a validação do PocketBase.
      analiseRecord.set('recomendacao_geral', 'Requer Alinhamento')
      analiseRecord.set(
        'recomendacao_detalhada',
        rawRecomendacao || 'Falha no acesso ao arquivo ou streaming de vídeo',
      )
      analiseRecord.set(
        'base_utilizada',
        `Análise via IA Gateway Skip · Vídeo (${fonteVideo}) · Falha no acesso ao arquivo`,
      )
      analiseRecord.set('qtd_percepcoes_consideradas', percepcoes.length)
      analiseRecord.set('status_analise', 'erro_acesso')
      analiseRecord.set('erro_detalhes', erroDetalhes)
      console.log(
        `[analisar_video_ia] Vídeo do candidato ${nomeCadastro} não pôde ser acessado na plataforma (${isYoutube ? 'YouTube' : isDrive ? 'Google Drive' : 'Link'}). Registrando status_analise='erro_acesso'.`,
      )
      analiseRecord.set('nome_detectado_no_video', '')
      analiseRecord.set('conflito_identidade', false)
      analiseRecord.set('detalhes_conflito_identidade', '')
      analiseRecord.set('conflito_confirmado_rh', false)
      analiseRecord.set('indice_naturalidade', null)
      analiseRecord.set('veredito_naturalidade', '')
      analiseRecord.set('analise_linguistica', {})
      analiseRecord.set('pontos_cegos', {})
      analiseRecord.set('expressao_socioemocional', {})

      // Salvar com proteção e captura de erro de validação
      try {
        $app.save(analiseRecord)
      } catch (saveErr) {
        console.log('Erro ao salvar analiseRecord (erro_acesso):', saveErr.message)
        return e.json(422, {
          success: false,
          error:
            'Falha de validação no banco de dados ao salvar o registro de erro de acesso ao vídeo.',
          details: saveErr.message,
          code: 'DATABASE_VALIDATION_ERROR',
        })
      }

      // Atualizar versão no candidato sem zerar notas
      try {
        candidato.set('video_versao', versaoAtual)
        $app.save(candidato)
      } catch (errCand) {
        console.log('Aviso ao atualizar versão no candidato:', errCand.message)
      }

      return e.json(200, {
        success: false,
        status_analise: 'erro_acesso',
        error: msgErro,
        data: {
          analiseId: analiseRecord.id,
          status_analise: 'erro_acesso',
          score_geral: null,
          resumo_executivo: msgErro,
          recomendacao_geral: 'Requer Alinhamento',
          recomendacao_detalhada: rawRecomendacao || 'Falha no Acesso',
          versao: versaoAtual,
          analisado_em: agoraIso,
        },
      })
    }

    // Fluxo Normal: Análise Concluída com Sucesso
    const scoreGeral = sanitizarNumero(parsed.score_geral, 0, 100, 75)
    const clareza = sanitizarNumero(parsed.clareza_comunicacao, 0, 100, 75)
    const estrutura = sanitizarNumero(parsed.estrutura_narrativa, 0, 100, 75)
    const energia = sanitizarNumero(parsed.energia_postura, 0, 100, 75)
    const aderencia = sanitizarNumero(parsed.aderencia_vaga, 0, 100, 75)
    const indiceNaturalidade = sanitizarNumero(parsed.indice_naturalidade, 0, 100, 80)

    let vereditoNat = sanitizarTexto(parsed.veredito_naturalidade, 60)
    if (!vereditoNat) {
      vereditoNat =
        indiceNaturalidade >= 75
          ? 'Natural'
          : indiceNaturalidade >= 50
            ? 'Parcialmente ensaiado'
            : 'Decorado / Forçado'
    }

    const redFlags = sanitizarArrayStrings(parsed.red_flags, 10)
    if (conflitoDetectado) {
      redFlags.unshift(
        `Alerta de Identidade: O nome identificado no vídeo ("${nomeDetectado || 'Não identificado'}") diverge do cadastro ("${nomeCadastro}").`,
      )
    }

    const pontosFortes = sanitizarArrayStrings(parsed.pontos_fortes, 10)
    const pontosAtencao = sanitizarArrayStrings(parsed.pontos_atencao, 10)

    analiseRecord.set(
      'resumo_executivo',
      rawResumoExecutivo || 'Análise de vídeo executada com sucesso pela inteligência artificial.',
    )
    analiseRecord.set('comunicacao_oratoria', sanitizarTexto(parsed.comunicacao_oratoria, 2000))
    analiseRecord.set('postura_presenca', sanitizarTexto(parsed.postura_presenca, 2000))
    analiseRecord.set('dominio_experiencia', sanitizarTexto(parsed.dominio_experiencia, 2000))
    analiseRecord.set('fit_cultural', sanitizarTexto(parsed.fit_cultural, 2000))
    analiseRecord.set('pontos_fortes', pontosFortes)
    analiseRecord.set('pontos_atencao', pontosAtencao)
    analiseRecord.set('nota_estimada', Number((scoreGeral / 10).toFixed(1)))
    analiseRecord.set('score_geral', scoreGeral)
    analiseRecord.set('clareza_comunicacao', clareza)
    analiseRecord.set('estrutura_narrativa', estrutura)
    analiseRecord.set('energia_postura', energia)
    analiseRecord.set('aderencia_vaga', aderencia)
    analiseRecord.set('red_flags', redFlags)

    // Campo seguro validado contra o enum do PB
    analiseRecord.set('recomendacao_geral', recomendacaoValida)
    analiseRecord.set('recomendacao_detalhada', rawRecomendacao)

    analiseRecord.set(
      'base_utilizada',
      `Análise via IA Gateway Skip · Vídeo (${fonteVideo}) · Identidade, Linguística & Socioemocional`,
    )
    analiseRecord.set('qtd_percepcoes_consideradas', percepcoes.length)
    analiseRecord.set('status_analise', 'concluida')
    analiseRecord.set('erro_detalhes', '')

    // Camadas de identidade, autenticidade e socioemocional
    analiseRecord.set('nome_detectado_no_video', nomeDetectado)
    analiseRecord.set('conflito_identidade', conflitoDetectado)
    analiseRecord.set('detalhes_conflito_identidade', detalhesConflito)
    analiseRecord.set('conflito_confirmado_rh', permitirDivergencia)
    analiseRecord.set('indice_naturalidade', indiceNaturalidade)
    analiseRecord.set('veredito_naturalidade', vereditoNat)

    // Sanitizar JSONs das camadas profundas
    const analiseLinguisticaObj =
      parsed.analise_linguistica && typeof parsed.analise_linguistica === 'object'
        ? parsed.analise_linguistica
        : {}
    const pontosCegosObj =
      parsed.pontos_cegos && typeof parsed.pontos_cegos === 'object' ? parsed.pontos_cegos : {}
    const expressaoSocioObj =
      parsed.expressao_socioemocional && typeof parsed.expressao_socioemocional === 'object'
        ? parsed.expressao_socioemocional
        : {}

    analiseRecord.set('analise_linguistica', analiseLinguisticaObj)
    analiseRecord.set('pontos_cegos', pontosCegosObj)
    analiseRecord.set('expressao_socioemocional', expressaoSocioObj)

    // Salvar registro de análise com captura defensiva
    try {
      $app.save(analiseRecord)
    } catch (saveErr) {
      console.log('Erro ao salvar analiseRecord no PocketBase:', saveErr.message)
      return e.json(422, {
        success: false,
        error:
          'A análise foi gerada pela inteligência artificial, mas ocorreu uma falha de validação ao salvar os dados no sistema.',
        details: saveErr.message,
        code: 'DATABASE_VALIDATION_ERROR',
      })
    }

    // Atualizar dados de vídeo no registro do candidato
    try {
      candidato.set('video_score_geral', scoreGeral)
      candidato.set('video_analise_dimensoes', {
        clareza_comunicacao: clareza,
        estrutura_narrativa: estrutura,
        energia_postura: energia,
        aderencia_vaga: aderencia,
        red_flags: redFlags,
        indice_naturalidade: indiceNaturalidade,
        veredito_naturalidade: vereditoNat,
      })
      candidato.set('video_conflito_identidade', conflitoDetectado)
      candidato.set('video_nome_detectado', nomeDetectado)
      candidato.set('video_analisado_em', agoraIso)
      candidato.set('video_versao', versaoAtual)
      $app.save(candidato)
    } catch (errCand) {
      console.log('Aviso ao persistir campos de vídeo no candidato:', errCand.message)
    }

    // Registrar evento na timeline de candidatos (tabela correta: eventos_timeline_candidato)
    try {
      let colTimeline = null
      try {
        colTimeline = $app.findCollectionByNameOrId('eventos_timeline_candidato')
      } catch (_) {
        colTimeline = null
      }

      if (colTimeline) {
        const ev = new Record(colTimeline)
        ev.set('candidato', candidatoId)
        ev.set('categoria', 'AVALIACAO')
        ev.set('titulo', `Análise IA de Vídeo realizada (v${versaoAtual})`)
        ev.set(
          'complemento',
          `Score ${scoreGeral}/100 · Parecer: ${recomendacaoValida}. Autenticidade: ${vereditoNat} (${indiceNaturalidade}%).${conflitoDetectado ? ' [ATENÇÃO: Divergência de identidade detectada]' : ''}`,
        )
        ev.set('autor', e.auth ? e.auth.getString('name') || 'IA Gateway' : 'IA Gateway Skip')
        ev.set('origem', 'sistema')
        ev.set('data_evento', agoraIso)
        ev.set('referencia_tipo', 'video_ia')
        ev.set('referencia_id', analiseRecord.id)
        $app.save(ev)
      }
    } catch (errTimeline) {
      console.log('Aviso ao registrar evento de timeline:', errTimeline.message)
    }

    return e.json(200, {
      success: true,
      status_analise: 'concluida',
      conflito_bloqueante: ehConflitoPendente,
      conflito_identidade: conflitoDetectado,
      nome_detectado_no_video: nomeDetectado,
      nome_cadastro: nomeCadastro,
      detalhes_conflito_identidade: detalhesConflito,
      data: {
        analiseId: analiseRecord.id,
        status_analise: 'concluida',
        score_geral: scoreGeral,
        clareza_comunicacao: clareza,
        estrutura_narrativa: estrutura,
        energia_postura: energia,
        aderencia_vaga: aderencia,
        indice_naturalidade: indiceNaturalidade,
        veredito_naturalidade: vereditoNat,
        nome_detectado_no_video: nomeDetectado,
        conflito_identidade: conflitoDetectado,
        detalhes_conflito_identidade: detalhesConflito,
        conflito_confirmado_rh: permitirDivergencia,
        analise_linguistica: analiseLinguisticaObj,
        pontos_cegos: pontosCegosObj,
        expressao_socioemocional: expressaoSocioObj,
        resumo_executivo: rawResumoExecutivo,
        comunicacao_oratoria: parsed.comunicacao_oratoria || '',
        postura_presenca: parsed.postura_presenca || '',
        dominio_experiencia: parsed.dominio_experiencia || '',
        fit_cultural: parsed.fit_cultural || '',
        pontos_fortes: pontosFortes,
        pontos_atencao: pontosAtencao,
        red_flags: redFlags,
        recomendacao_geral: recomendacaoValida,
        recomendacao_detalhada: rawRecomendacao,
        versao: versaoAtual,
        analisado_em: agoraIso,
      },
    })
  } catch (saveUnhandledErr) {
    console.log('Erro inesperado no salvamento da análise:', saveUnhandledErr.message)
    return e.json(500, {
      success: false,
      error:
        'A análise foi processada, mas ocorreu um erro interno ao salvar o resultado no sistema.',
      details: saveUnhandledErr.message,
      code: 'SAVE_PROCESSING_ERROR',
    })
  }
})

/**
 * Rota para o RH confirmar explicitamente que o vídeo pertence ao candidato
 * mesmo após alerta de divergência de nome/identidade.
 * Rota: POST /backend/v1/confirmar-conflito-video
 */
routerAdd(
  'POST',
  '/backend/v1/confirmar-conflito-video',
  (e) => {
    const body = e.requestInfo().body || {}
    const candidatoId = body.candidatoId
    const justificativaRh = body.justificativa || 'Confirmado manualmente pelo RH'

    if (!candidatoId) {
      return e.json(400, { error: 'candidatoId é obrigatório' })
    }

    try {
      const existing = $app.findRecordsByFilter(
        'analises_video_ia',
        `candidato = '${candidatoId}'`,
        '-created',
        1,
      )

      if (existing.length === 0) {
        return e.json(404, { error: 'Nenhuma análise encontrada para este candidato' })
      }

      const analise = existing[0]
      analise.set('conflito_confirmado_rh', true)
      analise.set(
        'detalhes_conflito_identidade',
        `${analise.getString('detalhes_conflito_identidade')} [Confirmado pelo RH: ${justificativaRh} em ${new Date().toISOString()}]`,
      )
      $app.save(analise)

      try {
        const cand = $app.findRecordById('candidatos', candidatoId)
        cand.set('video_conflito_identidade', false)
        $app.save(cand)
      } catch (_) {}

      return e.json(200, {
        success: true,
        message: 'Vínculo do vídeo confirmado com sucesso pelo RH.',
      })
    } catch (err) {
      return e.json(500, { error: err.message })
    }
  },
  $apis.requireAuth(),
)
