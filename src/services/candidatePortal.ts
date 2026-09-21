import pb from '@/lib/pocketbase/client'

export interface EtapaPipelineVisual {
  chave: string
  titulo: string
  descricao: string
  status?: 'concluida' | 'atual' | 'pendente' | 'reprovada'
}

export interface JanelaHorario {
  id: string
  data_inicio: string // ISO string
  label: string // Ex: "Segunda, 22/09 às 14:00"
  disponivel?: boolean
}

export interface JanelaAgendamentoPortal {
  id: string
  status:
    | 'Aguardando escolha'
    | 'Confirmado'
    | 'Reagendamento solicitado'
    | 'Cancelado'
    | 'Expirado'
  janelas_propostas: JanelaHorario[]
  janela_escolhida?: JanelaHorario | null
  motivo_reagendamento?: string
  formato: 'Online' | 'Presencial' | 'Telefonema'
  duracao_minutos: number
  responsavel_nome: string
  link_reuniao?: string
  observacoes_rh?: string
  updated?: string
}

export interface CandidatoPortalData {
  candidato: {
    id: string
    nome: string
    email: string
    telefone?: string
    status: string
    reprovado_triagem_auto?: boolean
    token_portal: string
    data_inscricao?: string
  }
  vaga?: {
    id: string
    titulo: string
    departamento?: string
    localizacao?: string
    modalidade?: string
    descricao?: string
  } | null
  pipeline?: {
    id: string
    estagio: string
    historico?: any[]
    updated?: string
  } | null
  etapas: EtapaPipelineVisual[]
  janelaAgendamento?: JanelaAgendamentoPortal | null
  entrevistaAtual?: {
    id: string
    data_hora: string
    formato: string
    duracao_minutos: number
    responsavel: string
    status: string
    observacoes?: string
  } | null
  feedbackExistente?: {
    id: string
    token_pesquisa?: string
    respondido: boolean
    data_resposta?: string
    nota_geral?: number
    nps_score?: number
    clareza_processo?: number
    tempo_resposta?: number
    tratamento_rh?: number
    clareza_vaga?: number
    recomendaria_empresa?: string
    comentario?: string
  } | null
}

export interface ProporJanelasInput {
  candidatoId: string
  janelas: JanelaHorario[]
  formato?: 'Online' | 'Presencial' | 'Telefonema'
  duracaoMinutos?: number
  responsavelNome?: string
  linkReuniao?: string
  observacoes?: string
}

export interface FeedbackNpsInput {
  nota_geral: number
  nps_score: number
  clareza_processo: number
  tempo_resposta: number
  tratamento_rh: number
  clareza_vaga: number
  recomendaria_empresa: string
  comentario?: string
}

export const candidatePortalService = {
  /**
   * Obtém os dados completos do portal do candidato via token público (sem autenticação)
   */
  async obterDadosPortal(token: string): Promise<CandidatoPortalData> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/public/candidato-portal/${token}`,
    )
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Não foi possível carregar os dados do portal do candidato.')
    }
    return data
  },

  /**
   * Candidato escolhe uma janela de horário (Self-Service)
   */
  async escolherHorario(
    token: string,
    slotId: string,
    dataInicio: string,
    label?: string,
  ): Promise<{
    success: boolean
    message: string
    escolha: JanelaHorario
    entrevistaId: string
  }> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/public/candidato-portal/${token}/escolher-horario`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, dataInicio, label }),
      },
    )
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao confirmar horário de entrevista.')
    }
    return data
  },

  /**
   * Candidato solicita reagendamento com motivo
   */
  async pedirReagendamento(
    token: string,
    motivo: string,
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/public/candidato-portal/${token}/pedir-reagendamento`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo }),
      },
    )
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao solicitar reagendamento.')
    }
    return data
  },

  /**
   * Candidato envia avaliação NPS pós-processo
   */
  async enviarFeedbackNps(
    token: string,
    feedback: FeedbackNpsInput,
  ): Promise<{ success: boolean; message: string; avaliacaoId: string }> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/public/candidato-portal/${token}/feedback-nps`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feedback),
      },
    )
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao enviar feedback.')
    }
    return data
  },

  /**
   * RH propõe janelas de horário para o candidato (Autenticado)
   */
  async proporJanelas(input: ProporJanelasInput): Promise<{
    success: boolean
    message: string
    token: string
    linkPortal: string
    janelaId: string
  }> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/candidato/${input.candidatoId}/propor-janelas`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          janelas: input.janelas,
          formato: input.formato || 'Online',
          duracaoMinutos: input.duracaoMinutos || 60,
          responsavelNome: input.responsavelNome || pb.authStore.record?.name || 'Gente & Gestão',
          linkReuniao: input.linkReuniao || '',
          observacoes: input.observacoes || '',
        }),
      },
    )
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao cadastrar propostas de horário.')
    }
    return data
  },

  /**
   * Gera ou recupera token seguro do portal para o candidato (Autenticado RH)
   */
  async gerarOuRecuperarToken(candidatoId: string): Promise<{
    success: boolean
    token: string
    linkPortal: string
  }> {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/candidato/${candidatoId}/gerar-token-portal`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
      },
    )
    const data = await res.json()
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao obter token do portal.')
    }
    return data
  },
}
