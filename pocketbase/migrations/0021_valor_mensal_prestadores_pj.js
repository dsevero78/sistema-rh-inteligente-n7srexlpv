/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    // 1. Garantir campo 'valor_mensal_atual' na coleção 'prestadores_pj'
    const prestadoresCol = app.findCollectionByNameOrId('prestadores_pj')
    if (prestadoresCol) {
      let hasValorMensal = false
      try {
        if (prestadoresCol.fields.getByName('valor_mensal_atual')) {
          hasValorMensal = true
        }
      } catch (_) {}

      if (!hasValorMensal) {
        prestadoresCol.fields.add(
          new NumberField({
            name: 'valor_mensal_atual',
            min: 0,
          }),
        )
        app.save(prestadoresCol)
      }
    }

    const contratosCol = app.findCollectionByNameOrId('contratos_pj')
    const aditivosCol = app.findCollectionByNameOrId('aditivos_pj')
    const documentosCol = app.findCollectionByNameOrId('documentos_pj')
    const notasCol = app.findCollectionByNameOrId('notas_fiscais_pj')
    const avaliacoesCol = app.findCollectionByNameOrId('avaliacoes_prestador_pj')
    const marcosCol = app.findCollectionByNameOrId('marcos_lifecycle_pj')

    let userAdmin = null
    try {
      const users = app.findRecordsByFilter('users', '', '-created', 1, 0)
      if (users && users.length > 0) userAdmin = users[0]
    } catch (_) {}

    const dataHoje = new Date()
    const dataVencendoEm20Dias = new Date(dataHoje.getTime() + 20 * 24 * 60 * 60 * 1000)
    const dataVencendoIso = dataVencendoEm20Dias.toISOString().substring(0, 10) + ' 00:00:00.000Z'
    const dataVencida10Dias =
      new Date(dataHoje.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) +
      ' 00:00:00.000Z'
    const dataVencendo12Dias =
      new Date(dataHoje.getTime() + 12 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) +
      ' 00:00:00.000Z'
    const dataVencNf2 =
      new Date(dataHoje.getTime() + 5 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) +
      ' 00:00:00.000Z'
    const dataVencAtrasada =
      new Date(dataHoje.getTime() - 4 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) +
      ' 00:00:00.000Z'
    const dataVencNf4 =
      new Date(dataHoje.getTime() + 15 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10) +
      ' 00:00:00.000Z'

    // =========================================================================
    // 2. Semear/Atualizar Prestador 1: Nexus Cloud & DevOps
    // =========================================================================
    let p1 = null
    try {
      p1 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '28.491.503/0001-82')
    } catch (_) {
      p1 = new Record(prestadoresCol)
    }
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
    p1.set('etapa_lifecycle', 'Ativo')
    p1.set(
      'observacoes',
      'Parceria estratégica para sustentação dos clusters Kubernetes e esteiras de CI/CD.',
    )
    p1.set('data_inicio_parceria', '2025-01-15 00:00:00.000Z')
    p1.set('media_avaliacao', 9.5)
    p1.set('total_avaliacoes', 1)
    p1.set('valor_mensal_atual', 24500) // Configuração explícita do valor mensal no cadastro
    app.save(p1)

    // Contrato 1: Nexus Cloud (CT-PJ-2025-014)
    let c1 = null
    try {
      c1 = app.findFirstRecordByData('contratos_pj', 'numero_contrato', 'CT-PJ-2025-014')
    } catch (_) {
      c1 = new Record(contratosCol)
    }
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
    c1.set('contador_aditivos', 2)
    app.save(c1)

    // Aditivos Nexus Cloud
    if (aditivosCol) {
      // Aditivo 1 Nexus
      let ad1 = null
      try {
        const ads = app.findRecordsByFilter(
          'aditivos_pj',
          `prestador = '${p1.id}' && numero_aditivo = 'ADIT-2025-01'`,
          '',
          1,
          0,
        )
        if (ads && ads.length > 0) ad1 = ads[0]
      } catch (_) {}
      if (!ad1) ad1 = new Record(aditivosCol)
      ad1.set('numero_aditivo', 'ADIT-2025-01')
      ad1.set('sequencia', 1)
      ad1.set('tipo', 'Reajuste de valor')
      ad1.set('contrato', c1.id)
      ad1.set('prestador', p1.id)
      ad1.set('data_assinatura', '2025-07-01 00:00:00.000Z')
      ad1.set('valor_anterior', 20000)
      ad1.set('novo_valor_mensal', 24500)
      ad1.set('vigencia_anterior_fim', '2025-12-31 00:00:00.000Z')
      ad1.set('nova_vigencia_fim', '2025-12-31 00:00:00.000Z')
      ad1.set(
        'descricao',
        'Reajuste anual inflacionário e inclusão de sustentação 24x7 para novos clusters de microsserviços em São Paulo e Virgínia.',
      )
      ad1.set('status', 'Vigente')
      app.save(ad1)

      // Aditivo 2 Nexus
      let ad2 = null
      try {
        const ads = app.findRecordsByFilter(
          'aditivos_pj',
          `prestador = '${p1.id}' && numero_aditivo = 'ADIT-2025-02'`,
          '',
          1,
          0,
        )
        if (ads && ads.length > 0) ad2 = ads[0]
      } catch (_) {}
      if (!ad2) ad2 = new Record(aditivosCol)
      ad2.set('numero_aditivo', 'ADIT-2025-02')
      ad2.set('sequencia', 2)
      ad2.set('tipo', 'Prolongamento de vigência')
      ad2.set('contrato', c1.id)
      ad2.set('prestador', p1.id)
      ad2.set('data_assinatura', '2025-11-20 00:00:00.000Z')
      ad2.set('valor_anterior', 24500)
      ad2.set('novo_valor_mensal', 24500)
      ad2.set('vigencia_anterior_fim', '2025-12-31 00:00:00.000Z')
      ad2.set('nova_vigencia_fim', '2026-12-31 00:00:00.000Z')
      ad2.set(
        'descricao',
        'Prorrogação da vigência contratual por mais 12 (doze) meses, mantendo o escopo e SLA acordados no aditivo anterior.',
      )
      ad2.set('status', 'Vigente')
      app.save(ad2)
    }

    // Documentos Nexus
    if (documentosCol) {
      try {
        const dExist = app.findRecordsByFilter(
          'documentos_pj',
          `prestador = '${p1.id}' && tipo_documento = 'Contrato social'`,
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

      try {
        const dExist = app.findRecordsByFilter(
          'documentos_pj',
          `prestador = '${p1.id}' && tipo_documento = 'CNDT'`,
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
          d2.set('data_validade', '2027-02-01 00:00:00.000Z')
          d2.set('status_calculado', 'Válido')
          d2.set('observacao', 'Autenticidade conferida no portal TST.')
          app.save(d2)
        }
      } catch (_) {}
    }

    // Notas Fiscais Nexus
    if (notasCol) {
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
    }

    // Avaliação Nexus
    if (avaliacoesCol) {
      try {
        const avExist = app.findRecordsByFilter(
          'avaliacoes_prestador_pj',
          `prestador = '${p1.id}'`,
          '',
          1,
          0,
        )
        if (!avExist || avExist.length === 0) {
          const av1 = new Record(avaliacoesCol)
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
    }

    // =========================================================================
    // 3. Semear/Atualizar Prestador 2: Vértice Mídia & Branding
    // =========================================================================
    let p2 = null
    try {
      p2 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '34.819.204/0001-95')
    } catch (_) {
      p2 = new Record(prestadoresCol)
    }
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
    p2.set('status', 'Em renovação')
    p2.set('etapa_lifecycle', 'Mudanças')
    p2.set(
      'observacoes',
      'Responsável pela campanha de atração de talentos de tech e vídeos institucionais.',
    )
    p2.set('data_inicio_parceria', '2025-06-01 00:00:00.000Z')
    p2.set('media_avaliacao', 8.8)
    p2.set('total_avaliacoes', 1)
    p2.set('valor_mensal_atual', 14000) // Configuração explícita do valor mensal no cadastro
    app.save(p2)

    // Contrato 2: Vértice Mídia (CT-PJ-2025-089)
    let c2 = null
    try {
      c2 = app.findFirstRecordByData('contratos_pj', 'numero_contrato', 'CT-PJ-2025-089')
    } catch (_) {
      c2 = new Record(contratosCol)
    }
    c2.set('prestador', p2.id)
    c2.set('titulo', 'Gestão de Employer Branding & Campanhas de Talent Acquisition')
    c2.set('numero_contrato', 'CT-PJ-2025-089')
    c2.set('valor', 14000)
    c2.set('tipo', 'Mensal')
    c2.set('data_inicio', '2025-06-01 00:00:00.000Z')
    c2.set('data_fim', dataVencendoIso)
    c2.set('status', 'Vencendo')
    if (userAdmin) c2.set('gestor_responsavel', userAdmin.id)
    c2.set('gestor_nome', userAdmin ? userAdmin.getString('name') : 'Douglas Severo')
    c2.set(
      'clausulas_resumo',
      'Produção de 4 cases mensais em vídeo com colaboradores, gestão dos anúncios de vagas patrocinadas no LinkedIn e otimização da página de carreiras.',
    )
    c2.set('contador_aditivos', 1)
    app.save(c2)

    // Aditivo Vértice Mídia (Pendente de assinatura)
    if (aditivosCol) {
      let ad3 = null
      try {
        const ads = app.findRecordsByFilter(
          'aditivos_pj',
          `prestador = '${p2.id}' && numero_aditivo = 'ADIT-2026-01'`,
          '',
          1,
          0,
        )
        if (ads && ads.length > 0) ad3 = ads[0]
      } catch (_) {}
      if (!ad3) ad3 = new Record(aditivosCol)
      ad3.set('numero_aditivo', 'ADIT-2026-01')
      ad3.set('sequencia', 1)
      ad3.set('tipo', 'Reajuste e Prolongamento')
      ad3.set('contrato', c2.id)
      ad3.set('prestador', p2.id)
      ad3.set('data_assinatura', '')
      ad3.set('valor_anterior', 14000)
      ad3.set('novo_valor_mensal', 16500)
      ad3.set('vigencia_anterior_fim', '2026-10-10 00:00:00.000Z')
      ad3.set('nova_vigencia_fim', '2027-10-10 00:00:00.000Z')
      ad3.set(
        'descricao',
        'Renovação antecipada do contrato de Employer Branding por mais 12 meses, com acréscimo de podcasts com líderes e reajuste para R$ 16.500/mês.',
      )
      ad3.set('status', 'Pendente de assinatura')
      app.save(ad3)
    }

    // Documentos Vértice Mídia
    if (documentosCol) {
      try {
        const dExist = app.findRecordsByFilter(
          'documentos_pj',
          `prestador = '${p2.id}' && tipo_documento = 'Certidão negativa federal'`,
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
          d3.set('data_validade', dataVencida10Dias)
          d3.set('status_calculado', 'Vencido')
          d3.set(
            'observacao',
            'Certidão expirada. Solicitada emissão de nova via atualizada à contabilidade.',
          )
          app.save(d3)
        }
      } catch (_) {}

      try {
        const dExist = app.findRecordsByFilter(
          'documentos_pj',
          `prestador = '${p2.id}' && tipo_documento = 'FGTS/CRF'`,
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
          d4.set('data_validade', dataVencendo12Dias)
          d4.set('status_calculado', 'Vencendo')
          d4.set('observacao', 'Emissão regular pela Caixa Econômica Federal.')
          app.save(d4)
        }
      } catch (_) {}
    }

    // Notas Fiscais Vértice Mídia
    if (notasCol) {
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
    }

    // Avaliação Vértice Mídia
    if (avaliacoesCol) {
      try {
        const avExist = app.findRecordsByFilter(
          'avaliacoes_prestador_pj',
          `prestador = '${p2.id}'`,
          '',
          1,
          0,
        )
        if (!avExist || avExist.length === 0) {
          const av2 = new Record(avaliacoesCol)
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
    }

    // =========================================================================
    // 4. Semear/Atualizar Prestador 3: Silveira Advocacia
    // =========================================================================
    let p3 = null
    try {
      p3 = app.findFirstRecordByData('prestadores_pj', 'cnpj', '19.340.892/0001-30')
    } catch (_) {
      p3 = new Record(prestadoresCol)
    }
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
    p3.set('etapa_lifecycle', 'Entrada')
    p3.set(
      'observacoes',
      'Consultoria em minutas contratuais de contratação, compliance trabalhista e conformidade LGPD.',
    )
    p3.set('data_inicio_parceria', '2024-03-10 00:00:00.000Z')
    p3.set('media_avaliacao', 9.0)
    p3.set('total_avaliacoes', 0)
    p3.set('valor_mensal_atual', 9800) // Configuração explícita do valor mensal no cadastro
    app.save(p3)

    // Contrato 3: Silveira Advocacia (CT-PJ-2024-003)
    let c3 = null
    try {
      c3 = app.findFirstRecordByData('contratos_pj', 'numero_contrato', 'CT-PJ-2024-003')
    } catch (_) {
      c3 = new Record(contratosCol)
    }
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

    // Nota Fiscal Silveira Advocacia
    if (notasCol) {
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
    }

    // =========================================================================
    // 5. Garantir marcos de ciclo de vida para os 3 prestadores
    // =========================================================================
    if (marcosCol) {
      const templateMarcos = {
        Entrada: [
          { chave: 'cnpj_validado', nome: 'Cadastro com CNPJ validado', ordem: 1 },
          { chave: 'contrato_assinado', nome: 'Contrato assinado pelas duas partes', ordem: 2 },
          { chave: 'documentos_aprovados', nome: 'Documentos da contratação aprovados', ordem: 3 },
          {
            chave: 'beneficios_cadastrados',
            nome: 'Benefícios e adicionais cadastrados',
            ordem: 4,
          },
        ],
        Ativo: [
          { chave: 'nf_periodo', nome: 'Nota fiscal do período', ordem: 1 },
          { chave: 'reembolso_periodo', nome: 'Reembolso do período', ordem: 2 },
          { chave: 'aprovacao_gestor', nome: 'Aprovação do gestor', ordem: 3 },
          { chave: 'pagamento_periodo', nome: 'Pagamento do período', ordem: 4 },
        ],
        Mudanças: [
          { chave: 'reajuste_alcada', nome: 'Reajuste aprovado na alçada', ordem: 1 },
          { chave: 'aditivo_contrato', nome: 'Aditivo de contrato', ordem: 2 },
          { chave: 'mudanca_escopo', nome: 'Mudança de escopo registrada', ordem: 3 },
          { chave: 'ausencias_periodo', nome: 'Ausências do período lançadas', ordem: 4 },
        ],
        Saída: [
          { chave: 'encerramento_escopo', nome: 'Encerramento de escopo/atividades', ordem: 1 },
          { chave: 'nf_final_quites', nome: 'NF final e quites', ordem: 2 },
          { chave: 'revogacao_acessos', nome: 'Devolução/revogação de acessos', ordem: 3 },
          { chave: 'termo_encerramento', nome: 'Termo de encerramento assinado', ordem: 4 },
          { chave: 'certidoes_finais', nome: 'Certidões de regularidade finais', ordem: 5 },
        ],
      }

      const seedMarcos = (prestadorRecord, statusPorChave) => {
        Object.keys(templateMarcos).forEach((etapaNome) => {
          templateMarcos[etapaNome].forEach((item) => {
            const statusConfig = statusPorChave[item.chave] || {
              status: 'NÃO ENVIADO',
              resp: null,
              obs: null,
            }

            try {
              const filter = `prestador = '${prestadorRecord.id}' && etapa = '${etapaNome}' && chave_marco = '${item.chave}'`
              const existing = app.findRecordsByFilter('marcos_lifecycle_pj', filter, '', 1, 0)
              if (!existing || existing.length === 0) {
                const marco = new Record(marcosCol)
                marco.set('prestador', prestadorRecord.id)
                marco.set('etapa', etapaNome)
                marco.set('chave_marco', item.chave)
                marco.set('nome_marco', item.nome)
                marco.set('ordem', item.ordem)
                marco.set('status', statusConfig.status)
                if (statusConfig.status === 'REGISTRADO') {
                  marco.set('data_conclusao', new Date().toISOString())
                }
                if (statusConfig.resp) marco.set('responsavel', statusConfig.resp)
                if (statusConfig.obs) marco.set('observacao', statusConfig.obs)
                marco.set(
                  'historico_auditoria',
                  JSON.stringify([
                    {
                      status: statusConfig.status,
                      data: new Date().toISOString(),
                      autor: 'Sistema RH Inteligente (Setup)',
                      obs: statusConfig.obs || 'Inicialização automática do lifecycle',
                    },
                  ]),
                )
                app.save(marco)
              }
            } catch (_) {}
          })
        })
      }

      // Nexus Cloud marcos
      seedMarcos(p1, {
        cnpj_validado: {
          status: 'REGISTRADO',
          resp: 'Validação Automática RFB',
          obs: 'CNPJ ativo e regular',
        },
        contrato_assinado: {
          status: 'REGISTRADO',
          resp: 'Jurídico Interno / Diretor',
          obs: 'Assinado digitalmente via DocuSign',
        },
        documentos_aprovados: {
          status: 'REGISTRADO',
          resp: 'Compliance RH',
          obs: 'CNDT e CRF conferidos',
        },
        beneficios_cadastrados: {
          status: 'REGISTRADO',
          resp: 'RH Operações',
          obs: 'Regime de alocação configurado',
        },
        nf_periodo: {
          status: 'PENDENTE DO PJ',
          resp: 'Nexus Cloud Financeiro',
          obs: 'Aguardando envio da NF da competência atual',
        },
        reembolso_periodo: {
          status: 'PENDENTE DA EMPRESA',
          resp: 'Controladoria Interna',
          obs: 'Conferência de despesas de infraestrutura AWS',
        },
        aprovacao_gestor: {
          status: 'REGISTRADO',
          resp: 'Douglas Severo (Gestor)',
          obs: 'Horas e entregas de sprint validadas',
        },
        pagamento_periodo: {
          status: 'NÃO ENVIADO',
          resp: 'Financeiro / Tesouraria',
          obs: 'Aguardando liquidação da NF',
        },
      })

      // Vértice Mídia marcos
      seedMarcos(p2, {
        cnpj_validado: {
          status: 'REGISTRADO',
          resp: 'Validação Automática RFB',
          obs: 'CNPJ regular',
        },
        contrato_assinado: {
          status: 'REGISTRADO',
          resp: 'Jurídico Interno',
          obs: 'Contrato principal homologado',
        },
        documentos_aprovados: {
          status: 'REGISTRADO',
          resp: 'Compliance RH',
          obs: 'Documentos admissionais PJ ok',
        },
        beneficios_cadastrados: {
          status: 'REGISTRADO',
          resp: 'RH Operações',
          obs: 'Pacote de serviços validado',
        },
        nf_periodo: { status: 'REGISTRADO', resp: 'Contabilidade', obs: 'NF-4420 lançada' },
        reembolso_periodo: {
          status: 'REGISTRADO',
          resp: 'Financeiro',
          obs: 'Sem reembolsos adicionais',
        },
        aprovacao_gestor: {
          status: 'REGISTRADO',
          resp: 'Douglas Severo',
          obs: 'Campanha de atração validada',
        },
        pagamento_periodo: {
          status: 'REGISTRADO',
          resp: 'Tesouraria',
          obs: 'Liquidação autorizada',
        },
        reajuste_alcada: {
          status: 'REGISTRADO',
          resp: 'Diretoria Executiva',
          obs: 'Reajuste anual IPCA aprovado',
        },
        aditivo_contrato: {
          status: 'PENDENTE DO PJ',
          resp: 'Camila Vasconcelos (Prestador)',
          obs: 'Aguardando assinatura do aditivo de renovação',
        },
        mudanca_escopo: {
          status: 'REGISTRADO',
          resp: 'Gestão de Pessoas',
          obs: 'Inclusão de campanhas de employer branding em vídeo',
        },
        ausencias_periodo: {
          status: 'REGISTRADO',
          resp: 'RH Operações',
          obs: 'Recesso programado registrado',
        },
      })

      // Silveira Advocacia marcos
      seedMarcos(p3, {
        cnpj_validado: {
          status: 'REGISTRADO',
          resp: 'Validação Automática RFB',
          obs: 'Sociedade de advogados inscrita na OAB/SP e CNPJ ativo',
        },
        contrato_assinado: {
          status: 'REGISTRADO',
          resp: 'Diretoria / Douglas Severo',
          obs: 'Contrato assinado pelas duas partes em 10/03/2024',
        },
        documentos_aprovados: {
          status: 'REGISTRADO',
          resp: 'Compliance & Gente',
          obs: 'Contrato social e certidões cíveis/trabalhistas arquivadas',
        },
        beneficios_cadastrados: {
          status: 'REGISTRADO',
          resp: 'RH Operações',
          obs: 'Remuneração mensal de R$ 9.800 parametrizada',
        },
      })
    }
  },
  (app) => {
    // Reverter campo valor_mensal_atual de prestadores_pj se necessário
    try {
      const col = app.findCollectionByNameOrId('prestadores_pj')
      if (col && col.fields.getByName('valor_mensal_atual')) {
        col.fields.removeByName('valor_mensal_atual')
        app.save(col)
      }
    } catch (_) {}
  },
)
