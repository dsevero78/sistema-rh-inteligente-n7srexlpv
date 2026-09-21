import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  prestadoresService,
  PrestadorPJ,
  ContratoPJ,
  AditivoPJ,
  TipoAditivoPJ,
  StatusAditivoPJ,
  HORAS_MES_PADRAO,
} from '@/services/prestadoresPj'
import { FileSignature, TrendingUp, Calendar, AlertCircle } from 'lucide-react'

interface ModalNovoAditivoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  prestador: PrestadorPJ
  contratos: ContratoPJ[]
  contratoPreSelecionadoId?: string
  aditivoParaEditar?: AditivoPJ | null
  onSuccess: () => void
}

export const ModalNovoAditivo: React.FC<ModalNovoAditivoProps> = ({
  open,
  onOpenChange,
  prestador,
  contratos,
  contratoPreSelecionadoId,
  aditivoParaEditar,
  onSuccess,
}) => {
  const { toast } = useToast()

  const [contratoId, setContratoId] = useState<string>('')
  const [numeroAditivo, setNumeroAditivo] = useState<string>('')
  const [sequencia, setSequencia] = useState<number>(1)
  const [tipo, setTipo] = useState<TipoAditivoPJ>('Reajuste de valor')
  const [status, setStatus] = useState<StatusAditivoPJ>('Vigente')
  const [dataAssinatura, setDataAssinatura] = useState<string>('')
  const [novoValorMensal, setNovoValorMensal] = useState<string>('')
  const [novaVigenciaFim, setNovaVigenciaFim] = useState<string>('')
  const [descricao, setDescricao] = useState<string>('')
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [loading, setLoading] = useState<boolean>(false)

  // Contrato ativo selecionado para auto-preenchimento
  const contratoSelecionado = contratos.find((c) => c.id === contratoId)

  // Inicializar formulário
  useEffect(() => {
    if (!open) return

    if (aditivoParaEditar) {
      setContratoId(aditivoParaEditar.contrato)
      setNumeroAditivo(aditivoParaEditar.numero_aditivo)
      setSequencia(aditivoParaEditar.sequencia || 1)
      setTipo(aditivoParaEditar.tipo)
      setStatus(aditivoParaEditar.status)
      setDataAssinatura(
        aditivoParaEditar.data_assinatura ? aditivoParaEditar.data_assinatura.substring(0, 10) : '',
      )
      setNovoValorMensal(
        aditivoParaEditar.novo_valor_mensal !== undefined &&
          aditivoParaEditar.novo_valor_mensal !== null
          ? String(aditivoParaEditar.novo_valor_mensal)
          : '',
      )
      setNovaVigenciaFim(
        aditivoParaEditar.nova_vigencia_fim
          ? aditivoParaEditar.nova_vigencia_fim.substring(0, 10)
          : '',
      )
      setDescricao(aditivoParaEditar.descricao || '')
      setArquivo(null)
    } else {
      const cId = contratoPreSelecionadoId || (contratos.length > 0 ? contratos[0].id : '')
      setContratoId(cId)

      const anoAtual = new Date().getFullYear()
      const proximaSeq = (contratos.find((c) => c.id === cId)?.contador_aditivos || 0) + 1
      setSequencia(proximaSeq)
      setNumeroAditivo(`ADIT-${anoAtual}-${String(proximaSeq).padStart(2, '0')}`)
      setTipo('Reajuste e Prolongamento')
      setStatus('Vigente')
      setDataAssinatura(new Date().toISOString().substring(0, 10))

      const c = contratos.find((item) => item.id === cId)
      if (c) {
        setNovoValorMensal(c.valor ? String(c.valor) : '')
        setNovaVigenciaFim(c.data_fim ? c.data_fim.substring(0, 10) : '')
      } else {
        setNovoValorMensal('')
        setNovaVigenciaFim('')
      }

      setDescricao('')
      setArquivo(null)
    }
  }, [open, aditivoParaEditar, contratoPreSelecionadoId, contratos])

  // Ao mudar contrato no select, atualizar sugestão de número
  const handleContratoChange = (novoId: string) => {
    setContratoId(novoId)
    const c = contratos.find((item) => item.id === novoId)
    if (c && !aditivoParaEditar) {
      const anoAtual = new Date().getFullYear()
      const proximaSeq = (c.contador_aditivos || 0) + 1
      setSequencia(proximaSeq)
      setNumeroAditivo(`ADIT-${anoAtual}-${String(proximaSeq).padStart(2, '0')}`)
      if (c.valor && !novoValorMensal) setNovoValorMensal(String(c.valor))
      if (c.data_fim && !novaVigenciaFim) setNovaVigenciaFim(c.data_fim.substring(0, 10))
    }
  }

  // Previsões de valor-hora no modal
  const valorNum = parseFloat(novoValorMensal) || 0
  const valorHoraCalculado = valorNum > 0 ? (valorNum / HORAS_MES_PADRAO).toFixed(2) : '0,00'

  const valorAnteriorContrato = contratoSelecionado?.valor || 0
  const deltaValor = valorNum - valorAnteriorContrato

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!contratoId) {
      toast({ title: 'Selecione o contrato vinculado', variant: 'destructive' })
      return
    }

    if (!numeroAditivo.trim()) {
      toast({ title: 'Informe o número do aditivo', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const payload: Partial<AditivoPJ> = {
        prestador: prestador.id,
        contrato: contratoId,
        numero_aditivo: numeroAditivo.trim(),
        sequencia: Number(sequencia) || 1,
        tipo,
        status,
        data_assinatura: dataAssinatura ? `${dataAssinatura} 00:00:00.000Z` : '',
        descricao: descricao.trim() || undefined,
        valor_anterior: valorAnteriorContrato,
        vigencia_anterior_fim: contratoSelecionado?.data_fim || undefined,
      }

      if (novoValorMensal !== '') {
        payload.novo_valor_mensal = Number(novoValorMensal)
      }

      if (novaVigenciaFim) {
        payload.nova_vigencia_fim = `${novaVigenciaFim} 00:00:00.000Z`
      }

      if (aditivoParaEditar) {
        await prestadoresService.atualizarAditivo(
          aditivoParaEditar.id,
          payload,
          arquivo || undefined,
        )
        toast({
          title: 'Aditivo atualizado',
          description: `O aditivo ${numeroAditivo} foi atualizado com sucesso.`,
        })
      } else {
        await prestadoresService.criarAditivo(payload, arquivo || undefined)
        toast({
          title: 'Aditivo registrado com sucesso!',
          description:
            status === 'Vigente'
              ? `O aditivo ${numeroAditivo} está em vigor e os dados do contrato foram sincronizados.`
              : `O aditivo ${numeroAditivo} foi registrado com status "${status}".`,
        })
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar aditivo',
        description: err instanceof Error ? err.message : 'Falha na gravação.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-6 bg-white border border-slate-200">
        <DialogHeader className="pb-2 border-b">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <FileSignature className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="font-display text-base sm:text-lg font-bold text-slate-900">
                {aditivoParaEditar ? 'Editar Termo Aditivo' : 'Novo Termo Aditivo Contratual'}
              </DialogTitle>{' '}
              <DialogDescription className="text-xs text-slate-500">
                Formalize prorrogações de prazo, reajustes de valor e alterações de escopo com
                histórico preservado.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3 py-2">
          {/* Contrato Vinculado */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">Contrato Vinculado *</Label>
            <Select value={contratoId} onValueChange={handleContratoChange}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Selecione o contrato..." />
              </SelectTrigger>
              <SelectContent>
                {contratos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.numero_contrato ? `${c.numero_contrato} - ` : ''}
                    {c.titulo} (R$ {c.valor?.toLocaleString('pt-BR')} / {c.tipo})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Número do Aditivo */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Número do Aditivo *</Label>
              <Input
                value={numeroAditivo}
                onChange={(e) => setNumeroAditivo(e.target.value)}
                placeholder="Ex: ADIT-2026-01"
                className="h-9 text-xs font-mono"
                required
              />
            </div>

            {/* Sequência */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Sequência do Aditivo *</Label>
              <Input
                type="number"
                min={1}
                value={sequencia}
                onChange={(e) => setSequencia(parseInt(e.target.value, 10) || 1)}
                className="h-9 text-xs"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Tipo de Aditivo */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Tipo de Aditivo *</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoAditivoPJ)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Reajuste de valor">Reajuste de valor</SelectItem>
                  <SelectItem value="Prolongamento de vigência">
                    Prolongamento de vigência
                  </SelectItem>
                  <SelectItem value="Reajuste e Prolongamento">Reajuste e Prolongamento</SelectItem>
                  <SelectItem value="Mudança de escopo">Mudança de escopo</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status do Aditivo */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Status do Aditivo *</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StatusAditivoPJ)}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Vigente">Vigente (em vigor)</SelectItem>
                  <SelectItem value="Pendente de assinatura">Pendente de assinatura</SelectItem>
                  <SelectItem value="Rascunho">Rascunho</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Novo Valor Mensal */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Novo Valor Mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={novoValorMensal}
                onChange={(e) => setNovoValorMensal(e.target.value)}
                placeholder="Ex: 24500"
                className="h-9 text-xs"
              />
            </div>

            {/* Nova Vigência Fim */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Nova Vigência Fim</Label>
              <Input
                type="date"
                value={novaVigenciaFim}
                onChange={(e) => setNovaVigenciaFim(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Card de Projeção Financeira e Valor-Hora (Base 160h/mês) */}
          {valorNum > 0 && (
            <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-xl p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-bold text-indigo-900">
                <span className="flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Impacto Financeiro & Valor-Hora
                </span>
                <span className="text-[11px] bg-white text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200 font-semibold">
                  base 160h/mês
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-slate-700">
                <div>
                  <span className="text-[10px] text-slate-500 block">Novo Mensal</span>
                  <strong className="text-indigo-950 font-bold">
                    R$ {valorNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Valor-Hora (÷ 160h)</span>
                  <strong className="text-indigo-700 font-bold">
                    R$ {valorHoraCalculado}
                    <span className="text-[10px] font-normal text-slate-500">/h</span>
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Delta s/ Anterior</span>
                  <strong
                    className={
                      deltaValor > 0
                        ? 'text-emerald-700 font-bold'
                        : deltaValor < 0
                          ? 'text-rose-700 font-bold'
                          : 'text-slate-600'
                    }
                  >
                    {deltaValor > 0
                      ? `+R$ ${deltaValor.toLocaleString('pt-BR')}`
                      : deltaValor < 0
                        ? `-R$ ${Math.abs(deltaValor).toLocaleString('pt-BR')}`
                        : 'Sem alteração'}
                  </strong>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            {/* Data de Assinatura */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">Data de Assinatura</Label>
              <Input
                type="date"
                value={dataAssinatura}
                onChange={(e) => setDataAssinatura(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            {/* Anexo do Aditivo */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold text-slate-700">
                Anexo Assinado (PDF/Doc)
              </Label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.png,.jpg"
                onChange={(e) => e.target.files && setArquivo(e.target.files[0])}
                className="text-xs text-slate-600 block w-full file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-slate-300 file:text-xs file:bg-slate-50"
              />
            </div>
          </div>

          {/* Descrição / Objeto do Aditivo */}
          <div className="space-y-1">
            <Label className="text-xs font-semibold text-slate-700">
              Objeto e Justificativa do Aditivo
            </Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o motivo do reajuste, extensão de prazo, SLA adicional ou alteração de escopo acordada..."
              rows={3}
              className="text-xs resize-none"
            />
          </div>

          {status === 'Vigente' && (
            <div className="text-[11px] text-emerald-800 bg-emerald-50/70 p-2.5 rounded-lg border border-emerald-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                <strong>Efeito Automático:</strong> Como o aditivo está marcado como{' '}
                <em>Vigente</em>, a vigência final e o valor mensal do contrato principal serão
                atualizados automaticamente, preservando o valor anterior no histórico para fins de
                auditoria.
              </span>
            </div>
          )}

          <DialogFooter className="pt-3 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
            >
              {loading
                ? 'Salvando...'
                : aditivoParaEditar
                  ? 'Salvar Alterações'
                  : 'Formalizar Aditivo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
export default ModalNovoAditivo
