migrate(
  (app) => {
    const usersColId = '_pb_users_auth_'
    let pessoasColId = ''
    let prestadoresColId = ''
    let contratosPjColId = ''

    try {
      pessoasColId = app.findCollectionByNameOrId('pessoas').id
    } catch (_) {}

    try {
      prestadoresColId = app.findCollectionByNameOrId('prestadores_pj').id
    } catch (_) {}

    try {
      contratosPjColId = app.findCollectionByNameOrId('contratos_pj').id
    } catch (_) {}

    // 1. Coleção 'contratos' (Gestão Centralizada de Contratos PJ e CLT)
    // Permite que qualquer contrato (prestação PJ, trabalho CLT, experiência CLT) viva de forma centralizada e versionada
    const contratosCollection = new Collection({
      name: 'contratos',
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
          collectionId: pessoasColId,
          cascadeDelete: false,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'prestador_pj',
          type: 'relation',
          collectionId: prestadoresColId,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        },
        {
          name: 'contrato_pj_legado',
          type: 'relation',
          collectionId: contratosPjColId,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        },
        { name: 'codigo_contrato', type: 'text', required: true, max: 60 },
        { name: 'titulo', type: 'text', required: true, max: 200 },
        {
          name: 'modalidade',
          type: 'select',
          required: true,
          values: ['PJ', 'CLT'],
          maxSelect: 1,
        },
        {
          name: 'tipo_modelo',
          type: 'select',
          required: true,
          values: [
            'PJ_PRESTACAO_SERVICOS',
            'PJ_HORISTA',
            'CLT_EXPERIENCIA',
            'CLT_INDETERMINADO',
            'CLT_TELETRABALHO',
            'OUTRO',
          ],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: [
            'Minuta',
            'Em assinatura',
            'Vigente',
            'Vencendo',
            'Renovado',
            'Encerrado',
            'Rescindido',
          ],
          maxSelect: 1,
        },
        { name: 'data_inicio', type: 'date', required: true },
        { name: 'data_fim', type: 'date', required: false },
        { name: 'data_renovacao_alerta', type: 'date', required: false }, // Janela 60d para PJ ou 15d para CLT exp
        { name: 'dias_antecedencia_alerta', type: 'number', required: false }, // Padrão 60 para PJ, 15 ou 30 para CLT
        { name: 'valor_mensal', type: 'number', required: false },
        { name: 'valor_hora', type: 'number', required: false },
        { name: 'horas_mensais_base', type: 'number', required: false },
        {
          name: 'prazo_tipo',
          type: 'select',
          values: ['Indeterminado', 'Determinado', 'Experiencia 45+45', 'Projeto Especifico'],
          maxSelect: 1,
          required: false,
        },
        { name: 'departamento', type: 'text', required: false },
        { name: 'centro_custo', type: 'text', required: false },
        { name: 'cargo_funcao', type: 'text', required: false },
        {
          name: 'gestor_responsavel',
          type: 'relation',
          collectionId: usersColId,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        },
        { name: 'gestor_nome', type: 'text', required: false },
        { name: 'versao_atual', type: 'number', required: false }, // 1, 2, 3...
        { name: 'conteudo_atual_md', type: 'text', required: false },
        {
          name: 'arquivo_vigente',
          type: 'file',
          maxSelect: 1,
          maxSize: 15728640,
          mimeTypes: ['application/pdf'],
          required: false,
        },
        {
          name: 'dados_preenchimento',
          type: 'json',
          required: false,
        },
        { name: 'clausulas_especiais', type: 'text', required: false },
        { name: 'motivo_revisao', type: 'text', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ct_unif_pessoa ON contratos (pessoa)',
        'CREATE INDEX idx_ct_unif_status ON contratos (status)',
        'CREATE INDEX idx_ct_unif_modalidade ON contratos (modalidade)',
        'CREATE INDEX idx_ct_unif_codigo ON contratos (codigo_contrato)',
        'CREATE INDEX idx_ct_unif_data_fim ON contratos (data_fim)',
        'CREATE INDEX idx_ct_unif_renovacao ON contratos (data_renovacao_alerta)',
      ],
    })

    app.save(contratosCollection)
    const contratosCreatedId = app.findCollectionByNameOrId('contratos').id

    // 2. Coleção 'contrato_versoes' (Versionamento Formal do Contrato)
    // Armazena cada versão (v1, v2...) com o conteúdo integral, quem gerou, quando, motivo da mudança e arquivo PDF
    const versoesCollection = new Collection({
      name: 'contrato_versoes',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'contrato',
          type: 'relation',
          collectionId: contratosCreatedId,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        { name: 'numero_versao', type: 'number', required: true }, // 1, 2, 3...
        { name: 'rotulo_versao', type: 'text', required: true }, // ex: "v1.0 - Emissão Inicial", "v2.0 - Reajuste Salarial"
        { name: 'conteudo_texto', type: 'text', required: true }, // Conteúdo completo do contrato
        { name: 'resumo_mudancas', type: 'text', required: false },
        {
          name: 'arquivo_versao',
          type: 'file',
          maxSelect: 1,
          maxSize: 15728640,
          mimeTypes: ['application/pdf'],
          required: false,
        },
        { name: 'criado_por_nome', type: 'text', required: false },
        {
          name: 'criado_por_usuario',
          type: 'relation',
          collectionId: usersColId,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        },
        {
          name: 'status_versao',
          type: 'select',
          required: true,
          values: ['Minuta', 'Aguardando Assinaturas', 'Assinada', 'Substituída', 'Cancelada'],
          maxSelect: 1,
        },
        { name: 'hash_conteudo', type: 'text', required: false }, // SHA-256 do texto para rastreabilidade
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_versoes_contrato ON contrato_versoes (contrato)',
        'CREATE INDEX idx_versoes_num ON contrato_versoes (contrato, numero_versao)',
      ],
    })

    app.save(versoesCollection)
    const versoesCreatedId = app.findCollectionByNameOrId('contrato_versoes').id

    // 3. Coleção 'contrato_assinaturas' (Trilha de Auditoria e Assinatura Interna)
    // Não depende de Docusign/Clicksign nem ICP-Brasil externo.
    // Registra envio interno, aceite com carimbo de tempo, IP, geolocalização e hash imutável.
    const assinaturasCollection = new Collection({
      name: 'contrato_assinaturas',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'contrato',
          type: 'relation',
          collectionId: contratosCreatedId,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'versao',
          type: 'relation',
          collectionId: versoesCreatedId,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'papel_signatario',
          type: 'select',
          required: true,
          values: ['Contratado', 'Representante Empresa', 'Testemunha 1', 'Testemunha 2', 'Gestor'],
          maxSelect: 1,
        },
        { name: 'nome_signatario', type: 'text', required: true },
        { name: 'email_signatario', type: 'email', required: true },
        { name: 'documento_identificacao', type: 'text', required: false }, // CPF/CNPJ
        {
          name: 'status_assinatura',
          type: 'select',
          required: true,
          values: ['Pendente', 'Assinado', 'Recusado'],
          maxSelect: 1,
        },
        { name: 'data_solicitacao', type: 'date', required: false },
        { name: 'data_assinatura', type: 'date', required: false },
        { name: 'ip_assinatura', type: 'text', required: false },
        { name: 'user_agent', type: 'text', required: false },
        { name: 'hash_documento', type: 'text', required: false },
        { name: 'manifestacao_aceite', type: 'text', required: false },
        { name: 'motivo_recusa', type: 'text', required: false },
        { name: 'metadados_auditoria', type: 'json', required: false },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ass_contrato ON contrato_assinaturas (contrato)',
        'CREATE INDEX idx_ass_versao ON contrato_assinaturas (versao)',
        'CREATE INDEX idx_ass_status ON contrato_assinaturas (status_assinatura)',
      ],
    })

    app.save(assinaturasCollection)

    // 4. Seed Inicial dos Contratos no novo ecossistema unificado a partir dos dados já existentes:
    // - Renato Albuquerque (Nexus Cloud) -> CT-PJ-2025-014 (PJ)
    // - Camila Vasconcelos (Vértice Mídia) -> CT-PJ-2025-089 (PJ, Vencendo)
    // - Dr. Eduardo Silveira -> CT-PJ-2024-003 (PJ)
    // - Juliana Mendes Castro -> CT-CLT-2026-001 (CLT, Experiência 45+45)
    try {
      const contratosCol = app.findCollectionByNameOrId('contratos')
      const versoesCol = app.findCollectionByNameOrId('contrato_versoes')
      const assinaturasCol = app.findCollectionByNameOrId('contrato_assinaturas')

      const pessoasCol = app.findCollectionByNameOrId('pessoas')
      const prestadoresCol = app.findCollectionByNameOrId('prestadores_pj')

      // Buscar pessoas
      let pRenato = null
      let pJuliana = null
      let pCamila = null
      let pEduardo = null

      try {
        pRenato = app.findFirstRecordByData('pessoas', 'cpf_cnpj', '28.491.503/0001-82')
      } catch (_) {}
      try {
        pJuliana = app.findFirstRecordByData('pessoas', 'cpf_cnpj', '412.890.318-72')
      } catch (_) {}
      try {
        pCamila = app.findFirstRecordByData('pessoas', 'cpf_cnpj', '34.819.204/0001-95')
      } catch (_) {}
      try {
        pEduardo = app.findFirstRecordByData('pessoas', 'cpf_cnpj', '19.340.892/0001-30')
      } catch (_) {}

      let nexusPrest = null
      let verticePrest = null
      let silveiraPrest = null

      try {
        nexusPrest = app.findFirstRecordByData('prestadores_pj', 'cnpj', '28.491.503/0001-82')
      } catch (_) {}
      try {
        verticePrest = app.findFirstRecordByData('prestadores_pj', 'cnpj', '34.819.204/0001-95')
      } catch (_) {}
      try {
        silveiraPrest = app.findFirstRecordByData('prestadores_pj', 'cnpj', '19.340.892/0001-30')
      } catch (_) {}

      let ctNexusPj = null
      let ctVerticePj = null
      let ctSilveiraPj = null

      try {
        ctNexusPj = app.findFirstRecordByData('contratos_pj', 'numero_contrato', 'CT-PJ-2025-014')
      } catch (_) {}
      try {
        ctVerticePj = app.findFirstRecordByData('contratos_pj', 'numero_contrato', 'CT-PJ-2025-089')
      } catch (_) {}
      try {
        ctSilveiraPj = app.findFirstRecordByData(
          'contratos_pj',
          'numero_contrato',
          'CT-PJ-2024-003',
        )
      } catch (_) {}

      // 4.1 Contrato PJ Renato Albuquerque (Nexus Cloud) - Vigente
      if (pRenato) {
        const c1 = new Record(contratosCol)
        c1.set('pessoa', pRenato.id)
        if (nexusPrest) c1.set('prestador_pj', nexusPrest.id)
        if (ctNexusPj) c1.set('contrato_pj_legado', ctNexusPj.id)
        c1.set('codigo_contrato', 'CT-PJ-2025-014')
        c1.set('titulo', 'Contrato de Prestação de Serviços de Arquitetura Cloud & SRE')
        c1.set('modalidade', 'PJ')
        c1.set('tipo_modelo', 'PJ_PRESTACAO_SERVICOS')
        c1.set('status', 'Vigente')
        c1.set('data_inicio', '2025-01-15 00:00:00.000Z')
        c1.set('data_fim', '2026-12-31 00:00:00.000Z')
        c1.set('data_renovacao_alerta', '2026-11-01 00:00:00.000Z') // 60 dias antes
        c1.set('dias_antecedencia_alerta', 60)
        c1.set('valor_mensal', 24500)
        c1.set('valor_hora', 153.13)
        c1.set('horas_mensais_base', 160)
        c1.set('prazo_tipo', 'Determinado')
        c1.set('departamento', 'Engenharia de Software')
        c1.set('centro_custo', 'CC-ENG-CLOUD')
        c1.set('cargo_funcao', 'Especialista em Arquitetura Cloud & DevOps')
        c1.set('gestor_nome', 'Carlos Mendonça')
        c1.set('versao_atual', 2)
        c1.set(
          'clausulas_especiais',
          'SLA 99.9% de uptime em ambientes produtivos, plantão técnico 24x7 e resposta a incidentes P1 em até 15 minutos.',
        )
        app.save(c1)

        // Versão 1
        const v1 = new Record(versoesCol)
        v1.set('contrato', c1.id)
        v1.set('numero_versao', 1)
        v1.set('rotulo_versao', 'v1.0 — Minuta Inicial e Assinatura')
        v1.set(
          'conteudo_texto',
          'INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS TÉCNICOS ESPECIALIZADOS\n\nCONTRATANTE: SouYess Tecnologia e Serviços S/A\nCONTRATADA: Nexus Cloud Soluções em Tecnologia Ltda\nREPRESENTANTE: Renato Albuquerque\nVALOR INICIAL: R$ 20.000,00/mês.\nBASE: 160 horas mensais.\nVIGÊNCIA: 15/01/2025 a 31/12/2025.',
        )
        v1.set('resumo_mudancas', 'Emissão e formalização da parceria inicial.')
        v1.set('criado_por_nome', 'Douglas Severo (Gente & Gestão)')
        v1.set('status_versao', 'Substituída')
        v1.set('hash_conteudo', 'e2d19f8a37b1c4091a92d8f9930bfa7d120a112233445566778899aabbccdde1')
        app.save(v1)

        // Versão 2
        const v2 = new Record(versoesCol)
        v2.set('contrato', c1.id)
        v2.set('numero_versao', 2)
        v2.set('rotulo_versao', 'v2.0 — Reajuste e Prorrogação até Dez/2026')
        v2.set(
          'conteudo_texto',
          'INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS TÉCNICOS ESPECIALIZADOS — CONSOLIDADO V2\n\nCONTRATANTE: SouYess Tecnologia e Serviços S/A\nCONTRATADA: Nexus Cloud Soluções em Tecnologia Ltda\nREPRESENTANTE: Renato Albuquerque\nVALOR REAJUSTADO: R$ 24.500,00/mês (Base R$ 153,13/h - 160h).\nVIGÊNCIA ATUAL: Até 31/12/2026.\nSLA: 99.9% de disponibilidade.',
        )
        v2.set(
          'resumo_mudancas',
          'Aplicação do Aditivo ADIT-2025-02 prorrogando até 31/12/2026 e consolidando valor de R$ 24.500/mês.',
        )
        v2.set('criado_por_nome', 'Douglas Severo (Gente & Gestão)')
        v2.set('status_versao', 'Assinada')
        v2.set('hash_conteudo', 'a5c71e8432a9bfd41093110298ea5a8bc33445566778899aabbccddeeff00112')
        app.save(v2)

        // Trilha de assinatura v2
        const a1 = new Record(assinaturasCol)
        a1.set('contrato', c1.id)
        a1.set('versao', v2.id)
        a1.set('papel_signatario', 'Contratado')
        a1.set('nome_signatario', 'Renato Albuquerque')
        a1.set('email_signatario', 'renato.albuquerque@nexuscloud.tech')
        a1.set('documento_identificacao', '28.491.503/0001-82')
        a1.set('status_assinatura', 'Assinado')
        a1.set('data_solicitacao', '2025-11-19 14:00:00.000Z')
        a1.set('data_assinatura', '2025-11-20 10:24:18.000Z')
        a1.set('ip_assinatura', '189.120.45.19')
        a1.set('user_agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
        a1.set('hash_documento', 'a5c71e8432a9bfd41093110298ea5a8bc33445566778899aabbccddeeff00112')
        a1.set(
          'manifestacao_aceite',
          'Concordo integralmente com os termos e valores pactuados na versão v2.0.',
        )
        app.save(a1)

        const a2 = new Record(assinaturasCol)
        a2.set('contrato', c1.id)
        a2.set('versao', v2.id)
        a2.set('papel_signatario', 'Representante Empresa')
        a2.set('nome_signatario', 'Mariana Siqueira (Head de Produto)')
        a2.set('email_signatario', 'gestora.produto@empresa.com')
        a2.set('documento_identificacao', '12.345.678/0001-90')
        a2.set('status_assinatura', 'Assinado')
        a2.set('data_solicitacao', '2025-11-19 14:00:00.000Z')
        a2.set('data_assinatura', '2025-11-20 11:05:42.000Z')
        a2.set('ip_assinatura', '177.89.201.5')
        a2.set('user_agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
        a2.set('hash_documento', 'a5c71e8432a9bfd41093110298ea5a8bc33445566778899aabbccddeeff00112')
        a2.set(
          'manifestacao_aceite',
          'Aprovo a prorrogação e reajuste nos termos do comitê financeiro.',
        )
        app.save(a2)
      }

      // 4.2 Contrato PJ Camila Vasconcelos (Vértice Mídia) - Vencendo / Em Renovação
      if (pCamila) {
        const c2 = new Record(contratosCol)
        c2.set('pessoa', pCamila.id)
        if (verticePrest) c2.set('prestador_pj', verticePrest.id)
        if (ctVerticePj) c2.set('contrato_pj_legado', ctVerticePj.id)
        c2.set('codigo_contrato', 'CT-PJ-2025-089')
        c2.set('titulo', 'Gestão de Employer Branding & Campanhas de Talent Acquisition')
        c2.set('modalidade', 'PJ')
        c2.set('tipo_modelo', 'PJ_PRESTACAO_SERVICOS')
        c2.set('status', 'Vencendo')
        c2.set('data_inicio', '2025-06-01 00:00:00.000Z')
        c2.set('data_fim', '2026-10-10 00:00:00.000Z') // Vence em breve!
        c2.set('data_renovacao_alerta', '2026-08-11 00:00:00.000Z')
        c2.set('dias_antecedencia_alerta', 60)
        c2.set('valor_mensal', 14000)
        c2.set('valor_hora', 87.5)
        c2.set('horas_mensais_base', 160)
        c2.set('prazo_tipo', 'Determinado')
        c2.set('departamento', 'Marketing & Talent Attraction')
        c2.set('centro_custo', 'CC-MKT-BRAND')
        c2.set('cargo_funcao', 'Head de Employer Branding & Campanhas')
        c2.set('gestor_nome', 'Mariana Siqueira')
        c2.set('versao_atual', 1)
        c2.set(
          'clausulas_especiais',
          'Entrega mensal de 4 cases em vídeo, gestão de campanhas patrocinadas no LinkedIn e consultoria quinzenal de marca empregadora.',
        )
        app.save(c2)

        const v1 = new Record(versoesCol)
        v1.set('contrato', c2.id)
        v1.set('numero_versao', 1)
        v1.set('rotulo_versao', 'v1.0 — Minuta Original Vértice')
        v1.set(
          'conteudo_texto',
          'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE BRANDING E CONTEÚDO\n\nCONTRATANTE: SouYess Tecnologia S/A\nCONTRATADA: Vértice Estratégia de Conteúdo e Mídia S/S\nRESPONSÁVEL: Camila Vasconcelos\nVALOR: R$ 14.000,00/mês.\nVIGÊNCIA: 01/06/2025 a 10/10/2026.',
        )
        v1.set('resumo_mudancas', 'Versão original pactuada.')
        v1.set('criado_por_nome', 'Douglas Severo')
        v1.set('status_versao', 'Assinada')
        v1.set('hash_conteudo', 'b4f8812c6a9d123e4567890123456789abcdef0123456789abcdef0123456789')
        app.save(v1)

        // Versão 2 em minuta aguardando assinatura (ADIT-2026-01)
        const v2 = new Record(versoesCol)
        v2.set('contrato', c2.id)
        v2.set('numero_versao', 2)
        v2.set('rotulo_versao', 'v2.0 — Renovação por 12 meses + Podcasts')
        v2.set(
          'conteudo_texto',
          'CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE BRANDING E CONTEÚDO — ADITIVO V2\n\nCONTRATANTE: SouYess Tecnologia S/A\nCONTRATADA: Vértice Estratégia de Conteúdo e Mídia S/S\nNOVO VALOR: R$ 16.500,00/mês.\nNOVA VIGÊNCIA: Até 10/10/2027.\nNOVO ESCOPO: Inclusão de gravação de podcasts internos.',
        )
        v2.set('resumo_mudancas', 'Proposta de renovação com ampliação de escopo.')
        v2.set('criado_por_nome', 'Douglas Severo')
        v2.set('status_versao', 'Aguardando Assinaturas')
        v2.set('hash_conteudo', 'c99182a44b1c2d3e4f5061728394a5b6c7d8e9f0123456789abcdef012345678')
        app.save(v2)

        const a1 = new Record(assinaturasCol)
        a1.set('contrato', c2.id)
        a1.set('versao', v2.id)
        a1.set('papel_signatario', 'Contratado')
        a1.set('nome_signatario', 'Camila Vasconcelos')
        a1.set('email_signatario', 'camila@verticemidia.com.br')
        a1.set('documento_identificacao', '34.819.204/0001-95')
        a1.set('status_assinatura', 'Pendente')
        a1.set('data_solicitacao', '2026-09-20 15:00:00.000Z')
        app.save(a1)
      }

      // 4.3 Contrato CLT Juliana Mendes Castro - Experiência 45+45
      if (pJuliana) {
        const c3 = new Record(contratosCol)
        c3.set('pessoa', pJuliana.id)
        c3.set('codigo_contrato', 'CT-CLT-2026-001')
        c3.set(
          'titulo',
          'Contrato Individual de Trabalho por Prazo Determinado (Experiência 45+45)',
        )
        c3.set('modalidade', 'CLT')
        c3.set('tipo_modelo', 'CLT_EXPERIENCIA')
        c3.set('status', 'Vigente')
        c3.set('data_inicio', '2026-10-06 00:00:00.000Z')
        c3.set('data_fim', '2027-01-04 00:00:00.000Z') // 90 dias totais
        c3.set('data_renovacao_alerta', '2026-11-15 00:00:00.000Z') // Avaliação do 1º período (45d)
        c3.set('dias_antecedencia_alerta', 15)
        c3.set('valor_mensal', 9500)
        c3.set('valor_hora', 59.38)
        c3.set('horas_mensais_base', 160)
        c3.set('prazo_tipo', 'Experiencia 45+45')
        c3.set('departamento', 'Gente & Gestão')
        c3.set('centro_custo', 'CC-PEOPLE-01')
        c3.set('cargo_funcao', 'Business Partner de Gente & Gestão (People)')
        c3.set('gestor_nome', 'Douglas Severo')
        c3.set('versao_atual', 1)
        c3.set(
          'clausulas_especiais',
          'Jornada flexível híbrida com 2 dias presenciais na sede, benefícios corporativos padrão (VR R$ 50/dia, Plano de Saúde Premium e Seguro de Vida) e acompanhamento pelo marco 30-60-90.',
        )
        app.save(c3)

        const v1 = new Record(versoesCol)
        v1.set('contrato', c3.id)
        v1.set('numero_versao', 1)
        v1.set('rotulo_versao', 'v1.0 — Emissão Admissional Formal')
        v1.set(
          'conteudo_texto',
          'CONTRATO INDIVIDUAL DE TRABALHO A TÍTULO DE EXPERIÊNCIA\n\nEMPREGADORA: SouYess Soluções em Tecnologia S/A\nEMPREGADA: Juliana Mendes Castro\nCPF: 412.890.318-72\nCARGO: Business Partner de Gente & Gestão\nREMUNERAÇÃO: R$ 9.500,00 mensais.\nCARGA HORÁRIA: 40 horas semanais (Base 160h/mês).\nPERÍODO EXPERIMENTAL: 45 dias prorrogáveis por mais 45 dias.',
        )
        v1.set('resumo_mudancas', 'Formalização admissional após aprovação no processo seletivo.')
        v1.set('criado_por_nome', 'Douglas Severo (Gente & Gestão)')
        v1.set('status_versao', 'Assinada')
        v1.set('hash_conteudo', 'f119028374a56b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c')
        app.save(v1)

        const a1 = new Record(assinaturasCol)
        a1.set('contrato', c3.id)
        a1.set('versao', v1.id)
        a1.set('papel_signatario', 'Contratado')
        a1.set('nome_signatario', 'Juliana Mendes Castro')
        a1.set('email_signatario', 'juliana.mendes@exemplo.com')
        a1.set('documento_identificacao', '412.890.318-72')
        a1.set('status_assinatura', 'Assinado')
        a1.set('data_solicitacao', '2026-09-01 10:00:00.000Z')
        a1.set('data_assinatura', '2026-09-01 14:15:32.000Z')
        a1.set('ip_assinatura', '177.34.198.88')
        a1.set('user_agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)')
        a1.set('hash_documento', 'f119028374a56b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c')
        a1.set(
          'manifestacao_aceite',
          'Li, aceito e concordo integralmente com os termos contratuais e políticas internas da SouYess.',
        )
        app.save(a1)

        const a2 = new Record(assinaturasCol)
        a2.set('contrato', c3.id)
        a2.set('versao', v1.id)
        a2.set('papel_signatario', 'Representante Empresa')
        a2.set('nome_signatario', 'Douglas Severo')
        a2.set('email_signatario', 'severo.douglas2@gmail.com')
        a2.set('documento_identificacao', '12.345.678/0001-90')
        a2.set('status_assinatura', 'Assinado')
        a2.set('data_solicitacao', '2026-09-01 10:00:00.000Z')
        a2.set('data_assinatura', '2026-09-01 15:00:10.000Z')
        a2.set('ip_assinatura', '189.120.45.19')
        a2.set('user_agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
        a2.set('hash_documento', 'f119028374a56b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c')
        a2.set(
          'manifestacao_aceite',
          'Assinatura pelo representante legal de Gente & Gestão SouYess.',
        )
        app.save(a2)
      }

      // 4.4 Contrato PJ Dr. Eduardo Silveira - Vigente
      if (pEduardo) {
        const c4 = new Record(contratosCol)
        c4.set('pessoa', pEduardo.id)
        if (silveiraPrest) c4.set('prestador_pj', silveiraPrest.id)
        if (ctSilveiraPj) c4.set('contrato_pj_legado', ctSilveiraPj.id)
        c4.set('codigo_contrato', 'CT-PJ-2024-003')
        c4.set('titulo', 'Consultoria Jurídica Trabalhista Preventiva & Contratual')
        c4.set('modalidade', 'PJ')
        c4.set('tipo_modelo', 'PJ_PRESTACAO_SERVICOS')
        c4.set('status', 'Vigente')
        c4.set('data_inicio', '2024-03-10 00:00:00.000Z')
        c4.set('data_fim', '2028-03-09 00:00:00.000Z')
        c4.set('data_renovacao_alerta', '2028-01-08 00:00:00.000Z')
        c4.set('dias_antecedencia_alerta', 60)
        c4.set('valor_mensal', 11200)
        c4.set('valor_hora', 70.0)
        c4.set('horas_mensais_base', 160)
        c4.set('prazo_tipo', 'Determinado')
        c4.set('departamento', 'Jurídico & Compliance')
        c4.set('centro_custo', 'CC-JUR-01')
        c4.set('cargo_funcao', 'Consultor Jurídico Trabalhista & LGPD')
        c4.set('gestor_nome', 'Mariana Siqueira')
        c4.set('versao_atual', 1)
        c4.set(
          'clausulas_especiais',
          'Atendimento contínuo à equipe de Gente & Gestão, auditorias de conformidade semestrais e pareceres em até 48 horas.',
        )
        app.save(c4)

        const v1 = new Record(versoesCol)
        v1.set('contrato', c4.id)
        v1.set('numero_versao', 1)
        v1.set('rotulo_versao', 'v1.0 — Minuta Homologada')
        v1.set(
          'conteudo_texto',
          'INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA JURÍDICA\n\nCONTRATANTE: SouYess Tecnologia S/A\nCONTRATADA: Silveira, Prado & Associados Sociedade de Advogados\nREPRESENTANTE: Dr. Eduardo Silveira\nVALOR: R$ 11.200,00/mês.\nVIGÊNCIA: 10/03/2024 a 09/03/2028.',
        )
        v1.set('resumo_mudancas', 'Homologação e formalização da assessoria jurídica.')
        v1.set('criado_por_nome', 'Mariana Siqueira')
        v1.set('status_versao', 'Assinada')
        v1.set('hash_conteudo', 'd882910fa3214567890123456789abcdef0123456789abcdef0123456789abcd')
        app.save(v1)
      }
    } catch (err) {
      console.log('Aviso ao inicializar seed de contratos:', err)
    }
  },
  (app) => {
    try {
      const assCol = app.findCollectionByNameOrId('contrato_assinaturas')
      app.delete(assCol)
    } catch (_) {}
    try {
      const verCol = app.findCollectionByNameOrId('contrato_versoes')
      app.delete(verCol)
    } catch (_) {}
    try {
      const ctCol = app.findCollectionByNameOrId('contratos')
      app.delete(ctCol)
    } catch (_) {}
  },
)
