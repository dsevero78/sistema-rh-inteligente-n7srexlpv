/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração: 1741500041_etapa2_catalogos_e_normalizacao.js
 *
 * Objetivo da Etapa 2 (Homologação):
 * 1. Catálogo de Cargos (cargos):
 *    codigo, nome, descricao, ativo (bool), competencias_referencia (relation -> competencias)
 *    Preserva textos legados de pessoas e vagas.
 *
 * 2. Catálogo de Competências (competencias):
 *    nome, descricao, categoria (técnica / comportamental / liderança / gestão), criterios_proficiencia (JSON/texto)
 *
 * 3. Catálogo de Competências por Pessoa (competencias_pessoas):
 *    pessoa (relation -> pessoas), competencia (relation -> competencias),
 *    proficiencia (select: Nao_avaliada | Nivel_1_Basico | Nivel_2_Intermediario | Nivel_3_Avancado | Nivel_4_Especialista | Nivel_5_Referencia),
 *    fonte (select: autodeclarada | gestor | certificado | curriculo_extraido),
 *    status_validacao (select: pendente | validada | rejeitada),
 *    evidencia_documento (relation opcional -> documentos_pessoa),
 *    responsavel_validacao (relation -> users),
 *    data_validacao (date), validade (date), observacoes (text)
 *
 * 4. Catálogo de Centros de Custo (centros_custo):
 *    codigo, nome, empresa (relation -> empresas), vigencia_inicio (date), vigencia_fim (date),
 *    status (select: Ativo | Inativo), identificador_externo (text, opcional para ERP)
 *    Índice único composto por empresa + codigo.
 *
 * 5. Mapeamento de Normalização Controlada (mapeamento_normalizacao):
 *    registro_origem_colecao (select: pessoas | vagas),
 *    registro_origem_id (text),
 *    campo_origem (text: cargo_funcao | departamento | centro_custo | cargo | etc.),
 *    texto_original (text),
 *    empresa_contexto (relation -> empresas),
 *    area_contexto (relation -> areas),
 *    tipo_destino (select: cargo | centro_custo | area),
 *    cargo_destino (relation -> cargos),
 *    centro_custo_destino (relation -> centros_custo),
 *    area_destino (relation -> areas),
 *    justificativa (text),
 *    status (select: pendente | aprovada | aplicada | rejeitada),
 *    confianca_metodo (select: deterministico_exato | revisao_manual | sugerido),
 *    responsavel_decisao (relation -> users),
 *    data_decisao (date),
 *    aplicado_em (date),
 *    aplicado_por_migracao (bool),
 *    hash_recuperacao (text)
 *
 * 6. Campos opcionais em pessoas e vagas para associar catálogo sem sobrescrever original:
 *    pessoas: cargo_catalogo (relation -> cargos), centro_custo_catalogo (relation -> centros_custo)
 *    vagas: cargo_catalogo (relation -> cargos)
 */

