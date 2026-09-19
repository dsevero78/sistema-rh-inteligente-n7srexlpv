/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Seed admin user severo.douglas2@gmail.com
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    let adminUserId = ''
    try {
      const existing = app.findAuthRecordByEmail('_pb_users_auth_', 'severo.douglas2@gmail.com')
      adminUserId = existing.id
    } catch (_) {
      const admin = new Record(users)
      admin.setEmail('severo.douglas2@gmail.com')
      admin.setPassword('Skip@Pass')
      admin.setVerified(true)
      admin.set('name', 'Douglas Severo (Gente & Gestão)')
      app.save(admin)
      adminUserId = admin.id
    }

    // 2. Seed 4 vagas
    const vagasCol = app.findCollectionByNameOrId('vagas')
    const candidatosCol = app.findCollectionByNameOrId('candidatos')
    const pipelineCol = app.findCollectionByNameOrId('pipeline')

    const vagasData = [
      {
        titulo: 'Desenvolvedor(a) Backend Sênior',
        departamento: 'Tecnologia',
        localizacao: 'São Paulo, SP (Brasil)',
        modalidade: 'Remoto',
        faixa_salarial: 'R$ 15.000 - R$ 18.000',
        descricao:
          'Buscamos profissional sênior para desenhar e escalar microsserviços em Go/Node.js, liderar arquitetura de dados e garantir alta disponibilidade do sistema de RH e plataformas corporativas.',
        requisitos_obrigatorios: [
          '5+ anos de experiência com Backend (Node.js/TypeScript ou Go)',
          'Arquitetura orientada a microsserviços e mensageria',
          'Experiência sólida com bancos relacionais (PostgreSQL/SQLite) e caching (Redis)',
        ],
        requisitos_desejaveis: [
          'Vivência com Kubernetes e Docker',
          'Familiaridade com IA generativa e RAG',
          'Conhecimento de mensageria com RabbitMQ ou Kafka',
        ],
        habilidades_tecnicas: [
          { nome: 'Node.js', peso: 5 },
          { nome: 'TypeScript', peso: 5 },
          { nome: 'Go', peso: 4 },
          { nome: 'PostgreSQL', peso: 4 },
          { nome: 'Docker', peso: 3 },
          { nome: 'Kubernetes', peso: 3 },
        ],
        competencias_comportamentais: [
          'Liderança técnica',
          'Resolução de problemas',
          'Comunicação assertiva',
          'Autonomia',
        ],
        status: 'Ativa',
      },
      {
        titulo: 'Analista de Marketing Digital',
        departamento: 'Marketing',
        localizacao: 'São Paulo, SP',
        modalidade: 'Presencial',
        faixa_salarial: 'R$ 6.500 - R$ 8.000',
        descricao:
          'Responsável pelo planejamento e execução de campanhas de tráfego pago, SEO e inbound marketing, além de mensurar métricas de aquisição de novos clientes para produtos digitais.',
        requisitos_obrigatorios: [
          '3+ anos em marketing de performance ou growth',
          'Domínio de Google Ads, Meta Ads e Google Analytics 4',
          'Análise de funil de conversão e métricas de ROI/ROAS',
        ],
        requisitos_desejaveis: [
          'Conhecimento de ferramentas de automação (Hubspot ou RD Station)',
          'Noções de design para testes de criativos',
          'Experiência com SEO técnico',
        ],
        habilidades_tecnicas: [
          { nome: 'Google Ads', peso: 5 },
          { nome: 'Meta Ads', peso: 5 },
          { nome: 'GA4', peso: 4 },
          { nome: 'SEO', peso: 3 },
          { nome: 'Copywriting', peso: 3 },
        ],
        competencias_comportamentais: [
          'Orientação a resultados',
          'Pensamento analítico',
          'Criatividade',
          'Agilidade',
        ],
        status: 'Ativa',
      },
      {
        titulo: 'Product Designer Pleno',
        departamento: 'Produto',
        localizacao: 'São Paulo, SP',
        modalidade: 'Híbrido',
        faixa_salarial: 'R$ 9.000 - R$ 12.000',
        descricao:
          'Atuará no ciclo de descoberta e entrega de soluções centradas no usuário, desenhando fluxos intuitivos, protótipos de alta fidelidade e refinando o design system executivo da organização.',
        requisitos_obrigatorios: [
          '3+ anos de experiência em Product Design (UX/UI)',
          'Domínio avançado de Figma, prototipação e Design Tokens',
          'Capacidade de conduzir pesquisas com usuários e testes de usabilidade',
        ],
        requisitos_desejaveis: [
          'Conhecimento básico de HTML/CSS/Tailwind',
          'Experiência em plataformas B2B SaaS',
          'Criação e manutenção de Design Systems complexos',
        ],
        habilidades_tecnicas: [
          { nome: 'Figma', peso: 5 },
          { nome: 'UX Research', peso: 4 },
          { nome: 'Design System', peso: 5 },
          { nome: 'Prototipação', peso: 4 },
          { nome: 'Métricas de UX', peso: 3 },
        ],
        competencias_comportamentais: [
          'Empatia com o usuário',
          'Colaboração multidisciplinar',
          'Atenção a detalhes',
          'Senso estético apurado',
        ],
        status: 'Ativa',
      },
      {
        titulo: 'Analista de Gente & Gestão',
        departamento: 'Recursos Humanos',
        localizacao: 'São Paulo, SP',
        modalidade: 'Híbrido',
        faixa_salarial: 'R$ 7.000 - R$ 9.000',
        descricao:
          'Responsável pela condução de processos seletivos estratégicos ponta a ponta, integração de novos colaboradores, acompanhamento de ciclo de desenvolvimento e fortalecimento da cultura interna.',
        requisitos_obrigatorios: [
          'Experiência comprovada em R&S para vagas de negócio e tech',
          'Conhecimento de entrevistas por competência',
          'Gestão de indicadores de atração e retenção (Time to Hire, turnover)',
        ],
        requisitos_desejaveis: [
          'Uso de IA aplicada a RH e People Analytics',
          'Vivência em clima organizacional e onboarding',
          'Formação em Psicologia ou Recursos Humanos',
        ],
        habilidades_tecnicas: [
          { nome: 'R&S Ponta a Ponta', peso: 5 },
          { nome: 'Entrevista por Competências', peso: 5 },
          { nome: 'People Analytics', peso: 4 },
          { nome: 'Onboarding', peso: 4 },
          { nome: 'Legislação Trabalhista', peso: 3 },
        ],
        competencias_comportamentais: [
          'Inteligência emocional',
          'Comunicação interpessoal',
          'Organização',
          'Confidencialidade e ética',
        ],
        status: 'Ativa',
      },
    ]

    const vagaRecords = []
    for (let i = 0; i < vagasData.length; i++) {
      const item = vagasData[i]
      let rec
      try {
        rec = app.findFirstRecordByData('vagas', 'titulo', item.titulo)
      } catch (_) {
        rec = new Record(vagasCol)
        rec.set('titulo', item.titulo)
        rec.set('departamento', item.departamento)
        rec.set('localizacao', item.localizacao)
        rec.set('modalidade', item.modalidade)
        rec.set('faixa_salarial', item.faixa_salarial)
        rec.set('descricao', item.descricao)
        rec.set('requisitos_obrigatorios', item.requisitos_obrigatorios)
        rec.set('requisitos_desejaveis', item.requisitos_desejaveis)
        rec.set('habilidades_tecnicas', item.habilidades_tecnicas)
        rec.set('competencias_comportamentais', item.competencias_comportamentais)
        rec.set('status', item.status)
        app.save(rec)
      }
      vagaRecords.push(rec)
    }

    // 3. Seed 6 candidatos realistas
    const candidatosData = [
      {
        nome: 'Lucas Ferreira Lima',
        email: 'lucas.ferreira@exemplo.com',
        telefone: '(11) 98765-4321',
        cargo_atual: 'Engenheiro de Software Backend Pleno',
        empresa_atual: 'FinTech Soluções',
        localizacao: 'São Paulo, SP',
        vagaIndex: 0, // Dev Backend Sênior
        linkedin: 'https://linkedin.com/in/lucas-ferreira-backend',
        github: 'https://github.com/lucasf-dev',
        resumo:
          'Engenheiro backend com 6 anos de experiência focado em TypeScript, Node.js e Go. Atuou na migração de monolito para microsserviços em ambiente AWS com Docker e Kubernetes, lidando com mais de 30 milhões de requisições diárias.',
        habilidades_tecnicas: [
          'Node.js',
          'TypeScript',
          'Go',
          'PostgreSQL',
          'Docker',
          'Redis',
          'Kafka',
          'AWS',
        ],
        competencias_comportamentais: [
          'Liderança técnica',
          'Resolução de problemas',
          'Autonomia',
          'Trabalho em equipe',
        ],
        experiencias: [
          {
            cargo: 'Engenheiro de Software Backend',
            empresa: 'FinTech Soluções',
            periodo: '2021 - Presente',
            descricao:
              'Desenvolvimento de APIs em Go e Node.js para pagamentos instantâneos. Redução de latência em 40% com cache distribuído.',
          },
          {
            cargo: 'Desenvolvedor Backend',
            empresa: 'LogTech Brasil',
            periodo: '2018 - 2021',
            descricao:
              'Construção de integrações com parceiros logísticos usando Node.js e PostgreSQL.',
          },
        ],
        educacao: [
          {
            instituicao: 'USP - Universidade de São Paulo',
            curso: 'Ciência da Computação',
            periodo: '2014 - 2018',
          },
        ],
        idiomas: ['Português (Nativo)', 'Inglês (Avançado)'],
        status: 'Entrevista técnica',
        score_semantico: 88,
      },
      {
        nome: 'Camila Ribeiro Santos',
        email: 'camila.ribeiro@exemplo.com',
        telefone: '(11) 97654-3210',
        cargo_atual: 'Product Designer Sênior',
        empresa_atual: 'SaaS Corporativo',
        localizacao: 'Campinas, SP',
        vagaIndex: 2, // Product Designer Pleno
        linkedin: 'https://linkedin.com/in/camilaribeiro-design',
        github: '',
        resumo:
          'Designer de produto apaixonada por resolver fluxos complexos em B2B. Liderou a reestruturação completa do Design System da empresa atual e coordenou ciclos quinzenais de descoberta de produto e usabilidade.',
        habilidades_tecnicas: [
          'Figma',
          'Design System',
          'UX Research',
          'Prototipação',
          'Design Tokens',
          'Wireframing',
        ],
        competencias_comportamentais: [
          'Empatia com o usuário',
          'Colaboração multidisciplinar',
          'Atenção a detalhes',
          'Comunicação visual',
        ],
        experiencias: [
          {
            cargo: 'Product Designer Sênior',
            empresa: 'SaaS Corporativo',
            periodo: '2022 - Presente',
            descricao:
              'Design de módulos financeiros B2B, testes de usabilidade e liderança do comitê de acessibilidade.',
          },
          {
            cargo: 'UI/UX Designer',
            empresa: 'Agência Digital XP',
            periodo: '2019 - 2022',
            descricao: 'Criação de interfaces para portais e aplicativos móveis.',
          },
        ],
        educacao: [
          { instituicao: 'Belas Artes SP', curso: 'Design Digital', periodo: '2015 - 2019' },
        ],
        idiomas: ['Português (Nativo)', 'Inglês (Intermediário)'],
        status: 'Match técnico/comportamental (IA)',
        score_semantico: 92,
      },
      {
        nome: 'Renato Albuquerque',
        email: 'renato.albuquerque@exemplo.com',
        telefone: '(21) 99876-5432',
        cargo_atual: 'Coordenador de Performance',
        empresa_atual: 'E-commerce Varejo',
        localizacao: 'Rio de Janeiro, RJ',
        vagaIndex: 1, // Analista de Marketing Digital
        linkedin: 'https://linkedin.com/in/renato-marketing-growth',
        github: '',
        resumo:
          'Especialista em marketing digital e performance com foco em ROI. Gerenciou orçamentos mensais superiores a R$ 200k em Google Ads e Meta Ads, aumentando a taxa de conversão do funil de aquisição em 35%.',
        habilidades_tecnicas: [
          'Google Ads',
          'Meta Ads',
          'GA4',
          'SEO',
          'Copywriting',
          'Looker Studio',
          'RD Station',
        ],
        competencias_comportamentais: [
          'Orientação a resultados',
          'Pensamento analítico',
          'Agilidade',
          'Negociação',
        ],
        experiencias: [
          {
            cargo: 'Coordenador de Performance',
            empresa: 'E-commerce Varejo',
            periodo: '2021 - Presente',
            descricao: 'Gestão direta de canais de tráfego pago e métricas de ROAS.',
          },
          {
            cargo: 'Analista de Growth',
            empresa: 'Startup de Saúde',
            periodo: '2019 - 2021',
            descricao: 'Testes A/B e otimização de páginas de captura.',
          },
        ],
        educacao: [
          {
            instituicao: 'UFRJ',
            curso: 'Comunicação Social - Publicidade',
            periodo: '2014 - 2018',
          },
        ],
        idiomas: ['Português (Nativo)', 'Espanhol (Intermediário)'],
        status: 'Entrevista com RH',
        score_semantico: 84,
      },
      {
        nome: 'Juliana Mendes Castro',
        email: 'juliana.mendes@exemplo.com',
        telefone: '(11) 98123-4567',
        cargo_atual: 'Business Partner de RH',
        empresa_atual: 'Consultoria Global',
        localizacao: 'São Paulo, SP',
        vagaIndex: 3, // Analista de Gente & Gestão
        linkedin: 'https://linkedin.com/in/juliana-mendes-rh',
        github: '',
        resumo:
          'Profissional de Gente & Gestão com 5 anos de experiência conduzindo atração e seleção estratégica, programas de estágio e trainees, além de diagnósticos de clima organizacional e planos de retenção.',
        habilidades_tecnicas: [
          'R&S Ponta a Ponta',
          'Entrevista por Competências',
          'People Analytics',
          'Onboarding',
          'Avaliação de Desempenho',
        ],
        competencias_comportamentais: [
          'Inteligência emocional',
          'Comunicação interpessoal',
          'Organização',
          'Confidencialidade e ética',
        ],
        experiencias: [
          {
            cargo: 'Business Partner Jr',
            empresa: 'Consultoria Global',
            periodo: '2021 - Presente',
            descricao:
              'Suporte a lideranças em gestão de pessoas, recrutamento para áreas executivas e onboarding integrado.',
          },
          {
            cargo: 'Analista de R&S',
            empresa: 'RecrutaTech',
            periodo: '2019 - 2021',
            descricao: 'Triagem, entrevistas comportamentais e hunting de perfis de tecnologia.',
          },
        ],
        educacao: [
          { instituicao: 'PUC-SP', curso: 'Psicologia Organizacional', periodo: '2014 - 2019' },
        ],
        idiomas: ['Português (Nativo)', 'Inglês (Avançado)'],
        status: 'Proposta',
        score_semantico: 90,
      },
      {
        nome: 'Gabriel Souza Nogueira',
        email: 'gabriel.nogueira@exemplo.com',
        telefone: '(31) 98712-3456',
        cargo_atual: 'Desenvolvedor Backend Pleno',
        empresa_atual: 'Software House Alfa',
        localizacao: 'Belo Horizonte, MG',
        vagaIndex: 0, // Dev Backend Sênior
        linkedin: 'https://linkedin.com/in/gabriel-snogueira',
        github: 'https://github.com/gnogueira',
        resumo:
          'Desenvolvedor focado em ecossistema JavaScript/TypeScript, construindo APIs RESTful e GraphQL com Node.js e Docker. Experiência intermediária em mensageria e bancos NoSQL e relacionais.',
        habilidades_tecnicas: [
          'Node.js',
          'TypeScript',
          'PostgreSQL',
          'Docker',
          'MongoDB',
          'Express',
          'REST APIs',
        ],
        competencias_comportamentais: [
          'Trabalho em equipe',
          'Vontade de aprender',
          'Resolução de problemas',
          'Boa comunicação',
        ],
        experiencias: [
          {
            cargo: 'Desenvolvedor Backend Pleno',
            empresa: 'Software House Alfa',
            periodo: '2022 - Presente',
            descricao:
              'Desenvolvimento de microsserviços para clientes corporativos usando NestJS e PostgreSQL.',
          },
          {
            cargo: 'Desenvolvedor Júnior',
            empresa: 'Tech Júnior',
            periodo: '2020 - 2022',
            descricao: 'Manutenção de APIs legadas e criação de scripts de migração.',
          },
        ],
        educacao: [
          { instituicao: 'UFMG', curso: 'Sistemas de Informação', periodo: '2017 - 2021' },
        ],
        idiomas: ['Português (Nativo)', 'Inglês (Intermediário)'],
        status: 'Triagem',
        score_semantico: 73,
      },
      {
        nome: 'Mariana Prado Duarte',
        email: 'mariana.prado@exemplo.com',
        telefone: '(41) 99123-9876',
        cargo_atual: 'UX/UI Designer',
        empresa_atual: 'Estúdio Criativo',
        localizacao: 'Curitiba, PR',
        vagaIndex: 2, // Product Designer
        linkedin: 'https://linkedin.com/in/mariana-prado-ux',
        github: '',
        resumo:
          'Designer focada em interfaces limpas, arquitetura de informação e protótipos de alta definição para plataformas web e mobile. Apaixonada por tipografia e consistência visual.',
        habilidades_tecnicas: [
          'Figma',
          'Prototipação',
          'Wireframing',
          'UI Design',
          'Design System',
        ],
        competencias_comportamentais: [
          'Criatividade',
          'Atenção aos detalhes',
          'Comunicação',
          'Empatia',
        ],
        experiencias: [
          {
            cargo: 'UX/UI Designer',
            empresa: 'Estúdio Criativo',
            periodo: '2021 - Presente',
            descricao:
              'Desenho de dashboards e interfaces responsivas para clientes do setor financeiro.',
          },
        ],
        educacao: [{ instituicao: 'UFPR', curso: 'Design Gráfico', periodo: '2016 - 2020' }],
        idiomas: ['Português (Nativo)', 'Inglês (Básico)'],
        status: 'Triagem',
        score_semantico: 76,
      },
    ]

    for (let i = 0; i < candidatosData.length; i++) {
      const cData = candidatosData[i]
      let rec
      const targetVaga = vagaRecords[cData.vagaIndex]
      try {
        rec = app.findFirstRecordByData('candidatos', 'email', cData.email)
      } catch (_) {
        rec = new Record(candidatosCol)
        rec.set('nome', cData.nome)
        rec.set('email', cData.email)
        rec.set('telefone', cData.telefone)
        rec.set('cargo_atual', cData.cargo_atual)
        rec.set('empresa_atual', cData.empresa_atual)
        rec.set('localizacao', cData.localizacao)
        rec.set('vaga', targetVaga ? targetVaga.id : null)
        rec.set('linkedin', cData.linkedin)
        rec.set('github', cData.github)
        rec.set('resumo', cData.resumo)
        rec.set('habilidades_tecnicas', cData.habilidades_tecnicas)
        rec.set('competencias_comportamentais', cData.competencias_comportamentais)
        rec.set('experiencias', cData.experiencias)
        rec.set('educacao', cData.educacao)
        rec.set('idiomas', cData.idiomas)
        rec.set('status', cData.status)
        rec.set('score_semantico', cData.score_semantico)
        app.save(rec)

        // Create pipeline entry
        if (targetVaga) {
          const pipeRec = new Record(pipelineCol)
          pipeRec.set('candidato', rec.id)
          pipeRec.set('vaga', targetVaga.id)
          pipeRec.set('estagio', cData.status)
          pipeRec.set('anotacoes', 'Candidato inserido no fluxo de atração e seleção.')
          pipeRec.set('historico', [
            {
              data: new Date().toISOString(),
              estagio: cData.status,
              autor: 'Sistema (Triagem Inteligente)',
              nota: 'Inclusão no processo seletivo da vaga ' + targetVaga.getString('titulo'),
            },
          ])
          app.save(pipeRec)
        }
      }
    }
  },
  (app) => {
    // down migration
    try {
      const admin = app.findAuthRecordByEmail('_pb_users_auth_', 'severo.douglas2@gmail.com')
      app.delete(admin)
    } catch (_) {}
  },
)
