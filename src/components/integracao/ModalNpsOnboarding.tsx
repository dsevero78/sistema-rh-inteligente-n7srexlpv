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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Sparkles, Heart } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ModalNpsOnboardingProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  scoreAtual?: number | null
  comentarioAtual?: string
  nomeIntegrado: string
  onSalvar: (score: number, comentario: string) => Promise<void>
}

export function ModalNpsOnboarding({
  open,
  onOpenChange,
  scoreAtual,
  comentarioAtual,
  nomeIntegrado,
  onSalvar,
}: ModalNpsOnboardingProps) {
  const { toast } = useToast()
  const [score, setScore] = useState<number>(scoreAtual ?? 10)
  const [comentarios, setComentarios] = useState<string>(comentarioAtual || '')
  const [salvando, setSalvando] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSalvando(true)
    try {
      await onSalvar(score, comentarios)
      toast({
        title: 'NPS de Onboarding Registrado!',
        description: `Nota ${score}/10 salva com sucesso para ${nomeIntegrado}.`,
      })
      onOpenChange(false)
    } catch (err: unknown) {
      toast({
        title: 'Erro ao registrar NPS',
        description: err instanceof Error ? err.message : 'Falha.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E] text-slate-900 dark:text-[#F7F8FB] p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-[#2E3A6E]/50 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E9530E]/10 text-[#E9530E] border border-[#E9530E]/20 flex items-center justify-center font-bold">
              <Heart className="w-5 h-5 text-[#E9530E]" />
            </div>
            <div>
              <DialogTitle className="font-display text-lg font-bold text-slate-900 dark:text-[#F7F8FB]">
                NPS de Onboarding & Integração
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-[#A8B0C9] mt-0.5">
                Avaliação de satisfação da jornada de entrada para <strong>{nomeIntegrado}</strong>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2 font-sans">
          <div className="space-y-2">
            <Label className="text-xs font-semibold">
              Em uma escala de 0 a 10, o quanto a experiência de integração superou as expectativas?
            </Label>
            <div className="flex items-center justify-between gap-1 pt-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                const isSelected = score === num
                return (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setScore(num)}
                    className={`w-8 h-9 rounded-lg font-mono font-bold text-xs transition-all flex items-center justify-center ${
                      isSelected
                        ? 'bg-[#E9530E] text-white shadow-xs scale-105'
                        : 'bg-slate-100 dark:bg-[#212B55] text-slate-700 dark:text-[#D3D7E5] hover:bg-slate-200 dark:hover:bg-[#2E3A6E]'
                    }`}
                  >
                    {num}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 font-sans px-1">
              <span>0 = Muito insatisfeito</span>
              <span>10 = Experiência incrível</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Comentários e Feedbacks do Integrado</Label>
            <Textarea
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="O que funcionou muito bem no pré-embarque, primeiro dia e primeiros 30-90 dias? O que podemos aprimorar?"
              rows={3}
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
              {salvando ? 'Salvando...' : 'Salvar NPS'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
