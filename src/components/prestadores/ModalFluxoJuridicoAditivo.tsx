import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/hooks/use-toast'
import { Scale, Send, CheckCircle2, AlertCircle, Clock, User, MessageSquare } from 'lucide-react'
import {
  type AditivoPJ,
  type HistoricoEtapaAditivo,
  prestadoresPjService,
} from '@/services/prestadoresPj'
import { notificacoesRhService } from '@/services/notificacoesRh'
import pb from '@/lib/pocketbase/client'

interface ModalFluxoJuridicoAditivoProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  aditivo: AditivoPJ | null
  onSuccess: () => void
}

export function ModalFluxoJuridicoAditivo({
  open,
  onOpenChange,
  aditivo,
  onSuccess,
}: ModalFluxoJuridicoAditivoProps) {
  const [modoAcao, setModoAcao] = useState<'aprovar' | 'ajustes' | 'enviar' | null>(null)
  const [comentario, setComentario] = useState('')
  const [salvando, setSalvando] = useState(false)

  if (!aditivo) return null

  const historico: HistoricoEtapaAditivo[] = Array.isArray(aditivo.historico_aprovacao)
    ? aditivo.historico_aprovacao
    : []

  const usuarioAtual = pb.authStore.model

  const handleEnviarAoJuridico = async () => {
    setSalvando(true)
    try {
      const nomeAutor = usuarioAtual?.name || usuarioAtual?.email || 'RH / People'
      const emailAutor = usuarioAtual?.email || ''
      await prestadoresPjService.enviarMinutaParaJuridico(
        aditivo,
        nomeAutor,
        emailAutor,
        comentario || 'Minuta enviada para aprovação do departamento jurídico.',
      )

      await notificacoesRhService.criarNotificacao({
        titulo: `Minuta de Aditivo enviada ao Jurídico (${aditivo.numero_aditivo})`,
        mensagem: `A minuta do aditivo ${aditivo.numero_aditivo} foi enviada para validação e parecer jurídico.`,
        tipo: 'aditivo_juridico',
        link: '/prestadores-pj',
        autor_nome: nomeAutor,
        autor_email: emailAutor,
        referencia_tipo: 'aditivo_pj',
        referencia_id: aditivo.id,
      })

      toast({
        title: 'Minuta enviada ao Jurídico!',
        description: 'Status atualizado para "Em análise pelo jurídico".',
      })
      setModoAcao(null)
      setComentario('')
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar minuta',
        description: err?.message || 'Falha na comunicação com o banco.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  const handleDecisaoJuridico = async (
    decisao: 'Aprovado pelo jurídico' | 'Ajustes solicitados',
  ) => {
    if (!comentario.trim()) {
      toast({
        title: 'Parecer obrigatório',
        description: 'Por favor forneça uma justificativa ou parecer formal da revisão.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const nomeAutor = usuarioAtual?.name || usuarioAtual?.email || 'Jurídico Interno'
      const emailAutor = usuarioAtual?.email || ''
      await prestadoresPjService.registrarDecisaoJuridico(
        aditivo,
        decisao,
        comentario.trim(),
        usuarioAtual?.id,
        nomeAutor,
        emailAutor,
      )

      await notificacoesRhService.criarNotificacao({
        titulo:
          decisao === 'Aprovado pelo jurídico'
            ? `Aditivo Aprovado pelo Jurídico (${aditivo.numero_aditivo})`
            : `Ajustes Solicitados no Aditivo (${aditivo.numero_aditivo})`,
        mensagem:
          decisao === 'Aprovado pelo jurídico'
            ? `O departamento jurídico aprovou a minuta do termo aditivo ${aditivo.numero_aditivo}. Parecer: ${comentario.slice(0, 80)}...`
            : `O departamento jurídico solicitou revisões na minuta do aditivo ${aditivo.numero_aditivo}. Motivo: ${comentario.slice(0, 80)}...`,
        tipo: 'aditivo_juridico',
        link: '/prestadores-pj',
        autor_nome: nomeAutor,
        autor_email: emailAutor,
        referencia_tipo: 'aditivo_pj',
        referencia_id: aditivo.id,
      })

      toast({
        title:
          decisao === 'Aprovado pelo jurídico'
            ? 'Minuta aprovada com sucesso!'
            : 'Solicitação de ajustes registrada!',
        description: `Parecer registrado na linha do tempo do aditivo.`,
      })
      setModoAcao(null)
      setComentario('')
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar parecer',
        description: err?.message || 'Falha ao salvar decisão jurídica.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E] text-slate-900 dark:text-[#F7F8FB] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b border-slate-100 dark:border-[#2E3A6E] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                Aprovação Interna da Minuta pelo Jurídico
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
                Termo Aditivo {aditivo.numero_aditivo} • {aditivo.tipo}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Card Resumo do Aditivo */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#11162B] border border-slate-200 dark:border-[#2E3A6E] text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                Status atual:
              </span>
              <Badge
                variant="outline"
                className="font-bold border-indigo-300 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
              >
                {aditivo.status}
              </Badge>
            </div>
            {aditivo.descricao && (
              <div>
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5">
                  Objeto / Justificativa:
                </span>
                <p className="font-medium text-slate-800 dark:text-[#F7F8FB] bg-white dark:bg-[#1A2240] p-2 rounded border border-slate-100 dark:border-[#2E3A6E]">
                  {aditivo.descricao}
                </p>
              </div>
            )}
            {aditivo.parecer_juridico && (
              <div className="pt-1">
                <span className="text-slate-500 dark:text-slate-400 block mb-0.5 font-semibold">
                  Último parecer jurídico:
                </span>
                <p className="text-slate-700 dark:text-slate-200 bg-purple-50/60 dark:bg-purple-950/30 p-2.5 rounded border border-purple-200 dark:border-purple-800 italic">
                  "{aditivo.parecer_juridico}"
                </p>
              </div>
            )}
          </div>

          {/* Linha do Tempo de Aprovação Interna */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Linha do Tempo e Histórico do Jurídico
            </h4>

            {historico.length === 0 ? (
              <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-[#2E3A6E] text-center text-xs text-slate-400">
                Nenhum trâmite registrado ainda para esta minuta.
              </div>
            ) : (
              <div className="relative pl-6 space-y-3.5 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-[#2E3A6E]">
                {historico.map((h, idx) => (
                  <div key={idx} className="relative group">
                    <span className="absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-[#1A2240] bg-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-900" />
                    <div className="bg-white dark:bg-[#11162B] p-2.5 rounded-lg border border-slate-200/80 dark:border-[#2E3A6E] text-xs">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 dark:text-[#F7F8FB]">
                          {h.etapa}
                        </span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {new Date(h.data).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>{h.autor}</span>
                        {h.autor_email && <span className="text-[10px]">({h.autor_email})</span>}
                      </div>
                      {h.comentario && (
                        <p className="mt-1.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-[#1A2240] p-2 rounded border border-slate-100 dark:border-[#2E3A6E]">
                          {h.comentario}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Ações disponíveis de acordo com o status */}
          <div className="pt-2 border-t border-slate-100 dark:border-[#2E3A6E] space-y-3">
            {modoAcao === null ? (
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {aditivo.status !== 'Em análise pelo jurídico' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setModoAcao('enviar')}
                    className="text-xs border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                  >
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Enviar Minuta ao Jurídico
                  </Button>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModoAcao('ajustes')}
                  className="text-xs border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                >
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  Solicitar Ajustes (Jurídico)
                </Button>

                <Button
                  size="sm"
                  onClick={() => setModoAcao('aprovar')}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Aprovar Minuta (Jurídico)
                </Button>
              </div>
            ) : (
              <div className="space-y-3 p-3.5 rounded-xl border border-indigo-100 dark:border-[#2E3A6E] bg-slate-50/50 dark:bg-[#11162B]">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-800 dark:text-[#F7F8FB] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
                    {modoAcao === 'enviar' && 'Observações para envio ao Jurídico'}
                    {modoAcao === 'aprovar' && 'Parecer de Aprovação Jurídica *'}
                    {modoAcao === 'ajustes' && 'Apontamentos e Ajustes Solicitados *'}
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setModoAcao(null)
                      setComentario('')
                    }}
                    className="h-6 text-[11px] text-slate-500"
                  >
                    Cancelar
                  </Button>
                </div>

                <Textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder={
                    modoAcao === 'enviar'
                      ? 'Descreva detalhes da minuta, cláusulas alteradas ou contexto para o advogado...'
                      : modoAcao === 'aprovar'
                        ? 'Registrar aprovação formal: ex. "Minuta em conformidade com as diretrizes contratuais vigentes, autorizada assinatura."'
                        : 'Descreva quais cláusulas ou valores exigem correção antes da aprovação...'
                  }
                  rows={3}
                  className="text-xs bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E]"
                />

                <div className="flex justify-end gap-2 pt-1">
                  {modoAcao === 'enviar' && (
                    <Button
                      size="sm"
                      onClick={handleEnviarAoJuridico}
                      disabled={salvando}
                      className="text-xs bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Send className="w-3.5 h-3.5 mr-1" />
                      {salvando ? 'Enviando...' : 'Confirmar Envio'}
                    </Button>
                  )}
                  {modoAcao === 'aprovar' && (
                    <Button
                      size="sm"
                      onClick={() => handleDecisaoJuridico('Aprovado pelo jurídico')}
                      disabled={salvando}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      {salvando ? 'Salvando...' : 'Confirmar Aprovação'}
                    </Button>
                  )}
                  {modoAcao === 'ajustes' && (
                    <Button
                      size="sm"
                      onClick={() => handleDecisaoJuridico('Ajustes solicitados')}
                      disabled={salvando}
                      className="text-xs bg-rose-600 hover:bg-rose-700 text-white"
                    >
                      <AlertCircle className="w-3.5 h-3.5 mr-1" />
                      {salvando ? 'Salvando...' : 'Confirmar Ajustes'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 dark:border-[#2E3A6E] pt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="text-xs dark:border-[#2E3A6E]"
          >
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
export default ModalFluxoJuridicoAditivo
