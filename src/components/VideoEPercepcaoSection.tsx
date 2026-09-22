import React, { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import { videoIaService, type AnaliseVideoResponse } from '@/services/videoIaService'
import {
  Video,
  Play,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Upload,
  Link as LinkIcon,
  Plus,
  Loader2,
  MessageSquare,
  ShieldAlert,
  BarChart3,
  Flame,
  Award,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import type { RecordModel } from 'pocketbase'

interface VideoEPercepcaoSectionProps {
  candidato: RecordModel
  onUpdate?: () => void
  onCandidatoUpdated?: () => Promise<void> | void
}

export function VideoEPercepcaoSection({
  candidato,
  onUpdate,
  onCandidatoUpdated,
}: VideoEPercepcaoSectionProps) {
  const { toast } = useToast()

  const [percepcoes, setPercepcoes] = useState<RecordModel[]>([])
  const [analiseIa, setAnaliseIa] = useState<RecordModel | null>(null)
  const [loadingPercepcoes, setLoadingPercepcoes] = useState(true)
  const [loadingAnalise, setLoadingAnalise] = useState(true)
  const [analisando, setAnalisando] = useState(false)
  const [erroAnalise, setErroAnalise] = useState<string | null>(null)

  // Modais
  const [modalPercepcaoOpen, setModalPercepcaoOpen] = useState(false)
  const [modalVideoOpen, setModalVideoOpen] = useState(false)
  const [submittingPercepcao, setSubmittingPercepcao] = useState(false)
  const [submittingVideo, setSubmittingVideo] = useState(false)

  // Form Percepção
  const [tipoOrigem, setTipoOrigem] = useState('RH')
  const [observacoes, setObservacoes] = useState('')
  const [destaquesPositivos, setDestaquesPositivos] = useState('')
  const [destaquesAtencao, setDestaquesAtencao] = useState('')

  // Form Vídeo
  const [novoLinkVideo, setNovoLinkVideo] = useState(candidato.video_link || '')
  const [arquivoVideo, setArquivoVideo] = useState<File | null>(null)

  // Informações de vídeo
  const temArquivo = Boolean(candidato.video_apresentacao)
  const temLink = Boolean(candidato.video_link)
  const temVideo = temArquivo || temLink
  const urlArquivo = temArquivo ? pb.files.getURL(candidato, candidato.video_apresentacao) : null

  const videoStatus = candidato.video_status || (temVideo ? 'enviado_aguardando' : 'sem_video')

  // Carregar dados
  const carregarDados = async () => {
    try {
      const [percs, analise] = await Promise.all([
        pb.collection('percepcoes_entrevista').getFullList({
          filter: `candidato = "${candidato.id}"`,
          sort: '-created',
          expand: 'autor',
        }),
        videoIaService.obterAnaliseMaisRecente(candidato.id),
      ])
      setPercepcoes(percs)
      setAnaliseIa(analise)
    } catch (err) {
      console.error('Erro ao buscar vídeo/percepções:', err)
    } finally {
      setLoadingPercepcoes(false)
      setLoadingAnalise(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [candidato.id])

  // Disparar análise de IA
  const handleDispararAnalise = async () => {
    if (!temVideo) {
      toast({
        title: 'Nenhum vídeo disponível',
        description: 'Faça upload ou adicione um link de vídeo antes de iniciar a análise de IA.',
        variant: 'destructive',
      })
      return
    }

    setAnalisando(true)
    setErroAnalise(null)

    try {
      const resultado: AnaliseVideoResponse = await videoIaService.dispararAnalise(candidato.id)
      toast({
        title: 'Análise de vídeo concluída!',
        description: `Score IA: ${resultado.score_geral}/100 · ${resultado.recomendacao_geral}`,
      })
      await carregarDados()
      if (onUpdate) onUpdate()
      if (onCandidatoUpdated) onCandidatoUpdated()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na comunicação com o serviço de IA.'
      setErroAnalise(msg)
      toast({
        title: 'Erro ao analisar vídeo',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setAnalisando(false)
    }
  }

  // Salvar novo vídeo / link
  const handleSalvarVideo = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingVideo(true)
    try {
      if (arquivoVideo) {
        const formatosPermitidos = [
          'video/mp4',
          'video/webm',
          'video/quicktime',
          'video/x-matroska',
          'video/ogg',
          'video/x-msvideo',
        ]
        const extensoesPermitidas = ['.mp4', '.webm', '.mov', '.mkv', '.ogg', '.avi']
        const ext = '.' + (arquivoVideo.name.split('.').pop() || '').toLowerCase()

        if (
          arquivoVideo.type &&
          !formatosPermitidos.includes(arquivoVideo.type) &&
          !extensoesPermitidas.includes(ext)
        ) {
          throw new Error(
            'Formato de vídeo não suportado. Por favor envie arquivos em formato MP4, WebM ou MOV.',
          )
        }

        const maxBytes = 100 * 1024 * 1024 // 100MB
        if (arquivoVideo.size > maxBytes) {
          throw new Error(
            'O arquivo excede o limite máximo de 100MB. Escolha um arquivo menor ou envie o link do vídeo.',
          )
        }
        await videoIaService.uploadArquivoVideo(candidato.id, arquivoVideo)
      } else if (novoLinkVideo.trim() !== (candidato.video_link || '')) {
        await videoIaService.salvarLinkVideo(candidato.id, novoLinkVideo.trim())
      }
      toast({
        title: 'Vídeo atualizado com sucesso!',
        description: 'Você já pode solicitar a análise por IA.',
      })
      setModalVideoOpen(false)
      setArquivoVideo(null)
      if (onUpdate) onUpdate()
      if (onCandidatoUpdated) onCandidatoUpdated()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao atualizar vídeo',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmittingVideo(false)
    }
  }

  // Salvar Percepção de Entrevista
  const handleSalvarPercepcao = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmittingPercepcao(true)
    try {
      const posArray = destaquesPositivos
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      const ateArray = destaquesAtencao
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)

      await pb.collection('percepcoes_entrevista').create({
        candidato: candidato.id,
        vaga: candidato.vaga,
        origem_tipo: tipoOrigem,
        autor: pb.authStore.record?.id,
        observacoes,
        destaques_positivos: posArray,
        pontos_atencao: ateArray,
        data_registro: new Date().toISOString(),
      })

      toast({
        title: 'Percepção registrada com sucesso!',
        description: 'Os dados foram vinculados ao histórico do candidato.',
      })
      setModalPercepcaoOpen(false)
      setObservacoes('')
      setDestaquesPositivos('')
      setDestaquesAtencao('')
      carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao registrar percepção',
        description: err instanceof Error ? err.message : 'Erro inesperado.',
        variant: 'destructive',
      })
    } finally {
      setSubmittingPercepcao(false)
    }
  }

  // Dimensoes a exibir
  const dimensoes = candidato.video_analise_dimensoes || {
    clareza_comunicacao: analiseIa?.clareza_comunicacao || 0,
    estrutura_narrativa: analiseIa?.estrutura_narrativa || 0,
    energia_postura: analiseIa?.energia_postura || 0,
    aderencia_vaga: analiseIa?.aderencia_vaga || 0,
  }

  const redFlags: string[] =
    (Array.isArray(candidato.video_analise_dimensoes?.red_flags)
      ? candidato.video_analise_dimensoes.red_flags
      : analiseIa?.red_flags) || []

  const scoreGeral = candidato.video_score_geral || analiseIa?.score_geral || 0

  return (
    <div className="space-y-6">
      {/* CARD PRINCIPAL DO VÍDEO & ANÁLISE IA */}
      <Card className="border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240] shadow-xs">
        <CardContent className="p-5">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#2E3A6E]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FEF1EA] dark:bg-[#212B55] text-[#E9530E] flex items-center justify-center shrink-0 border border-[#FBDCC9] dark:border-[#2E3A6E]">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display text-base font-bold text-[#212B55] dark:text-[#F7F8FB]">
                    Vídeo de Apresentação & Avaliação IA
                  </h3>
                  {videoStatus === 'analise_concluida' && (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 text-[11px] font-bold">
                      ✓ Análise Concluída
                    </Badge>
                  )}
                  {videoStatus === 'enviado_aguardando' && (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-[11px] font-bold">
                      Aguardando Análise
                    </Badge>
                  )}
                  {videoStatus === 'analisando' && (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-700 text-[11px] font-bold animate-pulse">
                      Analisando com IA...
                    </Badge>
                  )}
                  {videoStatus === 'erro_processamento' && (
                    <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700 text-[11px] font-bold">
                      Erro no Processamento
                    </Badge>
                  )}
                  {videoStatus === 'sem_video' && (
                    <Badge variant="outline" className="text-[11px] font-medium text-slate-500">
                      Sem vídeo enviado
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Apresentação gravada pelo candidato e relatório dimensional estruturado via IA
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalVideoOpen(true)}
                className="text-xs font-semibold h-8 border-slate-200 dark:border-[#2E3A6E]"
              >
                <Upload className="w-3.5 h-3.5 mr-1 text-[#E9530E]" />
                {temVideo ? 'Substituir / Link' : 'Enviar Vídeo'}
              </Button>

              {temVideo && (
                <Button
                  size="sm"
                  onClick={handleDispararAnalise}
                  disabled={analisando}
                  className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-bold h-8 shadow-xs"
                >
                  {analisando ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Processando IA...
                    </>
                  ) : videoStatus === 'analise_concluida' ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                      Reanalisar Vídeo
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                      Iniciar Análise IA
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* ÁREA DE EXIBIÇÃO: PLAYER / LINK + RELATÓRIO */}
          {!temVideo ? (
            <div className="py-10 text-center border-2 border-dashed border-slate-200 dark:border-[#2E3A6E] rounded-xl my-4 bg-slate-50/50 dark:bg-[#141B34]/40">
              <Video className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
              <h4 className="font-display text-sm font-bold text-[#212B55] dark:text-[#F7F8FB]">
                Nenhum vídeo cadastrado para este candidato
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                O candidato pode enviar o vídeo pelo Portal Público (/candidato/:token) ou o time de
                RH pode anexar aqui um arquivo mp4 ou link (YouTube/Loom/Drive).
              </p>
              <Button
                size="sm"
                onClick={() => setModalVideoOpen(true)}
                className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Cadastrar Vídeo Agora
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
              {/* Coluna Esquerda: Player ou Box do Link */}
              <div className="lg:col-span-5 space-y-3">
                <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-[#2E3A6E] bg-black/95 relative aspect-video flex items-center justify-center group shadow-sm">
                  {urlArquivo ? (
                    <video
                      controls
                      src={urlArquivo}
                      className="w-full h-full object-contain"
                      preload="metadata"
                    />
                  ) : (
                    <div className="p-6 text-center text-white space-y-3">
                      <div className="w-12 h-12 rounded-full bg-white/10 mx-auto flex items-center justify-center text-[#E9530E] border border-white/20">
                        <Play className="w-6 h-6 ml-0.5 fill-current" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-200">
                          Vídeo hospedado externamente
                        </p>
                        <p className="text-[11px] text-slate-400 truncate max-w-xs mx-auto mt-0.5">
                          {candidato.video_link}
                        </p>
                      </div>
                      <a
                        href={candidato.video_link}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-[#E9530E] hover:bg-[#C5430A] px-3.5 py-1.5 rounded-md transition-colors"
                      >
                        Abrir Vídeo na Aba <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>

                <div className="p-3 bg-slate-50 dark:bg-[#141B34] rounded-lg border border-slate-200/80 dark:border-[#2E3A6E] text-xs flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300 font-medium">
                    Origem: {temArquivo ? 'Arquivo local carregado' : 'Link de streaming'}
                  </span>
                  {candidato.video_versao && (
                    <span className="font-mono text-[11px] text-slate-500 font-bold">
                      Versão {candidato.video_versao}
                    </span>
                  )}
                </div>
              </div>

              {/* Coluna Direita: Breakdown de Dimensões e Resumo */}
              <div className="lg:col-span-7 space-y-4">
                {erroAnalise && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-lg text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-bold block">Falha no processamento da análise</span>
                      <span>{erroAnalise}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDispararAnalise}
                      className="text-xs h-7 border-rose-300 dark:border-rose-700 bg-white dark:bg-rose-900"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                )}

                {videoStatus === 'analise_concluida' ? (
                  <div className="space-y-4">
                    {/* Score Geral & Recomendação */}
                    <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-[#FEF1EA] to-white dark:from-[#212B55] dark:to-[#1A2240] border border-[#FBDCC9] dark:border-[#2E3A6E]">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-[#E9530E] text-white flex flex-col items-center justify-center shrink-0 font-mono font-bold shadow-xs">
                          <span className="text-lg leading-none">{scoreGeral}</span>
                          <span className="text-[9px] uppercase tracking-tighter opacity-90">
                            / 100
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold tracking-wider text-[#E9530E]">
                            Índice Geral de Apresentação
                          </span>
                          <h4 className="font-display text-sm font-bold text-[#212B55] dark:text-[#F7F8FB]">
                            {analiseIa?.recomendacao_geral || 'Candidato Apto'}
                          </h4>
                        </div>
                      </div>

                      <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                        {candidato.video_analisado_em && (
                          <span>
                            Analisado em{' '}
                            {new Date(candidato.video_analisado_em).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Barras Dimensionais */}
                    <div className="space-y-2.5 p-3.5 bg-slate-50 dark:bg-[#141B34] rounded-xl border border-slate-200 dark:border-[#2E3A6E]">
                      <h5 className="font-display text-xs font-bold text-[#212B55] dark:text-[#F7F8FB] uppercase tracking-wider flex items-center gap-1.5">
                        <BarChart3 className="w-3.5 h-3.5 text-[#E9530E]" />
                        Dimensões Avaliadas pela IA
                      </h5>

                      <div className="space-y-2 pt-1">
                        <div>
                          <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            <span>Clareza de Comunicação & Dicção</span>
                            <span className="font-bold font-mono">
                              {dimensoes.clareza_comunicacao}%
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-emerald-500 transition-all duration-500 rounded-full"
                              style={{ width: `${dimensoes.clareza_comunicacao}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            <span>Estrutura da Narrativa & Síntese</span>
                            <span className="font-bold font-mono">
                              {dimensoes.estrutura_narrativa}%
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all duration-500 rounded-full"
                              style={{ width: `${dimensoes.estrutura_narrativa}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            <span>Energia, Firmeza & Postura</span>
                            <span className="font-bold font-mono">
                              {dimensoes.energia_postura}%
                            </span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 transition-all duration-500 rounded-full"
                              style={{ width: `${dimensoes.energia_postura}%` }}
                            />
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            <span>Aderência à Vaga & Domínio Técnico</span>
                            <span className="font-bold font-mono">{dimensoes.aderencia_vaga}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-amber-500 transition-all duration-500 rounded-full"
                              style={{ width: `${dimensoes.aderencia_vaga}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Resumo Executivo da Análise */}
                    {analiseIa?.resumo_executivo && (
                      <div className="p-3.5 bg-blue-50/50 dark:bg-[#141B34] border border-blue-200 dark:border-blue-900 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                          Resumo da IA em pt-BR
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {analiseIa.resumo_executivo}
                        </p>
                      </div>
                    )}

                    {/* Red Flags ou Alertas */}
                    {redFlags.length > 0 && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Pontos de Atenção & Red Flags Identificados
                        </span>
                        <ul className="text-xs text-rose-900 dark:text-rose-200 list-disc list-inside space-y-1">
                          {redFlags.map((rf, idx) => (
                            <li key={idx}>{rf}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center border border-dashed border-slate-200 dark:border-[#2E3A6E] rounded-xl bg-slate-50/40 dark:bg-[#141B34]/30 space-y-3">
                    <Sparkles className="w-8 h-8 text-[#E9530E] mx-auto opacity-70" />
                    <h5 className="font-display text-sm font-bold text-[#212B55] dark:text-[#F7F8FB]">
                      Vídeo pronto para análise inteligente
                    </h5>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                      Clique em "Iniciar Análise IA" acima para processar a comunicação, postura,
                      aderência e gerar o relatório para a diretoria.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SEÇÃO SECUNDÁRIA: PERCEPÇÕES HUMANAS DO RH / GESTOR */}
      <Card className="border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240] shadow-xs">
        <CardContent className="p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-[#2E3A6E]">
            <div className="flex items-center gap-2.5">
              <MessageSquare className="w-4 h-4 text-[#E9530E]" />
              <h4 className="font-display text-sm font-bold text-[#212B55] dark:text-[#F7F8FB]">
                Percepções Humanas de Entrevista (RH &amp; Liderança)
              </h4>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalPercepcaoOpen(true)}
              className="text-xs font-semibold h-8 border-slate-200 dark:border-[#2E3A6E]"
            >
              <Plus className="w-3.5 h-3.5 mr-1 text-[#E9530E]" />
              Adicionar Parecer
            </Button>
          </div>

          <div className="pt-4 space-y-3">
            {loadingPercepcoes ? (
              <p className="text-xs text-slate-400">Carregando pareceres...</p>
            ) : percepcoes.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                Nenhuma percepção registrada ainda. Os pareceres de RH e líderes de BU enriquecem o
                contexto da IA.
              </p>
            ) : (
              percepcoes.map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-[#2E3A6E] bg-slate-50/70 dark:bg-[#141B34] text-xs space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-bold">
                        {p.origem_tipo}
                      </Badge>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {p.expand?.autor?.name || 'Avaliador'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(p.created).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {p.observacoes}
                  </p>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* MODAL ENVIAR / ALTERAR VÍDEO */}
      <Dialog open={modalVideoOpen} onOpenChange={setModalVideoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-[#212B55] dark:text-[#F7F8FB]">
              Cadastrar ou Atualizar Vídeo de Apresentação
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarVideo} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Opção 1: Upload de Arquivo de Vídeo
                </Label>
                <span className="text-[11px] text-slate-500 font-mono">
                  Até 100 MB · MP4, WebM, MOV
                </span>
              </div>
              <Input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null
                  if (f) {
                    const formatos = [
                      'video/mp4',
                      'video/webm',
                      'video/quicktime',
                      'video/x-matroska',
                      'video/ogg',
                      'video/x-msvideo',
                    ]
                    const ext = '.' + (f.name.split('.').pop() || '').toLowerCase()
                    const extensoes = ['.mp4', '.webm', '.mov', '.mkv', '.ogg', '.avi']
                    if (f.type && !formatos.includes(f.type) && !extensoes.includes(ext)) {
                      toast({
                        title: 'Formato inválido',
                        description: 'Apenas arquivos de vídeo (.mp4, .webm, .mov) são permitidos.',
                        variant: 'destructive',
                      })
                      e.target.value = ''
                      setArquivoVideo(null)
                      return
                    }
                    if (f.size > 100 * 1024 * 1024) {
                      toast({
                        title: 'Arquivo muito grande',
                        description: `O arquivo tem ${(f.size / (1024 * 1024)).toFixed(1)}MB. O limite máximo permitido é de 100 MB.`,
                        variant: 'destructive',
                      })
                      e.target.value = ''
                      setArquivoVideo(null)
                      return
                    }
                  }
                  setArquivoVideo(f)
                }}
                className="text-xs"
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Formatos aceitos: <strong>MP4</strong>, <strong>WebM</strong> ou{' '}
                <strong>MOV (QuickTime)</strong> até <strong>100 MB</strong>.
              </p>
              {arquivoVideo && (
                <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-300 font-semibold">
                    <span className="truncate max-w-[240px]">✓ {arquivoVideo.name}</span>
                    <span className="font-mono text-[11px]">
                      {(arquivoVideo.size / (1024 * 1024)).toFixed(1)} MB
                    </span>
                  </div>
                  <video
                    src={URL.createObjectURL(arquivoVideo)}
                    controls
                    className="w-full rounded-md max-h-36 bg-black object-contain"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Opção 2: Ou Link de Streaming (YouTube, Loom, Google Drive, Vimeo)
              </Label>
              <Input
                type="url"
                placeholder="https://loom.com/share/... ou YouTube"
                value={novoLinkVideo}
                onChange={(e) => setNovoLinkVideo(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalVideoOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingVideo}
                className="bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold"
              >
                {submittingVideo ? 'Salvando...' : 'Salvar Vídeo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL ADICIONAR PERCEPÇÃO */}
      <Dialog open={modalPercepcaoOpen} onOpenChange={setModalPercepcaoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-base font-bold text-[#212B55] dark:text-[#F7F8FB]">
              Registrar Percepção de Entrevista
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSalvarPercepcao} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Origem da Percepção</Label>
              <select
                value={tipoOrigem}
                onChange={(e) => setTipoOrigem(e.target.value)}
                className="w-full text-xs h-9 rounded-md border border-slate-200 dark:border-[#2E3A6E] px-3 bg-white dark:bg-[#11162B]"
              >
                <option value="RH">Gente &amp; Gestão (RH)</option>
                <option value="Lider">Líder da BU / Gestor</option>
                <option value="Tecnico">Entrevistador Técnico</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observações Gerais *</Label>
              <Textarea
                required
                rows={3}
                placeholder="Descreva a impressão de comunicação, postura, maturidade e alinhamento..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalPercepcaoOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={submittingPercepcao}
                className="bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold"
              >
                {submittingPercepcao ? 'Salvando...' : 'Gravar Percepção'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default VideoEPercepcaoSection
