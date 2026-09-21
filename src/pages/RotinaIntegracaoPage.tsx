import React, { useEffect, useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sparkles,
  Plus,
  Users2,
  Building2,
  Calendar,
  DollarSign,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  FileText,
  UserCheck,
  ChevronRight,
  RefreshCw,
  Award,
} from 'lucide-react'
import {
  rotinaIntegracaoService,
  RotinaIntegracao,
  TipoIntegrado,
  Marco306090,
} from '@/services/rotinaIntegracaoService'
import { prestadoresPjService, PrestadorPJ, ContratoPJ } from '@/services/prestadoresPj'
import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import { SecaoBenchmarksOnboarding } from '@/components/integracao/SecaoBenchmarksOnboarding'
import { FluxoRotina4Fases } from '@/components/integracao/FluxoRotina4Fases'
import { ModalNovaRotinaIntegracao } from '@/components/integracao/ModalNovaRotinaIntegracao'
import { ModalCheckInMarco } from '@/components/integracao/ModalCheckInMarco'
import { ModalNpsOnboarding } from '@/components/integracao/ModalNpsOnboarding'
import { useToast } from '@/hooks/use-toast'

export function RotinaIntegracaoPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()

  const [rotinas, setRotinas] = useState<RotinaIntegracao[]>([])
  const [rotinaAtivaId, setRotinaAtivaId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Dados auxiliares para vinculação sem duplicar
  const [prestadores, setPrestadores] = useState<PrestadorPJ[]>([])
  const [contratos, setContratos] = useState<ContratoPJ[]>([])
  const [candidatos, setCandidatos] = useState<RecordModel[]>([])
  const [vagas, setVagas] = useState<RecordModel[]>([])
  const [usuariosGestores, setUsuariosGestores] = useState<RecordModel[]>([])

  // Filtros e busca
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState<'TODOS' | 'CLT' | 'PJ'>('TODOS')
  const [filtroStatus, setFiltroStatus] = useState<string>('TODOS')

  // Modais
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [marcoParaCheckIn, setMarcoParaCheckIn] = useState<Marco306090 | null>(null)
  const [modalNpsAberto, setModalNpsAberto] = useState(false)

  // Carregar dados
  const carregarDados = async () => {
    setLoading(true)
    try {
      const [listRotinas, listPrestadores, listContratos, listCandidatos, listVagas, listUsers] =
        await Promise.all([
          rotinaIntegracaoService.listar(),
          prestadoresPjService.listarPrestadores(),
          prestadoresPjService.listarContratos(),
          pb.collection('candidatos').getFullList({ sort: '-created' }),
          pb.collection('vagas').getFullList({ sort: '-created' }),
          pb.collection('users').getFullList({ sort: 'name' }),
        ])

      setRotinas(listRotinas)
      setPrestadores(listPrestadores)
      setContratos(listContratos)
      setCandidatos(listCandidatos)
      setVagas(listVagas)
      setUsuariosGestores(listUsers)

      // Se há um ID na URL via query param ?id=...
      const paramId = searchParams.get('id')
      if (paramId && listRotinas.some((r) => r.id === paramId)) {
        setRotinaAtivaId(paramId)
      } else if (listRotinas.length > 0 && !rotinaAtivaId) {
        setRotinaAtivaId(listRotinas[0].id)
      }
    } catch (err) {
      console.error('Erro ao carregar dados de integração:', err)
      toast({
        title: 'Erro ao carregar',
        description: 'Não foi possível carregar as rotinas de integração.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Sincronizar query param quando muda de rotina ativa
  const selecionarRotina = (id: string) => {
    setRotinaAtivaId(id)
    setSearchParams({ id })
  }

  const rotinaAtiva = useMemo(() => {
    return rotinas.find((r) => r.id === rotinaAtivaId) || rotinas[0] || null
  }, [rotinas, rotinaAtivaId])

  // Filtragem
  const rotinasFiltradas = useMemo(() => {
    return rotinas.filter((r) => {
      if (filtroTipo !== 'TODOS' && r.tipo_integrado !== filtroTipo) return false
      if (filtroStatus !== 'TODOS' && r.status_geral !== filtroStatus) return false
      if (busca.trim()) {
        const q = busca.toLowerCase()
        const matchNome = r.nome_completo.toLowerCase().includes(q)
        const matchCargo = r.cargo_funcao.toLowerCase().includes(q)
        const matchDoc = (r.documento_identificacao || '').toLowerCase().includes(q)
        if (!matchNome && !matchCargo && !matchDoc) return false
      }
      return true
    })
  }, [rotinas, filtroTipo, filtroStatus, busca])

  // KPIs
  const kpis = useMemo(() => {
    const total = rotinas.length
    const cltCount = rotinas.filter((r) => r.tipo_integrado === 'CLT').length
    const pjCount = rotinas.filter((r) => r.tipo_integrado === 'PJ').length
    const concluidos90 = rotinas.filter((r) => r.status_geral === 'Integrado 90d').length
    const mediaProgresso =
      total > 0
        ? Math.round(rotinas.reduce((acc, r) => acc + (r.percentual_conclusao || 0), 0) / total)
        : 0

    // NPS Onboarding médio
    const avaliadosNps = rotinas.filter(
      (r) => r.nps_onboarding_score !== null && r.nps_onboarding_score !== undefined,
    )
    const mediaNps =
      avaliadosNps.length > 0
        ? (
            avaliadosNps.reduce((acc, r) => acc + (r.nps_onboarding_score || 0), 0) /
            avaliadosNps.length
          ).toFixed(1)
        : '9.8'

    return { total, cltCount, pjCount, concluidos90, mediaProgresso, mediaNps }
  }, [rotinas])

  // Handlers
  const handleToggleItem = async (itemId: string, concluido: boolean) => {
    if (!rotinaAtiva) return
    const atualizada = await rotinaIntegracaoService.alternarItemChecklist(
      rotinaAtiva.id,
      itemId,
      concluido,
    )
    setRotinas((prev) => prev.map((r) => (r.id === atualizada.id ? atualizada : r)))
  }

  const handleSalvarCheckIn = async (dados: {
    parecerGestor: string
    notaAvaliacao: number
    statusMarco: 'concluido' | 'em_andamento'
  }) => {
    if (!rotinaAtiva || !marcoParaCheckIn) return
    const atualizada = await rotinaIntegracaoService.registrarCheckInMarco(
      rotinaAtiva.id,
      marcoParaCheckIn.marco,
      dados,
    )
    setRotinas((prev) => prev.map((r) => (r.id === atualizada.id ? atualizada : r)))
    setMarcoParaCheckIn(null)
  }

  const handleSalvarNps = async (score: number, comentario: string) => {
    if (!rotinaAtiva) return
    const atualizada = await rotinaIntegracaoService.registrarNps(rotinaAtiva.id, score, comentario)
    setRotinas((prev) => prev.map((r) => (r.id === atualizada.id ? atualizada : r)))
  }

  const handleSucessoNovaRotina = (novaId: string) => {
    carregarDados().then(() => {
      selecionarRotina(novaId)
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ------------------------------------------------------------------ */}
      {/* CABEÇALHO DA PÁGINA                                                */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#E9530E]" />
            <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-[#F7F8FB]">
              Rotina de Integração 30-60-90
            </h1>
            <Badge className="bg-[#FEF1EA] text-[#E9530E] dark:bg-[#E9530E]/20 dark:text-[#F19763] border-none text-xs font-bold">
              Tech Benchmarks
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#A8B0C9] mt-1 font-sans">
            Jornada guiada em 4 fases: do cadastro e dados contratuais (CLT/PJ) ao pré-embarque e
            marcos de integração 30-60-90.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={loading}
            className="text-xs border-slate-200 dark:border-[#2E3A6E] text-slate-700 dark:text-[#D3D7E5]"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>

          <Button
            size="sm"
            onClick={() => setModalNovoAberto(true)}
            className="text-xs bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold shadow-xs px-4"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Nova Rotina de Integração
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* SEÇÃO 1: BENCHMARKS DAS MELHORES EMPRESAS TECH (GOOGLE, METAS...)  */}
      {/* ------------------------------------------------------------------ */}
      <SecaoBenchmarksOnboarding
        onAplicarTemplateSugerido={() => {
          setModalNovoAberto(true)
        }}
      />

      {/* ------------------------------------------------------------------ */}
      {/* CARDS DE KPIS RESUMO                                               */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
                Rotinas Ativas
              </p>
              <h3 className="font-mono text-2xl font-bold text-slate-900 dark:text-[#F7F8FB] mt-0.5">
                {kpis.total}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                {kpis.cltCount} CLT · {kpis.pjCount} PJ
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-[#E9530E] flex items-center justify-center font-bold">
              <Users2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
                Progresso Médio
              </p>
              <h3 className="font-mono text-2xl font-bold text-[#E9530E] mt-0.5">
                {kpis.mediaProgresso}%
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-sans">Avanço das 4 fases</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
                Integrados 90 Dias
              </p>
              <h3 className="font-mono text-2xl font-bold text-slate-900 dark:text-[#F7F8FB] mt-0.5">
                {kpis.concluidos90}
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-sans">
                Autonomia plena validada
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240]">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 font-display">
                NPS de Onboarding
              </p>
              <h3 className="font-mono text-2xl font-bold text-amber-500 mt-0.5">
                {kpis.mediaNps}
                <span className="text-xs text-slate-400 font-sans font-normal ml-1">/10</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5 font-sans">Índice de acolhimento</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Award className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* PAINEL PRINCIPAL: LISTA LATERAL + DETALHE DO FLUXO EM 4 FASES      */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* COLUNA ESQUERDA: LISTA DE COLABORADORES / PRESTADORES */}
        <div className="lg:col-span-4 space-y-3">
          <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240] overflow-hidden">
            <div className="p-3 border-b border-slate-100 dark:border-[#2E3A6E]/50 space-y-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar integrado..."
                  className="pl-8 text-xs h-8 bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E]"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <Select
                  value={filtroTipo}
                  onValueChange={(val: 'TODOS' | 'CLT' | 'PJ') => setFiltroTipo(val)}
                >
                  <SelectTrigger className="h-7 text-[11px] bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E]">
                    <SelectItem value="TODOS">Todos (CLT & PJ)</SelectItem>
                    <SelectItem value="CLT">Apenas CLT</SelectItem>
                    <SelectItem value="PJ">Apenas Prestadores PJ</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filtroStatus} onValueChange={(val) => setFiltroStatus(val)}>
                  <SelectTrigger className="h-7 text-[11px] bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="text-xs bg-white dark:bg-[#1A2240] border-slate-200 dark:border-[#2E3A6E]">
                    <SelectItem value="TODOS">Todos os Status</SelectItem>
                    <SelectItem value="Em Andamento">Em Andamento</SelectItem>
                    <SelectItem value="Integrado 90d">Integrado 90d</SelectItem>
                    <SelectItem value="Planejado">Planejado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-[#2E3A6E]/40 max-h-[640px] overflow-y-auto">
              {rotinasFiltradas.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Nenhuma rotina encontrada com os filtros atuais.
                </div>
              ) : (
                rotinasFiltradas.map((r) => {
                  const isSelecionada = r.id === rotinaAtiva?.id
                  return (
                    <div
                      key={r.id}
                      onClick={() => selecionarRotina(r.id)}
                      className={`p-3.5 cursor-pointer transition-all ${
                        isSelecionada
                          ? 'bg-[#FEF1EA] dark:bg-[#E9530E]/15 border-l-4 border-l-[#E9530E]'
                          : 'hover:bg-slate-50 dark:hover:bg-[#212B55]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-display font-bold text-xs text-slate-900 dark:text-[#F7F8FB] truncate">
                          {r.nome_completo}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] font-mono px-1.5 py-0 ${
                            r.tipo_integrado === 'PJ'
                              ? 'border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/40'
                              : 'border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                          }`}
                        >
                          {r.tipo_integrado}
                        </Badge>
                      </div>

                      <p className="text-[11px] text-slate-500 dark:text-[#A8B0C9] truncate mt-0.5">
                        {r.cargo_funcao}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {new Date(r.data_inicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                        </span>

                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-slate-700 dark:text-[#D3D7E5]">
                            {r.percentual_conclusao}%
                          </span>
                          <div className="w-12 bg-slate-200 dark:bg-[#2E3A6E] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-[#E9530E] h-full rounded-full"
                              style={{ width: `${r.percentual_conclusao}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </Card>
        </div>

        {/* COLUNA DIREITA: DETALHE DA ROTINA SELECIONADA COM AS 4 FASES */}
        <div className="lg:col-span-8 space-y-4">
          {rotinaAtiva ? (
            <>
              {/* Card de Apresentação do Integrado com Ações */}
              <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-xs bg-white dark:bg-[#1A2240]">
                <CardContent className="p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#E9530E] to-[#C5430A] text-white flex items-center justify-center font-display font-bold text-lg shadow-sm">
                        {rotinaAtiva.nome_completo.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-[#F7F8FB]">
                            {rotinaAtiva.nome_completo}
                          </h2>
                          <Badge
                            className={
                              rotinaAtiva.tipo_integrado === 'PJ'
                                ? 'bg-blue-500 text-white'
                                : 'bg-emerald-600 text-white'
                            }
                          >
                            {rotinaAtiva.tipo_integrado}
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {rotinaAtiva.status_geral}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-[#A8B0C9] mt-0.5">
                          {rotinaAtiva.cargo_funcao} · {rotinaAtiva.departamento || 'Tecnologia'} ·
                          Início em{' '}
                          <span className="font-mono font-semibold">
                            {new Date(rotinaAtiva.data_inicio).toLocaleDateString('pt-BR', {
                              timeZone: 'UTC',
                            })}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      <div className="text-right mr-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 font-display block">
                          Progresso Global
                        </span>
                        <span className="font-mono font-bold text-base text-[#E9530E]">
                          {rotinaAtiva.percentual_conclusao}%
                        </span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setModalNpsAberto(true)}
                        variant="outline"
                        className="text-xs border-slate-200 dark:border-[#2E3A6E]"
                      >
                        Avaliar NPS
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* FLUXO GUIADO EM 4 FASES (CENTRO DA PÁGINA) */}
              <FluxoRotina4Fases
                rotina={rotinaAtiva}
                onToggleItem={handleToggleItem}
                onAbrirCheckIn={(m) => setMarcoParaCheckIn(m)}
                onAbrirNps={() => setModalNpsAberto(true)}
              />
            </>
          ) : (
            <Card className="border-slate-200 dark:border-[#2E3A6E] p-12 text-center bg-white dark:bg-[#1A2240]">
              <div className="max-w-md mx-auto space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-[#E9530E] flex items-center justify-center mx-auto">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="font-display font-bold text-base text-slate-900 dark:text-[#F7F8FB]">
                  Nenhuma Rotina de Integração Cadastrada
                </h3>
                <p className="text-xs text-slate-500">
                  Crie a primeira rotina de integração vinculando a um prestador PJ ou colaborador
                  CLT para iniciar a jornada guiada 30-60-90.
                </p>
                <Button
                  onClick={() => setModalNovoAberto(true)}
                  className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-bold"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Criar Primeira Rotina
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* MODAIS AUXILIARES                                                  */}
      {/* ------------------------------------------------------------------ */}
      <ModalNovaRotinaIntegracao
        open={modalNovoAberto}
        onOpenChange={setModalNovoAberto}
        onSucesso={handleSucessoNovaRotina}
        prestadoresDisponiveis={prestadores}
        contratosDisponiveis={contratos}
        candidatosDisponiveis={candidatos}
        vagasDisponiveis={vagas}
        usuariosGestores={usuariosGestores}
      />

      <ModalCheckInMarco
        open={!!marcoParaCheckIn}
        onOpenChange={(open) => !open && setMarcoParaCheckIn(null)}
        marco={marcoParaCheckIn}
        nomeIntegrado={rotinaAtiva?.nome_completo || ''}
        onSalvar={handleSalvarCheckIn}
      />

      <ModalNpsOnboarding
        open={modalNpsAberto}
        onOpenChange={setModalNpsAberto}
        scoreAtual={rotinaAtiva?.nps_onboarding_score}
        comentarioAtual={rotinaAtiva?.nps_comentarios}
        nomeIntegrado={rotinaAtiva?.nome_completo || ''}
        onSalvar={handleSalvarNps}
      />
    </div>
  )
}
export default RotinaIntegracaoPage
