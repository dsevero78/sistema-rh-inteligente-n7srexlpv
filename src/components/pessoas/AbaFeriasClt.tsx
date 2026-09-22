import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  Calendar,
  Clock,
  DollarSign,
  Palmtree,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  ShieldAlert,
  Info,
} from 'lucide-react'
import {
  feriasDescansoService,
  ProgramacaoDescanso,
  StatusProgramacaoDescanso,
  calcularValorFeriasClt,
  calcularDiasEntreDatas,
  SalvarProgramacaoDescansoInput,
} from '@/services/feriasDescansoService'
import { PessoaUnificada, VinculoPessoa } from '@/services/pessoasService'
import { useToast } from '@/hooks/use-toast'

interface AbaFeriasCltProps {
  pessoa: PessoaUnificada
  vinculos: VinculoPessoa[]
  onAtualizar?: () => void
}

export const AbaFeriasClt: React.FC<AbaFeriasCltProps> = ({ pessoa, vinculos, onAtualizar }) => {
  const { toast } = useToast()
  const [programacoes, setProgramacoes] = useState<ProgramacaoDescanso[]>([])
  const [carregando, setCarregando] = useState(true)

  // Salário base mensal efetivo
  const salarioMensalBase = Number(pessoa.valor_contratado || 0)

  // Modal
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [progEmEdicao, setProgEmEdicao] = useState<ProgramacaoDescanso | null>(null)

  // Form
  const [formDataInicio, setFormDataInicio] = useState('')
  const [formDataFim, setFormDataFim] = useState('')
  const [formDias, setFormDias] = useState<number>(30)
  const [formStatus, setFormStatus] = useState<StatusProgramacaoDescanso>('Programadas')
  const [formPeriodoAquisitivoInicio, setFormPeriodoAquisitivoInicio] = useState('')
  const [formPeriodoAquisitivoFim, setFormPeriodoAquisitivoFim] = useState('')
  const [formPeriodoConcessivoLimite, setFormPeriodoConcessivoLimite] = useState('')
  const [formSaldoRemanescente, setFormSaldoRemanescente] = useState<number>(0)
  const [formObservacao, setFormObservacao] = useState('')

  // Valores calculados em tempo real
  const calculoValores = calcularValorFeriasClt(salarioMensalBase, formDias)

  const carregarProgramacoes = async () => {
    if (!pessoa.id) return
    setCarregando(true)
    try {
      const lista = await feriasDescansoService.listarPorPessoa(pessoa.id, 'CLT_FERIAS')
      setProgramacoes(lista)
    } catch (err) {
      console.error('Erro ao carregar férias CLT:', err)
      toast({
        title: 'Erro ao carregar férias',
        description: 'Não foi possível carregar as férias cadastradas.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarProgramacoes()
  }, [pessoa.id])

  // Recalcular dias automaticamente quando data início ou fim mudam
  const handleDataInicioChange = (val: string) => {
    setFormDataInicio(val)
    if (val && formDataFim) {
      const d = calcularDiasEntreDatas(val, formDataFim)
      if (d > 0) {
        setFormDias(d)
        setFormSaldoRemanescente(Math.max(0, 30 - d))
      }
    } else if (val && !formDataFim) {
      // Auto-preencher 30 dias se fim estiver vazio
      const dIni = new Date(val)
      dIni.setDate(dIni.getDate() + 29)
      const fimSugerido = dIni.toISOString().split('T')[0]
      setFormDataFim(fimSugerido)
      setFormDias(30)
      setFormSaldoRemanescente(0)
    }
  }

  const handleDataFimChange = (val: string) => {
    setFormDataFim(val)
    if (formDataInicio && val) {
      const d = calcularDiasEntreDatas(formDataInicio, val)
      if (d > 0) {
        setFormDias(d)
        setFormSaldoRemanescente(Math.max(0, 30 - d))
      }
    }
  }

  const handleDiasChange = (qtd: number) => {
    const d = Math.max(1, Math.min(30, qtd))
    setFormDias(d)
    setFormSaldoRemanescente(Math.max(0, 30 - d))
    if (formDataInicio) {
      const dIni = new Date(formDataInicio)
      dIni.setDate(dIni.getDate() + (d - 1))
      setFormDataFim(dIni.toISOString().split('T')[0])
    }
  }

  const handleAbrirCriacao = () => {
    setProgEmEdicao(null)
    const hoje = new Date()
    // Sugerir início em 30 dias
    const dIni = new Date(hoje.getTime() + 30 * 86400000)
    const dFim = new Date(dIni.getTime() + 29 * 86400000)

    // Período aquisitivo padrão baseado na data_inicio da pessoa
    const dtAdmissao = pessoa.data_inicio
      ? new Date(pessoa.data_inicio)
      : new Date(hoje.getFullYear() - 1, hoje.getMonth(), hoje.getDate())
    const dtAquisitivoFim = new Date(dtAdmissao)
    dtAquisitivoFim.setFullYear(dtAquisitivoFim.getFullYear() + 1)
    dtAquisitivoFim.setDate(dtAquisitivoFim.getDate() - 1)

    const dtConcessivoLimite = new Date(dtAquisitivoFim)
    dtConcessivoLimite.setFullYear(dtConcessivoLimite.getFullYear() + 1)

    setFormDataInicio(dIni.toISOString().split('T')[0])
    setFormDataFim(dFim.toISOString().split('T')[0])
    setFormDias(30)
    setFormStatus('Programadas')
    setFormPeriodoAquisitivoInicio(dtAdmissao.toISOString().split('T')[0])
    setFormPeriodoAquisitivoFim(dtAquisitivoFim.toISOString().split('T')[0])
    setFormPeriodoConcessivoLimite(dtConcessivoLimite.toISOString().split('T')[0])
    setFormSaldoRemanescente(0)
    setFormObservacao('')
    setModalAberto(true)
  }

  const handleAbrirEdicao = (p: ProgramacaoDescanso) => {
    setProgEmEdicao(p)
    setFormDataInicio(p.data_inicio ? p.data_inicio.split('T')[0] : '')
    setFormDataFim(p.data_fim ? p.data_fim.split('T')[0] : '')
    setFormDias(p.dias || 30)
    setFormStatus(p.status)
    setFormPeriodoAquisitivoInicio(
      p.periodo_aquisitivo_inicio ? p.periodo_aquisitivo_inicio.split('T')[0] : '',
    )
    setFormPeriodoAquisitivoFim(
      p.periodo_aquisitivo_fim ? p.periodo_aquisitivo_fim.split('T')[0] : '',
    )
    setFormPeriodoConcessivoLimite(
      p.periodo_concessivo_limite ? p.periodo_concessivo_limite.split('T')[0] : '',
    )
    setFormSaldoRemanescente(p.dias_saldo_remanescente || 0)
    setFormObservacao(p.observacao || '')
    setModalAberto(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formDataInicio || !formDataFim) {
      toast({
        title: 'Datas obrigatórias',
        description: 'Informe as datas de início e término das férias.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const calc = calcularValorFeriasClt(salarioMensalBase, formDias)

      const payload: SalvarProgramacaoDescansoInput = {
        pessoa: pessoa.id,
        vinculo_origem_id: `ficha-${pessoa.id}`,
        tipo: 'CLT_FERIAS',
        data_inicio: formDataInicio,
        data_fim: formDataFim,
        dias: formDias,
        status: formStatus,
        valor_periodo: calc.valorTotal,
        valor_base_mensal: salarioMensalBase,
        adicional_terco_constitucional: calc.tercoConstitucional,
        periodo_aquisitivo_inicio: formPeriodoAquisitivoInicio || undefined,
        periodo_aquisitivo_fim: formPeriodoAquisitivoFim || undefined,
        periodo_concessivo_limite: formPeriodoConcessivoLimite || undefined,
        dias_saldo_remanescente: formSaldoRemanescente,
        observacao: formObservacao.trim() || undefined,
      }

      if (progEmEdicao) {
        await feriasDescansoService.atualizar(progEmEdicao.id, payload)
        toast({
          title: 'Férias atualizadas',
          description: 'A programação de férias CLT foi atualizada com sucesso.',
        })
      } else {
        await feriasDescansoService.criar(payload)
        toast({
          title: 'Férias programadas com sucesso',
          description: `Período de ${formDias} dias registrado com cálculo de 1/3 constitucional.`,
        })
      }

      setModalAberto(false)
      await carregarProgramacoes()
      if (onAtualizar) onAtualizar()
    } catch (err: any) {
      console.error('Erro ao salvar férias:', err)
      toast({
        title: 'Erro ao salvar férias',
        description: err?.message || 'Falha ao salvar no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja realmente cancelar/remover esta programação de férias?')) return
    try {
      await feriasDescansoService.excluir(id)
      toast({
        title: 'Programação removida',
        description: 'Férias removidas do cronograma da pessoa.',
      })
      await carregarProgramacoes()
      if (onAtualizar) onAtualizar()
    } catch (err) {
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir a programação.',
        variant: 'destructive',
      })
    }
  }

  // Férias ativas mais recente / próxima
  const proximaFerias = programacoes.find(
    (p) => p.status === 'Programadas' || p.status === 'Em Gozo',
  )

  return (
    <div className="space-y-5">
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold font-display text-[#212B55] dark:text-[#F7F8FB] flex items-center gap-2">
              <Palmtree className="w-5 h-5 text-blue-600" />
              Gestão de Férias CLT — {pessoa.nome}
            </h3>
            <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300">
              Regime CLT
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Programação e controle de férias: cálculo automático de dias × diária + 1/3
            constitucional, monitoramento de período concessivo e saldo de dias.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleAbrirCriacao}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Programar Férias CLT
        </Button>
      </div>

      {/* 2. Destaque das Regras Legais CLT & Próximo Período */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Salário Base & Diária
            </span>
            <div className="text-xl font-black font-mono text-[#212B55] dark:text-[#F7F8FB]">
              R$ {salarioMensalBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-muted-foreground font-mono block">
              Diária base: R$ {(salarioMensalBase / 30).toFixed(2)} (salário ÷ 30)
            </span>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
              Próximo Gozo Programado
            </span>
            <div className="text-xl font-black text-emerald-700 dark:text-emerald-300 font-display">
              {proximaFerias ? `${proximaFerias.dias} dias` : 'Nenhum agendado'}
            </div>
            <span className="text-xs text-muted-foreground font-mono block">
              {proximaFerias
                ? `${new Date(proximaFerias.data_inicio).toLocaleDateString('pt-BR')} a ${new Date(proximaFerias.data_fim).toLocaleDateString('pt-BR')}`
                : 'Clique em "Programar Férias CLT" para marcar'}
            </span>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block flex items-center gap-1">
              <Calculator className="w-3.5 h-3.5" />
              Valor do Período (com 1/3)
            </span>
            <div className="text-xl font-black font-mono text-blue-700 dark:text-blue-300">
              R${' '}
              {proximaFerias
                ? Number(proximaFerias.valor_periodo || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })
                : '0,00'}
            </div>
            <span className="text-xs text-muted-foreground font-mono block">
              {proximaFerias && proximaFerias.adicional_terco_constitucional
                ? `Inclui 1/3 de R$ ${Number(proximaFerias.adicional_terco_constitucional).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : 'Cálculo automático CLT'}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 3. Tabela / Cards de Programações de Férias */}
      {carregando ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Carregando períodos de férias...
        </div>
      ) : programacoes.length === 0 ? (
        <Card className="border border-dashed border-border/80 bg-muted/10 p-8 text-center space-y-3">
          <Palmtree className="w-10 h-10 text-muted-foreground/60 mx-auto" />
          <h4 className="font-bold text-sm text-[#212B55] dark:text-[#F7F8FB]">
            Nenhuma marcação de férias CLT registrada
          </h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Cadastre os períodos de férias da colaboradora marcando a quantidade de dias (30 dias
            integrais ou fracionado em até 3 períodos). O sistema calcula o valor do período
            automaticamente com o 1/3 constitucional.
          </p>
          <Button
            size="sm"
            onClick={handleAbrirCriacao}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Programar Primeiro Período de Férias
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {programacoes.map((prog) => {
            const dtIniStr = prog.data_inicio
              ? new Date(prog.data_inicio).toLocaleDateString('pt-BR')
              : '—'
            const dtFimStr = prog.data_fim
              ? new Date(prog.data_fim).toLocaleDateString('pt-BR')
              : '—'
            const dtAquisitivoStr =
              prog.periodo_aquisitivo_inicio && prog.periodo_aquisitivo_fim
                ? `${new Date(prog.periodo_aquisitivo_inicio).toLocaleDateString('pt-BR')} a ${new Date(prog.periodo_aquisitivo_fim).toLocaleDateString('pt-BR')}`
                : 'Não informado'
            const dtLimiteStr = prog.periodo_concessivo_limite
              ? new Date(prog.periodo_concessivo_limite).toLocaleDateString('pt-BR')
              : 'Não informado'

            return (
              <Card
                key={prog.id}
                className="border border-border/80 bg-card shadow-2xs hover:border-blue-400/50 transition-colors"
              >
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-950 dark:text-blue-300 font-bold">
                        {prog.dias} DIAS
                      </Badge>
                      <h4 className="font-bold text-sm sm:text-base text-[#212B55] dark:text-[#F7F8FB]">
                        Férias CLT: {dtIniStr} a {dtFimStr}
                      </h4>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          prog.status === 'Em Gozo'
                            ? 'border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                            : prog.status === 'Programadas'
                              ? 'border-blue-400 text-blue-700 bg-blue-50 dark:bg-blue-950/40'
                              : prog.status === 'Concluidas'
                                ? 'border-slate-300 text-slate-700'
                                : 'border-rose-300 text-rose-700'
                        }`}
                      >
                        {prog.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAbrirEdicao(prog)}
                        className="h-7 text-xs text-muted-foreground hover:text-foreground"
                      >
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleExcluir(prog.id)}
                        className="h-7 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Grid de Detalhes Financeiros e Período Aquisitivo */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-sans">
                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Valor Total do Período
                      </span>
                      <span className="text-sm font-bold font-mono text-blue-700 dark:text-blue-300">
                        R${' '}
                        {Number(prog.valor_periodo || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Remuneração + 1/3 legal
                      </span>
                    </div>

                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        1/3 Constitucional
                      </span>
                      <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400">
                        R${' '}
                        {Number(prog.adicional_terco_constitucional || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Abono de 1/3 da CLT
                      </span>
                    </div>

                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Período Aquisitivo
                      </span>
                      <span className="text-xs font-semibold text-[#212B55] dark:text-[#F7F8FB] block">
                        {dtAquisitivoStr}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        12 meses trabalhados
                      </span>
                    </div>

                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Limite Concessivo
                      </span>
                      <span className="text-xs font-semibold text-[#212B55] dark:text-[#F7F8FB] block">
                        {dtLimiteStr}
                      </span>
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 block font-medium">
                        {prog.dias_saldo_remanescente && prog.dias_saldo_remanescente > 0
                          ? `Saldo: ${prog.dias_saldo_remanescente} dias restantes`
                          : 'Período quitado integralmente'}
                      </span>
                    </div>
                  </div>

                  {prog.observacao && (
                    <p className="text-xs text-muted-foreground italic bg-muted/20 p-2 rounded border border-border/40">
                      "{prog.observacao}"
                    </p>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* 4. Modal de Programação de Férias CLT */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#212B55] dark:text-[#F7F8FB] flex items-center gap-2">
              <Palmtree className="w-4 h-4 text-blue-600" />
              {progEmEdicao ? 'Editar Férias CLT' : 'Programar Férias CLT com Cálculo Legal'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe as datas de início e fim. O sistema calcula a quantidade de dias, a proporção
              do salário mensal e o adicional de 1/3 constitucional da CLT.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvar} className="space-y-3.5 py-1 text-xs">
            {/* Atalhos rápidos de dias */}
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground">Períodos comuns:</Label>
              <div className="flex items-center gap-1.5">
                {[30, 20, 15, 10].map((diasOption) => (
                  <Button
                    key={diasOption}
                    type="button"
                    size="sm"
                    variant={formDias === diasOption ? 'default' : 'outline'}
                    onClick={() => handleDiasChange(diasOption)}
                    className="h-7 text-xs px-2.5"
                  >
                    {diasOption} dias
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="fer-ini">Data de Início *</Label>
                <Input
                  id="fer-ini"
                  type="date"
                  required
                  value={formDataInicio}
                  onChange={(e) => handleDataInicioChange(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="fer-fim">Data de Término *</Label>
                <Input
                  id="fer-fim"
                  type="date"
                  required
                  value={formDataFim}
                  onChange={(e) => handleDataFimChange(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="fer-dias">Quantidade de Dias *</Label>
                <Input
                  id="fer-dias"
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={formDias}
                  onChange={(e) => handleDiasChange(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-1">
                <Label>Status do Período</Label>
                <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Programadas">Programadas</SelectItem>
                    <SelectItem value="Em Gozo">Em Gozo</SelectItem>
                    <SelectItem value="Concluidas">Concluídas</SelectItem>
                    <SelectItem value="Canceladas">Canceladas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Painel do Cálculo Legal em Tempo Real */}
            <div className="p-3 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-blue-950 dark:text-blue-200">
                <span className="flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5 text-blue-600" />
                  Cálculo do Valor do Período ({formDias} dias)
                </span>
                <span className="text-sm font-mono text-blue-700 dark:text-blue-300">
                  Total: R${' '}
                  {calculoValores.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-blue-200/50">
                <div>
                  Salário Proporcional ({formDias}d × diária):{' '}
                  <strong className="text-foreground font-mono">
                    R${' '}
                    {calculoValores.valorProporcional.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </strong>
                </div>
                <div>
                  1/3 Constitucional (art. 7º, XVII, CF):{' '}
                  <strong className="text-foreground font-mono">
                    R${' '}
                    {calculoValores.tercoConstitucional.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </strong>
                </div>
              </div>
            </div>

            {/* Período aquisitivo e concessivo */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="fer-aquis-ini">Início Período Aquisitivo</Label>
                <Input
                  id="fer-aquis-ini"
                  type="date"
                  value={formPeriodoAquisitivoInicio}
                  onChange={(e) => setFormPeriodoAquisitivoInicio(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="fer-aquis-fim">Fim Período Aquisitivo</Label>
                <Input
                  id="fer-aquis-fim"
                  type="date"
                  value={formPeriodoAquisitivoFim}
                  onChange={(e) => setFormPeriodoAquisitivoFim(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="fer-limite">Limite Concessivo (Dobra Legal)</Label>
                <Input
                  id="fer-limite"
                  type="date"
                  value={formPeriodoConcessivoLimite}
                  onChange={(e) => setFormPeriodoConcessivoLimite(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="fer-saldo">Saldo Restante de Dias</Label>
                <Input
                  id="fer-saldo"
                  type="number"
                  min="0"
                  max="30"
                  value={formSaldoRemanescente}
                  onChange={(e) => setFormSaldoRemanescente(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="fer-obs">Observações / Acordo de Escala</Label>
              <Input
                id="fer-obs"
                placeholder="Ex: Escala de cobertura acordada com o gestor..."
                value={formObservacao}
                onChange={(e) => setFormObservacao(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalAberto(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvando}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
              >
                {salvando ? 'Salvando...' : progEmEdicao ? 'Salvar Alterações' : 'Confirmar Férias'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default AbaFeriasClt
