import { useState, useMemo } from 'react'
import {
  TrendingUp,
  Sparkles,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Clock,
  Building2,
  DollarSign,
  Star,
  Award,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type {
  PrestadorRanqueado,
  ResumoComparativoCusto,
  TierRenovacao,
} from '@/services/financeiroConsolidado'

interface SecaoComparativoCustoProps {
  prestadores: PrestadorRanqueado[]
  resumo: ResumoComparativoCusto
  horizonteMeses: number
}

type ColunaOrdenacao =
  | 'nomeFantasia'
  | 'valorMensal'
  | 'valorHora160h'
  | 'ultimaAvaliacaoNota'
  | 'custoPorPonto'
  | 'tierRenovacao'
  | 'diasParaVencerContrato'

type DirecaoOrdenacao = 'asc' | 'desc'

export function SecaoComparativoCusto({
  prestadores,
  resumo,
  horizonteMeses,
}: SecaoComparativoCustoProps) {
  const [colunaOrdenacao, setColunaOrdenacao] = useState<ColunaOrdenacao>('custoPorPonto')
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<DirecaoOrdenacao>('asc')
  const [filtroTier, setFiltroTier] = useState<string>('todos')
  const [apenasVencendo30, setApenasVencendo30] = useState<boolean>(false)
  const [prestadorHover, setPrestadorHover] = useState<string | null>(null)

  const formatarMoeda = (val: number) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  const alternarOrdenacao = (coluna: ColunaOrdenacao) => {
    if (colunaOrdenacao === coluna) {
      setDirecaoOrdenacao((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setColunaOrdenacao(coluna)
      // Para custo por ponto e dias, padrão asc (menor é melhor/mais urgente). Para valor e nota, desc é mais comum
      if (coluna === 'custoPorPonto' || coluna === 'diasParaVencerContrato') {
        setDirecaoOrdenacao('asc')
      } else {
        setDirecaoOrdenacao('desc')
      }
    }
  }

  // Filtragem e Ordenação
  const prestadoresProcessados = useMemo(() => {
    let lista = [...prestadores]

    if (filtroTier !== 'todos') {
      lista = lista.filter((p) => p.tierRenovacao === filtroTier)
    }

    if (apenasVencendo30) {
      lista = lista.filter((p) => p.contratoVencendoEm30Dias)
    }

    lista.sort((a, b) => {
      let valA: string | number = a[colunaOrdenacao] ?? ''
      let valB: string | number = b[colunaOrdenacao] ?? ''

      if (colunaOrdenacao === 'diasParaVencerContrato') {
        valA = a.diasParaVencerContrato ?? 99999
        valB = b.diasParaVencerContrato ?? 99999
      }

      if (typeof valA === 'string' && typeof valB === 'string') {
        return direcaoOrdenacao === 'asc'
          ? valA.localeCompare(valB, 'pt-BR')
          : valB.localeCompare(valA, 'pt-BR')
      }

      const numA = Number(valA) || 0
      const numB = Number(valB) || 0
      return direcaoOrdenacao === 'asc' ? numA - numB : numB - numA
    })

    return lista
  }, [prestadores, filtroTier, apenasVencendo30, colunaOrdenacao, direcaoOrdenacao])

  const renderBadgeTier = (tier: TierRenovacao) => {
    switch (tier) {
      case 'Renovar':
        return (
          <Badge className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border-emerald-300 font-semibold gap-1 text-[11px]">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            Renovar
          </Badge>
        )
      case 'Renegociar':
        return (
          <Badge className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 font-semibold gap-1 text-[11px]">
            <TrendingUp className="w-3 h-3 text-amber-700" />
            Renegociar
          </Badge>
        )
      case 'Reavaliar':
        return (
          <Badge className="bg-red-100 hover:bg-red-200 text-red-800 border-red-300 font-semibold gap-1 text-[11px]">
            <AlertTriangle className="w-3 h-3 text-red-700" />
            Reavaliar
          </Badge>
        )
    }
  }

  // Parâmetros para o Gráfico de Dispersão Normalizado (Valor-Hora vs. Nota de Avaliação)
  // X: Nota (escala 7 a 10)
  // Y: Valor-Hora (escala 0 a maxHora + 10%)
  const maxHora = useMemo(() => {
    if (prestadores.length === 0) return 200
    const max = Math.max(...prestadores.map((p) => p.valorHora160h))
    return Math.max(Math.ceil(max * 1.15), 180)
  }, [prestadores])

  const minNotaPlot = 7.0
  const maxNotaPlot = 10.0

  return (
    <div className="space-y-6">
      {/* 1. RESUMO EXECUTIVO NO TOPO */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Valor-Hora Médio */}
        <Card className="border-slate-200 shadow-xs bg-linear-to-br from-white to-slate-50/70">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Valor-Hora Médio
              </span>
              <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1">
              {formatarMoeda(resumo.valorHoraMedio)}
              <span className="text-xs font-medium text-slate-500">/h</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Mediana: {formatarMoeda(resumo.valorHoraMediana)}/h</span>
              <span className="text-slate-400">Base: 160h/mês</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 2: Nota Média de Avaliação */}
        <Card className="border-slate-200 shadow-xs bg-linear-to-br from-white to-slate-50/70">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Nota Média do Portfólio
              </span>
              <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 mt-1 flex items-baseline gap-2">
              {resumo.notaMediaGeral.toFixed(1)}
              <span className="text-xs font-medium text-slate-500">/ 10.0</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Índice médio: {formatarMoeda(resumo.custoPorPontoMedio)}/ponto</span>
              <span className="text-emerald-700 font-semibold">{resumo.totalRenovar} apto(s)</span>
            </div>
          </CardContent>
        </Card>

        {/* KPI 3: Potencial de Economia (Mediana) */}
        <Card className="border-emerald-200/80 shadow-xs bg-linear-to-br from-emerald-50/40 via-white to-emerald-50/20">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                Potencial de Economia
              </span>
              <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {formatarMoeda(resumo.potencialEconomiaMensal)}
              <span className="text-xs font-medium text-emerald-600">/mês</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-emerald-900 leading-tight">
              Se taxas acima da mediana forem renegociadas:{' '}
              <span className="font-bold">{formatarMoeda(resumo.potencialEconomiaHorizonte)}</span>{' '}
              no horizonte de {horizonteMeses}m.
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: Radar de Renovação (Semáforo) */}
        <Card className="border-slate-200 shadow-xs bg-linear-to-br from-white to-slate-50/70">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Radar de Decisões
              </span>
              <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-black text-slate-900 mt-1 flex items-center gap-1.5 flex-wrap">
              <span className="text-emerald-700">{resumo.totalRenovar} Renovar</span>
              <span className="text-slate-300">•</span>
              <span className="text-amber-700">{resumo.totalRenegociar} Negociar</span>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>{resumo.totalReavaliar} em reavaliação</span>
              {resumo.prestadoresVencendo30Dias > 0 ? (
                <span className="text-amber-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {resumo.prestadoresVencendo30Dias} vence(m) ≤ 30d
                </span>
              ) : (
                <span className="text-slate-400">Nenhum vence ≤ 30d</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 2. GRÁFICO COMPARATIVO VISUAL (DISPERSÃO VALOR-HORA × NOTA DE AVALIAÇÃO COM OUTLIERS) */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-md bg-purple-100 text-purple-700">
                  <Sparkles className="w-4 h-4" />
                </span>
                <CardTitle className="text-sm font-bold text-slate-900">
                  Matriz de Dispersão: Valor-Hora × Nota de Avaliação
                </CardTitle>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Visualização de quadrantes para identificar outliers e prestadores com máxima
                eficiência de custos.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Excelente Custo-Benefício
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                A Renegociar / Mediano
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                Média do Portfólio
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5">
          {/* Área do Gráfico Interativo com Coordenadas Normalizadas */}
          <div className="relative w-full h-[280px] bg-slate-50/50 rounded-xl border border-slate-200/80 p-4 select-none">
            {/* Grid Linhas de Referência */}
            <div className="absolute inset-x-12 top-6 bottom-10 flex flex-col justify-between pointer-events-none">
              <div className="border-b border-dashed border-slate-200 w-full flex justify-end">
                <span className="text-[9px] text-slate-400 font-mono -mt-3.5">R$ {maxHora}/h</span>
              </div>
              <div className="border-b border-dashed border-slate-200 w-full flex justify-end">
                <span className="text-[9px] text-slate-400 font-mono -mt-3.5">
                  R$ {Math.round(maxHora * 0.66)}/h
                </span>
              </div>
              <div className="border-b border-dashed border-slate-200 w-full flex justify-end">
                <span className="text-[9px] text-slate-400 font-mono -mt-3.5">
                  R$ {Math.round(maxHora * 0.33)}/h
                </span>
              </div>
              <div className="border-b border-slate-300 w-full flex justify-end">
                <span className="text-[9px] text-slate-400 font-mono -mt-3.5">R$ 0/h</span>
              </div>
            </div>

            {/* Linha de Referência da Média do Portfólio (Horizontal: Valor-Hora Médio) */}
            {resumo.valorHoraMedio > 0 && (
              <div
                className="absolute inset-x-12 border-t-2 border-dotted border-blue-400 pointer-events-none z-0"
                style={{
                  bottom: `${40 + (resumo.valorHoraMedio / maxHora) * (280 - 70) * 0.85}px`,
                }}
              >
                <span className="absolute left-2 -top-4 text-[9px] font-bold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                  Média Valor-Hora: {formatarMoeda(resumo.valorHoraMedio)}/h
                </span>
              </div>
            )}

            {/* Quadrante Ideal de Destaque (Canto inferior direito: Alta nota, Baixo custo) */}
            <div className="absolute right-12 bottom-10 w-1/3 h-1/2 bg-emerald-500/5 rounded-tl-xl border-t border-l border-emerald-300/40 pointer-events-none flex items-start justify-end p-2">
              <span className="text-[9px] font-bold text-emerald-800/60 uppercase tracking-wider">
                Zona de Ouro (Custo-Benefício Máximo)
              </span>
            </div>

            {/* Pontos de Prestadores Plotados */}
            <TooltipProvider>
              {prestadores.map((p) => {
                // Cálculo de posição X (Nota 7.0 a 10.0 mapeada para 0% a 100%)
                const clampedNota = Math.max(
                  minNotaPlot,
                  Math.min(maxNotaPlot, p.ultimaAvaliacaoNota),
                )
                const pctX = ((clampedNota - minNotaPlot) / (maxNotaPlot - minNotaPlot)) * 82 + 10

                // Cálculo de posição Y (0 a maxHora mapeada de baixo para cima)
                const pctY = (p.valorHora160h / maxHora) * 78 + 12
                const isHovered = prestadorHover === p.id

                return (
                  <Tooltip key={p.id}>
                    <TooltipTrigger asChild>
                      <div
                        onMouseEnter={() => setPrestadorHover(p.id)}
                        onMouseLeave={() => setPrestadorHover(null)}
                        className={`absolute cursor-pointer transition-all duration-300 transform -translate-x-1/2 translate-y-1/2 flex items-center justify-center rounded-full shadow-md z-10 ${
                          p.isMelhorCustoBeneficio
                            ? 'w-9 h-9 bg-emerald-600 text-white ring-4 ring-emerald-200 animate-pulse'
                            : p.isPiorCustoBeneficio
                              ? 'w-8 h-8 bg-amber-600 text-white ring-2 ring-amber-200'
                              : 'w-7 h-7 bg-blue-600 text-white hover:scale-125'
                        } ${isHovered ? 'scale-125 ring-4 ring-blue-300 z-20' : ''}`}
                        style={{
                          left: `${pctX}%`,
                          bottom: `${pctY}%`,
                        }}
                      >
                        {p.isMelhorCustoBeneficio ? (
                          <Award className="w-4 h-4 text-white" />
                        ) : (
                          <span className="text-[10px] font-black">
                            {p.nomeFantasia.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="bg-slate-900 text-white p-3 rounded-lg shadow-xl border border-slate-800 max-w-xs text-xs space-y-1.5">
                      <div className="flex items-center justify-between gap-2 border-b border-slate-700 pb-1">
                        <span className="font-bold text-white text-sm">{p.nomeFantasia}</span>
                        {p.isMelhorCustoBeneficio && (
                          <Badge className="bg-emerald-500 text-white text-[9px] font-bold">
                            Top Custo-Benefício
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-slate-300">
                        <div>
                          Valor Mensal:{' '}
                          <span className="font-bold text-white">
                            {formatarMoeda(p.valorMensal)}
                          </span>
                        </div>
                        <div>
                          Valor-Hora:{' '}
                          <span className="font-bold text-white">
                            {formatarMoeda(p.valorHora160h)}/h
                          </span>
                        </div>
                        <div>
                          Nota Avaliação:{' '}
                          <span className="font-bold text-amber-400">
                            ★ {p.ultimaAvaliacaoNota.toFixed(1)}
                          </span>
                        </div>
                        <div>
                          Custo por Ponto:{' '}
                          <span className="font-bold text-emerald-400">
                            {formatarMoeda(p.custoPorPonto)}/pt
                          </span>
                        </div>
                      </div>
                      <div className="pt-1 text-[10px] text-slate-400 border-t border-slate-800 flex items-center justify-between">
                        <span>Decisão: {p.tierRenovacao}</span>
                        <span>
                          {p.contratoVencendoEm30Dias
                            ? 'Vence em ≤ 30 dias'
                            : p.diasParaVencerContrato
                              ? `Vence em ${p.diasParaVencerContrato} dias`
                              : 'Vigente'}
                        </span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                )
              })}
            </TooltipProvider>

            {/* Eixo X: Nota */}
            <div className="absolute inset-x-12 bottom-1 flex justify-between text-[10px] font-semibold text-slate-500">
              <span>Nota 7.0 (Mínima avaliada)</span>
              <span>Nota 8.0</span>
              <span>Nota 9.0</span>
              <span>Nota 10.0 (Excelência)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. TABELA / RANKING COMPLETO DE PRESTADORES */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-bold text-slate-900">
                  Ranking de Custo-Benefício e Renovação de Contratos
                </CardTitle>
                <Badge variant="outline" className="text-slate-600 bg-white">
                  {prestadoresProcessados.length} prestador(es)
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-500 mt-1">
                Relação entre valor-hora e nota técnica com critérios objetivos para orientar
                renovações e renegociações.
              </CardDescription>
            </div>

            {/* Filtros Rápidos */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setFiltroTier('todos')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filtroTier === 'todos'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTier('Renovar')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filtroTier === 'Renovar'
                      ? 'bg-emerald-600 text-white'
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  Renovar ({resumo.totalRenovar})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTier('Renegociar')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filtroTier === 'Renegociar'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-700 hover:bg-amber-50'
                  }`}
                >
                  Renegociar ({resumo.totalRenegociar})
                </button>
                <button
                  type="button"
                  onClick={() => setFiltroTier('Reavaliar')}
                  className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                    filtroTier === 'Reavaliar'
                      ? 'bg-red-600 text-white'
                      : 'text-red-700 hover:bg-red-50'
                  }`}
                >
                  Reavaliar ({resumo.totalReavaliar})
                </button>
              </div>

              <Button
                variant={apenasVencendo30 ? 'default' : 'outline'}
                size="sm"
                onClick={() => setApenasVencendo30((prev) => !prev)}
                className={`h-8 text-xs gap-1.5 ${
                  apenasVencendo30
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'text-slate-700 hover:text-slate-900 border-slate-200'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Vencendo ≤ 30 dias
                {resumo.prestadoresVencendo30Dias > 0 && (
                  <Badge className="bg-amber-100 text-amber-900 text-[10px] px-1.5 py-0 h-4 ml-0.5">
                    {resumo.prestadoresVencendo30Dias}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* TABELA RESPONSIVA */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold select-none">
                {/* Prestador */}
                <th
                  onClick={() => alternarOrdenacao('nomeFantasia')}
                  className="p-3.5 pl-5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Prestador PJ</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Valor Mensal Atual */}
                <th
                  onClick={() => alternarOrdenacao('valorMensal')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Valor Mensal Atual</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Valor-Hora (160h) */}
                <th
                  onClick={() => alternarOrdenacao('valorHora160h')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Valor-Hora (160h/mês)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Nota de Avaliação */}
                <th
                  onClick={() => alternarOrdenacao('ultimaAvaliacaoNota')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Nota Avaliação (0-10)</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Custo por Ponto (Índice de Custo-Benefício) */}
                <th
                  onClick={() => alternarOrdenacao('custoPorPonto')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5 text-indigo-700">
                    <span>Custo por Ponto</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-3 h-3 text-indigo-500 inline cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="text-xs bg-slate-900 text-white max-w-xs">
                          Cálculo: Valor-hora ÷ Nota média de avaliação. Quanto MENOR o valor por
                          ponto, mais econômico e vantajoso é o prestador.
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <ArrowUpDown className="w-3 h-3 text-indigo-500" />
                  </div>
                </th>

                {/* Decisão / Tier de Renovação */}
                <th
                  onClick={() => alternarOrdenacao('tierRenovacao')}
                  className="p-3.5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Decisão de Renovação</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* Vencimento do Contrato */}
                <th
                  onClick={() => alternarOrdenacao('diasParaVencerContrato')}
                  className="p-3.5 pr-5 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Vencimento do Contrato</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {prestadoresProcessados.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs text-slate-400">
                    Nenhum prestador encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                prestadoresProcessados.map((p, index) => {
                  return (
                    <tr
                      key={p.id}
                      onMouseEnter={() => setPrestadorHover(p.id)}
                      onMouseLeave={() => setPrestadorHover(null)}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        p.isMelhorCustoBeneficio ? 'bg-emerald-50/30' : ''
                      } ${p.contratoVencendoEm30Dias ? 'border-l-4 border-l-amber-500' : ''}`}
                    >
                      {/* Prestador */}
                      <td className="p-3.5 pl-5">
                        <div className="flex items-start gap-2.5">
                          <span className="font-mono text-slate-400 text-[10px] mt-0.5">
                            #{index + 1}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <a
                                href={`/pessoas/${p.id}`}
                                className="font-bold text-slate-900 text-xs hover:text-blue-600 hover:underline transition-colors flex items-center gap-1"
                                title="Ver ficha unificada da pessoa"
                              >
                                {p.nomeFantasia}
                                <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                              </a>
                              {p.isMelhorCustoBeneficio && (
                                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] gap-1 py-0 h-4">
                                  <Award className="w-2.5 h-2.5" />
                                  Melhor custo-benefício
                                </Badge>
                              )}
                              {p.isPiorCustoBeneficio && (
                                <Badge
                                  variant="outline"
                                  className="border-amber-300 bg-amber-50 text-amber-800 text-[10px] py-0 h-4"
                                >
                                  Custo/ponto elevado
                                </Badge>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{p.areaAtuacao || 'Serviços Especializados'}</span>
                              <span>•</span>
                              <span>CNPJ: {p.cnpj}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Valor Mensal Atual */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-slate-900">
                          {formatarMoeda(p.valorMensal)}
                        </div>
                        <span className="text-[10px] text-slate-400">recorrente mensal</span>
                      </td>

                      {/* Valor-Hora (160h) */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-800">
                          {formatarMoeda(p.valorHora160h)}
                          <span className="text-[10px] text-slate-500 font-normal">/h</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {p.valorHora160h > resumo.valorHoraMediana ? (
                            <span className="text-amber-600 font-medium">
                              +{formatarMoeda(p.valorHora160h - resumo.valorHoraMediana)} acima da
                              mediana
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-medium">
                              Na mediana ou abaixo
                            </span>
                          )}
                        </span>
                      </td>

                      {/* Nota de Avaliação */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center gap-0.5 text-amber-500">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          </div>
                          <span className="font-extrabold text-slate-900 text-xs">
                            {p.ultimaAvaliacaoNota.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-slate-400">/ 10</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {p.ultimaAvaliacaoRecomendacao}
                        </span>
                      </td>

                      {/* Custo por Ponto */}
                      <td className="p-3.5">
                        <div className="font-extrabold text-indigo-700 text-xs">
                          {formatarMoeda(p.custoPorPonto)}
                          <span className="text-[10px] text-slate-500 font-normal">/pt</span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {p.custoPorPonto < resumo.custoPorPontoMedio ? (
                            <span className="text-emerald-700 font-medium">
                              {Math.round(
                                ((resumo.custoPorPontoMedio - p.custoPorPonto) /
                                  resumo.custoPorPontoMedio) *
                                  100,
                              )}
                              % mais eficiente que a média
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Média do portfólio: {formatarMoeda(resumo.custoPorPontoMedio)}
                            </span>
                          )}
                        </span>
                      </td>

                      {/* Tier / Semáforo de Renovação */}
                      <td className="p-3.5">
                        <div className="space-y-1">
                          {renderBadgeTier(p.tierRenovacao)}
                          <div className="text-[10px] text-slate-500 max-w-[200px] leading-tight">
                            {p.justificativaTier}
                          </div>
                        </div>
                      </td>

                      {/* Vencimento do Contrato */}
                      <td className="p-3.5 pr-5">
                        {p.contratoVigenciaFim ? (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              {p.contratoVencendoEm30Dias ? (
                                <Badge
                                  variant="destructive"
                                  className="text-[10px] font-bold py-0 h-4 bg-amber-600 hover:bg-amber-700 gap-1"
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  Vence em {p.diasParaVencerContrato} dias
                                </Badge>
                              ) : (
                                <span className="font-semibold text-slate-800 text-xs">
                                  {new Date(p.contratoVigenciaFim).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Status: {p.contratoStatus || 'Vigente'}
                              {p.temAditivoPendente && ' • Aditivo pendente'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sem prazo estipulado</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* 4. CRITÉRIOS TRANSPARENTES DE DECISÃO */}
        <div className="p-4 bg-slate-50 border-t border-slate-200">
          <div className="flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-xs text-slate-600 space-y-1">
              <span className="font-bold text-slate-900 block">
                Critérios Transparentes de Classificação (RH):
              </span>
              <p className="leading-relaxed">
                • <strong className="text-emerald-700">Renovar:</strong> Avaliação técnica de
                excelência (nota ≥ 9.0) com custo por ponto competitivo em relação à média do
                portfólio (R$ {resumo.custoPorPontoMedio.toFixed(2)}/pt).
              </p>
              <p className="leading-relaxed">
                • <strong className="text-amber-700">Renegociar:</strong> Prestador com taxa-hora
                superior à média do portfólio (R$ {resumo.valorHoraMedio.toFixed(2)}/h) ou com
                recomendações de ajuste de escopo/aditivos pendentes.
              </p>
              <p className="leading-relaxed">
                • <strong className="text-red-700">Reavaliar:</strong> Nota de avaliação abaixo do
                patamar de conformidade (nota &lt; 8.0) ou com relação custo-benefício desfavorável.
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
