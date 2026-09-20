/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Adicionar campo 'etapa_lifecycle' na coleção 'prestadores_pj'
    const prestadoresCol = app.findCollectionByNameOrId('prestadores_pj')
    if (!prestadoresCol.fields.getByName('etapa_lifecycle')) {
      prestadoresCol.fields.add(
        new SelectField({
          name: 'etapa_lifecycle',
          required: false,
          values: ['Entrada', 'Ativo', 'Mudanças', 'Saída'],
          maxSelect: 1,
        }),
      )
      app.save(prestadoresCol)
    }

    // 2. Criar coleção 'marcos_lifecycle_pj'
    let marcosCol = null
    try {
      marcosCol = app.findCollectionByNameOrId('marcos_lifecycle_pj')
    } catch (_) {
      marcosCol = new Collection({
        name: 'marcos_lifecycle_pj',
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
            name: 'etapa',
            type: 'select',
            required: true,
            values: ['Entrada', 'Ativo', 'Mudanças', 'Saída'],
            maxSelect: 1,
          },
          {
            name: 'chave_marco',
            type: 'text',
            required: true,
            max: 100,
          },
          {
            name: 'nome_marco',
            type: 'text',
            required: true,
            max: 200,
          },
          {
            name: 'ordem',
            type: 'number',
            required: true,
            min: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['REGISTRADO', 'PENDENTE DO PJ', 'PENDENTE DA EMPRESA', 'NÃO ENVIADO'],
            maxSelect: 1,
          },
          {
            name: 'data_conclusao',
            type: 'date',
            required: false,
          },
          {
            name: 'responsavel',
            type: 'text',
            required: false,
            max: 150,
          },
          {
            name: 'observacao',
            type: 'text',
            required: false,
            max: 1000,
          },
          {
            name: 'historico_auditoria',
            type: 'json',
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
          'CREATE INDEX idx_marcos_prestador ON marcos_lifecycle_pj (prestador)',
          'CREATE INDEX idx_marcos_etapa ON marcos_lifecycle_pj (etapa)',
          'CREATE INDEX idx_marcos_status ON marcos_lifecycle_pj (status)',
          'CREATE INDEX idx_marcos_ordem ON marcos_lifecycle_pj (prestador, etapa, ordem)',
        ],
      })
      app.save(marcosCol)
    }

    // 3. Atualizar prestadores existentes e semear seus marcos conforme os 3 prints
    // Template de marcos por etapa:
    // Entrada:
    // 1: Cadastro com CNPJ validado
    // 2: Contrato assinado pelas duas partes
    // 3: Documentos da contratação aprovados
    // 4: Benefícios e adicionais cadastrados
    //
    // Ativo:
    // 1: Nota fiscal do período
    // 2: Reembolso do período
    // 3: Aprovação do gestor
    // 4: Pagamento do período
    //
    // Mudanças:
    // 1: Reajuste aprovado na alçada
    // 2: Aditivo de contrato
    // 3: Mudança de escopo registrada
    // 4: Ausências do período lançadas
    //
    // Saída:
    // 1: Encerramento de escopo/atividades
    // 2: NF final e quites
    // 3: Devolução/revogação de acessos
    // 4: Termo de encerramento assinado
    // 5: Certidões de regularidade finais

    const templateMarcos = {
      Entrada: [
        { chave: 'cnpj_validado', nome: 'Cadastro com CNPJ validado', ordem: 1 },
        { chave: 'contrato_assinado', nome: 'Contrato assinado pelas duas partes', ordem: 2 },
        { chave: 'documentos_aprovados', nome: 'Documentos da contratação aprovados', ordem: 3 },
        { chave: 'beneficios_cadastrados', nome: 'Benefícios e adicionais cadastrados', ordem: 4 },
      ],
      Ativo: [
        { chave: 'nf_periodo', nome: 'Nota fiscal do período', ordem: 1 },
        { chave: 'reembolso_periodo', nome: 'Reembolso do período', ordem: 2 },
        { chave: 'aprovacao_gestor', nome: 'Aprovação do gestor', ordem: 3 },
        { chave: 'pagamento_periodo', nome: 'Pagamento do período', ordem: 4 },
      ],
      Mudanças: [
        { chave: 'reajuste_alcada', nome: 'Reajuste aprovado na alçada', ordem: 1 },
        { chave: 'aditivo_contrato', nome: 'Aditivo de contrato', ordem: 2 },
        { chave: 'mudanca_escopo', nome: 'Mudança de escopo registrada', ordem: 3 },
        { chave: 'ausencias_periodo', nome: 'Ausências do período lançadas', ordem: 4 },
      ],
      Saída: [
        { chave: 'encerramento_escopo', nome: 'Encerramento de escopo/atividades', ordem: 1 },
        { chave: 'nf_final_quites', nome: 'NF final e quites', ordem: 2 },
        { chave: 'revogacao_acessos', nome: 'Devolução/revogação de acessos', ordem: 3 },
        { chave: 'termo_encerramento', nome: 'Termo de encerramento assinado', ordem: 4 },
        { chave: 'certidoes_finais', nome: 'Certidões de regularidade finais', ordem: 5 },
      ],
    }

    try {
      const p1 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '28.491.503/0001-82') // Nexus Cloud
      const p2 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '34.819.204/0001-95') // Vértice Mídia
      const p3 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '19.340.892/0001-30') // Silveira Advocacia

      // P1: Nexus Cloud -> Etapa: Ativo (com status Ativo)
      // Print 2 exato:
      // Entrada: 100% REGISTRADO (como no print 1)
      // Ativo:
      //   - Nota fiscal do período: PENDENTE DO PJ
      //   - Reembolso do período: PENDENTE DA EMPRESA
      //   - Aprovação do gestor: REGISTRADO
      //   - Pagamento do período: NÃO ENVIADO
      // Mudanças: NÃO ENVIADO
      // Saída: NÃO ENVIADO
      p1.set('etapa_lifecycle', 'Ativo')
      app.save(p1)

      // P2: Vértice Mídia -> Etapa: Mudanças (status Em renovação)
      // Print 3 exato:
      // Entrada: 100% REGISTRADO
      // Ativo: 100% REGISTRADO
      // Mudanças:
      //   - Reajuste aprovado na alçada: REGISTRADO
      //   - Aditivo de contrato: PENDENTE DO PJ
      //   - Mudança de escopo registrada: REGISTRADO
      //   - Ausências do período lançadas: REGISTRADO
      // Saída: NÃO ENVIADO
      p2.set('etapa_lifecycle', 'Mudanças')
      app.save(p2)

      // P3: Silveira Advocacia -> Etapa: Entrada (fase de entrada/onboarding 100% REGISTRADO como no print 1)
      // Entrada: 100% REGISTRADO
      //   - Cadastro com CNPJ validado: REGISTRADO
      //   - Contrato assinado pelas duas partes: REGISTRADO
      //   - Documentos da contratação aprovados: REGISTRADO
      //   - Benefícios e adicionais cadastrados: REGISTRADO
      // Ativo: NÃO ENVIADO
      // Mudanças: NÃO ENVIADO
      // Saída: NÃO ENVIADO
      p3.set('etapa_lifecycle', 'Entrada')
      app.save(p3)

      // Helper para semear os marcos para cada prestador
      const seedMarcos = (prestadorRecord, statusPorChave) => {
        Object.keys(templateMarcos).forEach((etapaNome) => {
          templateMarcos[etapaNome].forEach((item) => {
            const statusConfig = statusPorChave[item.chave] || {
              status: 'NÃO ENVIADO',
              resp: null,
              obs: null,
            }

            try {
              const filter = `prestador = '${prestadorRecord.id}' && etapa = '${etapaNome}' && chave_marco = '${item.chave}'`
              const existing = app.findRecordsByFilter('marcos_lifecycle_pj', filter, '', 1, 0)
              if (!existing || existing.length === 0) {
                const marco = new Record(marcosCol)
                marco.set('prestador', prestadorRecord.id)
                marco.set('etapa', etapaNome)
                marco.set('chave_marco', item.chave)
                marco.set('nome_marco', item.nome)
                marco.set('ordem', item.ordem)
                marco.set('status', statusConfig.status)
                if (statusConfig.status === 'REGISTRADO') {
                  marco.set('data_conclusao', new Date().toISOString())
                }
                if (statusConfig.resp) marco.set('responsavel', statusConfig.resp)
                if (statusConfig.obs) marco.set('observacao', statusConfig.obs)
                marco.set(
                  'historico_auditoria',
                  JSON.stringify([
                    {
                      status: statusConfig.status,
                      data: new Date().toISOString(),
                      autor: 'Sistema RH Inteligente (Setup)',
                      obs: statusConfig.obs || 'Inicialização automática do lifecycle',
                    },
                  ]),
                )
                app.save(marco)
              }
            } catch (errM) {
              console.log('Aviso ao semear marco:', item.chave, errM)
            }
          })
        })
      }

      // Marcos P1 (Nexus Cloud) - Ativo com pendências mistas (print 2)
      seedMarcos(p1, {
        cnpj_validado: {
          status: 'REGISTRADO',
          resp: 'Validação Automática RFB',
          obs: 'CNPJ ativo e regular',
        },
        contrato_assinado: {
          status: 'REGISTRADO',
          resp: 'Jurídico Interno / Diretor',
          obs: 'Assinado digitalmente via DocuSign',
        },
        documentos_aprovados: {
          status: 'REGISTRADO',
          resp: 'Compliance RH',
          obs: 'CNDT e CRF conferidos',
        },
        beneficios_cadastrados: {
          status: 'REGISTRADO',
          resp: 'RH Operações',
          obs: 'Regime de alocação configurado',
        },
        // Ativo (Print 2):
        nf_periodo: {
          status: 'PENDENTE DO PJ',
          resp: 'Nexus Cloud Financeiro',
          obs: 'Aguardando envio da NF da competência atual',
        },
        reembolso_periodo: {
          status: 'PENDENTE DA EMPRESA',
          resp: 'Controladoria Interna',
          obs: 'Conferência de despesas de infraestrutura AWS',
        },
        aprovacao_gestor: {
          status: 'REGISTRADO',
          resp: 'Douglas Severo (Gestor)',
          obs: 'Horas e entregas de sprint validadas',
        },
        pagamento_periodo: {
          status: 'NÃO ENVIADO',
          resp: 'Financeiro / Tesouraria',
          obs: 'Aguardando liquidação da NF',
        },
      })

      // Marcos P2 (Vértice Mídia) - Mudanças com aditivo pendente (print 3)
      seedMarcos(p2, {
        cnpj_validado: {
          status: 'REGISTRADO',
          resp: 'Validação Automática RFB',
          obs: 'CNPJ regular',
        },
        contrato_assinado: {
          status: 'REGISTRADO',
          resp: 'Jurídico Interno',
          obs: 'Contrato principal homologado',
        },
        documentos_aprovados: {
          status: 'REGISTRADO',
          resp: 'Compliance RH',
          obs: 'Documentos admissionais PJ ok',
        },
        beneficios_cadastrados: {
          status: 'REGISTRADO',
          resp: 'RH Operações',
          obs: 'Pacote de serviços validado',
        },
        // Ativo:
        nf_periodo: { status: 'REGISTRADO', resp: 'Contabilidade', obs: 'NF-4420 lançada' },
        reembolso_periodo: {
          status: 'REGISTRADO',
          resp: 'Financeiro',
          obs: 'Sem reembolsos adicionais',
        },
        aprovacao_gestor: {
          status: 'REGISTRADO',
          resp: 'Douglas Severo',
          obs: 'Campanha de atração validada',
        },
        pagamento_periodo: {
          status: 'REGISTRADO',
          resp: 'Tesouraria',
          obs: 'Liquidação autorizada',
        },
        // Mudanças (Print 3):
        reajuste_alcada: {
          status: 'REGISTRADO',
          resp: 'Diretoria Executiva',
          obs: 'Reajuste anual IPCA aprovado',
        },
        aditivo_contrato: {
          status: 'PENDENTE DO PJ',
          resp: 'Camila Vasconcelos (Prestador)',
          obs: 'Aguardando assinatura do aditivo de renovação',
        },
        mudanca_escopo: {
          status: 'REGISTRADO',
          resp: 'Gestão de Pessoas',
          obs: 'Inclusão de campanhas de employer branding em vídeo',
        },
        ausencias_periodo: {
          status: 'REGISTRADO',
          resp: 'RH Operações',
          obs: 'Recesso programado registrado',
        },
      })

      // Marcos P3 (Silveira Advocacia) - Entrada 100% REGISTRADO (print 1)
      seedMarcos(p3, {
        cnpj_validado: {
          status: 'REGISTRADO',
          resp: 'Validação Automática RFB',
          obs: 'Sociedade de advogados inscrita na OAB/SP e CNPJ ativo',
        },
        contrato_assinado: {
          status: 'REGISTRADO',
          resp: 'Diretoria / Douglas Severo',
          obs: 'Contrato assinado pelas duas partes em 10/03/2024',
        },
        documentos_aprovados: {
          status: 'REGISTRADO',
          resp: 'Compliance & Gente',
          obs: 'Contrato social e certidões cíveis/trabalhistas arquivadas',
        },
        beneficios_cadastrados: {
          status: 'REGISTRADO',
          resp: 'RH Operações',
          obs: 'Remuneração mensal de R$ 9.800 parametrizada',
        },
      })
    } catch (errSeed) {
      console.log('Aviso ao semear marcos de prestadores PJ:', errSeed)
    }
  },
  (app) => {
    try {
      const col = app.findCollectionByNameOrId('marcos_lifecycle_pj')
      if (col) app.delete(col)
    } catch (_) {}
  },
)
