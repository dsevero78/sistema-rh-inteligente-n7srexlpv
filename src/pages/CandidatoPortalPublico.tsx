import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Sparkles,
  Calendar,
  CheckCircle2,
  Clock,
  Building2,
  MapPin,
  Briefcase,
  AlertCircle,
  HelpCircle,
  Video,
  Send,
  Loader2,
  Star,
  Heart,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Award,
  ArrowRight,
  MessageSquare,
  Copy,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  candidatePortalService,
  type CandidatoPortalData,
  type JanelaHorario,
} from '@/services/candidatePortal'

export default function CandidatoPortalPublico() {
  const { token } = useParams<{ token: string }>()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [dados, setDados] = useState<CandidatoPortalData | null>(null)

  // Agendamento self-service
  const [slotSelecionado, setSlotSelecionado] = useState<JanelaHorario | null>(null)
  const [confirmandoHorario, setConfirmandoHorario] = useState(false)
  const [reagendamentoModalOpen, setReagendamentoModalOpen] = useState(false)
  const [motivoReagendamento, setMotivoReagendamento] = useState('')
  const [enviandoReagendamento, setEnviandoReagendamento] = useState(false)

  // Feedback NPS pós-processo
  const [notaGeral, setNotaGeral] = useState<number>(10)
  const [npsScore, setNpsScore] = useState<number>(10)
  const [clarezaProcesso, setClarezaProcesso] = useState<number>(10)
  const [tempoResposta, setTempoResposta] = useState<number>(10)
  const [tratamentoRh, setTratamentoRh] = useState<number>(10)
  const [clarezaVaga, setClarezaVaga] = useState<number>(10)
  const [recomendaria, setRecomendaria] = useState<
    'Sim, com certeza' | 'Talvez' | 'Não recomendaria'
  >('Sim, com certeza')
  const [comentarioNps, setComentarioNps] = useState('')
  const [enviandoNps, setEnviandoNps] = useState(false)
  const [npsConcluido, setNpsConcluido] = useState(false)

  // Carregar dados do portal
  const carregarDados = useCallback(async () => {
    if (!token) {
      setErro('Link de acesso não informado ou inválido.')
      setLoading(false)
      return
    }
    try {
      const res = await candidatePortalService.obterDadosPortal(token)
      setDados(res)
      if (res.feedbackExistente && res.feedbackExistente.respondido) {
        setNpsConcluido(true)
      }
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Falha ao carregar informações da candidatura.')
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    carregarDados()
    // Polling suave a cada 15 segundos para refletir mudanças do pipeline em tempo real
    const interval = setInterval(() => {
      carregarDados()
    }, 15000)
    return () => clearInterval(interval)
  }, [carregarDados])

  // Lógica de mapeamento da Linha do Tempo Visual
  // Etapas:
  // 1. Inscrição recebida
  // 2. Triagem / Matching IA
  // 3. Entrevista RH
  // 4. Entrevista técnica
  // 5. Decisão / Proposta
  // 6. Contratação
  const stepsVisual = useMemo(() => {
    if (!dados) return []
    const status = dados.candidato.status || 'Triagem'
    const reprovado = dados.candidato.reprovado_triagem_auto || status === 'Recusado'

    const list = [
      {
        id: 'inscricao',
        titulo: 'Inscrição Recebida',
        subtitulo: dados.candidato.data_inscricao
          ? new Date(dados.candidato.data_inscricao).toLocaleDateString('pt-BR')
          : 'Confirmada',
        descricao: 'Currículo e dados iniciais recebidos com sucesso pela nossa plataforma.',
      },
      {
        id: 'triagem',
        titulo: 'Triagem & Matching IA',
        subtitulo: 'Aderência ao perfil',
        descricao:
          'Análise de compatibilidade técnica e competências conduzida com apoio de Inteligência Artificial.',
      },
      {
        id: 'entrevista_rh',
        titulo: 'Entrevista com RH',
        subtitulo: 'Cultura & Alinhamento',
        descricao: 'Conversa franca sobre trajetória, objetivos de carreira e valores da SouYess.',
      },
      {
        id: 'entrevista_tecnica',
        titulo: 'Entrevista Técnica',
        subtitulo: 'Desafios práticos',
        descricao:
          'Avaliação técnica com líderes especialistas e resolução de casos práticos do negócio.',
      },
      {
        id: 'proposta',
        titulo: 'Decisão & Proposta',
        subtitulo: 'Etapa final',
        descricao: 'Alinhamento da proposta salarial, pacote de benefícios e modelo de atuação.',
      },
      {
        id: 'contratacao',
        titulo: 'Contratação & Boas-vindas',
        subtitulo: 'Dia 1 na SouYess',
        descricao: 'Assinatura formal do contrato e integração com o time de Gente & Gestão.',
      },
    ]

    // Determinar o índice atual
    let currentIndex = 1 // Default Triagem
    if (status === 'Triagem') currentIndex = 1
    else if (status === 'Match técnico/comportamental (IA)') currentIndex = 1
    else if (status === 'Entrevista com RH') currentIndex = 2
    else if (status === 'Entrevista técnica') currentIndex = 3
    else if (status === 'Proposta') currentIndex = 4
    else if (status === 'Aprovado') currentIndex = 5
    else if (status === 'Recusado') {
      // Se recusado, ver onde parou pelo histórico do pipeline ou manter no último estágio
      const estagioHist = dados.pipeline?.estagio || 'Recusado'
      if (estagioHist === 'Entrevista técnica') currentIndex = 3
      else if (estagioHist === 'Entrevista com RH') currentIndex = 2
      else if (estagioHist === 'Proposta') currentIndex = 4
      else currentIndex = 1
    }

    return list.map((item, idx) => {
      let state: 'concluida' | 'atual' | 'pendente' | 'reprovada' = 'pendente'
      if (reprovado && idx === currentIndex) {
        state = 'reprovada'
      } else if (idx < currentIndex || (status === 'Aprovado' && idx <= 5)) {
        state = 'concluida'
      } else if (idx === currentIndex) {
        state = 'atual'
      }
      return {
        ...item,
        state,
      }
    })
  }, [dados])

  // Confirmação de horário pelo candidato
  const handleConfirmarHorario = async () => {
    if (!token || !slotSelecionado) return
    setConfirmandoHorario(true)
    try {
      await candidatePortalService.escolherHorario(
        token,
        slotSelecionado.id,
        slotSelecionado.data_inicio,
        slotSelecionado.label,
      )
      toast({
        title: 'Horário confirmado com sucesso! 🎉',
        description: `Sua entrevista está agendada para ${slotSelecionado.label}.`,
      })
      await carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Não foi possível confirmar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setConfirmandoHorario(false)
    }
  }

  // Solicitar reagendamento com motivo
  const handlePedirReagendamento = async () => {
    if (!token || !motivoReagendamento.trim()) {
      toast({
        title: 'Informe o motivo',
        description: 'Conte-nos o motivo ou suas disponibilidades de dias/horários.',
        variant: 'destructive',
      })
      return
    }
    setEnviandoReagendamento(true)
    try {
      await candidatePortalService.pedirReagendamento(token, motivoReagendamento.trim())
      toast({
        title: 'Solicitação enviada!',
        description: 'Nossa equipe de Gente & Gestão apresentará novas janelas em breve.',
      })
      setReagendamentoModalOpen(false)
      setMotivoReagendamento('')
      await carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao solicitar reagendamento',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setEnviandoReagendamento(false)
    }
  }

  // Enviar NPS pós-processo
  const handleSubmeterFeedbackNps = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return
    setEnviandoNps(true)
    try {
      await candidatePortalService.enviarFeedbackNps(token, {
        nota_geral: notaGeral,
        nps_score: npsScore,
        clareza_processo: clarezaProcesso,
        tempo_resposta: tempoResposta,
        tratamento_rh: tratamentoRh,
        clareza_vaga: clarezaVaga,
        recomendaria_empresa: recomendaria,
        comentario: comentarioNps.trim(),
      })
      toast({
        title: 'Obrigado pela sua avaliação! 🌟',
        description:
          'Sua opinião é vital para continuarmos aprimorando nosso processo de Gente & Gestão.',
      })
      setNpsConcluido(true)
      await carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao enviar avaliação',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setEnviandoNps(false)
    }
  }

  // Render Seletor de Escala 0-10
  const renderScale0to10 = (
    val: number,
    onChange: (n: number) => void,
    menor = 'Péssimo',
    maior = 'Excelente',
  ) => (
    <div className="space-y-1.5">
      <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
          const isSel = val === num
          return (
            <button
              type="button"
              key={num}
              onClick={() => onChange(num)}
              className={`h-9 sm:h-10 text-xs sm:text-sm font-bold font-mono rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                isSel
                  ? 'bg-[#E9530E] text-white border-[#E9530E] shadow-sm scale-105 ring-2 ring-[#E9530E]/30'
                  : 'bg-white dark:bg-[#1A2240] hover:bg-slate-50 dark:hover:bg-[#212B55] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#2E3A6E]'
              }`}
            >
              {num}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-400 px-0.5">
        <span>0 = {menor}</span>
        <span>10 = {maior}</span>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F8FB] dark:bg-[#11162B] flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-[#E9530E] text-white flex items-center justify-center mx-auto shadow-md shadow-[#E9530E]/20 animate-pulse">
            <Sparkles className="w-6 h-6" />
          </div>
          <h2 className="font-display text-base font-bold text-[#212B55] dark:text-[#F7F8FB]">
            Carregando sua jornada SouYess...
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Acessando ambiente seguro do candidato.
          </p>
        </div>
      </div>
    )
  }

  if (erro || !dados) {
    return (
      <div className="min-h-screen bg-[#F7F8FB] dark:bg-[#11162B] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240] shadow-sm text-center p-8">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-200 dark:border-rose-800">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="font-display text-lg font-bold text-[#212B55] dark:text-[#F7F8FB] tracking-tight">
            Acesso Indisponível ou Link Expirado
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
            {erro ||
              'Não foi possível localizar as informações associadas a este link de candidato.'}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/candidatar">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-display font-semibold"
              >
                Ver Oportunidades Abertas
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const { candidato, vaga, janelaAgendamento, feedbackExistente } = dados
  const isProcessoEncerrado = candidato.status === 'Aprovado' || candidato.status === 'Recusado'
  const isNaEtapaEntrevista =
    candidato.status === 'Entrevista com RH' || candidato.status === 'Entrevista técnica'

  const agendamentoConfirmado =
    janelaAgendamento?.status === 'Confirmado' && janelaAgendamento.janela_escolhida
  const agendamentoAguardando =
    janelaAgendamento?.status === 'Aguardando escolha' &&
    janelaAgendamento.janelas_propostas?.length > 0
  const agendamentoReagendamentoSolicitado =
    janelaAgendamento?.status === 'Reagendamento solicitado'

  return (
    <div className="min-h-screen bg-[#F7F8FB] dark:bg-[#11162B] text-slate-800 dark:text-slate-100 pb-20">
      {/* Top Header SouYess Institucional */}
      <header className="bg-[#11162B] dark:bg-[#0C1020] text-white border-b border-[#1A2240] sticky top-0 z-40 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#E9530E] flex items-center justify-center text-white font-display font-black text-base shadow-sm shadow-[#E9530E]/30">
              Y
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-sm tracking-tight text-white">
                  SouYess People Hub
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1A2240] text-amber-400 border border-amber-400/20">
                  Portal do Candidato
                </span>
              </div>
              <span className="text-[11px] text-slate-400 block -mt-0.5">
                Experiência interativa em tempo real
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[11px] font-semibold text-slate-300 border-[#2E3A6E] bg-[#1A2240]/60 hidden sm:inline-flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Link Único & Seguro
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero de Boas-Vindas & Status Atual */}
      <section className="bg-gradient-to-b from-[#11162B] via-[#1A2240] to-[#11162B] text-white py-10 px-4 sm:px-6 border-b border-[#2E3A6E]">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#E9530E]/15 text-[#E9530E] border border-[#E9530E]/30 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              Você no centro do processo
            </div>

            <div className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Sincronizado com o RH (atualização em tempo real)</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Olá, <span className="text-[#E9530E]">{candidato.nome}</span>! 👋
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-2xl font-sans">
              Acompanhe aqui o andamento da sua candidatura para a vaga de{' '}
              <strong className="text-white font-semibold">
                {vaga?.titulo || 'Oportunidade Profissional'}
              </strong>
              {vaga?.departamento ? ` (${vaga.departamento})` : ''}. Você pode conferir as etapas
              concluídas, agendar suas entrevistas e interagir com nosso time de recrutamento.
            </p>
          </div>

          {/* Card Resumo da Vaga */}
          {vaga && (
            <div className="pt-2">
              <div className="p-3.5 sm:p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-xs flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-[#E9530E]" />
                  <span>{vaga.titulo}</span>
                </div>
                {vaga.modalidade && (
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-400" />
                    <span>{vaga.modalidade}</span>
                  </div>
                )}
                {vaga.localizacao && (
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-400" />
                    <span>{vaga.localizacao}</span>
                  </div>
                )}
                <div className="ml-auto">
                  <Badge
                    className={`font-display text-xs font-bold ${
                      candidato.status === 'Aprovado'
                        ? 'bg-emerald-600 text-white'
                        : candidato.status === 'Recusado'
                          ? 'bg-rose-600 text-white'
                          : 'bg-[#E9530E] text-white'
                    }`}
                  >
                    Status: {candidato.status}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Conteúdo Principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 -mt-6 space-y-8">
        {/* ========================================================================= */}
        {/* 1. LINHA DO TEMPO VISUAL DO PIPELINE */}
        {/* ========================================================================= */}
        <Card className="border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240] shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="p-5 sm:p-6 border-b border-slate-100 dark:border-[#2E3A6E]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="font-display text-[11px] uppercase font-bold tracking-widest text-[#E9530E]">
                  Etapas do Processo
                </span>
                <CardTitle className="font-display text-lg font-bold text-[#212B55] dark:text-[#F7F8FB]">
                  Linha do Tempo da Candidatura
                </CardTitle>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#E9530E] animate-ping" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Etapa atual:{' '}
                  <strong className="text-[#212B55] dark:text-white font-bold">
                    {candidato.status}
                  </strong>
                </span>
              </div>
            </div>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              As etapas são atualizadas automaticamente conforme o RH avança com as análises e
              entrevistas.
            </CardDescription>
          </CardHeader>

          <CardContent className="p-5 sm:p-6">
            <div className="relative">
              {/* Timeline Horizontal/Vertical */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stepsVisual.map((step, idx) => {
                  const isConcluida = step.state === 'concluida'
                  const isAtual = step.state === 'atual'
                  const isReprovada = step.state === 'reprovada'

                  return (
                    <div
                      key={step.id}
                      className={`p-4 rounded-xl border transition-all relative ${
                        isAtual
                          ? 'bg-amber-50/70 dark:bg-amber-950/20 border-[#E9530E] ring-2 ring-[#E9530E]/30 shadow-xs'
                          : isConcluida
                            ? 'bg-emerald-50/50 dark:bg-emerald-950/15 border-emerald-200 dark:border-emerald-800/40 text-slate-700 dark:text-slate-300'
                            : isReprovada
                              ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40'
                              : 'bg-slate-50/60 dark:bg-[#141B34] border-slate-200 dark:border-[#2E3A6E] opacity-70'
                      }`}
                    >
                      {/* Badge Número / Check */}
                      <div className="flex items-center justify-between mb-2">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-bold text-xs ${
                            isAtual
                              ? 'bg-[#E9530E] text-white shadow-xs'
                              : isConcluida
                                ? 'bg-emerald-600 text-white'
                                : isReprovada
                                  ? 'bg-rose-600 text-white'
                                  : 'bg-slate-200 dark:bg-[#2E3A6E] text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isConcluida ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : isReprovada ? (
                            '✕'
                          ) : (
                            idx + 1
                          )}
                        </div>

                        {isAtual && (
                          <Badge className="bg-[#E9530E] text-white text-[10px] font-bold font-display uppercase tracking-wider py-0 px-2">
                            Em Andamento
                          </Badge>
                        )}
                        {isConcluida && (
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                            Concluído ✓
                          </span>
                        )}
                        {isReprovada && (
                          <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">
                            Processo encerrado
                          </span>
                        )}
                      </div>

                      <h4 className="font-display text-xs sm:text-sm font-bold text-[#212B55] dark:text-[#F7F8FB] tracking-tight">
                        {step.titulo}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                        {step.subtitulo}
                      </p>

                      <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">
                        {step.descricao}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Aviso quando encerrado ou reprovado */}
            {candidato.status === 'Recusado' && (
              <div className="mt-4 p-4 rounded-xl bg-slate-100 dark:bg-[#141B34] border border-slate-200 dark:border-[#2E3A6E] text-xs space-y-1 text-slate-700 dark:text-slate-300">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <Info className="w-4 h-4 text-slate-500" />
                  <span>Encerramento do Processo Seletivo</span>
                </div>
                <p className="leading-relaxed">
                  Agradecemos imensamente seu tempo, empenho e interesse em fazer parte da SouYess.
                  Mesmo não avançando neste momento para esta posição, seu perfil foi catalogado em
                  nosso <strong>Banco de Talentos</strong> para novos desafios compatíveis com suas
                  competências.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========================================================================= */}
        {/* 2. AGENDAMENTO SELF-SERVICE DE ENTREVISTA */}
        {/* ========================================================================= */}
        {isNaEtapaEntrevista && (
          <Card className="border-blue-200 dark:border-blue-900/50 bg-white dark:bg-[#1A2240] shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="p-5 sm:p-6 bg-gradient-to-r from-blue-50/80 via-white to-transparent dark:from-blue-950/30 dark:via-transparent border-b border-slate-100 dark:border-[#2E3A6E]">
              <div className="flex items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-600/30">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-display text-[11px] uppercase font-bold tracking-widest text-blue-600 dark:text-blue-400">
                      Self-Service de Entrevista
                    </span>
                    <CardTitle className="font-display text-base sm:text-lg font-bold text-[#212B55] dark:text-[#F7F8FB]">
                      Escolha o Melhor Horário para sua Conversa
                    </CardTitle>
                  </div>
                </div>

                {agendamentoConfirmado && (
                  <Badge className="bg-emerald-600 text-white font-bold text-xs">
                    Confirmado ✓
                  </Badge>
                )}
                {agendamentoReagendamentoSolicitado && (
                  <Badge className="bg-amber-600 text-white font-bold text-xs">
                    Reagendamento Solicitado
                  </Badge>
                )}
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                O time de Gente & Gestão disponibilizou janelas na agenda. Escolha com 1 clique o
                momento ideal para seu bate-papo.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 sm:p-6 space-y-5">
              {/* Caso 1: Já Confirmado */}
              {agendamentoConfirmado && (
                <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/40 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="space-y-1 flex-1">
                      <h4 className="font-display text-sm font-bold text-emerald-900 dark:text-emerald-300">
                        Entrevista Confirmada!
                      </h4>
                      <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed font-sans">
                        Seu horário está reservado:{' '}
                        <strong className="font-mono font-bold text-emerald-950 dark:text-white">
                          {janelaAgendamento.janela_escolhida?.label}
                        </strong>
                        .
                      </p>
                      <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-700 dark:text-slate-300">
                        <span className="font-semibold">
                          Formato: {janelaAgendamento.formato || 'Online'}
                        </span>
                        <span>·</span>
                        <span>Duração: ~{janelaAgendamento.duracao_minutos || 60} minutos</span>
                        <span>·</span>
                        <span>Responsável: {janelaAgendamento.responsavel_nome}</span>
                      </div>

                      {janelaAgendamento.link_reuniao && (
                        <div className="pt-2">
                          <a
                            href={janelaAgendamento.link_reuniao}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:underline"
                          >
                            <Video className="w-3.5 h-3.5" />
                            Acessar Sala Virtual da Entrevista
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReagendamentoModalOpen(true)}
                      className="text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    >
                      <RotateCcw className="w-3.5 h-3.5 mr-1" />
                      Preciso remarcar este horário
                    </Button>
                  </div>
                </div>
              )}

              {/* Caso 2: Reagendamento solicitado aguardando novas opções do RH */}
              {agendamentoReagendamentoSolicitado && (
                <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/25 border border-amber-200 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Aguardando novas opções do RH</span>
                  </div>
                  <p className="leading-relaxed">
                    Você solicitou o reagendamento com a seguinte observação:{' '}
                    <em>"{janelaAgendamento.motivo_reagendamento}"</em>. O time de Gente & Gestão
                    está alinhando a agenda dos entrevistadores e liberará novas janelas em
                    instantes.
                  </p>
                </div>
              )}

              {/* Caso 3: Janelas disponíveis para escolha do candidato */}
              {!agendamentoConfirmado && !agendamentoReagendamentoSolicitado && (
                <>
                  {janelaAgendamento?.janelas_propostas &&
                  janelaAgendamento.janelas_propostas.length > 0 ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                        <span>Selecione uma das janelas propostas abaixo:</span>
                        <span>
                          Formato: <strong>{janelaAgendamento.formato}</strong> (
                          {janelaAgendamento.duracao_minutos} min)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {janelaAgendamento.janelas_propostas.map((slot) => {
                          const isSel = slotSelecionado?.id === slot.id
                          return (
                            <button
                              type="button"
                              key={slot.id}
                              onClick={() => setSlotSelecionado(slot)}
                              className={`p-4 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                                isSel
                                  ? 'bg-[#E9530E]/10 border-[#E9530E] ring-2 ring-[#E9530E]/30 text-[#212B55] dark:text-white'
                                  : 'bg-slate-50 dark:bg-[#141B34] border-slate-200 dark:border-[#2E3A6E] text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#1F294D]'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-[#E9530E]" />
                                  <span className="font-display font-bold text-xs sm:text-sm">
                                    {slot.label}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                  Entrevistador: {janelaAgendamento.responsavel_nome}
                                </p>
                              </div>

                              <div
                                className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSel
                                    ? 'bg-[#E9530E] border-[#E9530E] text-white'
                                    : 'border-slate-300 dark:border-slate-600'
                                }`}
                              >
                                {isSel && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </div>
                            </button>
                          )
                        })}
                      </div>

                      {/* Botões de Ação */}
                      <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setReagendamentoModalOpen(true)}
                          className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1" />
                          Nenhum desses horários funciona para mim
                        </Button>

                        <Button
                          disabled={!slotSelecionado || confirmandoHorario}
                          onClick={handleConfirmarHorario}
                          className="w-full sm:w-auto bg-[#E9530E] hover:bg-[#d04609] text-white font-display font-bold text-xs h-10 px-6 shadow-sm shadow-[#E9530E]/20"
                        >
                          {confirmandoHorario ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Confirmando...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                              Confirmar Horário Selecionado
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-400 space-y-2">
                      <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
                      <p className="font-semibold text-slate-600 dark:text-slate-300">
                        O RH está preparando as opções de agenda para você
                      </p>
                      <p className="text-[11px] max-w-md mx-auto text-slate-400">
                        Assim que os entrevistadores abrirem as janelas de horário, elas aparecerão
                        aqui automaticamente para você escolher com 1 clique.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* ========================================================================= */}
        {/* 3. FEEDBACK ESTRUTURADO PÓS-PROCESSO (NPS DO CANDIDATO) */}
        {/* ========================================================================= */}
        {isProcessoEncerrado && (
          <Card className="border-purple-200 dark:border-purple-900/50 bg-white dark:bg-[#1A2240] shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="p-5 sm:p-6 bg-gradient-to-r from-purple-50/80 via-white to-transparent dark:from-purple-950/20 dark:via-transparent border-b border-slate-100 dark:border-[#2E3A6E]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-purple-600/30">
                  <Star className="w-5 h-5 fill-white" />
                </div>
                <div>
                  <span className="font-display text-[11px] uppercase font-bold tracking-widest text-purple-600 dark:text-purple-400">
                    Candidate Experience
                  </span>
                  <CardTitle className="font-display text-base sm:text-lg font-bold text-[#212B55] dark:text-[#F7F8FB]">
                    Como foi sua experiência com a gente?
                  </CardTitle>
                </div>
              </div>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Sua avaliação franca nos ajuda a garantir acolhimento, transparência e respeito em
                todos os processos de Gente & Gestão.
              </CardDescription>
            </CardHeader>

            <CardContent className="p-5 sm:p-6">
              {npsConcluido ? (
                <div className="p-6 rounded-xl bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-800/40 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-sm">
                    <Heart className="w-6 h-6 fill-white" />
                  </div>
                  <h4 className="font-display text-base font-bold text-emerald-900 dark:text-emerald-200">
                    Obrigado pelo seu feedback sincero!
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-300 max-w-lg mx-auto leading-relaxed">
                    Sua resposta foi registrada e consolidada nos indicadores de qualidade do nosso
                    RH. Agradecemos por dedicar seu tempo para nos ajudar a evoluir.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmeterFeedbackNps} className="space-y-6">
                  {/* Pergunta 1: NPS */}
                  <div className="space-y-2">
                    <label className="font-display text-xs sm:text-sm font-bold text-[#212B55] dark:text-[#F7F8FB] flex items-center gap-2">
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      1. Em uma escala de 0 a 10, qual a probabilidade de você recomendar a SouYess
                      para um amigo ou colega de trabalho? (NPS)
                    </label>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      (0 = Jamais recomendaria, 10 = Recomendaria com certeza)
                    </p>
                    {renderScale0to10(
                      npsScore,
                      setNpsScore,
                      'Jamais recomendaria',
                      'Recomendaria com certeza',
                    )}
                  </div>

                  {/* Dimensões Curtas */}
                  <div className="pt-4 border-t border-slate-100 dark:border-[#2E3A6E] space-y-4">
                    <h4 className="font-display text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      2. Dimensões do Processo Seletivo (0 a 10)
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#141B34] border border-slate-200 dark:border-[#2E3A6E] space-y-1.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Clareza das Etapas & Expectativas
                        </span>
                        {renderScale0to10(
                          clarezaProcesso,
                          setClarezaProcesso,
                          'Confuso',
                          'Cristalino',
                        )}
                      </div>

                      <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#141B34] border border-slate-200 dark:border-[#2E3A6E] space-y-1.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Tempo de Resposta & Comunicação
                        </span>
                        {renderScale0to10(tempoResposta, setTempoResposta, 'Lento', 'Muito Ágil')}
                      </div>

                      <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#141B34] border border-slate-200 dark:border-[#2E3A6E] space-y-1.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Acolhimento & Respeito do Entrevistador/RH
                        </span>
                        {renderScale0to10(tratamentoRh, setTratamentoRh, 'Frio', 'Exemplar')}
                      </div>

                      <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#141B34] border border-slate-200 dark:border-[#2E3A6E] space-y-1.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                          Alinhamento e Informações da Vaga
                        </span>
                        {renderScale0to10(
                          clarezaVaga,
                          setClarezaVaga,
                          'Pouco claro',
                          'Muito claro',
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Recomendação Geral */}
                  <div className="pt-2 space-y-2">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                      De forma geral, você recomendaria a nossa empresa como empregadora?
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {[
                        { val: 'Sim, com certeza', label: 'Sim, com certeza', icon: ThumbsUp },
                        { val: 'Talvez', label: 'Talvez / Neutro', icon: HelpCircle },
                        { val: 'Não recomendaria', label: 'Não recomendaria', icon: ThumbsDown },
                      ].map((item) => {
                        const Icon = item.icon
                        const isSel = recomendaria === item.val
                        return (
                          <button
                            type="button"
                            key={item.val}
                            onClick={() => setRecomendaria(item.val as any)}
                            className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                              isSel
                                ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-700 dark:text-purple-300 ring-2 ring-purple-500/20'
                                : 'bg-slate-50 dark:bg-[#141B34] border-slate-200 dark:border-[#2E3A6E] text-slate-600 dark:text-slate-300'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Espaço Aberto */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      Espaço aberto para comentários ou sugestões (opcional):
                    </label>
                    <Textarea
                      placeholder="Gostaria de destacar algum ponto positivo ou algo que podemos melhorar em nosso processo?"
                      value={comentarioNps}
                      onChange={(e) => setComentarioNps(e.target.value)}
                      className="min-h-[90px] text-xs bg-slate-50 dark:bg-[#141B34] border-slate-200 dark:border-[#2E3A6E]"
                    />
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button
                      type="submit"
                      disabled={enviandoNps}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-display font-bold text-xs h-10 px-6 shadow-sm"
                    >
                      {enviandoNps ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando feedback...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Avaliação de Experiência
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Rodapé Seguro & Direitos */}
        <div className="text-center text-xs text-slate-500 dark:text-slate-400 space-y-1 py-4">
          <p>© {new Date().getFullYear()} SouYess People Hub · Sistema RH Inteligente.</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-400">
            Seus dados são protegidos conforme as normas da Lei Geral de Proteção de Dados (LGPD).
          </p>
        </div>
      </main>

      {/* Modal de Reagendamento */}
      <Dialog open={reagendamentoModalOpen} onOpenChange={setReagendamentoModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E]">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-[#212B55] dark:text-[#F7F8FB]">
              Solicitar Reagendamento de Horário
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Conte-nos brevemente o motivo e, se possível, informe os melhores dias da semana ou
              turnos (manhã/tarde) para que o RH ofereça novas janelas.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <Textarea
              placeholder="Ex: Tive um conflito de horário inadiável no trabalho atual. Teria disponibilidade na quarta ou quinta-feira após às 15h..."
              value={motivoReagendamento}
              onChange={(e) => setMotivoReagendamento(e.target.value)}
              className="min-h-[110px] text-xs bg-slate-50 dark:bg-[#141B34] border-slate-200 dark:border-[#2E3A6E]"
            />
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-[#2E3A6E]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReagendamentoModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handlePedirReagendamento}
              disabled={enviandoReagendamento || !motivoReagendamento.trim()}
              className="bg-[#E9530E] hover:bg-[#d04609] text-white font-display font-bold text-xs"
            >
              {enviandoReagendamento ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Solicitação de Reagendamento'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
