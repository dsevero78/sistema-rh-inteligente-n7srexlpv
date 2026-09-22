migrate(
  (app) => {
    let pessoasColId = ''
    try {
      pessoasColId = app.findCollectionByNameOrId('pessoas').id
    } catch (_) {}

    // 1. Coleção 'beneficios_vinculo'
    // Benefícios contratados no vínculo da pessoa (CLT e PJ), compondo a remuneração mensal
    const beneficiosCollection = new Collection({
      name: 'beneficios_vinculo',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'pessoa',
          type: 'relation',
          collectionId: pessoasColId,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'vinculo_origem_id',
          type: 'text',
          required: false,
          max: 100,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: [
            'vale_refeicao',
            'vale_alimentacao',
            'vale_transporte',
            'plano_saude',
            'plano_odontologico',
            'seguro_vida',
            'auxilio_creche',
            'auxilio_home_office',
            'outros',
          ],
          maxSelect: 1,
        },
        {
          name: 'nome_personalizado',
          type: 'text',
          required: false,
          max: 120,
        },
        {
          name: 'valor_mensal',
          type: 'number',
          required: true,
        },
        {
          name: 'data_inicio',
          type: 'date',
          required: true,
        },
        {
          name: 'data_fim',
          type: 'date',
          required: false,
        },
        {
          name: 'ativo',
          type: 'bool',
          required: false,
        },
        {
          name: 'observacao',
          type: 'text',
          required: false,
          max: 500,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_ben_pessoa ON beneficios_vinculo (pessoa)',
        'CREATE INDEX idx_ben_ativo ON beneficios_vinculo (ativo)',
        'CREATE INDEX idx_ben_tipo ON beneficios_vinculo (tipo)',
      ],
    })

    app.save(beneficiosCollection)

    // 2. Coleção 'programacoes_descanso'
    // Férias CLT (com cálculo constitucional de 1/3) e Descanso Remunerado PJ (após 12m)
    const programacoesCollection = new Collection({
      name: 'programacoes_descanso',
      type: 'base',
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: "@request.auth.id != ''",
      fields: [
        {
          name: 'pessoa',
          type: 'relation',
          collectionId: pessoasColId,
          cascadeDelete: true,
          maxSelect: 1,
          required: true,
        },
        {
          name: 'vinculo_origem_id',
          type: 'text',
          required: false,
          max: 100,
        },
        {
          name: 'tipo',
          type: 'select',
          required: true,
          values: ['CLT_FERIAS', 'PJ_DESCANSO'],
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
          name: 'dias',
          type: 'number',
          required: true,
        },
        {
          name: 'status',
          type: 'select',
          required: true,
          values: ['Programadas', 'Em Gozo', 'Concluidas', 'Canceladas'],
          maxSelect: 1,
        },
        {
          name: 'valor_periodo',
          type: 'number',
          required: true,
        },
        {
          name: 'valor_base_mensal',
          type: 'number',
          required: false,
        },
        {
          name: 'adicional_terco_constitucional',
          type: 'number',
          required: false,
        },
        {
          name: 'periodo_aquisitivo_inicio',
          type: 'date',
          required: false,
        },
        {
          name: 'periodo_aquisitivo_fim',
          type: 'date',
          required: false,
        },
        {
          name: 'periodo_concessivo_limite',
          type: 'date',
          required: false,
        },
        {
          name: 'dias_saldo_remanescente',
          type: 'number',
          required: false,
        },
        {
          name: 'observacao',
          type: 'text',
          required: false,
          max: 500,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_prog_pessoa ON programacoes_descanso (pessoa)',
        'CREATE INDEX idx_prog_tipo ON programacoes_descanso (tipo)',
        'CREATE INDEX idx_prog_status ON programacoes_descanso (status)',
        'CREATE INDEX idx_prog_datas ON programacoes_descanso (data_inicio, data_fim)',
      ],
    })

    app.save(programacoesCollection)

    // 3. Seeds Demonstrativos
    try {
      const benCol = app.findCollectionByNameOrId('beneficios_vinculo')
      const progCol = app.findCollectionByNameOrId('programacoes_descanso')

      let pJuliana = null
      let pMarcelo = null
      let pRenato = null

      try {
        pJuliana = app.findFirstRecordByData('pessoas', 'cpf_cnpj', '412.890.318-72')
      } catch (_) {}
      try {
        pMarcelo = app.findFirstRecordByData('pessoas', 'cpf_cnpj', '271.829.403-51')
      } catch (_) {}
      try {
        pRenato = app.findFirstRecordByData('pessoas', 'cpf_cnpj', '28.491.503/0001-82')
      } catch (_) {}

      // Benefícios Juliana (CLT): VR R$ 1.100 + Plano de Saúde R$ 850
      if (pJuliana) {
        const b1 = new Record(benCol)
        b1.set('pessoa', pJuliana.id)
        b1.set('vinculo_origem_id', `ficha-${pJuliana.id}`)
        b1.set('tipo', 'vale_refeicao')
        b1.set('nome_personalizado', 'Vale-Refeição Flash Flexível (R$ 50/dia útil)')
        b1.set('valor_mensal', 1100)
        b1.set('data_inicio', '2026-10-06 00:00:00.000Z')
        b1.set('ativo', true)
        b1.set('observacao', 'Cartão benefício multibenefícios para alimentação e refeição.')
        app.save(b1)

        const b2 = new Record(benCol)
        b2.set('pessoa', pJuliana.id)
        b2.set('vinculo_origem_id', `ficha-${pJuliana.id}`)
        b2.set('tipo', 'plano_saude')
        b2.set('nome_personalizado', 'Bradesco Saúde Top Nacional Quarto')
        b2.set('valor_mensal', 850)
        b2.set('data_inicio', '2026-10-06 00:00:00.000Z')
        b2.set('ativo', true)
        b2.set(
          'observacao',
          'Plano médico empresarial sem coparticipação com titularidade SouYess.',
        )
        app.save(b2)

        // Férias Programadas Juliana (CLT): 15 dias em Dezembro/2026
        // Salário mensal R$ 9.500 => (9500 / 30) * 15 = 4750 + 1/3 (1583.33) = R$ 6.333,33
        const feriasJuliana = new Record(progCol)
        feriasJuliana.set('pessoa', pJuliana.id)
        feriasJuliana.set('vinculo_origem_id', `ficha-${pJuliana.id}`)
        feriasJuliana.set('tipo', 'CLT_FERIAS')
        feriasJuliana.set('data_inicio', '2026-12-15 00:00:00.000Z')
        feriasJuliana.set('data_fim', '2026-12-29 00:00:00.000Z')
        feriasJuliana.set('dias', 15)
        feriasJuliana.set('status', 'Programadas')
        feriasJuliana.set('valor_base_mensal', 9500)
        feriasJuliana.set('adicional_terco_constitucional', 1583.33)
        feriasJuliana.set('valor_periodo', 6333.33)
        feriasJuliana.set('periodo_aquisitivo_inicio', '2025-10-06 00:00:00.000Z')
        feriasJuliana.set('periodo_aquisitivo_fim', '2026-10-05 00:00:00.000Z')
        feriasJuliana.set('periodo_concessivo_limite', '2027-09-05 00:00:00.000Z')
        feriasJuliana.set('dias_saldo_remanescente', 15)
        feriasJuliana.set(
          'observacao',
          'Primeiro período de 15 dias do recesso coletivo/fim de ano aprovado com a diretoria.',
        )
        app.save(feriasJuliana)
      }

      // Benefícios Marcelo (CLT): VR R$ 880 + Plano de Saúde R$ 620 + Vale-Transporte R$ 340
      if (pMarcelo) {
        const bm1 = new Record(benCol)
        bm1.set('pessoa', pMarcelo.id)
        bm1.set('vinculo_origem_id', `ficha-${pMarcelo.id}`)
        bm1.set('tipo', 'vale_refeicao')
        bm1.set('nome_personalizado', 'Vale-Refeição Ticket Restaurante (R$ 40/dia)')
        bm1.set('valor_mensal', 880)
        bm1.set('data_inicio', '2025-02-15 00:00:00.000Z')
        bm1.set('ativo', true)
        bm1.set('observacao', 'Carga mensal no dia 01.')
        app.save(bm1)

        const bm2 = new Record(benCol)
        bm2.set('pessoa', pMarcelo.id)
        bm2.set('vinculo_origem_id', `ficha-${pMarcelo.id}`)
        bm2.set('tipo', 'plano_saude')
        bm2.set('nome_personalizado', 'Unimed Regional Campinas Enfermaria')
        bm2.set('valor_mensal', 620)
        bm2.set('data_inicio', '2025-02-15 00:00:00.000Z')
        bm2.set('ativo', true)
        bm2.set('observacao', 'Assistência médica hospitalar titular.')
        app.save(bm2)

        const bm3 = new Record(benCol)
        bm3.set('pessoa', pMarcelo.id)
        bm3.set('vinculo_origem_id', `ficha-${pMarcelo.id}`)
        bm3.set('tipo', 'vale_transporte')
        bm3.set('nome_personalizado', 'Bilhete Único Campinas / Intermunicipal')
        bm3.set('valor_mensal', 340)
        bm3.set('data_inicio', '2025-02-15 00:00:00.000Z')
        bm3.set('ativo', true)
        bm3.set('observacao', 'Deslocamento presencial para a base de operações.')
        app.save(bm3)
      }

      // Descanso Remunerado Renato (PJ Nexus Cloud - admitido em 15/01/2025, +12 meses):
      // Período de 15 dias: 01/11/2026 a 15/11/2026
      // Contrato de R$ 24.500/mês. Descanso acordado remunerado proporcional = R$ 12.250,00
      if (pRenato) {
        const descansoRenato = new Record(progCol)
        descansoRenato.set('pessoa', pRenato.id)
        descansoRenato.set('vinculo_origem_id', `contrato-2pwjj528ila23ht`)
        descansoRenato.set('tipo', 'PJ_DESCANSO')
        descansoRenato.set('data_inicio', '2026-11-01 00:00:00.000Z')
        descansoRenato.set('data_fim', '2026-11-15 00:00:00.000Z')
        descansoRenato.set('dias', 15)
        descansoRenato.set('status', 'Programadas')
        descansoRenato.set('valor_base_mensal', 24500)
        descansoRenato.set('adicional_terco_constitucional', 0)
        descansoRenato.set('valor_periodo', 12250)
        descansoRenato.set('periodo_aquisitivo_inicio', '2025-01-15 00:00:00.000Z')
        descansoRenato.set('periodo_aquisitivo_fim', '2026-01-14 00:00:00.000Z')
        descansoRenato.set('dias_saldo_remanescente', 15)
        descansoRenato.set(
          'observacao',
          'Descanso remunerado pactuado após 12 meses ininterruptos de prestação Cloud/DevOps. Suspensão técnica de SLA alinhada com squad.',
        )
        app.save(descansoRenato)

        // Renato PJ também tem benefício de auxílio home-office técnico acordado
        const br1 = new Record(benCol)
        br1.set('pessoa', pRenato.id)
        br1.set('vinculo_origem_id', `contrato-2pwjj528ila23ht`)
        br1.set('tipo', 'auxilio_home_office')
        br1.set('nome_personalizado', 'Reembolso de Infraestrutura Cloud & Link Dedicado')
        br1.set('valor_mensal', 1200)
        br1.set('data_inicio', '2025-01-15 00:00:00.000Z')
        br1.set('ativo', true)
        br1.set(
          'observacao',
          'Subsídio técnico de conectividade e ambientes sandbox para arquitetura cloud.',
        )
        app.save(br1)
      }
    } catch (eSeed) {
      console.warn('[Migration 1741500016] Aviso ao criar seeds de benefícios e descansos:', eSeed)
    }
  },
  (app) => {
    try {
      const benCol = app.findCollectionByNameOrId('beneficios_vinculo')
      app.delete(benCol)
    } catch (_) {}

    try {
      const progCol = app.findCollectionByNameOrId('programacoes_descanso')
      app.delete(progCol)
    } catch (_) {}
  },
)
