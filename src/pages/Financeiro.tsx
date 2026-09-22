import { useState, useEffect, useMemo } from 'react'
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Printer,
  Sparkles,
  RefreshCw,
  Calendar,
  Building2,
  Users,
  Briefcase,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  ChevronRight,
  HelpCircle,
  ExternalLink,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import {
  carregarDadosFinanceiros,
  gerarSinteseFinanceiraIA,
  exportarPainelFinanceiroPdf,
  type DadosFinanceirosConsolidados,
  type SinteseFinanceiraIA,
} from '@/services/financeiroConsolidado'
import { SecaoMetasOrcamento } from '@/components/financeiro/SecaoMetasOrcamento'
import { SecaoComparativoCusto } from '@/components/financeiro/SecaoComparativoCusto'
import { useAuth } from '@/contexts/AuthContext'
import { Scale, Lock, UserMinus } from 'lucide-react'

const MESES = [
  { valor: 1, nome: 'Janeiro' },
  { valor: 2, nome: 'Fevereiro' },
  { valor: 3, nome: 'Março' },
  { valor: 4, nome: 'Abril' },
  { valor: 5, nome: 'Maio' },
  { valor: 6, nome: 'Junho' },
  { valor: 7, nome: 'Julho' },
  { valor: 8, nome: 'Agosto' },
  { valor: 9, nome: 'Setembro' },
  { valor: 10, nome: 'Outubro' },
  { valor: 11, nome: 'Novembro' },
  { valor: 12, nome: 'Dezembro' },
]

const ANOS = [2025, 2026, 2027]

import { useSearchParams } from 'react-router-dom'

