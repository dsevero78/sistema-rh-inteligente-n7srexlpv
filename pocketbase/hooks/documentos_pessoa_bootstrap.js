// Hook: Auto-seeder de Documentos Reais com PDFs no Cofre de Pessoas
// Executa no evento onBootstrap para garantir que a coleção documentos_pessoa
// tenha registros com arquivos reais (PDFs gerados via $filesystem.fileFromBytes).

onBootstrap((e) => {
  e.next()

  try {
    const docsCol = $app.findCollectionByNameOrId('documentos_pessoa')
    const pessoasCol = $app.findCollectionByNameOrId('pessoas')

    // Checar se já existem documentos no cofre
    const existingCount = $app.countRecords('documentos_pessoa')
    if (existingCount > 0) {
      console.log(
        '[CofreDocumentos] documentos_pessoa já possui registros (' +
          existingCount +
          '). Seeder concluído.',
      )
      return
    }

    console.log(
      '[CofreDocumentos] documentos_pessoa está vazio. Iniciando semeadura com PDFs reais...',
    )

    let rhUserId = ''
    try {
      rhUserId = $app.findAuthRecordByEmail('_pb_users_auth_', 'severo.douglas2@gmail.com').id
    } catch (_) {}

    const pessoas = $app.findRecordsByFilter('pessoas', '', 'nome', 50, 0)
    if (!pessoas || pessoas.length === 0) {
      console.log('[CofreDocumentos] Nenhuma pessoa encontrada para semear documentos.')
      return
    }

    // Gerador de PDF 1.4 de 1 página com Helvetica e texto claro
    function buildPdfContent(titulo, subtitulo) {
      const cleanTitulo = (titulo || 'Documento').replace(/[()\\]/g, '')
      const cleanSub = (subtitulo || 'Sistema RH Inteligente - SouYess').replace(/[()\\]/g, '')

      const streamContent =
        'BT\n' +
        '/F1 16 Tf\n' +
        '50 720 Td\n' +
        '(' +
        cleanTitulo +
        ') Tj\n' +
        '/F1 11 Tf\n' +
        '0 -28 Td\n' +
        '(' +
        cleanSub +
        ') Tj\n' +
        '/F1 9 Tf\n' +
        '0 -20 Td\n' +
        '(Documento oficial armazenado no Cofre Digital de Pessoas - SouYess RH) Tj\n' +
        '0 -16 Td\n' +
        '(Validade e conformidade juridica auditada pelo ecossistema) Tj\n' +
        'ET\n'

      const streamLength = streamContent.length

      const pdf =
        '%PDF-1.4\n' +
        '1 0 obj\n' +
        '<< /Type /Catalog /Pages 2 0 R >>\n' +
        'endobj\n' +
        '2 0 obj\n' +
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n' +
        'endobj\n' +
        '3 0 obj\n' +
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\n' +
        'endobj\n' +
        '4 0 obj\n' +
        '<< /Length ' +
        streamLength +
        ' >>\n' +
        'stream\n' +
        streamContent +
        'endstream\n' +
        'endobj\n' +
        '5 0 obj\n' +
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\n' +
        'endobj\n' +
        'xref\n' +
        '0 6\n' +
        '0000000000 65535 f \n' +
        '0000000009 00000 n \n' +
        '0000000058 00000 n \n' +
        '0000000115 00000 n \n' +
        '0000000244 00000 n \n' +
        '0000000305 00000 n \n' +
        'trailer\n' +
        '<< /Size 6 /Root 1 0 R >>\n' +
        'startxref\n' +
        '382\n' +
        '%%EOF\n'

      return pdf
    }

    const agoraMs = Date.now()
    const umDiaMs = 24 * 60 * 60 * 1000

    function makeIsoDate(offsetDias) {
      const d = new Date(agoraMs + offsetDias * umDiaMs)
      return d.toISOString().replace('T', ' ').substring(0, 19) + 'Z'
    }

    let seededTotal = 0

    for (let pIdx = 0; pIdx < pessoas.length; pIdx++) {
      const pessoa = pessoas[pIdx]
      const pId = pessoa.id
      const pNome = pessoa.getString('nome')
      const pMod = pessoa.getString('modalidade')

      const docsToSeed = []

      if (pNome.indexOf('Renato Albuquerque') !== -1) {
        // Renato Albuquerque (PJ - Nexus Cloud)
        docsToSeed.push(
          {
            nome: 'Certidão Negativa de Débitos (CND Federal) — Nexus Cloud',
            tipo: 'Certidão Fiscal (CND / Federal / Estadual)',
            filename: 'cnd-federal-nexus-cloud.pdf',
            dataEmissao: makeIsoDate(-120),
            dataVencimento: makeIsoDate(-15), // VENCIDO -> URGENTE ação hoje
            observacoes:
              'Certidão Conjunta Negativa de Débitos da Receita Federal e PGFN. Expirada há 15 dias, requer emissão imediata.',
          },
          {
            nome: 'Contrato de Prestação de Serviços Cloud & DevOps — CT-PJ-2025-014',
            tipo: 'Contrato de Prestação / Admissão',
            filename: 'contrato-prestacao-nexus-cloud-2025.pdf',
            dataEmissao: makeIsoDate(-180),
            dataVencimento: makeIsoDate(14), // Vence em 14 dias -> ATENÇÃO esta semana
            observacoes:
              'Instrumento particular de prestação de serviços técnicos especializados. Próximo ao término da vigência.',
          },
          {
            nome: 'Termo de Confidencialidade e Segurança da Informação (NDA) — Assinado',
            tipo: 'Termo Assinado',
            filename: 'termo-nda-seguranca-renato-albuquerque.pdf',
            dataEmissao: makeIsoDate(-200),
            dataVencimento: makeIsoDate(365), // VIGENTE longo prazo
            observacoes:
              'Termo de sigilo bilateral com assinatura digital e carimbo de tempo válido para todo o ciclo.',
          },
        )
      } else if (pNome.indexOf('Camila Vasconcelos') !== -1) {
        // Camila Vasconcelos (PJ - Vértice Mídia)
        docsToSeed.push(
          {
            nome: 'Certidão de Regularidade do FGTS (CRF) — Vértice Mídia',
            tipo: 'Certidão Fiscal (CND / Federal / Estadual)',
            filename: 'crf-fgts-vertice-midia.pdf',
            dataEmissao: makeIsoDate(-45),
            dataVencimento: makeIsoDate(-8), // VENCIDO -> URGENTE ação hoje
            observacoes:
              'Certidão de regularidade perante a Caixa Econômica Federal. Vencida, pendente de renovação pela contabilidade.',
          },
          {
            nome: 'Contrato de Prestação de Serviços de Conteúdo e Mídia — CT-PJ-2025-089',
            tipo: 'Contrato de Prestação / Admissão',
            filename: 'contrato-prestacao-vertice-midia-2025.pdf',
            dataEmissao: makeIsoDate(-150),
            dataVencimento: makeIsoDate(18), // Vence em 18 dias -> ATENÇÃO esta semana
            observacoes:
              'Contrato sob processo de aditivo ADIT-2026-01 e ADIT-2026-02 para expansão de escopo.',
          },
          {
            nome: 'Contrato Social Consolidado — Vértice Mídia S/S',
            tipo: 'Contrato Social / Ato Constitutivo',
            filename: 'contrato-social-vertice-midia-2025.pdf',
            dataEmissao: makeIsoDate(-300),
            dataVencimento: makeIsoDate(730), // VIGENTE longo prazo
            observacoes:
              'Última alteração contratual registrada na Junta Comercial com poderes de representação legal.',
          },
        )
      } else if (pNome.indexOf('Juliana Mendes') !== -1) {
        // Juliana Mendes Castro (CLT - Gente & Gestão)
        docsToSeed.push(
          {
            nome: 'Atestado de Saúde Ocupacional (ASO Admissional) — Juliana Castro',
            tipo: 'Documentação Admissional (RG / CPF / CTPS)',
            filename: 'aso-admissional-juliana-castro.pdf',
            dataEmissao: makeIsoDate(-60),
            dataVencimento: makeIsoDate(-5), // VENCIDO -> URGENTE ação hoje
            observacoes:
              'Atestado Admissional de aptidão médica ocupacional. Exige agendamento da renovação periódica.',
          },
          {
            nome: 'Termo de Adesão ao Trabalho Híbrido e Políticas de TI — Assinado',
            tipo: 'Termo Assinado',
            filename: 'termo-adesao-trabalho-hibrido-juliana.pdf',
            dataEmissao: makeIsoDate(-30),
            dataVencimento: makeIsoDate(25), // Vence em 25 dias -> ATENÇÃO esta semana
            observacoes:
              'Acordo de jornada flexível e custeio de home-office com revisão trimestral.',
          },
          {
            nome: 'Contrato Individual de Trabalho CLT — CTPS Digital',
            tipo: 'Contrato de Prestação / Admissão',
            filename: 'contrato-trabalho-clt-juliana-mendes.pdf',
            dataEmissao: makeIsoDate(-20),
            dataVencimento: makeIsoDate(700), // Vigente por prazo longo
            observacoes:
              'Registro formal via eSocial e CTPS Digital assinado pela colaboradora e pela SouYess.',
          },
        )
      } else if (pNome.indexOf('Eduardo Silveira') !== -1) {
        // Dr. Eduardo Silveira (PJ - Silveira Advocacia)
        docsToSeed.push(
          {
            nome: 'Certidão Negativa de Débitos Trabalhistas (CNDT) — Silveira Advocacia',
            tipo: 'Certidão Fiscal (CND / Federal / Estadual)',
            filename: 'cndt-trabalhista-silveira-advogados.pdf',
            dataEmissao: makeIsoDate(-190),
            dataVencimento: makeIsoDate(-10), // VENCIDO -> URGENTE ação hoje
            observacoes:
              'Certidão Negativa emitida pelo Tribunal Superior do Trabalho (TST). Expirada.',
          },
          {
            nome: 'Contrato de Honorários e Pareceres Jurídicos — CT-PJ-2024-003',
            tipo: 'Contrato de Prestação / Admissão',
            filename: 'contrato-honorarios-silveira-advogados.pdf',
            dataEmissao: makeIsoDate(-365),
            dataVencimento: makeIsoDate(20), // Vence em 20 dias -> ATENÇÃO esta semana
            observacoes:
              'Prestação de assessoria jurídica especializada em direito trabalhista e conformidade LGPD.',
          },
          {
            nome: 'Registro Sociedade de Advogados OAB/SP & Procuração',
            tipo: 'Contrato Social / Ato Constitutivo',
            filename: 'registro-oab-procuracao-silveira.pdf',
            dataEmissao: makeIsoDate(-500),
            dataVencimento: makeIsoDate(600), // Vigente
            observacoes:
              'Ato constitutivo registrado no Conselho Seccional da OAB/SP e instrumento de mandato.',
          },
        )
      }

      for (let dIdx = 0; dIdx < docsToSeed.length; dIdx++) {
        const item = docsToSeed[dIdx]

        try {
          const pdfStr = buildPdfContent(item.nome, pNome + ' (' + pMod + ')')
          const fileObj = $filesystem.fileFromBytes(pdfStr, item.filename)

          const docRecord = new Record(docsCol)
          docRecord.set('pessoa', pId)
          docRecord.set('nome', item.nome)
          docRecord.set('tipo', item.tipo)
          docRecord.set('arquivo', fileObj)
          docRecord.set('data_emissao', item.dataEmissao)
          docRecord.set('data_vencimento', item.dataVencimento)
          docRecord.set('tamanho_bytes', pdfStr.length)
          docRecord.set('enviado_por_nome', 'Douglas Severo (Gente & Gestão)')
          if (rhUserId) {
            docRecord.set('enviado_por_usuario', rhUserId)
          }
          docRecord.set('observacoes', item.observacoes)

          $app.save(docRecord)
          seededTotal++
          console.log('[CofreDocumentos] Documento semeado:', item.nome, 'para', pNome)
        } catch (itemErr) {
          console.log('[CofreDocumentos] Erro ao salvar documento ' + item.nome + ':', itemErr)
        }
      }
    }

    console.log('[CofreDocumentos] Semeadura concluída com sucesso! Total gerado:', seededTotal)
  } catch (err) {
    console.log('[CofreDocumentos] Erro geral na semeadura onBootstrap:', err)
  }
})
