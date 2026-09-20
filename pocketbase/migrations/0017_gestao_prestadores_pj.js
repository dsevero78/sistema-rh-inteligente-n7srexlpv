/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Criar coleção 'prestadores_pj'
    let prestadoresCol = null
    try {
      prestadoresCol = app.findCollectionByNameOrId('prestadores_pj')
    } catch (_) {
      prestadoresCol = new Collection({
        name: 'prestadores_pj',
        type: 'base',
        system: false,
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != ''",
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'razao_social',
            type: 'text',
            required: true,
            min: 2,
            max: 200,
          },
          {
            name: 'nome_fantasia',
            type: 'text',
            required: false,
            max: 200,
          },
          {
            name: 'cnpj',
            type: 'text',
            required: true,
            min: 14,
            max: 20,
          },
          {
            name: 'area_atuacao',
            type: 'text',
            required: true,
            max: 100,
          },
          {
            name: 'contato_nome',
            type: 'text',
            required: false,
            max: 120,
          },
          {
            name: 'contato_email',
            type: 'email',
            required: false,
          },
          {
            name: 'contato_telefone',
            type: 'text',
            required: false,
            max: 50,
          },
          {
            name: 'endereco',
            type: 'text',
            required: false,
            max: 300,
          },
          {
            name: 'dados_bancarios',
            type: 'text',
            required: false,
            max: 300,
          },
          {
            name: 'banco',
            type: 'text',
            required: false,
            max: 100,
          },
          {
            name: 'regime_tributario',
            type: 'select',
            required: false,
            values: ['Simples Nacional', 'Lucro Presumido', 'Lucro Real', 'MEI'],
            maxSelect: 1,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['Ativo', 'Em renovação', 'Pausado', 'Encerrado'],
            maxSelect: 1,
          },
          {
            name: 'observacoes',
            type: 'text',
            required: false,
            max: 2000,
          },
          {
            name: 'contrato_social_anexo',
            type: 'file',
            required: false,
            maxSelect: 1,
            maxSize: 10485760, // 10MB
            mimeTypes: ['application/pdf', 'image/png', 'image/jpeg'],
          },
          {
            name: 'data_inicio_parceria',
            type: 'date',
            required: false,
          },
          {
            name: 'media_avaliacao',
            type: 'number',
            min: 0,
            max: 10,
          },
          {
            name: 'total_avaliacoes',
            type: 'number',
            min: 0,
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
          'CREATE UNIQUE INDEX idx_prestadores_cnpj ON prestadores_pj (cnpj)',
          'CREATE INDEX idx_prestadores_status ON prestadores_pj (status)',
          'CREATE INDEX idx_prestadores_area ON prestadores_pj (area_atuacao)',
        ],
      })
      app.save(prestadoresCol)
    }

    const prestadoresId = prestadoresCol.id

    // 2. Criar coleção 'contratos_pj'
    let contratosCol = null
    try {
      contratosCol = app.findCollectionByNameOrId('contratos_pj')
    } catch (_) {
      contratosCol = new Collection({
        name: 'contratos_pj',
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
            collectionId: prestadoresId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'titulo',
            type: 'text',
            required: true,
            min: 2,
            max: 200,
          },
          {
            name: 'numero_contrato',
            type: 'text',
            required: false,
            max: 50,
          },
          {
            name: 'valor',
            type: 'number',
            required: true,
            min: 0,
          },
          {
            name: 'tipo',
            type: 'select',
            required: true,
            values: ['Mensal', 'Por hora', 'Por projeto'],
            maxSelect: 1,
          },
          {
            name: 'data_inicio',
            type: 'date',
            required: true,
          },
          {
            name: 'data_fim',
            type: 'date',
            required: true,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['Vigente', 'Vencendo', 'Renovado', 'Encerrado', 'Rescindido'],
            maxSelect: 1,
          },
          {
            name: 'gestor_responsavel',
            type: 'relation',
            required: false,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          {
            name: 'gestor_nome',
            type: 'text',
            required: false,
            max: 120,
          },
          {
            name: 'clausulas_resumo',
            type: 'text',
            required: false,
            max: 3000,
          },
          {
            name: 'contrato_assinado_anexo',
            type: 'file',
            required: false,
            maxSelect: 1,
            maxSize: 15728640, // 15MB
            mimeTypes: ['application/pdf'],
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
          'CREATE INDEX idx_contratos_prestador ON contratos_pj (prestador)',
          'CREATE INDEX idx_contratos_status ON contratos_pj (status)',
          'CREATE INDEX idx_contratos_data_fim ON contratos_pj (data_fim)',
        ],
      })
      app.save(contratosCol)
    }

    const contratosId = contratosCol.id

    // 3. Criar coleção 'documentos_pj'
    let documentosCol = null
    try {
      documentosCol = app.findCollectionByNameOrId('documentos_pj')
    } catch (_) {
      documentosCol = new Collection({
        name: 'documentos_pj',
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
            collectionId: prestadoresId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'tipo_documento',
            type: 'select',
            required: true,
            values: [
              'Contrato social',
              'Certidão negativa federal',
              'Certidão estadual/municipal',
              'FGTS/CRF',
              'CNDT',
              'Certificado digital',
              'Outro',
            ],
            maxSelect: 1,
          },
          {
            name: 'titulo_personalizado',
            type: 'text',
            required: false,
            max: 150,
          },
          {
            name: 'data_emissao',
            type: 'date',
            required: false,
          },
          {
            name: 'data_validade',
            type: 'date',
            required: false,
          },
          {
            name: 'anexo',
            type: 'file',
            required: false,
            maxSelect: 1,
            maxSize: 10485760, // 10MB
            mimeTypes: ['application/pdf', 'image/png', 'image/jpeg'],
          },
          {
            name: 'status_calculado',
            type: 'select',
            required: false,
            values: ['Válido', 'Vencendo', 'Vencido', 'Sem validade'],
            maxSelect: 1,
          },
          {
            name: 'observacao',
            type: 'text',
            required: false,
            max: 500,
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
          'CREATE INDEX idx_docs_prestador ON documentos_pj (prestador)',
          'CREATE INDEX idx_docs_tipo ON documentos_pj (tipo_documento)',
          'CREATE INDEX idx_docs_validade ON documentos_pj (data_validade)',
        ],
      })
      app.save(documentosCol)
    }

    // 4. Criar coleção 'notas_fiscais_pj'
    let notasCol = null
    try {
      notasCol = app.findCollectionByNameOrId('notas_fiscais_pj')
    } catch (_) {
      notasCol = new Collection({
        name: 'notas_fiscais_pj',
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
            collectionId: prestadoresId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'contrato',
            type: 'relation',
            required: false,
            collectionId: contratosId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'numero_nf',
            type: 'text',
            required: true,
            min: 1,
            max: 50,
          },
          {
            name: 'competencia',
            type: 'text', // formato MM/AAAA ex: "10/2026"
            required: true,
            min: 6,
            max: 7,
          },
          {
            name: 'valor',
            type: 'number',
            required: true,
            min: 0,
          },
          {
            name: 'data_emissao',
            type: 'date',
            required: true,
          },
          {
            name: 'data_vencimento',
            type: 'date',
            required: true,
          },
          {
            name: 'data_pagamento',
            type: 'date',
            required: false,
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: [
              'Recebida',
              'Em conferência',
              'Aprovada para pagamento',
              'Paga',
              'Atrasada',
              'Glosada',
            ],
            maxSelect: 1,
          },
          {
            name: 'anexo',
            type: 'file',
            required: false,
            maxSelect: 1,
            maxSize: 10485760, // 10MB
            mimeTypes: ['application/pdf', 'application/xml', 'text/xml'],
          },
          {
            name: 'motivo_glosa',
            type: 'text',
            required: false,
            max: 1000,
          },
          {
            name: 'observacao',
            type: 'text',
            required: false,
            max: 1000,
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
          'CREATE INDEX idx_nfs_prestador ON notas_fiscais_pj (prestador)',
          'CREATE INDEX idx_nfs_contrato ON notas_fiscais_pj (contrato)',
          'CREATE INDEX idx_nfs_status ON notas_fiscais_pj (status)',
          'CREATE INDEX idx_nfs_vencimento ON notas_fiscais_pj (data_vencimento)',
        ],
      })
      app.save(notasCol)
    }

    // 5. Criar coleção 'avaliacoes_prestador_pj'
    let avaliacoesPjCol = null
    try {
      avaliacoesPjCol = app.findCollectionByNameOrId('avaliacoes_prestador_pj')
    } catch (_) {
      avaliacoesPjCol = new Collection({
        name: 'avaliacoes_prestador_pj',
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
            collectionId: prestadoresId,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'contrato',
            type: 'relation',
            required: false,
            collectionId: contratosId,
            cascadeDelete: false,
            maxSelect: 1,
          },
          {
            name: 'avaliador',
            type: 'relation',
            required: false,
            collectionId: '_pb_users_auth_',
            maxSelect: 1,
          },
          {
            name: 'avaliador_nome',
            type: 'text',
            required: false,
            max: 120,
          },
          {
            name: 'periodo_avaliado',
            type: 'text', // ex: "3º Trimestre/2026" ou "08/2026 - 10/2026"
            required: true,
            max: 100,
          },
          {
            name: 'nota_qualidade_tecnica',
            type: 'number',
            required: true,
            min: 0,
            max: 10,
          },
          {
            name: 'nota_prazo',
            type: 'number',
            required: true,
            min: 0,
            max: 10,
          },
          {
            name: 'nota_comunicacao',
            type: 'number',
            required: true,
            min: 0,
            max: 10,
          },
          {
            name: 'nota_aderencia_cultural',
            type: 'number',
            required: true,
            min: 0,
            max: 10,
          },
          {
            name: 'nota_media',
            type: 'number',
            required: true,
            min: 0,
            max: 10,
          },
          {
            name: 'recomendacao',
            type: 'select',
            required: true,
            values: ['Continuar', 'Renovar com ressalvas', 'Não renovar'],
            maxSelect: 1,
          },
          {
            name: 'comentario',
            type: 'text',
            required: false,
            max: 2000,
          },
          {
            name: 'pontos_fortes',
            type: 'text',
            required: false,
            max: 1000,
          },
          {
            name: 'pontos_melhoria',
            type: 'text',
            required: false,
            max: 1000,
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
          'CREATE INDEX idx_aval_pj_prestador ON avaliacoes_prestador_pj (prestador)',
          'CREATE INDEX idx_aval_pj_recomendacao ON avaliacoes_prestador_pj (recomendacao)',
        ],
      })
      app.save(avaliacoesPjCol)
    }

    // 6. Seeds de Demonstração Idempotentes (3 prestadores realistas)
    // Prestador 1: Consultoria de TI (DevOps, Cloud e Microsserviços) - Nexus Cloud & DevOps Ltda
    // Prestador 2: Agência de Marketing Digital & Employer Branding - Vértice Mídia & Branding S/S
    // Prestador 3: Assessoria Jurídica Trabalhista & Contratual - Silveira & Associados Advocacia
    try {
      let userAdmin = null
      try {
        const users = app.findRecordsByFilter('users', '', '-created', 1, 0)
        if (users && users.length > 0) userAdmin = users[0]
      } catch (_) {}

      // Prestador 1: Nexus Cloud
      let p1 = null
      try {
        p1 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '28.491.503/0001-82')
      } catch (_) {
        p1 = new Record(prestadoresCol)
        p1.set('razao_social', 'Nexus Cloud Soluções em Tecnologia Ltda')
        p1.set('nome_fantasia', 'Nexus Cloud & DevOps')
        p1.set('cnpj', '28.491.503/0001-82')
        p1.set('area_atuacao', 'Engenharia de Software & Cloud')
        p1.set('contato_nome', 'Renato Albuquerque')
        p1.set('contato_email', 'renato.albuquerque@nexuscloud.tech')
        p1.set('contato_telefone', '(11) 98123-4567')
        p1.set('endereco', 'Av. Paulista, 1000, Bela Vista, São Paulo - SP')
        p1.set(
          'dados_bancarios',
          'Agência: 0001 | Conta Corrente: 48920-1 | Chave PIX: financeiro@nexuscloud.tech',
        )
        p1.set('banco', 'Banco Itaú Unibanco')
        p1.set('regime_tributario', 'Lucro Presumido')
        p1.set('status', 'Ativo')
        p1.set(
          'observacoes',
          'Parceria estratégica para sustentação dos clusters Kubernetes e esteiras de CI/CD.',
        )
        p1.set('data_inicio_parceria', '2025-01-15 00:00:00.000Z')
        p1.set('media_avaliacao', 9.5)
        p1.set('total_avaliacoes', 1)
        app.save(p1)
      }

      // Prestador 2: Vértice Mídia (Marketing & Employer Branding)
      let p2 = null
      try {
        p2 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '34.819.204/0001-95')
      } catch (_) {
        p2 = new Record(prestadoresCol)
        p2.set('razao_social', 'Vértice Estratégia de Conteúdo e Mídia S/S')
        p2.set('nome_fantasia', 'Vértice Mídia & Branding')
        p2.set('cnpj', '34.819.204/0001-95')
        p2.set('area_atuacao', 'Marketing Digital & Employer Branding')
        p2.set('contato_nome', 'Camila Vasconcelos')
        p2.set('contato_email', 'camila@verticemidia.com.br')
        p2.set('contato_telefone', '(11) 97234-8899')
        p2.set('endereco', 'Rua Funchal, 418, Vila Olímpia, São Paulo - SP')
        p2.set('dados_bancarios', 'Agência: 1245 | Conta: 99312-8 | Chave PIX: 34819204000195')
        p2.set('banco', 'Banco Bradesco')
        p2.set('regime_tributario', 'Simples Nacional')
        p2.set('status', 'Em renovação') // Contrato vencendo em breve!
        p2.set(
          'observacoes',
          'Responsável pela campanha de atração de talentos de tech e vídeos institucionais.',
        )
        p2.set('data_inicio_parceria', '2025-06-01 00:00:00.000Z')
        p2.set('media_avaliacao', 8.8)
        p2.set('total_avaliacoes', 1)
        app.save(p2)
      }

      // Prestador 3: Silveira & Associados (Assessoria Jurídica)
      let p3 = null
      try {
        p3 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '19.340.892/0001-30')
      } catch (_) {
        p3 = new Record(prestadoresCol)
        p3.set('razao_social', 'Silveira, Prado & Associados Sociedade de Advogados')
        p3.set('nome_fantasia', 'Silveira Advocacia Corporativa')
        p3.set('cnpj', '19.340.892/0001-30')
        p3.set('area_atuacao', 'Assessoria Jurídica Trabalhista & LGPD')
        p3.set('contato_nome', 'Dr. Eduardo Silveira')
        p3.set('contato_email', 'eduardo@silveiraadvocacia.com.br')
        p3.set('contato_telefone', '(11) 3254-9000')
        p3.set('endereco', 'Alameda Santos, 1820, Cerqueira César, São Paulo - SP')
        p3.set(
          'dados_bancarios',
          'Agência: 0332 | Conta: 10452-3 | Chave PIX: contato@silveiraadvocacia.com.br',
        )
        p3.set('banco', 'Banco Santander')
        p3.set('regime_tributario', 'Lucro Presumido')
        p3.set('status', 'Ativo')
        p3.set(
          'observacoes',
          'Consultoria em minutas contratuais de contratação, compliance trabalhista e conformidade LGPD.',
        )
        p3.set('data_inicio_parceria', '2024-03-10 00:00:00.000Z')
        p3.set('media_avaliacao', 9.0)
        p3.set('total_avaliacoes', 0)
        app.save(p3)
      }

      // Sementes de Contratos
      // Contrato 1: Nexus Cloud (Vigente até 31/12/2026 - R$ 24.500/mês)
      let c1 = null
      try {
        c1 = app.findFirstRecordByData('contratos_pj', 'numero_contrato', 'CT-PJ-2025-014')
      } catch (_) {
        c1 = new Record(contratosCol)
        c1.set('prestador', p1.id)
        c1.set('titulo', 'Prestação de Serviços de Arquitetura Cloud & SRE')
        c1.set('numero_contrato', 'CT-PJ-2025-014')
        c1.set('valor', 24500)
        c1.set('tipo', 'Mensal')
        c1.set('data_inicio', '2025-01-15 00:00:00.000Z')
        c1.set('data_fim', '2026-12-31 00:00:00.000Z')
        c1.set('status', 'Vigente')
        if (userAdmin) c1.set('gestor_responsavel', userAdmin.id)
        c1.set('gestor_nome', userAdmin ? userAdmin.getString('name') : 'Douglas Severo')
        c1.set(
          'clausulas_resumo',
          'SLA de 99.9% de uptime para plataformas de missão crítica, cobertura 24x7 para incidentes nível P1 e plantão técnico compartilhado.',
        )
        app.save(c1)
      }

      // Contrato 2: Vértice Mídia (Vencendo em ~20 dias! Ex: data_fim calculada em 20 dias a partir de hoje)
      const dataHoje = new Date()
      const dataVencendoEm20Dias = new Date(dataHoje.getTime() + 20 * 24 * 60 * 60 * 1000)
      const dataVencendoIso = dataVencendoEm20Dias.toISOString().substring(0, 10) + ' 00:00:00.000Z'

      let c2 = null
      try {
        c2 = app.findFirstRecordByData('contratos_pj', 'numero_contrato', 'CT-PJ-2025-089')
      } catch (_) {
        c2 = new Record(contratosCol)
        c2.set('prestador', p2.id)
        c2.set('titulo', 'Gestão de Employer Branding & Campanhas de Talent Acquisition')
        c2.set('numero_contrato', 'CT-PJ-2025-089')
        c2.set('valor', 14000)
        c2.set('tipo', 'Mensal')
        c2.set('data_inicio', '2025-06-01 00:00:00.000Z')
        c2.set('data_fim', dataVencendoIso) // ~20 dias restantes!
        c2.set('status', 'Vencendo')
        if (userAdmin) c2.set('gestor_responsavel', userAdmin.id)
        c2.set('gestor_nome', userAdmin ? userAdmin.getString('name') : 'Douglas Severo')
        c2.set(
          'clausulas_resumo',
          'Produção de 4 cases mensais em vídeo com colaboradores, gestão dos anúncios de vagas patrocinadas no LinkedIn e otimização da página de carreiras.',
        )
        app.save(c2)
      }

      // Contrato 3: Silveira Advocacia (Vigente até meados de 2027 - R$ 9.800/mês)
      let c3 = null
      try {
        c3 = app.findFirstRecordByData('contratos_pj', 'numero_contrato', 'CT-PJ-2024-003')
      } catch (_) {
        c3 = new Record(contratosCol)
        c3.set('prestador', p3.id)
        c3.set('titulo', 'Consultoria Jurídica Trabalhista Preventiva & Contratual')
        c3.set('numero_contrato', 'CT-PJ-2024-003')
        c3.set('valor', 9800)
        c3.set('tipo', 'Mensal')
        c3.set('data_inicio', '2024-03-10 00:00:00.000Z')
        c3.set('data_fim', '2027-03-09 00:00:00.000Z')
        c3.set('status', 'Vigente')
        if (userAdmin) c3.set('gestor_responsavel', userAdmin.id)
        c3.set('gestor_nome', userAdmin ? userAdmin.getString('name') : 'Douglas Severo')
        c3.set(
          'clausulas_resumo',
          'Atendimento contínuo ao time de Gente & Gestão, revisão de aditivos contratuais, validação de contratos PJ e auditoria semestral de conformidade trabalhista.',
        )
        app.save(c3)
      }

      // Sementes de Documentos PJ
      // Doc 1: Nexus Cloud - Contrato Social (Válido)
      try {
        const dExist = app.findRecordsByFilter(
          'documentos_pj',
          "prestador = '" + p1.id + "' && tipo_documento = 'Contrato social'",
          '',
          1,
          0,
        )
        if (!dExist || dExist.length === 0) {
          const d1 = new Record(documentosCol)
          d1.set('prestador', p1.id)
          d1.set('tipo_documento', 'Contrato social')
          d1.set('titulo_personalizado', 'Contrato Social Consolidado - 5ª Alteração')
          d1.set('data_emissao', '2024-05-10 00:00:00.000Z')
          d1.set('status_calculado', 'Sem validade')
          d1.set('observacao', 'Registrado na JUCESP sob NIRE 352349182.')
          app.save(d1)
        }
      } catch (_) {}

      // Doc 2: Nexus Cloud - CNDT (Válida)
      try {
        const dExist = app.findRecordsByFilter(
          'documentos_pj',
          "prestador = '" + p1.id + "' && tipo_documento = 'CNDT'",
          '',
          1,
          0,
        )
        if (!dExist || dExist.length === 0) {
          const d2 = new Record(documentosCol)
          d2.set('prestador', p1.id)
          d2.set('tipo_documento', 'CNDT')
          d2.set('titulo_personalizado', 'Certidão Negativa de Débitos Trabalhistas (TST)')
          d2.set('data_emissao', '2026-08-01 00:00:00.000Z')
          // Vencendo em 120 dias
          d2.set('data_validade', '2027-02-01 00:00:00.000Z')
          d2.set('status_calculado', 'Válido')
          d2.set('observacao', 'Autenticidade conferida no portal TST.')
          app.save(d2)
        }
      } catch (_) {}

      // Doc 3: Vértice Mídia - Certidão Negativa Federal (VENCIDA há 10 dias - gera KPI e alerta!)
      const dataVencida10Dias =
        new Date(dataHoje.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) +
        ' 00:00:00.000Z'
      try {
        const dExist = app.findRecordsByFilter(
          'documentos_pj',
          "prestador = '" + p2.id + "' && tipo_documento = 'Certidão negativa federal'",
          '',
          1,
          0,
        )
        if (!dExist || dExist.length === 0) {
          const d3 = new Record(documentosCol)
          d3.set('prestador', p2.id)
          d3.set('tipo_documento', 'Certidão negativa federal')
          d3.set('titulo_personalizado', 'CND Conjunta Tributos Federais e Dívida Ativa')
          d3.set('data_emissao', '2026-04-10 00:00:00.000Z')
          d3.set('data_validade', dataVencida10Dias) // VENCIDO!
          d3.set('status_calculado', 'Vencido')
          d3.set(
            'observacao',
            'Certidão expirada. Solicitada emissão de nova via atualizada à contabilidade.',
          )
          app.save(d3)
        }
      } catch (_) {}

      // Doc 4: Vértice Mídia - FGTS/CRF (Vencendo em 12 dias - gera alerta!)
      const dataVencendo12Dias =
        new Date(dataHoje.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) +
        ' 00:00:00.000Z'
      try {
        const dExist = app.findRecordsByFilter(
          'documentos_pj',
          "prestador = '" + p2.id + "' && tipo_documento = 'FGTS/CRF'",
          '',
          1,
          0,
        )
        if (!dExist || dExist.length === 0) {
          const d4 = new Record(documentosCol)
          d4.set('prestador', p2.id)
          d4.set('tipo_documento', 'FGTS/CRF')
          d4.set('titulo_personalizado', 'Certificado de Regularidade do FGTS (CRF Caixa)')
          d4.set('data_emissao', '2026-09-20 00:00:00.000Z')
          d4.set('data_validade', dataVencendo12Dias) // Vencendo em 12 dias!
          d4.set('status_calculado', 'Vencendo')
          d4.set('observacao', 'Emissão regular pela Caixa Econômica Federal.')
          app.save(d4)
        }
      } catch (_) {}

      // Sementes de Notas Fiscais
      // NF 1: Nexus Cloud - NF 1042 - Paga (R$ 24.500)
      try {
        const nfExist = app.findRecordsByFilter(
          'notas_fiscais_pj',
          "numero_nf = 'NF-1042'",
          '',
          1,
          0,
        )
        if (!nfExist || nfExist.length === 0) {
          const nf1 = new Record(notasCol)
          nf1.set('prestador', p1.id)
          nf1.set('contrato', c1.id)
          nf1.set('numero_nf', 'NF-1042')
          nf1.set('competencia', '09/2026')
          nf1.set('valor', 24500)
          nf1.set('data_emissao', '2026-09-02 00:00:00.000Z')
          nf1.set('data_vencimento', '2026-09-15 00:00:00.000Z')
          nf1.set('data_pagamento', '2026-09-15 00:00:00.000Z')
          nf1.set('status', 'Paga')
          nf1.set('observacao', 'Comprovante bancário arquivado no ERP financeiro.')
          app.save(nf1)
        }
      } catch (_) {}

      // NF 2: Nexus Cloud - NF 1098 - Aprovada para pagamento (R$ 24.500)
      const dataVencNf2 =
        new Date(dataHoje.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) +
        ' 00:00:00.000Z'
      try {
        const nfExist = app.findRecordsByFilter(
          'notas_fiscais_pj',
          "numero_nf = 'NF-1098'",
          '',
          1,
          0,
        )
        if (!nfExist || nfExist.length === 0) {
          const nf2 = new Record(notasCol)
          nf2.set('prestador', p1.id)
          nf2.set('contrato', c1.id)
          nf2.set('numero_nf', 'NF-1098')
          nf2.set('competencia', '10/2026')
          nf2.set('valor', 24500)
          nf2.set('data_emissao', '2026-10-02 00:00:00.000Z')
          nf2.set('data_vencimento', dataVencNf2)
          nf2.set('status', 'Aprovada para pagamento')
          nf2.set('observacao', 'Validação das horas e entregas de sprint aprovada pela TI.')
          app.save(nf2)
        }
      } catch (_) {}

      // NF 3: Vértice Mídia - NF 4420 - Atrasada (Venceu há 4 dias sem marcar como paga! - R$ 14.000)
      const dataVencAtrasada =
        new Date(dataHoje.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) +
        ' 00:00:00.000Z'
      try {
        const nfExist = app.findRecordsByFilter(
          'notas_fiscais_pj',
          "numero_nf = 'NF-4420'",
          '',
          1,
          0,
        )
        if (!nfExist || nfExist.length === 0) {
          const nf3 = new Record(notasCol)
          nf3.set('prestador', p2.id)
          nf3.set('contrato', c2.id)
          nf3.set('numero_nf', 'NF-4420')
          nf3.set('competencia', '09/2026')
          nf3.set('valor', 14000)
          nf3.set('data_emissao', '2026-09-25 00:00:00.000Z')
          nf3.set('data_vencimento', dataVencAtrasada)
          nf3.set('status', 'Atrasada')
          nf3.set('observacao', 'Aguardando liberação de autorização bancária pela diretoria.')
          app.save(nf3)
        }
      } catch (_) {}

      // NF 4: Silveira Advocacia - NF 812 - Em conferência (R$ 9.800)
      const dataVencNf4 =
        new Date(dataHoje.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) +
        ' 00:00:00.000Z'
      try {
        const nfExist = app.findRecordsByFilter(
          'notas_fiscais_pj',
          "numero_nf = 'NF-0812'",
          '',
          1,
          0,
        )
        if (!nfExist || nfExist.length === 0) {
          const nf4 = new Record(notasCol)
          nf4.set('prestador', p3.id)
          nf4.set('contrato', c3.id)
          nf4.set('numero_nf', 'NF-0812')
          nf4.set('competencia', '10/2026')
          nf4.set('valor', 9800)
          nf4.set('data_emissao', '2026-10-01 00:00:00.000Z')
          nf4.set('data_vencimento', dataVencNf4)
          nf4.set('status', 'Em conferência')
          nf4.set('observacao', 'Relatório de horas de pareceres jurídicos anexo em análise.')
          app.save(nf4)
        }
      } catch (_) {}

      // Sementes de Avaliação de Desempenho Concluída
      // Avaliação 1: Nexus Cloud (Média 9.5 - Continuar)
      try {
        const avExist = app.findRecordsByFilter(
          'avaliacoes_prestador_pj',
          "prestador = '" + p1.id + "'",
          '',
          1,
          0,
        )
        if (!avExist || avExist.length === 0) {
          const av1 = new Record(avaliacoesPjCol)
          av1.set('prestador', p1.id)
          av1.set('contrato', c1.id)
          if (userAdmin) av1.set('avaliador', userAdmin.id)
          av1.set('avaliador_nome', userAdmin ? userAdmin.getString('name') : 'Douglas Severo')
          av1.set('periodo_avaliado', '3º Trimestre/2026')
          av1.set('nota_qualidade_tecnica', 10)
          av1.set('nota_prazo', 9)
          av1.set('nota_comunicacao', 9)
          av1.set('nota_aderencia_cultural', 10)
          av1.set('nota_media', 9.5)
          av1.set('recomendacao', 'Continuar')
          av1.set(
            'comentario',
            'Parceria de altíssimo valor agregado. O time da Nexus atua como uma extensão direta do nosso time de engenharia com zero downtime no período.',
          )
          av1.set(
            'pontos_fortes',
            'Domínio técnico profundo em Kubernetes e automação de observabilidade.',
          )
          av1.set(
            'pontos_melhoria',
            'Documentação assíncrona mais detalhada das alterações de infraestrutura.',
          )
          app.save(av1)
        }
      } catch (_) {}

      // Avaliação 2: Vértice Mídia (Média 8.8 - Renovar com ressalvas)
      try {
        const avExist = app.findRecordsByFilter(
          'avaliacoes_prestador_pj',
          "prestador = '" + p2.id + "'",
          '',
          1,
          0,
        )
        if (!avExist || avExist.length === 0) {
          const av2 = new Record(avaliacoesPjCol)
          av2.set('prestador', p2.id)
          av2.set('contrato', c2.id)
          if (userAdmin) av2.set('avaliador', userAdmin.id)
          av2.set('avaliador_nome', userAdmin ? userAdmin.getString('name') : 'Douglas Severo')
          av2.set('periodo_avaliado', '3º Trimestre/2026')
          av2.set('nota_qualidade_tecnica', 9)
          av2.set('nota_prazo', 8)
          av2.set('nota_comunicacao', 9)
          av2.set('nota_aderencia_cultural', 9)
          av2.set('nota_media', 8.8)
          av2.set('recomendacao', 'Renovar com ressalvas')
          av2.set(
            'comentario',
            'As campanhas de atração geraram excelentes candidatos para tech. Contudo, precisamos de prazos mais curtos na edição final dos vídeos.',
          )
          av2.set(
            'pontos_fortes',
            'Criatividade visual e alinhamento com os pilares da cultura interna.',
          )
          av2.set('pontos_melhoria', 'Gestão de cronograma nas entregas finais de edição.')
          app.save(av2)
        }
      } catch (_) {}

      // Gerar alertas no sino da central para o primeiro acesso
      const alertasCol = app.findCollectionByNameOrId('alertas')

      // Alerta 1: Contrato Vencendo em 20 dias (Vértice Mídia)
      try {
        const a1Exist = app.findRecordsByFilter(
          'alertas',
          "tipo = 'contrato_pj_vencendo'",
          '',
          1,
          0,
        )
        if (!a1Exist || a1Exist.length === 0) {
          const a1 = new Record(alertasCol)
          a1.set('score', 90)
          a1.set('tipo', 'contrato_pj_vencendo')
          a1.set('status', 'Novo')
          a1.set(
            'resumo_ia',
            'Atenção para Renovação Contratual: O contrato "Gestão de Employer Branding" com Vértice Mídia & Branding vence em ~20 dias. Valor mensal de R$ 14.000,00. Avaliação do prestador: 8.8/10 (Recomendação: Renovar com ressalvas).',
          )
          a1.set('criado_em', new Date().toISOString())
          app.save(a1)
        }
      } catch (_) {}

      // Alerta 2: Documento Vencido (Certidão Negativa Federal - Vértice Mídia)
      try {
        const a2Exist = app.findRecordsByFilter(
          'alertas',
          "tipo = 'documento_pj_vencido'",
          '',
          1,
          0,
        )
        if (!a2Exist || a2Exist.length === 0) {
          const a2 = new Record(alertasCol)
          a2.set('score', 95)
          a2.set('tipo', 'documento_pj_vencido')
          a2.set('status', 'Novo')
          a2.set(
            'resumo_ia',
            'Documento Fiscal Vencido: A "Certidão negativa federal" do prestador Vértice Mídia & Branding (CNPJ 34.819.204/0001-95) está vencida há 10 dias. Regularização prioritária necessária.',
          )
          a2.set('criado_em', new Date().toISOString())
          app.save(a2)
        }
      } catch (_) {}

      // Alerta 3: NF Atrasada (NF-4420)
      try {
        const a3Exist = app.findRecordsByFilter(
          'alertas',
          "tipo = 'nota_fiscal_pj_atrasada'",
          '',
          1,
          0,
        )
        if (!a3Exist || a3Exist.length === 0) {
          const a3 = new Record(alertasCol)
          a3.set('score', 85)
          a3.set('tipo', 'nota_fiscal_pj_atrasada')
          a3.set('status', 'Novo')
          a3.set(
            'resumo_ia',
            'Alerta de Pagamento Pendente: A nota fiscal NF-4420 de Vértice Mídia & Branding no valor de R$ 14.000,00 ultrapassou a data de vencimento sem confirmação de pagamento no sistema.',
          )
          a3.set('criado_em', new Date().toISOString())
          app.save(a3)
        }
      } catch (_) {}
    } catch (seedErr) {
      console.log('Aviso ao semear prestadores PJ:', seedErr)
    }

    // 7. Atualizar o Agente IA 'gestor-de-talentos' com as novas ferramentas e memória de Prestadores PJ
    try {
      $ai.agents.putTools(app, 'gestor-de-talentos', [
        {
          collection: 'prestadores_pj',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'contratos_pj',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'documentos_pj',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'notas_fiscais_pj',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'avaliacoes_prestador_pj',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
      ])

      $ai.agents.putMemories(app, 'gestor-de-talentos', [
        {
          type: 'text',
          payload: {
            text:
              'Módulo de Gestão de Prestadores de Serviços PJ:\n' +
              '1. Prestadores PJ (prestadores_pj): Empresas terceirizadas e parceiros estratégicos que prestam serviços para a organização. Contém razão social, nome fantasia, CNPJ, área de atuação, contatos, dados bancários e fiscais, status (Ativo, Em renovação, Pausado, Encerrado) e média de avaliações.\n' +
              '2. Contratos PJ (contratos_pj): Vigência, valores mensais ou por projeto, gestor responsável e status (Vigente, Vencendo, Renovado, Encerrado, Rescindido). O sistema alerta contratos vencendo nos próximos 30 dias.\n' +
              '3. Documentos Fiscais e Trabalhistas (documentos_pj): CNDT, CRF/FGTS, Certidões Negativas, Contrato Social. Monitoramento de vencimentos e alertas preventivos.\n' +
              '4. Notas Fiscais (notas_fiscais_pj): Acompanhamento do fluxo financeiro: Recebida, Em conferência, Aprovada para pagamento, Paga, Atrasada, Glosada.\n' +
              '5. Avaliações de Desempenho (avaliacoes_prestador_pj): Notas de 0 a 10 em qualidade técnica, prazo, comunicação e aderência cultural, com recomendação de continuar ou renovar.\n' +
              'O agente IA deve responder dúvidas da liderança sobre prestadores ativos, contratos a vencer, conformidade de documentos e histórico de notas fiscais.',
          },
        },
      ])
    } catch (agentErr) {
      console.log('Aviso ao atualizar agente com ferramentas de prestadores PJ:', agentErr)
    }
  },
  (app) => {
    try {
      const col5 = app.findCollectionByNameOrId('avaliacoes_prestador_pj')
      if (col5) app.delete(col5)
    } catch (_) {}
    try {
      const col4 = app.findCollectionByNameOrId('notas_fiscais_pj')
      if (col4) app.delete(col4)
    } catch (_) {}
    try {
      const col3 = app.findCollectionByNameOrId('documentos_pj')
      if (col3) app.delete(col3)
    } catch (_) {}
    try {
      const col2 = app.findCollectionByNameOrId('contratos_pj')
      if (col2) app.delete(col2)
    } catch (_) {}
    try {
      const col1 = app.findCollectionByNameOrId('prestadores_pj')
      if (col1) app.delete(col1)
    } catch (_) {}
  },
)
