import { useState, useEffect, useMemo, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  Clock,
  Calendar,
  DollarSign,
  FileText,
  Send,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Filter,
  Plus,
  ArrowUpRight,
  Sparkles,
  Layers,
  FileCheck2,
  Users,
  Search,
  CheckSquare,
  Square,
  UploadCloud,
  FileCode,
  Eye,
  RefreshCw,
  TrendingUp,
  Building2,
  MessageSquare,
  Mail,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  horasService,
  type ApontamentoHora,
  type FechamentoCompetencia,
  type StatusCicloFechamento,
} from '@/services/horasService'
import {
  fechamentoNfService,
  type NotaFiscalLoteItem,
  type StatusNotaFiscal,
} from '@/services/fechamentoNfService'
import { empresasService, type Empresa, type Area } from '@/services/empresasService'
import { pessoasService, type PessoaUnificada } from '@/services/pessoasService'
import { DocumentViewerModal } from '@/components/prestadores/DocumentViewerModal'

export default function HorasCompetenciasPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  // Seletor de Competência (AAAA-MM)
  const compParam = searchParams.get('comp')
  const [competencia, setCompetencia] = useState<string>(compParam || '2026-09')

  // Estado geral
  const [loading, setLoading] = useState(true)
  const [pessoasPj, setPessoasPj] = useState<PessoaUnificada[]>([])
  const [fechamentos, setFechamentos] = useState<FechamentoCompetencia[]>([])
  const [apontamentos, setApontamentos] = useState<ApontamentoHora[]>([])
  const [nfs, setNfs] = useState<NotaFiscalLoteItem[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [areas, setAreas] = useState<Area[]>([])

  // Filtro de BU e Área (RH vê todas e pode filtrar; Gestor fica escopado à sua BU/área)
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('todos')
  const [filtroArea, setFiltroArea] = useState<string>('todos')

  // Filtro de busca textual
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<string>('todos')

  // Seleção múltipla para Ação em Lote (Solicitar NFs)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [modalLoteOpen, setModalLoteOpen] = useState(false)
  const [prazoDiasLote, setPrazoDiasLote] = useState(5)
  const [disparandoLote, setDisparandoLote] = useState(false)

  // Modal de Lançamento de Horas (RH)
  const [modalLancamentoOpen, setModalLancamentoOpen] = useState(false)
  const [lancamentoPessoaId, setLancamentoPessoaId] = useState<string>('')
  const [lancamentoHoras, setLancamentoHoras] = useState<number>(40)
  const [lancamentoTipo, setLancamentoTipo] = useState<'Normal' | 'Extra' | 'Sobreaviso'>('Normal')
  const [lancamentoData, setLancamentoData] = useState<string>(
    new Date().toISOString().substring(0, 10),
  )
  const [lancamentoDesc, setLancamentoDesc] = useState<string>('')
  const [salvandoApontamento, setSalvandoApontamento] = useState(false)

  // Modal de Validação e Aprovação pelo RH / Devolução para Ajustes
  const [modalValidacaoOpen, setModalValidacaoOpen] = useState(false)
  const [fechamentoEmAcao, setFechamentoEmAcao] = useState<FechamentoCompetencia | null>(null)
  const [parecerTexto, setParecerTexto] = useState('')
  const [tipoAcaoValidacao, setTipoAcaoValidacao] = useState<'aprovar' | 'devolver'>('aprovar')
  const [salvandoValidacao, setSalvandoValidacao] = useState(false)

  // Modal de Cobrança de NF
  const [modalCobrancaOpen, setModalCobrancaOpen] = useState(false)
  const [nfParaCobrar, setNfParaCobrar] = useState<NotaFiscalLoteItem | null>(null)
  const [canalCobranca, setCanalCobranca] = useState<'Email' | 'WhatsApp' | 'In-app' | 'Telefone'>(
    'Email',
  )
  const [obsCobranca, setObsCobranca] = useState('')
  const [salvandoCobranca, setSalvandoCobranca] = useState(false)

  // Modal de Upload Real de NF
  const [modalUploadNfOpen, setModalUploadNfOpen] = useState(false)
  const [nfParaUpload, setNfParaUpload] = useState<NotaFiscalLoteItem | null>(null)
  const [arquivoNfSelecionado, setArquivoNfSelecionado] = useState<File | null>(null)
  const [numeroNfInput, setNumeroNfInput] = useState('')
  const [dataEmissaoNfInput, setDataEmissaoNfInput] = useState('')
  const [salvandoUploadNf, setSalvandoUploadNf] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Modal de Visualização de Arquivo da NF
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerUrl, setViewerUrl] = useState('')
  const [viewerTitle, setViewerTitle] = useState('')

  // Lista de competências disponíveis para seleção
  const listaCompetencias = [
    { valor: '2026-09', rotulo: 'Setembro / 2026 (Atual)' },
    { valor: '2026-08', rotulo: 'Agosto / 2026' },
    { valor: '2026-07', rotulo: 'Julho / 2026' },
    { valor: '2026-06', rotulo: 'Junho / 2026' },
  ]

  // Carregar dados da tela
  const carregarDados = async () => {
    setLoading(true)
    try {
      // Carregar pessoas unificadas PJ
      const todasPessoas = await pessoasService.listar()
      const apenasPj = todasPessoas.filter(
        (p) => p.modalidade === 'PJ' && p.situacao_contrato !== 'Encerrado',
      )
      setPessoasPj(apenasPj)

      // Carregar fechamentos, apontamentos e NFs da competência selecionada em paralelo
      const [fechRes, apontRes, nfsRes, empRes, areaRes] = await Promise.all([
        horasService.listarFechamentosPorCompetencia(competencia),
        horasService.listarApontamentosPorCompetencia(competencia),
        fechamentoNfService.listarNfsPorCompetencia(competencia),
        empresasService.listarEmpresas(),
        empresasService.listarAreas(),
      ])

      setEmpresas(empRes)
      setAreas(areaRes)
      setFechamentos(fechRes)
      setApontamentos(apontRes)
      setNfs(nfsRes)
    } catch (err) {
      console.error('Erro ao carregar dados de horas & competências:', err)
      toast({
        title: 'Erro ao carregar competência',
        description: 'Não foi possível sincronizar os dados do ciclo.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [competencia])

  // Mapas auxiliares para consulta rápida
  const fechamentosPorPessoa = useMemo(() => {
    const mapa = new Map<string, FechamentoCompetencia>()
    fechamentos.forEach((f) => mapa.set(f.pessoa, f))
    return mapa
  }, [fechamentos])

  const apontamentosPorPessoa = useMemo(() => {
    const mapa = new Map<string, ApontamentoHora[]>()
    apontamentos.forEach((a) => {
      const arr = mapa.get(a.pessoa) || []
      arr.push(a)
      mapa.set(a.pessoa, arr)
    })
    return mapa
  }, [apontamentos])

  const nfsPorPessoa = useMemo(() => {
    const mapa = new Map<string, NotaFiscalLoteItem>()
    nfs.forEach((n) => mapa.set(n.pessoa, n))
    return mapa
  }, [nfs])

  // Totais do painel da competência
  const metricasCompetencia = useMemo(() => {
    let totalHorasLancadas = 0
    let totalValorCalculado = 0
    let totalFechamentosValidados = 0
    let totalNfsSolicitadas = 0
    let totalNfsRecebidas = 0
    let totalNfsAtraso = 0
    let valorAtraso = 0

    pessoasPj.forEach((p) => {
      const fech = fechamentosPorPessoa.get(p.id)
      const apList = apontamentosPorPessoa.get(p.id) || []
      const nf = nfsPorPessoa.get(p.id)

      const horasPessoa = fech
        ? fech.total_horas
        : apList.reduce((acc, a) => acc + (a.horas || 0), 0)
      totalHorasLancadas += horasPessoa

      const valPessoa = fech
        ? fech.valor_total_calculado
        : horasPessoa * (p.valor_hora || (p.valor_contratado || 0) / 160)
      totalValorCalculado += valPessoa

      if (fech?.status_ciclo === 'Validado') totalFechamentosValidados++

      if (nf) {
        if (nf.status === 'Solicitada') totalNfsSolicitadas++
        if (nf.status === 'Recebida' || nf.status === 'Conciliada') totalNfsRecebidas++
        if (nf.status === 'Em atraso') {
          totalNfsAtraso++
          valorAtraso += nf.valor || 0
        }
      }
    })

    return {
      totalHorasLancadas,
      totalValorCalculado,
      totalFechamentosValidados,
      totalNfsSolicitadas,
      totalNfsRecebidas,
      totalNfsAtraso,
      valorAtraso,
    }
  }, [pessoasPj, fechamentosPorPessoa, apontamentosPorPessoa, nfsPorPessoa])

  // Identificação do papel do usuário logado
  const isGestor = user?.cargo_funcao === 'Gestor Contratante'
  const isRhOuAdmin = !isGestor

  // BU e Área do Gestor logado
  const gestorBuId = user?.empresa || ''
  const gestorAreaId = user?.area || ''
  const gestorEmpresaObj = useMemo(
    () => empresas.find((e) => e.id === gestorBuId),
    [empresas, gestorBuId],
  )
  const gestorAreaObj = useMemo(
    () => areas.find((a) => a.id === gestorAreaId),
    [areas, gestorAreaId],
  )

  // Filtragem da tabela com suporte ao escopo de visibilidade:
  // 1. Se for Gestor Contratante (Líder de BU):
  //    - OBRIGATORIAMENTE escopado à sua BU (empresa) vinculada
  //    - Se tiver área específica atribuída, escopado à sua área
  // 2. Se for RH/Admin:
  //    - Acesso consolidado ao Grupo Econômico SouYess
  //    - Pode filtrar por BU e Área livremente pelos filtros da tela
  const pessoasEscopadas = useMemo(() => {
    if (isGestor) {
      if (!gestorBuId) {
        // Gestor sem BU cadastrada vê apenas pessoas diretamente atribuídas a ele
        return pessoasPj.filter((p) => {
          if (p.gestor_responsavel === user?.id) return true
          if (
            p.gestor_nome &&
            user?.name &&
            p.gestor_nome.toLowerCase().includes(user.name.toLowerCase().split(' ')[0])
          ) {
            return true
          }
          return false
        })
      }

      // Escopado à BU
      return pessoasPj.filter((p) => {
        const matchEmpresa = p.empresa === gestorBuId
        if (!matchEmpresa) return false

        // Se o gestor também tem área atribuída, filtrar por ela
        if (gestorAreaId) {
          return p.area === gestorAreaId
        }

        return true
      })
    }

    // Se for RH/Admin: aplica filtros interativos de BU e Área se selecionados
    return pessoasPj.filter((p) => {
      if (filtroEmpresa !== 'todos' && p.empresa !== filtroEmpresa) return false
      if (filtroArea !== 'todos' && p.area !== filtroArea) return false
      return true
    })
  }, [pessoasPj, isGestor, gestorBuId, gestorAreaId, user, filtroEmpresa, filtroArea])

  // Recalcular métricas do painel com base no escopo visível (Gestor vê totais da sua BU, RH vê do escopo atual)
  const metricasEscopo = useMemo(() => {
    let totalHorasLancadas = 0
    let totalValorCalculado = 0
    let totalFechamentosValidados = 0
    let totalNfsSolicitadas = 0
    let totalNfsRecebidas = 0
    let totalNfsAtraso = 0
    let valorAtraso = 0

    pessoasEscopadas.forEach((p) => {
      const fech = fechamentosPorPessoa.get(p.id)
      const apList = apontamentosPorPessoa.get(p.id) || []
      const nf = nfsPorPessoa.get(p.id)

      const horasPessoa = fech
        ? fech.total_horas
        : apList.reduce((acc, a) => acc + (a.horas || 0), 0)
      totalHorasLancadas += horasPessoa

      const valPessoa = fech
        ? fech.valor_total_calculado
        : horasPessoa * (p.valor_hora || (p.valor_contratado || 0) / 160)
      totalValorCalculado += valPessoa

      if (fech?.status_ciclo === 'Validado') totalFechamentosValidados++

      if (nf) {
        if (nf.status === 'Solicitada') totalNfsSolicitadas++
        if (nf.status === 'Recebida' || nf.status === 'Conciliada') totalNfsRecebidas++
        if (nf.status === 'Em atraso') {
          totalNfsAtraso++
          valorAtraso += nf.valor || 0
        }
      }
    })

    return {
      totalHorasLancadas,
      totalValorCalculado,
      totalFechamentosValidados,
      totalNfsSolicitadas,
      totalNfsRecebidas,
      totalNfsAtraso,
      valorAtraso,
    }
  }, [pessoasEscopadas, fechamentosPorPessoa, apontamentosPorPessoa, nfsPorPessoa])

  // Filtragem da tabela
  const listaFiltrada = useMemo(() => {
    return pessoasEscopadas.filter((p) => {
      const fech = fechamentosPorPessoa.get(p.id)
      const nf = nfsPorPessoa.get(p.id)

      if (busca.trim()) {
        const termo = busca.toLowerCase()
        const matchNome = p.nome.toLowerCase().includes(termo)
        const matchDoc = (p.cpf_cnpj || '').toLowerCase().includes(termo)
        const matchDepto = (p.departamento || '').toLowerCase().includes(termo)
        if (!matchNome && !matchDoc && !matchDepto) return false
      }

      if (filtroStatus !== 'todos') {
        if (filtroStatus === 'em_apontamento') {
          return !fech || fech.status_ciclo === 'Em apontamento'
        }
        if (filtroStatus === 'aguardando_rh') {
          return fech?.status_ciclo === 'Aguardando validação do RH'
        }
        if (filtroStatus === 'devolvido') {
          return fech?.status_ciclo === 'Devolvido para ajustes'
        }
        if (filtroStatus === 'validado') {
          return fech?.status_ciclo === 'Validado'
        }
        if (filtroStatus === 'nf_solicitada') {
          return nf?.status === 'Solicitada' || fech?.status_ciclo === 'NF solicitada'
        }
        if (filtroStatus === 'nf_atraso') {
          return nf?.status === 'Em atraso'
        }
        if (filtroStatus === 'fechado') {
          return fech?.status_ciclo === 'Fechado' || nf?.status === 'Conciliada'
        }
      }

      return true
    })
  }, [pessoasEscopadas, fechamentosPorPessoa, nfsPorPessoa, busca, filtroStatus])

  // Lógica de seleção múltipla (apenas os com status 'Validado' podem ser solicitados em lote)
  const itensElegiveisParaLote = useMemo(() => {
    return listaFiltrada.filter((p) => {
      const fech = fechamentosPorPessoa.get(p.id)
      const nf = nfsPorPessoa.get(p.id)
      return fech && fech.status_ciclo === 'Validado' && !nf
    })
  }, [listaFiltrada, fechamentosPorPessoa, nfsPorPessoa])

  const toggleSelecionarTudo = () => {
    if (selecionados.size === itensElegiveisParaLote.length) {
      setSelecionados(new Set())
    } else {
      setSelecionados(new Set(itensElegiveisParaLote.map((p) => p.id)))
    }
  }

  const toggleSelecionarItem = (id: string) => {
    const next = new Set(selecionados)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    setSelecionados(next)
  }

  // Ação: Lançar Horas (a cargo do Gestor Contratante ou com suporte do RH)
  const handleSalvarApontamento = async () => {
    if (!lancamentoPessoaId) {
      toast({
        title: 'Selecione o prestador',
        description: 'Escolha a pessoa para apontamento de horas.',
        variant: 'destructive',
      })
      return
    }

    if (lancamentoHoras <= 0) {
      toast({
        title: 'Horas inválidas',
        description: 'Informe um total de horas maior que zero.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoApontamento(true)
    try {
      const p =
        pessoasEscopadas.find((x) => x.id === lancamentoPessoaId) ||
        pessoasPj.find((x) => x.id === lancamentoPessoaId)
      const autorDesc = user?.name
        ? `${user.name} (${isGestor ? 'Gestor' : 'RH'})`
        : 'Gestor Contratante'
      await horasService.criarApontamento({
        pessoa: lancamentoPessoaId,
        competencia,
        data: lancamentoData,
        horas: Number(lancamentoHoras),
        tipo: lancamentoTipo,
        descricao: lancamentoDesc.trim() || undefined,
        status: 'Aprovado',
        vinculo_referencia: p?.cpf_cnpj || undefined,
        criado_por: autorDesc,
      })

      // Atualizar ou criar fechamento em status 'Em apontamento'
      const apListAtualizada = await horasService.listarApontamentosPorPessoaECompetencia(
        lancamentoPessoaId,
        competencia,
      )
      const totalH = apListAtualizada.reduce((acc, a) => acc + (a.horas || 0), 0)
      const normaisH = apListAtualizada
        .filter((a) => a.tipo === 'Normal')
        .reduce((acc, a) => acc + (a.horas || 0), 0)
      const extrasH = apListAtualizada
        .filter((a) => a.tipo === 'Extra')
        .reduce((acc, a) => acc + (a.horas || 0), 0)

      const vHora = p?.valor_hora || (p?.valor_contratado ? p.valor_contratado / 160 : 100)
      const valorTot = totalH * vHora

      await horasService.upsertFechamento({
        pessoa: lancamentoPessoaId,
        competencia,
        total_horas: totalH,
        horas_normais: normaisH,
        horas_extras: extrasH,
        horas_base_contrato: p?.horas_mensais_base || 160,
        valor_hora_congelado: vHora,
        valor_total_calculado: valorTot,
        status_ciclo: 'Em apontamento',
        gestor_nome: p?.gestor_nome || user?.name || undefined,
        gestor_validador: p?.gestor_responsavel || user?.id || undefined,
        prestador: p?.prestador_origem || undefined,
      })

      toast({
        title: 'Apontamento registrado com sucesso!',
        description: `${lancamentoHoras}h apontadas para ${p?.nome} na competência ${competencia}.`,
      })

      setModalLancamentoOpen(false)
      setLancamentoDesc('')
      setLancamentoHoras(40)
      await carregarDados()
    } catch (err: any) {
      console.error('Erro ao salvar apontamento:', err)
      toast({
        title: 'Erro ao registrar apontamento',
        description: err?.message || 'Falha ao salvar horas.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoApontamento(false)
    }
  }

  // Ação: Gestor conclui os apontamentos e envia para validação do RH
  const handleEnviarParaRh = async (p: PessoaUnificada) => {
    try {
      const apList = apontamentosPorPessoa.get(p.id) || []
      const totalH = apList.reduce((acc, a) => acc + (a.horas || 0), 0)
      const normaisH = apList
        .filter((a) => a.tipo === 'Normal')
        .reduce((acc, a) => acc + (a.horas || 0), 0)
      const extrasH = apList
        .filter((a) => a.tipo === 'Extra')
        .reduce((acc, a) => acc + (a.horas || 0), 0)

      const vHora = p.valor_hora || (p.valor_contratado ? p.valor_contratado / 160 : 100)
      const valorTot = (totalH || p.horas_mensais_base || 160) * vHora

      const fech = await horasService.upsertFechamento({
        pessoa: p.id,
        competencia,
        total_horas: totalH || p.horas_mensais_base || 160,
        horas_normais: normaisH || p.horas_mensais_base || 160,
        horas_extras: extrasH,
        horas_base_contrato: p.horas_mensais_base || 160,
        valor_hora_congelado: vHora,
        valor_total_calculado: valorTot,
        status_ciclo: 'Aguardando validação do RH',
        gestor_nome: p.gestor_nome || user?.name || 'Gestor Contratante',
        gestor_validador: p.gestor_responsavel || user?.id || undefined,
        prestador: p.prestador_origem || undefined,
      })

      const autorNome = user?.name || p.gestor_nome || 'Gestor Contratante'
      await horasService.enviarParaValidacaoRh(fech.id, autorNome)

      toast({
        title: 'Apontamento enviado ao RH',
        description: `Horas de ${p.nome} submetidas para validação e conferência do RH.`,
      })

      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao enviar para o RH',
        description: err?.message || 'Falha na operação.',
        variant: 'destructive',
      })
    }
  }

  // Ação: RH aprova ou devolve o apontamento com observações
  const handleConfirmarValidacaoRh = async () => {
    if (!fechamentoEmAcao) return
    setSalvandoValidacao(true)

    try {
      const rhNome = user?.name || 'Douglas Severo (RH)'
      const rhId = user?.id || ''

      if (tipoAcaoValidacao === 'aprovar') {
        await horasService.aprovarPeloRh(
          fechamentoEmAcao.id,
          rhId,
          rhNome,
          parecerTexto.trim() || undefined,
        )
        toast({
          title: 'Competência Validada pelo RH!',
          description: `Horas aprovadas. A competência agora está apta para solicitação de Nota Fiscal.`,
        })
      } else {
        if (!parecerTexto.trim()) {
          toast({
            title: 'Informe o motivo da devolução',
            description: 'Descreva quais correções ou observações o gestor deve ajustar.',
            variant: 'destructive',
          })
          setSalvandoValidacao(false)
          return
        }
        await horasService.devolverParaAjustesPeloRh(
          fechamentoEmAcao.id,
          rhNome,
          parecerTexto.trim(),
        )
        toast({
          title: 'Devolvido ao Gestor',
          description: `O apontamento foi retornado ao gestor com as observações registradas no histórico.`,
        })
      }

      setModalValidacaoOpen(false)
      setFechamentoEmAcao(null)
      setParecerTexto('')
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao processar validação',
        description: err?.message || 'Falha ao registrar parecer.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoValidacao(false)
    }
  }

  // Ação: Disparo de Solicitação de NFs em Lote
  const handleConfirmarDisparoLote = async () => {
    if (selecionados.size === 0) return

    setDisparandoLote(true)
    try {
      const itensParaDisparo = Array.from(selecionados).map((pId) => {
        const p = pessoasPj.find((x) => x.id === pId)!
        const fech = fechamentosPorPessoa.get(pId)
        return {
          fechamentoId: fech?.id,
          pessoaId: pId,
          competencia,
          valor: fech?.valor_total_calculado || p.valor_contratado || 0,
          prestadorId: p.prestador_origem || undefined,
        }
      })

      const res = await fechamentoNfService.solicitarEmLote(
        itensParaDisparo,
        user?.name || 'Douglas Severo (RH)',
        prazoDiasLote,
      )

      toast({
        title: 'Disparo de NFs em Lote Concluído',
        description: `${res.solicitadas} prestador(es) notificado(s) com prazo de ${prazoDiasLote} dias úteis.`,
      })

      setModalLoteOpen(false)
      setSelecionados(new Set())
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro no disparo em lote',
        description: err?.message || 'Falha ao solicitar notas fiscais.',
        variant: 'destructive',
      })
    } finally {
      setDisparandoLote(false)
    }
  }

  // Ação: Registrar Cobrança de NF em atraso
  const handleConfirmarCobranca = async () => {
    if (!nfParaCobrar) return
    setSalvandoCobranca(true)
    try {
      await fechamentoNfService.registrarCobranca(
        nfParaCobrar.id,
        canalCobranca,
        user?.name || 'Douglas Severo (RH)',
        obsCobranca.trim() || undefined,
      )

      toast({
        title: 'Cobrança formalizada!',
        description: `Cobrança registrada via ${canalCobranca} e notificação emitida com sucesso.`,
      })

      setModalCobrancaOpen(false)
      setNfParaCobrar(null)
      setObsCobranca('')
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar cobrança',
        description: err?.message || 'Falha ao registrar histórico.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoCobranca(false)
    }
  }

  // Ação: Upload Real de Nota Fiscal
  const handleConfirmarUploadNf = async () => {
    if (!nfParaUpload) return
    if (!arquivoNfSelecionado) {
      toast({
        title: 'Arquivo obrigatório',
        description: 'Selecione o documento PDF ou XML da Nota Fiscal.',
        variant: 'destructive',
      })
      return
    }

    setSalvandoUploadNf(true)
    try {
      await fechamentoNfService.anexarArquivoNf(
        nfParaUpload.id,
        arquivoNfSelecionado,
        numeroNfInput.trim() || undefined,
        dataEmissaoNfInput || undefined,
      )

      toast({
        title: 'Nota Fiscal anexada!',
        description: 'O arquivo real foi persistido com sucesso e está pronto para conciliação.',
      })

      setModalUploadNfOpen(false)
      setNfParaUpload(null)
      setArquivoNfSelecionado(null)
      setNumeroNfInput('')
      setDataEmissaoNfInput('')
      if (fileInputRef.current) fileInputRef.current.value = ''
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Falha no upload da NF',
        description: err?.message || 'Não foi possível salvar o arquivo.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoUploadNf(false)
    }
  }

  // Ação: Conciliar Nota Fiscal e Fechar Ciclo
  const handleConciliarNf = async (nf: NotaFiscalLoteItem) => {
    try {
      await fechamentoNfService.conciliarNf(nf.id, user?.name || 'Douglas Severo (RH)')
      toast({
        title: 'Nota Fiscal Conciliada!',
        description: `Competência fechada com sucesso para ${nf.expand?.pessoa?.nome || 'o prestador'}.`,
      })
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao conciliar NF',
        description: err?.message || 'Falha na conciliação.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header do Módulo com Seletor de Competência */}
      <div className="bg-white dark:bg-[#1A2240] rounded-xl border border-[#E7EAF0] dark:border-[#2E3A6E] p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-[#FEF1EA] dark:bg-[#212B55] text-[#E9530E] border border-[#E9530E]/30">
              <Clock className="w-5 h-5 text-[#E9530E]" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-[#212B55] dark:text-[#F7F8FB] font-display">
                  Horas & Fechamento de Competência
                </h1>
                <Badge
                  className={`${isGestor ? 'bg-[#212B55]' : 'bg-[#E9530E]'} text-white font-mono text-xs font-bold`}
                >
                  {isGestor ? 'Gestor Contratante' : 'RH / Validador Fiscal'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 font-sans">
                {isGestor
                  ? 'Apontamento de horas dos prestadores da sua área (base 160h) e envio para validação do RH.'
                  : 'Validação e conferência das horas apontadas pelos gestores, emissão de pareceres e solicitação de NFs em lote.'}
              </p>
            </div>
          </div>
        </div>

        {/* Controles de Topo: Competência + Botão Lançar Horas + Disparo em Lote */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 bg-[#F7F8FB] dark:bg-[#11162B] border border-[#D7DCE6] dark:border-[#2E3A6E] rounded-lg px-2.5 py-1">
            <Calendar className="w-4 h-4 text-[#E9530E]" />
            <Select
              value={competencia}
              onValueChange={(val) => {
                setCompetencia(val)
                setSearchParams({ comp: val })
              }}
            >
              <SelectTrigger className="h-8 w-[190px] text-xs font-bold font-mono bg-transparent border-0 shadow-none focus:ring-0">
                <SelectValue placeholder="Competência" />
              </SelectTrigger>
              <SelectContent className="dark:bg-[#1A2240] dark:border-[#2E3A6E]">
                {listaCompetencias.map((c) => (
                  <SelectItem
                    key={c.valor}
                    value={c.valor}
                    className="text-xs font-mono font-medium"
                  >
                    {c.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            size="sm"
            onClick={() => setModalLancamentoOpen(true)}
            className="h-9 gap-1.5 text-xs bg-[#212B55] hover:bg-[#11162B] text-white font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            {isGestor ? 'Lançar Horas da Área' : 'Lançar Horas (Apoio)'}
          </Button>

          {isRhOuAdmin && selecionados.size > 0 && (
            <Button
              size="sm"
              onClick={() => setModalLoteOpen(true)}
              className="h-9 gap-1.5 text-xs bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold shadow-xs animate-in zoom-in-50"
            >
              <Send className="w-3.5 h-3.5" />
              Solicitar NFs em Lote ({selecionados.size})
            </Button>
          )}
        </div>
      </div>

      {/* 2. KPIs de Fechamento da Competência em Mono Tabular */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Total Horas da Competência */}
        <Card className="bg-card border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              Horas Lançadas {isGestor ? '(Sua BU)' : ''}
            </span>
            <CardTitle className="text-2xl font-black text-[#212B55] dark:text-[#F7F8FB] font-mono tabular-nums mt-1">
              {metricasEscopo.totalHorasLancadas.toFixed(1)}h
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground font-mono">
              {pessoasEscopadas.length} prestador(es) escopados
            </p>
          </CardContent>
        </Card>

        {/* KPI 2: Valor Total Calculado */}
        <Card className="bg-card border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              Valor Calculado {isGestor ? '(Sua BU)' : ''}
            </span>
            <CardTitle className="text-2xl font-black text-emerald-700 dark:text-emerald-300 font-mono tabular-nums mt-1">
              R${' '}
              {metricasEscopo.totalValorCalculado.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground font-mono">
              Horas × valor/hora vínculo
            </p>
          </CardContent>
        </Card>

        {/* KPI 3: Validados Prontos p/ NF */}
        <Card className="bg-card border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
              Validados pelo RH
            </span>
            <CardTitle className="text-2xl font-black text-indigo-700 dark:text-indigo-300 font-mono tabular-nums mt-1">
              {metricasEscopo.totalFechamentosValidados} prestador(es)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground font-sans">
              Aptos para solicitação de NF
            </p>
          </CardContent>
        </Card>

        {/* KPI 4: NFs Recebidas / Conciliadas */}
        <Card className="bg-card border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-[11px] font-semibold text-[#E9530E] uppercase tracking-wide">
              NFs Recebidas
            </span>
            <CardTitle className="text-2xl font-black text-[#E9530E] font-mono tabular-nums mt-1">
              {metricasEscopo.totalNfsRecebidas} recebida(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] text-muted-foreground font-sans">
              {metricasEscopo.totalNfsSolicitadas} solicitada(s) aguardando
            </p>
          </CardContent>
        </Card>

        {/* KPI 5: NFs em Atraso (Inadimplência de Envio) */}
        <Card className="bg-card border-border/80 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <span className="text-[11px] font-semibold text-red-600 uppercase tracking-wide flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              NFs em Atraso
            </span>
            <CardTitle className="text-2xl font-black text-red-600 font-mono tabular-nums mt-1">
              {metricasEscopo.totalNfsAtraso} atrasada(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-[11px] font-mono font-bold text-red-600 truncate">
              R${' '}
              {metricasEscopo.valorAtraso.toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Banner de Contexto de BU do Gestor ou Filtros de BU para o RH */}
      {isGestor ? (
        <div className="bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-100">
                Acesso Escopado por Líder de BU:
              </span>{' '}
              <span className="text-amber-900 dark:text-amber-300 font-bold">
                {gestorEmpresaObj ? gestorEmpresaObj.nome_fantasia : 'BU não vinculada'}
              </span>
              {gestorAreaObj && (
                <span className="text-slate-600 dark:text-slate-400">
                  {' '}
                  · Área:{' '}
                  <strong className="text-slate-900 dark:text-slate-200">
                    {gestorAreaObj.nome}
                  </strong>
                </span>
              )}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                Você visualiza e lança horas estritamente para os prestadores pertencentes à sua BU.
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="border-amber-300 dark:border-amber-700 bg-white dark:bg-slate-900 text-amber-800 dark:text-amber-300 text-[10px] font-mono"
          >
            {pessoasEscopadas.length} prestadores na BU
          </Badge>
        </div>
      ) : (
        /* Se for RH, exibe seletor de BU e Área para navegação analítica consolidada ou filtrada */
        <div className="bg-slate-50 dark:bg-[#11162B] border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
              <Building2 className="w-4 h-4" />
            </span>
            <div>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                Visão Consolidada RH — Grupo Econômico SouYess
              </span>
              <p className="text-[11px] text-slate-500">
                Filtre por BU e Área para conferir apontamentos por unidade, ou visualize o
                consolidado.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">Empresa / BU:</span>
              <Select
                value={filtroEmpresa}
                onValueChange={(val) => {
                  setFiltroEmpresa(val)
                  setFiltroArea('todos')
                }}
              >
                <SelectTrigger className="h-8 w-[190px] text-xs">
                  <SelectValue placeholder="Todas as BUs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Grupo Consolidado (Todas)</SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.sigla ? `[${e.sigla}] ` : ''}
                      {e.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {filtroEmpresa !== 'todos' && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500 text-[11px]">Área:</span>
                <Select value={filtroArea} onValueChange={setFiltroArea}>
                  <SelectTrigger className="h-8 w-[160px] text-xs">
                    <SelectValue placeholder="Todas as áreas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as áreas</SelectItem>
                    {areas
                      .filter((a) => a.empresa === filtroEmpresa)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nome}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Barra de Filtros e Busca */}
      <div className="bg-white dark:bg-[#1A2240] rounded-xl border border-[#E7EAF0] dark:border-[#2E3A6E] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar prestador por nome, CNPJ ou departamento..."
              className="pl-9 text-xs h-9"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filtroStatus} onValueChange={setFiltroStatus}>
            <SelectTrigger className="h-9 w-[180px] text-xs font-semibold">
              <SelectValue placeholder="Status do Ciclo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos" className="text-xs">
                Todos os Status
              </SelectItem>
              <SelectItem value="em_apontamento" className="text-xs">
                Em Apontamento (Gestor)
              </SelectItem>
              <SelectItem value="aguardando_rh" className="text-xs">
                Aguardando Validação do RH
              </SelectItem>
              <SelectItem value="devolvido" className="text-xs">
                Devolvido para Ajustes
              </SelectItem>
              <SelectItem value="validado" className="text-xs">
                Validados pelo RH
              </SelectItem>
              <SelectItem value="nf_solicitada" className="text-xs">
                NF Solicitada
              </SelectItem>
              <SelectItem value="nf_atraso" className="text-xs">
                NF em Atraso
              </SelectItem>
              <SelectItem value="fechado" className="text-xs">
                Ciclo Fechado / Conciliado
              </SelectItem>
            </SelectContent>
          </Select>

          {itensElegiveisParaLote.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelecionarTudo}
              className="h-9 text-xs gap-1.5"
            >
              {selecionados.size === itensElegiveisParaLote.length ? (
                <CheckSquare className="w-3.5 h-3.5 text-[#E9530E]" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              Selecionar Validados ({itensElegiveisParaLote.length})
            </Button>
          )}
        </div>
      </div>

      {/* 4. Lista Principal de Prestadores PJ na Competência */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-xs flex flex-col items-center justify-center gap-2">
            <Clock className="w-7 h-7 animate-spin text-[#E9530E]" />
            Carregando apontamentos e fechamentos da competência {competencia}...
          </div>
        ) : listaFiltrada.length === 0 ? (
          <Card className="p-8 text-center text-muted-foreground text-xs">
            Nenhum prestador PJ localizado para os filtros informados nesta competência.
          </Card>
        ) : (
          listaFiltrada.map((p) => {
            const fech = fechamentosPorPessoa.get(p.id)
            const apList = apontamentosPorPessoa.get(p.id) || []
            const nf = nfsPorPessoa.get(p.id)

            const horasTotais = fech
              ? fech.total_horas
              : apList.reduce((acc, a) => acc + (a.horas || 0), 0)
            const horasBase = p.horas_mensais_base || 160
            const valorHora = fech
              ? fech.valor_hora_congelado
              : p.valor_hora || (p.valor_contratado ? p.valor_contratado / 160 : 100)
            const valorTotal = fech ? fech.valor_total_calculado : horasTotais * valorHora

            const isElegivelLote = fech?.status_ciclo === 'Validado' && !nf
            const isSelecionado = selecionados.has(p.id)

            // Status visual
            const statusCiclo: StatusCicloFechamento = fech?.status_ciclo || 'Em apontamento'

            return (
              <Card
                key={p.id}
                className={`border shadow-xs transition-all ${
                  statusCiclo === 'Validado'
                    ? 'border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/10'
                    : nf?.status === 'Em atraso'
                      ? 'border-red-200 dark:border-red-900/60 bg-red-50/10'
                      : statusCiclo === 'Fechado'
                        ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/10'
                        : 'border-border/80 bg-card'
                }`}
              >
                <CardContent className="p-4 sm:p-5 space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/50 pb-3">
                    <div className="flex items-center gap-3">
                      {isElegivelLote ? (
                        <button
                          onClick={() => toggleSelecionarItem(p.id)}
                          className="p-1 text-[#E9530E] hover:opacity-80 transition-opacity"
                          title="Selecionar para disparo em lote"
                        >
                          {isSelecionado ? (
                            <CheckSquare className="w-5 h-5" />
                          ) : (
                            <Square className="w-5 h-5 text-muted-foreground" />
                          )}
                        </button>
                      ) : (
                        <div className="w-5" />
                      )}

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            to={`/pessoas/${p.id}`}
                            className="font-bold text-base text-[#212B55] dark:text-[#F7F8FB] hover:text-[#E9530E] font-display flex items-center gap-1.5"
                          >
                            {p.nome}
                            <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                          </Link>
                          <span className="text-xs font-mono text-muted-foreground">
                            ({p.cpf_cnpj || 'PJ'})
                          </span>

                          {/* Badge de Status do Ciclo */}
                          <Badge
                            className={`text-xs font-bold font-sans ${
                              statusCiclo === 'Fechado'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                                : statusCiclo === 'Validado'
                                  ? 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950 dark:text-indigo-300'
                                  : statusCiclo === 'Aguardando validação do RH'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                                    : statusCiclo === 'Devolvido para ajustes'
                                      ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300'
                                      : statusCiclo === 'NF solicitada'
                                        ? 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
                                        : 'bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                          >
                            {statusCiclo}
                          </Badge>

                          {/* Badge da NF */}
                          {nf && (
                            <Badge
                              variant="outline"
                              className={`text-xs font-bold font-mono ${
                                nf.status === 'Conciliada'
                                  ? 'text-emerald-700 border-emerald-400 bg-emerald-50'
                                  : nf.status === 'Recebida'
                                    ? 'text-blue-700 border-blue-400 bg-blue-50'
                                    : nf.status === 'Em atraso'
                                      ? 'text-red-700 border-red-400 bg-red-50'
                                      : 'text-amber-700 border-amber-400 bg-amber-50'
                              }`}
                            >
                              NF: {nf.status} {nf.numero_nf ? `(${nf.numero_nf})` : ''}
                            </Badge>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground mt-0.5">
                          {p.cargo_funcao} · {p.departamento || 'Geral'} · Gestor:{' '}
                          <span className="text-foreground font-semibold">
                            {p.gestor_nome || 'Carlos Mendonça'}
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Ações contextuais por pessoa */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Gestor ou RH: Submeter apontamento concluído para o RH */}
                      {(statusCiclo === 'Em apontamento' ||
                        statusCiclo === 'Devolvido para ajustes') && (
                        <Button
                          size="sm"
                          onClick={() => handleEnviarParaRh(p)}
                          className="h-8 text-xs bg-[#212B55] hover:bg-[#11162B] text-white font-semibold gap-1"
                        >
                          <Send className="w-3.5 h-3.5" />
                          {statusCiclo === 'Devolvido para ajustes'
                            ? 'Reenviar ao RH'
                            : 'Concluir e Enviar ao RH'}
                        </Button>
                      )}

                      {/* RH: Validar ou Devolver competência aguardando validação */}
                      {isRhOuAdmin && statusCiclo === 'Aguardando validação do RH' && fech && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            onClick={() => {
                              setFechamentoEmAcao(fech)
                              setTipoAcaoValidacao('aprovar')
                              setParecerTexto('')
                              setModalValidacaoOpen(true)
                            }}
                            className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Aprovar Horas (RH)
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setFechamentoEmAcao(fech)
                              setTipoAcaoValidacao('devolver')
                              setParecerTexto('')
                              setModalValidacaoOpen(true)
                            }}
                            className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold gap-1"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            Devolver com Observações
                          </Button>
                        </div>
                      )}

                      {/* RH: Solicitar NF a partir de competências Validadas */}
                      {isRhOuAdmin && statusCiclo === 'Validado' && !nf && (
                        <Button
                          size="sm"
                          onClick={() => {
                            fechamentoNfService
                              .solicitarNf({
                                fechamentoId: fech?.id,
                                pessoaId: p.id,
                                competencia,
                                valor: valorTotal,
                                prestadorId: p.prestador_origem || undefined,
                                usuarioNome: user?.name || 'Douglas Severo (RH)',
                              })
                              .then(() => {
                                toast({
                                  title: 'NF Solicitada',
                                  description: `Solicitação emitida para ${p.nome}.`,
                                })
                                carregarDados()
                              })
                          }}
                          className="h-8 text-xs bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold gap-1 shadow-xs"
                        >
                          <Send className="w-3.5 h-3.5" />
                          Solicitar NF
                        </Button>
                      )}

                      {nf?.status === 'Em atraso' && (
                        <Button
                          size="sm"
                          onClick={() => {
                            setNfParaCobrar(nf)
                            setModalCobrancaOpen(true)
                          }}
                          className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-bold gap-1 shadow-xs"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          Cobrar NF
                        </Button>
                      )}

                      {nf && (nf.status === 'Solicitada' || nf.status === 'Em atraso') && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setNfParaUpload(nf)
                            setModalUploadNfOpen(true)
                          }}
                          className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-semibold gap-1"
                        >
                          <UploadCloud className="w-3.5 h-3.5" />
                          Anexar NF
                        </Button>
                      )}

                      {nf && nf.status === 'Recebida' && (
                        <Button
                          size="sm"
                          onClick={() => handleConciliarNf(nf)}
                          className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-1 shadow-xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Conciliar NF
                        </Button>
                      )}

                      {nf?.arquivo_nf && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const url = fechamentoNfService.obterUrlArquivoNf(nf, nf.arquivo_nf)
                            setViewerUrl(url)
                            setViewerTitle(`Nota Fiscal ${nf.numero_nf || p.nome}`)
                            setViewerOpen(true)
                          }}
                          className="h-8 text-xs text-blue-600 hover:text-blue-800 gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver NF
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Detalhes de Horas e Valores em Mono Tabular */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-sans">
                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Horas Lançadas / Base
                      </span>
                      <span className="text-sm font-bold font-mono text-[#212B55] dark:text-[#F7F8FB] tabular-nums">
                        {horasTotais.toFixed(1)}h{' '}
                        <span className="text-xs font-normal text-muted-foreground">
                          / {horasBase}h
                        </span>
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {apList.length} apontamento(s)
                      </span>
                    </div>

                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Valor Hora Congelado
                      </span>
                      <span className="text-sm font-bold font-mono text-emerald-700 dark:text-emerald-400 tabular-nums">
                        R$ {valorHora.toFixed(2)}/h
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Parâmetro do contrato
                      </span>
                    </div>

                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Total Calculado
                      </span>
                      <span className="text-sm font-black font-mono text-[#212B55] dark:text-[#F7F8FB] tabular-nums">
                        R$ {valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        Alimenta a Nota Fiscal
                      </span>
                    </div>

                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Validação pelo RH
                      </span>
                      <span className="text-xs font-bold text-foreground block truncate">
                        {statusCiclo === 'Validado' || statusCiclo === 'Fechado'
                          ? 'Aprovado pelo RH'
                          : statusCiclo === 'Devolvido para ajustes'
                            ? 'Devolvido para ajustes'
                            : statusCiclo === 'Aguardando validação do RH'
                              ? 'Aguardando RH'
                              : 'Em apontamento'}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {fech?.data_validacao
                          ? new Date(fech.data_validacao).toLocaleDateString('pt-BR')
                          : 'Gestor aponta → RH valida'}
                      </span>
                    </div>

                    <div className="bg-muted/30 p-2.5 rounded-lg border border-border/50">
                      <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                        Prazo de Envio da NF
                      </span>
                      <span
                        className={`text-xs font-mono font-bold block ${
                          nf?.status === 'Em atraso' ? 'text-red-600' : 'text-foreground'
                        }`}
                      >
                        {nf?.data_limite_envio
                          ? new Date(nf.data_limite_envio).toLocaleDateString('pt-BR')
                          : 'Não solicitada'}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">
                        {nf?.status === 'Em atraso' ? 'Prazo expirado' : '5 dias úteis'}
                      </span>
                    </div>
                  </div>

                  {/* Histórico resumido do ciclo se houver */}
                  {fech?.parecer_gestor && (
                    <div
                      className={`text-xs p-2.5 rounded border flex items-start gap-2 ${
                        statusCiclo === 'Devolvido para ajustes'
                          ? 'bg-red-50/80 text-red-800 border-red-200 dark:bg-red-950/40 dark:border-red-900 dark:text-red-300'
                          : 'bg-muted/20 text-muted-foreground border-border/40'
                      }`}
                    >
                      <ShieldCheck
                        className={`w-4 h-4 shrink-0 mt-0.5 ${
                          statusCiclo === 'Devolvido para ajustes'
                            ? 'text-red-600'
                            : 'text-indigo-600'
                        }`}
                      />
                      <div>
                        <span className="font-semibold text-foreground">
                          {statusCiclo === 'Devolvido para ajustes'
                            ? 'Observações do RH para correção: '
                            : 'Parecer de Validação do RH: '}
                        </span>
                        <span>"{fech.parecer_gestor}"</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      {/* MODAL 1: Lançar Horas pelo RH (Lote ou Individual) */}
      <Dialog open={modalLancamentoOpen} onOpenChange={setModalLancamentoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lançamento de Horas na Competência</DialogTitle>
            <DialogDescription>
              Lance horas normais, extras ou sobreaviso para a competência {competencia}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                Prestador PJ {isGestor ? '(Sua BU)' : ''}
              </Label>
              <Select value={lancamentoPessoaId} onValueChange={setLancamentoPessoaId}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione o prestador..." />
                </SelectTrigger>
                <SelectContent>
                  {pessoasEscopadas.map((p) => (
                    <SelectItem key={p.id} value={p.id} className="text-xs">
                      {p.nome} — {p.cargo_funcao} ({p.departamento || 'PJ'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {pessoasEscopadas.length === 0 && (
                <p className="text-[11px] text-amber-600 mt-1">
                  Nenhum prestador vinculado a esta BU encontrado.
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data do Apontamento</Label>
                <Input
                  type="date"
                  value={lancamentoData}
                  onChange={(e) => setLancamentoData(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Horas</Label>
                <Input
                  type="number"
                  step="0.5"
                  value={lancamentoHoras}
                  onChange={(e) => setLancamentoHoras(Number(e.target.value))}
                  className="text-xs font-mono"
                  placeholder="Ex: 40"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Tipo de Hora</Label>
              <Select value={lancamentoTipo} onValueChange={(val: any) => setLancamentoTipo(val)}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Normal" className="text-xs">
                    Normal (Sprint / Horas Contratadas)
                  </SelectItem>
                  <SelectItem value="Extra" className="text-xs">
                    Extra (Plantão / Demandas Urgentes)
                  </SelectItem>
                  <SelectItem value="Sobreaviso" className="text-xs">
                    Sobreaviso
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Descrição da Atividade / Escopo</Label>
              <Textarea
                value={lancamentoDesc}
                onChange={(e) => setLancamentoDesc(e.target.value)}
                placeholder="Ex: Entrega de migração cloud, refatoração de CI/CD e suporte a deploys..."
                className="text-xs h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalLancamentoOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSalvarApontamento}
              disabled={salvandoApontamento}
              className="bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold"
            >
              {salvandoApontamento ? 'Gravando...' : 'Gravar Apontamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL DE VALIDAÇÃO E APROVAÇÃO / DEVOLUÇÃO PELO RH */}
      <Dialog open={modalValidacaoOpen} onOpenChange={setModalValidacaoOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-[#212B55] dark:text-[#F7F8FB] font-display flex items-center gap-2">
              {tipoAcaoValidacao === 'aprovar' ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Validação e Aprovação pelo RH
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5 text-amber-600" />
                  Devolver Apontamento com Observações
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs font-sans">
              {tipoAcaoValidacao === 'aprovar'
                ? 'Como RH, confirme as horas apontadas pelo gestor da área para congelar o valor e habilitar a emissão de NF.'
                : 'Descreva os motivos, divergências de horas ou correções necessárias para o gestor ajustar.'}
            </DialogDescription>
          </DialogHeader>

          {fechamentoEmAcao && (
            <div className="space-y-4 py-2">
              <div className="bg-muted/40 p-3 rounded border border-border/60 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Competência:</span>
                  <span className="font-mono font-bold">{fechamentoEmAcao.competencia}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Horas Apontadas:</span>
                  <span className="font-mono font-bold">{fechamentoEmAcao.total_horas}h</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Valor Congelado Calculado:</span>
                  <span className="font-mono font-bold text-[#E9530E]">
                    R${' '}
                    {(fechamentoEmAcao.valor_total_calculado || 0).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  {tipoAcaoValidacao === 'aprovar'
                    ? 'Parecer de Aprovação do RH (opcional)'
                    : 'Observações / Motivo da Devolução (obrigatório)'}
                </Label>
                <Textarea
                  placeholder={
                    tipoAcaoValidacao === 'aprovar'
                      ? 'Ex: Apontamento em conformidade com o cronograma e contrato ativo...'
                      : 'Ex: Faltou detalhar horas extras do período; favor revisar as entregas...'
                  }
                  value={parecerTexto}
                  onChange={(e) => setParecerTexto(e.target.value)}
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setModalValidacaoOpen(false)
                    setFechamentoEmAcao(null)
                  }}
                  className="flex-1 h-9 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmarValidacaoRh}
                  disabled={salvandoValidacao}
                  className={`flex-1 h-9 text-xs text-white font-bold ${
                    tipoAcaoValidacao === 'aprovar'
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {tipoAcaoValidacao === 'aprovar' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Validar & Aprovar (RH)
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 mr-1" />
                      Confirmar Devolução
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 2: Solicitar NFs em Lote */}
      <Dialog open={modalLoteOpen} onOpenChange={setModalLoteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Disparo de Solicitação de NFs em Lote</DialogTitle>
            <DialogDescription>
              Você está prestes a disparar a solicitação formal de Notas Fiscais para{' '}
              <strong className="text-foreground">{selecionados.size} prestador(es)</strong> com
              horas validadas na competência {competencia}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-[#FEF1EA] dark:bg-[#212B55]/50 border border-[#E9530E]/30 p-3 rounded-lg text-xs space-y-1.5">
              <div className="font-bold text-[#E9530E] flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" />
                Disparo Automatizado & Notificações
              </div>
              <p className="text-muted-foreground">
                Cada prestador PJ receberá o registro de solicitação no sistema com o valor exato
                calculado a partir das horas validadas pelo gestor contratante.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Prazo de Envio (Dias Úteis)</Label>
              <Input
                type="number"
                min="1"
                max="30"
                value={prazoDiasLote}
                onChange={(e) => setPrazoDiasLote(Number(e.target.value))}
                className="text-xs font-mono"
              />
              <span className="text-[10px] text-muted-foreground">
                Padrão institucional SouYess: 5 dias úteis.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalLoteOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarDisparoLote}
              disabled={disparandoLote}
              className="bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold"
            >
              {disparandoLote ? 'Disparando...' : 'Confirmar Disparo em Lote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: Cobrança de NF em Atraso */}
      <Dialog open={modalCobrancaOpen} onOpenChange={setModalCobrancaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cobrança de Nota Fiscal em Atraso</DialogTitle>
            <DialogDescription>
              Registre uma cobrança formal de NF pendente de envio pelo prestador PJ.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 rounded-lg text-xs space-y-1">
              <div className="font-bold text-red-700 dark:text-red-300">
                Prestador: {nfParaCobrar?.expand?.pessoa?.nome || 'Prestador PJ'}
              </div>
              <div className="text-red-600 font-mono">
                Valor: R${' '}
                {nfParaCobrar?.valor?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ·
                Competência: {nfParaCobrar?.competencia}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Canal de Cobrança</Label>
              <Select value={canalCobranca} onValueChange={(val: any) => setCanalCobranca(val)}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Canal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Email" className="text-xs">
                    E-mail Institucional
                  </SelectItem>
                  <SelectItem value="WhatsApp" className="text-xs">
                    WhatsApp Corporativo
                  </SelectItem>
                  <SelectItem value="In-app" className="text-xs">
                    Notificação In-app
                  </SelectItem>
                  <SelectItem value="Telefone" className="text-xs">
                    Ligação Telefônica
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Observação / Mensagem Enviada</Label>
              <Textarea
                value={obsCobranca}
                onChange={(e) => setObsCobranca(e.target.value)}
                placeholder="Ex: Prestador cobrado por e-mail com aviso de risco de atraso no cronograma financeiro..."
                className="text-xs h-20"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalCobrancaOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarCobranca}
              disabled={salvandoCobranca}
              className="bg-red-600 hover:bg-red-700 text-white font-bold"
            >
              {salvandoCobranca ? 'Gravando...' : 'Registrar Cobrança'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 4: Upload Real do Arquivo da NF */}
      <Dialog open={modalUploadNfOpen} onOpenChange={setModalUploadNfOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Anexar Arquivo da Nota Fiscal</DialogTitle>
            <DialogDescription>
              Faça o upload do documento fiscal (PDF ou XML) emitido pelo prestador.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Número da NF</Label>
                <Input
                  value={numeroNfInput}
                  onChange={(e) => setNumeroNfInput(e.target.value)}
                  placeholder="Ex: NFS-2026-981"
                  className="text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Data de Emissão</Label>
                <Input
                  type="date"
                  value={dataEmissaoNfInput}
                  onChange={(e) => setDataEmissaoNfInput(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Arquivo da Nota Fiscal (PDF ou XML)</Label>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.xml,image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) setArquivoNfSelecionado(f)
                }}
                className="text-xs cursor-pointer"
              />
              <span className="text-[10px] text-muted-foreground">
                Tamanho máximo permitido: 10MB.
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setModalUploadNfOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmarUploadNf}
              disabled={salvandoUploadNf}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
            >
              {salvandoUploadNf ? 'Enviando...' : 'Salvar Documento Fiscal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visualizador de Arquivo */}
      <DocumentViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        url={viewerUrl}
        title={viewerTitle}
      />
    </div>
  )
}
