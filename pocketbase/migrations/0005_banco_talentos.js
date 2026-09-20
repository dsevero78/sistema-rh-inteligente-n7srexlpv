/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const candidatosCol = app.findCollectionByNameOrId('candidatos')
    const pipelineCol = app.findCollectionByNameOrId('pipeline')
    const vagasCol = app.findCollectionByNameOrId('vagas')

    // 1. Adicionar campos ao candidatos se não existirem
    if (!candidatosCol.fields.getByName('banco_talentos')) {
      candidatosCol.fields.add(new BoolField({ name: 'banco_talentos' }))
    }
    if (!candidatosCol.fields.getByName('motivo_banco_talentos')) {
      candidatosCol.fields.add(new TextField({ name: 'motivo_banco_talentos' }))
    }
    if (!candidatosCol.fields.getByName('tags_talento')) {
      candidatosCol.fields.add(new JSONField({ name: 'tags_talento' }))
    }
    if (!candidatosCol.fields.getByName('estagio_saida')) {
      candidatosCol.fields.add(new TextField({ name: 'estagio_saida' }))
    }
    if (!candidatosCol.fields.getByName('data_adicao_banco')) {
      candidatosCol.fields.add(new DateField({ name: 'data_adicao_banco' }))
    }
    if (!candidatosCol.fields.getByName('vaga_origem')) {
      candidatosCol.fields.add(
        new RelationField({
          name: 'vaga_origem',
          collectionId: vagasCol.id,
          maxSelect: 1,
          cascadeDelete: false,
        }),
      )
    }

    app.save(candidatosCol)

    // Adicionar índice para busca rápida no banco de talentos
    try {
      candidatosCol.addIndex('idx_candidatos_banco_talentos', false, 'banco_talentos', '')
      app.save(candidatosCol)
    } catch (_) {}

    // 2. Adicionar campo no pipeline para indicar se ao recusar foi sugerido/marcado como banco de talentos
    if (!pipelineCol.fields.getByName('adicionado_ao_banco')) {
      pipelineCol.fields.add(new BoolField({ name: 'adicionado_ao_banco' }))
      app.save(pipelineCol)
    }

    // 3. Atualizar o agente nativo 'gestor-de-talentos' para que sua descrição e memória conheçam o banco de talentos
    try {
      $ai.agents.define(app, {
        slug: 'gestor-de-talentos',
        name: 'Gestor de Talentos',
        description:
          'Analista sênior de talentos, imparcial, objetivo e rigoroso. Avalia aderência técnica e comportamental entre candidato e vaga, analisa o pipeline, consulta e recomenda profissionais guardados no Banco de Talentos para vagas futuras.',
        systemPrompt:
          "Você é o Gestor de Talentos, o assistente inteligente oficial de Gente & Gestão da empresa. Sua atuação é de um Analista Sênior de Talentos: imparcial, objetivo, fundamentado em dados e rigoroso. Você avalia aderência técnica e comportamental entre candidatos e vagas, cita dados reais do perfil (habilidades, experiências, formação, idiomas) e das vagas. Você também tem acesso total ao Banco de Talentos (candidatos com campo 'banco_talentos' = true ou que não foram contratados em processos anteriores mas têm alto potencial) e deve responder com precisão quando perguntado sobre 'quais talentos guardados servem para a vaga X?' ou 'recomende candidatos do banco de talentos'. Sempre cite a fonte das informações que analisar (por exemplo: 'resumo', 'experiências', 'habilidades', 'motivo_banco_talentos'). Quando sugerir mover ou reaproveitar um candidato para uma nova vaga, forneça a justificativa clara e explicite os dados estruturados para confirmação do usuário (ex: candidatoId, vagaId, novoEstagio). Responda sempre em português (pt-BR) de forma elegante e executiva.",
        tier: 'reasoning',
        tools: [
          {
            collection: 'candidatos',
            perms: { read: true, list: true },
            actAs: 'admin',
          },
          {
            collection: 'vagas',
            perms: { read: true, list: true },
            actAs: 'admin',
          },
          {
            collection: 'pipeline',
            perms: { read: true, list: true },
            actAs: 'admin',
          },
          {
            collection: 'entrevistas',
            perms: { read: true, list: true },
            actAs: 'admin',
          },
        ],
        memory: [
          {
            type: 'text',
            payload: {
              text: 'Diretrizes do Banco de Talentos e Reaproveitamento:\n1. Candidatos no Banco de Talentos: profissionais qualificados com a flag banco_talentos=true ou com status=Recusado que chegaram a etapas finais (Entrevista Técnica, Match IA, Proposta), com notas altas e bom alinhamento cultural, guardados para futuras oportunidades.\n2. Reaproveitamento em Vagas Ativas: ao surgir uma nova vaga compatível com a stack do candidato guardado, o sistema recomenda a candidatura, consulta o score de matching prévio ou recalcula a aderência técnica e cria a nova oportunidade no pipeline preservando o histórico anterior.\n3. Critérios de Destaque no Banco: motivos comuns incluem finalista excelente porém preterido por vaga única, congelamento/fechamento da vaga original, pretensão salarial ajustável para cargos futuros, ou perfil com competências técnicas de alto valor.',
            },
          },
        ],
      })
    } catch (agentErr) {
      console.log('Aviso ao atualizar agente gestor-de-talentos na migration 0005:', agentErr)
    }

    // 4. Seed de candidatos no Banco de Talentos
    // Criamos 2 candidatos excelentes novos com status 'Recusado' e 'banco_talentos' = true para enriquecer o banco de talentos imediatamente
    try {
      const vagaBackend = app.findFirstRecordByData(
        'vagas',
        'titulo',
        'Desenvolvedor(a) Backend Sênior',
      )
      const vagaDesign = app.findFirstRecordByData('vagas', 'titulo', 'Product Designer Pleno')
      const vagaMarketing = app.findFirstRecordByData(
        'vagas',
        'titulo',
        'Analista de Marketing Digital',
      )

      // Candidato 1: Leonardo Bastos Silveira - Especialista Go/Distributed Systems (Finalista recusado em Proposta por vaga única)
      try {
        app.findFirstRecordByData('candidatos', 'email', 'leonardo.bastos@exemplo.com')
      } catch (_) {
        const cand1 = new Record(candidatosCol)
        cand1.set('nome', 'Leonardo Bastos Silveira')
        cand1.setEmail('leonardo.bastos@exemplo.com')
        cand1.set('telefone', '(11) 97123-4567')
        cand1.set('cargo_atual', 'Engenheiro Backend Sênior')
        cand1.set('empresa_atual', 'Cloud Systems Brasil')
        cand1.set('localizacao', 'São Paulo, SP')
        cand1.set('vaga', vagaBackend.id)
        cand1.set('vaga_origem', vagaBackend.id)
        cand1.set('linkedin', 'https://linkedin.com/in/leonardo-bastos-cloud')
        cand1.set('github', 'https://github.com/leobastos')
        cand1.set(
          'resumo',
          'Arquiteto e desenvolvedor backend com 7 anos de experiência focado em Go, microsserviços distribuídos, mensageria com Kafka e Kubernetes. Excelente comunicação técnica e liderança em projetos de alta escala.',
        )
        cand1.set('habilidades_tecnicas', [
          'Go',
          'Kubernetes',
          'Docker',
          'Kafka',
          'PostgreSQL',
          'Redis',
          'gRPC',
        ])
        cand1.set('competencias_comportamentais', [
          'Liderança técnica',
          'Resolução de problemas',
          'Comunicação assertiva',
          'Visão sistêmica',
        ])
        cand1.set('experiencias', [
          {
            cargo: 'Engenheiro de Software Backend Sênior',
            empresa: 'Cloud Systems Brasil',
            periodo: '2020 - Presente',
            descricao:
              'Liderança técnica na modernização de arquitetura de pagamentos processando 15k req/s.',
          },
          {
            cargo: 'Desenvolvedor Go Pleno',
            empresa: 'InfraScale',
            periodo: '2017 - 2020',
            descricao: 'Construção de pipelines em Go e Docker para telemetria em tempo real.',
          },
        ])
        cand1.set('educacao', [
          { instituicao: 'Unicamp', curso: 'Engenharia de Computação', periodo: '2012 - 2017' },
        ])
        cand1.set('idiomas', ['Português (Nativo)', 'Inglês (Fluente)'])
        cand1.set('status', 'Recusado')
        cand1.set('score_semantico', 91)
        cand1.set('banco_talentos', true)
        cand1.set(
          'motivo_banco_talentos',
          'Finalista altamente qualificado; vaga de Backend fechou com outro candidato por fit de pretensão imediata. Perfil prioritário para futuras vagas de Tech Lead ou Backend Go.',
        )
        cand1.set('tags_talento', ['Finalista', 'Go Sênior', 'Alto Potencial', 'Kafka'])
        cand1.set('estagio_saida', 'Proposta')
        cand1.set(
          'data_adicao_banco',
          new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z',
        )
        app.save(cand1)

        // Registrar no pipeline como Recusado com histórico
        const pipe1 = new Record(pipelineCol)
        pipe1.set('candidato', cand1.id)
        pipe1.set('vaga', vagaBackend.id)
        pipe1.set('estagio', 'Recusado')
        pipe1.set(
          'motivo_recusa',
          'Vaga preenchida por outro finalista; candidato aprovado para banco de talentos.',
        )
        pipe1.set(
          'anotacoes',
          'Candidato excelente em Go e Kubernetes. Destacado para o Banco de Talentos com score 91%.',
        )
        pipe1.set('adicionado_ao_banco', true)
        pipe1.set('historico', [
          {
            data: '2026-08-15T10:00:00.000Z',
            estagio: 'Triagem',
            autor: 'Sistema',
            nota: 'Inclusão na vaga Desenvolvedor(a) Backend Sênior',
          },
          {
            data: '2026-08-25T14:30:00.000Z',
            estagio: 'Entrevista técnica',
            autor: 'Douglas Severo (RH)',
            nota: 'Avaliação técnica impecável em Go e microsserviços.',
          },
          {
            data: '2026-09-02T16:00:00.000Z',
            estagio: 'Proposta',
            autor: 'Douglas Severo (RH)',
            nota: 'Chegou à etapa final de proposta salarial.',
          },
          {
            data: '2026-09-05T11:00:00.000Z',
            estagio: 'Recusado',
            autor: 'Douglas Severo (RH)',
            nota: 'Vaga preenchida por candidato sênior com início imediato. Enviado para Banco de Talentos.',
          },
        ])
        app.save(pipe1)
      }

      // Candidato 2: Beatriz Nogueira Fontes - Product Designer & UX Researcher (Recusada em Match IA por vaga pausada/reestruturada)
      try {
        app.findFirstRecordByData('candidatos', 'email', 'beatriz.fontes@exemplo.com')
      } catch (_) {
        const cand2 = new Record(candidatosCol)
        cand2.set('nome', 'Beatriz Nogueira Fontes')
        cand2.setEmail('beatriz.fontes@exemplo.com')
        cand2.set('telefone', '(21) 98877-6655')
        cand2.set('cargo_atual', 'Product Designer Pleno')
        cand2.set('empresa_atual', 'Fintech Nova')
        cand2.set('localizacao', 'Rio de Janeiro, RJ')
        cand2.set('vaga', vagaDesign.id)
        cand2.set('vaga_origem', vagaDesign.id)
        cand2.set('linkedin', 'https://linkedin.com/in/beatriz-fontes-ux')
        cand2.set('github', '')
        cand2.set(
          'resumo',
          'Designer de produto com 4 anos de experiência em discovery, pesquisas com usuários e evolução de design system no Figma. Forte domínio de prototipagem e métricas de usabilidade (SUS, CES).',
        )
        cand2.set('habilidades_tecnicas', [
          'Figma',
          'UX Research',
          'Design System',
          'Prototipação',
          'Design Tokens',
          'Testes de Usabilidade',
        ])
        cand2.set('competencias_comportamentais', [
          'Empatia com o usuário',
          'Colaboração multidisciplinar',
          'Atenção a detalhes',
          'Pensamento crítico',
        ])
        cand2.set('experiencias', [
          {
            cargo: 'Product Designer Pleno',
            empresa: 'Fintech Nova',
            periodo: '2022 - Presente',
            descricao:
              'Liderou discovery e redesign do fluxo de onboarding com aumento de 28% na conversão.',
          },
        ])
        cand2.set('educacao', [
          { instituicao: 'PUC-Rio', curso: 'Design e Comunicação Visual', periodo: '2016 - 2020' },
        ])
        cand2.set('idiomas', ['Português (Nativo)', 'Inglês (Avançado)'])
        cand2.set('status', 'Recusado')
        cand2.set('score_semantico', 87)
        cand2.set('banco_talentos', true)
        cand2.set(
          'motivo_banco_talentos',
          'Ótima performance na entrevista técnica e portfólio. Guardada para futuras vagas de UX Research ou Product Design.',
        )
        cand2.set('tags_talento', ['Design System', 'UX Research', 'Alta Aderência'])
        cand2.set('estagio_saida', 'Match técnico/comportamental (IA)')
        cand2.set(
          'data_adicao_banco',
          new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z',
        )
        app.save(cand2)

        const pipe2 = new Record(pipelineCol)
        pipe2.set('candidato', cand2.id)
        pipe2.set('vaga', vagaDesign.id)
        pipe2.set('estagio', 'Recusado')
        pipe2.set(
          'motivo_recusa',
          'Vaga priorizou perfil mais generalista de UI; guardada para oportunidade focada em UX Research.',
        )
        pipe2.set(
          'anotacoes',
          'Candidata com forte base de pesquisa e Figma. Adicionada ao Banco de Talentos com score 87%.',
        )
        pipe2.set('adicionado_ao_banco', true)
        pipe2.set('historico', [
          {
            data: '2026-08-20T09:00:00.000Z',
            estagio: 'Triagem',
            autor: 'Sistema',
            nota: 'Inclusão na vaga Product Designer Pleno',
          },
          {
            data: '2026-08-29T11:00:00.000Z',
            estagio: 'Entrevista técnica',
            autor: 'Douglas Severo (RH)',
            nota: 'Apresentou case sólido de usabilidade no setor financeiro.',
          },
          {
            data: '2026-09-08T15:00:00.000Z',
            estagio: 'Recusado',
            autor: 'Douglas Severo (RH)',
            nota: 'Encaminhada ao Banco de Talentos para novas posições de Produto.',
          },
        ])
        app.save(pipe2)
      }

      // Candidato 3: Vinicius Moreira Duarte - Growth Marketer & Performance (Recusado em Entrevista Técnica)
      try {
        app.findFirstRecordByData('candidatos', 'email', 'vinicius.moreira@exemplo.com')
      } catch (_) {
        const cand3 = new Record(candidatosCol)
        cand3.set('nome', 'Vinicius Moreira Duarte')
        cand3.setEmail('vinicius.moreira@exemplo.com')
        cand3.set('telefone', '(31) 99654-1234')
        cand3.set('cargo_atual', 'Analista de Growth Sênior')
        cand3.set('empresa_atual', 'Agência Scale Digital')
        cand3.set('localizacao', 'Belo Horizonte, MG')
        cand3.set('vaga', vagaMarketing.id)
        cand3.set('vaga_origem', vagaMarketing.id)
        cand3.set('linkedin', 'https://linkedin.com/in/vinicius-moreira-growth')
        cand3.set('github', '')
        cand3.set(
          'resumo',
          'Profissional de aquisição de clientes com experiência em Google Ads, Meta Ads, análise de coortes e SEO para e-commerce e SaaS.',
        )
        cand3.set('habilidades_tecnicas', [
          'Google Ads',
          'Meta Ads',
          'GA4',
          'SEO',
          'SQL',
          'Looker Studio',
        ])
        cand3.set('competencias_comportamentais', [
          'Orientação a resultados',
          'Agilidade',
          'Pensamento analítico',
        ])
        cand3.set('experiencias', [
          {
            cargo: 'Analista de Growth Sênior',
            empresa: 'Agência Scale Digital',
            periodo: '2021 - Presente',
            descricao: 'Gestão de budget de performance e testes de criativos.',
          },
        ])
        cand3.set('educacao', [
          { instituicao: 'UFMG', curso: 'Administração', periodo: '2015 - 2019' },
        ])
        cand3.set('idiomas', ['Português (Nativo)', 'Inglês (Intermediário)'])
        cand3.set('status', 'Recusado')
        cand3.set('score_semantico', 82)
        cand3.set('banco_talentos', true)
        cand3.set(
          'motivo_banco_talentos',
          'Perfil analítico excelente; alinhado para vagas futuras de Marketing de Performance ou Growth.',
        )
        cand3.set('tags_talento', ['Growth', 'Meta Ads', 'Google Ads'])
        cand3.set('estagio_saida', 'Entrevista técnica')
        cand3.set(
          'data_adicao_banco',
          new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z',
        )
        app.save(cand3)

        const pipe3 = new Record(pipelineCol)
        pipe3.set('candidato', cand3.id)
        pipe3.set('vaga', vagaMarketing.id)
        pipe3.set('estagio', 'Recusado')
        pipe3.set(
          'motivo_recusa',
          'Momento da vaga demandava residência presencial em SP; candidato atua em modelo híbrido/remoto de BH.',
        )
        pipe3.set(
          'anotacoes',
          'Guardado no Banco de Talentos para posições 100% remotas de Marketing.',
        )
        pipe3.set('adicionado_ao_banco', true)
        pipe3.set('historico', [
          {
            data: '2026-08-10T11:00:00.000Z',
            estagio: 'Triagem',
            autor: 'Sistema',
            nota: 'Inclusão na vaga Analista de Marketing Digital',
          },
          {
            data: '2026-08-18T14:00:00.000Z',
            estagio: 'Entrevista técnica',
            autor: 'Douglas Severo (RH)',
            nota: 'Conhecimento aprofundado de campanhas pagas e CAC.',
          },
          {
            data: '2026-08-22T10:00:00.000Z',
            estagio: 'Recusado',
            autor: 'Douglas Severo (RH)',
            nota: 'Divergência de modalidade presencial; aprovado para o Banco de Talentos.',
          },
        ])
        app.save(pipe3)
      }
    } catch (candErr) {
      console.log('Aviso ao semear candidatos no banco de talentos:', candErr)
    }
  },
  (app) => {
    // down migration
    try {
      const candidatosCol = app.findCollectionByNameOrId('candidatos')
      candidatosCol.fields.removeByName('banco_talentos')
      candidatosCol.fields.removeByName('motivo_banco_talentos')
      candidatosCol.fields.removeByName('tags_talento')
      candidatosCol.fields.removeByName('estagio_saida')
      candidatosCol.fields.removeByName('data_adicao_banco')
      candidatosCol.fields.removeByName('vaga_origem')
      app.save(candidatosCol)
    } catch (_) {}
  },
)
