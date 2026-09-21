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
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, Star, Calendar, MessageSquare } from 'lucide-react'
import type { Marco306090 } from '@/services/rotinaIntegracaoService'
import { useToast } from '@/hooks/use-toast'

interface ModalCheckInMarcoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  marco: Marco306090 | null
  nomeIntegrado: string
  onSalvar: (dados: {
    parecerGestor: string
    notaAvaliacao: number
    statusMarco: 'concluido' | 'em_andamento'
  }) => Promise<void>
}

export function ModalCheckInMarco({
  open,
  onOpenChange,
  marco,
  nomeIntegrado,
  onSalvar,
}: ModalCheckInMarcoProps) {
  const { toast } = useToast()
  const [parecer, setParecer] = useState(marco?.parecerGestor || '')
  const [nota, setNota] = useState<number>(marco?.notaAvaliacao || 9.0)
  const [statusMarco, setStatusMarco] = useState<'concluido' | 'em_andamento'>('concluido')
  const [salvando, setSalvando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!parecer.trim()) {
      toast({
        title: 'Parecer obrigatório',
        description: 'Descreva a síntese da sessão de alinhamento e avaliação de entregas.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      await onSalvar({
        parecerGestor: parecer,
        notaAvaliacao: nota,
        statusMarco,
      })
      toast({
        title: 'Check-in de Marco Concluído!',
        description: `Avaliação do ${marco?.titulo} registrada com sucesso no SouYess.`,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao registrar check-in',
        description: err instanceof Error ? err.message : 'Falha.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  if (!marco) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E] text-slate-900 dark:text-[#F7F8FB] p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-[#2E3A6E]/50 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg font-bold text-slate-900 dark:text-[#F7F8FB]">
                Registrar Check-in de Marco — {marco.titulo}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-[#A8B0C9] mt-0.5">
                Avaliação de adaptação, metas e entregas com <strong>{nomeIntegrado}</strong>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 font-sans">
          <div className="bg-slate-50 dark:bg-[#11162B]/50 p-3.5 rounded-xl border border-slate-200 dark:border-[#2E3A6E]/50 space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-[#A8B0C9] font-display">
              Entregas e Objetivos do Marco
            </span>
            <p className="text-xs text-slate-700 dark:text-[#D3D7E5] font-medium">
              {marco.entregasEsperadas}
            </p>
            <ul className="text-[11px] text-slate-600 dark:text-[#A8B0C9] list-disc pl-4 space-y-0.5">
              {marco.objetivos.map((obj, i) => (
                <li key={i}>{obj}</li>
              ))}
            </ul>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500" />
                Nota de Adaptação / Desempenho (0 a 10)
              </Label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max="10"
                value={nota}
                onChange={(e) => setNota(Number(e.target.value))}
                className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Status do Marco</Label>
              <Select
                value={statusMarco}
                onValueChange={(val: 'concluido' | 'em_andamento') => setStatusMarco(val)}
              >
                <SelectTrigger className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E] text-xs">
                  <SelectItem value="concluido">Concluído / Atingido com Sucesso</SelectItem>
                  <SelectItem value="em_andamento">Parcialmente Atingido (Em Andamento)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
              Parecer Formal do Gestor / Alinhamento Realizado *
            </Label>
            <Textarea
              value={parecer}
              onChange={(e) => setParecer(e.target.value)}
              placeholder="Descreva como foi a reunião 1-on-1, principais pontos fortes demonstrados, sinergia com o time e se há pontos de atenção para os próximos 30 dias..."
              rows={4}
              required
              className="bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] text-xs resize-none"
            />
          </div>

          <DialogFooter className="border-t border-slate-100 dark:border-[#2E3A6E]/50 pt-3 flex flex-row items-center justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={salvando}
              className="text-xs bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold shadow-xs"
            >
              {salvando ? 'Salvando...' : 'Confirmar Check-in no Meu Dia'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
