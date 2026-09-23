import React, { useState, useEffect, useMemo } from 'react'
import {
  Calendar,
  Layers,
  FileText,
  Users,
  CheckCircle2,
  Clock,
  RotateCcw,
  Plus,
  Filter,
  DollarSign,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Building2,
  HelpCircle,
  Briefcase,
  Copy,
  Check,
  Send,
  Eye,
  Lock,
} from 'lucide-react'
import { AbaCapacidadeAlocacoes } from '@/components/planejamento/AbaCapacidadeAlocacoes'
import { AbaCenariosComparador } from '@/components/planejamento/AbaCenariosComparador'
import { AbaIndicadoresForca } from '@/components/planejamento/AbaIndicadoresForca'
import { useAuth } from '@/contexts/AuthContext'
import {
  planejamentoForcaService,
  PlanoCapacidade,
  DemandaPlanejada,
  PosicaoPlanejada,
  SolicitacaoContratacaoPlano,
  SituacaoPlano,
} from '@/services/planejamentoForcaService'
import { empresasService, Empresa } from '@/services/empresasService'
import { catalogosService, Cargo, CentroCusto, Competencia } from '@/services/catalogosService'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'

export const PlanejamentoForcaPage: React.FC = () => {
  const { user } = useAuth()
  const isRh = user?.cargo_funcao !== 'Gestor Contratante'

  // Estados de dados
  const [planos, setPlanos] = useState<PlanoCapacidade[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([])
  const [competencias, setCompetencias] = useState<Competencia[]>([])
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoCapacidade | null>(null)

  const [demandas, setDemandas] = useState<DemandaPlanejada[]>([])
  const [posicoes, setPosicoes] = useState<PosicaoPlanejada[]>([])
  const [solicitacoes, setSolicitacoes] = useState<SolicitacaoContratacaoPlano[]>([])

  const [loading, setLoading] = useState(true)
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('todas')
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todas')

  // Modais
  const [modalNovoPlanoOpen, setModalNovoPlanoOpen] = useState(false)
  const [modalNovaDemandaOpen, setModalNovaDemandaOpen] = useState(false)
  const [modalNovaPosicaoOpen, setModalNovaPosicaoOpen] = useState(false)
  const [modalDevolverOpen, setModalDevolverOpen] = useState(false)
  const [justificativaDevolucao, setJustificativaDevolucao] = useState('')
  const [modalSnapshotOpen, setModalSnapshotOpen] = useState(false)
  const [modalCompararOpen, setModalCompararOpen] = useState(false)

  // Formulário Novo Plano
  const [novoCodigoPlano, setNovoCodigoPlano] = useState('')
  const [novoNomePlano, setNovoNomePlano] = useState('')
  const [novoPeriodoPlano, setNovoPeriodoPlano] = useState('2026-Q4')
  const [novaEmpresaPlano, setNovaEmpresaPlano] = useState('')
  const [novoObjetivoPlano, setNovoObjetivoPlano] = useState('')
  const [novasPremissasPlano, setNovasPremissasPlano] = useState('')

  // Formulário Nova Demanda
  const [novaDemOrigem, setNovaDemOrigem] = useState('')
  const [novaDemProblema, setNovaDemProblema] = useState('')
  const [novaDemResultado, setNovaDemResultado] = useState('')
  const [novaDemPeriodo, setNovaDemPeriodo] = useState('2026-Q4')
  const [novaDemPrioridade, setNovaDemPrioridade] = useState<
    'Alta' | 'Media' | 'Baixa' | 'Critica'
  >('Alta')
  const [novaDemGrau, setNovaDemGrau] = useState<'confirmada' | 'provavel' | 'exploratoria'>(
    'confirmada',
  )
  const [novaDemQtd, setNovaDemQtd] = useState(1)
  const [novaDemUnidade, setNovaDemUnidade] = useState('posicao_tecnica')
  const [novaDemConsequencia, setNovaDemConsequencia] = useState('')
  const [novaDemRefProjeto, setNovaDemRefProjeto] = useState('')
  const [novaDemProjetoNaoVinculado, setNovaDemProjetoNaoVinculado] = useState(true)

  // Formulário Nova Posição (suporta lote)
  const [novaPosCargo, setNovaPosCargo] = useState('')
  const [novaPosDemandaId, setNovaPosDemandaId] = useState<string>('nenhuma')
  const [novaPosCentroCusto, setNovaPosCentroCusto] = useState<string>('nenhum')
  const [novaPosProposito, setNovaPosProposito] = useState('')
  const [novaPosCriticidade, setNovaPosCriticidade] = useState<
    'Baixa' | 'Media' | 'Alta' | 'Critica'
  >('Alta')
  const [novaPosModalidade, setNovaPosModalidade] = useState<'Presencial' | 'Hibrido' | 'Remoto'>(
    'Remoto',
  )
  const [novaPosTipo, setNovaPosTipo] = useState<
    'nova_posicao' | 'substituicao' | 'necessidade_temporaria'
  >('nova_posicao')
  const [novaPosDataInicio, setNovaPosDataInicio] = useState('2026-11-01')
  const [novaPosJustificativa, setNovaPosJustificativa] = useState('')
  const [novaPosCustoTipo, setNovaPosCustoTipo] = useState<'recorrente' | 'pontual'>('recorrente')
  const [novaPosCustoEstimado, setNovaPosCustoEstimado] = useState<string>('')
  const [novaPosCustoInformado, setNovaPosCustoInformado] = useState(true)
  const [novaPosQtdLote, setNovaPosQtdLote] = useState(1)

  // Carregar dados iniciais
  const carregarDados = async () => {
    try {
      setLoading(true)
      const [listaPlanos, listaEmpresas, listaCargos, listaCc, listaComp] = await Promise.all([
        planejamentoForcaService.listarPlanos(filtroEmpresa),
        empresasService.listarEmpresas(),
        catalogosService.listarCargos(),
        catalogosService.listarCentrosCusto(),
        catalogosService.listarCompetencias(),
      ])

      setPlanos(listaPlanos)
      setEmpresas(listaEmpresas)
      setCargos(listaCargos)
      setCentrosCusto(listaCc)
      setCompetencias(listaComp)

      if (listaPlanos.length > 0) {
        const ativo = planoSelecionado
          ? listaPlanos.find((p) => p.id === planoSelecionado.id) || listaPlanos[0]
          : listaPlanos[0]
        setPlanoSelecionado(ativo)
      } else {
        setPlanoSelecionado(null)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar planejamento',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [filtroEmpresa])

  // Carregar detalhes do plano selecionado
  useEffect(() => {
    if (!planoSelecionado) {
      setDemandas([])
      setPosicoes([])
      setSolicitacoes([])
      return
    }

    const carregarDetalhes = async () => {
      try {
        const [dems, pos, solics] = await Promise.all([
          planejamentoForcaService.listarDemandas(planoSelecionado.id),
          planejamentoForcaService.listarPosicoes(planoSelecionado.id),
          planejamentoForcaService.listarSolicitacoesPlano(planoSelecionado.id),
        ])
        setDemandas(dems)
        setPosicoes(pos)
        setSolicitacoes(solics)
      } catch (err: any) {
        console.error('Erro ao carregar detalhes do plano:', err)
      }
    }

    carregarDetalhes()
  }, [planoSelecionado?.id])

  // Cálculos preliminares de custos
  const resumoCustos = useMemo(() => {
    return planejamentoForcaService.calcularResumoCustos(posicoes)
  }, [posicoes])

  // Verificação de pendências
  const pendencias = useMemo(() => {
    const lista: string[] = []
    if (!posicoes.length) {
      lista.push('O plano ainda não possui nenhuma posição dimensionada.')
    }
    if (resumoCustos.custosNaoInformadosCount > 0) {
      lista.push(
        `${resumoCustos.custosNaoInformadosCount} posição(ões) sem estimativa de custo formal informada (total parcial).`,
      )
    }
    if (
      !planoSelecionado?.alcada_aprovacao_definida &&
      planoSelecionado?.situacao === 'Em análise'
    ) {
      lista.push(
        'Alçada executiva do plano não definida formalmente: aprovação restrita pelo sistema de governança.',
      )
    }
    return lista
  }, [posicoes, resumoCustos, planoSelecionado])

  // Handlers de ações de Plano
  const handleCriarPlano = async () => {
    if (!novoCodigoPlano || !novoNomePlano || !novaEmpresaPlano) {
      toast({
        title: 'Preencha os campos obrigatórios',
        description: 'Código, nome e empresa são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    try {
      const criado = await planejamentoForcaService.criarPlano({
        codigo: novoCodigoPlano.toUpperCase(),
        nome: novoNomePlano,
        periodo_referencia: novoPeriodoPlano,
        empresa: novaEmpresaPlano,
        responsavel: user?.id || '',
        responsavel_nome: user?.name || '',
        objetivo: novoObjetivoPlano || 'Planejamento de força de trabalho',
        premissas: novasPremissasPlano,
        alcada_aprovacao_definida: false,
      })
      toast({
        title: 'Plano criado com sucesso',
        description: `Plano ${criado.codigo} iniciado em Rascunho.`,
      })
      setModalNovoPlanoOpen(false)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao criar plano',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleSubmeter = async () => {
    if (!planoSelecionado) return
    try {
      const atualizado = await planejamentoForcaService.submeterPlano(
        planoSelecionado.id,
        user?.id || '',
      )
      toast({
        title: 'Plano submetido para análise',
        description: 'A versão foi congelada para edição e encaminhada à governança.',
      })
      setPlanoSelecionado(atualizado)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Falha na submissão',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleDevolver = async () => {
    if (!planoSelecionado || !justificativaDevolucao.trim()) {
      toast({
        title: 'Justificativa obrigatória',
        description: 'Informe a justificativa do retorno para ajuste.',
        variant: 'destructive',
      })
      return
    }
    try {
      const atualizado = await planejamentoForcaService.devolverPlano(
        planoSelecionado.id,
        user?.id || '',
        justificativaDevolucao,
      )
      toast({
        title: 'Plano devolvido para ajuste',
        description: 'O gestor responsável foi notificado.',
      })
      setModalDevolverOpen(false)
      setJustificativaDevolucao('')
      setPlanoSelecionado(atualizado)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Falha na devolução',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleAprovar = async (permitirTeste = false) => {
    if (!planoSelecionado) return
    try {
      const atualizado = await planejamentoForcaService.aprovarPlano(
        planoSelecionado.id,
        user?.id || '',
        permitirTeste,
      )
      toast({
        title: 'Plano aprovado com sucesso!',
        description: 'Snapshot imutável gerado e integridade assegurada.',
      })
      setPlanoSelecionado(atualizado)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Aprovação bloqueada',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleIniciarRevisao = async () => {
    if (!planoSelecionado) return
    try {
      const novaVersao = await planejamentoForcaService.iniciarNovaRevisao(
        planoSelecionado.id,
        user?.id || '',
      )
      toast({
        title: 'Nova versão em elaboração',
        description: `Versão ${novaVersao.rotulo_versao} criada. A versão anterior continua ativa até a aprovação da nova.`,
      })
      setPlanoSelecionado(novaVersao)
      carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao iniciar revisão',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Handlers de Demanda
  const handleCriarDemanda = async () => {
    if (!planoSelecionado || !novaDemOrigem || !novaDemProblema || !novaDemResultado) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Origem, problema e resultado esperado são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    try {
      const codigoDemanda = `DEM-${planoSelecionado.codigo.replace('PLANO-', '')}-${String(demandas.length + 1).padStart(3, '0')}`
      await planejamentoForcaService.criarDemanda({
        plano: planoSelecionado.id,
        codigo: codigoDemanda,
        origem: novaDemOrigem,
        problema_necessidade: novaDemProblema,
        resultado_esperado: novaDemResultado,
        responsavel: user?.id || '',
        responsavel_nome: user?.name || '',
        empresa: planoSelecionado.empresa,
        area: planoSelecionado.area,
        periodo_necessario: novaDemPeriodo,
        data_necessaria: '2026-11-01',
        prioridade: novaDemPrioridade,
        grau_confirmacao: novaDemGrau,
        quantidade: novaDemQtd,
        unidade_necessidade: novaDemUnidade,
        consequencia_nao_atendimento: novaDemConsequencia || 'Impacto nas entregas acordadas.',
        referencia_projeto_cliente: novaDemRefProjeto || undefined,
        projeto_nao_vinculado_info: novaDemProjetoNaoVinculado,
      })

      toast({ title: 'Demanda adicionada com sucesso' })
      setModalNovaDemandaOpen(false)
      // Recarregar demandas
      const dems = await planejamentoForcaService.listarDemandas(planoSelecionado.id)
      setDemandas(dems)
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar demanda',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Handlers de Posição
  const handleCriarPosicao = async () => {
    if (!planoSelecionado || !novaPosCargo || !novaPosProposito) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Cargo e propósito são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    try {
      const prefixo = `POS-${planoSelecionado.codigo.replace('PLANO-', '')}`
      const custoNum =
        novaPosCustoInformado && novaPosCustoEstimado ? parseFloat(novaPosCustoEstimado) : undefined

      const dadosBase = {
        plano: planoSelecionado.id,
        demanda: novaPosDemandaId === 'nenhuma' ? undefined : novaPosDemandaId,
        cargo: novaPosCargo,
        empresa: planoSelecionado.empresa,
        area: planoSelecionado.area,
        centro_custo: novaPosCentroCusto === 'nenhum' ? undefined : novaPosCentroCusto,
        proposito_resultados: novaPosProposito,
        criticidade: novaPosCriticidade,
        modalidade_prevista: novaPosModalidade,
        tipo: novaPosTipo,
        data_inicio_prevista: novaPosDataInicio,
        justificativa: novaPosJustificativa || 'Dimensionamento planejado da força de trabalho.',
        custo_tipo: novaPosCustoTipo,
        custo_periodicidade: 'mensal' as const,
        custo_estimado: custoNum,
        custo_informado: novaPosCustoInformado,
        custo_periodo_incidencia: 'A partir da admissão',
        custo_fonte: 'Estimativa inicial do gestor',
      }

      if (novaPosQtdLote > 1) {
        await planejamentoForcaService.criarPosicoesEmLote(dadosBase, novaPosQtdLote, prefixo)
        toast({
          title: 'Lote de posições criado',
          description: `${novaPosQtdLote} posições individuais foram adicionadas com códigos sequenciais.`,
        })
      } else {
        const codigoPos = `${prefixo}-${String(posicoes.length + 1).padStart(3, '0')}`
        await planejamentoForcaService.criarPosicao({
          ...dadosBase,
          codigo: codigoPos,
        })
        toast({ title: 'Posição adicionada com sucesso' })
      }

      setModalNovaPosicaoOpen(false)
      const listaPos = await planejamentoForcaService.listarPosicoes(planoSelecionado.id)
      setPosicoes(listaPos)
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar posição',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Integração com Vagas: Gerar solicitação de contratação
  const handleGerarSolicitacaoContratacao = async (posicao: PosicaoPlanejada) => {
    if (!planoSelecionado) return
    try {
      const res = await planejamentoForcaService.gerarSolicitacaoContratacao({
        planoId: planoSelecionado.id,
        posicaoId: posicao.id,
        userId: user?.id || '',
        userName: user?.name || 'Gestor',
      })

      toast({
        title: 'Solicitação de contratação aberta',
        description: `Vaga vinculada criada no fluxo independente. A posição permanece no plano como referência.`,
      })

      const solics = await planejamentoForcaService.listarSolicitacoesPlano(planoSelecionado.id)
      setSolicitacoes(solics)
    } catch (err: any) {
      toast({
        title: 'Falha ao solicitar contratação',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Status Badge Helper
  const getBadgeSituacao = (situacao: SituacaoPlano) => {
    switch (situacao) {
      case 'Rascunho':
        return (
          <Badge
            variant="outline"
            className="border-amber-500 text-amber-700 bg-amber-50 dark:bg-amber-950/30"
          >
            Rascunho
          </Badge>
        )
      case 'Em análise':
        return <Badge className="bg-blue-600 hover:bg-blue-700 text-white">Em análise</Badge>
      case 'Devolvido para ajuste':
        return <Badge variant="destructive">Devolvido para ajuste</Badge>
      case 'Aprovado':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Aprovado</Badge>
      case 'Substituído por nova versão':
        return <Badge variant="secondary">Substituído por nova versão</Badge>
      case 'Arquivado':
        return <Badge variant="outline">Arquivado</Badge>
      default:
        return <Badge>{situacao}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Superior */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Planejamento da Força de Trabalho
            </h1>
            <Badge variant="outline" className="text-xs bg-muted/50">
              Etapa 3 • Homologação
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão estratégica de planos, versões congeladas, demandas qualificadas e posições
            dimensionadas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isRh && (
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-muted-foreground" />
              <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
                <SelectTrigger className="w-[180px] h-9 text-xs">
                  <SelectValue placeholder="Filtrar por BU" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as BUs (Grupo)</SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome_fantasia || e.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            size="sm"
            onClick={() => {
              setNovoCodigoPlano(
                `PLANO-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
              )
              setNovoNomePlano('')
              setNovaEmpresaPlano(empresas[0]?.id || '')
              setModalNovoPlanoOpen(true)
            }}
            className="gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Novo Plano
          </Button>
        </div>
      </div>

      {/* Conteúdo Principal em 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel Esquerdo: Lista de Planos e Versões */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Planos Registrados ({planos.length})
            </h2>
          </div>

          <div className="space-y-3">
            {planos.map((plano) => {
              const isSelected = planoSelecionado?.id === plano.id
              return (
                <Card
                  key={plano.id}
                  onClick={() => setPlanoSelecionado(plano)}
                  className={`cursor-pointer transition-all border ${
                    isSelected
                      ? 'border-primary ring-1 ring-primary shadow-sm bg-primary/5 dark:bg-primary/10'
                      : 'hover:border-muted-foreground/30'
                  }`}
                >
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-primary">
                        {plano.codigo}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          {plano.rotulo_versao}
                        </Badge>
                        {getBadgeSituacao(plano.situacao)}
                      </div>
                    </div>

                    <h3 className="font-medium text-sm text-foreground line-clamp-1">
                      {plano.nome}
                    </h3>

                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t border-border/40">
                      <span>{plano.expand?.empresa?.nome_fantasia || 'Empresa'}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {plano.periodo_referencia}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {planos.length === 0 && !loading && (
              <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-sm">
                Nenhum plano encontrado para a BU selecionada.
              </div>
            )}
          </div>
        </div>

        {/* Painel Direito: Detalhes, Demandas, Posições e Integração */}
        <div className="lg:col-span-8">
          {planoSelecionado ? (
            <div className="space-y-6">
              {/* Barra de Ações e Estado do Plano */}
              <Card className="border shadow-sm">
                <CardHeader className="p-5 pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold text-foreground">
                          {planoSelecionado.nome}
                        </h2>
                        <Badge variant="outline" className="font-mono">
                          {planoSelecionado.rotulo_versao}
                        </Badge>
                        {getBadgeSituacao(planoSelecionado.situacao)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Ref: {planoSelecionado.codigo} • Responsável:{' '}
                        {planoSelecionado.responsavel_nome ||
                          planoSelecionado.expand?.responsavel?.name}{' '}
                        • BU: {planoSelecionado.expand?.empresa?.nome_fantasia}
                      </p>
                    </div>

                    {/* Botões de Transição de Estado */}
                    <div className="flex flex-wrap items-center gap-2">
                      {planoSelecionado.situacao === 'Rascunho' && (
                        <Button
                          size="sm"
                          onClick={handleSubmeter}
                          className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Submeter para Análise
                        </Button>
                      )}

                      {planoSelecionado.situacao === 'Devolvido para ajuste' && (
                        <Button
                          size="sm"
                          onClick={handleSubmeter}
                          className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Reenviar para Análise
                        </Button>
                      )}

                      {planoSelecionado.situacao === 'Em análise' && isRh && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setModalDevolverOpen(true)}
                            className="text-amber-600 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Devolver com Ajuste
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleAprovar(false)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Aprovar Plano
                          </Button>
                        </>
                      )}

                      {planoSelecionado.situacao === 'Aprovado' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setModalSnapshotOpen(true)}
                            className="gap-1 text-xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            Ver Snapshot Histórico
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={handleIniciarRevisao}
                            className="gap-1 text-xs"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Iniciar Nova Revisão
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 pt-0 space-y-4">
                  {/* Justificativa de Devolução (se houver) */}
                  {planoSelecionado.justificativa_devolucao && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-xs text-destructive flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <strong>Motivo da Devolução:</strong>{' '}
                        {planoSelecionado.justificativa_devolucao}
                      </div>
                    </div>
                  )}

                  {/* Resumo Financeiro Preliminar */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 bg-muted/40 rounded-lg border border-border/40">
                      <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                        <span>Custo Recorrente Mensal</span>
                        <DollarSign className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="text-lg font-bold mt-1">
                        R${' '}
                        {resumoCustos.totalRecorrenteMensal.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                        <span className="text-xs text-muted-foreground font-normal"> /mês</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Estimativa preliminar (não gera lançamento contábil)
                      </p>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg border border-border/40">
                      <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                        <span>Custos Pontuais Totais</span>
                        <DollarSign className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div className="text-lg font-bold mt-1 text-amber-600 dark:text-amber-400">
                        R${' '}
                        {resumoCustos.totalPontual.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Entregáveis ou contratos fechados temporários
                      </p>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg border border-border/40">
                      <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                        <span>Status das Estimativas</span>
                        {resumoCustos.isTotalParcial ? (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </div>
                      <div className="text-sm font-semibold mt-1">
                        {resumoCustos.isTotalParcial ? (
                          <Badge variant="outline" className="border-amber-400 text-amber-600">
                            CÁLCULO PARCIAL
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="border-emerald-400 text-emerald-600">
                            COMPLETO
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {resumoCustos.custosInformadosCount} informadas •{' '}
                        {resumoCustos.custosNaoInformadosCount} sem estimativa
                      </p>
                    </div>
                  </div>

                  {/* Pendências de Preenchimento */}
                  {pendencias.length > 0 && (
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md text-xs space-y-1">
                      <div className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Avisos e Pendências do Plano:
                      </div>
                      <ul className="list-disc list-inside text-amber-700 dark:text-amber-400 pl-1">
                        {pendencias.map((pend, idx) => (
                          <li key={idx}>{pend}</li>
                        ))}
                      </ul>
                      {!planoSelecionado.alcada_aprovacao_definida &&
                        planoSelecionado.situacao === 'Em análise' && (
                          <div className="pt-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-[10px] h-6 px-2 text-amber-700 border-amber-300 hover:bg-amber-100"
                              onClick={() => handleAprovar(true)}
                            >
                              Autorizar Aprovação em Homologação (Teste Explícito)
                            </Button>
                          </div>
                        )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Abas: Demandas, Posições, Rastreabilidade de Contratações, Etapa 4 e Etapa 5 (Cenários & Indicadores) */}
              <Tabs defaultValue="capacidade_alocacoes" className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  <TabsTrigger
                    value="capacidade_alocacoes"
                    className="text-xs font-semibold text-primary"
                  >
                    Capacidade &amp; Alocações
                  </TabsTrigger>
                  <TabsTrigger
                    value="cenarios"
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400"
                  >
                    Cenários &amp; IA (Etapa 5)
                  </TabsTrigger>
                  <TabsTrigger
                    value="indicadores"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    Indicadores (Auditáveis)
                  </TabsTrigger>
                  <TabsTrigger value="posicoes" className="text-xs">
                    Posições ({posicoes.length})
                  </TabsTrigger>
                  <TabsTrigger value="demandas" className="text-xs">
                    Demandas ({demandas.length})
                  </TabsTrigger>
                  <TabsTrigger value="solicitacoes" className="text-xs">
                    Vagas ({solicitacoes.length})
                  </TabsTrigger>
                </TabsList>

                {/* ABA ETAPA 5: CENÁRIOS COMPARATIVOS, PREMISSAS E APOIO DE IA */}
                <TabsContent value="cenarios" className="space-y-4 pt-3">
                  <AbaCenariosComparador
                    empresaId={planoSelecionado.empresa}
                    planoBaseId={planoSelecionado.id}
                  />
                </TabsContent>

                {/* ABA ETAPA 5: INDICADORES DETERMINÍSTICOS E VERIFICÁVEIS */}
                <TabsContent value="indicadores" className="space-y-4 pt-3">
                  <AbaIndicadoresForca
                    empresaId={planoSelecionado.empresa}
                    periodoReferencia="2026-11"
                  />
                </TabsContent>

                {/* ABA ETAPA 4: CAPACIDADE, ALOCAÇÕES, OCUPAÇÕES, COMPETÊNCIAS E CUSTOS */}
                <TabsContent value="capacidade_alocacoes" className="space-y-4 pt-3">
                  <AbaCapacidadeAlocacoes
                    plano={planoSelecionado}
                    posicoesPlano={posicoes}
                    filtroEmpresa={filtroEmpresa}
                  />
                </TabsContent>

                {/* ABA POSIÇÕES */}
                <TabsContent value="posicoes" className="space-y-4 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">
                        Postos Organizacionais Identificados
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Postos vinculados a cargos do catálogo v0.0.85, centros de custo e demandas
                        de origem.
                      </p>
                    </div>

                    {(planoSelecionado.situacao === 'Rascunho' ||
                      planoSelecionado.situacao === 'Devolvido para ajuste') && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setNovaPosCargo(cargos[0]?.id || '')
                          setNovaPosDemandaId(demandas[0]?.id || 'nenhuma')
                          setNovaPosCentroCusto(centrosCusto[0]?.id || 'nenhum')
                          setNovaPosProposito('')
                          setNovaPosQtdLote(1)
                          setModalNovaPosicaoOpen(true)
                        }}
                        className="gap-1.5 h-8 text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Posição
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {posicoes.map((pos) => {
                      const solicitacaoAtiva = solicitacoes.find(
                        (s) => s.posicao === pos.id && s.status !== 'cancelada',
                      )

                      return (
                        <Card key={pos.id} className="border shadow-none">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-primary">
                                  {pos.codigo}
                                </span>
                                <Badge variant="secondary" className="text-xs font-medium">
                                  {pos.expand?.cargo?.nome || 'Cargo do Catálogo'}
                                </Badge>
                                {pos.lote_identificador && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] text-muted-foreground"
                                  >
                                    Lote ({pos.lote_indice})
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {pos.tipo === 'nova_posicao'
                                    ? 'Nova Posição'
                                    : pos.tipo === 'substituicao'
                                      ? 'Substituição'
                                      : 'Necessidade Temporária'}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={
                                    pos.criticidade === 'Critica' || pos.criticidade === 'Alta'
                                      ? 'border-destructive text-destructive'
                                      : ''
                                  }
                                >
                                  {pos.criticidade}
                                </Badge>
                              </div>
                            </div>

                            <p className="text-xs text-foreground">
                              <strong>Propósito:</strong> {pos.proposito_resultados}
                            </p>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-muted-foreground pt-1">
                              <div>
                                <span className="font-medium text-foreground">Modalidade:</span>{' '}
                                {pos.modalidade_prevista}
                              </div>
                              <div>
                                <span className="font-medium text-foreground">Início:</span>{' '}
                                {new Date(pos.data_inicio_prevista).toLocaleDateString('pt-BR')}
                              </div>
                              <div>
                                <span className="font-medium text-foreground">
                                  Centro de Custo:
                                </span>{' '}
                                {pos.expand?.centro_custo?.codigo || 'N/A'}
                              </div>
                              <div>
                                <span className="font-medium text-foreground">Custo Estimado:</span>{' '}
                                {pos.custo_informado && pos.custo_estimado !== undefined ? (
                                  <span className="font-bold text-foreground">
                                    R$ {pos.custo_estimado.toLocaleString('pt-BR')} (
                                    {pos.custo_tipo})
                                  </span>
                                ) : (
                                  <span className="text-amber-600 font-medium">Não informado</span>
                                )}
                              </div>
                            </div>

                            {/* Ações de Integração com Vagas para Posição Aprovada */}
                            {planoSelecionado.situacao === 'Aprovado' && (
                              <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                                <div className="text-[11px] text-muted-foreground">
                                  {solicitacaoAtiva ? (
                                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Solicitação de contratação em andamento (Vaga vinculada)
                                    </span>
                                  ) : (
                                    <span>
                                      Posição aprovada disponível para abertura de contratação.
                                    </span>
                                  )}
                                </div>

                                {!solicitacaoAtiva ? (
                                  <Button
                                    size="sm"
                                    onClick={() => handleGerarSolicitacaoContratacao(pos)}
                                    className="h-7 text-xs gap-1 bg-primary"
                                  >
                                    <Briefcase className="w-3.5 h-3.5" />
                                    Abrir Solicitação de Vaga
                                  </Button>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="border-emerald-300 text-emerald-700 bg-emerald-50"
                                  >
                                    Vaga Solicitada
                                  </Badge>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )
                    })}

                    {posicoes.length === 0 && (
                      <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-xs">
                        Nenhuma posição planejada inserida neste plano.
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ABA DEMANDAS */}
                <TabsContent value="demandas" className="space-y-4 pt-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold">Demandas Corporativas Mapeadas</h3>
                      <p className="text-xs text-muted-foreground">
                        Problemas, necessidades e resultados esperados que justificam o
                        dimensionamento.
                      </p>
                    </div>

                    {(planoSelecionado.situacao === 'Rascunho' ||
                      planoSelecionado.situacao === 'Devolvido para ajuste') && (
                      <Button
                        size="sm"
                        onClick={() => {
                          setNovaDemOrigem('')
                          setNovaDemProblema('')
                          setNovaDemResultado('')
                          setNovaDemConsequencia('')
                          setNovaDemRefProjeto('')
                          setModalNovaDemandaOpen(true)
                        }}
                        className="gap-1.5 h-8 text-xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Nova Demanda
                      </Button>
                    )}
                  </div>

                  <div className="space-y-3">
                    {demandas.map((dem) => (
                      <Card key={dem.id} className="border shadow-none">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between border-b border-border/40 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-primary">
                                {dem.codigo}
                              </span>
                              <span className="font-medium text-xs text-foreground">
                                {dem.origem}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={
                                  dem.grau_confirmacao === 'confirmada'
                                    ? 'border-emerald-500 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20'
                                    : dem.grau_confirmacao === 'provavel'
                                      ? 'border-blue-500 text-blue-700 bg-blue-50'
                                      : 'border-amber-500 text-amber-700 bg-amber-50'
                                }
                              >
                                {dem.grau_confirmacao.toUpperCase()}
                              </Badge>
                              <Badge variant="secondary">{dem.prioridade}</Badge>
                            </div>
                          </div>

                          <div className="text-xs space-y-1">
                            <p>
                              <strong>Problema / Necessidade:</strong> {dem.problema_necessidade}
                            </p>
                            <p>
                              <strong>Resultado Esperado:</strong> {dem.resultado_esperado}
                            </p>
                            <p className="text-destructive dark:text-red-400">
                              <strong>Risco de não atendimento:</strong>{' '}
                              {dem.consequencia_nao_atendimento}
                            </p>
                          </div>

                          {dem.referencia_projeto_cliente && (
                            <div className="p-2 bg-muted/40 rounded border border-border/40 text-[11px] text-muted-foreground flex items-center justify-between">
                              <span>Ref. Projeto: {dem.referencia_projeto_cliente}</span>
                              <Badge variant="outline" className="text-[10px]">
                                Informativo (Sem vínculo direto)
                              </Badge>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {demandas.length === 0 && (
                      <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-xs">
                        Nenhuma demanda registrada para este plano.
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ABA SOLICITAÇÕES / VAGAS */}
                <TabsContent value="solicitacoes" className="space-y-4 pt-3">
                  <div>
                    <h3 className="text-sm font-semibold">Acompanhamento da Execução</h3>
                    <p className="text-xs text-muted-foreground">
                      Rastreabilidade independente entre posições aprovadas e vagas abertas no fluxo
                      de contratação.
                    </p>
                  </div>

                  <div className="space-y-3">
                    {solicitacoes.map((sol) => (
                      <Card key={sol.id} className="border shadow-none">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between border-b border-border/40 pb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-primary">
                                Vaga ID: {sol.vaga || 'Aguardando'}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {sol.status}
                              </Badge>
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(sol.data_solicitacao).toLocaleDateString('pt-BR')}
                            </span>
                          </div>

                          <div className="text-xs text-muted-foreground">
                            Solicitante: <strong>{sol.solicitado_por_nome}</strong> • Posição:{' '}
                            <strong>{sol.posicao}</strong>
                          </div>

                          {sol.historico_rastreabilidade && (
                            <div className="text-[11px] bg-muted/30 p-2 rounded border border-border/30">
                              {sol.historico_rastreabilidade.map((h: any, i: number) => (
                                <div key={i}>
                                  [{new Date(h.data).toLocaleDateString('pt-BR')}] {h.autor}:{' '}
                                  {h.detalhe}
                                </div>
                              ))}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}

                    {solicitacoes.length === 0 && (
                      <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-xs">
                        Nenhuma solicitação de contratação gerada a partir deste plano.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <div className="p-12 text-center border rounded-lg text-muted-foreground">
              Selecione um plano à esquerda para visualizar seus detalhes, demandas e posições.
            </div>
          )}
        </div>
      </div>

      {/* MODAL NOVO PLANO */}
      <Dialog open={modalNovoPlanoOpen} onOpenChange={setModalNovoPlanoOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Criar Novo Plano de Capacidade</DialogTitle>
            <DialogDescription>
              Inicie a elaboração de um novo plano de força de trabalho (versão v1.0 em Rascunho).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Código do Plano</Label>
              <Input
                value={novoCodigoPlano}
                onChange={(e) => setNovoCodigoPlano(e.target.value)}
                placeholder="PLANO-2026-TECH-02"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nome do Plano</Label>
              <Input
                value={novoNomePlano}
                onChange={(e) => setNovoNomePlano(e.target.value)}
                placeholder="Plano Estratégico de Engenharia e Produto 2026"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Unidade de Negócio (BU)</Label>
                <Select value={novaEmpresaPlano} onValueChange={setNovaEmpresaPlano}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione a BU" />
                  </SelectTrigger>
                  <SelectContent>
                    {empresas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.nome_fantasia || e.razao_social}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Período de Referência</Label>
                <Input
                  value={novoPeriodoPlano}
                  onChange={(e) => setNovoPeriodoPlano(e.target.value)}
                  placeholder="2026-Q4 ou 2027-H1"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Objetivo Estratégico / Justificativa</Label>
              <Textarea
                value={novoObjetivoPlano}
                onChange={(e) => setNovoObjetivoPlano(e.target.value)}
                placeholder="Qual o objetivo deste dimensionamento?"
                rows={3}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Premissas Gerais</Label>
              <Textarea
                value={novasPremissasPlano}
                onChange={(e) => setNovasPremissasPlano(e.target.value)}
                placeholder="Ex: Trabalho 100% remoto, orçamento alinhado ao plano plurianual..."
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalNovoPlanoOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCriarPlano}>
              Criar Rascunho
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL NOVA DEMANDA */}
      <Dialog open={modalNovaDemandaOpen} onOpenChange={setModalNovaDemandaOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Registrar Demanda Planejada</DialogTitle>
            <DialogDescription>
              Demanda de negócio que justifica a criação de postos ou necessidades corporativas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Origem da Demanda</Label>
              <Input
                value={novaDemOrigem}
                onChange={(e) => setNovaDemOrigem(e.target.value)}
                placeholder="Ex: Lançamento de Nova Plataforma Mobile"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Prioridade</Label>
                <Select
                  value={novaDemPrioridade}
                  onValueChange={(v: any) => setNovaDemPrioridade(v)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critica">Crítica</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Media">Média</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Grau de Confirmação</Label>
                <Select value={novaDemGrau} onValueChange={(v: any) => setNovaDemGrau(v)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="provavel">Provável</SelectItem>
                    <SelectItem value="exploratoria">Exploratória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Problema / Necessidade</Label>
              <Textarea
                value={novaDemProblema}
                onChange={(e) => setNovaDemProblema(e.target.value)}
                placeholder="Qual o gargalo atual que motivou esta demanda?"
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Resultado Esperado</Label>
              <Textarea
                value={novaDemResultado}
                onChange={(e) => setNovaDemResultado(e.target.value)}
                placeholder="Quais entregáveis ou métricas são esperados?"
                rows={2}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Risco de Não Atendimento</Label>
              <Input
                value={novaDemConsequencia}
                onChange={(e) => setNovaDemConsequencia(e.target.value)}
                placeholder="Ex: Perda de receita ou não atendimento de prazos regulatórios"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">
                Referência a Projeto de Cliente (Opcional - Informativo)
              </Label>
              <Input
                value={novaDemRefProjeto}
                onChange={(e) => setNovaDemRefProjeto(e.target.value)}
                placeholder="Ex: Projeto Omnichannel Cliente X (Não vinculado a contrato individual)"
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalNovaDemandaOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCriarDemanda}>
              Salvar Demanda
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL NOVA POSIÇÃO */}
      <Dialog open={modalNovaPosicaoOpen} onOpenChange={setModalNovaPosicaoOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Adicionar Posição Planejada</DialogTitle>
            <DialogDescription>
              Vincule um posto ao catálogo de cargos (v0.0.85) e especifique os custos preliminares.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Cargo de Referência (Catálogo)</Label>
                <Select value={novaPosCargo} onValueChange={setNovaPosCargo}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {cargos.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.nome} ({c.codigo})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Demanda de Origem</Label>
                <Select value={novaPosDemandaId} onValueChange={setNovaPosDemandaId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhuma">Sem Demanda Direta</SelectItem>
                    {demandas.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.codigo} - {d.origem}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Centro de Custo</Label>
                <Select value={novaPosCentroCusto} onValueChange={setNovaPosCentroCusto}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nenhum">Não informado</SelectItem>
                    {centrosCusto.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.codigo} - {cc.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Criticidade</Label>
                <Select
                  value={novaPosCriticidade}
                  onValueChange={(v: any) => setNovaPosCriticidade(v)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Critica">Crítica</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                    <SelectItem value="Media">Média</SelectItem>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Modalidade</Label>
                <Select
                  value={novaPosModalidade}
                  onValueChange={(v: any) => setNovaPosModalidade(v)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Remoto">Remoto</SelectItem>
                    <SelectItem value="Hibrido">Híbrido</SelectItem>
                    <SelectItem value="Presencial">Presencial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Propósito e Resultados Esperados</Label>
              <Textarea
                value={novaPosProposito}
                onChange={(e) => setNovaPosProposito(e.target.value)}
                placeholder="Quais serão as responsabilidades diretas deste posto?"
                rows={2}
                className="text-xs"
              />
            </div>

            {/* Custos Preliminares */}
            <div className="p-3 bg-muted/40 rounded-lg border border-border/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground">
                  Estimativa Preliminar de Custo
                </span>
                <label className="text-xs flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={novaPosCustoInformado}
                    onChange={(e) => setNovaPosCustoInformado(e.target.checked)}
                    className="rounded text-primary"
                  />
                  Possui valor de estimativa
                </label>
              </div>

              {novaPosCustoInformado ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Tipo de Custo</Label>
                    <Select
                      value={novaPosCustoTipo}
                      onValueChange={(v: any) => setNovaPosCustoTipo(v)}
                    >
                      <SelectTrigger className="text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="recorrente">
                          Recorrente (Ex: Salário / Mensal)
                        </SelectItem>
                        <SelectItem value="pontual">Pontual (Contrato Fechado)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Valor Estimado (R$)</Label>
                    <Input
                      type="number"
                      value={novaPosCustoEstimado}
                      onChange={(e) => setNovaPosCustoEstimado(e.target.value)}
                      placeholder="12000"
                      className="text-xs"
                    />
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  O valor será registrado como NÃO INFORMADO (não equivalente a zero). O plano
                  calculará o total como parcial.
                </p>
              )}
            </div>

            {/* Criação em Lote */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Quantidade em Lote (Posições idênticas)</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={novaPosQtdLote}
                  onChange={(e) => setNovaPosQtdLote(parseInt(e.target.value) || 1)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Data Início Prevista</Label>
                <Input
                  type="date"
                  value={novaPosDataInicio}
                  onChange={(e) => setNovaPosDataInicio(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalNovaPosicaoOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCriarPosicao}>
              Salvar Posição(ões)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DEVOLUÇÃO COM JUSTIFICATIVA */}
      <Dialog open={modalDevolverOpen} onOpenChange={setModalDevolverOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Devolver Plano para Ajuste</DialogTitle>
            <DialogDescription>
              Informe detalhadamente os pontos que precisam ser corrigidos pelo gestor da BU.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Justificativa Formal Obrigatória</Label>
              <Textarea
                value={justificativaDevolucao}
                onChange={(e) => setJustificativaDevolucao(e.target.value)}
                placeholder="Ex: Necessário rever a estimativa da posição POS-TECH-002 e incluir premissa de contratação PJ..."
                rows={4}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalDevolverOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDevolver}>
              Confirmar Devolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL SNAPSHOT HISTÓRICO IMUTÁVEL */}
      <Dialog open={modalSnapshotOpen} onOpenChange={setModalSnapshotOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Snapshot de Decisão e Auditoria Oficial
            </DialogTitle>
            <DialogDescription>
              Representação imutável dos dados e cadastros no momento exato da aprovação
              corporativa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 bg-muted/40 rounded-lg border border-border/40 text-xs space-y-1 font-mono">
              <div>
                <strong>Hash de Decisão:</strong>{' '}
                {planoSelecionado?.hash_aprovacao || 'Assinado digitalmente'}
              </div>
              <div>
                <strong>Data de Aprovação:</strong>{' '}
                {planoSelecionado?.data_decisao
                  ? new Date(planoSelecionado.data_decisao).toLocaleString('pt-BR')
                  : 'N/A'}
              </div>
              <div>
                <strong>Aprovador Oficial:</strong>{' '}
                {planoSelecionado?.expand?.decidido_por?.name ||
                  planoSelecionado?.decidido_por ||
                  'RH Corporativo'}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-foreground">
                Conteúdo Histórico Congelado (JSON Snapshot):
              </h4>
              <pre className="p-3 bg-slate-950 text-slate-50 text-[11px] rounded-lg overflow-x-auto max-h-[350px]">
                {JSON.stringify(planoSelecionado?.snapshot_aprovacao, null, 2)}
              </pre>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setModalSnapshotOpen(false)}>
              Fechar Snapshot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default PlanejamentoForcaPage
