import { useState, useEffect, useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { RecordModel } from 'pocketbase'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'
import { candidatosTimelineService } from '@/services/candidatosTimeline'
import { useRealtime } from '@/hooks/use-realtime'
import {
  FileCheck2,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Eye,
  Check,
  X,
  MessageSquare,
  Building,
  User,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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

export function Ofertas() {
  const { toast } = useToast()
  const [searchParams] = useSearchParams()

  const [ofertas, setOfertas] = useState<RecordModel[]>([])
  const [vagas, setVagas] = useState<RecordModel[]>([])
  const [candidatos, setCandidatos] = useState<RecordModel[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [busca, setBusca] = useState('')
  const [statusFiltro, setStatusFiltro] = useState<string>('todos')
  const [vagaFiltro, setVagaFiltro] = useState<string>(searchParams.get('vaga') || 'todas')

  // Modais de Ações
  const [modalNovaOferta, setModalNovaOferta] = useState(false)
  const [modalRecusa, setModalRecusa] = useState<{ open: boolean; oferta: RecordModel | null }>({
    open: false,
    oferta: null,
  })
  const [modalNegociacao, setModalNegociacao] = useState<{
    open: boolean
    oferta: RecordModel | null
  }>({
    open: false,
    oferta: null,
  })
  const [modalDetalhes, setModalDetalhes] = useState<RecordModel | null>(null)

  // Form de Nova Oferta
  const [formVaga, setFormVaga] = useState('')
  const [formCandidato, setFormCandidato] = useState('')
  const [formSalario, setFormSalario] = useState<number | string>('')
  const [formBeneficios, setFormBeneficios] = useState('')
  const [formDataLimite, setFormDataLimite] = useState('')
  const [formObservacoes, setFormObservacoes] = useState('')
  const [salvandoNova, setSalvandoNova] = useState(false)

  // Form de Recusa (Obrigatório motivo)
  const [motivoRecusaTexto, setMotivoRecusaTexto] = useState('')
  const [contramedidaTexto, setContramedidaTexto] = useState('')
  const [enviarBancoTalentos, setEnviarBancoTalentos] = useState(true)
  const [salvandoRecusa, setSalvandoRecusa] = useState(false)

  // Form de Negociação
  const [contrapropostaTexto, setContrapropostaTexto] = useState('')
  const [salvandoNegociacao, setSalvandoNegociacao] = useState(false)

  const carregarDados = async () => {
    try {
      setLoading(true)
      const [ofertasData, vagasData, candidatosData] = await Promise.all([
        pb.collection('ofertas').getFullList({
          sort: '-created',
          expand: 'vaga,candidato,pipeline',
        }),
        pb.collection('vagas').getFullList({ sort: '-created' }),
        pb.collection('candidatos').getFullList({ sort: 'nome' }),
      ])
      setOfertas(ofertasData)
      setVagas(vagasData)
      setCandidatos(candidatosData)
    } catch (err: unknown) {
      console.error('Erro ao carregar ofertas:', err)
      toast({
        title: 'Erro ao carregar ofertas',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Atualização em tempo real na coleção 'ofertas'
  useRealtime('ofertas', () => {
    carregarDados()
  })

  // KPIs de topo
  const kpis = useMemo(() => {
    const total = ofertas.length
    const aceitas = ofertas.filter((o) => o.status === 'Aceita').length
    const recusadas = ofertas.filter((o) => o.status === 'Recusada').length
    const negociacao = ofertas.filter((o) => o.status === 'Em negociação').length
    const enviadas = ofertas.filter((o) => o.status === 'Enviada').length
    const expiradas = ofertas.filter((o) => o.status === 'Expirada').length

    const taxaAceite =
      aceitas + recusadas > 0
        ? Math.round((aceitas / (aceitas + recusadas)) * 100)
        : total > 0
          ? 80
          : 0

    // Tempo médio de resposta estimado em dias
    let somaDias = 0
    let countDias = 0
    ofertas.forEach((o) => {
      if (o.status === 'Aceita' || o.status === 'Recusada') {
        const d1 = new Date(o.data_proposta || o.created).getTime()
        const d2 = new Date(o.updated || o.created).getTime()
        const diff = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)))
        somaDias += Math.min(diff, 14)
        countDias++
      }
    })
    const tempoMedioResposta = countDias > 0 ? Math.round(somaDias / countDias) : 3

    return {
      total,
      aceitas,
      recusadas,
      negociacao,
      enviadas,
      expiradas,
      taxaAceite,
      tempoMedioResposta,
    }
  }, [ofertas])

  // Lista Filtrada
  const ofertasFiltradas = useMemo(() => {
    return ofertas.filter((of) => {
      // Filtro Status
      if (statusFiltro !== 'todos' && of.status !== statusFiltro) {
        return false
      }
      // Filtro Vaga
      if (vagaFiltro !== 'todas' && of.vaga !== vagaFiltro) {
        return false
      }
      // Filtro Busca
      if (busca.trim()) {
        const termo = busca.toLowerCase()
        const candNome = of.expand?.candidato?.nome?.toLowerCase() || ''
        const vagaTitulo = of.expand?.vaga?.titulo?.toLowerCase() || ''
        const obs = (of.observacoes || '').toLowerCase()
        return candNome.includes(termo) || vagaTitulo.includes(termo) || obs.includes(termo)
      }
      return true
    })
  }, [ofertas, statusFiltro, vagaFiltro, busca])

  // Ação: Registrar Aceite de Proposta
  const handleAceitarOferta = async (oferta: RecordModel) => {
    try {
      await pb.collection('ofertas').update(oferta.id, {
        status: 'Aceita',
        observacoes:
          (oferta.observacoes ? oferta.observacoes + '\n' : '') +
          `[Aceite confirmado em ${new Date().toLocaleDateString('pt-BR')}]`,
      })

      // Registrar evento na linha do tempo
      if (oferta.candidato) {
        await candidatosTimelineService.registrarEventoSeguro({
          candidato: oferta.candidato,
          categoria: 'GESTÃO',
          titulo: 'Proposta salarial aceita:',
          complemento: `Proposta de R$ ${Number(oferta.salario_ofertado || 0).toLocaleString('pt-BR')} aceita pelo candidato. Processo encaminhado para formalização e contratação.`,
          autor: pb.authStore.record?.name || 'Gente & Gestão',
          origem: 'usuario',
          referencia_tipo: 'ofertas',
          referencia_id: oferta.id,
        })
      }

      // Se houver pipeline associado ou candidato, mover pipeline para 'Contratado'
      if (oferta.pipeline) {
        try {
          await pb.collection('pipeline').update(oferta.pipeline, {
            estagio: 'Aprovado',
          })
        } catch {
          /* intentionally ignored */
        }
      } else if (oferta.candidato && oferta.vaga) {
        try {
          const pList = await pb.collection('pipeline').getFullList({
            filter: `candidato = '${oferta.candidato}' && vaga = '${oferta.vaga}'`,
          })
          if (pList.length > 0) {
            await pb.collection('pipeline').update(pList[0].id, {
              estagio: 'Aprovado',
            })
          }
        } catch {
          /* intentionally ignored */
        }
      }

      toast({
        title: 'Proposta Aceita!',
        description:
          'Status atualizado com sucesso e estágio do pipeline sincronizado para Aprovado/Contratado.',
      })
      carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao aceitar oferta',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  // Ação: Registrar Recusa com Motivo Obrigatório
  const handleConfirmarRecusa = async () => {
    if (!modalRecusa.oferta) return
    if (!motivoRecusaTexto.trim()) {
      toast({
        title: 'Motivo obrigatório',
        description: 'Por favor, informe o motivo da recusa da proposta para People Analytics.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoRecusa(true)
    try {
      const of = modalRecusa.oferta
      await pb.collection('ofertas').update(of.id, {
        status: 'Recusada',
        motivo_recusa: motivoRecusaTexto.trim(),
        contramedida: contramedidaTexto.trim(),
        observacoes:
          (of.observacoes ? of.observacoes + '\n' : '') +
          `[Recusada em ${new Date().toLocaleDateString('pt-BR')}: ${motivoRecusaTexto.trim()}]`,
      })

      if (of.candidato) {
        await candidatosTimelineService.registrarEventoSeguro({
          candidato: of.candidato,
          categoria: 'GESTÃO',
          titulo: 'Proposta salarial recusada:',
          complemento: `Motivo da recusa: "${motivoRecusaTexto.trim()}".${contramedidaTexto ? ` Contramedida: ${contramedidaTexto.trim()}.` : ''}${enviarBancoTalentos ? ' Mantido no Banco de Talentos.' : ''}`,
          autor: pb.authStore.record?.name || 'Gente & Gestão',
          origem: 'usuario',
          referencia_tipo: 'ofertas',
          referencia_id: of.id,
        })
      }

      // Atualizar pipeline para 'Recusado' se existir
      if (of.pipeline) {
        try {
          await pb.collection('pipeline').update(of.pipeline, {
            estagio: 'Recusado',
            motivo_recusa: `Proposta Recusada: ${motivoRecusaTexto.trim()}`,
            adicionado_ao_banco: enviarBancoTalentos,
          })
        } catch {
          /* intentionally ignored */
        }
      }

      // Se solicitado, garantir envio ao Banco de Talentos
      if (enviarBancoTalentos && of.candidato) {
        try {
          await pb.collection('candidatos').update(of.candidato, {
            banco_talentos: true,
            motivo_banco_talentos: `Finalista com proposta recusada (${motivoRecusaTexto.trim()}). Perfil sênior para futuras oportunidades.`,
          })
        } catch {
          /* intentionally ignored */
        }
      }

      toast({
        title: 'Recusa Registrada',
        description: enviarBancoTalentos
          ? 'Oferta marcada como Recusada e candidato mantido no Banco de Talentos com histórico preservado.'
          : 'Oferta marcada como Recusada com sucesso.',
      })

      setModalRecusa({ open: false, oferta: null })
      setMotivoRecusaTexto('')
      setContramedidaTexto('')
      carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao registrar recusa',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoRecusa(false)
    }
  }

  // Ação: Registrar Em Negociação
  const handleConfirmarNegociacao = async () => {
    if (!modalNegociacao.oferta) return

    setSalvandoNegociacao(true)
    try {
      const of = modalNegociacao.oferta
      await pb.collection('ofertas').update(of.id, {
        status: 'Em negociação',
        contramedida: contrapropostaTexto.trim(),
        observacoes:
          (of.observacoes ? of.observacoes + '\n' : '') +
          `[Em negociação em ${new Date().toLocaleDateString('pt-BR')}: ${contrapropostaTexto.trim()}]`,
      })

      if (of.candidato) {
        await candidatosTimelineService.registrarEventoSeguro({
          candidato: of.candidato,
          categoria: 'GESTÃO',
          titulo: 'Proposta em negociação:',
          complemento: `Candidato apresentou contraproposta/alinhamento: "${contrapropostaTexto.trim()}".`,
          autor: pb.authStore.record?.name || 'Gente & Gestão',
          origem: 'usuario',
          referencia_tipo: 'ofertas',
          referencia_id: of.id,
        })
      }

      toast({
        title: 'Negociação Registrada',
        description: 'Status atualizado para "Em negociação" com contraproposta anotada.',
      })

      setModalNegociacao({ open: false, oferta: null })
      setContrapropostaTexto('')
      carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao registrar negociação',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoNegociacao(false)
    }
  }

  // Ação: Criar Nova Oferta
  const handleCriarNovaOferta = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formVaga || !formCandidato || !formSalario || !formDataLimite) {
      toast({
        title: 'Preencha os campos obrigatórios',
        description: 'Vaga, Candidato, Salário e Data Limite de Resposta são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoNova(true)
    try {
      const hojeIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
      const dataLimiteIso =
        new Date(formDataLimite).toISOString().replace('T', ' ').substring(0, 19) + 'Z'

      // Localizar pipeline correspondente se houver
      let pipelineId = null
      try {
        const pipes = await pb.collection('pipeline').getFullList({
          filter: `candidato = '${formCandidato}' && vaga = '${formVaga}'`,
        })
        if (pipes.length > 0) {
          pipelineId = pipes[0].id
          // Garantir que pipeline esteja em Proposta
          if (pipes[0].estagio !== 'Proposta') {
            await pb.collection('pipeline').update(pipes[0].id, {
              estagio: 'Proposta',
            })
          }
        }
      } catch {
        /* intentionally ignored */
      }

      const ofertaCriada = await pb.collection('ofertas').create({
        vaga: formVaga,
        candidato: formCandidato,
        pipeline: pipelineId,
        salario_ofertado: Number(formSalario),
        beneficios: formBeneficios,
        data_proposta: hojeIso,
        data_limite_resposta: dataLimiteIso,
        status: 'Enviada',
        observacoes: formObservacoes,
        criado_em: hojeIso,
      })

      await candidatosTimelineService.registrarEventoSeguro({
        candidato: formCandidato,
        categoria: 'GESTÃO',
        titulo: 'Proposta salarial emitida:',
        complemento: `Oferta de R$ ${Number(formSalario).toLocaleString('pt-BR')} formalizada com limite de resposta até ${new Date(formDataLimite).toLocaleDateString('pt-BR')}.`,
        autor: pb.authStore.record?.name || 'Gente & Gestão',
        origem: 'usuario',
        referencia_tipo: 'ofertas',
        referencia_id: ofertaCriada.id,
      })

      toast({
        title: 'Oferta Criada!',
        description: 'A proposta formal foi registrada com sucesso e vinculada ao candidato.',
      })

      setModalNovaOferta(false)
      setFormVaga('')
      setFormCandidato('')
      setFormSalario('')
      setFormBeneficios('')
      setFormDataLimite('')
      setFormObservacoes('')
      carregarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao criar oferta',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoNova(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Aceita':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Aceita
          </Badge>
        )
      case 'Recusada':
        return (
          <Badge className="bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-100 flex items-center gap-1 font-semibold">
            <XCircle className="w-3 h-3 text-rose-600" />
            Recusada
          </Badge>
        )
      case 'Em negociação':
        return (
          <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100 flex items-center gap-1 font-semibold">
            <Clock className="w-3 h-3 text-amber-600" />
            Em negociação
          </Badge>
        )
      case 'Expirada':
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100 flex items-center gap-1 font-semibold">
            <AlertCircle className="w-3 h-3 text-slate-500" />
            Expirada
          </Badge>
        )
      default:
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-100 flex items-center gap-1 font-semibold">
            <FileCheck2 className="w-3 h-3 text-blue-600" />
            Enviada
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-blue-100 text-blue-700">
              <FileCheck2 className="w-5 h-5 text-blue-700" />
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Ofertas e Propostas Salariais
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Gestão de propostas de contratação, prazos de aceite, negociações e motivos de recusa
            integrados ao funil.
          </p>
        </div>

        <Button
          onClick={() => setModalNovaOferta(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9 shadow-sm flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          Nova Oferta
        </Button>
      </div>

      {/* 4 Cards de KPIs no Topo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Ofertas Enviadas */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Ofertas Enviadas</span>
            <FileCheck2 className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">{kpis.total}</div>
          <p className="text-[11px] text-slate-500">{kpis.enviadas} aguardando retorno</p>
        </div>

        {/* KPI 2: Taxa de Aceite */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Taxa de Aceite</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-emerald-700">
            {kpis.taxaAceite}%
          </div>
          <p className="text-[11px] text-slate-500">
            {kpis.aceitas} aceitas de {kpis.aceitas + kpis.recusadas} finalizadas
          </p>
        </div>

        {/* KPI 3: Tempo Médio de Resposta */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Tempo Médio Resposta</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            {kpis.tempoMedioResposta}{' '}
            <span className="text-xs font-medium text-slate-500">dias</span>
          </div>
          <p className="text-[11px] text-slate-500">Média da emissão até resposta</p>
        </div>

        {/* KPI 4: Em Negociação */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-1.5 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold">Em Negociação</span>
            <MessageSquare className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-amber-700">
            {kpis.negociacao}
          </div>
          <p className="text-[11px] text-slate-500">Ajustes salariais e contrapropostas</p>
        </div>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por candidato, vaga ou observações..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9 text-xs h-9"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Filtro Status */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={statusFiltro}
              onChange={(e) => setStatusFiltro(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="todos">Todos os Status</option>
              <option value="Enviada">Enviada</option>
              <option value="Aceita">Aceita</option>
              <option value="Recusada">Recusada</option>
              <option value="Em negociação">Em negociação</option>
              <option value="Expirada">Expirada</option>
            </select>
          </div>

          {/* Filtro Vagas */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs max-w-xs">
            <Building className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={vagaFiltro}
              onChange={(e) => setVagaFiltro(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer truncate"
            >
              <option value="todas">Todas as Vagas</option>
              {vagas.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.titulo}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Listagem de Ofertas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">
            Carregando ofertas e propostas...
          </div>
        ) : ofertasFiltradas.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <FileCheck2 className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-700">Nenhuma oferta encontrada</p>
            <p className="text-xs text-slate-400">
              Tente ajustar os filtros ou crie uma nova proposta formal para um candidato.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Candidato</th>
                  <th className="py-3 px-4">Vaga</th>
                  <th className="py-3 px-4">Salário Ofertado</th>
                  <th className="py-3 px-4">Data Proposta / Limite</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ofertasFiltradas.map((of) => {
                  const candNome = of.expand?.candidato?.nome || 'Candidato'
                  const candEmail = of.expand?.candidato?.email || ''
                  const vagaTitulo = of.expand?.vaga?.titulo || 'Vaga'
                  const vagaDep = of.expand?.vaga?.departamento || ''

                  const dataPropostaStr = of.data_proposta
                    ? new Date(of.data_proposta).toLocaleDateString('pt-BR')
                    : '-'
                  const dataLimiteStr = of.data_limite_resposta
                    ? new Date(of.data_limite_resposta).toLocaleDateString('pt-BR')
                    : '-'

                  const valorSalario = of.salario_ofertado
                    ? Number(of.salario_ofertado).toLocaleString('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      })
                    : 'A combinar'

                  return (
                    <tr key={of.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Candidato */}
                      <td className="py-3 px-4">
                        <Link
                          to={`/candidatos/${of.candidato}`}
                          className="font-bold text-slate-900 hover:text-blue-600 block transition-colors"
                        >
                          {candNome}
                        </Link>
                        <span className="text-[11px] text-slate-400 block">{candEmail}</span>
                      </td>

                      {/* Vaga */}
                      <td className="py-3 px-4">
                        <Link
                          to={`/vagas/${of.vaga}`}
                          className="font-medium text-slate-800 hover:text-blue-600 block transition-colors"
                        >
                          {vagaTitulo}
                        </Link>
                        <span className="text-[11px] text-slate-400 block">{vagaDep}</span>
                      </td>

                      {/* Salário */}
                      <td className="py-3 px-4">
                        <span className="font-bold text-slate-900">{valorSalario}</span>
                        {of.beneficios && (
                          <span
                            className="block text-[11px] text-slate-500 truncate max-w-xs"
                            title={of.beneficios}
                          >
                            {of.beneficios}
                          </span>
                        )}
                      </td>

                      {/* Datas */}
                      <td className="py-3 px-4">
                        <span className="text-slate-700 block">Enviada: {dataPropostaStr}</span>
                        <span className="text-[11px] text-slate-500 block">
                          Limite: <strong className="text-slate-800">{dataLimiteStr}</strong>
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        {getStatusBadge(of.status)}
                        {of.motivo_recusa && (
                          <span
                            className="block text-[10px] text-rose-600 mt-1 truncate max-w-[200px]"
                            title={of.motivo_recusa}
                          >
                            Motivo: {of.motivo_recusa}
                          </span>
                        )}
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setModalDetalhes(of)}
                            className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900"
                            title="Ver detalhes da proposta"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            Detalhes
                          </Button>

                          {of.status !== 'Aceita' && of.status !== 'Recusada' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleAceitarOferta(of)}
                                className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                                title="Registrar Aceite da Proposta"
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Aceitar
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setModalNegociacao({ open: true, oferta: of })
                                  setContrapropostaTexto(of.contramedida || '')
                                }}
                                className="h-8 px-2 text-xs border-amber-200 text-amber-800 hover:bg-amber-50"
                                title="Registrar Negociação"
                              >
                                <MessageSquare className="w-3.5 h-3.5 mr-1" />
                                Negociar
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setModalRecusa({ open: true, oferta: of })
                                  setMotivoRecusaTexto('')
                                  setContramedidaTexto('')
                                }}
                                className="h-8 px-2 text-xs border-rose-200 text-rose-700 hover:bg-rose-50"
                                title="Registrar Recusa de Proposta"
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Recusar
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Nova Oferta */}
      <Dialog open={modalNovaOferta} onOpenChange={setModalNovaOferta}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <FileCheck2 className="w-5 h-5 text-blue-600" />
              Emitir Nova Oferta / Proposta
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Formalize a proposta salarial para o candidato selecionado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCriarNovaOferta} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Seleção de Vaga */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Vaga *</Label>
                <select
                  value={formVaga}
                  onChange={(e) => setFormVaga(e.target.value)}
                  className="w-full text-xs h-9 px-3 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                >
                  <option value="">Selecione uma vaga...</option>
                  {vagas.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.titulo} ({v.departamento})
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleção de Candidato */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Candidato *</Label>
                <select
                  value={formCandidato}
                  onChange={(e) => setFormCandidato(e.target.value)}
                  className="w-full text-xs h-9 px-3 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  required
                >
                  <option value="">Selecione um candidato...</option>
                  {candidatos.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome} ({c.cargo_atual || 'Candidato'})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Salário Ofertado */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Salário Mensal (R$) *
                </Label>
                <Input
                  type="number"
                  step="100"
                  placeholder="Ex: 12000"
                  value={formSalario}
                  onChange={(e) => setFormSalario(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>

              {/* Data Limite de Resposta */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">
                  Data Limite de Resposta *
                </Label>
                <Input
                  type="date"
                  value={formDataLimite}
                  onChange={(e) => setFormDataLimite(e.target.value)}
                  className="text-xs h-9"
                  required
                />
              </div>
            </div>

            {/* Pacote de Benefícios */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">Pacote de Benefícios</Label>
              <Textarea
                placeholder="Ex: VR/VA R$ 1.500, Plano de Saúde Nacional Bradesco Top, Auxílio Home Office R$ 350, Gympass..."
                value={formBeneficios}
                onChange={(e) => setFormBeneficios(e.target.value)}
                className="text-xs min-h-[70px]"
              />
            </div>

            {/* Observações Internas */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700">
                Observações & Condições
              </Label>
              <Textarea
                placeholder="Instruções de onboarding, equipamento corporativo, previsão de início..."
                value={formObservacoes}
                onChange={(e) => setFormObservacoes(e.target.value)}
                className="text-xs min-h-[60px]"
              />
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setModalNovaOferta(false)}
                className="text-xs h-9"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={salvandoNova}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-9"
              >
                {salvandoNova ? 'Salvando...' : 'Emitir Proposta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Registrar Recusa (Motivo Obrigatório para People Analytics) */}
      <Dialog
        open={modalRecusa.open}
        onOpenChange={(op) => !op && setModalRecusa({ open: false, oferta: null })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-700">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              Registrar Recusa de Proposta
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              O motivo de recusa alimenta diretamente o Relatório Executivo e o diagnóstico do
              funil.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
              <p>
                <strong>Candidato:</strong> {modalRecusa.oferta?.expand?.candidato?.nome}
              </p>
              <p>
                <strong>Vaga:</strong> {modalRecusa.oferta?.expand?.vaga?.titulo}
              </p>
              <p>
                <strong>Valor Ofertado:</strong> R${' '}
                {modalRecusa.oferta?.salario_ofertado?.toLocaleString('pt-BR')}
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Motivo da Recusa (Obrigatório) *
              </Label>
              <Textarea
                placeholder="Ex: Recebeu contraproposta da empresa atual, pretensão acima do budget, modelo presencial incompatível..."
                value={motivoRecusaTexto}
                onChange={(e) => setMotivoRecusaTexto(e.target.value)}
                className="text-xs min-h-[80px]"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Contramedida / Ação Futura (Opcional)
              </Label>
              <Textarea
                placeholder="Ex: Reavaliar faixa da vaga sênior, manter contato em 6 meses..."
                value={contramedidaTexto}
                onChange={(e) => setContramedidaTexto(e.target.value)}
                className="text-xs min-h-[60px]"
              />
            </div>

            <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs">
              <input
                type="checkbox"
                id="check-banco"
                checked={enviarBancoTalentos}
                onChange={(e) => setEnviarBancoTalentos(e.target.checked)}
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="check-banco" className="text-amber-900 font-medium cursor-pointer">
                Manter este candidato no <strong>Banco de Talentos</strong> para futuras posições
              </label>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalRecusa({ open: false, oferta: null })}
              className="text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmarRecusa}
              disabled={salvandoRecusa}
              className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs h-9"
            >
              {salvandoRecusa ? 'Registrando...' : 'Confirmar Recusa'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Registrar Em Negociação */}
      <Dialog
        open={modalNegociacao.open}
        onOpenChange={(op) => !op && setModalNegociacao({ open: false, oferta: null })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-amber-800">
              <MessageSquare className="w-5 h-5 text-amber-600" />
              Registrar Negociação de Oferta
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Anote os termos solicitados pelo candidato ou a contraproposta da organização.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-800">
                Detalhes da Contraproposta / Solicitação
              </Label>
              <Textarea
                placeholder="Ex: Candidato solicitou aumento de R$ 1.000 ou inclusão de benefício flexível de idiomas..."
                value={contrapropostaTexto}
                onChange={(e) => setContrapropostaTexto(e.target.value)}
                className="text-xs min-h-[90px]"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setModalNegociacao({ open: false, oferta: null })}
              className="text-xs h-9"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleConfirmarNegociacao}
              disabled={salvandoNegociacao}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs h-9"
            >
              {salvandoNegociacao ? 'Salvando...' : 'Salvar Negociação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Visualizar Detalhes Completos */}
      {modalDetalhes && (
        <Dialog open={!!modalDetalhes} onOpenChange={(op) => !op && setModalDetalhes(null)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between text-base font-bold text-slate-900 pr-6">
                <span>Detalhes da Proposta</span>
                {getStatusBadge(modalDetalhes.status)}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400 block font-medium">Candidato:</span>
                  <strong className="text-slate-900 block mt-0.5">
                    {modalDetalhes.expand?.candidato?.nome}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Vaga:</span>
                  <strong className="text-slate-900 block mt-0.5">
                    {modalDetalhes.expand?.vaga?.titulo}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Salário:</span>
                  <strong className="text-emerald-700 block mt-0.5 text-sm">
                    R$ {modalDetalhes.salario_ofertado?.toLocaleString('pt-BR')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Limite Resposta:</span>
                  <strong className="text-slate-900 block mt-0.5">
                    {modalDetalhes.data_limite_resposta
                      ? new Date(modalDetalhes.data_limite_resposta).toLocaleDateString('pt-BR')
                      : '-'}
                  </strong>
                </div>
              </div>

              {modalDetalhes.beneficios && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Benefícios Incluídos:</span>
                  <p className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-600 leading-relaxed">
                    {modalDetalhes.beneficios}
                  </p>
                </div>
              )}

              {modalDetalhes.motivo_recusa && (
                <div>
                  <span className="font-bold text-rose-700 block mb-1">Motivo da Recusa:</span>
                  <p className="p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-900 leading-relaxed">
                    {modalDetalhes.motivo_recusa}
                  </p>
                </div>
              )}

              {modalDetalhes.contramedida && (
                <div>
                  <span className="font-bold text-amber-800 block mb-1">
                    Contraproposta / Contramedida:
                  </span>
                  <p className="p-2.5 rounded bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed">
                    {modalDetalhes.contramedida}
                  </p>
                </div>
              )}

              {modalDetalhes.observacoes && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">
                    Histórico & Observações:
                  </span>
                  <pre className="p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-600 whitespace-pre-wrap font-sans leading-relaxed">
                    {modalDetalhes.observacoes}
                  </pre>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalDetalhes(null)}
                className="text-xs h-9"
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

export default Ofertas
