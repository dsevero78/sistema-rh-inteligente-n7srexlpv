import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import ModalAvaliacao from '@/components/ModalAvaliacao'
import { candidatosTimelineService } from '@/services/candidatosTimeline'
import {
  Calendar as CalendarIcon,
  Plus,
  Clock,
  Video,
  MapPin,
  Phone,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CalendarCheck,
  Send,
  Loader2,
  Sparkles,
  ExternalLink,
  User,
  Briefcase,
  SlidersHorizontal,
  CalendarDays,
  List,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import type { RecordModel } from 'pocketbase'

export default function Entrevistas() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [entrevistas, setEntrevistas] = useState<RecordModel[]>([])
  const [vagas, setVagas] = useState<RecordModel[]>([])
  const [candidatos, setCandidatos] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)

  // Visualização: 'mes' | 'semana' | 'lista'
  const [viewMode, setViewMode] = useState<'mes' | 'semana' | 'lista'>('semana')
  const [currentDate, setCurrentDate] = useState(new Date())

  // Filtros
  const [search, setSearch] = useState('')
  const [vagaFilter, setVagaFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Modal Agendar / Editar
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEntrevista, setEditingEntrevista] = useState<RecordModel | null>(null)
  const [saving, setSaving] = useState(false)

  // Form agendamento
  const [formVaga, setFormVaga] = useState('')
  const [formCandidato, setFormCandidato] = useState('')
  const [formDataHora, setFormDataHora] = useState('')
  const [formDuracao, setFormDuracao] = useState(45)
  const [formFormato, setFormFormato] = useState<'Presencial' | 'Online' | 'Telefonema'>('Online')
  const [formResponsavel, setFormResponsavel] = useState(
    pb.authStore.record?.name || 'Douglas Severo (RH)',
  )
  const [formObservacoes, setFormObservacoes] = useState('')

  // Modal Reagendar
  const [reagendarModalOpen, setReagendarModalOpen] = useState(false)
  const [reagendarTarget, setReagendarTarget] = useState<RecordModel | null>(null)
  const [novaDataHora, setNovaDataHora] = useState('')

  // Modal Cancelar
  const [cancelarModalOpen, setCancelarModalOpen] = useState(false)
  const [cancelarTarget, setCancelarTarget] = useState<RecordModel | null>(null)
  const [motivoCancelamento, setMotivoCancelamento] = useState(
    'Imprevisto na agenda do entrevistador',
  )

  // Modal Avaliação pós-entrevista
  const [avaliacaoModalOpen, setAvaliacaoModalOpen] = useState(false)
  const [avaliacaoTarget, setAvaliacaoTarget] = useState<RecordModel | null>(null)

  // Disparo manual de lembrete
  const [enviandoLembreteId, setEnviandoLembreteId] = useState<string | null>(null)

  const fetchData = async () => {
    try {
      const [eList, vList, cList] = await Promise.all([
        pb.collection('entrevistas').getFullList({
          sort: 'data_hora',
          expand: 'candidato,vaga,responsavel_usuario',
        }),
        pb.collection('vagas').getFullList({ sort: '-created' }),
        pb.collection('candidatos').getFullList({ sort: '-created', expand: 'vaga' }),
      ])
      setEntrevistas(eList)
      setVagas(vList)
      setCandidatos(cList)
    } catch (err) {
      console.error('Falha ao carregar entrevistas:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useRealtime('entrevistas', () => fetchData())
  useRealtime('candidatos', () => fetchData())
  useRealtime('vagas', () => fetchData())

  // Filtragem
  const filteredEntrevistas = useMemo(() => {
    return entrevistas.filter((ent) => {
      const cand = ent.expand?.candidato
      const vaga = ent.expand?.vaga

      const matchesVaga = vagaFilter === 'all' || ent.vaga === vagaFilter
      const matchesStatus = statusFilter === 'all' || ent.status === statusFilter

      const q = search.toLowerCase()
      const matchesSearch =
        !search ||
        cand?.nome?.toLowerCase().includes(q) ||
        vaga?.titulo?.toLowerCase().includes(q) ||
        ent.responsavel?.toLowerCase().includes(q)

      return matchesVaga && matchesStatus && matchesSearch
    })
  }, [entrevistas, vagaFilter, statusFilter, search])

  // Abrir Modal de Agendamento
  const openAgendarModal = () => {
    setEditingEntrevista(null)
    const candPadrao = candidatos[0]?.id || ''
    const candObj = candidatos.find((c) => c.id === candPadrao)
    setFormCandidato(candPadrao)
    setFormVaga(candObj?.vaga || vagas[0]?.id || '')

    // Data padrão: amanhã às 14h00
    const amanha = new Date()
    amanha.setDate(amanha.getDate() + 1)
    amanha.setHours(14, 0, 0, 0)
    // Formato datetime-local: YYYY-MM-DDTHH:mm
    const tzOffset = amanha.getTimezoneOffset() * 60000
    const localISOTime = new Date(amanha.getTime() - tzOffset).toISOString().slice(0, 16)
    setFormDataHora(localISOTime)

    setFormDuracao(45)
    setFormFormato('Online')
    setFormResponsavel(pb.authStore.record?.name || 'Douglas Severo (RH)')
    setFormObservacoes('')
    setModalOpen(true)
  }

  // Ao mudar candidato no formulário, sincroniza a vaga vinculada
  const handleCandidatoChange = (candId: string) => {
    setFormCandidato(candId)
    const candObj = candidatos.find((c) => c.id === candId)
    if (candObj?.vaga) {
      setFormVaga(candObj.vaga)
    }
  }

  const handleSalvarAgendamento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formCandidato || !formVaga || !formDataHora) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione vaga, candidato e a data/horário.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      // Converte para ISO UTC
      const dateObj = new Date(formDataHora)
      const dataHoraIso = dateObj.toISOString()

      const payload = {
        candidato: formCandidato,
        vaga: formVaga,
        data_hora: dataHoraIso,
        duracao_minutos: formDuracao,
        formato: formFormato,
        responsavel: formResponsavel,
        responsavel_usuario: pb.authStore.record?.id || '',
        observacoes: formObservacoes,
        status: 'Agendada',
        lembrete_enviado: false,
      }

      const entCriada = await pb.collection('entrevistas').create(payload)

      // Registrar evento na linha do tempo do candidato
      const candObj = candidatos.find((c) => c.id === formCandidato)
      const dataFormatada = new Date(formDataHora).toLocaleString('pt-BR')
      await candidatosTimelineService.registrarEventoSeguro({
        candidato: formCandidato,
        categoria: 'ENTREVISTA',
        titulo: 'Entrevista agendada:',
        complemento: `Formato ${formFormato} com ${formResponsavel} para ${dataFormatada} (${formDuracao} min).`,
        autor: pb.authStore.record?.name || formResponsavel || 'Gente & Gestão',
        origem: 'usuario',
        referencia_tipo: 'entrevistas',
        referencia_id: entCriada.id,
      })

      // Se o candidato estiver em Triagem, move para Entrevista com RH
      if (candObj && candObj.status === 'Triagem') {
        await pb.collection('candidatos').update(candObj.id, {
          status: 'Entrevista com RH',
        })
      }

      toast({
        title: 'Entrevista agendada com sucesso!',
        description: 'O lembrete automático por e-mail será enviado ~24h antes da entrevista.',
      })
      setModalOpen(false)
      fetchData()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao agendar entrevista',
        description: err instanceof Error ? err.message : 'Falha na requisição.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  // Reagendar
  const openReagendarModal = (ent: RecordModel) => {
    setReagendarTarget(ent)
    const cur = new Date(ent.data_hora)
    const tzOffset = cur.getTimezoneOffset() * 60000
    const localISO = new Date(cur.getTime() - tzOffset).toISOString().slice(0, 16)
    setNovaDataHora(localISO)
    setReagendarModalOpen(true)
  }

  const handleConfirmReagendar = async () => {
    if (!reagendarTarget || !novaDataHora) return
    try {
      const dateObj = new Date(novaDataHora)
      await pb.collection('entrevistas').update(reagendarTarget.id, {
        data_hora: dateObj.toISOString(),
        status: 'Agendada',
        lembrete_enviado: false, // reinicia lembrete para a nova data
      })

      // Registrar na timeline do candidato
      if (reagendarTarget.candidato) {
        await candidatosTimelineService.registrarEventoSeguro({
          candidato: reagendarTarget.candidato,
          categoria: 'ENTREVISTA',
          titulo: 'Entrevista reagendada:',
          complemento: `Nova data e horário definidos para ${dateObj.toLocaleString('pt-BR')} com ${reagendarTarget.responsavel || 'entrevistador'}.`,
          autor: pb.authStore.record?.name || 'Gente & Gestão',
          origem: 'usuario',
          referencia_tipo: 'entrevistas',
          referencia_id: reagendarTarget.id,
        })
      }

      toast({
        title: 'Entrevista reagendada!',
        description: 'A nova data foi salva e o ciclo de lembretes foi atualizado.',
      })
      setReagendarModalOpen(false)
      fetchData()
    } catch (err) {
      toast({ title: 'Erro ao reagendar entrevista', variant: 'destructive' })
    }
  }

  // Cancelar
  const openCancelarModal = (ent: RecordModel) => {
    setCancelarTarget(ent)
    setMotivoCancelamento('Imprevisto na agenda do entrevistador')
    setCancelarModalOpen(true)
  }

  const handleConfirmCancelar = async () => {
    if (!cancelarTarget) return
    try {
      await pb.collection('entrevistas').update(cancelarTarget.id, {
        status: 'Cancelada',
        motivo_cancelamento: motivoCancelamento,
      })

      if (cancelarTarget.candidato) {
        await candidatosTimelineService.registrarEventoSeguro({
          candidato: cancelarTarget.candidato,
          categoria: 'ENTREVISTA',
          titulo: 'Entrevista cancelada:',
          complemento: `Motivo registrado: ${motivoCancelamento || 'Cancelada pelo entrevistador/candidato.'}`,
          autor: pb.authStore.record?.name || 'Gente & Gestão',
          origem: 'usuario',
          referencia_tipo: 'entrevistas',
          referencia_id: cancelarTarget.id,
        })
      }

      toast({
        title: 'Entrevista cancelada',
        description: 'O status e motivo foram salvos com sucesso.',
      })
      setCancelarModalOpen(false)
      fetchData()
    } catch (err) {
      toast({ title: 'Erro ao cancelar entrevista', variant: 'destructive' })
    }
  }

  // Marcar como Não compareceu
  const handleMarcarNaoCompareceu = async (ent: RecordModel) => {
    try {
      await pb.collection('entrevistas').update(ent.id, {
        status: 'Não compareceu',
      })

      if (ent.candidato) {
        await candidatosTimelineService.registrarEventoSeguro({
          candidato: ent.candidato,
          categoria: 'ENTREVISTA',
          titulo: 'Não comparecimento à entrevista:',
          complemento: `Candidato não compareceu no horário agendado (${new Date(ent.data_hora).toLocaleString('pt-BR')}).`,
          autor: pb.authStore.record?.name || 'Gente & Gestão',
          origem: 'usuario',
          referencia_tipo: 'entrevistas',
          referencia_id: ent.id,
        })
      }

      toast({
        title: 'Status atualizado',
        description: 'Entrevista marcada como "Não compareceu".',
      })
      fetchData()
    } catch (err) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    }
  }

  // Marcar como Realizada -> Abre modal de avaliação pós-entrevista
  const handleMarcarRealizada = (ent: RecordModel) => {
    setAvaliacaoTarget(ent)
    setAvaliacaoModalOpen(true)
  }

  // Enviar Lembrete Imediato (e-mail)
  const handleEnviarLembreteAgora = async (entId: string) => {
    setEnviandoLembreteId(entId)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/entrevistas/${entId}/lembrete`,
        {
          method: 'POST',
          headers: {
            Authorization: pb.authStore.token,
          },
        },
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao enviar lembrete')
      }
      toast({
        title: 'Lembrete enviado por e-mail!',
        description: data.message || 'E-mail encaminhado ao candidato com sucesso.',
      })
      fetchData()
    } catch (err: unknown) {
      toast({
        title: 'Erro no envio do lembrete',
        description: err instanceof Error ? err.message : 'Falha na conexão.',
        variant: 'destructive',
      })
    } finally {
      setEnviandoLembreteId(null)
    }
  }

  // Métricas do Topo
  const totalAgendadas = useMemo(
    () => entrevistas.filter((e) => e.status === 'Agendada').length,
    [entrevistas],
  )
  const totalRealizadas = useMemo(
    () => entrevistas.filter((e) => e.status === 'Realizada').length,
    [entrevistas],
  )
  const totalAvaliadas = useMemo(
    () => entrevistas.filter((e) => e.avaliacao_realizada).length,
    [entrevistas],
  )

  // Navegação de Datas no Calendário
  const handlePrevDate = () => {
    const next = new Date(currentDate)
    if (viewMode === 'mes') {
      next.setMonth(next.getMonth() - 1)
    } else {
      next.setDate(next.getDate() - 7)
    }
    setCurrentDate(next)
  }

  const handleNextDate = () => {
    const next = new Date(currentDate)
    if (viewMode === 'mes') {
      next.setMonth(next.getMonth() + 1)
    } else {
      next.setDate(next.getDate() + 7)
    }
    setCurrentDate(next)
  }

  const handleToday = () => {
    setCurrentDate(new Date())
  }

  // Calendário Semanal
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    // Segunda-feira como início
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1)
    startOfWeek.setDate(diff)
    startOfWeek.setHours(0, 0, 0, 0)

    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      days.push(d)
    }
    return days
  }, [currentDate])

  // Calendário Mensal
  const monthDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const days = []
    // Padding início da semana
    const startDay = firstDay.getDay()
    const paddingStart = startDay === 0 ? 6 : startDay - 1
    for (let i = paddingStart; i > 0; i--) {
      const d = new Date(year, month, 1 - i)
      days.push({ date: d, isCurrentMonth: false })
    }

    // Dias do mês
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }

    // Padding fim da semana
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }

    return days
  }, [currentDate])

  // Agrupar entrevistas por dia (YYYY-MM-DD)
  const entrevistasPorDia = useMemo(() => {
    const map: Record<string, RecordModel[]> = {}
    filteredEntrevistas.forEach((ent) => {
      const dt = new Date(ent.data_hora)
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`
      if (!map[key]) map[key] = []
      map[key].push(ent)
    })
    return map
  }, [filteredEntrevistas])

  // Helper de Formatação
  const getFormatBadge = (formato: string) => {
    switch (formato) {
      case 'Online':
        return (
          <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
            <Video className="w-2.5 h-2.5 mr-1" /> Online
          </Badge>
        )
      case 'Presencial':
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200"
          >
            <MapPin className="w-2.5 h-2.5 mr-1" /> Presencial
          </Badge>
        )
      default:
        return (
          <Badge
            variant="outline"
            className="text-[10px] bg-amber-50 text-amber-700 border-amber-200"
          >
            <Phone className="w-2.5 h-2.5 mr-1" /> Telefonema
          </Badge>
        )
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Agendada':
        return (
          <Badge className="text-[11px] bg-blue-600 hover:bg-blue-600 text-white">Agendada</Badge>
        )
      case 'Realizada':
        return (
          <Badge className="text-[11px] bg-emerald-600 hover:bg-emerald-600 text-white">
            Realizada
          </Badge>
        )
      case 'Cancelada':
        return (
          <Badge variant="outline" className="text-[11px] bg-rose-50 text-rose-700 border-rose-200">
            Cancelada
          </Badge>
        )
      case 'Não compareceu':
        return (
          <Badge
            variant="outline"
            className="text-[11px] bg-slate-100 text-slate-700 border-slate-300"
          >
            Não compareceu
          </Badge>
        )
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            Gestão de Entrevistas & Calendário
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Agende entrevistas, envie lembretes automáticos ~24h antes e avalie talentos alimentando
            o matching
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            onClick={openAgendarModal}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs h-10 text-xs px-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Agendar Entrevista
          </Button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4 bg-white border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Entrevistas Agendadas
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-blue-600 tabular-nums">
                {totalAgendadas}
              </span>
              <span className="text-xs text-slate-500">no funil</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <CalendarDays className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Realizadas
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-emerald-600 tabular-nums">
                {totalRealizadas}
              </span>
              <span className="text-xs text-slate-500">concluídas</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </Card>

        <Card className="p-4 bg-white border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Com Avaliação & Matching
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-purple-600 tabular-nums">
                {totalAvaliadas}
              </span>
              <span className="text-xs text-slate-500">score ajustado</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </Card>
      </div>

      {/* Filter Toolbar & View Selector */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search & Select Filters */}
        <div className="flex-1 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              placeholder="Buscar por candidato, vaga ou entrevistador..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-xs bg-slate-50 border-slate-200"
            />
          </div>

          <Select value={vagaFilter} onValueChange={setVagaFilter}>
            <SelectTrigger className="w-[180px] h-10 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Todas as vagas" />
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

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px] h-10 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Todos os status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                Todos os status
              </SelectItem>
              <SelectItem value="Agendada" className="text-xs">
                Agendada
              </SelectItem>
              <SelectItem value="Realizada" className="text-xs">
                Realizada
              </SelectItem>
              <SelectItem value="Cancelada" className="text-xs">
                Cancelada
              </SelectItem>
              <SelectItem value="Não compareceu" className="text-xs">
                Não compareceu
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Mode Toggle & Date Navigator */}
        <div className="flex items-center gap-3 justify-between md:justify-end">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <Button
              variant={viewMode === 'semana' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('semana')}
              className={`h-8 text-xs font-semibold px-2.5 ${
                viewMode === 'semana'
                  ? 'bg-white text-slate-900 shadow-2xs hover:bg-white'
                  : 'text-slate-600'
              }`}
            >
              Semana
            </Button>
            <Button
              variant={viewMode === 'mes' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('mes')}
              className={`h-8 text-xs font-semibold px-2.5 ${
                viewMode === 'mes'
                  ? 'bg-white text-slate-900 shadow-2xs hover:bg-white'
                  : 'text-slate-600'
              }`}
            >
              Mês
            </Button>
            <Button
              variant={viewMode === 'lista' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('lista')}
              className={`h-8 text-xs font-semibold px-2.5 ${
                viewMode === 'lista'
                  ? 'bg-white text-slate-900 shadow-2xs hover:bg-white'
                  : 'text-slate-600'
              }`}
            >
              <List className="w-3.5 h-3.5 mr-1" />
              Lista
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              className="h-8 text-xs border-slate-200"
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrevDate}
              className="h-8 w-8 text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNextDate}
              className="h-8 w-8 text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Date Range Label */}
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600 px-1">
        <span className="text-sm font-bold text-slate-900 capitalize">
          {viewMode === 'mes'
            ? currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
            : `Semana de ${weekDays[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} a ${weekDays[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}`}
        </span>
        <span className="text-slate-500 font-medium">
          {filteredEntrevistas.length} entrevistas encontradas
        </span>
      </div>

      {/* View Content */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : viewMode === 'semana' ? (
        /* SEMANA VIEW (7 colunas) */
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((dia, idx) => {
            const key = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`
            const itensDoDia = entrevistasPorDia[key] || []
            const isHoje = new Date().toDateString() === dia.toDateString()

            return (
              <div
                key={idx}
                className={`flex flex-col rounded-xl border bg-white min-h-[360px] ${
                  isHoje ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200/80 shadow-2xs'
                }`}
              >
                {/* Cabeçalho do dia */}
                <div
                  className={`p-3 text-center border-b ${
                    isHoje
                      ? 'bg-blue-50/70 border-blue-200 text-blue-900'
                      : 'bg-slate-50/70 border-slate-100 text-slate-700'
                  }`}
                >
                  <p className="text-[11px] font-bold uppercase tracking-wider">
                    {dia.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </p>
                  <p className="text-lg font-extrabold mt-0.5 tabular-nums">{dia.getDate()}</p>
                </div>

                {/* Lista de cards do dia */}
                <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                  {itensDoDia.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-center p-3 text-[11px] text-slate-300">
                      Nenhuma entrevista
                    </div>
                  ) : (
                    itensDoDia.map((ent) => {
                      const cand = ent.expand?.candidato
                      const vaga = ent.expand?.vaga
                      const hora = new Date(ent.data_hora).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })

                      return (
                        <div
                          key={ent.id}
                          className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs hover:shadow-md transition-all space-y-2 group"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                              <Clock className="w-3 h-3 text-blue-600" />
                              {hora} ({ent.duracao_minutos}m)
                            </span>
                            {getFormatBadge(ent.formato)}
                          </div>

                          <div>
                            <p
                              onClick={() => cand && navigate(`/candidatos/${cand.id}`)}
                              className="text-xs font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer truncate"
                            >
                              {cand?.nome || 'Candidato'}
                            </p>
                            <p className="text-[10px] text-slate-500 truncate">
                              {vaga?.titulo || 'Vaga'}
                            </p>
                          </div>

                          <div className="pt-1 border-t border-slate-100 flex items-center justify-between">
                            {getStatusBadge(ent.status)}

                            {/* Dropdown Ações */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 text-slate-400"
                                >
                                  <MoreVertical className="w-3.5 h-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48 text-xs">
                                {ent.status === 'Agendada' && (
                                  <>
                                    <DropdownMenuItem
                                      onClick={() => handleMarcarRealizada(ent)}
                                      className="text-emerald-600 font-semibold cursor-pointer"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
                                      Marcar como Realizada & Avaliar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => openReagendarModal(ent)}
                                      className="cursor-pointer"
                                    >
                                      <Clock className="w-3.5 h-3.5 mr-2" />
                                      Reagendar
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleEnviarLembreteAgora(ent.id)}
                                      className="cursor-pointer text-blue-600"
                                      disabled={enviandoLembreteId === ent.id}
                                    >
                                      <Send className="w-3.5 h-3.5 mr-2" />
                                      Enviar Lembrete por E-mail
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => handleMarcarNaoCompareceu(ent)}
                                      className="cursor-pointer text-slate-600"
                                    >
                                      <AlertCircle className="w-3.5 h-3.5 mr-2" />
                                      Não compareceu
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => openCancelarModal(ent)}
                                      className="text-rose-600 cursor-pointer"
                                    >
                                      <XCircle className="w-3.5 h-3.5 mr-2" />
                                      Cancelar entrevista
                                    </DropdownMenuItem>
                                  </>
                                )}

                                {ent.status === 'Realizada' && (
                                  <DropdownMenuItem
                                    onClick={() => handleMarcarRealizada(ent)}
                                    className="cursor-pointer text-purple-600 font-semibold"
                                  >
                                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                                    {ent.avaliacao_realizada
                                      ? 'Ver / Editar Avaliação'
                                      : 'Avaliar Candidato'}
                                  </DropdownMenuItem>
                                )}

                                {cand && (
                                  <DropdownMenuItem
                                    onClick={() => navigate(`/candidatos/${cand.id}`)}
                                    className="cursor-pointer"
                                  >
                                    <User className="w-3.5 h-3.5 mr-2" />
                                    Ver perfil do candidato
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>

                          {/* Se já foi avaliada, exibe pill com o score ajustado */}
                          {ent.avaliacao_realizada && (
                            <div className="bg-purple-50 border border-purple-200 rounded px-2 py-1 flex items-center justify-between text-[10px]">
                              <span className="font-semibold text-purple-900 flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-purple-600" />
                                Score Ajustado:
                              </span>
                              <span className="font-extrabold text-purple-700 tabular-nums">
                                {ent.score_ajustado || 85}%
                              </span>
                            </div>
                          )}
                        </div>
                      )
                    })
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : viewMode === 'mes' ? (
        /* MÊS VIEW (Grid 7x6) */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          {/* Dias da semana */}
          <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200 text-center py-2.5">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((d, i) => (
              <span key={i} className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {d}
              </span>
            ))}
          </div>

          {/* Grid de dias */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100">
            {monthDays.map((item, idx) => {
              const dia = item.date
              const key = `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`
              const itensDoDia = entrevistasPorDia[key] || []
              const isHoje = new Date().toDateString() === dia.toDateString()

              return (
                <div
                  key={idx}
                  className={`min-h-[100px] p-2 flex flex-col transition-colors ${
                    !item.isCurrentMonth
                      ? 'bg-slate-50/50 text-slate-400'
                      : isHoje
                        ? 'bg-blue-50/30'
                        : 'bg-white hover:bg-slate-50/30'
                  }`}
                >
                  <div className="flex items-center justify-between pb-1">
                    <span
                      className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center tabular-nums ${
                        isHoje
                          ? 'bg-blue-600 text-white'
                          : item.isCurrentMonth
                            ? 'text-slate-800'
                            : 'text-slate-400'
                      }`}
                    >
                      {dia.getDate()}
                    </span>
                    {itensDoDia.length > 0 && (
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded-full">
                        {itensDoDia.length}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 flex-1 overflow-y-auto max-h-[80px]">
                    {itensDoDia.slice(0, 2).map((ent) => (
                      <div
                        key={ent.id}
                        onClick={() => handleMarcarRealizada(ent)}
                        className={`text-[10px] p-1 rounded font-medium truncate cursor-pointer transition-colors ${
                          ent.status === 'Realizada'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-blue-50 text-blue-800 border border-blue-200 hover:bg-blue-100'
                        }`}
                        title={`${ent.expand?.candidato?.nome} - ${ent.expand?.vaga?.titulo}`}
                      >
                        {new Date(ent.data_hora).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        - {ent.expand?.candidato?.nome || 'Entrevista'}
                      </div>
                    ))}
                    {itensDoDia.length > 2 && (
                      <p className="text-[9px] text-slate-500 font-semibold pl-1">
                        +{itensDoDia.length - 2} mais
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        /* LISTA COMPLETA VIEW */
        <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
          <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Lista de Entrevistas
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Acompanhe o status e histórico de todas as agendas
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="p-0 divide-y divide-slate-100">
            {filteredEntrevistas.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs">
                Nenhuma entrevista encontrada com os filtros selecionados.
              </div>
            ) : (
              filteredEntrevistas.map((ent) => {
                const cand = ent.expand?.candidato
                const vaga = ent.expand?.vaga
                const dataFormatada = new Date(ent.data_hora).toLocaleString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })

                return (
                  <div
                    key={ent.id}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-200">
                        {cand?.nome
                          ? cand.nome
                              .split(' ')
                              .map((n: string) => n[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase()
                          : 'RH'}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <p
                            onClick={() => cand && navigate(`/candidatos/${cand.id}`)}
                            className="text-sm font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer truncate"
                          >
                            {cand?.nome || 'Candidato'}
                          </p>
                          {getFormatBadge(ent.formato)}
                        </div>
                        <p className="text-xs text-slate-500 truncate">
                          Vaga:{' '}
                          <span className="font-semibold text-slate-700">
                            {vaga?.titulo || 'Geral'}
                          </span>{' '}
                          · Responsável: {ent.responsavel}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Data: <strong className="text-slate-700">{dataFormatada}</strong> (
                          {ent.duracao_minutos} min)
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 flex-wrap sm:flex-nowrap">
                      {/* Lembrete indicator */}
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          ent.lembrete_enviado
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200'
                        }`}
                      >
                        {ent.lembrete_enviado ? '✓ Lembrete Enviado' : 'Lembrete Pendente'}
                      </Badge>

                      {getStatusBadge(ent.status)}

                      {/* Botão Avaliar Pós-Entrevista */}
                      {ent.status === 'Realizada' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarcarRealizada(ent)}
                          className="h-8 text-xs font-semibold border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100"
                        >
                          <Sparkles className="w-3.5 h-3.5 mr-1 text-purple-600" />
                          {ent.avaliacao_realizada
                            ? `Score ${ent.score_ajustado || 85}%`
                            : 'Avaliar'}
                        </Button>
                      )}

                      {ent.status === 'Agendada' && (
                        <Button
                          size="sm"
                          onClick={() => handleMarcarRealizada(ent)}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Realizada
                        </Button>
                      )}

                      {/* Menu de ações */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 text-xs">
                          {ent.status === 'Agendada' && (
                            <>
                              <DropdownMenuItem
                                onClick={() => openReagendarModal(ent)}
                                className="cursor-pointer"
                              >
                                <Clock className="w-3.5 h-3.5 mr-2" />
                                Reagendar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEnviarLembreteAgora(ent.id)}
                                className="cursor-pointer text-blue-600"
                              >
                                <Send className="w-3.5 h-3.5 mr-2" />
                                Enviar Lembrete por E-mail
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleMarcarNaoCompareceu(ent)}
                                className="cursor-pointer text-slate-600"
                              >
                                <AlertCircle className="w-3.5 h-3.5 mr-2" />
                                Não compareceu
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => openCancelarModal(ent)}
                                className="text-rose-600 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5 mr-2" />
                                Cancelar
                              </DropdownMenuItem>
                            </>
                          )}
                          {cand && (
                            <DropdownMenuItem
                              onClick={() => navigate(`/candidatos/${cand.id}`)}
                              className="cursor-pointer"
                            >
                              <User className="w-3.5 h-3.5 mr-2" />
                              Ver perfil do candidato
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      )}

      {/* MODAL 1: AGENDAR ENTREVISTA */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <form onSubmit={handleSalvarAgendamento}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900">
                Agendar Nova Entrevista
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Preencha os dados da sessão. O candidato receberá um lembrete automático ~24h antes
                por e-mail.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              {/* Candidato */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Candidato *</Label>
                <Select value={formCandidato} onValueChange={handleCandidatoChange}>
                  <SelectTrigger className="text-xs h-9 bg-white">
                    <SelectValue placeholder="Selecione o candidato..." />
                  </SelectTrigger>
                  <SelectContent>
                    {candidatos.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="text-xs">
                        {c.nome} ({c.cargo_atual || 'Candidato'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Vaga */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Vaga Associada *</Label>
                <Select value={formVaga} onValueChange={setFormVaga}>
                  <SelectTrigger className="text-xs h-9 bg-white">
                    <SelectValue placeholder="Selecione a vaga..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vagas.map((v) => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        {v.titulo} ({v.departamento})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data e Horário & Duração */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Data e Horário *</Label>
                  <Input
                    type="datetime-local"
                    value={formDataHora}
                    onChange={(e) => setFormDataHora(e.target.value)}
                    className="text-xs h-9 bg-white"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Duração Estimada</Label>
                  <Select
                    value={String(formDuracao)}
                    onValueChange={(val) => setFormDuracao(parseInt(val, 10))}
                  >
                    <SelectTrigger className="text-xs h-9 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30" className="text-xs">
                        30 minutos
                      </SelectItem>
                      <SelectItem value="45" className="text-xs">
                        45 minutos
                      </SelectItem>
                      <SelectItem value="60" className="text-xs">
                        1 hora (60 min)
                      </SelectItem>
                      <SelectItem value="90" className="text-xs">
                        1h30 (90 min)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Formato & Responsável */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Formato *</Label>
                  <Select
                    value={formFormato}
                    onValueChange={(val) =>
                      setFormFormato(val as 'Presencial' | 'Online' | 'Telefonema')
                    }
                  >
                    <SelectTrigger className="text-xs h-9 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Online" className="text-xs">
                        Online (Google Meet / Zoom)
                      </SelectItem>
                      <SelectItem value="Presencial" className="text-xs">
                        Presencial
                      </SelectItem>
                      <SelectItem value="Telefonema" className="text-xs">
                        Telefonema
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Responsável *</Label>
                  <Input
                    value={formResponsavel}
                    onChange={(e) => setFormResponsavel(e.target.value)}
                    className="text-xs h-9 bg-white"
                    placeholder="Ex: Douglas Severo (RH)"
                    required
                  />
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Observações / Pauta</Label>
                <Textarea
                  rows={2}
                  value={formObservacoes}
                  onChange={(e) => setFormObservacoes(e.target.value)}
                  placeholder="Ex: Entrevista técnica focada em testes práticos e alinhamento de stack..."
                  className="text-xs resize-none bg-white"
                />
              </div>
            </div>

            <DialogFooter className="pt-3 border-t border-slate-100">
              <Button variant="outline" size="sm" type="button" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Agendando...
                  </>
                ) : (
                  'Confirmar Agendamento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: REAGENDAR */}
      <Dialog open={reagendarModalOpen} onOpenChange={setReagendarModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Reagendar Entrevista
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Selecione o novo dia e horário para{' '}
              <strong>{reagendarTarget?.expand?.candidato?.nome}</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Nova Data e Horário</Label>
              <Input
                type="datetime-local"
                value={novaDataHora}
                onChange={(e) => setNovaDataHora(e.target.value)}
                className="text-xs h-9 bg-white"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              O status será mantido como "Agendada" e o lembrete de e-mail será recalculado para a
              nova data.
            </p>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setReagendarModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmReagendar}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
            >
              Confirmar Reagendamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: CANCELAR */}
      <Dialog open={cancelarModalOpen} onOpenChange={setCancelarModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Cancelar Entrevista
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Informe o motivo do cancelamento para registro no histórico.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Motivo do Cancelamento *
              </Label>
              <select
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs"
              >
                <option value="Imprevisto na agenda do entrevistador">
                  Imprevisto na agenda do entrevistador
                </option>
                <option value="Candidato solicitou cancelamento">
                  Candidato solicitou cancelamento
                </option>
                <option value="Vaga pausada ou preenchida">Vaga pausada ou preenchida</option>
                <option value="Desistência mútua">Desistência mútua</option>
                <option value="Outro motivo">Outro motivo</option>
              </select>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setCancelarModalOpen(false)}>
              Voltar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmCancelar}
              className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
            >
              Confirmar Cancelamento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: AVALIAÇÃO PÓS-ENTREVISTA ALIMENTANDO MATCHING */}
      <ModalAvaliacao
        open={avaliacaoModalOpen}
        onOpenChange={setAvaliacaoModalOpen}
        entrevista={avaliacaoTarget}
        onSuccess={fetchData}
      />
    </div>
  )
}
