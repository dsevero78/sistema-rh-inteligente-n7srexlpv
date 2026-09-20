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
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Programa de Indicação de Talentos
            </h2>
            <Badge
              variant="outline"
              className="text-[11px] font-bold bg-purple-50 text-purple-700 border-purple-200"
            >
              Candidatos Promotores (NPS 9-10)
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Transforme candidatos encantados com nosso processo seletivo em embaixadores ativos da
            nossa marca empregadora.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/experiencia">
            <Button
              variant="outline"
              className="text-xs h-9 border-slate-200 text-slate-700 hover:text-blue-600 font-semibold"
            >
              Ver Promotores na Experiência
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid de 4 KPIs Estratégicos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Indicações Recebidas</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {metricas?.total_recebidas ?? indicacoes.length}
              </h3>
              <p className="text-[11px] text-blue-600 font-medium mt-0.5">
                {metricas?.novas || 0} novas aguardando contato
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Taxa de Conversão</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {metricas?.taxa_conversao ?? 0}%
              </h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">
                {metricas?.convertidas || 0} aceitas no pipeline
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Indicadores Ativos</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {metricas?.indicadores_ativos ?? 1}
              </h3>
              <p className="text-[11px] text-purple-600 font-medium mt-0.5">
                de {metricas?.promotores_elegiveis ?? 2} promotores elegíveis
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Pendentes de Contato</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">
                {metricas?.pendentes_contato ?? 0}
              </h3>
              <p className="text-[11px] text-amber-600 font-medium mt-0.5">Triagem prioritária</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Indicações com Filtros */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Talentos Indicados ({indicacoesFiltradas.length})
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
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
                className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                <SelectValue placeholder="Status da indicação" />
              </SelectTrigger>
              <SelectContent>
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
              <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                <SelectValue placeholder="Vaga indicada" />
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
                    isNova ? 'bg-blue-50/20' : 'hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900">{ind.indicado_nome}</h4>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            isConvertida
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : isRecusada
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : 'bg-blue-50 text-blue-800 border-blue-300'
                          }`}
                        >
                          {ind.status}
                        </Badge>

                        {isNova && (
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                        )}
                      </div>

                      {/* Vaga e Indicador */}
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                        <span className="font-medium text-slate-900">
                          Vaga: {vaga?.titulo || 'Oportunidade'}
                        </span>
                        <span className="text-slate-300">·</span>
                        <div className="inline-flex items-center gap-1.5 text-purple-700 font-semibold">
                          <span>Indicado por:</span>
                          <span className="underline decoration-purple-300">
                            {indicador?.nome || 'Promotor NPS'}
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
                    <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-700 leading-relaxed">
                      <div className="flex items-center justify-between font-bold text-slate-600 text-[11px] mb-1">
                        <span className="flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                          Recomendação de {indicador?.nome || 'Indicador'}:
                        </span>
                        <button
                          onClick={() => handleCopiarLinkIndicador(ind.token_indicador)}
                          className="text-[10px] text-blue-600 hover:underline flex items-center gap-1 font-normal"
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
                    <div className="mt-2 text-xs text-rose-700 font-medium flex items-center gap-1.5 bg-rose-50 p-2 rounded border border-rose-200">
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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Detalhes da Indicação de Talento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Informações completas do indicado, indicador de origem e histórico de consentimento.
            </DialogDescription>
          </DialogHeader>

          {detalheItem && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Indicado</span>
                  <strong className="text-slate-900 text-sm block">
                    {detalheItem.indicado_nome}
                  </strong>
                  <span className="text-slate-500">{detalheItem.indicado_email}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Vaga Alvo</span>
                  <strong className="text-slate-900 block">
                    {detalheItem.expand?.vaga?.titulo || 'Vaga'}
                  </strong>
                  <span className="text-slate-500">
                    Status:{' '}
                    <strong className="text-blue-700 font-semibold">{detalheItem.status}</strong>
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] font-semibold mb-1">
                  Indicador (Promotor de Marca Empregadora)
                </span>
                <div className="p-2.5 rounded-lg border border-purple-200 bg-purple-50/50 flex items-center justify-between">
                  <div>
                    <strong className="text-purple-950 font-bold block">
                      {detalheItem.expand?.indicador?.nome || 'Juliana Mendes'}
                    </strong>
                    <span className="text-[11px] text-purple-700">
                      {detalheItem.expand?.indicador?.email}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopiarLinkIndicador(detalheItem.token_indicador)}
                    className="text-xs h-7 bg-white border-purple-200 text-purple-800"
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
                <p className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed italic">
                  "{detalheItem.mensagem_indicador || 'Sem justificativa informada.'}"
                </p>
              </div>

              {detalheItem.curriculo && (
                <div className="p-2.5 rounded-lg border border-blue-200 bg-blue-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="font-semibold text-blue-950">Currículo Anexo em PDF</span>
                  </div>
                  <a
                    href={`${import.meta.env.VITE_POCKETBASE_URL}/api/files/indicacoes/${detalheItem.id}/${detalheItem.curriculo}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs bg-white text-blue-700 px-2.5 py-1 rounded border border-blue-200 font-bold hover:bg-blue-50 inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Baixar PDF
                  </a>
                </div>
              )}

              <div className="p-2.5 rounded-lg bg-slate-100 text-[10px] text-slate-500 space-y-0.5">
                <div>
                  <strong>Conformidade LGPD:</strong> Consentimento registrado com IP{' '}
                  <code className="text-slate-700 font-mono">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Aceitar Indicação e Iniciar Seleção
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Esta ação converterá formalmente a indicação em um candidato ativo no Kanban em{' '}
              <strong>Triagem</strong> com canal "Indicação".
            </DialogDescription>
          </DialogHeader>

          {converterItem && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-950 space-y-1">
                <p className="font-bold text-emerald-900">
                  Candidato: {converterItem.indicado_nome}
                </p>
                <p className="text-[11px] text-emerald-700">
                  Vaga: {converterItem.expand?.vaga?.titulo || 'Vaga Alvo'}
                </p>
              </div>

              <div className="space-y-1.5 text-slate-600 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    Criação de registro em <strong>Candidatos</strong> com origem "Indicação".
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    Entrada no <strong>Pipeline</strong> na coluna <strong>Triagem</strong>.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    E-mail cordial ao <strong>indicado</strong> convidando para o processo.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>
                    E-mail ao <strong>indicador</strong> confirmando o aceite com registro em log.
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-slate-100">
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Recusar Indicação
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Informe a justificativa interna para o arquivamento da indicação.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Motivo da recusa *</Label>
              <Textarea
                rows={3}
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                placeholder="Ex: Requisitos técnicos incompatíveis no momento ou vaga preenchida..."
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
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
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
              onClick={handleConfirmarRecusa}
              disabled={recusando || !motivoRecusa.trim()}
            >
              {recusando ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Gravando...
                </>
              ) : (
                'Confirmar Recusa'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
