import { useState, useEffect, useMemo } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import {
  UserCheck,
  CheckCircle2,
  Clock,
  Calendar,
  Search,
  Filter,
  Plus,
  ArrowRight,
  Sparkles,
  Building2,
  FileCheck2,
  Laptop,
  GraduationCap,
  Users,
  ChevronRight,
  AlertCircle,
  TrendingUp,
  X,
  Edit2,
  Trash2,
  Send,
  Loader2,
  FileText,
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
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import type { RecordModel } from 'pocketbase'

export interface ItemOnboarding {
  id: string
  titulo: string
  categoria: 'Documentos' | 'Acesso & Sistemas' | 'Primeiros Dias' | 'Treinamento'
  responsavel: string
  prazo?: string
  concluido: boolean
  observacao?: string
}

const CATEGORIAS_CONFIG = [
  {
    key: 'Documentos',
    label: 'Documentos & DP',
    icon: FileCheck2,
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  {
    key: 'Acesso & Sistemas',
    label: 'Acesso & Sistemas',
    icon: Laptop,
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    dotColor: 'bg-blue-500',
  },
  {
    key: 'Primeiros Dias',
    label: 'Primeiros Dias (Dia 1)',
    icon: Users,
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
    dotColor: 'bg-purple-500',
  },
  {
    key: 'Treinamento',
    label: 'Treinamento & Cultura',
    icon: GraduationCap,
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
  },
] as const

export default function Onboarding() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const selectedOnboardingId = searchParams.get('id')

  const [onboardings, setOnboardings] = useState<RecordModel[]>([])
  const [vagas, setVagas] = useState<RecordModel[]>([])
  const [candidatosAprovados, setCandidatosAprovados] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [vagaFilter, setVagaFilter] = useState<string>('all')

  // Modal Novo Onboarding
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [novoCandidatoId, setNovoCandidatoId] = useState('')
  const [novaDataAdmissao, setNovaDataAdmissao] = useState('')
  const [salvandoNovo, setSalvandoNovo] = useState(false)

  // Modal Adicionar/Editar Item no Detalhe
  const [itemModalOpen, setItemModalOpen] = useState(false)
  const [itemEditando, setItemEditando] = useState<ItemOnboarding | null>(null)
  const [itemTitulo, setItemTitulo] = useState('')
  const [itemCategoria, setItemCategoria] = useState<ItemOnboarding['categoria']>('Documentos')
  const [itemResponsavel, setItemResponsavel] = useState('')
  const [itemPrazo, setItemPrazo] = useState('')
  const [itemObservacao, setItemObservacao] = useState('')

  // Onboarding ativo selecionado para visualização/edição detalhada (pelo id do onboarding ou candidato)
  const onboardingAtivo = useMemo(() => {
    if (!selectedOnboardingId) {
      return onboardings.length > 0 ? onboardings[0] : null
    }
    return (
      onboardings.find(
        (o) => o.id === selectedOnboardingId || o.candidato === selectedOnboardingId,
      ) ||
      onboardings[0] ||
      null
    )
  }, [selectedOnboardingId, onboardings])

  const carregarDados = async () => {
    try {
      const [onbList, vList, candList] = await Promise.all([
        pb.collection('onboardings').getFullList({
          sort: '-created',
          expand: 'candidato,vaga',
        }),
        pb.collection('vagas').getFullList({ sort: '-created' }),
        pb.collection('candidatos').getFullList({
          filter: "status = 'Aprovado' || status = 'Proposta'",
          sort: '-created',
          expand: 'vaga',
        }),
      ])
      setOnboardings(onbList)
      setVagas(vList)
      setCandidatosAprovados(candList)
    } catch (err) {
      console.error('Falha ao carregar onboardings:', err)
      toast({
        title: 'Erro ao carregar onboardings',
        description: 'Tente recarregar a página.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  useRealtime('onboardings', () => carregarDados())
  useRealtime('candidatos', () => carregarDados())

  // Cálculos de KPIs
  const kpis = useMemo(() => {
    const total = onboardings.length
    const emAndamento = onboardings.filter((o) => o.status === 'Ativo').length
    const concluidos = onboardings.filter((o) => o.status === 'Concluído').length

    let somaPerc = 0
    let admitidosMes = 0
    const mesAtual = new Date().getMonth()
    const anoAtual = new Date().getFullYear()

    onboardings.forEach((o) => {
      somaPerc += o.percentual_conclusao || 0
      if (o.data_admissao) {
        const d = new Date(o.data_admissao)
        if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
          admitidosMes++
        }
      }
    })

    const percMedio = total > 0 ? Math.round(somaPerc / total) : 0

    return {
      total,
      emAndamento,
      concluidosMes: concluidos,
      percMedio,
      admitidosMes,
    }
  }, [onboardings])

  // Filtragem
  const onboardingsFiltrados = useMemo(() => {
    return onboardings.filter((o) => {
      const cand = o.expand?.candidato
      const vaga = o.expand?.vaga

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter
      const matchesVaga = vagaFilter === 'all' || o.vaga === vagaFilter

      if (!matchesStatus || !matchesVaga) return false

      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        cand?.nome?.toLowerCase().includes(q) ||
        cand?.email?.toLowerCase().includes(q) ||
        vaga?.titulo?.toLowerCase().includes(q) ||
        vaga?.departamento?.toLowerCase().includes(q)
      )
    })
  }, [onboardings, statusFilter, vagaFilter, search])

  // Handlers
  const handleSelecionarOnboarding = (id: string) => {
    setSearchParams({ id })
  }

  const handleCriarOnboarding = async () => {
    if (!novoCandidatoId) {
      toast({
        title: 'Selecione o candidato',
        description: 'É necessário selecionar um candidato aprovado para iniciar o onboarding.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoNovo(true)
    try {
      const candidato = candidatosAprovados.find((c) => c.id === novoCandidatoId)
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/onboarding/iniciar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: pb.authStore.token,
          },
          body: JSON.stringify({
            candidatoId: novoCandidatoId,
            vagaId: candidato?.vaga || '',
            dataAdmissao: novaDataAdmissao || null,
          }),
        },
      )

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao iniciar onboarding')
      }

      toast({
        title: 'Onboarding criado com sucesso!',
        description: 'E-mail caloroso de boas-vindas disparado ao contratado.',
      })

      setModalNovoOpen(false)
      setNovoCandidatoId('')
      setNovaDataAdmissao('')
      await carregarDados()
      if (data.onboardingId) {
        setSearchParams({ id: data.onboardingId })
      }
    } catch (err: unknown) {
      toast({
        title: 'Erro ao criar onboarding',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoNovo(false)
    }
  }

  // Toggle checklist item
  const handleToggleItem = async (itemId: string) => {
    if (!onboardingAtivo) return
    const itensAtuais = Array.isArray(onboardingAtivo.itens) ? [...onboardingAtivo.itens] : []
    const index = itensAtuais.findIndex((it: ItemOnboarding) => it.id === itemId)
    if (index === -1) return

    itensAtuais[index] = {
      ...itensAtuais[index],
      concluido: !itensAtuais[index].concluido,
    }

    // Calcular novo percentual
    const concluidos = itensAtuais.filter((i: ItemOnboarding) => i.concluido).length
    const novoPerc = Math.round((concluidos / itensAtuais.length) * 100)

    try {
      const updated = await pb.collection('onboardings').update(onboardingAtivo.id, {
        itens: itensAtuais,
        percentual_conclusao: novoPerc,
        status: novoPerc === 100 ? 'Concluído' : onboardingAtivo.status,
      })
      setOnboardings((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
      toast({
        title: itensAtuais[index].concluido ? 'Item concluído!' : 'Item reaberto',
        description: `${itensAtuais[index].titulo} atualizado (${novoPerc}% concluído).`,
      })
    } catch (err: unknown) {
      toast({
        title: 'Erro ao atualizar item',
        description: err instanceof Error ? err.message : 'Falha ao sincronizar.',
        variant: 'destructive',
      })
    }
  }

  // Salvar Item (Adicionar ou Editar)
  const handleSalvarItem = async () => {
    if (!onboardingAtivo || !itemTitulo.trim()) {
      toast({ title: 'O título do item é obrigatório.', variant: 'destructive' })
      return
    }

    const itensAtuais = Array.isArray(onboardingAtivo.itens) ? [...onboardingAtivo.itens] : []

    if (itemEditando) {
      // Editar
      const idx = itensAtuais.findIndex((it: ItemOnboarding) => it.id === itemEditando.id)
      if (idx !== -1) {
        itensAtuais[idx] = {
          ...itensAtuais[idx],
          titulo: itemTitulo.trim(),
          categoria: itemCategoria,
          responsavel: itemResponsavel.trim() || 'Equipe RH / Gestor',
          prazo: itemPrazo || '',
          observacao: itemObservacao.trim(),
        }
      }
    } else {
      // Adicionar novo
      const novoItem: ItemOnboarding = {
        id: `custom-${Date.now()}`,
        titulo: itemTitulo.trim(),
        categoria: itemCategoria,
        responsavel: itemResponsavel.trim() || 'Equipe RH / Gestor',
        prazo: itemPrazo || '',
        concluido: false,
        observacao: itemObservacao.trim(),
      }
      itensAtuais.push(novoItem)
    }

    const concluidos = itensAtuais.filter((i: ItemOnboarding) => i.concluido).length
    const novoPerc = Math.round((concluidos / itensAtuais.length) * 100)

    try {
      const updated = await pb.collection('onboardings').update(onboardingAtivo.id, {
        itens: itensAtuais,
        percentual_conclusao: novoPerc,
      })
      setOnboardings((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
      setItemModalOpen(false)
      setItemEditando(null)
      toast({
        title: itemEditando ? 'Item atualizado' : 'Novo item adicionado ao checklist',
      })
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar item',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  // Remover item
  const handleRemoverItem = async (itemId: string) => {
    if (!onboardingAtivo) return
    const itensAtuais = Array.isArray(onboardingAtivo.itens)
      ? onboardingAtivo.itens.filter((it: ItemOnboarding) => it.id !== itemId)
      : []

    const concluidos = itensAtuais.filter((i: ItemOnboarding) => i.concluido).length
    const novoPerc =
      itensAtuais.length > 0 ? Math.round((concluidos / itensAtuais.length) * 100) : 0

    try {
      const updated = await pb.collection('onboardings').update(onboardingAtivo.id, {
        itens: itensAtuais,
        percentual_conclusao: novoPerc,
      })
      setOnboardings((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
      toast({ title: 'Item removido do checklist' })
    } catch (err: unknown) {
      toast({
        title: 'Erro ao remover item',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  // Alterar Status geral do Onboarding
  const handleAlterarStatus = async (novoStatus: 'Ativo' | 'Concluído' | 'Cancelado') => {
    if (!onboardingAtivo) return
    try {
      const updated = await pb.collection('onboardings').update(onboardingAtivo.id, {
        status: novoStatus,
      })
      setOnboardings((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
      toast({
        title: 'Status atualizado',
        description: `Onboarding marcado como ${novoStatus}.`,
      })
    } catch (err: unknown) {
      toast({
        title: 'Erro ao atualizar status',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Onboarding do Contratado
            </h2>
            <Badge
              variant="outline"
              className="text-[11px] font-bold bg-blue-50 text-blue-700 border-blue-200"
            >
              Dia 1 & Integração
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Conecte o recrutamento ao primeiro dia de trabalho: checklists de documentos, acessos,
            boas-vindas e treinamento.
          </p>
        </div>

        <Button
          onClick={() => {
            setNovoCandidatoId('')
            setNovaDataAdmissao('')
            setModalNovoOpen(true)
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-10 shadow-xs"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Iniciar Novo Onboarding
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Em Andamento</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{kpis.emAndamento}</h3>
              <p className="text-[11px] text-blue-600 font-medium mt-0.5">Processos ativos</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Concluídos</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{kpis.concluidosMes}</h3>
              <p className="text-[11px] text-emerald-600 font-medium mt-0.5">Integrados com 100%</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">% Médio Conclusão</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{kpis.percMedio}%</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">Progresso geral</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500">Admissões no Mês</p>
              <h3 className="text-2xl font-black text-slate-900 mt-1">{kpis.admitidosMes}</h3>
              <p className="text-[11px] text-purple-600 font-medium mt-0.5">
                Data de início este mês
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Lista de Onboardings à Esquerda + Detalhes do Checklist à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Painel Esquerdo: Lista e Filtros (5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-4 pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-bold text-slate-900">
                  Colaboradores em Onboarding ({onboardingsFiltrados.length})
                </CardTitle>
              </div>

              {/* Busca e Filtros */}
              <div className="space-y-2 pt-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <Input
                    placeholder="Buscar por colaborador ou vaga..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 h-9 text-xs bg-slate-50 border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">
                        Todos os status
                      </SelectItem>
                      <SelectItem value="Ativo" className="text-xs">
                        Ativos
                      </SelectItem>
                      <SelectItem value="Concluído" className="text-xs">
                        Concluídos
                      </SelectItem>
                      <SelectItem value="Cancelado" className="text-xs">
                        Cancelados
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={vagaFilter} onValueChange={setVagaFilter}>
                    <SelectTrigger className="h-8 text-xs bg-slate-50 border-slate-200">
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
              </div>
            </CardHeader>

            <CardContent className="p-2 divide-y divide-slate-100 max-h-[620px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  Carregando processos de onboarding...
                </div>
              ) : onboardingsFiltrados.length === 0 ? (
                <div className="p-8 text-center">
                  <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">
                    Nenhum onboarding encontrado
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Selecione um candidato aprovado para iniciar o processo.
                  </p>
                </div>
              ) : (
                onboardingsFiltrados.map((onb) => {
                  const cand = onb.expand?.candidato
                  const vaga = onb.expand?.vaga
                  const isSelected = onboardingAtivo?.id === onb.id
                  const perc = onb.percentual_conclusao || 0

                  return (
                    <div
                      key={onb.id}
                      onClick={() => handleSelecionarOnboarding(onb.id)}
                      className={`p-3 rounded-lg transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50/70 border-l-4 border-l-blue-600 shadow-2xs'
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {cand?.nome || 'Colaborador'}
                          </h4>
                          <p className="text-[11px] text-slate-600 truncate font-medium">
                            {vaga?.titulo || 'Posição'}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold shrink-0 ${
                            onb.status === 'Concluído'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : onb.status === 'Cancelado'
                                ? 'bg-rose-50 text-rose-700 border-rose-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {onb.status}
                        </Badge>
                      </div>

                      {/* Barra de Progresso */}
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">Progresso</span>
                          <span className="font-extrabold text-slate-800 tabular-nums">
                            {perc}%
                          </span>
                        </div>
                        <Progress value={perc} className="h-1.5" />
                      </div>

                      <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Início:{' '}
                          {onb.data_admissao
                            ? new Date(onb.data_admissao).toLocaleDateString('pt-BR')
                            : 'A definir'}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Painel Direito: Detalhe do Onboarding e Checklist Agrupado (7 colunas) */}
        <div className="lg:col-span-7 space-y-4">
          {onboardingAtivo ? (
            <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
              {/* Header do Detalhe */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                        Plano de Onboarding
                      </span>
                    </div>
                    <h3 className="text-xl font-extrabold tracking-tight">
                      {onboardingAtivo.expand?.candidato?.nome || 'Colaborador'}
                    </h3>
                    <p className="text-xs text-slate-300">
                      {onboardingAtivo.expand?.vaga?.titulo || 'Cargo'} ·{' '}
                      {onboardingAtivo.expand?.vaga?.departamento || 'Departamento'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Select
                      value={onboardingAtivo.status}
                      onValueChange={(val) =>
                        handleAlterarStatus(val as 'Ativo' | 'Concluído' | 'Cancelado')
                      }
                    >
                      <SelectTrigger className="h-8 text-xs bg-slate-800/80 border-slate-700 text-white font-semibold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ativo" className="text-xs font-semibold">
                          Status: Ativo
                        </SelectItem>
                        <SelectItem value="Concluído" className="text-xs font-semibold">
                          Status: Concluído
                        </SelectItem>
                        <SelectItem value="Cancelado" className="text-xs font-semibold">
                          Status: Cancelado
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Régua de Progresso e Dados de Admissão */}
                <div className="mt-6 pt-4 border-t border-slate-700/80 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[11px]">Data de Início</span>
                    <span className="font-bold text-white flex items-center gap-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      {onboardingAtivo.data_admissao
                        ? new Date(onboardingAtivo.data_admissao).toLocaleDateString('pt-BR')
                        : 'A definir com RH'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-400 block text-[11px]">E-mail Contratado</span>
                    <span className="font-medium text-white truncate block mt-0.5">
                      {onboardingAtivo.expand?.candidato?.email || '—'}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-[11px] text-slate-300 mb-1">
                      <span>Progresso Geral</span>
                      <span className="font-bold text-emerald-400">
                        {onboardingAtivo.percentual_conclusao || 0}%
                      </span>
                    </div>
                    <Progress
                      value={onboardingAtivo.percentual_conclusao || 0}
                      className="h-2 bg-slate-700"
                    />
                  </div>
                </div>
              </div>

              {/* Botão de Adicionar Item ao Checklist */}
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">Checklist Operacional</h4>
                  <p className="text-[11px] text-slate-500">
                    Marque os itens à medida que forem cumpridos pelo RH, Gestor ou Colaborador.
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setItemEditando(null)
                    setItemTitulo('')
                    setItemCategoria('Documentos')
                    setItemResponsavel('')
                    setItemPrazo('')
                    setItemObservacao('')
                    setItemModalOpen(true)
                  }}
                  className="text-xs h-8 bg-white border-slate-200 text-slate-700 hover:text-blue-600"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Adicionar Item
                </Button>
              </div>

              {/* Checklist Agrupado por Categoria */}
              <div className="p-6 space-y-6">
                {CATEGORIAS_CONFIG.map((cat) => {
                  const Icon = cat.icon
                  const itensDaCategoria = (
                    Array.isArray(onboardingAtivo.itens) ? onboardingAtivo.itens : []
                  ).filter((it: ItemOnboarding) => it.categoria === cat.key)

                  const concluidosCat = itensDaCategoria.filter(
                    (it: ItemOnboarding) => it.concluido,
                  ).length

                  return (
                    <div key={cat.key} className="space-y-3">
                      {/* Header da Categoria */}
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${cat.dotColor}`} />
                          <Icon className="w-4 h-4 text-slate-600" />
                          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                            {cat.label}
                          </h5>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {concluidosCat} / {itensDaCategoria.length}
                        </span>
                      </div>

                      {/* Lista de Itens na Categoria */}
                      <div className="space-y-2">
                        {itensDaCategoria.length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic py-1">
                            Nenhum item nesta categoria.
                          </p>
                        ) : (
                          itensDaCategoria.map((it: ItemOnboarding) => (
                            <div
                              key={it.id}
                              className={`p-3 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                                it.concluido
                                  ? 'bg-slate-50/70 border-slate-200/80 text-slate-400'
                                  : 'bg-white border-slate-200/90 shadow-2xs hover:border-slate-300'
                              }`}
                            >
                              <div className="flex items-start gap-3 min-w-0 flex-1">
                                <input
                                  type="checkbox"
                                  checked={it.concluido}
                                  onChange={() => handleToggleItem(it.id)}
                                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                />

                                <div className="space-y-1 min-w-0 flex-1">
                                  <p
                                    className={`text-xs font-semibold leading-snug cursor-pointer ${
                                      it.concluido
                                        ? 'line-through text-slate-400 font-normal'
                                        : 'text-slate-800'
                                    }`}
                                    onClick={() => handleToggleItem(it.id)}
                                  >
                                    {it.titulo}
                                  </p>

                                  <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                                    <span className="font-medium text-slate-600">
                                      Resp: {it.responsavel || 'Equipe RH'}
                                    </span>
                                    {it.prazo && (
                                      <span className="text-slate-400 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Prazo:{' '}
                                        {new Date(it.prazo).toLocaleDateString('pt-BR', {
                                          timeZone: 'UTC',
                                        })}
                                      </span>
                                    )}
                                  </div>

                                  {it.observacao && (
                                    <p className="text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded border border-slate-100 mt-1">
                                      {it.observacao}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-400 hover:text-blue-600"
                                  onClick={() => {
                                    setItemEditando(it)
                                    setItemTitulo(it.titulo)
                                    setItemCategoria(it.categoria)
                                    setItemResponsavel(it.responsavel)
                                    setItemPrazo(it.prazo || '')
                                    setItemObservacao(it.observacao || '')
                                    setItemModalOpen(true)
                                  }}
                                  title="Editar item"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-400 hover:text-rose-600"
                                  onClick={() => handleRemoverItem(it.id)}
                                  title="Excluir item"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>
          ) : (
            <Card className="border-slate-200 shadow-xs bg-white p-12 text-center">
              <UserCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                Selecione um onboarding para gerenciar
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Acompanhe em tempo real os prazos de documentos, criação de e-mail e as reuniões de
                boas-vindas do contratado.
              </p>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Iniciar Novo Onboarding */}
      <Dialog open={modalNovoOpen} onOpenChange={setModalNovoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Iniciar Novo Onboarding
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione o candidato aprovado no processo seletivo para instanciar o checklist padrão
              e disparar o e-mail oficial de boas-vindas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Candidato Aprovado / Contratado *
              </Label>
              <Select value={novoCandidatoId} onValueChange={setNovoCandidatoId}>
                <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Selecione o candidato..." />
                </SelectTrigger>
                <SelectContent>
                  {candidatosAprovados.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-xs">
                      {c.nome} — {c.expand?.vaga?.titulo || 'Sem vaga'} ({c.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Data Prevista de Admissão (Dia 1)
              </Label>
              <Input
                type="date"
                value={novaDataAdmissao}
                onChange={(e) => setNovaDataAdmissao(e.target.value)}
                className="h-9 text-xs bg-white border-slate-200"
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-[11px] text-blue-900 leading-relaxed">
              <strong>Template padrão incluso:</strong> O onboarding será inicializado com os 13
              itens divididos entre Documentos, Acesso & Sistemas, Primeiros Dias e Treinamento.
              Você poderá customizar prazos e responsáveis a qualquer momento.
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setModalNovoOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              onClick={handleCriarOnboarding}
              disabled={salvandoNovo || !novoCandidatoId}
            >
              {salvandoNovo ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Iniciando...
                </>
              ) : (
                'Iniciar Onboarding & Enviar E-mail'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar / Editar Item de Checklist */}
      <Dialog open={itemModalOpen} onOpenChange={setItemModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {itemEditando ? 'Editar Item do Checklist' : 'Adicionar Item ao Checklist'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Defina o título, categoria, responsável e prazo para manter a conformidade do processo
              de integração.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Título da tarefa *</Label>
              <Input
                placeholder="Ex: Assinatura do Contrato de Trabalho Digital..."
                value={itemTitulo}
                onChange={(e) => setItemTitulo(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Categoria *</Label>
                <Select
                  value={itemCategoria}
                  onValueChange={(val) => setItemCategoria(val as ItemOnboarding['categoria'])}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Documentos" className="text-xs">
                      Documentos & DP
                    </SelectItem>
                    <SelectItem value="Acesso & Sistemas" className="text-xs">
                      Acesso & Sistemas
                    </SelectItem>
                    <SelectItem value="Primeiros Dias" className="text-xs">
                      Primeiros Dias (Dia 1)
                    </SelectItem>
                    <SelectItem value="Treinamento" className="text-xs">
                      Treinamento & Cultura
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Prazo (opcional)</Label>
                <Input
                  type="date"
                  value={itemPrazo}
                  onChange={(e) => setItemPrazo(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Responsável</Label>
              <Input
                placeholder="Ex: Gestor Contratante, TI ou Nome do Contratado..."
                value={itemResponsavel}
                onChange={(e) => setItemResponsavel(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Observações / Orientações (opcional)
              </Label>
              <Textarea
                rows={2}
                placeholder="Detalhes adicionais, link para formulário ou orientações..."
                value={itemObservacao}
                onChange={(e) => setItemObservacao(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setItemModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              onClick={handleSalvarItem}
            >
              Salvar Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
