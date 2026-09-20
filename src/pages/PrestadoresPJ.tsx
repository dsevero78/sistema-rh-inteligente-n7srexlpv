import React, { useEffect, useState, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import {
  prestadoresService,
  PrestadorPJ,
  ContratoPJ,
  DocumentoPJ,
  NotaFiscalPJ,
  AvaliacaoPrestadorPJ,
  MarcoLifecyclePJ,
  EtapaLifecyclePJ,
  AditivoPJ,
  calcularValorMensalEfetivo,
  calcularValorHora,
  HORAS_MES_PADRAO,
} from '@/services/prestadoresPj'
import {
  Building2,
  Users,
  FileText,
  AlertTriangle,
  DollarSign,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldAlert,
  Star,
  RefreshCw,
  Trash2,
  GitCommit,
  Check,
} from 'lucide-react'
import { ModalNovoPrestador } from '@/components/prestadores/ModalNovoPrestador'
import { PrestadorDetalhesView } from '@/components/prestadores/PrestadorDetalhesView'

export const PrestadoresPJ: React.FC = () => {
  const { toast } = useToast()

  // Estados principais
  const [prestadores, setPrestadores] = useState<PrestadorPJ[]>([])
  const [contratos, setContratos] = useState<ContratoPJ[]>([])
  const [documentos, setDocumentos] = useState<DocumentoPJ[]>([])
  const [notasFiscais, setNotasFiscais] = useState<NotaFiscalPJ[]>([])
  const [avaliacoes, setAvaliacoes] = useState<AvaliacaoPrestadorPJ[]>([])
  const [aditivos, setAditivos] = useState<AditivoPJ[]>([])
  const [todosMarcos, setTodosMarcos] = useState<MarcoLifecyclePJ[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Seleção e visualização
  const [prestadorSelecionadoId, setPrestadorSelecionadoId] = useState<string | null>(null)
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [prestadorParaEditar, setPrestadorParaEditar] = useState<PrestadorPJ | null>(null)

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')
  const [filtroArea, setFiltroArea] = useState<string>('todas')
  const [filtroDocVencido, setFiltroDocVencido] = useState<boolean>(false)

  // Modal de Exclusão de Prestador
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [prestadorParaExcluir, setPrestadorParaExcluir] = useState<PrestadorPJ | null>(null)
  const [verificandoDeps, setVerificandoDeps] = useState(false)
  const [dependenciasInfo, setDependenciasInfo] = useState<{
    podeExcluir: boolean
    motivo?: string
  } | null>(null)

  // Carga inicial dos dados
  const carregarDados = async () => {
    try {
      const [pList, cList, dList, nList, aList, adList, mList] = await Promise.all([
        prestadoresService.listarPrestadores(),
        prestadoresService.listarContratos(),
        prestadoresService.listarDocumentos(),
        prestadoresService.listarNotasFiscais(),
        prestadoresService.listarAvaliacoes(),
        prestadoresService.listarAditivos(),
        pb.collection('marcos_lifecycle_pj').getFullList<MarcoLifecyclePJ>({ sort: 'ordem' }),
      ])

      setPrestadores(pList)
      setContratos(cList)
      setDocumentos(dList)
      setNotasFiscais(nList)
      setAvaliacoes(aList)
      setAditivos(adList)
      setTodosMarcos(mList)
    } catch (err) {
      console.error('Erro ao carregar módulo PJ:', err)
      toast({
        title: 'Erro ao carregar dados de prestadores',
        description: 'Tente novamente em instantes.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Inscrição em tempo real para sincronização instantânea
  useRealtime('prestadores_pj', () => carregarDados())
  useRealtime('contratos_pj', () => carregarDados())
  useRealtime('documentos_pj', () => carregarDados())
  useRealtime('aditivos_pj', () => carregarDados())
  useRealtime('notas_fiscais_pj', () => carregarDados())
  useRealtime('avaliacoes_prestador_pj', () => carregarDados())
  useRealtime('marcos_lifecycle_pj', () => carregarDados())

  // Disparo manual da varredura de pendências e renovações
  const handleVarreduraManual = async () => {
    setRefreshing(true)
    try {
      const res = await prestadoresService.executarVarreduraPJ()
      toast({
        title: 'Varredura de Conformidade Concluída',
        description: `${res.alertas_gerados} novo(s) alerta(s) de vencimento gerado(s) com sucesso.`,
      })
      await carregarDados()
    } catch (_) {
      await carregarDados()
      toast({
        title: 'Dados Atualizados',
        description: 'Status de contratos e documentos conferidos com sucesso.',
      })
    } finally {
      setRefreshing(false)
    }
  }

  // Prestadores com documentos vencidos
  const prestadoresIdsComDocsVencidos = useMemo(() => {
    const set = new Set<string>()
    documentos.forEach((d) => {
      if (d.status_calculado === 'Vencido') {
        set.add(d.prestador)
      }
    })
    return set
  }, [documentos])

  // Cálculo de KPIs
  const kpis = useMemo(() => {
    const ativos = prestadores.filter((p) => p.status === 'Ativo').length
    const contratosVigentes = contratos.filter(
      (c) => c.status === 'Vigente' || c.status === 'Vencendo',
    ).length

    const valorMensal = contratos
      .filter((c) => c.status === 'Vigente' || c.status === 'Vencendo')
      .reduce((acc, c) => {
        const aditsDeste = aditivos.filter((a) => a.contrato === c.id)
        return acc + (c.tipo === 'Mensal' ? calcularValorMensalEfetivo(c, aditsDeste) : 0)
      }, 0)

    const valorHoraGeral = Number((valorMensal / HORAS_MES_PADRAO).toFixed(2))
    const totalAditivos = aditivos.length

    const contratosVencendo30Dias = contratos.filter((c) => {
      if (c.status === 'Encerrado' || c.status === 'Rescindido') return false
      const diffDias = Math.ceil(
        (new Date(c.data_fim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
      )
      return diffDias <= 30 && diffDias > 0
    }).length

    const docsVencidos = documentos.filter((d) => d.status_calculado === 'Vencido').length

    return {
      ativos,
      contratosVigentes,
      valorMensal,
      valorHoraGeral,
      totalAditivos,
      contratosVencendo30Dias,
      docsVencidos,
    }
  }, [prestadores, contratos, documentos, aditivos])
  // Lista de áreas únicas para filtro
  const areasDisponiveis = useMemo(() => {
    const set = new Set<string>()
    prestadores.forEach((p) => {
      if (p.area_atuacao) set.add(p.area_atuacao)
    })
    return Array.from(set)
  }, [prestadores])

  // Filtragem dos prestadores
  const prestadoresFiltrados = useMemo(() => {
    return prestadores.filter((p) => {
      // Busca por razão social, nome fantasia ou CNPJ
      const termo = busca.toLowerCase()
      const matchBusca =
        !busca ||
        p.razao_social.toLowerCase().includes(termo) ||
        (p.nome_fantasia && p.nome_fantasia.toLowerCase().includes(termo)) ||
        p.cnpj.includes(termo) ||
        (p.area_atuacao && p.area_atuacao.toLowerCase().includes(termo))

      // Filtro status
      const matchStatus = filtroStatus === 'todos' || p.status === filtroStatus

      // Filtro área
      const matchArea = filtroArea === 'todas' || p.area_atuacao === filtroArea

      // Filtro doc vencido
      const matchDocVencido = !filtroDocVencido || prestadoresIdsComDocsVencidos.has(p.id)

      return matchBusca && matchStatus && matchArea && matchDocVencido
    })
  }, [
    prestadores,
    busca,
    filtroStatus,
    filtroArea,
    filtroDocVencido,
    prestadoresIdsComDocsVencidos,
  ])

  // Detalhes do prestador selecionado
  const prestadorSelecionado = useMemo(() => {
    if (!prestadorSelecionadoId) return null
    return prestadores.find((p) => p.id === prestadorSelecionadoId) || null
  }, [prestadorSelecionadoId, prestadores])

  const contratosDoSelecionado = useMemo(() => {
    if (!prestadorSelecionadoId) return []
    return contratos.filter((c) => c.prestador === prestadorSelecionadoId)
  }, [prestadorSelecionadoId, contratos])

  const docsDoSelecionado = useMemo(() => {
    if (!prestadorSelecionadoId) return []
    return documentos.filter((d) => d.prestador === prestadorSelecionadoId)
  }, [prestadorSelecionadoId, documentos])

  const nfsDoSelecionado = useMemo(() => {
    if (!prestadorSelecionadoId) return []
    return notasFiscais.filter((n) => n.prestador === prestadorSelecionadoId)
  }, [prestadorSelecionadoId, notasFiscais])

  const avaliacoesDoSelecionado = useMemo(() => {
    if (!prestadorSelecionadoId) return []
    return avaliacoes.filter((a) => a.prestador === prestadorSelecionadoId)
  }, [prestadorSelecionadoId, avaliacoes])

  const aditivosDoSelecionado = useMemo(() => {
    if (!prestadorSelecionadoId) return []
    return aditivos.filter((a) => a.prestador === prestadorSelecionadoId)
  }, [prestadorSelecionadoId, aditivos])

  const marcosDoSelecionado = useMemo(() => {
    if (!prestadorSelecionadoId) return []
    return todosMarcos.filter((m) => m.prestador === prestadorSelecionadoId)
  }, [prestadorSelecionadoId, todosMarcos])

  // Fluxo de verificação de dependências antes da exclusão
  const iniciarExclusao = async (prestador: PrestadorPJ, e: React.MouseEvent) => {
    e.stopPropagation()
    setPrestadorParaExcluir(prestador)
    setDeleteModalOpen(true)
    setVerificandoDeps(true)
    try {
      const deps = await prestadoresService.verificarDependenciasExclusao(prestador.id)
      setDependenciasInfo(deps)
    } catch (_) {
      setDependenciasInfo({
        podeExcluir: true,
      })
    } finally {
      setVerificandoDeps(false)
    }
  }

  const confirmarExclusao = async () => {
    if (!prestadorParaExcluir) return
    try {
      await prestadoresService.excluirPrestador(prestadorParaExcluir.id)
      toast({
        title: 'Prestador excluído com sucesso',
        description: 'O fornecedor foi removido do sistema.',
      })
      if (prestadorSelecionadoId === prestadorParaExcluir.id) {
        setPrestadorSelecionadoId(null)
      }
      setDeleteModalOpen(false)
      setPrestadorParaExcluir(null)
      await carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao excluir prestador',
        description: err instanceof Error ? err.message : 'Falha.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Visualização de Detalhes ou Painel Geral */}
      {prestadorSelecionado ? (
        <PrestadorDetalhesView
          prestador={prestadorSelecionado}
          contratos={contratosDoSelecionado}
          documentos={docsDoSelecionado}
          notasFiscais={nfsDoSelecionado}
          avaliacoes={avaliacoesDoSelecionado}
          aditivos={aditivosDoSelecionado}
          marcosLifecycle={marcosDoSelecionado}
          onVoltar={() => setPrestadorSelecionadoId(null)}
          onEditar={() => {
            setPrestadorParaEditar(prestadorSelecionado)
            setModalNovoOpen(true)
          }}
          onAtualizarDados={carregarDados}
        />
      ) : (
        <>
          {/* Cabeçalho da Página */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                    Prestadores de Serviços PJ
                  </h1>
                  <p className="text-xs text-slate-500">
                    Governança de fornecedores terceirizados, vigência de contratos, certidões
                    fiscais e notas fiscais.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleVarreduraManual}
                disabled={refreshing}
                className="h-9 text-xs border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Verificando...' : 'Verificar Vencimentos'}
              </Button>

              <Button
                size="sm"
                onClick={() => {
                  setPrestadorParaEditar(null)
                  setModalNovoOpen(true)
                }}
                className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Novo Prestador PJ
              </Button>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* KPIs no Topo (5 métricas obrigatórias)                           */}
          {/* ---------------------------------------------------------------- */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {/* KPI 1: Prestadores Ativos */}
            <Card className="border-slate-200 shadow-xs bg-gradient-to-br from-white to-slate-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Prestadores Ativos</span>
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">{kpis.ativos}</div>
                <span className="text-[11px] text-slate-400">
                  {prestadores.length} cadastrados no total
                </span>
              </CardContent>
            </Card>

            {/* KPI 2: Contratos Vigentes */}
            <Card className="border-slate-200 shadow-xs bg-gradient-to-br from-white to-slate-50/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Contratos Vigentes</span>
                  <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-2">
                  {kpis.contratosVigentes}
                </div>
                <span className="text-[11px] text-slate-400">Parcerias em execução</span>
              </CardContent>
            </Card>

            {/* KPI 3: Valor Mensal Atual e Valor-Hora (Base 160h/mês) */}
            <Card className="border-slate-200 shadow-xs bg-gradient-to-br from-white to-indigo-50/30">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium">Valor Mensal Atual</span>
                    <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1 py-0.2 rounded font-bold">
                      160h/mês
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <DollarSign className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-xl font-bold text-slate-900 mt-2">
                  R$ {kpis.valorMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[11px] text-indigo-700 font-bold block truncate">
                  R$ {kpis.valorHoraGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/h
                  &bull; {kpis.totalAditivos} aditivos
                </span>
              </CardContent>
            </Card>

            {/* KPI 4: Contratos Vencendo em 30 Dias */}
            <Card className="border-slate-200 shadow-xs bg-gradient-to-br from-white to-amber-50/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Vencendo em 30 Dias</span>
                  <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-amber-700 mt-2">
                  {kpis.contratosVencendo30Dias}
                </div>
                <span className="text-[11px] text-amber-700/80 font-medium">
                  {kpis.contratosVencendo30Dias > 0 ? 'Exigem renovação' : 'Nenhum próximo do fim'}
                </span>
              </CardContent>
            </Card>

            {/* KPI 5: Documentos Vencidos */}
            <Card className="border-slate-200 shadow-xs bg-gradient-to-br from-white to-rose-50/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="text-xs font-medium">Documentos Vencidos</span>
                  <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <ShieldAlert className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-rose-700 mt-2">{kpis.docsVencidos}</div>
                <span className="text-[11px] text-rose-700/80 font-medium">
                  {kpis.docsVencidos > 0 ? 'Pendência de compliance' : 'Certidões em dia'}
                </span>
              </CardContent>
            </Card>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Barra de Busca e Filtros Avançados                               */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Buscar por razão social, nome fantasia, CNPJ ou área..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-9 text-xs border-slate-200 bg-slate-50/40 focus:bg-white"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filtro Status */}
              <Select value={filtroStatus} onValueChange={setFiltroStatus}>
                <SelectTrigger className="h-9 text-xs w-[130px] border-slate-200 bg-white">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos Status</SelectItem>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Em renovação">Em renovação</SelectItem>
                  <SelectItem value="Pausado">Pausado</SelectItem>
                  <SelectItem value="Encerrado">Encerrado</SelectItem>
                </SelectContent>
              </Select>

              {/* Filtro Área */}
              <Select value={filtroArea} onValueChange={setFiltroArea}>
                <SelectTrigger className="h-9 text-xs w-[160px] border-slate-200 bg-white">
                  <SelectValue placeholder="Área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Áreas</SelectItem>
                  {areasDisponiveis.map((area) => (
                    <SelectItem key={area} value={area}>
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Toggle de Documentos Vencidos */}
              <Button
                variant={filtroDocVencido ? 'destructive' : 'outline'}
                size="sm"
                onClick={() => setFiltroDocVencido(!filtroDocVencido)}
                className={`h-9 text-xs ${
                  !filtroDocVencido
                    ? 'border-slate-200 text-slate-700 bg-white hover:bg-slate-50'
                    : ''
                }`}
              >
                <ShieldAlert className="w-3.5 h-3.5 mr-1.5" />
                {filtroDocVencido ? 'Com Docs Vencidos (Ativo)' : 'Docs Vencidos'}
              </Button>
            </div>
          </div>

          {/* ---------------------------------------------------------------- */}
          {/* Grid de Cards dos Prestadores PJ                                 */}
          {/* ---------------------------------------------------------------- */}
          {loading ? (
            <div className="p-12 text-center">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mx-auto mb-2" />
              <p className="text-xs text-slate-500">Carregando prestadores de serviços...</p>
            </div>
          ) : prestadoresFiltrados.length === 0 ? (
            <Card className="border-dashed border-slate-300">
              <CardContent className="p-12 text-center space-y-3">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Nenhum prestador encontrado</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Não há prestadores que correspondam aos filtros selecionados. Tente limpar os
                    termos ou cadastre um novo fornecedor.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setBusca('')
                    setFiltroStatus('todos')
                    setFiltroArea('todas')
                    setFiltroDocVencido(false)
                  }}
                  variant="outline"
                  className="text-xs border-slate-300"
                >
                  Limpar Filtros
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {prestadoresFiltrados.map((p) => {
                const contratosDoPrestador = contratos.filter((c) => c.prestador === p.id)
                const docsDoPrestador = documentos.filter((d) => d.prestador === p.id)
                const temDocVencido = docsDoPrestador.some((d) => d.status_calculado === 'Vencido')
                const temContratoVencendo = contratosDoPrestador.some((c) => {
                  const diff = Math.ceil(
                    (new Date(c.data_fim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                  )
                  return diff <= 30 && diff > 0
                })

                const aditsDestePrestador = aditivos.filter((a) => a.prestador === p.id)
                const valorMensalTotal = contratosDoPrestador
                  .filter((c) => c.status === 'Vigente' || c.status === 'Vencendo')
                  .reduce((acc, c) => {
                    const aditsDoC = aditsDestePrestador.filter((a) => a.contrato === c.id)
                    return acc + (c.tipo === 'Mensal' ? calcularValorMensalEfetivo(c, aditsDoC) : 0)
                  }, 0)

                const valorHoraPrestador = Number((valorMensalTotal / HORAS_MES_PADRAO).toFixed(2))

                return (
                  <Card
                    key={p.id}
                    onClick={() => setPrestadorSelecionadoId(p.id)}
                    className="border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                  >
                    <CardContent className="p-5 space-y-4">
                      {/* Topo do Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className="text-[11px] font-semibold text-blue-600 uppercase tracking-wider">
                              {p.area_atuacao}
                            </span>
                            {temDocVencido && (
                              <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                                Doc Vencido
                              </Badge>
                            )}
                            {temContratoVencendo && (
                              <Badge className="bg-amber-100 text-amber-800 text-[10px] py-0 px-1.5">
                                Contrato a Vencer
                              </Badge>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                            {p.nome_fantasia || p.razao_social}
                          </h3>
                          <p className="text-[11px] text-slate-400 font-mono truncate">{p.cnpj}</p>
                        </div>

                        {/* Pílula da Etapa Atual do Lifecycle em Destaque (como solicitado) */}
                        {(() => {
                          const etapa =
                            p.etapa_lifecycle ||
                            (p.status === 'Em renovação'
                              ? 'Mudanças'
                              : p.status === 'Encerrado'
                                ? 'Saída'
                                : 'Ativo')
                          return (
                            <span className="px-3 py-1 rounded-full bg-[#E5F9ED] text-[#1E3A2B] text-xs font-bold tracking-tight shadow-2xs border border-[#C6EFD7] shrink-0">
                              {etapa}
                            </span>
                          )
                        })()}
                      </div>

                      {/* Mini-indicador de progresso da etapa do Lifecycle */}
                      {(() => {
                        const etapaAtual =
                          p.etapa_lifecycle ||
                          (p.status === 'Em renovação'
                            ? 'Mudanças'
                            : p.status === 'Encerrado'
                              ? 'Saída'
                              : 'Ativo')
                        const marcosDeste = todosMarcos.filter(
                          (m) => m.prestador === p.id && m.etapa === etapaAtual,
                        )
                        const total = marcosDeste.length
                        const concluidos = marcosDeste.filter(
                          (m) => m.status === 'REGISTRADO',
                        ).length
                        const pendPj = marcosDeste.filter(
                          (m) => m.status === 'PENDENTE DO PJ',
                        ).length
                        const pct = total > 0 ? Math.round((concluidos / total) * 100) : 0

                        return (
                          <div className="bg-slate-50/90 rounded-lg p-2.5 border border-slate-100 text-xs space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-slate-700 flex items-center gap-1">
                                <GitCommit className="w-3.5 h-3.5 text-[#2D7A4D]" />
                                Jornada: <strong className="text-slate-900">{etapaAtual}</strong>
                              </span>
                              <span className="text-[#2D7A4D] font-bold">
                                {concluidos}/{total || 4} ({pct}%)
                              </span>
                            </div>

                            {/* Barra de progresso */}
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-[#2D7A4D] transition-all duration-300"
                                style={{ width: `${pct}%` }}
                              />
                            </div>

                            {pendPj > 0 && (
                              <div className="text-[10px] text-amber-800 flex items-center gap-1 font-medium pt-0.5">
                                <Clock className="w-3 h-3 text-amber-600" />
                                {pendPj} ação(ões) pendente(s) do PJ
                              </div>
                            )}
                          </div>
                        )
                      })()}

                      {/* Informações Centrais com Financeiro em Destaque & Valor-Hora (Base 160h) */}
                      <div className="bg-slate-50/80 rounded-lg p-3 text-xs space-y-2 border border-slate-100">
                        <div className="flex justify-between items-center text-slate-600">
                          <span>Contratos & Aditivos:</span>
                          <strong className="text-slate-900">
                            {
                              contratosDoPrestador.filter(
                                (c) => c.status === 'Vigente' || c.status === 'Vencendo',
                              ).length
                            }{' '}
                            ativo(s) &bull;{' '}
                            <span className="text-indigo-700">
                              {aditsDestePrestador.length} aditivo(s)
                            </span>
                          </strong>
                        </div>

                        <div className="flex justify-between items-center text-slate-600">
                          <span>Valor Mensal Atual:</span>
                          <strong className="text-blue-700 font-bold">
                            R${' '}
                            {valorMensalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </strong>
                        </div>

                        {/* Valor-Hora (Base 160h/mês) */}
                        <div className="flex justify-between items-center bg-white p-1.5 rounded-md border border-indigo-100 text-[11px]">
                          <span className="text-indigo-900 font-medium">Valor-Hora (÷ 160h):</span>
                          <strong className="text-indigo-700 font-bold">
                            R${' '}
                            {valorHoraPrestador.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                            /h
                          </strong>
                        </div>

                        <div className="flex justify-between items-center text-slate-600">
                          <span>Responsável:</span>
                          <span className="text-slate-800 truncate max-w-[150px]">
                            {p.contato_nome || 'Não informado'}
                          </span>
                        </div>
                      </div>

                      {/* Rodapé com Média e Ações */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <div className="flex items-center text-purple-600 font-bold text-xs">
                            <Star className="w-3.5 h-3.5 fill-purple-600 mr-1" />
                            {p.media_avaliacao ? p.media_avaliacao.toFixed(1) : 'S/N'}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            ({p.total_avaliacoes || 0} avaliações)
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => iniciarExclusao(p, e)}
                            className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>

                          <div className="flex items-center text-xs font-semibold text-blue-600 group-hover:translate-x-0.5 transition-transform ml-1">
                            Ver Detalhes
                            <ChevronRight className="w-4 h-4 ml-0.5" />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* Modal de Cadastro/Edição de Prestador */}
      <ModalNovoPrestador
        open={modalNovoOpen}
        onOpenChange={setModalNovoOpen}
        prestadorParaEditar={prestadorParaEditar}
        onSuccess={carregarDados}
      />

      {/* Modal de Confirmação de Exclusão de Prestador com Verificação de Dependências */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="max-w-md p-6 bg-white border border-slate-200">
          <DialogHeader className="pb-2 border-b">
            <div className="flex items-center gap-2 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
              <DialogTitle className="text-base font-bold text-slate-900">
                Confirmar Exclusão de Prestador
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-500">
              Esta ação removerá o prestador e seus vínculos do sistema.
            </DialogDescription>
          </DialogHeader>

          <div className="py-3 text-xs space-y-3">
            <p className="text-slate-700">
              Tem certeza que deseja excluir{' '}
              <strong>
                {prestadorParaExcluir?.nome_fantasia || prestadorParaExcluir?.razao_social}
              </strong>
              ?
            </p>

            {verificandoDeps ? (
              <div className="p-3 bg-slate-50 rounded border text-center text-slate-500">
                Verificando contratos e faturas abertas...
              </div>
            ) : dependenciasInfo && !dependenciasInfo.podeExcluir ? (
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-rose-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Exclusão Bloqueada por Dependências
                </div>
                <p className="text-[11px] leading-relaxed">{dependenciasInfo.motivo}</p>
              </div>
            ) : (
              <p className="text-slate-500 text-[11px]">
                Nenhum contrato ativo ou nota pendente impede a remoção.
              </p>
            )}
          </div>

          <DialogFooter className="pt-2 border-t flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              disabled={verificandoDeps || (dependenciasInfo && !dependenciasInfo.podeExcluir)}
              onClick={confirmarExclusao}
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs"
            >
              Confirmar e Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default PrestadoresPJ
