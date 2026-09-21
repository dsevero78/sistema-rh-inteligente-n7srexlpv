migrate(
  (app) => {
    // 1. Obter empresas estruturadas existentes
    let holdingId = ''
    let techId = ''
    let midiaId = ''
    let opsId = ''

    try {
      const holding = app.findFirstRecordByData('empresas', 'sigla', 'EMP-01')
      holdingId = holding.id
    } catch (_) {
      try {
        const holding2 = app.findFirstRecordByData('empresas', 'tipo', 'Holding / Matriz')
        holdingId = holding2.id
      } catch (_) {}
    }

    try {
      const tech = app.findFirstRecordByData('empresas', 'sigla', 'EMP-02')
      techId = tech.id
    } catch (_) {}

    try {
      const midia = app.findFirstRecordByData('empresas', 'sigla', 'EMP-03')
      midiaId = midia.id
    } catch (_) {}

    try {
      const ops = app.findFirstRecordByData('empresas', 'sigla', 'EMP-04')
      opsId = ops.id
    } catch (_) {}

    // Obter áreas correspondentes
    let areaEngSoftware = ''
    let areaOpsGeral = ''
    let areaGenteHolding = ''

    try {
      const a = app.findFirstRecordByData('areas', 'nome', 'Engenharia de Software & Cloud')
      areaEngSoftware = a.id
    } catch (_) {}

    try {
      const a = app.findFirstRecordByData('areas', 'nome', 'Operações & Facilities')
      areaOpsGeral = a.id
    } catch (_) {}

    try {
      const a = app.findFirstRecordByData('areas', 'nome', 'Gente & Gestão (People)')
      areaGenteHolding = a.id
    } catch (_) {}

    // 2. Garantir que as 4 pessoas existentes estejam vinculadas corretamente à sua empresa
    // Renato Albuquerque -> SouYess Tecnologia (Tech)
    // Juliana Mendes Castro -> SouYess Holding (Holding)
    // Camila Vasconcelos -> SouYess Vértice Mídia (Vértice)
    // Dr. Eduardo Silveira -> SouYess Holding (Holding)
    try {
      const pessoasList = app.findRecordsByFilter('pessoas', '', '', 100, 0)
      for (const p of pessoasList) {
        const nome = p.getString('nome')
        if (nome.includes('Renato') && techId) {
          p.set('empresa', techId)
          if (areaEngSoftware) p.set('area', areaEngSoftware)
          app.save(p)
        } else if (nome.includes('Juliana') && holdingId) {
          p.set('empresa', holdingId)
          if (areaGenteHolding) p.set('area', areaGenteHolding)
          // Garantir salário de R$ 9.500,00
          p.set('valor_contratado', 9500)
          p.set('modalidade', 'CLT')
          app.save(p)
        } else if (nome.includes('Camila') && midiaId) {
          p.set('empresa', midiaId)
          p.set('modalidade', 'PJ')
          app.save(p)
        } else if (nome.includes('Eduardo') && holdingId) {
          p.set('empresa', holdingId)
          p.set('modalidade', 'PJ')
          app.save(p)
        }
      }
    } catch (errP) {
      console.log('Aviso ao atualizar pessoas existentes:', errP)
    }

    // 3. Semear colaboradores CLT complementares para fechar a folha CLT de R$ 19.870,01:
    // - Juliana Mendes Castro (Holding): R$ 9.500,00
    // - Lucas Ferreira Lima (Tech - Engenheiro de Software / Cloud): R$ 5.870,01
    // - Marcelo Santos Ramos (Operações - Analista de Operações / Facilities): R$ 4.500,00
    // Total CLT = 9.500,00 + 5.870,01 + 4.500,00 = 19.870,01 (exatos 3 colaboradores ativos, ou 4 com proposta/onboarding)

    const pessoasCol = app.findCollectionByNameOrId('pessoas')

    // 3.1 Lucas Ferreira Lima (Tech CLT - R$ 5.870,01)
    try {
      let pLucas
      try {
        pLucas = app.findFirstRecordByData('pessoas', 'email', 'lucas.ferreira@tech.com')
      } catch (_) {
        try {
          pLucas = app.findFirstRecordByData('pessoas', 'nome', 'Lucas Ferreira Lima')
        } catch (_) {}
      }

      if (!pLucas) {
        pLucas = new Record(pessoasCol)
        pLucas.set('nome', 'Lucas Ferreira Lima')
        pLucas.set('tipo_pessoa', 'PF')
        pLucas.set('modalidade', 'CLT')
        pLucas.set('cpf_cnpj', '389.472.918-44')
        pLucas.set('email', 'lucas.ferreira@tech.com')
        pLucas.set('telefone', '(11) 98765-4321')
        pLucas.set('cargo_funcao', 'Engenheiro de Software Backend Pleno')
        pLucas.set('departamento', 'Engenharia de Software')
        pLucas.set('centro_custo', 'CC-ENG-SW')
        pLucas.set('gestor_nome', 'Carlos Mendonça')
        try {
          const uGestor = app.findAuthRecordByEmail('_pb_users_auth_', 'gestor@empresa.com')
          pLucas.set('gestor_responsavel', uGestor.id)
        } catch (_) {}
        pLucas.set('data_inicio', '2025-03-01 00:00:00.000Z')
        pLucas.set('situacao_contrato', 'Vigente')
        pLucas.set('valor_contratado', 5870.01)
        pLucas.set('horas_mensais_base', 160)
        pLucas.set('valor_hora', 36.69)
        pLucas.set('duracao_meses', 0)
        pLucas.set('prazo_tipo', 'Indeterminado')
        pLucas.set('percentual_integracao', 100)
        pLucas.set(
          'observacoes',
          'Colaborador CLT do time core de engenharia de software e microsserviços SouYess.',
        )
      } else {
        pLucas.set('modalidade', 'CLT')
        pLucas.set('valor_contratado', 5870.01)
      }

      if (techId) pLucas.set('empresa', techId)
      if (areaEngSoftware) pLucas.set('area', areaEngSoftware)
      app.save(pLucas)
    } catch (errL) {
      console.log('Aviso ao semear Lucas Ferreira CLT:', errL)
    }

    // 3.2 Marcelo Santos Ramos (Operações CLT - R$ 4.500,00)
    try {
      let pMarcelo
      try {
        pMarcelo = app.findFirstRecordByData('pessoas', 'email', 'marcelo.santos@souyess.com.br')
      } catch (_) {
        try {
          pMarcelo = app.findFirstRecordByData('pessoas', 'nome', 'Marcelo Santos Ramos')
        } catch (_) {}
      }

      if (!pMarcelo) {
        pMarcelo = new Record(pessoasCol)
        pMarcelo.set('nome', 'Marcelo Santos Ramos')
        pMarcelo.set('tipo_pessoa', 'PF')
        pMarcelo.set('modalidade', 'CLT')
        pMarcelo.set('cpf_cnpj', '271.829.403-51')
        pMarcelo.set('email', 'marcelo.santos@souyess.com.br')
        pMarcelo.set('telefone', '(19) 98112-9900')
        pMarcelo.set('cargo_funcao', 'Analista de Operações & Infraestrutura')
        pMarcelo.set('departamento', 'Operações & Facilities')
        pMarcelo.set('centro_custo', 'CC-OPS-FAC')
        pMarcelo.set('gestor_nome', 'Carlos Mendonça')
        try {
          const uGestor = app.findAuthRecordByEmail('_pb_users_auth_', 'gestor@empresa.com')
          pMarcelo.set('gestor_responsavel', uGestor.id)
        } catch (_) {}
        pLucas = null
        pMarcelo.set('data_inicio', '2025-02-15 00:00:00.000Z')
        pMarcelo.set('situacao_contrato', 'Vigente')
        pMarcelo.set('valor_contratado', 4500)
        pMarcelo.set('horas_mensais_base', 160)
        pMarcelo.set('valor_hora', 28.13)
        pMarcelo.set('duracao_meses', 0)
        pMarcelo.set('prazo_tipo', 'Indeterminado')
        pMarcelo.set('percentual_integracao', 100)
        pMarcelo.set(
          'observacoes',
          'Colaborador CLT responsável por gestão de facilities, suprimentos e infraestrutura corporativa.',
        )
      } else {
        pMarcelo.set('modalidade', 'CLT')
        pMarcelo.set('valor_contratado', 4500)
      }

      if (opsId) pMarcelo.set('empresa', opsId)
      if (areaOpsGeral) pMarcelo.set('area', areaOpsGeral)
      app.save(pMarcelo)
    } catch (errM) {
      console.log('Aviso ao semear Marcelo Santos CLT:', errM)
    }
  },
  (app) => {
    try {
      const pLucas = app.findFirstRecordByData('pessoas', 'email', 'lucas.ferreira@tech.com')
      app.delete(pLucas)
    } catch (_) {}
    try {
      const pMarcelo = app.findFirstRecordByData(
        'pessoas',
        'email',
        'marcelo.santos@souyess.com.br',
      )
      app.delete(pMarcelo)
    } catch (_) {}
  },
)
