migrate(
  (app) => {
    // 1. Obter IDs das coleções relacionadas
    const usersColId = '_pb_users_auth_'
    let prestadoresColId = ''
    let candidatosColId = ''
    let rotinasColId = ''

    try {
      prestadoresColId = app.findCollectionByNameOrId('prestadores_pj').id
    } catch (_) {}

    try {
      candidatosColId = app.findCollectionByNameOrId('candidatos').id
    } catch (_) {}

    try {
      rotinasColId = app.findCollectionByNameOrId('rotinas_integracao').id
    } catch (_) {}

    // 2. Criar coleção 'pessoas' (Cadastro Unificado de Pessoas CLT / PJ)
    const pessoasFields = [
      { name: 'nome', type: 'text', required: true },
      { name: 'tipo_pessoa', type: 'select', required: true, values: ['PF', 'PJ'], maxSelect: 1 },
      { name: 'modalidade', type: 'select', required: true, values: ['CLT', 'PJ'], maxSelect: 1 },
      { name: 'cpf_cnpj', type: 'text', required: false },
      { name: 'email', type: 'email', required: false },
      { name: 'telefone', type: 'text', required: false },
      { name: 'cargo_funcao', type: 'text', required: true },
      { name: 'departamento', type: 'text', required: false },
      { name: 'centro_custo', type: 'text', required: false },
      {
        name: 'gestor_responsavel',
        type: 'relation',
        collectionId: usersColId,
        cascadeDelete: false,
        maxSelect: 1,
        required: false,
      },
      { name: 'gestor_nome', type: 'text', required: false },
      { name: 'data_inicio', type: 'date', required: false },
      { name: 'data_fim', type: 'date', required: false },
      { name: 'data_renovacao', type: 'date', required: false },
      {
        name: 'situacao_contrato',
        type: 'select',
        required: true,
        values: ['Vigente', 'Em integração', 'Encerrado', 'Pausado'],
        maxSelect: 1,
      },
      { name: 'valor_contratado', type: 'number', required: false },
      { name: 'horas_mensais_base', type: 'number', required: false }, // Padrão 160h
      { name: 'valor_hora', type: 'number', required: false },
      { name: 'duracao_meses', type: 'number', required: false },
      {
        name: 'prazo_tipo',
        type: 'select',
        values: ['Indeterminado', 'Determinado', 'Projeto Especifico'],
        maxSelect: 1,
        required: false,
      },
      { name: 'percentual_integracao', type: 'number', required: false },
      { name: 'observacoes', type: 'text', required: false },
      { name: 'origem_importacao', type: 'text', required: false }, // Ex: 'prestador_pj:id', 'candidato:id', 'rotina:id'
      { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
      { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
    ]

    if (prestadoresColId) {
      pessoasFields.push({
        name: 'prestador_origem',
        type: 'relation',
        collectionId: prestadoresColId,
        cascadeDelete: false,
        maxSelect: 1,
        required: false,
      })
    }

    if (candidatosColId) {
      pessoasFields.push({
        name: 'candidato_origem',
        type: 'relation',
        collectionId: candidatosColId,
        cascadeDelete: false,
        maxSelect: 1,
        required: false,
      })
    }

    if (rotinasColId) {
      pessoasFields.push({
        name: 'rotina_origem',
        type: 'relation',
        collectionId: rotinasColId,
        cascadeDelete: false,
        maxSelect: 1,
        required: false,
      })
    }

    const pessoasCollection = new Collection({
      name: 'pessoas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: pessoasFields,
      indexes: [],
    })

    app.save(pessoasCollection)
    const pessoasCreatedId = app.findCollectionByNameOrId('pessoas').id

    // 3. Criar coleção 'documentos_pessoa' (Cofre de Documentos da Pessoa com upload real)
    const docsCollection = new Collection({
      name: 'documentos_pessoa',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'pessoa',
          type: 'relation',
          collectionId: pessoasCreatedId,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        { name: 'nome', type: 'text', required: true },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'Contrato de Prestação / Admissão',
            'Contrato Social / Ato Constitutivo',
            'Certidão Fiscal (CND / Federal / Estadual)',
            'Termo Assinado',
            'Documentação Admissional (RG / CPF / CTPS)',
            'Certificado / Comprovante',
            'Outro',
          ],
          maxSelect: 1,
        },
        {
          name: 'arquivo',
          type: 'file',
          required: true,
          maxSelect: 1,
          maxSize: 10485760, // 10MB
          mimeTypes: [
            'application/pdf',
            'image/jpeg',
            'image/png',
            'image/webp',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          ],
        },
        { name: 'data_emissao', type: 'date', required: false },
        { name: 'data_vencimento', type: 'date', required: false },
        { name: 'tamanho_bytes', type: 'number', required: false },
        { name: 'enviado_por_nome', type: 'text', required: false },
        {
          name: 'enviado_por_usuario',
          type: 'relation',
          collectionId: usersColId,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        },
        { name: 'observacoes', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_docspessoa_pessoa ON documentos_pessoa (pessoa)',
        'CREATE INDEX idx_docspessoa_tipo ON documentos_pessoa (tipo)',
        'CREATE INDEX idx_docspessoa_vencimento ON documentos_pessoa (data_vencimento)',
      ],
    })

    app.save(docsCollection)

    // 4. Seed Inicial Inteligente: povoar 'pessoas' com os registros já existentes no ecossistema SouYess
    // - Renato Albuquerque (Nexus Cloud - PJ)
    // - Juliana Mendes Castro (CLT - Aprovada/Integração)
    // - Camila Vasconcelos (Vértice Mídia - PJ)
    // - Dr. Eduardo Silveira (Silveira Advocacia - PJ)
    try {
      const pessoasCol = app.findCollectionByNameOrId('pessoas')

      // 4.1 Renato Albuquerque (Nexus Cloud)
      let nexusPjId = ''
      try {
        nexusPjId = app.findFirstRecordByData('prestadores_pj', 'cnpj', '28.491.503/0001-82').id
      } catch (_) {}

      let renatoRotinaId = ''
      try {
        renatoRotinaId = app.findFirstRecordByData(
          'rotinas_integracao',
          'documento_identificacao',
          '28.491.503/0001-82',
        ).id
      } catch (_) {}

      const pRenato = new Record(pessoasCol)
      pRenato.set('nome', 'Renato Albuquerque')
      pRenato.set('tipo_pessoa', 'PJ')
      pRenato.set('modalidade', 'PJ')
      pRenato.set('cpf_cnpj', '28.491.503/0001-82')
      pRenato.set('email', 'renato.albuquerque@nexuscloud.tech')
      pRenato.set('telefone', '(11) 98123-4567')
      pRenato.set('cargo_funcao', 'Especialista em Arquitetura Cloud & DevOps')
      pRenato.set('departamento', 'Engenharia de Software')
      pRenato.set('centro_custo', 'CC-ENG-CLOUD')
      pRenato.set('gestor_nome', 'Carlos Mendonça')
      try {
        const uGestor = app.findAuthRecordByEmail('_pb_users_auth_', 'gestor@empresa.com')
        pRenato.set('gestor_responsavel', uGestor.id)
      } catch (_) {}
      pRenato.set('data_inicio', '2025-01-15 00:00:00.000Z')
      pRenato.set('data_fim', '2026-12-31 00:00:00.000Z')
      pRenato.set('data_renovacao', '2026-12-31 00:00:00.000Z')
      pRenato.set('situacao_contrato', 'Vigente')
      pRenato.set('valor_contratado', 24500)
      pRenato.set('horas_mensais_base', 160)
      pRenato.set('valor_hora', 153.13)
      pRenato.set('duracao_meses', 12)
      pRenato.set('prazo_tipo', 'Determinado')
      pRenato.set('percentual_integracao', 68)
      pRenato.set(
        'observacoes',
        'Prestador PJ consolidado via Nexus Cloud Soluções em Tecnologia Ltda. Contrato CT-PJ-2025-014.',
      )
      if (nexusPjId) pRenato.set('prestador_origem', nexusPjId)
      if (renatoRotinaId) pRenato.set('rotina_origem', renatoRotinaId)
      pRenato.set('origem_importacao', 'prestador_pj:' + nexusPjId)
      app.save(pRenato)

      // 4.2 Juliana Mendes Castro (CLT)
      let julianaCandId = ''
      try {
        julianaCandId = app.findFirstRecordByData(
          'candidatos',
          'email',
          'juliana.mendes@exemplo.com',
        ).id
      } catch (_) {}

      let julianaRotinaId = ''
      try {
        julianaRotinaId = app.findFirstRecordByData(
          'rotinas_integracao',
          'email_contato',
          'juliana.mendes@exemplo.com',
        ).id
      } catch (_) {}

      const pJuliana = new Record(pessoasCol)
      pJuliana.set('nome', 'Juliana Mendes Castro')
      pJuliana.set('tipo_pessoa', 'PF')
      pJuliana.set('modalidade', 'CLT')
      pJuliana.set('cpf_cnpj', '412.890.318-72')
      pJuliana.set('email', 'juliana.mendes@exemplo.com')
      pJuliana.set('telefone', '(11) 98123-4567')
      pJuliana.set('cargo_funcao', 'Business Partner de Gente & Gestão (People)')
      pJuliana.set('departamento', 'Gente & Gestão')
      pJuliana.set('centro_custo', 'CC-PEOPLE-01')
      pJuliana.set('gestor_nome', 'Douglas Severo')
      try {
        const uRh = app.findAuthRecordByEmail('_pb_users_auth_', 'severo.douglas2@gmail.com')
        pJuliana.set('gestor_responsavel', uRh.id)
      } catch (_) {}
      pJuliana.set('data_inicio', '2026-10-06 00:00:00.000Z')
      pJuliana.set('situacao_contrato', 'Em integração')
      pJuliana.set('valor_contratado', 9500)
      pJuliana.set('horas_mensais_base', 160)
      pJuliana.set('valor_hora', 59.38)
      pJuliana.set('prazo_tipo', 'Indeterminado')
      pJuliana.set('percentual_integracao', 52)
      pJuliana.set(
        'observacoes',
        'Contratada via processo seletivo SouYess. Candidata aprovada e em plano de integração 30-60-90.',
      )
      if (julianaCandId) pJuliana.set('candidato_origem', julianaCandId)
      if (julianaRotinaId) pJuliana.set('rotina_origem', julianaRotinaId)
      pJuliana.set('origem_importacao', 'candidatos:' + julianaCandId)
      app.save(pJuliana)

      // 4.3 Camila Vasconcelos (Vértice Mídia - PJ)
      let verticePjId = ''
      try {
        verticePjId = app.findFirstRecordByData('prestadores_pj', 'cnpj', '34.819.204/0001-95').id
      } catch (_) {}

      const pCamila = new Record(pessoasCol)
      pCamila.set('nome', 'Camila Vasconcelos')
      pCamila.set('tipo_pessoa', 'PJ')
      pCamila.set('modalidade', 'PJ')
      pCamila.set('cpf_cnpj', '34.819.204/0001-95')
      pCamila.set('email', 'camila@verticemidia.com.br')
      pCamila.set('telefone', '(11) 97234-8899')
      pCamila.set('cargo_funcao', 'Head de Employer Branding & Campanhas')
      pCamila.set('departamento', 'Marketing & Talent Attraction')
      pCamila.set('centro_custo', 'CC-MKT-BRAND')
      pCamila.set('gestor_nome', 'Mariana Siqueira')
      try {
        const uMariana = app.findAuthRecordByEmail('_pb_users_auth_', 'gestora.produto@empresa.com')
        pCamila.set('gestor_responsavel', uMariana.id)
      } catch (_) {}
      pCamila.set('data_inicio', '2025-06-01 00:00:00.000Z')
      pCamila.set('data_fim', '2026-10-10 00:00:00.000Z')
      pCamila.set('data_renovacao', '2026-10-10 00:00:00.000Z')
      pCamila.set('situacao_contrato', 'Vigente')
      pCamila.set('valor_contratado', 14000)
      pCamila.set('horas_mensais_base', 160)
      pCamila.set('valor_hora', 87.5)
      pCamila.set('duracao_meses', 12)
      pCamila.set('prazo_tipo', 'Determinado')
      pCamila.set('percentual_integracao', 100)
      pCamila.set(
        'observacoes',
        'Vértice Estratégia de Conteúdo e Mídia S/S. Contrato CT-PJ-2025-089 em processo de aditivo ADIT-2026-01 e ADIT-2026-02.',
      )
      if (verticePjId) pCamila.set('prestador_origem', verticePjId)
      pCamila.set('origem_importacao', 'prestador_pj:' + verticePjId)
      app.save(pCamila)

      // 4.4 Dr. Eduardo Silveira (Silveira Advocacia - PJ)
      let silveiraPjId = ''
      try {
        silveiraPjId = app.findFirstRecordByData('prestadores_pj', 'cnpj', '19.340.892/0001-30').id
      } catch (_) {}

      const pEduardo = new Record(pessoasCol)
      pEduardo.set('nome', 'Dr. Eduardo Silveira')
      pEduardo.set('tipo_pessoa', 'PJ')
      pEduardo.set('modalidade', 'PJ')
      pEduardo.set('cpf_cnpj', '19.340.892/0001-30')
      pEduardo.set('email', 'eduardo@silveiraadvocacia.com.br')
      pEduardo.set('telefone', '(11) 3254-9000')
      pEduardo.set('cargo_funcao', 'Consultor Jurídico Trabalhista & LGPD')
      pEduardo.set('departamento', 'Jurídico & Compliance')
      pEduardo.set('centro_custo', 'CC-JUR-01')
      pEduardo.set('gestor_nome', 'Mariana Siqueira')
      try {
        const uMariana = app.findAuthRecordByEmail('_pb_users_auth_', 'gestora.produto@empresa.com')
        pEduardo.set('gestor_responsavel', uMariana.id)
      } catch (_) {}
      pEduardo.set('data_inicio', '2024-03-10 00:00:00.000Z')
      pEduardo.set('data_fim', '2028-03-09 00:00:00.000Z')
      pEduardo.set('data_renovacao', '2028-03-09 00:00:00.000Z')
      pEduardo.set('situacao_contrato', 'Vigente')
      pEduardo.set('valor_contratado', 11200)
      pEduardo.set('horas_mensais_base', 160)
      pEduardo.set('valor_hora', 70.0)
      pEduardo.set('duracao_meses', 36)
      pEduardo.set('prazo_tipo', 'Determinado')
      pEduardo.set('percentual_integracao', 100)
      pEduardo.set(
        'observacoes',
        'Silveira, Prado & Associados Sociedade de Advogados. Contrato CT-PJ-2024-003.',
      )
      if (silveiraPjId) pEduardo.set('prestador_origem', silveiraPjId)
      pEduardo.set('origem_importacao', 'prestador_pj:' + silveiraPjId)
      app.save(pEduardo)
    } catch (err) {
      console.log('Aviso ao criar seeds de pessoas:', err)
    }
  },
  (app) => {
    try {
      const docsCol = app.findCollectionByNameOrId('documentos_pessoa')
      app.delete(docsCol)
    } catch (_) {}
    try {
      const pessoasCol = app.findCollectionByNameOrId('pessoas')
      app.delete(pessoasCol)
    } catch (_) {}
  },
)
