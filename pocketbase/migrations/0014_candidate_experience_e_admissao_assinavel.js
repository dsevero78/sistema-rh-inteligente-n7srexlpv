/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const candidatosCol = app.findCollectionByNameOrId('candidatos')
    const vagasCol = app.findCollectionByNameOrId('vagas')
    const onboardingsCol = app.findCollectionByNameOrId('onboardings')

    // ----------------------------------------------------
    // 1. Adicionar campos de Checklist Admissional Assinável em 'onboardings'
    // ----------------------------------------------------
    if (!onboardingsCol.fields.getByName('token_admissao')) {
      onboardingsCol.fields.add(
        new TextField({
          name: 'token_admissao',
          required: false,
        }),
      )
    }

    if (!onboardingsCol.fields.getByName('status_admissao')) {
      onboardingsCol.fields.add(
        new SelectField({
          name: 'status_admissao',
          required: false,
          values: [
            'Pendente de envio',
            'Enviado ao contratado',
            'Em preenchimento',
            'Assinado pelo contratado',
          ],
          maxSelect: 1,
        }),
      )
    }

    if (!onboardingsCol.fields.getByName('token_expira_em')) {
      onboardingsCol.fields.add(
        new DateField({
          name: 'token_expira_em',
          required: false,
        }),
      )
    }

    if (!onboardingsCol.fields.getByName('link_ativo')) {
      onboardingsCol.fields.add(
        new BoolField({
          name: 'link_ativo',
          required: false,
        }),
      )
    }

    if (!onboardingsCol.fields.getByName('assinatura_nome')) {
      onboardingsCol.fields.add(
        new TextField({
          name: 'assinatura_nome',
          required: false,
        }),
      )
    }

    if (!onboardingsCol.fields.getByName('assinatura_declaracao_lgpd')) {
      onboardingsCol.fields.add(
        new BoolField({
          name: 'assinatura_declaracao_lgpd',
          required: false,
        }),
      )
    }

    if (!onboardingsCol.fields.getByName('assinatura_data')) {
      onboardingsCol.fields.add(
        new DateField({
          name: 'assinatura_data',
          required: false,
        }),
      )
    }

    if (!onboardingsCol.fields.getByName('assinatura_ip')) {
      onboardingsCol.fields.add(
        new TextField({
          name: 'assinatura_ip',
          required: false,
        }),
      )
    }

    if (!onboardingsCol.fields.getByName('total_itens_empresa')) {
      onboardingsCol.fields.add(
        new NumberField({
          name: 'total_itens_empresa',
          min: 0,
        }),
      )
    }

    if (!onboardingsCol.fields.getByName('concluidos_empresa')) {
      onboardingsCol.fields.add(
        new NumberField({
          name: 'concluidos_empresa',
          min: 0,
        }),
      )
    }

    if (!onboardingsCol.fields.getByName('total_itens_contratado')) {
      onboardingsCol.fields.add(
        new NumberField({
          name: 'total_itens_contratado',
          min: 0,
        }),
      )
    }

    if (!onboardingsCol.fields.getByName('concluidos_contratado')) {
      onboardingsCol.fields.add(
        new NumberField({
          name: 'concluidos_contratado',
          min: 0,
        }),
      )
    }

    onboardingsCol.addIndex('idx_onboardings_token_adm', false, 'token_admissao', '')
    app.save(onboardingsCol)

    // ----------------------------------------------------
    // 2. Criar Coleção 'avaliacoes_experiencia' (Candidate Experience)
    // ----------------------------------------------------
    let avaliacoesCol = null
    try {
      avaliacoesCol = app.findCollectionByNameOrId('avaliacoes_experiencia')
    } catch (_) {}

    if (!avaliacoesCol) {
      avaliacoesCol = new Collection({
        name: 'avaliacoes_experiencia',
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
            name: 'vaga',
            type: 'relation',
            required: true,
            collectionId: vagasCol.id,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'token_pesquisa',
            type: 'text',
            required: true,
          },
          {
            name: 'status_processo',
            type: 'select',
            required: true,
            values: ['Contratado', 'Recusado'],
            maxSelect: 1,
          },
          {
            name: 'respondido',
            type: 'bool',
            required: false,
          },
          {
            name: 'data_resposta',
            type: 'date',
            required: false,
          },
          {
            name: 'nota_geral',
            type: 'number',
            min: 0,
            max: 10,
          },
          {
            name: 'clareza_processo',
            type: 'number',
            min: 0,
            max: 10,
          },
          {
            name: 'tempo_resposta',
            type: 'number',
            min: 0,
            max: 10,
          },
          {
            name: 'tratamento_rh',
            type: 'number',
            min: 0,
            max: 10,
          },
          {
            name: 'clareza_vaga',
            type: 'number',
            min: 0,
            max: 10,
          },
          {
            name: 'recomendaria_empresa',
            type: 'select',
            required: false,
            values: ['Sim, com certeza', 'Talvez', 'Não recomendaria'],
            maxSelect: 1,
          },
          {
            name: 'nps_score',
            type: 'number',
            min: 0,
            max: 10,
          },
          {
            name: 'comentario',
            type: 'text',
            required: false,
          },
          {
            name: 'alerta_oportunidade',
            type: 'bool',
            required: false,
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
          'CREATE UNIQUE INDEX idx_cand_exp_token ON avaliacoes_experiencia (token_pesquisa)',
          'CREATE INDEX idx_cand_exp_cand ON avaliacoes_experiencia (candidato)',
          'CREATE INDEX idx_cand_exp_vaga ON avaliacoes_experiencia (vaga)',
          'CREATE INDEX idx_cand_exp_resp ON avaliacoes_experiencia (respondido)',
          'CREATE INDEX idx_cand_exp_status ON avaliacoes_experiencia (status_processo)',
          'CREATE INDEX idx_cand_exp_alerta ON avaliacoes_experiencia (alerta_oportunidade)',
        ],
      })
      app.save(avaliacoesCol)
    }

    // ----------------------------------------------------
    // 3. Semear Token e Itens Especializados no Onboarding de Juliana Mendes
    // ----------------------------------------------------
    try {
      let candJuliana = null
      try {
        candJuliana = app.findFirstRecordByData('candidatos', 'email', 'juliana.mendes@exemplo.com')
      } catch (_) {}

      if (candJuliana) {
        const onbList = app.findRecordsByFilter(
          'onboardings',
          "candidato = '" + candJuliana.id + "'",
          '-created',
          1,
          0,
        )

        if (onbList && onbList.length > 0) {
          const onb = onbList[0]
          // Definir token público fixo de demonstração se ainda não houver
          const tokenJuliana = onb.getString('token_admissao') || 'adm-juliana-mendes-2026'
          onb.set('token_admissao', tokenJuliana)
          onb.set('status_admissao', onb.getString('status_admissao') || 'Enviado ao contratado')
          onb.set('link_ativo', true)

          // Atualizar os itens com atributos claros: aCargoDoContratado vs empresa
          const itensAtuais = onb.get('itens') || []
          let contContratado = 0
          let contContratadoConcluido = 0
          let contEmpresa = 0
          let contEmpresaConcluido = 0

          const itensAjustados = itensAtuais.map(function (item) {
            const isContratado =
              (item.responsavel && item.responsavel.toLowerCase().includes('contratado')) ||
              (item.categoria === 'Documentos' && !item.titulo.toLowerCase().includes('aso'))

            const aCargoDoContratado = !!isContratado

            if (aCargoDoContratado) {
              contContratado++
              if (item.concluido) contContratadoConcluido++
            } else {
              contEmpresa++
              if (item.concluido) contEmpresaConcluido++
            }

            return {
              ...item,
              aCargoDoContratado: aCargoDoContratado,
              confirmadoPorMim: aCargoDoContratado && item.concluido,
              confirmadoEm:
                aCargoDoContratado && item.concluido
                  ? item.confirmadoEm || '2026-10-01 14:30:00.000Z'
                  : null,
            }
          })

          onb.set('itens', itensAjustados)
          onb.set('total_itens_contratado', contContratado)
          onb.set('concluidos_contratado', contContratadoConcluido)
          onb.set('total_itens_empresa', contEmpresa)
          onb.set('concluidos_empresa', contEmpresaConcluido)
          app.save(onb)
        }
      }
    } catch (errJuliana) {
      console.log('Aviso ao atualizar onboarding de Juliana com token:', errJuliana)
    }

    // ----------------------------------------------------
    // 4. Semear Avaliações de Experiência de Demonstração (3-4 exemplos idempotentes)
    // ----------------------------------------------------
    try {
      const colAval = app.findCollectionByNameOrId('avaliacoes_experiencia')

      // Obter candidatos e vagas de referência
      let candLeo = null
      let candBea = null
      let candVini = null
      let candJuliana = null

      try {
        candLeo = app.findFirstRecordByData('candidatos', 'email', 'leonardo.bastos@exemplo.com')
      } catch (_) {}
      try {
        candBea = app.findFirstRecordByData('candidatos', 'email', 'beatriz.fontes@exemplo.com')
      } catch (_) {}
      try {
        candVini = app.findFirstRecordByData('candidatos', 'email', 'vinicius.moreira@exemplo.com')
      } catch (_) {}
      try {
        candJuliana = app.findFirstRecordByData('candidatos', 'email', 'juliana.mendes@exemplo.com')
      } catch (_) {}

      // Semente 1: Positiva - Contratada (Juliana Mendes)
      if (candJuliana) {
        try {
          app.findFirstRecordByData(
            'avaliacoes_experiencia',
            'token_pesquisa',
            'exp-juliana-mendes-seed',
          )
        } catch (_) {
          const rec1 = new Record(colAval)
          rec1.set('candidato', candJuliana.id)
          rec1.set('vaga', candJuliana.getString('vaga'))
          rec1.set('token_pesquisa', 'exp-juliana-mendes-seed')
          rec1.set('status_processo', 'Contratado')
          rec1.set('respondido', true)
          rec1.set('data_resposta', '2026-10-02 16:45:00.000Z')
          rec1.set('nota_geral', 10)
          rec1.set('clareza_processo', 10)
          rec1.set('tempo_resposta', 9)
          rec1.set('tratamento_rh', 10)
          rec1.set('clareza_vaga', 10)
          rec1.set('recomendaria_empresa', 'Sim, com certeza')
          rec1.set('nps_score', 10)
          rec1.set(
            'comentario',
            'Experiência impecável! Todo o time de Gente & Gestão foi extremamente acolhedor e ágil em cada etapa. Desde o primeiro contato até a proposta e o checklist de admissão, a comunicação foi cristalina.',
          )
          rec1.set('alerta_oportunidade', false)
          app.save(rec1)
        }
      }

      // Semente 2: Positiva - Recusado com respeito e feedback (Leonardo Bastos)
      if (candLeo) {
        try {
          app.findFirstRecordByData(
            'avaliacoes_experiencia',
            'token_pesquisa',
            'exp-leonardo-bastos-seed',
          )
        } catch (_) {
          const rec2 = new Record(colAval)
          rec2.set('candidato', candLeo.id)
          rec2.set('vaga', candLeo.getString('vaga'))
          rec2.set('token_pesquisa', 'exp-leonardo-bastos-seed')
          rec2.set('status_processo', 'Recusado')
          rec2.set('respondido', true)
          rec2.set('data_resposta', '2026-09-21 11:20:00.000Z')
          rec2.set('nota_geral', 9)
          rec2.set('clareza_processo', 9)
          rec2.set('tempo_resposta', 8)
          rec2.set('tratamento_rh', 10)
          rec2.set('clareza_vaga', 9)
          rec2.set('recomendaria_empresa', 'Sim, com certeza')
          rec2.set('nps_score', 9)
          rec2.set(
            'comentario',
            'Mesmo não sendo selecionado nesta rodada para Backend Go, a condução do processo foi de altíssimo nível técnico. Recebi um feedback cordial e me sinto valorizado no Banco de Talentos para futuras oportunidades.',
          )
          rec2.set('alerta_oportunidade', false)
          app.save(rec2)
        }
      }

      // Semente 3: Negativa com Alerta de Oportunidade - Recusado (Vinicius Moreira)
      if (candVini) {
        try {
          app.findFirstRecordByData(
            'avaliacoes_experiencia',
            'token_pesquisa',
            'exp-vinicius-moreira-seed',
          )
        } catch (_) {
          const rec3 = new Record(colAval)
          rec3.set('candidato', candVini.id)
          rec3.set('vaga', candVini.getString('vaga'))
          rec3.set('token_pesquisa', 'exp-vinicius-moreira-seed')
          rec3.set('status_processo', 'Recusado')
          rec3.set('respondido', true)
          rec3.set('data_resposta', '2026-09-22 09:15:00.000Z')
          rec3.set('nota_geral', 5)
          rec3.set('clareza_processo', 5)
          rec3.set('tempo_resposta', 3)
          rec3.set('tratamento_rh', 6)
          rec3.set('clareza_vaga', 6)
          rec3.set('recomendaria_empresa', 'Não recomendaria')
          rec3.set('nps_score', 4)
          rec3.set(
            'comentario',
            'O tempo de espera entre a entrevista técnica e a devolutiva demorou mais de duas semanas sem nenhuma atualização. O time é simpático, mas o vácuo de comunicação gerou muita ansiedade e prejudicou a experiência.',
          )
          rec3.set('alerta_oportunidade', true)
          app.save(rec3)

          // Disparar alerta imediato no sino para o time de RH agir rápido
          try {
            const alertasCol = app.findCollectionByNameOrId('alertas')
            const alertaRec = new Record(alertasCol)
            alertaRec.set('vaga', candVini.getString('vaga'))
            alertaRec.set('candidato', candVini.id)
            alertaRec.set('score', 40)
            alertaRec.set('tipo', 'experiencia_candidato_detrator')
            alertaRec.set('status', 'Novo')
            alertaRec.set(
              'resumo_ia',
              'Alerta de Candidate Experience (NPS 4 / Nota 5): Vinicius Moreira apontou demora excessiva no tempo de resposta após a entrevista técnica. Recomendado contato de alinhamento com a área de R&S.',
            )
            alertaRec.set('criado_em', '2026-09-22 09:15:00.000Z')
            app.save(alertaRec)
          } catch (_) {}
        }
      }

      // Semente 4: Pendente de Resposta (Beatriz Fontes) - Permite testar link público de pesquisa
      if (candBea) {
        try {
          app.findFirstRecordByData(
            'avaliacoes_experiencia',
            'token_pesquisa',
            'exp-beatriz-fontes-2026',
          )
        } catch (_) {
          const rec4 = new Record(colAval)
          rec4.set('candidato', candBea.id)
          rec4.set('vaga', candBea.getString('vaga'))
          rec4.set('token_pesquisa', 'exp-beatriz-fontes-2026')
          rec4.set('status_processo', 'Recusado')
          rec4.set('respondido', false)
          rec4.set('data_resposta', null)
          rec4.set('alerta_oportunidade', false)
          app.save(rec4)
        }
      }
    } catch (seedExpErr) {
      console.log('Aviso ao semear avaliações de experiência:', seedExpErr)
    }

    // ----------------------------------------------------
    // 5. Atualizar Agente Nativo 'gestor-de-talentos' com permissão
    //    para ler as avaliações de experiência e onboardings assinados
    // ----------------------------------------------------
    try {
      $ai.agents.putTools(app, 'gestor-de-talentos', [
        {
          collection: 'avaliacoes_experiencia',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
      ])

      $ai.agents.putMemories(app, 'gestor-de-talentos', [
        {
          type: 'text',
          payload: {
            text:
              'Módulo de Checklist Admissional Assinável e Candidate Experience:\n' +
              '1. Onboarding Assinável: Os contratados podem confirmar digitalmente itens de documentos e assinar o termo de reconhecimento e veracidade com IP e consentimento LGPD pela rota pública /admissao/:token. O status é gravado em onboardings.status_admissao (Pendente de envio, Enviado ao contratado, Em preenchimento, Assinado pelo contratado).\n' +
              '2. Avaliação de Experiência do Candidato: Mede a satisfação de candidatos contratados e recusados através da coleção "avaliacoes_experiencia" (com notas 0-10 para clareza do processo, tempo de resposta, tratamento do RH, clareza da vaga, NPS e comentários). Notas baixas (<=6 ou detrator) geram alertas prioritários de melhoria de processo.',
          },
        },
      ])
    } catch (agentErr) {
      console.log('Aviso ao atualizar agente gestor-de-talentos:', agentErr)
    }
  },
  (app) => {
    try {
      const avalCol = app.findCollectionByNameOrId('avaliacoes_experiencia')
      if (avalCol) app.delete(avalCol)
    } catch (_) {}
  },
)
