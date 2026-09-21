/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Garantir que os 3 prestadores existentes estejam calibrados e com avaliação
    // Prestador 1: Nexus Cloud R$ 24.500/mês, nota 9.5
    // Prestador 2: Vértice Mídia R$ 14.000/mês, nota 8.8
    // Prestador 3: Silveira Advocacia R$ 9.800/mês, nota 9.0

    const prestadoresCol = app.findCollectionByNameOrId('prestadores_pj')
    const avaliacoesCol = app.findCollectionByNameOrId('avaliacoes_prestador_pj')
    const contratosCol = app.findCollectionByNameOrId('contratos_pj')
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    let adminUser = null
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'severo.douglas2@gmail.com')
    } catch (_) {
      try {
        const users = app.findRecordsByFilter('users', '', '-created', 1, 0)
        if (users && users.length > 0) adminUser = users[0]
      } catch (_) {}
    }

    // 1.1 Prestador 3: Silveira Advocacia
    let p3 = null
    try {
      p3 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '19.340.892/0001-30')
    } catch (_) {}

    let c3 = null
    try {
      c3 = app.findFirstRecordByData('contratos_pj', 'numero_contrato', 'CT-PJ-2024-003')
    } catch (_) {}

    if (p3) {
      p3.set('media_avaliacao', 9.0)
      if (p3.getInt('total_avaliacoes') < 1) {
        p3.set('total_avaliacoes', 1)
      }
      p3.set('valor_mensal_atual', 9800)
      app.save(p3)

      // Garantir avaliação na coleção avaliacoes_prestador_pj
      if (avaliacoesCol) {
        try {
          const avExist = app.findRecordsByFilter(
            'avaliacoes_prestador_pj',
            `prestador = '${p3.id}'`,
            '',
            1,
            0,
          )
          if (!avExist || avExist.length === 0) {
            const av3 = new Record(avaliacoesCol)
            av3.set('prestador', p3.id)
            if (c3) av3.set('contrato', c3.id)
            if (adminUser) av3.set('avaliador', adminUser.id)
            av3.set(
              'avaliador_nome',
              adminUser ? adminUser.getString('name') : 'Douglas Severo (RH)',
            )
            av3.set('periodo_avaliado', '3º Trimestre/2026')
            av3.set('nota_qualidade_tecnica', 9)
            av3.set('nota_prazo', 9)
            av3.set('nota_comunicacao', 9)
            av3.set('nota_aderencia_cultural', 9)
            av3.set('nota_media', 9.0)
            av3.set('recomendacao', 'Continuar')
            av3.set(
              'comentario',
              'Excelente assessoria jurídica trabalhista e consultoria preventiva em contratos e compliance LGPD.',
            )
            av3.set(
              'pontos_fortes',
              'Respostas rápidas, alta fundamentação técnica em minutas e pareceres assertivos.',
            )
            av3.set(
              'pontos_melhoria',
              'Compartilhamento de resumos executivos em linguagem ainda mais acessível para as lideranças.',
            )
            app.save(av3)
          }
        } catch (errAv) {
          console.log('Aviso ao semear avaliação de Silveira Advocacia:', errAv)
        }
      }
    }

    // 1.2 Prestador 1: Nexus Cloud
    let p1 = null
    try {
      p1 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '28.491.503/0001-82')
    } catch (_) {}
    if (p1) {
      p1.set('media_avaliacao', 9.5)
      p1.set('valor_mensal_atual', 24500)
      app.save(p1)
    }

    // 1.3 Prestador 2: Vértice Mídia
    let p2 = null
    try {
      p2 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '34.819.204/0001-95')
    } catch (_) {}
    if (p2) {
      p2.set('media_avaliacao', 8.8)
      p2.set('valor_mensal_atual', 14000)
      app.save(p2)
    }

    // 2. Atualizar o agente "gestor-de-talentos"
    // Dar acesso de leitura a avaliacoes_prestador_pj e reforçar prestadores_pj, contratos_pj, aditivos_pj
    // Adicionar memória com diretriz de custo-benefício e renovação de prestadores
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
          collection: 'notas_fiscais_pj',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
      ])

      $ai.agents.putMemories(app, 'gestor-de-talentos', [
        {
          type: 'text',
          payload: {
            text:
              'Diretrizes de Comparativo de Custo e Custo-Benefício de Prestadores PJ:\n' +
              '1. Valor-hora padrão: Calculado como valor mensal atual dividido por 160 horas (base padrão mensal).\n' +
              '2. Avaliação de Prestadores: Notas de 0 a 10 considerando qualidade técnica, prazos, comunicação e aderência cultural registradas em avaliacoes_prestador_pj.\n' +
              '3. Índice de Custo-Benefício (Custo por ponto de avaliação): Custo por Ponto = Valor-hora ÷ Nota média de avaliação. Quanto menor o custo por ponto, melhor e mais eficiente é a relação custo-benefício do prestador.\n' +
              '4. Critérios de Renovação:\n' +
              '   - "Renovar": Nota alta (>= 9.0) e custo por ponto competitivo (abaixo da média do portfólio), entregas consistentes.\n' +
              '   - "Renegociar": Valor-hora acima da média com nota intermediária ou margem para otimização de valores contratuais.\n' +
              '   - "Reavaliar": Nota baixa (< 8.0) e/ou custo elevado por ponto de avaliação, ou contrato com problemas de prazo/qualidade.\n' +
              '5. Respostas a perguntas de usuários como "quem tem o melhor custo-benefício?":\n' +
              '   Calcule e compare o valor-hora e a nota média de cada prestador ativo. Por exemplo, Silveira Advocacia (R$ 9.800/mês = ~R$ 61,25/h com nota 9.0 -> custo por ponto ~R$ 6,81/ponto) tem um custo por ponto excelente. Nexus Cloud tem a maior nota (9.5) com taxa hora de R$ 153,13/h (custo por ponto ~R$ 16,12). Apresente a comparação completa com clareza, destacando nota, valor mensal, taxa hora, custo por ponto e recomendação de renovação.',
          },
        },
      ])
    } catch (agentErr) {
      console.log(
        'Aviso ao atualizar tools e memórias do agente gestor-de-talentos na migration 0029:',
        agentErr,
      )
    }
  },
  (app) => {
    // Reversão limpa
  },
)
