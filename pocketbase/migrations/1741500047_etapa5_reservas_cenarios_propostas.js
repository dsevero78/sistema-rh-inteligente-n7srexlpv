/**
 * Migração: 1741500047_etapa5_reservas_cenarios_propostas.js
 *
 * Módulo 1: Planejamento da Força de Trabalho - ETAPA 5 (v0.0.88 - HOMOLOGAÇÃO)
 * Criação das coleções estruturais:
 *  1. reservas_operacionais: Modelagem explícita da reserva (4 estados: aprovada, explicitamente_zero, nao_definida, premissa_simulacao)
 *  2. cenarios_capacidade: Cenários comparativos com premissas, fontes, qualidade e alternativas estruturadas
 *  3. propostas_revisao_plano: Propostas geradas pela adoção de um cenário (nunca efetivação direta)
 *
 * Segurança e API rules:
 *  - Escopo por BU obrigatório: Gestor vê e cria apenas para sua BU; RH vê amplo.
 */

migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'
    const empresasColId = app.findCollectionByNameOrId('empresas').id
    const areasColId = app.findCollectionByNameOrId('areas').id
    const centrosCustoColId = app.findCollectionByNameOrId('centros_custo').id
    const planosColId = app.findCollectionByNameOrId('planos_capacidade').id

    // =========================================================================
    // COLEÇÃO 1: reservas_operacionais
    // =========================================================================
    if (!app.hasTable('reservas_operacionais')) {
      const colReservas = new Collection({
        name: 'reservas_operacionais',
        type: 'base',
        // RH vê tudo; Gestor vê apenas se a empresa/BU corresponder à sua
        listRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        createRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || @request.body.empresa = @request.auth.empresa)",
        updateRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        deleteRule: "@request.auth.id != '' && @request.auth.cargo_funcao = 'RH / Recrutador'",
        fields: [
          { name: 'codigo', type: 'text', required: true },
          { name: 'nome', type: 'text', required: true },
          {
            name: 'empresa',
            type: 'relation',
            required: true,
            collectionId: empresasColId,
            maxSelect: 1,
          },
          {
            name: 'area',
            type: 'relation',
            required: false,
            collectionId: areasColId,
            maxSelect: 1,
          },
          {
            name: 'centro_custo',
            type: 'relation',
            required: false,
            collectionId: centrosCustoColId,
            maxSelect: 1,
          },
          {
            name: 'unidade',
            type: 'select',
            required: true,
            values: ['percentual', 'horas_mes'],
            maxSelect: 1,
          },
          { name: 'valor', type: 'number' },
          {
            name: 'base_calculo',
            type: 'select',
            required: true,
            values: ['capacidade_liquida', 'capacidade_bruta', 'horas_disponiveis'],
            maxSelect: 1,
          },
          {
            name: 'situacao_aprovacao',
            type: 'select',
            required: true,
            values: ['aprovada', 'explicitamente_zero', 'nao_definida', 'premissa_simulacao'],
            maxSelect: 1,
          },
          { name: 'vigencia_inicio', type: 'date', required: true },
          { name: 'vigencia_fim', type: 'date' },
          { name: 'justificativa', type: 'text', required: true },
          {
            name: 'responsavel',
            type: 'relation',
            required: true,
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'responsavel_nome', type: 'text' },
          {
            name: 'aprovado_por',
            type: 'relation',
            required: false,
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'data_aprovacao', type: 'date' },
          { name: 'is_demonstracao', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_reservas_codigo ON reservas_operacionais (codigo)',
          'CREATE INDEX idx_reservas_empresa ON reservas_operacionais (empresa)',
          'CREATE INDEX idx_reservas_situacao ON reservas_operacionais (situacao_aprovacao)',
          'CREATE INDEX idx_reservas_vigencia ON reservas_operacionais (vigencia_inicio, vigencia_fim)',
        ],
      })
      app.save(colReservas)
    }

    // =========================================================================
    // COLEÇÃO 2: cenarios_capacidade
    // =========================================================================
    if (!app.hasTable('cenarios_capacidade')) {
      const colCenarios = new Collection({
        name: 'cenarios_capacidade',
        type: 'base',
        // RH vê tudo; Gestor vê apenas se a empresa/BU do cenário for a sua
        listRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        createRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || @request.body.empresa = @request.auth.empresa)",
        updateRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        fields: [
          { name: 'codigo', type: 'text', required: true },
          { name: 'nome', type: 'text', required: true },
          { name: 'objetivo', type: 'text', required: true },
          {
            name: 'versao_base_plano',
            type: 'relation',
            required: true,
            collectionId: planosColId,
            maxSelect: 1,
          },
          {
            name: 'empresa',
            type: 'relation',
            required: true,
            collectionId: empresasColId,
            maxSelect: 1,
          },
          {
            name: 'area',
            type: 'relation',
            required: false,
            collectionId: areasColId,
            maxSelect: 1,
          },
          { name: 'data_referencia', type: 'date', required: true },
          { name: 'horizonte_temporal', type: 'text', required: true },
          {
            name: 'autor',
            type: 'relation',
            required: true,
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'autor_nome', type: 'text' },
          {
            name: 'situacao',
            type: 'select',
            required: true,
            values: ['em_estudo', 'proposta_submetida', 'reprovado', 'adotado_como_revisao'],
            maxSelect: 1,
          },
          { name: 'premissas', type: 'json' },
          { name: 'alteracoes_propostas', type: 'json' },
          { name: 'alternativas', type: 'json' },
          { name: 'fontes_dados', type: 'json' },
          { name: 'qualidade_dados_declarada', type: 'text' },
          { name: 'resumo_comparativo', type: 'json' },
          { name: 'is_demonstracao', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_cenarios_codigo ON cenarios_capacidade (codigo)',
          'CREATE INDEX idx_cenarios_plano ON cenarios_capacidade (versao_base_plano)',
          'CREATE INDEX idx_cenarios_empresa ON cenarios_capacidade (empresa)',
          'CREATE INDEX idx_cenarios_situacao ON cenarios_capacidade (situacao)',
        ],
      })
      app.save(colCenarios)
    }

    const cenariosColId = app.findCollectionByNameOrId('cenarios_capacidade').id

    // =========================================================================
    // COLEÇÃO 3: propostas_revisao_plano
    // =========================================================================
    if (!app.hasTable('propostas_revisao_plano')) {
      const colPropostas = new Collection({
        name: 'propostas_revisao_plano',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        createRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || @request.body.empresa = @request.auth.empresa)",
        updateRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        deleteRule: "@request.auth.id != '' && @request.auth.cargo_funcao = 'RH / Recrutador'",
        fields: [
          { name: 'codigo', type: 'text', required: true },
          {
            name: 'cenario_origem',
            type: 'relation',
            required: true,
            collectionId: cenariosColId,
            maxSelect: 1,
          },
          {
            name: 'plano_alvo',
            type: 'relation',
            required: true,
            collectionId: planosColId,
            maxSelect: 1,
          },
          {
            name: 'empresa',
            type: 'relation',
            required: true,
            collectionId: empresasColId,
            maxSelect: 1,
          },
          { name: 'justificativa_adocao', type: 'text', required: true },
          { name: 'impactos_previstos', type: 'json' },
          {
            name: 'situacao',
            type: 'select',
            required: true,
            values: ['em_analise_rh', 'aprovada_para_revisao', 'rejeitada', 'cancelada'],
            maxSelect: 1,
          },
          {
            name: 'proposto_por',
            type: 'relation',
            required: true,
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'proposto_por_nome', type: 'text' },
          {
            name: 'decidido_por',
            type: 'relation',
            required: false,
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'data_decisao', type: 'date' },
          { name: 'parecer_decisao', type: 'text' },
          { name: 'is_demonstracao', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_propostas_codigo ON propostas_revisao_plano (codigo)',
          'CREATE INDEX idx_propostas_cenario ON propostas_revisao_plano (cenario_origem)',
          'CREATE INDEX idx_propostas_plano ON propostas_revisao_plano (plano_alvo)',
          'CREATE INDEX idx_propostas_empresa ON propostas_revisao_plano (empresa)',
        ],
      })
      app.save(colPropostas)
    }
  },
  (app) => {
    try {
      const colPropostas = app.findCollectionByNameOrId('propostas_revisao_plano')
      app.delete(colPropostas)
    } catch (_) {}
    try {
      const colCenarios = app.findCollectionByNameOrId('cenarios_capacidade')
      app.delete(colCenarios)
    } catch (_) {}
    try {
      const colReservas = app.findCollectionByNameOrId('reservas_operacionais')
      app.delete(colReservas)
    } catch (_) {}
  },
)
