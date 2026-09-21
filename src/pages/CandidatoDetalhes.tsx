import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  ExternalLink,
  Sparkles,
  GitPullRequest,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  BookOpen,
  Globe,
  Loader2,
  FileCheck2,
  DollarSign,
  Video,
  UserCheck,
} from 'lucide-react'
import { VideoEPercepcaoSection } from '@/components/VideoEPercepcaoSection'
import { LinhaDoTempoCandidato } from '@/components/LinhaDoTempoCandidato'
import { Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { ScoreProgressRing } from './Candidatos'
import { candidatosTimelineService } from '@/services/candidatosTimeline'
import type { RecordModel } from 'pocketbase'

export default function CandidatoDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [candidato, setCandidato] = useState<RecordModel | null>(null)
  const [pipelineItem, setPipelineItem] = useState<RecordModel | null>(null)
  const [matchingScore, setMatchingScore] = useState<any>(null)
  const [entrevistasCand, setEntrevistasCand] = useState<RecordModel[]>([])
  const [ofertasCand, setOfertasCand] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingScore, setLoadingScore] = useState(false)
  const [generatingReport, setGeneratingReport] = useState(false)

  // Move stage dialog
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [targetStage, setTargetStage] = useState('')
  const [moveNotes, setMoveNotes] = useState('')
  const [recusaMotivo, setRecusaMotivo] = useState('')
  const [guardarBancoNaRecusa, setGuardarBancoNaRecusa] = useState(true)
  const [motivoBancoInput, setMotivoBancoInput] = useState('')

  // Banco de Talentos manual modal
  const [bancoModalOpen, setBancoModalOpen] = useState(false)
  const [motivoBancoManual, setMotivoBancoManual] = useState('')
  const [tagBancoInput, setTagBancoInput] = useState('')
  const [tagsBanco, setTagsBanco] = useState<string[]>([])
  const [savingBanco, setSavingBanco] = useState(false)

  const fetchCandidato = async () => {
    if (!id) return
    try {
      const c = await pb.collection('candidatos').getOne(id, { expand: 'vaga' })
      setCandidato(c)

      // Fetch pipeline record
      const pList = await pb.collection('pipeline').getFullList({
        filter: `candidato = '${id}'`,
        sort: '-updated',
        limit: 1,
      })
      if (pList.length > 0) {
        setPipelineItem(pList[0])
      }

      // Fetch ofertas do candidato
      try {
        const ofList = await pb.collection('ofertas').getFullList({
          filter: `candidato = '${id}'`,
          sort: '-created',
          expand: 'vaga',
        })
        setOfertasCand(ofList)
      } catch (ofErr) {
        console.warn('Erro ao carregar ofertas do candidato:', ofErr)
      }

      // Fetch matching score from hook
      if (c.vaga) {
        fetchMatchingScore(c.id, c.vaga)
      }

      // Fetch entrevistas do candidato
      try {
        const eList = await pb.collection('entrevistas').getFullList({
          filter: `candidato = '${id}'`,
          sort: '-data_hora',
          expand: 'vaga',
        })
        setEntrevistasCand(eList)
      } catch (eErr) {
        console.warn('Erro ao carregar entrevistas do candidato:', eErr)
      }
    } catch (err) {
      console.error(err)
      toast({
        title: 'Candidato não encontrado',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchMatchingScore = async (cId: string, vId: string) => {
    setLoadingScore(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/matching/score?candidatoId=${cId}&vagaId=${vId}`,
        {
          headers: {
            Authorization: pb.authStore.token,
          },
        },
      )
      if (res.ok) {
        const data = await res.json()
        setMatchingScore(data.score)
      }
    } catch (err) {
      console.error('Falha ao obter score', err)
    } finally {
      setLoadingScore(false)
    }
  }

  useEffect(() => {
    fetchCandidato()
  }, [id])

  useRealtime('candidatos', () => fetchCandidato())
  useRealtime('pipeline', () => fetchCandidato())
  useRealtime('entrevistas', () => fetchCandidato())
  useRealtime('ofertas', () => fetchCandidato())

  const handleGenerateReport = async () => {
    if (!candidato || !candidato.vaga) {
      toast({
        title: 'Vaga obrigatória',
        description: 'Vincule o candidato a uma vaga para gerar a análise de matching.',
        variant: 'destructive',
      })
      return
    }

    setGeneratingReport(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/matching/avaliar`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: pb.authStore.token,
          },
          body: JSON.stringify({
            candidatoId: candidato.id,
            vagaId: candidato.vaga,
          }),
        },
      )

      if (!res.ok) {
        throw new Error('Falha ao processar avaliação com agente de IA')
      }

      const data = await res.json()
      toast({
        title: 'Relatório gerado pela IA com sucesso!',
        description: 'Redirecionando para o dossiê executivo.',
      })
      navigate(`/relatorios/${data.relatorioId}`)
    } catch (err: unknown) {
      toast({
        title: 'Erro na geração do relatório',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setGeneratingReport(false)
    }
  }

  const handleConfirmMoveStage = async () => {
    if (!pipelineItem || !targetStage) return
    try {
      const historicoAtual = Array.isArray(pipelineItem.historico) ? pipelineItem.historico : []
      const novoHistorico = [
        ...historicoAtual,
        {
          data: new Date().toISOString(),
          estagio: targetStage,
          autor: pb.authStore.record?.name || 'Gente & Gestão',
          nota:
            moveNotes ||
            (targetStage === 'Recusado' ? `Motivo: ${recusaMotivo}` : 'Mudança de estágio manual.'),
        },
      ]

      await pb.collection('pipeline').update(pipelineItem.id, {
        estagio: targetStage,
        motivo_recusa: targetStage === 'Recusado' ? recusaMotivo : '',
        anotacoes: moveNotes,
        historico: novoHistorico,
        adicionado_ao_banco: targetStage === 'Recusado' ? guardarBancoNaRecusa : false,
      })

      if (candidato) {
        const updateData: Record<string, any> = {
          status: targetStage,
        }
        if (targetStage === 'Recusado' && guardarBancoNaRecusa) {
          updateData.banco_talentos = true
          updateData.motivo_banco_talentos =
            motivoBancoInput || 'Guardado no Banco de Talentos para vagas futuras'
          updateData.estagio_saida = candidato.status || 'Recusado'
          updateData.data_adicao_banco = new Date().toISOString()
          if (candidato.vaga && !candidato.vaga_origem) {
            updateData.vaga_origem = candidato.vaga
          }
        }
        await pb.collection('candidatos').update(candidato.id, updateData)
      }

      // Registrar evento na linha do tempo com dados contextuais
      const autorLogado = pb.authStore.record?.name || 'Gente & Gestão'
      if (targetStage === 'Recusado') {
        await candidatosTimelineService.registrarEventoSeguro({
          candidato: candidato.id,
          categoria: 'STATUS',
          titulo: 'Candidato recusado no processo seletivo:',
          complemento: recusaMotivo
            ? `Motivo registrado: ${recusaMotivo}. Perfil arquivado.${guardarBancoNaRecusa ? ' Encaminhado para o Banco de Talentos.' : ''}`
            : 'Processo seletivo encerrado nesta posição.',
          autor: autorLogado,
          origem: 'usuario',
          referencia_tipo: 'pipeline',
          referencia_id: pipelineItem.id,
        })
      } else if (targetStage === 'Aprovado') {
        await candidatosTimelineService.registrarEventoSeguro({
          candidato: candidato.id,
          categoria: 'STATUS',
          titulo: 'Candidato aprovado e contratado:',
          complemento: `Aprovação final confirmada no processo seletivo para ${candidato.expand?.vaga?.titulo || 'a vaga'}. Trilha de admissão iniciada.`,
          autor: autorLogado,
          origem: 'usuario',
          referencia_tipo: 'pipeline',
          referencia_id: pipelineItem.id,
        })
      } else {
        await candidatosTimelineService.registrarEventoSeguro({
          candidato: candidato.id,
          categoria: 'STATUS',
          titulo: 'Movimentação no pipeline:',
          complemento: `Estágio alterado de "${pipelineItem.estagio || 'Início'}" para "${targetStage}"${moveNotes ? ` — Nota: ${moveNotes}` : ''}`,
          autor: autorLogado,
          origem: 'usuario',
          referencia_tipo: 'pipeline',
          referencia_id: pipelineItem.id,
        })
      }

      toast({
        title: 'Estágio atualizado',
        description: `Candidato movido para ${targetStage}.`,
      })
      setMoveDialogOpen(false)
      fetchCandidato()
    } catch (err) {
      toast({ title: 'Erro ao mover candidato', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!candidato) {
    return (
      <div className="text-center py-12">
        <h3 className="text-base font-bold text-slate-800">Candidato não encontrado</h3>
        <Button onClick={() => navigate('/candidatos')} className="mt-4">
          Voltar para listagem
        </Button>
      </div>
    )
  }

  const stagesList = [
    'Triagem',
    'Entrevista com RH',
    'Entrevista técnica',
    'Match técnico/comportamental (IA)',
    'Proposta',
    'Aprovado',
    'Recusado',
  ]

  const handleToggleBancoTalentos = async () => {
    if (!candidato) return
    const isBanco = !!candidato.banco_talentos

    if (!isBanco) {
      // Abrir modal para preencher motivo e tags
      setMotivoBancoManual(candidato.motivo_banco_talentos || '')
      setTagsBanco(
        Array.isArray(candidato.tags_talento) ? candidato.tags_talento : ['Alto Potencial'],
      )
      setBancoModalOpen(true)
    } else {
      // Confirmar desmarcação
      if (!confirm('Deseja remover este candidato do Banco de Talentos?')) return
      setSavingBanco(true)
      try {
        await pb.collection('candidatos').update(candidato.id, {
          banco_talentos: false,
        })
        toast({ title: 'Candidato removido do Banco de Talentos' })
        fetchCandidato()
      } catch (err) {
        toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
      } finally {
        setSavingBanco(false)
      }
    }
  }

  const handleSalvarBancoManual = async () => {
    if (!candidato) return
    setSavingBanco(true)
    try {
      await pb.collection('candidatos').update(candidato.id, {
        banco_talentos: true,
        motivo_banco_talentos: motivoBancoManual || 'Destacado pelo time de Gente & Gestão',
        tags_talento: tagsBanco,
        estagio_saida: candidato.status || 'Triagem',
        data_adicao_banco: new Date().toISOString(),
        vaga_origem: candidato.vaga || candidato.vaga_origem || null,
      })
      await candidatosTimelineService.registrarEventoSeguro({
        candidato: candidato.id,
        categoria: 'STATUS',
        titulo: 'Entrada no Banco de Talentos:',
        complemento: `Candidato destacado pelo time. Motivo: ${motivoBancoManual || 'Alto Potencial'}${tagsBanco.length > 0 ? ` (Tags: ${tagsBanco.join(', ')})` : ''}`,
        autor: pb.authStore.record?.name || 'Gente & Gestão',
        origem: 'usuario',
        referencia_tipo: 'banco_talentos',
        referencia_id: candidato.id,
      })

      toast({
        title: 'Adicionado ao Banco de Talentos!',
        description: 'Candidato destacado para reaproveitamento em vagas futuras.',
      })
      setBancoModalOpen(false)
      fetchCandidato()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao salvar no banco',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingBanco(false)
    }
  }

  const scoreVal = matchingScore?.score_geral || candidato.score_semantico || 75
  const curriculoUrl = candidato.curriculo
    ? `${import.meta.env.VITE_POCKETBASE_URL}/api/files/candidatos/${candidato.id}/${candidato.curriculo}`
    : null

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Alerta de Reprovação na Triagem Automática */}
      {candidato.reprovado_triagem_auto && (
        <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950 flex items-start gap-3 shadow-xs">
          <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0 font-bold text-sm">
            ✕
          </div>
          <div className="space-y-0.5 flex-1">
            <h4 className="font-extrabold text-rose-900 text-sm">
              Candidato Reprovado na Triagem Automática
            </h4>
            <p className="leading-relaxed font-medium">
              {candidato.motivo_reprovacao_triagem ||
                'O candidato não atingiu os critérios eliminatórios configurados no questionário da vaga.'}
            </p>
          </div>
        </div>
      )}
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/candidatos')}
          className="text-xs text-slate-600 hover:text-slate-900 -ml-2 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Voltar para Candidatos
        </Button>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white dark:bg-[#1A2240] p-6 rounded-xl border border-slate-200/80 dark:border-[#2E3A6E] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#E9530E] text-white font-display font-extrabold flex items-center justify-center text-xl shrink-0 shadow-sm shadow-[#E9530E]/20">
            {candidato.nome
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase()}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-display text-[11px] uppercase font-bold tracking-widest text-[#E9530E]">
                Dossiê do Profissional
              </span>
              <h1 className="font-display text-2xl sm:text-[26px] font-bold text-[#212B55] dark:text-[#F7F8FB] tracking-tight">
                {candidato.nome}
              </h1>
              <Badge
                variant="outline"
                className="font-display text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#141B34] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#2E3A6E]"
              >
                {candidato.status}
              </Badge>
            </div>

            <p className="text-xs text-slate-600">
              <span className="font-semibold text-slate-800">
                {candidato.cargo_atual || 'Profissional'}
              </span>
              {candidato.empresa_atual && <span> na {candidato.empresa_atual}</span>}
              {candidato.localizacao && <span> · {candidato.localizacao}</span>}
            </p>

            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
              <div className="flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-slate-400" />
                <span>{candidato.email}</span>
              </div>
              {candidato.telefone && (
                <div className="flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{candidato.telefone}</span>
                </div>
              )}
              {candidato.linkedin && (
                <a
                  href={candidato.linkedin}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline flex items-center gap-0.5"
                >
                  <span>LinkedIn</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {candidato.github && (
                <a
                  href={candidato.github}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-700 hover:underline flex items-center gap-0.5"
                >
                  <span>GitHub</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {candidato.canal_origem && (
                <span className="text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Canal: {candidato.canal_origem}
                </span>
              )}
              {candidato.consentimento_lgpd && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1 font-semibold">
                  LGPD Autorizado ✓
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Botão Banco de Talentos */}
          <Button
            variant="outline"
            onClick={handleToggleBancoTalentos}
            className={`text-xs font-semibold h-10 border transition-all ${
              candidato.banco_talentos
                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                : 'border-slate-300 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Sparkles
              className={`w-3.5 h-3.5 mr-1.5 ${
                candidato.banco_talentos ? 'text-amber-600 fill-amber-500' : 'text-slate-500'
              }`}
            />
            {candidato.banco_talentos ? 'No Banco de Talentos ★' : 'Adicionar ao Banco de Talentos'}
          </Button>

          {/* Mover no pipeline dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="text-xs font-semibold border-slate-300 text-slate-700 h-10"
              >
                <GitPullRequest className="w-3.5 h-3.5 mr-2" />
                Mover Estágio
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-xs">
              {stagesList.map((st) => (
                <DropdownMenuItem
                  key={st}
                  onClick={() => {
                    setTargetStage(st)
                    setMoveDialogOpen(true)
                  }}
                  className="cursor-pointer"
                >
                  {st === candidato.status && '✓ '}
                  {st}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Atalho para Onboarding se Aprovado */}
          {candidato.status === 'Aprovado' && (
            <Button
              onClick={() => navigate(`/onboarding?id=${candidato.id}`)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-10 shadow-xs flex items-center gap-1.5"
            >
              <UserCheck className="w-4 h-4" />
              Onboarding do Contratado →
            </Button>
          )}

          {/* Gerar relatório de IA */}
          <Button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-10 shadow-xs flex-1 md:flex-initial"
          >
            {generatingReport ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Gerando com Agente...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Gerar Relatório de IA
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabs Layout */}
      <Tabs defaultValue="visao-geral" className="space-y-6">
        <TabsList className="bg-white border border-slate-200/80 p-1 shadow-xs rounded-lg flex-wrap">
          <TabsTrigger value="visao-geral" className="text-xs font-semibold px-4 py-2">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="text-xs font-semibold px-4 py-2 flex items-center gap-1.5 text-emerald-700 data-[state=active]:text-emerald-800"
          >
            <Activity className="w-3.5 h-3.5 text-emerald-600" />
            Linha do tempo
          </TabsTrigger>
          <TabsTrigger
            value="video-percepcao"
            className="text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
          >
            <Video className="w-3.5 h-3.5 text-blue-600" />
            Vídeo & Percepção RH (Módulo 3)
          </TabsTrigger>
          <TabsTrigger value="curriculo" className="text-xs font-semibold px-4 py-2">
            Currículo (PDF)
          </TabsTrigger>
          <TabsTrigger
            value="entrevistas"
            className="text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            Entrevistas ({entrevistasCand.length})
          </TabsTrigger>
          <TabsTrigger
            value="propostas"
            className="text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            Propostas ({ofertasCand.length})
          </TabsTrigger>
          <TabsTrigger value="matching" className="text-xs font-semibold px-4 py-2">
            Matching Inteligente
          </TabsTrigger>
          <TabsTrigger value="historico" className="text-xs font-semibold px-4 py-2">
            Histórico & Notas
          </TabsTrigger>
        </TabsList>

        {/* Tab: Linha do Tempo do Candidato */}
        <TabsContent value="timeline" className="space-y-4">
          <LinhaDoTempoCandidato
            candidatoId={candidato.id}
            vagaTitulo={candidato.expand?.vaga?.titulo}
            dataCandidatura={candidato.created}
            onAtualizar={fetchCandidato}
          />
        </TabsContent>

        {/* Tab Módulo 3: Vídeo & Percepção RH */}
        <TabsContent value="video-percepcao">
          <VideoEPercepcaoSection candidato={candidato} onCandidatoUpdated={fetchCandidato} />
        </TabsContent>

        {/* Tab 1: Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Resumo Profissional */}
              <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240] p-6">
                <div className="font-display text-[11px] uppercase font-bold tracking-widest text-[#E9530E] mb-1">
                  Apresentação Executiva
                </div>
                <CardTitle className="font-display text-base sm:text-lg font-bold text-[#212B55] dark:text-[#F7F8FB] pb-3 border-b border-slate-100 dark:border-[#2E3A6E]">
                  Resumo Profissional
                </CardTitle>
                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line pt-4 font-sans">
                  {candidato.resumo || 'Nenhum resumo profissional cadastrado.'}
                </p>
              </Card>

              {/* Experiências Anteriores */}
              <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240] p-6">
                <div className="font-display text-[11px] uppercase font-bold tracking-widest text-[#E9530E] mb-1">
                  Histórico Profissional
                </div>
                <CardTitle className="font-display text-base sm:text-lg font-bold text-[#212B55] dark:text-[#F7F8FB] pb-3 border-b border-slate-100 dark:border-[#2E3A6E]">
                  Trajetória e Experiências
                </CardTitle>

                <div className="space-y-4 pt-4">
                  {Array.isArray(candidato.experiencias) && candidato.experiencias.length > 0 ? (
                    candidato.experiencias.map((exp: any, i: number) => (
                      <div
                        key={i}
                        className="space-y-1 pb-3 border-b border-slate-100 dark:border-[#2E3A6E] last:border-0 last:pb-0"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="font-display text-sm font-bold text-[#212B55] dark:text-[#F7F8FB]">
                            {exp.cargo}
                          </h4>
                          <span className="font-mono text-xs font-semibold text-slate-400 dark:text-slate-400 tabular-nums">
                            {exp.periodo}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-[#345EA9] dark:text-blue-300">
                          {exp.empresa}
                        </p>
                        {exp.descricao && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed pt-1 font-sans">
                            {exp.descricao}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">Nenhuma experiência cadastrada.</p>
                  )}
                </div>
              </Card>

              {/* Educação */}
              <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240] p-6">
                <div className="font-display text-[11px] uppercase font-bold tracking-widest text-[#E9530E] mb-1">
                  Qualificação Formal
                </div>
                <CardTitle className="font-display text-base sm:text-lg font-bold text-[#212B55] dark:text-[#F7F8FB] pb-3 border-b border-slate-100 dark:border-[#2E3A6E]">
                  Formação Acadêmica
                </CardTitle>
                <div className="space-y-3 pt-4">
                  {Array.isArray(candidato.educacao) && candidato.educacao.length > 0 ? (
                    candidato.educacao.map((edu: any, i: number) => (
                      <div key={i} className="flex items-start justify-between text-xs">
                        <div>
                          <p className="font-display font-bold text-sm text-[#212B55] dark:text-[#F7F8FB]">
                            {edu.curso}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300">{edu.instituicao}</p>
                        </div>
                        <span className="font-mono text-slate-400 dark:text-slate-400 font-semibold tabular-nums">
                          {edu.periodo}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">Sem formação cadastrada.</p>
                  )}
                </div>
              </Card>
            </div>

            {/* Coluna Lateral: Tags & Idiomas */}
            <div className="space-y-6">
              {/* Vaga Associada */}
              <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240] p-6">
                <CardTitle className="font-display text-[11px] font-bold text-[#6B7384] dark:text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-100 dark:border-[#2E3A6E]">
                  Vaga Alvo
                </CardTitle>
                <div className="pt-3 space-y-2">
                  <p className="font-display text-sm font-bold text-[#212B55] dark:text-[#F7F8FB]">
                    {candidato.expand?.vaga?.titulo || 'Sem vaga associada'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {candidato.expand?.vaga?.departamento || ''} ·{' '}
                    {candidato.expand?.vaga?.modalidade || ''}
                  </p>
                  {candidato.vaga && (
                    <Link to={`/vagas/${candidato.vaga}`}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full font-display text-xs font-bold mt-2 border-[#E9530E]/30 text-[#E9530E] hover:bg-[#FEF1EA] dark:hover:bg-[#212B55]"
                      >
                        Ver detalhes da vaga
                      </Button>
                    </Link>
                  )}
                </div>
              </Card>

              {/* Habilidades Técnicas */}
              <Card className="border-slate-200 shadow-xs bg-white p-6">
                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-100">
                  Habilidades Técnicas
                </CardTitle>
                <div className="pt-3 flex flex-wrap gap-1.5">
                  {Array.isArray(candidato.habilidades_tecnicas) &&
                  candidato.habilidades_tecnicas.length > 0 ? (
                    candidato.habilidades_tecnicas.map((h: string, i: number) => (
                      <span
                        key={i}
                        className="text-xs font-medium px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200"
                      >
                        {h}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">Nenhuma habilidade cadastrada.</p>
                  )}
                </div>
              </Card>

              {/* Competências Comportamentais */}
              <Card className="border-slate-200 shadow-xs bg-white p-6">
                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-100">
                  Competências Comportamentais
                </CardTitle>
                <div className="pt-3 flex flex-wrap gap-1.5">
                  {Array.isArray(candidato.competencias_comportamentais) &&
                  candidato.competencias_comportamentais.length > 0 ? (
                    candidato.competencias_comportamentais.map((c: string, i: number) => (
                      <span
                        key={i}
                        className="text-xs font-medium px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 border border-purple-200"
                      >
                        {c}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">Nenhuma competência cadastrada.</p>
                  )}
                </div>
              </Card>

              {/* Idiomas */}
              <Card className="border-slate-200 shadow-xs bg-white p-6">
                <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-wider pb-3 border-b border-slate-100">
                  Idiomas
                </CardTitle>
                <div className="pt-3 space-y-1.5">
                  {Array.isArray(candidato.idiomas) && candidato.idiomas.length > 0 ? (
                    candidato.idiomas.map((idm: string, i: number) => (
                      <p key={i} className="text-xs text-slate-700 font-medium">
                        • {idm}
                      </p>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">Não informado.</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Currículo PDF */}
        <TabsContent value="curriculo">
          <Card className="border-slate-200 shadow-xs bg-white p-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Visualizador de Currículo
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Documento em PDF anexado ao perfil do candidato
                </CardDescription>
              </div>

              {curriculoUrl && (
                <a href={curriculoUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" className="text-xs">
                    Abrir em nova aba
                    <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </a>
              )}
            </div>

            <div className="pt-6">
              {curriculoUrl ? (
                <div className="w-full h-[650px] rounded-lg overflow-hidden border border-slate-200">
                  <iframe src={curriculoUrl} className="w-full h-full" title="Currículo PDF" />
                </div>
              ) : (
                <div className="py-16 text-center border border-dashed border-slate-300 rounded-lg">
                  <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-semibold text-slate-800">
                    Nenhum PDF de currículo anexado
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                    Você pode editar os dados do candidato e fazer upload do documento para
                    visualização inline.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Tab Entrevistas */}
        <TabsContent value="entrevistas">
          <Card className="border-slate-200 shadow-xs bg-white p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Entrevistas & Avaliações Registradas
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Histórico de entrevistas agendadas, realizadas e avaliações pós-entrevista
                </CardDescription>
              </div>
              <Link to="/entrevistas">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  Abrir Calendário Geral
                </Button>
              </Link>
            </div>

            {entrevistasCand.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                Nenhuma entrevista agendada para este candidato.
              </div>
            ) : (
              <div className="space-y-3">
                {entrevistasCand.map((ent) => (
                  <div
                    key={ent.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            ent.status === 'Realizada'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : ent.status === 'Agendada'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                          }
                        >
                          {ent.status}
                        </Badge>
                        <span className="text-xs font-bold text-slate-800">
                          {new Date(ent.data_hora).toLocaleString('pt-BR')} ({ent.formato})
                        </span>
                      </div>
                      <span className="text-xs text-slate-500">
                        Responsável: <strong>{ent.responsavel}</strong>
                      </span>
                    </div>

                    {ent.observacoes && (
                      <p className="text-xs text-slate-600 bg-white p-2.5 rounded border border-slate-200/80">
                        <strong>Pauta:</strong> {ent.observacoes}
                      </p>
                    )}

                    {/* Exibir Avaliação pós-entrevista caso exista */}
                    {ent.avaliacao_realizada && (
                      <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-purple-900 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                            Avaliação Pós-Entrevista ({ent.avaliacao_avaliador || 'Entrevistador'})
                          </span>
                          <Badge className="bg-purple-600 text-white text-[10px] font-bold">
                            Score Ajustado: {ent.score_ajustado || 85}%
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div className="bg-white/90 p-2 rounded border border-purple-100">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              Nota Técnica
                            </p>
                            <p className="text-sm font-extrabold text-slate-800">
                              {ent.nota_tecnica || 8}/10
                            </p>
                            {ent.comentario_tecnico && (
                              <p className="text-[11px] text-slate-600 mt-0.5">
                                {ent.comentario_tecnico}
                              </p>
                            )}
                          </div>
                          <div className="bg-white/90 p-2 rounded border border-purple-100">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              Nota Comportamental
                            </p>
                            <p className="text-sm font-extrabold text-slate-800">
                              {ent.nota_comportamental || 8}/10
                            </p>
                            {ent.comentario_comportamental && (
                              <p className="text-[11px] text-slate-600 mt-0.5">
                                {ent.comentario_comportamental}
                              </p>
                            )}
                          </div>
                          <div className="bg-white/90 p-2 rounded border border-purple-100">
                            <p className="text-[10px] text-slate-400 font-bold uppercase">
                              Recomendação Final
                            </p>
                            <p className="text-sm font-extrabold text-purple-700">
                              {ent.recomendacao_final || 'Avançar'}
                            </p>
                            {ent.comentario_geral && (
                              <p className="text-[11px] text-slate-600 mt-0.5">
                                {ent.comentario_geral}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tab Propostas e Ofertas */}
        <TabsContent value="propostas">
          <Card className="border-slate-200 shadow-xs bg-white p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Propostas e Ofertas Salariais
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Histórico de ofertas emitidas para este candidato e status de negociação
                </CardDescription>
              </div>
              <Link to={`/ofertas?vaga=${candidato.vaga || ''}`}>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  <FileCheck2 className="w-3.5 h-3.5 mr-1.5" />
                  Gerenciar na Central de Ofertas
                </Button>
              </Link>
            </div>

            {ofertasCand.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-2">
                <FileCheck2 className="w-8 h-8 text-slate-300 mx-auto" />
                <p>Nenhuma oferta formal registrada para este candidato até o momento.</p>
                <Link to="/ofertas">
                  <Button variant="outline" size="sm" className="text-xs mt-2">
                    Emitir Nova Proposta
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {ofertasCand.map((of) => {
                  const statusBg =
                    of.status === 'Aceita'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : of.status === 'Recusada'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : of.status === 'Em negociação'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-blue-50 text-blue-800 border-blue-200'

                  return (
                    <div
                      key={of.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`font-semibold ${statusBg}`}>
                            {of.status}
                          </Badge>
                          <span className="font-extrabold text-slate-900 text-sm">
                            R$ {of.salario_ofertado?.toLocaleString('pt-BR')} / mês
                          </span>
                        </div>
                        <span className="text-slate-500">
                          Data Proposta:{' '}
                          <strong>
                            {of.data_proposta
                              ? new Date(of.data_proposta).toLocaleDateString('pt-BR')
                              : '-'}
                          </strong>{' '}
                          · Limite:{' '}
                          <strong>
                            {of.data_limite_resposta
                              ? new Date(of.data_limite_resposta).toLocaleDateString('pt-BR')
                              : '-'}
                          </strong>
                        </span>
                      </div>

                      {of.beneficios && (
                        <div className="bg-white p-3 rounded-lg border border-slate-200 text-slate-700">
                          <strong className="block text-slate-800 mb-0.5">Benefícios:</strong>
                          {of.beneficios}
                        </div>
                      )}

                      {of.motivo_recusa && (
                        <div className="bg-rose-50 p-3 rounded-lg border border-rose-200 text-rose-900">
                          <strong className="block mb-0.5">Motivo da Recusa:</strong>
                          {of.motivo_recusa}
                        </div>
                      )}

                      {of.contramedida && (
                        <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-amber-900">
                          <strong className="block mb-0.5">Contraproposta / Contramedida:</strong>
                          {of.contramedida}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Tab 3: Matching Inteligente */}
        <TabsContent value="matching">
          <Card className="border-slate-200 shadow-xs bg-white p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-base font-bold text-slate-900">
                    Aderência com a Vaga: {candidato.expand?.vaga?.titulo || 'Geral'}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-500 mt-0.5">
                  Avaliação computada pelo Gestor de Talentos com base em competências e dados reais
                </CardDescription>
              </div>

              <Button
                onClick={handleGenerateReport}
                disabled={generatingReport}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9"
              >
                {generatingReport ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Reavaliando...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-2" />
                    Gerar Relatório Estruturado
                  </>
                )}
              </Button>
            </div>

            {/* Score Ring & Pillars com indicação de Ajustado Pós-Entrevista */}
            <div className="space-y-3">
              {(matchingScore?.ajustado_pos_entrevista ||
                entrevistasCand.some((e) => e.avaliacao_realizada)) && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-purple-950">
                          Score Ajustado Pós-Entrevista
                        </span>
                        <Badge className="bg-purple-600 text-white text-[10px] font-bold py-0 px-1.5">
                          Calibrado
                        </Badge>
                      </div>
                      <p className="text-[11px] text-purple-700 mt-0.5">
                        A pontuação foi recalculada incorporando os feedbacks qualitativos e
                        quantitativos da avaliação do entrevistador.
                      </p>
                    </div>
                  </div>
                  {entrevistasCand.find((e) => e.avaliacao_realizada)?.nota_tecnica !==
                    undefined && (
                    <div className="hidden sm:flex items-center gap-3 text-xs bg-white/80 px-3 py-1.5 rounded-lg border border-purple-200">
                      <span>
                        Técnico:{' '}
                        <strong>
                          {entrevistasCand.find((e) => e.avaliacao_realizada)?.nota_tecnica}/10
                        </strong>
                      </span>
                      <span>
                        Comportamental:{' '}
                        <strong>
                          {entrevistasCand.find((e) => e.avaliacao_realizada)?.nota_comportamental}
                          /10
                        </strong>
                      </span>
                      <span>
                        Rec:{' '}
                        <strong className="text-purple-700">
                          {entrevistasCand.find((e) => e.avaliacao_realizada)?.recomendacao_final}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50/70 p-6 rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-4">
                  <ScoreProgressRing score={scoreVal} size={72} />
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Score Geral
                    </span>
                    <h3
                      className={`text-lg font-bold ${
                        scoreVal >= 75
                          ? 'text-emerald-600'
                          : scoreVal >= 50
                            ? 'text-amber-600'
                            : 'text-rose-600'
                      }`}
                    >
                      {scoreVal >= 75
                        ? 'Alta Aderência'
                        : scoreVal >= 50
                          ? 'Média Aderência'
                          : 'Baixa Aderência'}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {matchingScore?.veredito ||
                        (scoreVal >= 75 ? 'Recomendar avanço' : 'Considerar')}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 border-l-0 md:border-l border-slate-200 md:pl-6">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Aderência Técnica
                  </span>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">
                    {matchingScore?.score_tecnico || scoreVal}%
                  </p>
                  <p className="text-xs text-slate-500">
                    Correspondência com stacks e requisitos obrigatórios
                  </p>
                </div>

                <div className="space-y-1.5 border-l-0 md:border-l border-slate-200 md:pl-6">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Aderência Comportamental
                  </span>
                  <p className="text-2xl font-bold text-slate-900 tabular-nums">
                    {matchingScore?.score_comportamental ||
                      Math.min(100, Math.max(50, scoreVal - 5))}
                    %
                  </p>
                  <p className="text-xs text-slate-500">
                    Soft skills e sinergia com a cultura da organização
                  </p>
                </div>
              </div>
            </div>

            {/* Justificativa e Pontos Fortes / Lacunas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-200/60 space-y-2">
                <div className="flex items-center gap-2 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Pontos Fortes Identificados</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {(
                    matchingScore?.pontos_fortes || [
                      'Histórico comprovado nas tecnologias centrais exigidas',
                      'Tempo de carreira compatível com o nível da posição',
                      'Experiência consolidada em ambientes de alta demanda',
                    ]
                  ).map((p: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">•</span>
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-200/60 space-y-2">
                <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <span>Riscos e Pontos de Atenção</span>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-700">
                  {(
                    matchingScore?.riscos_lacunas || [
                      'Validar profundidade prática nas ferramentas desejáveis',
                      'Alinhar expectativa de modelo de trabalho e autonomia',
                    ]
                  ).map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">•</span>
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recomendação de Próximo Passo */}
            <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 text-xs text-slate-700 space-y-1">
              <span className="font-bold text-blue-900 uppercase tracking-wider text-[11px]">
                Recomendação de Próximo Passo do Agente:
              </span>
              <p className="text-slate-800 font-medium">
                {matchingScore?.recomendacao_proximo_passo ||
                  'Agendar entrevista técnica com foco em validação de arquitetura e cases de projetos anteriores.'}
              </p>
            </div>
          </Card>
        </TabsContent>

        {/* Tab 4: Histórico */}
        <TabsContent value="historico">
          <Card className="border-slate-200 shadow-xs bg-white p-6">
            <CardTitle className="text-base font-bold text-slate-900 pb-4 border-b border-slate-100">
              Linha do Tempo no Processo Seletivo
            </CardTitle>

            <div className="pt-6 relative pl-6 border-l-2 border-slate-200 space-y-6">
              {pipelineItem &&
              Array.isArray(pipelineItem.historico) &&
              pipelineItem.historico.length > 0 ? (
                pipelineItem.historico.map((h: any, i: number) => (
                  <div key={i} className="relative">
                    <span className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-blue-600 ring-4 ring-white" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{h.estagio}</span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(h.data).toLocaleString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">
                        Por: {h.autor || 'Sistema'}
                      </p>
                      {h.nota && (
                        <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-200/70 mt-1">
                          {h.nota}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400">Nenhum evento registrado no histórico.</p>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Adicionar / Editar Banco de Talentos Manualmente */}
      <Dialog open={bancoModalOpen} onOpenChange={setBancoModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 fill-amber-400" />
              Destacar no Banco de Talentos
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Guarde este perfil com anotações e tags para facilitar o reaproveitamento em vagas
              futuras pelo time e pelo Agente de IA.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Motivo / Justificativa do Destaque
              </Label>
              <Textarea
                rows={3}
                placeholder="Ex: Finalista com excelente domínio técnico em Go/Kafka. Recomendado para novas vagas de Backend ou Tech Lead..."
                value={motivoBancoManual}
                onChange={(e) => setMotivoBancoManual(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Tags de Talento</Label>
              <div className="flex gap-2">
                <input
                  placeholder="Ex: Go Sênior, Finalista, Liderança..."
                  value={tagBancoInput}
                  onChange={(e) => setTagBancoInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (tagBancoInput.trim()) {
                        setTagsBanco([...tagsBanco, tagBancoInput.trim()])
                        setTagBancoInput('')
                      }
                    }
                  }}
                  className="flex-1 h-9 rounded-md border border-slate-200 bg-white px-3 text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="text-xs"
                  onClick={() => {
                    if (tagBancoInput.trim()) {
                      setTagsBanco([...tagsBanco, tagBancoInput.trim()])
                      setTagBancoInput('')
                    }
                  }}
                >
                  Adicionar
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {tagsBanco.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-xs font-medium"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => setTagsBanco(tagsBanco.filter((_, idx) => idx !== i))}
                      className="text-amber-600 hover:text-amber-900"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setBancoModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={savingBanco}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              onClick={handleSalvarBancoManual}
            >
              {savingBanco ? 'Salvando...' : 'Salvar no Banco de Talentos'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              Mover para: {targetStage}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Atualize a fase do candidato no pipeline oficial da seleção.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            {targetStage === 'Recusado' && (
              <>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Motivo da Recusa *</Label>
                  <select
                    value={recusaMotivo}
                    onChange={(e) => setRecusaMotivo(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs"
                  >
                    <option value="">Selecione o motivo...</option>
                    <option value="Não atende requisitos técnicos">
                      Não atende requisitos técnicos
                    </option>
                    <option value="Salário / pretensão incompatível">
                      Salário / pretensão incompatível
                    </option>
                    <option value="Candidato desistiu">Candidato desistiu do processo</option>
                    <option value="Perfil comportamental não alinhado">
                      Perfil comportamental não alinhado
                    </option>
                    <option value="Outro motivo">Outro motivo</option>
                  </select>
                </div>

                <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-blue-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={guardarBancoNaRecusa}
                      onChange={(e) => setGuardarBancoNaRecusa(e.target.checked)}
                      className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span>Destacar e guardar no Banco de Talentos para vagas futuras</span>
                  </label>

                  {guardarBancoNaRecusa && (
                    <div className="pt-1">
                      <Input
                        placeholder="Justificativa (ex: Candidato com ótimo fit técnico)..."
                        value={motivoBancoInput}
                        onChange={(e) => setMotivoBancoInput(e.target.value)}
                        className="text-xs bg-white border-blue-200"
                      />
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Anotações da equipe (opcional)
              </Label>
              <Textarea
                rows={3}
                placeholder="Insira feedback, impressões da entrevista ou orientações..."
                value={moveNotes}
                onChange={(e) => setMoveNotes(e.target.value)}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setMoveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium"
              onClick={handleConfirmMoveStage}
            >
              Confirmar Movimentação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
