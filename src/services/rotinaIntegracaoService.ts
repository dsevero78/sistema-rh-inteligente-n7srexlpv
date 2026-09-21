import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import type { PrestadorPJ } from '@/services/prestadoresPj'

export type TipoIntegrado = 'CLT' | 'PJ'
export type StatusRotinaGeral =
  | 'Planejado'
  | 'Em Andamento'
  | 'Integrado 90d'
  | 'Pausado'
  | 'Cancelado'
export type PrazoContratoTipo = 'Indeterminado' | 'Determinado' | 'Projeto Especifico'

export interface ItemChecklistRotina {
  id: string
  fase: 0 | 1 | 2 | 3
  titulo: string
  responsavel: string
  concluido: boolean
  prazo?: string
  dataConclusao?: string
  observacao?: string
}

export interface Marco306090 {
  marco: '30_dias' | '60_dias' | '90_dias'
  titulo: string
  prazo: string
  status: 'pendente' | 'em_andamento' | 'concluido'
  objetivos: string[]
  entregasEsperadas: string
  checkInRealizado: boolean
  dataCheckIn?: string | null
  parecerGestor?: string
  notaAvaliacao?: number | null
}

export interface RotinaIntegracao {
  id: string
  tipo_integrado: TipoIntegrado
  nome_completo: string
  documento_identificacao?: string
  email_contato?: string
  telefone_contato?: string
  cargo_funcao: string
  departamento?: string
  gestor_responsavel?: string
  gestor_nome?: string
  buddy_mentor_nome?: string
  buddy_mentor_email?: string
  prestador_pj?: string
  candidato?: string
  vaga?: string
  data_inicio: string
  valor_contratado?: number
  valor_hora?: number
  horas_semanais?: number
  duracao_meses?: number
  prazo_contrato_tipo?: PrazoContratoTipo
  status_geral: StatusRotinaGeral
  percentual_conclusao: number
  template_origem?: string
  itens_checklist: ItemChecklistRotina[]
  marcos_30_60_90: Marco306090[]
  nps_onboarding_score?: number | null
  nps_comentarios?: string
  observacoes?: string
  created?: string
  updated?: string
  expand?: {
    gestor_responsavel?: RecordModel
    prestador_pj?: PrestadorPJ
    candidato?: RecordModel
    vaga?: RecordModel
  }
}

export interface CriarRotinaIntegracaoInput {
  tipo_integrado: TipoIntegrado
  nome_completo: string
  documento_identificacao?: string
  email_contato?: string
  telefone_contato?: string
  cargo_funcao: string
  departamento?: string
  gestor_responsavel?: string
  gestor_nome?: string
  buddy_mentor_nome?: string
  buddy_mentor_email?: string
  prestador_pj?: string
  candidato?: string
  vaga?: string
  data_inicio: string
  valor_contratado?: number
  valor_hora?: number
  horas_semanais?: number
  duracao_meses?: number
  prazo_contrato_tipo?: PrazoContratoTipo
  template_origem?: string
  itens_checklist: ItemChecklistRotina[]
  marcos_30_60_90: Marco306090[]
  observacoes?: string
}

export interface BenchmarkEmpresa {
  empresa: string
  logo?: string
  paisOrigem: string
  destaque: string
  praticas: string[]
  citacao: string
  fonte: string
}

