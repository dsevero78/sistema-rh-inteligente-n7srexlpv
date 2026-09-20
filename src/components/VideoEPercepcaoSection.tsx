import { useState, useEffect, useRef } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import type { RecordModel } from 'pocketbase'
import {
  Video,
  Sparkles,
  Lock,
  Eye,
  Plus,
  Trash2,
  Edit,
  Save,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Upload,
  ExternalLink,
  Loader2,
  User,
  ShieldAlert,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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

interface VideoEPercepcaoSectionProps {
  candidato: RecordModel
  onCandidatoUpdated: () => void
}

export function VideoEPercepcaoSection({
  candidato,
  onCandidatoUpdated,
}: VideoEPercepcaoSectionProps) {
  const { user, isGestorContratante } = useAuth()
  const { toast } = useToast()

  // Estados de Vídeo
  const [videoModalOpen, setVideoModalOpen] = useState(false)
  const [videoLinkInput, setVideoLinkInput] = useState(candidato.video_link || '')
  const [videoFileInput, setVideoFileInput] = useState<File | null>(null)
  const [savingVideo, setSavingVideo] = useState(false)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Estados de Percepções do RH
  const [percepcoes, setPercepcoes] = useState<RecordModel[]>([])
  const [loadingPercepcoes, setLoadingPercepcoes] = useState(true)
  const [percepcaoModalOpen, setPercepcaoModalOpen] = useState(false)
  const [editingPercepcao, setEditingPercepcao] = useState<RecordModel | null>(null)
  const [savingPercepcao, setSavingPercepcao] = useState(false)

  // Estados de Análise de Vídeo da IA
  const [analiseIa, setAnaliseIa] = useState<RecordModel | null>(null)
  const [loadingAnaliseIa, setLoadingAnaliseIa] = useState(true)
  const [gerandoAnaliseIa, setGerandoAnaliseIa] = useState(false)

  // Formulário estruturado de percepção
  const [visibilidade, setVisibilidade] = useState<
    'Privada (só o RH autor)' | 'Compartilhada com o gestor'
  >('Compartilhada com o gestor')
  const [statusDoc, setStatusDoc] = useState<'Rascunho' | 'Finalizada'>('Finalizada')
  const [comunicacao, setComunicacao] = useState('')
  const [postura, setPostura] = useState('')
  const [estruturaVideo, setEstruturaVideo] = useState('')
  const [conteudo, setConteudo] = useState('')
  const [aderencia, setAderencia] = useState('')
  const [pontosFortes, setPontosFortes] = useState('')
  const [pontosAtencao, setPontosAtencao] = useState('')
  const [notaGeral, setNotaGeral] = useState<number>(8.5)
  const [conclusao, setConclusao] = useState<'Avançar' | 'Em dúvida' | 'Reprovar'>('Avançar')
  const [obsConfidenciais, setObsConfidenciais] = useState('')

  const carregarPercepcoes = async () => {
    try {
      setLoadingPercepcoes(true)
      const list = await pb.collection('percepcoes_rh').getFullList({
        filter: `candidato = '${candidato.id}'`,
        sort: '-created',
      })
      setPercepcoes(list)
    } catch (err) {
      console.error('Erro ao buscar percepções:', err)
    } finally {
      setLoadingPercepcoes(false)
    }
  }

  const carregarAnaliseIa = async () => {
    try {
      setLoadingAnaliseIa(true)
      const list = await pb.collection('analises_video_ia').getFullList({
        filter: `candidato = '${candidato.id}'`,
        sort: '-created',
      })
      if (list && list.length > 0) {
        setAnaliseIa(list[0])
      } else {
        setAnaliseIa(null)
      }
    } catch (err) {
      console.error('Erro ao buscar análise da IA sobre vídeo:', err)
    } finally {
      setLoadingAnaliseIa(false)
    }
  }

  useEffect(() => {
    carregarPercepcoes()
    carregarAnaliseIa()
  }, [candidato.id])

  const handleGerarAnaliseIa = async () => {
    setGerandoAnaliseIa(true)
    try {
      const res = await pb.send('/backend/v1/analisar-video-ia', {
        method: 'POST',
        body: {
          candidatoId: candidato.id,
          vagaId: candidato.vaga || null,
        },
      })
      if (res && res.analise) {
        setAnaliseIa(res.analise)
        toast({
          title: 'Análise de vídeo gerada com sucesso!',
          description: 'A IA sintetizou as percepções compartilhadas e metadados do candidato.',
        })
      } else {
        await carregarAnaliseIa()
        toast({
          title: 'Análise processada!',
          description: 'Os dados foram atualizados.',
        })
      }
    } catch (err: unknown) {
      toast({
        title: 'Erro ao gerar análise da IA',
        description: err instanceof Error ? err.message : 'Falha na comunicação com o assistente.',
        variant: 'destructive',
      })
    } finally {
      setGerandoAnaliseIa(false)
    }
  }

  // Salvar Vídeo
  const handleSalvarVideo = async () => {
    setSavingVideo(true)
    try {
      const formData = new FormData()
      formData.append('video_link', videoLinkInput.trim())
      if (videoFileInput) {
        formData.append('video_apresentacao', videoFileInput)
      }
      await pb.collection('candidatos').update(candidato.id, formData)
      toast({
        title: 'Vídeo de apresentação atualizado!',
        description: 'O arquivo/link já está disponível para o player.',
      })
      setVideoModalOpen(false)
      onCandidatoUpdated()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar vídeo',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingVideo(false)
    }
  }

  // Abrir modal de criação/edição de percepção
  const handleOpenNovaPercepcao = () => {
    setEditingPercepcao(null)
    setVisibilidade('Compartilhada com o gestor')
    setStatusDoc('Finalizada')
    setComunicacao('')
    setPostura('')
    setEstruturaVideo('')
    setConteudo('')
    setAderencia('')
    setPontosFortes('')
    setPontosAtencao('')
    setNotaGeral(8.0)
    setConclusao('Avançar')
    setObsConfidenciais('')
    setPercepcaoModalOpen(true)
  }

  const handleOpenEditPercepcao = (p: RecordModel) => {
    setEditingPercepcao(p)
    setVisibilidade(p.visibilidade || 'Compartilhada com o gestor')
    setStatusDoc(p.status_documento || 'Finalizada')
    setComunicacao(p.comunicacao_clareza || '')
    setPostura(p.postura_apresentacao || '')
    setEstruturaVideo(p.estrutura_video || '')
    setConteudo(p.conteudo_experiencia || '')
    setAderencia(p.aderencia_cultural || '')
    setPontosFortes(p.pontos_fortes || '')
    setPontosAtencao(p.pontos_atencao || '')
    setNotaGeral(p.nota_geral || 8.0)
    setConclusao(p.conclusao || 'Avançar')
    setObsConfidenciais(p.observacoes_confidenciais || '')
    setPercepcaoModalOpen(true)
  }

  const handleSalvarPercepcao = async () => {
    if (!user) return
    setSavingPercepcao(true)
    try {
      const payload = {
        candidato: candidato.id,
        vaga: candidato.vaga || null,
        autor: user.id,
        autor_nome: user.name || user.email || 'Avaliador RH',
        visibilidade,
        status_documento: statusDoc,
        comunicacao_clareza: comunicacao,
        postura_apresentacao: postura,
        estrutura_video: estruturaVideo,
        conteudo_experiencia: conteudo,
        aderencia_cultural: aderencia,
        pontos_fortes: pontosFortes,
        pontos_atencao: pontosAtencao,
        nota_geral: Number(notaGeral),
        conclusao,
        observacoes_confidenciais: obsConfidenciais,
      }

      if (editingPercepcao) {
        await pb.collection('percepcoes_rh').update(editingPercepcao.id, payload)
        toast({ title: 'Percepção do RH atualizada!' })
      } else {
        await pb.collection('percepcoes_rh').create(payload)
        toast({
          title: 'Percepção registrada com sucesso!',
          description:
            visibilidade === 'Privada (só o RH autor)'
              ? 'Salva como Privada (apenas você pode visualizar).'
              : 'Compartilhada com o gestor responsável e integrada à IA.',
        })
      }

      setPercepcaoModalOpen(false)
      carregarPercepcoes()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar percepção',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingPercepcao(false)
    }
  }

  const handleDeletePercepcao = async (pId: string) => {
    if (!confirm('Deseja excluir esta avaliação de percepção?')) return
    try {
      await pb.collection('percepcoes_rh').delete(pId)
      toast({ title: 'Registro excluído' })
      carregarPercepcoes()
    } catch (err) {
      toast({ title: 'Erro ao excluir', variant: 'destructive' })
    }
  }

  // URL do arquivo de vídeo local
  const videoFileUrl = candidato.video_apresentacao
    ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/candidatos/${candidato.id}/${candidato.video_apresentacao}`
    : null

  // Helpers para vídeos externos (YouTube embed)
  const getEmbedUrl = (url: string) => {
    if (!url) return null
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0]
      return `https://www.youtube.com/embed/${id}`
    }
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0]
      return `https://www.youtube.com/embed/${id}`
    }
    return null
  }

  const embedUrl = candidato.video_link ? getEmbedUrl(candidato.video_link) : null

  return (
    <div className="space-y-6">
      {/* 1. SEÇÃO DE VÍDEO DE APRESENTAÇÃO */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                Módulo 3
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold ${
                  candidato.video_link || candidato.video_apresentacao
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-amber-50 text-amber-800 border-amber-300'
                }`}
              >
                {candidato.video_link || candidato.video_apresentacao
                  ? 'Vídeo Anexado'
                  : 'Pendente de Vídeo'}
              </Badge>
            </div>
            <CardTitle className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Video className="w-4 h-4 text-blue-600" />
              Vídeo de Apresentação do Candidato
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Vídeo solicitado na entrevista com RH para avaliação de postura, comunicação e clareza
            </CardDescription>
          </div>

          <Button
            size="sm"
            onClick={() => {
              setVideoLinkInput(candidato.video_link || '')
              setVideoFileInput(null)
              setVideoModalOpen(true)
            }}
            variant="outline"
            className="text-xs font-semibold border-slate-300 text-slate-700 h-9"
          >
            <Upload className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
            {candidato.video_link || candidato.video_apresentacao
              ? 'Substituir Vídeo'
              : 'Anexar Vídeo'}
          </Button>
        </CardHeader>

        <CardContent className="p-5">
          {embedUrl ? (
            <div className="rounded-xl overflow-hidden border border-slate-300 bg-black aspect-video max-w-2xl mx-auto shadow-sm">
              <iframe
                src={embedUrl}
                title="Vídeo de Apresentação"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : videoFileUrl ? (
            <div className="rounded-xl overflow-hidden border border-slate-300 bg-black aspect-video max-w-2xl mx-auto shadow-sm">
              <video controls src={videoFileUrl} className="w-full h-full object-contain">
                Seu navegador não suporta visualização de vídeos HTML5.
              </video>
            </div>
          ) : candidato.video_link ? (
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-3 max-w-lg mx-auto">
              <Video className="w-8 h-8 text-blue-600 mx-auto" />
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-800">Link Externo Disponível</p>
                <p className="text-[11px] text-slate-500">
                  O candidato disponibilizou o link externo (Loom / Drive / Vídeo):
                </p>
              </div>
              <a
                href={candidato.video_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors shadow-xs"
              >
                <span>Assistir Vídeo no Repositório</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ) : (
            <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl space-y-2 max-w-lg mx-auto">
              <Video className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-600 font-semibold">
                Nenhum vídeo anexado para este candidato.
              </p>
              <p className="text-[11px] text-slate-400">
                Você pode anexar um arquivo mp4/webm ou colar o link do Loom, YouTube ou Google
                Drive.
              </p>
              <Button
                size="sm"
                onClick={() => setVideoModalOpen(true)}
                className="bg-blue-600 text-white text-xs mt-2"
              >
                Anexar Agora
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 1.1 BLOCO DE ANÁLISE DA IA SOBRE O VÍDEO DE APRESENTAÇÃO */}
      <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
        <CardHeader className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-linear-to-r from-blue-50/40 via-white to-white">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 px-2 py-0.5 rounded border border-blue-200">
                IA Generativa
              </span>
              <span className="text-xs text-slate-400">· Avaliação de Apresentação & Postura</span>
            </div>
            <CardTitle className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              Análise da IA sobre o Vídeo de Apresentação
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Síntese automática da oratória, postura e aderência baseada em percepções
              compartilhadas do RH e metadados.
            </CardDescription>
          </div>

          <Button
            size="sm"
            onClick={handleGerarAnaliseIa}
            disabled={gerandoAnaliseIa}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 shadow-xs shrink-0"
          >
            {gerandoAnaliseIa ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                Analisando com IA...
              </>
            ) : analiseIa ? (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Regerar Análise
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Analisar Vídeo com IA
              </>
            )}
          </Button>
        </CardHeader>

        <CardContent className="p-5">
          {loadingAnaliseIa ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Carregando análise da IA...
            </div>
          ) : !analiseIa ? (
            <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl space-y-2 bg-slate-50/50">
              <Sparkles className="w-8 h-8 text-blue-300 mx-auto" />
              <p className="text-xs text-slate-700 font-semibold">
                Nenhuma análise de IA gerada ainda para este vídeo
              </p>
              <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                Clique no botão acima para acionar o motor de inteligência artificial. A IA
                sintetiza percepções compartilhadas do RH, competências do candidato e metadados da
                apresentação, mantendo sigilo de notas privadas.
              </p>
              <Button
                size="sm"
                onClick={handleGerarAnaliseIa}
                disabled={gerandoAnaliseIa}
                variant="outline"
                className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50 mt-2"
              >
                {gerandoAnaliseIa ? 'Processando...' : 'Gerar Primeira Análise'}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Top Banner: Veredito e Base Utilizada */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-center shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Nota Estimada
                    </span>
                    <span className="text-base font-extrabold text-blue-700">
                      {analiseIa.nota_estimada || 8.5}/10
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">Recomendação IA:</span>
                      <Badge
                        className={`text-xs font-bold ${
                          analiseIa.recomendacao_geral === 'Fortemente Recomendado'
                            ? 'bg-emerald-600 text-white'
                            : analiseIa.recomendacao_geral === 'Recomendado'
                              ? 'bg-blue-600 text-white'
                              : analiseIa.recomendacao_geral === 'Requer Alinhamento'
                                ? 'bg-amber-600 text-white'
                                : 'bg-rose-600 text-white'
                        }`}
                      >
                        {analiseIa.recomendacao_geral || 'Recomendado'}
                      </Badge>
                    </div>
                    {analiseIa.data_geracao && (
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Gerada em {new Date(analiseIa.data_geracao).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Base Utilizada */}
                <div className="text-left sm:text-right max-w-sm">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Base de Dados Utilizada
                  </span>
                  <p className="text-[11px] text-slate-600 font-medium">
                    {analiseIa.base_utilizada ||
                      `Baseado em ${analiseIa.qtd_percepcoes_consideradas || 0} percepção(ões) compartilhada(s) e no perfil.`}
                  </p>
                </div>
              </div>

              {/* Resumo Executivo da Apresentação */}
              {analiseIa.resumo_executivo && (
                <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100 text-xs text-slate-800 space-y-1">
                  <strong className="block font-bold text-blue-900 text-[11px] uppercase tracking-wide">
                    Síntese Executiva da Apresentação
                  </strong>
                  <p className="leading-relaxed">{analiseIa.resumo_executivo}</p>
                </div>
              )}

              {/* Grid de Dimensões Avaliadas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {analiseIa.comunicacao_oratoria && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block text-[11px] uppercase tracking-wide text-blue-700">
                      Comunicação & Oratória
                    </strong>
                    <p className="text-slate-600 leading-relaxed">
                      {analiseIa.comunicacao_oratoria}
                    </p>
                  </div>
                )}

                {analiseIa.postura_presenca && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block text-[11px] uppercase tracking-wide text-blue-700">
                      Postura & Presença
                    </strong>
                    <p className="text-slate-600 leading-relaxed">{analiseIa.postura_presenca}</p>
                  </div>
                )}

                {analiseIa.dominio_experiencia && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block text-[11px] uppercase tracking-wide text-blue-700">
                      Domínio das Experiências
                    </strong>
                    <p className="text-slate-600 leading-relaxed">
                      {analiseIa.dominio_experiencia}
                    </p>
                  </div>
                )}

                {analiseIa.fit_cultural && (
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                    <strong className="text-slate-900 block text-[11px] uppercase tracking-wide text-blue-700">
                      Fit Cultural Percebido
                    </strong>
                    <p className="text-slate-600 leading-relaxed">{analiseIa.fit_cultural}</p>
                  </div>
                )}
              </div>

              {/* Pontos Fortes e Riscos/Atenção */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {Array.isArray(analiseIa.pontos_fortes) && analiseIa.pontos_fortes.length > 0 && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-950 space-y-1">
                    <strong className="block text-[11px] font-bold uppercase tracking-wide text-emerald-800">
                      Destaques Positivos Identificados
                    </strong>
                    <ul className="space-y-1 list-disc list-inside">
                      {analiseIa.pontos_fortes.map((p: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(analiseIa.pontos_atencao) && analiseIa.pontos_atencao.length > 0 && (
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-950 space-y-1">
                    <strong className="block text-[11px] font-bold uppercase tracking-wide text-amber-800">
                      Pontos de Atenção para Entrevistas
                    </strong>
                    <ul className="space-y-1 list-disc list-inside">
                      {analiseIa.pontos_atencao.map((p: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. SEÇÃO DE PERCEPÇÃO DO RH (Privada ou Compartilhada) */}
      <Card className="border-slate-200 shadow-xs bg-white">
        <CardHeader className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-200">
                Avaliação Estruturada
              </span>
              <span className="text-xs text-slate-400">· Escrita do RH & Pontos Guiados</span>
            </div>
            <CardTitle className="text-base font-bold text-slate-900 mt-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Percepção do RH ({percepcoes.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Pontos guiados para organizar a percepção da entrevista e vídeo: oralidade, postura,
              conteúdo e fit cultural. Controle se o parecer é confidencial (privado) ou
              compartilhado com o gestor contratante.
            </CardDescription>
          </div>

          <Button
            size="sm"
            onClick={handleOpenNovaPercepcao}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Nova Análise de Percepção
          </Button>
        </CardHeader>

        <CardContent className="p-5 divide-y divide-slate-100">
          {loadingPercepcoes ? (
            <div className="p-8 text-center text-xs text-slate-400">Carregando percepções...</div>
          ) : percepcoes.length === 0 ? (
            <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-700 font-semibold">
                Nenhuma percepção registrada ainda
              </p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                Registre sua análise estruturada após a entrevista ou visualização do vídeo. Os
                pontos guiados ajudam a embasar a decisão da gestão.
              </p>
              <Button
                size="sm"
                onClick={handleOpenNovaPercepcao}
                variant="outline"
                className="text-xs text-blue-600 border-blue-200 hover:bg-blue-50 mt-2"
              >
                Escrever Percepção
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {percepcoes.map((p) => {
                const isPrivada = p.visibilidade === 'Privada (só o RH autor)'
                const isAutor = user?.id === p.autor

                return (
                  <div
                    key={p.id}
                    className={`p-5 rounded-xl border space-y-4 ${
                      isPrivada
                        ? 'border-amber-200 bg-amber-50/20'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    {/* Header do Registro de Percepção */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-xs">
                          Avaliador: {p.autor_nome || 'Time de RH'}
                        </span>
                        <span className="text-slate-400 text-[11px]">
                          em {new Date(p.created).toLocaleDateString('pt-BR')}
                        </span>

                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold flex items-center gap-1 ${
                            isPrivada
                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          }`}
                        >
                          {isPrivada ? <Lock className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {p.visibilidade}
                        </Badge>

                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            p.status_documento === 'Finalizada'
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {p.status_documento}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="bg-white border border-slate-200 px-2.5 py-1 rounded text-right">
                          <span className="text-[10px] font-bold text-slate-400 block uppercase">
                            Nota
                          </span>
                          <span className="text-xs font-extrabold text-blue-700">
                            {p.nota_geral || 8}/10
                          </span>
                        </div>

                        <Badge
                          className={`text-xs font-bold ${
                            p.conclusao === 'Avançar'
                              ? 'bg-emerald-600 text-white'
                              : p.conclusao === 'Em dúvida'
                                ? 'bg-amber-600 text-white'
                                : 'bg-rose-600 text-white'
                          }`}
                        >
                          {p.conclusao}
                        </Badge>

                        {isAutor && (
                          <div className="flex items-center ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditPercepcao(p)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-blue-600"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeletePercepcao(p.id)}
                              className="h-7 w-7 p-0 text-slate-500 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Blocos Guiados da Percepção */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      {p.comunicacao_clareza && (
                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                          <strong className="text-slate-900 block text-[11px] uppercase tracking-wide text-blue-700">
                            Comunicação & Clareza
                          </strong>
                          <p className="text-slate-600 leading-relaxed">{p.comunicacao_clareza}</p>
                        </div>
                      )}

                      {p.postura_apresentacao && (
                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                          <strong className="text-slate-900 block text-[11px] uppercase tracking-wide text-blue-700">
                            Postura & Apresentação
                          </strong>
                          <p className="text-slate-600 leading-relaxed">{p.postura_apresentacao}</p>
                        </div>
                      )}

                      {p.estrutura_video && (
                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                          <strong className="text-slate-900 block text-[11px] uppercase tracking-wide text-blue-700">
                            Estrutura do Vídeo
                          </strong>
                          <p className="text-slate-600 leading-relaxed">{p.estrutura_video}</p>
                        </div>
                      )}

                      {p.conteudo_experiencia && (
                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1">
                          <strong className="text-slate-900 block text-[11px] uppercase tracking-wide text-blue-700">
                            Conteúdo & Experiências
                          </strong>
                          <p className="text-slate-600 leading-relaxed">{p.conteudo_experiencia}</p>
                        </div>
                      )}

                      {p.aderencia_cultural && (
                        <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1 md:col-span-2">
                          <strong className="text-slate-900 block text-[11px] uppercase tracking-wide text-blue-700">
                            Aderência Cultural & Valores
                          </strong>
                          <p className="text-slate-600 leading-relaxed">{p.aderencia_cultural}</p>
                        </div>
                      )}
                    </div>

                    {/* Pontos Fortes e Pontos de Atenção */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {p.pontos_fortes && (
                        <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-950 space-y-1">
                          <strong className="block text-[11px] font-bold uppercase tracking-wide text-emerald-800">
                            Pontos Fortes Observados
                          </strong>
                          <p className="whitespace-pre-line leading-relaxed">{p.pontos_fortes}</p>
                        </div>
                      )}

                      {p.pontos_atencao && (
                        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-950 space-y-1">
                          <strong className="block text-[11px] font-bold uppercase tracking-wide text-amber-800">
                            Pontos de Atenção / Riscos
                          </strong>
                          <p className="whitespace-pre-line leading-relaxed">{p.pontos_atencao}</p>
                        </div>
                      )}
                    </div>

                    {/* Observações Confidenciais do RH */}
                    {p.observacoes_confidenciais && (
                      <div className="p-3 bg-slate-900 text-slate-100 rounded-lg border border-slate-800 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px]">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Observações Confidenciais do RH:</span>
                        </div>
                        <p className="italic leading-relaxed">{p.observacoes_confidenciais}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* MODAL 1: Anexar / Editar Vídeo */}
      <Dialog open={videoModalOpen} onOpenChange={setVideoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Anexar Vídeo de Apresentação
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Faça upload direto do arquivo de vídeo ou cole uma URL externa do Loom / YouTube /
              Drive.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Opção A: Upload de arquivo */}
            <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50">
              <Label className="font-bold text-slate-800 block">Opção A: Upload de Arquivo</Label>
              <input
                type="file"
                ref={videoInputRef}
                accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setVideoFileInput(e.target.files[0])
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => videoInputRef.current?.click()}
                className="text-xs border-slate-300 bg-white w-full justify-start"
              >
                <Upload className="w-3.5 h-3.5 mr-2 text-blue-600" />
                {videoFileInput
                  ? 'Substituir Arquivo Selecionado'
                  : 'Selecionar Arquivo (MP4 / WebM)'}
              </Button>
              {videoFileInput && (
                <p className="text-[11px] text-emerald-700 font-medium">
                  ✓ Selecionado: {videoFileInput.name} (
                  {Math.round(videoFileInput.size / 1024 / 1024)}MB)
                </p>
              )}
            </div>

            {/* Opção B: Link Externo */}
            <div className="space-y-1.5 p-3 rounded-lg border border-slate-200 bg-slate-50">
              <Label className="font-bold text-slate-800 block">Opção B: Link Externo</Label>
              <Input
                placeholder="https://www.youtube.com/watch?v=... ou Loom"
                value={videoLinkInput}
                onChange={(e) => setVideoLinkInput(e.target.value)}
                className="text-xs bg-white"
              />
              <p className="text-[10px] text-slate-400">
                Suporta links diretos do Loom, YouTube ou Google Drive compartilhados.
              </p>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setVideoModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={savingVideo}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              onClick={handleSalvarVideo}
            >
              {savingVideo ? 'Salvando Vídeo...' : 'Salvar Vídeo'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Escrever Percepção Estruturada do RH */}
      <Dialog open={percepcaoModalOpen} onOpenChange={setPercepcaoModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingPercepcao
                ? 'Editar Percepção do RH'
                : 'Registrar Percepção Estruturada do RH'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Formulário guiado para registrar a percepção da entrevista e do vídeo de apresentação
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Visibilidade e Status do Documento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">
                  Visibilidade / Privacidade *
                </Label>
                <Select
                  value={visibilidade}
                  onValueChange={(val) =>
                    setVisibilidade(val as 'Privada (só o RH autor)' | 'Compartilhada com o gestor')
                  }
                >
                  <SelectTrigger className="text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Compartilhada com o gestor" className="text-xs">
                      👁 Compartilhada com o gestor (e Agente IA)
                    </SelectItem>
                    <SelectItem value="Privada (só o RH autor)" className="text-xs">
                      🔒 Privada (só o RH autor vê)
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-500">
                  {visibilidade === 'Privada (só o RH autor)'
                    ? 'Apenas você terá acesso a esta anotação. Nem o gestor nem o agente de IA lerão.'
                    : 'Visível no portal do gestor desta vaga e considerada como evidência pelo agente de IA.'}
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-bold text-slate-700">Status da Anotação</Label>
                <Select
                  value={statusDoc}
                  onValueChange={(val) => setStatusDoc(val as 'Rascunho' | 'Finalizada')}
                >
                  <SelectTrigger className="text-xs bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Finalizada" className="text-xs">
                      Finalizada (Parecer concluído)
                    </SelectItem>
                    <SelectItem value="Rascunho" className="text-xs">
                      Rascunho (Em progresso)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pontos Guiados de Observação */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
                Pontos Guiados de Observação:
              </span>

              {/* 1. Comunicação e Clareza */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">
                  1. Comunicação e Clareza (oralidade, objetividade, raciocínio)
                </Label>
                <Textarea
                  rows={2}
                  placeholder="Ex: Excelente oratória, sintetizou ideias complexas com facilidade..."
                  value={comunicacao}
                  onChange={(e) => setComunicacao(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>

              {/* 2. Postura e Apresentação Pessoal */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">
                  2. Apresentação Pessoal e Postura (linguagem corporal, energia, presença)
                </Label>
                <Textarea
                  rows={2}
                  placeholder="Ex: Demonstrou energia positiva, olhar firme, postura profissional..."
                  value={postura}
                  onChange={(e) => setPostura(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>

              {/* 3. Estrutura do Vídeo */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">
                  3. Estrutura do Vídeo (cumpriu o pedido, tempo adequado, organização)
                </Label>
                <Textarea
                  rows={2}
                  placeholder="Ex: Respeitou o limite de 3 minutos, gravou em local calmo..."
                  value={estruturaVideo}
                  onChange={(e) => setEstruturaVideo(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>

              {/* 4. Conteúdo e Experiências */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">
                  4. Conteúdo e Vivência (clareza das entregas, profundidade técnica e motivação)
                </Label>
                <Textarea
                  rows={2}
                  placeholder="Ex: Detalhou com propriedade o case de escalabilidade..."
                  value={conteudo}
                  onChange={(e) => setConteudo(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>

              {/* 5. Aderência Cultural */}
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">
                  5. Aderência Cultural (valores da empresa, estilo de trabalho, autonomia)
                </Label>
                <Textarea
                  rows={2}
                  placeholder="Ex: Alinhado com cultura ágil, colaboração horizontal..."
                  value={aderencia}
                  onChange={(e) => setAderencia(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            {/* Pontos Fortes e Atenção */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">Pontos Fortes</Label>
                <Textarea
                  rows={3}
                  placeholder="Ex: • Liderança técnica sólida&#10;• Domínio arquitetural"
                  value={pontosFortes}
                  onChange={(e) => setPontosFortes(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">
                  Pontos de Atenção
                </Label>
                <Textarea
                  rows={3}
                  placeholder="Ex: • Alinhar modelo de plantões"
                  value={pontosAtencao}
                  onChange={(e) => setPontosAtencao(e.target.value)}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            {/* Nota Geral e Conclusão */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">
                  Nota Geral de Percepção (0 a 10)
                </Label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  value={notaGeral}
                  onChange={(e) => setNotaGeral(parseFloat(e.target.value) || 0)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-[11px] font-semibold text-slate-700">
                  Conclusão do RH *
                </Label>
                <Select
                  value={conclusao}
                  onValueChange={(val) => setConclusao(val as 'Avançar' | 'Em dúvida' | 'Reprovar')}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Avançar" className="text-xs font-semibold text-emerald-700">
                      Avançar para Próxima Etapa
                    </SelectItem>
                    <SelectItem value="Em dúvida" className="text-xs font-semibold text-amber-700">
                      Em dúvida (Validar com Gestor)
                    </SelectItem>
                    <SelectItem value="Reprovar" className="text-xs font-semibold text-rose-700">
                      Reprovar no Processo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Anotação Confidencial Exclusiva do RH */}
            <div className="space-y-1 pt-2 border-t border-slate-100">
              <Label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-amber-600" />
                <span>Observações Confidenciais do RH (Sigilo interno)</span>
              </Label>
              <Textarea
                rows={2}
                placeholder="Ex: Informações salariais sigilosas, contraproposta de concorrente..."
                value={obsConfidenciais}
                onChange={(e) => setObsConfidenciais(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setPercepcaoModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={savingPercepcao}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              onClick={handleSalvarPercepcao}
            >
              {savingPercepcao ? 'Salvando...' : 'Salvar Percepção'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
