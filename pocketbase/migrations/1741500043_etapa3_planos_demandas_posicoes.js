/**
 * Migração: 1741500043_etapa3_planos_demandas_posicoes.js
 *
 * Módulo 1: Planejamento da Força de Trabalho - ETAPA 3
 * Cria as coleções base com regras de API estritas por escopo (BU/área para gestor, grupo todo para RH):
 *  1. planos_capacidade (Planos e versões de planejamento da força de trabalho)
 *  2. demandas_planejadas (Demandas corporativas mapeadas)
 *  3. posicoes_planejadas (Posições planejadas identificadas individualmente)
 *  4. solicitacoes_contratacao_plano (Acompanhamento da integração de posições com vagas)
 */

migrate(
  (app) => {
    // 1. Obter IDs das coleções relacionadas
    const usersColId = '_pb_users_auth_'
    const empresasColId = app.findCollectionByNameOrId('empresas').id
    const areasColId = app.findCollectionByNameOrId('areas').id
    const cargosColId = app.findCollectionByNameOrId('cargos').id
    const centrosCustoColId = app.findCollectionByNameOrId('centros_custo').id
    const vagasColId = app.findCollectionByNameOrId('vagas').id

    // =========================================================================
    // COLEÇÃO 1: planos_capacidade
    // =========================================================================
    if (!app.hasTable('planos_capacidade')) {
      const colPlanos = new Collection({
        name: 'planos_capacidade',
        type: 'base',
        // RH vê tudo (@request.auth.cargo_funcao != 'Gestor Contratante');
        // Gestor vê somente se o plano estiver no escopo da sua própria BU/empresa
        listRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        // Gestores podem criar rascunho apenas para a sua empresa; RH cria para qualquer uma
        createRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || @request.body.empresa = @request.auth.empresa)",
        // Edição de plano: somente quando rascunho ou devolvido. Versão em análise ou aprovada não pode ser editada livremente.
        // Gestor restrito à sua BU
        updateRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa) && (situacao = 'Rascunho' || situacao = 'Devolvido para ajuste' || @request.body.situacao != '')",
        // Exclusão permitida apenas em rascunho
        deleteRule:
          "@request.auth.id != '' && situacao = 'Rascunho' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        fields: [
          { name: 'codigo', type: 'text', required: true },
          { name: 'nome', type: 'text', required: true },
          { name: 'periodo_referencia', type: 'text', required: true },
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
            name: 'responsavel',
            type: 'relation',
            required: true,
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'responsavel_nome', type: 'text' },
          { name: 'objetivo', type: 'text', required: true },
          { name: 'premissas', type: 'text' },
          { name: 'versao_numero', type: 'number', required: true },
          { name: 'rotulo_versao', type: 'text', required: true },
          {
            name: 'situacao',
            type: 'select',
            required: true,
            values: [
              'Rascunho',
              'Em análise',
              'Devolvido para ajuste',
              'Aprovado',
              'Substituído por nova versão',
              'Arquivado',
            ],
            maxSelect: 1,
          },
          { name: 'data_submissao', type: 'date' },
          {
            name: 'submetido_por',
            type: 'relation',
            required: false,
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'data_decisao', type: 'date' },
          {
            name: 'decidido_por',
            type: 'relation',
            required: false,
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'justificativa_devolucao', type: 'text' },
          { name: 'plano_origem_revisao', type: 'text' },
          { name: 'snapshot_aprovacao', type: 'json' },
          { name: 'hash_aprovacao', type: 'text' },
          { name: 'alcada_aprovacao_definida', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_planos_codigo_versao ON planos_capacidade (codigo, versao_numero)',
          'CREATE INDEX idx_planos_empresa ON planos_capacidade (empresa)',
          'CREATE INDEX idx_planos_situacao ON planos_capacidade (situacao)',
          'CREATE INDEX idx_planos_responsavel ON planos_capacidade (responsavel)',
        ],
      })
      app.save(colPlanos)
    }

    const planosColId = app.findCollectionByNameOrId('planos_capacidade').id

    // =========================================================================
    // COLEÇÃO 2: demandas_planejadas
    // =========================================================================
    if (!app.hasTable('demandas_planejadas')) {
      const colDemandas = new Collection({
        name: 'demandas_planejadas',
        type: 'base',
        // Escopamento server-side por empresa/BU
        listRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        createRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || @request.body.empresa = @request.auth.empresa)",
        // Apenas alterável se o plano não estiver Aprovado ou Substituído
        updateRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa) && plano.situacao != 'Aprovado' && plano.situacao != 'Substituído por nova versão'",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa) && plano.situacao != 'Aprovado' && plano.situacao != 'Substituído por nova versão'",
        fields: [
          {
            name: 'plano',
            type: 'relation',
            required: true,
            collectionId: planosColId,
            maxSelect: 1,
          },
          { name: 'codigo', type: 'text', required: true },
          { name: 'origem', type: 'text', required: true },
          { name: 'problema_necessidade', type: 'text', required: true },
          { name: 'resultado_esperado', type: 'text', required: true },
          {
            name: 'responsavel',
            type: 'relation',
            required: true,
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'responsavel_nome', type: 'text' },
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
          { name: 'periodo_necessario', type: 'text', required: true },
          { name: 'data_necessaria', type: 'date', required: true },
          {
            name: 'prioridade',
            type: 'select',
            required: true,
            values: ['Alta', 'Media', 'Baixa', 'Critica'],
            maxSelect: 1,
          },
          {
            name: 'grau_confirmacao',
            type: 'select',
            required: true,
            values: ['confirmada', 'provavel', 'exploratoria'],
            maxSelect: 1,
          },
          { name: 'quantidade', type: 'number', required: true },
          { name: 'unidade_necessidade', type: 'text', required: true },
          { name: 'premissas', type: 'text' },
          { name: 'consequencia_nao_atendimento', type: 'text', required: true },
          { name: 'competencias_necessarias', type: 'json' },
          { name: 'referencia_projeto_cliente', type: 'text' },
          { name: 'projeto_nao_vinculado_info', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_demandas_plano ON demandas_planejadas (plano)',
          'CREATE INDEX idx_demandas_empresa ON demandas_planejadas (empresa)',
          'CREATE INDEX idx_demandas_grau ON demandas_planejadas (grau_confirmacao)',
          'CREATE UNIQUE INDEX idx_demandas_plano_codigo ON demandas_planejadas (plano, codigo)',
        ],
      })
      app.save(colDemandas)
    }

    const demandasColId = app.findCollectionByNameOrId('demandas_planejadas').id

    // =========================================================================
    // COLEÇÃO 3: posicoes_planejadas
    // =========================================================================
    if (!app.hasTable('posicoes_planejadas')) {
      const colPosicoes = new Collection({
        name: 'posicoes_planejadas',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        createRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || @request.body.empresa = @request.auth.empresa)",
        // Não pode alterar nem deletar posições de versão aprovada ou substituída
        updateRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa) && plano.situacao != 'Aprovado' && plano.situacao != 'Substituído por nova versão'",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa) && plano.situacao != 'Aprovado' && plano.situacao != 'Substituído por nova versão'",
        fields: [
          {
            name: 'plano',
            type: 'relation',
            required: true,
            collectionId: planosColId,
            maxSelect: 1,
          },
          { name: 'codigo', type: 'text', required: true },
          {
            name: 'demanda',
            type: 'relation',
            required: false,
            collectionId: demandasColId,
            maxSelect: 1,
          },
          {
            name: 'cargo',
            type: 'relation',
            required: true,
            collectionId: cargosColId,
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
          {
            name: 'centro_custo',
            type: 'relation',
            required: false,
            collectionId: centrosCustoColId,
            maxSelect: 1,
          },
          { name: 'proposito_resultados', type: 'text', required: true },
          { name: 'competencias_exigidas', type: 'json' },
          {
            name: 'criticidade',
            type: 'select',
            required: true,
            values: ['Baixa', 'Media', 'Alta', 'Critica'],
            maxSelect: 1,
          },
          {
            name: 'modalidade_prevista',
            type: 'select',
            required: true,
            values: ['Presencial', 'Hibrido', 'Remoto'],
            maxSelect: 1,
          },
          {
            name: 'tipo',
            type: 'select',
            required: true,
            values: ['nova_posicao', 'substituicao', 'necessidade_temporaria'],
            maxSelect: 1,
          },
          { name: 'data_inicio_prevista', type: 'date', required: true },
          { name: 'data_termino_prevista', type: 'date' },
          { name: 'justificativa', type: 'text', required: true },
          // Custos preliminares discriminados:
          { name: 'custo_tipo', type: 'select', values: ['recorrente', 'pontual'], maxSelect: 1 },
          {
            name: 'custo_periodicidade',
            type: 'select',
            values: ['mensal', 'anual', 'unico', 'hora'],
            maxSelect: 1,
          },
          { name: 'custo_estimado', type: 'number' },
          { name: 'custo_informado', type: 'bool' },
          { name: 'custo_periodo_incidencia', type: 'text' },
          { name: 'custo_fonte', type: 'text' },
          { name: 'custo_data_estimativa', type: 'date' },
          { name: 'custo_premissas', type: 'text' },
          { name: 'lote_identificador', type: 'text' },
          { name: 'lote_indice', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_posicoes_plano ON posicoes_planejadas (plano)',
          'CREATE INDEX idx_posicoes_empresa ON posicoes_planejadas (empresa)',
          'CREATE INDEX idx_posicoes_cargo ON posicoes_planejadas (cargo)',
          'CREATE UNIQUE INDEX idx_posicoes_plano_codigo ON posicoes_planejadas (plano, codigo)',
        ],
      })
      app.save(colPosicoes)
    }

    const posicoesColId = app.findCollectionByNameOrId('posicoes_planejadas').id

    // =========================================================================
    // COLEÇÃO 4: solicitacoes_contratacao_plano (Acompanhamento da execução)
    // Permite gerar solicitação de contratação (vaga) preservando a imutabilidade do plano
    // =========================================================================
    if (!app.hasTable('solicitacoes_contratacao_plano')) {
      const colSolicitacoes = new Collection({
        name: 'solicitacoes_contratacao_plano',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || posicao.empresa = @request.auth.empresa)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || posicao.empresa = @request.auth.empresa)",
        // Apenas criável se o plano estiver Aprovado
        createRule:
          "@request.auth.id != '' && plano.situacao = 'Aprovado' && (@request.auth.cargo_funcao != 'Gestor Contratante' || @request.body.empresa = @request.auth.empresa)",
        updateRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa = @request.auth.empresa)",
        deleteRule: "@request.auth.id != '' && @request.auth.cargo_funcao = 'RH / Recrutador'",
        fields: [
          {
            name: 'plano',
            type: 'relation',
            required: true,
            collectionId: planosColId,
            maxSelect: 1,
          },
          {
            name: 'posicao',
            type: 'relation',
            required: true,
            collectionId: posicoesColId,
            maxSelect: 1,
          },
          {
            name: 'demanda',
            type: 'relation',
            required: false,
            collectionId: demandasColId,
            maxSelect: 1,
          },
          {
            name: 'vaga',
            type: 'relation',
            required: false,
            collectionId: vagasColId,
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
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['solicitada', 'vaga_em_aprovacao', 'vaga_aberta', 'cancelada'],
            maxSelect: 1,
          },
          {
            name: 'solicitado_por',
            type: 'relation',
            required: true,
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'solicitado_por_nome', type: 'text' },
          { name: 'data_solicitacao', type: 'date', required: true },
          { name: 'idempotency_key', type: 'text', required: true },
          { name: 'historico_rastreabilidade', type: 'json' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_solic_posicao_ativa ON solicitacoes_contratacao_plano (idempotency_key)',
          'CREATE INDEX idx_solic_plano ON solicitacoes_contratacao_plano (plano)',
          'CREATE INDEX idx_solic_posicao ON solicitacoes_contratacao_plano (posicao)',
        ],
      })
      app.save(colSolicitacoes)
    }
  },
  (app) => {
    try {
      const colSolic = app.findCollectionByNameOrId('solicitacoes_contratacao_plano')
      app.delete(colSolic)
    } catch (_) {}
    try {
      const colPos = app.findCollectionByNameOrId('posicoes_planejadas')
      app.delete(colPos)
    } catch (_) {}
    try {
      const colDem = app.findCollectionByNameOrId('demandas_planejadas')
      app.delete(colDem)
    } catch (_) {}
    try {
      const colPlanos = app.findCollectionByNameOrId('planos_capacidade')
      app.delete(colPlanos)
    } catch (_) {}
  },
)
