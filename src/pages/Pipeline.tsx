import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Search,
  Filter,
  Sparkles,
  ChevronRight,
  User,
  ArrowRight,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  FileText,
  SlidersHorizontal,
  DollarSign,
  FileCheck2,
  Clock,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { candidatosTimelineService } from '@/services/candidatosTimeline'
import type { RecordModel } from 'pocketbase'

const COLUNAS = [
  { id: 'Triagem', label: 'Triagem', color: 'border-slate-300', dot: 'bg-slate-400' },
  { id: 'Entrevista com RH', label: 'Entrevista RH', color: 'border-blue-400', dot: 'bg-blue-500' },
  {
    id: 'Entrevista técnica',
    label: 'Entrevista Técnica',
    color: 'border-amber-400',
    dot: 'bg-amber-500',
  },
  {
    id: 'Match técnico/comportamental (IA)',
    label: 'Match IA',
    color: 'border-purple-400',
    dot: 'bg-purple-600',
  },
  { id: 'Proposta', label: 'Proposta', color: 'border-sky-400', dot: 'bg-sky-500' },
  { id: 'Aprovado', label: 'Aprovado', color: 'border-emerald-400', dot: 'bg-emerald-500' },
  { id: 'Recusado', label: 'Recusado', color: 'border-rose-400', dot: 'bg-rose-500' },
]

