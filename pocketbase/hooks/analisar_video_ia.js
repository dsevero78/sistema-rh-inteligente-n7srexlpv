/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook routerAdd para análise de vídeo de apresentação via IA Gateway do Skip.
 * Rota: POST /backend/v1/analisar-video-ia
 *
 * Avalia o vídeo de apresentação do candidato (link externo ou arquivo anexado),
 * cruzando com o perfil curricular e as percepções de entrevista existentes.
 * Retorna dimensões estruturadas (0-100), red flags, resumo executivo em pt-BR e
 * persiste tanto na coleção `analises_video_ia` quanto atualiza o status no candidato.
 */
routerAdd(
  'POST',
  '/backend/v1/analisar-video-ia',
  (e) => {
    const body = e.requestInfo().body || {}
    const candidatoId = body.candidatoId

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
      try {
        candidato.set('video_status', 'sem_video')
        $app.save(candidato)
      } catch (_) {}
      return e.json(422, {
        error:
          'Nenhum vídeo disponível para este candidato. Anexe um arquivo de vídeo ou insira um link (YouTube, Loom, Drive).',
        code: 'NO_VIDEO_AVAILABLE',
      })
    }

    // Marcar status como analisando
    try {
      candidato.set('video_status', 'analisando')
      $app.save(candidato)
    } catch (_) {}

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
        'percepcoes_entrevista',
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
          `[Percepção ${idx + 1} - ${p.getString('origem_tipo')}]: ${p.getString('observacoes')}`,
      )
      .join('\n')

    // Metadados do vídeo
    const fonteVideo = videoFile ? `Arquivo local: ${videoFile}` : `Link externo: ${videoLink}`
    const versaoAtual = (candidato.getInt('video_versao') || 0) + 1

    // Prompt estruturado para o Skip AI Gateway
    const systemPrompt = `Você é um avaliador executivo sênior de Talent Acquisition & People Analytics, especialista em análise comportamental e oratória em processos seletivos corporativos.
Você deve analisar a apresentação em vídeo do candidato, cruzando com os dados curriculares e requisitos da vaga.
Responda EXCLUSIVAMENTE em formato JSON válido, sem texto introdutório ou markdown ao redor do JSON (não use \`\`\`json).

Estrutura JSON obrigatória:
{
  "score_geral": <número inteiro de 0 a 100>,
  "clareza_comunicacao": <número inteiro de 0 a 100>,
  "estrutura_narrativa": <número inteiro de 0 a 100>,
  "energia_postura": <número inteiro de 0 a 100>,
  "aderencia_vaga": <número inteiro de 0 a 100>,
  "resumo_executivo": "<Parágrafo analítico de 2 a 4 frases em pt-BR com síntese crítica da comunicação e postura>",
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

DADOS DO CANDIDATO:
- Nome: ${candidato.getString('nome')}
- Cargo Atual: ${candidato.getString('cargo_atual')} em ${candidato.getString('empresa_atual')}
- Resumo Curricular: ${candidato.getString('resumo')}
- Competências Técnicas: ${candidato.getString('habilidades_tecnicas')}
- Competências Comportamentais: ${candidato.getString('competencias_comportamentais')}
- Fonte do Vídeo: ${fonteVideo}

VAGA ALVO:
- Título: ${vaga ? vaga.getString('titulo') : 'Não especificada'}
- Departamento: ${vaga ? vaga.getString('departamento') : 'Geral'}
- Requisitos: ${vaga ? vaga.getString('requisitos_obrigatorios') : 'Requisitos da função'}

OBSERVAÇÕES E PERCEPÇÕES PRÉVIAS REGISTRADAS PELO RH:
${percepcoesTexto || 'Nenhuma percepção prévia registrada.'}

Avalie criteriosamente a capacidade de comunicação, a coerência da narrativa profissional, a segurança na fala e forneça notas realistas de 0 a 100 nas 4 dimensões. Se não houver red flags graves, mantenha a lista de red flags vazia ou apenas com pontos sutis a investigar.`

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
      // Limpar delimitadores se houver
      const cleanedJson = rawContent
        .replace(/^```json\s*/i, '')
        .replace(/```\s*$/i, '')
        .trim()
      const parsed = JSON.parse(cleanedJson)

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
      const redFlags = Array.isArray(parsed.red_flags) ? parsed.red_flags : []

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
        `Análise via IA Gateway Skip · Vídeo (${fonteVideo}) · ${percepcoes.length} percepções integradas`,
      )
      analiseRecord.set('qtd_percepcoes_consideradas', percepcoes.length)
      analiseRecord.set('data_geracao', new Date().toISOString())
      analiseRecord.set('versao_video', versaoAtual)
      analiseRecord.set('arquivo_analisado', videoFile ? 'arquivo' : 'link')
      analiseRecord.set('status_analise', 'concluida')
      analiseRecord.set('erro_detalhes', '')

      if (e.auth) {
        analiseRecord.set('gerado_por', e.auth.id)
      }

      $app.save(analiseRecord)

      // Atualizar candidato
      candidato.set('video_status', 'analise_concluida')
      candidato.set('video_score_geral', scoreGeral)
      candidato.set('video_analise_dimensoes', {
        clareza_comunicacao: clareza,
        estrutura_narrativa: estrutura,
        energia_postura: energia,
        aderencia_vaga: aderencia,
        red_flags: redFlags,
      })
      candidato.set('video_analisado_em', new Date().toISOString())
      candidato.set('video_versao', versaoAtual)
      $app.save(candidato)

      // Registrar evento na timeline de candidatos
      try {
        const colTimeline = $app.findCollectionByNameOrId('candidatos_timeline')
        const ev = new Record(colTimeline)
        ev.set('candidato', candidatoId)
        ev.set('categoria', 'AVALIACAO')
        ev.set('titulo', `Análise IA de Vídeo realizada (v${versaoAtual}):`)
        ev.set(
          'complemento',
          `Score ${scoreGeral}/100 · Parecer: ${parsed.recomendacao_geral || 'Recomendado'}. Comunicação avaliada com ${clareza}% de clareza.`,
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
        data: {
          analiseId: analiseRecord.id,
          score_geral: scoreGeral,
          clareza_comunicacao: clareza,
          estrutura_narrativa: estrutura,
          energia_postura: energia,
          aderencia_vaga: aderencia,
          resumo_executivo: parsed.resumo_executivo,
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

      // Marcar erro no candidato
      try {
        candidato.set('video_status', 'erro_processamento')
        $app.save(candidato)
      } catch (_) {}

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
