/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Garantir que os dados dos 3 prestadores chave reflitam com fidelidade o semáforo do comparativo
    // P1: Nexus Cloud (CNPJ 28.491.503/0001-82) - R$ 24.500/mês, nota 9.5, prorrogado até 31/12/2026
    // P2: Vértice Mídia (CNPJ 34.819.204/0001-95) - R$ 14.000/mês, nota 8.8, vencendo em ~20 dias
    // P3: Silveira Advocacia (CNPJ 19.340.892/0001-30) - R$ 9.800/mês, nota 9.0, vigência até 2027

    let p1 = null
    let p2 = null
    let p3 = null
    try {
      p1 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '28.491.503/0001-82')
    } catch (_) {}
    try {
      p2 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '34.819.204/0001-95')
    } catch (_) {}
    try {
      p3 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '19.340.892/0001-30')
    } catch (_) {}

    if (p1) {
      p1.set('media_avaliacao', 9.5)
      p1.set('valor_mensal_atual', 24500)
      p1.set('status', 'Ativo')
      app.save(p1)
    }

    if (p2) {
      p2.set('media_avaliacao', 8.8)
      p2.set('valor_mensal_atual', 14000)
      p2.set('status', 'Em renovação')
      app.save(p2)
    }

    if (p3) {
      p3.set('media_avaliacao', 9.0)
      p3.set('valor_mensal_atual', 9800)
      p3.set('status', 'Ativo')
      app.save(p3)
    }

    // 2. Garantir que o contrato da Vértice Mídia esteja vencendo em ~20 dias a partir da data de referência
    // e com status 'Vencendo'
    if (p2) {
      try {
        const c2 = app.findFirstRecordByData('contratos_pj', 'numero_contrato', 'CT-PJ-2025-089')
        if (c2) {
          c2.set('status', 'Vencendo')
          c2.set('valor', 14000)
          app.save(c2)
        }
      } catch (errC2) {
        console.log('Aviso ao ajustar contrato da Vértice Mídia:', errC2)
      }
    }

    // 3. Atualizar o agente "gestor-de-talentos" com memória especializada para:
    // "quais contratos estão em janela de renovação e o que fazer"
    // e garantir permissões de leitura completas nas coleções relevantes
    try {
      $ai.agents.putTools(app, 'gestor-de-talentos', [
        {
          collection: 'prestadores_pj',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'contratos_pj',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'aditivos_pj',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'avaliacoes_prestador_pj',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'alertas',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'eventos_timeline_pj',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
      ])

      $ai.agents.putMemories(app, 'gestor-de-talentos', [
        {
          type: 'text',
          payload: {
            text:
              'Diretrizes de Alertas de Renovação Inteligente de Prestadores PJ:\n' +
              '1. Janela de Renovação: Contratos a 60 dias ou menos do término de sua vigência efetiva (considerando o último aditivo vigente) entram em janela prioritária de renovação contratual.\n' +
              '2. Semáforo e Decisão do Comparativo de Custo:\n' +
              '   - 🟢 Renovar: Nota média de avaliação >= 9.0 e custo por ponto competitivo em relação à média do portfólio.\n' +
              '   - 🟡 Renegociar: Valor-hora (base 160h) acima da média com nota intermediária, ou aditivo pendente de assinatura, ou avaliação com recomendação "Renovar com ressalvas". Exemplo: Vértice Mídia & Branding (R$ 14.000/mês = R$ 87,50/h, nota 8.8, recomendação "Renovar com ressalvas", aditivo pendente de assinatura) -> Decisão: 🟡 Renegociar.\n' +
              '   - 🔴 Reavaliar: Nota média < 8.0 ou recomendação "Não renovar" ou relação custo-benefício desfavorável.\n' +
              '3. Quando perguntado "quais contratos estão em janela de renovação e o que fazer?":\n' +
              '   Consulte os contratos ativos em contratos_pj e os aditivos vigentes em aditivos_pj para calcular a vigência final efetiva e os dias restantes. Identifique quais contratos vencem em <= 60 dias. Para cada um, informe o prestador, o valor mensal atual (base 160h), a nota média em avaliacoes_prestador_pj, o custo por ponto, a decisão recomendada pelo semáforo (Renovar, Renegociar ou Reavaliar) e a ação sugerida (ex: readequar cláusulas/valores com o prestador, tramitar assinatura de aditivo ou formalizar prorrogação no painel Financeiro > Comparativo de Custo).',
          },
        },
      ])
    } catch (agentErr) {
      console.log('Aviso ao atualizar agente gestor-de-talentos na migration 0030:', agentErr)
    }

    // 4. Garantir que o alerta e o evento na timeline PJ existam para o prestador em janela (Vértice Mídia)
    if (p2) {
      try {
        const alertasCol = app.findCollectionByNameOrId('alertas')
        const timelineCol = app.findCollectionByNameOrId('eventos_timeline_pj')

        // Checar se já existe alerta de renovação recente para Vértice Mídia
        const alExist = app.findRecordsByFilter(
          'alertas',
          `prestador = '${p2.id}' && tipo = 'contrato_pj_vencendo'`,
          '-created',
          1,
          0,
        )

        const textoAlerta =
          'Alerta de Renovação Inteligente: O contrato "Gestão de Employer Branding" com Vértice Mídia & Branding vence em ~20 dias (10/10/2026). Decisão do Comparativo: 🟡 RENEGOCIAR. Valor mensal atual R$ 14.000,00 (R$ 87,50/h base 160h, custo por ponto R$ 9,94/pt). Nota de avaliação: 8.8/10 (Renovar com ressalvas). Recomendação: Renegociar escopo e valor contratual antes de firmar nova vigência ou regularizar o aditivo pendente.'

        if (!alExist || alExist.length === 0) {
          const novoAl = new Record(alertasCol)
          novoAl.set('prestador', p2.id)
          novoAl.set('score', 90)
          novoAl.set('tipo', 'contrato_pj_vencendo')
          novoAl.set('status', 'Novo')
          novoAl.set('resumo_ia', textoAlerta)
          novoAl.set('criado_em', new Date().toISOString())
          app.save(novoAl)
        } else {
          // Atualiza o texto do alerta com os números completos do comparativo se ainda estiver com resumo antigo
          const al = alExist[0]
          if (!al.getString('resumo_ia').includes('RENEGOCIAR')) {
            al.set('resumo_ia', textoAlerta)
            app.save(al)
          }
        }

        // Registrar evento correspondente na linha do tempo PJ se não existir
        if (timelineCol) {
          const evFilter = `prestador = '${p2.id}' && titulo ~ 'Renovação Contratual' && categoria = 'REGISTRO'`
          const evExist = app.findRecordsByFilter('eventos_timeline_pj', evFilter, '', 1, 0)
          if (!evExist || evExist.length === 0) {
            const ev = new Record(timelineCol)
            ev.set('prestador', p2.id)
            ev.set('categoria', 'REGISTRO')
            ev.set('titulo', 'Alerta de Renovação Contratual (60 dias):')
            ev.set(
              'complemento',
              'Contrato em janela de renovação (restam ~20 dias). Parecer do Comparativo de Custo: 🟡 Renegociar (R$ 87,50/h, nota 8.8, custo por ponto R$ 9,94).',
            )
            ev.set('autor', 'sistema')
            ev.set('origem', 'sistema')
            ev.set('data_evento', new Date().toISOString())
            ev.set('referencia_tipo', 'contrato_renovacao')
            app.save(ev)
          }
        }
      } catch (errAl) {
        console.log('Aviso ao semear alerta/evento de renovação para Vértice Mídia:', errAl)
      }
    }
  },
  (app) => {
    // Reversão limpa
  },
)
