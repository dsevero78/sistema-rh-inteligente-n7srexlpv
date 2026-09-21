import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Sparkles,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Filter,
  Search,
  ExternalLink,
  Copy,
  Gift,
  Award,
  Loader2,
  Mail,
  Linkedin,
  Phone,
  FileText,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  Building2,
  Eye,
  MessageSquare,
  Trophy,
  Crown,
  Medal,
  Flame,
  Star,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import type { RecordModel } from 'pocketbase'

interface MetricasIndicacao {
  total_recebidas: number
  novas: number
  em_avaliacao: number
  convertidas: number
  recusadas: number
  taxa_conversao: number
  indicadores_ativos: number
  promotores_elegiveis: number
  pendentes_contato: number
}

interface ItemRankingIndicador {
  id: string
  nome: string
  email: string
  cargo: string
  totalIndicacoes: number
  totalConvertidas: number
  totalEmAvaliacao: number
  pontos: number
  taxaConversao: number
  token?: string
}

export default function Indicacoes() {
  const { toast } = useToast()
  const navigate = useNavigate()

  const [indicacoes, setIndicacoes] = useState<RecordModel[]>([])
  const [metricas, setMetricas] = useState<MetricasIndicacao | null>(null)
  const [vagas, setVagas] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [vagaFilter, setVagaFilter] = useState<string>('all')

  // Modal de Detalhes da Indicação
  const [detalheItem, setDetalheItem] = useState<RecordModel | null>(null)

  // Modal de Conversão ("Aceitar e criar candidatura")
  const [converterItem, setConverterItem] = useState<RecordModel | null>(null)
  const [convertendo, setConvertendo] = useState(false)

  // Modal de Recusa
  const [recusarItem, setRecusarItem] = useState<RecordModel | null>(null)
  const [motivoRecusa, setMotivoRecusa] = useState(
    'Perfil com pretensão ou experiência fora dos requisitos imediatos da vaga',
  )
  const [recusando, setRecusando] = useState(false)

  const carregarDados = async () => {
    try {
      const [indList, vList, resMetricas] = await Promise.all([
        pb.collection('indicacoes').getFullList({
          sort: '-created',
          expand: 'indicador,vaga,candidato_gerado',
        }),
        pb.collection('vagas').getFullList({ sort: '-created' }),
        fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/indicacoes/metricas`, {
          headers: { Authorization: pb.authStore.token },
        }),
      ])

      setIndicacoes(indList)
      setVagas(vList)

      if (resMetricas.ok) {
        const m = await resMetricas.json()
        setMetricas(m.kpis)
      }
    } catch (err) {
      console.error('Falha ao carregar dados do Programa de Indicação:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Tente recarregar a tela.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  useRealtime('indicacoes', () => carregarDados())
  useRealtime('candidatos', () => carregarDados())
  useRealtime('pipeline', () => carregarDados())

  // Ranking de Indicadores (Frente 3)
  // Pontuação: +30 pontos por indicação convertida/contratada, +10 pontos por indicação em avaliação, +5 pontos por indicação nova
  const rankingIndicadores = useMemo<ItemRankingIndicador[]>(() => {
    const mapa = new Map<
      string,
      {
        id: string
        nome: string
        email: string
        cargo: string
        totalIndicacoes: number
        totalConvertidas: number
        totalEmAvaliacao: number
        token?: string
      }
    >()

    indicacoes.forEach((ind) => {
      const indId = ind.indicador || ind.token_indicador || 'anon'
      const cand = ind.expand?.indicador
      const nome = cand?.nome || ind.indicado_nome_indicador || 'Colaborador / Promotor'
      const email = cand?.email || ''
      const cargo = cand?.cargo_atual || 'Promotor de Talentos'
      const token = ind.token_indicador

      if (!mapa.has(indId)) {
        mapa.set(indId, {
          id: indId,
          nome,
          email,
          cargo,
          totalIndicacoes: 0,
          totalConvertidas: 0,
          totalEmAvaliacao: 0,
          token,
        })
      }

      const item = mapa.get(indId)!
      item.totalIndicacoes += 1
      if (ind.status === 'Convertida') {
        item.totalConvertidas += 1
      } else if (ind.status === 'Em avaliação') {
        item.totalEmAvaliacao += 1
      }
      if (!item.token && token) {
        item.token = token
      }
    })

    const lista = Array.from(mapa.values()).map((item) => {
      // 30 pontos por convertida, 10 por em avaliação, 5 por nova/outras
      const pontos =
        item.totalConvertidas * 30 +
        item.totalEmAvaliacao * 10 +
        (item.totalIndicacoes - item.totalConvertidas - item.totalEmAvaliacao) * 5
      const taxaConversao =
        item.totalIndicacoes > 0
          ? Math.round((item.totalConvertidas / item.totalIndicacoes) * 100)
          : 0

      return {
        ...item,
        pontos,
        taxaConversao,
      }
    })

    // Ordenar por pontuação decrescente (e desempate por conversões e total de indicações)
    return lista.sort((a, b) => {
      if (b.pontos !== a.pontos) return b.pontos - a.pontos
      if (b.totalConvertidas !== a.totalConvertidas) return b.totalConvertidas - a.totalConvertidas
      return b.totalIndicacoes - a.totalIndicacoes
    })
  }, [indicacoes])

  // Filtragem da Lista
  const indicacoesFiltradas = useMemo(() => {
    return indicacoes.filter((ind) => {
      const vaga = ind.expand?.vaga
      const indicador = ind.expand?.indicador

      if (statusFilter !== 'all' && ind.status !== statusFilter) return false
      if (vagaFilter !== 'all' && ind.vaga !== vagaFilter) return false

      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        ind.indicado_nome?.toLowerCase().includes(q) ||
        ind.indicado_email?.toLowerCase().includes(q) ||
        indicador?.nome?.toLowerCase().includes(q) ||
        vaga?.titulo?.toLowerCase().includes(q) ||
        ind.mensagem_indicador?.toLowerCase().includes(q)
      )
    })
  }, [indicacoes, statusFilter, vagaFilter, search])

  // Copiar link público de indicação do indicador
  const handleCopiarLinkIndicador = (token: string) => {
    const url = `${window.location.origin}/indicar/${token}`
    navigator.clipboard.writeText(url)
    toast({
      title: 'Link copiado!',
      description: 'O link exclusivo do indicador foi copiado para a área de transferência.',
    })
  }

  // Ação de Conversão
  const handleConfirmarConversao = async () => {
    if (!converterItem) return

    setConvertendo(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/indicacoes/${converterItem.id}/converter`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: pb.authStore.token,
          },
        },
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao converter indicação.')

      toast({
        title: 'Indicação convertida!',
        description:
          'O talento foi inserido no pipeline em Triagem com origem "Indicação". Notificações enviadas.',
      })

      setConverterItem(null)
      await carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro na conversão',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setConvertendo(false)
    }
  }

  // Ação de Recusa
  const handleConfirmarRecusa = async () => {
    if (!recusarItem) return

    setRecusando(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/indicacoes/${recusarItem.id}/recusar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: pb.authStore.token,
          },
          body: JSON.stringify({ motivo: motivoRecusa }),
        },
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Falha ao recusar indicação.')

      toast({
        title: 'Indicação arquivada',
        description: 'Status atualizado para Recusada.',
      })

      setRecusarItem(null)
      await carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao recusar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setRecusando(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 dark:text-[#F7F8FB] tracking-tight">
              Programa de Indicação de Talentos
            </h2>
            <Badge
              variant="outline"
              className="text-[11px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800"
            >
              Candidatos & Colaboradores Promotores
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Transforme talentos encantados com a SouYess em embaixadores ativos, acompanhe o ranking
            de indicações e premie o engajamento.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/experiencia">
            <Button
              variant="outline"
              className="text-xs h-9 border-slate-200 dark:border-[#2E3A6E] text-slate-700 dark:text-slate-300 hover:text-[#E9530E] dark:hover:text-[#FF7733] font-semibold"
            >
              Ver Promotores na Experiência
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>
      {/* Grid de 4 KPIs Estratégicos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Indicações Recebidas
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-[#F7F8FB] font-mono tabular-nums mt-1">
                {metricas?.total_recebidas ?? indicacoes.length}
              </h3>
              <p className="text-[11px] text-[#E9530E] font-medium mt-0.5">
                {metricas?.novas || 0} novas aguardando contato
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-[#E9530E] flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Taxa de Conversão
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-[#F7F8FB] font-mono tabular-nums mt-1">
                {metricas?.taxa_conversao ??
                  (rankingIndicadores.length > 0
                    ? Math.round(
                        (rankingIndicadores.reduce((acc, cur) => acc + cur.totalConvertidas, 0) /
                          (indicacoes.length || 1)) *
                          100,
                      )
                    : 0)}
                %
              </h3>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                {metricas?.convertidas ??
                  rankingIndicadores.reduce((acc, cur) => acc + cur.totalConvertidas, 0)}{' '}
                aceitas no pipeline
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Indicadores Ativos
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-[#F7F8FB] font-mono tabular-nums mt-1">
                {rankingIndicadores.length}
              </h3>
              <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">
                engajados no programa
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Pendentes de Contato
              </p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-[#F7F8FB] font-mono tabular-nums mt-1">
                {metricas?.pendentes_contato ??
                  indicacoes.filter((i) => i.status === 'Nova').length}
              </h3>
              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-medium mt-0.5">
                Triagem prioritária
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>
      {/* FRENTE 3: RANKING DE INDICADORES (PÓDIO + TABELA DETALHADA) */}
      <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240] overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#2E3A6E] bg-slate-50/50 dark:bg-[#11162B]/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#E9530E] to-[#FF7733] text-white flex items-center justify-center shadow-sm">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-bold text-slate-900 dark:text-[#F7F8FB]">
                    Ranking Geral de Indicadores
                  </CardTitle>
                  <Badge className="bg-[#E9530E]/10 dark:bg-[#E9530E]/20 text-[#E9530E] border-[#E9530E]/30 text-[10px] font-bold">
                    Gamificação SouYess
                  </Badge>
                </div>
                <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                  Pontuação ponderada:{' '}
                  <strong className="text-emerald-600 dark:text-emerald-400">+30 pts</strong> por
                  contratação convertida,{' '}
                  <strong className="text-blue-600 dark:text-blue-400">+10 pts</strong> em avaliação
                  e <strong className="text-slate-600 dark:text-slate-300">+5 pts</strong> por
                  indicação recebida.
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2 self-start sm:self-auto">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-[#E9530E]" />
                Top Performers
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* PÓDIO 1º, 2º e 3º LUGAR */}
          {rankingIndicadores.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* 2º LUGAR (Prata) */}
              {rankingIndicadores[1] && (
                <div className="relative rounded-2xl p-4.5 bg-gradient-to-b from-slate-50 to-white dark:from-[#151B33] dark:to-[#1A2240] border border-slate-200 dark:border-[#2E3A6E] shadow-2xs flex flex-col justify-between order-2 md:order-1 transition-all hover:border-slate-400 dark:hover:border-slate-500">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold flex items-center justify-center text-sm shadow-inner">
                        {rankingIndicadores[1].nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-[#F7F8FB] line-clamp-1">
                          {rankingIndicadores[1].nome}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {rankingIndicadores[1].cargo}
                        </p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                        2º
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#2E3A6E] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Convertidas
                      </span>
                      <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {rankingIndicadores[1].totalConvertidas} de{' '}
                        {rankingIndicadores[1].totalIndicacoes}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Pontuação
                      </span>
                      <span className="font-mono tabular-nums font-black text-slate-900 dark:text-[#F7F8FB] text-base">
                        {rankingIndicadores[1].pontos} pts
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 1º LUGAR (Ouro - Destaque Central) */}
              {rankingIndicadores[0] && (
                <div className="relative rounded-2xl p-5 bg-gradient-to-b from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/20 dark:via-[#1A2240] dark:to-[#11162B] border-2 border-amber-400/80 dark:border-amber-500/60 shadow-md flex flex-col justify-between order-1 md:order-2 transition-all scale-[1.02]">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 shadow-sm">
                    <Crown className="w-3 h-3" />
                    Líder do Programa
                  </div>

                  <div className="flex items-start justify-between pt-1">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-black flex items-center justify-center text-base shadow-md">
                        {rankingIndicadores[0].nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-base font-extrabold text-slate-900 dark:text-[#F7F8FB] line-clamp-1">
                          {rankingIndicadores[0].nome}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                          {rankingIndicadores[0].cargo}
                        </p>
                      </div>
                    </div>
                    <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950/60 border border-amber-400 dark:border-amber-600 flex items-center justify-center shrink-0">
                      <Medal className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-amber-200/60 dark:border-amber-500/30 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-bold block">
                        Taxa de Conversão
                      </span>
                      <span className="font-mono tabular-nums font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
                        {rankingIndicadores[0].taxaConversao}% (
                        {rankingIndicadores[0].totalConvertidas} contratações)
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 uppercase font-bold block">
                        Pontuação Total
                      </span>
                      <span className="font-mono tabular-nums font-black text-[#E9530E] dark:text-[#FF7733] text-xl">
                        {rankingIndicadores[0].pontos} pts
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 3º LUGAR (Bronze) */}
              {rankingIndicadores[2] && (
                <div className="relative rounded-2xl p-4.5 bg-gradient-to-b from-orange-50/50 to-white dark:from-[#151B33] dark:to-[#1A2240] border border-amber-700/20 dark:border-amber-800/40 shadow-2xs flex flex-col justify-between order-3 transition-all hover:border-amber-600/40">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 font-bold flex items-center justify-center text-sm shadow-inner">
                        {rankingIndicadores[2].nome.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-[#F7F8FB] line-clamp-1">
                          {rankingIndicadores[2].nome}
                        </h4>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                          {rankingIndicadores[2].cargo}
                        </p>
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 flex items-center justify-center shrink-0">
                      <span className="text-xs font-black text-amber-800 dark:text-amber-400">
                        3º
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#2E3A6E] flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Convertidas
                      </span>
                      <span className="font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {rankingIndicadores[2].totalConvertidas} de{' '}
                        {rankingIndicadores[2].totalIndicacoes}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                        Pontuação
                      </span>
                      <span className="font-mono tabular-nums font-black text-slate-900 dark:text-[#F7F8FB] text-base">
                        {rankingIndicadores[2].pontos} pts
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TABELA DE POSIÇÕES DETALHADAS */}
          <div className="rounded-xl border border-slate-200 dark:border-[#2E3A6E] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-[#11162B] text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-[#2E3A6E]">
                  <tr>
                    <th className="py-3 px-4 w-16 text-center">Pos.</th>
                    <th className="py-3 px-4">Indicador / Colaborador</th>
                    <th className="py-3 px-4 text-center">Total Indicações</th>
                    <th className="py-3 px-4 text-center">Convertidas</th>
                    <th className="py-3 px-4 text-center">Em Avaliação</th>
                    <th className="py-3 px-4 text-center">Conversão</th>
                    <th className="py-3 px-4 text-right">Pontos</th>
                    <th className="py-3 px-4 text-center w-28">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#2E3A6E] bg-white dark:bg-[#1A2240]">
                  {rankingIndicadores.map((item, index) => {
                    const isTop1 = index === 0
                    const isTop2 = index === 1
                    const isTop3 = index === 2

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-[#151B33]/80 ${
                          isTop1 ? 'bg-amber-50/20 dark:bg-amber-500/5' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center">
                          {isTop1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-slate-950 font-black text-xs shadow-xs">
                              1º
                            </span>
                          ) : isTop2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 text-slate-900 dark:text-slate-100 font-bold text-xs">
                              2º
                            </span>
                          ) : isTop3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/80 text-amber-100 font-bold text-xs">
                              3º
                            </span>
                          ) : (
                            <span className="font-mono tabular-nums text-slate-500 dark:text-slate-400 font-semibold text-xs">
                              {index + 1}º
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-[#11162B] border border-slate-200 dark:border-[#2E3A6E] text-slate-700 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                              {item.nome.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900 dark:text-[#F7F8FB] truncate">
                                  {item.nome}
                                </span>
                                {isTop1 && <Crown className="w-3 h-3 text-amber-500 shrink-0" />}
                              </div>
                              <span className="text-[11px] text-slate-400 dark:text-slate-500 block truncate">
                                {item.cargo}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono tabular-nums text-slate-800 dark:text-slate-200 font-bold">
                          {item.totalIndicacoes}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono tabular-nums font-bold text-emerald-600 dark:text-emerald-400">
                          {item.totalConvertidas}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono tabular-nums text-blue-600 dark:text-blue-400 font-medium">
                          {item.totalEmAvaliacao}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <Badge
                            variant="outline"
                            className="font-mono tabular-nums text-[10px] font-bold border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40"
                          >
                            {item.taxaConversao}%
                          </Badge>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono tabular-nums font-black text-slate-900 dark:text-[#F7F8FB] text-sm">
                          {item.pontos}{' '}
                          <span className="text-[10px] font-normal text-slate-400">pts</span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {item.token ? (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleCopiarLinkIndicador(item.token!)}
                              className="h-7 px-2 text-[11px] text-[#E9530E] hover:text-[#FF7733] hover:bg-orange-50 dark:hover:bg-orange-950/30 font-medium"
                              title="Copiar link de indicação do colaborador"
                            >
                              <Copy className="w-3 h-3 mr-1" />
                              Link
                            </Button>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>
      {/* Tabela de Indicações com Filtros */}
      <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240]">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 dark:border-[#2E3A6E] space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900 dark:text-[#F7F8FB]">
                Talentos Indicados ({indicacoesFiltradas.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
                Histórico de indicações, indicador de origem, justificativa e ações de conversão no
                pipeline.
              </CardDescription>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Buscar por indicado, indicador ou justificativa..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-slate-900 dark:text-[#F7F8FB]"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-slate-900 dark:text-[#F7F8FB]">
                <SelectValue placeholder="Status da indicação" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E]">
                <SelectItem value="all" className="text-xs">
                  Todos os status
                </SelectItem>
                <SelectItem value="Nova" className="text-xs">
                  Nova (Pendente)
                </SelectItem>
                <SelectItem value="Em avaliação" className="text-xs">
                  Em avaliação
                </SelectItem>
                <SelectItem value="Convertida" className="text-xs">
                  Convertida (no Pipeline)
                </SelectItem>
                <SelectItem value="Recusada" className="text-xs">
                  Recusada
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={vagaFilter} onValueChange={setVagaFilter}>
              <SelectTrigger className="h-9 text-xs bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-slate-900 dark:text-[#F7F8FB]">
                <SelectValue placeholder="Vaga indicada" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E]">
                <SelectItem value="all" className="text-xs">
                  Todas as vagas
                </SelectItem>
                {vagas.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">
                    {v.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent className="p-0 divide-y divide-slate-100 dark:divide-[#2E3A6E]">
          {' '}
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              Carregando indicações...
            </div>
          ) : indicacoesFiltradas.length === 0 ? (
            <div className="p-10 text-center">
              <Gift className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">Nenhuma indicação encontrada</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tente ajustar os filtros de busca ou convide mais candidatos promotores a indicar.
              </p>
            </div>
          ) : (
            indicacoesFiltradas.map((ind) => {
              const indicador = ind.expand?.indicador
              const vaga = ind.expand?.vaga
              const candGerado = ind.expand?.candidato_gerado
              const isConvertida = ind.status === 'Convertida'
              const isRecusada = ind.status === 'Recusada'
              const isNova = ind.status === 'Nova'

              return (
                <div
                  key={ind.id}
                  className={`p-4 sm:p-5 transition-all ${
                    isNova
                      ? 'bg-blue-50/20 dark:bg-blue-950/20'
                      : 'hover:bg-slate-50/50 dark:hover:bg-[#151B33]/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-[#F7F8FB]">
                          {ind.indicado_nome}
                        </h4>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            isConvertida
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                              : isRecusada
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700'
                          }`}
                        >
                          {ind.status}
                        </Badge>

                        {isNova && (
                          <span className="w-2 h-2 rounded-full bg-[#E9530E] animate-pulse" />
                        )}
                      </div>

                      {/* Vaga e Indicador */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-medium text-slate-900 dark:text-[#F7F8FB]">
                          Vaga: {vaga?.titulo || 'Oportunidade'}
                        </span>
                        <span className="text-slate-300 dark:text-slate-600">·</span>
                        <div className="inline-flex items-center gap-1.5 text-purple-700 dark:text-purple-300 font-semibold">
                          <span>Indicado por:</span>
                          <span className="underline decoration-purple-300">
                            {indicador?.nome || ind.indicado_nome_indicador || 'Promotor NPS'}
                          </span>
                        </div>
                      </div>

                      {/* Contatos */}
                      <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3 text-slate-400" />
                          {ind.indicado_email}
                        </span>
                        {ind.indicado_telefone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {ind.indicado_telefone}
                          </span>
                        )}
                        {ind.indicado_linkedin && (
                          <a
                            href={ind.indicado_linkedin}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                          >
                            <Linkedin className="w-3 h-3" />
                            LinkedIn
                          </a>
                        )}
                        <span>
                          Recebida em{' '}
                          {new Date(ind.created).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Ações do RH */}
                    <div className="flex items-center gap-2 shrink-0 pt-1 sm:pt-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDetalheItem(ind)}
                        className="text-xs h-8 bg-white border-slate-200 text-slate-700 hover:text-blue-600 font-medium"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Ver Detalhes
                      </Button>

                      {!isConvertida && !isRecusada && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => setConverterItem(ind)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 font-semibold shadow-2xs"
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1.5" />
                            Aceitar no Funil
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setRecusarItem(ind)
                              setMotivoRecusa(
                                'Perfil com pretensão ou experiência fora dos requisitos imediatos da vaga',
                              )
                            }}
                            className="text-rose-600 hover:bg-rose-50 border-rose-200 text-xs h-8 font-medium"
                          >
                            Recusar
                          </Button>
                        </>
                      )}

                      {isConvertida && candGerado && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/candidatos/${candGerado.id}`)}
                          className="bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 text-xs h-8 font-semibold"
                        >
                          Ver no Pipeline →
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Justificativa do Indicador */}
                  {ind.mensagem_indicador && (
                    <div className="mt-3 p-3 rounded-lg bg-slate-50 dark:bg-[#11162B] border border-slate-200/80 dark:border-[#2E3A6E] text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <div className="flex items-center justify-between font-bold text-slate-600 dark:text-slate-300 text-[11px] mb-1">
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                          Recomendação de {indicador?.nome || 'Indicador'}:
                        </span>
                        <button
                          onClick={() => handleCopiarLinkIndicador(ind.token_indicador)}
                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-normal"
                          title="Copiar link do indicador para compartilhar novamente"
                        >
                          <Copy className="w-3 h-3" />
                          Copiar Link do Indicador
                        </button>
                      </div>
                      "{ind.mensagem_indicador}"
                    </div>
                  )}

                  {/* Motivo de Recusa (se houver) */}
                  {isRecusada && ind.motivo_recusa && (
                    <div className="mt-2 text-xs text-rose-700 dark:text-rose-300 font-medium flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-200 dark:border-rose-800">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Motivo da recusa: {ind.motivo_recusa}</span>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>
      {/* Modal 1: Detalhes da Indicação */}
      <Dialog open={!!detalheItem} onOpenChange={(open) => !open && setDetalheItem(null)}>
        <DialogContent className="sm:max-w-lg bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-[#F7F8FB]">
              Detalhes da Indicação de Talento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Informações completas do indicado, indicador de origem e histórico de consentimento.
            </DialogDescription>
          </DialogHeader>

          {detalheItem && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-[#11162B] rounded-lg border border-slate-200 dark:border-[#2E3A6E]">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Indicado</span>
                  <strong className="text-slate-900 dark:text-[#F7F8FB] text-sm block">
                    {detalheItem.indicado_nome}
                  </strong>
                  <span className="text-slate-500 dark:text-slate-400">
                    {detalheItem.indicado_email}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Vaga Alvo</span>
                  <strong className="text-slate-900 dark:text-[#F7F8FB] block">
                    {detalheItem.expand?.vaga?.titulo || 'Vaga'}
                  </strong>
                  <span className="text-slate-500 dark:text-slate-400">
                    Status:{' '}
                    <strong className="text-blue-700 dark:text-blue-400 font-semibold">
                      {detalheItem.status}
                    </strong>
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-semibold mb-1">
                  Indicador (Promotor de Marca Empregadora)
                </span>
                <div className="p-2.5 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/30 flex items-center justify-between">
                  <div>
                    <strong className="text-purple-950 dark:text-purple-200 font-bold block">
                      {detalheItem.expand?.indicador?.nome ||
                        detalheItem.indicado_nome_indicador ||
                        'Juliana Mendes'}
                    </strong>
                    <span className="text-[11px] text-purple-700 dark:text-purple-400">
                      {detalheItem.expand?.indicador?.email}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopiarLinkIndicador(detalheItem.token_indicador)}
                    className="text-xs h-7 bg-white dark:bg-[#1A2240] border-purple-200 dark:border-purple-700 text-purple-800 dark:text-purple-200"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copiar Link
                  </Button>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-semibold mb-1">
                  Justificativa / Carta de Recomendação
                </span>
                <p className="p-3 rounded-lg bg-slate-50 dark:bg-[#11162B] border border-slate-200 dark:border-[#2E3A6E] text-slate-700 dark:text-slate-300 leading-relaxed italic">
                  "{detalheItem.mensagem_indicador || 'Sem justificativa informada.'}"
                </p>
              </div>

              {detalheItem.curriculo && (
                <div className="p-2.5 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-semibold text-blue-950 dark:text-blue-200">
                      Currículo Anexo em PDF
                    </span>
                  </div>
                  <a
                    href={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/indicacoes/${detalheItem.id}/${detalheItem.curriculo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs bg-white dark:bg-[#1A2240] text-blue-700 dark:text-blue-300 px-2.5 py-1 rounded border border-blue-200 dark:border-blue-700 font-bold hover:bg-blue-50 inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Baixar PDF
                  </a>
                </div>
              )}

              <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-[#11162B] text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                <div>
                  <strong>Conformidade LGPD:</strong> Consentimento registrado com IP{' '}
                  <code className="text-slate-700 dark:text-slate-300 font-mono">
                    {detalheItem.consentimento_lgpd_ip || 'Auditado'}
                  </code>
                </div>
                <div>
                  <strong>Data de autorização:</strong>{' '}
                  {new Date(
                    detalheItem.consentimento_lgpd_data || detalheItem.created,
                  ).toLocaleString('pt-BR')}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDetalheItem(null)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal 2: Conversão ("Aceitar e criar candidatura") */}
      <Dialog open={!!converterItem} onOpenChange={(open) => !open && setConverterItem(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-[#F7F8FB]">
              Aceitar Indicação e Iniciar Seleção
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Esta ação converterá formalmente a indicação em um candidato ativo no Kanban em{' '}
              <strong>Triagem</strong> com canal "Indicação".
            </DialogDescription>
          </DialogHeader>

          {converterItem && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-950 dark:text-emerald-200 space-y-1">
                <p className="font-bold text-emerald-900 dark:text-emerald-300">
                  Candidato: {converterItem.indicado_nome}
                </p>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  Vaga: {converterItem.expand?.vaga?.titulo || 'Vaga Alvo'}
                </p>
              </div>

              <div className="space-y-1.5 text-slate-600 dark:text-slate-300 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Criação de registro em <strong>Candidatos</strong> com origem "Indicação".
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    Entrada no <strong>Pipeline</strong> na coluna <strong>Triagem</strong>.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    E-mail cordial ao <strong>indicado</strong> convidando para o processo.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>
                    E-mail ao <strong>indicador</strong> confirmando o aceite com pontuação no
                    ranking.
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-[#2E3A6E]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConverterItem(null)}
              disabled={convertendo}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              onClick={handleConfirmarConversao}
              disabled={convertendo}
            >
              {convertendo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Convertendo...
                </>
              ) : (
                'Confirmar e Converter'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modal 3: Recusar Indicação */}
      <Dialog open={!!recusarItem} onOpenChange={(open) => !open && setRecusarItem(null)}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-[#F7F8FB]">
              Recusar Indicação
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Informe a justificativa interna para o arquivamento da indicação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Motivo da recusa *
              </Label>
              <Textarea
                rows={3}
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                placeholder="Ex: Requisitos técnicos incompatíveis no momento ou vaga preenchida..."
                className="text-xs resize-none bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-slate-900 dark:text-[#F7F8FB]"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100 dark:border-[#2E3A6E]">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRecusarItem(null)}
              disabled={recusando}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleConfirmarRecusa}
              disabled={recusando}
            >
              {recusando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Recusando...
                </>
              ) : (
                'Confirmar Recusa'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>{' '}
    </div>
  )
}
