/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const vagasCol = app.findCollectionByNameOrId('vagas')
    const candidatosCol = app.findCollectionByNameOrId('candidatos')

    // 1. Criar coleção entrevistas
    const entrevistas = new Collection({
      name: 'entrevistas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'vaga',
          type: 'relation',
          required: true,
          collectionId: vagasCol.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'candidato',
          type: 'relation',
          required: true,
          collectionId: candidatosCol.id,
          maxSelect: 1,
          cascadeDelete: true,
        },
        {
          name: 'data_hora',
          type: 'date',
          required: true,
        },
        {
          name: 'duracao_minutos',
          type: 'number',
          min: 15,
          max: 480,
          onlyInt: true,
        },
        {
          name: 'formato',
          type: 'select',
          required: true,
          values: ['Presencial', 'Online', 'Telefonema'],
          maxSelect: 1,
        },
        {
          name: 'responsavel',
          type: 'text',
          required: true,
        },
        {
          name: 'responsavel_usuario',
          type: 'relation',
          collectionId: '_pb_users_auth_',
          maxSelect: 1,
          cascadeDelete: false,
        },
        {
          name: 'observacoes',
          type: 'text',
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Agendada', 'Realizada', 'Cancelada', 'Não compareceu'],
          maxSelect: 1,
        },
        {
          name: 'motivo_cancelamento',
          type: 'text',
        },
        // Lembrete
        {
          name: 'lembrete_enviado',
          type: 'bool',
        },
        {
          name: 'lembrete_enviado_em',
          type: 'date',
        },
        // Campos de avaliação pós-entrevista
        {
          name: 'avaliacao_realizada',
          type: 'bool',
        },
        {
          name: 'avaliacao_data',
          type: 'date',
        },
        {
          name: 'avaliacao_avaliador',
          type: 'text',
        },
        {
          name: 'nota_tecnica',
          type: 'number',
          min: 0,
          max: 10,
        },
        {
          name: 'comentario_tecnico',
          type: 'text',
        },
        {
          name: 'nota_comportamental',
          type: 'number',
          min: 0,
          max: 10,
        },
        {
          name: 'comentario_comportamental',
          type: 'text',
        },
        {
          name: 'recomendacao_final',
          type: 'select',
          values: ['Avançar', 'Recusar', 'Em dúvida'],
          maxSelect: 1,
        },
        {
          name: 'comentario_geral',
          type: 'text',
        },
        {
          name: 'criterios_detalhados',
          type: 'json',
        },
        {
          name: 'score_ajustado',
          type: 'number',
          min: 0,
          max: 100,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_entrevistas_candidato ON entrevistas (candidato)',
        'CREATE INDEX idx_entrevistas_vaga ON entrevistas (vaga)',
        'CREATE INDEX idx_entrevistas_status ON entrevistas (status)',
        'CREATE INDEX idx_entrevistas_data_hora ON entrevistas (data_hora)',
      ],
    })
    app.save(entrevistas)

    // 2. Adicionar permissão/ferramenta da coleção entrevistas ao agente gestor-de-talentos
    try {
      $ai.agents.putTools(app, 'gestor-de-talentos', [
        {
          collection: 'entrevistas',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
      ])
    } catch (_) {}

    // 3. Seed de entrevistas de exemplo
    try {
      const adminUser = app.findFirstRecordByData(
        '_pb_users_auth_',
        'email',
        'severo.douglas2@gmail.com',
      )
      const candLucas = app.findFirstRecordByData(
        'candidatos',
        'email',
        'lucas.ferreira@exemplo.com',
      )
      const candCamila = app.findFirstRecordByData(
        'candidatos',
        'email',
        'camila.ribeiro@exemplo.com',
      )
      const candRenato = app.findFirstRecordByData(
        'candidatos',
        'email',
        'renato.albuquerque@exemplo.com',
      )

      const entrevistasCol = app.findCollectionByNameOrId('entrevistas')

      // Entrevista 1: Lucas Ferreira (Amanhã - em ~24h para simulação do lembrete)
      const dataAmanha = new Date()
      dataAmanha.setDate(dataAmanha.getDate() + 1)
      dataAmanha.setHours(14, 0, 0, 0)

      const ent1 = new Record(entrevistasCol)
      ent1.set('vaga', candLucas.get('vaga'))
      ent1.set('candidato', candLucas.id)
      ent1.set('data_hora', dataAmanha.toISOString().replace('T', ' ').substring(0, 19) + 'Z')
      ent1.set('duracao_minutos', 60)
      ent1.set('formato', 'Online')
      ent1.set('responsavel', 'Douglas Severo (RH) e Tech Lead')
      ent1.set('responsavel_usuario', adminUser ? adminUser.id : '')
      ent1.set('observacoes', 'Avaliação técnica aprofundada de microsserviços, Go e TypeScript.')
      ent1.set('status', 'Agendada')
      ent1.set('lembrete_enviado', false)
      app.save(ent1)

      // Entrevista 2: Camila Ribeiro (Depois de amanhã)
      const dataDepois = new Date()
      dataDepois.setDate(dataDepois.getDate() + 2)
      dataDepois.setHours(10, 30, 0, 0)

      const ent2 = new Record(entrevistasCol)
      ent2.set('vaga', candCamila.get('vaga'))
      ent2.set('candidato', candCamila.id)
      ent2.set('data_hora', dataDepois.toISOString().replace('T', ' ').substring(0, 19) + 'Z')
      ent2.set('duracao_minutos', 45)
      ent2.set('formato', 'Presencial')
      ent2.set('responsavel', 'Douglas Severo (RH)')
      ent2.set('responsavel_usuario', adminUser ? adminUser.id : '')
      ent2.set('observacoes', 'Apresentação de case prático de Design System no escritório de SP.')
      ent2.set('status', 'Agendada')
      ent2.set('lembrete_enviado', false)
      app.save(ent2)

      // Entrevista 3: Renato Albuquerque (Realizada ontem, com avaliação pós-entrevista)
      const dataOntem = new Date()
      dataOntem.setDate(dataOntem.getDate() - 1)
      dataOntem.setHours(15, 0, 0, 0)

      const ent3 = new Record(entrevistasCol)
      ent3.set('vaga', candRenato.get('vaga'))
      ent3.set('candidato', candRenato.id)
      ent3.set('data_hora', dataOntem.toISOString().replace('T', ' ').substring(0, 19) + 'Z')
      ent3.set('duracao_minutos', 45)
      ent3.set('formato', 'Online')
      ent3.set('responsavel', 'Douglas Severo (RH)')
      ent3.set('responsavel_usuario', adminUser ? adminUser.id : '')
      ent3.set(
        'observacoes',
        'Entrevista de alinhamento de expectativas e cases de aquisição paga.',
      )
      ent3.set('status', 'Realizada')
      ent3.set('lembrete_enviado', true)
      ent3.set(
        'lembrete_enviado_em',
        dataOntem.toISOString().replace('T', ' ').substring(0, 19) + 'Z',
      )
      // Avaliação pós-entrevista
      ent3.set('avaliacao_realizada', true)
      ent3.set('avaliacao_data', new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z')
      ent3.set('avaliacao_avaliador', 'Douglas Severo (RH)')
      ent3.set('nota_tecnica', 8.5)
      ent3.set(
        'comentario_tecnico',
        'Excelente conhecimento prático em Google Ads, Meta Ads e otimização de conversão. Domínio sólido de métricas CAC e ROAS.',
      )
      ent3.set('nota_comportamental', 9.0)
      ent3.set(
        'comentario_comportamental',
        'Comunicação muito clara, postura orientada a resultados e excelente energia colaborativa.',
      )
      ent3.set('recomendacao_final', 'Avançar')
      ent3.set(
        'comentario_geral',
        'Candidato acima da média. Superou as expectativas técnicas e tem fit perfeito com a cultura ágil.',
      )
      ent3.set('score_ajustado', 88)
      app.save(ent3)

      // Atualiza o score_semantico do candidato Renato para refletir o score ajustado pós-entrevista
      candRenato.set('score_semantico', 88)
      app.save(candRenato)
    } catch (seedErr) {
      console.log('Aviso ao semear entrevistas de teste:', seedErr)
    }
  },
  (app) => {
    try {
      $ai.agents.deleteTools(app, 'gestor-de-talentos', ['entrevistas'])
    } catch (_) {}
    try {
      const col = app.findCollectionByNameOrId('entrevistas')
      app.delete(col)
    } catch (_) {}
  },
)
