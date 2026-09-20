import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  PrestadorPJ,
  ContratoPJ,
  DocumentoPJ,
  NotaFiscalPJ,
  AvaliacaoPrestadorPJ,
  MarcoLifecyclePJ,
  AditivoPJ,
  prestadoresService,
  getAnexoUrl,
  calcularValorMensalEfetivo,
  calcularVigenciaFimEfetiva,
  calcularValorHora,
  HORAS_MES_PADRAO,
} from '@/services/prestadoresPj'
import { useToast } from '@/hooks/use-toast'
import {
  Building2,
  FileText,
  FileCheck,
  DollarSign,
  Star,
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  AlertTriangle,
  Clock,
  ArrowLeft,
  Edit2,
  ShieldAlert,
  GitCommit,
  Sparkles,
  FileSignature,
  TrendingUp,
} from 'lucide-react'
import { DocumentViewerModal } from './DocumentViewerModal'
import { LifecycleJornadaPJ } from './LifecycleJornadaPJ'
import { AbaAditivos } from './AbaAditivos'
import { BlocoPrazosEFinanceiroContrato } from './BlocoPrazosEFinanceiroContrato'
import { ModalNovoAditivo } from './ModalNovoAditivo'
import {
  ModalNovoContrato,
  ModalNovoDocumento,
  ModalNovaNotaFiscal,
  ModalNovaAvaliacao,
} from './ModaisPrestadorSecundarios'

interface PrestadorDetalhesViewProps {
  prestador: PrestadorPJ
  contratos: ContratoPJ[]
  documentos: DocumentoPJ[]
  notasFiscais: NotaFiscalPJ[]
  avaliacoes: AvaliacaoPrestadorPJ[]
  aditivos?: AditivoPJ[]
  marcosLifecycle?: MarcoLifecyclePJ[]
  onVoltar: () => void
  onEditar: () => void
  onAtualizarDados: () => void
}

