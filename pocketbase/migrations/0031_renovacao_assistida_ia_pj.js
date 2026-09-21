/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Garantir permissões do agente gestor-de-talentos para todas as coleções de prestadores e timeline
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
          perms: { read: true, list: true, create: true },
          actAs: 'admin',
        },
      ])

      $ai.agents.putMemories(app, 'gestor-de-talentos', [
        {
          type: 'text',
          payload: {
            text:
              'Módulo de Renovação Contratual PJ Assistida por IA:\n' +
              'O sistema apoia a decisão de renovação contratual de prestadores terceirizados analisando o semáforo de custos (Renovar / Renegociar / Reavaliar) baseado no valor-hora (160h/mês), na nota das avaliações e no custo por ponto vs mediana do portfólio.\n' +
              'Além disso, a IA gera automaticamente o rascunho de e-mail institucional e a minuta de termo aditivo de renovação com cláusulas contratuais estruturadas (partes, objeto, vigência, valores, confidencialidade e assinatura). Toda geração assistida é registrada na linha do tempo institucional do fornecedor.',
          },
        },
      ])
    } catch (err) {
      console.log('Aviso ao atualizar permissões do agente na migration 0031:', err)
    }

    // 2. Garantir consistência dos dados da Vértice Mídia (caso precise)
    try {
      const p2 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '34.819.204/0001-95')
      if (p2 && p2.getString('status') !== 'Em renovação') {
        p2.set('status', 'Em renovação')
        app.save(p2)
      }
    } catch (_) {}
  },
  (app) => {
    // Reversão limpa
  },
)
