/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const vagasCol = app.findCollectionByNameOrId('vagas')
    const candidatosCol = app.findCollectionByNameOrId('candidatos')
    const questionariosCol = app.findCollectionByNameOrId('questionarios_vaga')
    const respostasCol = app.findCollectionByNameOrId('respostas_triagem')
    const percepcoesCol = app.findCollectionByNameOrId('percepcoes_rh')
    const feedbacksCol = app.findCollectionByNameOrId('feedbacks_gestor')

    // ----------------------------------------------------
    // 1. Atualizar o usuário admin severo.douglas2@gmail.com com cargo_funcao = "RH / Recrutador"
    // ----------------------------------------------------
    let adminUser = null
    try {
      adminUser = app.findAuthRecordByEmail('_pb_users_auth_', 'severo.douglas2@gmail.com')
      if (adminUser) {
        adminUser.set('cargo_funcao', 'RH / Recrutador')
        app.save(adminUser)
      }
    } catch (_) {}

    // ----------------------------------------------------
    // 2. Criar usuário Gestor de Exemplo: gestor@empresa.com
    // ----------------------------------------------------
    let gestorUser = null
    try {
      gestorUser = app.findAuthRecordByEmail('_pb_users_auth_', 'gestor@empresa.com')
    } catch (_) {
      const rec = new Record(usersCol)
      rec.setEmail('gestor@empresa.com')
      rec.setPassword('Skip@Pass')
      rec.setVerified(true)
      rec.set('name', 'Carlos Mendonça (Gestor de Engenharia)')
      rec.set('cargo_funcao', 'Gestor Contratante')
      app.save(rec)
      gestorUser = rec
    }

    // Criar segundo gestor para testes e diversidade: gestora.produto@empresa.com
    let gestorDesign = null
    try {
      gestorDesign = app.findAuthRecordByEmail('_pb_users_auth_', 'gestora.produto@empresa.com')
    } catch (_) {
      const rec = new Record(usersCol)
      rec.setEmail('gestora.produto@empresa.com')
      rec.setPassword('Skip@Pass')
      rec.setVerified(true)
      rec.set('name', 'Mariana Siqueira (Head de Produto)')
      rec.set('cargo_funcao', 'Gestor Contratante')
      app.save(rec)
      gestorDesign = rec
    }

    // ----------------------------------------------------
    // 3. Vincular gestores às vagas existentes
    //    - Desenvolvedor(a) Backend Sênior -> gestorUser (Aprovada pelo gestor)
    //    - Product Designer Pleno -> gestorDesign (Aguardando aprovação)
    // ----------------------------------------------------
    let vagaBackend = null
    let vagaDesign = null
    try {
      vagaBackend = app.findFirstRecordByData('vagas', 'titulo', 'Desenvolvedor(a) Backend Sênior')
    } catch (_) {}
    try {
      vagaDesign = app.findFirstRecordByData('vagas', 'titulo', 'Product Designer Pleno')
    } catch (_) {}

    if (vagaBackend && gestorUser) {
      vagaBackend.set('gestor_responsavel', gestorUser.id)
      vagaBackend.set('status_aprovacao_gestor', 'Aprovada pelo gestor')
      vagaBackend.set(
        'parecer_gestor_vaga',
        'Descrição técnica e matriz de requisitos validadas. Priorizar candidatos com vivência sólida em Go e microsserviços.',
      )
      vagaBackend.set('data_aprovacao_gestor', new Date().toISOString())
      app.save(vagaBackend)
    }

    if (vagaDesign && gestorDesign) {
      vagaDesign.set('gestor_responsavel', gestorDesign.id)
      vagaDesign.set('status_aprovacao_gestor', 'Aguardando aprovação')
      app.save(vagaDesign)
    }

    // ----------------------------------------------------
    // 4. Semear Questionário Estruturado para a vaga Backend
    // ----------------------------------------------------
    let questBackend = null
    if (vagaBackend) {
      try {
        const existeQ = app.findRecordsByFilter(
          'questionarios_vaga',
          "vaga = '" + vagaBackend.id + "'",
          '',
          1,
          0,
        )
        if (!existeQ || existeQ.length === 0) {
          questBackend = new Record(questionariosCol)
          questBackend.set('vaga', vagaBackend.id)
          questBackend.set('titulo', 'Triagem Técnica & Disponibilidade - Backend Sênior')
          questBackend.set(
            'descricao',
            'Questionário eliminatório de triagem para confirmação de pré-requisitos fundamentais da posição.',
          )
          questBackend.set('ativo', true)
          questBackend.set('perguntas', [
            {
              id: 'p1',
              enunciado:
                'Você possui pelo menos 4 anos de experiência prática com Backend (Go ou Node.js)?',
              tipo: 'sim_nao', // sim_nao | escolha_unica | numero | texto
              eliminatoria: true,
              resposta_esperada: 'Sim',
              mensagem_reprovacao: 'Exigência mínima de 4 anos de experiência em backend.',
            },
            {
              id: 'p2',
              enunciado: 'Qual a sua pretensão salarial mensal (em R$ CLT ou PJ equivalente)?',
              tipo: 'numero',
              eliminatoria: true,
              valor_maximo: 22000,
              valor_minimo: 10000,
              mensagem_reprovacao:
                'Pretensão salarial acima do teto orçamentário aprovado para esta posição (R$ 22.000).',
            },
            {
              id: 'p3',
              enunciado: 'Qual o seu nível de proficiência em Inglês técnico?',
              tipo: 'escolha_unica',
              opcoes: ['Básico', 'Intermediário', 'Avançado / Fluente'],
              eliminatoria: true,
              respostas_validas: ['Intermediário', 'Avançado / Fluente'],
              mensagem_reprovacao:
                'Esta posição exige ao menos nível intermediário para documentação e reuniões técnicas.',
            },
            {
              id: 'p4',
              enunciado: 'Qual sua disponibilidade para início de trabalho caso aprovado?',
              tipo: 'escolha_unica',
              opcoes: ['Imediata', 'Em até 15 dias', 'Em até 30 dias', 'Mais de 30 dias'],
              eliminatoria: false,
            },
            {
              id: 'p5',
              enunciado:
                'Descreva brevemente sua experiência com arquitetura distribuída e mensageria (Kafka/RabbitMQ):',
              tipo: 'texto',
              eliminatoria: false,
            },
          ])
          app.save(questBackend)
        } else {
          questBackend = existeQ[0]
        }
      } catch (errQ) {
        console.log('Aviso ao semear questionário:', errQ)
      }
    }

    // ----------------------------------------------------
    // 5. Semear candidato reprovado automaticamente na triagem
    // ----------------------------------------------------
    let candReprovado = null
    try {
      candReprovado = app.findFirstRecordByData(
        'candidatos',
        'email',
        'tiago.martins.triagem@exemplo.com',
      )
    } catch (_) {
      if (vagaBackend) {
        const cand = new Record(candidatosCol)
        cand.set('nome', 'Tiago Martins de Carvalho')
        cand.set('email', 'tiago.martins.triagem@exemplo.com')
        cand.set('telefone', '(11) 96123-9988')
        cand.set('cargo_atual', 'Desenvolvedor Backend Júnior')
        cand.set('empresa_atual', 'Startup Beta')
        cand.set('localizacao', 'Campinas, SP')
        cand.set('vaga', vagaBackend.id)
        cand.set('status', 'Recusado')
        cand.set('reprovado_triagem_auto', true)
        cand.set(
          'motivo_reprovacao_triagem',
          'Reprovado na triagem automática: Exigência mínima de 4 anos de experiência em backend. (Candidato respondeu Não)',
        )
        cand.set('score_semantico', 42)
        cand.set(
          'resumo',
          'Desenvolvedor backend júnior com 1 ano de experiência em APIs Node.js e MySQL.',
        )
        cand.set('habilidades_tecnicas', ['JavaScript', 'Node.js', 'Express', 'MySQL'])
        cand.set('competencias_comportamentais', ['Vontade de aprender', 'Trabalho em equipe'])
        app.save(cand)
        candReprovado = cand

        // Salvar resposta da triagem
        if (questBackend) {
          const resp = new Record(respostasCol)
          resp.set('vaga', vagaBackend.id)
          resp.set('candidato', cand.id)
          resp.set('questionario', questBackend.id)
          resp.set('reprovado_automaticamente', true)
          resp.set(
            'motivo_reprovacao',
            'Reprovado na triagem automática: Exigência mínima de 4 anos de experiência em backend. (Candidato respondeu Não)',
          )
          resp.set('total_perguntas', 5)
          resp.set('total_eliminatorias_atendidas', 2)
          resp.set('respostas', [
            {
              perguntaId: 'p1',
              pergunta:
                'Você possui pelo menos 4 anos de experiência prática com Backend (Go ou Node.js)?',
              tipo: 'sim_nao',
              resposta: 'Não',
              eliminatoria: true,
              atendeu: false,
            },
            {
              perguntaId: 'p2',
              pergunta: 'Qual a sua pretensão salarial mensal (em R$ CLT ou PJ equivalente)?',
              tipo: 'numero',
              resposta: 7500,
              eliminatoria: true,
              atendeu: true,
            },
            {
              perguntaId: 'p3',
              pergunta: 'Qual o seu nível de proficiência em Inglês técnico?',
              tipo: 'escolha_unica',
              resposta: 'Intermediário',
              eliminatoria: true,
              atendeu: true,
            },
            {
              perguntaId: 'p4',
              pergunta: 'Qual sua disponibilidade para início de trabalho caso aprovado?',
              tipo: 'escolha_unica',
              resposta: 'Imediata',
              eliminatoria: false,
              atendeu: true,
            },
            {
              perguntaId: 'p5',
              pergunta:
                'Descreva brevemente sua experiência com arquitetura distribuída e mensageria (Kafka/RabbitMQ):',
              tipo: 'texto',
              resposta: 'Ainda não trabalhei em produção com Kafka, apenas estudos teóricos.',
              eliminatoria: false,
              atendeu: true,
            },
          ])
          app.save(resp)
        }
      }
    }

    // ----------------------------------------------------
    // 6. Atualizar candidato aprovado (Lucas Ferreira) com vídeo de apresentação
    // ----------------------------------------------------
    let candLucas = null
    try {
      candLucas = app.findFirstRecordByData('candidatos', 'email', 'lucas.ferreira@exemplo.com')
      if (candLucas) {
        candLucas.set('video_link', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ')
        app.save(candLucas)
      }
    } catch (_) {}

    // ----------------------------------------------------
    // 7. Semear Percepções do RH (uma Compartilhada e uma Privada)
    // ----------------------------------------------------
    if (candLucas && adminUser && vagaBackend) {
      // 7.1 Percepção COMPARTILHADA com o gestor
      try {
        const existeComp = app.findRecordsByFilter(
          'percepcoes_rh',
          "candidato = '" + candLucas.id + "' && visibilidade = 'Compartilhada com o gestor'",
          '',
          1,
          0,
        )
        if (!existeComp || existeComp.length === 0) {
          const pComp = new Record(percepcoesCol)
          pComp.set('candidato', candLucas.id)
          pComp.set('vaga', vagaBackend.id)
          pComp.set('autor', adminUser.id)
          pComp.set('autor_nome', adminUser.getString('name') || 'Douglas Severo (RH)')
          pComp.set('visibilidade', 'Compartilhada com o gestor')
          pComp.set('status_documento', 'Finalizada')
          pComp.set(
            'comunicacao_clareza',
            'Excelente comunicação oral. Raciocínio altamente estruturado ao explicar o desafio da migração de monolito para microsserviços. Foi claro, direto e empático.',
          )
          pComp.set(
            'postura_apresentacao',
            'Postura extremamente profissional no vídeo, ambiente adequado, boa iluminação, fala pausada e segura, transmitindo maturidade e foco.',
          )
          pComp.set(
            'estrutura_video',
            'Cumpriu rigorosamente a pauta proposta de 3 minutos, organizando a apresentação entre histórico profissional, conquistas recentes e motivação.',
          )
          pComp.set(
            'conteudo_experiencia',
            'Demonstrou profundo domínio de Go e mensageria com Kafka em escala de alto tráfego. Exemplos com métricas reais de redução de latência.',
          )
          pComp.set(
            'aderencia_cultural',
            'Alinhamento pleno com a cultura de autonomia, ownership e espírito colaborativo. Aberto a feedbacks e compartilha conhecimento com o time.',
          )
          pComp.set(
            'pontos_fortes',
            '• Maturidade em arquitetura de microsserviços\n• Clareza explicativa e liderança técnica\n• Alta resiliência em momentos de crise sistêmica',
          )
          pComp.set(
            'pontos_atencao',
            '• Validar expectativas quanto ao modelo de plantão/on-call\n• Alinhar expectativas de crescimento nos primeiros 12 meses',
          )
          pComp.set('nota_geral', 9.2)
          pComp.set('conclusao', 'Avançar')
          pComp.set(
            'observacoes_confidenciais',
            'Candidato de altíssimo potencial. Recomendação firme de avanço para a etapa de proposta formal com a gestão.',
          )
          app.save(pComp)
        }
      } catch (errPComp) {
        console.log('Aviso ao semear percepção compartilhada:', errPComp)
      }

      // 7.2 Percepção PRIVADA (só o autor RH vê)
      try {
        const existePriv = app.findRecordsByFilter(
          'percepcoes_rh',
          "candidato = '" + candLucas.id + "' && visibilidade = 'Privada (só o RH autor)'",
          '',
          1,
          0,
        )
        if (!existePriv || existePriv.length === 0) {
          const pPriv = new Record(percepcoesCol)
          pPriv.set('candidato', candLucas.id)
          pPriv.set('vaga', vagaBackend.id)
          pPriv.set('autor', adminUser.id)
          pPriv.set('autor_nome', adminUser.getString('name') || 'Douglas Severo (RH)')
          pPriv.set('visibilidade', 'Privada (só o RH autor)')
          pPriv.set('status_documento', 'Finalizada')
          pPriv.set(
            'comunicacao_clareza',
            'Comunicação fluida, sem vícios de linguagem relevantes.',
          )
          pPriv.set(
            'postura_apresentacao',
            'Demonstrou muito interesse pela empresa e perguntou sobre estabilidade financeira da organização.',
          )
          pPriv.set(
            'conteudo_experiencia',
            'Informou que está em outro processo finalista em consultoria, então precisamos ser rápidos com o fechamento da proposta.',
          )
          pPriv.set(
            'aderencia_cultural',
            'Prefere regime remoto integral com flexibilidade de horário.',
          )
          pPriv.set('pontos_fortes', 'Pretensão dentro do limite máximo autorizado para a cadeira.')
          pPriv.set(
            'pontos_atencao',
            'Concorrente ofereceu R$ 16k CLT; sugerir oferta de R$ 15.5k a 16.5k com bom pacote de benefícios.',
          )
          pPriv.set('nota_geral', 9.0)
          pPriv.set('conclusao', 'Avançar')
          pPriv.set(
            'observacoes_confidenciais',
            'ESTA ANOTAÇÃO É EXCLUSIVA DO RH: Manter em sigilo a contraproposta concorrente para não inflacionar desnecessariamente.',
          )
          app.save(pPriv)
        }
      } catch (errPPriv) {
        console.log('Aviso ao semear percepção privada:', errPPriv)
      }
    }

    // ----------------------------------------------------
    // 8. Semear Feedback do Gestor para Lucas Ferreira
    // ----------------------------------------------------
    if (candLucas && gestorUser && vagaBackend) {
      try {
        const existeF = app.findRecordsByFilter(
          'feedbacks_gestor',
          "candidato = '" + candLucas.id + "' && gestor = '" + gestorUser.id + "'",
          '',
          1,
          0,
        )
        if (!existeF || existeF.length === 0) {
          const fb = new Record(feedbacksCol)
          fb.set('vaga', vagaBackend.id)
          fb.set('candidato', candLucas.id)
          fb.set('gestor', gestorUser.id)
          fb.set('recomendacao', 'Avançar')
          fb.set(
            'comentario',
            'Assisti ao vídeo de apresentação e analisei as experiências com Kafka. O Lucas tem exatamente o perfil técnico e a maturidade de liderança que precisamos para a frente de microsserviços. Apoio 100% o envio da proposta!',
          )
          fb.set(
            'pontos_positivos',
            'Sólido domínio prático em Go e tratamento de concorrência/mensageria em larga escala.',
          )
          fb.set('pontos_atencao', 'Nenhum impeditivo técnico detectado.')
          app.save(fb)
        }
      } catch (errFB) {
        console.log('Aviso ao semear feedback do gestor:', errFB)
      }
    }

    // ----------------------------------------------------
    // 9. Atualizar o Agente nativo 'gestor-de-talentos' com:
    //    - novas tools: feedbacks_gestor, questionarios_vaga, respostas_triagem, percepcoes_rh
    //    - memória sobre questionários de triagem e percepções compartilhadas
    // ----------------------------------------------------
    try {
      $ai.agents.putTools(app, 'gestor-de-talentos', [
        {
          collection: 'feedbacks_gestor',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'questionarios_vaga',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'respostas_triagem',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
        {
          collection: 'percepcoes_rh',
          perms: { read: true, list: true },
          actAs: 'admin',
          scopeFilter: "visibilidade = 'Compartilhada com o gestor'",
        },
      ])

      $ai.agents.putMemories(app, 'gestor-de-talentos', [
        {
          type: 'text',
          payload: {
            text: 'Módulo de Gestão Colaborativa e Triagem Inteligente:\n1. Questionários de Triagem: perguntas eliminatórias estruturadas por vaga. Se o candidato não atender a critérios de corte, é reprovado automaticamente na triagem com justificativa.\n2. Pareceres do Gestor: feedbacks registrados pelos gestores das vagas na coleção "feedbacks_gestor" com recomendação (Avançar, Em dúvida, Recusar).\n3. Vídeo e Percepção do RH: o RH analisa a postura, comunicação, estrutura do vídeo e aderência cultural em "percepcoes_rh". IMPORTANTE: Você tem acesso APENAS às percepções "Compartilhada com o gestor". Registros privados são estritamente confidenciais do RH autor.',
          },
        },
      ])
    } catch (agentErr) {
      console.log('Aviso ao atualizar agente gestor-de-talentos na migration 0009:', agentErr)
    }
  },
  (app) => {
    // Reverter seeds se necessário
  },
)