export const PrestadorDetalhesView: React.FC<PrestadorDetalhesViewProps> = ({
  prestador,
  contratos,
  documentos,
  notasFiscais,
  avaliacoes,
  aditivos: propsAditivos = [],
  marcosLifecycle = [],
  onVoltar,
  onEditar,
  onAtualizarDados,
}) => {
  const { toast } = useToast()

  // Controle de Abas: 'jornada' é a seção PRINCIPAL e DOMINANTE
  const [activeTab, setActiveTab] = useState<
    'jornada' | 'perfil' | 'aditivos' | 'documentos' | 'notas' | 'avaliacoes'
  >('jornada')

  // Aditivos locais
  const [aditivosLocais, setAditivosLocais] = useState<AditivoPJ[]>(propsAditivos || [])
  const [modalNovoAditivoOpen, setModalNovoAditivoOpen] = useState(false)
  const [contratoPreSelecionadoId, setContratoPreSelecionadoId] = useState<string | undefined>(
    undefined,
  )

  const carregarAditivos = async () => {
    try {
      const lista = await prestadoresService.listarAditivos({ prestadorId: prestador.id })
      setAditivosLocais(lista)
    } catch (err) {
      console.warn('Erro ao carregar aditivos do prestador:', err)
    }
  }

  React.useEffect(() => {
    carregarAditivos()
  }, [prestador.id])

  // Marcos de Lifecycle locais
  const [marcosLocais, setMarcosLocais] = useState<MarcoLifecyclePJ[]>(marcosLifecycle)
  const [carregandoMarcos, setCarregandoMarcos] = useState(false)

  // Carga ou inicialização de marcos
  const carregarMarcos = async () => {
    setCarregandoMarcos(true)
    try {
      let list = await prestadoresService.listarMarcosLifecycle(prestador.id)
      if (list.length === 0) {
        list = await prestadoresService.inicializarMarcosParaPrestador(prestador.id, prestador)
      } else {
        // Tentar sincronização inteligente com dados reais
        const mudou = await prestadoresService.sincronizarMarcosComDadosReais(
          prestador,
          list,
          contratos,
          documentos,
          notasFiscais,
        )
        if (mudou) {
          list = await prestadoresService.listarMarcosLifecycle(prestador.id)
        }
      }
      setMarcosLocais(list)
    } catch (err) {
      console.warn('Erro ao carregar marcos do prestador:', err)
    } finally {
      setCarregandoMarcos(false)
    }
  }

  React.useEffect(() => {
    carregarMarcos()
  }, [prestador.id])

  // Recarga composta
  const handleRecarregarTudo = async () => {
    await Promise.all([carregarMarcos(), carregarAditivos()])
    onAtualizarDados()
  }

  // Modais de Cadastro
  const [modalContratoOpen, setModalContratoOpen] = useState(false)
  const [modalDocumentoOpen, setModalDocumentoOpen] = useState(false)
  const [modalNotaOpen, setModalNotaOpen] = useState(false)
  const [modalAvaliacaoOpen, setModalAvaliacaoOpen] = useState(false)

  // Visualizador de PDF / Arquivos
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerUrl, setViewerUrl] = useState('')
  const [viewerTitle, setViewerTitle] = useState('')
  const [viewerFilename, setViewerFilename] = useState<string | undefined>(undefined)

  const abrirVisualizador = (record: any, filename?: string, title?: string) => {
    if (!filename) return
    const url = getAnexoUrl(record, filename)
    setViewerUrl(url)
    setViewerTitle(title || filename)
    setViewerFilename(filename)
    setViewerOpen(true)
  }

  // Ações de Exclusão com Confirmação
  const handleExcluirContrato = async (id: string, titulo: string) => {
    if (!confirm(`Deseja realmente remover o contrato "${titulo}"?`)) return
    try {
      await prestadoresService.excluirContrato(id)
      toast({ title: 'Contrato removido com sucesso.' })
      onAtualizarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao remover contrato',
        description: err instanceof Error ? err.message : 'Falha.',
        variant: 'destructive',
      })
    }
  }

  const handleExcluirDocumento = async (id: string, titulo: string) => {
    if (!confirm(`Deseja remover o documento "${titulo}"?`)) return
    try {
      await prestadoresService.excluirDocumento(id)
      toast({ title: 'Documento removido.' })
      onAtualizarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao remover documento',
        description: err instanceof Error ? err.message : 'Falha.',
        variant: 'destructive',
      })
    }
  }

  const handleExcluirNotaFiscal = async (id: string, numero: string) => {
    if (!confirm(`Deseja remover a nota fiscal ${numero}?`)) return
    try {
      await prestadoresService.excluirNotaFiscal(id)
      toast({ title: 'Nota fiscal removida.' })
      onAtualizarDados()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao remover nota fiscal',
        description: err instanceof Error ? err.message : 'Falha.',
        variant: 'destructive',
      })
    }
  }

  // Cálculos de resumo financeiro do prestador considerando aditivos vigentes
  const totalMensal = contratos
    .filter((c) => c.status === 'Vigente' || c.status === 'Vencendo')
    .reduce((acc, c) => {
      const adits = aditivosLocais.filter((a) => a.contrato === c.id)
      return acc + calcularValorMensalEfetivo(c, adits)
    }, 0)

  // Valor-hora total médio ponderado considerando a premissa de 160h/mês
  const valorHoraGeral = Number((totalMensal / HORAS_MES_PADRAO).toFixed(2))

  const totalAditivos = aditivosLocais.length

  const nfsPendentes = notasFiscais.filter((n) => n.status !== 'Paga' && n.status !== 'Glosada')
  const totalPendente = nfsPendentes.reduce((acc, n) => acc + (n.valor || 0), 0)

  // Status visual do prestador
  const statusBadge = (st: string) => {
    switch (st) {
      case 'Ativo':
        return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Ativo</Badge>
      case 'Em renovação':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Em renovação</Badge>
      case 'Pausado':
        return <Badge className="bg-slate-100 text-slate-800 border-slate-200">Pausado</Badge>
      case 'Encerrado':
        return <Badge className="bg-rose-100 text-rose-800 border-rose-200">Encerrado</Badge>
      default:
        return <Badge variant="outline">{st}</Badge>
    }
  }

  const statusDocBadge = (st?: string) => {
    switch (st) {
      case 'Válido':
        return <Badge className="bg-emerald-100 text-emerald-800 text-[11px]">Válido</Badge>
      case 'Vencendo':
        return (
          <Badge className="bg-amber-100 text-amber-800 text-[11px] animate-pulse">Vencendo</Badge>
        )
      case 'Vencido':
        return <Badge className="bg-rose-100 text-rose-800 text-[11px]">Vencido</Badge>
      default:
        return (
          <Badge variant="outline" className="text-[11px] text-slate-500">
            Sem validade
          </Badge>
        )
    }
  }

  const statusNfBadge = (st: string) => {
    switch (st) {
      case 'Paga':
        return <Badge className="bg-emerald-100 text-emerald-800 text-[11px]">Paga</Badge>
      case 'Aprovada para pagamento':
        return (
          <Badge className="bg-blue-100 text-blue-800 text-[11px]">Aprovada p/ Pagamento</Badge>
        )
      case 'Em conferência':
        return <Badge className="bg-amber-100 text-amber-800 text-[11px]">Em Conferência</Badge>
      case 'Recebida':
        return <Badge className="bg-slate-100 text-slate-700 text-[11px]">Recebida</Badge>
      case 'Atrasada':
        return <Badge className="bg-rose-100 text-rose-800 text-[11px]">Atrasada</Badge>
      case 'Glosada':
        return <Badge className="bg-purple-100 text-purple-800 text-[11px]">Glosada</Badge>
      default:
        return (
          <Badge variant="outline" className="text-[11px]">
            {st}
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Barra de navegação e cabeçalho do Prestador */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onVoltar}
            className="h-9 px-3 border-slate-200 text-slate-600 hover:text-slate-900 bg-white"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Voltar à Listagem
          </Button>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">
                {prestador.nome_fantasia || prestador.razao_social}
              </h2>
              {statusBadge(prestador.status)}
            </div>
            <p className="text-xs text-slate-500 font-mono">
              CNPJ: {prestador.cnpj} &bull; {prestador.razao_social}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onEditar}
            className="h-9 text-xs border-slate-200 text-slate-700 bg-white hover:bg-slate-50"
          >
            <Edit2 className="w-3.5 h-3.5 mr-1.5" />
            Editar Dados
          </Button>
          <Button
            size="sm"
            onClick={() => setModalContratoOpen(true)}
            className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Novo Contrato
          </Button>
        </div>
      </div>

      {/* Mini Cards de KPIs do Prestador com Financeiro em Destaque e Valor-Hora (Base 160h) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Comprometimento Mensal Efetivo */}
        <Card className="border-slate-200 shadow-xs bg-gradient-to-br from-white to-blue-50/30">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-slate-500">Valor Mensal Atual</span>
            <div className="text-lg font-bold text-blue-700 mt-1">
              R$ {totalMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400">Considerando aditivos vigentes</span>
          </CardContent>
        </Card>

        {/* Card 2: Valor-Hora (Base 160h/mês) em Destaque */}
        <Card className="border-indigo-200 shadow-xs bg-gradient-to-br from-white to-indigo-50/40">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-indigo-700">Valor-Hora Calculado</span>
              <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                160h/mês
              </span>
            </div>
            <div className="text-lg font-extrabold text-indigo-900 mt-1">
              R$ {valorHoraGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              <span className="text-xs font-normal text-indigo-600">/h</span>
            </div>
            <span className="text-[10px] text-indigo-600 font-mono">
              (R$ {totalMensal.toLocaleString('pt-BR')} ÷ 160h)
            </span>
          </CardContent>
        </Card>

        {/* Card 3: Aditivos Formalizados */}
        <Card className="border-slate-200 shadow-xs bg-gradient-to-br from-white to-purple-50/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-500">Aditivos Contratuais</span>
              <FileSignature className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-lg font-bold text-purple-900 mt-1">
              {totalAditivos} formalizado(s)
            </div>
            <span className="text-[10px] text-purple-700">
              {aditivosLocais.filter((a) => a.status === 'Pendente de assinatura').length > 0
                ? `${aditivosLocais.filter((a) => a.status === 'Pendente de assinatura').length} pendente(s)`
                : 'Todos regularizados'}
            </span>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-xs bg-gradient-to-br from-white to-slate-50/50">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-slate-500">Média de Desempenho</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-lg font-bold text-purple-700">
                {prestador.media_avaliacao ? prestador.media_avaliacao.toFixed(1) : '—'}
              </span>
              <div className="flex text-purple-500">
                <Star className="w-4 h-4 fill-purple-600 text-purple-600" />
              </div>
              <span className="text-xs text-slate-400">/10</span>
            </div>
            <span className="text-[10px] text-slate-400">
              {avaliacoes.length} avaliação(ões) registrada(s)
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-gradient-to-br from-white to-slate-50/50">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-slate-500">Documentos em Dia</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-bold text-slate-900">
                {
                  documentos.filter(
                    (d) => d.status_calculado === 'Válido' || d.status_calculado === 'Sem validade',
                  ).length
                }
                <span className="text-slate-400 text-sm font-normal"> / {documentos.length}</span>
              </span>
            </div>
            <span className="text-[10px] text-slate-400">
              {documentos.filter((d) => d.status_calculado === 'Vencido').length} vencido(s)
            </span>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs bg-gradient-to-br from-white to-slate-50/50">
          <CardContent className="p-4">
            <span className="text-[11px] font-medium text-slate-500">NFs Pendentes</span>
            <div className="text-lg font-bold text-amber-700 mt-1">
              R$ {totalPendente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-400">
              {nfsPendentes.length} fatura(s) em aberto
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Abas Principais com a JORNADA como seção PRINCIPAL / DOMINANTE */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-4">
        <TabsList className="bg-slate-100 p-1 border border-slate-200/80 rounded-xl flex flex-wrap">
          <TabsTrigger
            value="jornada"
            className="gap-2 text-xs font-bold data-[state=active]:bg-white data-[state=active]:text-emerald-800 shadow-2xs"
          >
            <GitCommit className="w-3.5 h-3.5 text-emerald-600" />
            Jornada do Prestador ({prestador.etapa_lifecycle || 'Lifecycle'})
          </TabsTrigger>
          <TabsTrigger value="perfil" className="gap-2 text-xs">
            <Building2 className="w-3.5 h-3.5" />
            Perfil & Contratos ({contratos.length})
          </TabsTrigger>
          <TabsTrigger
            value="aditivos"
            className="gap-2 text-xs font-semibold data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-900"
          >
            <FileSignature className="w-3.5 h-3.5 text-indigo-600" />
            Aditivos & Prazos ({aditivosLocais.length})
          </TabsTrigger>
          <TabsTrigger value="documentos" className="gap-2 text-xs">
            <FileCheck className="w-3.5 h-3.5" />
            Documentos & Certidões ({documentos.length})
          </TabsTrigger>
          <TabsTrigger value="notas" className="gap-2 text-xs">
            <DollarSign className="w-3.5 h-3.5" />
            Notas Fiscais ({notasFiscais.length})
          </TabsTrigger>
          <TabsTrigger value="avaliacoes" className="gap-2 text-xs">
            <Star className="w-3.5 h-3.5" />
            Avaliações ({avaliacoes.length})
          </TabsTrigger>
        </TabsList>

        {/* ------------------------------------------------------------------ */}
        {/* ABA DOMINANTE: JORNADA DE LIFECYCLE COMPLETA (Entrada até Saída)   */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="jornada" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-1">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <GitCommit className="w-4 h-4 text-emerald-600" />
                Jornada de Lifecycle do Prestador PJ
              </h3>
              <p className="text-xs text-slate-500">
                Acompanhamento contínuo da Entrada à Saída com validação de CNPJ, contratos,
                aprovação de notas fiscais, aditivos e encerramento.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRecarregarTudo}
                className="h-8 text-xs border-slate-200 text-slate-700 bg-white"
              >
                Sincronizar Marcos
              </Button>
            </div>
          </div>

          <LifecycleJornadaPJ
            prestador={prestador}
            marcos={marcosLocais}
            onAtualizar={handleRecarregarTudo}
          />
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* ABA: Aditivos Contratuais & Controle de Prazos                     */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="aditivos" className="space-y-6">
          {/* Seção de Prazos e Semáforos de Cada Contrato */}
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-purple-600" />
                Controle de Prazos & Semáforo de Vigência Contratual
              </h3>
              <p className="text-xs text-slate-500">
                Prazos em tempo real com semáforo (Verde / Âmbar / Vermelho), dias restantes e
                valor-hora com base 160h/mês.
              </p>
            </div>

            <div className="space-y-3">
              {contratos.map((ct) => (
                <BlocoPrazosEFinanceiroContrato
                  key={ct.id}
                  contrato={ct}
                  aditivos={aditivosLocais}
                  onNovoAditivo={() => {
                    setContratoPreSelecionadoId(ct.id)
                    setModalNovoAditivoOpen(true)
                  }}
                />
              ))}
            </div>
          </div>

          {/* Aba de Aditivos com histórico completo e delta */}
          <AbaAditivos
            prestador={prestador}
            contratos={contratos}
            aditivos={aditivosLocais}
            onAtualizar={handleRecarregarTudo}
          />
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* ABA 2: Perfil da Empresa & Lista de Contratos                      */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="perfil" className="space-y-6">
          {/* Informações da Empresa */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-2 border-slate-200 shadow-xs">
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between border-b pb-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    Ficha Cadastral da Empresa
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    {prestador.regime_tributario || 'Regime não informado'}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Área de Atuação</span>
                    <span className="font-semibold text-slate-800">{prestador.area_atuacao}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Parceria Desde</span>
                    <span className="font-semibold text-slate-800">
                      {prestador.data_inicio_parceria
                        ? new Date(prestador.data_inicio_parceria).toLocaleDateString('pt-BR')
                        : 'Não informada'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Responsável Comercial</span>
                    <span className="font-semibold text-slate-800">
                      {prestador.contato_nome || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">E-mail de Contato</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      {prestador.contato_email || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Telefone</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {prestador.contato_telefone || '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Endereço Comercial</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {prestador.endereco || '—'}
                    </span>
                  </div>
                </div>

                {/* Dados Bancários */}
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 mt-4">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                    <CreditCard className="w-4 h-4 text-slate-600" />
                    <span>Dados de Faturamento & PIX</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    <strong>Banco:</strong> {prestador.banco || 'Não informado'}
                  </p>
                  <p className="text-xs text-slate-600 font-mono mt-0.5">
                    {prestador.dados_bancarios || 'Chave PIX/Conta bancária não preenchida.'}
                  </p>
                </div>

                {prestador.observacoes && (
                  <div className="text-xs text-slate-600 border-t pt-3">
                    <strong className="block text-slate-700 mb-1">Observações Internas:</strong>
                    <p className="italic bg-amber-50/50 p-2.5 rounded border border-amber-200/50">
                      {prestador.observacoes}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cartão de Contrato Social */}
            <Card className="border-slate-200 shadow-xs">
              <CardContent className="p-6 flex flex-col justify-between h-full space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    Contrato Social Arquivado
                  </h3>
                  <p className="text-xs text-slate-500">
                    Documento de constituição da empresa e últimas alterações contratuais.
                  </p>
                </div>

                {prestador.contrato_social_anexo ? (
                  <div className="bg-blue-50/70 border border-blue-200/70 rounded-xl p-4 text-center">
                    <FileText className="w-10 h-10 text-blue-600 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-blue-900 truncate">
                      {prestador.contrato_social_anexo}
                    </p>
                    <p className="text-[11px] text-blue-700/80 mb-3">Documento verificado</p>
                    <Button
                      size="sm"
                      onClick={() =>
                        abrirVisualizador(
                          prestador,
                          prestador.contrato_social_anexo,
                          `Contrato Social - ${prestador.razao_social}`,
                        )
                      }
                      className="w-full h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      <ExternalLink className="w-3.5 h-3.5 mr-1" />
                      Visualizar PDF
                    </Button>
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-6 text-center">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium">
                      Nenhum contrato social anexado
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onEditar}
                      className="mt-3 text-xs border-slate-300 text-slate-700"
                    >
                      Fazer Upload
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Lista de Contratos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Contratos de Prestação de Serviços
                </h3>
                <p className="text-xs text-slate-500">
                  Histórico de contratos, vigências, valores e aditivos.
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => setModalContratoOpen(true)}
                className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Adicionar Contrato
              </Button>
            </div>

            {contratos.length === 0 ? (
              <Card className="border-dashed border-slate-300">
                <CardContent className="p-8 text-center text-xs text-slate-500">
                  Nenhum contrato registrado para este prestador. Clique em "Adicionar Contrato"
                  para vincular.
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {contratos.map((c) => {
                  const inicio = new Date(c.data_inicio).toLocaleDateString('pt-BR')
                  const fim = new Date(c.data_fim).toLocaleDateString('pt-BR')
                  const diffDias = Math.ceil(
                    (new Date(c.data_fim).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
                  )
                  const isVencendo = diffDias <= 30 && diffDias > 0

                  return (
                    <Card
                      key={c.id}
                      className={`border shadow-xs transition-all ${
                        isVencendo
                          ? 'border-amber-300 bg-amber-50/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <CardContent className="p-5 space-y-3">
                        {(() => {
                          const aditsDeste = aditivosLocais.filter((a) => a.contrato === c.id)
                          const valorEfetivo = calcularValorMensalEfetivo(c, aditsDeste)
                          const infoHora = calcularValorHora(c, aditsDeste)
                          const vigenciaEfetiva = calcularVigenciaFimEfetiva(c, aditsDeste)
                          const contagemAdit = aditsDeste.length

                          return (
                            <>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-bold text-slate-900">{c.titulo}</h4>
                                    <Badge
                                      variant={
                                        c.status === 'Vigente'
                                          ? 'default'
                                          : c.status === 'Vencendo'
                                            ? 'destructive'
                                            : 'outline'
                                      }
                                      className="text-[10px]"
                                    >
                                      {c.status}
                                    </Badge>
                                    {contagemAdit > 0 && (
                                      <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px]">
                                        {contagemAdit} aditivo(s)
                                      </Badge>
                                    )}
                                  </div>
                                  {c.numero_contrato && (
                                    <span className="text-[11px] font-mono text-slate-400">
                                      Nº: {c.numero_contrato}
                                    </span>
                                  )}
                                </div>

                                <div className="text-right">
                                  <span className="text-sm font-extrabold text-blue-700 block">
                                    R${' '}
                                    {valorEfetivo.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                    })}
                                    <span className="text-[10px] text-slate-400 font-normal ml-1">
                                      /{c.tipo}
                                    </span>
                                  </span>
                                  <span className="text-[10px] text-indigo-700 font-semibold block">
                                    R$ {infoHora.valorHora.toFixed(2)}/h
                                    <span className="text-[9px] text-slate-400 font-normal ml-0.5">
                                      (160h/mês)
                                    </span>
                                  </span>
                                </div>
                              </div>
                            </>
                          )
                        })()}

                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Início: <strong>{inicio}</strong>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              Fim:{' '}
                              <strong className={isVencendo ? 'text-amber-700' : ''}>{fim}</strong>
                            </span>
                          </div>
                          {c.gestor_nome && (
                            <div className="col-span-2 text-[11px] text-slate-500">
                              Gestor Interno: <strong>{c.gestor_nome}</strong>
                            </div>
                          )}
                        </div>

                        {isVencendo && (
                          <div className="text-[11px] text-amber-800 bg-amber-100/60 p-2 rounded flex items-center gap-1.5 font-medium">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>
                              Vigência encerra em {diffDias} dias! Considere iniciar a renovação.
                            </span>
                          </div>
                        )}

                        {c.clausulas_resumo && (
                          <p className="text-xs text-slate-600 line-clamp-2 italic">
                            "{c.clausulas_resumo}"
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                          {c.contrato_assinado_anexo ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                abrirVisualizador(
                                  c,
                                  c.contrato_assinado_anexo,
                                  `Contrato: ${c.titulo}`,
                                )
                              }
                              className="h-7 text-xs text-blue-600 hover:text-blue-800 px-2"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Ver Contrato Assinado
                            </Button>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">
                              Sem PDF assinado
                            </span>
                          )}

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExcluirContrato(c.id, c.titulo)}
                            className="h-7 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* ABA 2: Documentos & Certidões Fiscais/Trabalhistas                 */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="documentos" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Documentos e Certidões de Regularidade
              </h3>
              <p className="text-xs text-slate-500">
                Monitoramento de CNDT, CRF/FGTS, certidões negativas e prazos de validade.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setModalDocumentoOpen(true)}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Novo Documento / Certidão
            </Button>
          </div>

          {documentos.length === 0 ? (
            <Card className="border-dashed border-slate-300">
              <CardContent className="p-8 text-center text-xs text-slate-500">
                Nenhuma certidão ou documento anexado para este prestador.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documentos.map((doc) => {
                const emissao = doc.data_emissao
                  ? new Date(doc.data_emissao).toLocaleDateString('pt-BR')
                  : '—'
                const validade = doc.data_validade
                  ? new Date(doc.data_validade).toLocaleDateString('pt-BR')
                  : 'Sem vencimento'

                const isVencido = doc.status_calculado === 'Vencido'
                const isVencendo = doc.status_calculado === 'Vencendo'

                return (
                  <Card
                    key={doc.id}
                    className={`border shadow-xs ${
                      isVencido
                        ? 'border-rose-300 bg-rose-50/20'
                        : isVencendo
                          ? 'border-amber-300 bg-amber-50/20'
                          : 'border-slate-200 bg-white'
                    }`}
                  >
                    <CardContent className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-1.5">
                        <div>
                          <Badge variant="outline" className="text-[10px] text-slate-600 mb-1">
                            {doc.tipo_documento}
                          </Badge>
                          <h4 className="text-xs font-bold text-slate-900 leading-snug">
                            {doc.titulo_personalizado || doc.tipo_documento}
                          </h4>
                        </div>
                        {statusDocBadge(doc.status_calculado)}
                      </div>

                      <div className="text-[11px] text-slate-600 space-y-1 bg-slate-50 p-2 rounded">
                        <div>
                          Emissão: <strong>{emissao}</strong>
                        </div>
                        <div
                          className={
                            isVencido
                              ? 'text-rose-700 font-bold'
                              : isVencendo
                                ? 'text-amber-700 font-bold'
                                : ''
                          }
                        >
                          Validade: <strong>{validade}</strong>
                        </div>
                      </div>

                      {doc.observacao && (
                        <p className="text-[11px] text-slate-500 italic truncate">
                          {doc.observacao}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                        {doc.anexo ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              abrirVisualizador(
                                doc,
                                doc.anexo,
                                doc.titulo_personalizado || doc.tipo_documento,
                              )
                            }
                            className="h-7 text-xs text-emerald-700 hover:text-emerald-900 px-2"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Visualizar Anexo
                          </Button>
                        ) : (
                          <span className="text-[10px] text-slate-400">Sem arquivo anexado</span>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExcluirDocumento(doc.id, doc.tipo_documento)}
                          className="h-7 text-xs text-rose-500 hover:text-rose-700 px-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* ABA 3: Notas Fiscais & Faturamento                                 */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="notas" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Notas Fiscais de Prestação</h3>
              <p className="text-xs text-slate-500">
                Acompanhe status de liquidação, prazos de vencimento e retenções.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setModalNotaOpen(true)}
              className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Lançar Nota Fiscal
            </Button>
          </div>

          {notasFiscais.length === 0 ? (
            <Card className="border-dashed border-slate-300">
              <CardContent className="p-8 text-center text-xs text-slate-500">
                Nenhuma nota fiscal lançada para este prestador.
              </CardContent>
            </Card>
          ) : (
            <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Número NF</th>
                    <th className="py-2.5 px-3">Competência</th>
                    <th className="py-2.5 px-3">Valor</th>
                    <th className="py-2.5 px-3">Emissão</th>
                    <th className="py-2.5 px-3">Vencimento</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Anexo</th>
                    <th className="py-2.5 px-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {notasFiscais.map((nf) => {
                    const emissao = new Date(nf.data_emissao).toLocaleDateString('pt-BR')
                    const vencimento = new Date(nf.data_vencimento).toLocaleDateString('pt-BR')

                    return (
                      <tr key={nf.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-2.5 px-3 font-bold font-mono text-slate-900">
                          {nf.numero_nf}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-700">
                          {nf.competencia}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-slate-900">
                          R$ {nf.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500">{emissao}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-700">
                          <span
                            className={nf.status === 'Atrasada' ? 'text-rose-600 font-bold' : ''}
                          >
                            {vencimento}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{statusNfBadge(nf.status)}</td>
                        <td className="py-2.5 px-3">
                          {nf.anexo ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                abrirVisualizador(
                                  nf,
                                  nf.anexo,
                                  `Nota Fiscal ${nf.numero_nf} (${nf.competencia})`,
                                )
                              }
                              className="h-6 text-xs text-blue-600 hover:text-blue-800 p-0"
                            >
                              <ExternalLink className="w-3 h-3 mr-1" />
                              Ver NF
                            </Button>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Sem anexo</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleExcluirNotaFiscal(nf.id, nf.numero_nf)}
                            className="h-6 w-6 p-0 text-rose-500 hover:text-rose-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        {/* ------------------------------------------------------------------ */}
        {/* ABA 4: Avaliações de Desempenho e Recomendações                     */}
        {/* ------------------------------------------------------------------ */}
        <TabsContent value="avaliacoes" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Avaliações Trimestrais & Desempenho
              </h3>
              <p className="text-xs text-slate-500">
                Métricas de qualidade, prazo, comunicação, alinhamento cultural e recomendação de
                continuidade.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setModalAvaliacaoOpen(true)}
              className="h-8 text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Nova Avaliação
            </Button>
          </div>

          {avaliacoes.length === 0 ? (
            <Card className="border-dashed border-slate-300">
              <CardContent className="p-8 text-center text-xs text-slate-500">
                Nenhuma avaliação de desempenho registrada até o momento.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {avaliacoes.map((av) => {
                const recClass =
                  av.recomendacao === 'Continuar'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    : av.recomendacao === 'Renovar com ressalvas'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-rose-100 text-rose-800 border-rose-200'

                return (
                  <Card key={av.id} className="border border-slate-200 shadow-xs bg-white">
                    <CardContent className="p-5 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-3">
                        <div>
                          <span className="text-xs font-bold text-slate-900">
                            Período: {av.periodo_avaliado}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            Avaliador: {av.avaliador_nome || 'Gestor RH'} &bull; Registrado em{' '}
                            {new Date(av.created).toLocaleDateString('pt-BR')}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <Badge className={recClass}>{av.recomendacao}</Badge>
                          <div className="flex items-center gap-1 bg-purple-50 px-3 py-1 rounded-full border border-purple-200">
                            <Star className="w-3.5 h-3.5 fill-purple-600 text-purple-600" />
                            <span className="text-xs font-bold text-purple-900">
                              Nota Média: {av.nota_media.toFixed(1)}/10
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Critérios Individuais */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px]">
                            Qualidade Técnica
                          </span>
                          <span className="font-bold text-slate-800">
                            {av.nota_qualidade_tecnica}/10
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">
                            Cumprimento de Prazo
                          </span>
                          <span className="font-bold text-slate-800">{av.nota_prazo}/10</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">Comunicação</span>
                          <span className="font-bold text-slate-800">{av.nota_comunicacao}/10</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px]">
                            Aderência Cultural
                          </span>
                          <span className="font-bold text-slate-800">
                            {av.nota_aderencia_cultural}/10
                          </span>
                        </div>
                      </div>

                      {av.comentario && (
                        <div className="text-xs text-slate-700 bg-purple-50/40 p-3 rounded-lg border border-purple-100">
                          <strong className="block text-purple-950 mb-0.5">
                            Parecer da Liderança:
                          </strong>
                          <p>{av.comentario}</p>
                        </div>
                      )}

                      {(av.pontos_fortes || av.pontos_melhoria) && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                          {av.pontos_fortes && (
                            <div className="bg-emerald-50/50 p-2.5 rounded border border-emerald-100">
                              <span className="font-semibold text-emerald-900 block mb-0.5">
                                Pontos Fortes:
                              </span>
                              <span className="text-slate-700">{av.pontos_fortes}</span>
                            </div>
                          )}
                          {av.pontos_melhoria && (
                            <div className="bg-amber-50/50 p-2.5 rounded border border-amber-100">
                              <span className="font-semibold text-amber-900 block mb-0.5">
                                Oportunidades de Ajuste:
                              </span>
                              <span className="text-slate-700">{av.pontos_melhoria}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Novo Aditivo */}
      <ModalNovoAditivo
        open={modalNovoAditivoOpen}
        onOpenChange={setModalNovoAditivoOpen}
        prestador={prestador}
        contratos={contratos}
        contratoPreSelecionadoId={contratoPreSelecionadoId}
        onSuccess={handleRecarregarTudo}
      />

      {/* Modais Secundários */}
      <ModalNovoContrato
        open={modalContratoOpen}
        onOpenChange={setModalContratoOpen}
        prestador={prestador}
        onSuccess={onAtualizarDados}
      />

      <ModalNovoDocumento
        open={modalDocumentoOpen}
        onOpenChange={setModalDocumentoOpen}
        prestador={prestador}
        onSuccess={onAtualizarDados}
      />

      <ModalNovaNotaFiscal
        open={modalNotaOpen}
        onOpenChange={setModalNotaOpen}
        prestador={prestador}
        contratos={contratos}
        onSuccess={onAtualizarDados}
      />

      <ModalNovaAvaliacao
        open={modalAvaliacaoOpen}
        onOpenChange={setModalAvaliacaoOpen}
        prestador={prestador}
        contratos={contratos}
        onSuccess={onAtualizarDados}
      />

      {/* Visualizador de Documentos */}
      <DocumentViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        url={viewerUrl}
        title={viewerTitle}
        filename={viewerFilename}
      />
    </div>
  )
}
