/**
 * src/components/planejamento/AbaCapacidadeAlocacoes.tsx
 *
 * Módulo 1: Planejamento da Força de Trabalho - ETAPA 4 (v0.0.87 - HOMOLOGAÇÃO)
 *
 * Componentes de interface:
 *  1. Mapa Mensal de Capacidade e Alocações
 *     - Memória de cálculo visível em camadas:
 *       Capacidade Bruta -> Indisponibilidades (sem dupla contagem) ->
 *       Capacidade Líquida -> Reserva Operacional explícita -> Alocações Confirmadas ->
 *       Capacidade Disponível para Novas Alocações (NÃO rotulada como "ociosidade")
 *     - Distinção clara: Disponibilidade (horas/%) vs Escopo (entregáveis/marcos)
 *     - Realizado separado do planejado (data de corte)
 *     - Status "CAPACIDADE NÃO DETERMINADA" quando faltarem horas base ou vigência
 *  2. Gestão de Projetos (cadastro mínimo como destino de alocação)
 *  3. Gestão e Confirmação de Alocações com Bloqueio Server-Side
 *  4. Matriz de Competências por Ocupante (cruzamento com competencias_pessoas)
 *  5. Custos Consolidados com Hierarquia de Fontes Confiáveis
 */

import React, { useState, useEffect } from 'react'
import {
  capacidadeService,
  Projeto,
  Alocacao,
  OcupacaoPosicao,
  MemoriaCalculoCapacidade,
  CruzamentoCompetenciasOcupante,
  ConsolidadoCustosPeriodo,
} from '@/services/capacidadeService'
import { PlanoCapacidade, PosicaoPlanejada } from '@/services/planejamentoForcaService'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

import {
  Users,
  Briefcase,
  Layers,
  Award,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Info,
  Clock,
  ArrowRight,
  UserCheck,
} from 'lucide-react'

export interface Props {
  plano: PlanoCapacidade | null
  posicoesPlano: PosicaoPlanejada[]
  filtroEmpresa?: string
  secaoAtiva?: 'capacidade' | 'alocacoes' | 'projetos' | 'ocupacoes' | 'competencias' | 'custos'
  onSecaoChange?: (
    secao: 'capacidade' | 'alocacoes' | 'projetos' | 'ocupacoes' | 'competencias' | 'custos',
  ) => void
  ocultarHeaderProps?: boolean
}

