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
  PauseCircle,
  Calendar,
  Clock,
  DollarSign,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  FileText,
  Building,
} from 'lucide-react'
import {
  feriasDescansoService,
  ProgramacaoDescanso,
  StatusProgramacaoDescanso,
  calcularValorDescansoPj,
  calcularDiasEntreDatas,
  SalvarProgramacaoDescansoInput,
} from '@/services/feriasDescansoService'
import { PessoaUnificada, VinculoPessoa } from '@/services/pessoasService'
import { useToast } from '@/hooks/use-toast'

interface AbaDescansoPjProps {
  pessoa: PessoaUnificada
  vinculos: VinculoPessoa[]
  onAtualizar?: () => void
}

export const AbaDescansoPj: React.FC<AbaDescansoPjProps> = ({ pessoa, vinculos, onAtualizar }) => {
  const { toast } = useToast()
  const [programacoes, setProgramacoes] = useState<ProgramacaoDescanso[]>([])
  const [carregando, setCarregando] = useState(true)

  // Valor contratado mensal do prestador PJ
  const valorMensalPJ = Number(pessoa.valor_contratado || 0)

  // Cálculo de elegibilidade: após 12 meses de contrato
  const agora = new Date()
  let mesesContrato = 0
  let elegivel = false
  let dataInicioContrato: Date | null = null

  if (pessoa.data_inicio) {
    dataInicioContrato = new Date(pessoa.data_inicio)
    const diffMeses =
      (agora.getFullYear() - dataInicioContrato.getFullYear()) * 12 +
      (agora.getMonth() - dataInicioContrato.getMonth())
    mesesContrato = Math.max(0, diffMeses)
    elegivel = mesesContrato >= 12
  }

  // Modal
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [progEmEdicao, setProgEmEdicao] = useState<ProgramacaoDescanso | null>(null)

  // Form
  const [formDataInicio, setFormDataInicio] = useState('')
  const [formDataFim, setFormDataFim] = useState('')
  const [formDias, setFormDias] = useState<number>(30)
  const [formStatus, setFormStatus] = useState<StatusProgramacaoDescanso>('Programadas')
  const [formValorNegociado, setFormValorNegociado] = useState<string>('')
  const [formObservacao, setFormObservacao] = useState('')

  const carregarProgramacoes = async () => {
    if (!pessoa.id) return
    setCarregando(true)
    try {
      const lista = await feriasDescansoService.listarPorPessoa(pessoa.id, 'PJ_DESCANSO')
      setProgramacoes(lista)
    } catch (err) {
      console.error('Erro ao carregar descansos PJ:', err)
      toast({
        title: 'Erro ao carregar descansos PJ',
        description: 'Não foi possível carregar as programações cadastradas.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarProgramacoes()
  }, [pessoa.id])

  const handleDataInicioChange = (val: string) => {
    setFormDataInicio(val)
    if (val && formDataFim) {
      const d = calcularDiasEntreDatas(val, formDataFim)
      if (d > 0) {
        setFormDias(d)
        setFormValorNegociado(calcularValorDescansoPj(valorMensalPJ, d).valorSugerido.toFixed(2))
      }
    } else if (val && !formDataFim) {
      // Auto preencher 30 dias
      const dIni = new Date(val)
      dIni.setDate(dIni.getDate() + 29)
      const fimSugerido = dIni.toISOString().split('T')[0]
      setFormDataFim(fimSugerido)
      setFormDias(30)
      setFormValorNegociado(valorMensalPJ.toFixed(2))
    }
  }

  const handleDataFimChange = (val: string) => {
    setFormDataFim(val)
    if (formDataInicio && val) {
      const d = calcularDiasEntreDatas(formDataInicio, val)
      if (d > 0) {
        setFormDias(d)
        setFormValorNegociado(calcularValorDescansoPj(valorMensalPJ, d).valorSugerido.toFixed(2))
      }
    }
  }

  const handleDiasChange = (qtd: number) => {
    const d = Math.max(1, Math.min(60, qtd))
    setFormDias(d)
    setFormValorNegociado(calcularValorDescansoPj(valorMensalPJ, d).valorSugerido.toFixed(2))
    if (formDataInicio) {
      const dIni = new Date(formDataInicio)
      dIni.setDate(dIni.getDate() + (d - 1))
      setFormDataFim(dIni.toISOString().split('T')[0])
    }
  }

  const handleAbrirCriacao = () => {
    setProgEmEdicao(null)
    const hoje = new Date()
    // Sugerir início no próximo mês
    const dIni = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 1)
    const dFim = new Date(dIni)
    dFim.setDate(dFim.getDate() + 29)

    setFormDataInicio(dIni.toISOString().split('T')[0])
    setFormDataFim(dFim.toISOString().split('T')[0])
    setFormDias(30)
    setFormStatus('Programadas')
    setFormValorNegociado(valorMensalPJ.toFixed(2))
    setFormObservacao(
      'Suspensão temporária do contrato de prestação de serviços com pagamento acordado do período.',
    )
    setModalAberto(true)
  }

  const handleAbrirEdicao = (p: ProgramacaoDescanso) => {
    setProgEmEdicao(p)
    setFormDataInicio(p.data_inicio ? p.data_inicio.split('T')[0] : '')
    setFormDataFim(p.data_fim ? p.data_fim.split('T')[0] : '')
    setFormDias(p.dias || 30)
    setFormStatus(p.status)
    setFormValorNegociado(Number(p.valor_periodo || 0).toFixed(2))
    setFormObservacao(p.observacao || '')
    setModalAberto(true)
  }

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formDataInicio || !formDataFim) {
      toast({
        title: 'Datas obrigatórias',
        description: 'Informe as datas de início e término da suspensão.',
        variant: 'destructive',
      })
      return
    }

    const valorPeriodoNum = parseFloat(formValorNegociado.replace(',', '.'))
    if (isNaN(valorPeriodoNum) || valorPeriodoNum < 0) {
      toast({
        title: 'Valor inválido',
        description: 'Informe um valor numérico válido para o período de descanso.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const payload: SalvarProgramacaoDescansoInput = {
        pessoa: pessoa.id,
        vinculo_origem_id: `ficha-${pessoa.id}`,
        tipo: 'PJ_DESCANSO',
        data_inicio: formDataInicio,
        data_fim: formDataFim,
        dias: formDias,
        status: formStatus,
        valor_periodo: valorPeriodoNum,
        valor_base_mensal: valorMensalPJ,
        adicional_terco_constitucional: 0,
        observacao: formObservacao.trim() || undefined,
      }

      if (progEmEdicao) {
        await feriasDescansoService.atualizar(progEmEdicao.id, payload)
        toast({
          title: 'Descanso atualizado',
          description: 'A programação de suspensão do prestador PJ foi atualizada.',
        })
      } else {
        await feriasDescansoService.criar(payload)
        toast({
          title: 'Descanso PJ programado',
          description: `Período de ${formDias} dias registrado como suspensão acordada do contrato PJ.`,
        })
      }

      setModalAberto(false)
      await carregarProgramacoes()
      if (onAtualizar) onAtualizar()
    } catch (err: any) {
      console.error('Erro ao salvar descanso PJ:', err)
      toast({
        title: 'Erro ao salvar descanso PJ',
        description: err?.message || 'Falha ao salvar no banco de dados.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleExcluir = async (id: string) => {
    if (!confirm('Deseja realmente cancelar/remover este período de descanso PJ?')) return
    try {
      await feriasDescansoService.excluir(id)
      toast({
        title: 'Descanso removido',
        description: 'A programação de suspensão do contrato PJ foi excluída.',
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

  const proximoDescanso = programacoes.find(
    (p) => p.status === 'Programadas' || p.status === 'Em Gozo',
  )

  return (
    <div className="space-y-5">
      {/* 1. Header do Módulo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base sm:text-lg font-bold font-display text-[#212B55] dark:text-[#F7F8FB] flex items-center gap-2">
              <PauseCircle className="w-5 h-5 text-purple-600" />
              Descanso Remunerado PJ (Suspensão Acordada) — {pessoa.nome}
            </h3>
            <Badge className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300">
              Regime PJ
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Negociação contratual para prestadores PJ: descanso remunerado concedido a partir de 12
            meses de parceria contínua, registrado como suspensão temporária do contrato.
          </p>
        </div>

        <Button
          size="sm"
          onClick={handleAbrirCriacao}
          className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold gap-1.5 shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Programar Descanso PJ
        </Button>
      </div>

      {/* 2. Destaque de Elegibilidade (12 Meses) & Painel Informativo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card
          className={`border shadow-xs ${
            elegivel
              ? 'border-emerald-300 bg-emerald-50/40 dark:bg-emerald-950/20'
              : 'border-amber-300 bg-amber-50/40 dark:bg-amber-950/20'
          }`}
        >
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Tempo de Parceria PJ
              </span>
              <Badge
                variant="outline"
                className={
                  elegivel
                    ? 'border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 text-[10px]'
                    : 'border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/40 text-[10px]'
                }
              >
                {elegivel ? 'Elegível ao Descanso' : 'Em Cumprimento'}
              </Badge>
            </div>
            <div className="text-xl font-black font-display text-[#212B55] dark:text-[#F7F8FB]">
              {mesesContrato} {mesesContrato === 1 ? 'mês' : 'meses'} de contrato
            </div>
            <span className="text-xs text-muted-foreground block">
              {elegivel
                ? 'Critério de 12 meses cumprido com sucesso'
                : `Faltam ${Math.max(0, 12 - mesesContrato)} meses para completar 12 meses`}
            </span>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
              Suspensão Programada
            </span>
            <div className="text-xl font-black text-purple-700 dark:text-purple-300 font-display">
              {proximoDescanso ? `${proximoDescanso.dias} dias` : 'Nenhum agendado'}
            </div>
            <span className="text-xs text-muted-foreground font-mono block">
              {proximoDescanso
                ? `${new Date(proximoDescanso.data_inicio).toLocaleDateString('pt-BR')} a ${new Date(proximoDescanso.data_fim).toLocaleDateString('pt-BR')}`
                : 'Clique em "Programar Descanso PJ" para agendar'}
            </span>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card shadow-xs">
          <CardContent className="p-4 space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 block">
              Valor Negociado do Período
            </span>
            <div className="text-xl font-black font-mono text-purple-700 dark:text-purple-300">
              R${' '}
              {proximoDescanso
                ? Number(proximoDescanso.valor_periodo || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })
                : '0,00'}
            </div>
            <span className="text-xs text-muted-foreground block">
              Base mensal contratada: R${' '}
              {valorMensalPJ.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* 3. Lista de Suspensões / Descansos Registrados */}
      {carregando ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          Carregando períodos de descanso PJ...
        </div>
      ) : programacoes.length === 0 ? (
        <Card className="border border-dashed border-border/80 bg-muted/10 p-8 text-center space-y-3">
          <PauseCircle className="w-10 h-10 text-muted-foreground/60 mx-auto" />
          <h4 className="font-bold text-sm text-[#212B55] dark:text-[#F7F8FB]">
            Nenhum período de descanso PJ cadastrado
          </h4>
          <p className="text-xs text-muted-foreground max-w-md mx-auto">
            Quando acordado após 12 meses de contrato, cadastre o período de suspensão dos serviços
            e o valor acordado a ser pago pela empresa ao prestador PJ durante o intervalo.
          </p>
          <Button
            size="sm"
            onClick={handleAbrirCriacao}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Programar Primeiro Descanso PJ
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

            return (
              <Card
                key={prog.id}
                className="border border-border/80 bg-card shadow-2xs hover:border-purple-400/50 transition-colors"
              >
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/50 pb-2.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950 dark:text-purple-300 font-bold">
                        {prog.dias} DIAS SUSPENSÃO
                      </Badge>
                      <h4 className="font-bold text-sm sm:text-base text-[#212B55] dark:text-[#F7F8FB]">
                        Descanso Acordado PJ: {dtIniStr} a {dtFimStr}
                      </h4>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          prog.status === 'Em Gozo'
                            ? 'border-emerald-400 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40'
                            : prog.status === 'Programadas'
                              ? 'border-purple-400 text-purple-700 bg-purple-50 dark:bg-purple-950/40'
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

                  {/* Grid de Informações Financeiras e Contratuais */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-sans">
                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Valor Acordado do Período
                      </span>
                      <span className="text-base font-bold font-mono text-purple-700 dark:text-purple-300">
                        R${' '}
                        {Number(prog.valor_periodo || 0).toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Honorário negociado durante suspensão
                      </span>
                    </div>

                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Impacto Operacional
                      </span>
                      <span className="text-xs font-semibold text-[#212B55] dark:text-[#F7F8FB] block">
                        Suspensão temporária de entregas
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Sem prestação de serviços no intervalo
                      </span>
                    </div>

                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Nota Fiscal & Faturamento
                      </span>
                      <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 block">
                        NF faturada como descanso acordado
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Contabilidade ciente do período
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

      {/* 4. Modal de Cadastro/Edição de Descanso PJ */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#212B55] dark:text-[#F7F8FB] flex items-center gap-2">
              <PauseCircle className="w-4 h-4 text-purple-600" />
              {progEmEdicao ? 'Editar Descanso PJ' : 'Programar Descanso PJ (Suspensão)'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe as datas de início e fim da suspensão do contrato PJ e o valor negociado para
              o período.
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
                <Label htmlFor="desc-ini">Data de Início da Suspensão *</Label>
                <Input
                  id="desc-ini"
                  type="date"
                  required
                  value={formDataInicio}
                  onChange={(e) => handleDataInicioChange(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="desc-fim">Data de Término *</Label>
                <Input
                  id="desc-fim"
                  type="date"
                  required
                  value={formDataFim}
                  onChange={(e) => handleDataFimChange(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="desc-dias">Quantidade de Dias *</Label>
                <Input
                  id="desc-dias"
                  type="number"
                  min="1"
                  max="60"
                  required
                  value={formDias}
                  onChange={(e) => handleDiasChange(parseInt(e.target.value) || 1)}
                />
              </div>

              <div className="space-y-1">
                <Label>Status do Descanso</Label>
                <Select value={formStatus} onValueChange={(val: any) => setFormStatus(val)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Programadas">Programadas</SelectItem>
                    <SelectItem value="Em Gozo">Em Suspensão Ativa</SelectItem>
                    <SelectItem value="Concluidas">Concluído</SelectItem>
                    <SelectItem value="Canceladas">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="desc-valor">Valor Negociado do Período (R$) *</Label>
              <Input
                id="desc-valor"
                type="number"
                step="0.01"
                required
                value={formValorNegociado}
                onChange={(e) => setFormValorNegociado(e.target.value)}
              />
              <span className="text-[10px] text-muted-foreground">
                Sugerido com base na mensalidade PJ de R${' '}
                {valorMensalPJ.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (R${' '}
                {calcularValorDescansoPj(valorMensalPJ, formDias).valorSugerido.toFixed(2)} para{' '}
                {formDias} dias).
              </span>
            </div>

            <div className="space-y-1">
              <Label htmlFor="desc-obs">Cláusula / Termos de Suspensão</Label>
              <Input
                id="desc-obs"
                placeholder="Ex: Suspensão acordada após 12 meses de vigência sem penalidades..."
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
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold"
              >
                {salvando
                  ? 'Salvando...'
                  : progEmEdicao
                    ? 'Salvar Alterações'
                    : 'Confirmar Descanso PJ'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default AbaDescansoPj
