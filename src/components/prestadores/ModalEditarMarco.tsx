import React, { useState } from 'react'
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
import {
  MarcoLifecyclePJ,
  StatusMarcoLifecycle,
  prestadoresService,
} from '@/services/prestadoresPj'
import { useToast } from '@/hooks/use-toast'
import { Check, Clock, Minus, ShieldCheck, User, History, Send, AlertCircle } from 'lucide-react'

interface ModalEditarMarcoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  marco: MarcoLifecyclePJ | null
  onSuccess: () => void
}

export const ModalEditarMarco: React.FC<ModalEditarMarcoProps> = ({
  open,
  onOpenChange,
  marco,
  onSuccess,
}) => {
  const { toast } = useToast()
  const [status, setStatus] = useState<StatusMarcoLifecycle>('REGISTRADO')
  const [responsavel, setResponsavel] = useState('')
  const [observacao, setObservacao] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [verHistorico, setVerHistorico] = useState(false)

  // Ao abrir ou trocar de marco
  React.useEffect(() => {
    if (marco) {
      setStatus(marco.status)
      setResponsavel(marco.responsavel || '')
      setObservacao(marco.observacao || '')
      setVerHistorico(false)
    }
  }, [marco])

  if (!marco) return null

  const handleSalvar = async () => {
    setSalvando(true)
    try {
      await prestadoresService.atualizarStatusMarco(marco.id, status, {
        responsavel: responsavel.trim() || undefined,
        observacao: observacao.trim() || undefined,
        autor: 'Equipe RH / Gestor',
      })

      toast({
        title: 'Marco atualizado com sucesso',
        description: `"${marco.nome_marco}" definido como "${status}". Auditoria registrada.`,
      })
      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao atualizar marco',
        description: err instanceof Error ? err.message : 'Falha na gravação.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const historico = Array.isArray(marco.historico_auditoria) ? marco.historico_auditoria : []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white p-6 border border-slate-200">
        <DialogHeader className="pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-700">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Etapa: {marco.etapa}
          </div>
          <DialogTitle className="text-base font-bold text-slate-900 mt-1">
            {marco.nome_marco}
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Atualize o status do marco na jornada do prestador PJ. Toda alteração é gravada na
            trilha de auditoria.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Status do Marco */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">Status do Marco</Label>
            <Select value={status} onValueChange={(val) => setStatus(val as StatusMarcoLifecycle)}>
              <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="REGISTRADO">
                  <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                    <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                    REGISTRADO (Concluído / Válido)
                  </div>
                </SelectItem>
                <SelectItem value="PENDENTE DO PJ">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    PENDENTE DO PJ (Aguardando Prestador)
                  </div>
                </SelectItem>
                <SelectItem value="PENDENTE DA EMPRESA">
                  <div className="flex items-center gap-2 text-blue-900 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    PENDENTE DA EMPRESA (Ação Interna Pendente)
                  </div>
                </SelectItem>
                <SelectItem value="NÃO ENVIADO">
                  <div className="flex items-center gap-2 text-slate-700 font-semibold">
                    <Minus className="w-3.5 h-3.5 text-slate-500 stroke-[3]" />
                    NÃO ENVIADO (Ainda não iniciado)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Responsável */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              Responsável / Validador
            </Label>
            <Input
              value={responsavel}
              onChange={(e) => setResponsavel(e.target.value)}
              placeholder="Ex: Compliance RH, Financeiro, Gestor TI ou Nome do PJ"
              className="h-9 text-xs border-slate-200 bg-white"
            />
          </div>

          {/* Observação / Detalhes */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Observações / Justificativa
            </Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Ex: Documento validado via e-mail corporativo / Aguardando certidão atualizada..."
              rows={3}
              className="text-xs border-slate-200 bg-white resize-none"
            />
          </div>

          {/* Trilha de Auditoria Expansível */}
          <div className="pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setVerHistorico(!verHistorico)}
              className="flex items-center justify-between w-full text-slate-600 hover:text-slate-900 font-semibold text-[11px]"
            >
              <span className="flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-slate-400" />
                Histórico de Auditoria ({historico.length} registro
                {historico.length === 1 ? '' : 's'})
              </span>
              <span className="text-blue-600 text-[10px]">
                {verHistorico ? 'Recolher' : 'Exibir Detalhes'}
              </span>
            </button>

            {verHistorico && (
              <div className="mt-2.5 max-h-40 overflow-y-auto space-y-2 pr-1">
                {historico.length === 0 ? (
                  <p className="text-[11px] text-slate-400 italic">
                    Nenhuma alteração registrada além da criação inicial.
                  </p>
                ) : (
                  historico.map((h, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] space-y-0.5"
                    >
                      <div className="flex items-center justify-between text-slate-700 font-semibold">
                        <span>{h.status}</span>
                        <span className="text-[10px] text-slate-400 font-normal">
                          {new Date(h.data).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">
                        Autor: <strong>{h.autor || 'Sistema'}</strong>
                      </p>
                      {h.obs && <p className="text-[10px] text-slate-600 italic">"{h.obs}"</p>}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Auditoria ativa</span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 text-xs border-slate-200 text-slate-700"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvar}
              disabled={salvando}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {salvando ? 'Salvando...' : 'Salvar Alteração'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
