/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Atualizar a coleção 'candidatos' para aceitar 'Indicação' no select canal_origem (se ainda não existir)
    try {
      const candCol = app.findCollectionByNameOrId('candidatos')
      const canalField = candCol.fields.getByName('canal_origem')
      if (canalField) {
        // Garantir que 'Indicação' está entre os valores
        const currentVals = canalField.values || []
        if (!currentVals.includes('Indicação')) {
          canalField.values = [...currentVals, 'Indicação']
          app.save(candCol)
        }
      }
    } catch (errCanal) {
      console.log('Aviso ao atualizar canal_origem de candidatos:', errCanal)
    }

    // 2. Criar a coleção 'indicacoes'
    const vagasCol = app.findCollectionByNameOrId('vagas')
    const candCol = app.findCollectionByNameOrId('candidatos')

    try {
      app.findCollectionByNameOrId('indicacoes')
      console.log('Coleção indicacoes já existe, pulando criação.')
    } catch (_) {
      const indicacoesCol = new Collection({
        name: 'indicacoes',
        type: 'base',
        listRule: '',
        viewRule: '',
        createRule: '',
        updateRule: '',
        deleteRule: "@request.auth.id != ''",
        fields: [
          {
            name: 'token_indicador',
            type: 'text',
            required: true,
            min: 5,
            max: 100,
          },
          {
            name: 'indicador',
            type: 'relation',
            required: true,
            collectionId: candCol.id,
            maxSelect: 1,
          },
          {
            name: 'vaga',
            type: 'relation',
            required: true,
            collectionId: vagasCol.id,
            maxSelect: 1,
          },
          {
            name: 'indicado_nome',
            type: 'text',
            required: true,
            min: 2,
            max: 200,
          },
          {
            name: 'indicado_email',
            type: 'email',
            required: true,
          },
          {
            name: 'indicado_telefone',
            type: 'text',
            max: 50,
          },
          {
            name: 'indicado_linkedin',
            type: 'url',
          },
          {
            name: 'mensagem_indicador',
            type: 'text',
            max: 2000,
          },
          {
            name: 'curriculo',
            type: 'file',
            maxSelect: 1,
            maxSize: 10485760, // 10MB
            mimeTypes: ['application/pdf'],
          },
          {
            name: 'status',
            type: 'select',
            required: true,
            values: ['Nova', 'Em avaliação', 'Convertida', 'Recusada'],
            maxSelect: 1,
          },
          {
            name: 'motivo_recusa',
            type: 'text',
            max: 500,
          },
          {
            name: 'candidato_gerado',
            type: 'relation',
            collectionId: candCol.id,
            maxSelect: 1,
          },
          {
            name: 'consentimento_lgpd',
            type: 'bool',
          },
          {
            name: 'consentimento_lgpd_data',
            type: 'date',
          },
          {
            name: 'consentimento_lgpd_ip',
            type: 'text',
            max: 100,
          },
          {
            name: 'respostas_triagem',
            type: 'json',
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
          'CREATE INDEX idx_indicacoes_token ON indicacoes (token_indicador)',
          'CREATE INDEX idx_indicacoes_indicador ON indicacoes (indicador)',
          'CREATE INDEX idx_indicacoes_vaga ON indicacoes (vaga)',
          'CREATE INDEX idx_indicacoes_status ON indicacoes (status)',
          'CREATE INDEX idx_indicacoes_email ON indicacoes (indicado_email)',
        ],
      })
      app.save(indicacoesCol)
    }

    // 3. Atualizar ou adicionar token_indicador nas avaliações de experiência dos promotores (Juliana e Leonardo)
    // Se a tabela avaliacoes_experiencia não tiver campo token_indicador, podemos adicionar na própria coleção ou derivar do token_pesquisa / criar campo
    try {
      const avalCol = app.findCollectionByNameOrId('avaliacoes_experiencia')
      if (!avalCol.fields.getByName('token_indicador')) {
        avalCol.fields.add(
          new TextField({
            name: 'token_indicador',
            max: 100,
          }),
        )
        app.save(avalCol)
      }

      // Preencher token_indicador nas avaliações existentes que são promotoras (Juliana e Leonardo)
      const avalsPromotoras = app.findRecordsByFilter(
        'avaliacoes_experiencia',
        'nps_score >= 9 || nota_geral >= 9',
        '-created',
        50,
        0,
      )
      for (let i = 0; i < avalsPromotoras.length; i++) {
        const av = avalsPromotoras[i]
        if (!av.getString('token_indicador')) {
          const tok = 'ind-' + av.getString('token_pesquisa').replace(/^exp-/, '')
          av.set('token_indicador', tok)
          app.save(av)
        }
      }
    } catch (errTok) {
      console.log('Aviso ao calibrar token_indicador em avaliações:', errTok)
    }

    // 4. Seeds de Indicações para demonstração
    // - 1 Indicação Nova pendente de contato
    // - 1 Indicação Convertida com candidatura gerada e presente no pipeline em Triagem
    try {
      let julianaCand = null
      let vagaBackend = null
      let vagaDesign = null

      try {
        julianaCand = app.findFirstRecordByData('candidatos', 'email', 'juliana.mendes@exemplo.com')
      } catch (_) {}
      try {
        vagaBackend = app.findFirstRecordByData(
          'vagas',
          'titulo',
          'Desenvolvedor(a) Backend Sênior',
        )
      } catch (_) {}
      try {
        vagaDesign = app.findFirstRecordByData('vagas', 'titulo', 'Product Designer Pleno')
      } catch (_) {}

      if (julianaCand && vagaBackend) {
        const indicacoesCol = app.findCollectionByNameOrId('indicacoes')

        // 4.1 Seed 1: Nova / Pendente
        try {
          app.findFirstRecordByData(
            'indicacoes',
            'indicado_email',
            'lucas.almeida.indicado@exemplo.com',
          )
        } catch (_) {
          const recNova = new Record(indicacoesCol)
          recNova.set('token_indicador', 'ind-juliana-mendes-seed')
          recNova.set('indicador', julianaCand.id)
          recNova.set('vaga', vagaBackend.id)
          recNova.set('indicado_nome', 'Lucas Almeida Silva')
          recNova.set('indicado_email', 'lucas.almeida.indicado@exemplo.com')
          recNova.set('indicado_telefone', '(11) 98765-4321')
          recNova.set('indicado_linkedin', 'https://linkedin.com/in/lucas-almeida-go')
          recNova.set(
            'mensagem_indicador',
            'Trabalhei com o Lucas no time de microsserviços da CloudTech. Ele tem domínio exemplar de Go, mensageria Kafka e liderança técnica de alto nível. Recomendo muito para a vaga sênior!',
          )
          recNova.set('status', 'Nova')
          recNova.set('consentimento_lgpd', true)
          recNova.set('consentimento_lgpd_data', new Date().toISOString())
          recNova.set('consentimento_lgpd_ip', '187.54.120.45')
          app.save(recNova)
        }

        // 4.2 Seed 2: Convertida (com candidato + pipeline em Triagem gerados)
        try {
          app.findFirstRecordByData(
            'indicacoes',
            'indicado_email',
            'mariana.costa.indicada@exemplo.com',
          )
        } catch (_) {
          // Criar candidato se não existir
          let marianaCand = null
          try {
            marianaCand = app.findFirstRecordByData(
              'candidatos',
              'email',
              'mariana.costa.indicada@exemplo.com',
            )
          } catch (_) {
            const candCol = app.findCollectionByNameOrId('candidatos')
            marianaCand = new Record(candCol)
            marianaCand.set('nome', 'Mariana Costa Ferreira')
            marianaCand.set('email', 'mariana.costa.indicada@exemplo.com')
            marianaCand.set('telefone', '(11) 97654-3210')
            marianaCand.set('cargo_atual', 'Product Designer Sênior')
            marianaCand.set('empresa_atual', 'Inovação Digital')
            marianaCand.set('localizacao', 'São Paulo, SP')
            marianaCand.set('vaga', (vagaDesign || vagaBackend).id)
            marianaCand.set('linkedin', 'https://linkedin.com/in/mariana-costa-ux')
            marianaCand.set(
              'resumo',
              'Designer de produto com 6 anos de experiência em plataformas corporativas, Design Systems e facilitação de discovery com stakeholders.',
            )
            marianaCand.set('habilidades_tecnicas', [
              'Figma',
              'Design System',
              'UX Research',
              'Prototipação',
            ])
            marianaCand.set('competencias_comportamentais', [
              'Empatia',
              'Comunicação assertiva',
              'Visão de negócio',
            ])
            marianaCand.set('status', 'Triagem')
            marianaCand.set('score_semantico', 92)
            marianaCand.set('canal_origem', 'Indicação')
            marianaCand.set('consentimento_lgpd', true)
            marianaCand.set('consentimento_lgpd_data', new Date().toISOString())
            marianaCand.set('consentimento_lgpd_ip', '177.18.90.12')
            app.save(marianaCand)

            // Criar pipeline
            const pipeCol = app.findCollectionByNameOrId('pipeline')
            const pipeRec = new Record(pipeCol)
            pipeRec.set('candidato', marianaCand.id)
            pipeRec.set('vaga', (vagaDesign || vagaBackend).id)
            pipeRec.set('estagio', 'Triagem')
            pipeRec.set(
              'anotacoes',
              'Indicação de Mariana pela colaboradora/candidata promotora Juliana Mendes Castro. Aderência alta aos requisitos da vaga.',
            )
            pipeRec.set('historico', [
              {
                data: new Date().toISOString(),
                estagio: 'Triagem',
                autor: 'Programa de Indicação (Juliana Mendes)',
                nota: 'Indicação aceita e convertida no pipeline de seleção em Triagem.',
              },
            ])
            app.save(pipeRec)
          }

          const recConvertida = new Record(indicacoesCol)
          recConvertida.set('token_indicador', 'ind-juliana-mendes-seed')
          recConvertida.set('indicador', julianaCand.id)
          recConvertida.set('vaga', (vagaDesign || vagaBackend).id)
          recConvertida.set('indicado_nome', 'Mariana Costa Ferreira')
          recConvertida.set('indicado_email', 'mariana.costa.indicada@exemplo.com')
          recConvertida.set('indicado_telefone', '(11) 97654-3210')
          recConvertida.set('indicado_linkedin', 'https://linkedin.com/in/mariana-costa-ux')
          recConvertida.set(
            'mensagem_indicador',
            'Excelente profissional de Design System e liderança de projetos de produto. Tem total sinergia com o ritmo ágil e a cultura de Gente & Gestão!',
          )
          recConvertida.set('status', 'Convertida')
          recConvertida.set('candidato_gerado', marianaCand.id)
          recConvertida.set('consentimento_lgpd', true)
          recConvertida.set('consentimento_lgpd_data', new Date().toISOString())
          recConvertida.set('consentimento_lgpd_ip', '177.18.90.12')
          app.save(recConvertida)
        }
      }
    } catch (seedIndErr) {
      console.log('Aviso ao semear indicações:', seedIndErr)
    }

    // 5. Atualizar Agente Nativo 'gestor-de-talentos' com ferramenta de leitura de indicações
    try {
      $ai.agents.putTools(app, 'gestor-de-talentos', [
        {
          collection: 'indicacoes',
          perms: { read: true, list: true },
          actAs: 'admin',
        },
      ])

      $ai.agents.putMemories(app, 'gestor-de-talentos', [
        {
          type: 'text',
          payload: {
            text:
              'Programa de Indicação por Candidatos Promotores (NPS 9-10):\n' +
              '1. Candidatos que avaliaram sua experiência no processo com notas 9 ou 10 (promotores) tornam-se embaixadores e ganham um link exclusivo (/indicar/:token) para indicar talentos para vagas ativas.\n' +
              '2. As indicações são gerenciadas na coleção "indicacoes" com dados do indicado, justificativa/mensagem do indicador, vaga, consentimento LGPD e status (Nova, Em avaliação, Convertida, Recusada).\n' +
              '3. Quando o RH aceita a indicação, o sistema converte a pessoa indicada em candidato + pipeline em Triagem (origem "Indicação"), notificando o indicador e o indicado por e-mail com registro em logs_emails_status.\n' +
              '4. Indicadores acumulam reconhecimento e pontos/créditos de sucesso à medida que suas indicações avançam no funil de seleção.',
          },
        },
      ])
    } catch (agentErr) {
      console.log(
        'Aviso ao atualizar agente gestor-de-talentos com módulo de indicações:',
        agentErr,
      )
    }
  },
  (app) => {
    try {
      const indCol = app.findCollectionByNameOrId('indicacoes')
      if (indCol) app.delete(indCol)
    } catch (_) {}
  },
)
