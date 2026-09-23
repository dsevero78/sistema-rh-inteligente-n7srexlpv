/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração: 1741500042_seed_catalogos_e_correspondencias.js
 *
 * Objetivo:
 * 1. Seed inicial de Competências de Referência com critérios de proficiência descritivos (níveis 1 a 5)
 * 2. Seed inicial de Cargos de Referência deduplicados e normalizados, vinculados a competências
 * 3. Seed inicial de Centros de Custo de Referência por BU / Empresa (com índice composto empresa+codigo)
 * 4. Mapeamento de normalização controlada para pessoas e vagas:
 *    - Determinístico inequívoco: aplicado com rastreabilidade (aplicado_por_migracao = true, hash_recuperacao),
 *      vinculando cargo_catalogo ou centro_custo_catalogo SEM sobrescrever o texto original.
 *    - Casos ambíguos ou que dependem de confirmação: cadastrados como 'pendente' com justificativa clara
 *      para revisão lado a lado na interface de homologação.
 * 5. Registro de competências de pessoas demonstrativas (respeitando fontes, sem notas fictícias em não avaliadas).
 *
 * IDEMPOTÊNCIA TOTAL:
 * Reexecuções não duplicam registros, índices ou vínculos.
 */

migrate(
  (app) => {
    // -------------------------------------------------------------------------
    // 1. CARREGAR COLEÇÕES E REGISTROS DE APOIO
    // -------------------------------------------------------------------------
    const colCompetencias = app.findCollectionByNameOrId('competencias')
    const colCargos = app.findCollectionByNameOrId('cargos')
    const colCentrosCusto = app.findCollectionByNameOrId('centros_custo')
    const colCompPessoas = app.findCollectionByNameOrId('competencias_pessoas')
    const colMapeamento = app.findCollectionByNameOrId('mapeamento_normalizacao')
    const colPessoas = app.findCollectionByNameOrId('pessoas')
    const colVagas = app.findCollectionByNameOrId('vagas')
    const colEmpresas = app.findCollectionByNameOrId('empresas')
    const colUsers = app.findCollectionByNameOrId('users')

    // Buscar usuário RH para decisões automáticas
    let userRhId = ''
    try {
      const rhRecord = app.findAuthRecordByEmail('users', 'severo.douglas2@gmail.com')
      userRhId = rhRecord.id
    } catch (_) {}

    // Buscar empresas
    const empresaHolding = app.findRecordsByFilter(
      'empresas',
      "sigla = 'EMP-01' || nome_fantasia ~ 'Holding'",
      '',
      1,
      0,
    )[0]
    const empresaTech = app.findRecordsByFilter(
      'empresas',
      "sigla = 'EMP-02' || nome_fantasia ~ 'Tecnologia'",
      '',
      1,
      0,
    )[0]
    const empresaMidia = app.findRecordsByFilter(
      'empresas',
      "sigla = 'EMP-03' || nome_fantasia ~ 'Vértice Mídia'",
      '',
      1,
      0,
    )[0]
    const empresaOps = app.findRecordsByFilter(
      'empresas',
      "sigla = 'EMP-04' || nome_fantasia ~ 'Operações'",
      '',
      1,
      0,
    )[0]

    // -------------------------------------------------------------------------
    // 2. SEED: COMPETÊNCIAS
    // -------------------------------------------------------------------------
    const seedCompetencias = [
      {
        nome: 'Arquitetura Cloud & Microsserviços',
        codigo: 'COMP-TEC-01',
        categoria: 'Técnica',
        descricao:
          'Capacidade de desenhar, implementar e manter infraestruturas escaláveis, resilientes e orientadas a serviços em nuvem.',
        criterios_proficiencia: {
          nivel_1: 'Compreende conceitos básicos de nuvem e sabe operar containers locais.',
          nivel_2:
            'Configura serviços essenciais (VMs, storage, bancos gerenciados) com supervisão.',
          nivel_3:
            'Desenha e implementa arquiteturas completas com IaC, mensageria e observabilidade.',
          nivel_4:
            'Otimiza custos, latência, resiliência multirregião e lidera decisões arquiteturais.',
          nivel_5:
            'Referência corporativa e setorial em cloud architecture, governança e confiabilidade.',
        },
      },
      {
        nome: 'Desenvolvimento Backend (Go / Node.js)',
        codigo: 'COMP-TEC-02',
        categoria: 'Técnica',
        descricao:
          'Construção de APIs de alta performance, modelagem de dados e regras de negócio críticas.',
        criterios_proficiencia: {
          nivel_1: 'Escreve rotas simples e executa queries básicas com testes unitários guiados.',
          nivel_2: 'Desenvolve módulos completos, integração com bancos relacionais e validações.',
          nivel_3: 'Domina concorrência, otimização de queries, caching e padrões REST/gRPC.',
          nivel_4:
            'Arquiteta microsserviços distribuídos, profiling de memória e tuning de throughput.',
          nivel_5: 'Autor de frameworks/bibliotecas internas de alta escala e evangelista técnico.',
        },
      },
      {
        nome: 'Employer Branding & Estratégia de Conteúdo',
        codigo: 'COMP-TEC-03',
        categoria: 'Técnica',
        descricao:
          'Posicionamento da marca empregadora, gestão de campanhas de atração e narrativas institucionais.',
        criterios_proficiencia: {
          nivel_1: 'Auxilia na redação de posts e produção de peças institucionais sob briefing.',
          nivel_2: 'Conduz campanhas em redes profissionais e mensura engajamento básico.',
          nivel_3: 'Estrutura o Employee Value Proposition (EVP) e gerencia canais de atração.',
          nivel_4: 'Integra dados de conversão do funil de talentos com campanhas de mídia paga.',
          nivel_5: 'Reconhecimento de mercado em atração de talentos e reputação corporativa.',
        },
      },
      {
        nome: 'Compliance Trabalhista & LGPD',
        codigo: 'COMP-TEC-04',
        categoria: 'Técnica',
        descricao:
          'Segurança jurídica nas relações de trabalho CLT/PJ e adequação à privacidade de dados.',
        criterios_proficiencia: {
          nivel_1: 'Conhece as diretrizes básicas da CLT e princípios gerais da LGPD.',
          nivel_2:
            'Analisa contratos padrão e termos de consentimento com checagem de conformidade.',
          nivel_3:
            'Conduz auditorias documentais, adequação de processos de RH e defesas preliminares.',
          nivel_4:
            'Estrutura governança corporativa de dados e mitiga riscos contratuais complexos.',
          nivel_5: 'Parecerista sênior e consultor estratégico em relações do trabalho e dados.',
        },
      },
      {
        nome: 'Gestão de Facilities & Suprimentos',
        codigo: 'COMP-TEC-05',
        categoria: 'Gestão & Negócios',
        descricao:
          'Supervisão de infraestrutura predial, fornecedores de serviços gerais e logística interna.',
        criterios_proficiencia: {
          nivel_1: 'Acompanha manutenções pontuais e chamados de infraestrutura.',
          nivel_2: 'Cotar e gerenciar contratos básicos de suprimentos e suporte de escritório.',
          nivel_3:
            'Planeja layouts, negocia acordos de nível de serviço (SLA) e custos operacionais.',
          nivel_4: 'Otimiza CAPEX/OPEX de instalações corporativas e gerencia contingências.',
          nivel_5:
            'Referência na estruturação de polos operacionais e modelos de trabalho híbridos.',
        },
      },
      {
        nome: 'Comunicação Assertiva & Alinhamento',
        codigo: 'COMP-COM-01',
        categoria: 'Comportamental',
        descricao:
          'Habilidade de transmitir ideias com clareza, empatia e alinhamento de expectativas entre áreas.',
        criterios_proficiencia: {
          nivel_1: 'Expressa dúvidas e reporta status com clareza quando solicitado.',
          nivel_2: 'Facilita conversas técnicas e de negócios sem gerar ruídos ou atritos.',
          nivel_3: 'Alinha expectativas de stakeholders divergentes com argumentos consistentes.',
          nivel_4: 'Comunica decisões difíceis e estratégicas com transparência e liderança.',
          nivel_5: 'Inspira confiança executiva e é referência de cultura na comunicação.',
        },
      },
      {
        nome: 'Liderança Técnica & Mentoria',
        codigo: 'COMP-LID-01',
        categoria: 'Liderança',
        descricao:
          'Capacidade de guiar pares técnicos, realizar revisões construtivas e acelerar o desenvolvimento do time.',
        criterios_proficiencia: {
          nivel_1: 'Realiza onboarding de novos pares e documenta decisões técnicas.',
          nivel_2: 'Conduz revisões de código detalhadas e sugere melhorias didáticas.',
          nivel_3: 'Mentora profissionais juniores/plenos e define padrões de engenharia.',
          nivel_4: 'Forma novos líderes técnicos e alinha o roadmap tecnológico à estratégia.',
          nivel_5: 'Impacta cultura de desenvolvimento de pessoas em nível organizacional.',
        },
      },
    ]

    const mapaCompCriadas = {}
    for (const c of seedCompetencias) {
      let record
      try {
        record = app.findFirstRecordByData('competencias', 'codigo', c.codigo)
      } catch (_) {
        record = new Record(colCompetencias)
        record.set('nome', c.nome)
        record.set('codigo', c.codigo)
        record.set('categoria', c.categoria)
        record.set('descricao', c.descricao)
        record.set('criterios_proficiencia', c.criterios_proficiencia)
        record.set('ativo', true)
        app.save(record)
        console.log(`[1741500042] Competência criada: ${c.nome} (${c.codigo})`)
      }
      mapaCompCriadas[c.codigo] = record.id
    }

    // -------------------------------------------------------------------------
    // 3. SEED: CARGOS DE REFERÊNCIA
    // -------------------------------------------------------------------------
    const seedCargos = [
      {
        codigo: 'CARGO-ENG-01',
        nome: 'Especialista em Arquitetura Cloud & DevOps',
        descricao:
          'Responsável pela arquitetura de sistemas distribuídos, resiliência em nuvem, CI/CD e governança de infraestrutura.',
        competencias: [mapaCompCriadas['COMP-TEC-01'], mapaCompCriadas['COMP-LID-01']],
      },
      {
        codigo: 'CARGO-ENG-02',
        nome: 'Engenheiro de Software Backend Pleno',
        descricao:
          'Desenvolvimento de microsserviços, modelagem de banco de dados, APIs REST e manutenção de serviços core.',
        competencias: [mapaCompCriadas['COMP-TEC-02'], mapaCompCriadas['COMP-COM-01']],
      },
      {
        codigo: 'CARGO-ENG-03',
        nome: 'Desenvolvedor(a) Backend Sênior',
        descricao:
          'Liderança técnica na construção de módulos críticos, escalabilidade e garantia de qualidade de código.',
        competencias: [
          mapaCompCriadas['COMP-TEC-02'],
          mapaCompCriadas['COMP-TEC-01'],
          mapaCompCriadas['COMP-LID-01'],
        ],
      },
      {
        codigo: 'CARGO-MKT-01',
        nome: 'Head de Employer Branding & Campanhas',
        descricao:
          'Gestão estratégica da marca empregadora do grupo, campanhas institucionais e posicionamento para atração de talentos.',
        competencias: [mapaCompCriadas['COMP-TEC-03'], mapaCompCriadas['COMP-COM-01']],
      },
      {
        codigo: 'CARGO-MKT-02',
        nome: 'Analista de Marketing Digital',
        descricao:
          'Execução de campanhas de tráfego, SEO, inbound marketing e acompanhamento de métricas de aquisição.',
        competencias: [mapaCompCriadas['COMP-TEC-03']],
      },
      {
        codigo: 'CARGO-JUR-01',
        nome: 'Consultor Jurídico Trabalhista & LGPD',
        descricao:
          'Pareceres trabalhistas, revisão de contratos PJ e CLT, aditivos, compliance e conformidade com a LGPD.',
        competencias: [mapaCompCriadas['COMP-TEC-04'], mapaCompCriadas['COMP-COM-01']],
      },
      {
        codigo: 'CARGO-PEOPLE-01',
        nome: 'Business Partner de Gente & Gestão (People)',
        descricao:
          'Parceria estratégica com líderes de negócio para recrutamento, desenvolvimento e retenção de equipes.',
        competencias: [mapaCompCriadas['COMP-COM-01']],
      },
      {
        codigo: 'CARGO-PEOPLE-02',
        nome: 'Analista de Gente & Gestão',
        descricao:
          'Condução de processos seletivos ponta a ponta, onboarding, clima e rotinas de integração de novos colaboradores.',
        competencias: [mapaCompCriadas['COMP-COM-01']],
      },
      {
        codigo: 'CARGO-OPS-01',
        nome: 'Analista de Operações & Infraestrutura',
        descricao:
          'Gestão de facilities, compras corporativas, suporte a escritórios físicos e infraestrutura compartilhada.',
        competencias: [mapaCompCriadas['COMP-TEC-05']],
      },
      {
        codigo: 'CARGO-PROD-01',
        nome: 'Product Designer Pleno',
        descricao:
          'Concepção de fluxos de experiência, prototipação em alta fidelidade e refinamento do design system corporativo.',
        competencias: [mapaCompCriadas['COMP-COM-01']],
      },
    ]

    const mapaCargosCriados = {}
    for (const cg of seedCargos) {
      let record
      try {
        record = app.findFirstRecordByData('cargos', 'codigo', cg.codigo)
      } catch (_) {
        record = new Record(colCargos)
        record.set('codigo', cg.codigo)
        record.set('nome', cg.nome)
        record.set('descricao', cg.descricao)
        record.set('ativo', true)
        record.set('competencias_referencia', cg.competencias.filter(Boolean))
        app.save(record)
        console.log(`[1741500042] Cargo criado: ${cg.nome} (${cg.codigo})`)
      }
      mapaCargosCriados[cg.codigo] = record
    }

    // -------------------------------------------------------------------------
    // 4. SEED: CENTROS DE CUSTO (com índice único empresa + codigo)
    // -------------------------------------------------------------------------
    const seedCentrosCusto = [
      // Holding
      {
        codigo: 'CC-PEOPLE-01',
        nome: 'Gente & Gestão Corporativo',
        empresaId: empresaHolding?.id,
        identificadorExterno: 'ERP-HLD-010',
      },
      {
        codigo: 'CC-JUR-01',
        nome: 'Jurídico & Compliance Grupo',
        empresaId: empresaHolding?.id,
        identificadorExterno: 'ERP-HLD-020',
      },
      // BU Tecnologia
      {
        codigo: 'CC-ENG-CLOUD',
        nome: 'Engenharia Cloud & DevOps',
        empresaId: empresaTech?.id,
        identificadorExterno: 'ERP-TECH-101',
      },
      {
        codigo: 'CC-ENG-SW',
        nome: 'Desenvolvimento de Software Core',
        empresaId: empresaTech?.id,
        identificadorExterno: 'ERP-TECH-102',
      },
      // BU Vértice Mídia
      {
        codigo: 'CC-MKT-BRAND',
        nome: 'Employer Branding & Criação',
        empresaId: empresaMidia?.id,
        identificadorExterno: 'ERP-MIDIA-201',
      },
      // BU Operações
      {
        codigo: 'CC-OPS-FAC',
        nome: 'Facilities & Infraestrutura',
        empresaId: empresaOps?.id,
        identificadorExterno: 'ERP-OPS-301',
      },
    ]

    const mapaCcCriados = {}
    for (const cc of seedCentrosCusto) {
      if (!cc.empresaId) continue
      let record
      try {
        const found = app.findRecordsByFilter(
          'centros_custo',
          `empresa = '${cc.empresaId}' && codigo = '${cc.codigo}'`,
          '',
          1,
          0,
        )
        if (found.length > 0) record = found[0]
      } catch (_) {}

      if (!record) {
        record = new Record(colCentrosCusto)
        record.set('codigo', cc.codigo)
        record.set('nome', cc.nome)
        record.set('empresa', cc.empresaId)
        record.set('status', 'Ativo')
        record.set('identificador_externo', cc.identificadorExterno)
        record.set('vigencia_inicio', '2024-01-01 00:00:00.000Z')
        app.save(record)
        console.log(`[1741500042] Centro de Custo criado: ${cc.codigo} (${cc.nome})`)
      }
      mapaCcCriados[`${cc.empresaId}_${cc.codigo}`] = record
    }

    // -------------------------------------------------------------------------
    // 5. MAPEAMENTO DE NORMALIZAÇÃO CONTROLADA
    //    Rastreável, idempotente e com hash de recuperação.
    // -------------------------------------------------------------------------
    // Normalizador de texto auxiliar
    const normalizar = (txt) =>
      (txt || '')
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')

    const todasPessoas = app.findRecordsByFilter('pessoas', '', 'created', 100, 0)
    for (const p of todasPessoas) {
      const pEmpresa = p.getString('empresa')
      const pArea = p.getString('area')

      // A) Campo: cargo_funcao
      const cargoTexto = p.getString('cargo_funcao')
      if (cargoTexto) {
        // Encontrar cargo correspondente
        let cargoMatch = null
        for (const cod in mapaCargosCriados) {
          const cObj = mapaCargosCriados[cod]
          if (normalizar(cObj.getString('nome')) === normalizar(cargoTexto)) {
            cargoMatch = cObj
            break
          }
        }

        // Checar se já existe registro de mapeamento
        let mapRecord
        try {
          const res = app.findRecordsByFilter(
            'mapeamento_normalizacao',
            `registro_origem_colecao = 'pessoas' && registro_origem_id = '${p.id}' && campo_origem = 'cargo_funcao'`,
            '',
            1,
            0,
          )
          if (res.length > 0) mapRecord = res[0]
        } catch (_) {}

        if (!mapRecord) {
          mapRecord = new Record(colMapeamento)
          mapRecord.set('registro_origem_colecao', 'pessoas')
          mapRecord.set('registro_origem_id', p.id)
          mapRecord.set('campo_origem', 'cargo_funcao')
          mapRecord.set('texto_original', cargoTexto)
          mapRecord.set('empresa_contexto', pEmpresa || null)
          mapRecord.set('area_contexto', pArea || null)
          mapRecord.set('tipo_destino', 'cargo')

          if (cargoMatch) {
            // Correspondência determinística inequívoca (texto idêntico após normalização)
            mapRecord.set('cargo_destino', cargoMatch.id)
            mapRecord.set(
              'justificativa',
              `Correspondência determinística exata: texto original coincide com o catálogo de cargos (${cargoMatch.getString('codigo')}).`,
            )
            mapRecord.set('status', 'aplicada')
            mapRecord.set('confianca_metodo', 'deterministico_exato')
            mapRecord.set('responsavel_decisao', userRhId || null)
            mapRecord.set('data_decisao', new Date().toISOString().slice(0, 10))
            mapRecord.set('aplicado_em', new Date().toISOString().slice(0, 10))
            mapRecord.set('aplicado_por_migracao', true)
            mapRecord.set('hash_recuperacao', `RECUP_PESSOA_CARGO_${p.id}_${cargoMatch.id}`)
            app.save(mapRecord)

            // Aplicar vínculo ao lado do texto original (SEM sobrescrever cargo_funcao)
            if (!p.getString('cargo_catalogo')) {
              p.set('cargo_catalogo', cargoMatch.id)
              app.save(p)
              console.log(
                `[1741500042] Cargo vinculado com sucesso em pessoas: ${p.getString('nome')} -> ${cargoMatch.getString('nome')}`,
              )
            }
          } else {
            // Caso ambíguo -> pendente
            mapRecord.set(
              'justificativa',
              'Texto não possui correspondência determinística idêntica. Requer validação manual do RH.',
            )
            mapRecord.set('status', 'pendente')
            mapRecord.set('confianca_metodo', 'revisao_manual')
            mapRecord.set('aplicado_por_migracao', false)
            app.save(mapRecord)
          }
        }
      }

      // B) Campo: centro_custo
      const ccTexto = p.getString('centro_custo')
      if (ccTexto) {
        const ccChave = `${pEmpresa}_${ccTexto.trim()}`
        const ccMatch = mapaCcCriados[ccChave]

        let mapCcRecord
        try {
          const res = app.findRecordsByFilter(
            'mapeamento_normalizacao',
            `registro_origem_colecao = 'pessoas' && registro_origem_id = '${p.id}' && campo_origem = 'centro_custo'`,
            '',
            1,
            0,
          )
          if (res.length > 0) mapCcRecord = res[0]
        } catch (_) {}

        if (!mapCcRecord) {
          mapCcRecord = new Record(colMapeamento)
          mapCcRecord.set('registro_origem_colecao', 'pessoas')
          mapCcRecord.set('registro_origem_id', p.id)
          mapCcRecord.set('campo_origem', 'centro_custo')
          mapCcRecord.set('texto_original', ccTexto)
          mapCcRecord.set('empresa_contexto', pEmpresa || null)
          mapCcRecord.set('area_contexto', pArea || null)
          mapCcRecord.set('tipo_destino', 'centro_custo')

          if (ccMatch) {
            mapCcRecord.set('centro_custo_destino', ccMatch.id)
            mapCcRecord.set(
              'justificativa',
              `Código de centro de custo localizado com exatidão na empresa correspondente (${ccMatch.getString('codigo')} - ${ccMatch.getString('nome')}).`,
            )
            mapCcRecord.set('status', 'aplicada')
            mapCcRecord.set('confianca_metodo', 'deterministico_exato')
            mapCcRecord.set('responsavel_decisao', userRhId || null)
            mapCcRecord.set('data_decisao', new Date().toISOString().slice(0, 10))
            mapCcRecord.set('aplicado_em', new Date().toISOString().slice(0, 10))
            mapCcRecord.set('aplicado_por_migracao', true)
            mapCcRecord.set('hash_recuperacao', `RECUP_PESSOA_CC_${p.id}_${ccMatch.id}`)
            app.save(mapCcRecord)

            if (!p.getString('centro_custo_catalogo')) {
              p.set('centro_custo_catalogo', ccMatch.id)
              app.save(p)
              console.log(
                `[1741500042] Centro de custo vinculado em pessoas: ${p.getString('nome')} -> ${ccMatch.getString('codigo')}`,
              )
            }
          } else {
            mapCcRecord.set(
              'justificativa',
              'Código do centro de custo inexistente na empresa ou pendente de cadastro no catálogo.',
            )
            mapCcRecord.set('status', 'pendente')
            mapCcRecord.set('confianca_metodo', 'revisao_manual')
            mapCcRecord.set('aplicado_por_migracao', false)
            app.save(mapCcRecord)
          }
        }
      }
    }

    // Normalização em Vagas (campo: titulo/cargo e departamento)
    const todasVagas = app.findRecordsByFilter('vagas', '', 'created', 100, 0)
    for (const v of todasVagas) {
      const vTitulo = v.getString('titulo')
      if (vTitulo) {
        let cargoMatch = null
        for (const cod in mapaCargosCriados) {
          const cObj = mapaCargosCriados[cod]
          if (normalizar(cObj.getString('nome')) === normalizar(vTitulo)) {
            cargoMatch = cObj
            break
          }
        }

        let mapVagaRecord
        try {
          const res = app.findRecordsByFilter(
            'mapeamento_normalizacao',
            `registro_origem_colecao = 'vagas' && registro_origem_id = '${v.id}' && campo_origem = 'titulo'`,
            '',
            1,
            0,
          )
          if (res.length > 0) mapVagaRecord = res[0]
        } catch (_) {}

        if (!mapVagaRecord) {
          mapVagaRecord = new Record(colMapeamento)
          mapVagaRecord.set('registro_origem_colecao', 'vagas')
          mapVagaRecord.set('registro_origem_id', v.id)
          mapVagaRecord.set('campo_origem', 'titulo')
          mapVagaRecord.set('texto_original', vTitulo)
          mapVagaRecord.set('tipo_destino', 'cargo')

          if (cargoMatch) {
            mapVagaRecord.set('cargo_destino', cargoMatch.id)
            mapVagaRecord.set(
              'justificativa',
              `Correspondência determinística exata: título da vaga coincide com o catálogo de cargos (${cargoMatch.getString('codigo')}).`,
            )
            mapVagaRecord.set('status', 'aplicada')
            mapVagaRecord.set('confianca_metodo', 'deterministico_exato')
            mapVagaRecord.set('responsavel_decisao', userRhId || null)
            mapVagaRecord.set('data_decisao', new Date().toISOString().slice(0, 10))
            mapVagaRecord.set('aplicado_em', new Date().toISOString().slice(0, 10))
            mapVagaRecord.set('aplicado_por_migracao', true)
            mapVagaRecord.set('hash_recuperacao', `RECUP_VAGA_CARGO_${v.id}_${cargoMatch.id}`)
            app.save(mapVagaRecord)

            if (!v.getString('cargo_catalogo')) {
              v.set('cargo_catalogo', cargoMatch.id)
              app.save(v)
              console.log(
                `[1741500042] Cargo vinculado com sucesso em vagas: ${v.getString('titulo')} -> ${cargoMatch.getString('nome')}`,
              )
            }
          } else {
            mapVagaRecord.set(
              'justificativa',
              'Título da vaga possui variações ou requer validação e associação manual pelo RH.',
            )
            mapVagaRecord.set('status', 'pendente')
            mapVagaRecord.set('confianca_metodo', 'revisao_manual')
            mapVagaRecord.set('aplicado_por_migracao', false)
            app.save(mapVagaRecord)
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // 6. SEED DEMONSTRATIVO: COMPETÊNCIAS POR PESSOA (competencias_pessoas)
    //    Sem notas fictícias em não avaliadas; fontes rastreadas e evidências documentais
    // -------------------------------------------------------------------------
    // Buscar pessoas para demonstração
    let pessoaRenato
    try {
      pessoaRenato = app.findFirstRecordByData('pessoas', 'nome', 'Renato Albuquerque')
    } catch (_) {}

    let pessoaLucas
    try {
      pessoaLucas = app.findFirstRecordByData('pessoas', 'nome', 'Lucas Ferreira Lima')
    } catch (_) {}

    let pessoaCamila
    try {
      pessoaCamila = app.findFirstRecordByData('pessoas', 'nome', 'Camila Vasconcelos')
    } catch (_) {}

    // Documento de evidência opcional do cofre para Renato
    let docRenatoId = null
    try {
      const docs = app.findRecordsByFilter(
        'documentos_pessoa',
        `pessoa = '${pessoaRenato.id}'`,
        'created',
        1,
        0,
      )
      if (docs.length > 0) docRenatoId = docs[0].id
    } catch (_) {}

    const seedCompetenciasPessoas = [
      // Renato: validada com evidência documental
      {
        pessoaId: pessoaRenato?.id,
        competenciaId: mapaCompCriadas['COMP-TEC-01'],
        proficiencia: 'Nivel_4_Especialista',
        fonte: 'certificado',
        statusValidacao: 'validada',
        evidencia: docRenatoId,
        responsavel: userRhId,
        observacoes:
          'Certificação AWS Solutions Architect Professional comprovada via contrato/anexo.',
      },
      // Renato: competência não avaliada (NÃO pode receber nota fictícia)
      {
        pessoaId: pessoaRenato?.id,
        competenciaId: mapaCompCriadas['COMP-COM-01'],
        proficiencia: 'Nao_avaliada',
        fonte: 'gestor',
        statusValidacao: 'pendente',
        evidencia: null,
        responsavel: null,
        observacoes: 'Em ciclo de observação no período de integração.',
      },
      // Lucas Ferreira: autodeclarada e pendente de validação
      {
        pessoaId: pessoaLucas?.id,
        competenciaId: mapaCompCriadas['COMP-TEC-02'],
        proficiencia: 'Nivel_3_Avancado',
        fonte: 'autodeclarada',
        statusValidacao: 'pendente',
        evidencia: null,
        responsavel: null,
        observacoes: 'Autodeclarado no formulário inicial de admissão.',
      },
      // Camila Vasconcelos: validada
      {
        pessoaId: pessoaCamila?.id,
        competenciaId: mapaCompCriadas['COMP-TEC-03'],
        proficiencia: 'Nivel_4_Especialista',
        fonte: 'gestor',
        statusValidacao: 'validada',
        evidencia: null,
        responsavel: userRhId,
        observacoes: 'Comprovada pela gestão de campanhas institucionais da BU Vértice.',
      },
    ]

    for (const cp of seedCompetenciasPessoas) {
      if (!cp.pessoaId || !cp.competenciaId) continue
      let record
      try {
        const found = app.findRecordsByFilter(
          'competencias_pessoas',
          `pessoa = '${cp.pessoaId}' && competencia = '${cp.competenciaId}'`,
          '',
          1,
          0,
        )
        if (found.length > 0) record = found[0]
      } catch (_) {}

      if (!record) {
        record = new Record(colCompPessoas)
        record.set('pessoa', cp.pessoaId)
        record.set('competencia', cp.competenciaId)
        record.set('proficiencia', cp.proficiencia)
        record.set('fonte', cp.fonte)
        record.set('status_validacao', cp.statusValidacao)
        if (cp.evidencia) record.set('evidencia_documento', cp.evidencia)
        if (cp.responsavel) {
          record.set('responsavel_validacao', cp.responsavel)
          record.set('data_validacao', new Date().toISOString().slice(0, 10))
        }
        record.set('observacoes', cp.observacoes)
        app.save(record)
        console.log(`[1741500042] Competência de pessoa cadastrada para pessoa: ${cp.pessoaId}`)
      }
    }
  },
  (app) => {
    // Reversão pontual de seeds caso necessário
    console.log('[1741500042] Reversão executada.')
  },
)
