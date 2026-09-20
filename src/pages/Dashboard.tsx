import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { usePeriod } from '@/contexts/PeriodContext'
import {
  Briefcase,
  Users,
  CalendarCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  ArrowRight,
  Sparkles,
  BarChart3,
  Clock,
  ChevronRight,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { RecordModel } from 'pocketbase'

export default function Dashboard() {
  const { periodLabel } = usePeriod()
  const navigate = useNavigate()

  const [vagas, setVagas] = useState<RecordModel[]>([])
  const [candidatos, setCandidatos] = useState<RecordModel[]>([])
  const [pipelineRecords, setPipelineRecords] = useState<RecordModel[]>([])
  const [entrevistasList, setEntrevistasList] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    try {
      const [vList, cList, pList, eList] = await Promise.all([
        pb.collection('vagas').getFullList({ sort: '-created' }),
        pb.collection('candidatos').getFullList({ sort: '-created', expand: 'vaga' }),
        pb.collection('pipeline').getFullList({ sort: '-updated', expand: 'candidato,vaga' }),
        pb.collection('entrevistas').getFullList({ sort: 'data_hora', expand: 'candidato,vaga' }),
      ])
      setVagas(vList)
      setCandidatos(cList)
      setPipelineRecords(pList)
      setEntrevistasList(eList)
    } catch (err) {
      console.error('Falha ao carregar dados do dashboard', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Realtime
  useRealtime('vagas', () => fetchData())
  useRealtime('candidatos', () => fetchData())
  useRealtime('pipeline', () => fetchData())
  useRealtime('entrevistas', () => fetchData())

  // Computations
  const vagasAtivas = useMemo(() => vagas.filter((v) => v.status === 'Ativa').length, [vagas])
  const candidatosEmAnalise = useMemo(
    () =>
      candidatos.filter(
        (c) => c.status !== 'Aprovado' && c.status !== 'Recusado' && c.status !== 'Arquivado',
      ).length,
    [candidatos],
  )

  const entrevistasMarcadas = useMemo(() => {
    if (entrevistasList.length > 0) {
      return entrevistasList.filter((e) => e.status === 'Agendada').length
    }
    return candidatos.filter(
      (c) => c.status === 'Entrevista com RH' || c.status === 'Entrevista técnica',
    ).length
  }, [entrevistasList, candidatos])

  const taxaPreenchimento = useMemo(() => {
    if (vagas.length === 0) return 0
    const preenchidas = vagas.filter((v) => v.status === 'Preenchida').length
    return Math.round((preenchidas / vagas.length) * 100)
  }, [vagas])

  // Pipeline distribution for the stacked chart
  const pipelineStats = useMemo(() => {
    const stages = [
      { key: 'Triagem', label: 'Triagem', color: 'bg-slate-400', hex: '#94A3B8' },
      { key: 'Entrevista com RH', label: 'Entrevista RH', color: 'bg-blue-500', hex: '#3B82F6' },
      {
        key: 'Entrevista técnica',
        label: 'Entrevista Técnica',
        color: 'bg-amber-500',
        hex: '#F59E0B',
      },
      {
        key: 'Match técnico/comportamental (IA)',
        label: 'Match IA',
        color: 'bg-purple-600',
        hex: '#7C3AED',
      },
      { key: 'Proposta', label: 'Proposta', color: 'bg-sky-500', hex: '#0EA5E9' },
      { key: 'Aprovado', label: 'Aprovado', color: 'bg-emerald-500', hex: '#16A34A' },
      { key: 'Recusado', label: 'Recusado', color: 'bg-rose-500', hex: '#DC2626' },
    ]

    const counts: Record<string, number> = {}
    stages.forEach((s) => {
      counts[s.key] = 0
    })

    candidatos.forEach((c) => {
      if (counts[c.status] !== undefined) {
        counts[c.status]++
      } else {
        counts['Triagem']++
      }
    })

    const total = candidatos.length || 1
    return stages.map((s) => ({
      ...s,
      count: counts[s.key] || 0,
      percentage: Math.round(((counts[s.key] || 0) / total) * 100),
    }))
  }, [candidatos])

  // Channels distribution (Origin)
  const canais = useMemo(
    () => [
      { nome: 'LinkedIn', count: 42, color: '#0A66C2' },
      { nome: 'Indicação interna', count: 28, color: '#10B981' },
      { nome: 'Site da empresa', count: 18, color: '#6366F1' },
      { nome: 'Banco de talentos', count: 9, color: '#F59E0B' },
      { nome: 'Outros canais', count: 3, color: '#94A3B8' },
    ],
    [],
  )

  // Upcoming interviews
  const proximasEntrevistas = useMemo(() => {
    const list = candidatos.filter(
      (c) =>
        c.status === 'Entrevista com RH' ||
        c.status === 'Entrevista técnica' ||
        c.status === 'Match técnico/comportamental (IA)',
    )
    return list.slice(0, 5)
  }, [candidatos])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-6">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 p-6">
            <Skeleton className="h-6 w-48 mb-4" />
            <Skeleton className="h-48 w-full" />
          </Card>
          <Card className="p-6">
            <Skeleton className="h-6 w-36 mb-4" />
            <Skeleton className="h-48 w-full" />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in-50 duration-300">
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase font-bold tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
              Visão Executiva
            </span>
            <span className="text-xs text-slate-500 font-medium">· {periodLabel}</span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Acompanhe em tempo real as vagas estratégicas, o ritmo de entrevistas e a aderência de
            talentos via IA.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Link to="/banco-talentos">
            <Button
              variant="outline"
              className="h-9 text-xs border-amber-300 bg-amber-50/70 text-amber-900 hover:bg-amber-100 font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-600 fill-amber-500" />
              Banco de Talentos
            </Button>
          </Link>

          <Link to="/relatorio-executivo">
            <Button
              variant="outline"
              className="h-9 text-xs border-slate-200 text-slate-700 hover:text-blue-600 font-semibold"
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Relatório Executivo
            </Button>
          </Link>

          <Link to="/vagas" className="flex-1 sm:flex-initial">
            <Button
              variant="outline"
              className="w-full sm:w-auto h-9 text-xs border-slate-300 font-medium text-slate-700"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Nova Vaga
            </Button>
          </Link>
          <Link to="/candidatos" className="flex-1 sm:flex-initial">
            <Button className="w-full sm:w-auto h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-xs">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Adicionar Candidato
            </Button>
          </Link>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Vagas Ativas */}
        <Card
          onClick={() => navigate('/vagas')}
          className="p-5 border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Vagas Ativas
            </span>
            <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
              {vagasAtivas}
            </span>
            <span className="text-xs font-medium text-slate-500">de {vagas.length} totais</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+12% vs. mês anterior</span>
          </div>
        </Card>

        {/* Card 2: Candidatos em Análise */}
        <Card
          onClick={() => navigate('/candidatos')}
          className="p-5 border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Candidatos no Funil
            </span>
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
              {candidatosEmAnalise}
            </span>
            <span className="text-xs font-medium text-slate-500">em avaliação</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>+18% no período</span>
          </div>
        </Card>

        {/* Card 3: Entrevistas Marcadas (linka para a nova tela de Entrevistas) */}
        <Card
          onClick={() => navigate('/entrevistas')}
          className="p-5 border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Entrevistas na Semana
            </span>
            <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <CalendarCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
              {entrevistasMarcadas}
            </span>
            <span className="text-xs font-medium text-slate-500">agendadas</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-600 font-medium">
            <ArrowRight className="w-3.5 h-3.5" />
            <span>Ver calendário e lembretes</span>
          </div>
        </Card>

        {/* Card 4: Taxa de Preenchimento */}
        <Card
          onClick={() => navigate('/vagas')}
          className="p-5 border-slate-200 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Taxa de Preenchimento
            </span>
            <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 tabular-nums">
              {taxaPreenchimento}%
            </span>
            <span className="text-xs font-medium text-slate-500">meta: 80%</span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Dentro da meta trimestral</span>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fluxo de candidatos por estágio (Stacked representation) */}
        <Card className="lg:col-span-2 border-slate-200 shadow-xs p-6 bg-white">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Fluxo de Candidatos por Estágio
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Volume atual distribuído pelas etapas do processo de seleção
              </CardDescription>
            </div>
            <Link
              to="/pipeline"
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
            >
              Ver pipeline completo
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Stacked bar visualization */}
          <div className="mt-6">
            <div className="h-6 w-full rounded-lg overflow-hidden flex bg-slate-100">
              {pipelineStats.map(
                (st) =>
                  st.count > 0 && (
                    <div
                      key={st.key}
                      style={{ width: `${Math.max(st.percentage, 8)}%`, backgroundColor: st.hex }}
                      className="h-full relative group transition-all duration-300 hover:opacity-90"
                      title={`${st.label}: ${st.count} candidatos (${st.percentage}%)`}
                    />
                  ),
              )}
            </div>

            {/* Stages Legend Breakdown */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {pipelineStats.map((st) => (
                <div
                  key={st.key}
                  onClick={() => navigate(`/pipeline`)}
                  className="p-3 rounded-lg border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: st.hex }}
                    />
                    <span className="text-xs font-medium text-slate-600 truncate">{st.label}</span>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-lg font-bold text-slate-900 tabular-nums">
                      {st.count}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-400">
                      {st.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Vagas por Canal (Donut / Progress breakdown) */}
        <Card className="border-slate-200 shadow-xs p-6 bg-white">
          <CardHeader className="p-0 pb-4 border-b border-slate-100">
            <CardTitle className="text-base font-bold text-slate-900">
              Origem dos Talentos
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Distribuição por canal de captação
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0 pt-6 space-y-4">
            {canais.map((c) => (
              <div key={c.nome} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{c.nome}</span>
                  <span className="font-semibold text-slate-900 tabular-nums">{c.count}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${c.count}%`, backgroundColor: c.color }}
                  />
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>LinkedIn e Indicações somam mais de 70% das contratações finais.</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Próximas Entrevistas & Atalhos Rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Próximas Entrevistas List */}
        <Card className="lg:col-span-2 border-slate-200 shadow-xs bg-white">
          <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-900">
                Próximas Entrevistas Agendadas
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Entrevistas da semana com lembretes automáticos e avaliação pós-entrevista
              </CardDescription>
            </div>
            <Link to="/entrevistas">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800"
              >
                Ver calendário
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>

          <CardContent className="p-0 divide-y divide-slate-100">
            {proximasEntrevistas.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Nenhuma entrevista agendada para o período.
              </div>
            ) : (
              proximasEntrevistas.map((cand) => (
                <div
                  key={cand.id}
                  onClick={() => navigate(`/candidatos/${cand.id}`)}
                  className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between cursor-pointer gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xs shrink-0 border border-slate-200">
                      {cand.nome
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .substring(0, 2)
                        .toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate hover:text-blue-600 transition-colors">
                        {cand.nome}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {cand.expand?.vaga?.titulo || 'Vaga Geral'} ·{' '}
                        {cand.cargo_atual || 'Candidato'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      variant="outline"
                      className={`text-[11px] font-medium border-0 ${
                        cand.status === 'Entrevista técnica'
                          ? 'bg-amber-50 text-amber-700'
                          : cand.status === 'Entrevista com RH'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {cand.status}
                    </Badge>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* AI & Quick Insights */}
        <Card className="border-slate-200 shadow-xs bg-linear-to-br from-blue-900 via-slate-900 to-slate-950 text-white p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-semibold text-blue-300 uppercase tracking-wider">
                Gestor de Talentos (IA)
              </span>
            </div>

            <h3 className="text-lg font-bold text-white tracking-tight leading-snug">
              Otimize sua triagem com raciocínio analítico
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed">
              Nosso agente analisa automaticamente a compatibilidade entre o currículo dos
              candidatos e os requisitos críticos das vagas abertas.
            </p>

            <div className="bg-white/10 rounded-lg p-3.5 border border-white/10 text-xs text-slate-200 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-blue-200">
                <Sparkles className="w-3.5 h-3.5 text-blue-300" />
                <span>Sugestão do Agente:</span>
              </div>
              <p className="text-[11px] text-slate-300">
                2 candidatos possuem aderência superior a 85% para a vaga de{' '}
                <span className="font-medium text-white">Desenvolvedor Backend Sênior</span>.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <Link to="/chat">
              <Button className="w-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold h-9 shadow-sm">
                Abrir Chat com IA
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
