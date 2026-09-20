import { useState, useEffect, useMemo } from 'react'
import {
  Heart,
  Star,
  Award,
  CheckCircle2,
  AlertTriangle,
  Send,
  Loader2,
  ExternalLink,
  Search,
  Filter,
  Copy,
  Mail,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  TrendingUp,
  MessageSquare,
  Sparkles,
  Gift,
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
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import type { RecordModel } from 'pocketbase'

interface MetricasExperiencia {
  kpis: {
    total_enviadas: number
    total_respondidas: number
    taxa_resposta: number
    nota_media_geral: number
    nps: number
    promotores: number
    neutros: number
    detratores: number
    alertas_oportunidade: number
  }
  dimensoes: {
    nome: string
    media: number
  }[]
  distribuicao: {
    '0-4': number
    '5-6': number
    '7-8': number
    '9-10': number
  }
}

export default function ExperienciaCandidato() {
  const { toast } = useToast()

  const [avaliacoes, setAvaliacoes] = useState<RecordModel[]>([])
  const [metricas, setMetricas] = useState<MetricasExperiencia | null>(null)
  const [vagas, setVagas] = useState<RecordModel[]>([])
  const [candidatos, setCandidatos] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [vagaFilter, setVagaFilter] = useState<string>('all')
  const [apenasAlertas, setApenasAlertas] = useState(false)

  // Modal de Disparo Manual de Pesquisa
  const [modalDisparoOpen, setModalDisparoOpen] = useState(false)
  const [disparoCandId, setDisparoCandId] = useState('')
  const [disparoVagaId, setDisparoVagaId] = useState('')
  const [disparoStatus, setDisparoStatus] = useState<'Contratado' | 'Recusado'>('Recusado')
  const [disparando, setDisparando] = useState(false)

  const carregarDados = async () => {
    try {
      const [listaAvals, vList, candList, resMetricas] = await Promise.all([
        pb.collection('avaliacoes_experiencia').getFullList({
          sort: '-created',
          expand: 'candidato,vaga',
        }),
        pb.collection('vagas').getFullList({ sort: '-created' }),
        pb.collection('candidatos').getFullList({
          filter: "status = 'Aprovado' || status = 'Recusado' || status = 'Proposta'",
          sort: '-created',
        }),
        fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/experiencia/metricas`, {
          headers: { Authorization: pb.authStore.token },
        }),
      ])

      setAvaliacoes(listaAvals)
      setVagas(vList)
      setCandidatos(candList)

      if (resMetricas.ok) {
        const m = await resMetricas.json()
        setMetricas(m)
      }
    } catch (err) {
      console.error('Falha ao carregar dados de experiência:', err)
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

  useRealtime('avaliacoes_experiencia', () => carregarDados())
  useRealtime('alertas', () => carregarDados())

  // Filtragem da Lista
  const avaliacoesFiltradas = useMemo(() => {
    return avaliacoes.filter((av) => {
      const cand = av.expand?.candidato
      const vaga = av.expand?.vaga

      if (statusFilter !== 'all' && av.status_processo !== statusFilter) return false
      if (vagaFilter !== 'all' && av.vaga !== vagaFilter) return false
      if (apenasAlertas && !av.alerta_oportunidade) return false

      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        cand?.nome?.toLowerCase().includes(q) ||
        cand?.email?.toLowerCase().includes(q) ||
        vaga?.titulo?.toLowerCase().includes(q) ||
        av.comentario?.toLowerCase().includes(q)
      )
    })
  }, [avaliacoes, statusFilter, vagaFilter, apenasAlertas, search])

  // Copiar link público da pesquisa
  const handleCopiarLinkPesquisa = (token: string) => {
    const url = `${window.location.origin}/experiencia/${token}`
    navigator.clipboard.writeText(url)
    toast({
      title: 'Link copiado!',
      description: 'O link da pesquisa foi copiado para a área de transferência.',
    })
  }

  const handleCopiarLinkIndicacao = (tokenPesquisa: string, tokenIndicador?: string) => {
    const token = tokenIndicador || 'ind-' + tokenPesquisa.replace(/^exp-/, '')
    const url = `${window.location.origin}/indicar/${token}`
    navigator.clipboard.writeText(url)
    toast({
      title: 'Link de indicação copiado!',
      description: 'Envie este link para o promotor indicar novos talentos diretamente.',
    })
  }
  // Disparo manual de pesquisa
  const handleDispararPesquisaManual = async () => {
    if (!disparoCandId || !disparoVagaId) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione o candidato e a vaga para gerar a pesquisa.',
        variant: 'destructive',
      })
      return
    }

    setDisparando(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/experiencia/gerar-pesquisa`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: pb.authStore.token,
          },
          body: JSON.stringify({
            candidatoId: disparoCandId,
            vagaId: disparoVagaId,
            statusProcesso: disparoStatus,
          }),
        },
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao gerar pesquisa')

      toast({
        title: data.jaExistia ? 'Pesquisa já existente' : 'Pesquisa gerada com sucesso!',
        description: data.emailEnviado
          ? 'Convite enviado automaticamente ao e-mail do candidato.'
          : 'Link gerado e disponível na listagem.',
      })

      setModalDisparoOpen(false)
      setDisparoCandId('')
      setDisparoVagaId('')
      await carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro no disparo',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setDisparando(false)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Experiência do Candidato (Candidate Experience)
            </h2>
            <Badge
              variant="outline"
              className="text-[11px] font-bold bg-blue-50 text-blue-700 border-blue-200"
            >
              NPS & Satisfação
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Meça o nível de acolhimento, agilidade e respeito percebido por contratados e reprovados
            em todos os processos seletivos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setModalDisparoOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-10 shadow-xs"
          >
            <Send className="w-3.5 h-3.5 mr-1.5" />
            Enviar Nova Pesquisa
          </Button>
        </div>
      </div>

      {/* Grid de KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Nota Média Geral</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {metricas?.kpis?.nota_media_geral ?? '—'}
                <span className="text-xs text-slate-400 font-normal">/10</span>
              </h3>
              <p className="text-[11px] text-blue-600 font-medium mt-0.5">Satisfação agregada</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">NPS do Processo</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {metricas ? `${metricas.kpis.nps > 0 ? '+' : ''}${metricas.kpis.nps}` : '—'}
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                {metricas?.kpis.promotores || 0} promotores
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <Heart className="w-5 h-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Taxa de Resposta</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {metricas?.kpis?.taxa_resposta ?? '—'}%
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                {metricas?.kpis?.total_respondidas || 0} de {metricas?.kpis?.total_enviadas || 0}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Respondidas</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {metricas?.kpis?.total_respondidas ?? 0}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Feedbacks gravados</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card
          className={`border-slate-200 shadow-xs cursor-pointer transition-all ${
            (metricas?.kpis?.alertas_oportunidade || 0) > 0
              ? 'bg-rose-50/70 border-rose-300 ring-1 ring-rose-300'
              : 'bg-white'
          }`}
          onClick={() => setApenasAlertas((prev) => !prev)}
          title="Clique para filtrar apenas avaliações com alerta"
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-rose-700">Alertas Críticos</p>
              <h3 className="text-2xl font-black text-rose-800 mt-1">
                {metricas?.kpis?.alertas_oportunidade ?? 0}
              </h3>
              <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                {apenasAlertas ? 'Filtro ativado (clique)' : 'Nota ≤ 6 ou detrator'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dimensões & Distribuição */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Médias por Dimensão (7 colunas) */}
        <Card className="lg:col-span-7 border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Desempenho por Dimensão Avaliada
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Médias ponderadas dos atributos de experiência de 0 a 10.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            {metricas?.dimensoes?.map((dim) => {
              const perc = (dim.media / 10) * 100
              const isCritico = dim.media <= 6

              return (
                <div key={dim.nome} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{dim.nome}</span>
                    <span
                      className={`font-black tabular-nums ${
                        isCritico ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {dim.media} / 10
                    </span>
                  </div>
                  <Progress
                    value={perc}
                    className={`h-2 ${isCritico ? '[&>div]:bg-rose-500' : '[&>div]:bg-blue-600'}`}
                  />
                </div>
              )
            }) || <p className="text-xs text-slate-400 italic">Nenhum dado consolidado ainda.</p>}
          </CardContent>
        </Card>

        {/* Distribuição de Notas e Classificação NPS (5 colunas) */}
        <Card className="lg:col-span-5 border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              <CardTitle className="text-sm font-bold text-slate-900">
                Distribuição das Notas & NPS
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Proporção de promotores vs detratores.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-3.5">
            <div className="grid grid-cols-3 gap-2 text-center p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs">
              <div className="space-y-1">
                <span className="text-[11px] text-emerald-700 font-bold block">Promotores</span>
                <span className="text-lg font-black text-emerald-800">
                  {metricas?.kpis?.promotores || 0}
                </span>
                <span className="text-[10px] text-slate-400 block">Notas 9-10</span>
              </div>
              <div className="space-y-1 border-x border-slate-200">
                <span className="text-[11px] text-amber-700 font-bold block">Neutros</span>
                <span className="text-lg font-black text-amber-800">
                  {metricas?.kpis?.neutros || 0}
                </span>
                <span className="text-[10px] text-slate-400 block">Notas 7-8</span>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] text-rose-700 font-bold block">Detratores</span>
                <span className="text-lg font-black text-rose-800">
                  {metricas?.kpis?.detratores || 0}
                </span>
                <span className="text-[10px] text-slate-400 block">Notas 0-6</span>
              </div>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>Excelentes (9-10)</span>
                <strong className="text-emerald-700">
                  {metricas?.distribuicao['9-10'] || 0} avaliações
                </strong>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Boas (7-8)</span>
                <strong className="text-blue-700">
                  {metricas?.distribuicao['7-8'] || 0} avaliações
                </strong>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Regulares (5-6)</span>
                <strong className="text-amber-700">
                  {metricas?.distribuicao['5-6'] || 0} avaliações
                </strong>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Críticas (0-4)</span>
                <strong className="text-rose-700">
                  {metricas?.distribuicao['0-4'] || 0} avaliações
                </strong>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listagem de Avaliações com Filtros */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Registro de Avaliações ({avaliacoesFiltradas.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Acompanhe o feedback individual, notas por dimensão e comentários detalhados.
              </CardDescription>
            </div>

            {apenasAlertas && (
              <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs font-bold">
                Mostrando apenas alertas prioritários
              </Badge>
            )}
          </div>

          {/* Barra de Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-1">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <Input
                placeholder="Buscar por candidato, vaga ou comentário..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                <SelectValue placeholder="Resultado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  Todos os resultados
                </SelectItem>
                <SelectItem value="Contratado" className="text-xs">
                  Aprovados / Contratados
                </SelectItem>
                <SelectItem value="Recusado" className="text-xs">
                  Reprovados / Recusados
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={vagaFilter} onValueChange={setVagaFilter}>
              <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                <SelectValue placeholder="Vaga" />
              </SelectTrigger>
              <SelectContent>
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

        <CardContent className="p-0 divide-y divide-slate-100">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              Carregando avaliações de experiência...
            </div>
          ) : avaliacoesFiltradas.length === 0 ? (
            <div className="p-10 text-center">
              <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">Nenhuma avaliação encontrada</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Tente ajustar os filtros ou dispare um convite de pesquisa.
              </p>
            </div>
          ) : (
            avaliacoesFiltradas.map((av) => {
              const cand = av.expand?.candidato
              const vaga = av.expand?.vaga
              const respondido = av.respondido
              const isAlerta = av.alerta_oportunidade
              const isPromotor = (av.nps_score ?? 0) >= 9 || (av.nota_geral ?? 0) >= 9

              return (
                <div
                  key={av.id}
                  className={`p-4 sm:p-5 transition-all ${
                    isAlerta ? 'bg-rose-50/40 border-l-4 border-l-rose-500' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xs font-bold text-slate-900">
                          {cand?.nome || 'Candidato'}
                        </h4>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            av.status_processo === 'Contratado'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {av.status_processo === 'Contratado' ? 'Contratado' : 'Recusado'}
                        </Badge>

                        {isAlerta && (
                          <Badge className="bg-rose-600 text-white border-0 text-[10px] font-bold">
                            Alerta de Oportunidade
                          </Badge>
                        )}

                        {respondido && (av.nps_score >= 9 || av.nota_geral >= 9) && (
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px] font-bold"
                            >
                              ⭐ Promotor
                            </Badge>
                            <Badge
                              variant="outline"
                              className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-semibold"
                            >
                              🎁 Pode Indicar
                            </Badge>
                          </div>
                        )}

                        {!respondido && (
                          <Badge
                            variant="outline"
                            className="bg-amber-50 text-amber-800 border-amber-300 text-[10px]"
                          >
                            Pendente de Resposta
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 font-medium">
                        {vaga?.titulo || 'Posição'} · {vaga?.departamento || 'Empresa'}
                      </p>

                      <p className="text-[11px] text-slate-400">
                        {respondido && av.data_resposta ? (
                          <>
                            Respondido em{' '}
                            {new Date(av.data_resposta).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </>
                        ) : (
                          <>Enviado em {new Date(av.created).toLocaleDateString('pt-BR')}</>
                        )}
                      </p>
                    </div>

                    {/* Ações e Notas */}
                    <div className="flex items-center gap-2 shrink-0">
                      {respondido && isPromotor && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleCopiarLinkIndicacao(
                              av.token_pesquisa,
                              (av as any).token_indicador,
                            )
                          }
                          className="text-xs h-8 bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100 font-semibold"
                          title="Copiar link exclusivo para este candidato indicar talentos"
                        >
                          <Gift className="w-3.5 h-3.5 mr-1 text-purple-600" />
                          Link de Indicação
                        </Button>
                      )}

                      {respondido ? (
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-2 rounded-lg">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-400 block font-medium">
                              Nota Geral
                            </span>
                            <span
                              className={`text-sm font-black ${
                                isAlerta ? 'text-rose-600' : 'text-slate-900'
                              }`}
                            >
                              {av.nota_geral ?? '—'}/10
                            </span>
                          </div>
                          <div className="text-right pl-2 border-l border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-medium">
                              NPS
                            </span>
                            <span
                              className={`text-sm font-black ${
                                (av.nps_score ?? 0) <= 6
                                  ? 'text-rose-600'
                                  : (av.nps_score ?? 0) >= 9
                                    ? 'text-emerald-600'
                                    : 'text-amber-600'
                              }`}
                            >
                              {av.nps_score ?? '—'}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCopiarLinkPesquisa(av.token_pesquisa)}
                            className="text-xs h-8 bg-white border-slate-200 text-slate-700 hover:text-blue-600"
                          >
                            <Copy className="w-3.5 h-3.5 mr-1" />
                            Copiar Link
                          </Button>
                          <a
                            href={`/experiencia/${av.token_pesquisa}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center text-xs h-8 px-2.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium"
                          >
                            <ExternalLink className="w-3.5 h-3.5 mr-1 text-slate-400" />
                            Abrir
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Detalhamento das Dimensões e Comentário */}
                  {respondido && (
                    <div className="mt-3 pt-3 border-t border-slate-100 space-y-2.5">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600">
                        <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 block text-[10px]">Clareza Processo</span>
                          <strong>{av.clareza_processo ?? '—'}/10</strong>
                        </div>
                        <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 block text-[10px]">Tempo Resposta</span>
                          <strong
                            className={
                              (av.tempo_resposta ?? 10) <= 5 ? 'text-rose-600 font-bold' : ''
                            }
                          >
                            {av.tempo_resposta ?? '—'}/10
                          </strong>
                        </div>
                        <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 block text-[10px]">Tratamento RH</span>
                          <strong>{av.tratamento_rh ?? '—'}/10</strong>
                        </div>
                        <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 block text-[10px]">Alinhamento Vaga</span>
                          <strong>{av.clareza_vaga ?? '—'}/10</strong>
                        </div>
                      </div>

                      {av.recomendaria_empresa && (
                        <div className="text-[11px] text-slate-600 flex items-center gap-1.5">
                          <span className="text-slate-400">Recomendaria a empresa:</span>
                          <span className="font-semibold text-slate-800">
                            {av.recomendaria_empresa}
                          </span>
                        </div>
                      )}

                      {av.comentario && (
                        <div
                          className={`p-3 rounded-lg text-xs leading-relaxed ${
                            isAlerta
                              ? 'bg-rose-100/60 border border-rose-200 text-rose-950 font-medium'
                              : 'bg-slate-50 border border-slate-200/80 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 mb-1">
                            <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                            Comentário do Candidato:
                          </div>
                          "{av.comentario}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Modal Disparar Pesquisa Manual */}
      <Dialog open={modalDisparoOpen} onOpenChange={setModalDisparoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Enviar Pesquisa de Candidate Experience
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Gere um link nominal de pesquisa para o candidato avaliar o processo seletivo
              concluído.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Candidato *</Label>
              <Select value={disparoCandId} onValueChange={setDisparoCandId}>
                <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Selecione o candidato..." />
                </SelectTrigger>
                <SelectContent>
                  {candidatos.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.nome} ({c.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Vaga Associada *</Label>
              <Select value={disparoVagaId} onValueChange={setDisparoVagaId}>
                <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Selecione a vaga..." />
                </SelectTrigger>
                <SelectContent>
                  {vagas.map((v) => (
                    <SelectItem key={v.id} value={v.id} className="text-xs">
                      {v.titulo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Status no Encerramento</Label>
              <Select
                value={disparoStatus}
                onValueChange={(val) => setDisparoStatus(val as 'Contratado' | 'Recusado')}
              >
                <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Recusado" className="text-xs">
                    Recusado / Não Selecionado
                  </SelectItem>
                  <SelectItem value="Contratado" className="text-xs">
                    Contratado / Aprovado
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 leading-relaxed">
              <strong>Envio sem spam:</strong> Se o candidato possuir e-mail cadastrado, um convite
              cordial será disparado automaticamente com registro no log de auditoria.
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setModalDisparoOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              onClick={handleDispararPesquisaManual}
              disabled={disparando || !disparoCandId || !disparoVagaId}
            >
              {disparando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Gerando...
                </>
              ) : (
                'Gerar & Enviar Pesquisa'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
