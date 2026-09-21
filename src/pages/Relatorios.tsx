import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import {
  FileText,
  Search,
  Filter,
  Sparkles,
  Printer,
  Trash2,
  ExternalLink,
  ChevronRight,
  Award,
  CheckCircle2,
  AlertCircle,
  XCircle,
  UserCheck,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { SinteseExecutivaFinalistas } from '@/components/SinteseExecutivaFinalistas'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import type { RecordModel } from 'pocketbase'

export default function Relatorios() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [relatorios, setRelatorios] = useState<RecordModel[]>([])
  const [vagas, setVagas] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [vagaFilter, setVagaFilter] = useState('all')
  const [vereditoFilter, setVereditoFilter] = useState('all')
  const [abaAtiva, setAbaAtiva] = useState<'dossies' | 'sintese-finalistas'>('dossies')
  const [vagaSinteseId, setVagaSinteseId] = useState<string>('')

  const fetchRelatorios = async () => {
    try {
      const [rList, vList] = await Promise.all([
        pb.collection('relatorios').getFullList({
          sort: '-created',
          expand: 'candidato,vaga',
        }),
        pb.collection('vagas').getFullList({ sort: '-created' }),
      ])
      setRelatorios(rList)
      setVagas(vList)
      if (vList.length > 0 && !vagaSinteseId) {
        setVagaSinteseId(vList[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRelatorios()
  }, [])

  useRealtime('relatorios', () => fetchRelatorios())

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Deseja excluir este relatório de avaliação?')) return
    try {
      await pb.collection('relatorios').delete(id)
      toast({ title: 'Relatório excluído com sucesso' })
      fetchRelatorios()
    } catch (err) {
      toast({ title: 'Erro ao excluir relatório', variant: 'destructive' })
    }
  }

  // Filtered
  const filteredRelatorios = useMemo(() => {
    return relatorios.filter((r) => {
      const cand = r.expand?.candidato
      const vaga = r.expand?.vaga
      const q = search.toLowerCase()

      const matchesSearch =
        cand?.nome?.toLowerCase().includes(q) || vaga?.titulo?.toLowerCase().includes(q)

      const matchesVaga = vagaFilter === 'all' || r.vaga === vagaFilter
      const matchesVeredito = vereditoFilter === 'all' || r.veredito === vereditoFilter

      return matchesSearch && matchesVaga && matchesVeredito
    })
  }, [relatorios, search, vagaFilter, vereditoFilter])

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-[#F7F8FB] tracking-tight">
            Dossiês e Camada Executiva de IA
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Relatórios técnicos individuais e síntese executiva comparando finalistas para a tomada
            de decisão.
          </p>
        </div>

        {/* Tab switcher no topo de Relatórios */}
        <div className="flex items-center gap-2 bg-slate-100 dark:bg-[#1A2240] p-1 rounded-lg border border-slate-200 dark:border-[#2E3A6E]">
          <Button
            size="sm"
            variant={abaAtiva === 'dossies' ? 'default' : 'ghost'}
            onClick={() => setAbaAtiva('dossies')}
            className={`text-xs h-8 ${
              abaAtiva === 'dossies'
                ? 'bg-white dark:bg-[#212B55] text-slate-900 dark:text-[#F7F8FB] shadow-xs'
                : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <FileText className="w-3.5 h-3.5 mr-1.5" />
            Dossiês Individuais ({relatorios.length})
          </Button>

          <Button
            size="sm"
            variant={abaAtiva === 'sintese-finalistas' ? 'default' : 'ghost'}
            onClick={() => setAbaAtiva('sintese-finalistas')}
            className={`text-xs h-8 ${
              abaAtiva === 'sintese-finalistas'
                ? 'bg-[#E9530E] text-white shadow-xs hover:bg-[#C5430A]'
                : 'text-[#E9530E] hover:text-[#C5430A]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Síntese Executiva de Finalistas
          </Button>
        </div>
      </div>

      {abaAtiva === 'sintese-finalistas' ? (
        /* Aba de Síntese Executiva de Finalistas por Vaga */
        <div className="space-y-6">
          <div className="bg-white dark:bg-[#1A2240] p-4 rounded-xl border border-slate-200/80 dark:border-[#2E3A6E] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-display text-[11px] uppercase font-bold tracking-widest text-[#E9530E]">
                Selecione a Posição Foco
              </span>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Escolha a vaga para visualizar ou gerar o comparativo executivo lado a lado dos
                finalistas.
              </p>
            </div>

            <Select value={vagaSinteseId} onValueChange={setVagaSinteseId}>
              <SelectTrigger className="w-full sm:w-[320px] h-10 text-xs bg-slate-50 dark:bg-[#141B34] border-slate-200 dark:border-[#2E3A6E]">
                <SelectValue placeholder="Selecione a vaga..." />
              </SelectTrigger>
              <SelectContent>
                {vagas.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">
                    {v.titulo} ({v.departamento || 'Geral'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {vagaSinteseId ? (
            (() => {
              const vagaAtual = vagas.find((v) => v.id === vagaSinteseId)
              return vagaAtual ? (
                <SinteseExecutivaFinalistas
                  key={vagaAtual.id}
                  vagaId={vagaAtual.id}
                  vagaTitulo={vagaAtual.titulo}
                  sinteseInicial={vagaAtual.sintese_executiva_ia}
                  dataSinteseInicial={vagaAtual.data_sintese_executiva}
                  onSinteseAtualizada={(novaSintese) => {
                    setVagas((prev) =>
                      prev.map((v) =>
                        v.id === vagaAtual.id
                          ? {
                              ...v,
                              sintese_executiva_ia: novaSintese,
                              data_sintese_executiva: new Date().toISOString(),
                            }
                          : v,
                      ),
                    )
                  }}
                />
              ) : (
                <div className="p-8 text-center text-xs text-slate-400">
                  Vaga selecionada não encontrada.
                </div>
              )
            })()
          ) : (
            <div className="p-8 text-center text-xs text-slate-400">
              Nenhuma vaga disponível no momento.
            </div>
          )}
        </div>
      ) : (
        /* Aba de Dossiês Individuais (Listagem Existente) */
        <>
          {/* Filter bar */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input
                placeholder="Buscar por candidato ou vaga associada..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 text-xs bg-slate-50 border-slate-200"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <Select value={vagaFilter} onValueChange={setVagaFilter}>
                <SelectTrigger className="w-[180px] h-10 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Vaga" />
                </SelectTrigger>
                <SelectContent>
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

              <Select value={vereditoFilter} onValueChange={setVereditoFilter}>
                <SelectTrigger className="w-[170px] h-10 text-xs bg-slate-50 border-slate-200">
                  <SelectValue placeholder="Veredito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Todos os vereditos
                  </SelectItem>
                  <SelectItem value="Recomendar" className="text-xs">
                    Recomendar
                  </SelectItem>
                  <SelectItem value="Considerar" className="text-xs">
                    Considerar
                  </SelectItem>
                  <SelectItem value="Não recomendar" className="text-xs">
                    Não recomendar
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reports List */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card
                  key={i}
                  className="p-5 border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240]"
                >
                  <Skeleton className="h-6 w-1/3 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </Card>
              ))}
            </div>
          ) : filteredRelatorios.length === 0 ? (
            <div className="bg-white dark:bg-[#1A2240] rounded-xl border border-dashed border-slate-300 dark:border-[#2E3A6E] p-12 text-center">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800 dark:text-[#F7F8FB]">
                Nenhum relatório encontrado
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                Gere novos relatórios acessando o perfil de qualquer candidato e clicando em "Gerar
                relatório de IA".
              </p>
              <Button
                onClick={() => navigate('/candidatos')}
                variant="outline"
                size="sm"
                className="mt-4 text-xs font-semibold text-blue-600 dark:text-[#F19763] border-blue-200 dark:border-[#2E3A6E] dark:hover:bg-[#212B55]"
              >
                Acessar banco de talentos
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRelatorios.map((rel) => {
                const cand = rel.expand?.candidato
                const vaga = rel.expand?.vaga
                const scoreGeral = rel.score_geral || 75

                const vereditoBadge =
                  rel.veredito === 'Recomendar'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700'
                    : rel.veredito === 'Considerar'
                      ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-700'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-700'

                return (
                  <Card
                    key={rel.id}
                    onClick={() => navigate(`/relatorios/${rel.id}`)}
                    className="border-slate-200/90 dark:border-[#2E3A6E] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all bg-white dark:bg-[#1A2240] cursor-pointer group"
                  >
                    <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-lg bg-blue-50 dark:bg-[#212B55] text-blue-700 dark:text-[#93c5fd] flex items-center justify-center shrink-0 border border-blue-200 dark:border-[#2E3A6E] group-hover:bg-blue-600 group-hover:text-white transition-colors">
                          <Sparkles className="w-5 h-5" />
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F7F8FB] group-hover:text-blue-600 dark:group-hover:text-[#F19763] transition-colors truncate">
                              {cand?.nome || 'Candidato'}
                            </h3>
                            <Badge
                              variant="outline"
                              className={`text-[10px] font-bold ${vereditoBadge}`}
                            >
                              {rel.veredito}
                            </Badge>
                            <span className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">
                              Tipo: {rel.tipo || 'Completo'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                            Posição avaliada:{' '}
                            <span className="font-semibold text-slate-800 dark:text-[#F7F8FB]">
                              {vaga?.titulo || 'Geral'}
                            </span>
                          </p>

                          <p className="text-[11px] text-slate-400">
                            Gerado em {new Date(rel.created).toLocaleDateString('pt-BR')} às{' '}
                            {new Date(rel.created).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>

                      {/* Right scores & actions */}
                      <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-[#2E3A6E]">
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 tracking-wider">
                              Score Geral
                            </span>
                            <p className="text-base font-bold text-slate-900 dark:text-[#F7F8FB] tabular-nums">
                              {scoreGeral}%
                            </p>
                          </div>

                          <div className="hidden sm:block">
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 tracking-wider">
                              Técnico
                            </span>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                              {rel.score_tecnico || scoreGeral}%
                            </p>
                          </div>

                          <div className="hidden sm:block">
                            <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-400 tracking-wider">
                              Comportamental
                            </span>
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                              {rel.score_comportamental || scoreGeral}%
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              navigate(`/relatorios/${rel.id}`)
                            }}
                            className="text-xs font-semibold h-8 border-slate-200 dark:border-[#2E3A6E] dark:hover:bg-[#212B55]"
                          >
                            Abrir Dossiê
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDelete(e, rel.id)}
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 dark:hover:bg-[#212B55]"
                            title="Excluir relatório"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
