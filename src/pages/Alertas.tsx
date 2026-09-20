import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { RecordModel } from 'pocketbase'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import {
  Bell,
  Sparkles,
  Filter,
  Search,
  CheckCircle2,
  Trash2,
  Eye,
  ArrowRight,
  RefreshCw,
  Briefcase,
  User,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

export function Alertas() {
  const { toast } = useToast()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [varrendo, setVarrendo] = useState(false)
  const [alertas, setAlertas] = useState<RecordModel[]>([])
  const [vagas, setVagas] = useState<RecordModel[]>([])

  // Filtros
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroVaga, setFiltroVaga] = useState<string>('todas')
  const [busca, setBusca] = useState('')
  const [scoreMinimo, setScoreMinimo] = useState<number>(0)

  // Modal de reaproveitamento rápido
  const [modalReaproveitarOpen, setModalReaproveitarOpen] = useState(false)
  const [alertaAlvo, setAlertaAlvo] = useState<RecordModel | null>(null)
  const [savingReaproveitamento, setSavingReaproveitamento] = useState(false)

  const carregarAlertas = async () => {
    try {
      const [alertasRes, vagasRes] = await Promise.all([
        pb.collection('alertas').getFullList({
          sort: '-created',
          expand: 'candidato,vaga',
        }),
        pb.collection('vagas').getFullList({
          sort: '-created',
        }),
      ])
      setAlertas(alertasRes)
      setVagas(vagasRes)
    } catch (err: unknown) {
      console.error('Falha ao carregar alertas:', err)
      toast({
        title: 'Erro ao carregar alertas',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarAlertas()
  }, [])

  // Realtime para alertas e vagas
  useRealtime('alertas', () => carregarAlertas())
  useRealtime('vagas', () => carregarAlertas())

  // Ações de atualização de status
  const handleMarcarVisualizado = async (alertaId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await pb.collection('alertas').update(alertaId, {
        status: 'Visualizado',
      })
      setAlertas((prev) =>
        prev.map((a) => (a.id === alertaId ? { ...a, status: 'Visualizado' } : a)),
      )
      toast({
        title: 'Alerta visualizado',
        description: 'Status atualizado para Visualizado.',
      })
    } catch (err: unknown) {
      toast({
        title: 'Erro ao atualizar alerta',
        description: err instanceof Error ? err.message : 'Falha.',
        variant: 'destructive',
      })
    }
  }

  const handleDescartar = async (alertaId: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    try {
      await pb.collection('alertas').update(alertaId, {
        status: 'Descartado',
      })
      setAlertas((prev) =>
        prev.map((a) => (a.id === alertaId ? { ...a, status: 'Descartado' } : a)),
      )
      toast({
        title: 'Alerta descartado',
        description: 'O alerta foi arquivado como Descartado.',
      })
    } catch (err: unknown) {
      toast({
        title: 'Erro ao descartar alerta',
        description: err instanceof Error ? err.message : 'Falha.',
        variant: 'destructive',
      })
    }
  }

  const handleMarcarTodosVisualizados = async () => {
    const novos = alertas.filter((a) => a.status === 'Novo')
    if (novos.length === 0) return
    try {
      await Promise.all(
        novos.map((a) => pb.collection('alertas').update(a.id, { status: 'Visualizado' })),
      )
      setAlertas((prev) =>
        prev.map((a) => (a.status === 'Novo' ? { ...a, status: 'Visualizado' } : a)),
      )
      toast({
        title: 'Alertas atualizados',
        description: 'Todos os alertas pendentes foram marcados como visualizados.',
      })
    } catch (err: unknown) {
      toast({
        title: 'Erro ao marcar todos',
        description: err instanceof Error ? err.message : 'Falha.',
        variant: 'destructive',
      })
    }
  }

  const handleExecutarVarredura = async () => {
    setVarrendo(true)
    try {
      const res = await pb.send('/backend/v1/alertas/varredura', {
        method: 'POST',
      })
      toast({
        title: 'Varredura concluída',
        description: res.alertas_gerados
          ? `${res.alertas_gerados} novo(s) alerta(s) de talento detectado(s)!`
          : 'Nenhum novo par com aderência acima de 75% encontrado no momento.',
      })
      await carregarAlertas()
    } catch (err: unknown) {
      toast({
        title: 'Erro na varredura',
        description:
          err instanceof Error ? err.message : 'Falha ao executar varredura de talentos.',
        variant: 'destructive',
      })
    } finally {
      setVarrendo(false)
    }
  }

  const handleConfirmarReaproveitamento = async () => {
    if (!alertaAlvo) return
    setSavingReaproveitamento(true)
    try {
      const candId = alertaAlvo.candidato
      const vagaId = alertaAlvo.vaga
      const agora = new Date().toISOString()
      const candNome = alertaAlvo.expand?.candidato?.nome || 'Candidato'
      const vagaTitulo = alertaAlvo.expand?.vaga?.titulo || 'Vaga'

      // 1. Criar novo registro no pipeline
      await pb.collection('pipeline').create({
        candidato: candId,
        vaga: vagaId,
        estagio: 'Triagem',
        anotacoes: `Acionado via Alerta Automático de Talento (Score ${alertaAlvo.score}%). Justificativa da IA: ${alertaAlvo.resumo_ia}`,
        historico: [
          {
            data: agora,
            estagio: 'Triagem',
            autor: pb.authStore.model?.name || 'Sistema RH',
            nota: `Inscrito na vaga ${vagaTitulo} a partir de Alerta Automático. Score de aderência: ${alertaAlvo.score}%.`,
          },
        ],
      })

      // 2. Atualizar candidato para a vaga ativa
      await pb.collection('candidatos').update(candId, {
        vaga: vagaId,
        status: 'Triagem',
      })

      // 3. Atualizar status do alerta para Visualizado
      await pb.collection('alertas').update(alertaAlvo.id, {
        status: 'Visualizado',
      })

      toast({
        title: 'Candidato inscrito com sucesso!',
        description: `${candNome} foi adicionado à vaga "${vagaTitulo}" no Pipeline de Triagem.`,
      })

      setModalReaproveitarOpen(false)
      await carregarAlertas()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao reaproveitar talento',
        description: err instanceof Error ? err.message : 'Falha.',
        variant: 'destructive',
      })
    } finally {
      setSavingReaproveitamento(false)
    }
  }

  // Filtragem
  const alertasFiltrados = useMemo(() => {
    return alertas.filter((a) => {
      // Filtro Status
      if (filtroStatus !== 'todos' && a.status !== filtroStatus) return false

      // Filtro Vaga
      if (filtroVaga !== 'todas' && a.vaga !== filtroVaga) return false

      // Filtro Score mínimo
      if (scoreMinimo > 0 && (a.score || 0) < scoreMinimo) return false

      // Busca texto (nome do candidato, cargo, vaga ou resumo da IA)
      if (busca) {
        const termo = busca.toLowerCase()
        const candNome = a.expand?.candidato?.nome?.toLowerCase() || ''
        const candCargo = a.expand?.candidato?.cargo_atual?.toLowerCase() || ''
        const vagaNome = a.expand?.vaga?.titulo?.toLowerCase() || ''
        const resumo = a.resumo_ia?.toLowerCase() || ''
        if (
          !candNome.includes(termo) &&
          !candCargo.includes(termo) &&
          !vagaNome.includes(termo) &&
          !resumo.includes(termo)
        ) {
          return false
        }
      }

      return true
    })
  }, [alertas, filtroStatus, filtroVaga, scoreMinimo, busca])

  // Contagens
  const totalNovos = useMemo(() => alertas.filter((a) => a.status === 'Novo').length, [alertas])
  const totalVisualizados = useMemo(
    () => alertas.filter((a) => a.status === 'Visualizado').length,
    [alertas],
  )
  const totalDescartados = useMemo(
    () => alertas.filter((a) => a.status === 'Descartado').length,
    [alertas],
  )

  return (
    <div className="space-y-6 pb-12 animate-in fade-in-50 duration-300">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                  Alertas Automáticos de Talentos
                </h1>
                {totalNovos > 0 && (
                  <Badge className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-2 py-0.5">
                    {totalNovos} {totalNovos === 1 ? 'novo' : 'novos'}
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Notificações em tempo real quando talentos do banco se enquadram com alta aderência
                em vagas recém-abertas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {totalNovos > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleMarcarTodosVisualizados}
              className="text-xs border-slate-200 text-slate-700 hover:text-blue-600"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Marcar todos como lidos
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleExecutarVarredura}
            disabled={varrendo}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${varrendo ? 'animate-spin' : ''}`} />
            {varrendo ? 'Varrendo vagas...' : 'Executar Varredura Agora'}
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card
          onClick={() => setFiltroStatus('Novo')}
          className={`p-4 border-slate-200 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 ${
            filtroStatus === 'Novo' ? 'ring-2 ring-blue-600 bg-blue-50/30' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Novos Alertas
            </span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
              <Bell className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-blue-600 tabular-nums">{totalNovos}</span>
            <span className="text-[11px] text-slate-500">não visualizados</span>
          </div>
        </Card>

        <Card
          onClick={() => setFiltroStatus('Visualizado')}
          className={`p-4 border-slate-200 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 ${
            filtroStatus === 'Visualizado' ? 'ring-2 ring-blue-600 bg-blue-50/30' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Visualizados
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <Eye className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-800 tabular-nums">
              {totalVisualizados}
            </span>
            <span className="text-[11px] text-slate-500">em acompanhamento</span>
          </div>
        </Card>

        <Card
          onClick={() => setFiltroStatus('Descartado')}
          className={`p-4 border-slate-200 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 ${
            filtroStatus === 'Descartado' ? 'ring-2 ring-blue-600 bg-blue-50/30' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Descartados
            </span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center">
              <Trash2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-600 tabular-nums">
              {totalDescartados}
            </span>
            <span className="text-[11px] text-slate-500">arquivados</span>
          </div>
        </Card>

        <Card
          onClick={() => setFiltroStatus('todos')}
          className={`p-4 border-slate-200 shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 ${
            filtroStatus === 'todos' ? 'ring-2 ring-blue-600 bg-blue-50/30' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total de Alertas
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
              {alertas.length}
            </span>
            <span className="text-[11px] text-slate-500">histórico completo</span>
          </div>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Busca */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por candidato, vaga..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          {/* Filtro por Vaga */}
          <div>
            <Select value={filtroVaga} onValueChange={setFiltroVaga}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Todas as vagas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as vagas</SelectItem>
                {vagas.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro por Status */}
          <div>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="Novo">Novo</SelectItem>
                <SelectItem value="Visualizado">Visualizado</SelectItem>
                <SelectItem value="Descartado">Descartado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Score Mínimo */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-500 font-medium whitespace-nowrap">Score:</span>
            {[0, 75, 85, 90].map((sc) => (
              <button
                key={sc}
                onClick={() => setScoreMinimo(sc)}
                className={`flex-1 py-1 px-1.5 rounded text-[11px] font-semibold transition-colors ${
                  scoreMinimo === sc
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {sc === 0 ? 'Todos' : `≥${sc}%`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de Alertas */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-72" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : alertasFiltrados.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-slate-300">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">Nenhum alerta encontrado</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Não há notificações correspondentes aos filtros selecionados.
          </p>
          {(filtroStatus !== 'todos' || filtroVaga !== 'todas' || busca || scoreMinimo > 0) && (
            <Button
              variant="outline"
              size="sm"
              className="mt-4 text-xs"
              onClick={() => {
                setFiltroStatus('todos')
                setFiltroVaga('todas')
                setBusca('')
                setScoreMinimo(0)
              }}
            >
              Limpar filtros
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {alertasFiltrados.map((alerta) => {
            const cand = alerta.expand?.candidato
            const vaga = alerta.expand?.vaga
            const score = alerta.score || 75
            const isNovo = alerta.status === 'Novo'

            return (
              <Card
                key={alerta.id}
                className={`p-5 transition-all duration-200 border ${
                  isNovo
                    ? 'border-blue-200 bg-linear-to-r from-blue-50/30 via-white to-white shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Info Candidato e Vaga */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Ring de Score */}
                    <div
                      className={`relative w-13 h-13 rounded-xl flex flex-col items-center justify-center shrink-0 border font-extrabold ${
                        score >= 85
                          ? 'bg-blue-600 text-white border-blue-700 shadow-sm shadow-blue-500/20'
                          : score >= 75
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      <span className="text-base leading-none">{score}%</span>
                      <span className="text-[9px] uppercase tracking-wider font-semibold opacity-90">
                        fit
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {isNovo && (
                          <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] px-1.5 py-0">
                            Novo
                          </Badge>
                        )}
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Talento do Banco enquadrado
                        </span>
                        <span className="text-slate-300">·</span>
                        <span className="text-xs text-slate-400">
                          {alerta.created
                            ? new Date(alerta.created).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'Recente'}
                        </span>
                      </div>

                      <div className="mt-1 flex items-baseline gap-2 flex-wrap">
                        <Link
                          to={cand ? `/candidatos/${cand.id}` : '#'}
                          className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1"
                        >
                          {cand?.nome || 'Candidato'}
                        </Link>
                        <span className="text-xs text-slate-500 font-medium">
                          ({cand?.cargo_atual || 'Profissional'})
                        </span>
                        <span className="text-slate-300">→</span>
                        <Link
                          to={vaga ? `/vagas/${vaga.id}` : '#'}
                          className="text-sm font-semibold text-blue-700 hover:underline flex items-center gap-1"
                        >
                          <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                          {vaga?.titulo || 'Vaga Aberta'}
                        </Link>
                      </div>

                      {/* Resumo da IA */}
                      {alerta.resumo_ia && (
                        <div className="mt-2 text-xs text-slate-700 bg-slate-50/80 border border-slate-200/70 rounded-lg p-2.5 flex items-start gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                          <p className="leading-relaxed">{alerta.resumo_ia}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Ações Rápidas */}
                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0 flex-wrap">
                    {cand && (
                      <Link to={`/candidatos/${cand.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50"
                        >
                          <User className="w-3.5 h-3.5 mr-1" />
                          Ver Perfil
                        </Button>
                      </Link>
                    )}

                    <Button
                      size="sm"
                      onClick={() => {
                        setAlertaAlvo(alerta)
                        setModalReaproveitarOpen(true)
                      }}
                      className="h-8 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
                    >
                      <ArrowRight className="w-3.5 h-3.5 mr-1" />
                      Reaproveitar na Vaga
                    </Button>

                    {isNovo && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleMarcarVisualizado(alerta.id, e)}
                        className="h-8 text-xs text-slate-600 hover:text-blue-600"
                        title="Marcar como visualizado"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </Button>
                    )}

                    {alerta.status !== 'Descartado' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDescartar(alerta.id, e)}
                        className="h-8 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50"
                        title="Descartar alerta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de Confirmação de Reaproveitamento */}
      <Dialog open={modalReaproveitarOpen} onOpenChange={setModalReaproveitarOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              Confirmar Reaproveitamento de Talento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              O candidato será inscrito formalmente na vaga no estágio de <strong>
                Triagem
              </strong> e
              o alerta será marcado como visualizado.
            </DialogDescription>
          </DialogHeader>

          {alertaAlvo && (
            <div className="space-y-3 py-2 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Candidato:</span>
                  <span className="font-bold text-slate-900">
                    {alertaAlvo.expand?.candidato?.nome}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Vaga:</span>
                  <span className="font-bold text-blue-700">{alertaAlvo.expand?.vaga?.titulo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Aderência:</span>
                  <span className="font-bold text-emerald-700">{alertaAlvo.score}%</span>
                </div>
              </div>

              {alertaAlvo.resumo_ia && (
                <div className="text-slate-600 bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
                  <strong className="text-blue-900 block mb-0.5">Parecer da IA:</strong>
                  {alertaAlvo.resumo_ia}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setModalReaproveitarOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarReaproveitamento}
              disabled={savingReaproveitamento}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              {savingReaproveitamento ? 'Iniciando processo...' : 'Confirmar Inscrição'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default Alertas
