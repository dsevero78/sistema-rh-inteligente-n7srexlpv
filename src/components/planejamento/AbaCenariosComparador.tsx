import React, { useState, useEffect, useCallback } from 'react'
import {
  GitCompare,
  Plus,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Clock,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  Send,
  Loader2,
  Info,
  Calendar,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  cenariosService,
  type CenarioCapacidade,
  type AlternativaCenario,
  type PropostaRevisaoPlano,
} from '@/services/cenariosService'

interface Props {
  empresaId: string
  planoBaseId?: string
}

export const AbaCenariosComparador: React.FC<Props> = ({ empresaId, planoBaseId }) => {
  const { toast } = useToast()
  const [cenarios, setCenarios] = useState<CenarioCapacidade[]>([])
  const [propostas, setPropostas] = useState<PropostaRevisaoPlano[]>([])
  const [cenarioSelecionado, setCenarioSelecionado] = useState<CenarioCapacidade | null>(null)
  const [loading, setLoading] = useState(false)

  // Modais
  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [modalAdotarOpen, setModalAdotarOpen] = useState(false)
  const [modalIaOpen, setModalIaOpen] = useState(false)

  // IA
  const [iaLoading, setIaLoading] = useState(false)
  const [iaConteudo, setIaConteudo] = useState<string | null>(null)
  const [iaOrigem, setIaOrigem] = useState<string>('')

  // Formulário Novo Cenário
  const [nomeCenario, setNomeCenario] = useState('')
  const [objetivoCenario, setObjetivoCenario] = useState('')
  const [horizonteCenario, setHorizonteCenario] = useState('6 meses (Q4/2026 - Q1/2027)')
  const [dataRefCenario, setDataRefCenario] = useState(new Date().toISOString().slice(0, 10))
  const [duracaoMeses, setDuracaoMeses] = useState(6)
  const [volumeHoras, setVolumeHoras] = useState(320)
  const [reservaPremissa, setReservaPremissa] = useState(10)

  // Justificativa Adoção
  const [justificativaAdocao, setJustificativaAdocao] = useState('')
  const [adotando, setAdotando] = useState(false)

  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      const [listaCenarios, listaPropostas] = await Promise.all([
        cenariosService.listarCenarios(empresaId),
        cenariosService.listarPropostasRevisao(empresaId),
      ])
      setCenarios(listaCenarios)
      setPropostas(listaPropostas)

      if (listaCenarios.length > 0 && !cenarioSelecionado) {
        setCenarioSelecionado(listaCenarios[0])
      } else if (cenarioSelecionado) {
        const atualizado = listaCenarios.find((c) => c.id === cenarioSelecionado.id)
        if (atualizado) setCenarioSelecionado(atualizado)
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar cenários',
        description: err.message || 'Verifique sua conexão e permissões.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [empresaId, toast, cenarioSelecionado])

  useEffect(() => {
    carregarDados()
  }, [empresaId])

  const handleCriarCenario = async () => {
    if (!nomeCenario.trim() || !objetivoCenario.trim()) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }

    try {
      const novo = await cenariosService.criarCenario({
        nome: nomeCenario,
        objetivo: objetivoCenario,
        versao_base_plano: planoBaseId || 'plano_placeholder',
        empresa: empresaId,
        data_referencia: dataRefCenario,
        horizonte_temporal: horizonteCenario,
        premissas: {
          data_inicio: dataRefCenario,
          duracao_meses: duracaoMeses,
          volume_capacidade_necessaria_horas: volumeHoras,
          reserva_operacional_aplicada_percentual: reservaPremissa,
          grau_confirmacao_demanda: 'planejada',
        },
        qualidade_dados_declarada: 'Dados declarados manualmente para estudo comparativo.',
        alternativas: [
          {
            id: 'alt_realocacao',
            tipo: 'realocar_capacidade',
            titulo: 'Realocação de recursos internos',
            descricao: 'Remanejamento de membros de outros projetos com menor criticidade.',
            prazo_disponibilizacao_dias: 7,
            custo_incremental_mensal: 0,
            custo_pontual: 0,
            demandas_atendidas: ['Demanda prioritária do cenário'],
            lacunas_remanescentes: ['Perda de capacidade no time cedente'],
            impacto_origem: 'Redução temporária de entregas na área cedente.',
            dependencias: ['Alinhamento prévio com o gestor cedente'],
            riscos: ['Sobrecarga e curva de aterrissagem no novo projeto'],
            dados_ausentes: [],
          },
          {
            id: 'alt_capacitacao',
            tipo: 'desenvolver_competencias',
            titulo: 'Programa de Capacitação / Upskilling',
            descricao: 'Treinamento de time atual para absorção das novas tecnologias necessárias.',
            prazo_disponibilizacao_dias: 45,
            custo_incremental_mensal: 0,
            custo_pontual: 8000,
            demandas_atendidas: ['Demanda após período de curva de aprendizagem'],
            lacunas_remanescentes: ['Sem ganho imediato nos primeiros 45 dias'],
            impacto_origem: 'Horas de treinamento reduzem capacidade produtiva inicial em 15%.',
            dependencias: ['Material didático e instrutor homologado'],
            riscos: ['Curva de maturação mais lenta que a estimada'],
            dados_ausentes: [],
          },
          {
            id: 'alt_contratar_clt',
            tipo: 'contratar_clt',
            titulo: 'Abertura de Vaga CLT',
            descricao: 'Contratação permanente com dedicação integral (160h/mês).',
            prazo_disponibilizacao_dias: 40,
            custo_incremental_mensal: 14000,
            custo_pontual: 2500,
            demandas_atendidas: ['Cobertura integral das horas necessárias'],
            lacunas_remanescentes: [],
            impacto_origem: 'Sem impacto negativo em outras frentes.',
            dependencias: ['Aprovação de alçada orçamentária e vaga pelo RH'],
            riscos: ['Tempo de recrutamento estendido pelo mercado'],
            dados_ausentes: [],
          },
        ],
      })

      toast({ title: 'Cenário criado com sucesso' })
      setModalNovoOpen(false)
      setNomeCenario('')
      setObjetivoCenario('')
      await carregarDados()
      setCenarioSelecionado(novo)
    } catch (err: any) {
      toast({
        title: 'Erro ao criar cenário',
        description: err.message,
        variant: 'destructive',
      })
    }
  }

  const handleConsultarIa = async (
    acao:
      | 'explicar_cenario'
      | 'sugerir_alternativas'
      | 'justificativa_adocao'
      | 'comparar_alternativas'
      | 'preparar_justificativa',
  ) => {
    if (!cenarioSelecionado) return
    setIaLoading(true)
    setModalIaOpen(true)
    setIaConteudo(null)

    try {
      const res = await cenariosService.consultarIaCenarios({
        cenarioId: cenarioSelecionado.id,
        empresaId: cenarioSelecionado.empresa,
        acao,
        nomeCenario: cenarioSelecionado.nome,
        objetivo: cenarioSelecionado.objetivo,
        premissas: cenarioSelecionado.premissas,
        alternativas: cenarioSelecionado.alternativas,
      })
      setIaConteudo(res.conteudo)
      setIaOrigem(res.origem)
    } catch (err: any) {
      setIaConteudo(`Falha ao obter síntese de IA: ${err.message}`)
    } finally {
      setIaLoading(false)
    }
  }

  const handleSubmeterAdocao = async () => {
    if (!cenarioSelecionado || !justificativaAdocao.trim()) {
      toast({ title: 'Informe a justificativa de adoção', variant: 'destructive' })
      return
    }

    setAdotando(true)
    try {
      const prop = await cenariosService.adotarCenarioComoPropostaRevisao(
        cenarioSelecionado.id,
        justificativaAdocao,
      )
      toast({
        title: 'Proposta de Revisão enviada para governança',
        description: `Código gerado: ${prop.codigo}. A simulação não altera alocações reais até a aprovação formal do RH.`,
      })
      setModalAdotarOpen(false)
      setJustificativaAdocao('')
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao submeter proposta',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setAdotando(false)
    }
  }

  const renderBadgeSituacao = (situacao: string) => {
    switch (situacao) {
      case 'em_estudo':
        return (
          <Badge variant="outline" className="border-blue-500 text-blue-600 bg-blue-50/50">
            Em Estudo (Simulação)
          </Badge>
        )
      case 'proposta_submetida':
        return (
          <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-50/50">
            Proposta Submetida ao RH
          </Badge>
        )
      case 'adotado_como_revisao':
        return (
          <Badge variant="outline" className="border-emerald-500 text-emerald-600 bg-emerald-50/50">
            Adotado em Revisão
          </Badge>
        )
      default:
        return <Badge variant="outline">{situacao}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Banner de Esclarecimento de Governança */}
      <div className="flex items-start gap-3 p-4 rounded-lg bg-indigo-50/70 border border-indigo-200 dark:bg-indigo-950/30 dark:border-indigo-800">
        <ShieldCheck className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
        <div className="text-xs text-indigo-900 dark:text-indigo-200 space-y-1">
          <p className="font-semibold text-sm">
            Ambiente Seguro de Simulação de Capacidade (Workforce Scenarios)
          </p>
          <p>
            Cenários operam estritamente como modelo comparativo sob o mesmo horizonte temporal.
            <strong>
              {' '}
              A simulação NÃO altera o plano-base, alocações reais, contratos ou custos vigentes.
            </strong>
            A adoção de uma alternativa gera exclusivamente uma <em>Proposta de Revisão</em> no
            fluxo de governança de RH.
          </p>
        </div>
      </div>

      {/* Header com Lista de Cenários e Ações */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Cenários da BU:
          </span>
          {cenarios.length === 0 && !loading && (
            <span className="text-sm text-slate-400">Nenhum cenário cadastrado</span>
          )}
          {cenarios.map((c) => (
            <button
              key={c.id}
              onClick={() => setCenarioSelecionado(c)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-all ${
                cenarioSelecionado?.id === c.id
                  ? 'bg-[#E9530E] text-white border-[#E9530E] shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
              }`}
            >
              {c.codigo}: {c.nome.length > 25 ? `${c.nome.slice(0, 25)}...` : c.nome}
            </button>
          ))}
        </div>

        <Button
          onClick={() => setModalNovoOpen(true)}
          className="bg-[#E9530E] hover:bg-[#d44808] text-white shrink-0 text-xs h-9"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Novo Cenário
        </Button>
      </div>

      {/* Detalhe do Cenário Selecionado */}
      {cenarioSelecionado ? (
        <div className="space-y-6">
          {/* Card de Metadados e Premissas */}
          <Card className="border-slate-200 dark:border-slate-700 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded font-semibold text-slate-700 dark:text-slate-300">
                      {cenarioSelecionado.codigo}
                    </span>
                    {renderBadgeSituacao(cenarioSelecionado.situacao)}
                    {cenarioSelecionado.is_demonstracao && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-slate-200 text-slate-700"
                      >
                        Demonstração Homologada
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">
                    {cenarioSelecionado.nome}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 mt-0.5">
                    {cenarioSelecionado.objetivo}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConsultarIa('explicar_cenario')}
                    className="text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300"
                    title="Explicar comparativo e premissas deste cenário com inteligência contextual"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    Explicar este resultado
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConsultarIa('comparar_alternativas')}
                    className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 hidden sm:inline-flex"
                    title="Comparar alternativas e destacar trade-offs"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    Comparar alternativas
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleConsultarIa('preparar_justificativa')}
                    className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 hidden md:inline-flex"
                    title="Preparar justificativa técnica para governança e alçada"
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-600" />
                    Preparar justificativa
                  </Button>

                  <Button
                    size="sm"
                    disabled={cenarioSelecionado.situacao !== 'em_estudo'}
                    onClick={() => setModalAdotarOpen(true)}
                    className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Submeter Proposta de Revisão
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-2">
                <div>
                  <span className="text-slate-500 block">Horizonte Temporal:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {cenarioSelecionado.horizonte_temporal}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Data de Referência:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {cenarioSelecionado.data_referencia?.slice(0, 10)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Volume Necessário:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {cenarioSelecionado.premissas?.volume_capacidade_necessaria_horas || 0} h
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Reserva de Simulação:</span>
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {cenarioSelecionado.premissas?.reserva_operacional_aplicada_percentual || 0}%
                  </span>
                </div>
              </div>

              {cenarioSelecionado.qualidade_dados_declarada && (
                <div className="mt-3 p-2.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-2">
                  <Info className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      Qualidade e Fontes de Dados:
                    </span>
                    <p className="text-slate-600 dark:text-slate-400 mt-0.5">
                      {cenarioSelecionado.qualidade_dados_declarada}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comparador de Alternativas Lado a Lado */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-[#E9530E]" />
                Alternativas Estruturadas (Mesmo Horizonte Temporal — Sem Score Arbitrário)
              </h3>
              <span className="text-xs text-slate-500">
                Total de opções avaliadas: {cenarioSelecionado.alternativas?.length || 0}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {cenarioSelecionado.alternativas?.map((alt, idx) => (
                <Card
                  key={alt.id || idx}
                  className="border-slate-200 dark:border-slate-700 flex flex-col justify-between hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] font-mono uppercase">
                        {alt.tipo.replace('_', ' ')}
                      </Badge>
                      <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {alt.prazo_disponibilizacao_dias} dias
                      </span>
                    </div>
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {alt.titulo}
                    </CardTitle>
                    <p className="text-xs text-slate-500 line-clamp-2 mt-1">{alt.descricao}</p>
                  </CardHeader>

                  <CardContent className="pt-2 text-xs space-y-3">
                    {/* Custos */}
                    <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Custo Incremental / Mês:</span>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          R${' '}
                          {alt.custo_incremental_mensal.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                      {alt.custo_pontual > 0 && (
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-500">Custo Pontual (Setup/Treinamento):</span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            R${' '}
                            {alt.custo_pontual.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Unidade incompatível alerta */}
                    {alt.unidade_medicao === 'entregaveis_marcos' && (
                      <div className="p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-amber-800 dark:text-amber-300 text-[11px]">
                        <strong>Regra de Unidade:</strong> Contratação de entrega por marcos/escopo
                        fechado (proibido somar em horas equivalentes).
                      </div>
                    )}

                    {/* Impacto na Origem */}
                    {alt.impacto_origem && (
                      <div className="text-[11px]">
                        <span className="font-semibold text-rose-700 dark:text-rose-400 block">
                          Perda / Impacto na Origem:
                        </span>
                        <span className="text-slate-600 dark:text-slate-400">
                          {alt.impacto_origem}
                        </span>
                      </div>
                    )}

                    {/* Lacunas Remanescentes */}
                    {alt.lacunas_remanescentes?.length > 0 && (
                      <div className="text-[11px]">
                        <span className="font-semibold text-amber-700 dark:text-amber-400 block">
                          Lacunas Remanescentes:
                        </span>
                        <ul className="list-disc pl-4 text-slate-600 dark:text-slate-400">
                          {alt.lacunas_remanescentes.map((l, i) => (
                            <li key={i}>{l}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Riscos Declarados */}
                    {alt.riscos?.length > 0 && (
                      <div className="text-[11px]">
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                          Riscos Identificados:
                        </span>
                        <span className="text-slate-500">{alt.riscos.join('; ')}</span>
                      </div>
                    )}

                    {/* Dados Ausentes */}
                    {alt.dados_ausentes?.length > 0 && (
                      <div className="p-1.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-400">
                        <strong>Dados Ausentes:</strong> {alt.dados_ausentes.join(', ')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Propostas de Revisão Vinculadas */}
          {propostas.length > 0 && (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Propostas de Revisão em Tramitação no RH (Módulo de Governança)
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs">
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {propostas.map((prop) => (
                    <div
                      key={prop.id}
                      className="py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {prop.codigo}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">
                            {prop.situacao}
                          </Badge>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 mt-1">
                          {prop.justificativa_adocao}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-slate-500 shrink-0">
                        <span>Autor: {prop.proposto_por_nome || 'Liderança'}</span>
                        <span className="block">{prop.created?.slice(0, 10)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card className="p-8 text-center border-dashed">
          <p className="text-sm text-slate-500">
            Nenhum cenário selecionado. Crie um novo cenário comparativo para avaliar alternativas.
          </p>
        </Card>
      )}

      {/* MODAL NOVO CENÁRIO */}
      <Dialog open={modalNovoOpen} onOpenChange={setModalNovoOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Novo Cenário de Capacidade</DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Crie um modelo comparativo sem alterar o plano vigente nem alocações reais.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            <div>
              <Label className="text-xs">Nome do Cenário *</Label>
              <Input
                placeholder="Ex: Cenário Expansão E-commerce 2027"
                value={nomeCenario}
                onChange={(e) => setNomeCenario(e.target.value)}
                className="text-xs mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">Objetivo do Cenário *</Label>
              <Textarea
                placeholder="Qual problema de capacidade ou demanda este cenário busca responder?"
                value={objetivoCenario}
                onChange={(e) => setObjetivoCenario(e.target.value)}
                className="text-xs mt-1"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Horizonte Temporal</Label>
                <Input
                  value={horizonteCenario}
                  onChange={(e) => setHorizonteCenario(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Data de Referência</Label>
                <Input
                  type="date"
                  value={dataRefCenario}
                  onChange={(e) => setDataRefCenario(e.target.value)}
                  className="text-xs mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Duração (Meses)</Label>
                <Input
                  type="number"
                  value={duracaoMeses}
                  onChange={(e) => setDuracaoMeses(Number(e.target.value) || 1)}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Capacidade Necessária (Horas)</Label>
                <Input
                  type="number"
                  value={volumeHoras}
                  onChange={(e) => setVolumeHoras(Number(e.target.value) || 0)}
                  className="text-xs mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Reserva Simulação (%)</Label>
                <Input
                  type="number"
                  value={reservaPremissa}
                  onChange={(e) => setReservaPremissa(Number(e.target.value) || 0)}
                  className="text-xs mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalNovoOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleCriarCenario}
              className="bg-[#E9530E] hover:bg-[#d44808] text-white"
            >
              Criar Cenário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL ADOTAR CENÁRIO COMO PROPOSTA */}
      <Dialog open={modalAdotarOpen} onOpenChange={setModalAdotarOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">
              Submeter Proposta de Revisão ao RH
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              A adoção de uma alternativa NÃO efetiva contratações nem altera alocações reais. Ela
              submete uma proposta formal de revisão para a alçada de governança e RH.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <Label className="text-xs">Justificativa e Parecer da Liderança *</Label>
            <Textarea
              placeholder="Descreva por que a alternativa selecionada atende aos objetivos estratégicos e orçamentários..."
              value={justificativaAdocao}
              onChange={(e) => setJustificativaAdocao(e.target.value)}
              className="text-xs"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalAdotarOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={adotando}
              onClick={handleSubmeterAdocao}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {adotando ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Send className="w-4 h-4 mr-1.5" />
              )}
              Submeter ao RH
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL SÍNTESE DE IA */}
      <Dialog open={modalIaOpen} onOpenChange={setModalIaOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              Apoio de Inteligência Artificial — Análise do Cenário
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Gateway $ai com escopo estrito de BU. Decisão final é 100% humana.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs">
            {iaLoading ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                <span className="text-slate-500">Analisando trade-offs e premissas...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-slate-400 border-b pb-1.5">
                  <span>
                    Origem:{' '}
                    {iaOrigem === 'skip_ai'
                      ? 'Skip Cloud $ai Gateway'
                      : 'Síntese Heurística Determinística'}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] text-indigo-700 border-indigo-200"
                  >
                    Cálculo Determinístico + Explicação
                  </Badge>
                </div>
                <div className="whitespace-pre-line text-slate-800 dark:text-slate-200 leading-relaxed font-sans bg-slate-50 dark:bg-slate-900 p-4 rounded-md border border-slate-200 dark:border-slate-800">
                  {iaConteudo}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalIaOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
