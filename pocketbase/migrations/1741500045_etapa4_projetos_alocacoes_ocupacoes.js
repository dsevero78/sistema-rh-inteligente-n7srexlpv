/**
 * Migração: 1741500045_etapa4_projetos_alocacoes_ocupacoes.js
 *
 * Módulo 1: Planejamento da Força de Trabalho - ETAPA 4 (v0.0.87 - HOMOLOGAÇÃO)
 * Criação das coleções estruturais:
 *  1. projetos: Destino mínimo de alocação (com diferenciação entre relacionamento validado vs referência informativa)
 *  2. alocacoes: Alocações por período (unidade, percentual/horas, escopo vs disponibilidade, proposta vs confirmada)
 *  3. ocupacoes_posicao: Registro explícito de ocupação de posições planejadas do plano aprovado
 */

migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'
    const empresasColId = app.findCollectionByNameOrId('empresas').id
    const areasColId = app.findCollectionByNameOrId('areas').id
    const pessoasColId = app.findCollectionByNameOrId('pessoas').id
    const planosColId = app.findCollectionByNameOrId('planos_capacidade').id
    const demandasColId = app.findCollectionByNameOrId('demandas_planejadas').id
    const posicoesColId = app.findCollectionByNameOrId('posicoes_planejadas').id
    const competenciasColId = app.findCollectionByNameOrId('competencias').id
    const contratosColId = app.findCollectionByNameOrId('contratos').id

    // =========================================================================
    // COLEÇÃO 1: projetos
    // =========================================================================
    if (!app.hasTable('projetos')) {
      const colProjetos = new Collection({
        name: 'projetos',
        type: 'base',
        // RH vê todos; Gestor vê se for da sua BU/empresa ou se for o gestor/responsável
        listRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa_responsavel = @request.auth.empresa || bu_relacionada = @request.auth.empresa || responsavel = @request.auth.id)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa_responsavel = @request.auth.empresa || bu_relacionada = @request.auth.empresa || responsavel = @request.auth.id)",
        // Gestor cria apenas associando à sua empresa/BU
        createRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || @request.body.empresa_responsavel = @request.auth.empresa)",
        updateRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || empresa_responsavel = @request.auth.empresa || responsavel = @request.auth.id)",
        deleteRule: "@request.auth.id != '' && @request.auth.cargo_funcao = 'RH / Recrutador'",
        fields: [
          { name: 'identificador', type: 'text', required: true },
          { name: 'nome', type: 'text', required: true },
          {
            name: 'empresa_responsavel',
            type: 'relation',
            required: true,
            collectionId: empresasColId,
            maxSelect: 1,
          },
          {
            name: 'bu_relacionada',
            type: 'relation',
            required: false,
            collectionId: empresasColId,
            maxSelect: 1,
          },
          {
            name: 'area_relacionada',
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
          { name: 'inicio_previsto', type: 'date', required: true },
          { name: 'termino_previsto', type: 'date' },
          {
            name: 'situacao',
            type: 'select',
            required: true,
            values: ['Planejado', 'Em andamento', 'Pausado', 'Concluido', 'Cancelado'],
            maxSelect: 1,
          },
          { name: 'referencia_externa', type: 'text' },
          { name: 'cliente_nome', type: 'text' },
          { name: 'contrato_comercial_ref', type: 'text' },
          {
            name: 'relacionamento_validado',
            type: 'bool',
          },
          { name: 'is_demonstracao', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_projetos_identificador ON projetos (identificador)',
          'CREATE INDEX idx_projetos_empresa ON projetos (empresa_responsavel)',
          'CREATE INDEX idx_projetos_situacao ON projetos (situacao)',
        ],
      })
      app.save(colProjetos)
    }

    const projetosColId = app.findCollectionByNameOrId('projetos').id

    // =========================================================================
    // COLEÇÃO 2: alocacoes
    // =========================================================================
    if (!app.hasTable('alocacoes')) {
      const colAlocacoes = new Collection({
        name: 'alocacoes',
        type: 'base',
        // RH vê tudo; Gestor vê apenas se a pessoa pertencer à sua BU ou o projeto pertencer à sua BU
        listRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || pessoa.empresa = @request.auth.empresa || (projeto != null && projeto.empresa_responsavel = @request.auth.empresa))",
        viewRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || pessoa.empresa = @request.auth.empresa || (projeto != null && projeto.empresa_responsavel = @request.auth.empresa))",
        createRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || pessoa.empresa = @request.auth.empresa)",
        updateRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || pessoa.empresa = @request.auth.empresa)",
        deleteRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || pessoa.empresa = @request.auth.empresa)",
        fields: [
          {
            name: 'pessoa',
            type: 'relation',
            required: true,
            collectionId: pessoasColId,
            maxSelect: 1,
          },
          {
            name: 'projeto',
            type: 'relation',
            required: false,
            collectionId: projetosColId,
            maxSelect: 1,
          },
          { name: 'destino_organizacional', type: 'text' },
          { name: 'periodo_inicio', type: 'date', required: true },
          { name: 'periodo_fim', type: 'date', required: true },
          {
            name: 'modalidade_capacidade',
            type: 'select',
            required: true,
            values: ['disponibilidade', 'escopo'],
            maxSelect: 1,
          },
          {
            name: 'unidade',
            type: 'select',
            required: true,
            values: ['percentual', 'horas_mes', 'entregavel_escopo'],
            maxSelect: 1,
          },
          { name: 'quantidade', type: 'number', required: true },
          { name: 'papel_desempenhado', type: 'text' },
          {
            name: 'competencia_requerida',
            type: 'relation',
            required: false,
            collectionId: competenciasColId,
            maxSelect: 1,
          },
          {
            name: 'situacao',
            type: 'select',
            required: true,
            values: ['proposta', 'confirmada', 'encerrada', 'cancelada'],
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
          { name: 'justificativa', type: 'text' },
          {
            name: 'demanda',
            type: 'relation',
            required: false,
            collectionId: demandasColId,
            maxSelect: 1,
          },
          {
            name: 'posicao',
            type: 'relation',
            required: false,
            collectionId: posicoesColId,
            maxSelect: 1,
          },
          { name: 'excecao_autorizada', type: 'bool' },
          { name: 'excecao_justificativa', type: 'text' },
          { name: 'is_demonstracao', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_alocacoes_pessoa ON alocacoes (pessoa)',
          'CREATE INDEX idx_alocacoes_projeto ON alocacoes (projeto)',
          'CREATE INDEX idx_alocacoes_situacao ON alocacoes (situacao)',
          'CREATE INDEX idx_alocacoes_periodo ON alocacoes (periodo_inicio, periodo_fim)',
        ],
      })
      app.save(colAlocacoes)
    }

    // =========================================================================
    // COLEÇÃO 3: ocupacoes_posicao
    // =========================================================================
    if (!app.hasTable('ocupacoes_posicao')) {
      const colOcupacoes = new Collection({
        name: 'ocupacoes_posicao',
        type: 'base',
        listRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || posicao.empresa = @request.auth.empresa || pessoa.empresa = @request.auth.empresa)",
        viewRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || posicao.empresa = @request.auth.empresa || pessoa.empresa = @request.auth.empresa)",
        createRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || posicao.empresa = @request.auth.empresa)",
        updateRule:
          "@request.auth.id != '' && (@request.auth.cargo_funcao != 'Gestor Contratante' || posicao.empresa = @request.auth.empresa)",
        deleteRule: "@request.auth.id != '' && @request.auth.cargo_funcao = 'RH / Recrutador'",
        fields: [
          {
            name: 'posicao',
            type: 'relation',
            required: true,
            collectionId: posicoesColId,
            maxSelect: 1,
          },
          {
            name: 'pessoa',
            type: 'relation',
            required: true,
            collectionId: pessoasColId,
            maxSelect: 1,
          },
          { name: 'data_inicio', type: 'date', required: true },
          { name: 'data_termino', type: 'date' },
          {
            name: 'situacao',
            type: 'select',
            required: true,
            values: ['ativa', 'encerrada', 'substituida'],
            maxSelect: 1,
          },
          {
            name: 'origem_vinculacao',
            type: 'select',
            required: true,
            values: [
              'promocao_interna',
              'transferencia',
              'contratacao_externa',
              'alocacao_temporaria',
              'enquadramento_inicial',
            ],
            maxSelect: 1,
          },
          {
            name: 'ocupante_anterior',
            type: 'relation',
            required: false,
            collectionId: pessoasColId,
            maxSelect: 1,
          },
          { name: 'motivo_substituicao', type: 'text' },
          {
            name: 'registrado_por',
            type: 'relation',
            required: true,
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'observacoes', type: 'text' },
          { name: 'is_demonstracao', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_ocupacoes_posicao ON ocupacoes_posicao (posicao)',
          'CREATE INDEX idx_ocupacoes_pessoa ON ocupacoes_posicao (pessoa)',
          'CREATE INDEX idx_ocupacoes_situacao ON ocupacoes_posicao (situacao)',
        ],
      })
      app.save(colOcupacoes)
    }
  },
  (app) => {
    try {
      const colOcupacoes = app.findCollectionByNameOrId('ocupacoes_posicao')
      app.delete(colOcupacoes)
    } catch (_) {}
    try {
      const colAlocacoes = app.findCollectionByNameOrId('alocacoes')
      app.delete(colAlocacoes)
    } catch (_) {}
    try {
      const colProjetos = app.findCollectionByNameOrId('projetos')
      app.delete(colProjetos)
    } catch (_) {}
  },
)
