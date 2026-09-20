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

export default function PainelFinanceiro() {
  const { toast } = useToast()

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
      const res = await carregarDadosFinanceiros(mesSelecionado, anoSelecionado, horizonteProjecao)
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
            className="h-9 gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
          >
            {gerandoSintese ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Analisando...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-blue-200" />
                Síntese Executiva IA
              </>
            )}
          </Button>
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

      {/* 1. KPIs do Topo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Comprometido Mensal PJ */}
        <Card className="border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Comprometido PJ (Mês)
              </span>
              <span className="p-1.5 rounded-md bg-blue-50 text-blue-600">
                <Building2 className="w-4 h-4" />
              </span>
            </div>
            <CardTitle className="text-xl font-extrabold text-slate-900 mt-1">
              {loading ? '...' : formatarMoeda(dados?.kpis.comprometidoMensalPj || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <span>Média:</span>
              <span className="font-semibold text-slate-700">
                {loading ? '...' : formatarMoeda(dados?.kpis.valorHoraMedioPj || 0)}/h
              </span>
              <span className="text-[10px] text-slate-400">(base 160h)</span>
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Total Pago no Período */}
        <Card className="border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Total Pago (Período)
              </span>
              <span className="p-1.5 rounded-md bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </span>
            </div>
            <CardTitle className="text-xl font-extrabold text-emerald-700 mt-1">
              {loading ? '...' : formatarMoeda(dados?.kpis.totalPagoPeriodo || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">{dados?.kpis.nfsPagasCount || 0}</span>{' '}
              NF(s) liquidadas em {MESES.find((m) => m.valor === mesSelecionado)?.nome}
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: A Pagar / Em Aberto */}
        <Card className="border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                A Pagar / Em Aberto
              </span>
              <span className="p-1.5 rounded-md bg-amber-50 text-amber-600">
                <Clock className="w-4 h-4" />
              </span>
            </div>
            <CardTitle className="text-xl font-extrabold text-amber-700 mt-1">
              {loading ? '...' : formatarMoeda(dados?.kpis.aPagarPeriodo || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {dados && dados.kpis.totalAtrasado > 0 ? (
              <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {formatarMoeda(dados.kpis.totalAtrasado)} em atraso
              </p>
            ) : (
              <p className="text-[11px] text-slate-500">Sem pendências vencidas</p>
            )}
          </CardContent>
        </Card>

        {/* KPI 4: Projeção 3 Meses */}
        <Card className="border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Projeção (3 Meses)
              </span>
              <span className="p-1.5 rounded-md bg-indigo-50 text-indigo-600">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <CardTitle className="text-xl font-extrabold text-indigo-700 mt-1">
              {loading ? '...' : formatarMoeda(dados?.kpis.projecaoProximos3Meses || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-500">Contratos vigentes + NFs programadas</p>
          </CardContent>
        </Card>

        {/* KPI 5: Folha Estimada de Contratações */}
        <Card className="border-slate-200/80 shadow-xs hover:border-slate-300 transition-colors">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Folha Contratações
              </span>
              <span className="p-1.5 rounded-md bg-purple-50 text-purple-600">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <CardTitle className="text-xl font-extrabold text-purple-700 mt-1">
              {loading ? '...' : formatarMoeda(dados?.kpis.folhaContratacoesMes || 0)}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-slate-500">
              <span className="font-semibold text-slate-700">
                {dados?.kpis.propostasAceitasCount || 0}
              </span>{' '}
              oferta(s) +{' '}
              <span className="font-semibold text-slate-700">
                {dados?.kpis.onboardingsAtivosCount || 0}
              </span>{' '}
              onboarding
            </p>
          </CardContent>
        </Card>
      </div>

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

      {/* 3. Seção com Duas Abas: Cruzamento com Vagas & Composição por Prestador */}
      <Tabs defaultValue="vagas" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <TabsList className="bg-slate-100 p-1 border border-slate-200">
            <TabsTrigger value="vagas" className="text-xs font-semibold gap-1.5">
              <Briefcase className="w-3.5 h-3.5" />
              Cruzamento com Orçamento das Vagas
            </TabsTrigger>
            <TabsTrigger value="prestadores" className="text-xs font-semibold gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
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
                          <div className="font-bold text-slate-900">{p.nomeFantasia}</div>
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
                disabled={loading || gerandoSintese}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Gerar Síntese Executiva Agora
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
