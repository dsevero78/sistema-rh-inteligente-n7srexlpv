/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const candidatosCol = app.findCollectionByNameOrId('candidatos')

    // 1. Criar coleção 'eventos_timeline_candidato' se ainda não existir
    let timelineCol = null
    try {
      timelineCol = app.findCollectionByNameOrId('eventos_timeline_candidato')
    } catch (_) {
      timelineCol = new Collection({
        name: 'eventos_timeline_candidato',
        type: 'base',
        system: false,
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'candidato',
            type: 'relation',
            required: true,
            collectionId: candidatosCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'categoria',
            type: 'select',
            required: true,
            values: ['CANDIDATURA', 'AVALIAÇÃO', 'ENTREVISTA', 'GESTÃO', 'STATUS'],
            maxSelect: 1,
          },
          {
            name: 'titulo',
            type: 'text',
            required: true,
            max: 300,
          },
          {
            name: 'complemento',
            type: 'text',
            required: false,
            max: 1000,
          },
          {
            name: 'autor',
            type: 'text',
            required: true,
            max: 150,
          },
          {
            name: 'origem',
            type: 'select',
            required: true,
            values: ['sistema', 'usuario'],
            maxSelect: 1,
          },
          {
            name: 'data_evento',
            type: 'date',
            required: true,
          },
          {
            name: 'referencia_tipo',
            type: 'text',
            required: false,
            max: 100,
          },
          {
            name: 'referencia_id',
            type: 'text',
            required: false,
            max: 100,
          },
          {
            name: 'created',
            type: 'autodate',
            onCreate: true,
            onUpdate: false,
          },
          {
            name: 'updated',
            type: 'autodate',
            onCreate: true,
            onUpdate: true,
          },
        ],
        indexes: [
          'CREATE INDEX idx_timeline_cand_candidato ON eventos_timeline_candidato (candidato)',
          'CREATE INDEX idx_timeline_cand_data ON eventos_timeline_candidato (data_evento DESC)',
          'CREATE INDEX idx_timeline_cand_categoria ON eventos_timeline_candidato (categoria)',
          'CREATE INDEX idx_timeline_cand_candidato_data ON eventos_timeline_candidato (candidato, data_evento DESC)',
        ],
      })
      app.save(timelineCol)
    }

    // 2. Conectar agente gestor-de-talentos com a nova ferramenta e instrução
    try {
      $ai.agents.putTools(app, 'gestor-de-talentos', [
        {
          collection: 'eventos_timeline_candidato',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
      ])

      $ai.agents.putMemories(app, 'gestor-de-talentos', [
        {
          type: 'text',
          payload: {
            text: 'Linha do Tempo dos Candidatos (eventos_timeline_candidato):\nRegistra o histórico cronológico completo de cada candidato no ciclo de recrutamento, com categorias:\n1. CANDIDATURA: inscrição inicial, canal de entrada (Página de Carreira, Indicação, LinkedIn), consentimento LGPD e triagem eliminatória.\n2. AVALIAÇÃO: cálculo/recalibração de score de matching da IA, geração de relatórios de IA e submissão de questionários de triagem.\n3. ENTREVISTA: agendamento, reagendamento, realização, notas técnicas/comportamentais e avaliações pós-entrevista.\n4. GESTÃO: parecer do gestor contratante, percepções do RH compartilhadas e propostas salariais emitidas, aceitas, recusadas ou em negociação.\n5. STATUS: movimentações de pipeline (de -> para), aprovações, contratações, recusas com justificativa genérica, encaminhamentos ao Banco de Talentos e início de onboarding.\nUtilize este histórico para responder com precisão sobre a jornada, datas e intervenções realizadas para qualquer candidato.',
          },
        },
      ])
    } catch (agentErr) {
      console.log(
        'Aviso ao registrar tool/memory de eventos_timeline_candidato no agente:',
        agentErr,
      )
    }

    // 3. Semear histórico idempotente para Lucas Ferreira e Juliana Mendes
    try {
      let lucas = null
      let juliana = null
      try {
        lucas = app.findFirstRecordByData('candidatos', 'email', 'lucas.ferreira@exemplo.com')
      } catch (_) {}
      try {
        juliana = app.findFirstRecordByData('candidatos', 'email', 'juliana.mendes@exemplo.com')
      } catch (_) {}

      const inserirEventoSeNaoExistir = (dados) => {
        try {
          const filter = `candidato = '${dados.candidato}' && titulo = '${dados.titulo.replace(/'/g, "\\'")}' && data_evento = '${dados.data_evento}'`
          const existentes = app.findRecordsByFilter('eventos_timeline_candidato', filter, '', 1, 0)
          if (!existentes || existentes.length === 0) {
            const rec = new Record(timelineCol)
            rec.set('candidato', dados.candidato)
            rec.set('categoria', dados.categoria)
            rec.set('titulo', dados.titulo)
            rec.set('complemento', dados.complemento || '')
            rec.set('autor', dados.autor)
            rec.set(
              'origem',
              dados.origem || (dados.autor.toLowerCase() === 'sistema' ? 'sistema' : 'usuario'),
            )
            rec.set('data_evento', dados.data_evento)
            if (dados.referencia_tipo) rec.set('referencia_tipo', dados.referencia_tipo)
            if (dados.referencia_id) rec.set('referencia_id', dados.referencia_id)
            app.save(rec)
          }
        } catch (errEvt) {
          console.log('Aviso ao semear evento na timeline de candidato:', errEvt)
        }
      }

      // 3.1 Histórico de Lucas Ferreira (Desenvolvedor Backend Sênior)
      // Jornada completa: candidatura -> triagem -> entrevista realizada -> percepção do RH -> score ajustado -> proposta -> contratado -> onboarding
      if (lucas) {
        inserirEventoSeNaoExistir({
          candidato: lucas.id,
          categoria: 'CANDIDATURA',
          titulo: 'Candidatura submetida:',
          complemento:
            'via Página de Carreira com termo LGPD aceito para Desenvolvedor(a) Backend Sênior',
          autor: 'sistema',
          origem: 'sistema',
          data_evento: '2026-09-19 22:24:00.000Z',
          referencia_tipo: 'candidatura',
        })

        inserirEventoSeNaoExistir({
          candidato: lucas.id,
          categoria: 'CANDIDATURA',
          titulo: 'Triagem automática aprovada:',
          complemento:
            'Candidato atendeu a todos os critérios eliminatórios de experiência e tecnologias da vaga',
          autor: 'sistema',
          origem: 'sistema',
          data_evento: '2026-09-19 22:25:00.000Z',
          referencia_tipo: 'triagem',
        })

        inserirEventoSeNaoExistir({
          candidato: lucas.id,
          categoria: 'AVALIAÇÃO',
          titulo: 'Matching inicial da IA calculado:',
          complemento:
            'Score geral de 88% com alta aderência técnica em Go, Node.js e microsserviços',
          autor: 'sistema',
          origem: 'sistema',
          data_evento: '2026-09-19 22:30:00.000Z',
          referencia_tipo: 'matching',
        })

        inserirEventoSeNaoExistir({
          candidato: lucas.id,
          categoria: 'STATUS',
          titulo: 'Movimentado no pipeline:',
          complemento: 'de Triagem para Entrevista com RH',
          autor: 'Mariana Siqueira',
          origem: 'usuario',
          data_evento: '2026-09-20 09:15:00.000Z',
          referencia_tipo: 'pipeline',
        })

        inserirEventoSeNaoExistir({
          candidato: lucas.id,
          categoria: 'ENTREVISTA',
          titulo: 'Entrevista técnica agendada:',
          complemento: 'com Mariana Siqueira (RH) e Líder Técnico via Google Meet',
          autor: 'Mariana Siqueira',
          origem: 'usuario',
          data_evento: '2026-09-20 10:00:00.000Z',
          referencia_tipo: 'entrevista',
        })

        inserirEventoSeNaoExistir({
          candidato: lucas.id,
          categoria: 'ENTREVISTA',
          titulo: 'Entrevista realizada:',
          complemento: 'Bate-papo técnico e alinhamento cultural concluídos com sucesso',
          autor: 'Mariana Siqueira',
          origem: 'usuario',
          data_evento: '2026-09-21 14:00:00.000Z',
          referencia_tipo: 'entrevista',
        })

        inserirEventoSeNaoExistir({
          candidato: lucas.id,
          categoria: 'ENTREVISTA',
          titulo: 'Avaliação pós-entrevista registrada:',
          complemento:
            'Nota técnica 9/10, comportamental 8.5/10. Recomendação: Avançar com prioridade',
          autor: 'Mariana Siqueira',
          origem: 'usuario',
          data_evento: '2026-09-21 15:30:00.000Z',
          referencia_tipo: 'avaliacao_entrevista',
        })

        inserirEventoSeNaoExistir({
          candidato: lucas.id,
          categoria: 'GESTÃO',
          titulo: 'Percepção do RH compartilhada:',
          complemento:
            'Avaliação de vídeo e postura técnica validada com recomendação de contratação',
          autor: 'Mariana Siqueira',
          origem: 'usuario',
          data_evento: '2026-09-21 16:45:00.000Z',
          referencia_tipo: 'percepcao_rh',
        })

        inserirEventoSeNaoExistir({
          candidato: lucas.id,
          categoria: 'AVALIAÇÃO',
          titulo: 'Score calibrado pós-entrevista:',
          complemento:
            'Score ajustado pela IA para 92% incorporando pareceres técnicos e soft skills',
          autor: 'sistema',
          origem: 'sistema',
          data_evento: '2026-09-21 17:00:00.000Z',
          referencia_tipo: 'matching',
        })

        inserirEventoSeNaoExistir({
          candidato: lucas.id,
          categoria: 'GESTÃO',
          titulo: 'Parecer do Gestor aprovado:',
          complemento:
            'Recomendação formal "Avançar" pelo Gestor de Tecnologia: "Perfil técnico excelente com Kafka e Go"',
          autor: 'Fábio Silveira',
          origem: 'usuario',
          data_evento: '2026-09-21 18:20:00.000Z',
          referencia_tipo: 'feedback_gestor',
        })

        inserirEventoSeNaoExistir({
          candidato: lucas.id,
          categoria: 'GESTÃO',
          titulo: 'Proposta salarial emitida:',
          complemento: 'Oferta de R$ 16.500,00 CLT + pacote integral de benefícios',
          autor: 'Mariana Siqueira',
          origem: 'usuario',
          data_evento: '2026-09-22 11:00:00.000Z',
          referencia_tipo: 'oferta',
        })

        inserirEventoSeNaoExistir({
          candidato: lucas.id,
          categoria: 'GESTÃO',
          titulo: 'Proposta aceita pelo candidato:',
          complemento: 'Carta-oferta formalizada e assinada digitalmente sem ressalvas',
          autor: 'Mariana Siqueira',
          origem: 'usuario',
          data_evento: '2026-09-23 14:10:00.000Z',
          referencia_tipo: 'oferta',
        })

        inserirEventoSeNaoExistir({
          candidato: lucas.id,
          categoria: 'STATUS',
          titulo: 'Candidato contratado:',
          complemento: 'Aprovado formalmente no processo seletivo com data de início agendada',
          autor: 'Mariana Siqueira',
          origem: 'usuario',
          data_evento: '2026-09-23 15:00:00.000Z',
          referencia_tipo: 'pipeline',
        })

        inserirEventoSeNaoExistir({
          candidato: lucas.id,
          categoria: 'STATUS',
          titulo: 'Onboarding iniciado:',
          complemento:
            'Trilha de integração, entrega de notebook e boas-vindas corporativas ativadas',
          autor: 'sistema',
          origem: 'sistema',
          data_evento: '2026-09-24 09:00:00.000Z',
          referencia_tipo: 'onboarding',
        })
      }

      // 3.2 Histórico de Juliana Mendes (Analista de Gente & Gestão - Em Andamento / Aprovada)
      if (juliana) {
        inserirEventoSeNaoExistir({
          candidato: juliana.id,
          categoria: 'CANDIDATURA',
          titulo: 'Candidatura submetida:',
          complemento: 'via Indicação interna para Analista de Gente & Gestão',
          autor: 'sistema',
          origem: 'sistema',
          data_evento: '2026-09-19 22:24:00.000Z',
          referencia_tipo: 'candidatura',
        })

        inserirEventoSeNaoExistir({
          candidato: juliana.id,
          categoria: 'CANDIDATURA',
          titulo: 'Triagem de questionário aprovada:',
          complemento: 'Experiência prévia em R&S de tecnologia e People Analytics validada',
          autor: 'sistema',
          origem: 'sistema',
          data_evento: '2026-09-19 22:28:00.000Z',
          referencia_tipo: 'triagem',
        })

        inserirEventoSeNaoExistir({
          candidato: juliana.id,
          categoria: 'AVALIAÇÃO',
          titulo: 'Dossiê da IA gerado:',
          complemento:
            'Score geral 90% com recomendação explícita de avanço pelo Gestor de Talentos',
          autor: 'sistema',
          origem: 'sistema',
          data_evento: '2026-09-19 22:35:00.000Z',
          referencia_tipo: 'matching',
        })

        inserirEventoSeNaoExistir({
          candidato: juliana.id,
          categoria: 'ENTREVISTA',
          titulo: 'Entrevista por competências realizada:',
          complemento:
            'Avaliação excelente em comunicação, inteligência emocional e resolução de conflitos',
          autor: 'Elizangela',
          origem: 'usuario',
          data_evento: '2026-09-20 11:30:00.000Z',
          referencia_tipo: 'entrevista',
        })

        inserirEventoSeNaoExistir({
          candidato: juliana.id,
          categoria: 'GESTÃO',
          titulo: 'Parecer do gestor aprovado:',
          complemento: 'Aprovação unânime do comitê de Gente & Gestão com indicação de oferta',
          autor: 'Douglas Severo',
          origem: 'usuario',
          data_evento: '2026-09-20 14:00:00.000Z',
          referencia_tipo: 'feedback_gestor',
        })

        inserirEventoSeNaoExistir({
          candidato: juliana.id,
          categoria: 'STATUS',
          titulo: 'Candidata Aprovada no Pipeline:',
          complemento: 'Estágio alterado para Aprovado com oferta formal em fase de aceitação',
          autor: 'Mariana Siqueira',
          origem: 'usuario',
          data_evento: '2026-09-20 16:00:00.000Z',
          referencia_tipo: 'pipeline',
        })

        inserirEventoSeNaoExistir({
          candidato: juliana.id,
          categoria: 'STATUS',
          titulo: 'Onboarding em andamento:',
          complemento:
            'Documentação admissional assinada digitalmente e integração cultural agendada',
          autor: 'sistema',
          origem: 'sistema',
          data_evento: '2026-09-21 08:30:00.000Z',
          referencia_tipo: 'onboarding',
        })
      }
    } catch (seedErr) {
      console.log('Aviso ao semear eventos de demonstração para candidatos:', seedErr)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('eventos_timeline_candidato')
      if (col) app.delete(col)
    } catch (_) {}
  },
)