migrate(
  (app) => {
    // -------------------------------------------------------------
    // Helper para verificar ou criar coleções de forma limpa
    // -------------------------------------------------------------
    const rhOuDiretoria =
      "@request.auth.id != '' && (@request.auth.cargo_funcao = 'RH / Recrutador' || @request.auth.cargo_funcao = 'Diretoria / Executivo')"
    const apenasRh = "@request.auth.id != '' && @request.auth.cargo_funcao = 'RH / Recrutador'"

    const usersColId = '_pb_users_auth_'
    const empresasColId = app.findCollectionByNameOrId('empresas').id
    const areasColId = app.findCollectionByNameOrId('areas').id
    const pessoasColId = app.findCollectionByNameOrId('pessoas').id
    const documentosPessoaColId = app.findCollectionByNameOrId('documentos_pessoa').id

    // 1. Coleção competencias
    let competenciasCol
    try {
      competenciasCol = app.findCollectionByNameOrId('competencias')
    } catch (_) {
      competenciasCol = new Collection({
        name: 'competencias',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: apenasRh,
        updateRule: apenasRh,
        deleteRule: apenasRh,
        fields: [
          { name: 'nome', type: 'text', required: true },
          { name: 'codigo', type: 'text' },
          { name: 'descricao', type: 'text' },
          {
            name: 'categoria',
            type: 'select',
            required: true,
            values: ['Técnica', 'Comportamental', 'Liderança', 'Gestão & Negócios'],
            maxSelect: 1,
          },
          { name: 'criterios_proficiencia', type: 'json' },
          { name: 'ativo', type: 'bool' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_competencias_nome ON competencias (nome)',
          'CREATE INDEX idx_competencias_categoria ON competencias (categoria)',
          'CREATE INDEX idx_competencias_ativo ON competencias (ativo)',
        ],
      })
      app.save(competenciasCol)
      console.log('[1741500041] Coleção competencias criada com sucesso.')
    }
    const competenciasColId = competenciasCol.id

    // 2. Coleção cargos
    let cargosCol
    try {
      cargosCol = app.findCollectionByNameOrId('cargos')
    } catch (_) {
      cargosCol = new Collection({
        name: 'cargos',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: apenasRh,
        updateRule: apenasRh,
        deleteRule: apenasRh,
        fields: [
          { name: 'codigo', type: 'text', required: true },
          { name: 'nome', type: 'text', required: true },
          { name: 'descricao', type: 'text' },
          { name: 'ativo', type: 'bool' },
          {
            name: 'competencias_referencia',
            type: 'relation',
            collectionId: competenciasColId,
            maxSelect: 50,
          },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_cargos_codigo ON cargos (codigo)',
          'CREATE INDEX idx_cargos_nome ON cargos (nome)',
          'CREATE INDEX idx_cargos_ativo ON cargos (ativo)',
        ],
      })
      app.save(cargosCol)
      console.log('[1741500041] Coleção cargos criada com sucesso.')
    }
    const cargosColId = cargosCol.id

    // 3. Coleção centros_custo
    let centrosCustoCol
    try {
      centrosCustoCol = app.findCollectionByNameOrId('centros_custo')
    } catch (_) {
      centrosCustoCol = new Collection({
        name: 'centros_custo',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: apenasRh,
        updateRule: apenasRh,
        deleteRule: apenasRh,
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
          { name: 'vigencia_inicio', type: 'date' },
          { name: 'vigencia_fim', type: 'date' },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['Ativo', 'Inativo'],
            maxSelect: 1,
          },
          { name: 'identificador_externo', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE UNIQUE INDEX idx_centros_custo_empresa_codigo ON centros_custo (empresa, codigo)',
          'CREATE INDEX idx_centros_custo_status ON centros_custo (status)',
        ],
      })
      app.save(centrosCustoCol)
      console.log('[1741500041] Coleção centros_custo criada com sucesso.')
    }
    const centrosCustoColId = centrosCustoCol.id

    // 4. Coleção competencias_pessoas
    // Regras escopadas:
    // Leitura: RH / Diretoria vê tudo; Gestor vê pessoas da sua empresa/BU ou sob sua responsabilidade
    // Criação/Atualização: RH pode tudo; Gestor pode registrar e atualizar competências para pessoas da sua BU/sob sua gestão
    // Exclusão: RH
    const compPessoasRead = `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && pessoa.empresa = @request.auth.empresa || pessoa.gestor_responsavel = @request.auth.id))`
    const compPessoasWrite = `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && pessoa.empresa = @request.auth.empresa || pessoa.gestor_responsavel = @request.auth.id))`

    let compPessoasCol
    try {
      compPessoasCol = app.findCollectionByNameOrId('competencias_pessoas')
    } catch (_) {
      compPessoasCol = new Collection({
        name: 'competencias_pessoas',
        type: 'base',
        listRule: compPessoasRead,
        viewRule: compPessoasRead,
        createRule: compPessoasWrite,
        updateRule: compPessoasWrite,
        deleteRule: apenasRh,
        fields: [
          {
            name: 'pessoa',
            type: 'relation',
            required: true,
            collectionId: pessoasColId,
            maxSelect: 1,
          },
          {
            name: 'competencia',
            type: 'relation',
            required: true,
            collectionId: competenciasColId,
            maxSelect: 1,
          },
          {
            name: 'proficiencia',
            type: 'select',
            required: true,
            values: [
              'Nao_avaliada',
              'Nivel_1_Basico',
              'Nivel_2_Intermediario',
              'Nivel_3_Avancado',
              'Nivel_4_Especialista',
              'Nivel_5_Referencia',
            ],
            maxSelect: 1,
          },
          {
            name: 'fonte',
            type: 'select',
            required: true,
            values: ['autodeclarada', 'gestor', 'certificado', 'curriculo_extraido'],
            maxSelect: 1,
          },
          {
            name: 'status_validacao',
            type: 'select',
            required: true,
            values: ['pendente', 'validada', 'rejeitada'],
            maxSelect: 1,
          },
          {
            name: 'evidencia_documento',
            type: 'relation',
            collectionId: documentosPessoaColId,
            maxSelect: 1,
          },
          {
            name: 'responsavel_validacao',
            type: 'relation',
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'data_validacao', type: 'date' },
          { name: 'validade', type: 'date' },
          { name: 'observacoes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_comp_pes_pessoa ON competencias_pessoas (pessoa)',
          'CREATE INDEX idx_comp_pes_competencia ON competencias_pessoas (competencia)',
          'CREATE INDEX idx_comp_pes_validacao ON competencias_pessoas (status_validacao)',
        ],
      })
      app.save(compPessoasCol)
      console.log('[1741500041] Coleção competencias_pessoas criada com sucesso.')
    }

    // 5. Coleção mapeamento_normalizacao
    let mapNormCol
    try {
      mapNormCol = app.findCollectionByNameOrId('mapeamento_normalizacao')
    } catch (_) {
      mapNormCol = new Collection({
        name: 'mapeamento_normalizacao',
        type: 'base',
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: apenasRh,
        updateRule: apenasRh,
        deleteRule: apenasRh,
        fields: [
          {
            name: 'registro_origem_colecao',
            type: 'select',
            required: true,
            values: ['pessoas', 'vagas'],
            maxSelect: 1,
          },
          { name: 'registro_origem_id', type: 'text', required: true },
          { name: 'campo_origem', type: 'text', required: true },
          { name: 'texto_original', type: 'text', required: true },
          {
            name: 'empresa_contexto',
            type: 'relation',
            collectionId: empresasColId,
            maxSelect: 1,
          },
          {
            name: 'area_contexto',
            type: 'relation',
            collectionId: areasColId,
            maxSelect: 1,
          },
          {
            name: 'tipo_destino',
            type: 'select',
            required: true,
            values: ['cargo', 'centro_custo', 'area'],
            maxSelect: 1,
          },
          {
            name: 'cargo_destino',
            type: 'relation',
            collectionId: cargosColId,
            maxSelect: 1,
          },
          {
            name: 'centro_custo_destino',
            type: 'relation',
            collectionId: centrosCustoColId,
            maxSelect: 1,
          },
          {
            name: 'area_destino',
            type: 'relation',
            collectionId: areasColId,
            maxSelect: 1,
          },
          { name: 'justificativa', type: 'text' },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['pendente', 'aprovada', 'aplicada', 'rejeitada'],
            maxSelect: 1,
          },
          {
            name: 'confianca_metodo',
            type: 'select',
            required: true,
            values: ['deterministico_exato', 'revisao_manual', 'sugerido'],
            maxSelect: 1,
          },
          {
            name: 'responsavel_decisao',
            type: 'relation',
            collectionId: usersColId,
            maxSelect: 1,
          },
          { name: 'data_decisao', type: 'date' },
          { name: 'aplicado_em', type: 'date' },
          { name: 'aplicado_por_migracao', type: 'bool' },
          { name: 'hash_recuperacao', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_map_origem ON mapeamento_normalizacao (registro_origem_colecao, registro_origem_id)',
          'CREATE INDEX idx_map_status ON mapeamento_normalizacao (status)',
          'CREATE INDEX idx_map_tipo_destino ON mapeamento_normalizacao (tipo_destino)',
        ],
      })
      app.save(mapNormCol)
      console.log('[1741500041] Coleção mapeamento_normalizacao criada com sucesso.')
    }

    // 6. Campos em pessoas e vagas (aditivos opcionais sem quebrar nada)
    try {
      const pessoas = app.findCollectionByNameOrId('pessoas')
      let changedPessoas = false
      if (!pessoas.fields.getByName('cargo_catalogo')) {
        pessoas.fields.add(
          new RelationField({
            name: 'cargo_catalogo',
            collectionId: cargosColId,
            maxSelect: 1,
          }),
        )
        changedPessoas = true
      }
      if (!pessoas.fields.getByName('centro_custo_catalogo')) {
        pessoas.fields.add(
          new RelationField({
            name: 'centro_custo_catalogo',
            collectionId: centrosCustoColId,
            maxSelect: 1,
          }),
        )
        changedPessoas = true
      }
      if (changedPessoas) {
        app.save(pessoas)
        console.log(
          '[1741500041] Campos cargo_catalogo e centro_custo_catalogo adicionados em pessoas.',
        )
      }
    } catch (err) {
      console.log('[1741500041] Aviso ao estender pessoas:', err)
    }

    try {
      const vagas = app.findCollectionByNameOrId('vagas')
      let changedVagas = false
      if (!vagas.fields.getByName('cargo_catalogo')) {
        vagas.fields.add(
          new RelationField({
            name: 'cargo_catalogo',
            collectionId: cargosColId,
            maxSelect: 1,
          }),
        )
        changedVagas = true
      }
      if (changedVagas) {
        app.save(vagas)
        console.log('[1741500041] Campo cargo_catalogo adicionado em vagas.')
      }
    } catch (err) {
      console.log('[1741500041] Aviso ao estender vagas:', err)
    }
  },
  (app) => {
    // Reversão pontual segura caso necessário
    try {
      const colMap = app.findCollectionByNameOrId('mapeamento_normalizacao')
      app.delete(colMap)
    } catch (_) {}
    try {
      const colCompPes = app.findCollectionByNameOrId('competencias_pessoas')
      app.delete(colCompPes)
    } catch (_) {}
    try {
      const colCc = app.findCollectionByNameOrId('centros_custo')
      app.delete(colCc)
    } catch (_) {}
    try {
      const colCargos = app.findCollectionByNameOrId('cargos')
      app.delete(colCargos)
    } catch (_) {}
    try {
      const colComp = app.findCollectionByNameOrId('competencias')
      app.delete(colComp)
    } catch (_) {}
  },
)
