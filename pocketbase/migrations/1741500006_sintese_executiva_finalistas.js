migrate(
  (app) => {
    // 1. Adicionar campos de síntese executiva na coleção 'vagas'
    const vagasCol = app.findCollectionByNameOrId('vagas')
    if (!vagasCol.fields.getByName('sintese_executiva_ia')) {
      vagasCol.fields.add(
        new JSONField({
          name: 'sintese_executiva_ia',
          required: false,
        }),
      )
    }
    if (!vagasCol.fields.getByName('data_sintese_executiva')) {
      vagasCol.fields.add(
        new DateField({
          name: 'data_sintese_executiva',
          required: false,
        }),
      )
    }
    if (!vagasCol.fields.getByName('versao_sintese_executiva')) {
      vagasCol.fields.add(
        new TextField({
          name: 'versao_sintese_executiva',
          required: false,
        }),
      )
    }
    app.save(vagasCol)

    // 2. Garantir que existam finalistas ricos na vaga 'Desenvolvedor(a) Backend Sênior'
    // Lucas Ferreira Lima já é o primeiro finalista (88%, Entrevista técnica, vídeo e percepção)
    // Vamos adicionar/calibrar um segundo candidato finalista para enriquecer o comparativo executivo:
    // "Mariana Costa Silva" ou transformar Gabriel / criar outro candidato finalista de peso:
    // "Rodrigo Silveira Duarte" (score 85%, Go/Node, Entrevista Técnica)
    try {
      const vagaBackend = app.findFirstRecordByData(
        'vagas',
        'titulo',
        'Desenvolvedor(a) Backend Sênior',
      )

      // Verificar se Rodrigo já existe ou criar
      let candRodrigo = null
      try {
        candRodrigo = app.findFirstRecordByData(
          'candidatos',
          'email',
          'rodrigo.duarte.backend@exemplo.com',
        )
      } catch (_) {}

      if (!candRodrigo) {
        const candidatosCol = app.findCollectionByNameOrId('candidatos')
        candRodrigo = new Record(candidatosCol)
        candRodrigo.set('nome', 'Rodrigo Silveira Duarte')
        candRodrigo.setEmail('rodrigo.duarte.backend@exemplo.com')
        candRodrigo.set('telefone', '(11) 97788-9900')
        candRodrigo.set('cargo_atual', 'Engenheiro de Microsserviços')
        candRodrigo.set('empresa_atual', 'Tech Pagamentos SA')
        candRodrigo.set('localizacao', 'São Paulo, SP')
        candRodrigo.set('vaga', vagaBackend.id)
        candRodrigo.set('status', 'Entrevista técnica')
        candRodrigo.set('score_semantico', 85)
        candRodrigo.set(
          'resumo',
          'Profissional com 7 anos de experiência, forte em Go, Docker e sistemas tolerantes a falhas. Especialista em bancos relacionais e particionamento Postgres.',
        )
        candRodrigo.set('habilidades_tecnicas', [
          'Go',
          'PostgreSQL',
          'Docker',
          'Node.js',
          'Kubernetes',
          'Redis',
        ])
        candRodrigo.set('competencias_comportamentais', [
          'Visão sistêmica',
          'Resolução de problemas',
          'Foco em entrega',
          'Mentoria técnica',
        ])
        candRodrigo.set('experiencias', [
          {
            empresa: 'Tech Pagamentos SA',
            cargo: 'Engenheiro de Microsserviços',
            periodo: '2021 - Presente',
            descricao:
              'Otimização de pipelines de concorrência em Go, redução de custo de infraestrutura em 25%.',
          },
        ])
        candRodrigo.set('educacao', [
          {
            curso: 'Engenharia de Software',
            instituicao: 'FIAP',
            periodo: '2013 - 2017',
          },
        ])
        candRodrigo.set('idiomas', ['Português (Nativo)', 'Inglês (Avançado)'])
        candRodrigo.set('token_portal', 'cand-rodrigo-duarte-seed')
        app.save(candRodrigo)

        // Adicionar no pipeline
        const pipelineCol = app.findCollectionByNameOrId('pipeline')
        const pipeRec = new Record(pipelineCol)
        pipeRec.set('candidato', candRodrigo.id)
        pipeRec.set('vaga', vagaBackend.id)
        pipeRec.set('estagio', 'Entrevista técnica')
        pipeRec.set('anotacoes', 'Finalista técnico qualificado com vivência em Go e Postgres.')
        pipeRec.set('historico', [
          {
            data: new Date().toISOString(),
            estagio: 'Entrevista técnica',
            autor: 'Douglas Severo (RH)',
            nota: 'Finalista com aderência técnica sólida para comparação executiva.',
          },
        ])
        app.save(pipeRec)

        // Criar percepção RH para Rodrigo
        try {
          const percepCol = app.findCollectionByNameOrId('percepcoes_rh')
          const percepRec = new Record(percepCol)
          percepRec.set('candidato', candRodrigo.id)
          percepRec.set('vaga', vagaBackend.id)
          percepRec.set('autor_nome', 'Douglas Severo (Gente & Gestão)')
          percepRec.set('visibilidade', 'Compartilhada com o gestor')
          percepRec.set('status_documento', 'Finalizada')
          percepRec.set(
            'comunicacao_clareza',
            'Comunicação técnica muito boa, mais pragmática e concisa. Responde de forma objetiva.',
          )
          percepRec.set(
            'postura_apresentacao',
            'Profissional experiente, maduro e seguro de suas decisões arquiteturais.',
          )
          percepRec.set(
            'conteudo_experiencia',
            'Domínio aprofundado de bancos relacionais e particionamento PostgreSQL.',
          )
          percepRec.set(
            'aderencia_cultural',
            'Alinhamento com velocidade e entrega, perfil mão na massa focado em resultados.',
          )
          percepRec.set(
            'pontos_fortes',
            '• Experiência de longa data em backend corporativo\n• Alta precisão na modelagem relacional',
          )
          percepRec.set(
            'pontos_atencao',
            '• Menor vivência recente com mensageria assíncrona Kafka quando comparado a Lucas\n• Verificar pretensão com relação a benefícios flexíveis',
          )
          percepRec.set('nota_geral', 8.6)
          percepRec.set('conclusao', 'Avançar')
          app.save(percepRec)
        } catch (_) {}

        // Criar feedback de gestor para Rodrigo
        try {
          const fbCol = app.findCollectionByNameOrId('feedbacks_gestor')
          const fbRec = new Record(fbCol)
          fbRec.set('vaga', vagaBackend.id)
          fbRec.set('candidato', candRodrigo.id)
          fbRec.set('recomendacao', 'Avançar')
          fbRec.set(
            'comentario',
            'Candidato robusto para a frente de banco de dados e estabilidade transacional. Excelente alternativa técnica a Lucas Ferreira.',
          )
          fbRec.set(
            'pontos_positivos',
            'Modelagem de banco, otimização de queries e experiência de mercado.',
          )
          fbRec.set(
            'pontos_atencao',
            'Garantir se tem interesse em liderança técnica ou se prefere atuar como IC puro.',
          )
          app.save(fbRec)
        } catch (_) {}

        // Criar relatório pré-existente para Rodrigo
        try {
          const relCol = app.findCollectionByNameOrId('relatorios')
          const relRec = new Record(relCol)
          relRec.set('candidato', candRodrigo.id)
          relRec.set('vaga', vagaBackend.id)
          relRec.set('tipo', 'Completo')
          relRec.set('veredito', 'Recomendar')
          relRec.set('score_geral', 85)
          relRec.set('score_tecnico', 88)
          relRec.set('score_comportamental', 82)
          relRec.set('conteudo', {
            score_geral: 85,
            score_tecnico: 88,
            score_comportamental: 82,
            veredito: 'Recomendar',
            veredito_textual: 'Alta aderência técnica',
            justificativa:
              'Rodrigo apresenta sólidas habilidades de backend com ênfase em performance de banco e arquitetura Go.',
            pontos_fortes: [
              'Experiência consolidada em backend Go e Node.js',
              'Domínio de bancos de dados PostgreSQL',
            ],
            riscos_lacunas: [
              'Kafka e mensageria distribuída requerem alinhamento prático em entrevista',
            ],
            recomendacao_proximo_passo: 'Avançar para entrevista técnica com gestor',
          })
          app.save(relRec)
        } catch (_) {}
      }

      // 3. Garantir que Lucas Ferreira também tenha um relatório completo na coleção relatorios
      try {
        const candLucas = app.findFirstRecordByData(
          'candidatos',
          'email',
          'lucas.ferreira@exemplo.com',
        )
        let relLucas = null
        try {
          relLucas = app.findFirstRecordByData('relatorios', 'candidato', candLucas.id)
        } catch (_) {}

        if (!relLucas) {
          const relCol = app.findCollectionByNameOrId('relatorios')
          relLucas = new Record(relCol)
          relLucas.set('candidato', candLucas.id)
          relLucas.set('vaga', vagaBackend.id)
          relLucas.set('tipo', 'Completo')
          relLucas.set('veredito', 'Recomendar')
          relLucas.set('score_geral', 88)
          relLucas.set('score_tecnico', 90)
          relLucas.set('score_comportamental', 86)
          relLucas.set('conteudo', {
            score_geral: 88,
            score_tecnico: 90,
            score_comportamental: 86,
            veredito: 'Recomendar',
            veredito_textual: 'Alta aderência estratégica',
            justificativa:
              'Lucas apresenta excelente sinergia com a posição, combinando proficiência comprovada em Go, microsserviços e mensageria com postura executiva madura observada em vídeo.',
            pontos_fortes: [
              'Redução mensurada de latência com Go e microsserviços',
              'Comunicação estruturada e liderança técnica observada no vídeo',
              'Aderência total aos requisitos obrigatórios da vaga',
            ],
            riscos_lacunas: [
              'Validar expectativas de escala/plantão e modelo de trabalho',
              'Concorrência com processo seletivo paralelo no mercado',
            ],
            recomendacao_proximo_passo:
              'Avançar para decisão & proposta com alinhamento rápido de pacote salarial',
          })
          app.save(relLucas)
        }
      } catch (errLucasRel) {
        console.log('Aviso ao registrar relatório de Lucas:', errLucasRel)
      }

      // 4. Salvar síntese executiva inicial de demonstração na vaga para prontidão imediata
      const sinteseSeed = {
        versao: '1.0',
        gerado_em: new Date().toISOString(),
        modelo_utilizado: 'Skip AI Gateway (fast)',
        vaga_titulo: vagaBackend.getString('titulo'),
        total_finalistas: 2,
        recomendacao_final: {
          candidato_escolhido: 'Lucas Ferreira Lima',
          nivel_confianca: 'Alto (92%)',
          resumo_decisao:
            'Lucas Ferreira Lima deve ser avançado para a etapa de Proposta formal com prioridade máxima. Demonstra superioridade no ecossistema assíncrono (Kafka/microsserviços), maturidade de liderança evidenciada no vídeo e validação 100% positiva do gestor técnico. Rodrigo Silveira Duarte é um plano de contingência excelente para retenção no Banco de Talentos ou posições de banco de dados.',
          condicoes_ou_cuidados: [
            'Agilidade na emissão da proposta formal (candidato com processo paralelo)',
            'Alinhar expectativa salarial em torno de R$ 16.000 CLT com benefícios flexíveis',
          ],
        },
        comparativo_finalistas: [
          {
            candidato_id: 'ek2yvowslfrsyuy',
            nome: 'Lucas Ferreira Lima',
            cargo_atual: 'Engenheiro de Software Backend Pleno',
            score_geral: 88,
            score_tecnico: 90,
            score_comportamental: 86,
            estagio_atual: 'Entrevista técnica',
            risco_contratacao: 'Baixo',
            justificativa_risco:
              'Competências técnicas plenamente validadas na prática (Go/Kafka/Node), com métricas reais de redução de latência (-40%) e ótima comunicação oral gravada.',
            sintese_executiva:
              'Profissional de altíssima tração técnica com capacidade de resolver gargalos arquiteturais imediatos. Une repertório moderno de mensageria assíncrona e maturidade comportamental pronta para liderar iniciativas de microsserviços na equipe.',
            forcas_lado_a_lado: [
              'Domínio avançado de Kafka e microsserviços em larga escala (30M req/dia)',
              'Comunicação estruturada com contato visual e raciocínio lógico claro no vídeo',
              'Parecer do gestor com 100% de apoio ao avanço imediato',
            ],
            riscos_lado_a_lado: [
              'Risco de atrito salarial por conta de contraproposta de concorrente (R$ 16k CLT)',
              'Alinhamento prévio sobre participação em rotinas de plantão/on-call',
            ],
            trade_off:
              'Exige velocidade e pacote competitivo para fechamento, mas reduz a zero a curva de aprendizado em mensageria.',
            perguntas_entrevista_gaps: [
              {
                tema: 'Tolerância a falhas e mensageria',
                pergunta:
                  'No cenário de indisponibilidade parcial de tópicos Kafka durante horários de pico, qual estratégia de fallback e idempotência você implementaria na nossa esteira de microsserviços?',
                o_que_avaliar:
                  'Capacidade de manter resiliência, filas de Dead Letter Queue (DLQ) e consistência eventual de dados.',
              },
              {
                tema: 'Expectativa e prontidão',
                pergunta:
                  'Como você avalia a rotina de sustentação em produção e qual modelo de on-call considera justo e sustentável?',
                o_que_avaliar:
                  'Aderência e motivação prática sem desgaste de expectativas de longo prazo.',
              },
            ],
          },
          {
            candidato_id: candRodrigo.id,
            nome: 'Rodrigo Silveira Duarte',
            cargo_atual: 'Engenheiro de Microsserviços',
            score_geral: 85,
            score_tecnico: 88,
            score_comportamental: 82,
            estagio_atual: 'Entrevista técnica',
            risco_contratacao: 'Médio',
            justificativa_risco:
              'Grande profundidade em PostgreSQL e Go, porém com menor vivência recente em mensageria distribuída de ultra-baixa latência.',
            sintese_executiva:
              'Especialista muito forte em persistência, particionamento e consistência transacional. Perfil pragmático e executor, mais analítico e técnico, ideal como reforço em engenharia de dados e estabilidade.',
            forcas_lado_a_lado: [
              'Mais tempo de carreira (7 anos) com foco refinado em banco relacional',
              'Otimização de custos de infraestrutura (-25%) e modelagem de queries',
              'Perfil estável com pretensão flexível dentro da régua salarial',
            ],
            riscos_lado_a_lado: [
              'Curva de aprendizado maior em Kafka em comparação com Lucas',
              'Menor ênfase expressada em liderança de ritos ágeis',
            ],
            trade_off:
              'Excelente robustez de dados e contratação mais estável, porém exige ramp-up em fluxos de eventos distribuídos.',
            perguntas_entrevista_gaps: [
              {
                tema: 'Mensageria e concorrência',
                pergunta:
                  'Como você estruturaria o desacoplamento de serviços que atualmente compartilham o mesmo banco de dados PostgreSQL utilizando eventos assíncronos?',
                o_que_avaliar: 'Visão prática de padrão Outbox e governança de dados distribuídos.',
              },
              {
                tema: 'Liderança e mentoria',
                pergunta:
                  'Como você atua na disseminação de boas práticas de backend com desenvolvedores plenos e juniores no dia a dia?',
                o_que_avaliar: 'Disposição para mentoria e comunicação empática com o time.',
              },
            ],
          },
        ],
        matriz_tradeoffs: {
          dimensoes: [
            {
              criterio: 'Arquitetura de Microsserviços & Eventos',
              lucas: 'Excepcional (Prática diária em Kafka e Go)',
              rodrigo: 'Muito Bom (Forte em Go, menor foco em Kafka)',
              vantagem: 'Lucas Ferreira',
            },
            {
              criterio: 'Modelagem & Otimização de Bancos Relacionais',
              lucas: 'Sólido (Postgres com Redis)',
              rodrigo: 'Excelente (Especialista em particionamento)',
              vantagem: 'Rodrigo Silveira',
            },
            {
              criterio: 'Comunicação e Articulação Oral (Apresentação)',
              lucas: 'Excelente (Vídeo estruturado, nota 9.2 RH)',
              rodrigo: 'Boa (Pragmático e direto, nota 8.6 RH)',
              vantagem: 'Lucas Ferreira',
            },
            {
              criterio: 'Facilidade de Fechamento / Risco de Mercado',
              lucas: 'Atenção (Processo concorrente em andamento)',
              rodrigo: 'Tranquilo (Disponibilidade imediata)',
              vantagem: 'Rodrigo Silveira',
            },
          ],
        },
      }

      vagaBackend.set('sintese_executiva_ia', sinteseSeed)
      vagaBackend.set('data_sintese_executiva', new Date().toISOString())
      vagaBackend.set('versao_sintese_executiva', '1.0')
      app.save(vagaBackend)
    } catch (errVaga) {
      console.log('Aviso ao semear finalistas e síntese da vaga:', errVaga)
    }
  },
  (app) => {
    // Revert
    try {
      const vagasCol = app.findCollectionByNameOrId('vagas')
      if (vagasCol.fields.getByName('sintese_executiva_ia')) {
        vagasCol.fields.removeByName('sintese_executiva_ia')
      }
      if (vagasCol.fields.getByName('data_sintese_executiva')) {
        vagasCol.fields.removeByName('data_sintese_executiva')
      }
      if (vagasCol.fields.getByName('versao_sintese_executiva')) {
        vagasCol.fields.removeByName('versao_sintese_executiva')
      }
      app.save(vagasCol)
    } catch (_) {}
  },
)
