migrate(
  (app) => {
    const offboardingCol = app.findCollectionByNameOrId('offboardings')
    const pessoasCol = app.findCollectionByNameOrId('pessoas')
    const empresasCol = app.findCollectionByNameOrId('empresas')

    // 1. Offboarding PJ: Camila Vasconcelos (Vértice Mídia) com rescisão antecipada/não renovação e NF pendente
    try {
      const camila = app.findFirstRecordByData('pessoas', 'cpf_cnpj', '34.819.204/0001-95')
      const verticeEmp = app.findFirstRecordByData('empresas', 'cnpj', '11.222.333/0003-43')

      // Checar se já existe offboarding para a Camila
      try {
        app.findFirstRecordByData('offboardings', 'pessoa', camila.id)
      } catch (_) {
        const recPj = new Record(offboardingCol)
        recPj.set('pessoa', camila.id)
        recPj.set('vinculo_origem_id', 'ficha-' + camila.id)
        recPj.set('modalidade', 'PJ')
        recPj.set('tipo_desligamento', 'Rescisão antecipada PJ')
        recPj.set('data_aviso', '2026-09-15 00:00:00.000Z')
        recPj.set('data_desligamento', '2026-09-30 00:00:00.000Z')
        recPj.set('aviso_previo_tipo', 'Não aplicável')
        recPj.set('dias_aviso_previo', 15)
        recPj.set('status', 'Em andamento')
        recPj.set('responsavel_nome', 'Douglas Severo (RH)')
        recPj.set('empresa', verticeEmp.id)
        recPj.set(
          'motivo_detalhado',
          'Reestruturação estratégica das campanhas da BU Vértice Mídia com transição de escopo.',
        )

        const checklistPj = [
          {
            id: 'item-pj-1',
            titulo: 'Ciência formal do término contratual e assinatura do distrato',
            categoria: 'juridico',
            responsavel: 'RH / Jurídico',
            obrigatorio: true,
            concluido: true,
            dataConclusao: '2026-09-16T14:30:00.000Z',
            observacao: 'Distrato enviado e acusada ciência pela contratada.',
          },
          {
            id: 'item-pj-2',
            titulo: 'Verificação de pendências fiscais e NFs em aberto',
            categoria: 'financeiro',
            responsavel: 'Financeiro / RH',
            obrigatorio: true,
            concluido: false,
            observacao:
              'NF da competência 2026-08 (R$ 14.000,00) ainda aguarda emissão e conferência fiscal.',
          },
          {
            id: 'item-pj-3',
            titulo: 'Devolução de equipamentos e periféricos corporativos',
            categoria: 'patrimonio',
            responsavel: 'Facilities / TI',
            obrigatorio: true,
            concluido: false,
            observacao:
              'Aguardando agendamento de devolução de MacBook Pro 14" patrimônio #VERT-8812.',
          },
          {
            id: 'item-pj-4',
            titulo: 'Revogação de acessos corporativos (E-mail, Slack, Figma e AWS)',
            categoria: 'seguranca',
            responsavel: 'TI / Segurança',
            obrigatorio: true,
            concluido: false,
            observacao: 'Agendado para o último dia de vigência (30/09).',
          },
          {
            id: 'item-pj-5',
            titulo: 'Baixa de registro no Cofre de Documentos e arquivamento formal',
            categoria: 'rh',
            responsavel: 'Gente & Gestão',
            obrigatorio: true,
            concluido: false,
            observacao: 'Pendente de conclusão final.',
          },
        ]

        const calculoPj = {
          modalidade: 'PJ',
          valorContratadoMensal: 14000,
          horasCompetenciaAberta: 120,
          valorCompetenciaAberta: 10500,
          nfsPendentesValor: 14000,
          totalGeralDevido: 24500,
          detalhes: [
            {
              descricao: 'NF solicitada referente à competência 2026-08',
              valor: 14000,
              status: 'Pendente recebimento',
            },
            {
              descricao: 'Apontamentos parciais da competência 2026-09 (120h trabalhadas)',
              valor: 10500,
              status: 'Em apuração',
            },
          ],
        }

        recPj.set('itens_checklist', checklistPj)
        recPj.set('calculo_rescisorio', calculoPj)
        recPj.set('total_rescisorio', 24500)
        recPj.set(
          'observacoes_finais',
          'Prestador em processo de transição com entregas parciais de relatórios de mídia.',
        )
        app.save(recPj)
      }
    } catch (errPj) {
      console.warn('[Seed Offboarding PJ] Ignorado ou erro:', errPj)
    }

    // 2. Offboarding CLT: Lucas Ferreira Lima (Tecnologia) - Pedido de demissão com aviso prévio indenizado/descontado
    try {
      const lucas = app.findFirstRecordByData('pessoas', 'cpf_cnpj', '389.472.918-44')
      const tecEmp = app.findFirstRecordByData('empresas', 'cnpj', '11.222.333/0002-62')

      try {
        app.findFirstRecordByData('offboardings', 'pessoa', lucas.id)
      } catch (_) {
        const recClt = new Record(offboardingCol)
        recClt.set('pessoa', lucas.id)
        recClt.set('vinculo_origem_id', 'ficha-' + lucas.id)
        recClt.set('modalidade', 'CLT')
        recClt.set('tipo_desligamento', 'Pedido de demissão')
        recClt.set('data_aviso', '2026-09-10 00:00:00.000Z')
        recClt.set('data_desligamento', '2026-09-25 00:00:00.000Z')
        recClt.set('aviso_previo_tipo', 'Indenizado')
        recClt.set('dias_aviso_previo', 30)
        recClt.set('status', 'Em andamento')
        recClt.set('responsavel_nome', 'Douglas Severo (RH)')
        recClt.set('empresa', tecEmp.id)
        recClt.set(
          'motivo_detalhado',
          'Recebeu proposta de oportunidade internacional no exterior.',
        )

        const checklistClt = [
          {
            id: 'item-clt-1',
            titulo: 'Exame médico demissional (ASO Demissional)',
            categoria: 'saude_seguranca',
            responsavel: 'Médico do Trabalho / RH',
            obrigatorio: true,
            concluido: true,
            dataConclusao: '2026-09-18T10:00:00.000Z',
            observacao:
              'Exame clínico realizado na clínica parceira Ocupacional Prime — Apto sem restrições.',
          },
          {
            id: 'item-clt-2',
            titulo: 'Carta formal de pedido de demissão e opção de aviso prévio',
            categoria: 'rh',
            responsavel: 'Colaborador / RH',
            obrigatorio: true,
            concluido: true,
            dataConclusao: '2026-09-10T09:15:00.000Z',
            observacao: 'Carta de próprio punho entregue e digitalizada no cofre.',
          },
          {
            id: 'item-clt-3',
            titulo: 'Cálculo e conferência da TRCT (Termo de Rescisão de Contrato de Trabalho)',
            categoria: 'dp',
            responsavel: 'Departamento Pessoal',
            obrigatorio: true,
            concluido: false,
            observacao:
              'Memória de cálculo gerada com saldo de salário (25 dias), 13º proporcional e férias proporcionais + 1/3.',
          },
          {
            id: 'item-clt-4',
            titulo: 'Devolução de equipamentos (Notebook Dell Precision + Acessórios)',
            categoria: 'patrimonio',
            responsavel: 'TI / Operações',
            obrigatorio: true,
            concluido: false,
            observacao: 'Patrimônio #TEC-4921 agendado para entrega presencial em 25/09.',
          },
          {
            id: 'item-clt-5',
            titulo:
              'Revogação de acessos corporativos (GitHub, Jira, Bitwarden e Google Workspace)',
            categoria: 'seguranca',
            responsavel: 'Segurança da Informação',
            obrigatorio: true,
            concluido: false,
            observacao: 'Bloqueio programado para 25/09 às 18:00.',
          },
          {
            id: 'item-clt-6',
            titulo: 'Homologação e transmissão de eventos S-2299 ao eSocial',
            categoria: 'dp',
            responsavel: 'Departamento Pessoal',
            obrigatorio: true,
            concluido: false,
            observacao: 'Prazo legal de 10 dias corridos após o término.',
          },
        ]

        // Salário: 5.870,00
        // 25 dias trabalhados em setembro: 5.870 / 30 * 25 = 4.891,67
        // 13º proporcional (9/12 meses): (5.870 / 12) * 9 = 4.402,50
        // Férias proporcionais (7/12 meses desde admissão mar/2025): (5.870 / 12) * 7 = 3.424,17
        // 1/3 constitucional sobre férias proporcionais: 1.141,39
        // Total bruto proventos: 13.859,73
        // No pedido de demissão com aviso indenizado não cumprido pelo empregado, desconto de 30 dias de salário (-5.870,00)
        // Total rescisório líquido estimado: 7.989,73
        const calculoClt = {
          modalidade: 'CLT',
          tipoDesligamento: 'Pedido de demissão',
          salarioBase: 5870,
          saldoSalarioDias: 25,
          saldoSalarioValor: 4891.67,
          avisoPrevioDias: 30,
          avisoPrevioValor: 0,
          avisoPrevioDesconto: 5870,
          decimoTerceiroProporcionalMeses: 9,
          decimoTerceiroProporcionalValor: 4402.5,
          feriasVencidasDias: 0,
          feriasVencidasValor: 0,
          feriasProporcionaisMeses: 7,
          feriasProporcionaisValor: 3424.17,
          tercoConstitucionalFerias: 1141.39,
          multaFgtsPercentual: 0,
          multaFgtsValor: 0,
          saqueFgtsHabilitado: false,
          totalBrutoProventos: 13859.73,
          totalDescontos: 5870,
          totalLiquidoRescisao: 7989.73,
        }

        recClt.set('itens_checklist', checklistClt)
        recClt.set('calculo_rescisorio', calculoClt)
        recClt.set('total_rescisorio', 7989.73)
        recClt.set(
          'observacoes_finais',
          'Colaborador com excelente histórico. Processo de transição de código para outro engenheiro.',
        )
        app.save(recClt)
      }
    } catch (errClt) {
      console.warn('[Seed Offboarding CLT] Ignorado ou erro:', errClt)
    }
  },
  (app) => {
    // rollback
  },
)