export const BENCHMARKS_TECH_ONBOARDING: BenchmarkEmpresa[] = [
  {
    empresa: 'Google',
    paisOrigem: 'EUA',
    destaque: 'Nudge de 5 pontos para gestores e aceleração de 25% na produtividade',
    praticas: [
      'Envio de checklist "Just-in-Time" para o gestor na véspera do Dia 1 (role discussion, buddy, network, check-ins e diálogo aberto).',
      'Programa de "Noogler Buddy": cada recém-chegado recebe um par experiente dedicado a suporte técnico e cultural informal.',
      'Ciclo formal de check-ins mensais garantidos nos primeiros 6 meses de jornada.',
    ],
    citacao:
      'Gestores que recebem o checklist rápido integram colaboradores 25% mais rápido (Laszlo Bock, Work Rules!).',
    fonte: 'Google People Operations & HBR Study',
  },
  {
    empresa: 'Netflix',
    paisOrigem: 'EUA',
    destaque: 'Context Not Control & Deploy no Dia 1 com autonomia radical',
    praticas: [
      'Preboarding impecável: hardware, acessos, VPN e tokens configurados antes do contratado ligar a máquina.',
      'Meta de impacto imediato: novos engenheiros realizam deploy em produção ou entrega real logo na primeira semana.',
      'Mentoria focada no "Context Not Control" para tomada de decisões autônoma desde os primeiros 30 dias.',
    ],
    citacao:
      'No primeiro dia tudo funciona. O foco não é instalar IDE, e sim entregar valor e entender o contexto de negócio.',
    fonte: 'Netflix Culture Deck & Tech Blog',
  },
  {
    empresa: 'Stripe',
    paisOrigem: 'EUA / Global',
    destaque: 'Transparência radical, documentação assíncrona e Spin Up Week',
    praticas: [
      'Spin Up Program: primeira quinzena dedicada a entender toda a infraestrutura e a filosofia dos produtos Stripe.',
      'Cultura "Write It Down": documentação viva e assíncrona para que prestadores e colaboradores aprendam sem depender de reuniões.',
      'Rotina de check-in 30-60-90 com metas de aprendizado (Learn), contribuição (Build) e autonomia (Own).',
    ],
    citacao:
      'O sucesso dos primeiros 90 dias é medido pela capacidade de navegar de forma assíncrona e construir com alta régua.',
    fonte: 'Stripe Engineering Culture',
  },
  {
    empresa: 'Nubank',
    paisOrigem: 'Brasil',
    destaque: 'Welcome Nu, Buddy System e alinhamento de liderança horizontal',
    praticas: [
      'Imersão Welcome Nu: programa corporativo com imersão em valores (Love our customers, Think as owners, Build strong teams).',
      'Buddy Nubank estruturado com encontros semanais no primeiro mês para quebrar a solidão de trabalho remoto/híbrido.',
      'Pesquisa de Onboarding NPS no Dia 30 e Dia 90 com plano de ação imediato para líderes de squad.',
    ],
    citacao:
      'Tratamos a experiência do nosso time com o mesmo nível de obsessão que dedicamos aos nossos 100 milhões de clientes.',
    fonte: 'Nubank People Team & Hipsters Tech',
  },
  {
    empresa: 'Shopify',
    paisOrigem: 'Canadá / Digital by Design',
    destaque: 'Digital by Design e Kits de Pré-embarque humanizados',
    praticas: [
      'Kit Preboarding enviado para a residência antes do Dia 1 com equipamento pronto e mensagem manuscrita da liderança.',
      'Trilha de 90 dias com "Pathfinder": mentor de outra área para fomentar rede de relacionamento multidisciplinar.',
      'Check-in estruturado de alinhamento de expectativas no 30º, 60º e 90º dia com autoavaliação guiada.',
    ],
    citacao:
      'A integração não é um evento de uma semana, é uma jornada de 90 dias de aprendizado intencional.',
    fonte: 'Shopify Culture & Remote First Guidelines',
  },
]

export interface TemplatePlanoIntegracao {
  id: string
  titulo: string
  badge: string
  descricao: string
  tipoSugerido: TipoIntegrado
  checklistFases: Omit<ItemChecklistRotina, 'id' | 'concluido' | 'dataConclusao'>[]
  marcos: Omit<
    Marco306090,
    'checkInRealizado' | 'dataCheckIn' | 'parecerGestor' | 'notaAvaliacao'
  >[]
}

