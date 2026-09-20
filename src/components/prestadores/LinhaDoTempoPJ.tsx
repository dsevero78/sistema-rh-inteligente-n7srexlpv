import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Activity,
  RotateCw,
  Plus,
  Filter,
  CheckCircle2,
  Calendar,
  User,
  Sparkles,
} from 'lucide-react'
import {
  PrestadorPJ,
  EventoTimelinePJ,
  CategoriaTimelinePJ,
  prestadoresService,
} from '@/services/prestadoresPj'
import { useToast } from '@/hooks/use-toast'
import { useRealtime } from '@/hooks/use-realtime'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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

interface LinhaDoTempoPJProps {
  prestador: PrestadorPJ
  onAtualizar?: () => void
}

// Configuração visual das categorias conforme o padrão dos prints de referência
const CONFIG_CATEGORIAS: Record<
  CategoriaTimelinePJ,
  {
    rotulo: string
    corTexto: string
    corBolinha: string
    bgBadge: string
    borderBadge: string
  }
> = {
  REGISTRO: {
    rotulo: 'REGISTRO',
    corTexto: 'text-blue-600',
    corBolinha: 'bg-blue-600',
    bgBadge: 'bg-blue-50',
    borderBadge: 'border-blue-200',
  },
  DOCUMENTOS: {
    rotulo: 'DOCUMENTOS',
    corTexto: 'text-purple-600',
    corBolinha: 'bg-purple-600',
    bgBadge: 'bg-purple-50',
    borderBadge: 'border-purple-200',
  },
  GESTÃO: {
    rotulo: 'GESTÃO',
    corTexto: 'text-emerald-700',
    corBolinha: 'bg-emerald-700',
    bgBadge: 'bg-emerald-50',
    borderBadge: 'border-emerald-200',
  },
  AUSÊNCIAS: {
    rotulo: 'AUSÊNCIAS',
    corTexto: 'text-amber-600',
    corBolinha: 'bg-amber-600',
    bgBadge: 'bg-amber-50',
    borderBadge: 'border-amber-200',
  },
  AVALIAÇÃO: {
    rotulo: 'AVALIAÇÃO',
    corTexto: 'text-indigo-600',
    corBolinha: 'bg-indigo-600',
    bgBadge: 'bg-indigo-50',
    borderBadge: 'border-indigo-200',
  },
}

// Formatação dd/MM/yyyy HH:mm em pt-BR
function formatarDataHora(dataIso: string): string {
  if (!dataIso) return ''
  try {
    const d = new Date(dataIso)
    if (isNaN(d.getTime())) return ''
    const dia = String(d.getDate()).padStart(2, '0')
    const mes = String(d.getMonth() + 1).padStart(2, '0')
    const ano = d.getFullYear()
    const horas = String(d.getHours()).padStart(2, '0')
    const mins = String(d.getMinutes()).padStart(2, '0')
    return `${dia}/${mes}/${ano} ${horas}:${mins}`
  } catch (_) {
    return dataIso
  }
}

