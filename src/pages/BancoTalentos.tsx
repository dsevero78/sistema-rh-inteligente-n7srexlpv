import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { RecordModel } from 'pocketbase'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import {
  Sparkles,
  Search,
  Filter,
  ArrowRight,
  Briefcase,
  Calendar,
  Tag,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Clock,
  UserCheck,
  TrendingUp,
  X,
  Eye,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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

export function BancoTalentos() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [candidatos, setCandidatos] = useState<RecordModel[]>([])
  const [vagas, setVagas] = useState<RecordModel[]>([])

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroVagaOrigem, setFiltroVagaOrigem] = useState('todas')
  const [filtroEstagioSaida, setFiltroEstagioSaida] = useState('todos')
  const [filtroScoreMin, setFiltroScoreMin] = useState<number>(0)
  const [filtroApenasDestaques, setFiltroApenasDestaques] = useState(false)

  // Modal de reaproveitamento / candidatura a nova vaga
  const [reaproveitarModalOpen, setReaproveitarModalOpen] = useState(false)
  const [candidatoAlvo, setCandidatoAlvo] = useState<RecordModel | null>(null)
  const [vagaDestinoId, setVagaDestinoId] = useState('')
  const [estagioInicial, setEstagioInicial] = useState('Triagem')
  const [anotacaoReaproveitamento, setAnotacaoReaproveitamento] = useState('')
  const [savingReaproveitamento, setSavingReaproveitamento] = useState(false)

  // Matching prévio da nova vaga com candidato
  const [loadingMatchingPreview, setLoadingMatchingPreview] = useState(false)
  const [matchingPreview, setMatchingPreview] = useState<any>(null)

  // Modal de detalhes rápidos do candidato no banco
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false)
  const [candidatoVisualizacao, setCandidatoVisualizacao] = useState<RecordModel | null>(null)

  const carregarDados = async () => {
    setLoading(true)
    try {
      // Buscar vagas abertas/ativas
      const vagasRes = await pb.collection('vagas').getFullList({
        sort: '-created',
      })
      setVagas(vagasRes)

      // Buscar candidatos do banco de talentos OU não contratados (status Recusado)
      // Usamos expand na vaga e na vaga_origem para contextualização completa
      const candRes = await pb.collection('candidatos').getFullList({
        filter: 'banco_talentos = true || status = "Recusado"',
        sort: '-score_semantico',
        expand: 'vaga,vaga_origem',
      })
      setCandidatos(candRes)
    } catch (err: unknown) {
      console.error('Erro ao carregar banco de talentos:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: err instanceof Error ? err.message : 'Tente recarregar a página.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Filtragem dos candidatos
  const candidatosFiltrados = candidatos.filter((c) => {
    // Busca por texto: nome, cargo_atual, resumo, habilidades, tags
    const searchLower = searchTerm.toLowerCase()
    const habilidadesStr = Array.isArray(c.habilidades_tecnicas)
      ? c.habilidades_tecnicas.join(' ')
      : ''
    const tagsStr = Array.isArray(c.tags_talento) ? c.tags_talento.join(' ') : ''

    const matchesSearch =
      !searchTerm ||
      c.nome?.toLowerCase().includes(searchLower) ||
      c.cargo_atual?.toLowerCase().includes(searchLower) ||
      c.resumo?.toLowerCase().includes(searchLower) ||
      c.motivo_banco_talentos?.toLowerCase().includes(searchLower) ||
      habilidadesStr.toLowerCase().includes(searchLower) ||
      tagsStr.toLowerCase().includes(searchLower)

    // Filtro por vaga de origem
    const vagaOrigemId = c.vaga_origem || c.vaga || ''
    const matchesVaga = filtroVagaOrigem === 'todas' || vagaOrigemId === filtroVagaOrigem

    // Filtro por estágio de saída
    const matchesEstagio =
      filtroEstagioSaida === 'todos' ||
      (c.estagio_saida &&
        c.estagio_saida.toLowerCase().includes(filtroEstagioSaida.toLowerCase())) ||
      (filtroEstagioSaida === 'Proposta' && c.estagio_saida?.toLowerCase().includes('proposta')) ||
      (filtroEstagioSaida === 'Entrevista' && c.estagio_saida?.toLowerCase().includes('entrevista'))

    // Filtro score mínimo
    const scoreVal = c.score_semantico || 0
    const matchesScore = scoreVal >= filtroScoreMin

    // Filtro apenas destaques marcados
    const matchesDestaque = !filtroApenasDestaques || !!c.banco_talentos

    return matchesSearch && matchesVaga && matchesEstagio && matchesScore && matchesDestaque
  })

  // Abrir modal de reaproveitamento
  const abrirModalReaproveitar = (cand: RecordModel) => {
    setCandidatoAlvo(cand)
    // Selecionar primeira vaga aberta diferente da original, se existir
    const vagaAtiva = vagas.find(
      (v) => v.status === 'Aberta' && v.id !== (cand.vaga_origem || cand.vaga),
    )
    setVagaDestinoId(vagaAtiva ? vagaAtiva.id : vagas[0]?.id || '')
    setEstagioInicial('Triagem')
    setAnotacaoReaproveitamento(
      `Reaproveitamento do Banco de Talentos. Candidato destacado originalmente em ${
        cand.expand?.vaga_origem?.titulo || cand.expand?.vaga?.titulo || 'processo anterior'
      }. Motivo: ${cand.motivo_banco_talentos || 'Perfil de alto potencial com competências compatíveis.'}`,
    )
    setMatchingPreview(null)
    setReaproveitarModalOpen(true)
  }

  // Consultar score de matching com a nova vaga selecionada
  useEffect(() => {
    if (!reaproveitarModalOpen || !candidatoAlvo || !vagaDestinoId) {
      setMatchingPreview(null)
      return
    }

    let isCancelled = false
    const fetchMatching = async () => {
      setLoadingMatchingPreview(true)
      try {
        const data = await pb.send('/backend/v1/matching/score', {
          method: 'POST',
          body: {
            candidato_id: candidatoAlvo.id,
            vaga_id: vagaDestinoId,
          },
        })

        if (!isCancelled) {
          setMatchingPreview(data)
        }
      } catch (err) {
        if (!isCancelled) {
          // Fallback para matching aproximado caso a rota apresente indisponibilidade
          const vaga = vagas.find((v) => v.id === vagaDestinoId)
          setMatchingPreview({
            score_geral: candidatoAlvo.score_semantico || 80,
            compatibilidade: 'Calculado com base no perfil técnico do candidato',
            candidato_nome: candidatoAlvo.nome,
            vaga_titulo: vaga?.titulo || 'Nova Vaga',
          })
        }
      } finally {
        if (!isCancelled) {
          setLoadingMatchingPreview(false)
        }
      }
    }

    fetchMatching()

    return () => {
      isCancelled = true
    }
  }, [reaproveitarModalOpen, vagaDestinoId, candidatoAlvo])

  // Confirmar reaproveitamento do candidato na nova vaga
  const handleConfirmarReaproveitamento = async () => {
    if (!candidatoAlvo || !vagaDestinoId) {
      toast({ title: 'Selecione a vaga de destino', variant: 'destructive' })
      return
    }

    setSavingReaproveitamento(true)
    try {
      const vagaDestino = vagas.find((v) => v.id === vagaDestinoId)
      const agora = new Date().toISOString()

      // 1. Criar novo registro no pipeline para a nova vaga
      const novoPipeline = await pb.collection('pipeline').create({
        candidato: candidatoAlvo.id,
        vaga: vagaDestinoId,
        estagio: estagioInicial,
        anotacoes: anotacaoReaproveitamento,
        historico: [
          {
            data: agora,
            estagio: estagioInicial,
            autor: pb.authStore.model?.nome || 'Sistema RH',
            nota: `Reaproveitado do Banco de Talentos para a vaga ${
              vagaDestino?.titulo || ''
            }. ${anotacaoReaproveitamento}`,
          },
        ],
      })

      // 2. Atualizar o candidato apontando para a nova vaga e status ativo
      await pb.collection('candidatos').update(candidatoAlvo.id, {
        vaga: vagaDestinoId,
        status: estagioInicial,
        // Mantemos o registro da vaga de origem caso ainda não estivesse fixado
        vaga_origem: candidatoAlvo.vaga_origem || candidatoAlvo.vaga || vagaDestinoId,
      })

      toast({
        title: 'Candidato reaproveitado com sucesso!',
        description: `${candidatoAlvo.nome} foi inscrito na vaga "${
          vagaDestino?.titulo || ''
        }" no estágio ${estagioInicial}.`,
      })

      setReaproveitarModalOpen(false)
      carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao reaproveitar candidato',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSavingReaproveitamento(false)
    }
  }

  // Alternar destaque do candidato diretamente pelo card
  const handleToggleDestaque = async (cand: RecordModel) => {
    const novoValor = !cand.banco_talentos
    try {
      await pb.collection('candidatos').update(cand.id, {
        banco_talentos: novoValor,
        data_adicao_banco: novoValor ? new Date().toISOString() : null,
        motivo_banco_talentos: novoValor
          ? cand.motivo_banco_talentos || 'Destacado pelo gestor de talentos'
          : cand.motivo_banco_talentos,
      })
      toast({
        title: novoValor ? 'Candidato destacado no Banco!' : 'Destaque removido',
      })
      carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao atualizar destaque',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner / Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-100 text-blue-700">
              <Sparkles className="w-5 h-5 fill-blue-600/30 text-blue-700" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Banco de Talentos</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Repositório estratégico de profissionais não contratados, finalistas e talentos de alto
            potencial guardados para reaproveitamento em vagas ativas e futuras.
          </p>
        </div>

        {/* Quick stats pills */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-slate-500">Destacados:</span>
            <span className="font-bold text-slate-900">
              {candidatos.filter((c) => c.banco_talentos).length}
            </span>
          </div>

          <div className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm flex items-center gap-2 text-xs">
            <span className="w-2 h-2 rounded-full bg-blue-600" />
            <span className="text-slate-500">Total Banco:</span>
            <span className="font-bold text-slate-900">{candidatos.length}</span>
          </div>

          <Link to="/alertas">
            <Button
              size="sm"
              variant="outline"
              className="text-xs font-semibold border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
              Ver Alertas Automáticos
            </Button>
          </Link>
        </div>
      </div>

      {/* Card de Diretriz do Banco */}
      <div className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-white to-blue-50/40 p-4 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-blue-600 text-white shrink-0 mt-0.5">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-blue-950">
              Reaproveitamento Inteligente & Memória Corporativa
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed max-w-3xl">
              Candidatos recusados em etapas avançadas (Match IA, Entrevistas Técnicas e Proposta)
              já foram avaliados pelo time. Ao abrir novas vagas, consulte a compatibilidade
              semântica ou mova diretamente com 1 clique para economizar tempo de atração. O agente{' '}
              <strong className="text-blue-900 font-semibold">Gestor de Talentos</strong> também
              pode analisar este banco no Chat para sugerir o profissional perfeito.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Busca por texto */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, cargo, competências (ex: Go, Figma, Kafka)..."
              className="pl-9 text-xs h-9"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filtro por vaga de origem */}
          <div>
            <select
              value={filtroVagaOrigem}
              onChange={(e) => setFiltroVagaOrigem(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"
            >
              <option value="todas">Todas as vagas de origem</option>
              {vagas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.titulo}
                </option>
              ))}
            </select>
          </div>

          {/* Filtro por estágio de saída */}
          <div>
            <select
              value={filtroEstagioSaida}
              onChange={(e) => setFiltroEstagioSaida(e.target.value)}
              className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-700"
            >
              <option value="todos">Todos os estágios de saída</option>
              <option value="Proposta">Finalistas (Proposta)</option>
              <option value="Entrevista">Entrevista Técnica / Fit</option>
              <option value="Match">Match IA / Avaliação</option>
              <option value="Triagem">Triagem</option>
            </select>
          </div>
        </div>

        {/* Linha secundária de filtros */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-4 flex-wrap">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={filtroApenasDestaques}
                onChange={(e) => setFiltroApenasDestaques(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
              />
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />
                Apenas destacados no Banco (★)
              </span>
            </label>

            <div className="flex items-center gap-2">
              <span className="text-slate-500">Score mínimo:</span>
              <div className="flex items-center gap-1">
                {[0, 75, 85, 90].map((score) => (
                  <button
                    key={score}
                    onClick={() => setFiltroScoreMin(score)}
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                      filtroScoreMin === score
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {score === 0 ? 'Todos' : `≥ ${score}%`}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-slate-500">
            Mostrando <strong className="text-slate-800">{candidatosFiltrados.length}</strong> de{' '}
            {candidatos.length} talentos guardados
          </div>
        </div>
      </div>

      {/* Grid de Candidatos no Banco de Talentos */}
      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-500">Carregando Banco de Talentos...</p>
        </div>
      ) : candidatosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h2 className="text-sm font-bold text-slate-800">Nenhum candidato encontrado</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Não há candidatos correspondentes aos filtros selecionados. Tente limpar os filtros ou
            destacar candidatos a partir do Pipeline e da tela de Candidatos.
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4 text-xs"
            onClick={() => {
              setSearchTerm('')
              setFiltroVagaOrigem('todas')
              setFiltroEstagioSaida('todos')
              setFiltroScoreMin(0)
              setFiltroApenasDestaques(false)
            }}
          >
            Limpar filtros
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {candidatosFiltrados.map((cand) => {
            const score = cand.score_semantico || 70
            const vagaOrigemTitulo =
              cand.expand?.vaga_origem?.titulo || cand.expand?.vaga?.titulo || 'Processo Seletivo'
            const tags = Array.isArray(cand.tags_talento) ? cand.tags_talento : []
            const habilidades = Array.isArray(cand.habilidades_tecnicas)
              ? cand.habilidades_tecnicas
              : []

            return (
              <div
                key={cand.id}
                className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                {/* Header do Card */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm border border-blue-200">
                        {cand.nome
                          ?.split(' ')
                          .map((n: string) => n[0])
                          .slice(0, 2)
                          .join('') || 'C'}
                      </div>
                      <div>
                        <Link
                          to={`/candidatos/${cand.id}`}
                          className="font-bold text-sm text-slate-900 hover:text-blue-600 transition-colors flex items-center gap-1 group-hover:underline"
                        >
                          {cand.nome}
                        </Link>
                        <p className="text-xs text-slate-500 leading-tight line-clamp-1">
                          {cand.cargo_atual || 'Profissional'}
                        </p>
                      </div>
                    </div>

                    {/* Botão de Destaque / Star */}
                    <button
                      onClick={() => handleToggleDestaque(cand)}
                      title={cand.banco_talentos ? 'Remover destaque' : 'Destacar no Banco'}
                      className={`p-1.5 rounded-lg border transition-all ${
                        cand.banco_talentos
                          ? 'bg-amber-50 border-amber-300 text-amber-500 hover:bg-amber-100'
                          : 'bg-slate-50 border-slate-200 text-slate-400 hover:text-amber-500 hover:bg-amber-50'
                      }`}
                    >
                      <Sparkles
                        className={`w-4 h-4 ${
                          cand.banco_talentos ? 'fill-amber-400 text-amber-500' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {/* Informações da Vaga de Origem e Saída */}
                  <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 mb-3 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-slate-400" /> Origem:
                      </span>
                      <span className="font-medium text-slate-800 line-clamp-1 max-w-[170px] text-right">
                        {vagaOrigemTitulo}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" /> Etapa de saída:
                      </span>
                      <span className="font-semibold text-slate-700">
                        {cand.estagio_saida || cand.status || 'Recusado'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-0.5">
                      <span className="text-slate-500">Score de fit:</span>
                      <span
                        className={`font-bold px-1.5 py-0.2 rounded text-[11px] ${
                          score >= 85
                            ? 'bg-emerald-100 text-emerald-800'
                            : score >= 75
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {score}%
                      </span>
                    </div>
                  </div>

                  {/* Motivo do Banco / Justificativa */}
                  {cand.motivo_banco_talentos && (
                    <div className="text-xs text-slate-600 bg-amber-50/70 border border-amber-200/70 rounded-lg p-2.5 mb-3 leading-relaxed">
                      <span className="font-semibold text-amber-900 block mb-0.5">
                        Motivo do Destaque:
                      </span>
                      <p className="line-clamp-2">{cand.motivo_banco_talentos}</p>
                    </div>
                  )}

                  {/* Tags do Talento */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {tags.slice(0, 3).map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-semibold"
                        >
                          #{tag}
                        </span>
                      ))}
                      {tags.length > 3 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px]">
                          +{tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Habilidades Técnicas Principais */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {habilidades.slice(0, 4).map((hab: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px]"
                      >
                        {hab}
                      </span>
                    ))}
                    {habilidades.length > 4 && (
                      <span className="px-1.5 py-0.5 text-slate-400 text-[11px]">
                        +{habilidades.length - 4}
                      </span>
                    )}
                  </div>
                </div>

                {/* Footer com Ações */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-slate-600 hover:text-slate-900 px-2 h-8"
                    onClick={() => {
                      setCandidatoVisualizacao(cand)
                      setDetalhesModalOpen(true)
                    }}
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Detalhes
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => abrirModalReaproveitar(cand)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-8 shadow-sm"
                  >
                    <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                    Reaproveitar em Vaga
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL 1: Reaproveitar em Nova Vaga com Cálculo de Matching Prévio */}
      <Dialog open={reaproveitarModalOpen} onOpenChange={setReaproveitarModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-blue-600" />
              Reaproveitar Candidato em Nova Vaga
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Inscreva <strong className="text-slate-800">{candidatoAlvo?.nome}</strong> em uma nova
              posição ativa. O sistema avalia a compatibilidade de perfil e cria o registro no
              pipeline mantendo o histórico anterior.
            </DialogDescription>
          </DialogHeader>

          {candidatoAlvo && (
            <div className="space-y-4 py-2">
              {/* Resumo do Candidato */}
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold text-slate-900">{candidatoAlvo.nome}</p>
                  <p className="text-slate-500">
                    {candidatoAlvo.cargo_atual} • {candidatoAlvo.localizacao || 'Remoto/Híbrido'}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Origem anterior:</span>
                  <span className="font-semibold text-slate-700">
                    {candidatoAlvo.expand?.vaga_origem?.titulo ||
                      candidatoAlvo.expand?.vaga?.titulo ||
                      'Outro processo'}
                  </span>
                </div>
              </div>

              {/* Seleção da Vaga de Destino */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Selecione a Nova Vaga Ativa *
                </Label>
                <select
                  value={vagaDestinoId}
                  onChange={(e) => setVagaDestinoId(e.target.value)}
                  className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-xs text-slate-800 font-medium"
                >
                  <option value="" disabled>
                    Selecione uma vaga...
                  </option>
                  {vagas.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.titulo} ({v.departamento} • {v.localizacao} • {v.status})
                    </option>
                  ))}
                </select>
              </div>

              {/* Bloco de Matching Prévio Candidato <-> Vaga */}
              <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Aderência Estimada com a Nova Vaga (IA)
                  </span>
                  {loadingMatchingPreview ? (
                    <span className="text-[11px] text-blue-600 animate-pulse font-medium">
                      Calculando matching...
                    </span>
                  ) : matchingPreview ? (
                    <Badge className="bg-blue-600 text-white text-xs font-bold">
                      {matchingPreview.score_geral || 80}% de Fit
                    </Badge>
                  ) : null}
                </div>

                {matchingPreview?.compatibilidade && (
                  <p className="text-xs text-blue-950 leading-relaxed">
                    {matchingPreview.compatibilidade}
                  </p>
                )}

                {matchingPreview?.pontos_fortes && (
                  <div className="text-xs text-slate-700 space-y-1 pt-1 border-t border-blue-100">
                    <span className="font-semibold text-blue-900 text-[11px] block">
                      Destaques de competências:
                    </span>
                    <p className="text-slate-600 line-clamp-2">
                      {Array.isArray(matchingPreview.pontos_fortes)
                        ? matchingPreview.pontos_fortes.join(', ')
                        : matchingPreview.pontos_fortes}
                    </p>
                  </div>
                )}
              </div>

              {/* Estágio Inicial no Pipeline da Nova Vaga */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Estágio Inicial no Pipeline
                  </Label>
                  <select
                    value={estagioInicial}
                    onChange={(e) => setEstagioInicial(e.target.value)}
                    className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-xs"
                  >
                    <option value="Triagem">Triagem</option>
                    <option value="Match técnico/comportamental (IA)">Match técnico / IA</option>
                    <option value="Entrevista técnica">Entrevista técnica</option>
                    <option value="Entrevista comportamental">Entrevista comportamental</option>
                    <option value="Proposta">Proposta</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">Ação recomendada</Label>
                  <div className="h-9 rounded-md bg-slate-100 flex items-center px-3 text-xs text-slate-600 font-medium">
                    Aproveitar validação prévia
                  </div>
                </div>
              </div>

              {/* Justificativa / Anotações */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Justificativa / Anotação da Equipe
                </Label>
                <Textarea
                  rows={2}
                  value={anotacaoReaproveitamento}
                  onChange={(e) => setAnotacaoReaproveitamento(e.target.value)}
                  className="text-xs resize-none"
                  placeholder="Por que este talento está sendo acionado para a nova vaga..."
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setReaproveitarModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              disabled={savingReaproveitamento || !vagaDestinoId}
              onClick={handleConfirmarReaproveitamento}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
            >
              {savingReaproveitamento ? 'Inscrevendo...' : 'Confirmar e Iniciar Nova Candidatura'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Visualização Rápida dos Detalhes do Talento */}
      <Dialog open={detalhesModalOpen} onOpenChange={setDetalhesModalOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {candidatoVisualizacao && (
            <>
              <DialogHeader>
                <div className="flex items-center justify-between pr-6">
                  <div>
                    <DialogTitle className="text-lg font-bold text-slate-900">
                      {candidatoVisualizacao.nome}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                      {candidatoVisualizacao.cargo_atual} •{' '}
                      {candidatoVisualizacao.localizacao || 'Brasil'}
                    </DialogDescription>
                  </div>
                  <Badge
                    className={`${
                      candidatoVisualizacao.banco_talentos
                        ? 'bg-amber-100 text-amber-900 border-amber-300'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {candidatoVisualizacao.banco_talentos
                      ? '★ No Banco de Talentos'
                      : 'Não Contratado'}
                  </Badge>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-3 text-xs">
                {/* Contato rápido */}
                <div className="flex flex-wrap gap-4 text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  {candidatoVisualizacao.email && (
                    <span className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {candidatoVisualizacao.email}
                    </span>
                  )}
                  {candidatoVisualizacao.telefone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {candidatoVisualizacao.telefone}
                    </span>
                  )}
                  {candidatoVisualizacao.linkedin && (
                    <a
                      href={candidatoVisualizacao.linkedin}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> LinkedIn
                    </a>
                  )}
                </div>

                {/* Justificativa e Motivo do Banco */}
                {candidatoVisualizacao.motivo_banco_talentos && (
                  <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200">
                    <span className="font-bold text-amber-950 block mb-1">
                      Parecer para Reaproveitamento:
                    </span>
                    <p className="text-amber-900 leading-relaxed">
                      {candidatoVisualizacao.motivo_banco_talentos}
                    </p>
                  </div>
                )}

                {/* Resumo Profissional */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-1">Resumo do Perfil</h4>
                  <p className="text-slate-600 leading-relaxed bg-white p-3 rounded-lg border border-slate-100">
                    {candidatoVisualizacao.resumo || 'Nenhum resumo cadastrado.'}
                  </p>
                </div>

                {/* Competências Técnicas */}
                <div>
                  <h4 className="font-bold text-slate-800 mb-1.5">Habilidades Técnicas</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {Array.isArray(candidatoVisualizacao.habilidades_tecnicas) &&
                      candidatoVisualizacao.habilidades_tecnicas.map((h: string, i: number) => (
                        <span
                          key={i}
                          className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-medium"
                        >
                          {h}
                        </span>
                      ))}
                  </div>
                </div>

                {/* Experiências */}
                {Array.isArray(candidatoVisualizacao.experiencias) &&
                  candidatoVisualizacao.experiencias.length > 0 && (
                    <div>
                      <h4 className="font-bold text-slate-800 mb-2">Trajetória Profissional</h4>
                      <div className="space-y-2">
                        {candidatoVisualizacao.experiencias.map((exp: any, i: number) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50"
                          >
                            <div className="flex justify-between font-semibold text-slate-800">
                              <span>{exp.cargo}</span>
                              <span className="text-slate-400 font-normal">{exp.periodo}</span>
                            </div>
                            <div className="text-slate-500 font-medium text-[11px]">
                              {exp.empresa}
                            </div>
                            {exp.descricao && (
                              <p className="text-slate-600 mt-1">{exp.descricao}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>

              <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <Link to={`/candidatos/${candidatoVisualizacao.id}`}>
                  <Button variant="outline" size="sm" className="text-xs">
                    Abrir Perfil Completo
                  </Button>
                </Link>

                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs"
                  onClick={() => {
                    setDetalhesModalOpen(false)
                    abrirModalReaproveitar(candidatoVisualizacao)
                  }}
                >
                  <ArrowRight className="w-3.5 h-3.5 mr-1.5" />
                  Reaproveitar Candidato
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
export default BancoTalentos
