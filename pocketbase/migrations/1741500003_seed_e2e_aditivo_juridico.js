/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // Teste e validação e2e do fluxo jurídico de aditivo PJ
    // 1. Criar novo aditivo em Rascunho para o contrato lc9i8cmlaz1gx97
    const aditivoCollection = app.findCollectionByNameOrId('aditivos_pj')
    const agora = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'

    // Simular ciclo de vida completo:
    // Rascunho -> Minuta gerada -> Em análise pelo jurídico -> Ajustes solicitados -> Reenvio -> Aprovado pelo jurídico -> Pendente de assinatura -> Vigente
    const historico = [
      {
        etapa: 'Minuta gerada',
        data: '2026-09-20 10:00:00Z',
        autor: 'RH / People (Camila)',
        autor_email: 'rh@souyess.com.br',
        comentario: 'Minuta preliminar de aditivo de reajuste e prorrogação gerada pelo sistema.',
      },
      {
        etapa: 'Em análise pelo jurídico',
        data: '2026-09-20 10:30:00Z',
        autor: 'RH / People (Camila)',
        autor_email: 'rh@souyess.com.br',
        comentario:
          'Minuta encaminhada para análise e validação legal da cláusula 3 (SLA de resposta preventiva).',
      },
      {
        etapa: 'Ajustes solicitados',
        data: '2026-09-20 14:15:00Z',
        autor: 'Dr. Rodrigo Faria (Jurídico)',
        autor_email: 'juridico@souyess.com.br',
        comentario:
          'Solicitado ajuste na redação do SLA de pareceres preventivos de 24h para 48h úteis e confirmação do índice IPCA.',
      },
      {
        etapa: 'Em análise pelo jurídico',
        data: '2026-09-20 16:00:00Z',
        autor: 'RH / People (Camila)',
        autor_email: 'rh@souyess.com.br',
        comentario:
          'Cláusulas revisadas conforme apontamentos jurídicos. Minuta atualizada reenviada.',
      },
      {
        etapa: 'Aprovado pelo jurídico',
        data: '2026-09-21 09:00:00Z',
        autor: 'Dr. Rodrigo Faria (Jurídico)',
        autor_email: 'juridico@souyess.com.br',
        comentario:
          'Minuta validada e aprovada integralmente. Cláusulas de conformidade trabalhista e prazos regulares. Liberado para coleta de assinaturas.',
      },
      {
        etapa: 'Pendente de assinatura',
        data: '2026-09-21 11:00:00Z',
        autor: 'RH / People (Camila)',
        autor_email: 'rh@souyess.com.br',
        comentario:
          'Minuta aprovada enviada para coleta eletrônica via ClickSign das partes representantes.',
      },
      {
        etapa: 'Vigente',
        data: agora,
        autor: 'RH / People (Camila)',
        autor_email: 'rh@souyess.com.br',
        comentario:
          'Todas as assinaturas eletrônicas autenticadas. Termo aditivo formalizado com eficácia jurídica imediata.',
      },
    ]

    // Criar aditivo demonstrativo que passou por todas as etapas e agora está Vigente
    const record = new Record(aditivoCollection)
    record.set('prestador', '5m9giiwx8dwg6a6') // Consultoria Jurídica
    record.set('contrato', 'lc9i8cmlaz1gx97')
    record.set('numero_aditivo', 'ADIT-2026-01')
    record.set('tipo', 'Reajuste e Prolongamento')
    record.set('status', 'Vigente')
    record.set('sequencia', 1)
    record.set('valor_anterior', 9800)
    record.set('novo_valor_mensal', 11200)
    record.set('vigencia_anterior_fim', '2027-03-09 00:00:00.000Z')
    record.set('nova_vigencia_fim', '2028-03-09 00:00:00.000Z')
    record.set('data_assinatura', '2026-09-21 00:00:00.000Z')
    record.set(
      'descricao',
      'Aditivo de prorrogação por +12 meses e reajuste anual de 14,28%, mantendo escopo de assessoria trabalhista preventiva e auditorias semestrais.',
    )
    record.set(
      'parecer_juridico',
      'Minuta validada e aprovada integralmente. Cláusulas de conformidade trabalhista e prazos regulares. Liberado para coleta de assinaturas.',
    )
    record.set('data_aprovacao_juridico', '2026-09-21 09:00:00.000Z')
    record.set('historico_aprovacao', historico)
    app.save(record)

    // Sincronizar efeitos no contrato_pj
    const contratoRecord = app.findRecordById('contratos_pj', 'lc9i8cmlaz1gx97')
    if (contratoRecord) {
      contratoRecord.set('contador_aditivos', 1)
      contratoRecord.set('valor', 11200)
      contratoRecord.set('data_fim', '2028-03-09 00:00:00.000Z')
      app.save(contratoRecord)
    }

    // Criar também um aditivo de teste em estado 'Em análise pelo jurídico' para demonstrar as ações ativas na UI
    const recordEmAnalise = new Record(aditivoCollection)
    recordEmAnalise.set('prestador', '5r0iaorzoycr27j')
    recordEmAnalise.set('contrato', 'ic3d5zlkyi7kiy0')
    recordEmAnalise.set('numero_aditivo', 'ADIT-2026-02')
    recordEmAnalise.set('tipo', 'Mudança de escopo')
    recordEmAnalise.set('status', 'Em análise pelo jurídico')
    recordEmAnalise.set('sequencia', 2)
    recordEmAnalise.set('valor_anterior', 16500)
    recordEmAnalise.set('novo_valor_mensal', 18500)
    recordEmAnalise.set('vigencia_anterior_fim', '2027-10-10 00:00:00.000Z')
    recordEmAnalise.set('nova_vigencia_fim', '2027-10-10 00:00:00.000Z')
    recordEmAnalise.set(
      'descricao',
      'Inclusão de módulo de podcast corporativo quinzenal e cobertura audiovisual de convenção anual.',
    )
    recordEmAnalise.set('historico_aprovacao', [
      {
        etapa: 'Minuta gerada',
        data: '2026-09-21 14:00:00Z',
        autor: 'RH / People',
        autor_email: 'rh@souyess.com.br',
        comentario: 'Minuta com acréscimo de serviços de podcast e convenção elaborada.',
      },
      {
        etapa: 'Em análise pelo jurídico',
        data: '2026-09-21 14:30:00Z',
        autor: 'RH / People',
        autor_email: 'rh@souyess.com.br',
        comentario:
          'Enviado para conferência de direitos autorais e cessão de imagem dos participantes dos podcasts.',
      },
    ])
    app.save(recordEmAnalise)
  },
  (app) => {
    try {
      const r1 = app.findFirstRecordByFilter(
        'aditivos_pj',
        "numero_aditivo = 'ADIT-2026-01' && prestador = '5m9giiwx8dwg6a6'",
      )
      if (r1) app.delete(r1)
      const r2 = app.findFirstRecordByFilter(
        'aditivos_pj',
        "numero_aditivo = 'ADIT-2026-02' && prestador = '5r0iaorzoycr27j'",
      )
      if (r2) app.delete(r2)
    } catch (_) {}
  },
)
