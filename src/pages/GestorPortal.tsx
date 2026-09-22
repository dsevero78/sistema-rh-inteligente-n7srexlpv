import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import type { RecordModel } from 'pocketbase'
import { notificacoesRhService } from '@/services/notificacoesRh'
import { videoIaService } from '@/services/videoIaService'
import {
  Briefcase,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  MessageSquare,
  ThumbsUp,
  HelpCircle,
  ThumbsDown,
  ChevronRight,
  Eye,
  FileText,
  Video,
  Send,
  Loader2,
  Lock,
  BarChart3,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

export default function GestorPortal() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [vagas, setVagas] = useState<RecordModel[]>([])
  const [selectedVagaId, setSelectedVagaId] = useState<string | null>(null)
  const [candidatos, setCandidatos] = useState<RecordModel[]>([])
  const [feedbacks, setFeedbacks] = useState<RecordModel[]>([])
  const [percepcoes, setPercepcoes] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)

  // Modal Parecer da Vaga (Aprovar / Solicitar Ajustes)
  const [vagaModalOpen, setVagaModalOpen] = useState(false)
  const [vagaEmEdicao, setVagaEmEdicao] = useState<RecordModel | null>(null)
  const [statusAprovacaoVaga, setStatusAprovacaoVaga] = useState<
    'Aprovada pelo gestor' | 'Ajustes solicitados'
  >('Aprovada pelo gestor')
  const [parecerVagaTexto, setParecerVagaTexto] = useState('')
  const [savingVagaParecer, setSavingVagaParecer] = useState(false)

  // Modal Feedback do Candidato
  const [candidatoModalOpen, setCandidatoModalOpen] = useState(false)
  const [candidatoSelecionado, setCandidatoSelecionado] = useState<RecordModel | null>(null)
  const [recomendacaoCand, setRecomendacaoCand] = useState<'Avançar' | 'Em dúvida' | 'Recusar'>(
    'Avançar',
  )
  const [comentarioCand, setComentarioCand] = useState('')
  const [pontosPositivos, setPontosPositivos] = useState('')
  const [pontosAtencao, setPontosAtencao] = useState('')
  const [savingFeedback, setSavingFeedback] = useState(false)

  // Modal Ver Detalhes do Candidato (Vídeo + Percepção Compartilhada + Matching)
  const [candDetalhesModal, setCandDetalhesModal] = useState(false)
  const [candEmVisualizacao, setCandEmVisualizacao] = useState<RecordModel | null>(null)
  const [analiseIaCand, setAnaliseIaCand] = useState<RecordModel | null>(null)
  const [loadingAnaliseIaCand, setLoadingAnaliseIaCand] = useState(false)

  const carregarDadosGestor = async () => {
    if (!user) return
    try {
      setLoading(true)
      // Buscar vagas onde o usuário é gestor_responsavel OU da BU do gestor
      let filtroVagas = `gestor_responsavel = '${user.id}'`
      if (user.empresa) {
        filtroVagas = `gestor_responsavel = '${user.id}' || empresa = '${user.empresa}'`
      }
      const vagasGestor = await pb.collection('vagas').getFullList({
        filter: filtroVagas,
        sort: '-created',
      })
      setVagas(vagasGestor)

      if (vagasGestor.length > 0) {
        const vId = selectedVagaId || vagasGestor[0].id
        setSelectedVagaId(vId)
        await carregarCandidatosEVaga(vId)
      } else {
        setCandidatos([])
        setFeedbacks([])
        setPercepcoes([])
      }
    } catch (err) {
      console.error('Erro ao carregar portal do gestor:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar as vagas sob sua gestão.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const carregarCandidatosEVaga = async (vagaId: string) => {
    try {
      const [cList, fList, pList] = await Promise.all([
        pb.collection('candidatos').getFullList({
          filter: `vaga = '${vagaId}'`,
          sort: '-score_semantico',
        }),
        pb.collection('feedbacks_gestor').getFullList({
          filter: `vaga = '${vagaId}' && gestor = '${user?.id}'`,
          sort: '-created',
        }),
        pb.collection('percepcoes_rh').getFullList({
          filter: `vaga = '${vagaId}' && visibilidade = 'Compartilhada com o gestor'`,
          sort: '-created',
        }),
      ])
      setCandidatos(cList)
      setFeedbacks(fList)
      setPercepcoes(pList)
    } catch (err) {
      console.error('Erro ao buscar candidatos da vaga:', err)
    }
  }

  useEffect(() => {
    carregarDadosGestor()
  }, [user])

  useRealtime('vagas', () => carregarDadosGestor())
  useRealtime('candidatos', () => {
    if (selectedVagaId) carregarCandidatosEVaga(selectedVagaId)
  })
  useRealtime('feedbacks_gestor', () => {
    if (selectedVagaId) carregarCandidatosEVaga(selectedVagaId)
  })
  useRealtime('percepcoes_rh', () => {
    if (selectedVagaId) carregarCandidatosEVaga(selectedVagaId)
  })

  const vagaSelecionada = vagas.find((v) => v.id === selectedVagaId) || vagas[0]

  // Abrir modal de aprovação/parecer da vaga
  const handleOpenVagaModal = (v: RecordModel) => {
    setVagaEmEdicao(v)
    setStatusAprovacaoVaga(
      v.status_aprovacao_gestor === 'Ajustes solicitados'
        ? 'Ajustes solicitados'
        : 'Aprovada pelo gestor',
    )
    setParecerVagaTexto(v.parecer_gestor_vaga || '')
    setVagaModalOpen(true)
  }

  const handleSalvarParecerVaga = async () => {
    if (!vagaEmEdicao) return
    setSavingVagaParecer(true)
    try {
      const isAprovada = statusAprovacaoVaga === 'Aprovada pelo gestor'
      await pb.collection('vagas').update(vagaEmEdicao.id, {
        status_aprovacao_gestor: statusAprovacaoVaga,
        parecer_gestor_vaga: parecerVagaTexto,
        data_aprovacao_gestor: new Date().toISOString(),
      })

      // Notificar o RH in-app no PocketBase
      const nomeGestor = user?.name || user?.email || 'Gestor Contratante'
      const emailGestor = user?.email || ''

      await notificacoesRhService.criarNotificacao({
        titulo: isAprovada
          ? `Vaga Aprovada pelo Gestor: ${vagaEmEdicao.titulo}`
          : `Ajustes Solicitados pelo Gestor: ${vagaEmEdicao.titulo}`,
        mensagem: isAprovada
          ? `O gestor contratante ${nomeGestor} aprovou os termos e a descrição da vaga ${vagaEmEdicao.titulo}.${parecerVagaTexto ? ` Parecer: "${parecerVagaTexto}"` : ''}`
          : `O gestor contratante ${nomeGestor} solicitou ajustes na descrição da vaga ${vagaEmEdicao.titulo}.${parecerVagaTexto ? ` Justificativa: "${parecerVagaTexto}"` : ''}`,
        tipo: isAprovada ? 'vaga_aprovada' : 'vaga_ajustes',
        link: `/vagas/${vagaEmEdicao.id}`,
        autor_nome: nomeGestor,
        autor_email: emailGestor,
        referencia_tipo: 'vagas',
        referencia_id: vagaEmEdicao.id,
      })

      toast({
        title: isAprovada ? 'Vaga aprovada com sucesso!' : 'Solicitação de ajustes enviada ao RH',
        description: 'O time de Gente & Gestão foi notificado in-app com seu parecer.',
      })
      setVagaModalOpen(false)
      carregarDadosGestor()
    } catch (err) {
      toast({
        title: 'Erro ao registrar parecer',
        description: 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingVagaParecer(false)
    }
  }

  // Abrir modal de feedback do candidato
  const handleOpenFeedbackCand = (c: RecordModel) => {
    setCandidatoSelecionado(c)
    // Se já tiver feedback registrado por este gestor, carregar
    const fbExistente = feedbacks.find((f) => f.candidato === c.id)
    if (fbExistente) {
      setRecomendacaoCand(fbExistente.recomendacao || 'Avançar')
      setComentarioCand(fbExistente.comentario || '')
      setPontosPositivos(fbExistente.pontos_positivos || '')
      setPontosAtencao(fbExistente.pontos_atencao || '')
    } else {
      setRecomendacaoCand('Avançar')
      setComentarioCand('')
      setPontosPositivos('')
      setPontosAtencao('')
    }
    setCandidatoModalOpen(true)
  }

  const handleSalvarFeedbackCand = async () => {
    if (!candidatoSelecionado || !selectedVagaId || !user) return
    setSavingFeedback(true)
    try {
      const fbExistente = feedbacks.find((f) => f.candidato === candidatoSelecionado.id)
      const payload = {
        vaga: selectedVagaId,
        candidato: candidatoSelecionado.id,
        gestor: user.id,
        recomendacao: recomendacaoCand,
        comentario: comentarioCand,
        pontos_positivos: pontosPositivos,
        pontos_atencao: pontosAtencao,
      }

      if (fbExistente) {
        await pb.collection('feedbacks_gestor').update(fbExistente.id, payload)
        toast({ title: 'Feedback atualizado com sucesso!' })
      } else {
        await pb.collection('feedbacks_gestor').create(payload)
        toast({
          title: 'Feedback registrado com sucesso!',
          description: 'Seu parecer foi anexado ao dossiê e está acessível para o RH e IA.',
        })
      }

      // Notificar o RH in-app sobre o parecer do gestor no candidato
      const nomeGestor = user.name || user.email || 'Gestor Contratante'
      const emailGestor = user.email || ''
      const vagaTitulo = vagaSelecionada?.titulo || 'Vaga'

      await notificacoesRhService.criarNotificacao({
        titulo: `Parecer do Gestor: ${candidatoSelecionado.nome} (${recomendacaoCand})`,
        mensagem: `O gestor ${nomeGestor} emitiu parecer com recomendação "${recomendacaoCand}" para a vaga ${vagaTitulo}.${comentarioCand ? ` Comentário: "${comentarioCand}"` : ''}`,
        tipo: 'parecer_candidato',
        link: `/candidatos/${candidatoSelecionado.id}`,
        autor_nome: nomeGestor,
        autor_email: emailGestor,
        referencia_tipo: 'candidatos',
        referencia_id: candidatoSelecionado.id,
      })

      setCandidatoModalOpen(false)
      carregarCandidatosEVaga(selectedVagaId)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar parecer',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingFeedback(false)
    }
  }

  // Abrir visualização de dossiê do candidato para o gestor
  const handleVerDetalhesCand = async (c: RecordModel) => {
    setCandEmVisualizacao(c)
    setAnaliseIaCand(null)
    setLoadingAnaliseIaCand(true)
    setCandDetalhesModal(true)
    try {
      const analise = await videoIaService.obterAnaliseMaisRecente(c.id)
      setAnaliseIaCand(analise)
    } catch (err) {
      console.error('Erro ao carregar análise IA para gestor:', err)
    } finally {
      setLoadingAnaliseIaCand(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in-50">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header do Portal do Gestor */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded border border-blue-200">
              Portal do Gestor Contratante
            </span>
            <span className="text-xs text-slate-400">· Acesso Enxuto e Focado</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1">
            Minhas Posições & Candidatos
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Valide a descrição das suas vagas, analise o perfil dos candidatos e emita pareceres
            diretos para o time de RH.
          </p>
        </div>

        {/* Resumo de Vagas */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-right">
            <span className="text-[10px] font-bold uppercase text-slate-400 block">
              Vagas Atribuídas
            </span>
            <span className="text-lg font-extrabold text-slate-800">{vagas.length}</span>
          </div>
        </div>
      </div>

      {vagas.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-xl border border-dashed border-slate-300 space-y-3">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">Nenhuma vaga atribuída a você</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Você ainda não foi designado como gestor responsável por nenhuma vaga em aberto. Quando
            o time de Gente & Gestão vincular você a uma posição, ela aparecerá aqui para aprovação
            e acompanhamento.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Seletor de Vagas do Gestor */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {vagas.map((v) => {
              const isSelected = (selectedVagaId || vagas[0].id) === v.id
              const statusAprov = v.status_aprovacao_gestor || 'Aguardando aprovação'
              return (
                <button
                  key={v.id}
                  onClick={() => {
                    setSelectedVagaId(v.id)
                    carregarCandidatosEVaga(v.id)
                  }}
                  className={`px-4 py-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2 ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>{v.titulo}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : statusAprov === 'Aprovada pelo gestor'
                          ? 'bg-emerald-100 text-emerald-800'
                          : statusAprov === 'Ajustes solicitados'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {statusAprov === 'Aprovada pelo gestor'
                      ? '✓ Aprovada'
                      : statusAprov === 'Ajustes solicitados'
                        ? '⚠ Ajustes'
                        : '⏳ Pendente'}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Card de Destaque da Vaga Selecionada com Fluxo de Aprovação */}
          {vagaSelecionada && (
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="p-5 pb-3 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[11px] font-semibold bg-slate-100">
                      {vagaSelecionada.departamento || 'Tecnologia'}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-bold ${
                        vagaSelecionada.status_aprovacao_gestor === 'Aprovada pelo gestor'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : vagaSelecionada.status_aprovacao_gestor === 'Ajustes solicitados'
                            ? 'bg-rose-50 text-rose-700 border-rose-300'
                            : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}
                    >
                      {vagaSelecionada.status_aprovacao_gestor || 'Aguardando aprovação'}
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-bold text-slate-900 mt-1">
                    {vagaSelecionada.titulo}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    {vagaSelecionada.modalidade} · {vagaSelecionada.localizacao} ·{' '}
                    {vagaSelecionada.faixa_salarial || 'Faixa salarial a combinar'}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => handleOpenVagaModal(vagaSelecionada)}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                    Avaliar Descrição da Vaga
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="p-5 space-y-4 text-xs">
                {/* Parecer atual do gestor */}
                {vagaSelecionada.parecer_gestor_vaga && (
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 space-y-1">
                    <span className="font-bold text-slate-900 block">
                      Seu parecer registrado para o RH:
                    </span>
                    <p className="italic">"{vagaSelecionada.parecer_gestor_vaga}"</p>
                  </div>
                )}

                {/* Resumo da Descrição da Vaga */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">Escopo e Responsabilidades</h4>
                    <p className="text-slate-600 line-clamp-3">
                      {vagaSelecionada.descricao || 'Sem descrição cadastrada.'}
                    </p>
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 mb-1">
                      Requisitos Obrigatórios Definidos
                    </h4>
                    <ul className="space-y-1 text-slate-600">
                      {Array.isArray(vagaSelecionada.requisitos_obrigatorios) &&
                        vagaSelecionada.requisitos_obrigatorios.slice(0, 3).map((r: string, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-blue-600 font-bold">•</span>
                            <span className="line-clamp-1">{r}</span>
                          </li>
                        ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Candidatos da Vaga com Scores e Pareceres */}
          <Card className="border-slate-200 bg-white shadow-xs">
            <CardHeader className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Candidatos em Processo ({candidatos.length})
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Scores de matching, relatórios de IA e campo para registrar seu parecer formal
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="p-0 divide-y divide-slate-100">
              {candidatos.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">
                  Nenhum candidato vinculado a esta vaga até o momento.
                </div>
              ) : (
                candidatos.map((cand) => {
                  const fb = feedbacks.find((f) => f.candidato === cand.id)
                  const percepcaoComp = percepcoes.find((p) => p.candidato === cand.id)

                  return (
                    <div
                      key={cand.id}
                      className="p-5 hover:bg-slate-50/70 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="text-sm font-bold text-slate-900">{cand.nome}</span>
                          <Badge
                            variant="outline"
                            className="text-[10px] bg-slate-100 text-slate-700"
                          >
                            {cand.status}
                          </Badge>
                          {cand.reprovado_triagem_auto && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-rose-50 text-rose-700 border-rose-200 font-bold"
                            >
                              Reprovado na Triagem
                            </Badge>
                          )}
                          {cand.video_link && (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1 font-semibold"
                            >
                              <Video className="w-3 h-3" />
                              Vídeo Anexado
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-slate-500 truncate">
                          {cand.cargo_atual || 'Candidato'}
                          {cand.empresa_atual && ` · ${cand.empresa_atual}`}
                          {cand.localizacao && ` · ${cand.localizacao}`}
                        </p>

                        {/* Parecer do gestor já emitido */}
                        {fb && (
                          <div className="mt-2 text-xs bg-blue-50/60 border border-blue-200/70 p-2.5 rounded-lg space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-blue-950">Seu parecer:</span>
                              <Badge
                                className={`text-[10px] font-bold ${
                                  fb.recomendacao === 'Avançar'
                                    ? 'bg-emerald-600 text-white'
                                    : fb.recomendacao === 'Em dúvida'
                                      ? 'bg-amber-600 text-white'
                                      : 'bg-rose-600 text-white'
                                }`}
                              >
                                {fb.recomendacao}
                              </Badge>
                            </div>
                            {fb.comentario && (
                              <p className="text-slate-700 italic">"{fb.comentario}"</p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Matching Score e Ações */}
                      <div className="flex items-center gap-3 shrink-0 flex-wrap">
                        {/* Score Pill */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-center">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">
                            Fit IA
                          </span>
                          <span className="text-sm font-extrabold text-blue-700">
                            {cand.score_semantico || 75}%
                          </span>
                        </div>

                        {/* Botão Ver Detalhes (Vídeo + Percepção Compartilhada) */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerDetalhesCand(cand)}
                          className="text-xs font-semibold h-9 border-slate-200 text-slate-700 hover:bg-slate-100"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                          Dossiê & Vídeo
                        </Button>

                        {/* Botão Registrar/Editar Feedback */}
                        <Button
                          onClick={() => handleOpenFeedbackCand(cand)}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 shadow-xs"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1.5" />
                          {fb ? 'Editar Parecer' : 'Dar Parecer'}
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL 1: Avaliar / Aprovar Descrição da Vaga */}
      <Dialog open={vagaModalOpen} onOpenChange={setVagaModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Parecer do Gestor sobre a Vaga
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Aprove a abertura da posição ou aponte os ajustes necessários na descrição e
              requisitos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Sua Decisão *</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatusAprovacaoVaga('Aprovada pelo gestor')}
                  className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    statusAprovacaoVaga === 'Aprovada pelo gestor'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Aprovar Descrição
                </button>

                <button
                  type="button"
                  onClick={() => setStatusAprovacaoVaga('Ajustes solicitados')}
                  className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    statusAprovacaoVaga === 'Ajustes solicitados'
                      ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Solicitar Ajustes
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Comentários e Orientações para o RH
              </Label>
              <Textarea
                rows={3}
                placeholder="Ex: Descrição aprovada. Favor priorizar candidatos com vivência prática em microsserviços..."
                value={parecerVagaTexto}
                onChange={(e) => setParecerVagaTexto(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setVagaModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={savingVagaParecer}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              onClick={handleSalvarParecerVaga}
            >
              {savingVagaParecer ? 'Registrando...' : 'Confirmar Parecer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Feedback do Gestor para Candidato */}
      <Dialog open={candidatoModalOpen} onOpenChange={setCandidatoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Parecer do Gestor: {candidatoSelecionado?.nome}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Seu feedback orienta o RH e calibra as recomendações do Agente de IA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Recomendação Final *</Label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setRecomendacaoCand('Avançar')}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    recomendacaoCand === 'Avançar'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4 text-emerald-600" />
                  Avançar
                </button>

                <button
                  type="button"
                  onClick={() => setRecomendacaoCand('Em dúvida')}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    recomendacaoCand === 'Em dúvida'
                      ? 'bg-amber-50 border-amber-500 text-amber-800 ring-2 ring-amber-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  Em dúvida
                </button>

                <button
                  type="button"
                  onClick={() => setRecomendacaoCand('Recusar')}
                  className={`p-2.5 rounded-lg border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                    recomendacaoCand === 'Recusar'
                      ? 'bg-rose-50 border-rose-500 text-rose-800 ring-2 ring-rose-500/20'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <ThumbsDown className="w-4 h-4 text-rose-600" />
                  Recusar
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Parecer Geral / Justificativa *
              </Label>
              <Textarea
                rows={3}
                placeholder="Ex: Candidato muito maduro tecnicamente, comunicação clara e domínio exato das tecnologias que o time utiliza..."
                value={comentarioCand}
                onChange={(e) => setComentarioCand(e.target.value)}
                className="text-xs resize-none"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Pontos Fortes</Label>
                <Textarea
                  rows={2}
                  placeholder="Ex: Domínio em Go..."
                  value={pontosPositivos}
                  onChange={(e) => setPontosPositivos(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">
                  Pontos de Atenção
                </Label>
                <Textarea
                  rows={2}
                  placeholder="Ex: Alinhar plantões..."
                  value={pontosAtencao}
                  onChange={(e) => setPontosAtencao(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setCandidatoModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={savingFeedback || !comentarioCand.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              onClick={handleSalvarFeedbackCand}
            >
              {savingFeedback ? 'Salvando...' : 'Salvar Parecer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Dossiê Completo do Candidato para o Gestor (Vídeo + Percepção Compartilhada) */}
      <Dialog open={candDetalhesModal} onOpenChange={setCandDetalhesModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center justify-between">
              <span>Dossiê do Candidato: {candEmVisualizacao?.nome}</span>
              <Badge variant="outline" className="text-xs font-bold bg-blue-50 text-blue-800">
                Fit: {candEmVisualizacao?.score_semantico || 75}%
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {candEmVisualizacao?.cargo_atual} · {candEmVisualizacao?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2 text-xs">
            {/* Seção Vídeo de Apresentação */}
            <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                <Video className="w-4 h-4 text-blue-600" />
                Vídeo de Apresentação
              </h4>

              {candEmVisualizacao?.video_link ? (
                <div className="space-y-2">
                  <p className="text-slate-600">
                    O candidato disponibilizou o vídeo de apresentação via link externo:
                  </p>
                  <a
                    href={candEmVisualizacao.video_link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-blue-200 text-blue-700 font-semibold hover:bg-blue-50 transition-colors"
                  >
                    <span>Assistir Vídeo no Player Externo</span>
                    <ChevronRight className="w-4 h-4" />
                  </a>
                </div>
              ) : candEmVisualizacao?.video_apresentacao ? (
                <div className="space-y-2">
                  <div className="rounded-lg overflow-hidden border border-slate-300 bg-black aspect-video max-h-64 flex items-center justify-center shadow-xs">
                    <video
                      controls
                      className="w-full h-full max-h-64 object-contain"
                      src={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/candidatos/${candEmVisualizacao.id}/${candEmVisualizacao.video_apresentacao}`}
                    >
                      Seu navegador não suporta reprodução direta de vídeo.
                    </video>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-xs font-mono">
                      Arquivo: {candEmVisualizacao.video_apresentacao}
                    </span>
                    <a
                      href={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/candidatos/${candEmVisualizacao.id}/${candEmVisualizacao.video_apresentacao}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline font-semibold"
                    >
                      Abrir em nova aba
                    </a>
                  </div>
                </div>
              ) : (
                <p className="text-slate-400 italic">
                  Nenhum arquivo de vídeo anexado por enquanto.
                </p>
              )}
            </div>

            {/* Seção Análise de Vídeo por IA (Visível para o Gestor) */}
            <div className="space-y-3 p-4 bg-gradient-to-br from-orange-50/60 to-white rounded-xl border border-orange-200">
              <div className="flex items-center justify-between border-b border-orange-100 pb-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-[#E9530E]" />
                  Avaliação Dimensional de IA (Apresentação &amp; Vídeo)
                </h4>
                {analiseIaCand && (
                  <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold border-emerald-300">
                    ✓ Análise Concluída
                  </Badge>
                )}
              </div>

              {loadingAnaliseIaCand ? (
                <div className="flex items-center gap-2 py-4 justify-center text-slate-400">
                  <Loader2 className="w-4 h-4 animate-spin text-[#E9530E]" />
                  <span>Carregando relatório da IA...</span>
                </div>
              ) : analiseIaCand ? (
                <div className="space-y-3">
                  {/* Score Geral & Veredito */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-orange-200/80">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-[#E9530E] text-white flex flex-col items-center justify-center font-mono font-bold shrink-0">
                        <span className="text-sm leading-none">
                          {candEmVisualizacao?.video_score_geral || analiseIaCand.score_geral || 0}
                        </span>
                        <span className="text-[8px] opacity-90">/100</span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-wider text-[#E9530E] block">
                          Veredito Geral
                        </span>
                        <span className="font-bold text-slate-900 text-xs">
                          {analiseIaCand.recomendacao_geral || 'Recomendado'}
                        </span>
                        {analiseIaCand.nota_estimada && (
                          <span className="text-[10px] text-slate-500 block">
                            Nota: {analiseIaCand.nota_estimada}/10
                          </span>
                        )}
                      </div>
                    </div>
                    {analiseIaCand.data_geracao && (
                      <span className="text-[10px] text-slate-400">
                        {new Date(analiseIaCand.data_geracao).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>

                  {/* Alerta de Conflito de Identidade para o Gestor se houver */}
                  {analiseIaCand.conflito_identidade && !analiseIaCand.conflito_confirmado_rh && (
                    <div className="p-3 rounded-lg border border-red-300 bg-red-50 text-red-900 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-red-700">
                        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                        <span>Atenção: Conflito de Identidade Detectado no Vídeo</span>
                      </div>
                      <p className="text-[11px] leading-relaxed">
                        O nome identificado no vídeo ("
                        {analiseIaCand.nome_detectado_no_video || 'Não identificado'}") diverge do
                        cadastro deste candidato ("{candEmVisualizacao?.nome}"). O RH foi notificado
                        para validar o anexo.
                      </p>
                    </div>
                  )}

                  {/* Resumo Executivo */}
                  {analiseIaCand.resumo_executivo && (
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-600 block">
                        Síntese Executiva IA
                      </span>
                      <p className="text-slate-700 leading-relaxed">
                        {analiseIaCand.resumo_executivo}
                      </p>
                    </div>
                  )}

                  {/* Camada 2: Autenticidade da Fala (Natural vs Ensaiado/Decorado) */}
                  <div className="p-3 bg-indigo-50/60 rounded-lg border border-indigo-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-900 flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Autenticidade & Estrutura da Fala
                      </span>
                      {analiseIaCand.veredito_naturalidade ? (
                        <Badge
                          className={`text-[10px] font-bold ${
                            String(analiseIaCand.veredito_naturalidade)
                              .toLowerCase()
                              .includes('natural')
                              ? 'bg-emerald-600 text-white'
                              : String(analiseIaCand.veredito_naturalidade)
                                    .toLowerCase()
                                    .includes('ensaia')
                                ? 'bg-amber-600 text-white'
                                : 'bg-rose-600 text-white'
                          }`}
                        >
                          {analiseIaCand.veredito_naturalidade}
                          {analiseIaCand.indice_naturalidade !== undefined &&
                          analiseIaCand.indice_naturalidade !== null
                            ? ` (${analiseIaCand.indice_naturalidade}%)`
                            : ''}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">
                          não avaliado nesta análise — rode novamente
                        </span>
                      )}
                    </div>
                    {analiseIaCand.analise_linguistica &&
                      typeof analiseIaCand.analise_linguistica === 'object' && (
                        <div className="space-y-1 text-[11px] text-slate-700">
                          {analiseIaCand.analise_linguistica.estrutura_fala && (
                            <p>
                              <strong>Estrutura:</strong>{' '}
                              {analiseIaCand.analise_linguistica.estrutura_fala}
                            </p>
                          )}
                          {analiseIaCand.analise_linguistica.uso_exemplos_vs_cliches && (
                            <p>
                              <strong>Exemplos vs Clichês:</strong>{' '}
                              {analiseIaCand.analise_linguistica.uso_exemplos_vs_cliches}
                            </p>
                          )}
                        </div>
                      )}
                  </div>

                  {/* Camada 3: Pontos Cegos & Expressão Sócio-Emocional */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {/* Pontos Cegos */}
                    <div className="p-2.5 bg-amber-50/60 rounded-md border border-amber-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-amber-950 block text-[11px]">
                          Pontos Cegos da Fala:
                        </strong>
                        {!analiseIaCand.pontos_cegos && (
                          <span className="text-[9px] text-slate-400 italic">não avaliado</span>
                        )}
                      </div>
                      {analiseIaCand.pontos_cegos &&
                      typeof analiseIaCand.pontos_cegos === 'object' ? (
                        <div className="text-[11px] text-slate-700 space-y-1">
                          {analiseIaCand.pontos_cegos.sintese_inconsciente && (
                            <p>
                              <strong>Transmite sem perceber:</strong>{' '}
                              {analiseIaCand.pontos_cegos.sintese_inconsciente}
                            </p>
                          )}
                          {analiseIaCand.pontos_cegos.evasivas_ou_insegurancas && (
                            <p>
                              <strong>Evasivas/Hesitações:</strong>{' '}
                              {analiseIaCand.pontos_cegos.evasivas_ou_insegurancas}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">
                          Dimensão disponível ao reanalisar o vídeo.
                        </p>
                      )}
                    </div>

                    {/* Expressão Sócio-Emocional */}
                    <div className="p-2.5 bg-teal-50/60 rounded-md border border-teal-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <strong className="text-teal-950 block text-[11px]">
                          Expressão Sócio-Emocional:
                        </strong>
                        {!analiseIaCand.expressao_socioemocional && (
                          <span className="text-[9px] text-slate-400 italic">não avaliado</span>
                        )}
                      </div>
                      {analiseIaCand.expressao_socioemocional &&
                      typeof analiseIaCand.expressao_socioemocional === 'object' ? (
                        <div className="text-[11px] text-slate-700 space-y-1">
                          {analiseIaCand.expressao_socioemocional.regulacao_emocional && (
                            <p>
                              <strong>Regulação:</strong>{' '}
                              {analiseIaCand.expressao_socioemocional.regulacao_emocional}
                            </p>
                          )}
                          {analiseIaCand.expressao_socioemocional.congruencia_verbal_nao_verbal && (
                            <p>
                              <strong>Congruência:</strong>{' '}
                              {analiseIaCand.expressao_socioemocional.congruencia_verbal_nao_verbal}
                            </p>
                          )}
                          {analiseIaCand.expressao_socioemocional.maturidade_autocritica && (
                            <p>
                              <strong>Autocrítica:</strong>{' '}
                              {analiseIaCand.expressao_socioemocional.maturidade_autocritica}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">
                          Dimensão disponível ao reanalisar o vídeo.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Dimensões Qualitativas */}
                  {(analiseIaCand.comunicacao_oratoria ||
                    analiseIaCand.postura_presenca ||
                    analiseIaCand.dominio_experiencia ||
                    analiseIaCand.fit_cultural) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {analiseIaCand.comunicacao_oratoria && (
                        <div className="p-2.5 bg-white rounded-md border border-slate-200 text-slate-700">
                          <strong className="text-slate-900 block text-[11px] mb-0.5">
                            Comunicação:
                          </strong>
                          <p>{analiseIaCand.comunicacao_oratoria}</p>
                        </div>
                      )}
                      {analiseIaCand.postura_presenca && (
                        <div className="p-2.5 bg-white rounded-md border border-slate-200 text-slate-700">
                          <strong className="text-slate-900 block text-[11px] mb-0.5">
                            Postura:
                          </strong>
                          <p>{analiseIaCand.postura_presenca}</p>
                        </div>
                      )}
                      {analiseIaCand.dominio_experiencia && (
                        <div className="p-2.5 bg-white rounded-md border border-slate-200 text-slate-700">
                          <strong className="text-slate-900 block text-[11px] mb-0.5">
                            Domínio:
                          </strong>
                          <p>{analiseIaCand.dominio_experiencia}</p>
                        </div>
                      )}
                      {analiseIaCand.fit_cultural && (
                        <div className="p-2.5 bg-white rounded-md border border-slate-200 text-slate-700">
                          <strong className="text-slate-900 block text-[11px] mb-0.5">
                            Fit Cultural:
                          </strong>
                          <p>{analiseIaCand.fit_cultural}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dimensões quantitativas (barras se existirem) */}
                  {(analiseIaCand.clareza_comunicacao > 0 ||
                    analiseIaCand.estrutura_narrativa > 0 ||
                    analiseIaCand.energia_postura > 0 ||
                    analiseIaCand.aderencia_vaga > 0) && (
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <span className="text-[10px] font-bold uppercase text-slate-600 block flex items-center gap-1">
                        <BarChart3 className="w-3.5 h-3.5 text-[#E9530E]" />
                        Métricas Dimensionais
                      </span>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <div className="flex justify-between text-slate-600">
                            <span>Clareza</span>
                            <span className="font-bold">{analiseIaCand.clareza_comunicacao}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-0.5">
                            <div
                              className="h-full bg-emerald-500 rounded-full"
                              style={{ width: `${analiseIaCand.clareza_comunicacao}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-600">
                            <span>Estrutura</span>
                            <span className="font-bold">{analiseIaCand.estrutura_narrativa}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-0.5">
                            <div
                              className="h-full bg-blue-500 rounded-full"
                              style={{ width: `${analiseIaCand.estrutura_narrativa}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-600">
                            <span>Energia &amp; Postura</span>
                            <span className="font-bold">{analiseIaCand.energia_postura}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-0.5">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${analiseIaCand.energia_postura}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-600">
                            <span>Aderência à Vaga</span>
                            <span className="font-bold">{analiseIaCand.aderencia_vaga}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-0.5">
                            <div
                              className="h-full bg-amber-500 rounded-full"
                              style={{ width: `${analiseIaCand.aderencia_vaga}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pontos Fortes e Atenção */}
                  {((Array.isArray(analiseIaCand.pontos_fortes) &&
                    analiseIaCand.pontos_fortes.length > 0) ||
                    (Array.isArray(analiseIaCand.pontos_atencao) &&
                      analiseIaCand.pontos_atencao.length > 0)) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {Array.isArray(analiseIaCand.pontos_fortes) &&
                        analiseIaCand.pontos_fortes.length > 0 && (
                          <div className="p-2.5 bg-emerald-50 rounded-md border border-emerald-200">
                            <strong className="text-emerald-950 block text-[11px] mb-1">
                              Pontos Fortes:
                            </strong>
                            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-emerald-900">
                              {analiseIaCand.pontos_fortes.map((pf: string, i: number) => (
                                <li key={i}>{pf}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      {Array.isArray(analiseIaCand.pontos_atencao) &&
                        analiseIaCand.pontos_atencao.length > 0 && (
                          <div className="p-2.5 bg-amber-50 rounded-md border border-amber-200">
                            <strong className="text-amber-950 block text-[11px] mb-1">
                              Pontos de Atenção:
                            </strong>
                            <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-900">
                              {analiseIaCand.pontos_atencao.map((pa: string, i: number) => (
                                <li key={i}>{pa}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-slate-400 italic text-center py-2">
                  Análise inteligente de vídeo ainda não processada para este candidato.
                </p>
              )}
            </div>

            {/* Seção Percepção do RH Compartilhada com o Gestor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="font-bold text-slate-900 flex items-center gap-1.5 text-xs">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Percepção do RH (Compartilhada com Você)
                </h4>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-emerald-50 text-emerald-800 border-emerald-200"
                >
                  Visível para a Gestão
                </Badge>
              </div>

              {percepcoes.filter((p) => p.candidato === candEmVisualizacao?.id).length === 0 ? (
                <p className="text-slate-500 italic p-4 bg-slate-50 rounded-lg text-center">
                  O RH ainda não finalizou ou compartilhou percepção estruturada para este
                  candidato.
                </p>
              ) : (
                percepcoes
                  .filter((p) => p.candidato === candEmVisualizacao?.id)
                  .map((per) => (
                    <div
                      key={per.id}
                      className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">
                          Avaliador(a): {per.autor_nome || 'Gente & Gestão'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-700">
                            Nota Geral: {per.nota_geral || 8}/10
                          </span>
                          <Badge
                            className={`text-[10px] font-bold ${
                              per.conclusao === 'Avançar'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-amber-600 text-white'
                            }`}
                          >
                            {per.conclusao || 'Avançar'}
                          </Badge>
                        </div>
                      </div>

                      <div className="space-y-2 text-slate-700 leading-relaxed">
                        {per.comunicacao_clareza && (
                          <div>
                            <strong className="text-slate-900 block">Comunicação & Clareza:</strong>
                            <p>{per.comunicacao_clareza}</p>
                          </div>
                        )}
                        {per.postura_apresentacao && (
                          <div>
                            <strong className="text-slate-900 block">
                              Postura & Apresentação:
                            </strong>
                            <p>{per.postura_apresentacao}</p>
                          </div>
                        )}
                        {per.conteudo_experiencia && (
                          <div>
                            <strong className="text-slate-900 block">
                              Conteúdo & Experiências:
                            </strong>
                            <p>{per.conteudo_experiencia}</p>
                          </div>
                        )}
                        {per.aderencia_cultural && (
                          <div>
                            <strong className="text-slate-900 block">Aderência Cultural:</strong>
                            <p>{per.aderencia_cultural}</p>
                          </div>
                        )}
                        {per.pontos_fortes && (
                          <div className="p-2.5 bg-emerald-50/80 rounded border border-emerald-200 text-emerald-950">
                            <strong className="block mb-0.5">Pontos Fortes:</strong>
                            <p className="whitespace-pre-line">{per.pontos_fortes}</p>
                          </div>
                        )}
                        {per.pontos_atencao && (
                          <div className="p-2.5 bg-amber-50/80 rounded border border-amber-200 text-amber-950">
                            <strong className="block mb-0.5">Pontos de Atenção:</strong>
                            <p className="whitespace-pre-line">{per.pontos_atencao}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>

            {/* Resumo do Perfil */}
            <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-bold text-slate-900 text-xs">
                Resumo Profissional & Habilidades
              </h4>
              <p className="text-slate-600 leading-relaxed">
                {candEmVisualizacao?.resumo || 'Sem resumo cadastrado.'}
              </p>
              {Array.isArray(candEmVisualizacao?.habilidades_tecnicas) && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {candEmVisualizacao.habilidades_tecnicas.map((h: string, i: number) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 text-[10px] font-medium"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setCandDetalhesModal(false)}>
              Fechar Dossiê
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              onClick={() => {
                setCandDetalhesModal(false)
                if (candEmVisualizacao) handleOpenFeedbackCand(candEmVisualizacao)
              }}
            >
              Registrar Parecer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
