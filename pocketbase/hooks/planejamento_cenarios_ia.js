/**
 * Endpoint de Apoio de IA para Cenários e Indicadores da Força de Trabalho
 * Rota: POST /api/planejamento/cenarios-ia
 *
 * Padrão Skip Cloud: Gateway $ai.chat com modelo skip-default
 *
 * Regras estritas de governança e segurança:
 *  1. Autenticação obrigatória.
 *  2. Escopo por BU do usuário aplicado ANTES de carregar qualquer dado ou montar o prompt:
 *     - Gestor Contratante só acessa dados de sua própria BU/empresa.
 *     - RH / Recrutador acessa amplo.
 *  3. Cálculos são SEMPRE determinísticos (feitos pelos serviços ou enviados pelo cliente); a IA só explica e resume.
 *  4. Proibições absolutas:
 *     - Não inventar competências, custos ou disponibilidade.
 *     - Não aprovar planos, nem efetivar alocações, nem abrir vagas diretamente.
 *     - Não inferir personalidade nem perfil por imagem/voz.
 *     - Não enviar dados pessoais ou individuais desnecessários (anonimização por cargo/papel).
 *  5. Degradação graciosa: se o $ai falhar ou a chave estiver ausente, retorna síntese heurística determinística
 *     sem travar o fluxo dos cenários.
 */