export const TEMPLATES_INTEGRACAO: TemplatePlanoIntegracao[] = [
  {
    id: 'template-tech-senior',
    titulo: 'Template Tech Sênior 30-60-90 (Inspirado Google & Stripe)',
    badge: 'Tech & Engenharia',
    descricao:
      'Estrutura robusta para Staff/Sênior/Especialistas CLT ou PJ focada em imersão técnica, buddy de arquitetura e autonomia acelerada.',
    tipoSugerido: 'CLT',
    checklistFases: [
      {
        fase: 0,
        titulo: 'Cadastro admissional e validação de documentação / antecedentes',
        responsavel: 'DP / Compliance',
      },
      {
        fase: 0,
        titulo: 'Validação de perfil e escopo de senioridade técnica alinhado com liderança',
        responsavel: 'Gente & Gestão',
      },
      {
        fase: 0,
        titulo: 'Exame admissional ASO homologado no eSocial',
        responsavel: 'Medicina do Trabalho',
      },
      {
        fase: 1,
        titulo: 'Elaboração e assinatura de contrato com remuneração e benefícios',
        responsavel: 'RH & Contratado',
      },
      {
        fase: 1,
        titulo: 'Cálculo de valor/hora base 160h e registro de jornada flexível',
        responsavel: 'RH Operações',
      },
      {
        fase: 1,
        titulo: 'Definição do gestor responsável e alinhamento de OKRs do trimestre',
        responsavel: 'Gestor Contratante',
      },
      {
        fase: 2,
        titulo: 'Envio de Welcome Kit e e-mail de boas-vindas da liderança (7 dias antes)',
        responsavel: 'People Experience',
      },
      {
        fase: 2,
        titulo: 'Configuração de notebook corporativo com tokens, SSH e VPN pré-instalados',
        responsavel: 'TI / SecOps',
      },
      {
        fase: 2,
        titulo: 'Designação de Buddy sênior e compartilhamento da agenda do Dia 1',
        responsavel: 'Gestor Contratante',
      },
      {
        fase: 3,
        titulo: 'Marco 30 Dias: Imersão técnica na base de código e primeiro PR aprovado',
        responsavel: 'Contratado & Buddy',
      },
      {
        fase: 3,
        titulo: 'Check-in 30 Dias: Alinhamento de expectativas e feedback mútuo 1-on-1',
        responsavel: 'Gestor Contratante',
      },
      {
        fase: 3,
        titulo: 'Marco 60 Dias: Liderança técnica em uma entrega ou épico da squad',
        responsavel: 'Contratado',
      },
      {
        fase: 3,
        titulo: 'Check-in 60 Dias: Avaliação intermediária e calibração de autonomia',
        responsavel: 'Gestor Contratante',
      },
      {
        fase: 3,
        titulo: 'Marco 90 Dias: Documentação de RFC ou arquitetura e mentoria de pares',
        responsavel: 'Contratado',
      },
      {
        fase: 3,
        titulo: 'Avaliação Final de Integração e aplicação de NPS de Onboarding',
        responsavel: 'RH & Gestor',
      },
    ],
    marcos: [
      {
        marco: '30_dias',
        titulo: 'Marco 30 Dias — Aprender e Mapear (Learn)',
        prazo: '+30 dias',
        status: 'pendente',
        objetivos: [
          'Configurar ambiente local e realizar primeiro deploy/PR em produção na primeira semana',
          'Compreender arquitetura, serviços core e esteira de CI/CD',
          'Mapear stakeholders e rotinas ágeis da squad',
        ],
        entregasEsperadas:
          'Primeira contribuição em código mergeada e mapa de dependências documentado',
      },
      {
        marco: '60_dias',
        titulo: 'Marco 60 Dias — Contribuir e Executar (Execute)',
        prazo: '+60 dias',
        status: 'pendente',
        objetivos: [
          'Assumir demandas complexas com baixa dependência de supervisão',
          'Apresentar proposta de melhoria ou refatoração em arquitetura',
          'Participar do rodízio de code review e suporte a incidentes',
        ],
        entregasEsperadas: 'Épico técnico entregue e participação ativa nos rituais de engenharia',
      },
      {
        marco: '90_dias',
        titulo: 'Marco 90 Dias — Otimizar e Liderar (Scale)',
        prazo: '+90 dias',
        status: 'pendente',
        objetivos: [
          'Autonomia plena na tomada de decisões técnicas',
          'Apresentar mentoria técnica para juniores/plenos ou tech talk interna',
          'Concluir ciclo de experiência com parecer favorável de consolidação',
        ],
        entregasEsperadas: 'RFC de arquitetura publicada e fechamento do ciclo 30-60-90',
      },
    ],
  },
  {
    id: 'template-prestador-pj',
    titulo: 'Template Prestador PJ (Inspirado Netflix & Mercado Livre)',
    badge: 'PJ & Consultoria',
    descricao:
      'Fluxo enxuto e estritamente aderente à prestação de serviços B2B: conformidade fiscal/CNPJ, SLA contratual, acessos seguros e marcos de entrega.',
    tipoSugerido: 'PJ',
    checklistFases: [
      {
        fase: 0,
        titulo: 'Conferência do CNPJ, QSA, CNDT e Certidões de Regularidade Fiscal',
        responsavel: 'Compliance RH',
      },
      {
        fase: 0,
        titulo: 'Validação de dados bancários corporativos e regime tributário',
        responsavel: 'Financeiro',
      },
      {
        fase: 0,
        titulo: 'Aprovação da proposta comercial e escopo do projeto',
        responsavel: 'Gestor Solicitante',
      },
      {
        fase: 1,
        titulo: 'Elaboração e assinatura eletrônica do Contrato de Prestação de Serviços PJ',
        responsavel: 'Jurídico & Fornecedor',
      },
      {
        fase: 1,
        titulo: 'Definição da alçada de horas, valor mensal ou valor/hora acordado',
        responsavel: 'Gestor & Financeiro',
      },
      {
        fase: 1,
        titulo: 'Parametrização do calendário de emissão e liquidação de Notas Fiscais',
        responsavel: 'Contabilidade',
      },
      {
        fase: 2,
        titulo: 'Envio das diretrizes de segurança da informação e termos de confidencialidade',
        responsavel: 'SecOps',
      },
      {
        fase: 2,
        titulo: 'Liberação de acessos aos repositórios e canais colaborativos (Slack/Teams)',
        responsavel: 'TI / DevOps',
      },
      {
        fase: 2,
        titulo: 'Alinhamento inicial de escopo e entrega da matriz de contato com a liderança',
        responsavel: 'Gestor Contratante',
      },
      {
        fase: 3,
        titulo: 'Marco 30 Dias: Diagnóstico do ambiente e alinhamento do backlog de entregas',
        responsavel: 'Prestador PJ',
      },
      {
        fase: 3,
        titulo: 'Check-in 30 Dias: Validação da primeira medição de serviços e aprovação da 1ª NF',
        responsavel: 'Gestor Contratante',
      },
      {
        fase: 3,
        titulo: 'Marco 60 Dias: Conclusão do primeiro grande milestone do escopo contratado',
        responsavel: 'Prestador PJ',
      },
      {
        fase: 3,
        titulo: 'Check-in 60 Dias: Revisão de entregas e SLA de atendimento técnico',
        responsavel: 'Gestor Contratante',
      },
      {
        fase: 3,
        titulo: 'Marco 90 Dias: Estabilidade operacional e relatório consolidado de entregas',
        responsavel: 'Prestador PJ',
      },
      {
        fase: 3,
        titulo: 'Avaliação de Desempenho do Fornecedor e recomendação de continuidade',
        responsavel: 'Gestor & Compras',
      },
    ],
    marcos: [
      {
        marco: '30_dias',
        titulo: 'Marco 30 Dias — Alinhamento e Diagnóstico Inicial',
        prazo: '+30 dias',
        status: 'pendente',
        objetivos: [
          'Entendimento aprofundado dos requisitos e metas do contrato',
          'Homologação dos acessos aos ambientes restritos',
          'Apresentação do cronograma detalhado de execução do projeto',
        ],
        entregasEsperadas: 'Relatório de diagnóstico do escopo e alinhamento técnico concluído',
      },
      {
        marco: '60_dias',
        titulo: 'Marco 60 Dias — Execução e Entregas Críticas',
        prazo: '+60 dias',
        status: 'pendente',
        objetivos: [
          'Entrega de 50% dos marcos principais do projeto',
          'Cumprimento rigoroso dos SLAs técnicos de resposta e qualidade',
          'Ajustes de rota baseados nos feedbacks da squad interna',
        ],
        entregasEsperadas:
          'Primeiro pacote de entregas em homologação/produção e NF correspondente',
      },
      {
        marco: '90_dias',
        titulo: 'Marco 90 Dias — Consolidação e Autonomia Operacional',
        prazo: '+90 dias',
        status: 'pendente',
        objetivos: [
          'Entrega integral das etapas iniciais com documentação das soluções',
          'Avaliação trimestral com nota >= 8.5 na governança de prestadores',
          'Planejamento das próximas sprints ou prorrogação de vigência',
        ],
        entregasEsperadas: 'Projeto estabilizado, documentação completa e parecer de continuidade',
      },
    ],
  },
  {
    id: 'template-onboarding-rapido',
    titulo: 'Template Onboarding Ágil 30 Dias (Inspirado Nubank)',
    badge: 'Ágil & Geral',
    descricao:
      'Perfeito para contratações operacionais, substituições urgentes ou contratos de curto prazo que demandam produtividade acelerada em até 30 dias.',
    tipoSugerido: 'CLT',
    checklistFases: [
      {
        fase: 0,
        titulo: 'Ficha cadastral rápida preenchida e documentos essenciais validados',
        responsavel: 'DP / RH',
      },
      {
        fase: 0,
        titulo: 'Atestado de Saúde Ocupacional (ASO) emitido',
        responsavel: 'Clínica Parceira',
      },
      {
        fase: 1,
        titulo: 'Contrato assinado eletronicamente e cadastro bancário',
        responsavel: 'RH / Contratado',
      },
      {
        fase: 1,
        titulo: 'Definição de metas prioritárias para as primeiras 4 semanas',
        responsavel: 'Gestor',
      },
      {
        fase: 2,
        titulo: 'Acessos criados (e-mail, ferramentas essenciais, grupos de comunicação)',
        responsavel: 'TI',
      },
      {
        fase: 2,
        titulo: 'Boas-vindas pelo gestor e buddy de apoio apresentado no Dia 1',
        responsavel: 'Gestor & Buddy',
      },
      {
        fase: 3,
        titulo: 'Semana 1: Conclusão do kit de treinamento rápido e imersão',
        responsavel: 'Colaborador',
      },
      {
        fase: 3,
        titulo: 'Semana 2: Primeiras tarefas com acompanhamento em par (shadowing)',
        responsavel: 'Buddy & Colaborador',
      },
      {
        fase: 3,
        titulo: 'Semana 4 (Dia 30): Check-in de 30 dias com gestor e avaliação de adaptação',
        responsavel: 'Gestor Contratante',
      },
      {
        fase: 3,
        titulo: 'Aplicação de NPS de Onboarding rápido (Feedback imediato)',
        responsavel: 'Gente & Gestão',
      },
    ],
    marcos: [
      {
        marco: '30_dias',
        titulo: 'Marco 30 Dias — Adaptação e Primeira Entrega',
        prazo: '+30 dias',
        status: 'pendente',
        objetivos: [
          'Concluir todos os treinamentos mandatórios de cultura e segurança',
          'Realizar entregas de forma autônoma na rotina diária',
          'Alinhamento com o gestor sobre pontos fortes e oportunidades de ajuste',
        ],
        entregasEsperadas: 'Tarefas da esteira diária operando sem impedimentos e feedback 1-on-1',
      },
      {
        marco: '60_dias',
        titulo: 'Marco 60 Dias — Consolidação de Ritmo',
        prazo: '+60 dias',
        status: 'pendente',
        objetivos: [
          'Atingimento da média de produtividade esperada para a posição',
          'Colaboração ativa nos rituais de time',
        ],
        entregasEsperadas: 'Metas intermediárias batidas com qualidade',
      },
      {
        marco: '90_dias',
        titulo: 'Marco 90 Dias — Integração Plena',
        prazo: '+90 dias',
        status: 'pendente',
        objetivos: [
          'Fechamento do período de integração com alto alinhamento cultural',
          'Avaliação final e definição de metas para o próximo trimestre',
        ],
        entregasEsperadas: 'Colaborador 100% integrado e auto-suficiente',
      },
    ],
  },
]

