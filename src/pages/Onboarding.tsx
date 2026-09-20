import React, { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
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
  ChevronDown,
  AlertCircle,
  TrendingUp,
  X,
  Edit2,
  Trash2,
  Send,
  Loader2,
  FileText,
  Copy,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  Mail,
  Lock,
  Check,
  Briefcase,
  AlertTriangle,
  User,
  SlidersHorizontal,
  Info,
  Layers,
  Flame,
  ArrowUpRight,
  MoreVertical,
  CheckCircle,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
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
  aCargoDoContratado?: boolean
  confirmadoPorMim?: boolean
  confirmadoEm?: string | null
  observacaoContratado?: string
}

const CATEGORIAS_CONFIG = [
  {
    key: 'Documentos',
    label: 'Documentos & DP',
    descricao: 'Contratos, exame admissional, CTPS e documentação legal',
    icon: FileCheck2,
    gradient: 'from-emerald-500/10 to-teal-500/10',
    badgeColor:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300',
    dotColor: 'bg-emerald-500',
    accentColor: 'text-emerald-600',
    progressColor: 'bg-emerald-500',
  },
  {
    key: 'Acesso & Sistemas',
    label: 'Acesso & Sistemas',
    descricao: 'E-mail corporativo, notebook, VPN, Slack e permissões',
    icon: Laptop,
    gradient: 'from-blue-500/10 to-cyan-500/10',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300',
    dotColor: 'bg-blue-500',
    accentColor: 'text-blue-600',
    progressColor: 'bg-blue-500',
  },
  {
    key: 'Primeiros Dias',
    label: 'Primeiros Dias (Dia 1)',
    descricao: 'Boas-vindas, kit de entrada, buddy e tour pelo escritório/remoto',
    icon: Users,
    gradient: 'from-purple-500/10 to-indigo-500/10',
    badgeColor:
      'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300',
    dotColor: 'bg-purple-500',
    accentColor: 'text-purple-600',
    progressColor: 'bg-purple-500',
  },
  {
    key: 'Treinamento',
    label: 'Treinamento & Cultura',
    descricao: 'Trilha de integração, imersão de produto e alinhamento com liderança',
    icon: GraduationCap,
    gradient: 'from-amber-500/10 to-orange-500/10',
    badgeColor:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300',
    dotColor: 'bg-amber-500',
    accentColor: 'text-amber-600',
    progressColor: 'bg-amber-500',
  },
] as const

// Componente para anel circular de progresso avançado com gradiente e animação
function RadialProgress({
  value,
  size = 110,
  strokeWidth = 9,
  className = '',
}: {
  value: number
  size?: number
  strokeWidth?: number
  className?: string
}) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(Math.max(value, 0), 100)
  const offset = circumference - (clamped / 100) * circumference

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <svg className="w-full h-full -rotate-90 transform" viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-800"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-emerald-400 transition-all duration-700 ease-out"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-black text-white tabular-nums tracking-tight">
          {clamped}%
        </span>
        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
          {clamped === 100 ? 'Concluído' : 'Completo'}
        </span>
      </div>
    </div>
  )
}

// Helpers para avatar
function getInitials(name?: string): string {
  if (!name) return 'RH'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Helper para cálculo de dias até o início
function getDiasAteInicio(dataAdmissao?: string): {
  dias: number
  texto: string
  estilo: 'hoje' | 'futuro' | 'passado' | 'indefinido'
} {
  if (!dataAdmissao) {
    return { dias: 0, texto: 'Data a definir', estilo: 'indefinido' }
  }
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const inicio = new Date(dataAdmissao)
  inicio.setHours(0, 0, 0, 0)

  const diffMs = inicio.getTime() - hoje.getTime()
  const diffDias = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDias === 0) {
    return { dias: 0, texto: 'É hoje! Dia 1 🎉', estilo: 'hoje' }
  } else if (diffDias === 1) {
    return { dias: 1, texto: 'Inicia amanhã!', estilo: 'futuro' }
  } else if (diffDias > 1) {
    return { dias: diffDias, texto: `Em ${diffDias} dias`, estilo: 'futuro' }
  } else if (diffDias === -1) {
    return { dias: -1, texto: 'Iniciou ontem', estilo: 'passado' }
  } else {
    return {
      dias: Math.abs(diffDias),
      texto: `Iniciou há ${Math.abs(diffDias)} dias`,
      estilo: 'passado',
    }
  }
}

