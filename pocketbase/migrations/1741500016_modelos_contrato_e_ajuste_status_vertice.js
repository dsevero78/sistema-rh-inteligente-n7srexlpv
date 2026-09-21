migrate(
  (app) => {
    // 1. Atualizar o contrato da Vértice Mídia (CT-PJ-2025-089) para status 'Em assinatura'
    // Pois a versão v2.0 (renovação e podcasts) foi emitida e está aguardando as assinaturas internas.
    // Também ajustamos versao_atual para 2, alinhando com a versão v2.0 existente no seed.
    try {
      const contratoVertice = app.findFirstRecordByData(
        'contratos',
        'codigo_contrato',
        'CT-PJ-2025-089',
      )
      contratoVertice.set('status', 'Em assinatura')
      contratoVertice.set('versao_atual', 2)
      app.save(contratoVertice)
    } catch (e) {
      console.log('Aviso ao atualizar status de CT-PJ-2025-089:', e)
    }

    // 2. Criar coleção 'modelos_contrato' para permitir ao usuário cadastrar, editar, duplicar
    // e gerenciar seus próprios modelos de contratos PJ e CLT interpoláveis com flexibilidade.
    const usersColId = '_pb_users_auth_'

    const modelosCollection = new Collection({
      name: 'modelos_contrato',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        { name: 'nome', type: 'text', required: true, max: 200 },
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
        { name: 'descricao', type: 'text', required: false, max: 1000 },
        { name: 'corpo_texto', type: 'text', required: true }, // Texto com placeholders {{...}}
        { name: 'tags', type: 'json', required: false }, // array de strings/tags
        { name: 'dias_alerta_padrao', type: 'number', required: false },
        {
          name: 'prazo_tipo_sugerido',
          type: 'select',
          values: ['Indeterminado', 'Determinado', 'Experiencia 45+45', 'Projeto Especifico'],
          maxSelect: 1,
          required: false,
        },
        { name: 'ativo', type: 'bool' }, // PocketBase rule: bool flags not required
        { name: 'eh_padrao_sistema', type: 'bool' }, // Flag para identificar se veio do sistema ou criado pelo usuário
        { name: 'criado_por_nome', type: 'text', required: false },
        {
          name: 'criado_por_usuario',
          type: 'relation',
          collectionId: usersColId,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_mod_contrato_modalidade ON modelos_contrato (modalidade)',
        'CREATE INDEX idx_mod_contrato_ativo ON modelos_contrato (ativo)',
        'CREATE INDEX idx_mod_contrato_tipo ON modelos_contrato (tipo_modelo)',
      ],
    })

    app.save(modelosCollection)

    // 3. Semear os 4 modelos homologados SouYess na coleção 'modelos_contrato'
    try {
      const modelosCol = app.findCollectionByNameOrId('modelos_contrato')

      // Modelo 1: PJ Padrão Prestação de Serviços
      const m1 = new Record(modelosCol)
      m1.set('nome', 'Contrato de Prestação de Serviços Técnicos Especializados (PJ)')
      m1.set('modalidade', 'PJ')
      m1.set('tipo_modelo', 'PJ_PRESTACAO_SERVICOS')
      m1.set(
        'descricao',
        'Modelo padrão corporativo SouYess com escopo por entregas, SLA de atendimento, remuneração mensal fechada (160h base), não subordinação, sigilo e conformidade fiscal (CNDT/CRF).',
      )
      m1.set('tags', [
        'Lei 13.429/17',
        'Sem Vínculo Empregatício',
        'SLA & Entregas',
        'CNDT Obrigatória',
      ])
      m1.set('dias_alerta_padrao', 60)
      m1.set('prazo_tipo_sugerido', 'Determinado')
      m1.set('ativo', true)
      m1.set('eh_padrao_sistema', true)
      m1.set('criado_por_nome', 'Sistema SouYess (Jurídico Corporativo)')
      m1.set(
        'corpo_texto',
        `INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS TÉCNICOS ESPECIALIZADOS
CONTRATO NÚMERO: {{CODIGO_CONTRATO}}

Pelo presente instrumento particular, de um lado:

CONTRATANTE:
SOUYESS TECNOLOGIA E SERVIÇOS S/A, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº 12.345.678/0001-90, com sede na Avenida Paulista, nº 1000, 14º andar, Bela Vista, São Paulo/SP, neste ato representada na forma de seu Estatuto Social por seu gestor responsável {{GESTOR_NOME}};

E, de outro lado:

CONTRATADA:
{{PRESTADOR_RAZAO_SOCIAL}}, inscrita no CNPJ/MF sob o nº {{PRESTADOR_CNPJ}}, com sede em {{PRESTADOR_ENDERECO}}, neste ato representada por seu titular/sócio-administrador {{PESSOA_NOME}}, portador do documento de identificação sob o nº {{PESSOA_DOCUMENTO}}, doravante denominada simplesmente CONTRATADA;

Têm entre si, justo e acordado, o presente Contrato de Prestação de Serviços, mediante as seguintes cláusulas:

CLÁUSULA PRIMEIRA — DO OBJETO E ESCOPO
1.1. O presente instrumento tem por objeto a prestação, pela CONTRATADA à CONTRATANTE, de serviços especializados de {{CARGO_FUNCAO}}, atuando perante a área de {{DEPARTAMENTO}}, com centro de custo vinculado {{CENTRO_CUSTO}}.
1.2. As atividades serão desenvolvidas com plena autonomia técnica, gerencial e operacional, sem subordinação hierárquica, exclusividade ou controle rígido de jornada, balizando-se por metas, entregáveis e SLAs de qualidade acordados.

CLÁUSULA SEGUNDA — DA VIGÊNCIA E RENOVAÇÃO
2.1. O presente contrato vigorará de {{DATA_INICIO}} a {{DATA_FIM}}, com modalidade de vigência pactuada a título {{PRAZO_TIPO}}.
2.2. A CONTRATANTE adota a política de governança de contratos com Janela de Decisão de Renovação de {{DIAS_ALERTA}} dias de antecedência ao termo final, período no qual as partes avaliarão os relatórios de desempenho e conformidade para formalização de termo aditivo.

CLÁUSULA TERCEIRA — DOS HONORÁRIOS E CONDIÇÕES DE PAGAMENTO
3.1. Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor mensal bruto de R$ {{VALOR_MENSAL}} (equivalente a R$ {{VALOR_HORA}}/hora calculado sobre a base contratual de {{HORAS_BASE}} horas mensais).
3.2. O pagamento será realizado até o dia 10 do mês subsequente à prestação, mediante:
    a) Envio prévio da Nota Fiscal de Serviços eletrônica emitida de acordo com as retenções legais cabíveis;
    b) Validação das entregas ou horas homologadas no sistema SouYess People Hub;
    c) Comprovação de regularidade fiscal e trabalhista (CND Federal, CRF/FGTS e CNDT atualizadas no cofre digital).

CLÁUSULA QUARTA — DA NÃO SUBORDINAÇÃO E AUTONOMIA
4.1. As partes reconhecem expressamente que este contrato possui natureza estritamente civil e mercantil, inexistindo qualquer vínculo empregatício de natureza celetista entre a CONTRATANTE e a CONTRATADA ou seus sócios e prepostos, nos termos do artigo 4º-A da Lei nº 6.019/1974 com a redação dada pela Lei nº 13.429/2017.

CLÁUSULA QUINTA — DA CONFIDENCIALIDADE E PROTEÇÃO DE DADOS (LGPD)
5.1. A CONTRATADA obriga-se a manter sob sigilo absoluto todas as informações estratégicas, técnicas, financeiras e cadastrais a que tiver acesso, bem como a tratar dados pessoais estritamente nos limites da Lei Geral de Proteção de Dados (Lei nº 13.709/2018).

CLÁUSULA SEXTA — DAS CONDIÇÕES ESPECIAIS
{{CLAUSULAS_ESPECIAIS}}

CLÁUSULA SÉTIMA — DO FORO
7.1. Para dirimir quaisquer litígios oriundos do presente contrato, as partes elegem o Foro da Comarca da Capital do Estado de São Paulo, com exclusão de qualquer outro por mais privilegiado que seja.

E por estarem justas e contratadas, as partes firmam o presente instrumento por meio de registro de assinatura digital interna no sistema SouYess People Hub, com carimbo de tempo, IP e hash criptográfico de rastreabilidade integral.

São Paulo/SP, {{DATA_EXTENSO}}.

______________________________________
CONTRATANTE: SOUYESS TECNOLOGIA E SERVIÇOS S/A
Gestor Responsável: {{GESTOR_NOME}}

______________________________________
CONTRATADA: {{PRESTADOR_RAZAO_SOCIAL}}
Representante Legal: {{PESSOA_NOME}} ({{PESSOA_DOCUMENTO}})`,
      )
      app.save(m1)

      // Modelo 2: PJ Horista / Por Demanda
      const m2 = new Record(modelosCol)
      m2.set('nome', 'Contrato de Prestação de Serviços por Demanda / Banco de Horas (PJ)')
      m2.set('modalidade', 'PJ')
      m2.set('tipo_modelo', 'PJ_HORISTA')
      m2.set(
        'descricao',
        'Contrato sob demanda com valor por hora apurado através de apontamento mensal homologado de horas, limite máximo mensal e fechamento contábil integrado.',
      )
      m2.set('tags', ['Apontamento de Horas', 'Valor/Hora Flexível', 'Fechamento Contábil'])
      m2.set('dias_alerta_padrao', 60)
      m2.set('prazo_tipo_sugerido', 'Projeto Especifico')
      m2.set('ativo', true)
      m2.set('eh_padrao_sistema', true)
      m2.set('criado_por_nome', 'Sistema SouYess (Jurídico Corporativo)')
      m2.set(
        'corpo_texto',
        `INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS POR DEMANDA E HORAS HOMOLOGADAS
CONTRATO NÚMERO: {{CODIGO_CONTRATO}}

Pelo presente instrumento, de um lado SOUYESS TECNOLOGIA E SERVIÇOS S/A (CONTRATANTE), e de outro lado {{PRESTADOR_RAZAO_SOCIAL}} (CONTRATADA), representada por {{PESSOA_NOME}}:

CLÁUSULA PRIMEIRA — DO ESCOPO FLEXÍVEL
1.1. A CONTRATADA prestará consultoria técnica sob demanda para {{CARGO_FUNCAO}} no departamento de {{DEPARTAMENTO}}, centro de custo {{CENTRO_CUSTO}}.

CLÁUSULA SEGUNDA — DA REMUNERAÇÃO POR HORA E APONTAMENTO
2.1. A remuneração será apurada com base nas horas efetivamente aprovadas no ciclo mensal, à razão de R$ {{VALOR_HORA}} por hora prestada, até o teto estimado de {{HORAS_BASE}} horas/mês (estimativa total de R$ {{VALOR_MENSAL}}).
2.2. As horas deverão ser lançadas no módulo de Horas & Fechamento SouYess até o último dia do mês e submetidas ao validador {{GESTOR_NOME}}.

CLÁUSULA TERCEIRA — VIGÊNCIA E RESCISÃO
3.1. Início em {{DATA_INICIO}} com término previsto em {{DATA_FIM}}. Rescisão imotivada facultada a qualquer das partes mediante aviso prévio de 30 dias.

CLÁUSULA QUARTA — CONDIÇÕES ESPECÍFICAS
{{CLAUSULAS_ESPECIAIS}}

Assinado eletronicamente via SouYess People Hub em {{DATA_EXTENSO}}.`,
      )
      app.save(m2)

      // Modelo 3: CLT Experiência 45+45 dias
      const m3 = new Record(modelosCol)
      m3.set('nome', 'Contrato Individual de Trabalho a Título de Experiência (CLT — 45 + 45 dias)')
      m3.set('modalidade', 'CLT')
      m3.set('tipo_modelo', 'CLT_EXPERIENCIA')
      m3.set(
        'descricao',
        'Contrato de experiência com prazo inicial de 45 dias prorrogável uma única vez por igual período (total 90 dias, art. 445 e 451 da CLT), vinculado à rotina de integração e avaliação 30-60-90.',
      )
      m3.set('tags', [
        'Art. 443 CLT',
        'Art. 445 e 451 CLT',
        'Experiência 90d',
        'Integração 30-60-90',
      ])
      m3.set('dias_alerta_padrao', 15)
      m3.set('prazo_tipo_sugerido', 'Experiencia 45+45')
      m3.set('ativo', true)
      m3.set('eh_padrao_sistema', true)
      m3.set('criado_por_nome', 'Sistema SouYess (Gente & Gestão)')
      m3.set(
        'corpo_texto',
        `CONTRATO INDIVIDUAL DE TRABALHO A TÍTULO DE EXPERIÊNCIA
CÓDIGO INTERNO: {{CODIGO_CONTRATO}}

Por este instrumento particular de contrato de trabalho, de um lado:

EMPREGADORA:
SOUYESS TECNOLOGIA E SERVIÇOS S/A, inscrita no CNPJ sob o nº 12.345.678/0001-90, sediada na Avenida Paulista, nº 1000, 14º andar, Bela Vista, São Paulo/SP;

E, de outro lado:

EMPREGADA(O):
{{PESSOA_NOME}}, nacionalidade brasileira, portador(a) do CPF sob o nº {{PESSOA_DOCUMENTO}}, e-mail {{PESSOA_EMAIL}}, telefone {{PESSOA_TELEFONE}}, residente e domiciliado(a) na comarca de domicílio cadastrada;

Celebram o presente CONTRATO DE TRABALHO A TÍTULO DE EXPERIÊNCIA, regido pelo Decreto-Lei nº 5.452/1943 (Consolidação das Leis do Trabalho - CLT), sob as seguintes cláusulas:

CLÁUSULA PRIMEIRA — DO CARGO E LOTAÇÃO
1.1. O(A) EMPREGADO(A) é admitido(a) na data de {{DATA_INICIO}} para exercer as funções inerentes ao cargo de {{CARGO_FUNCAO}}, integrando a equipe de {{DEPARTAMENTO}}, com lotação vinculada ao Centro de Custo {{CENTRO_CUSTO}}, sob gestão direta de {{GESTOR_NOME}}.

CLÁUSULA SEGUNDA — DA VIGÊNCIA E PRORROGAÇÃO
2.1. O presente contrato tem caráter experimental com duração inicial de 45 (quarenta e cinco) dias, com término previsto do 1º período em {{DATA_PRIMEIRO_PERIODO}}.
2.2. Não havendo manifestação em contrário por qualquer das partes, este contrato será automaticamente prorrogado por mais 45 (quarenta e cinco) dias, findando em {{DATA_FIM}}, totalizando o limite legal de 90 (noventa) dias estabelecido pelo parágrafo único do art. 445 da CLT.
2.3. O desempenho será acompanhado pelas metas estabelecidas na Rotina de Integração 30-60-90 SouYess, com alerta disparado ao gestor com {{DIAS_ALERTA}} dias de antecedência para definição formal sobre a efetivação por prazo indeterminado.
2.4. Continuando a prestação de serviços após vencido o prazo experimental sem rescisão formal, o contrato converter-se-á, de pleno direito, em Contrato de Trabalho por Prazo Indeterminado.

CLÁUSULA TERCEIRA — DA REMUNERAÇÃO E BENEFÍCIOS
3.1. Pelo exercício de suas atividades, a EMPREGADORA pagará mensalmente ao(à) EMPREGADO(A) o salário bruto de R$ {{VALOR_MENSAL}} ({{VALOR_MENSAL_EXTENSO}}), correspondente ao valor horário base de R$ {{VALOR_HORA}}/hora (base {{HORAS_BASE}} horas mensais).
3.2. O pagamento dar-se-á até o 5º (quinto) dia útil do mês subsequente ao trabalhado, via crédito em conta salário.
3.3. O(A) EMPREGADO(A) fará jus ao pacote de benefícios corporativos SouYess, compreendendo Vale-Refeição/Alimentação, Assistência Médica e Odontológica, Seguro de Vida em grupo e auxílio home-office conforme política interna.

CLÁUSULA QUARTA — DA JORNADA DE TRABALHO
4.1. A jornada semanal normal de trabalho será de 40 (quarenta) horas, distribuídas de segunda a sexta-feira, em regime de horário flexível e modelo híbrido de trabalho, respeitados os intervalos intrajornada legais para descanso e alimentação.

CLÁUSULA QUINTA — DA SAÚDE OCUPACIONAL E CONFORMIDADE
5.1. O(A) EMPREGADO(A) declara ter realizado o competente Exame Médico Admissional (ASO), arquivado no cofre digital SouYess sob atestado de plena aptidão física e mental para a função, obrigando-se a realizar os exames periódicos quando convocado(a).

CLÁUSULA SEXTA — CONDIÇÕES ESPECÍFICAS E LGPD
{{CLAUSULAS_ESPECIAIS}}

E por estarem de pleno e comum acordo, assinam digitalmente o presente instrumento perante o SouYess People Hub, conferindo validade probatória integral para todos os fins perante a legislação trabalhista e previdenciária.

São Paulo/SP, {{DATA_EXTENSO}}.

______________________________________
EMPREGADORA: SOUYESS TECNOLOGIA E SERVIÇOS S/A
Representante Legal / RH: {{GESTOR_NOME}}

______________________________________
EMPREGADO(A): {{PESSOA_NOME}}
CPF: {{PESSOA_DOCUMENTO}}`,
      )
      app.save(m3)

      // Modelo 4: CLT Indeterminado Padrão
      const m4 = new Record(modelosCol)
      m4.set('nome', 'Contrato de Trabalho por Prazo Indeterminado (CLT Padrão)')
      m4.set('modalidade', 'CLT')
      m4.set('tipo_modelo', 'CLT_INDETERMINADO')
      m4.set(
        'descricao',
        'Contrato individual de trabalho padrão celetista, sem termo prefixado de término, com especificação de cargo, salário, jornada 40h semanais e cláusulas de sigilo.',
      )
      m4.set('tags', ['CLT', 'Prazo Indeterminado', 'Jornada 40h', 'eSocial S-2200'])
      m4.set('dias_alerta_padrao', 30)
      m4.set('prazo_tipo_sugerido', 'Indeterminado')
      m4.set('ativo', true)
      m4.set('eh_padrao_sistema', true)
      m4.set('criado_por_nome', 'Sistema SouYess (Gente & Gestão)')
      m4.set(
        'corpo_texto',
        `CONTRATO INDIVIDUAL DE TRABALHO POR PRAZO INDETERMINADO
REGISTRO: {{CODIGO_CONTRATO}}

EMPREGADORA: SOUYESS TECNOLOGIA E SERVIÇOS S/A (CNPJ 12.345.678/0001-90)
EMPREGADO(A): {{PESSOA_NOME}} (CPF {{PESSOA_DOCUMENTO}})

CLÁUSULA 1 — ADMISSÃO E FUNÇÃO
O(A) empregado(a) é admitido(a) a partir de {{DATA_INICIO}} para exercer o cargo de {{CARGO_FUNCAO}} no departamento {{DEPARTAMENTO}}, com reporte a {{GESTOR_NOME}}.

CLÁUSULA 2 — VIGÊNCIA
O presente contrato é firmado por prazo indeterminado, vigorando a partir da data de início supra indicada.

CLÁUSULA 3 — SALÁRIO E BENEFÍCIOS
Salário mensal fixo de R$ {{VALOR_MENSAL}} (R$ {{VALOR_HORA}}/h na base de {{HORAS_BASE}}h mensais), pago até o 5º dia útil do mês subsequente, além de benefícios corporativos SouYess.

CLÁUSULA 4 — CONDIÇÕES PARTICULARES
{{CLAUSULAS_ESPECIAIS}}

Assinado digitalmente via SouYess People Hub em {{DATA_EXTENSO}}.`,
      )
      app.save(m4)
    } catch (eSeed) {
      console.log('Aviso ao semear modelos homologados:', eSeed)
    }
  },
  (app) => {
    try {
      const modCol = app.findCollectionByNameOrId('modelos_contrato')
      app.delete(modCol)
    } catch (_) {}
  },
)