export const rotinaIntegracaoService = {
  async listar(filtro?: string): Promise<RotinaIntegracao[]> {
    try {
      const records = await pb.collection('rotinas_integracao').getFullList<RecordModel>({
        sort: '-created',
        filter: filtro,
        expand: 'gestor_responsavel,prestador_pj,candidato,vaga',
      })

      return records.map((r) => this.mapearRecord(r))
    } catch (err) {
      console.error('Erro ao listar rotinas de integração:', err)
      return []
    }
  },

  async buscarPorId(id: string): Promise<RotinaIntegracao | null> {
    try {
      const r = await pb.collection('rotinas_integracao').getOne<RecordModel>(id, {
        expand: 'gestor_responsavel,prestador_pj,candidato,vaga',
      })
      return this.mapearRecord(r)
    } catch {
      return null
    }
  },

  async buscarPorPrestadorId(prestadorId: string): Promise<RotinaIntegracao | null> {
    try {
      const r = await pb
        .collection('rotinas_integracao')
        .getFirstListItem<RecordModel>(`prestador_pj = '${prestadorId}'`, {
          expand: 'gestor_responsavel,prestador_pj,candidato,vaga',
        })
      return this.mapearRecord(r)
    } catch {
      return null
    }
  },

  async buscarPorCandidatoId(candidatoId: string): Promise<RotinaIntegracao | null> {
    try {
      const r = await pb
        .collection('rotinas_integracao')
        .getFirstListItem<RecordModel>(`candidato = '${candidatoId}'`, {
          expand: 'gestor_responsavel,prestador_pj,candidato,vaga',
        })
      return this.mapearRecord(r)
    } catch {
      return null
    }
  },

  calcularPercentual(itens: ItemChecklistRotina[]): number {
    if (!itens || itens.length === 0) return 0
    const concluidos = itens.filter((it) => it.concluido).length
    return Math.round((concluidos / itens.length) * 100)
  },

  calcularValorHora(valorContratado: number, horasSemanais = 40): number {
    if (!valorContratado || valorContratado <= 0) return 0
    const horasMes = (horasSemanais * 52) / 12
    const baseHoras = horasSemanais === 40 ? 160 : Number(horasMes.toFixed(1))
    return Number((valorContratado / baseHoras).toFixed(2))
  },

  calcularDatasMarcos(dataInicioIso: string): {
    marco30: string
    marco60: string
    marco90: string
  } {
    const base = new Date(dataInicioIso)
    const m30 = new Date(base)
    m30.setDate(m30.getDate() + 30)

    const m60 = new Date(base)
    m60.setDate(m60.getDate() + 60)

    const m90 = new Date(base)
    m90.setDate(m90.getDate() + 90)

    return {
      marco30: m30.toISOString().split('T')[0],
      marco60: m60.toISOString().split('T')[0],
      marco90: m90.toISOString().split('T')[0],
    }
  },

  async criar(input: CriarRotinaIntegracaoInput): Promise<RotinaIntegracao> {
    const percentual = this.calcularPercentual(input.itens_checklist)
    const valorHoraCalculado =
      input.valor_hora ||
      (input.valor_contratado
        ? this.calcularValorHora(input.valor_contratado, input.horas_semanais || 40)
        : 0)

    const datas = this.calcularDatasMarcos(input.data_inicio)
    const marcosAjustados = input.marcos_30_60_90.map((m) => {
      let prazoReal = m.prazo
      if (m.marco === '30_dias' && (!m.prazo || m.prazo.includes('+30'))) {
        prazoReal = datas.marco30
      } else if (m.marco === '60_dias' && (!m.prazo || m.prazo.includes('+60'))) {
        prazoReal = datas.marco60
      } else if (m.marco === '90_dias' && (!m.prazo || m.prazo.includes('+90'))) {
        prazoReal = datas.marco90
      }
      return {
        ...m,
        prazo: prazoReal,
        checkInRealizado: m.checkInRealizado || false,
        status: m.status || 'pendente',
      }
    })

    const payload = {
      tipo_integrado: input.tipo_integrado,
      nome_completo: input.nome_completo,
      documento_identificacao: input.documento_identificacao || '',
      email_contato: input.email_contato || '',
      telefone_contato: input.telefone_contato || '',
      cargo_funcao: input.cargo_funcao,
      departamento: input.departamento || '',
      gestor_responsavel: input.gestor_responsavel || null,
      gestor_nome: input.gestor_nome || '',
      buddy_mentor_nome: input.buddy_mentor_nome || '',
      buddy_mentor_email: input.buddy_mentor_email || '',
      prestador_pj: input.prestador_pj || null,
      candidato: input.candidato || null,
      vaga: input.vaga || null,
      data_inicio: input.data_inicio,
      valor_contratado: input.valor_contratado || 0,
      valor_hora: valorHoraCalculado,
      horas_semanais: input.horas_semanais || 40,
      duracao_meses: input.duracao_meses || 0,
      prazo_contrato_tipo:
        input.prazo_contrato_tipo ||
        (input.tipo_integrado === 'PJ' ? 'Determinado' : 'Indeterminado'),
      status_geral: 'Em Andamento',
      percentual_conclusao: percentual,
      template_origem: input.template_origem || 'Personalizado',
      itens_checklist: input.itens_checklist,
      marcos_30_60_90: marcosAjustados,
      nps_onboarding_score: null,
      nps_comentarios: '',
      observacoes: input.observacoes || '',
    }

    const rec = await pb.collection('rotinas_integracao').create(payload, {
      expand: 'gestor_responsavel,prestador_pj,candidato,vaga',
    })

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('souyess_meu_dia_updated'))
    }

    return this.mapearRecord(rec)
  },

  async atualizar(id: string, dados: Partial<RotinaIntegracao>): Promise<RotinaIntegracao> {
    const payload: Record<string, unknown> = { ...dados }
    delete payload.id
    delete payload.created
    delete payload.updated
    delete payload.expand

    if (dados.itens_checklist) {
      payload.percentual_conclusao = this.calcularPercentual(dados.itens_checklist)
    }

    const rec = await pb.collection('rotinas_integracao').update(id, payload, {
      expand: 'gestor_responsavel,prestador_pj,candidato,vaga',
    })

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('souyess_meu_dia_updated'))
    }

    return this.mapearRecord(rec)
  },

  async alternarItemChecklist(
    rotinaId: string,
    itemId: string,
    concluido: boolean,
  ): Promise<RotinaIntegracao> {
    const rotina = await this.buscarPorId(rotinaId)
    if (!rotina) throw new Error('Rotina não encontrada')

    const novosItens = rotina.itens_checklist.map((it) => {
      if (it.id === itemId) {
        return {
          ...it,
          concluido,
          dataConclusao: concluido ? new Date().toISOString().split('T')[0] : undefined,
        }
      }
      return it
    })

    const novoPerc = this.calcularPercentual(novosItens)
    let novoStatus = rotina.status_geral
    if (novoPerc === 100) {
      novoStatus = 'Integrado 90d'
    } else if (rotina.status_geral === 'Planejado') {
      novoStatus = 'Em Andamento'
    }

    return this.atualizar(rotinaId, {
      itens_checklist: novosItens,
      percentual_conclusao: novoPerc,
      status_geral: novoStatus,
    })
  },

  async registrarCheckInMarco(
    rotinaId: string,
    marcoKey: '30_dias' | '60_dias' | '90_dias',
    dadosCheckIn: {
      parecerGestor: string
      notaAvaliacao?: number
      statusMarco: 'concluido' | 'em_andamento'
    },
  ): Promise<RotinaIntegracao> {
    const rotina = await this.buscarPorId(rotinaId)
    if (!rotina) throw new Error('Rotina não encontrada')

    const novosMarcos = rotina.marcos_30_60_90.map((m) => {
      if (m.marco === marcoKey) {
        return {
          ...m,
          checkInRealizado: true,
          dataCheckIn: new Date().toISOString().split('T')[0],
          parecerGestor: dadosCheckIn.parecerGestor,
          notaAvaliacao: dadosCheckIn.notaAvaliacao ?? m.notaAvaliacao,
          status: dadosCheckIn.statusMarco,
        }
      }
      return m
    })

    return this.atualizar(rotinaId, {
      marcos_30_60_90: novosMarcos,
    })
  },

  async registrarNps(
    rotinaId: string,
    score: number,
    comentario: string,
  ): Promise<RotinaIntegracao> {
    return this.atualizar(rotinaId, {
      nps_onboarding_score: score,
      nps_comentarios: comentario,
    })
  },

  async excluir(id: string): Promise<boolean> {
    try {
      await pb.collection('rotinas_integracao').delete(id)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('souyess_meu_dia_updated'))
      }
      return true
    } catch {
      return false
    }
  },

  mapearRecord(r: RecordModel): RotinaIntegracao {
    return {
      id: r.id,
      tipo_integrado: (r.tipo_integrado as TipoIntegrado) || 'CLT',
      nome_completo: r.nome_completo || '',
      documento_identificacao: r.documento_identificacao || '',
      email_contato: r.email_contato || '',
      telefone_contato: r.telefone_contato || '',
      cargo_funcao: r.cargo_funcao || '',
      departamento: r.departamento || '',
      gestor_responsavel: r.gestor_responsavel || '',
      gestor_nome: r.gestor_nome || '',
      buddy_mentor_nome: r.buddy_mentor_nome || '',
      buddy_mentor_email: r.buddy_mentor_email || '',
      prestador_pj: r.prestador_pj || '',
      candidato: r.candidato || '',
      vaga: r.vaga || '',
      data_inicio: r.data_inicio || new Date().toISOString(),
      valor_contratado: Number(r.valor_contratado) || 0,
      valor_hora: Number(r.valor_hora) || 0,
      horas_semanais: Number(r.horas_semanais) || 40,
      duracao_meses: Number(r.duracao_meses) || 0,
      prazo_contrato_tipo: (r.prazo_contrato_tipo as PrazoContratoTipo) || 'Indeterminado',
      status_geral: (r.status_geral as StatusRotinaGeral) || 'Em Andamento',
      percentual_conclusao: Number(r.percentual_conclusao) || 0,
      template_origem: r.template_origem || 'Personalizado',
      itens_checklist: Array.isArray(r.itens_checklist) ? r.itens_checklist : [],
      marcos_30_60_90: Array.isArray(r.marcos_30_60_90) ? r.marcos_30_60_90 : [],
      nps_onboarding_score:
        r.nps_onboarding_score !== null && r.nps_onboarding_score !== undefined
          ? Number(r.nps_onboarding_score)
          : null,
      nps_comentarios: r.nps_comentarios || '',
      observacoes: r.observacoes || '',
      created: r.created,
      updated: r.updated,
      expand: r.expand as RotinaIntegracao['expand'],
    }
  },
}
export default rotinaIntegracaoService