routerAdd('POST', '/backend/v1/planejamento/cenarios-ia', (e) => {
  const authRecord = e.auth
  if (!authRecord) {
    return e.json(401, { error: 'Autenticação necessária' })
  }

  const role = authRecord.getString('cargo_funcao')
  const userEmpresaId = authRecord.getString('empresa')

  let data = {}
  try {
    data = e.requestInfo().body || {}
  } catch (_) {
    data = {}
  }

  const cenarioId = data.cenarioId
  const empresaId = data.empresaId || userEmpresaId
  const acao = data.acao || 'explicar_cenario' // 'explicar_cenario' | 'sugerir_alternativas' | 'justificativa_adocao'

  // Regra de Escopo por BU
  if (role === 'Gestor Contratante') {
    if (empresaId && empresaId !== userEmpresaId) {
      return e.json(403, {
        error: 'Acesso negado: gestor só pode analisar cenários da própria BU.',
      })
    }
  }

  let cenarioRecord = null
  if (cenarioId) {
    try {
      cenarioRecord = e.app.findRecordById('cenarios_capacidade', cenarioId)
      // Checa escopo de BU no registro encontrado
      const cenarioEmpresa = cenarioRecord.getString('empresa')
      if (role === 'Gestor Contratante' && cenarioEmpresa !== userEmpresaId) {
        return e.json(403, { error: 'Acesso negado: cenário pertence a outra empresa/BU.' })
      }
    } catch (_) {
      // Cenário pode ser novo em memória não persistido
    }
  }

  // Prepara dados objetivos para contextualizar a IA
  const payloadResumo = {
    nome_cenario: cenarioRecord
      ? cenarioRecord.getString('nome')
      : data.nomeCenario || 'Cenário em Estudo',
    objetivo: cenarioRecord
      ? cenarioRecord.getString('objetivo')
      : data.objetivo || 'Não informado',
    horizonte: cenarioRecord
      ? cenarioRecord.getString('horizonte_temporal')
      : data.horizonte || 'Próximos 6 meses',
    premissas: cenarioRecord ? cenarioRecord.get('premissas') : data.premissas || {},
    alternativas: cenarioRecord ? cenarioRecord.get('alternativas') : data.alternativas || [],
    qualidade_dados: cenarioRecord
      ? cenarioRecord.getString('qualidade_dados_declarada')
      : 'Dados declarados pelo usuário',
  }

  const systemPrompt = `Você é um Assistente Estratégico Especialista em Planejamento da Força de Trabalho (Workforce Planning) e Governança de RH Corporativo.
Seu papel é estritamente de consultoria, explicação e estruturação de justificativas decisórias.

DIRETRIZES FUNDAMENTAIS:
1. Responda em Português do Brasil com clareza executiva, baseando-se EXCLUSIVAMENTE nos dados fornecidos no contexto.
2. NUNCA invente números, competências, custos, disponibilidades de talentos ou prazos.
3. Se algum dado estiver faltando (ex: custos ocultos, impacto no projeto de origem), declare explicitamente como "DADO AUSENTE / LIMITAÇÃO".
4. Lembre que realocações internas SEMPRE causam perda ou risco no projeto de origem; e programas de capacitação NÃO geram ganho imediato (possuem curva de aprendizagem).
5. Serviços contratados por entrega/escopo medem entregáveis, NÃO horas intercambiáveis.
6. A decisão final é 100% humana (comitê de governança e RH). Nenhuma recomendação sua substitui autorização formal.`

  const userPrompt = `Ação solicitada: ${acao}
Dados do Cenário:
${JSON.stringify(payloadResumo, null, 2)}

Elabore sua resposta estruturada nas seguintes seções:
1. SÍNTESE E TRADE-OFFS PRINCIPAIS: Resumo comparativo das alternativas avaliadas.
2. IMPACTOS NA ORIGEM E DEPENDÊNCIAS: Perda de capacidade em outros times, gargalos e prazos de maturação.
3. DADOS AUSENTES E LIMITAÇÕES: O que falta para a liderança poder decidir com segurança.
4. RECOMENDAÇÃO TÉCNICA E JUSTIFICATIVA EDITÁVEL: Texto base para a governança avaliar a viabilidade de aprovação de proposta de revisão.`

  try {
    const res = $ai.chat({
      model: 'skip-default',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
    })

    const respostaTexto =
      res && res.choices && res.choices[0] && res.choices[0].message
        ? res.choices[0].message.content
        : ''

    if (respostaTexto) {
      return e.json(200, {
        sucesso: true,
        origem: 'skip_ai',
        conteudo: respostaTexto,
        metadados: {
          cenario_avaliado: payloadResumo.nome_cenario,
          total_alternativas: Array.isArray(payloadResumo.alternativas)
            ? payloadResumo.alternativas.length
            : 0,
          requer_validacao_humana: true,
        },
      })
    }
  } catch (err) {
    // Degradação graciosa: se o gateway AI falhar, fornece síntese analítica determinística
  }

  // SÍNTESE DETERMINÍSTICA HEURÍSTICA DE DEGRADAÇÃO GRACIOSA
  const alternativasList = Array.isArray(payloadResumo.alternativas)
    ? payloadResumo.alternativas
    : []
  let sinteseHeuristica = `### SÍNTESE EXECUTIVA DO CENÁRIO (Modo Determinístico de Segurança)\n\n`
  sinteseHeuristica += `**Cenário:** ${payloadResumo.nome_cenario}\n`
  sinteseHeuristica += `**Objetivo:** ${payloadResumo.objetivo}\n\n`
  sinteseHeuristica += `#### 1. ANÁLISE COMPARATIVA DE ALTERNATIVAS\n`

  if (alternativasList.length === 0) {
    sinteseHeuristica += `- Nenhuma alternativa estruturada foi informada neste cenário. Cadastre opções para comparação.\n`
  } else {
    for (const alt of alternativasList) {
      sinteseHeuristica += `- **${alt.titulo || alt.tipo}**: Custo mensal R$ ${(alt.custo_incremental_mensal || 0).toLocaleString('pt-BR')}, Custo pontual R$ ${(alt.custo_pontual || 0).toLocaleString('pt-BR')}, Prazo: ${alt.prazo_disponibilizacao_dias || 0} dias.\n`
      if (alt.impacto_origem) {
        sinteseHeuristica += `  *Impacto na Origem:* ${alt.impacto_origem}\n`
      }
      if (alt.riscos && alt.riscos.length > 0) {
        sinteseHeuristica += `  *Riscos Identificados:* ${alt.riscos.join('; ')}\n`
      }
    }
  }

  sinteseHeuristica += `\n#### 2. DADOS AUSENTES E GOVERNANÇA\n`
  sinteseHeuristica += `- Este cenário não altera alocações reais nem o plano-base vigente.\n`
  sinteseHeuristica += `- Adoção gera proposta de revisão formal no fluxo de governança de RH.\n`

  return e.json(200, {
    sucesso: true,
    origem: 'heuristica_deterministica',
    conteudo: sinteseHeuristica,
    metadados: {
      cenario_avaliado: payloadResumo.nome_cenario,
      total_alternativas: alternativasList.length,
      requer_validacao_humana: true,
    },
  })
})
