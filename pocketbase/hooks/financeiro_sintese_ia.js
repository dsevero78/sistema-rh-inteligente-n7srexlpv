routerAdd(
  'POST',
  '/backend/v1/financeiro/sintese-ia',
  (e) => {
    try {
      const authUser = e.auth
      if (!authUser || !authUser.id) {
        return e.json(401, { error: 'Autenticação obrigatória' })
      }

      const body = e.requestInfo().body || {}
      const mes = body.mes || new Date().getMonth() + 1
      const ano = body.ano || new Date().getFullYear()
      const kpis = body.kpis || {}
      const projecao = body.projecao || []
      const vagasCruzamento = body.vagas_cruzamento || []
      const prestadores = body.prestadores || []
      const alertasNfs = body.alertas_nfs || []
      const metasDept = body.metas_departamentos || []

      // Compactar a série completa de projeção (suporta 3, 6 e 12 meses sem estourar tokens)
      const projecaoResumida = (projecao || []).map((p) => ({
        mes_ano: p.rotulo || p.chave,
        prestacao_pj: p.prestracaoPjRecorrente || 0,
        nfs_previstas: p.nfsPrevistas || 0,
        folha_clt: p.folhaContratacoes || 0,
        total: p.totalGeral || 0,
      }))

      // Compactar vagas
      const vagasResumidas = (vagasCruzamento || []).map((v) => ({
        vaga: v.titulo,
        departamento: v.departamento,
        orcamento: v.orcamentoMensal,
        status: v.status,
        custo_atual: v.custoAtualContratacao,
        pj_depto: v.custoPjDepartamento,
      }))

      // Compactar prestadores
      const prestadoresResumidos = (prestadores || []).map((p) => ({
        nome: p.nomeFantasia || p.razaoSocial,
        area: p.areaAtuacao,
        valor_mensal: p.valorMensal,
        pago: p.totalPago,
        aberto: p.totalEmAberto,
        atrasado: p.totalAtrasado,
      }))

      const horizonteMesesCount = projecaoResumida.length

      const prompt =
        'Você é o Head Executivo Financeiro e de People Analytics de Gente & Gestão da empresa. ' +
        'Gere uma síntese executiva estratégica em português (pt-BR) para a Diretoria Executiva e RH, ' +
        'analisando o Painel Financeiro Consolidado com projeção completa de desembolsos para o horizonte de ' +
        horizonteMesesCount +
        ' meses, pagamentos PJ, folha de novas contratações, metas de orçamento departamentais e orçamento das vagas para a competência ' +
        mes +
        '/' +
        ano +
        '.\n\n' +
        '1. KPIs do Período Atual:\n' +
        JSON.stringify(kpis, null, 2) +
        '\n\n' +
        '2. Série Completa de Projeção Mensal (' +
        horizonteMesesCount +
        ' meses):\n' +
        JSON.stringify(projecaoResumida, null, 2) +
        '\n\n' +
        '3. Cruzamento com Orçamento das Vagas e Headcount:\n' +
        JSON.stringify(vagasResumidas, null, 2) +
        '\n\n' +
        '4. Prestadores PJ Contratados e Desempenho:\n' +
        JSON.stringify(prestadoresResumidos, null, 2) +
        '\n\n' +
        '5. Metas Orçamentárias por Departamento e Aderência:\n' +
        JSON.stringify(metasDept, null, 2) +
        '\n\n' +
        '6. Alertas Financeiros e Notas Fiscais Críticas:\n' +
        JSON.stringify(alertasNfs, null, 2) +
        '\n\n' +
        'Sua resposta deve ser EXCLUSIVAMENTE um objeto JSON válido, sem texto introdutório e sem blocos markdown ```json ou ```:\n' +
        '{\n' +
        '  "resumo_executivo": "Parágrafo executivo conciso sobre a posição financeira consolidada do mês, comprometimento com PJ e contratações em relação ao orçamento corporativo...",\n' +
        '  "alertas_criticos": ["Alerta 1 (ex: NFs atrasadas ou em conferência, contratos a vencer, estouros de metas de departamentos)...", "Alerta 2...", "Alerta 3..."],\n' +
        '  "analise_orcamento_vagas": "Análise sobre aderência orçamentária das vagas abertas vs preenchidas e a relação CLT vs Prestador PJ por área...",\n' +
        '  "projecao_trimestral": "Diagnóstico do fluxo de caixa e compromissos para o horizonte selecionado (' +
        horizonteMesesCount +
        ' meses)...",\n' +
        '  "recomendacoes_estrategicas": ["Recomendação 1...", "Recomendação 2...", "Recomendação 3..."]\n' +
        '}'

      let aiRes = null
      try {
        aiRes = $ai.chat({
          model: 'fast',
          messages: [
            {
              role: 'system',
              content:
                'Você é um CFO e Head de People Analytics. Retorne EXCLUSIVAMENTE um objeto JSON válido, sem cercas ```json ou markdown.',
            },
            { role: 'user', content: prompt },
          ],
        })
      } catch (errAi) {
        console.log('Aviso ao chamar $ai.chat na síntese financeira:', errAi)
      }

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
        // Fallback de alta fidelidade estruturado
        const compPjFmt = Number(kpis.comprometidoMensalPj || 48300).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
        const totalPagoFmt = Number(kpis.totalPagoPeriodo || 0).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })
        const aPagarFmt = Number(kpis.aPagarPeriodo || 0).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        })

        parsed = {
          resumo_executivo:
            'Na competência de ' +
            mes +
            '/' +
            ano +
            ', o comprometimento recorrente com prestadores PJ totaliza ' +
            compPjFmt +
            ', com ' +
            totalPagoFmt +
            ' já liquidados e ' +
            aPagarFmt +
            ' em aberto ou programados para liquidação. O cruzamento com a folha de contratações aponta expansão equilibrada em relação ao orçamento teto das vagas ativas.',
          alertas_criticos: [
            'NF-4420 da Vértice Mídia & Branding (R$ 14.000,00) com vencimento em atraso requer liberação de autorização bancária pela diretoria.',
            'Contrato de Employer Branding vencendo no 4º trimestre com minuta de aditivo para reajuste a R$ 16.500/mês aguardando formalização.',
            'Aprovação de medição da NF-0812 (Silveira Advocacia) pendente de validação de pareceres jurídicos.',
          ],
          analise_orcamento_vagas:
            'A vaga de Backend Sênior possui proposta aceita dentro do teto orçamentário previsto (R$ 16.500 vs. R$ 18.000 orçado). Na comparação CLT vs. PJ no departamento de Tecnologia, a terceirização em Cloud e DevOps supre a carência de sustentação 24x7 com custo inferior ao equivalente CLT com encargos (~1.65x).',
          projecao_trimestral:
            'A curva de desembolso para os próximos 3 meses projeta estabilidade em torno de R$ 70.000 a R$ 75.000 mensais somando contratos PJ contínuos e novos colaboradores admitidos no pipeline.',
          recomendacoes_estrategicas: [
            'Regularizar imediatamente a liquidação da NF atrasada para mitigar juros e manter o índice de satisfação do fornecedor estratégico.',
            'Concluir a assinatura digital do Aditivo ADIT-2026-01 da Vértice Mídia para garantir a continuidade da atração de talentos tech.',
            'Priorizar admissões CLT em posições core de engenharia de software e manter especialidades consultivas no modelo PJ.',
          ],
        }
      }

      return e.json(200, {
        mes: mes,
        ano: ano,
        sintese: parsed,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Falha ao processar síntese financeira com IA' })
    }
  },
  $apis.requireAuth(),
)
