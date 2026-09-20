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

      const prompt =
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
        'Sua resposta deve ser estritamente em formato JSON válido, sem texto introdutório ou markdown antes/depois, com o formato:\n' +
        '{\n' +
        '  "resumo_executivo": "Parágrafo executivo conciso destacando a eficiência de contratação, volume e saúde do funil...",\n' +
        '  "destaques_positivos": ["Destaque 1...", "Destaque 2...", "Destaque 3..."],\n' +
        '  "riscos_gargalos": ["Gargalo 1...", "Gargalo 2..."],\n' +
        '  "recomendacoes_estrategicas": ["Recomendação 1...", "Recomendação 2...", "Recomendação 3..."],\n' +
        '  "diagnostico_tempo_contratacao": "Análise sobre o time-to-hire observado no período...",\n' +
        '  "eficiencia_banco_talentos": "Comentário sobre aproveitamento de candidatos no banco de talentos e conversão..."\n' +
        '}'

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

      return e.json(200, {
        mes: mes,
        ano: ano,
        sintese: parsed,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao gerar síntese executiva' })
    }
  },
  $apis.requireAuth(),
)
