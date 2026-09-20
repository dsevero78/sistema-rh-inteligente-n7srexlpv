/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  try {
    const onb = app.findRecordById('onboardings', 'zwrg8dc34rqgr7c')
    if (onb) {
      const itensJuliana = [
        // Documentos & DP
        {
          id: 'doc-1',
          titulo: 'Cópia do RG e CPF / CNH digital',
          categoria: 'Documentos',
          responsavel: 'Juliana Mendes (Contratado)',
          prazo: '2026-10-01',
          concluido: true,
          observacao: 'Documentos enviados via e-mail e validados pelo DP.',
          aCargoDoContratado: true,
          confirmadoPorMim: true,
          confirmadoEm: '2026-10-01 14:30:00.000Z',
          observacaoContratado: 'Enviei os arquivos em PDF frente e verso.',
        },
        {
          id: 'doc-2',
          titulo: 'Comprovante de residência atualizado (últimos 90 dias)',
          categoria: 'Documentos',
          responsavel: 'Juliana Mendes (Contratado)',
          prazo: '2026-10-01',
          concluido: true,
          observacao: 'Comprovante de energia aprovado.',
          aCargoDoContratado: true,
          confirmadoPorMim: true,
          confirmadoEm: '2026-10-01 14:32:00.000Z',
          observacaoContratado: 'Conta de luz recente.',
        },
        {
          id: 'doc-3',
          titulo: 'Carteira de Trabalho Digital (CTPS) e PIS/PASEP',
          categoria: 'Documentos',
          responsavel: 'Juliana Mendes (Contratado)',
          prazo: '2026-10-01',
          concluido: true,
          observacao: 'Qualificação cadastral eSocial regular.',
          aCargoDoContratado: true,
          confirmadoPorMim: true,
          confirmadoEm: '2026-10-01 14:35:00.000Z',
          observacaoContratado: 'Cadastrado eSocial verificado.',
        },
        {
          id: 'doc-4',
          titulo: 'Agendamento e realização do ASO (Exame Médico Admissional)',
          categoria: 'Documentos',
          responsavel: 'Equipe de Gente & Gestão (RH)',
          prazo: '2026-10-03',
          concluido: true,
          observacao: 'ASO Apto emitido pela clínica credenciada.',
          aCargoDoContratado: false,
          confirmadoPorMim: false,
          confirmadoEm: null,
          observacaoContratado: '',
        },
        {
          id: 'doc-5',
          titulo: 'Dados bancários para folha de pagamento (Conta Corrente)',
          categoria: 'Documentos',
          responsavel: 'Juliana Mendes (Contratado)',
          prazo: '2026-10-04',
          concluido: false,
          observacao: 'Aguardando envio do extrato ou comprovante Itaú.',
          aCargoDoContratado: true,
          confirmadoPorMim: false,
          confirmadoEm: null,
          observacaoContratado: '',
        },

        // Acesso & Sistemas
        {
          id: 'sis-1',
          titulo: 'Criação da conta de e-mail corporativo (Google Workspace)',
          categoria: 'Acesso & Sistemas',
          responsavel: 'TI Corporativa',
          prazo: '2026-10-04',
          concluido: true,
          observacao: 'Conta juliana.castro@empresa.com gerada.',
          aCargoDoContratado: false,
          confirmadoPorMim: false,
          confirmadoEm: null,
          observacaoContratado: '',
        },
        {
          id: 'sis-2',
          titulo: 'Acessos às ferramentas do cargo (ATS, Slack, Notion, HRMS)',
          categoria: 'Acesso & Sistemas',
          responsavel: 'TI Corporativa',
          prazo: '2026-10-05',
          concluido: true,
          observacao: 'Convites disparados.',
          aCargoDoContratado: false,
          confirmadoPorMim: false,
          confirmadoEm: null,
          observacaoContratado: '',
        },
        {
          id: 'sis-3',
          titulo: 'Envio de notebook corporativo e kit de periféricos',
          categoria: 'Acesso & Sistemas',
          responsavel: 'Facilities & TI',
          prazo: '2026-10-05',
          concluido: false,
          observacao: 'Em trânsito via transportadora particular.',
          aCargoDoContratado: false,
          confirmadoPorMim: false,
          confirmadoEm: null,
          observacaoContratado: '',
        },

        // Primeiros Dias
        {
          id: 'day-1',
          titulo: 'Reunião 1:1 de boas-vindas com o Gestor Direto',
          categoria: 'Primeiros Dias',
          responsavel: 'Gestor Contratante',
          prazo: '2026-10-06',
          concluido: false,
          observacao: 'Agendado no Google Calendar para 10h do primeiro dia.',
          aCargoDoContratado: false,
          confirmadoPorMim: false,
          confirmadoEm: null,
          observacaoContratado: '',
        },
        {
          id: 'day-2',
          titulo: 'Apresentação à equipe de Gente & Gestão e tour institucional',
          categoria: 'Primeiros Dias',
          responsavel: 'Douglas Severo (RH)',
          prazo: '2026-10-06',
          concluido: false,
          observacao: 'Momento de integração na tarde do dia 1.',
          aCargoDoContratado: false,
          confirmadoPorMim: false,
          confirmadoEm: null,
          observacaoContratado: '',
        },
        {
          id: 'day-3',
          titulo: 'Entrega do kit de boas-vindas corporativo (Welcome Kit)',
          categoria: 'Primeiros Dias',
          responsavel: 'People Experience',
          prazo: '2026-10-06',
          concluido: false,
          observacao: 'Mochila, camiseta, caderno e caneca institucional.',
          aCargoDoContratado: false,
          confirmadoPorMim: false,
          confirmadoEm: null,
          observacaoContratado: '',
        },

        // Treinamento
        {
          id: 'tre-1',
          titulo: 'Onboarding cultural: Missão, Valores, Governança e Compliance',
          categoria: 'Treinamento',
          responsavel: 'Gente & Gestão',
          prazo: '2026-10-08',
          concluido: false,
          observacao: 'Trilha LMS obrigatória de boas práticas.',
          aCargoDoContratado: false,
          confirmadoPorMim: false,
          confirmadoEm: null,
          observacaoContratado: '',
        },
        {
          id: 'tre-2',
          titulo: 'Trilha de formação específica da vaga (Sistemas de RH e Políticas Internas)',
          categoria: 'Treinamento',
          responsavel: 'Gestor Contratante',
          prazo: '2026-10-15',
          concluido: false,
          observacao: 'Shadowing com a equipe na primeira semana.',
          aCargoDoContratado: false,
          confirmadoPorMim: false,
          confirmadoEm: null,
          observacaoContratado: '',
        },
      ]

      const concluidos = itensJuliana.filter((i) => i.concluido).length
      const perc = Math.round((concluidos / itensJuliana.length) * 100)

      const itensContratado = itensJuliana.filter((i) => i.aCargoDoContratado)
      const concluidosContratado = itensContratado.filter(
        (i) => i.confirmadoPorMim || i.concluido,
      ).length
      const itensEmpresa = itensJuliana.filter((i) => !i.aCargoDoContratado)
      const concluidosEmpresa = itensEmpresa.filter((i) => i.concluido).length

      onb.set('itens', itensJuliana)
      onb.set('percentual_conclusao', perc)
      onb.set('total_itens_contratado', itensContratado.length)
      onb.set('concluidos_contratado', concluidosContratado)
      onb.set('total_itens_empresa', itensEmpresa.length)
      onb.set('concluidos_empresa', concluidosEmpresa)
      onb.set('status_admissao', 'Em preenchimento')
      onb.set('link_ativo', true)
      onb.set('token_admissao', 'adm-juliana-mendes-2026')
      app.save(onb)
    }
  } catch (err) {
    console.log('Erro ao recalibrar itens de Juliana:', err)
  }
})
