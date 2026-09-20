/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const prestadoresCol = app.findCollectionByNameOrId('prestadores_pj')

    // 1. Criar coleção 'eventos_timeline_pj' se ainda não existir
    let timelineCol = null
    try {
      timelineCol = app.findCollectionByNameOrId('eventos_timeline_pj')
    } catch (_) {
      timelineCol = new Collection({
        name: 'eventos_timeline_pj',
        type: 'base',
        system: false,
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'prestador',
            type: 'relation',
            required: true,
            collectionId: prestadoresCol.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'categoria',
            type: 'select',
            required: true,
            values: ['REGISTRO', 'DOCUMENTOS', 'GESTÃO', 'AUSÊNCIAS', 'AVALIAÇÃO'],
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
          'CREATE INDEX idx_timeline_prestador ON eventos_timeline_pj (prestador)',
          'CREATE INDEX idx_timeline_data ON eventos_timeline_pj (data_evento DESC)',
          'CREATE INDEX idx_timeline_categoria ON eventos_timeline_pj (categoria)',
          'CREATE INDEX idx_timeline_prestador_data ON eventos_timeline_pj (prestador, data_evento DESC)',
        ],
      })
      app.save(timelineCol)
    }

    // 2. Atualizar permissões do agente gestor-de-talentos se existir
    try {
      $ai.agents.putTools(app, 'gestor-de-talentos', [
        {
          collection: 'eventos_timeline_pj',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
      ])
    } catch (_) {}

    // 3. Semear eventos de demonstração para os 3 prestadores existentes
    // P1: Nexus Cloud & DevOps (CNPJ 28.491.503/0001-82)
    // P2: Vértice Mídia & Branding (CNPJ 34.819.204/0001-95)
    // P3: Silveira & Associados Advocacia (CNPJ 19.340.892/0001-30)
    try {
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

      const inserirEventoSeNaoExistir = (dados) => {
        try {
          const filter = `prestador = '${dados.prestador}' && titulo = '${dados.titulo.replace(/'/g, "\\'")}' && data_evento = '${dados.data_evento}'`
          const existentes = app.findRecordsByFilter('eventos_timeline_pj', filter, '', 1, 0)
          if (!existentes || existentes.length === 0) {
            const rec = new Record(timelineCol)
            rec.set('prestador', dados.prestador)
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
          console.log('Aviso ao semear evento na timeline PJ:', errEvt)
        }
      }

      // Eventos para P1: Nexus Cloud & DevOps Ltda
      if (p1) {
        // Eventos que combinam exatamente com a narrativa dos prints e dados do prestador:
        inserirEventoSeNaoExistir({
          prestador: p1.id,
          categoria: 'REGISTRO',
          titulo: 'Proposta aceita:',
          complemento: 'início 15/01/2025, R$ 20.000,00',
          autor: 'Elizangela',
          origem: 'usuario',
          data_evento: '2025-01-10 16:30:00.000Z',
          referencia_tipo: 'contrato',
        })

        inserirEventoSeNaoExistir({
          prestador: p1.id,
          categoria: 'DOCUMENTOS',
          titulo: 'Contrato assinado',
          complemento: 'pelas duas partes (CT-PJ-2025-014)',
          autor: 'Elizangela',
          origem: 'usuario',
          data_evento: '2025-01-15 14:47:00.000Z',
          referencia_tipo: 'contrato',
        })

        inserirEventoSeNaoExistir({
          prestador: p1.id,
          categoria: 'GESTÃO',
          titulo: 'Documentos de admissão',
          complemento: 'enviados e aprovados (Contrato social consolidado e CNDT)',
          autor: 'Elizangela',
          origem: 'usuario',
          data_evento: '2025-01-18 16:20:00.000Z',
          referencia_tipo: 'documentos',
        })

        inserirEventoSeNaoExistir({
          prestador: p1.id,
          categoria: 'GESTÃO',
          titulo: 'Adicionais cadastrados:',
          complemento: 'Sustentação 24x7 e cobertura de plantão SRE',
          autor: 'Elizangela',
          origem: 'usuario',
          data_evento: '2025-01-20 10:03:00.000Z',
        })

        inserirEventoSeNaoExistir({
          prestador: p1.id,
          categoria: 'DOCUMENTOS',
          titulo: 'Cobrança de documentos',
          complemento: 'enviada por e-mail ao PJ (Atualização semestral de CNDT)',
          autor: 'sistema',
          origem: 'sistema',
          data_evento: '2025-06-25 08:00:00.000Z',
          referencia_tipo: 'monitor',
        })

        inserirEventoSeNaoExistir({
          prestador: p1.id,
          categoria: 'REGISTRO',
          titulo: 'Reajuste aprovado:',
          complemento: 'de R$ 20.000 para R$ 24.500 (Aditivo 01)',
          autor: 'Fábio',
          origem: 'usuario',
          data_evento: '2025-07-01 11:42:00.000Z',
          referencia_tipo: 'aditivo',
        })

        inserirEventoSeNaoExistir({
          prestador: p1.id,
          categoria: 'AUSÊNCIAS',
          titulo: 'Ausência aprovada:',
          complemento: '12 a 16/05, "férias" programadas do consultor líder',
          autor: 'Fábio',
          origem: 'usuario',
          data_evento: '2025-08-10 09:15:00.000Z',
        })

        inserirEventoSeNaoExistir({
          prestador: p1.id,
          categoria: 'REGISTRO',
          titulo: 'Vigência prorrogada',
          complemento: 'até 31/12/2026 formalizada pelo Aditivo ADIT-2025-02',
          autor: 'Elizangela',
          origem: 'usuario',
          data_evento: '2025-11-20 15:30:00.000Z',
          referencia_tipo: 'aditivo',
        })

        inserirEventoSeNaoExistir({
          prestador: p1.id,
          categoria: 'GESTÃO',
          titulo: 'Nota fiscal NF-1042 quitada:',
          complemento: 'Competência 09/2026 no valor de R$ 24.500,00',
          autor: 'sistema',
          origem: 'sistema',
          data_evento: '2026-09-15 17:00:00.000Z',
          referencia_tipo: 'nota_fiscal',
        })

        inserirEventoSeNaoExistir({
          prestador: p1.id,
          categoria: 'GESTÃO',
          titulo: 'Nota fiscal NF-1098 aprovada para pagamento:',
          complemento: 'Competência 10/2026 no valor de R$ 24.500,00',
          autor: 'Mariana Siqueira',
          origem: 'usuario',
          data_evento: '2026-10-02 14:15:00.000Z',
          referencia_tipo: 'nota_fiscal',
        })
      }

      // Eventos para P2: Vértice Mídia & Branding S/S
      if (p2) {
        inserirEventoSeNaoExistir({
          prestador: p2.id,
          categoria: 'REGISTRO',
          titulo: 'Proposta aceita:',
          complemento: 'início 01/06/2025, R$ 14.000,00',
          autor: 'Mariana Siqueira',
          origem: 'usuario',
          data_evento: '2025-05-28 11:00:00.000Z',
          referencia_tipo: 'contrato',
        })

        inserirEventoSeNaoExistir({
          prestador: p2.id,
          categoria: 'DOCUMENTOS',
          titulo: 'Contrato assinado',
          complemento: 'pelas duas partes (CT-PJ-2025-089)',
          autor: 'Elizangela',
          origem: 'usuario',
          data_evento: '2025-06-01 14:20:00.000Z',
          referencia_tipo: 'contrato',
        })

        inserirEventoSeNaoExistir({
          prestador: p2.id,
          categoria: 'GESTÃO',
          titulo: 'Documentos de admissão',
          complemento: 'enviados e arquivados para compliance PJ',
          autor: 'Elizangela',
          origem: 'usuario',
          data_evento: '2025-06-05 10:30:00.000Z',
          referencia_tipo: 'documentos',
        })

        inserirEventoSeNaoExistir({
          prestador: p2.id,
          categoria: 'DOCUMENTOS',
          titulo: 'Cobrança de documentos',
          complemento: 'enviada por e-mail ao PJ: Certidão negativa federal expirada',
          autor: 'sistema',
          origem: 'sistema',
          data_evento: '2026-09-11 08:00:00.000Z',
          referencia_tipo: 'monitor',
        })

        inserirEventoSeNaoExistir({
          prestador: p2.id,
          categoria: 'REGISTRO',
          titulo: 'Aditivo pendente de assinatura:',
          complemento: 'ADIT-2026-01 (Reajuste para R$ 16.500 e prorrogação até 10/10/2027)',
          autor: 'Fábio',
          origem: 'usuario',
          data_evento: '2026-09-12 10:00:00.000Z',
          referencia_tipo: 'aditivo',
        })

        inserirEventoSeNaoExistir({
          prestador: p2.id,
          categoria: 'AVALIAÇÃO',
          titulo: 'Avaliação trimestral registrada:',
          complemento: 'Nota 8.8/10 com recomendação "Renovar com ressalvas"',
          autor: 'Mariana Siqueira',
          origem: 'usuario',
          data_evento: '2026-09-18 16:45:00.000Z',
          referencia_tipo: 'avaliacao',
        })

        inserirEventoSeNaoExistir({
          prestador: p2.id,
          categoria: 'GESTÃO',
          titulo: 'Nota fiscal NF-4420 registrada:',
          complemento: 'Competência 09/2026 no valor de R$ 14.000,00 (aguardando quitação)',
          autor: 'Camila Vasconcelos',
          origem: 'usuario',
          data_evento: '2026-09-25 10:00:00.000Z',
          referencia_tipo: 'nota_fiscal',
        })
      }

      // Eventos para P3: Silveira & Associados Advocacia
      if (p3) {
        inserirEventoSeNaoExistir({
          prestador: p3.id,
          categoria: 'REGISTRO',
          titulo: 'Proposta aceita:',
          complemento: 'início 10/03/2024, R$ 9.800,00',
          autor: 'Douglas Severo',
          origem: 'usuario',
          data_evento: '2024-03-05 15:30:00.000Z',
          referencia_tipo: 'contrato',
        })

        inserirEventoSeNaoExistir({
          prestador: p3.id,
          categoria: 'DOCUMENTOS',
          titulo: 'Contrato assinado',
          complemento: 'pelas duas partes (CT-PJ-2024-003)',
          autor: 'Douglas Severo',
          origem: 'usuario',
          data_evento: '2024-03-10 09:10:00.000Z',
          referencia_tipo: 'contrato',
        })

        inserirEventoSeNaoExistir({
          prestador: p3.id,
          categoria: 'GESTÃO',
          titulo: 'Documentos de admissão',
          complemento: 'enviados e aprovados: Contrato social OAB e certidões cíveis/trabalhistas',
          autor: 'Elizangela',
          origem: 'usuario',
          data_evento: '2024-03-12 14:00:00.000Z',
          referencia_tipo: 'documentos',
        })

        inserirEventoSeNaoExistir({
          prestador: p3.id,
          categoria: 'GESTÃO',
          titulo: 'Nota fiscal NF-0812 em conferência:',
          complemento: 'Competência 10/2026 no valor de R$ 9.800,00 em análise',
          autor: 'sistema',
          origem: 'sistema',
          data_evento: '2026-10-01 11:20:00.000Z',
          referencia_tipo: 'nota_fiscal',
        })
      }
    } catch (seedErr) {
      console.log('Aviso ao semear eventos de demonstração da timeline PJ:', seedErr)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('eventos_timeline_pj')
      if (col) app.delete(col)
    } catch (_) {}
  },
)
