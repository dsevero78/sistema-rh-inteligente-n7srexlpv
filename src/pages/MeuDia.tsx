import React, { useState, useEffect, useMemo, useTransition } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useRealtime } from '@/hooks/use-realtime'
import { useToast } from '@/hooks/use-toast'
import {
  carregarMeuDia,
  alternarItemResolvidoLocal,
  type ItemMeuDia,
  type MeuDiaDados,
  type SeveridadeMeuDia,
} from '@/services/meuDia'
import {
  Sun,
  Sunrise,
  Sunset,
  Moon,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Sparkles,
  ArrowRight,
  Filter,
  RefreshCw,
  ExternalLink,
  Target,
  ShieldCheck,
  CheckSquare,
  Square,
  Flame,
  Check,
  Info,
  ChevronRight,
  PartyPopper,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function MeuDia() {
  const { user, isGestorContratante } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [, startTransition] = useTransition()

  const [dados, setDados] = useState<MeuDiaDados | null>(null)
  const [loading, setLoading] = useState(true)
  const [filtroSeveridade, setFiltroSeveridade] = useState<'todas' | SeveridadeMeuDia>('todas')
  const [ocultarConcluidas, setOcultarConcluidas] = useState(false)
  const [recarregando, setRecarregando] = useState(false)

  const carregarRotina = async (silencioso = false) => {
    if (!silencioso) setLoading(true)
    else setRecarregando(true)

    try {
      const res = await carregarMeuDia(user)
      setDados(res)
    } catch (err) {
      console.error('Falha ao carregar Meu Dia:', err)
      toast({
        title: 'Erro ao carregar Meu Dia',
        description: 'Tente recarregar a página.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setRecarregando(false)
    }
  }

  useEffect(() => {
    carregarRotina()
  }, [user])

  // Realtime em coleções-chave para manter o dia sempre atualizado
  useRealtime('vagas', () => carregarRotina(true))
  useRealtime('candidatos', () => carregarRotina(true))
  useRealtime('entrevistas', () => carregarRotina(true))
  useRealtime('aditivos_pj', () => carregarRotina(true))
  useRealtime('onboardings', () => carregarRotina(true))
  useRealtime('alertas', () => carregarRotina(true))
  useRealtime('feedbacks_gestor', () => carregarRotina(true))
  useRealtime('documentos_pessoa', () => carregarRotina(true))
  useRealtime('pessoas', () => carregarRotina(true))

  // Saudação contextual por hora do dia
  const saudacaoInfo = useMemo(() => {
    const hora = new Date().getHours()
    const nomePrimeiro = (user?.name || user?.email || 'Colega').split(' ')[0]

    let saudacao = 'Bom dia'
    let Icone = Sunrise
    let iconeCor = 'text-[#F19763]'

    if (hora >= 5 && hora < 12) {
      saudacao = 'Bom dia'
      Icone = Sunrise
      iconeCor = 'text-[#E9530E]'
    } else if (hora >= 12 && hora < 18) {
      saudacao = 'Boa tarde'
      Icone = Sun
      iconeCor = 'text-amber-500'
    } else {
      saudacao = 'Boa noite'
      Icone = Moon
      iconeCor = 'text-indigo-400'
    }

    const dataCompleta = new Date().toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    // Capitaliza primeira letra do dia da semana
    const dataFormatada = dataCompleta.charAt(0).toUpperCase() + dataCompleta.slice(1)

    return {
      saudacao: `${saudacao}, ${nomePrimeiro}!`,
      data: dataFormatada,
      Icone,
      iconeCor,
    }
  }, [user])

  // Alternar checkbox de conclusão
  const handleToggleConcluido = (item: ItemMeuDia, e: React.MouseEvent) => {
    e.stopPropagation()
    const novoStatus = !item.concluido
    alternarItemResolvidoLocal(item.id, novoStatus)

    // Atualização otimista
    if (dados) {
      const novosItens = dados.itens.map((it) =>
        it.id === item.id ? { ...it, concluido: novoStatus } : it,
      )
      const pendentes = novosItens.filter((i) => !i.concluido)
      const concluidos = novosItens.filter((i) => i.concluido).length

      setDados({
        ...dados,
        itens: novosItens,
        kpis: {
          ...dados.kpis,
          totalPendencias: pendentes.length,
          urgentesHoje: pendentes.filter((i) => i.severidade === 'urgente').length,
          atencaoSemana: pendentes.filter((i) => i.severidade === 'atencao').length,
          acompanharCount: pendentes.filter((i) => i.severidade === 'acompanhar').length,
          concluidas7d: concluidos,
        },
        totalUrgentes: pendentes.filter((i) => i.severidade === 'urgente').length,
        totalAtencao: pendentes.filter((i) => i.severidade === 'atencao').length,
        totalAcompanhar: pendentes.filter((i) => i.severidade === 'acompanhar').length,
      })

      // Emite evento customizado para o Layout atualizar o badge instantaneamente
      window.dispatchEvent(new CustomEvent('souyess_meu_dia_updated'))

      toast({
        title: novoStatus ? 'Item marcado como resolvido! 🎉' : 'Item reaberto na sua rotina',
        description: novoStatus ? item.tituloAcao : 'Pendência devolvida para a lista.',
      })
    }
  }

  // Filtragem dos itens exibidos
  const itensFiltrados = useMemo(() => {
    if (!dados) return []
    return dados.itens.filter((item) => {
      if (ocultarConcluidas && item.concluido) return false
      if (filtroSeveridade !== 'todas' && item.severidade !== filtroSeveridade) return false
      return true
    })
  }, [dados, filtroSeveridade, ocultarConcluidas])

  // Agrupamentos por severidade para layout em seções claras
  const secaoUrgente = useMemo(
    () => itensFiltrados.filter((i) => i.severidade === 'urgente'),
    [itensFiltrados],
  )
  const secaoAtencao = useMemo(
    () => itensFiltrados.filter((i) => i.severidade === 'atencao'),
    [itensFiltrados],
  )
  const secaoAcompanhar = useMemo(
    () => itensFiltrados.filter((i) => i.severidade === 'acompanhar'),
    [itensFiltrados],
  )

  const handleIrParaAcao = (rota: string) => {
    startTransition(() => {
      navigate(rota)
    })
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in-50 duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-8 w-72 bg-slate-200 dark:bg-[#1A2240]" />
            <Skeleton className="h-4 w-48 bg-slate-200 dark:bg-[#1A2240]" />
          </div>
          <Skeleton className="h-10 w-32 bg-slate-200 dark:bg-[#1A2240]" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-slate-200 dark:bg-[#1A2240]" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-xl bg-slate-200 dark:bg-[#1A2240]" />
      </div>
    )
  }

  const SaudacaoIcone = saudacaoInfo.Icone

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 pb-12">
      {/* =========================================================================
          CABEÇALHO SOUYESS (Saudação Contextual + Data Completa em Montserrat)
          ========================================================================= */}
      <div className="bg-white dark:bg-[#1A2240] p-6 rounded-2xl border border-slate-200/90 dark:border-[#2E3A6E] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#FEF1EA] text-[#E9530E] dark:bg-[#E9530E]/20 dark:text-[#F19763] border border-[#E9530E]/30 font-display">
              <SaudacaoIcone className={`w-3.5 h-3.5 ${saudacaoInfo.iconeCor}`} />
              Minha Rotina Operacional
            </span>
            <span className="text-xs text-slate-400 dark:text-[#A8B0C9]">·</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-[#A8B0C9]">
              {isGestorContratante
                ? 'Perfil Gestor Contratante'
                : user?.cargo_funcao || 'Gente & Gestão (RH)'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#212B55] dark:text-[#F7F8FB] tracking-tight font-display">
            {saudacaoInfo.saudacao}
          </h1>

          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#A8B0C9] flex items-center gap-1.5 font-sans">
            <Calendar className="w-3.5 h-3.5 text-[#E9530E]" />
            <span>{saudacaoInfo.data}</span>
            <span className="text-slate-300 dark:text-[#2E3A6E]">|</span>
            <span className="text-slate-600 dark:text-slate-300 font-medium">
              Tudo que o sistema requer que você faça hoje
            </span>
          </p>
        </div>

        {/* Ações do Topo */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => carregarRotina(true)}
            disabled={recarregando}
            className="h-9 text-xs font-semibold border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#11162B] text-slate-700 dark:text-[#D3D7E5] hover:bg-slate-50 dark:hover:bg-[#2E3A6E]"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${recarregando ? 'animate-spin' : ''}`} />
            {recarregando ? 'Atualizando...' : 'Atualizar'}
          </Button>

          <Button
            size="sm"
            onClick={() => {
              const primeiro = dados?.itens.find((i) => !i.concluido && i.severidade === 'urgente')
              if (primeiro) {
                handleIrParaAcao(primeiro.rotaDestino)
              } else if (dados?.itens[0]) {
                handleIrParaAcao(dados.itens[0].rotaDestino)
              }
            }}
            className="h-9 text-xs font-bold bg-[#E9530E] hover:bg-[#C5430A] text-white shadow-xs font-display"
          >
            <Flame className="w-3.5 h-3.5 mr-1.5 fill-white text-white" />
            Executar 1º da Fila
          </Button>
        </div>
      </div>

      {/* =========================================================================
          LINHA DE KPICARDS SOUYESS (Com a barra superior laranja de 3px)
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Pendências */}
        <div className="relative bg-white dark:bg-[#1A2240] rounded-xl p-5 border border-slate-200/90 dark:border-[#2E3A6E] shadow-2xs overflow-hidden transition-colors">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#E9530E]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#A8B0C9] font-display">
              Pendências Totais
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FEF1EA] dark:bg-[#E9530E]/20 text-[#E9530E] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-[#212B55] dark:text-[#F7F8FB] font-mono tabular-nums">
              {dados?.kpis.totalPendencias || 0}
            </span>
            <span className="text-xs text-slate-400 dark:text-[#A8B0C9]">itens requerem ação</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-[#A8B0C9] truncate">
            {dados?.kpis.totalPendencias === 0
              ? 'Tudo zerado! Parabéns 🎯'
              : `${dados?.kpis.urgentesHoje || 0} com prioridade alta hoje`}
          </p>
        </div>

        {/* KPI 2: Urgentes Hoje */}
        <div className="relative bg-white dark:bg-[#1A2240] rounded-xl p-5 border border-slate-200/90 dark:border-[#2E3A6E] shadow-2xs overflow-hidden transition-colors">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#E9530E]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 font-display">
              Urgentes Hoje
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-rose-600 dark:text-rose-400 font-mono tabular-nums">
              {dados?.kpis.urgentesHoje || 0}
            </span>
            <span className="text-xs text-slate-400 dark:text-[#A8B0C9]">ação imediata</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-[#A8B0C9] truncate">
            {dados?.kpis.urgentesHoje === 0
              ? 'Nenhum item travando a operação'
              : 'Prazos imediatos ou bloqueios'}
          </p>
        </div>

        {/* KPI 3: Concluídas Recentes */}
        <div className="relative bg-white dark:bg-[#1A2240] rounded-xl p-5 border border-slate-200/90 dark:border-[#2E3A6E] shadow-2xs overflow-hidden transition-colors">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#E9530E]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#A8B0C9] font-display">
              Resolvidas Hoje/Ciclo
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
              {dados?.kpis.concluidas7d || 0}
            </span>
            <span className="text-xs text-slate-400 dark:text-[#A8B0C9]">concluídos</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500 dark:text-[#A8B0C9] truncate">
            Marcadas como resolvidas por você
          </p>
        </div>

        {/* KPI 4: Foco Principal do Dia */}
        <div className="relative bg-white dark:bg-[#1A2240] rounded-xl p-5 border border-slate-200/90 dark:border-[#2E3A6E] shadow-2xs overflow-hidden transition-colors flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#E9530E]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#E9530E] dark:text-[#F19763] font-display">
              Foco do Dia
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#FEF1EA] dark:bg-[#E9530E]/20 text-[#E9530E] flex items-center justify-center">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-1">
            <p className="text-xs font-bold text-[#212B55] dark:text-[#F7F8FB] line-clamp-2 leading-snug font-sans">
              {dados?.kpis.focoPrincipal}
            </p>
          </div>
          <span className="text-[10px] text-slate-400 dark:text-[#A8B0C9] flex items-center gap-1 mt-1 font-mono">
            <Sparkles className="w-3 h-3 text-[#E9530E]" />
            Priorizado por impacto
          </span>
        </div>
      </div>

      {/* =========================================================================
          BARRA DE CONTROLE & FILTROS
          ========================================================================= */}
      <div className="bg-white dark:bg-[#1A2240] p-4 rounded-xl border border-slate-200/90 dark:border-[#2E3A6E] shadow-2xs flex flex-wrap items-center justify-between gap-3 transition-colors">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-500 dark:text-[#A8B0C9] flex items-center gap-1 font-display">
            <Filter className="w-3.5 h-3.5" />
            Severidade:
          </span>

          <button
            onClick={() => setFiltroSeveridade('todas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              filtroSeveridade === 'todas'
                ? 'bg-[#212B55] dark:bg-[#FEF1EA] text-white dark:text-[#11162B] border-transparent shadow-xs'
                : 'bg-white dark:bg-[#11162B] text-slate-600 dark:text-[#D3D7E5] border-slate-200 dark:border-[#2E3A6E] hover:bg-slate-50'
            }`}
          >
            Todas ({dados?.itens.length || 0})
          </button>

          <button
            onClick={() => setFiltroSeveridade('urgente')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 ${
              filtroSeveridade === 'urgente'
                ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                : 'bg-white dark:bg-[#11162B] text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/60 hover:bg-rose-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Urgentes Hoje ({dados?.totalUrgentes || 0})
          </button>

          <button
            onClick={() => setFiltroSeveridade('atencao')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 ${
              filtroSeveridade === 'atencao'
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-white dark:bg-[#11162B] text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/60 hover:bg-amber-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Atenção Esta Semana ({dados?.totalAtencao || 0})
          </button>

          <button
            onClick={() => setFiltroSeveridade('acompanhar')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border flex items-center gap-1.5 ${
              filtroSeveridade === 'acompanhar'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-white dark:bg-[#11162B] text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/60 hover:bg-blue-50'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Acompanhar ({dados?.totalAcompanhar || 0})
          </button>
        </div>

        {/* Checkbox Ocultar Concluídas */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOcultarConcluidas(!ocultarConcluidas)}
            className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-[#D3D7E5] hover:text-[#E9530E] dark:hover:text-[#F19763] cursor-pointer"
          >
            {ocultarConcluidas ? (
              <CheckSquare className="w-4 h-4 text-[#E9530E]" />
            ) : (
              <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            )}
            <span>Ocultar itens resolvidos</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          SEÇÕES DE TAREFAS AGRUPADAS POR SEVERIDADE
          ========================================================================= */}
      {itensFiltrados.length === 0 ? (
        <Card className="border border-dashed border-slate-300 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240] p-12 text-center rounded-2xl shadow-xs">
          <CardContent className="space-y-3 p-0">
            <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-xs">
              <PartyPopper className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-extrabold text-[#212B55] dark:text-[#F7F8FB] font-display">
              Nada pendente por aqui. Aproveite o dia! 🎉
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#A8B0C9] max-w-md mx-auto">
              Todas as pendências operacionais associadas ao seu papel no SouYess foram atendidas ou
              não há ações imediatas requeridas no momento.
            </p>
            {ocultarConcluidas && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOcultarConcluidas(false)}
                className="mt-2 text-xs font-semibold border-slate-200 dark:border-[#2E3A6E]"
              >
                Exibir itens já resolvidos
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* SEÇÃO 1: URGENTE — REQUER AÇÃO HOJE */}
          {(filtroSeveridade === 'todas' || filtroSeveridade === 'urgente') &&
            secaoUrgente.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-rose-200 dark:border-rose-950">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-pulse" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 font-display">
                      Urgente — Requer ação hoje ({secaoUrgente.length})
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-[#A8B0C9] font-mono">
                    Prioridade Máxima
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {secaoUrgente.map((item) => (
                    <CardItemMeuDia
                      key={item.id}
                      item={item}
                      onToggle={handleToggleConcluido}
                      onNavegar={handleIrParaAcao}
                    />
                  ))}
                </div>
              </div>
            )}

          {/* SEÇÃO 2: ATENÇÃO ESTA SEMANA */}
          {(filtroSeveridade === 'todas' || filtroSeveridade === 'atencao') &&
            secaoAtencao.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-amber-200 dark:border-amber-950">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 font-display">
                      Atenção esta semana ({secaoAtencao.length})
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-[#A8B0C9] font-mono">
                    Médio Prazo
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {secaoAtencao.map((item) => (
                    <CardItemMeuDia
                      key={item.id}
                      item={item}
                      onToggle={handleToggleConcluido}
                      onNavegar={handleIrParaAcao}
                    />
                  ))}
                </div>
              </div>
            )}

          {/* SEÇÃO 3: ACOMPANHAR / MELHORIA CONTÍNUA */}
          {(filtroSeveridade === 'todas' || filtroSeveridade === 'acompanhar') &&
            secaoAcompanhar.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-1 border-b border-blue-200 dark:border-blue-950">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <h2 className="text-sm font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 font-display">
                      Acompanhar & Reaproveitamento ({secaoAcompanhar.length})
                    </h2>
                  </div>
                  <span className="text-[11px] text-slate-400 dark:text-[#A8B0C9] font-mono">
                    Fluxo Contínuo
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {secaoAcompanhar.map((item) => (
                    <CardItemMeuDia
                      key={item.id}
                      item={item}
                      onToggle={handleToggleConcluido}
                      onNavegar={handleIrParaAcao}
                    />
                  ))}
                </div>
              </div>
            )}
        </div>
      )}
    </div>
  )
}

// =========================================================================
// SUBCOMPONENTE: CARD ITEM MEU DIA COM STATUSCHIP & BOTÃO DE AÇÃO DIRETO
// =========================================================================
interface CardItemMeuDiaProps {
  item: ItemMeuDia
  onToggle: (item: ItemMeuDia, e: React.MouseEvent) => void
  onNavegar: (rota: string) => void
}

function CardItemMeuDia({ item, onToggle, onNavegar }: CardItemMeuDiaProps) {
  const isConcluido = !!item.concluido

  // Estilo do StatusChip com bullet colorido
  const statusBadge = useMemo(() => {
    if (isConcluido) {
      return {
        label: 'Resolvido',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
        dot: 'bg-emerald-500',
      }
    }
    if (item.severidade === 'urgente') {
      return {
        label: 'Urgente',
        bg: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
        dot: 'bg-rose-500',
      }
    }
    if (item.severidade === 'atencao') {
      return {
        label: 'Atenção',
        bg: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
        dot: 'bg-amber-500',
      }
    }
    return {
      label: 'Acompanhar',
      bg: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
      dot: 'bg-blue-500',
    }
  }, [item.severidade, isConcluido])

  return (
    <div
      onClick={() => onNavegar(item.rotaDestino)}
      className={`group relative rounded-xl border p-4 sm:p-5 transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-md ${
        isConcluido
          ? 'bg-slate-50/70 dark:bg-[#1A2240]/40 border-slate-200 dark:border-[#2E3A6E]/40 opacity-75'
          : item.severidade === 'urgente'
            ? 'bg-white dark:bg-[#1A2240] border-rose-200 dark:border-rose-900/60 hover:border-[#E9530E]'
            : 'bg-white dark:bg-[#1A2240] border-slate-200/90 dark:border-[#2E3A6E] hover:border-[#E9530E]'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5">
        {/* Lado Esquerdo: Checkbox + Conteúdo */}
        <div className="flex items-start gap-3.5 flex-1 min-w-0">
          {/* Checkbox de Interação */}
          <button
            type="button"
            onClick={(e) => onToggle(item, e)}
            className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center shrink-0 border transition-all ${
              isConcluido
                ? 'bg-emerald-600 border-emerald-600 text-white'
                : 'border-slate-300 dark:border-[#2E3A6E] hover:border-[#E9530E] bg-white dark:bg-[#11162B]'
            }`}
            title={isConcluido ? 'Marcar como não resolvido' : 'Marcar como resolvido'}
          >
            {isConcluido && <Check className="w-3.5 h-3.5 stroke-[3]" />}
          </button>

          <div className="space-y-1 min-w-0 flex-1">
            {/* Topo do Item: Tag de Módulo + StatusChip com Bullet + Data Mono */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-[#11162B] text-slate-700 dark:text-[#D3D7E5] border border-slate-200 dark:border-[#2E3A6E] font-display">
                {item.moduloLabel}
              </span>

              {/* StatusChip com Bullet Colorido */}
              <span
                className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge.bg} font-display`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                {statusBadge.label}
              </span>

              {item.dataLimiteLabel && (
                <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-[#A8B0C9] tabular-nums flex items-center gap-1">
                  <Clock className="w-3 h-3 text-slate-400" />
                  {item.dataLimiteLabel}
                </span>
              )}
            </div>

            {/* Título da Ação em Linguagem Direta */}
            <h3
              className={`text-sm sm:text-base font-bold tracking-tight text-[#212B55] dark:text-[#F7F8FB] font-sans group-hover:text-[#E9530E] dark:group-hover:text-[#F19763] transition-colors ${
                isConcluido ? 'line-through text-slate-400 dark:text-slate-500' : ''
              }`}
            >
              {item.tituloAcao}
            </h3>

            {/* Contexto da Ação */}
            <p className="text-xs font-semibold text-[#E9530E] dark:text-[#F19763] font-display">
              {item.contexto}
            </p>

            {/* Detalhe Explicativo */}
            {item.detalhe && (
              <p className="text-xs text-slate-600 dark:text-[#A8B0C9] line-clamp-2 leading-relaxed font-sans">
                {item.detalhe}
              </p>
            )}
          </div>
        </div>

        {/* Lado Direito: Botão de Ação Direta de 1-Clique */}
        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onNavegar(item.rotaDestino)
            }}
            className={`h-8 text-xs font-bold font-display shadow-2xs transition-all ${
              isConcluido
                ? 'bg-slate-200 dark:bg-[#2E3A6E] text-slate-700 dark:text-[#F7F8FB] hover:bg-slate-300'
                : 'bg-[#E9530E] hover:bg-[#C5430A] text-white shadow-xs'
            }`}
          >
            <span>{isConcluido ? 'Rever na Tela' : 'Resolver Agora'}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1 transition-transform group-hover:translate-x-0.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}
