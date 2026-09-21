migrate(
  (app) => {
    // 1. Criar coleção 'empresas'
    // Holding e BUs (pessoas jurídicas do grupo econômico)
    const empresasCollection = new Collection({
      name: 'empresas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome_fantasia', type: 'text', required: true },
        { name: 'razao_social', type: 'text', required: true },
        { name: 'cnpj', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['Holding / Matriz', 'BU / Filial'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Operando', 'Inativa'],
          maxSelect: 1,
        },
        { name: 'cnae', type: 'text', required: false },
        { name: 'endereco_cidade', type: 'text', required: false },
        { name: 'endereco_uf', type: 'text', required: false },
        { name: 'telefone', type: 'text', required: false },
        { name: 'logo_cor', type: 'text', required: false }, // Ex: '#0D9488', '#2563EB', '#D97706'
        { name: 'sigla', type: 'text', required: false }, // Ex: 'EMP-01', 'BU-TECH'
        { name: 'ordem_exibicao', type: 'number', required: false },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE UNIQUE INDEX idx_empresas_cnpj ON empresas (cnpj)',
        'CREATE INDEX idx_empresas_tipo ON empresas (tipo)',
        'CREATE INDEX idx_empresas_status ON empresas (status)',
      ],
    })
    app.save(empresasCollection)

    const empresasCol = app.findCollectionByNameOrId('empresas')
    const empresasColId = empresasCol.id

    // Auto-relacionamento empresa_pai (Holding)
    empresasCol.fields.add(
      new RelationField({
        name: 'empresa_pai',
        type: 'relation',
        collectionId: empresasColId,
        cascadeDelete: false,
        maxSelect: 1,
        required: false,
      }),
    )
    app.save(empresasCol)

    // 2. Criar coleção 'areas'
    // Áreas/departamentos de cada empresa (Tecnologia, Comercial, Gente & Gestão, etc.)
    const areasCollection = new Collection({
      name: 'areas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true },
        {
          name: 'empresa',
          type: 'relation',
          collectionId: empresasColId,
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        { name: 'responsavel_nome', type: 'text', required: false },
        { name: 'descricao', type: 'text', required: false },
        { name: 'ativa', type: 'bool', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_areas_empresa ON areas (empresa)',
        'CREATE INDEX idx_areas_nome ON areas (nome)',
      ],
    })
    app.save(areasCollection)

    const areasColId = app.findCollectionByNameOrId('areas').id

    // 3. Atualizar coleção 'pessoas' com relações empresa e area
    const pessoasCol = app.findCollectionByNameOrId('pessoas')
    if (!pessoasCol.fields.getByName('empresa')) {
      pessoasCol.fields.add(
        new RelationField({
          name: 'empresa',
          type: 'relation',
          collectionId: empresasColId,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    if (!pessoasCol.fields.getByName('area')) {
      pessoasCol.fields.add(
        new RelationField({
          name: 'area',
          type: 'relation',
          collectionId: areasColId,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    app.save(pessoasCol)

    // 4. Atualizar coleção 'contratos' com relações empresa e area
    const contratosCol = app.findCollectionByNameOrId('contratos')
    if (!contratosCol.fields.getByName('empresa')) {
      contratosCol.fields.add(
        new RelationField({
          name: 'empresa',
          type: 'relation',
          collectionId: empresasColId,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    if (!contratosCol.fields.getByName('area')) {
      contratosCol.fields.add(
        new RelationField({
          name: 'area',
          type: 'relation',
          collectionId: areasColId,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
    }
    app.save(contratosCol)

    // 5. Semear dados do Grupo Econômico SouYess
    // 5.1 Semear Holding + 3 BUs
    // - SouYess Holding Participações S.A. (Holding / Matriz)
    // - SouYess Tecnologia & Software S.A. (BU / Filial)
    // - SouYess Vértice Mídia & Conteúdo Ltda. (BU / Filial)
    // - SouYess Operações & Logística Integrada Ltda. (BU / Filial)

    const empHolding = new Record(empresasCol)
    empHolding.set('nome_fantasia', 'SouYess Holding')
    empHolding.set('razao_social', 'SouYess Participações e Negócios S.A.')
    empHolding.set('cnpj', '11.222.333/0001-81')
    empHolding.set('tipo', 'Holding / Matriz')
    empHolding.set('status', 'Operando')
    empHolding.set('cnae', '6462-0/00: Holdings de instituições não financeiras')
    empHolding.set('endereco_cidade', 'São Paulo')
    empHolding.set('endereco_uf', 'SP')
    empHolding.set('telefone', '(11) 3214-5500')
    empHolding.set('logo_cor', '#0D9488') // Teal como EMP-01 do print
    empHolding.set('sigla', 'EMP-01')
    empHolding.set('ordem_exibicao', 1)
    empHolding.set(
      'observacoes',
      'Matriz e controladora do grupo econômico SouYess. Consolida governança corporativa e Gente & Gestão.',
    )
    app.save(empHolding)
    const holdingId = empHolding.id

    // BU 1: Tecnologia
    const empTech = new Record(empresasCol)
    empTech.set('nome_fantasia', 'SouYess Tecnologia')
    empTech.set('razao_social', 'SouYess Tecnologia e Gestão de Software S.A.')
    empTech.set('cnpj', '11.222.333/0002-62')
    empTech.set('tipo', 'BU / Filial')
    empTech.set('status', 'Operando')
    empTech.set('cnae', '6202-3/00: Desenvolvimento e licenciamento de programas customizáveis')
    empTech.set('endereco_cidade', 'Curitiba')
    empTech.set('endereco_uf', 'PR')
    empTech.set('telefone', '(41) 3088-9900')
    empTech.set('logo_cor', '#2563EB') // Azul como EMP-02
    empTech.set('sigla', 'EMP-02')
    empTech.set('ordem_exibicao', 2)
    empTech.set('empresa_pai', holdingId)
    empTech.set(
      'observacoes',
      'Unidade de desenvolvimento de produtos digitais, cloud architecture e SRE.',
    )
    app.save(empTech)
    const techId = empTech.id

    // BU 2: Mídia / Vértice
    const empMidia = new Record(empresasCol)
    empMidia.set('nome_fantasia', 'SouYess Vértice Mídia')
    empMidia.set('razao_social', 'SouYess Vértice Mídia e Estratégia de Conteúdo Ltda.')
    empMidia.set('cnpj', '11.222.333/0003-43')
    empMidia.set('tipo', 'BU / Filial')
    empMidia.set('status', 'Operando')
    empMidia.set('cnae', '7311-4/00: Agências de publicidade e employer branding')
    empMidia.set('endereco_cidade', 'São Paulo')
    empMidia.set('endereco_uf', 'SP')
    empMidia.set('telefone', '(11) 3450-8800')
    empMidia.set('logo_cor', '#E9530E') // Laranja SouYess
    empMidia.set('sigla', 'EMP-03')
    empMidia.set('ordem_exibicao', 3)
    empMidia.set('empresa_pai', holdingId)
    empMidia.set(
      'observacoes',
      'BU de atração de talentos, employer branding, vídeos e campanhas institucionais.',
    )
    app.save(empMidia)
    const midiaId = empMidia.id

    // BU 3: Operações
    const empOps = new Record(empresasCol)
    empOps.set('nome_fantasia', 'SouYess Operações')
    empOps.set('razao_social', 'SouYess Distribuição e Operações Corporativas Ltda.')
    empOps.set('cnpj', '11.222.333/0004-24')
    empOps.set('tipo', 'BU / Filial')
    empOps.set('status', 'Operando')
    empOps.set('cnae', '8211-3/00: Serviços combinados de escritório e apoio administrativo')
    empOps.set('endereco_cidade', 'Campinas')
    empOps.set('endereco_uf', 'SP')
    empOps.set('telefone', '(19) 3870-1200')
    empOps.set('logo_cor', '#D97706') // Amber / Amarelo ouro como EMP-03 do print
    empOps.set('sigla', 'EMP-04')
    empOps.set('ordem_exibicao', 4)
    empOps.set('empresa_pai', holdingId)
    empOps.set(
      'observacoes',
      'Unidade operacional, suporte e serviços corporativos compartilhados.',
    )
    app.save(empOps)
    const opsId = empOps.id

    // 5.2 Semear Áreas plausíveis por empresa
    const areasCol = app.findCollectionByNameOrId('areas')

    const criarArea = (nome, empresaId, resp, desc) => {
      const a = new Record(areasCol)
      a.set('nome', nome)
      a.set('empresa', empresaId)
      a.set('responsavel_nome', resp)
      a.set('descricao', desc)
      a.set('ativa', true)
      app.save(a)
      return a.id
    }

    // Áreas da Holding
    const areaGenteHolding = criarArea(
      'Gente & Gestão (People)',
      holdingId,
      'Douglas Severo',
      'Recrutamento, desenvolvimento, cultura e gestão unificada de pessoas do grupo',
    )
    const areaJuridicoHolding = criarArea(
      'Jurídico & Compliance',
      holdingId,
      'Mariana Siqueira',
      'Assessoria trabalhista, contratual, tributária e conformidade LGPD',
    )
    const areaFinanceiroHolding = criarArea(
      'Financeiro & Controladoria',
      holdingId,
      'Carlos Mendonça',
      'Consolidação fiscal, conciliação de NFs, fluxo de caixa e intercompany',
    )

    // Áreas de SouYess Tecnologia
    const areaEngSoftware = criarArea(
      'Engenharia de Software & Cloud',
      techId,
      'Carlos Mendonça',
      'Arquitetura em nuvem, microsserviços, DevOps, SRE e infraestrutura',
    )
    const areaProdutoTech = criarArea(
      'Produto & Design (UX/UI)',
      techId,
      'Mariana Siqueira',
      'Concepção de produtos digitais, fluxos de usuário e interface',
    )

    // Áreas de SouYess Vértice Mídia
    const areaMktMidia = criarArea(
      'Employer Branding & Conteúdo',
      midiaId,
      'Camila Vasconcelos',
      'Produção de vídeos institucionais, podcasts, marca empregadora e redes',
    )
    const areaComercialMidia = criarArea(
      'Comercial & Parcerias',
      midiaId,
      'Douglas Severo',
      'Novos negócios, propostas corporativas e relacionamento B2B',
    )

    // Áreas de SouYess Operações
    const areaOpsGeral = criarArea(
      'Operações & Facilities',
      opsId,
      'Carlos Mendonça',
      'Infraestrutura física, logística, compras corporativas e apoio administrativo',
    )

    // 5.3 Vincular as pessoas e contratos já existentes para não haver dado órfão
    // Renato Albuquerque -> SouYess Tecnologia (techId) / Engenharia de Software (areaEngSoftware)
    // Juliana Mendes Castro -> SouYess Holding (holdingId) / Gente & Gestão (areaGenteHolding)
    // Camila Vasconcelos -> SouYess Vértice Mídia (midiaId) / Employer Branding (areaMktMidia)
    // Dr. Eduardo Silveira -> SouYess Holding (holdingId) / Jurídico & Compliance (areaJuridicoHolding)

    try {
      const pessoasList = app.findRecordsByFilter('pessoas', '', '', 100, 0)
      for (const p of pessoasList) {
        const nome = p.getString('nome')
        if (nome.includes('Renato')) {
          p.set('empresa', techId)
          p.set('area', areaEngSoftware)
          app.save(p)
        } else if (nome.includes('Juliana')) {
          p.set('empresa', holdingId)
          p.set('area', areaGenteHolding)
          app.save(p)
        } else if (nome.includes('Camila')) {
          p.set('empresa', midiaId)
          p.set('area', areaMktMidia)
          app.save(p)
        } else if (nome.includes('Eduardo')) {
          p.set('empresa', holdingId)
          p.set('area', areaJuridicoHolding)
          app.save(p)
        }
      }
    } catch (eP) {
      console.log('Aviso ao atualizar pessoas com empresa/area:', eP)
    }

    // Atualizar contratos com as empresas e áreas correspondentes
    try {
      const contratosList = app.findRecordsByFilter('contratos', '', '', 100, 0)
      for (const c of contratosList) {
        const pessoaId = c.getString('pessoa')
        try {
          const p = app.findFirstRecordByData('pessoas', 'id', pessoaId)
          const pEmp = p.getString('empresa')
          const pArea = p.getString('area')
          if (pEmp) c.set('empresa', pEmp)
          if (pArea) c.set('area', pArea)
          app.save(c)
        } catch (_) {}
      }
    } catch (eC) {
      console.log('Aviso ao atualizar contratos com empresa/area:', eC)
    }
  },
  (app) => {
    try {
      const contratosCol = app.findCollectionByNameOrId('contratos')
      if (contratosCol.fields.getByName('area')) contratosCol.fields.removeByName('area')
      if (contratosCol.fields.getByName('empresa')) contratosCol.fields.removeByName('empresa')
      app.save(contratosCol)
    } catch (_) {}

    try {
      const pessoasCol = app.findCollectionByNameOrId('pessoas')
      if (pessoasCol.fields.getByName('area')) pessoasCol.fields.removeByName('area')
      if (pessoasCol.fields.getByName('empresa')) pessoasCol.fields.removeByName('empresa')
      app.save(pessoasCol)
    } catch (_) {}

    try {
      const areasCol = app.findCollectionByNameOrId('areas')
      app.delete(areasCol)
    } catch (_) {}

    try {
      const empresasCol = app.findCollectionByNameOrId('empresas')
      app.delete(empresasCol)
    } catch (_) {}
  },
)