// Helper para status de prazo do item
function getPrazoStatus(
  prazo?: string,
  concluido?: boolean,
): {
  label: string
  status: 'em_dia' | 'vence_breve' | 'atrasado' | 'sem_prazo'
  colorClass: string
} {
  if (concluido) {
    return {
      label: 'Concluído',
      status: 'em_dia',
      colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    }
  }
  if (!prazo) {
    return {
      label: 'Sem prazo',
      status: 'sem_prazo',
      colorClass: 'text-slate-400 bg-slate-50 border-slate-200',
    }
  }
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const p = new Date(prazo)
  p.setHours(0, 0, 0, 0)

  const diffDias = Math.round((p.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDias < 0) {
    return {
      label: `Atrasado há ${Math.abs(diffDias)}d`,
      status: 'atrasado',
      colorClass: 'text-rose-700 bg-rose-50 border-rose-200 font-semibold',
    }
  } else if (diffDias <= 2) {
    return {
      label: diffDias === 0 ? 'Vence hoje' : `Vence em ${diffDias}d`,
      status: 'vence_breve',
      colorClass: 'text-amber-700 bg-amber-50 border-amber-200 font-semibold',
    }
  }
  return {
    label: new Date(prazo).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
    status: 'em_dia',
    colorClass: 'text-slate-600 bg-slate-50 border-slate-200',
  }
}

export default function Onboarding() {
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
  const [statusAdmissaoFilter, setStatusAdmissaoFilter] = useState<string>('all')

  // Accordion de categorias aberto
  const [openAccordion, setOpenAccordion] = useState<string[]>([
    'Documentos',
    'Acesso & Sistemas',
    'Primeiros Dias',
    'Treinamento',
  ])

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
  const [itemACargoContratado, setItemACargoContratado] = useState(false)

  // Ações de Link e Admissão
  const [gerandoLink, setGerandoLink] = useState(false)
  const [enviandoEmailLink, setEnviandoEmailLink] = useState(false)
  const [invalidandoLink, setInvalidandoLink] = useState(false)
  const [atualizandoStatus, setAtualizandoStatus] = useState(false)

  // Item sendo alternado (feedback de loading leve no checkbox)
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null)

  // Onboarding ativo selecionado
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

  // Cálculos de KPIs avançados
  const kpis = useMemo(() => {
    const total = onboardings.length
    const emAndamento = onboardings.filter((o) => o.status === 'Ativo').length
    const concluidos = onboardings.filter((o) => o.status === 'Concluído').length

    let somaPerc = 0
    let admitidosMes = 0
    let itensPendentesTotal = 0
    let itensAtrasadosTotal = 0
    const mesAtual = new Date().getMonth()
    const anoAtual = new Date().getFullYear()
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    onboardings.forEach((o) => {
      somaPerc += o.percentual_conclusao || 0
      if (o.data_admissao) {
        const d = new Date(o.data_admissao)
        if (d.getMonth() === mesAtual && d.getFullYear() === anoAtual) {
          admitidosMes++
        }
      }
      if (Array.isArray(o.itens)) {
        o.itens.forEach((it: ItemOnboarding) => {
          if (!it.concluido) {
            itensPendentesTotal++
            if (it.prazo) {
              const p = new Date(it.prazo)
              p.setHours(0, 0, 0, 0)
              if (p.getTime() < hoje.getTime()) {
                itensAtrasadosTotal++
              }
            }
          }
        })
      }
    })

    const percMedio = total > 0 ? Math.round(somaPerc / total) : 0

    return {
      total,
      emAndamento,
      concluidosMes: concluidos,
      percMedio,
      admitidosMes,
      itensPendentesTotal,
      itensAtrasadosTotal,
    }
  }, [onboardings])

  // Filtragem
  const onboardingsFiltrados = useMemo(() => {
    return onboardings.filter((o) => {
      const cand = o.expand?.candidato
      const vaga = o.expand?.vaga

      const matchesStatus = statusFilter === 'all' || o.status === statusFilter
      const matchesVaga = vagaFilter === 'all' || o.vaga === vagaFilter
      const matchesStatusAdmissao =
        statusAdmissaoFilter === 'all' ||
        (o.status_admissao || 'Pendente de envio') === statusAdmissaoFilter

      if (!matchesStatus || !matchesVaga || !matchesStatusAdmissao) return false

      if (!search.trim()) return true
      const q = search.toLowerCase()
      return (
        cand?.nome?.toLowerCase().includes(q) ||
        cand?.email?.toLowerCase().includes(q) ||
        vaga?.titulo?.toLowerCase().includes(q) ||
        vaga?.departamento?.toLowerCase().includes(q)
      )
    })
  }, [onboardings, statusFilter, vagaFilter, statusAdmissaoFilter, search])

  // Contagem de filtros ativos para visualização
  const filtrosAtivosCount = useMemo(() => {
    let count = 0
    if (search.trim()) count++
    if (statusFilter !== 'all') count++
    if (vagaFilter !== 'all') count++
    if (statusAdmissaoFilter !== 'all') count++
    return count
  }, [search, statusFilter, vagaFilter, statusAdmissaoFilter])

  const limparFiltros = () => {
    setSearch('')
    setStatusFilter('all')
    setVagaFilter('all')
    setStatusAdmissaoFilter('all')
  }

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
        title: 'Onboarding iniciado com sucesso!',
        description: 'Checklist estruturado e e-mail de boas-vindas disparado ao contratado.',
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

  // Toggle checklist item com otimismo visual e feedback rápido
  const handleToggleItem = async (itemId: string) => {
    if (!onboardingAtivo) return
    const itensAtuais = Array.isArray(onboardingAtivo.itens) ? [...onboardingAtivo.itens] : []
    const index = itensAtuais.findIndex((it: ItemOnboarding) => it.id === itemId)
    if (index === -1) return

    setTogglingItemId(itemId)
    const novoValor = !itensAtuais[index].concluido
    itensAtuais[index] = {
      ...itensAtuais[index],
      concluido: novoValor,
    }

    // Calcular novo percentual
    const concluidos = itensAtuais.filter((i: ItemOnboarding) => i.concluido).length
    const novoPerc = Math.round((concluidos / itensAtuais.length) * 100)
    const novoStatus = novoPerc === 100 ? 'Concluído' : onboardingAtivo.status

    try {
      const updated = await pb.collection('onboardings').update(onboardingAtivo.id, {
        itens: itensAtuais,
        percentual_conclusao: novoPerc,
        status: novoStatus,
      })
      setOnboardings((prev) => prev.map((o) => (o.id === updated.id ? updated : o)))
      toast({
        title: novoValor ? 'Item concluído com sucesso' : 'Item reaberto',
        description: `${itensAtuais[index].titulo} (${novoPerc}% do processo concluído).`,
      })
    } catch (err: unknown) {
      toast({
        title: 'Erro ao atualizar item',
        description: err instanceof Error ? err.message : 'Falha ao sincronizar alteração.',
        variant: 'destructive',
      })
    } finally {
      setTogglingItemId(null)
    }
  }

  // Ações de Admissão Digital do Contratado
  const handleCopiarLink = async () => {
    if (!onboardingAtivo) return
    let token = onboardingAtivo.token_admissao
    if (!token) {
      setGerandoLink(true)
      try {
        const res = await fetch(
          `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/onboarding/${onboardingAtivo.id}/gerar-link`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: pb.authStore.token,
            },
          },
        )
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Falha ao gerar link')
        token = data.token
        await carregarDados()
      } catch (err: unknown) {
        toast({
          title: 'Erro ao gerar link',
          description: err instanceof Error ? err.message : 'Tente novamente.',
          variant: 'destructive',
        })
        setGerandoLink(false)
        return
      } finally {
        setGerandoLink(false)
      }
    }

    const urlCompleta = `${window.location.origin}/admissao/${token}`
    navigator.clipboard.writeText(urlCompleta)
    toast({
      title: 'Link copiado!',
      description: 'O link seguro de admissão foi copiado para sua área de transferência.',
    })
  }

  const handleEnviarEmailLink = async () => {
    if (!onboardingAtivo) return
    setEnviandoEmailLink(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/onboarding/${onboardingAtivo.id}/enviar-email`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: pb.authStore.token,
          },
        },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar e-mail')

      toast({
        title: 'E-mail enviado com sucesso!',
        description: `Link de admissão enviado para ${data.email || 'o candidato'}. Registrado no log de auditoria.`,
      })
      await carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao enviar e-mail',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setEnviandoEmailLink(false)
    }
  }

  const handleInvalidarOuReabrirLink = async (reabrir: boolean) => {
    if (!onboardingAtivo) return
    setInvalidandoLink(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/onboarding/${onboardingAtivo.id}/invalidar-link`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: pb.authStore.token,
          },
          body: JSON.stringify({ reabrir }),
        },
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erro ao atualizar link')

      toast({
        title: reabrir ? 'Checklist reaberto para edição' : 'Link de admissão revogado',
        description: reabrir
          ? 'O contratado poderá revisar itens e assinar novamente.'
          : 'O acesso público anterior foi bloqueado com sucesso.',
      })
      await carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao processar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setInvalidandoLink(false)
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
      const idx = itensAtuais.findIndex((it: ItemOnboarding) => it.id === itemEditando.id)
      if (idx !== -1) {
        itensAtuais[idx] = {
          ...itensAtuais[idx],
          titulo: itemTitulo.trim(),
          categoria: itemCategoria,
          responsavel: itemResponsavel.trim() || 'Equipe RH / Gestor',
          prazo: itemPrazo || '',
          observacao: itemObservacao.trim(),
          aCargoDoContratado: itemACargoContratado,
        }
      }
    } else {
      const novoItem: ItemOnboarding = {
        id: `custom-${Date.now()}`,
        titulo: itemTitulo.trim(),
        categoria: itemCategoria,
        responsavel: itemResponsavel.trim() || 'Equipe RH / Gestor',
        prazo: itemPrazo || '',
        concluido: false,
        observacao: itemObservacao.trim(),
        aCargoDoContratado: itemACargoContratado,
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
        title: itemEditando ? 'Item atualizado com sucesso' : 'Novo item adicionado ao checklist',
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
    setAtualizandoStatus(true)
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
    } finally {
      setAtualizandoStatus(false)
    }
  }

  // Contagens do Onboarding Ativo
  const statsAtivo = useMemo(() => {
    if (!onboardingAtivo) return null
    const itens: ItemOnboarding[] = Array.isArray(onboardingAtivo.itens)
      ? onboardingAtivo.itens
      : []
    const total = itens.length
    const concluidos = itens.filter((i) => i.concluido).length
    const pendentes = total - concluidos

    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)

    let atrasados = 0
    let vencendoBreve = 0

    itens.forEach((it) => {
      if (!it.concluido && it.prazo) {
        const p = new Date(it.prazo)
        p.setHours(0, 0, 0, 0)
        const diff = Math.round((p.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
        if (diff < 0) atrasados++
        else if (diff <= 2) vencendoBreve++
      }
    })

    const diasInicio = getDiasAteInicio(onboardingAtivo.data_admissao)

    return {
      total,
      concluidos,
      pendentes,
      atrasados,
      vencendoBreve,
      diasInicio,
    }
  }, [onboardingAtivo])

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 pb-12">
      {/* Top Header & Contexto */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Onboarding do Contratado
                </h1>
                <Badge
                  variant="outline"
                  className="text-[11px] font-bold bg-blue-50 text-blue-700 border-blue-200 shadow-2xs"
                >
                  Dia 1 & Integração
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Experiência 360° do novo colaborador: acompanhe documentos, acessos de TI, Dia 1 e a
                assinatura digital de admissão.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 self-start md:self-auto">
          <Button
            onClick={() => {
              setNovoCandidatoId('')
              setNovaDataAdmissao('')
              setModalNovoOpen(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 px-4 shadow-sm hover:shadow transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Iniciar Novo Onboarding
          </Button>
        </div>
      </div>

      {/* KPI Cards Estruturados */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Em Andamento */}
        <Card className="border-slate-200 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Em Andamento
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {kpis.emAndamento}
                </span>
                <span className="text-[11px] text-blue-600 font-medium">ativos</span>
              </div>
              <p className="text-[11px] text-slate-400">
                {kpis.itensPendentesTotal} tarefas pendentes no total
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Concluídos */}
        <Card className="border-slate-200 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                100% Integrados
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600 tracking-tight">
                  {kpis.concluidosMes}
                </span>
                <span className="text-[11px] text-emerald-600 font-medium">concluídos</span>
              </div>
              <p className="text-[11px] text-slate-400">Sucesso no processo admissional</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* % Médio */}
        <Card className="border-slate-200 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Aderência Média
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900 tracking-tight">
                  {kpis.percMedio}%
                </span>
                <span className="text-[11px] text-indigo-600 font-medium">conclusão</span>
              </div>
              <div className="w-24 mt-1">
                <Progress value={kpis.percMedio} className="h-1.5" />
              </div>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 border border-indigo-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Admissões no Mês */}
        <Card className="border-slate-200 shadow-2xs bg-white hover:border-slate-300 transition-all">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Admissões do Mês
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-purple-700 tracking-tight">
                  {kpis.admitidosMes}
                </span>
                <span className="text-[11px] text-purple-600 font-medium">novos membros</span>
              </div>
              <p className="text-[11px] text-slate-400">Data de início este mês</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <Calendar className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Lista de Onboardings à Esquerda + Detalhes do Checklist à Direita */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Painel Esquerdo: Lista, Busca & Toolbar de Filtros (5 colunas) */}
        <div className="lg:col-span-5 space-y-4">
          <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
            <CardHeader className="p-4 pb-3 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-600" />
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Contratados em Onboarding
                  </CardTitle>
                </div>
                <Badge
                  variant="secondary"
                  className="text-xs font-bold px-2 py-0.5 bg-slate-200/70 text-slate-800"
                >
                  {onboardingsFiltrados.length}{' '}
                  {onboardingsFiltrados.length === 1 ? 'processo' : 'processos'}
                </Badge>
              </div>

              {/* Busca */}
              <div className="pt-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <Input
                    placeholder="Buscar por nome, e-mail ou cargo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 pr-8 h-9 text-xs bg-white border-slate-200 focus-visible:ring-blue-500"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                      title="Limpar busca"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Filtros em Grid */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Status geral" />
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

                <Select value={statusAdmissaoFilter} onValueChange={setStatusAdmissaoFilter}>
                  <SelectTrigger className="h-8 text-xs bg-white border-slate-200">
                    <SelectValue placeholder="Admissão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      Todas admissões
                    </SelectItem>
                    <SelectItem value="Pendente de envio" className="text-xs">
                      Pendente de envio
                    </SelectItem>
                    <SelectItem value="Enviado ao contratado" className="text-xs">
                      Enviado ao contratado
                    </SelectItem>
                    <SelectItem value="Em preenchimento" className="text-xs">
                      Em preenchimento
                    </SelectItem>
                    <SelectItem value="Assinado pelo contratado" className="text-xs">
                      Assinado pelo contratado
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Chips de filtros ativos */}
              {filtrosAtivosCount > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-2">
                  <span className="text-[10px] font-semibold text-slate-400 uppercase">
                    Filtros:
                  </span>
                  {statusFilter !== 'all' && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 gap-1 pl-2 pr-1 h-5"
                    >
                      Status: {statusFilter}
                      <button
                        onClick={() => setStatusFilter('all')}
                        className="hover:text-blue-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {statusAdmissaoFilter !== 'all' && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 pl-2 pr-1 h-5"
                    >
                      {statusAdmissaoFilter}
                      <button
                        onClick={() => setStatusAdmissaoFilter('all')}
                        className="hover:text-emerald-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  {search.trim() && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-slate-100 text-slate-700 border-slate-200 gap-1 pl-2 pr-1 h-5"
                    >
                      "{search}"
                      <button onClick={() => setSearch('')} className="hover:text-slate-900">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  )}
                  <button
                    onClick={limparFiltros}
                    className="text-[10px] font-semibold text-blue-600 hover:underline ml-auto"
                  >
                    Limpar tudo
                  </button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-2 divide-y divide-slate-100 max-h-[660px] overflow-y-auto">
              {loading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="p-3 border border-slate-100 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                      <Skeleton className="h-3 w-48" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </div>
              ) : onboardingsFiltrados.length === 0 ? (
                <div className="p-10 text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-700">Nenhum onboarding encontrado</h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    {filtrosAtivosCount > 0
                      ? 'Nenhum contratado corresponde aos filtros aplicados.'
                      : 'Inicie um novo onboarding a partir de um candidato aprovado.'}
                  </p>
                  {filtrosAtivosCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={limparFiltros}
                      className="text-xs h-7 mt-2"
                    >
                      Limpar Filtros
                    </Button>
                  )}
                </div>
              ) : (
                onboardingsFiltrados.map((onb) => {
                  const cand = onb.expand?.candidato
                  const vaga = onb.expand?.vaga
                  const isSelected = onboardingAtivo?.id === onb.id
                  const perc = onb.percentual_conclusao || 0
                  const statusAdmissao = onb.status_admissao || 'Pendente de envio'
                  const diasContador = getDiasAteInicio(onb.data_admissao)

                  return (
                    <div
                      key={onb.id}
                      onClick={() => handleSelecionarOnboarding(onb.id)}
                      className={`p-3.5 rounded-xl transition-all cursor-pointer relative group ${
                        isSelected
                          ? 'bg-blue-50/70 border-2 border-blue-600 shadow-xs'
                          : 'hover:bg-slate-50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <Avatar className="h-9 w-9 shrink-0 border border-slate-200 bg-white">
                            <AvatarFallback className="text-[11px] font-bold text-slate-700 bg-slate-100">
                              {getInitials(cand?.nome)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {cand?.nome || 'Colaborador'}
                              </h4>
                              {onb.status === 'Concluído' && (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 truncate font-medium">
                              {vaga?.titulo || 'Posição a definir'}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {vaga?.departamento || 'Geral'}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-extrabold uppercase px-1.5 py-0 ${
                              onb.status === 'Concluído'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : onb.status === 'Cancelado'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {onb.status}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`text-[9px] font-semibold py-0 px-1.5 ${
                              statusAdmissao === 'Assinado pelo contratado'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : statusAdmissao === 'Em preenchimento'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : statusAdmissao === 'Enviado ao contratado'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}
                          >
                            {statusAdmissao}
                          </Badge>
                        </div>
                      </div>

                      {/* Barra de Progresso com Percentual */}
                      <div className="mt-3 space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">
                            Progresso do onboarding
                          </span>
                          <span className="font-extrabold text-slate-900 tabular-nums">
                            {perc}%
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 rounded-full ${
                              perc === 100
                                ? 'bg-emerald-500'
                                : perc >= 50
                                  ? 'bg-blue-600'
                                  : 'bg-amber-500'
                            }`}
                            style={{ width: `${perc}%` }}
                          />
                        </div>
                      </div>

                      {/* Footer do Card */}
                      <div className="mt-2.5 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="flex items-center gap-1.5 font-medium">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {onb.data_admissao
                              ? new Date(onb.data_admissao).toLocaleDateString('pt-BR')
                              : 'Sem data'}
                          </span>
                        </span>

                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            diasContador.estilo === 'hoje'
                              ? 'bg-purple-100 text-purple-700 font-extrabold animate-pulse'
                              : diasContador.estilo === 'futuro'
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-slate-400'
                          }`}
                        >
                          {diasContador.texto}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Painel Direito: Hero Dominante + Admissão Digital + Checklist por Categoria (7 colunas) */}
        <div className="lg:col-span-7 space-y-5">
          {onboardingAtivo && statsAtivo ? (
            <div className="space-y-5">
              {/* HERO DOMINANTE DE PROGRESSO */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6 sm:p-7 shadow-lg border border-slate-800">
                {/* Background Pattern */}
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 -mb-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                  {/* Informações Principais do Colaborador */}
                  <div className="space-y-3 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Onboarding Ativo
                      </span>

                      {statsAtivo.diasInicio.estilo === 'hoje' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-500/30 text-[11px] font-extrabold animate-bounce">
                          🎉 Primeiro Dia de Trabalho
                        </span>
                      )}

                      {statsAtivo.diasInicio.estilo === 'futuro' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px] font-semibold">
                          <Clock className="w-3 h-3" />
                          {statsAtivo.diasInicio.texto}
                        </span>
                      )}
                    </div>

                    <div>
                      <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white truncate">
                        {onboardingAtivo.expand?.candidato?.nome || 'Colaborador'}
                      </h2>
                      <div className="flex items-center gap-2 text-slate-300 text-xs sm:text-sm mt-1 flex-wrap">
                        <span className="font-semibold text-blue-300">
                          {onboardingAtivo.expand?.vaga?.titulo || 'Cargo'}
                        </span>
                        <span>•</span>
                        <span>{onboardingAtivo.expand?.vaga?.departamento || 'Departamento'}</span>
                        {onboardingAtivo.expand?.candidato?.email && (
                          <>
                            <span>•</span>
                            <span className="text-slate-400 text-xs">
                              {onboardingAtivo.expand.candidato.email}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Meta badges inline */}
                    <div className="flex items-center gap-3 pt-1 text-xs text-slate-300 flex-wrap">
                      <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        <span>Início:</span>
                        <strong className="text-white">
                          {onboardingAtivo.data_admissao
                            ? new Date(onboardingAtivo.data_admissao).toLocaleDateString('pt-BR')
                            : 'A definir'}
                        </strong>
                      </div>

                      <div className="flex items-center gap-1.5 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Itens:</span>
                        <strong className="text-white">
                          {statsAtivo.concluidos} de {statsAtivo.total} concluídos
                        </strong>
                      </div>

                      {statsAtivo.atrasados > 0 && (
                        <div className="flex items-center gap-1.5 bg-rose-950/60 px-2.5 py-1 rounded-lg border border-rose-800 text-rose-300 font-semibold">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                          <span>{statsAtivo.atrasados} atrasados</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Anel de Progresso Dominante + Ações Rápidas */}
                  <div className="flex flex-col sm:flex-row md:flex-col items-center gap-4 shrink-0 w-full md:w-auto justify-between border-t md:border-t-0 md:border-l border-slate-800/80 pt-4 md:pt-0 md:pl-6">
                    <RadialProgress
                      value={onboardingAtivo.percentual_conclusao || 0}
                      size={116}
                      strokeWidth={10}
                    />

                    <div className="flex items-center gap-2">
                      <Select
                        value={onboardingAtivo.status}
                        onValueChange={(val) =>
                          handleAlterarStatus(val as 'Ativo' | 'Concluído' | 'Cancelado')
                        }
                        disabled={atualizandoStatus}
                      >
                        <SelectTrigger className="h-8 text-xs bg-slate-800/90 border-slate-700 text-white font-semibold hover:bg-slate-800 transition-colors">
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

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800"
                            title="Ações do Onboarding"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          <DropdownMenuLabel>Ações Rápidas</DropdownMenuLabel>
                          <DropdownMenuItem onClick={handleCopiarLink} className="cursor-pointer">
                            <Copy className="w-3.5 h-3.5 mr-2" />
                            Copiar link admissional
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={handleEnviarEmailLink}
                            className="cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5 mr-2" />
                            Reenviar e-mail com link
                          </DropdownMenuItem>
                          {onboardingAtivo.token_admissao && (
                            <DropdownMenuItem asChild>
                              <a
                                href={`/admissao/${onboardingAtivo.token_admissao}`}
                                target="_blank"
                                rel="noreferrer"
                                className="cursor-pointer flex items-center"
                              >
                                <ExternalLink className="w-3.5 h-3.5 mr-2" />
                                Abrir página pública
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setItemEditando(null)
                              setItemTitulo('')
                              setItemCategoria('Documentos')
                              setItemResponsavel('')
                              setItemPrazo('')
                              setItemObservacao('')
                              setItemACargoContratado(false)
                              setItemModalOpen(true)
                            }}
                            className="cursor-pointer text-blue-600 font-semibold"
                          >
                            <Plus className="w-3.5 h-3.5 mr-2" />
                            Adicionar item
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>

              {/* CARD DE ADMISSÃO DIGITAL NOMINAL (MÓDULO DO CONTRATADO) */}
              <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-transparent">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">
                            Checklist Admissional & Assinatura Digital
                          </h3>
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold ${
                              onboardingAtivo.status_admissao === 'Assinado pelo contratado'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : onboardingAtivo.status_admissao === 'Em preenchimento'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : onboardingAtivo.status_admissao === 'Enviado ao contratado'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {onboardingAtivo.status_admissao || 'Pendente de envio'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                          Página pública e segura (
                          <code className="text-blue-700">/admissao/:token</code>) para o novo
                          colaborador conferir itens, anexar documentos e assinar com validade
                          jurídica e LGPD.
                        </p>
                      </div>
                    </div>

                    {/* Toolbar de Ações Rápidas do RH */}
                    <div className="flex items-center gap-2 shrink-0 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleCopiarLink}
                        disabled={gerandoLink}
                        className="text-xs h-8 bg-white border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300"
                        title="Copiar link seguro para a área de transferência"
                      >
                        <Copy className="w-3.5 h-3.5 mr-1.5" />
                        {gerandoLink ? 'Gerando...' : 'Copiar Link'}
                      </Button>

                      <Button
                        size="sm"
                        onClick={handleEnviarEmailLink}
                        disabled={enviandoEmailLink}
                        className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs"
                        title="Disparar e-mail com as credenciais de acesso"
                      >
                        <Mail className="w-3.5 h-3.5 mr-1.5" />
                        {enviandoEmailLink ? 'Enviando...' : '(Re)enviar E-mail'}
                      </Button>

                      {onboardingAtivo.token_admissao && (
                        <a
                          href={`/admissao/${onboardingAtivo.token_admissao}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-xs h-8 px-2.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-medium transition-colors"
                          title="Visualizar tela do contratado em nova aba"
                        >
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                          Ver Página
                        </a>
                      )}

                      {onboardingAtivo.status_admissao === 'Assinado pelo contratado' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleInvalidarOuReabrirLink(true)}
                          disabled={invalidandoLink}
                          className="text-xs h-8 text-amber-700 hover:bg-amber-50"
                          title="Permitir que o colaborador retifique informações"
                        >
                          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                          Reabrir
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Sub-painel: Balanço de Responsabilidades e Evidência LGPD */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-5 bg-slate-50/40">
                  {/* Balanço de Confirmações */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <Layers className="w-4 h-4 text-blue-600" />
                        Divisão de Responsabilidades
                      </span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            A cargo do Contratado
                          </span>
                          <strong className="text-blue-700 font-bold tabular-nums">
                            {onboardingAtivo.concluidos_contratado || 0} de{' '}
                            {onboardingAtivo.total_itens_contratado || 0} confirmados
                          </strong>
                        </div>
                        <Progress
                          value={
                            onboardingAtivo.total_itens_contratado
                              ? Math.round(
                                  ((onboardingAtivo.concluidos_contratado || 0) /
                                    onboardingAtivo.total_itens_contratado) *
                                    100,
                                )
                              : 0
                          }
                          className="h-1.5"
                        />
                      </div>

                      <div className="space-y-1 pt-1">
                        <div className="flex items-center justify-between text-slate-600">
                          <span className="font-medium flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-slate-700" />
                            A cargo da Empresa (RH/TI)
                          </span>
                          <strong className="text-slate-800 font-bold tabular-nums">
                            {onboardingAtivo.concluidos_empresa || 0} de{' '}
                            {onboardingAtivo.total_itens_empresa || 0} resolvidos
                          </strong>
                        </div>
                        <Progress
                          value={
                            onboardingAtivo.total_itens_empresa
                              ? Math.round(
                                  ((onboardingAtivo.concluidos_empresa || 0) /
                                    onboardingAtivo.total_itens_empresa) *
                                    100,
                                )
                              : 0
                          }
                          className="h-1.5"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Evidência de Assinatura LGPD */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      Evidência de Assinatura & Auditoria LGPD
                    </span>

                    {onboardingAtivo.status_admissao === 'Assinado pelo contratado' ? (
                      <div className="p-3 bg-emerald-50/70 rounded-lg border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          Termo de Admissão Assinado Digitalmente
                        </div>
                        <p className="text-[11px]">
                          <strong>Signatário:</strong> {onboardingAtivo.assinatura_nome || '—'}
                        </p>
                        <p className="text-[11px]">
                          <strong>Data e Hora:</strong>{' '}
                          {onboardingAtivo.assinatura_data
                            ? new Date(onboardingAtivo.assinatura_data).toLocaleString('pt-BR')
                            : '—'}
                        </p>
                        <p className="text-[10px] text-emerald-700">
                          <strong>Endereço IP auditado:</strong>{' '}
                          <code>
                            {onboardingAtivo.assinatura_ip || '127.0.0.1 (Auditoria Registrada)'}
                          </code>
                        </p>
                      </div>
                    ) : (
                      <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-center space-y-1">
                        <p className="text-xs text-slate-500 font-medium">
                          Aguardando confirmação dos itens pelo contratado
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Ao concluir a conferência na página pública, o signatário registrará nome
                          e consentimento explícito conforme a LGPD.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* SEÇÕES DE CHECKLIST EM ACCORDION POR CATEGORIA */}
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      Etapas do Onboarding
                    </h3>
                    <p className="text-xs text-slate-500">
                      Progresso individualizado por etapa: clique para expandir ou colapsar.
                    </p>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => {
                      setItemEditando(null)
                      setItemTitulo('')
                      setItemCategoria('Documentos')
                      setItemResponsavel('')
                      setItemPrazo('')
                      setItemObservacao('')
                      setItemACargoContratado(false)
                      setItemModalOpen(true)
                    }}
                    className="text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                    Adicionar Tarefa
                  </Button>
                </div>

                <Accordion
                  type="multiple"
                  value={openAccordion}
                  onValueChange={setOpenAccordion}
                  className="space-y-3"
                >
                  {CATEGORIAS_CONFIG.map((cat) => {
                    const Icon = cat.icon
                    const itensDaCategoria = (
                      Array.isArray(onboardingAtivo.itens) ? onboardingAtivo.itens : []
                    ).filter((it: ItemOnboarding) => it.categoria === cat.key)

                    const concluidosCat = itensDaCategoria.filter(
                      (it: ItemOnboarding) => it.concluido,
                    ).length
                    const totalCat = itensDaCategoria.length
                    const percCat = totalCat > 0 ? Math.round((concluidosCat / totalCat) * 100) : 0

                    return (
                      <AccordionItem
                        key={cat.key}
                        value={cat.key}
                        className="border border-slate-200/90 rounded-xl bg-white shadow-2xs overflow-hidden"
                      >
                        <AccordionTrigger className="px-4 py-3.5 hover:no-underline hover:bg-slate-50/70 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full pr-3 text-left">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${cat.badgeColor}`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-bold text-slate-900 tracking-tight">
                                    {cat.label}
                                  </h4>
                                  {percCat === 100 && totalCat > 0 && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 py-0"
                                    >
                                      Concluída
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 line-clamp-1">
                                  {cat.descricao}
                                </p>
                              </div>
                            </div>

                            {/* Barra de Progresso da Categoria */}
                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                              <div className="text-right">
                                <span className="text-[11px] font-bold text-slate-800 tabular-nums">
                                  {concluidosCat} / {totalCat}
                                </span>
                                <span className="text-[10px] text-slate-400 block font-medium">
                                  {percCat}% feito
                                </span>
                              </div>
                              <div className="w-20 hidden sm:block">
                                <Progress value={percCat} className="h-1.5" />
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>

                        <AccordionContent className="px-4 pb-4 pt-1 border-t border-slate-100 bg-slate-50/30">
                          <div className="space-y-2 mt-2">
                            {itensDaCategoria.length === 0 ? (
                              <div className="p-6 text-center border border-dashed border-slate-200 rounded-lg">
                                <p className="text-xs text-slate-400 italic">
                                  Nenhum item cadastrado nesta etapa.
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setItemEditando(null)
                                    setItemTitulo('')
                                    setItemCategoria(cat.key as ItemOnboarding['categoria'])
                                    setItemResponsavel('')
                                    setItemPrazo('')
                                    setItemObservacao('')
                                    setItemACargoContratado(false)
                                    setItemModalOpen(true)
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                                >
                                  <Plus className="w-3.5 h-3.5 mr-1" />
                                  Adicionar primeiro item
                                </Button>
                              </div>
                            ) : (
                              itensDaCategoria.map((it: ItemOnboarding) => {
                                const prazoInfo = getPrazoStatus(it.prazo, it.concluido)
                                const isUpdating = togglingItemId === it.id

                                return (
                                  <div
                                    key={it.id}
                                    className={`p-3.5 rounded-xl border transition-all duration-200 flex items-start justify-between gap-3 ${
                                      it.concluido
                                        ? 'bg-slate-50/80 border-slate-200 text-slate-400 opacity-80'
                                        : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300 hover:shadow-xs'
                                    }`}
                                  >
                                    {/* Checkbox customizado com área de toque e microinteração */}
                                    <div className="flex items-start gap-3 min-w-0 flex-1">
                                      <button
                                        type="button"
                                        onClick={() => handleToggleItem(it.id)}
                                        disabled={isUpdating}
                                        aria-label={
                                          it.concluido ? 'Desmarcar tarefa' : 'Concluir tarefa'
                                        }
                                        className={`mt-0.5 w-5 h-5 rounded-md flex items-center justify-center transition-all shrink-0 border focus:outline-none focus:ring-2 focus:ring-blue-500/40 ${
                                          it.concluido
                                            ? 'bg-emerald-500 border-emerald-600 text-white shadow-2xs'
                                            : 'bg-white border-slate-300 hover:border-blue-500'
                                        }`}
                                      >
                                        {isUpdating ? (
                                          <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
                                        ) : it.concluido ? (
                                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                                        ) : null}
                                      </button>

                                      <div className="space-y-1.5 min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <p
                                            onClick={() => handleToggleItem(it.id)}
                                            className={`text-xs font-semibold leading-snug cursor-pointer select-none transition-all ${
                                              it.concluido
                                                ? 'line-through text-slate-400 font-normal'
                                                : 'text-slate-900 hover:text-blue-600'
                                            }`}
                                          >
                                            {it.titulo}
                                          </p>

                                          {/* Tag Contratado vs Empresa */}
                                          {it.aCargoDoContratado ? (
                                            <Badge
                                              variant="outline"
                                              className="text-[9px] font-bold bg-blue-50 text-blue-700 border-blue-200 py-0"
                                            >
                                              Contratado confirma
                                            </Badge>
                                          ) : (
                                            <Badge
                                              variant="outline"
                                              className="text-[9px] font-medium bg-slate-100 text-slate-600 border-slate-200 py-0"
                                            >
                                              Empresa resolve
                                            </Badge>
                                          )}
                                        </div>

                                        {/* Metadados: Responsável com avatar inicial + Prazo com status visual */}
                                        <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
                                          <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                            <Avatar className="w-4 h-4 text-[9px] border border-slate-300">
                                              <AvatarFallback className="bg-slate-200 text-slate-700 font-bold">
                                                {getInitials(it.responsavel)}
                                              </AvatarFallback>
                                            </Avatar>
                                            <span>{it.responsavel || 'Equipe RH'}</span>
                                          </span>

                                          {it.prazo && (
                                            <Badge
                                              variant="outline"
                                              className={`text-[10px] py-0 px-1.5 font-medium border ${prazoInfo.colorClass}`}
                                            >
                                              <Clock className="w-3 h-3 mr-1" />
                                              {prazoInfo.label}
                                            </Badge>
                                          )}
                                        </div>

                                        {/* Observação / Orientações */}
                                        {it.observacao && (
                                          <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-150 mt-1 leading-relaxed">
                                            {it.observacao}
                                          </p>
                                        )}

                                        {/* Observação deixada pelo contratado na página pública */}
                                        {it.observacaoContratado && (
                                          <div className="text-[11px] text-blue-900 bg-blue-50/80 p-2 rounded-lg border border-blue-200 mt-1">
                                            <strong>Apontamento do Contratado:</strong>{' '}
                                            {it.observacaoContratado}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Ações por item */}
                                    <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                        onClick={() => {
                                          setItemEditando(it)
                                          setItemTitulo(it.titulo)
                                          setItemCategoria(it.categoria)
                                          setItemResponsavel(it.responsavel)
                                          setItemPrazo(it.prazo || '')
                                          setItemObservacao(it.observacao || '')
                                          setItemACargoContratado(!!it.aCargoDoContratado)
                                          setItemModalOpen(true)
                                        }}
                                        title="Editar item"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                        onClick={() => handleRemoverItem(it.id)}
                                        title="Excluir item"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </Button>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    )
                  })}
                </Accordion>
              </div>
            </div>
          ) : (
            <Card className="border-slate-200 shadow-xs bg-white p-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
                <UserCheck className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-800">
                Selecione um onboarding para gerenciar
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                Acompanhe o checklist operacional do primeiro dia, o balanço de confirmações e a
                assinatura digital com auditoria LGPD.
              </p>
              <Button
                onClick={() => setModalNovoOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 mt-2"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Iniciar Novo Onboarding
              </Button>
            </Card>
          )}
        </div>
      </div>

      {/* Modal Iniciar Novo Onboarding */}
      <Dialog open={modalNovoOpen} onOpenChange={setModalNovoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Iniciar Novo Onboarding
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione o candidato aprovado no processo seletivo para instanciar o checklist padrão
              e disparar o e-mail de boas-vindas com link seguro.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Candidato Aprovado / Contratado *
              </Label>
              <Select value={novoCandidatoId} onValueChange={setNovoCandidatoId}>
                <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Selecione o candidato aprovado..." />
                </SelectTrigger>
                <SelectContent>
                  {candidatosAprovados.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      Nenhum candidato em status 'Aprovado' ou 'Proposta'.
                    </div>
                  ) : (
                    candidatosAprovados.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.nome} — {c.expand?.vaga?.titulo || 'Sem vaga'} ({c.status})
                      </SelectItem>
                    ))
                  )}
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

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed space-y-1">
              <strong className="block font-bold">Template padrão automático incluso:</strong>
              <p>
                O processo será inicializado com os 13 itens essenciais (Documentos, TI, Dia 1 e
                Cultura) e um link público nominal exclusivo pronto para envio.
              </p>
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
                'Iniciar Onboarding & Notificar'
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
              {itemEditando ? 'Editar Tarefa do Checklist' : 'Adicionar Tarefa ao Checklist'}
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
                placeholder="Ex: Equipe RH, TI, Gestor Contratante ou Colaborador..."
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
                placeholder="Instruções adicionais, link para formulário ou orientações..."
                value={itemObservacao}
                onChange={(e) => setItemObservacao(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            <div className="flex items-center gap-2.5 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <input
                type="checkbox"
                id="item-a-cargo"
                checked={itemACargoContratado}
                onChange={(e) => setItemACargoContratado(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <Label
                htmlFor="item-a-cargo"
                className="text-xs font-medium text-slate-700 cursor-pointer leading-snug"
              >
                Item confirmável diretamente pelo contratado na página pública de admissão
              </Label>
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
              Salvar Tarefa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