export default function Pipeline() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const vagaParam = searchParams.get('vaga') || 'all'
  const { toast } = useToast()

  const [pipelineItems, setPipelineItems] = useState<RecordModel[]>([])
  const [vagas, setVagas] = useState<RecordModel[]>([])
  const [ofertas, setOfertas] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [selectedVaga, setSelectedVaga] = useState<string>(vagaParam)
  const [origemFilter, setOrigemFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  // Drag and drop state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null)
  const [dragOverCol, setDragOverCol] = useState<string | null>(null)

  // Modal recusa
  const [recusaModalOpen, setRecusaModalOpen] = useState(false)
  const [recusaTargetItem, setRecusaTargetItem] = useState<RecordModel | null>(null)
  const [motivoRecusa, setMotivoRecusa] = useState('')
  const [anotacaoRecusa, setAnotacaoRecusa] = useState('')
  const [adicionarAoBanco, setAdicionarAoBanco] = useState(true)
  const [motivoBanco, setMotivoBanco] = useState('')

  const fetchPipeline = async () => {
    try {
      const [pList, vList, ofList] = await Promise.all([
        pb.collection('pipeline').getFullList({
          sort: '-updated',
          expand: 'candidato,vaga',
        }),
        pb.collection('vagas').getFullList({ sort: '-created' }),
        pb
          .collection('ofertas')
          .getFullList({ sort: '-created' })
          .catch(() => []),
      ])
      setPipelineItems(pList)
      setVagas(vList)
      setOfertas(ofList)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPipeline()
  }, [])

  // Sync with searchParams
  useEffect(() => {
    if (vagaParam !== selectedVaga) {
      setSelectedVaga(vagaParam)
    }
  }, [vagaParam])

  useRealtime('pipeline', () => fetchPipeline())
  useRealtime('candidatos', () => fetchPipeline())
  useRealtime('ofertas', () => fetchPipeline())

  const handleVagaFilterChange = (v: string) => {
    setSelectedVaga(v)
    if (v === 'all') {
      searchParams.delete('vaga')
      setSearchParams(searchParams)
    } else {
      setSearchParams({ vaga: v })
    }
  }

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    setDraggedItemId(id)
  }

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault()
    setDragOverCol(colId)
  }

  const handleDragLeave = () => {
    setDragOverCol(null)
  }

  const handleDrop = async (e: React.DragEvent, targetCol: string) => {
    e.preventDefault()
    setDragOverCol(null)
    const itemId = e.dataTransfer.getData('text/plain') || draggedItemId
    if (!itemId) return

    const item = pipelineItems.find((p) => p.id === itemId)
    if (!item || item.estagio === targetCol) return

    // Se mover para Proposta e ainda não houver oferta formal, alertar / permitir criar
    if (targetCol === 'Proposta') {
      const temOferta = ofertas.some(
        (o) => o.pipeline === item.id || (o.candidato === item.candidato && o.vaga === item.vaga),
      )
      if (!temOferta) {
        toast({
          title: 'Candidato em Proposta',
          description: 'Você pode formalizar os valores e benefícios na aba "Ofertas & Propostas".',
        })
      }
    }

    // If moving to Recusado, trigger prompt modal
    if (targetCol === 'Recusado') {
      setRecusaTargetItem(item)
      setMotivoRecusa('Não atende requisitos técnicos')
      setAnotacaoRecusa('')
      setAdicionarAoBanco(true)
      setMotivoBanco('Perfil relevante para reaproveitamento em futuras posições')
      setRecusaModalOpen(true)
      return
    }

    // Direct move
    await applyStageChange(item, targetCol)
  }

  const applyStageChange = async (
    item: RecordModel,
    newStage: string,
    motivo = '',
    nota = '',
    guardarBanco = false,
    motivoBancoTalentos = '',
  ) => {
    try {
      const historicoAtual = Array.isArray(item.historico) ? item.historico : []
      const novoHistorico = [
        ...historicoAtual,
        {
          data: new Date().toISOString(),
          estagio: newStage,
          autor: pb.authStore.record?.name || 'Gente & Gestão',
          nota: nota || (newStage === 'Recusado' ? `Motivo: ${motivo}` : `Movido para ${newStage}`),
        },
      ]

      await pb.collection('pipeline').update(item.id, {
        estagio: newStage,
        motivo_recusa: motivo,
        anotacoes: nota,
        historico: novoHistorico,
        adicionado_ao_banco: guardarBanco,
      })

      // Registrar evento na timeline do candidato
      if (item.candidato) {
        const autorLogado = pb.authStore.record?.name || 'Gente & Gestão'
        const vagaNome = item.expand?.vaga?.titulo || ''
        if (newStage === 'Recusado') {
          await candidatosTimelineService.registrarEventoSeguro({
            candidato: item.candidato,
            categoria: 'STATUS',
            titulo: 'Candidato recusado no processo seletivo:',
            complemento: motivo
              ? `Motivo: ${motivo}.${guardarBanco ? ' Perfil adicionado ao Banco de Talentos.' : ''}`
              : 'Processo encerrado nesta vaga.',
            autor: autorLogado,
            origem: 'usuario',
            referencia_tipo: 'pipeline',
            referencia_id: item.id,
          })
        } else if (newStage === 'Aprovado') {
          await candidatosTimelineService.registrarEventoSeguro({
            candidato: item.candidato,
            categoria: 'STATUS',
            titulo: 'Candidato contratado / aprovado:',
            complemento: `Aprovação confirmada para a vaga ${vagaNome || 'em seleção'}. Iniciando integração.`,
            autor: autorLogado,
            origem: 'usuario',
            referencia_tipo: 'pipeline',
            referencia_id: item.id,
          })
        } else {
          await candidatosTimelineService.registrarEventoSeguro({
            candidato: item.candidato,
            categoria: 'STATUS',
            titulo: 'Movimentação no pipeline:',
            complemento: `Estágio alterado de "${item.estagio || 'Triagem'}" para "${newStage}"${vagaNome ? ` (${vagaNome})` : ''}`,
            autor: autorLogado,
            origem: 'usuario',
            referencia_tipo: 'pipeline',
            referencia_id: item.id,
          })
        }
      }

      // Update candidato status as well
      if (item.candidato) {
        const updateData: Record<string, any> = {
          status: newStage,
        }
        if (newStage === 'Recusado' && guardarBanco) {
          updateData.banco_talentos = true
          updateData.motivo_banco_talentos =
            motivoBancoTalentos || 'Guardado no banco para reaproveitamento em vagas futuras'
          updateData.estagio_saida = item.estagio || 'Recusado'
          updateData.data_adicao_banco = new Date().toISOString()
          if (item.vaga && !item.expand?.candidato?.vaga_origem) {
            updateData.vaga_origem = item.vaga
          }
        }
        await pb.collection('candidatos').update(item.candidato, updateData)
      }

      toast({
        title: 'Estágio atualizado',
        description: `Candidato movido para ${newStage}.`,
      })
      fetchPipeline()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao mover candidato',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const handleConfirmRecusa = async () => {
    if (!recusaTargetItem) return
    await applyStageChange(
      recusaTargetItem,
      'Recusado',
      motivoRecusa,
      anotacaoRecusa,
      adicionarAoBanco,
      motivoBanco,
    )
    setRecusaModalOpen(false)
  }

  // Filter items
  const filteredItems = useMemo(() => {
    return pipelineItems.filter((item) => {
      const cand = item.expand?.candidato
      const matchesVaga = selectedVaga === 'all' || item.vaga === selectedVaga

      if (!cand) return matchesVaga

      if (origemFilter !== 'all') {
        const cOrig = (cand as any).canal_origem || ''
        if (origemFilter === 'Indicação') {
          if (cOrig !== 'Indicação' && cOrig !== 'Indicação interna') return false
        } else if (cOrig !== origemFilter) {
          return false
        }
      }

      const q = search.toLowerCase()
      const matchesSearch =
        cand.nome?.toLowerCase().includes(q) ||
        cand.cargo_atual?.toLowerCase().includes(q) ||
        item.expand?.vaga?.titulo?.toLowerCase().includes(q)

      return matchesVaga && matchesSearch
    })
  }, [pipelineItems, selectedVaga, origemFilter, search])

  // Group by stage
  const groupedColumns = useMemo(() => {
    const map: Record<string, RecordModel[]> = {}
    COLUNAS.forEach((c) => {
      map[c.id] = []
    })
    filteredItems.forEach((item) => {
      if (map[item.estagio]) {
        map[item.estagio].push(item)
      } else {
        map['Triagem'].push(item)
      }
    })
    return map
  }, [filteredItems])

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="font-display text-[11px] uppercase font-bold tracking-widest text-[#E9530E] mb-1">
            Fluxo de Seleção · Kanban Interativo
          </div>
          <h1 className="font-display text-2xl sm:text-[26px] font-bold text-[#212B55] dark:text-[#F7F8FB] tracking-tight">
            Pipeline de Seleção
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Arraste os cards entre as colunas para atualizar a fase do candidato em tempo real
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Select value={selectedVaga} onValueChange={handleVagaFilterChange}>
            <SelectTrigger className="w-[200px] h-10 text-xs bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E] text-[#212B55] dark:text-[#F7F8FB]">
              <SelectValue placeholder="Todas as vagas" />
            </SelectTrigger>
            <SelectContent className="dark:bg-[#1A2240] dark:border-[#2E3A6E] dark:text-[#F7F8FB]">
              <SelectItem value="all" className="text-xs">
                Todas as vagas
              </SelectItem>
              {vagas.map((v) => (
                <SelectItem key={v.id} value={v.id} className="text-xs">
                  {v.titulo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={origemFilter} onValueChange={setOrigemFilter}>
            <SelectTrigger className="w-[180px] h-10 text-xs bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E] text-[#212B55] dark:text-[#F7F8FB]">
              <SelectValue placeholder="Origem / Canal" />
            </SelectTrigger>
            <SelectContent className="dark:bg-[#1A2240] dark:border-[#2E3A6E] dark:text-[#F7F8FB]">
              <SelectItem value="all" className="text-xs">
                Todos os canais
              </SelectItem>
              <SelectItem value="Indicação" className="text-xs">
                🎁 Indicação (Promotores)
              </SelectItem>
              <SelectItem value="Página de Carreira" className="text-xs">
                Página de Carreira
              </SelectItem>
              <SelectItem value="LinkedIn" className="text-xs">
                LinkedIn
              </SelectItem>
              <SelectItem value="Banco de talentos" className="text-xs">
                Banco de Talentos
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Filter search */}
      <div className="bg-white dark:bg-[#1A2240] p-3.5 rounded-xl border border-slate-200/80 dark:border-[#2E3A6E] shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <Input
            placeholder="Filtrar candidatos no Kanban..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs bg-slate-50 dark:bg-[#141B34] border-slate-200 dark:border-[#2E3A6E]"
          />
        </div>

        <span className="font-mono text-xs font-bold text-[#212B55] dark:text-[#F7F8FB] tabular-nums shrink-0">
          {filteredItems.length} candidatos no funil
        </span>
      </div>

      {/* Kanban Board Container (Horizontal scroll on desktop, vertical stacked on mobile) */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-72 shrink-0 bg-slate-100/60 rounded-xl p-3 space-y-3">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 overflow-x-auto pb-6 pt-1 items-start min-h-[600px]">
          {COLUNAS.map((col) => {
            const itemsInCol = groupedColumns[col.id] || []
            const isTarget = dragOverCol === col.id

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`w-full lg:w-[280px] shrink-0 rounded-xl flex flex-col bg-slate-100/70 p-3 transition-colors duration-200 border-2 ${
                  isTarget ? 'border-blue-500 bg-blue-50/50' : 'border-transparent'
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 px-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${col.dot}`} />
                    <h3 className="font-display text-xs font-bold text-[#212B55] dark:text-[#F7F8FB] uppercase tracking-wider">
                      {col.label}
                    </h3>
                  </div>
                  <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1A2240] border border-slate-200 dark:border-[#2E3A6E] px-2.5 py-0.5 rounded-full shadow-2xs tabular-nums">
                    {itemsInCol.length}
                  </span>
                </div>

                {/* Cards List in Column */}
                <div className="space-y-2.5 flex-1 min-h-[150px]">
                  {itemsInCol.map((item) => {
                    const cand = item.expand?.candidato
                    const vaga = item.expand?.vaga
                    if (!cand) return null

                    const score = cand.score_semantico || 75
                    const initials = cand.nome
                      .split(' ')
                      .map((n: string) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()

                    return (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        className="bg-white p-3.5 rounded-lg border border-slate-200/90 shadow-2xs hover:shadow-md hover:-translate-y-0.5 transition-all cursor-grab active:cursor-grabbing group relative"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-200">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <h4
                                onClick={() => navigate(`/candidatos/${cand.id}`)}
                                className="font-display text-sm font-bold text-[#212B55] dark:text-[#F7F8FB] group-hover:text-[#E9530E] transition-colors truncate cursor-pointer"
                              >
                                {cand.nome}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {cand.cargo_atual}
                              </p>
                              {((cand as any).canal_origem === 'Indicação' ||
                                (cand as any).canal_origem === 'Indicação interna') && (
                                <span className="inline-block mt-0.5 font-display text-[11px] font-bold px-2 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                                  🎁 Indicação
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Score pill */}
                          <div
                            className={`font-mono text-xs font-bold px-2 py-0.5 rounded border shrink-0 tabular-nums ${
                              score >= 75
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                                : score >= 50
                                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                            }`}
                            title="Score Matching IA"
                          >
                            {score}%
                          </div>
                        </div>

                        {/* Vaga label */}
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span className="truncate max-w-[170px] font-medium text-slate-600">
                            {vaga?.titulo || 'Vaga Geral'}
                          </span>
                          <button
                            onClick={() => navigate(`/candidatos/${cand.id}`)}
                            className="text-blue-600 hover:text-blue-800 font-semibold text-[10px]"
                          >
                            Ver perfil
                          </button>
                        </div>

                        {/* Ação rápida de Onboarding para candidatos Aprovados */}
                        {item.estagio === 'Aprovado' && (
                          <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[10px] text-emerald-700 font-bold flex items-center gap-1">
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              Contratado
                            </span>
                            <button
                              onClick={() => navigate(`/onboarding?id=${cand.id}`)}
                              className="text-[10px] bg-blue-50 text-blue-700 hover:bg-blue-100 px-2 py-0.5 rounded font-bold border border-blue-200 transition-colors"
                            >
                              Ver Onboarding →
                            </button>
                          </div>
                        )}

                        {/* Status da Oferta (se existir) */}
                        {(() => {
                          const ofItem = ofertas.find(
                            (o) =>
                              o.pipeline === item.id ||
                              (o.candidato === cand.id && o.vaga === item.vaga),
                          )
                          if (!ofItem) {
                            if (item.estagio === 'Proposta') {
                              return (
                                <div className="mt-2 pt-1 border-t border-dashed border-slate-200 flex items-center justify-between">
                                  <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Sem proposta formal
                                  </span>
                                  <button
                                    onClick={() => navigate(`/ofertas?vaga=${item.vaga || ''}`)}
                                    className="text-[10px] text-blue-600 font-bold hover:underline"
                                  >
                                    Criar oferta
                                  </button>
                                </div>
                              )
                            }
                            return null
                          }

                          const isAceita = ofItem.status === 'Aceita'
                          const isRecusada = ofItem.status === 'Recusada'
                          const isNegoc = ofItem.status === 'Em negociação'

                          return (
                            <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                  isAceita
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                    : isRecusada
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : isNegoc
                                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}
                              >
                                <DollarSign className="w-3 h-3" />
                                Proposta: {ofItem.status}
                              </span>
                              <button
                                onClick={() => navigate('/ofertas')}
                                className="text-[10px] text-slate-500 hover:text-blue-600 font-medium"
                              >
                                Gerenciar
                              </button>
                            </div>
                          )
                        })()}
                      </div>
                    )
                  })}

                  {itemsInCol.length === 0 && (
                    <div className="h-full flex items-center justify-center p-4 border border-dashed border-slate-200 rounded-lg text-slate-400 text-[11px]">
                      Nenhum candidato nesta fase
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Motivo de Recusa */}
      <Dialog open={recusaModalOpen} onOpenChange={setRecusaModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="font-display text-[11px] uppercase font-bold tracking-widest text-[#E9530E]">
              Auditoria de Seleção · Compliance RH
            </div>
            <DialogTitle className="font-display text-base sm:text-lg font-bold text-[#212B55] dark:text-[#F7F8FB]">
              Registrar Motivo de Recusa
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Ao mover o candidato para "Recusado", é obrigatório registrar a justificativa para
              conformidade e histórico de Gente &amp; Gestão.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Motivo principal *</Label>
              <select
                value={motivoRecusa}
                onChange={(e) => setMotivoRecusa(e.target.value)}
                className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs"
              >
                <option value="Não atende requisitos técnicos">
                  Não atende requisitos técnicos
                </option>
                <option value="Salário incompatível / pretensão fora da faixa">
                  Salário incompatível / pretensão fora da faixa
                </option>
                <option value="Candidato desistiu da vaga">Candidato desistiu da vaga</option>
                <option value="Competências comportamentais incompatíveis">
                  Competências comportamentais incompatíveis
                </option>
                <option value="Outro motivo justificado">Outro motivo justificado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Anotação detalhada (opcional)
              </Label>
              <Textarea
                rows={2}
                placeholder="Detalhes ou feedback fornecido ao candidato..."
                value={anotacaoRecusa}
                onChange={(e) => setAnotacaoRecusa(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            {/* Opção Banco de Talentos */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-blue-900 cursor-pointer">
                <input
                  type="checkbox"
                  checked={adicionarAoBanco}
                  onChange={(e) => setAdicionarAoBanco(e.target.checked)}
                  className="rounded border-blue-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <span>Destacar e adicionar ao Banco de Talentos para vagas futuras</span>
              </label>

              {adicionarAoBanco && (
                <div className="pt-1">
                  <Input
                    placeholder="Justificativa para o banco (ex: Bom potencial técnico para Go/Sênior)..."
                    value={motivoBanco}
                    onChange={(e) => setMotivoBanco(e.target.value)}
                    className="text-xs bg-white border-blue-200"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setRecusaModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white font-medium"
              onClick={handleConfirmRecusa}
            >
              Confirmar Recusa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