export const AbaCapacidadeAlocacoes: React.FC<Props> = ({
  plano,
  posicoesPlano,
  filtroEmpresa,
  secaoAtiva,
  onSecaoChange,
  ocultarHeaderProps = false,
}) => {
  const { user } = useAuth()
  const { toast } = useToast()
  const isRh = user?.cargo_funcao === 'RH / Recrutador'

  const [subAbaInterna, setSubAbaInterna] = useState<
    'capacidade' | 'alocacoes' | 'projetos' | 'ocupacoes' | 'competencias' | 'custos'
  >('capacidade')

  const subAba = secaoAtiva !== undefined ? secaoAtiva : subAbaInterna
  const setSubAba = (
    v: 'capacidade' | 'alocacoes' | 'projetos' | 'ocupacoes' | 'competencias' | 'custos',
  ) => {
    setSubAbaInterna(v)
    if (onSecaoChange) onSecaoChange(v)
  }

  const [mesReferencia, setMesReferencia] = useState('2026-10')
  const [incluirDemonstracao, setIncluirDemonstracao] = useState(false)
  const [loading, setLoading] = useState(false)

  // Estados dos Dados
  const [projetos, setProjetos] = useState<Projeto[]>([])
  const [alocacoes, setAlocacoes] = useState<Alocacao[]>([])
  const [ocupacoes, setOcupacoes] = useState<OcupacaoPosicao[]>([])
  const [pessoas, setPessoas] = useState<any[]>([])
  const [memoriasCapacidade, setMemoriasCapacidade] = useState<MemoriaCalculoCapacidade[]>([])
  const [cruzamentoComp, setCruzamentoComp] = useState<CruzamentoCompetenciasOcupante[]>([])
  const [custosConsolidados, setCustosConsolidados] = useState<ConsolidadoCustosPeriodo | null>(
    null,
  )

  // Modais
  const [modalNovoProjetoOpen, setModalNovoProjetoOpen] = useState(false)
  const [modalNovaAlocacaoOpen, setModalNovaAlocacaoOpen] = useState(false)
  const [modalNovaOcupacaoOpen, setModalNovaOcupacaoOpen] = useState(false)
  const [modalExcecaoOpen, setModalExcecaoOpen] = useState(false)
  const [alocacaoParaExcecao, setAlocacaoParaExcecao] = useState<Alocacao | null>(null)
  const [justificativaExcecao, setJustificativaExcecao] = useState('')

  // Form Novo Projeto
  const [projIdentificador, setProjIdentificador] = useState('')
  const [projNome, setProjNome] = useState('')
  const [projInicio, setProjInicio] = useState('2026-10-01')
  const [projTermino, setProjTermino] = useState('2026-12-31')
  const [projCliente, setProjCliente] = useState('')
  const [projContratoComercial, setProjContratoComercial] = useState('')
  const [projRelacionamentoValidado, setProjRelacionamentoValidado] = useState(true)

  // Form Nova Alocação
  const [alocPessoaId, setAlocPessoaId] = useState('')
  const [alocProjetoId, setAlocProjetoId] = useState('')
  const [alocDestinoOrg, setAlocDestinoOrg] = useState('')
  const [alocInicio, setAlocInicio] = useState('2026-10-01')
  const [alocFim, setAlocFim] = useState('2026-10-31')
  const [alocModalidade, setAlocModalidade] = useState<'disponibilidade' | 'escopo'>(
    'disponibilidade',
  )
  const [alocUnidade, setAlocUnidade] = useState<'percentual' | 'horas_mes' | 'entregavel_escopo'>(
    'percentual',
  )
  const [alocQtd, setAlocQtd] = useState(50)
  const [alocPapel, setAlocPapel] = useState('')
  const [alocJustificativa, setAlocJustificativa] = useState('')

  // Form Nova Ocupação
  const [ocupPosicaoId, setOcupPosicaoId] = useState('')
  const [ocupPessoaId, setOcupPessoaId] = useState('')
  const [ocupInicio, setOcupInicio] = useState('2026-10-01')
  const [ocupOrigem, setOcupOrigem] =
    useState<OcupacaoPosicao['origem_vinculacao']>('promocao_interna')
  const [ocupObs, setOcupObs] = useState('')

  // Carregar dados gerais
  const carregarTudo = async () => {
    setLoading(true)
    try {
      const [projs, alocs, ocups, pesList] = await Promise.all([
        capacidadeService.listarProjetos(incluirDemonstracao),
        capacidadeService.listarAlocacoes({ incluirDemonstracao }),
        capacidadeService.listarOcupacoes(),
        pb.collection('pessoas').getFullList({
          filter: "situacao_contrato = 'Vigente'",
          sort: 'nome',
          expand: 'empresa,area',
        }),
      ])

      // Filtragem por empresa se gestor estiver filtrado
      let pesFiltradas = pesList
      if (filtroEmpresa) {
        pesFiltradas = pesList.filter((p) => p.empresa === filtroEmpresa)
      }

      setProjetos(projs)
      setAlocacoes(alocs)
      setOcupacoes(ocups)
      setPessoas(pesFiltradas)

      // Calcula mapa de capacidade para as pessoas no mês de referência
      const memorias = await Promise.all(
        pesFiltradas
          .slice(0, 15)
          .map((p) => capacidadeService.calcularCapacidadePessoaPeriodo(p.id, mesReferencia)),
      )
      setMemoriasCapacidade(memorias)

      // Consolidação de custos
      const custos = await capacidadeService.consolidarCustos(mesReferencia, plano?.id)
      setCustosConsolidados(custos)

      // Cruzamento de competências para posições do plano com ocupantes
      const cruzamentos: CruzamentoCompetenciasOcupante[] = []
      for (const pos of posicoesPlano) {
        const ocup = ocups.find((o) => o.posicao === pos.id && o.situacao === 'ativa')
        if (ocup && ocup.pessoa) {
          try {
            const cruz = await capacidadeService.cruzarCompetenciasOcupante(pos.id, ocup.pessoa)
            cruzamentos.push(cruz)
          } catch {
            /* intentionally ignored */
          }
        }
      }
      setCruzamentoComp(cruzamentos)
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar dados de capacidade e alocações',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarTudo()
  }, [mesReferencia, incluirDemonstracao, filtroEmpresa, plano?.id, posicoesPlano.length])

  // Handler Criar Projeto
  const handleCriarProjeto = async () => {
    if (!projIdentificador || !projNome) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Identificador e nome são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    try {
      const empResp = plano?.empresa || pessoas[0]?.empresa
      if (!empResp) {
        throw new Error('Nenhuma empresa/BU disponível para associar ao projeto.')
      }

      await capacidadeService.criarProjeto({
        identificador: projIdentificador.toUpperCase(),
        nome: projNome,
        empresa_responsavel: empResp,
        bu_relacionada: empResp,
        responsavel: user?.id || '',
        responsavel_nome: user?.name || '',
        inicio_previsto: projInicio,
        termino_previsto: projTermino || undefined,
        situacao: 'Em andamento',
        cliente_nome: projCliente || undefined,
        contrato_comercial_ref: projContratoComercial || undefined,
        relacionamento_validado: projRelacionamentoValidado,
        is_demonstracao: false,
      })

      toast({ title: 'Projeto cadastrado com sucesso!' })
      setModalNovoProjetoOpen(false)
      carregarTudo()
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar projeto',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Handler Criar Alocação
  const handleCriarAlocacao = async () => {
    if (!alocPessoaId) {
      toast({
        title: 'Selecione o colaborador',
        variant: 'destructive',
      })
      return
    }

    try {
      const criada = await capacidadeService.criarAlocacao({
        pessoa: alocPessoaId,
        projeto: alocProjetoId || undefined,
        destino_organizacional: alocDestinoOrg || undefined,
        periodo_inicio: alocInicio,
        periodo_fim: alocFim,
        modalidade_capacidade: alocModalidade,
        unidade: alocUnidade,
        quantidade: Number(alocQtd),
        papel_desempenhado: alocPapel || undefined,
        situacao: 'proposta',
        responsavel: user?.id || '',
        responsavel_nome: user?.name || '',
        justificativa: alocJustificativa || undefined,
        is_demonstracao: false,
      })

      toast({
        title: 'Alocação proposta registrada!',
        description:
          'A alocação foi criada como Proposta. Confirme-a para validar a capacidade atômica.',
      })
      setModalNovaAlocacaoOpen(false)
      carregarTudo()
    } catch (err: any) {
      toast({
        title: 'Erro ao propor alocação',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  // Handler Confirmar Alocação (Atômica Server-Side)
  const handleConfirmarAlocacao = async (aloc: Alocacao) => {
    try {
      const res = await capacidadeService.confirmarAlocacaoAtomica(aloc.id, false, '')
      toast({
        title: 'Alocação confirmada!',
        description: res.mensagem,
      })
      carregarTudo()
    } catch (err: any) {
      const msg = err.data?.error || err.message
      if (msg.includes('BLOQUEIO_CAPACIDADE')) {
        setAlocacaoParaExcecao(aloc)
        setJustificativaExcecao('')
        setModalExcecaoOpen(true)
      } else {
        toast({
          title: 'Erro na confirmação',
          description: msg,
          variant: 'destructive',
        })
      }
    }
  }

  // Handler Confirmar Exceção
  const handleConfirmarComExcecao = async () => {
    if (!alocacaoParaExcecao) return
    if (!justificativaExcecao.trim()) {
      toast({
        title: 'Justificativa obrigatória',
        description: 'Informe a justificativa formal da exceção de sobrecapacidade.',
        variant: 'destructive',
      })
      return
    }

    try {
      const res = await capacidadeService.confirmarAlocacaoAtomica(
        alocacaoParaExcecao.id,
        true,
        justificativaExcecao,
      )
      toast({
        title: 'Exceção autorizada e alocação confirmada!',
        description: res.mensagem,
      })
      setModalExcecaoOpen(false)
      setAlocacaoParaExcecao(null)
      carregarTudo()
    } catch (err: any) {
      toast({
        title: 'Falha ao autorizar exceção',
        description: err.data?.error || err.message,
        variant: 'destructive',
      })
    }
  }

  // Handler Registrar Ocupação de Posição
  const handleRegistrarOcupacao = async () => {
    if (!ocupPosicaoId || !ocupPessoaId) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione a posição planejada e a pessoa ocupante.',
        variant: 'destructive',
      })
      return
    }

    try {
      await capacidadeService.registrarOcupacaoPosicao({
        posicaoId: ocupPosicaoId,
        pessoaId: ocupPessoaId,
        dataInicio: ocupInicio,
        origemVinculacao: ocupOrigem,
        observacoes: ocupObs,
      })

      toast({
        title: 'Ocupação de posição registrada!',
        description: 'A execução foi vinculada preservando a integridade do snapshot.',
      })
      setModalNovaOcupacaoOpen(false)
      carregarTudo()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar ocupação',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Controles de período e dados demonstrativos */}
      {!ocultarHeaderProps && (
        <Card className="border shadow-sm">
          <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-[#E9530E]" />
              <div>
                <h3 className="text-sm font-bold text-foreground">
                  Capacidade, Alocações, Ocupações e Custos
                </h3>
                <p className="text-xs text-muted-foreground">
                  Módulo 1 • Planejamento da Força de Trabalho • Prevalência de fontes e governança
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="text-xs font-medium text-muted-foreground">Mês Analisado:</Label>
                <Input
                  type="month"
                  value={mesReferencia}
                  onChange={(e) => setMesReferencia(e.target.value)}
                  className="h-8 w-36 text-xs font-mono"
                />
              </div>

              <div className="flex items-center gap-2 border-l border-border/40 pl-4">
                <Switch
                  id="toggle-demo"
                  checked={incluirDemonstracao}
                  onCheckedChange={setIncluirDemonstracao}
                />
                <Label
                  htmlFor="toggle-demo"
                  className="text-xs text-muted-foreground cursor-pointer"
                >
                  Dados de Demonstração
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {ocultarHeaderProps && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/30 rounded-lg border border-border/40">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#E9530E]" />
            <span className="text-xs font-medium text-muted-foreground">
              Mês Analisado na Capacidade:
            </span>
            <Input
              type="month"
              value={mesReferencia}
              onChange={(e) => setMesReferencia(e.target.value)}
              className="h-8 w-36 text-xs font-mono bg-background"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="toggle-demo-compact"
              checked={incluirDemonstracao}
              onCheckedChange={setIncluirDemonstracao}
            />
            <Label
              htmlFor="toggle-demo-compact"
              className="text-xs text-muted-foreground cursor-pointer"
            >
              Exibir Dados de Demonstração
            </Label>
          </div>
        </div>
      )}

      {/* Sub-Abas da Etapa 4 */}
      <Tabs value={subAba} onValueChange={(v: any) => setSubAba(v)} className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-6 w-full">
          <TabsTrigger value="capacidade" className="text-xs gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            Capacidade ({memoriasCapacidade.length})
          </TabsTrigger>
          <TabsTrigger value="alocacoes" className="text-xs gap-1.5">
            <Users className="w-3.5 h-3.5" />
            Alocações ({alocacoes.length})
          </TabsTrigger>
          <TabsTrigger value="projetos" className="text-xs gap-1.5">
            <Briefcase className="w-3.5 h-3.5" />
            Projetos ({projetos.length})
          </TabsTrigger>
          <TabsTrigger value="ocupacoes" className="text-xs gap-1.5">
            <UserCheck className="w-3.5 h-3.5" />
            Ocupação Posições ({ocupacoes.length})
          </TabsTrigger>
          <TabsTrigger value="competencias" className="text-xs gap-1.5">
            <Award className="w-3.5 h-3.5" />
            Competências ({cruzamentoComp.length})
          </TabsTrigger>
          <TabsTrigger value="custos" className="text-xs gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Custos Consolidados
          </TabsTrigger>
        </TabsList>

        {/* 1. ABA CAPACIDADE (Cálculo em camadas) */}
        <TabsContent value="capacidade" className="space-y-4 pt-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">
                Memória de Cálculo de Capacidade por Período
              </h4>
              <p className="text-xs text-muted-foreground">
                Cálculo em camadas: Bruta → Indisponibilidades (sem sobreposição) → Líquida →
                Reserva de Governança (quando aplicável) → Alocações → Disponível para Novas
                Alocações.
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              Mês: {mesReferencia}
            </Badge>
          </div>

          <div className="space-y-3">
            {memoriasCapacidade.map((mem) => {
              const isIndeterminada = mem.statusCapacidade === 'CAPACIDADE NÃO DETERMINADA'

              return (
                <Card
                  key={mem.pessoaId}
                  className={`border shadow-none ${mem.sobrecarga ? 'border-destructive/60 bg-destructive/5' : ''}`}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{mem.pessoaNome}</span>
                        <Badge variant="secondary" className="text-[10px]">
                          {mem.modalidadeVigente}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            mem.modalidadeCapacidade === 'escopo'
                              ? 'border-purple-300 text-purple-700 bg-purple-50'
                              : 'border-blue-300 text-blue-700 bg-blue-50'
                          }`}
                        >
                          Planejamento por {mem.modalidadeCapacidade.toUpperCase()}
                        </Badge>
                        {mem.sobrecarga && (
                          <Badge
                            variant="destructive"
                            className="text-[10px] flex items-center gap-1"
                          >
                            <AlertTriangle className="w-3 h-3" /> SOBRECARGA
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs">
                        {isIndeterminada ? (
                          <Badge
                            variant="outline"
                            className="border-amber-400 text-amber-700 bg-amber-50"
                          >
                            CAPACIDADE NÃO DETERMINADA
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            Base: <strong>{mem.horasContratadasBase}h</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {isIndeterminada ? (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 rounded text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
                        <Info className="w-4 h-4 shrink-0" />
                        <span>{mem.motivoNaoDeterminada}</span>
                      </div>
                    ) : (
                      <>
                        {/* Camadas da memória */}
                        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center text-xs pt-1">
                          <div className="p-2 bg-muted/40 rounded border border-border/40">
                            <div className="text-[10px] text-muted-foreground">1. Cap. Bruta</div>
                            <div className="font-bold text-sm mt-0.5">
                              {mem.capacidadeBrutaHoras}h
                            </div>
                          </div>

                          <div className="p-2 bg-muted/40 rounded border border-border/40">
                            <div className="text-[10px] text-muted-foreground">2. Indisponib.</div>
                            <div className="font-bold text-sm mt-0.5 text-amber-600">
                              -{mem.indisponibilidadesHoras}h
                            </div>
                            <div className="text-[9px] text-muted-foreground">
                              {mem.detalheIndisponibilidades.length} evento(s)
                            </div>
                          </div>

                          <div className="p-2 bg-muted/40 rounded border border-border/40">
                            <div className="text-[10px] text-muted-foreground">3. Cap. Líquida</div>
                            <div className="font-bold text-sm mt-0.5">
                              {mem.capacidadeLiquidaHoras}h
                            </div>
                          </div>

                          <div className="p-2 bg-muted/40 rounded border border-border/40">
                            <div className="text-[10px] text-muted-foreground">
                              {mem.reservaEstado === 'aprovada'
                                ? `4. Reserva (${mem.reservaOperacionalPercentual}%)`
                                : mem.reservaEstado === 'explicitamente_zero'
                                  ? '4. Reserva (0% deliberada)'
                                  : mem.reservaEstado === 'premissa_simulacao'
                                    ? `4. Reserva Sim. (${mem.reservaOperacionalPercentual}%)`
                                    : '4. Reserva (Não def.)'}
                            </div>
                            <div className="font-bold text-sm mt-0.5 text-blue-600">
                              {mem.reservaEstado === 'aprovada' ||
                              mem.reservaEstado === 'premissa_simulacao'
                                ? `${mem.reservaOperacionalHoras.toFixed(1)}h`
                                : mem.reservaEstado === 'explicitamente_zero'
                                  ? '0.0h'
                                  : '—'}
                            </div>
                          </div>

                          <div className="p-2 bg-muted/40 rounded border border-border/40">
                            <div className="text-[10px] text-muted-foreground">
                              5. Alocadas Conf.
                            </div>
                            <div className="font-bold text-sm mt-0.5 text-foreground">
                              {mem.alocacoesConfirmadasHoras}h ({mem.alocacoesConfirmadasPercentual}
                              %)
                            </div>
                          </div>

                          <div className="p-2 bg-emerald-50 dark:bg-emerald-950/20 rounded border border-emerald-300 dark:border-emerald-800">
                            <div className="text-[10px] text-emerald-800 dark:text-emerald-300 font-medium">
                              6. Disponível Novas
                            </div>
                            <div className="font-bold text-sm mt-0.5 text-emerald-700 dark:text-emerald-400">
                              {mem.capacidadeDisponivelNovasAlocacoesHoras.toFixed(1)}h
                            </div>
                            <div className="text-[9px] text-emerald-700">
                              ({mem.capacidadeDisponivelNovasAlocacoesPercentual}%)
                            </div>
                          </div>
                        </div>

                        {/* Detalhes de escopo e horas realizadas */}
                        <div className="flex flex-wrap items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                          <div>
                            {mem.alocacoesEscopoContagem > 0 && (
                              <span className="text-purple-700 font-medium mr-3">
                                • {mem.alocacoesEscopoContagem} entregável(is) de escopo
                                atribuído(s) (não descontam horas)
                              </span>
                            )}
                            {mem.detalheIndisponibilidades.length > 0 && (
                              <span>• {mem.detalheIndisponibilidades.join('; ')}</span>
                            )}
                          </div>

                          <div>
                            Realizado no mês (corte {mem.dataCorteRealizado}):{' '}
                            <strong className="text-foreground">
                              {mem.saldoRealizadoHoras}h apontadas
                            </strong>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              )
            })}

            {memoriasCapacidade.length === 0 && !loading && (
              <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-xs">
                Nenhum colaborador localizado para dimensionamento no período.
              </div>
            )}
          </div>
        </TabsContent>

        {/* 2. ABA ALOCAÇÕES */}
        <TabsContent value="alocacoes" className="space-y-4 pt-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">Alocações por Período</h4>
              <p className="text-xs text-muted-foreground">
                Alocações confirmadas e propostas. Confirmação atômica com validação de capacidade
                máxima.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setAlocPessoaId(pessoas[0]?.id || '')
                setAlocProjetoId(projetos[0]?.id || '')
                setAlocModalidade('disponibilidade')
                setAlocUnidade('percentual')
                setAlocQtd(50)
                setModalNovaAlocacaoOpen(true)
              }}
              className="gap-1.5 h-8 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Propor Nova Alocação
            </Button>
          </div>

          <div className="space-y-3">
            {alocacoes.map((aloc) => {
              const isConfirmada = aloc.situacao === 'confirmada'

              return (
                <Card key={aloc.id} className="border shadow-none">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">
                          {aloc.expand?.pessoa?.nome || 'Pessoa'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium text-xs text-primary">
                          {aloc.expand?.projeto?.identificador
                            ? `[${aloc.expand?.projeto?.identificador}] ${aloc.expand?.projeto?.nome}`
                            : aloc.destino_organizacional || 'Destino Organizacional'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            isConfirmada
                              ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                              : 'border-amber-500 text-amber-700 bg-amber-50'
                          }
                        >
                          {aloc.situacao.toUpperCase()}
                        </Badge>

                        {aloc.excecao_autorizada && (
                          <Badge
                            variant="outline"
                            className="border-red-400 text-red-700 bg-red-50 text-[10px]"
                          >
                            Exceção Autorizada
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground pt-1">
                      <div>
                        <span className="font-medium text-foreground">Modalidade:</span>{' '}
                        {aloc.modalidade_capacidade.toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Dedicacão:</span>{' '}
                        <strong className="text-foreground">
                          {aloc.quantidade}{' '}
                          {aloc.unidade === 'percentual'
                            ? '%'
                            : aloc.unidade === 'horas_mes'
                              ? 'horas/mês'
                              : 'entregável'}
                        </strong>
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Período:</span>{' '}
                        {aloc.periodo_inicio.slice(0, 10)} até {aloc.periodo_fim.slice(0, 10)}
                      </div>
                      <div>
                        <span className="font-medium text-foreground">Papel:</span>{' '}
                        {aloc.papel_desempenhado || 'Não especificado'}
                      </div>
                    </div>

                    {aloc.justificativa && (
                      <p className="text-xs text-muted-foreground">
                        <strong>Justificativa:</strong> {aloc.justificativa}
                      </p>
                    )}

                    {!isConfirmada && (
                      <div className="pt-2 border-t border-border/30 flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleConfirmarAlocacao(aloc)}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmar Alocação (Validar Capacidade)
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}

            {alocacoes.length === 0 && (
              <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-xs">
                Nenhuma alocação registrada.
              </div>
            )}
          </div>
        </TabsContent>

        {/* 3. ABA PROJETOS */}
        <TabsContent value="projetos" className="space-y-4 pt-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">
                Destinos de Alocação (Cadastro Mínimo de Projetos)
              </h4>
              <p className="text-xs text-muted-foreground">
                Projetos corporativos com identificadores, empresa responsável, cliente e contrato
                comercial.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setProjIdentificador(`PRJ-${Date.now().toString().slice(-4)}`)
                setProjNome('')
                setModalNovoProjetoOpen(true)
              }}
              className="gap-1.5 h-8 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              Novo Projeto
            </Button>
          </div>

          <div className="space-y-3">
            {projetos.map((proj) => (
              <Card key={proj.id} className="border shadow-none">
                <CardContent className="p-4 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/40 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        {proj.identificador}
                      </span>
                      <span className="font-semibold text-sm">{proj.nome}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {proj.situacao}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          proj.relacionamento_validado
                            ? 'border-emerald-500 text-emerald-700 bg-emerald-50 text-[10px]'
                            : 'border-blue-400 text-blue-700 bg-blue-50 text-[10px]'
                        }
                      >
                        {proj.relacionamento_validado
                          ? 'Relacionamento Validado'
                          : 'Referência Informativa'}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-muted-foreground pt-1">
                    <div>
                      <span className="font-medium text-foreground">BU Responsável:</span>{' '}
                      {proj.expand?.empresa_responsavel?.nome_fantasia || 'Empresa'}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Líder:</span>{' '}
                      {proj.responsavel_nome || proj.expand?.responsavel?.name || 'Responsável'}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Início:</span>{' '}
                      {proj.inicio_previsto.slice(0, 10)}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Cliente / Contrato:</span>{' '}
                      {proj.cliente_nome || proj.contrato_comercial_ref || 'Não informado'}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* 4. ABA OCUPAÇÃO DE POSIÇÕES */}
        <TabsContent value="ocupacoes" className="space-y-4 pt-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">Ocupação Real de Posições Planejadas</h4>
              <p className="text-xs text-muted-foreground">
                Execução separada do snapshot aprovado do plano. Histórico de substituições
                preservado.
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => {
                setOcupPosicaoId(posicoesPlano[0]?.id || '')
                setOcupPessoaId(pessoas[0]?.id || '')
                setModalNovaOcupacaoOpen(true)
              }}
              className="gap-1.5 h-8 text-xs"
              disabled={posicoesPlano.length === 0}
            >
              <Plus className="w-3.5 h-3.5" />
              Registrar Ocupação
            </Button>
          </div>

          <div className="space-y-3">
            {ocupacoes.map((oc) => (
              <Card key={oc.id} className="border shadow-none">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between border-b border-border/40 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">
                        Posição: {oc.expand?.posicao?.codigo || oc.posicao}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="font-semibold text-sm">
                        {oc.expand?.pessoa?.nome || 'Ocupante'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={
                          oc.situacao === 'ativa'
                            ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                            : 'border-muted text-muted-foreground'
                        }
                      >
                        {oc.situacao.toUpperCase()}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        Origem: {oc.origem_vinculacao.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>

                  <div className="text-xs text-muted-foreground flex items-center justify-between">
                    <span>
                      Início da ocupação: <strong>{oc.data_inicio.slice(0, 10)}</strong>
                      {oc.data_termino && ` até ${oc.data_termino.slice(0, 10)}`}
                    </span>
                    {oc.expand?.ocupante_anterior && (
                      <span className="text-amber-700">
                        Substituiu: {oc.expand.ocupante_anterior.nome}
                      </span>
                    )}
                  </div>

                  {oc.observacoes && (
                    <p className="text-xs text-muted-foreground">
                      <strong>Observações:</strong> {oc.observacoes}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}

            {ocupacoes.length === 0 && (
              <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-xs">
                Nenhuma ocupação de posição registrada até o momento.
              </div>
            )}
          </div>
        </TabsContent>

        {/* 5. ABA MATRIZ DE COMPETÊNCIAS */}
        <TabsContent value="competencias" className="space-y-4 pt-3">
          <div>
            <h4 className="text-sm font-semibold">
              Cruzamento de Competências: Posição × Ocupante
            </h4>
            <p className="text-xs text-muted-foreground">
              Exigências das posições do plano aprovado vs competências cadastradas dos ocupantes.
              Ausência de dado não é ausência de competência.
            </p>
          </div>

          <div className="space-y-4">
            {cruzamentoComp.map((cruz) => (
              <Card key={cruz.posicaoId} className="border shadow-none">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-primary">
                          {cruz.posicaoCodigo}
                        </span>
                        <h5 className="font-semibold text-sm">Ocupante: {cruz.ocupanteNome}</h5>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        Aderência:{' '}
                        <strong>
                          {cruz.totalAtendidas}/{cruz.totalExigidas}
                        </strong>
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          cruz.aderenciaGeralPercentual >= 80
                            ? 'border-emerald-500 text-emerald-700 bg-emerald-50'
                            : cruz.aderenciaGeralPercentual >= 50
                              ? 'border-amber-500 text-amber-700 bg-amber-50'
                              : 'border-red-400 text-red-700 bg-red-50'
                        }
                      >
                        {cruz.aderenciaGeralPercentual}%
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-0 space-y-2">
                  <div className="divide-y divide-border/40">
                    {cruz.itens.map((it) => (
                      <div
                        key={it.competenciaId}
                        className="py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                      >
                        <div>
                          <span className="font-medium text-foreground">{it.competenciaNome}</span>
                          <span className="text-muted-foreground ml-2">
                            (Exigido: {it.nivelExigido.replace('Nivel_', 'Nível ')})
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {it.temEvidenciaDocumental && (
                            <Badge
                              variant="outline"
                              className="text-[10px] gap-1 text-blue-700 border-blue-300"
                            >
                              <ShieldCheck className="w-3 h-3 text-blue-600" />
                              Evidência no Cofre
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={
                              it.estado === 'atendida_com_evidencia'
                                ? 'border-emerald-500 text-emerald-700 bg-emerald-50 text-[10px]'
                                : it.estado === 'declarada_pendente_validacao'
                                  ? 'border-amber-400 text-amber-700 bg-amber-50 text-[10px]'
                                  : it.estado === 'nao_avaliada'
                                    ? 'border-gray-300 text-gray-700 bg-gray-50 text-[10px]'
                                    : 'border-destructive/60 text-destructive text-[10px]'
                            }
                          >
                            {it.rotuloEstado}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {cruzamentoComp.length === 0 && (
              <div className="p-8 text-center border border-dashed rounded-lg text-muted-foreground text-xs">
                Nenhum ocupante vinculado a posições deste plano para cruzar competências.
              </div>
            )}
          </div>
        </TabsContent>

        {/* 6. ABA CUSTOS CONSOLIDADOS */}
        <TabsContent value="custos" className="space-y-4 pt-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold">Custos Consolidados da Força de Trabalho</h4>
              <p className="text-xs text-muted-foreground">
                Comparativo triplo com prevalência de fontes confiáveis (NF &gt; Fechamento &gt;
                Contrato).
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              Mês: {mesReferencia}
            </Badge>
          </div>

          {custosConsolidados && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="border shadow-none bg-muted/20">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                      1. Custo Planejado (Snapshot Aprovado)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-xl font-bold text-primary">
                      R${' '}
                      {custosConsolidados.custoPlanejadoSnapshot.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {plano
                        ? `Plano ${plano.codigo} (${plano.rotulo_versao})`
                        : 'Nenhum plano selecionado'}
                    </p>
                  </CardContent>
                </Card>

                <Card className="border shadow-none bg-muted/20">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-semibold text-muted-foreground">
                      2. Estimativa Atual Vigente
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-xl font-bold text-foreground">
                      R${' '}
                      {custosConsolidados.custoEstimadoAtual.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Base: Contratos vigentes de vínculos cadastrados
                    </p>
                  </CardContent>
                </Card>

                <Card className="border shadow-none bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      3. Custo Realizado Oficial
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-400">
                      R${' '}
                      {custosConsolidados.custoRealizadoOficial.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      NF liquidada ou Fechamento oficial auditado
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Rastreabilidade e Fontes Confiáveis */}
              <Card className="border shadow-none">
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-xs font-semibold">
                    Detalhamento por Fonte Confiável e Natureza
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-2">
                  <div className="divide-y divide-border/30 max-h-72 overflow-y-auto">
                    {custosConsolidados.detalhesFontes.map((f, i) => (
                      <div key={i} className="py-2 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-medium text-foreground">{f.descricao}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Fonte: {f.fonteEspecifica} • {f.natureza} • {f.origemEscopo}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-foreground">
                            R$ {f.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <Badge variant="outline" className="text-[9px]">
                            {f.confianca.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* MODAL NOVO PROJETO */}
      <Dialog open={modalNovoProjetoOpen} onOpenChange={setModalNovoProjetoOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Destino de Alocação (Projeto)</DialogTitle>
            <DialogDescription>
              Cadastro mínimo de projeto para receber alocações da força de trabalho.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Identificador / Código</Label>
              <Input
                value={projIdentificador}
                onChange={(e) => setProjIdentificador(e.target.value)}
                placeholder="PRJ-TECH-2026-OMNI"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Nome do Projeto</Label>
              <Input
                value={projNome}
                onChange={(e) => setProjNome(e.target.value)}
                placeholder="Plataforma Integrada de Liquidação"
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Início Previsto</Label>
                <Input
                  type="date"
                  value={projInicio}
                  onChange={(e) => setProjInicio(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Término Previsto</Label>
                <Input
                  type="date"
                  value={projTermino}
                  onChange={(e) => setProjTermino(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Cliente (Opcional)</Label>
              <Input
                value={projCliente}
                onChange={(e) => setProjCliente(e.target.value)}
                placeholder="Nome do cliente parceiro"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Contrato Comercial (Ref. Informativa)</Label>
              <Input
                value={projContratoComercial}
                onChange={(e) => setProjContratoComercial(e.target.value)}
                placeholder="CONTRATO-COMERCIAL-2026-088"
                className="text-xs"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Switch
                id="proj-validado"
                checked={projRelacionamentoValidado}
                onCheckedChange={setProjRelacionamentoValidado}
              />
              <Label htmlFor="proj-validado" className="text-xs cursor-pointer">
                Relacionamento Validado (Diferenciar de referência puramente informativa)
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalNovoProjetoOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCriarProjeto}>
              Salvar Projeto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL NOVA ALOCAÇÃO */}
      <Dialog open={modalNovaAlocacaoOpen} onOpenChange={setModalNovaAlocacaoOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>Propor Alocação de Força de Trabalho</DialogTitle>
            <DialogDescription>
              Vincule um profissional a um projeto ou destino organizacional. A confirmação é
              atômica no servidor.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Colaborador / Prestador</Label>
              <Select value={alocPessoaId} onValueChange={setAlocPessoaId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {pessoas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} ({p.modalidade} - {p.cargo_funcao || 'Cargo'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Projeto de Destino</Label>
                <Select value={alocProjetoId} onValueChange={setAlocProjetoId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione o projeto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projetos.map((pr) => (
                      <SelectItem key={pr.id} value={pr.id}>
                        {pr.identificador} - {pr.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Destino Organizacional Alternativo</Label>
                <Input
                  value={alocDestinoOrg}
                  onChange={(e) => setAlocDestinoOrg(e.target.value)}
                  placeholder="Ex: Squad Core Pagamentos"
                  className="text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Modalidade de Planejamento</Label>
                <Select
                  value={alocModalidade}
                  onValueChange={(v: any) => {
                    setAlocModalidade(v)
                    if (v === 'escopo') {
                      setAlocUnidade('entregavel_escopo')
                      setAlocQtd(1)
                    } else {
                      setAlocUnidade('percentual')
                      setAlocQtd(50)
                    }
                  }}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="disponibilidade">Por Disponibilidade (Horas / %)</SelectItem>
                    <SelectItem value="escopo">Por Escopo (Entregáveis / Marcos)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Unidade &amp; Quantidade</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={alocQtd}
                    onChange={(e) => setAlocQtd(Number(e.target.value))}
                    className="w-24 text-xs font-mono"
                  />
                  <Select value={alocUnidade} onValueChange={(v: any) => setAlocUnidade(v)}>
                    <SelectTrigger className="text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentual">% Disponibilidade</SelectItem>
                      <SelectItem value="horas_mes">Horas no Mês</SelectItem>
                      <SelectItem value="entregavel_escopo">Entregável Escopo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data Início</Label>
                <Input
                  type="date"
                  value={alocInicio}
                  onChange={(e) => setAlocInicio(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Data Fim</Label>
                <Input
                  type="date"
                  value={alocFim}
                  onChange={(e) => setAlocFim(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Papel Desempenhado</Label>
              <Input
                value={alocPapel}
                onChange={(e) => setAlocPapel(e.target.value)}
                placeholder="Ex: Engenheiro Backend Sênior"
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Justificativa da Alocação</Label>
              <Textarea
                value={alocJustificativa}
                onChange={(e) => setAlocJustificativa(e.target.value)}
                placeholder="Motivação e entregas previstas"
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalNovaAlocacaoOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCriarAlocacao}>
              Registrar Proposta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL BLOQUEIO / EXCEÇÃO DE CAPACIDADE */}
      <Dialog open={modalExcecaoOpen} onOpenChange={setModalExcecaoOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Bloqueio de Excesso de Capacidade
            </DialogTitle>
            <DialogDescription>
              A confirmação desta alocação ultrapassaria o limite de 100% da capacidade disponível
              do profissional.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <p className="text-muted-foreground">
              O sistema de governança server-side bloqueou a confirmação automática. Para prosseguir
              com sobrecarga, é obrigatório registrar uma justificativa formal de exceção de alçada.
            </p>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Justificativa Formal de Exceção:</Label>
              <Textarea
                value={justificativaExcecao}
                onChange={(e) => setJustificativaExcecao(e.target.value)}
                placeholder="Informe o motivo da sobrealocação autorizada pela liderança..."
                rows={3}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalExcecaoOpen(false)}>
              Cancelar Bloqueio
            </Button>
            <Button size="sm" variant="destructive" onClick={handleConfirmarComExcecao}>
              Autorizar Exceção Formal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL REGISTRAR OCUPAÇÃO */}
      <Dialog open={modalNovaOcupacaoOpen} onOpenChange={setModalNovaOcupacaoOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Ocupação de Posição Planejada</DialogTitle>
            <DialogDescription>
              Vincule um profissional para ocupar formalmente uma posição prevista no plano.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label className="text-xs">Posição Planejada do Plano</Label>
              <Select value={ocupPosicaoId} onValueChange={setOcupPosicaoId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione a posição" />
                </SelectTrigger>
                <SelectContent>
                  {posicoesPlano.map((pos) => (
                    <SelectItem key={pos.id} value={pos.id}>
                      {pos.codigo} - {pos.expand?.cargo?.nome || 'Cargo'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Pessoa Ocupante</Label>
              <Select value={ocupPessoaId} onValueChange={setOcupPessoaId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione o ocupante" />
                </SelectTrigger>
                <SelectContent>
                  {pessoas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} ({p.modalidade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Data Início</Label>
                <Input
                  type="date"
                  value={ocupInicio}
                  onChange={(e) => setOcupInicio(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Origem da Vinculação</Label>
                <Select value={ocupOrigem} onValueChange={(v: any) => setOcupOrigem(v)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promocao_interna">Promoção Interna</SelectItem>
                    <SelectItem value="transferencia">Transferência</SelectItem>
                    <SelectItem value="contratacao_externa">Contratação Externa</SelectItem>
                    <SelectItem value="alocacao_temporaria">Alocação Temporária</SelectItem>
                    <SelectItem value="enquadramento_inicial">Enquadramento Inicial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Observações</Label>
              <Textarea
                value={ocupObs}
                onChange={(e) => setOcupObs(e.target.value)}
                placeholder="Observações administrativas da ocupação..."
                rows={2}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalNovaOcupacaoOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleRegistrarOcupacao}>
              Salvar Ocupação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
