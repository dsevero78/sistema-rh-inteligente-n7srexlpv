import React, { useState, useEffect } from 'react'
import pb from '@/lib/pocketbase/client'
import {
  videoIaService,
  type AnaliseLinguisticaData,
  type PontosCegosData,
  type ExpressaoSocioemocionalData,
} from '@/services/videoIaService'
import {
  Video,
  Play,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Upload,
  Plus,
  Loader2,
  MessageSquare,
  ShieldAlert,
  BarChart3,
  UserX,
  UserCheck,
  BrainCircuit,
  Eye,
  HeartHandshake,
  Quote,
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
  DialogDescription,
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
  const [confirmandoConflito, setConfirmandoConflito] = useState(false)
  const [erroAnalise, setErroAnalise] = useState<string | null>(null)

  // Modais
  const [modalPercepcaoOpen, setModalPercepcaoOpen] = useState(false)
  const [modalVideoOpen, setModalVideoOpen] = useState(false)
  const [modalConflitoBloqueante, setModalConflitoBloqueante] = useState(false)
  const [dadosConflitoBloqueante, setDadosConflitoBloqueante] = useState<{
    nomeDetectado: string
    nomeCadastro: string
    detalhes: string
  } | null>(null)
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
      const [percsResult, analise] = await Promise.allSettled([
        pb.collection('percepcoes_rh').getFullList({
          filter: `candidato = "${candidato.id}"`,
          sort: '-created',
          expand: 'autor',
        }),
        videoIaService.obterAnaliseMaisRecente(candidato.id),
      ])
      if (percsResult.status === 'fulfilled') {
        setPercepcoes(percsResult.value)
      } else {
        console.error('Erro ao buscar percepções RH:', percsResult.reason)
      }
      if (analise.status === 'fulfilled') {
        setAnaliseIa(analise.value)
      } else {
        console.error('Erro ao buscar análise IA:', analise.reason)
      }
    } catch (err) {
      console.error('Erro geral ao buscar vídeo/percepções:', err)
    } finally {
      setLoadingPercepcoes(false)
      setLoadingAnalise(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [candidato.id])

  // Disparar análise de IA com suporte a conflito de identidade
  const handleDispararAnalise = async (permitirDivergencia = false) => {
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
      const resp = await videoIaService.dispararAnalise(candidato.id, permitirDivergencia)

      if (resp.status_analise === 'erro_acesso' || !resp.data) {
        // Falha no acesso ao vídeo (o candidato não é penalizado)
        const linkStr = String(candidato.video_link || '').toLowerCase()
        const isYtToast = linkStr.includes('youtu.be') || linkStr.includes('youtube.com')
        const isDriveToast = linkStr.includes('drive.google.com')

        const toastDescPadrao = isYtToast
          ? 'Não foi possível acessar o vídeo no YouTube pelo link fornecido. Verifique se o vídeo está configurado como público ou não listado e se a URL está correta (atenção a restrições de idade).'
          : isDriveToast
            ? 'Não foi possível acessar o vídeo pelo link fornecido. Verifique se o arquivo está compartilhado como "Qualquer pessoa com o link" (Visualizador) no Google Drive e tente novamente.'
            : 'Não foi possível acessar o vídeo pelo link ou arquivo fornecido. Verifique se o arquivo ou URL está público e acessível sem autenticação externa.'

        toast({
          title: 'Aviso: Falha no Acesso ao Vídeo',
          description: resp.error || toastDescPadrao,
          variant: 'destructive',
        })
      } else if (resp.conflito_bloqueante && !permitirDivergencia) {
        setDadosConflitoBloqueante({
          nomeDetectado: resp.nome_detectado_no_video || 'Não identificado',
          nomeCadastro: resp.nome_cadastro || candidato.nome || 'Candidato',
          detalhes:
            resp.detalhes_conflito_identidade ||
            'O nome que o candidato se apresenta no vídeo diverge do nome cadastrado neste perfil.',
        })
        setModalConflitoBloqueante(true)
        toast({
          title: 'Alerta de Conflito de Identidade!',
          description: `Nome no vídeo (${resp.nome_detectado_no_video || 'X'}) diverge do cadastro (${resp.nome_cadastro || candidato.nome}).`,
          variant: 'destructive',
        })
      } else {
        setModalConflitoBloqueante(false)
        const scoreDesc =
          resp.data.score_geral !== null ? `${resp.data.score_geral}/100` : 'Sem nota'
        toast({
          title: 'Análise de vídeo concluída!',
          description: `Score IA: ${scoreDesc} · ${resp.data.recomendacao_geral} · Autenticidade: ${resp.data.veredito_naturalidade || 'Avaliada'}`,
        })
      }

      await carregarDados()
      if (onUpdate) onUpdate()
      if (onCandidatoUpdated) onCandidatoUpdated()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na comunicação com o serviço de IA.'
      setErroAnalise(msg)

      const ehFalhaValidacaoSalvar =
        msg.includes('falha ao salvar') ||
        msg.includes('DATABASE_VALIDATION_ERROR') ||
        msg.includes('falha de validação')

      toast({
        title: ehFalhaValidacaoSalvar ? 'Falha ao Salvar Análise' : 'Erro ao analisar vídeo',
        description: ehFalhaValidacaoSalvar
          ? 'A análise foi gerada mas houve falha ao salvar — tente novamente'
          : msg,
        variant: 'destructive',
      })
    } finally {
      setAnalisando(false)
    }
  }

  // Confirmar conflito de identidade manualmente pelo RH
  const handleConfirmarDivergenciaManual = async () => {
    setConfirmandoConflito(true)
    try {
      await videoIaService.confirmarConflitoIdentidade(
        candidato.id,
        'Confirmado manualmente pelo RH após validação de áudio/vídeo',
      )
      toast({
        title: 'Vínculo confirmado pelo RH',
        description: 'A análise foi mantida e o alerta de conflito foi registrado como aceito.',
      })
      setModalConflitoBloqueante(false)
      await carregarDados()
      if (onUpdate) onUpdate()
      if (onCandidatoUpdated) onCandidatoUpdated()
    } catch (err) {
      toast({
        title: 'Erro ao confirmar',
        description: err instanceof Error ? err.message : 'Falha ao validar conflito.',
        variant: 'destructive',
      })
    } finally {
      setConfirmandoConflito(false)
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
      const errObj = err as {
        message?: string
        status?: number
        isAbort?: boolean
        data?: any
        response?: any
      }
      const rawMessage = (errObj?.message || '').toLowerCase()
      const isGatewayOrSizeError =
        (arquivoVideo && arquivoVideo.size > 25 * 1024 * 1024) ||
        rawMessage.includes('something went wrong') ||
        rawMessage.includes('failed to fetch') ||
        rawMessage.includes('networkerror') ||
        rawMessage.includes('payload too large') ||
        rawMessage.includes('entity too large') ||
        errObj?.status === 413 ||
        errObj?.status === 0 ||
        errObj?.status === 502 ||
        errObj?.status === 504

      let userFriendlyDescription =
        'Não foi possível concluir o envio do vídeo. Tente novamente ou use a Opção 2.'

      if (isGatewayOrSizeError) {
        userFriendlyDescription =
          'O arquivo é grande demais para envio direto (limite prático do gateway de ~30 MB). Use a Opção 2 (link YouTube/Loom/Drive) ou comprima o vídeo antes do envio.'
      } else if (
        err instanceof Error &&
        err.message &&
        !rawMessage.includes('something went wrong')
      ) {
        userFriendlyDescription = err.message
      }

      toast({
        title: 'Erro ao atualizar vídeo',
        description: userFriendlyDescription,
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

      await pb.collection('percepcoes_rh').create({
        candidato: candidato.id,
        vaga: candidato.vaga || undefined,
        autor: pb.authStore.record?.id,
        autor_nome: pb.authStore.record?.name || pb.authStore.record?.email || 'Avaliador RH',
        visibilidade: 'Compartilhada com o gestor',
        status_documento: 'Finalizada',
        comunicacao_clareza: observacoes,
        postura_apresentacao: destaquesPositivos,
        pontos_fortes: posArray.join('\n'),
        pontos_atencao: ateArray.join('\n'),
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

  // Identificação da plataforma do link de vídeo
  const linkAtual = String(candidato.video_link || '').trim()
  const ehYouTube =
    Boolean(linkAtual) &&
    (/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/))/i.test(linkAtual) ||
      String(analiseIa?.base_utilizada || '')
        .toLowerCase()
        .includes('youtube'))
  const ehDrive =
    Boolean(linkAtual) &&
    (/drive\.google\.com/i.test(linkAtual) ||
      String(analiseIa?.base_utilizada || '')
        .toLowerCase()
        .includes('google drive') ||
      String(analiseIa?.erro_detalhes || '')
        .toLowerCase()
        .includes('google drive'))

  // Identificação de falha de acesso ou análise com erro
  const resumoTexto = String(analiseIa?.resumo_executivo || '').toLowerCase()
  const statusAnalise = String(analiseIa?.status_analise || '').toLowerCase()
  const temTextoFalhaAcesso =
    resumoTexto.includes('não pôde ser acessado') ||
    resumoTexto.includes('nao pode ser acessado') ||
    resumoTexto.includes('não foi possível realizar a análise') ||
    resumoTexto.includes('nao foi possivel realizar a analise') ||
    resumoTexto.includes('impossibilidade de visualização') ||
    resumoTexto.includes('impossibilidade de visualizacao') ||
    resumoTexto.includes('falta de acesso ao vídeo') ||
    resumoTexto.includes('falta de acesso ao video')

  const ehAnaliseComFalha = Boolean(
    analiseIa &&
    (statusAnalise === 'erro' ||
      statusAnalise === 'erro_acesso' ||
      analiseIa.score_geral === 0 ||
      temTextoFalhaAcesso),
  )

  // Dados das novas camadas (com fallback seguro para não quebrar análises existentes como Rodrigo nota 6.8)
  const temConflitoIdentidade = Boolean(
    !ehAnaliseComFalha && analiseIa?.conflito_identidade && !analiseIa?.conflito_confirmado_rh,
  )
  const conflitoConfirmadoRh = Boolean(analiseIa?.conflito_confirmado_rh)
  const nomeDetectadoVideo = analiseIa?.nome_detectado_no_video || null

  const indiceNaturalidade =
    analiseIa?.indice_naturalidade !== undefined && analiseIa?.indice_naturalidade !== null
      ? Number(analiseIa.indice_naturalidade)
      : null

  const vereditoNaturalidade = analiseIa?.veredito_naturalidade || null

  const analiseLinguistica: AnaliseLinguisticaData | null =
    analiseIa?.analise_linguistica && typeof analiseIa.analise_linguistica === 'object'
      ? analiseIa.analise_linguistica
      : null

  const pontosCegos: PontosCegosData | null =
    analiseIa?.pontos_cegos && typeof analiseIa.pontos_cegos === 'object'
      ? analiseIa.pontos_cegos
      : null

  const expressaoSocioemocional: ExpressaoSocioemocionalData | null =
    analiseIa?.expressao_socioemocional && typeof analiseIa.expressao_socioemocional === 'object'
      ? analiseIa.expressao_socioemocional
      : null

  const analisePossuiNovasCamadas =
    indiceNaturalidade !== null ||
    vereditoNaturalidade !== null ||
    analiseLinguistica !== null ||
    pontosCegos !== null ||
    expressaoSocioemocional !== null

  return (
    <div className="space-y-6">
      {/* ALERTA DE CONFLITO DE IDENTIDADE (SE HOUVER DIVERGÊNCIA NÃO CONFIRMADA) */}
      {temConflitoIdentidade && (
        <div className="p-4 rounded-xl border-2 border-red-500 bg-red-50/90 dark:bg-red-950/70 text-red-900 dark:text-red-100 shadow-sm animate-pulse-subtle">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500 text-white shrink-0">
              <UserX className="w-5 h-5" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-red-600 text-white font-bold text-xs uppercase tracking-wide">
                  Alerta Crítico: Conflito de Identidade no Vídeo
                </Badge>
                <span className="text-xs font-mono font-bold text-red-700 dark:text-red-300">
                  Ação do RH necessária
                </span>
              </div>
              <p className="text-xs font-semibold leading-relaxed">
                O nome identificado no vídeo{' '}
                <strong className="underline decoration-red-600 font-black">
                  "{nomeDetectadoVideo || 'Não identificado / Outra pessoa'}"
                </strong>{' '}
                diverge do cadastro deste candidato{' '}
                <strong className="font-black">"{candidato.nome || 'Cadastro Atual'}"</strong>.
              </p>
              <p className="text-[11px] text-red-800 dark:text-red-300 leading-snug">
                {analiseIa?.detalhes_conflito_identidade ||
                  'Possível equívoco de anexo: verifique se o arquivo ou link pertence a outro profissional antes de compartilhar esta avaliação com a liderança.'}
              </p>
              <div className="pt-2 flex items-center gap-2 flex-wrap">
                <Button
                  size="sm"
                  onClick={handleConfirmarDivergenciaManual}
                  disabled={confirmandoConflito}
                  className="bg-red-700 hover:bg-red-800 text-white text-xs font-bold h-7 shadow-xs"
                >
                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                  {confirmandoConflito ? 'Confirmando...' : 'Confirmar que é o mesmo candidato'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setModalVideoOpen(true)}
                  className="text-xs h-7 border-red-300 text-red-800 dark:text-red-200 bg-white dark:bg-red-900"
                >
                  Substituir Vídeo Errado
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMAÇÃO DO RH REGISTRADA (QUANDO CONFLITO FOI ACEITO) */}
      {conflitoConfirmadoRh && (
        <div className="p-3 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Identidade Validada:</strong> O RH confirmou que o vídeo pertence a{' '}
              <strong>{candidato.nome}</strong>{' '}
              {nomeDetectadoVideo && `(áudio indicou "${nomeDetectadoVideo}")`}.
            </span>
          </div>
          <Badge className="bg-emerald-200 text-emerald-900 text-[10px] font-bold">
            Validado Manualmente
          </Badge>
        </div>
      )}

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
                    Vídeo de Apresentação &amp; Avaliação IA
                  </h3>
                  {ehAnaliseComFalha ? (
                    <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700 text-[11px] font-bold">
                      Falha no Acesso ao Vídeo
                    </Badge>
                  ) : analiseIa ? (
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 text-[11px] font-bold">
                      ✓ Análise Concluída
                    </Badge>
                  ) : videoStatus === 'analisando' || analisando ? (
                    <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300 dark:border-blue-700 text-[11px] font-bold animate-pulse">
                      Analisando com IA...
                    </Badge>
                  ) : videoStatus === 'erro_processamento' ? (
                    <Badge className="bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300 dark:border-rose-700 text-[11px] font-bold">
                      Erro no Processamento
                    </Badge>
                  ) : temVideo ? (
                    <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-[11px] font-bold">
                      Aguardando Análise
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[11px] font-medium text-slate-500">
                      Sem vídeo enviado
                    </Badge>
                  )}
                  {nomeDetectadoVideo && (
                    <Badge
                      variant="outline"
                      className="text-[11px] font-mono border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                    >
                      Vídeo: {nomeDetectadoVideo}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Apresentação gravada pelo candidato, verificação de identidade, autenticidade e
                  expressão sócio-emocional via IA
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
                  onClick={() => handleDispararAnalise(false)}
                  disabled={analisando}
                  className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-bold h-8 shadow-xs"
                >
                  {analisando ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      Processando IA...
                    </>
                  ) : analiseIa ? (
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
                      onClick={() => handleDispararAnalise(false)}
                      className="text-xs h-7 border-rose-300 dark:border-rose-700 bg-white dark:bg-rose-900"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                )}

                {ehAnaliseComFalha ? (
                  <div className="space-y-4">
                    {/* CARD ACIONÁVEL DE FALHA NO ACESSO AO VÍDEO */}
                    <div className="p-5 rounded-xl border-2 border-amber-300 dark:border-amber-700 bg-amber-50/90 dark:bg-amber-950/40 text-amber-950 dark:text-amber-100 shadow-xs space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2.5 rounded-xl bg-amber-500 text-white shrink-0">
                          <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            <Badge className="bg-amber-600 text-white font-bold text-xs">
                              Falha no Acesso ao Vídeo
                            </Badge>
                            <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                              O candidato não foi penalizado
                            </span>
                          </div>
                          <p className="text-xs font-semibold leading-relaxed pt-1">
                            {ehYouTube
                              ? 'Não foi possível acessar o vídeo no YouTube pelo link fornecido. Verifique se o vídeo está configurado como público ou não listado e se a URL está correta.'
                              : ehDrive
                                ? 'Não foi possível acessar o vídeo pelo link fornecido. Verifique se o arquivo está compartilhado como "Qualquer pessoa com o link" (Visualizador) no Google Drive e tente novamente.'
                                : 'Não foi possível acessar o vídeo pelo link ou arquivo fornecido. Verifique se o link ou arquivo de mídia está público e acessível externamente sem login.'}
                          </p>
                          {analiseIa.resumo_executivo && (
                            <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 italic pt-0.5">
                              Retorno do modelo: "{analiseIa.resumo_executivo}"
                            </p>
                          )}
                          {ehYouTube && (
                            <p className="text-[11px] text-amber-900/90 dark:text-amber-200/90 font-medium">
                              Dica para YouTube: certifique-se de que o vídeo não possui restrição
                              de idade (Classificação Indicativa 18+), pois isso bloqueia o acesso
                              externo automatizado à mídia e às legendas.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-amber-200 dark:border-amber-800 flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[11px] text-amber-800 dark:text-amber-300">
                          {ehYouTube
                            ? 'Dica: Vídeos do YouTube precisam estar públicos ou não listados, sem restrição de idade e com legendas/áudio habilitados.'
                            : ehDrive
                              ? 'Dica: Links do Google Drive precisam estar públicos como "Qualquer pessoa com o link" para visualização externa sem login.'
                              : 'Dica: Mídias externas precisam estar publicamente acessíveis na web sem tela de login ou permissão restrita.'}
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setModalVideoOpen(true)}
                            className="text-xs h-8 border-amber-300 dark:border-amber-700 bg-white dark:bg-amber-950 text-amber-900 dark:text-amber-100"
                          >
                            Editar Link
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleDispararAnalise(false)}
                            disabled={analisando}
                            className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-bold h-8 shadow-xs"
                          >
                            {analisando ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                                Reanalisando...
                              </>
                            ) : (
                              <>
                                <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
                                Tentar Novamente
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : analiseIa ? (
                  <div className="space-y-4">
                    {/* Score Geral & Veredito */}
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
                            Veredito / Recomendação Geral
                          </span>
                          <h4 className="font-display text-sm font-bold text-[#212B55] dark:text-[#F7F8FB]">
                            {analiseIa.recomendacao_geral || 'Candidato Apto'}
                          </h4>
                          {analiseIa.nota_estimada && (
                            <span className="text-[11px] text-slate-500">
                              Nota Estimada: {analiseIa.nota_estimada}/10
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right text-xs text-slate-500 dark:text-slate-400">
                        {(analiseIa.data_geracao || candidato.video_analisado_em) && (
                          <span>
                            Analisado em{' '}
                            {new Date(
                              analiseIa.data_geracao || candidato.video_analisado_em,
                            ).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Resumo Executivo */}
                    {analiseIa.resumo_executivo && (
                      <div className="p-3.5 bg-blue-50/50 dark:bg-[#141B34] border border-blue-200 dark:border-blue-900 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                          Resumo da IA em pt-BR
                        </span>
                        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                          {analiseIa.resumo_executivo}
                        </p>
                      </div>
                    )}

                    {/* CAMADA 2: BLOCO DE AUTENTICIDADE DA FALA (NATURAL vs FORÇADO/DECORADO) */}
                    <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <BrainCircuit className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          <h5 className="font-display text-xs font-bold text-[#212B55] dark:text-[#F7F8FB] uppercase tracking-wider">
                            Autenticidade &amp; Estrutura Linguística da Fala
                          </h5>
                        </div>
                        {vereditoNaturalidade ? (
                          <Badge
                            className={`text-xs font-bold ${
                              vereditoNaturalidade.toLowerCase().includes('natural')
                                ? 'bg-emerald-600 text-white'
                                : vereditoNaturalidade.toLowerCase().includes('ensaia')
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-rose-600 text-white'
                            }`}
                          >
                            {vereditoNaturalidade}
                            {indiceNaturalidade !== null && indiceNaturalidade !== undefined
                              ? ` (${indiceNaturalidade}/100)`
                              : ''}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-slate-400">
                            não avaliado nesta análise — rode novamente
                          </Badge>
                        )}
                      </div>

                      {indiceNaturalidade !== null && indiceNaturalidade !== undefined && (
                        <div>
                          <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                            <span>Índice de Naturalidade vs. Discurso Ensaiado / Memorizado</span>
                            <span className="font-bold font-mono">{indiceNaturalidade}%</span>
                          </div>
                          <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-500 rounded-full ${
                                indiceNaturalidade >= 75
                                  ? 'bg-emerald-500'
                                  : indiceNaturalidade >= 50
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                              }`}
                              style={{ width: `${indiceNaturalidade}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {analiseLinguistica &&
                      (analiseLinguistica.estrutura_fala ||
                        analiseLinguistica.uso_exemplos_vs_cliches ||
                        analiseLinguistica.justificativa) ? (
                        <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                          {analiseLinguistica.estrutura_fala && (
                            <div>
                              <strong className="text-slate-900 dark:text-slate-100 block text-[11px]">
                                Fluência e Cadência:
                              </strong>
                              <p className="text-slate-600 dark:text-slate-300">
                                {analiseLinguistica.estrutura_fala}
                              </p>
                            </div>
                          )}
                          {analiseLinguistica.uso_exemplos_vs_cliches && (
                            <div>
                              <strong className="text-slate-900 dark:text-slate-100 block text-[11px]">
                                Exemplos Concretos vs. Clichês de Entrevista:
                              </strong>
                              <p className="text-slate-600 dark:text-slate-300">
                                {analiseLinguistica.uso_exemplos_vs_cliches}
                              </p>
                            </div>
                          )}
                          {analiseLinguistica.justificativa && (
                            <p className="italic text-[11px] text-slate-500 dark:text-slate-400 pt-0.5">
                              {analiseLinguistica.justificativa}
                            </p>
                          )}
                          {Array.isArray(analiseLinguistica.trechos_evidencia) &&
                            analiseLinguistica.trechos_evidencia.length > 0 && (
                              <div className="p-2.5 rounded-lg bg-white dark:bg-[#11162B] border border-indigo-100 dark:border-indigo-900 space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400 flex items-center gap-1">
                                  <Quote className="w-3 h-3" />
                                  Trechos / Evidências da Fala
                                </span>
                                <ul className="text-[11px] list-disc list-inside space-y-0.5 text-slate-600 dark:text-slate-300">
                                  {analiseLinguistica.trechos_evidencia.map((tr, i) => (
                                    <li key={i}>{tr}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                          não avaliado nesta análise — rode novamente
                        </p>
                      )}
                    </div>

                    {/* CAMADA 3: PONTOS CEGOS & EXPRESSÃO SÓCIO-EMOCIONAL */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Bloco Pontos Cegos */}
                      <div className="p-3.5 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-amber-600" />
                            Pontos Cegos da Fala
                          </span>
                          {(!pontosCegos ||
                            (!pontosCegos.sintese_inconsciente &&
                              !pontosCegos.evasivas_ou_insegurancas &&
                              !pontosCegos.sinais_estresse_tensao)) && (
                            <Badge variant="outline" className="text-[9px] text-slate-400">
                              não avaliado nesta análise — rode novamente
                            </Badge>
                          )}
                        </div>
                        {pontosCegos &&
                        (pontosCegos.sintese_inconsciente ||
                          pontosCegos.evasivas_ou_insegurancas ||
                          pontosCegos.sinais_estresse_tensao) ? (
                          <div className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
                            {pontosCegos.sintese_inconsciente && (
                              <div>
                                <strong className="text-amber-950 dark:text-amber-100 block text-[11px]">
                                  O que transmite sem perceber:
                                </strong>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                  {pontosCegos.sintese_inconsciente}
                                </p>
                              </div>
                            )}
                            {pontosCegos.evasivas_ou_insegurancas && (
                              <div>
                                <strong className="text-amber-950 dark:text-amber-100 block text-[11px]">
                                  Evasivas ou Inseguranças:
                                </strong>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                  {pontosCegos.evasivas_ou_insegurancas}
                                </p>
                              </div>
                            )}
                            {pontosCegos.sinais_estresse_tensao && (
                              <div>
                                <strong className="text-amber-950 dark:text-amber-100 block text-[11px]">
                                  Sinais de Tensão Não-Verbal:
                                </strong>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                  {pontosCegos.sinais_estresse_tensao}
                                </p>
                              </div>
                            )}
                            {Array.isArray(pontosCegos.sugestoes_investigacao_entrevista) &&
                              pontosCegos.sugestoes_investigacao_entrevista.length > 0 && (
                                <div className="pt-1 border-t border-amber-200 dark:border-amber-900">
                                  <strong className="text-[10px] uppercase font-bold text-amber-800 dark:text-amber-300 block mb-0.5">
                                    Para investigar na entrevista:
                                  </strong>
                                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                                    {pontosCegos.sugestoes_investigacao_entrevista.map((s, idx) => (
                                      <li key={idx}>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            não avaliado nesta análise — rode novamente
                          </p>
                        )}
                      </div>

                      {/* Bloco Expressão Sócio-Emocional */}
                      <div className="p-3.5 rounded-xl border border-teal-200 dark:border-teal-900 bg-teal-50/40 dark:bg-teal-950/20 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900 dark:text-teal-200 flex items-center gap-1.5">
                            <HeartHandshake className="w-3.5 h-3.5 text-teal-600" />
                            Expressão Sócio-Emocional
                          </span>
                          {(!expressaoSocioemocional ||
                            (!expressaoSocioemocional.regulacao_emocional &&
                              !expressaoSocioemocional.maturidade_autocritica &&
                              !expressaoSocioemocional.congruencia_verbal_nao_verbal)) && (
                            <Badge variant="outline" className="text-[9px] text-slate-400">
                              não avaliado nesta análise — rode novamente
                            </Badge>
                          )}
                        </div>
                        {expressaoSocioemocional &&
                        (expressaoSocioemocional.regulacao_emocional ||
                          expressaoSocioemocional.maturidade_autocritica ||
                          expressaoSocioemocional.congruencia_verbal_nao_verbal ||
                          expressaoSocioemocional.empatia_conexao) ? (
                          <div className="text-xs space-y-2 text-slate-700 dark:text-slate-300">
                            {expressaoSocioemocional.regulacao_emocional && (
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-[11px]">
                                  Regulação Emocional:
                                </span>
                                <Badge className="bg-teal-600 text-white text-[10px]">
                                  {expressaoSocioemocional.regulacao_emocional}
                                </Badge>
                              </div>
                            )}
                            {expressaoSocioemocional.maturidade_autocritica && (
                              <div>
                                <strong className="text-teal-950 dark:text-teal-100 block text-[11px]">
                                  Maturidade &amp; Autocrítica:
                                </strong>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                  {expressaoSocioemocional.maturidade_autocritica}
                                </p>
                              </div>
                            )}
                            {expressaoSocioemocional.congruencia_verbal_nao_verbal && (
                              <div>
                                <strong className="text-teal-950 dark:text-teal-100 block text-[11px]">
                                  Congruência Verbal / Não-Verbal:
                                </strong>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                  {expressaoSocioemocional.congruencia_verbal_nao_verbal}
                                </p>
                              </div>
                            )}
                            {expressaoSocioemocional.empatia_conexao && (
                              <div>
                                <strong className="text-teal-950 dark:text-teal-100 block text-[11px]">
                                  Empatia &amp; Conexão:
                                </strong>
                                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                                  {expressaoSocioemocional.empatia_conexao}
                                </p>
                              </div>
                            )}
                            {Array.isArray(expressaoSocioemocional.evidencias_observadas) &&
                              expressaoSocioemocional.evidencias_observadas.length > 0 && (
                                <div className="pt-1 border-t border-teal-200 dark:border-teal-900">
                                  <strong className="text-[10px] uppercase font-bold text-teal-800 dark:text-teal-300 block mb-0.5">
                                    Evidências Observadas:
                                  </strong>
                                  <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                                    {expressaoSocioemocional.evidencias_observadas.map(
                                      (ev, idx) => (
                                        <li key={idx}>{ev}</li>
                                      ),
                                    )}
                                  </ul>
                                </div>
                              )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            não avaliado nesta análise — rode novamente
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Avaliações Qualitativas Estruturadas (Comunicação, Postura, Domínio, Fit Cultural) */}
                    {(analiseIa.comunicacao_oratoria ||
                      analiseIa.postura_presenca ||
                      analiseIa.dominio_experiencia ||
                      analiseIa.fit_cultural) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {analiseIa.comunicacao_oratoria && (
                          <div className="p-3 rounded-lg border border-slate-200 dark:border-[#2E3A6E] bg-slate-50/80 dark:bg-[#141B34]/60 text-xs space-y-1">
                            <span className="font-bold text-[#212B55] dark:text-[#F7F8FB] block">
                              Comunicação &amp; Oratória
                            </span>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                              {analiseIa.comunicacao_oratoria}
                            </p>
                          </div>
                        )}
                        {analiseIa.postura_presenca && (
                          <div className="p-3 rounded-lg border border-slate-200 dark:border-[#2E3A6E] bg-slate-50/80 dark:bg-[#141B34]/60 text-xs space-y-1">
                            <span className="font-bold text-[#212B55] dark:text-[#F7F8FB] block">
                              Postura &amp; Presença
                            </span>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                              {analiseIa.postura_presenca}
                            </p>
                          </div>
                        )}
                        {analiseIa.dominio_experiencia && (
                          <div className="p-3 rounded-lg border border-slate-200 dark:border-[#2E3A6E] bg-slate-50/80 dark:bg-[#141B34]/60 text-xs space-y-1">
                            <span className="font-bold text-[#212B55] dark:text-[#F7F8FB] block">
                              Domínio de Experiência
                            </span>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                              {analiseIa.dominio_experiencia}
                            </p>
                          </div>
                        )}
                        {analiseIa.fit_cultural && (
                          <div className="p-3 rounded-lg border border-slate-200 dark:border-[#2E3A6E] bg-slate-50/80 dark:bg-[#141B34]/60 text-xs space-y-1">
                            <span className="font-bold text-[#212B55] dark:text-[#F7F8FB] block">
                              Fit Cultural &amp; Valores
                            </span>
                            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                              {analiseIa.fit_cultural}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Barras Dimensionais (se houver notas numéricas) */}
                    {(dimensoes.clareza_comunicacao > 0 ||
                      dimensoes.estrutura_narrativa > 0 ||
                      dimensoes.energia_postura > 0 ||
                      dimensoes.aderencia_vaga > 0) && (
                      <div className="space-y-2.5 p-3.5 bg-slate-50 dark:bg-[#141B34] rounded-xl border border-slate-200 dark:border-[#2E3A6E]">
                        <h5 className="font-display text-xs font-bold text-[#212B55] dark:text-[#F7F8FB] uppercase tracking-wider flex items-center gap-1.5">
                          <BarChart3 className="w-3.5 h-3.5 text-[#E9530E]" />
                          Dimensões Avaliadas pela IA
                        </h5>

                        <div className="space-y-2 pt-1">
                          {dimensoes.clareza_comunicacao > 0 && (
                            <div>
                              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                <span>Clareza de Comunicação &amp; Dicção</span>
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
                          )}

                          {dimensoes.estrutura_narrativa > 0 && (
                            <div>
                              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                <span>Estrutura da Narrativa &amp; Síntese</span>
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
                          )}

                          {dimensoes.energia_postura > 0 && (
                            <div>
                              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                <span>Energia, Firmeza &amp; Postura</span>
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
                          )}

                          {dimensoes.aderencia_vaga > 0 && (
                            <div>
                              <div className="flex justify-between text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                                <span>Aderência à Vaga &amp; Domínio Técnico</span>
                                <span className="font-bold font-mono">
                                  {dimensoes.aderencia_vaga}%
                                </span>
                              </div>
                              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-amber-500 transition-all duration-500 rounded-full"
                                  style={{ width: `${dimensoes.aderencia_vaga}%` }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Pontos Fortes e Pontos de Atenção */}
                    {((Array.isArray(analiseIa.pontos_fortes) &&
                      analiseIa.pontos_fortes.length > 0) ||
                      (Array.isArray(analiseIa.pontos_atencao) &&
                        analiseIa.pontos_atencao.length > 0)) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Array.isArray(analiseIa.pontos_fortes) &&
                          analiseIa.pontos_fortes.length > 0 && (
                            <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Pontos Fortes Identificados
                              </span>
                              <ul className="text-xs text-emerald-950 dark:text-emerald-200 list-disc list-inside space-y-1">
                                {analiseIa.pontos_fortes.map((pf: string, idx: number) => (
                                  <li key={idx}>{pf}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        {Array.isArray(analiseIa.pontos_atencao) &&
                          analiseIa.pontos_atencao.length > 0 && (
                            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                Pontos de Atenção
                              </span>
                              <ul className="text-xs text-amber-950 dark:text-amber-200 list-disc list-inside space-y-1">
                                {analiseIa.pontos_atencao.map((pa: string, idx: number) => (
                                  <li key={idx}>{pa}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                      </div>
                    )}

                    {/* Red Flags ou Alertas */}
                    {redFlags.length > 0 && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-400 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          Red Flags Críticos
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
                      Clique em "Iniciar Análise IA" acima para processar a verificação de
                      identidade, autenticidade da fala, pontos cegos e perfil sócio-emocional.
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

      {/* MODAL DE CONFLITO DE IDENTIDADE BLOQUEANTE (EXIBE ANTES DE SEGUIR COM AVALIAÇÃO) */}
      <Dialog open={modalConflitoBloqueante} onOpenChange={setModalConflitoBloqueante}>
        <DialogContent className="max-w-md border-red-300 dark:border-red-900">
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <UserX className="w-5 h-5" />
              <DialogTitle className="font-display text-base font-bold">
                Atenção: Conflito de Identidade Detectado
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs text-slate-600 dark:text-slate-300 pt-1">
              A IA analisou a introdução do vídeo e detectou divergência de nome com o cadastro do
              candidato.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-lg bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-xs space-y-2">
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-red-200 dark:border-red-800/80">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                  Nome no Cadastro:
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {dadosConflitoBloqueante?.nomeCadastro}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400 block">
                  Identificado no Vídeo:
                </span>
                <span className="font-bold text-red-800 dark:text-red-200">
                  {dadosConflitoBloqueante?.nomeDetectado}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-red-900 dark:text-red-200 leading-relaxed">
              {dadosConflitoBloqueante?.detalhes}
            </p>
            <div className="p-2 rounded bg-white dark:bg-black/30 border border-red-100 text-[11px] text-slate-600 dark:text-slate-300">
              <strong>Objetivo da Proteção:</strong> Evitar vincular o vídeo de um candidato a outro
              perfil de cadastro sem a devida confirmação pelo time de RH.
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 flex-col sm:flex-row">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setModalConflitoBloqueante(false)
                setModalVideoOpen(true)
              }}
              className="text-xs"
            >
              Corrigir Vídeo Anexado
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={confirmandoConflito}
              onClick={() => handleDispararAnalise(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
            >
              {confirmandoConflito ? 'Confirmando...' : 'Confirmar & Manter Vínculo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

              {/* Orientação preventiva visível para arquivos > 30 MB */}
              {arquivoVideo && arquivoVideo.size > 30 * 1024 * 1024 && (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      Atenção: Arquivo acima de 30 MB (
                      {(arquivoVideo.size / (1024 * 1024)).toFixed(1)} MB)
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                    O gateway de nuvem possui limite prático de ~30 MB para upload direto.
                    Recomendamos{' '}
                    <strong>
                      usar a Opção 2 abaixo com link de streaming (YouTube, Loom, Google Drive)
                    </strong>{' '}
                    ou comprimir o arquivo antes de salvar para evitar falha no envio.
                  </p>
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