export default function PainelFinanceiro() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const { user, isRH, empresa, empresa_nome } = useAuth()

  const tabParam = searchParams.get('tab') || searchParams.get('aba')
  const defaultTab =
    tabParam === 'comparativo' && (isRH || user?.role === 'admin')
      ? 'comparativo'
      : tabParam || 'visao-bu'
  const [activeTab, setActiveTab] = useState<string>(defaultTab)

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam)
    }
  }, [tabParam])

  const dataAtual = new Date()
  // Usar mês 9 ou mês atual conforme contexto dos seeds
  const [mesSelecionado, setMesSelecionado] = useState(dataAtual.getMonth() + 1)
  const [anoSelecionado, setAnoSelecionado] = useState(dataAtual.getFullYear())
  const [horizonteProjecao, setHorizonteProjecao] = useState(6)

  const [loading, setLoading] = useState(true)
  const [dados, setDados] = useState<DadosFinanceirosConsolidados | null>(null)

  // Síntese IA
  const [sinteseIa, setSinteseIa] = useState<SinteseFinanceiraIA | null>(null)
  const [gerandoSintese, setGerandoSintese] = useState(false)

  // Filtro de departamento na tabela de vagas
  const [filtroDepto, setFiltroDepto] = useState<string>('todos')

  const carregarPainel = async () => {
    setLoading(true)
    try {
      // Se não for RH e tiver BU/empresa associada, filtrar apenas a BU do gestor
      const empresaFiltro = !isRH && empresa ? empresa : undefined
      const res = await carregarDadosFinanceiros(
        mesSelecionado,
        anoSelecionado,
        horizonteProjecao,
        empresaFiltro,
      )
      setDados(res)
    } catch (err: unknown) {
      console.error('Falha ao carregar painel financeiro:', err)
      toast({
        title: 'Erro ao carregar dados financeiros',
        description: err instanceof Error ? err.message : 'Tente novamente mais tarde.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarPainel()
  }, [mesSelecionado, anoSelecionado, horizonteProjecao])

  const handleGerarSinteseIA = async () => {
    if (!dados) return
    setGerandoSintese(true)
    try {
      const res = await gerarSinteseFinanceiraIA(dados)
      setSinteseIa(res)
      toast({
        title: 'Síntese executiva atualizada',
        description: 'Análise de inteligência financeira gerada com sucesso.',
      })
    } catch (err: unknown) {
      toast({
        title: 'Falha ao gerar síntese',
        description: err instanceof Error ? err.message : 'Não foi possível completar a análise.',
        variant: 'destructive',
      })
    } finally {
      setGerandoSintese(false)
    }
  }

  // Filtragem de vagas por departamento
  const vagasFiltradas = useMemo(() => {
    if (!dados) return []
    if (filtroDepto === 'todos') return dados.vagasCruzamento
    return dados.vagasCruzamento.filter((v) => v.departamento === filtroDepto)
  }, [dados, filtroDepto])

  const departamentosUnicos = useMemo(() => {
    if (!dados) return []
    const setDept = new Set(dados.vagasCruzamento.map((v) => v.departamento))
    return Array.from(setDept).filter(Boolean)
  }, [dados])

  const departamentosSugeridos = useMemo(() => {
    const setDeptos = new Set<string>([
      'Tecnologia',
      'Marketing',
      'Jurídico',
      'Produto & Design',
      'Gente & Gestão',
      'Financeiro',
      'Comercial',
    ])
    if (dados?.vagasCruzamento) {
      dados.vagasCruzamento.forEach((v) => {
        if (v.departamento) setDeptos.add(v.departamento)
      })
    }
    if (dados?.metasDepartamentos) {
      dados.metasDepartamentos.forEach((m) => {
        if (m.departamento) setDeptos.add(m.departamento)
      })
    }
    return Array.from(setDeptos)
  }, [dados])

  const formatarMoeda = (val: number) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    })
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header com Seletor de Período e Ações */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <DollarSign className="w-5 h-5" />
            </span>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Painel Financeiro Consolidado
              </h1>
              <p className="text-xs text-slate-500">
                Projeção mensal de pagamentos de NFs e prestações PJ cruzada com o orçamento das
                vagas.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Seletor Mês */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <Calendar className="w-4 h-4 text-slate-400" />
            <Select
              value={String(mesSelecionado)}
              onValueChange={(val) => setMesSelecionado(Number(val))}
            >
              <SelectTrigger className="h-7 w-[120px] text-xs bg-transparent border-0 shadow-none focus:ring-0">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {MESES.map((m) => (
                  <SelectItem key={m.valor} value={String(m.valor)} className="text-xs">
                    {m.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Seletor Ano */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <Select
              value={String(anoSelecionado)}
              onValueChange={(val) => setAnoSelecionado(Number(val))}
            >
              <SelectTrigger className="h-7 w-[85px] text-xs bg-transparent border-0 shadow-none focus:ring-0">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {ANOS.map((a) => (
                  <SelectItem key={a} value={String(a)} className="text-xs">
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Horizonte Projeção */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <Select
              value={String(horizonteProjecao)}
              onValueChange={(val) => setHorizonteProjecao(Number(val))}
            >
              <SelectTrigger className="h-7 w-[130px] text-xs bg-transparent border-0 shadow-none focus:ring-0">
                <SelectValue placeholder="Horizonte" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3" className="text-xs">
                  Próximos 3 meses
                </SelectItem>
                <SelectItem value="6" className="text-xs">
                  Próximos 6 meses
                </SelectItem>
                <SelectItem value="12" className="text-xs">
                  Próximos 12 meses
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {/* Botão Exportar PDF */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => dados && exportarPainelFinanceiroPdf(dados)}
            disabled={!dados || loading}
            className="h-9 gap-1.5 text-xs text-slate-700 hover:text-slate-900 border-slate-200"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            Exportar PDF
          </Button>
          {/* Botão Síntese IA */}
          <Button
            size="sm"
            onClick={handleGerarSinteseIA}
            disabled={!dados || loading || gerandoSintese}
            className="h-9 gap-1.5 text-xs bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold shadow-xs"
          >
            {gerandoSintese ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                Síntese com IA
              </>
            )}
          </Button>{' '}
        </div>
      </div>

      {/* Alertas Críticos em Banner Superior se houver NFs atrasadas ou pendências */}
      {dados && dados.alertasFinanceiros.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-800 shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Pontos de Atenção Financeira no Período
                </h4>
                <Badge
                  variant="outline"
                  className="bg-amber-100 text-amber-800 border-amber-300 text-[10px]"
                >
                  {dados.alertasFinanceiros.length} ocorrência(s)
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-2.5">
                {dados.alertasFinanceiros.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="bg-white/80 border border-amber-200/80 rounded-lg p-2.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="font-semibold text-slate-800 truncate">{item.titulo}</span>
                      {item.valor && (
                        <span className="font-bold text-red-600 shrink-0">
                          {formatarMoeda(item.valor)}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {item.detalhe}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. KPIs do Topo com Decomposição por BU e Separação Explícita PJ × CLT */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Comprometido PJ (Mês) — DECOMPOSTO POR BU COM TOTAL EM DESTAQUE */}
        <Card className="border-blue-200/80 bg-white shadow-xs hover:border-blue-300 transition-all flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-bold px-1.5 py-0"
                >
                  PJ
                </Badge>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Comprometido PJ (Mês)
                </span>
              </div>
              <span className="p-1.5 rounded-md bg-blue-50 text-blue-600">
                <Building2 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs text-slate-500 font-medium">TOTAL CONSOLIDADO GRUPO</div>
              <CardTitle className="text-2xl font-black text-blue-900 tracking-tight">
                {loading
                  ? '...'
                  : formatarMoeda(
                      dados?.kpis.decompComprometidoPj?.total ??
                        dados?.kpis.comprometidoMensalPj ??
                        0,
                    )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-t border-slate-100 pt-2 flex items-center justify-between">
              <span>Decomposição por BU (inclui benefícios & descansos):</span>
              <span className="text-slate-500 font-normal">
                {dados?.kpis.prestadoresPjCount || 0} prestador(es)
              </span>
            </div>
            <div className="space-y-1.5">
              {dados?.kpis.decompComprometidoPj?.decomposicaoBu.map((bu) => (
                <div
                  key={bu.empresaId}
                  className="flex items-center justify-between text-xs bg-slate-50/80 hover:bg-slate-100/80 px-2 py-1 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: bu.cor }}
                    />
                    <span
                      className="font-semibold text-slate-700 truncate text-[11px]"
                      title={bu.nome}
                    >
                      {bu.sigla || bu.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-slate-900 text-xs">
                      {formatarMoeda(bu.valor)}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1 py-0 h-4 font-mono bg-white text-slate-600 border border-slate-200"
                    >
                      {bu.percentual}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
              <span>Valor-hora médio PJ:</span>
              <span className="font-semibold text-slate-700">
                {loading ? '...' : formatarMoeda(dados?.kpis.valorHoraMedioPj || 0)}/h (160h)
              </span>
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Comprometido CLT (Mês) — FOLHA + CONTRATAÇÕES */}
        <Card className="border-purple-200/80 bg-white shadow-xs hover:border-purple-300 transition-all flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-bold px-1.5 py-0"
                >
                  CLT
                </Badge>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Comprometido CLT (Mês)
                </span>
              </div>
              <span className="p-1.5 rounded-md bg-purple-50 text-purple-600">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs text-slate-500 font-medium">TOTAL FOLHA CLT CONSOLIDADA</div>
              <CardTitle className="text-2xl font-black text-purple-900 tracking-tight">
                {loading
                  ? '...'
                  : formatarMoeda(
                      dados?.kpis.decompComprometidoClt?.total ??
                        dados?.kpis.comprometidoCltMensal ??
                        0,
                    )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-t border-slate-100 pt-2 flex items-center justify-between">
              <span>Decomposição por BU (inclui benefícios & férias 1/3):</span>
              <span className="text-slate-500 font-normal">
                {dados?.kpis.colaboradoresCltCount || 0} colaborador(es)
              </span>
            </div>
            <div className="space-y-1.5">
              {dados?.kpis.decompComprometidoClt?.decomposicaoBu.map((bu) => (
                <div
                  key={bu.empresaId}
                  className="flex items-center justify-between text-xs bg-slate-50/80 hover:bg-slate-100/80 px-2 py-1 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: bu.cor }}
                    />
                    <span
                      className="font-semibold text-slate-700 truncate text-[11px]"
                      title={bu.nome}
                    >
                      {bu.sigla || bu.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-slate-900 text-xs">
                      {formatarMoeda(bu.valor)}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1 py-0 h-4 font-mono bg-white text-slate-600 border border-slate-200"
                    >
                      {bu.percentual}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
              <span>Novas admissões no mês:</span>
              <span className="font-semibold text-purple-700">
                {dados?.kpis.propostasAceitasCount || 0} oferta(s) +{' '}
                {dados?.kpis.onboardingsAtivosCount || 0} onboarding
              </span>
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: NFs Pagas no Período (PJ) */}
        <Card className="border-emerald-200/80 bg-white shadow-xs hover:border-emerald-300 transition-all flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold px-1.5 py-0"
                >
                  PJ
                </Badge>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  Total Pago no Período
                </span>
              </div>
              <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs text-slate-500 font-medium">NFS QUITADAS NO MÊS</div>
              <CardTitle className="text-2xl font-black text-emerald-800 tracking-tight">
                {loading
                  ? '...'
                  : formatarMoeda(
                      dados?.kpis.decompTotalPago?.total ?? dados?.kpis.totalPagoPeriodo ?? 0,
                    )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-t border-slate-100 pt-2 flex items-center justify-between">
              <span>Decomposição por BU:</span>
              <span className="text-slate-500 font-normal">
                {dados?.kpis.nfsPagasCount || 0} NF(s)
              </span>
            </div>
            <div className="space-y-1.5">
              {dados?.kpis.decompTotalPago?.decomposicaoBu.map((bu) => (
                <div
                  key={bu.empresaId}
                  className="flex items-center justify-between text-xs bg-slate-50/80 hover:bg-slate-100/80 px-2 py-1 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: bu.cor }}
                    />
                    <span
                      className="font-semibold text-slate-700 truncate text-[11px]"
                      title={bu.nome}
                    >
                      {bu.sigla || bu.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-slate-900 text-xs">
                      {formatarMoeda(bu.valor)}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1 py-0 h-4 font-mono bg-white text-slate-600 border border-slate-200"
                    >
                      {bu.percentual}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
              <span>Horas faturadas:</span>
              <span className="font-semibold text-slate-700">
                {dados?.kpis.decompHorasApontadas?.total || 0}h apontadas
              </span>
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: A Pagar / Em Aberto (PJ) com Destaque de Atraso */}
        <Card className="border-amber-200/80 bg-white shadow-xs hover:border-amber-300 transition-all flex flex-col justify-between">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Badge
                  variant="outline"
                  className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold px-1.5 py-0"
                >
                  PJ
                </Badge>
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                  A Pagar / Em Aberto
                </span>
              </div>
              <span className="p-1.5 rounded-md bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-2">
              <div className="text-xs text-slate-500 font-medium">NFS EM ABERTO + ATRASADAS</div>
              <CardTitle className="text-2xl font-black text-amber-800 tracking-tight">
                {loading
                  ? '...'
                  : formatarMoeda(
                      dados?.kpis.decompTotalAPagar?.total ?? dados?.kpis.aPagarPeriodo ?? 0,
                    )}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 border-t border-slate-100 pt-2 flex items-center justify-between">
              <span>Decomposição por BU:</span>
              {dados && dados.kpis.totalAtrasado > 0 ? (
                <span className="text-red-600 font-bold flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  {formatarMoeda(dados.kpis.totalAtrasado)} em atraso
                </span>
              ) : (
                <span className="text-emerald-700 font-semibold text-[10px]">Em dia</span>
              )}
            </div>
            <div className="space-y-1.5">
              {dados?.kpis.decompTotalAPagar?.decomposicaoBu.map((bu) => (
                <div
                  key={bu.empresaId}
                  className="flex items-center justify-between text-xs bg-slate-50/80 hover:bg-slate-100/80 px-2 py-1 rounded-md transition-colors"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: bu.cor }}
                    />
                    <span
                      className="font-semibold text-slate-700 truncate text-[11px]"
                      title={bu.nome}
                    >
                      {bu.sigla || bu.nome}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-bold text-slate-900 text-xs">
                      {formatarMoeda(bu.valor)}
                    </span>
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1 py-0 h-4 font-mono bg-white text-slate-600 border border-slate-200"
                    >
                      {bu.percentual}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2.5 pt-1.5 border-t border-slate-100 flex items-center justify-between">
              <span>Projeção (3 Meses):</span>
              <span className="font-semibold text-indigo-700">
                {formatarMoeda(dados?.kpis.projecaoProximos3Meses || 0)}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* BANNER TOTAL CONSOLIDADO DO GRUPO (PJ + CLT) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-700">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
              Total Comprometido do Grupo (Mês)
            </span>
            <Badge className="bg-indigo-600 text-white text-[10px] font-bold">
              Consolidado Geral
            </Badge>
          </div>
          <div className="text-2xl font-black tracking-tight text-white flex items-baseline gap-2">
            <span>{loading ? '...' : formatarMoeda(dados?.kpis.comprometidoTotalGrupo || 0)}</span>
            <span className="text-xs font-normal text-slate-400">mensal</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t md:border-t-0 md:border-l border-slate-700/80 pt-3 md:pt-0 md:pl-5 text-xs">
          <div className="bg-slate-800/80 border border-blue-500/30 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5 text-blue-300 font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              Comprometido PJ:
            </div>
            <div className="font-extrabold text-white text-sm mt-0.5">
              {formatarMoeda(dados?.kpis.comprometidoMensalPj || 0)}
            </div>
            <div className="text-[10px] text-slate-400">
              {dados?.kpis.prestadoresPjCount || 0} prestadores ativos
            </div>
          </div>

          <div className="bg-slate-800/80 border border-purple-500/30 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5 text-purple-300 font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-purple-400" />
              Comprometido CLT:
            </div>
            <div className="font-extrabold text-white text-sm mt-0.5">
              {formatarMoeda(dados?.kpis.comprometidoCltMensal || 0)}
            </div>
            <div className="text-[10px] text-slate-400">
              {dados?.kpis.colaboradoresCltCount || 0} vínculos CLT + ofertas
            </div>
          </div>

          <div className="bg-slate-800/80 border border-emerald-500/30 rounded-lg px-3 py-2">
            <div className="flex items-center gap-1.5 text-emerald-300 font-bold text-[11px]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Quitado em NFs:
            </div>
            <div className="font-extrabold text-white text-sm mt-0.5">
              {formatarMoeda(dados?.kpis.totalPagoPeriodo || 0)}
            </div>
            <div className="text-[10px] text-slate-400">
              {dados?.kpis.nfsPagasCount || 0} nota(s) paga(s)
            </div>
          </div>
        </div>
      </div>

      {/* 1.1 Metas de Orçamento por Departamento com Semáforo e Alertas */}
      <SecaoMetasOrcamento
        metas={dados?.metasDepartamentos || []}
        horizonteMeses={horizonteProjecao}
        departamentosSugeridos={departamentosSugeridos}
        onAtualizar={carregarPainel}
      />

      {/* 2. Projeção Mensal de Pagamentos (Gráfico de Barras / Área) */}
      <Card className="border-slate-200/80 shadow-xs">
        <CardHeader className="p-5 pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                Projeção Mensal Consolidada de Desembolso
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Evolução projetada para os próximos {horizonteProjecao} meses somando contratos PJ,
                notas fiscais previstas e folha de novas contratações.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#2563EB]" /> Prestações PJ
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#10B981]" /> NFs Previstas
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-xs bg-[#8B5CF6]" /> Folha Contratações
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 pt-3">
          <div className="h-72 w-full">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Carregando projeção financeira...
              </div>
            ) : dados && dados.serieProjecao.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={dados.serieProjecao}
                  margin={{ top: 15, right: 20, bottom: 5, left: 15 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis
                    dataKey="rotulo"
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                  />
                  <YAxis
                    tick={{ fill: '#64748B', fontSize: 11 }}
                    tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`}
                    tickLine={false}
                    axisLine={{ stroke: '#CBD5E1' }}
                  />
                  <Tooltip
                    formatter={(value: any, name: any) => {
                      const labels: Record<string, string> = {
                        prestracaoPjRecorrente: 'Prestações PJ Recorrentes',
                        nfsPrevistas: 'NFs Previstas (Competência)',
                        folhaContratacoes: 'Folha de Contratações (CLT)',
                        totalGeral: 'Total Consolidado',
                      }
                      return [formatarMoeda(Number(value)), labels[name] || name]
                    }}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#1E293B',
                      borderRadius: '8px',
                      color: '#F8FAFC',
                      fontSize: '11px',
                    }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    formatter={(val) => {
                      const dict: Record<string, string> = {
                        prestracaoPjRecorrente: 'Prestações PJ',
                        nfsPrevistas: 'NFs Previstas',
                        folhaContratacoes: 'Folha Contratações',
                        totalGeral: 'Total Consolidado',
                      }
                      return (
                        <span className="text-xs text-slate-600 font-medium">
                          {dict[val] || val}
                        </span>
                      )
                    }}
                  />
                  <Bar
                    dataKey="prestracaoPjRecorrente"
                    stackId="a"
                    fill="#2563EB"
                    radius={[0, 0, 0, 0]}
                  />
                  <Bar dataKey="nfsPrevistas" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                  <Bar
                    dataKey="folhaContratacoes"
                    stackId="a"
                    fill="#8B5CF6"
                    radius={[4, 4, 0, 0]}
                  />
                  <Line
                    type="monotone"
                    dataKey="totalGeral"
                    stroke="#F59E0B"
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: '#F59E0B' }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Nenhum dado para o horizonte selecionado.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 3. Seção com Três Abas: Comparativo de Custo (RH), Cruzamento com Vagas & Composição por Prestador */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => {
          setActiveTab(val)
          setSearchParams((prev) => {
            const next = new URLSearchParams(prev)
            next.set('tab', val)
            return next
          })
        }}
        className="space-y-4"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-slate-100 p-1 border border-slate-200 flex-wrap">
            <TabsTrigger
              value="visao-bu"
              className="text-xs font-bold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-indigo-700"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Visão por BU (PJ × CLT)
              <Badge
                variant="secondary"
                className="text-[9px] py-0 px-1 ml-1 bg-indigo-100 text-indigo-800 font-bold"
              >
                Novo
              </Badge>
            </TabsTrigger>
            {isRH ? (
              <TabsTrigger
                value="comparativo"
                className="text-xs font-semibold gap-1.5 data-[state=active]:bg-white data-[state=active]:text-blue-700"
              >
                <Scale className="w-3.5 h-3.5 text-blue-600" />
                Comparativo de Custo
                <Badge
                  variant="secondary"
                  className="text-[9px] py-0 px-1 ml-1 bg-blue-100 text-blue-800 font-bold"
                >
                  Só RH
                </Badge>
              </TabsTrigger>
            ) : null}
            <TabsTrigger value="vagas" className="text-xs font-semibold gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              Cruzamento com Orçamento das Vagas
            </TabsTrigger>
            <TabsTrigger value="prestadores" className="text-xs font-semibold gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Composição de Custos por Prestador PJ
            </TabsTrigger>
          </TabsList>

          {/* Filtro específico para a tabela de Vagas */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filtrar Área:</span>
            <Select value={filtroDepto} onValueChange={setFiltroDepto}>
              <SelectTrigger className="h-8 w-[170px] text-xs bg-white border-slate-200">
                <SelectValue placeholder="Todos os departamentos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">
                  Todos os departamentos
                </SelectItem>
                {departamentosUnicos.map((dep) => (
                  <SelectItem key={dep} value={dep} className="text-xs">
                    {dep}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ABA NOVA: Visão por BU (Linhas = BUs, Colunas = Indicadores PJ e CLT) */}
        <TabsContent value="visao-bu" className="space-y-4 m-0">
          <Card className="border-slate-200/80 shadow-xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Matriz Financeira por Unidade de Negócio (BU) — PJ × CLT
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-bold"
                    >
                      {isRH
                        ? 'Consolidado Todas as BUs'
                        : `Escopo Restrito: ${empresa_nome || 'Minha BU'}`}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Decomposição dos valores de cada BU com separação explícita entre PJ
                    (prestadores, valor/hora e NFs) e CLT (folha e admissões), além do total
                    combinado.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold">
                    <th className="p-3.5 pl-5">BU / Unidade</th>
                    <th className="p-3.5 bg-blue-50/60 text-blue-900 border-l border-blue-100">
                      <div className="flex items-center gap-1">
                        <Badge className="bg-blue-600 text-white text-[9px] px-1 py-0">PJ</Badge>
                        <span>Comprometido Mês</span>
                      </div>
                    </th>
                    <th className="p-3.5 bg-blue-50/40 text-blue-900">
                      <span>NFs Pagas (Mês)</span>
                    </th>
                    <th className="p-3.5 bg-blue-50/40 text-blue-900">
                      <span>NFs A Pagar / Aberto</span>
                    </th>
                    <th className="p-3.5 bg-blue-50/40 text-blue-900">
                      <span>Horas PJ (Mês)</span>
                    </th>
                    <th className="p-3.5 bg-purple-50/60 text-purple-900 border-l border-purple-100">
                      <div className="flex items-center gap-1">
                        <Badge className="bg-purple-600 text-white text-[9px] px-1 py-0">CLT</Badge>
                        <span>Folha Mensal</span>
                      </div>
                    </th>
                    <th className="p-3.5 bg-purple-50/40 text-purple-900">
                      <span>Colaboradores CLT</span>
                    </th>
                    <th className="p-3.5 bg-rose-50/70 text-rose-900 border-l border-rose-100">
                      <div className="flex items-center gap-1">
                        <Badge className="bg-rose-600 text-white text-[9px] px-1 py-0">OFF</Badge>
                        <span>Encerramentos Período</span>
                      </div>
                    </th>
                    <th className="p-3.5 bg-indigo-50/80 text-indigo-950 font-black border-l border-indigo-100 pr-5">
                      <div className="flex items-center gap-1">
                        <Badge className="bg-indigo-700 text-white text-[9px] px-1 py-0">
                          TOTAL
                        </Badge>
                        <span>Comprometido BU</span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {dados && dados.kpis.visaoPorBu && dados.kpis.visaoPorBu.length > 0 ? (
                    dados.kpis.visaoPorBu.map((bu) => (
                      <tr key={bu.empresaId} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 pl-5">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: bu.cor }}
                            />
                            <div>
                              <div className="font-bold text-slate-900 text-xs">{bu.nome}</div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                Sigla: {bu.sigla} • {bu.tipo}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* PJ: Comprometido */}
                        <td className="p-3.5 bg-blue-50/20 border-l border-blue-50 font-bold text-slate-900">
                          <div>{formatarMoeda(bu.comprometidoPjMes)}</div>
                          <div className="text-[10px] text-slate-400 font-normal">
                            {bu.prestadoresPjCount} prestador(es) PJ
                          </div>
                        </td>

                        {/* PJ: NFs Pagas */}
                        <td className="p-3.5 bg-blue-50/10">
                          <span className="font-bold text-emerald-700">
                            {formatarMoeda(bu.nfsPagasPj)}
                          </span>
                        </td>

                        {/* PJ: NFs A Pagar */}
                        <td className="p-3.5 bg-blue-50/10">
                          <div
                            className={`font-bold ${bu.nfsAtrasadasPj > 0 ? 'text-red-600' : 'text-amber-800'}`}
                          >
                            {formatarMoeda(bu.nfsAbertoPj)}
                          </div>
                          {bu.nfsAtrasadasPj > 0 && (
                            <span className="text-[10px] text-red-600 font-semibold">
                              ({formatarMoeda(bu.nfsAtrasadasPj)} atraso)
                            </span>
                          )}
                        </td>

                        {/* PJ: Horas */}
                        <td className="p-3.5 bg-blue-50/10 text-slate-800 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <span>{bu.horasApontadasPj}h</span>
                            <a
                              href="/horas-competencias?comp=2026-09"
                              className="text-[10px] text-orange-600 hover:underline font-mono font-bold"
                              title="Ver módulo de Horas & Competências"
                            >
                              [Horas]
                            </a>
                          </div>
                        </td>

                        {/* CLT: Folha */}
                        <td className="p-3.5 bg-purple-50/20 border-l border-purple-50 font-bold text-purple-900">
                          <div>{formatarMoeda(bu.folhaCltMes)}</div>
                          {bu.novasContratacoesClt > 0 && (
                            <div className="text-[10px] text-purple-600 font-normal">
                              +{bu.novasContratacoesClt} nova(s) vaga(s)
                            </div>
                          )}
                        </td>

                        {/* CLT: Contagem */}
                        <td className="p-3.5 bg-purple-50/10 text-slate-800">
                          <span className="font-bold">{bu.colaboradoresCltCount}</span>
                          <span className="text-[10px] text-slate-400 ml-1">colaborador(es)</span>
                        </td>

                        {/* DESLIGAMENTOS NO PERÍODO */}
                        <td className="p-3.5 bg-rose-50/30 border-l border-rose-100">
                          {bu.encerramentosPeriodoClt > 0 || bu.encerramentosPeriodoPj > 0 ? (
                            <div>
                              <div className="font-bold text-rose-800">
                                {formatarMoeda(bu.totalRescisorioBu)}
                              </div>
                              <div className="text-[10px] text-rose-600 flex items-center gap-1 mt-0.5">
                                {bu.encerramentosPeriodoClt > 0 && (
                                  <span>{bu.encerramentosPeriodoClt} CLT</span>
                                )}
                                {bu.encerramentosPeriodoClt > 0 &&
                                  bu.encerramentosPeriodoPj > 0 && <span>•</span>}
                                {bu.encerramentosPeriodoPj > 0 && (
                                  <span>{bu.encerramentosPeriodoPj} PJ</span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">—</span>
                          )}
                        </td>

                        {/* TOTAL GERAL DA BU */}
                        <td className="p-3.5 bg-indigo-50/40 border-l border-indigo-100 pr-5">
                          <div className="font-black text-indigo-950 text-sm">
                            {formatarMoeda(bu.totalComprometidoGeral)}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            PJ: {formatarMoeda(bu.comprometidoPjMes)} | CLT:{' '}
                            {formatarMoeda(bu.folhaCltMes)}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={9} className="p-6 text-center text-xs text-slate-400">
                        Nenhum dado por BU disponível no momento.
                      </td>
                    </tr>
                  )}
                </tbody>
                {/* Rodapé Consolidado */}
                {dados && (
                  <tfoot>
                    <tr className="bg-slate-200/90 font-black border-t-2 border-slate-300 text-slate-900">
                      <td className="p-3.5 pl-5">TOTAL CONSOLIDADO GRUPO</td>
                      <td className="p-3.5 bg-blue-100/80 border-l border-blue-200 text-blue-950">
                        {formatarMoeda(dados.kpis.comprometidoMensalPj)}
                      </td>
                      <td className="p-3.5 bg-blue-100/60 text-emerald-800">
                        {formatarMoeda(dados.kpis.totalPagoPeriodo)}
                      </td>
                      <td className="p-3.5 bg-blue-100/60 text-amber-900">
                        {formatarMoeda(dados.kpis.aPagarPeriodo)}
                      </td>
                      <td className="p-3.5 bg-blue-100/60 text-slate-800">
                        {dados.kpis.decompHorasApontadas?.total || 0}h
                      </td>
                      <td className="p-3.5 bg-purple-100/80 border-l border-purple-200 text-purple-950">
                        {formatarMoeda(dados.kpis.comprometidoCltMensal)}
                      </td>
                      <td className="p-3.5 bg-purple-100/60 text-slate-800">
                        {dados.kpis.colaboradoresCltCount} colaboradores
                      </td>
                      <td className="p-3.5 bg-rose-100/80 border-l border-rose-200 text-rose-950">
                        <div>{formatarMoeda(dados.kpis.totalRescisorioGeral || 0)}</div>
                        <div className="text-[9px] font-normal text-rose-800">
                          CLT: {formatarMoeda(dados.kpis.totalRescisorioClt || 0)} | PJ:{' '}
                          {formatarMoeda(dados.kpis.totalRescisorioPj || 0)}
                        </div>
                      </td>
                      <td className="p-3.5 bg-indigo-200/80 border-l border-indigo-200 pr-5 text-indigo-950 text-sm font-black">
                        {formatarMoeda(dados.kpis.comprometidoTotalGrupo)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>

          {/* CARD DETALHADO: Encerramentos / Desligamentos no Período (PJ × CLT com Escopo por BU) */}
          <Card className="border-slate-200/80 shadow-xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-rose-50/40">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                      <UserMinus className="w-4 h-4 text-rose-600" />
                      Encerramentos e Desligamentos no Período (PJ × CLT)
                    </CardTitle>
                    <Badge
                      variant="outline"
                      className="bg-rose-100 text-rose-800 border-rose-200 text-[10px] font-bold"
                    >
                      {dados?.kpis.encerramentosPeriodo?.length || 0} registro(s)
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Impacto rescisório apurado e conciliação de competências/NFs pendentes para
                    vínculos desligados ou em transição formal. Vínculos saem do comprometido mensal
                    recorrente e entram aqui como desembolsos pontuais de rescisão/encerramento.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="/offboardings"
                    className="text-xs font-semibold text-rose-700 hover:text-rose-800 hover:underline flex items-center gap-1"
                  >
                    Abrir Módulo de Desligamentos →
                  </a>
                </div>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3.5 pl-5">Colaborador / Prestador</th>
                    <th className="p-3.5">BU / Unidade</th>
                    <th className="p-3.5">Modalidade</th>
                    <th className="p-3.5">Tipo de Desligamento</th>
                    <th className="p-3.5">Data de Desligamento</th>
                    <th className="p-3.5">Status Processo</th>
                    <th className="p-3.5 pr-5">Valor Rescisório / Pendências</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {dados &&
                  dados.kpis.encerramentosPeriodo &&
                  dados.kpis.encerramentosPeriodo.length > 0 ? (
                    dados.kpis.encerramentosPeriodo.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 pl-5">
                          <div className="font-bold text-slate-900">{item.nomePessoa}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: {item.pessoaId}
                          </div>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-800">{item.empresaNome}</td>
                        <td className="p-3.5">
                          <Badge
                            className={`text-[10px] font-bold ${
                              item.modalidade === 'PJ'
                                ? 'bg-blue-100 text-blue-800 border-blue-200'
                                : 'bg-purple-100 text-purple-800 border-purple-200'
                            }`}
                          >
                            {item.modalidade}
                          </Badge>
                        </td>
                        <td className="p-3.5 text-slate-800 font-medium">
                          {item.tipoDesligamento}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {new Date(item.dataDesligamento).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-3.5">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold ${
                              item.status === 'Concluído'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-amber-50 text-amber-800 border-amber-300'
                            }`}
                          >
                            {item.status}
                          </Badge>
                        </td>
                        <td className="p-3.5 pr-5">
                          <div className="font-extrabold text-slate-900">
                            {formatarMoeda(item.valorRescisorioOuPendente)}
                          </div>
                          <div className="text-[10px] text-slate-400">{item.detalhe}</div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-xs text-slate-400">
                        Nenhum desligamento ou encerramento registrado no período para o escopo
                        selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ABA RH: Comparativo de Custo Entre Prestadores (Ranquear Valor-Hora vs. Nota de Avaliação para Decisão de Renovação) */}
        {isRH ? (
          <TabsContent value="comparativo" className="space-y-4 m-0">
            {dados?.prestadoresRanqueados && dados.resumoComparativoCusto ? (
              <SecaoComparativoCusto
                prestadores={dados.prestadoresRanqueados}
                resumo={dados.resumoComparativoCusto}
                horizonteMeses={horizonteProjecao}
              />
            ) : (
              <Card className="p-8 text-center text-xs text-slate-400">
                Carregando comparativo de custo entre prestadores...
              </Card>
            )}
          </TabsContent>
        ) : (
          <TabsContent value="comparativo" className="space-y-4 m-0">
            <Card className="p-8 text-center bg-slate-50 border-slate-200">
              <div className="flex flex-col items-center justify-center space-y-2 text-slate-500">
                <Lock className="w-6 h-6 text-slate-400" />
                <h3 className="font-bold text-slate-800 text-sm">Acesso Restrito ao RH</h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  O comparativo de custo-benefício e semáforo de renovação de contratos de
                  prestadores é de visualização exclusiva da equipe de Gente & Gestão.
                </p>
              </div>
            </Card>
          </TabsContent>
        )}

        {/* ABA 1: Cruzamento Vagas x Orçamento x Prestadores */}
        <TabsContent value="vagas" className="space-y-4 m-0">
          <Card className="border-slate-200/80 shadow-xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Orçamento por Vaga, Custo Atual e Comparativo CLT vs. PJ
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    Avaliação de headcount em aberto vs. preenchido, impacto na folha e prestadores
                    relacionados à área de atuação.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3.5 pl-5">Vaga / Perfil</th>
                    <th className="p-3.5">Departamento</th>
                    <th className="p-3.5">Orçamento Estimado</th>
                    <th className="p-3.5">Custo Atual (Oferta/Onboarding)</th>
                    <th className="p-3.5">Prestadores da Área (PJ)</th>
                    <th className="p-3.5 pr-5">Comparativo CLT x PJ (Estimado)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {vagasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-xs text-slate-400">
                        Nenhuma vaga encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  ) : (
                    vagasFiltradas.map((v) => {
                      const aderenciaOrcamento =
                        v.custoAtualContratacao > 0 && v.orcamentoMensal > 0
                          ? Math.round((v.custoAtualContratacao / v.orcamentoMensal) * 100)
                          : null

                      return (
                        <tr key={v.vagaId} className="hover:bg-slate-50/70 transition-colors">
                          <td className="p-3.5 pl-5">
                            <div className="font-bold text-slate-900">{v.titulo}</div>
                            <div className="text-[11px] text-slate-400">
                              Faixa: {v.faixaSalarial}
                            </div>
                            <div className="mt-1 flex items-center gap-1.5">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold py-0 px-1.5 ${
                                  v.status === 'Ativa'
                                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                                    : 'bg-slate-100 text-slate-600 border-slate-200'
                                }`}
                              >
                                {v.status}
                              </Badge>
                            </div>
                          </td>

                          <td className="p-3.5">
                            <span className="font-semibold text-slate-800">{v.departamento}</span>
                          </td>

                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">
                              {formatarMoeda(v.orcamentoMensal)}
                            </div>
                            <span className="text-[10px] text-slate-400">teto salarial</span>
                          </td>

                          <td className="p-3.5">
                            {v.custoAtualContratacao > 0 ? (
                              <div>
                                <div className="font-extrabold text-emerald-700">
                                  {formatarMoeda(v.custoAtualContratacao)}
                                </div>
                                <div className="text-[11px] text-slate-600 truncate max-w-[170px]">
                                  {v.candidatoContratadoNome}
                                </div>
                                <div className="text-[10px] text-emerald-600 font-medium">
                                  {v.statusContratacao}
                                  {aderenciaOrcamento && (
                                    <span className="ml-1 text-slate-400">
                                      ({aderenciaOrcamento}% do teto)
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">
                                Vaga em processo seletivo
                              </span>
                            )}
                          </td>

                          <td className="p-3.5">
                            {v.custoPjDepartamento > 0 ? (
                              <div>
                                <div className="font-bold text-slate-800">
                                  {formatarMoeda(v.custoPjDepartamento)}
                                  <span className="text-[10px] text-slate-400 font-normal">
                                    /mês
                                  </span>
                                </div>
                                <div className="text-[10px] text-blue-600 mt-0.5 space-y-0.5">
                                  {v.prestadoresAssociados.map((p, idx) => (
                                    <div key={idx} className="truncate max-w-[190px]">
                                      • {p.nome} ({formatarMoeda(p.valorMensal)})
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                Sem prestador PJ alocado
                              </span>
                            )}
                          </td>

                          <td className="p-3.5 pr-5">
                            <div className="bg-slate-50 border border-slate-200/70 rounded-lg p-2 text-[11px] space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500">CLT c/ Encargos:</span>
                                <span className="font-semibold text-slate-800">
                                  {formatarMoeda(v.custoCltEstimadoTotal)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-slate-500">PJ Equivalente:</span>
                                <span className="font-semibold text-slate-800">
                                  {formatarMoeda(v.custoPjEquivalenteEstimado)}
                                </span>
                              </div>
                              <div className="text-[10px] text-blue-700 font-medium pt-1 border-t border-slate-200">
                                {v.economiaEstimadaModelo}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* ABA 2: Composição de Custos por Prestador */}
        <TabsContent value="prestadores" className="space-y-4 m-0">
          <Card className="border-slate-200/80 shadow-xs overflow-hidden">
            <CardHeader className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold text-slate-900">
                Tabela Ranqueada de Prestadores de Serviços PJ
              </CardTitle>
              <CardDescription className="text-xs text-slate-500 mt-0.5">
                Valores mensais, cálculo de valor-hora base 160h, notas fiscais quitadas vs. em
                aberto e avaliação média de entrega.
              </CardDescription>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3.5 pl-5">Prestador PJ / Razão Social</th>
                    <th className="p-3.5">Área de Atuação</th>
                    <th className="p-3.5">Valor Mensal</th>
                    <th className="p-3.5">Valor-Hora (160h)</th>
                    <th className="p-3.5">NFs Pagas</th>
                    <th className="p-3.5">NFs Em Aberto</th>
                    <th className="p-3.5 pr-5">Desempenho / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {dados && dados.prestadoresRanqueados.length > 0 ? (
                    dados.prestadoresRanqueados.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3.5 pl-5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-900">{p.nomeFantasia}</span>
                            <a
                              href={`/horas-competencias?comp=2026-09`}
                              className="text-[10px] text-orange-600 hover:text-orange-700 hover:underline font-mono font-bold"
                              title="Ver apontamentos e fechamento de horas do prestador"
                            >
                              [Horas]
                            </a>
                            <a
                              href={`/pessoas/${p.id}`}
                              className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5"
                              title="Ver ficha cadastral unificada da pessoa"
                            >
                              <ExternalLink className="w-2.5 h-2.5" />
                              Ficha
                            </a>
                          </div>
                          <div className="text-[11px] text-slate-400">{p.razaoSocial}</div>
                          <div className="text-[10px] text-slate-400">CNPJ: {p.cnpj}</div>
                          {p.temAditivoPendente && (
                            <Badge
                              variant="outline"
                              className="mt-1 bg-amber-50 text-amber-800 border-amber-300 text-[9px]"
                            >
                              Aditivo pendente de assinatura
                            </Badge>
                          )}
                        </td>

                        <td className="p-3.5">
                          <span className="font-medium text-slate-800">{p.areaAtuacao}</span>
                        </td>

                        <td className="p-3.5">
                          <div className="font-extrabold text-slate-900">
                            {formatarMoeda(p.valorMensal)}
                          </div>
                          <span className="text-[10px] text-slate-400">recorrente mensal</span>
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-slate-800">
                            {formatarMoeda(p.valorHora160h)}
                            <span className="text-[10px] text-slate-400 font-normal">/h</span>
                          </div>
                        </td>

                        <td className="p-3.5">
                          <span className="font-bold text-emerald-700">
                            {formatarMoeda(p.totalPago)}
                          </span>
                        </td>

                        <td className="p-3.5">
                          <div
                            className={`font-bold ${p.totalAtrasado > 0 ? 'text-red-600' : 'text-amber-700'}`}
                          >
                            {formatarMoeda(p.totalEmAberto)}
                          </div>
                          {p.totalAtrasado > 0 && (
                            <span className="text-[10px] text-red-600 font-semibold">
                              ({formatarMoeda(p.totalAtrasado)} em atraso)
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 pr-5">
                          <div className="flex items-center gap-1.5">
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-blue-800 font-bold text-[10px]"
                            >
                              ★ {p.ultimaAvaliacaoNota.toFixed(1)} / 10
                            </Badge>
                            <span className="text-[11px] text-slate-500">
                              ({p.ultimaAvaliacaoRecomendacao})
                            </span>
                          </div>
                          {p.contratoVigenciaFim && (
                            <div className="text-[10px] text-slate-400 mt-1">
                              Vigência até:{' '}
                              {new Date(p.contratoVigenciaFim).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-xs text-slate-400">
                        Nenhum prestador cadastrado no sistema.
                      </td>
                    </tr>
                  )}
                </tbody>
                {/* Rodapé com Totais Consolidados */}
                {dados && (
                  <tfoot>
                    <tr className="bg-slate-100/80 font-bold border-t-2 border-slate-300 text-slate-900">
                      <td className="p-3.5 pl-5">
                        TOTAIS CONSOLIDADOS ({dados.prestadoresRanqueados.length} prestadores)
                      </td>
                      <td className="p-3.5">—</td>
                      <td className="p-3.5 text-slate-900">
                        {formatarMoeda(dados.totaisRodapePrestadores.totalMensal)}
                      </td>
                      <td className="p-3.5 text-slate-700">
                        {formatarMoeda(dados.totaisRodapePrestadores.totalHora160h)}/h médio
                      </td>
                      <td className="p-3.5 text-emerald-700">
                        {formatarMoeda(dados.totaisRodapePrestadores.totalPago)}
                      </td>
                      <td className="p-3.5 text-amber-800">
                        {formatarMoeda(dados.totaisRodapePrestadores.totalEmAberto)}
                      </td>
                      <td className="p-3.5 pr-5">—</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* 4. Síntese Executiva por IA (Gateway Fast) */}
      <Card className="border-blue-200/70 bg-gradient-to-br from-blue-50/40 via-white to-slate-50/40 shadow-xs">
        <CardHeader className="p-5 pb-3 border-b border-blue-100 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-blue-600 text-white shadow-xs">
              <Sparkles className="w-4 h-4" />
            </span>
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">
                Síntese Executiva & Diagnóstico Financeiro (IA)
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Análise com modelo de raciocínio rápido sobre fluxo de pagamentos, riscos de
                contratos e equilíbrio orçamentário.
              </CardDescription>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleGerarSinteseIA}
            disabled={!dados || loading || gerandoSintese}
            className="h-8 gap-1 text-xs border-blue-200 text-blue-700 hover:bg-blue-100/50"
          >
            {gerandoSintese ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Atualizar Diagnóstico
          </Button>
        </CardHeader>
        <CardContent className="p-5 space-y-4">
          {gerandoSintese ? (
            <div className="p-8 text-center text-xs text-slate-500 space-y-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-600 mx-auto" />
              <p>Processando compromissos financeiros e gerando síntese executiva...</p>
            </div>
          ) : sinteseIa ? (
            <div className="space-y-4 text-xs">
              {/* Resumo Executivo */}
              <div className="bg-white border border-blue-100 rounded-xl p-4 shadow-xs">
                <h4 className="font-bold text-slate-900 uppercase tracking-wide text-[10px] text-blue-700 mb-1.5">
                  Posição Financeira Consolidada
                </h4>
                <p className="text-slate-700 leading-relaxed text-xs">
                  {sinteseIa.resumo_executivo}
                </p>
              </div>

              {/* Grid: Alertas Críticos + Recomendações Estratégicas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Alertas Críticos */}
                <div className="bg-white border border-red-100 rounded-xl p-4 shadow-xs">
                  <h4 className="font-bold text-red-700 uppercase tracking-wide text-[10px] mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Alertas e Controles de Risco
                  </h4>
                  <ul className="space-y-2">
                    {sinteseIa.alertas_criticos.map((al, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-slate-700 leading-relaxed"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                        <span>{al}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recomendações Estratégicas */}
                <div className="bg-white border border-emerald-100 rounded-xl p-4 shadow-xs">
                  <h4 className="font-bold text-emerald-800 uppercase tracking-wide text-[10px] mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Recomendações para a Diretoria & RH
                  </h4>
                  <ul className="space-y-2">
                    {sinteseIa.recomendacoes_estrategicas.map((rec, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-2 text-slate-700 leading-relaxed"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Análise de Vagas e Projeção Trimestral */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[10px] mb-1">
                    Aderência ao Orçamento das Vagas
                  </h4>
                  <p className="text-slate-600 leading-relaxed">
                    {sinteseIa.analise_orcamento_vagas}
                  </p>
                </div>
                <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wide text-[10px] mb-1">
                    Tendência do Fluxo de Caixa (Trimestre)
                  </h4>
                  <p className="text-slate-600 leading-relaxed">{sinteseIa.projecao_trimestral}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-6 text-center space-y-3">
              <p className="text-xs text-slate-600">
                A síntese executiva por inteligência artificial condensa as notas fiscais do
                período, aditivos contratuais pendentes e o cruzamento com o orçamento das vagas.
              </p>
              <Button
                size="sm"
                onClick={handleGerarSinteseIA}
                disabled={!dados || loading || gerandoSintese}
                className="bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold text-xs gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                Gerar Síntese IA
              </Button>{' '}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