export const LinhaDoTempoPJ: React.FC<LinhaDoTempoPJProps> = ({ prestador, onAtualizar }) => {
  const { toast } = useToast()
  const [eventos, setEventos] = useState<EventoTimelinePJ[]>([])
  const [carregando, setCarregando] = useState(true)
  const [recarregando, setRecarregando] = useState(false)
  const [filtroCategoria, setFiltroCategoria] = useState<CategoriaTimelinePJ | 'TODAS'>('TODAS')

  // Modal para adicionar evento manual
  const [modalOpen, setModalOpen] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [formCategoria, setFormCategoria] = useState<CategoriaTimelinePJ>('GESTÃO')
  const [formTitulo, setFormTitulo] = useState('')
  const [formComplemento, setFormComplemento] = useState('')
  const [formAutor, setFormAutor] = useState('Gestor RH')

  // Carregar eventos da coleção
  const carregarEventos = async (isManualRefresh = false) => {
    if (isManualRefresh) setRecarregando(true)
    else setCarregando(true)

    try {
      const lista = await prestadoresService.listarEventosTimeline(prestador.id)
      setEventos(lista)
    } catch (err: unknown) {
      console.warn('Erro ao carregar linha do tempo:', err)
      toast({
        title: 'Não foi possível carregar a linha do tempo',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
      setRecarregando(false)
    }
  }

  useEffect(() => {
    carregarEventos()
  }, [prestador.id])

  // Ouvinte Realtime no PocketBase para novos eventos
  useRealtime<EventoTimelinePJ>('eventos_timeline_pj', ({ action, record }) => {
    if (record.prestador === prestador.id) {
      if (action === 'create') {
        setEventos((prev) => {
          if (prev.some((e) => e.id === record.id)) return prev
          return [record, ...prev]
        })
      } else if (action === 'update') {
        setEventos((prev) => prev.map((e) => (e.id === record.id ? record : e)))
      } else if (action === 'delete') {
        setEventos((prev) => prev.filter((e) => e.id !== record.id))
      }
    }
  })

  // Filtragem local
  const eventosFiltrados = useMemo(() => {
    if (filtroCategoria === 'TODAS') return eventos
    return eventos.filter((e) => e.categoria === filtroCategoria)
  }, [eventos, filtroCategoria])

  // Submissão do novo evento manual
  const handleCriarEventoManual = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formTitulo.trim()) {
      toast({
        title: 'Informe o título do evento',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const novo = await prestadoresService.criarEventoTimeline({
        prestador: prestador.id,
        categoria: formCategoria,
        titulo: formTitulo.trim(),
        complemento: formComplemento.trim() || undefined,
        autor: formAutor.trim() || 'Gestor RH',
        origem: 'usuario',
        data_evento: new Date().toISOString(),
      })

      setEventos((prev) => [novo, ...prev])
      setModalOpen(false)
      setFormTitulo('')
      setFormComplemento('')
      toast({
        title: 'Evento registrado na linha do tempo',
        description: 'O histórico foi atualizado com sucesso.',
      })
      if (onAtualizar) onAtualizar()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao registrar evento',
        description: err instanceof Error ? err.message : 'Falha.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  return (
    <Card className="border-slate-200 shadow-xs bg-white overflow-hidden">
      {/* ------------------------------------------------------------------ */}
      {/* HEADER FIEL AO PRINT:                                              */}
      {/* Ícone de atividade/pulso | "Linha do tempo" | "· Área" | "● AO VIVO"*/}
      {/* ------------------------------------------------------------------ */}
      <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white">
        <div className="flex items-center gap-2.5">
          <Activity className="w-5 h-5 text-emerald-600 stroke-[2.2]" />
          <h3 className="text-lg font-bold text-slate-900 tracking-tight flex items-baseline gap-2 flex-wrap">
            <span>Linha do tempo</span>
            {prestador.area_atuacao && (
              <span className="text-sm font-normal text-slate-500">
                &middot; {prestador.area_atuacao}
              </span>
            )}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Badge ● AO VIVO fiel ao print: bolinha verde pulsante, monoespaçado, tracking largo */}
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50/80 border border-emerald-200/60 shadow-2xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-mono font-bold tracking-widest text-emerald-700 uppercase">
              AO VIVO
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => carregarEventos(true)}
            disabled={recarregando || carregando}
            className="h-8 px-2.5 text-xs text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50"
            title="Atualizar eventos"
          >
            <RotateCw className={`w-3.5 h-3.5 mr-1.5 ${recarregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="h-8 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Novo Registro
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* BARRA DE FILTROS POR CATEGORIA (Chips)                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="px-5 py-2.5 bg-slate-50/60 border-b border-slate-100 flex items-center justify-between gap-3 overflow-x-auto text-xs">
        <div className="flex items-center gap-1.5 flex-nowrap">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            Filtrar:
          </span>

          <button
            type="button"
            onClick={() => setFiltroCategoria('TODAS')}
            className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-medium transition-all ${
              filtroCategoria === 'TODAS'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            TODAS ({eventos.length})
          </button>

          {(Object.keys(CONFIG_CATEGORIAS) as CategoriaTimelinePJ[]).map((cat) => {
            const cfg = CONFIG_CATEGORIAS[cat]
            const total = eventos.filter((e) => e.categoria === cat).length
            const isAtivo = filtroCategoria === cat

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setFiltroCategoria(cat)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-[11px] font-semibold transition-all ${
                  isAtivo
                    ? `${cfg.bgBadge} ${cfg.corTexto} border-2 ${cfg.borderBadge} shadow-xs font-bold`
                    : `bg-white border border-slate-200 text-slate-600 hover:${cfg.bgBadge} hover:${cfg.corTexto}`
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.corBolinha}`} />
                {cfg.rotulo} {total > 0 && `(${total})`}
              </button>
            )
          })}
        </div>

        <div className="text-[11px] text-slate-400 whitespace-nowrap font-mono hidden md:block">
          {eventosFiltrados.length} evento(s) listado(s)
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CORPO DA TIMELINE COM NÓS VERDES E LINHA VERTICAL CONTÍNUA          */}
      {/* ------------------------------------------------------------------ */}
      <CardContent className="p-6 md:p-8 relative">
        {carregando ? (
          <div className="space-y-6 max-w-2xl py-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-4 items-start">
                <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        ) : eventosFiltrados.length === 0 ? (
          <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl max-w-lg mx-auto bg-slate-50/50">
            <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">Nenhum evento registrado</h4>
            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
              {filtroCategoria !== 'TODAS'
                ? `Nenhum evento na categoria "${filtroCategoria}". Tente selecionar "TODAS".`
                : 'Ainda não há registros no histórico deste prestador. Clique em "Novo Registro" para começar.'}
            </p>
            {filtroCategoria !== 'TODAS' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltroCategoria('TODAS')}
                className="mt-3 text-xs"
              >
                Ver todas as categorias
              </Button>
            )}
          </div>
        ) : (
          <div className="relative max-w-3xl">
            {/* Linha vertical verde contínua à esquerda que conecta os nós */}
            <div
              className="absolute left-[11px] top-3 bottom-6 w-[2px] bg-emerald-500/80 pointer-events-none"
              aria-hidden="true"
            />

            <div className="space-y-6">
              {eventosFiltrados.map((ev, index) => {
                const configCat = CONFIG_CATEGORIAS[ev.categoria] || CONFIG_CATEGORIAS.GESTÃO
                const dataFormatada = formatarDataHora(ev.data_evento || ev.created)
                const isUltimo =
                  index === eventosFiltrados.length - 1 && eventosFiltrados.length > 2

                return (
                  <div
                    key={ev.id}
                    className={`relative flex items-start gap-4 transition-all duration-300 group ${
                      isUltimo ? 'opacity-35 hover:opacity-100' : 'opacity-100'
                    }`}
                  >
                    {/* Nó verde com borda verde e preenchimento branco/verde conforme print */}
                    <div className="relative z-10 flex items-center justify-center shrink-0 w-6 h-6 rounded-full bg-white border-2 border-emerald-500 shadow-2xs group-hover:scale-110 transition-transform">
                      <div className="w-2 h-2 rounded-full bg-emerald-600" />
                    </div>

                    {/* Conteúdo do evento */}
                    <div className="flex-1 pt-0.5 space-y-1">
                      {/* Rótulo de categoria: em caixa alta, monoespaçado, colorido, precedido por bolinha */}
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${configCat.corBolinha}`} />
                        <span
                          className={`font-mono text-[11px] font-bold tracking-wider uppercase ${configCat.corTexto}`}
                        >
                          {configCat.rotulo}
                        </span>
                      </div>

                      {/* Título em negrito com complemento em peso normal conforme o print */}
                      <div className="text-[14px] text-slate-900 leading-snug">
                        <span className="font-bold">{ev.titulo}</span>
                        {ev.complemento && (
                          <span className="font-normal text-slate-700 ml-1.5">
                            {ev.complemento}
                          </span>
                        )}
                      </div>

                      {/* Metadados: autor · dd/MM/aaaa HH:mm em fonte monoespaçada cinza */}
                      <div className="font-mono text-[11px] text-slate-400 tracking-tight flex items-center gap-1.5 pt-0.5">
                        <span className="capitalize">{ev.autor}</span>
                        <span>&middot;</span>
                        <span>{dataFormatada}</span>
                        {ev.origem === 'sistema' && (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded font-mono ml-1">
                            automático
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Efeito de fade no rodapé quando há muitos eventos (continuação visual do print) */}
            {eventosFiltrados.length >= 4 && (
              <div className="pt-4 text-center">
                <span className="text-[11px] font-mono text-slate-400 italic">
                  &bull; &bull; &bull; Início da linha do tempo &bull; &bull; &bull;
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* ------------------------------------------------------------------ */}
      {/* MODAL PARA NOVO REGISTRO NA LINHA DO TEMPO                         */}
      {/* ------------------------------------------------------------------ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              Novo Registro na Linha do Tempo
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCriarEventoManual} className="space-y-4 pt-2">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Categoria</Label>
              <Select
                value={formCategoria}
                onValueChange={(v) => setFormCategoria(v as CategoriaTimelinePJ)}
              >
                <SelectTrigger className="h-9 text-xs mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="REGISTRO">
                    ● REGISTRO (Propostas, Contratos, Valores)
                  </SelectItem>
                  <SelectItem value="DOCUMENTOS">
                    ● DOCUMENTOS (Certidões, Cobranças, Uploads)
                  </SelectItem>
                  <SelectItem value="GESTÃO">● GESTÃO (Marcos, Aprovações, NFs, Status)</SelectItem>
                  <SelectItem value="AUSÊNCIAS">
                    ● AUSÊNCIAS (Férias, Recessos, Licenças)
                  </SelectItem>
                  <SelectItem value="AVALIAÇÃO">
                    ● AVALIAÇÃO (Desempenho trimestral, SLAs)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Título em Destaque (Negrito) *
              </Label>
              <Input
                value={formTitulo}
                onChange={(e) => setFormTitulo(e.target.value)}
                placeholder="Ex.: Ausência aprovada: ou Contrato assinado"
                className="h-9 text-xs mt-1 font-semibold"
                required
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">
                Complemento / Detalhes (Peso normal)
              </Label>
              <Textarea
                value={formComplemento}
                onChange={(e) => setFormComplemento(e.target.value)}
                placeholder="Ex.: 12 a 16/05, 'férias' programadas com antecedência acordada"
                className="text-xs mt-1 min-h-[70px] resize-none"
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Autor do Registro</Label>
              <Input
                value={formAutor}
                onChange={(e) => setFormAutor(e.target.value)}
                placeholder="Ex.: Elizangela ou Fábio ou seu nome"
                className="h-9 text-xs mt-1 font-mono"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Digite "sistema" caso queira registrar como automação institucional.
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalOpen(false)}
                className="h-9 text-xs"
                disabled={salvando}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvando}
                className="h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
              >
                {salvando ? 'Registrando...' : 'Adicionar ao Histórico'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
