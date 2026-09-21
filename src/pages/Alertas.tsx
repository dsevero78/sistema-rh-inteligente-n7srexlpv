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
  Sliders,
  Settings,
  Mail,
  VolumeX,
  Volume2,
  ShieldCheck,
  Save,
  Plus,
  Building2,
  CalendarClock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CentralEmailsStatus } from '@/components/CentralEmailsStatus'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'
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

  // MÓDULO 3: Central de Preferências de Alerta
  const [abaAtiva, setAbaAtiva] = useState<'feed' | 'preferencias' | 'emails_status'>('feed')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const paramAba = params.get('aba')
    if (paramAba === 'emails_status' || paramAba === 'preferencias' || paramAba === 'feed') {
      setAbaAtiva(paramAba)
    }
  }, [])
  const [preferencias, setPreferencias] = useState<RecordModel[]>([])
  const [prefGlobal, setPrefGlobal] = useState<RecordModel | null>(null)
  const [salvandoPrefId, setSalvandoPrefId] = useState<string | null>(null)

  // Estados locais editáveis de preferências
  const [globalAtivo, setGlobalAtivo] = useState(true)
  const [globalLimiar, setGlobalLimiar] = useState(75)
  const [globalEmails, setGlobalEmails] = useState<string[]>([])
  const [novoEmailInput, setNovoEmailInput] = useState('')
  const [globalSilenciarDias, setGlobalSilenciarDias] = useState<number>(0)

  // Configurações por vaga
  const [vagaSelecionadaPref, setVagaSelecionadaPref] = useState<string>('')
  const [vagaAtivo, setVagaAtivo] = useState(true)
  const [vagaLimiar, setVagaLimiar] = useState(75)
  const [vagaEmails, setVagaEmails] = useState<string[]>([])
  const [novoEmailVagaInput, setNovoEmailVagaInput] = useState('')
  const [vagaSilenciarDias, setVagaSilenciarDias] = useState<number>(0)

  const carregarAlertas = async () => {
    try {
      const [alertasRes, vagasRes, prefsRes] = await Promise.all([
        pb.collection('alertas').getFullList({
          sort: '-created',
          expand: 'candidato,vaga,prestador',
        }),
        pb.collection('vagas').getFullList({
          sort: '-created',
        }),
        pb
          .collection('preferencias_alerta')
          .getFullList({
            sort: '-created',
            expand: 'vaga',
          })
          .catch(() => []),
      ])
      setAlertas(alertasRes)
      setVagas(vagasRes)
      setPreferencias(prefsRes)

      // Identificar preferência global (sem vaga ou vaga = '')
      const global = prefsRes.find((p) => !p.vaga)
      if (global) {
        setPrefGlobal(global)
        setGlobalAtivo(global.ativo !== false)
        setGlobalLimiar(global.limiar_score || 75)
        setGlobalEmails(Array.isArray(global.destinatarios) ? global.destinatarios : [])
      }
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

  // Realtime para alertas, vagas e preferencias
  useRealtime('alertas', () => carregarAlertas())
  useRealtime('vagas', () => carregarAlertas())
  useRealtime('preferencias_alerta', () => carregarAlertas())

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

  // Helpers para salvar preferências
  const handleSalvarPrefGlobal = async () => {
    setSalvandoPrefId('global')
    try {
      const payload: Record<string, any> = {
        ativo: globalAtivo,
        limiar_score: Number(globalLimiar),
        destinatarios: globalEmails,
      }
      if (globalSilenciarDias > 0) {
        const silenciarData = new Date(Date.now() + globalSilenciarDias * 24 * 60 * 60 * 1000)
        payload.silenciar_ate = silenciarData.toISOString().replace('T', ' ').substring(0, 19) + 'Z'
      } else {
        payload.silenciar_ate = null
      }

      if (prefGlobal) {
        await pb.collection('preferencias_alerta').update(prefGlobal.id, payload)
      } else {
        payload.vaga = null
        const novo = await pb.collection('preferencias_alerta').create(payload)
        setPrefGlobal(novo)
      }

      toast({
        title: 'Preferências Globais Atualizadas!',
        description:
          'Os parâmetros gerais de alertas e disparos de e-mail foram salvos com sucesso.',
      })
      carregarAlertas()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar preferências globais',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoPrefId(null)
    }
  }

  const handleSalvarPrefVaga = async () => {
    if (!vagaSelecionadaPref) {
      toast({
        title: 'Selecione uma vaga',
        description: 'Escolha a vaga para configurar o limiar e destinatários específicos.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoPrefId(vagaSelecionadaPref)
    try {
      const payload: Record<string, any> = {
        vaga: vagaSelecionadaPref,
        ativo: vagaAtivo,
        limiar_score: Number(vagaLimiar),
        destinatarios: vagaEmails,
      }
      if (vagaSilenciarDias > 0) {
        const silenciarData = new Date(Date.now() + vagaSilenciarDias * 24 * 60 * 60 * 1000)
        payload.silenciar_ate = silenciarData.toISOString().replace('T', ' ').substring(0, 19) + 'Z'
      } else {
        payload.silenciar_ate = null
      }

      const prefExistente = preferencias.find((p) => p.vaga === vagaSelecionadaPref)
      if (prefExistente) {
        await pb.collection('preferencias_alerta').update(prefExistente.id, payload)
      } else {
        await pb.collection('preferencias_alerta').create(payload)
      }

      const vagaObj = vagas.find((v) => v.id === vagaSelecionadaPref)
      toast({
        title: 'Regra da Vaga Salva!',
        description: `Configuração específica para "${vagaObj?.titulo || 'Vaga'}" atualizada com sucesso.`,
      })
      carregarAlertas()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar preferência da vaga',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoPrefId(null)
    }
  }

  // Quando o usuário escolhe uma vaga no seletor de preferências específicas
  const handleSelecionarVagaPref = (vId: string) => {
    setVagaSelecionadaPref(vId)
    const pref = preferencias.find((p) => p.vaga === vId)
    if (pref) {
      setVagaAtivo(pref.ativo !== false)
      setVagaLimiar(pref.limiar_score || 75)
      setVagaEmails(Array.isArray(pref.destinatarios) ? pref.destinatarios : [])
      if (pref.silenciar_ate) {
        const diff = Math.max(
          1,
          Math.ceil((new Date(pref.silenciar_ate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
        )
        setVagaSilenciarDias(diff > 0 ? diff : 0)
      } else {
        setVagaSilenciarDias(0)
      }
    } else {
      // Herdar valores do global por padrão
      setVagaAtivo(true)
      setVagaLimiar(globalLimiar)
      setVagaEmails([...globalEmails])
      setVagaSilenciarDias(0)
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
        const prestNome =
          a.expand?.prestador?.nome_fantasia?.toLowerCase() ||
          a.expand?.prestador?.razao_social?.toLowerCase() ||
          ''
        const resumo = a.resumo_ia?.toLowerCase() || ''
        if (
          !candNome.includes(termo) &&
          !candCargo.includes(termo) &&
          !vagaNome.includes(termo) &&
          !prestNome.includes(termo) &&
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
                em vagas abertas, com regras e limiares personalizáveis.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {totalNovos > 0 && abaAtiva === 'feed' && (
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

      {/* Tabs de Navegação: Feed de Alertas vs Central de Preferências */}
      <Tabs
        value={abaAtiva}
        onValueChange={(val) => setAbaAtiva(val as any)}
        className="w-full space-y-6"
      >
        <TabsList className="grid w-full sm:w-[580px] grid-cols-3 bg-slate-100 dark:bg-[#141B34] p-1 border border-slate-200/60 dark:border-[#2E3A6E]">
          <TabsTrigger
            value="feed"
            className="text-xs font-semibold flex items-center gap-1.5 dark:text-slate-300 dark:data-[state=active]:bg-[#1A2240] dark:data-[state=active]:text-white"
          >
            <Bell className="w-3.5 h-3.5" />
            Feed Notificações
            {totalNovos > 0 && (
              <span className="bg-[#E9530E] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {totalNovos}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="preferencias"
            className="text-xs font-semibold flex items-center gap-1.5 dark:text-slate-300 dark:data-[state=active]:bg-[#1A2240] dark:data-[state=active]:text-white"
          >
            <Settings className="w-3.5 h-3.5" />
            Preferências de Alerta
          </TabsTrigger>
          <TabsTrigger
            value="emails_status"
            className="text-xs font-semibold flex items-center gap-1.5 dark:text-slate-300 dark:data-[state=active]:bg-[#1A2240] dark:data-[state=active]:text-white"
          >
            <Mail className="w-3.5 h-3.5 text-[#1D4ED8] dark:text-[#F19763]" />
            E-mails de Status
          </TabsTrigger>
        </TabsList>

        {/* ABA 1: FEED DE ALERTAS (Conteúdo original enriquecido) */}
        <TabsContent value="feed" className="space-y-6 mt-0">
          {/* Cards de Métricas */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card
              onClick={() => setFiltroStatus('Novo')}
              className={`p-4 border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240] shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 ${
                filtroStatus === 'Novo'
                  ? 'ring-2 ring-blue-600 dark:ring-[#E9530E] bg-blue-50/30 dark:bg-[#212B55]'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Novos Alertas
                </span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-[#212B55] text-blue-600 dark:text-[#F19763] flex items-center justify-center font-bold text-xs">
                  <Bell className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-blue-600 dark:text-[#F19763] tabular-nums">
                  {totalNovos}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  não visualizados
                </span>
              </div>
            </Card>

            <Card
              onClick={() => setFiltroStatus('Visualizado')}
              className={`p-4 border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240] shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 ${
                filtroStatus === 'Visualizado'
                  ? 'ring-2 ring-blue-600 dark:ring-[#E9530E] bg-blue-50/30 dark:bg-[#212B55]'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Visualizados
                </span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#212B55] text-slate-600 dark:text-slate-300 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-800 dark:text-[#F7F8FB] tabular-nums">
                  {totalVisualizados}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  em acompanhamento
                </span>
              </div>
            </Card>

            <Card
              onClick={() => setFiltroStatus('Descartado')}
              className={`p-4 border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240] shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 ${
                filtroStatus === 'Descartado'
                  ? 'ring-2 ring-blue-600 dark:ring-[#E9530E] bg-blue-50/30 dark:bg-[#212B55]'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Descartados
                </span>
                <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#212B55] text-slate-400 dark:text-slate-300 flex items-center justify-center">
                  <Trash2 className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-600 dark:text-slate-300 tabular-nums">
                  {totalDescartados}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">arquivados</span>
              </div>
            </Card>

            <Card
              onClick={() => setFiltroStatus('todos')}
              className={`p-4 border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240] shadow-xs cursor-pointer transition-all hover:-translate-y-0.5 ${
                filtroStatus === 'todos'
                  ? 'ring-2 ring-blue-600 dark:ring-[#E9530E] bg-blue-50/30 dark:bg-[#212B55]'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Total de Alertas
                </span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-slate-900 dark:text-[#F7F8FB] tabular-nums">
                  {alertas.length}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  histórico completo
                </span>
              </div>
            </Card>
          </div>

          {/* Barra de Filtros */}
          <div className="bg-white dark:bg-[#1A2240] p-4 rounded-xl border border-slate-200 dark:border-[#2E3A6E] shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Busca */}
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar por candidato, vaga..."
                  className="pl-9 h-9 text-xs dark:bg-[#11162B] dark:border-[#2E3A6E] dark:text-[#F7F8FB]"
                />
              </div>

              {/* Filtro por Vaga */}
              <div>
                <Select value={filtroVaga} onValueChange={setFiltroVaga}>
                  <SelectTrigger className="h-9 text-xs dark:bg-[#11162B] dark:border-[#2E3A6E] dark:text-[#F7F8FB]">
                    <SelectValue placeholder="Todas as vagas" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-[#1A2240] dark:border-[#2E3A6E]">
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
                  <SelectTrigger className="h-9 text-xs dark:bg-[#11162B] dark:border-[#2E3A6E] dark:text-[#F7F8FB]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-[#1A2240] dark:border-[#2E3A6E]">
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="Novo">Novo</SelectItem>
                    <SelectItem value="Visualizado">Visualizado</SelectItem>
                    <SelectItem value="Descartado">Descartado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro Score Mínimo */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                  Score:
                </span>
                {[0, 75, 85, 90].map((sc) => (
                  <button
                    key={sc}
                    onClick={() => setScoreMinimo(sc)}
                    className={`flex-1 py-1 px-1.5 rounded text-[11px] font-semibold transition-colors ${
                      scoreMinimo === sc
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 dark:bg-[#212B55] text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-[#2E3A6E]'
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
                        ? 'border-blue-200 dark:border-[#2E3A6E] bg-linear-to-r from-blue-50/30 via-white to-white dark:from-[#1A2240] dark:via-[#1A2240] dark:to-[#141B34] shadow-xs'
                        : 'border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240] hover:border-slate-300'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Info Candidato e Vaga */}
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        {/* Ring de Score ou Ícone do Evento */}
                        {alerta.tipo === 'renovacao_contrato_pj' ||
                        alerta.tipo === 'contrato_pj_vencendo' ? (
                          <div className="w-13 h-13 rounded-xl flex flex-col items-center justify-center shrink-0 border font-extrabold bg-indigo-50 text-indigo-800 border-indigo-200 shadow-2xs">
                            <CalendarClock className="w-6 h-6 text-indigo-600" />
                            <span className="text-[8px] uppercase tracking-wider font-black mt-0.5 text-indigo-700">
                              Renovação PJ
                            </span>
                          </div>
                        ) : alerta.tipo?.includes('pj') ? (
                          <div className="w-13 h-13 rounded-xl flex flex-col items-center justify-center shrink-0 border font-extrabold bg-amber-50 text-amber-800 border-amber-200">
                            <Briefcase className="w-6 h-6 text-amber-600" />
                            <span className="text-[8px] uppercase tracking-wider font-bold mt-0.5">
                              PJ
                            </span>
                          </div>
                        ) : alerta.tipo === 'aprovacao_vaga_gestor' ? (
                          <div className="w-13 h-13 rounded-xl flex flex-col items-center justify-center shrink-0 border font-extrabold bg-emerald-50 text-emerald-700 border-emerald-200">
                            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                            <span className="text-[8px] uppercase tracking-wider font-bold mt-0.5">
                              Vaga
                            </span>
                          </div>
                        ) : alerta.tipo === 'parecer_gestor_candidato' ? (
                          <div className="w-13 h-13 rounded-xl flex flex-col items-center justify-center shrink-0 border font-extrabold bg-purple-50 text-purple-700 border-purple-200">
                            <User className="w-6 h-6 text-purple-600" />
                            <span className="text-[8px] uppercase tracking-wider font-bold mt-0.5">
                              Parecer
                            </span>
                          </div>
                        ) : (
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
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isNovo && (
                              <Badge className="bg-blue-600 hover:bg-blue-600 text-white text-[10px] px-1.5 py-0">
                                Novo
                              </Badge>
                            )}
                            {alerta.tipo === 'renovacao_contrato_pj' ||
                            alerta.tipo === 'contrato_pj_vencendo' ? (
                              <Badge className="bg-indigo-100 text-indigo-900 border-indigo-300 hover:bg-indigo-100 text-[10px] font-black tracking-wide uppercase px-2 py-0.5">
                                Renovação PJ
                              </Badge>
                            ) : null}
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                              {alerta.tipo === 'renovacao_contrato_pj' ||
                              alerta.tipo === 'contrato_pj_vencendo'
                                ? 'Decisão de Renovação Contratual PJ (Janela 60d)'
                                : alerta.tipo === 'documento_pj_vencido'
                                  ? 'Documento / Certidão PJ Vencida'
                                  : alerta.tipo === 'documento_pj_vencendo'
                                    ? 'Documento PJ Próximo do Vencimento'
                                    : alerta.tipo === 'nota_fiscal_pj_atrasada'
                                      ? 'Nota Fiscal PJ em Atraso'
                                      : alerta.tipo === 'aprovacao_vaga_gestor'
                                        ? 'Aprovação / Alinhamento de Vaga pelo Gestor'
                                        : alerta.tipo === 'parecer_gestor_candidato'
                                          ? 'Parecer Formal do Gestor Contratante'
                                          : 'Talento do Banco enquadrado'}
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
                            {alerta.tipo?.includes('pj') ? (
                              <Link
                                to={
                                  alerta.expand?.prestador?.id
                                    ? `/pessoas/${alerta.expand.prestador.id}`
                                    : '/pessoas'
                                }
                                className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                              >
                                <Building2 className="w-4 h-4 text-amber-600" />
                                {alerta.expand?.prestador?.nome_fantasia ||
                                  alerta.expand?.prestador?.razao_social ||
                                  'Pessoa / Prestador PJ'}
                              </Link>
                            ) : alerta.tipo === 'aprovacao_vaga_gestor' ? (
                              <Link
                                to={vaga ? `/vagas/${vaga.id}` : '#'}
                                className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1.5"
                              >
                                <Briefcase className="w-4 h-4 text-emerald-600" />
                                {vaga?.titulo || 'Vaga em Análise'}
                              </Link>
                            ) : (
                              <>
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
                              </>
                            )}
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
                        {alerta.tipo === 'renovacao_contrato_pj' ||
                        alerta.tipo === 'contrato_pj_vencendo' ? (
                          <>
                            <Link
                              to={
                                alerta.expand?.prestador?.id
                                  ? `/pessoas/${alerta.expand.prestador.id}`
                                  : '/pessoas'
                              }
                            >
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs font-bold border-indigo-200 text-indigo-900 bg-indigo-50/50 hover:bg-indigo-100/70"
                              >
                                <Building2 className="w-3.5 h-3.5 mr-1 text-indigo-700" />
                                Ficha da Pessoa (Vínculo PJ)
                              </Button>
                            </Link>
                            <Link to="/financeiro?tab=comparativo">
                              <Button
                                size="sm"
                                className="h-8 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                              >
                                Comparativo de Custo
                              </Button>
                            </Link>
                          </>
                        ) : alerta.tipo?.includes('pj') ? (
                          <Link
                            to={
                              alerta.expand?.prestador?.id
                                ? `/pessoas/${alerta.expand.prestador.id}`
                                : '/pessoas'
                            }
                          >
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-medium border-amber-200 text-amber-800 hover:bg-amber-50"
                            >
                              <Building2 className="w-3.5 h-3.5 mr-1 text-amber-600" />
                              Ver Ficha da Pessoa
                            </Button>
                          </Link>
                        ) : alerta.tipo === 'aprovacao_vaga_gestor' && vaga ? (
                          <Link to={`/vagas/${vaga.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-medium border-emerald-200 text-emerald-800 hover:bg-emerald-50"
                            >
                              <Briefcase className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              Ver Vaga
                            </Button>
                          </Link>
                        ) : cand ? (
                          <Link to={`/candidatos/${cand.id}`}>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-medium border-slate-200 text-slate-700 hover:bg-slate-50"
                            >
                              <User className="w-3.5 h-3.5 mr-1 text-blue-600" />
                              Ver Perfil
                            </Button>
                          </Link>
                        ) : null}

                        {!alerta.tipo?.includes('pj') &&
                          alerta.tipo !== 'aprovacao_vaga_gestor' &&
                          alerta.tipo !== 'parecer_gestor_candidato' && (
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
                          )}

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
        </TabsContent>

        {/* ABA 3: E-MAILS DE STATUS AO CANDIDATO */}
        <TabsContent value="emails_status" className="space-y-6 mt-0">
          <CentralEmailsStatus />
        </TabsContent>

        {/* ABA 2: CENTRAL DE PREFERÊNCIAS DE ALERTA */}
        <TabsContent value="preferencias" className="space-y-6 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bloco 1: Configuração Global Padrão */}
            <Card className="p-6 border-slate-200 dark:border-[#2E3A6E] shadow-xs space-y-6 bg-white dark:bg-[#1A2240]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-blue-50 text-blue-700">
                    <Sliders className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Regra Padrão (Global)</h2>
                    <p className="text-xs text-slate-500">
                      Aplica-se a todas as vagas que não possuem regra específica customizada.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-700">
                    {globalAtivo ? 'Ativo' : 'Desativado'}
                  </span>
                  <Switch checked={globalAtivo} onCheckedChange={setGlobalAtivo} />
                </div>
              </div>

              {/* Limiar de Score Global */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <Label className="font-semibold text-slate-800">
                    Limiar Mínimo de Score de Aderência
                  </Label>
                  <span className="font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-sm border border-blue-200">
                    {globalLimiar}%
                  </span>
                </div>
                <Slider
                  value={[globalLimiar]}
                  onValueChange={(vals) => setGlobalLimiar(vals[0])}
                  min={50}
                  max={95}
                  step={5}
                  disabled={!globalAtivo}
                  className="py-2"
                />
                <p className="text-[11px] text-slate-500">
                  Apenas talentos do Banco com aderência igual ou superior a {globalLimiar}% gerarão
                  alertas e e-mails.
                </p>
              </div>

              {/* Destinatários de E-mail */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  Destinatários de Notificação por E-mail
                </Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="Adicionar e-mail (ex: lider@empresa.com)..."
                    value={novoEmailInput}
                    onChange={(e) => setNovoEmailInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        if (
                          novoEmailInput.trim() &&
                          !globalEmails.includes(novoEmailInput.trim())
                        ) {
                          setGlobalEmails([...globalEmails, novoEmailInput.trim()])
                          setNovoEmailInput('')
                        }
                      }
                    }}
                    className="text-xs h-9"
                    disabled={!globalAtivo}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!globalAtivo || !novoEmailInput.trim()}
                    onClick={() => {
                      if (novoEmailInput.trim() && !globalEmails.includes(novoEmailInput.trim())) {
                        setGlobalEmails([...globalEmails, novoEmailInput.trim()])
                        setNovoEmailInput('')
                      }
                    }}
                    className="text-xs h-9"
                  >
                    Adicionar
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {globalEmails.map((email, i) => (
                    <Badge
                      key={i}
                      variant="secondary"
                      className="text-[11px] bg-slate-100 text-slate-700 pl-2 pr-1 py-1 flex items-center gap-1 border border-slate-200"
                    >
                      <span>{email}</span>
                      <button
                        type="button"
                        onClick={() => setGlobalEmails(globalEmails.filter((_, idx) => idx !== i))}
                        className="text-slate-400 hover:text-rose-600 p-0.5 rounded-full"
                        disabled={!globalAtivo}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                  {globalEmails.length === 0 && (
                    <span className="text-[11px] text-slate-400 italic">
                      Nenhum e-mail adicional configurado (usará o usuário logado).
                    </span>
                  )}
                </div>
              </div>

              {/* Silenciar temporariamente */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                  <VolumeX className="w-3.5 h-3.5 text-amber-600" />
                  Silenciar Alertas Temporariamente
                </Label>
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[
                    { rotulo: 'Não silenciar', dias: 0 },
                    { rotulo: '1 dia', dias: 1 },
                    { rotulo: '3 dias', dias: 3 },
                    { rotulo: '7 dias', dias: 7 },
                  ].map((item) => (
                    <button
                      key={item.dias}
                      type="button"
                      onClick={() => setGlobalSilenciarDias(item.dias)}
                      className={`py-1.5 px-2 rounded-md font-semibold border transition-colors ${
                        globalSilenciarDias === item.dias
                          ? 'bg-amber-50 text-amber-900 border-amber-300'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                      disabled={!globalAtivo}
                    >
                      {item.rotulo}
                    </button>
                  ))}
                </div>
                {prefGlobal?.silenciar_ate && (
                  <p className="text-[11px] text-amber-800 font-medium bg-amber-50 p-2 rounded border border-amber-200">
                    Silenciado atualmente até{' '}
                    {new Date(prefGlobal.silenciar_ate).toLocaleDateString('pt-BR')} às{' '}
                    {new Date(prefGlobal.silenciar_ate).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  onClick={handleSalvarPrefGlobal}
                  disabled={salvandoPrefId === 'global'}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {salvandoPrefId === 'global' ? 'Salvando...' : 'Salvar Regra Global'}
                </Button>
              </div>
            </Card>

            {/* Bloco 2: Configuração Específica por Vaga */}
            <Card className="p-6 border-slate-200 dark:border-[#2E3A6E] shadow-xs space-y-6 bg-white dark:bg-[#1A2240]">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-purple-50 text-purple-700">
                    <Briefcase className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">
                      Regra Específica por Vaga
                    </h2>
                    <p className="text-xs text-slate-500">
                      Defina exigências de score e destinatários exclusivos por oportunidade.
                    </p>
                  </div>
                </div>

                {vagaSelecionadaPref && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">
                      {vagaAtivo ? 'Ativo' : 'Desativado'}
                    </span>
                    <Switch checked={vagaAtivo} onCheckedChange={setVagaAtivo} />
                  </div>
                )}
              </div>

              {/* Seletor da Vaga Alvo */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-800">
                  Selecione a Vaga para Configurar:
                </Label>
                <select
                  value={vagaSelecionadaPref}
                  onChange={(e) => handleSelecionarVagaPref(e.target.value)}
                  className="w-full text-xs h-9 px-3 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="">Escolha uma vaga...</option>
                  {vagas.map((v) => {
                    const temCustom = preferencias.some((p) => p.vaga === v.id)
                    return (
                      <option key={v.id} value={v.id}>
                        {v.titulo} ({v.departamento}) {temCustom ? '★ Regra Própria' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              {!vagaSelecionadaPref ? (
                <div className="py-12 text-center text-slate-400 text-xs space-y-2 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Briefcase className="w-8 h-8 text-slate-300 mx-auto" />
                  <p>Selecione uma vaga no menu acima para customizar seus alertas.</p>
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in duration-200">
                  {/* Limiar de Score da Vaga */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="font-semibold text-slate-800">
                        Limiar de Score para Esta Vaga
                      </Label>
                      <span className="font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-sm border border-purple-200">
                        {vagaLimiar}%
                      </span>
                    </div>
                    <Slider
                      value={[vagaLimiar]}
                      onValueChange={(vals) => setVagaLimiar(vals[0])}
                      min={50}
                      max={95}
                      step={5}
                      disabled={!vagaAtivo}
                      className="py-2"
                    />
                    <p className="text-[11px] text-slate-500">
                      Sobrescreve o limiar global de {globalLimiar}% exclusivamente para esta
                      oportunidade.
                    </p>
                  </div>

                  {/* Destinatários exclusivos da vaga */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-purple-600" />
                      Destinatários de E-mail para Esta Vaga (ex: Tech Lead / Gestor de Área)
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="Adicionar e-mail do gestor da vaga..."
                        value={novoEmailVagaInput}
                        onChange={(e) => setNovoEmailVagaInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            if (
                              novoEmailVagaInput.trim() &&
                              !vagaEmails.includes(novoEmailVagaInput.trim())
                            ) {
                              setVagaEmails([...vagaEmails, novoEmailVagaInput.trim()])
                              setNovoEmailVagaInput('')
                            }
                          }
                        }}
                        className="text-xs h-9"
                        disabled={!vagaAtivo}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={!vagaAtivo || !novoEmailVagaInput.trim()}
                        onClick={() => {
                          if (
                            novoEmailVagaInput.trim() &&
                            !vagaEmails.includes(novoEmailVagaInput.trim())
                          ) {
                            setVagaEmails([...vagaEmails, novoEmailVagaInput.trim()])
                            setNovoEmailVagaInput('')
                          }
                        }}
                        className="text-xs h-9"
                      >
                        Adicionar
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {vagaEmails.map((email, i) => (
                        <Badge
                          key={i}
                          variant="secondary"
                          className="text-[11px] bg-purple-50 text-purple-800 pl-2 pr-1 py-1 flex items-center gap-1 border border-purple-200"
                        >
                          <span>{email}</span>
                          <button
                            type="button"
                            onClick={() => setVagaEmails(vagaEmails.filter((_, idx) => idx !== i))}
                            className="text-purple-400 hover:text-rose-600 p-0.5 rounded-full"
                            disabled={!vagaAtivo}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                      {vagaEmails.length === 0 && (
                        <span className="text-[11px] text-slate-400 italic">
                          Nenhum e-mail específico (herdará os destinatários globais).
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Silenciar vaga */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                      <VolumeX className="w-3.5 h-3.5 text-amber-600" />
                      Silenciar Alertas Desta Vaga
                    </Label>
                    <div className="grid grid-cols-4 gap-2 text-xs">
                      {[
                        { rotulo: 'Não silenciar', dias: 0 },
                        { rotulo: '1 dia', dias: 1 },
                        { rotulo: '3 dias', dias: 3 },
                        { rotulo: '7 dias', dias: 7 },
                      ].map((item) => (
                        <button
                          key={item.dias}
                          type="button"
                          onClick={() => setVagaSilenciarDias(item.dias)}
                          className={`py-1.5 px-2 rounded-md font-semibold border transition-colors ${
                            vagaSilenciarDias === item.dias
                              ? 'bg-amber-50 text-amber-900 border-amber-300'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                          disabled={!vagaAtivo}
                        >
                          {item.rotulo}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button
                      onClick={handleSalvarPrefVaga}
                      disabled={salvandoPrefId === vagaSelecionadaPref}
                      className="bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs h-9"
                    >
                      <Save className="w-3.5 h-3.5 mr-1.5" />
                      {salvandoPrefId === vagaSelecionadaPref
                        ? 'Salvando...'
                        : 'Salvar Regra da Vaga'}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </TabsContent>
      </Tabs>

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
