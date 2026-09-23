/**
 * Migração: 1741500048_seed_etapa5_dados.js
 *
 * Módulo 1: Planejamento da Força de Trabalho - ETAPA 5 (v0.0.88 - HOMOLOGAÇÃO)
 * Seeds com dados fáticos e estruturados para homologação:
 *  1. Reserva Operacional Aprovada para Holding e Tecnologia
 *  2. Reserva Operacional Explicitamente Zero
 *  3. Cenários Comparativos (Tech e Vértice Mídia) com premissas, fontes de dados e alternativas reais
 *  4. Proposta de Revisão no fluxo de governança
 */

migrate(
  (app) => {
    const colReservas = app.findCollectionByNameOrId('reservas_operacionais')
    const colCenarios = app.findCollectionByNameOrId('cenarios_capacidade')
    const colPropostas = app.findCollectionByNameOrId('propostas_revisao_plano')

    let techEmpresa = null
    let holdingEmpresa = null
    let verticeEmpresa = null
    let planoBaseTech = null
    let userAdmin = null
    let userGestor = null

    try {
      techEmpresa = app.findFirstRecordByData('empresas', 'sigla', 'TECH')
    } catch (_) {}
    try {
      holdingEmpresa = app.findFirstRecordByData('empresas', 'tipo', 'Holding / Matriz')
    } catch (_) {}
    try {
      verticeEmpresa = app.findFirstRecordByData('empresas', 'sigla', 'VERT')
    } catch (_) {}

    try {
      userAdmin = app.findAuthRecordByEmail('_pb_users_auth_', 'severo.douglas2@gmail.com')
    } catch (_) {}
    try {
      userGestor = app.findAuthRecordByEmail('_pb_users_auth_', 'gestor@empresa.com')
    } catch (_) {}

    try {
      planoBaseTech = app.findFirstRecordByData('planos_capacidade', 'codigo', 'PLANO-2026-TECH-01')
    } catch (_) {}

    const empresaAlvoId = techEmpresa ? techEmpresa.id : holdingEmpresa ? holdingEmpresa.id : ''
    const autorId = userAdmin ? userAdmin.id : ''
    const planoId = planoBaseTech ? planoBaseTech.id : ''

    // 1. SEED DE RESERVAS OPERACIONAIS
    // 1.1 Reserva Aprovada (10% de margem operacional em Tech)
    try {
      app.findFirstRecordByData('reservas_operacionais', 'codigo', 'RES-TECH-2026')
    } catch (_) {
      if (empresaAlvoId && autorId) {
        const r1 = new Record(colReservas)
        r1.set('codigo', 'RES-TECH-2026')
        r1.set('nome', 'Reserva de Contingência Operacional Tech Q4/2026')
        r1.set('empresa', empresaAlvoId)
        r1.set('unidade', 'percentual')
        r1.set('valor', 10)
        r1.set('base_calculo', 'capacidade_liquida')
        r1.set('situacao_aprovacao', 'aprovada')
        r1.set('vigencia_inicio', '2026-10-01')
        r1.set('vigencia_fim', '2026-12-31')
        r1.set(
          'justificativa',
          'Margem deliberada para suportar chamados críticos de infraestrutura e resposta a incidentes sem canibalizar sprints de produto.',
        )
        r1.set('responsavel', autorId)
        r1.set('responsavel_nome', 'Douglas Severo (RH Corporativo)')
        r1.set('aprovado_por', autorId)
        r1.set('data_aprovacao', '2026-10-01')
        r1.set('is_demonstracao', true)
        app.save(r1)
      }
    }

    // 1.2 Reserva Explicitamente Zero (Governança decidiu não reter margem para Operações Comerciais)
    try {
      app.findFirstRecordByData('reservas_operacionais', 'codigo', 'RES-VERT-ZERO')
    } catch (_) {
      const vertId = verticeEmpresa ? verticeEmpresa.id : empresaAlvoId
      if (vertId && autorId) {
        const r2 = new Record(colReservas)
        r2.set('codigo', 'RES-VERT-ZERO')
        r2.set('nome', 'Reserva Zero - Vértice Mídia (Capacidade Integral Alocável)')
        r2.set('empresa', vertId)
        r2.set('unidade', 'percentual')
        r2.set('valor', 0)
        r2.set('base_calculo', 'capacidade_liquida')
        r2.set('situacao_aprovacao', 'explicitamente_zero')
        r2.set('vigencia_inicio', '2026-10-01')
        r2.set('vigencia_fim', '2026-12-31')
        r2.set(
          'justificativa',
          'Deliberação da diretoria executiva: 100% da capacidade líquida deve ser absorvida pelos clientes vigentes.',
        )
        r2.set('responsavel', autorId)
        r2.set('responsavel_nome', 'Douglas Severo')
        r2.set('aprovado_por', autorId)
        r2.set('data_aprovacao', '2026-10-01')
        r2.set('is_demonstracao', true)
        app.save(r2)
      }
    }

    // 2. SEED DE CENÁRIOS COMPARATIVOS
    let cenario1Id = ''
    try {
      const exist = app.findFirstRecordByData('cenarios_capacidade', 'codigo', 'CEN-2026-TECH-01')
      cenario1Id = exist.id
    } catch (_) {
      if (planoId && empresaAlvoId && autorId) {
        const c1 = new Record(colCenarios)
        c1.set('codigo', 'CEN-2026-TECH-01')
        c1.set('nome', 'Cenário Expansão Mobile: Realocação Interna vs Contratação CLT vs PJ')
        c1.set(
          'objetivo',
          'Avaliar opções para antecipar a entrega do App Mobile sem extrapolar o teto orçamentário anual.',
        )
        c1.set('versao_base_plano', planoId)
        c1.set('empresa', empresaAlvoId)
        c1.set('data_referencia', '2026-11-01')
        c1.set('horizonte_temporal', '2026-Q4 a 2027-Q1 (6 meses)')
        c1.set('autor', autorId)
        c1.set('autor_nome', 'Douglas Severo')
        c1.set('situacao', 'em_estudo')
        c1.set('premissas', {
          data_inicio: '2026-11-01',
          duracao_meses: 6,
          volume_capacidade_necessaria_horas: 320,
          prazo_medio_contratacao_dias: 35,
          prazo_desenvolvimento_competencia_dias: 60,
          reserva_operacional_aplicada_percentual: 10,
          grau_confirmacao_demanda: 'confirmada',
        })
        c1.set('fontes_dados', [
          { fonte: 'planos_capacidade', registro_id: planoId, confianca: 'oficial_aprovado' },
          { fonte: 'contratos_pj', confianca: 'vigente_assinado' },
          { fonte: 'cargos_catalogo', confianca: 'normalizado' },
        ])
        c1.set(
          'qualidade_dados_declarada',
          'Dados completos de contratos vigentes e competências catalogadas; custos de contratação estimados com base nas últimas 3 admissões da BU.',
        )
        c1.set('alternativas', [
          {
            id: 'alt_realocacao',
            tipo: 'realocar_capacidade',
            titulo: 'Realocar 2 Engenheiros do Projeto Legado para o Mobile',
            descricao:
              'Move 80h/mês de cada engenheiro do projeto de Sustentação para o App Mobile.',
            prazo_disponibilizacao_dias: 5,
            custo_incremental_mensal: 0,
            custo_pontual: 0,
            demandas_atendidas: ['DEM-TECH-001'],
            lacunas_remanescentes: ['Sustentação sofrerá redução de 160h/mês'],
            impacto_origem: 'Perda de 30% da capacidade do time de Sustentação Web.',
            dependencias: ['Validação formal com o cliente do contrato de suporte.'],
            riscos: ['Atrasos em correções não críticas do sistema legado.'],
            dados_ausentes: [],
          },
          {
            id: 'alt_capacitacao',
            tipo: 'desenvolver_competencias',
            titulo: 'Capacitar Desenvolvedores Frontend Web em React Native',
            descricao: 'Programa de upskilling intensivo com mentoria durante 60 dias.',
            prazo_disponibilizacao_dias: 60,
            custo_incremental_mensal: 0,
            custo_pontual: 12000,
            demandas_atendidas: ['DEM-TECH-001 (a partir do mês 3)'],
            lacunas_remanescentes: ['Sem ganho imediato nos primeiros 60 dias.'],
            impacto_origem: 'Dedicação de 10h semanais para estudos durante o período.',
            dependencias: ['Instrutor sênior disponível para conduzir as mentorias.'],
            riscos: ['Curva de aprendizado superior à meta inicial.'],
            dados_ausentes: [],
          },
          {
            id: 'alt_clt',
            tipo: 'contratar_clt',
            titulo: 'Abrir 1 Posição CLT de Desenvolvedor Mobile Sênior',
            descricao: 'Contratação via processo seletivo de mercado (160h/mês fixas).',
            prazo_disponibilizacao_dias: 40,
            custo_incremental_mensal: 18500,
            custo_pontual: 3500,
            demandas_atendidas: ['DEM-TECH-001'],
            lacunas_remanescentes: [],
            impacto_origem: 'Nenhum impacto de desfalque interno.',
            dependencias: ['Aprovação de alçada orçamentária pela diretoria.'],
            riscos: ['Prazo de atração de talentos tech em mercado aquecido.'],
            dados_ausentes: [],
          },
          {
            id: 'alt_escopo',
            tipo: 'contratar_servico_escopo',
            titulo: 'Contratar Fábrica de Software por Pacote de Entregáveis',
            descricao: 'Contratação de entrega fechada: 3 sprints fechadas com marcos de entrega.',
            prazo_disponibilizacao_dias: 15,
            custo_incremental_mensal: 0,
            custo_pontual: 65000,
            unidade_medicao: 'entregaveis_marcos',
            demandas_atendidas: ['Módulos de Login, Checkout e Push Notifications'],
            lacunas_remanescentes: ['Sustentação pós-entrega não inclusa.'],
            impacto_origem: 'Exige 20h de homologação técnica pelo Tech Lead.',
            dependencias: ['Definição exaustiva do documento de requisitos de escopo.'],
            riscos: ['Aditivos de escopo caso requisitos sofram alteração.'],
            dados_ausentes: ['Critério contábil de amortização do ativo intangível.'],
          },
        ])
        c1.set('resumo_comparativo', {
          horizonte_meses: 6,
          menor_prazo_alternativa: 'alt_realocacao (5 dias)',
          menor_custo_mensal: 'alt_realocacao (R$ 0,00)',
          menor_custo_total: 'alt_capacitacao (R$ 12.000,00)',
          alternativa_com_maior_cobertura: 'alt_clt',
        })
        c1.set('is_demonstracao', true)
        app.save(c1)
        cenario1Id = c1.id
      }
    }

    // 3. SEED DE PROPOSTA DE REVISÃO (Fluxo de Governança)
    try {
      app.findFirstRecordByData('propostas_revisao_plano', 'codigo', 'PROP-REV-2026-001')
    } catch (_) {
      if (cenario1Id && planoId && empresaAlvoId && autorId) {
        const p1 = new Record(colPropostas)
        p1.set('codigo', 'PROP-REV-2026-001')
        p1.set('cenario_origem', cenario1Id)
        p1.set('plano_alvo', planoId)
        p1.set('empresa', empresaAlvoId)
        p1.set(
          'justificativa_adocao',
          'Proposta decorrente da simulação do Cenário Expansão Mobile: recomendada adoção da alternativa híbrida (Capacitação interna de 1 dev + Contratação de serviço por escopo dos módulos críticos).',
        )
        p1.set('impactos_previstos', {
          custo_total_previsto: 77000,
          prazo_meses: 6,
          alteracao_headcount_clt: 0,
          alteracao_headcount_pj: 0,
          servico_escopo_fechado: true,
        })
        p1.set('situacao', 'em_analise_rh')
        p1.set('proposto_por', autorId)
        p1.set('proposto_por_nome', 'Douglas Severo')
        p1.set('is_demonstracao', true)
        app.save(p1)
      }
    }
  },
  (app) => {
    try {
      const p = app.findFirstRecordByData('propostas_revisao_plano', 'codigo', 'PROP-REV-2026-001')
      app.delete(p)
    } catch (_) {}
    try {
      const c = app.findFirstRecordByData('cenarios_capacidade', 'codigo', 'CEN-2026-TECH-01')
      app.delete(c)
    } catch (_) {}
    try {
      const r2 = app.findFirstRecordByData('reservas_operacionais', 'codigo', 'RES-VERT-ZERO')
      app.delete(r2)
    } catch (_) {}
    try {
      const r1 = app.findFirstRecordByData('reservas_operacionais', 'codigo', 'RES-TECH-2026')
      app.delete(r1)
    } catch (_) {}
  },
)
