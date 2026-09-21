import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileSignature,
  FileText,
  Search,
  Filter,
  Download,
  Plus,
  Calendar,
  AlertTriangle,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Scale,
  RefreshCw,
} from 'lucide-react'
import {
  contratosService,
  ContratoUnificado,
  ModalidadeContrato,
  StatusContratoUnificado,
} from '@/services/contratosService'
import { pessoasService, PessoaUnificada } from '@/services/pessoasService'
import { ModalDetalhesContratoVersionado } from '@/components/contratos/ModalDetalhesContratoVersionado'
import { ModalNovoContratoTemplate } from '@/components/contratos/ModalNovoContratoTemplate'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useToast } from '@/hooks/use-toast'

export const ContratosDashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  const [contratos, setContratos] = useState<ContratoUnificado[]>([])
  const [pessoas, setPessoas] = useState<PessoaUnificada[]>([])
  const [carregando, setCarregando] = useState(true)

  // Filtros
  const [termoBusca, setTermoBusca] = useState('')
  const [filtroModalidade, setFiltroModalidade] = useState<string>(
    searchParams.get('modalidade') || 'TODAS',
  )
  const [filtroStatus, setFiltroStatus] = useState<string>(searchParams.get('status') || 'TODOS')
  const [filtroArea, setFiltroArea] = useState<string>('TODAS')
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('todos')

  // Modais
  const [contratoSelecionado, setContratoSelecionado] = useState<ContratoUnificado | null>(null)
  const [modalDetalhesOpen, setModalDetalhesOpen] = useState(false)
  const [modalNovoContratoOpen, setModalNovoContratoOpen] = useState(false)
  const [pessoaParaNovoContrato, setPessoaParaNovoContrato] = useState<PessoaUnificada | null>(null)

  const carregarDados = async () => {
    setCarregando(true)
    try {
      const [cts, pss] = await Promise.all([
        contratosService.listarContratos(),
        pessoasService.listar(),
      ])
      setContratos(cts)
      setPessoas(pss)
    } catch {
      toast({
        title: 'Erro ao carregar contratos',
        description: 'Não foi possível carregar a base unificada de contratos.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Lista de departamentos distintos para o filtro
  const departamentosDisponiveis = useMemo(() => {
    const setDept = new Set<string>()
    contratos.forEach((c) => {
      if (c.departamento) setDept.add(c.departamento)
    })
    return Array.from(setDept).sort()
  }, [contratos])

  // Contratos filtrados
  const contratosFiltrados = useMemo(() => {
    return contratos.filter((c) => {
      // Busca textual
      if (termoBusca.trim()) {
        const busca = termoBusca.toLowerCase()
        const matchTitulo = c.titulo.toLowerCase().includes(busca)
        const matchCodigo = c.codigo_contrato.toLowerCase().includes(busca)
        const matchPessoa = c.expand?.pessoa?.nome?.toLowerCase().includes(busca)
        const matchPrestador = c.expand?.prestador_pj?.razao_social?.toLowerCase().includes(busca)
        const matchDept = c.departamento?.toLowerCase().includes(busca)
        if (!matchTitulo && !matchCodigo && !matchPessoa && !matchPrestador && !matchDept) {
          return false
        }
      }

      // Filtro Modalidade
      if (filtroModalidade !== 'TODAS' && c.modalidade !== filtroModalidade) {
        return false
      }

      // Filtro Status
      if (filtroStatus !== 'TODOS' && c.status !== filtroStatus) {
        return false
      }

      // Filtro Área
      if (filtroArea !== 'TODAS' && c.departamento !== filtroArea) {
        return false
      }

      // Filtro Período de Vencimento
      if (filtroPeriodo !== 'todos' && c.data_fim) {
        const hoje = new Date()
        const dFim = new Date(c.data_fim)
        const diffDias = Math.ceil((dFim.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))

        if (filtroPeriodo === 'vencendo_30d' && (diffDias < 0 || diffDias > 30)) {
          return false
        }
        if (filtroPeriodo === 'vencendo_60d' && (diffDias < 0 || diffDias > 60)) {
          return false
        }
        if (filtroPeriodo === 'vencidos' && diffDias >= 0) {
          return false
        }
      }

      return true
    })
  }, [contratos, termoBusca, filtroModalidade, filtroStatus, filtroArea, filtroPeriodo])

  // KPIs Estratégicos
  const kpis = useMemo(() => {
    const total = contratos.length
    const ativos = contratos.filter((c) => c.status === 'Vigente' || c.status === 'Vencendo').length
    const vencendo = contratos.filter((c) => c.status === 'Vencendo').length
    const emAssinatura = contratos.filter(
      (c) => c.status === 'Em assinatura' || c.status === 'Minuta',
    ).length
    const totalPj = contratos.filter((c) => c.modalidade === 'PJ').length
    const totalClt = contratos.filter((c) => c.modalidade === 'CLT').length
    const folhaMensalAtiva = contratos
      .filter((c) => c.status === 'Vigente' || c.status === 'Vencendo')
      .reduce((acc, c) => acc + (c.valor_mensal || 0), 0)

    return {
      total,
      ativos,
      vencendo,
      emAssinatura,
      totalPj,
      totalClt,
      folhaMensalAtiva,
    }
  }, [contratos])

  // Exportação CSV Completa do Portfólio
  const exportarCSV = () => {
    if (contratosFiltrados.length === 0) {
      toast({
        title: 'Nenhum contrato para exportar',
        description: 'Ajuste os filtros para exibir contratos na listagem.',
      })
      return
    }

    const cabecalhos = [
      'Código Contrato',
      'Título',
      'Modalidade',
      'Tipo Modelo',
      'Status',
      'Pessoa Contratada',
      'CPF/CNPJ Pessoa',
      'Prestador PJ (Razão Social)',
      'CNPJ Prestador',
      'Departamento / Área',
      'Centro de Custo',
      'Cargo / Função',
      'Gestor Responsável',
      'Início Vigência',
      'Término Vigência',
      'Tipo de Prazo',
      'Valor Mensal (R$)',
      'Valor Hora (R$)',
      'Horas Base Mês',
      'Versão Atual',
      'Data de Criação',
    ]

    const linhas = contratosFiltrados.map((c) => {
      const pNome = c.expand?.pessoa?.nome || ''
      const pDoc = c.expand?.pessoa?.cpf_cnpj || ''
      const pjNome = c.expand?.prestador_pj?.razao_social || ''
      const pjCnpj = c.expand?.prestador_pj?.cnpj || ''

      const dataIni = c.data_inicio ? new Date(c.data_inicio).toLocaleDateString('pt-BR') : ''
      const dataFim = c.data_fim
        ? new Date(c.data_fim).toLocaleDateString('pt-BR')
        : 'Indeterminado'
      const dataCriacao = c.created ? new Date(c.created).toLocaleDateString('pt-BR') : ''

      return [
        `"${c.codigo_contrato || ''}"`,
        `"${(c.titulo || '').replace(/"/g, '""')}"`,
        `"${c.modalidade || ''}"`,
        `"${c.tipo_modelo || ''}"`,
        `"${c.status || ''}"`,
        `"${pNome.replace(/"/g, '""')}"`,
        `"${pDoc}"`,
        `"${pjNome.replace(/"/g, '""')}"`,
        `"${pjCnpj}"`,
        `"${(c.departamento || '').replace(/"/g, '""')}"`,
        `"${(c.centro_custo || '').replace(/"/g, '""')}"`,
        `"${(c.cargo_funcao || '').replace(/"/g, '""')}"`,
        `"${(c.gestor_nome || '').replace(/"/g, '""')}"`,
        `"${dataIni}"`,
        `"${dataFim}"`,
        `"${c.prazo_tipo || ''}"`,
        (c.valor_mensal || 0).toFixed(2),
        (c.valor_hora || 0).toFixed(2),
        c.horas_mensais_base || 160,
        `"v${c.versao_atual || 1}.0"`,
        `"${dataCriacao}"`,
      ].join(';')
    })

    const conteudoCSV = '\uFEFF' + [cabecalhos.join(';'), ...linhas].join('\r\n')
    const blob = new Blob([conteudoCSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const timestamp = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `relatorio_contratos_souyess_${timestamp}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast({
      title: 'Relatório CSV Exportado!',
      description: `${contratosFiltrados.length} contrato(s) exportado(s) com dados detalhados para auditoria e contabilidade.`,
    })
  }

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* 1. Header com Identidade SouYess */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-black font-display text-[#212B55] dark:text-[#F7F8FB] flex items-center gap-2.5">
              <FileSignature className="w-6 h-6 text-[#E9530E]" />
              Dashboard de Gestão de Contratos
            </h2>
            <Badge className="bg-[#E9530E]/15 text-[#E9530E] border-[#E9530E]/30 font-display text-xs">
              CLT & PJ Unificado
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1 font-sans">
            Centralização de contratos digitais, modelos jurídicos prontos, fluxo interno de
            assinatura com trilha de auditoria e monitoramento de renovações.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={exportarCSV}
            className="h-8 text-xs font-semibold gap-1.5 border-border shadow-xs hover:bg-muted"
          >
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
            Exportar CSV Contábil
          </Button>

          <Button
            size="sm"
            onClick={() => {
              // Abre com a primeira pessoa da lista ou direciona para ficha
              if (pessoas.length > 0) {
                setPessoaParaNovoContrato(pessoas[0])
                setModalNovoContratoOpen(true)
              } else {
                navigate('/pessoas')
              }
            }}
            className="h-8 text-xs bg-[#E9530E] hover:bg-[#C5430A] text-white font-semibold shadow-xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Gerar Novo Contrato
          </Button>
        </div>
      </div>

      {/* 2. Grid de KPIs Estratégicos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-sans block">
              Total Portfólio
            </span>
            <div className="text-xl font-black text-[#212B55] dark:text-[#F7F8FB] font-display mt-0.5">
              {kpis.total} contratos
            </div>
            <span className="text-[10px] text-muted-foreground font-sans">
              {kpis.totalPj} PJ · {kpis.totalClt} CLT
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-sans block">
              Contratos Vigentes
            </span>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-display mt-0.5">
              {kpis.ativos} em vigor
            </div>
            <span className="text-[10px] text-muted-foreground font-sans">Conformidade ativa</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-sans block flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-500" />
              Em Renovação / Vencendo
            </span>
            <div className="text-xl font-black text-amber-700 dark:text-amber-300 font-display mt-0.5">
              {kpis.vencendo} alerta(s)
            </div>
            <span className="text-[10px] text-muted-foreground font-sans">Janela de 60d / 15d</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-sans block">
              Em Assinatura / Minuta
            </span>
            <div className="text-xl font-black text-blue-700 dark:text-blue-300 font-display mt-0.5">
              {kpis.emAssinatura} pendente(s)
            </div>
            <span className="text-[10px] text-muted-foreground font-sans">Coleta de aceites</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs sm:col-span-2 lg:col-span-2">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-[#E9530E] uppercase tracking-wider font-sans block flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              Comprometimento Mensal Ativo
            </span>
            <div className="text-xl font-black text-[#212B55] dark:text-[#F7F8FB] font-mono mt-0.5">
              R${' '}
              {kpis.folhaMensalAtiva.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </div>
            <span className="text-[10px] text-muted-foreground font-sans">
              Folha consolidada de contratos vigentes (CLT + honorários PJ)
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 3. Barra de Filtros Multifacetados */}
      <Card className="bg-card border-border/80 shadow-xs">
        <CardContent className="p-3.5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            {/* Busca textual */}
            <div className="relative sm:col-span-2">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, código, pessoa, prestador ou área..."
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="pl-8 h-8 text-xs"
              />
            </div>

            {/* Modalidade */}
            <div>
              <Select value={filtroModalidade} onValueChange={(val) => setFiltroModalidade(val)}>
                <SelectTrigger className="h-8 text-xs font-medium">
                  <SelectValue placeholder="Modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS" className="text-xs">
                    Todas as Modalidades
                  </SelectItem>
                  <SelectItem value="PJ" className="text-xs">
                    Apenas PJ (Prestadores)
                  </SelectItem>
                  <SelectItem value="CLT" className="text-xs">
                    Apenas CLT (Trabalho)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div>
              <Select value={filtroStatus} onValueChange={(val) => setFiltroStatus(val)}>
                <SelectTrigger className="h-8 text-xs font-medium">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODOS" className="text-xs">
                    Todos os Status
                  </SelectItem>
                  <SelectItem value="Vigente" className="text-xs">
                    Vigente
                  </SelectItem>
                  <SelectItem value="Vencendo" className="text-xs">
                    Vencendo (Em Renovação)
                  </SelectItem>
                  <SelectItem value="Em assinatura" className="text-xs">
                    Em Assinatura
                  </SelectItem>
                  <SelectItem value="Minuta" className="text-xs">
                    Minuta
                  </SelectItem>
                  <SelectItem value="Encerrado" className="text-xs">
                    Encerrado / Rescindido
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Área / Departamento */}
            <div>
              <Select value={filtroArea} onValueChange={(val) => setFiltroArea(val)}>
                <SelectTrigger className="h-8 text-xs font-medium">
                  <SelectValue placeholder="Área / Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODAS" className="text-xs">
                    Todas as Áreas
                  </SelectItem>
                  {departamentosDisponiveis.map((dep) => (
                    <SelectItem key={dep} value={dep} className="text-xs">
                      {dep}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/50">
            <span>
              Exibindo <strong>{contratosFiltrados.length}</strong> de{' '}
              <strong>{contratos.length}</strong> contrato(s)
            </span>

            {(termoBusca ||
              filtroModalidade !== 'TODAS' ||
              filtroStatus !== 'TODOS' ||
              filtroArea !== 'TODAS') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setTermoBusca('')
                  setFiltroModalidade('TODAS')
                  setFiltroStatus('TODOS')
                  setFiltroArea('TODAS')
                  setFiltroPeriodo('todos')
                }}
                className="h-6 text-[11px] text-[#E9530E] hover:bg-[#FEF1EA] p-1 font-semibold"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Tabela / Listagem de Contratos */}
      {carregando ? (
        <div className="py-16 text-center text-xs text-muted-foreground">
          Carregando contratos centralizados...
        </div>
      ) : contratosFiltrados.length === 0 ? (
        <div className="p-12 text-center bg-card rounded-2xl border border-dashed border-border/80 space-y-3">
          <FileSignature className="w-8 h-8 text-muted-foreground mx-auto" />
          <h4 className="font-bold font-display text-sm text-[#212B55] dark:text-[#F7F8FB]">
            Nenhum contrato encontrado
          </h4>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Não foram localizados contratos para os filtros aplicados. Crie um novo contrato a
            partir de um modelo jurídico ou revise a busca.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {contratosFiltrados.map((ct) => {
            const isPj = ct.modalidade === 'PJ'
            const pessoaNome = ct.expand?.pessoa?.nome || 'Pessoa não vinculada'
            const prestadorNome = ct.expand?.prestador_pj?.razao_social

            return (
              <Card
                key={ct.id}
                className={`border shadow-xs transition-all hover:border-[#E9530E]/50 ${
                  ct.status === 'Vigente'
                    ? 'border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-r from-card to-emerald-50/10'
                    : ct.status === 'Vencendo'
                      ? 'border-amber-200 dark:border-amber-900/60 bg-amber-50/10'
                      : ct.status === 'Em assinatura'
                        ? 'border-blue-200 dark:border-blue-900/60 bg-blue-50/10'
                        : 'border-border/80 bg-card'
                }`}
              >
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Badge
                        className={`text-xs font-bold uppercase font-display ${
                          isPj
                            ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {ct.modalidade}
                      </Badge>

                      <h4 className="font-bold text-sm sm:text-base text-[#212B55] dark:text-[#F7F8FB] font-display">
                        {ct.titulo}
                      </h4>

                      <Badge
                        variant="outline"
                        className="text-[10px] font-mono text-muted-foreground"
                      >
                        {ct.codigo_contrato}
                      </Badge>

                      <Badge
                        variant="outline"
                        className={`text-xs font-semibold ${
                          ct.status === 'Vigente'
                            ? 'text-emerald-700 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
                            : ct.status === 'Vencendo'
                              ? 'text-amber-700 border-amber-300 bg-amber-50 dark:bg-amber-950/40'
                              : ct.status === 'Em assinatura'
                                ? 'text-blue-700 border-blue-300 bg-blue-50 dark:bg-blue-950/40'
                                : 'text-slate-600 border-slate-300'
                        }`}
                      >
                        {ct.status}
                      </Badge>

                      <Badge variant="secondary" className="text-[10px] font-mono">
                        v{ct.versao_atual || 1}.0
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setContratoSelecionado(ct)
                          setModalDetalhesOpen(true)
                        }}
                        className="h-7 text-xs font-semibold gap-1 text-[#212B55] dark:text-[#F7F8FB] border-border hover:bg-muted"
                      >
                        <FileText className="w-3 h-3 text-[#E9530E]" />
                        Versões & Assinaturas
                      </Button>

                      {ct.pessoa && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => navigate(`/pessoas/${ct.pessoa}`)}
                          className="h-7 text-xs text-blue-600 hover:text-blue-800 gap-1 font-semibold"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                          Ficha Vitalícia
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Informações detalhadas do contrato */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Pessoa / Prestador
                      </span>
                      <span className="text-sm font-bold text-[#212B55] dark:text-[#F7F8FB] truncate block">
                        {pessoaNome}
                      </span>
                      {prestadorNome && (
                        <span className="text-[10px] text-muted-foreground truncate block">
                          PJ: {prestadorNome}
                        </span>
                      )}
                    </div>

                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Área & Cargo
                      </span>
                      <span className="text-xs font-semibold text-[#212B55] dark:text-[#F7F8FB] truncate block">
                        {ct.cargo_funcao || 'Cargo não informado'}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate block">
                        {ct.departamento || 'Departamento'} · {ct.centro_custo || 'CC'}
                      </span>
                    </div>

                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Remuneração Mensal
                      </span>
                      <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400 block">
                        R${' '}
                        {ct.valor_mensal?.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono block">
                        R$ {ct.valor_hora?.toFixed(2)}/h ({ct.horas_mensais_base || 160}h base)
                      </span>
                    </div>

                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Vigência Pactuada
                      </span>
                      <span className="text-xs font-semibold font-mono text-[#212B55] dark:text-[#F7F8FB] block">
                        {ct.data_inicio
                          ? new Date(ct.data_inicio).toLocaleDateString('pt-BR')
                          : '—'}{' '}
                        até{' '}
                        {ct.data_fim
                          ? new Date(ct.data_fim).toLocaleDateString('pt-BR')
                          : 'Indeterminado'}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {ct.prazo_tipo || 'Prazo pactuado'}
                      </span>
                    </div>
                  </div>

                  {ct.clausulas_especiais && (
                    <p className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded border border-border/40">
                      "{ct.clausulas_especiais}"
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de Detalhes / Versões / Trilha de Assinatura */}
      {contratoSelecionado && (
        <ModalDetalhesContratoVersionado
          open={modalDetalhesOpen}
          onOpenChange={setModalDetalhesOpen}
          contrato={contratoSelecionado}
          onAtualizar={carregarDados}
        />
      )}

      {/* Modal de Novo Contrato via Template */}
      {pessoaParaNovoContrato && (
        <ModalNovoContratoTemplate
          open={modalNovoContratoOpen}
          onOpenChange={setModalNovoContratoOpen}
          pessoa={pessoaParaNovoContrato}
          onSuccess={carregarDados}
        />
      )}
    </div>
  )
}
export default ContratosDashboardPage
