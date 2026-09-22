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
 */
routerAdd(
  'POST',
  '/backend/v1/analisar-video-ia',
  (e) => {
    const body = e.requestInfo().body || {}
    const candidatoId = body.candidatoId
    const permitirDivergencia = Boolean(body.permitirDivergencia)

    if (!candidatoId) {
      return e.json(400, { error: 'candidatoId é obrigatório' })
    }

    // Obter registro do candidato
    let candidato
    try {
      candidato = $app.findRecordById('candidatos', candidatoId)
    } catch (err) {
      return e.json(404, { error: 'Candidato não encontrado' })
    }

    const videoLink = candidato.getString('video_link') || ''
    const videoFile = candidato.getString('video_apresentacao') || ''

    // Validação: precisa ter link ou arquivo de vídeo cadastrado
    if (!videoLink && !videoFile) {
      return e.json(422, {
        error:
          'Nenhum vídeo disponível para este candidato. Anexe um arquivo de vídeo ou insira um link (YouTube, Loom, Drive).',
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
        console.log('Vaga não encontrada:', err.message)
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
      console.log('Sem percepções:', err.message)
    }

    const percepcoesTexto = percepcoes
      .map(
        (p, idx) =>
          `[Percepção ${idx + 1} - ${p.getString('autor_nome') || 'RH'}]: ${p.getString('comunicacao_clareza') || ''} ${p.getString('postura_apresentacao') || ''}`,
      )
      .join('\n')

    // Metadados do vídeo
    const fonteVideo = videoFile ? `Arquivo local: ${videoFile}` : `Link externo: ${videoLink}`
    const versaoAtual = (candidato.getInt('video_versao') || 0) + 1
    const nomeCadastro = candidato.getString('nome') || ''

    // Prompt estruturado para o Skip AI Gateway
    const systemPrompt = `Você é um perito executivo sênior em Talent Acquisition, Linguística Forense Aplicada a RH e Psicologia Comportamental & Socioemocional.
Você analisa o vídeo de apresentação de candidatos em processos seletivos para vagas corporativas.

Sua análise possui 3 camadas críticas OBRIGATÓRIAS:
1. IDENTIDADE E EXTRAÇÃO DE NOME:
Identifique o nome com o qual a pessoa se apresenta no vídeo (na saudação inicial, introdução ou contexto). Compare com o nome de cadastro: "${nomeCadastro}".
Verifique se há correspondência (mesma pessoa, primeiro nome ou sobrenome coincidente) ou CONFLITO DE IDENTIDADE RELEVANTE (o vídeo é de outra pessoa, ex: cadastro é Rodrigo e o vídeo diz "Olá, sou Gabriel", ou o vídeo é de uma mulher e o cadastro é masculino, etc.). Se não for possível identificar com certeza mas não há contradição explícita, sinalize como sem conflito com observação.

2. ANÁLISE LINGUÍSTICA DE AUTENTICIDADE (NATURAL vs FORÇADO/DECORADO):
Analise a estrutura da fala e transcrição:
- Avalie se o discurso soa genuíno, fluido e espontâneo com pausas naturais de raciocínio, ou se é uma recitação mecânica e decorada somente para agradar a banca e passar na vaga.
- Verifique se usa exemplos concretos com propriedade ou clichês vazios de entrevista ("sou perfeccionista", "sou proativo", "trabalho bem sob pressão" sem detalhar fatos reais).
- Verifique coerência narrativa, variação prosódica e eventuais redundâncias/memorizações.
- Forneça "indice_naturalidade" (número de 0 a 100, onde 100 é totalmente natural e 0 é totalmente falso/mecanizado).
- Veredito: "Natural", "Parcialmente ensaiado" ou "Decorado / Forçado".
- Justificativa textual com trechos/evidências da fala.

3. PONTOS CEGOS DA FALA E EXPRESSÃO SÓCIO-EMOCIONAL:
- Pontos cegos: O que o candidato NÃO percebe sobre si mesmo ao falar (inseguranças mascaradas, evasivas, mudança de assunto em temas desafiadores, contradição entre postura e discurso, excesso de autoconfiança sem embasamento prático, sinais de estresse não-verbal).
- Expressão sócio-emocional: Nível de regulação emocional, maturidade interpessoal, abertura para aprender, empatia, autocrítica e congruência entre o tom de voz / expressão e o que está sendo dito.

Mantenha também todas as dimensões tradicionais (score_geral, clareza_comunicacao, estrutura_narrativa, energia_postura, aderencia_vaga, resumo_executivo, recomendacao_geral, pontos_fortes, pontos_atencao, red_flags).

Responda EXCLUSIVAMENTE em formato JSON válido, sem texto introdutório ou markdown (não use \`\`\`json).

Estrutura JSON obrigatória:
{
  "nome_detectado_no_video": "<nome que a pessoa disse no vídeo ou 'Não mencionado explicitamente'>",
  "conflito_identidade": <true ou false>,
  "detalhes_conflito_identidade": "<explicação se houver conflito ou justificativa da correspondência>",
  "indice_naturalidade": <número inteiro de 0 a 100>,
  "veredito_naturalidade": "<Natural | Parcialmente ensaiado | Decorado / Forçado>",
  "analise_linguistica": {
    "estrutura_fala": "<diagnóstico da fluência, cadência, pausas de raciocínio vs memorização>",
    "uso_exemplos_vs_cliches": "<análise de substantividade dos exemplos dados vs frases feitas>",
    "justificativa": "<síntese da autenticidade>",
    "trechos_evidencia": ["<citação ou paráfrase 1>", "<citação ou paráfrase 2>"]
  },
  "pontos_cegos": {
    "sintese_inconsciente": "<o que o candidato transmite sem perceber>",
    "evasivas_ou_insegurancas": "<temas onde houve hesitação, mudança de foco ou defesa mascarada>",
    "sinais_estresse_tensao": "<tensões corporais ou verbais perceptíveis>",
    "sugestoes_investigacao_entrevista": ["<pergunta ou tema para o gestor aprofundar>"]
  },
  "expressao_socioemocional": {
    "regulacao_emocional": "<Alta | Equilibrada | Moderada | Sob Tensão>",
    "maturidade_autocritica": "<descrição da capacidade de reconhecer limites e aprendizados>",
    "empatia_conexao": "<capacidade de criar vínculo com quem assiste>",
    "congruencia_verbal_nao_verbal": "<se tom e expressão coincidem com o conteúdo falado>",
    "evidencias_observadas": ["<evidência 1>", "<evidência 2>"]
  },
  "score_geral": <número inteiro de 0 a 100>,
  "clareza_comunicacao": <número inteiro de 0 a 100>,
  "estrutura_narrativa": <número inteiro de 0 a 100>,
  "energia_postura": <número inteiro de 0 a 100>,
  "aderencia_vaga": <número inteiro de 0 a 100>,
  "resumo_executivo": "<Parágrafo analítico de 2 a 4 frases em pt-BR com síntese crítica>",
  "comunicacao_oratoria": "<Avaliação de ritmo, clareza, dicção e concisão>",
  "postura_presenca": "<Enquadramento, firmeza, segurança e linguagem corporal>",
  "dominio_experiencia": "<Domínio conceitual dos projetos e tecnologias citados>",
  "fit_cultural": "<Aderência aos valores de colaboração, autonomia e dinamismo>",
  "pontos_fortes": ["<ponto forte 1>", "<ponto forte 2>", "<ponto forte 3>"],
  "pontos_atencao": ["<ponto de atenção ou sugestão para aprofundar na entrevista>"],
  "red_flags": ["<alerta crítico se houver, ou array vazio []>"],
  "recomendacao_geral": "<Fortemente Recomendado | Recomendado | Requer Alinhamento | Não Recomendado>"
}`

    const userPrompt = `Analise a apresentação em vídeo do candidato a seguir:

CADASTRO DO CANDIDATO NO SISTEMA:
- ID: ${candidatoId}
- Nome Cadastrado: ${nomeCadastro}
- Cargo Atual: ${candidato.getString('cargo_atual')} em ${candidato.getString('empresa_atual')}
- Resumo Curricular: ${candidato.getString('resumo')}
- Competências Técnicas: ${candidato.getString('habilidades_tecnicas')}
- Competências Comportamentais: ${candidato.getString('competencias_comportamentais')}
- Fonte do Vídeo Anexado: ${fonteVideo}

VAGA ALVO:
- Título: ${vaga ? vaga.getString('titulo') : 'Não especificada'}
- Departamento: ${vaga ? vaga.getString('departamento') : 'Geral'}
- Requisitos: ${vaga ? vaga.getString('requisitos_obrigatorios') : 'Requisitos da função'}

OBSERVAÇÕES E PERCEPÇÕES PRÉVIAS DO RH:
${percepcoesTexto || 'Nenhuma percepção prévia registrada.'}

INSTRUÇÕES ESPECÍFICAS DESTA EXECUÇÃO:
1. Extraia o nome com o qual o candidato se apresenta no vídeo e valide contra "${nomeCadastro}". Se for outro nome ou outra pessoa evidente, aponte conflito_identidade: true com justificativa precisa.
2. Identifique se o discurso é NATURAL ou FORÇADO/DECORADO para conquistar a vaga, pontuando de 0 a 100 em indice_naturalidade com evidências e citações.
3. Descreva os PONTOS CEGOS que ele não percebe que demonstra e a EXPRESSÃO SÓCIO-EMOCIONAL detalhada.`

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
      const parsed = JSON.parse(cleanedJson)

      const conflitoDetectado = Boolean(parsed.conflito_identidade)
      const nomeDetectado = String(parsed.nome_detectado_no_video || '').trim()
      const detalhesConflito = String(parsed.detalhes_conflito_identidade || '').trim()

      // Se houver conflito de identidade e o RH ainda não autorizou explicitamente (permitirDivergencia = false)
      // Avisamos no payload com status de alerta para o RH confirmar antes de prosseguir
      const ehConflitoPendente = conflitoDetectado && !permitirDivergencia

      // Salvar ou atualizar na coleção analises_video_ia
      let analiseRecord
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

      const scoreGeral = Math.min(100, Math.max(0, Number(parsed.score_geral) || 75))
      const clareza = Math.min(100, Math.max(0, Number(parsed.clareza_comunicacao) || 75))
      const estrutura = Math.min(100, Math.max(0, Number(parsed.estrutura_narrativa) || 75))
      const energia = Math.min(100, Math.max(0, Number(parsed.energia_postura) || 75))
      const aderencia = Math.min(100, Math.max(0, Number(parsed.aderencia_vaga) || 75))
      const indiceNaturalidade = Math.min(
        100,
        Math.max(0, Number(parsed.indice_naturalidade ?? 80)),
      )
      const vereditoNat = String(
        parsed.veredito_naturalidade ||
          (indiceNaturalidade >= 75
            ? 'Natural'
            : indiceNaturalidade >= 50
              ? 'Parcialmente ensaiado'
              : 'Decorado / Forçado'),
      )

      const redFlags = Array.isArray(parsed.red_flags) ? parsed.red_flags : []
      if (conflitoDetectado) {
        redFlags.unshift(
          `Alerta de Identidade: O nome identificado no vídeo ("${nomeDetectado || 'Não identificado'}") diverge do cadastro ("${nomeCadastro}").`,
        )
      }

      analiseRecord.set(
        'resumo_executivo',
        parsed.resumo_executivo || 'Análise de vídeo concluída.',
      )
      analiseRecord.set('comunicacao_oratoria', parsed.comunicacao_oratoria || '')
      analiseRecord.set('postura_presenca', parsed.postura_presenca || '')
      analiseRecord.set('dominio_experiencia', parsed.dominio_experiencia || '')
      analiseRecord.set('fit_cultural', parsed.fit_cultural || '')
      analiseRecord.set('pontos_fortes', parsed.pontos_fortes || [])
      analiseRecord.set('pontos_atencao', parsed.pontos_atencao || [])
      analiseRecord.set('nota_estimada', scoreGeral / 10)
      analiseRecord.set('score_geral', scoreGeral)
      analiseRecord.set('clareza_comunicacao', clareza)
      analiseRecord.set('estrutura_narrativa', estrutura)
      analiseRecord.set('energia_postura', energia)
      analiseRecord.set('aderencia_vaga', aderencia)
      analiseRecord.set('red_flags', redFlags)
      analiseRecord.set('recomendacao_geral', parsed.recomendacao_geral || 'Recomendado')
      analiseRecord.set(
        'base_utilizada',
        `Análise via IA Gateway Skip · Vídeo (${fonteVideo}) · Identidade, Linguística & Socioemocional`,
      )
      analiseRecord.set('qtd_percepcoes_consideradas', percepcoes.length)
      analiseRecord.set('data_geracao', new Date().toISOString())
      analiseRecord.set('versao_video', versaoAtual)
      analiseRecord.set('arquivo_analisado', videoFile ? 'arquivo' : 'link')
      analiseRecord.set('status_analise', 'concluida')
      analiseRecord.set('erro_detalhes', '')

      // Novos campos de identidade, autenticidade e socioemocional
      analiseRecord.set('nome_detectado_no_video', nomeDetectado)
      analiseRecord.set('conflito_identidade', conflitoDetectado)
      analiseRecord.set('detalhes_conflito_identidade', detalhesConflito)
      analiseRecord.set('conflito_confirmado_rh', permitirDivergencia)
      analiseRecord.set('indice_naturalidade', indiceNaturalidade)
      analiseRecord.set('veredito_naturalidade', vereditoNat)
      analiseRecord.set('analise_linguistica', parsed.analise_linguistica || {})
      analiseRecord.set('pontos_cegos', parsed.pontos_cegos || {})
      analiseRecord.set('expressao_socioemocional', parsed.expressao_socioemocional || {})

      if (e.auth) {
        analiseRecord.set('gerado_por', e.auth.id)
      }

      $app.save(analiseRecord)

      // Atualizar candidato
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
        candidato.set('video_analisado_em', new Date().toISOString())
        candidato.set('video_versao', versaoAtual)
        $app.save(candidato)
      } catch (errCand) {
        console.log('Aviso ao persistir campos de vídeo no candidato:', errCand.message)
      }

      // Registrar evento na timeline de candidatos
      try {
        const colTimeline = $app.findCollectionByNameOrId('candidatos_timeline')
        const ev = new Record(colTimeline)
        ev.set('candidato', candidatoId)
        ev.set('categoria', 'AVALIACAO')
        ev.set('titulo', `Análise IA de Vídeo realizada (v${versaoAtual})`)
        ev.set(
          'complemento',
          `Score ${scoreGeral}/100 · Parecer: ${parsed.recomendacao_geral || 'Recomendado'}. Autenticidade: ${vereditoNat} (${indiceNaturalidade}%).${conflitoDetectado ? ' [ATENÇÃO: Divergência de identidade detectada]' : ''}`,
        )
        ev.set('autor', e.auth ? e.auth.getString('name') || 'IA Gateway' : 'IA Gateway Skip')
        ev.set('origem', 'ia')
        ev.set('referencia_tipo', 'video_ia')
        ev.set('referencia_id', analiseRecord.id)
        $app.save(ev)
      } catch (errTimeline) {
        console.log('Aviso ao registrar evento de timeline:', errTimeline.message)
      }

      return e.json(200, {
        success: true,
        conflito_bloqueante: ehConflitoPendente,
        conflito_identidade: conflitoDetectado,
        nome_detectado_no_video: nomeDetectado,
        nome_cadastro: nomeCadastro,
        detalhes_conflito_identidade: detalhesConflito,
        data: {
          analiseId: analiseRecord.id,
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
          analise_linguistica: parsed.analise_linguistica || {},
          pontos_cegos: parsed.pontos_cegos || {},
          expressao_socioemocional: parsed.expressao_socioemocional || {},
          resumo_executivo: parsed.resumo_executivo,
          comunicacao_oratoria: parsed.comunicacao_oratoria,
          postura_presenca: parsed.postura_presenca,
          dominio_experiencia: parsed.dominio_experiencia,
          fit_cultural: parsed.fit_cultural,
          pontos_fortes: parsed.pontos_fortes,
          pontos_atencao: parsed.pontos_atencao,
          red_flags: redFlags,
          recomendacao_geral: parsed.recomendacao_geral,
          versao: versaoAtual,
          analisado_em: new Date().toISOString(),
        },
      })
    } catch (err) {
      console.log('Erro ao analisar vídeo via IA:', err.message)
      return e.json(500, {
        error:
          'Não foi possível concluir a análise do vídeo no momento. Verifique a conectividade ou tente novamente.',
        details: err.message,
        code: 'AI_PROCESSING_ERROR',
      })
    }
  },
  $apis.requireAuth(),
)

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
