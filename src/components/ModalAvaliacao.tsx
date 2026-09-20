import React, { useState } from 'react'
import pb from '@/lib/pocketbase/client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { candidatosTimelineService } from '@/services/candidatosTimeline'
import {
  Sparkles,
  Award,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Star,
  Loader2,
  UserCheck,
} from 'lucide-react'
import type { RecordModel } from 'pocketbase'

interface ModalAvaliacaoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entrevista: RecordModel | null
  onSuccess: () => void
}

export default function ModalAvaliacao({
  open,
  onOpenChange,
  entrevista,
  onSuccess,
}: ModalAvaliacaoProps) {
  const { toast } = useToast()

  const [notaTecnica, setNotaTecnica] = useState<number>(8)
  const [comentarioTecnico, setComentarioTecnico] = useState('')
  const [notaComportamental, setNotaComportamental] = useState<number>(8)
  const [comentarioComportamental, setComentarioComportamental] = useState('')
  const [recomendacaoFinal, setRecomendacaoFinal] = useState<'Avançar' | 'Recusar' | 'Em dúvida'>(
    'Avançar',
  )
  const [comentarioGeral, setComentarioGeral] = useState('')
  const [avaliadorNome, setAvaliadorNome] = useState(pb.authStore.record?.name || 'Gente & Gestão')
  const [saving, setSaving] = useState(false)

  // Quando abre a modal, preenche se já houver avaliação
  React.useEffect(() => {
    if (entrevista) {
      if (entrevista.avaliacao_realizada) {
        setNotaTecnica(entrevista.nota_tecnica ?? 8)
        setComentarioTecnico(entrevista.comentario_tecnico || '')
        setNotaComportamental(entrevista.nota_comportamental ?? 8)
        setComentarioComportamental(entrevista.comentario_comportamental || '')
        setRecomendacaoFinal(entrevista.recomendacao_final || 'Avançar')
        setComentarioGeral(entrevista.comentario_geral || '')
        setAvaliadorNome(
          entrevista.avaliacao_avaliador || pb.authStore.record?.name || 'Gente & Gestão',
        )
      } else {
        setNotaTecnica(8)
        setComentarioTecnico('')
        setNotaComportamental(8)
        setComentarioComportamental('')
        setRecomendacaoFinal('Avançar')
        setComentarioGeral('')
        setAvaliadorNome(pb.authStore.record?.name || 'Gente & Gestão')
      }
    }
  }, [entrevista, open])

  // Cálculo ponderado do score pós-entrevista
  const scoreCalculado = Math.round(
    notaTecnica * 5 +
      notaComportamental * 4 +
      (recomendacaoFinal === 'Avançar' ? 10 : recomendacaoFinal === 'Em dúvida' ? 0 : -10),
  )
  const scoreLimitado = Math.min(100, Math.max(20, scoreCalculado))

  const handleSalvar = async () => {
    if (!entrevista) return
    setSaving(true)

    try {
      // 1. Atualizar registro da entrevista
      await pb.collection('entrevistas').update(entrevista.id, {
        status: 'Realizada',
        avaliacao_realizada: true,
        avaliacao_data: new Date().toISOString(),
        avaliacao_avaliador: avaliadorNome,
        nota_tecnica: notaTecnica,
        comentario_tecnico: comentarioTecnico,
        nota_comportamental: notaComportamental,
        comentario_comportamental: comentarioComportamental,
        recomendacao_final: recomendacaoFinal,
        comentario_geral: comentarioGeral,
        score_ajustado: scoreLimitado,
      })

      // 2. Atualizar o score_semantico do candidato
      if (entrevista.candidato) {
        await pb.collection('candidatos').update(entrevista.candidato, {
          score_semantico: scoreLimitado,
        })

        // 3. Registrar no pipeline histórico
        try {
          const pList = await pb.collection('pipeline').getFullList({
            filter: `candidato = '${entrevista.candidato}'`,
            limit: 1,
          })
          if (pList.length > 0) {
            const pipe = pList[0]
            const historico = Array.isArray(pipe.historico) ? pipe.historico : []
            historico.push({
              data: new Date().toISOString(),
              estagio: pipe.estagio,
              autor: avaliadorNome,
              nota: `Entrevista realizada com sucesso. Avaliação pós-entrevista registrada com recomendação: "${recomendacaoFinal}" e score ajustado para ${scoreLimitado}%.`,
            })
            await pb.collection('pipeline').update(pipe.id, {
              historico: historico,
            })
          }
        } catch (pipeErr) {
          console.warn('Aviso ao atualizar pipeline:', pipeErr)
        }

        // 4. Se candidato e vaga existirem, recalcular matching via hook matching_avaliar
        if (entrevista.vaga) {
          try {
            await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/matching/avaliar`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: pb.authStore.token,
              },
              body: JSON.stringify({
                candidatoId: entrevista.candidato,
                vagaId: entrevista.vaga,
              }),
            })
          } catch (mErr) {
            console.warn('Aviso ao alimentar agente de matching:', mErr)
          }
        }
      }

      // 5. Registrar eventos na Linha do Tempo do Candidato (Avaliação da Entrevista + Score Ajustado)
      if (entrevista.candidato) {
        await candidatosTimelineService.registrarEventoSeguro({
          candidato: entrevista.candidato,
          categoria: 'ENTREVISTA',
          titulo: 'Avaliação pós-entrevista registrada:',
          complemento: `Nota técnica: ${notaTecnica}/10, comportamental: ${notaComportamental}/10. Recomendação: "${recomendacaoFinal}". Avaliador: ${avaliadorNome}.`,
          autor: avaliadorNome,
          origem: 'usuario',
          referencia_tipo: 'entrevistas',
          referencia_id: entrevista.id,
        })

        await candidatosTimelineService.registrarEventoSeguro({
          candidato: entrevista.candidato,
          categoria: 'AVALIAÇÃO',
          titulo: 'Score calibrado pós-entrevista:',
          complemento: `Score de matching atualizado para ${scoreLimitado}% incorporando notas técnicas e soft skills da entrevista.`,
          autor: 'sistema',
          origem: 'sistema',
          referencia_tipo: 'matching',
          referencia_id: entrevista.id,
        })
      }

      toast({
        title: 'Avaliação registrada com sucesso!',
        description: `O score do candidato foi ajustado para ${scoreLimitado}% e incorporado ao matching inteligente.`,
      })

      onOpenChange(false)
      onSuccess()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar avaliação',
        description: err instanceof Error ? err.message : 'Falha ao registrar avaliação.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const candNome = entrevista?.expand?.candidato?.nome || 'Candidato'
  const vagaTitulo = entrevista?.expand?.vaga?.titulo || 'Vaga'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-slate-900">
                Avaliação Pós-Entrevista & Ajuste de Matching
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Avalie o desempenho de <strong>{candNome}</strong> na vaga{' '}
                <strong>{vagaTitulo}</strong>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 py-3">
          {/* Box de Preview do Score Ajustado */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-950 uppercase tracking-wide">
                  Score Inteligente Ajustado
                </span>
              </div>
              <p className="text-xs text-slate-600">
                Alimenta o agente Gestor de Talentos e o ranking do banco de talentos.
              </p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-extrabold text-blue-700 tabular-nums">
                {scoreLimitado}%
              </span>
              <p className="text-[11px] font-semibold text-blue-600">
                {scoreLimitado >= 75
                  ? 'Alta Aderência'
                  : scoreLimitado >= 50
                    ? 'Média Aderência'
                    : 'Baixa Aderência'}
              </p>
            </div>
          </div>

          {/* Nome do avaliador */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Responsável pela Avaliação
            </Label>
            <Input
              value={avaliadorNome}
              onChange={(e) => setAvaliadorNome(e.target.value)}
              className="text-xs h-9 bg-white"
              placeholder="Ex: Douglas Severo (RH)"
            />
          </div>

          {/* Critério 1: Técnico */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold text-slate-800">
                  1. Critérios Técnicos (0 a 10)
                </Label>
                <p className="text-[11px] text-slate-500">
                  Profundidade nas tecnologias, arquitetura, boas práticas e resolução de problemas.
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-xs font-bold bg-white text-slate-800 border-slate-300"
              >
                Nota: {notaTecnica} / 10
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={notaTecnica}
                onChange={(e) => setNotaTecnica(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600">
                Comentários sobre a avaliação técnica
              </Label>
              <Textarea
                rows={2}
                value={comentarioTecnico}
                onChange={(e) => setComentarioTecnico(e.target.value)}
                placeholder="Ex: Demonstrou excelente domínio das APIs, arquitetura limpa e testes unitários..."
                className="text-xs resize-none bg-white"
              />
            </div>
          </div>

          {/* Critério 2: Comportamental */}
          <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-xs font-bold text-slate-800">
                  2. Critérios Comportamentais (0 a 10)
                </Label>
                <p className="text-[11px] text-slate-500">
                  Comunicação, trabalho em equipe, inteligência emocional e cultura da empresa.
                </p>
              </div>
              <Badge
                variant="outline"
                className="text-xs font-bold bg-white text-slate-800 border-slate-300"
              >
                Nota: {notaComportamental} / 10
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="range"
                min="0"
                max="10"
                step="0.5"
                value={notaComportamental}
                onChange={(e) => setNotaComportamental(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] font-semibold text-slate-600">
                Comentários sobre competências comportamentais
              </Label>
              <Textarea
                rows={2}
                value={comentarioComportamental}
                onChange={(e) => setComentarioComportamental(e.target.value)}
                placeholder="Ex: Postura muito proativa, clareza verbal e alinhamento com os valores de transparência..."
                className="text-xs resize-none bg-white"
              />
            </div>
          </div>

          {/* Recomendação Final */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-800">
              3. Recomendação Final do Entrevistador *
            </Label>
            <RadioGroup
              value={recomendacaoFinal}
              onValueChange={(val) =>
                setRecomendacaoFinal(val as 'Avançar' | 'Recusar' | 'Em dúvida')
              }
              className="grid grid-cols-1 sm:grid-cols-3 gap-3"
            >
              <div
                onClick={() => setRecomendacaoFinal('Avançar')}
                className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-colors ${
                  recomendacaoFinal === 'Avançar'
                    ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <RadioGroupItem value="Avançar" id="rec-avancar" />
                <Label
                  htmlFor="rec-avancar"
                  className="cursor-pointer text-xs font-semibold flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Avançar no processo
                </Label>
              </div>

              <div
                onClick={() => setRecomendacaoFinal('Em dúvida')}
                className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-colors ${
                  recomendacaoFinal === 'Em dúvida'
                    ? 'border-amber-500 bg-amber-50/70 text-amber-900'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <RadioGroupItem value="Em dúvida" id="rec-duvida" />
                <Label
                  htmlFor="rec-duvida"
                  className="cursor-pointer text-xs font-semibold flex items-center gap-1.5"
                >
                  <HelpCircle className="w-4 h-4 text-amber-600" />
                  Em dúvida / Validar
                </Label>
              </div>

              <div
                onClick={() => setRecomendacaoFinal('Recusar')}
                className={`p-3 rounded-lg border cursor-pointer flex items-center gap-3 transition-colors ${
                  recomendacaoFinal === 'Recusar'
                    ? 'border-rose-500 bg-rose-50/70 text-rose-900'
                    : 'border-slate-200 bg-white hover:bg-slate-50'
                }`}
              >
                <RadioGroupItem value="Recusar" id="rec-recusar" />
                <Label
                  htmlFor="rec-recusar"
                  className="cursor-pointer text-xs font-semibold flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4 text-rose-600" />
                  Não aprovar / Recusar
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Comentário Geral */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-slate-700">
              Síntese Geral e Próximos Passos (opcional)
            </Label>
            <Textarea
              rows={2}
              value={comentarioGeral}
              onChange={(e) => setComentarioGeral(e.target.value)}
              placeholder="Ex: Candidato pronto para a etapa final de proposta salarial."
              className="text-xs resize-none bg-white"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 pt-3">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSalvar}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                Atualizando Matching...
              </>
            ) : (
              <>
                <Award className="w-3.5 h-3.5 mr-2" />
                Salvar Avaliação & Ajustar Score
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
