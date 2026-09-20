import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  Users,
  GitPullRequest,
  Clock,
  Sparkles,
  Edit,
  PauseCircle,
  PlayCircle,
  Archive,
  ChevronRight,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { QuestionarioVagaEditor } from '@/components/QuestionarioVagaEditor'
import type { RecordModel } from 'pocketbase'

export default function VagaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [vaga, setVaga] = useState<RecordModel | null>(null)
  const [candidatos, setCandidatos] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)

  const fetchVagaData = async () => {
    if (!id) return
    try {
      const v = await pb.collection('vagas').getOne(id, { expand: 'gestor_responsavel' })
      setVaga(v)

      const cList = await pb.collection('candidatos').getFullList({
        filter: `vaga = '${id}'`,
        sort: '-score_semantico',
      })
      setCandidatos(cList)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar vaga',
        description: 'Vaga não encontrada ou indisponível.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVagaData()
  }, [id])

  useRealtime('vagas', () => fetchVagaData())
  useRealtime('candidatos', () => fetchVagaData())

  const handleStatusChange = async (newStatus: 'Ativa' | 'Pausada' | 'Arquivada') => {
    if (!vaga) return
    try {
      await pb.collection('vagas').update(vaga.id, { status: newStatus })
      toast({ title: `Vaga atualizada para ${newStatus}` })
      fetchVagaData()
    } catch (err) {
      toast({ title: 'Erro ao atualizar status', variant: 'destructive' })
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    )
  }

  if (!vaga) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-bold text-slate-800">Vaga não encontrada</h3>
        <Button onClick={() => navigate('/vagas')} className="mt-4">
          Voltar para lista de vagas
        </Button>
      </div>
    )
  }

  // Distribution by stage
  const estagios = [
    'Triagem',
    'Entrevista com RH',
    'Entrevista técnica',
    'Match técnico/comportamental (IA)',
    'Proposta',
    'Aprovado',
    'Recusado',
  ]

  const stageCounts: Record<string, number> = {}
  estagios.forEach((e) => (stageCounts[e] = 0))
  candidatos.forEach((c) => {
    if (stageCounts[c.status] !== undefined) stageCounts[c.status]++
    else stageCounts['Triagem']++
  })

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Back button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/vagas')}
          className="text-xs text-slate-600 hover:text-slate-900 -ml-2 mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Voltar para Vagas
        </Button>
      </div>

      {/* Hero Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider bg-blue-50 px-2.5 py-0.5 rounded">
              {vaga.departamento || 'Tecnologia'}
            </span>
            <Badge
              variant="outline"
              className={`text-xs font-semibold ${
                vaga.status === 'Ativa'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {vaga.status}
            </Badge>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{vaga.titulo}</h1>

          <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap pt-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              <span>{vaga.localizacao || 'Brasil'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-slate-400" />
              <span>{vaga.modalidade}</span>
            </div>
            {vaga.faixa_salarial && (
              <span className="font-semibold text-slate-800">{vaga.faixa_salarial}</span>
            )}
            {vaga.expand?.gestor_responsavel && (
              <div className="flex items-center gap-1.5 font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                <span>
                  Gestor:{' '}
                  {vaga.expand.gestor_responsavel.name || vaga.expand.gestor_responsavel.email}
                </span>
                {vaga.status_aprovacao_gestor && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 bg-white rounded">
                    {vaga.status_aprovacao_gestor}
                  </span>
                )}
              </div>
            )}
            <div className="flex items-center gap-1.5 text-slate-400">
              <Clock className="w-3.5 h-3.5" />
              <span>Criada em {new Date(vaga.created).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <Button
            onClick={() => navigate(`/pipeline?vaga=${vaga.id}`)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-10 shadow-xs flex-1 md:flex-initial"
          >
            <GitPullRequest className="w-4 h-4 mr-2" />
            Ver no Pipeline
          </Button>

          {vaga.status === 'Ativa' ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('Pausada')}
              className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50 h-10"
            >
              <PauseCircle className="w-4 h-4 mr-1.5" />
              Pausar
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('Ativa')}
              className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-10"
            >
              <PlayCircle className="w-4 h-4 mr-1.5" />
              Reativar
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleStatusChange('Arquivada')}
            className="text-xs text-slate-600 border-slate-300 hover:bg-slate-100 h-10"
          >
            <Archive className="w-4 h-4 mr-1.5" />
            Arquivar
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="visao-geral" className="space-y-6">
        <TabsList className="bg-white border border-slate-200/80 p-1 shadow-xs rounded-lg">
          <TabsTrigger value="visao-geral" className="text-xs font-semibold px-4 py-2">
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="triagem" className="text-xs font-semibold px-4 py-2">
            Questionário de Triagem (Módulo 2)
          </TabsTrigger>
          <TabsTrigger value="candidatos" className="text-xs font-semibold px-4 py-2">
            Candidatos ({candidatos.length})
          </TabsTrigger>
          <TabsTrigger value="metricas" className="text-xs font-semibold px-4 py-2">
            Métricas de Funil
          </TabsTrigger>
        </TabsList>

        {/* Aba Visão Geral */}
        <TabsContent value="visao-geral" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Descrição */}
              <Card className="border-slate-200 shadow-xs bg-white p-6">
                <CardTitle className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
                  Descrição e Escopo de Atuação
                </CardTitle>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line pt-4">
                  {vaga.descricao || 'Nenhuma descrição detalhada informada.'}
                </p>
              </Card>

              {/* Requisitos Obrigatórios e Desejáveis */}
              <Card className="border-slate-200 shadow-xs bg-white p-6">
                <CardTitle className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
                  Critérios de Avaliação
                </CardTitle>

                <div className="space-y-4 pt-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Requisitos Obrigatórios (Eliminatórios)
                    </h4>
                    {Array.isArray(vaga.requisitos_obrigatorios) &&
                    vaga.requisitos_obrigatorios.length > 0 ? (
                      <ul className="space-y-1.5">
                        {vaga.requisitos_obrigatorios.map((req: string, i: number) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400">
                        Nenhum requisito obrigatório listado.
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Diferenciais & Requisitos Desejáveis
                    </h4>
                    {Array.isArray(vaga.requisitos_desejaveis) &&
                    vaga.requisitos_desejaveis.length > 0 ? (
                      <ul className="space-y-1.5">
                        {vaga.requisitos_desejaveis.map((des: string, i: number) => (
                          <li key={i} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                            <span>{des}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400">Nenhum diferencial listado.</p>
                    )}
                  </div>
                </div>
              </Card>
            </div>

            {/* Matriz de Habilidades e Competências */}
            <div className="space-y-6">
              <Card className="border-slate-200 shadow-xs bg-white p-6">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Habilidades Técnicas
                  </CardTitle>
                  <Sparkles className="w-4 h-4 text-blue-600" />
                </div>
                <div className="pt-4 space-y-2.5">
                  {Array.isArray(vaga.habilidades_tecnicas) &&
                  vaga.habilidades_tecnicas.length > 0 ? (
                    vaga.habilidades_tecnicas.map(
                      (h: { nome: string; peso: number }, i: number) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100"
                        >
                          <span className="text-xs font-semibold text-slate-800">{h.nome}</span>
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-bold bg-blue-100 text-blue-800"
                          >
                            Peso {h.peso}
                          </Badge>
                        </div>
                      ),
                    )
                  ) : (
                    <p className="text-xs text-slate-400">Sem habilidades cadastradas.</p>
                  )}
                </div>
              </Card>

              <Card className="border-slate-200 shadow-xs bg-white p-6">
                <CardTitle className="text-sm font-bold text-slate-900 pb-3 border-b border-slate-100">
                  Competências Comportamentais
                </CardTitle>
                <div className="pt-4 flex flex-wrap gap-1.5">
                  {Array.isArray(vaga.competencias_comportamentais) &&
                  vaga.competencias_comportamentais.length > 0 ? (
                    vaga.competencias_comportamentais.map((comp: string, i: number) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="text-xs bg-purple-50 text-purple-700 border-purple-200 py-1"
                      >
                        {comp}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400">Sem competências listadas.</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Aba Questionário de Triagem Estruturada */}
        <TabsContent value="triagem">
          <QuestionarioVagaEditor vagaId={vaga.id} vagaTitulo={vaga.titulo} />
        </TabsContent>

        {/* Aba Candidatos */}
        <TabsContent value="candidatos">
          <Card className="border-slate-200 shadow-xs bg-white">
            <CardHeader className="p-5 border-b border-slate-100 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-slate-900">
                  Talentos Vinculados a Esta Posição
                </CardTitle>
                <CardDescription className="text-xs text-slate-500">
                  Classificados por aderência semântica e estágio do processo
                </CardDescription>
              </div>

              <Button
                size="sm"
                onClick={() => navigate('/candidatos')}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-8"
              >
                Adicionar Candidato
              </Button>
            </CardHeader>

            <CardContent className="p-0 divide-y divide-slate-100">
              {candidatos.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  Nenhum candidato associado a esta vaga até o momento.
                </div>
              ) : (
                candidatos.map((cand) => (
                  <div
                    key={cand.id}
                    onClick={() => navigate(`/candidatos/${cand.id}`)}
                    className="p-4 hover:bg-slate-50/70 transition-colors flex items-center justify-between cursor-pointer gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0 border border-blue-200">
                        {cand.nome
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .substring(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 hover:text-blue-600 transition-colors truncate">
                          {cand.nome}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {cand.cargo_atual || 'Candidato'} · {cand.localizacao || 'Brasil'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded text-xs font-bold border border-emerald-200">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        <span>{cand.score_semantico || 75}%</span>
                      </div>

                      <Badge
                        variant="outline"
                        className="text-xs bg-slate-100 text-slate-700 border-slate-200"
                      >
                        {cand.status}
                      </Badge>

                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Métricas de Funil */}
        <TabsContent value="metricas">
          <Card className="border-slate-200 shadow-xs bg-white p-6">
            <CardTitle className="text-base font-bold text-slate-900 pb-4 border-b border-slate-100">
              Taxa de Conversão por Etapa
            </CardTitle>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mt-6">
              {estagios.map((est) => (
                <div key={est} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50">
                  <span className="text-xs font-medium text-slate-500">{est}</span>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-slate-900 tabular-nums">
                      {stageCounts[est]}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">
                      {candidatos.length > 0
                        ? Math.round((stageCounts[est] / candidatos.length) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
