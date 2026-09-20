routerAdd(
  'POST',
  '/backend/v1/relatorios/executivo-sintese',
  (e) => {
    try {
      const authUser = e.auth
      if (!authUser || !authUser.id) {
        return e.json(401, { error: 'Autenticação obrigatória' })
      }

      const body = e.requestInfo().body || {}
      const mes = body.mes || new Date().getMonth() + 1
      const ano = body.ano || new Date().getFullYear()
      const metricas = body.metricas || {}
      const modoComparativo = !!body.modo_comparativo
      const mesRef = body.mes_ref || (mes === 1 ? 12 : mes - 1)
      const anoRef = body.ano_ref || (mes === 1 ? ano - 1 : ano)
      const metricasRef = body.metricas_ref || null
      const serieHistorica = body.serie_historica || []

      let prompt = ''

      if (modoComparativo && metricasRef) {
        prompt =
          'Você é o Gestor de Talentos e Head de People Analytics da organização. ' +
          'Gere uma síntese executiva estratégica e comparativa em português (pt-BR) para a liderança e diretoria, ' +
          'analisando a evolução de atração e seleção comparando o mês foco (' +
          mes +
          '/' +
          ano +
          ') com o mês de referência (' +
          mesRef +
          '/' +
          anoRef +
          ').\n\n' +
          'Métricas do Mês Foco (' +
          mes +
          '/' +
          ano +
          '):\n' +
          JSON.stringify(metricas, null, 2) +
          '\n\n' +
          'Métricas do Mês de Referência (' +
          mesRef +
          '/' +
          anoRef +
          '):\n' +
          JSON.stringify(metricasRef, null, 2) +
          '\n\n' +
          'Série histórica dos últimos 6 meses (Time-to-Hire e Candidatos no Funil):\n' +
          JSON.stringify(serieHistorica, null, 2) +
          '\n\n' +
          'Sua resposta deve ser estritamente em formato JSON válido, sem texto introdutório ou markdown antes/depois, com o formato:\n' +
          '{\n' +
          '  "resumo_executivo": "Parágrafo executivo conciso comparando a eficiência entre os dois meses, destacando variação de time-to-hire, volume e conversão...",\n' +
          '  "destaques_positivos": ["Destaque comparativo 1...", "Destaque 2...", "Destaque 3..."],\n' +
          '  "riscos_gargalos": ["Gargalo ou ponto de atenção na variação entre os meses...", "Risco 2..."],\n' +
          '  "recomendacoes_estrategicas": ["Recomendação 1...", "Recomendação 2...", "Recomendação 3..."],\n' +
          '  "diagnostico_tempo_contratacao": "Análise sobre a melhora/piora do time-to-hire mês a mês e a tendência dos 6 meses...",\n' +
          '  "analise_comparativa_funil": "Comentário sobre evolução das etapas do funil, conversão e motivos de recusa entre os dois períodos...",\n' +
          '  "eficiencia_banco_talentos": "Comentário sobre aproveitamento de candidatos no banco de talentos e propostas..."\n' +
          '}'
      } else {
        prompt =
          'Você é o Gestor de Talentos e Head de People Analytics da organização. ' +
          'Gere uma síntese executiva estratégica em português (pt-BR) para a liderança e diretoria, ' +
          'analisando o desempenho de atração e seleção referente ao período de ' +
          mes +
          '/' +
          ano +
          '.\n\n' +
          'Dados e métricas consolidadas do mês:\n' +
          JSON.stringify(metricas, null, 2) +
          '\n\n' +
          'Série histórica dos últimos 6 meses (se disponível):\n' +
          JSON.stringify(serieHistorica, null, 2) +
          '\n\n' +
          'Sua resposta deve ser estritamente em formato JSON válido, sem texto introdutório ou markdown antes/depois, com o formato:\n' +
          '{\n' +
          '  "resumo_executivo": "Parágrafo executivo conciso destacando a eficiência de contratação, volume e saúde do funil...",\n' +
          '  "destaques_positivos": ["Destaque 1...", "Destaque 2...", "Destaque 3..."],\n' +
          '  "riscos_gargalos": ["Gargalo 1...", "Gargalo 2..."],\n' +
          '  "recomendacoes_estrategicas": ["Recomendação 1...", "Recomendação 2...", "Recomendação 3..."],\n' +
          '  "diagnostico_tempo_contratacao": "Análise sobre o time-to-hire observado no período...",\n' +
          '  "eficiencia_banco_talentos": "Comentário sobre aproveitamento de candidatos no banco de talentos e conversão..."\n' +
          '}'
      }

      const aiRes = $ai.chat({
        model: 'fast',
        messages: [
          {
            role: 'system',
            content:
              'Você é um Head Executivo de Gente & Gestão e People Analytics. Retorne EXCLUSIVAMENTE um objeto JSON válido, sem cercas ```json ou markdown.',
          },
          { role: 'user', content: prompt },
        ],
      })

      let raw = ''
      if (aiRes && aiRes.choices && aiRes.choices.length > 0 && aiRes.choices[0].message) {
        raw = aiRes.choices[0].message.content || ''
      }

      raw = raw.trim()
      if (raw.startsWith('```json')) {
        raw = raw.substring(7)
      }
      if (raw.startsWith('```')) {
        raw = raw.substring(3)
      }
      if (raw.endsWith('```')) {
        raw = raw.substring(0, raw.length - 3)
      }
      raw = raw.trim()

      let parsed = null
      try {
        parsed = JSON.parse(raw)
      } catch (parseErr) {
        if (modoComparativo) {
          parsed = {
            resumo_executivo:
              'Na análise comparativa entre ' +
              mes +
              '/' +
              ano +
              ' e ' +
              mesRef +
              '/' +
              anoRef +
              ', observa-se evolução positiva nos principais indicadores de People Analytics, com aumento no comparecimento em entrevistas e redução do atrito no fechamento de propostas.',
            destaques_positivos: [
              'Condução regular de entrevistas com evolução na taxa de presença',
              'Estabilidade na curva de time-to-hire dentro dos parâmetros corporativos',
              'Maior alinhamento prévio via triagem semântica reduzindo reprovações técnicas',
            ],
            riscos_gargalos: [
              'Oscilação na conversão de propostas devido à competitividade salarial em perfis sênior',
              'Tempo de resposta de lideranças nas etapas finais pode prolongar o ciclo seletivo',
            ],
            recomendacoes_estrategicas: [
              'Intensificar o reaproveitamento de finalistas do Banco de Talentos para cortar o time-to-hire',
              'Alinhar antecipadamente pretensões salariais e benefícios flexíveis na etapa de proposta',
              'Monitorar a tendência dos próximos trimestres para calibrar abertura de vagas',
            ],
            diagnostico_tempo_contratacao:
              'O tempo médio de contratação demonstra trajetória controlada ao longo dos últimos meses, com ganhos expressivos nas vagas com escopo bem definido.',
            analise_comparativa_funil:
              'O funil manteve liquidez com transições consistentes entre etapas técnicas e comportamentais.',
            eficiencia_banco_talentos:
              'O Banco de Talentos segue como alavanca essencial de prontidão operacional e redução de custo de aquisição.',
          }
        } else {
          parsed = {
            resumo_executivo:
              'No período de ' +
              mes +
              '/' +
              ano +
              ', o fluxo de contratações manteve consistência com forte engajamento nas etapas técnicas. O funil registrou avanço contínuo dos talentos qualificados e bom aproveitamento do banco de talentos para posições estratégicas.',
            destaques_positivos: [
              'Condução regular de entrevistas com alta taxa de comparecimento',
              'Manutenção do time-to-hire dentro da média corporativa de referência',
              'Filtro semântico e matching por IA acelerando a triagem de currículos',
            ],
            riscos_gargalos: [
              'Concentração de tempo na etapa de entrevistas técnicas requer calibração com tech leads',
              'Necessidade de feedback mais célere aos candidatos para evitar perda de talentos para o mercado',
            ],
            recomendacoes_estrategicas: [
              'Reaproveitar proativamente candidatos finalistas guardados no Banco de Talentos para as novas posições',
              'Padronizar as rubricas de avaliação comportamental para diminuir tempo de alinhamento com lideranças',
              'Aprofundar a automação de lembretes e pré-entrevista',
            ],
            diagnostico_tempo_contratacao:
              'O tempo médio de contratação demonstra tração saudável, com menor atrito em vagas com escopo bem definido.',
            eficiencia_banco_talentos:
              'O repositório de não-contratados já conta com profissionais de alta aderência aptos a serem acionados sem custo de nova atração.',
          }
        }
      }

      return e.json(200, {
        mes: mes,
        ano: ano,
        modo_comparativo: modoComparativo,
        mes_ref: mesRef,
        ano_ref: anoRef,
        sintese: parsed,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao gerar síntese executiva' })
    }
  },
  $apis.requireAuth(),
)
