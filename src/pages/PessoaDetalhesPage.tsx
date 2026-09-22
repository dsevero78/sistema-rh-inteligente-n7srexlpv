import React, { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  Users,
  ArrowLeft,
  Calendar,
  Clock,
  CircleDollarSign,
  Compass,
  FileText,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Eye,
  Download,
  Building2,
  Briefcase,
  UserCheck,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Plus,
  FileCheck2,
  FileWarning,
  Hourglass,
  Tag,
  PenTool,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  pessoasService,
  type PessoaUnificada,
  type DocumentoPessoa,
  type EventoTimelineUnificada,
  type TipoDocumentoPessoa,
  type VinculoPessoa,
} from '@/services/pessoasService'
import {
  type PrestadorPJ,
  type ContratoPJ,
  type AditivoPJ,
  type MarcoLifecyclePJ,
  prestadoresService,
} from '@/services/prestadoresPj'
import { SecaoContratosEVinculos } from '@/components/pessoas/SecaoContratosEVinculos'
import { AbaHorasPessoa } from '@/components/pessoas/AbaHorasPessoa'
import { TabErrorBoundary } from '@/components/TabErrorBoundary'

export default function PessoaDetalhesPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [pessoa, setPessoa] = useState<PessoaUnificada | null>(null)
  const [documentos, setDocumentos] = useState<DocumentoPessoa[]>([])
  const [eventos, setEventos] = useState<EventoTimelineUnificada[]>([])
  const [vinculos, setVinculos] = useState<VinculoPessoa[]>([])
  const [prestadorPj, setPrestadorPj] = useState<PrestadorPJ | null>(null)
  const [contratosPj, setContratosPj] = useState<ContratoPJ[]>([])
  const [aditivosPj, setAditivosPj] = useState<AditivoPJ[]>([])
  const [marcosLifecycle, setMarcosLifecycle] = useState<MarcoLifecyclePJ[]>([])
  const [loading, setLoading] = useState(true)

  const tabParam = searchParams.get('tab')
  const validTabs = ['dados', 'vinculos', 'horas', 'timeline', 'cofre']
  const initialTab = tabParam && validTabs.includes(tabParam) ? tabParam : 'dados'
  const [activeTab, setActiveTab] = useState(initialTab)

  // Sincronizar activeTab quando o parâmetro da URL mudar
  useEffect(() => {
    const currentParam = searchParams.get('tab')
    if (currentParam && validTabs.includes(currentParam) && currentParam !== activeTab) {
      setActiveTab(currentParam)
    }
  }, [searchParams])

  const handleTabChange = (novaTab: string) => {
    setActiveTab(novaTab)
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (novaTab === 'dados') {
          next.delete('tab')
        } else {
          next.set('tab', novaTab)
        }
        return next
      },
      { replace: true },
    )
  }

  // Edição de Dados Cadastrais
  const [editando, setEditando] = useState(false)
  const [salvandoDados, setSalvandoDados] = useState(false)
  const [editForm, setEditForm] = useState<Partial<PessoaUnificada>>({})

  // Modal de Upload Real de Documento
  const [modalUploadAberto, setModalUploadAberto] = useState(false)
  const [arquivoSelecionado, setArquivoSelecionado] = useState<File | null>(null)
  const [enviandoDoc, setEnviandoDoc] = useState(false)
  const [docForm, setDocForm] = useState<{
    nome: string
    tipo: TipoDocumentoPessoa
    data_emissao: string
    data_vencimento: string
    observacoes: string
  }>({
    nome: '',
    tipo: 'Contrato de Prestação / Admissão',
    data_emissao: '',
    data_vencimento: '',
    observacoes: '',
  })

  // Modal de Exclusão de Documento
  const [docParaExcluir, setDocParaExcluir] = useState<DocumentoPessoa | null>(null)
  const [excluindoDoc, setExcluindoDoc] = useState(false)

  // Input file hidden ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  const carregarFicha = async () => {
    if (!id) return
    try {
      setLoading(true)
      const p = await pessoasService.obterPorId(id)
      if (!p) {
        toast({
          title: 'Pessoa não encontrada',
          description: 'A ficha solicitada não existe ou foi removida.',
          variant: 'destructive',
        })
        navigate('/pessoas')
        return
      }

      setPessoa(p)
      setEditForm({ ...p })

      // Carregar documentos, linha do tempo e vínculos em paralelo
      const [docs, timeline, vinculosList, prestadorRecord] = await Promise.all([
        pessoasService.listarDocumentos(p.id),
        pessoasService.carregarLinhaDoTempoUnificada(p),
        pessoasService.listarVinculosPessoa(p),
        pessoasService.obterPrestadorVinculado(p),
      ])

      setDocumentos(docs)
      setEventos(timeline)
      setVinculos(vinculosList)

      // Se houver prestador PJ vinculado, carregar contratos, aditivos e marcos
      if (prestadorRecord) {
        setPrestadorPj(prestadorRecord as unknown as PrestadorPJ)
        const [contratos, aditivos, marcos] = await Promise.all([
          prestadoresService.listarContratos(prestadorRecord.id),
          prestadoresService.listarAditivos({ prestadorId: prestadorRecord.id }),
          prestadoresService.listarMarcosLifecycle(prestadorRecord.id),
        ])
        setContratosPj(contratos)
        setAditivosPj(aditivos)
        setMarcosLifecycle(marcos)
      } else {
        setPrestadorPj(null)
        setContratosPj([])
        setAditivosPj([])
        setMarcosLifecycle([])
      }
    } catch (err) {
      console.error('Erro ao carregar detalhes da pessoa:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível buscar as informações da pessoa.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarFicha()
  }, [id])

  const handleSalvarDados = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pessoa) return

    setSalvandoDados(true)
    try {
      const horas = Number(editForm.horas_mensais_base || 160)
      const vTotal = Number(editForm.valor_contratado || 0)
      const vHoraCalc = horas > 0 ? Number((vTotal / horas).toFixed(2)) : 0

      await pessoasService.atualizar(pessoa.id, {
        ...editForm,
        valor_contratado: vTotal,
        horas_mensais_base: horas,
        valor_hora: vHoraCalc,
        percentual_integracao: Number(editForm.percentual_integracao || 0),
      })

      toast({
        title: 'Dados cadastrais salvos',
        description: 'Informações atualizadas com sucesso.',
      })
      setEditando(false)
      await carregarFicha()
    } catch (err: any) {
      console.error('Erro ao salvar dados:', err)
      toast({
        title: 'Falha ao salvar',
        description: err?.message || 'Verifique os dados preenchidos.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoDados(false)
    }
  }

  const handleArquivoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      // Validação de tamanho máx 10MB
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'Arquivo muito grande',
          description: 'O limite para envio de arquivos no cofre é de 10MB.',
          variant: 'destructive',
        })
        return
      }

      setArquivoSelecionado(file)
      if (!docForm.nome) {
        // Auto-preencher nome com o arquivo limpo
        const nomeLimpo = file.name.replace(/\.[^/.]+$/, '')
        setDocForm((prev) => ({ ...prev, nome: nomeLimpo }))
      }
    }
  }

  const handleUploadDocumento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pessoa) return
    if (!arquivoSelecionado) {
      toast({
        title: 'Arquivo obrigatório',
        description: 'Selecione um arquivo PDF ou imagem para enviar.',
        variant: 'destructive',
      })
      return
    }

    if (!docForm.nome.trim()) {
      toast({
        title: 'Nome do documento obrigatório',
        description: 'Informe o título do documento para identificação.',
        variant: 'destructive',
      })
      return
    }

    setEnviandoDoc(true)
    try {
      await pessoasService.enviarDocumento(pessoa.id, arquivoSelecionado, {
        nome: docForm.nome.trim(),
        tipo: docForm.tipo,
        data_emissao: docForm.data_emissao || undefined,
        data_vencimento: docForm.data_vencimento || undefined,
        observacoes: docForm.observacoes || undefined,
        enviado_por_nome: user?.name || 'Douglas Severo',
        enviado_por_usuario: user?.id,
      })

      toast({
        title: 'Documento armazenado com sucesso!',
        description: 'O arquivo real foi persistido com segurança no cofre.',
      })

      // Limpar formulário e fechar modal
      setModalUploadAberto(false)
      setArquivoSelecionado(null)
      setDocForm({
        nome: '',
        tipo: 'Contrato de Prestação / Admissão',
        data_emissao: '',
        data_vencimento: '',
        observacoes: '',
      })
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Recarregar cofre e timeline
      await carregarFicha()
    } catch (err: any) {
      console.error('Erro ao enviar documento:', err)
      toast({
        title: 'Falha no upload do arquivo',
        description: err?.message || 'Verifique o tipo e tamanho do documento.',
        variant: 'destructive',
      })
    } finally {
      setEnviandoDoc(false)
    }
  }

  const handleConfirmarExcluirDoc = async () => {
    if (!docParaExcluir) return
    setExcluindoDoc(true)
    try {
      await pessoasService.excluirDocumento(docParaExcluir.id)
      toast({
        title: 'Documento excluído',
        description: 'O arquivo foi removido permanentemente do cofre.',
      })
      setDocParaExcluir(null)
      await carregarFicha()
    } catch (err: any) {
      console.error('Erro ao excluir documento:', err)
      toast({
        title: 'Erro ao remover documento',
        description: err?.message || 'Falha ao deletar arquivo.',
        variant: 'destructive',
      })
    } finally {
      setExcluindoDoc(false)
    }
  }

  if (loading) {
    return (
      <div className="p-16 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
        <Clock className="w-8 h-8 animate-spin text-[#E9530E]" />
        Carregando ficha unificada da pessoa...
      </div>
    )
  }

  if (!pessoa) return null

  const isPj = pessoa.modalidade === 'PJ'
  const diasRenovacao = pessoa.diasAteRenovacao
  const docsVencidos = documentos.filter((d) => d.statusCalculado === 'vencido')
  const docsVencendo = documentos.filter((d) => d.statusCalculado === 'vencendo')

  return (
    <div className="space-y-6">
      {/* Top Bar / Breadcrumb */}
      <div className="flex items-center justify-between gap-4">
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-foreground gap-1.5"
        >
          <Link to="/pessoas">
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar para lista de pessoas
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={`text-xs uppercase font-bold font-display ${
              isPj
                ? 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950 dark:text-purple-300'
                : 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300'
            }`}
          >
            {isPj ? 'Prestador PJ' : 'Colaborador CLT'}
          </Badge>

          <Badge
            className={`text-xs font-semibold ${
              pessoa.situacao_contrato === 'Vigente'
                ? 'bg-emerald-500 text-white'
                : pessoa.situacao_contrato === 'Em integração'
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-500 text-white'
            }`}
          >
            {pessoa.situacao_contrato}
          </Badge>
        </div>
      </div>

      {/* Header Card da Pessoa */}
      <Card className="bg-gradient-to-r from-card via-card to-muted/30 border-border/80 shadow-sm">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div
                className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-lg uppercase shrink-0 font-display shadow-xs ${
                  isPj
                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/60 dark:text-purple-200'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200'
                }`}
              >
                {pessoa.nome.substring(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-[#212B55] dark:text-[#F7F8FB] tracking-tight truncate font-display">
                    {pessoa.nome}
                  </h1>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono">
                    {pessoa.cpf_cnpj || 'Sem CPF/CNPJ'}
                  </span>
                  {(pessoa.empresa_nome || pessoa.area_nome) && (
                    <Badge
                      variant="secondary"
                      className="bg-orange-100/70 text-[#E9530E] dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-900/50 text-[11px] font-semibold"
                    >
                      <Building2 className="w-3 h-3 mr-1" />
                      {pessoa.empresa_nome || 'Empresa'}
                      {pessoa.area_nome ? ` · ${pessoa.area_nome}` : ''}
                    </Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
                  {pessoa.cargo_funcao} · {pessoa.departamento || 'Sem departamento'} · Gestor:{' '}
                  <span className="text-foreground font-semibold">
                    {pessoa.gestor_nome || 'Não atribuído'}
                  </span>
                </p>
              </div>{' '}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setModalUploadAberto(true)}
                className="bg-[#FEF1EA] dark:bg-[#212B55] text-[#E9530E] hover:bg-[#FBDCC9] border-[#E9530E]/30 text-xs font-bold gap-1.5 shadow-xs"
              >
                <UploadCloud className="w-4 h-4 text-[#E9530E]" />
                Enviar Arquivo ao Cofre
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SITUAÇÃO CONSOLIDADA (Cards no Topo da Ficha) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Card 1: Situação do Contrato */}
        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-sans block">
              Contrato
            </span>
            <div className="text-lg font-black text-[#212B55] dark:text-[#F7F8FB] font-display mt-0.5 flex items-center gap-1.5">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  pessoa.situacao_contrato === 'Vigente'
                    ? 'bg-emerald-500'
                    : pessoa.situacao_contrato === 'Em integração'
                      ? 'bg-amber-500'
                      : 'bg-slate-400'
                }`}
              />
              {pessoa.situacao_contrato}
            </div>
            <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
              Desde{' '}
              {pessoa.data_inicio ? new Date(pessoa.data_inicio).toLocaleDateString('pt-BR') : '—'}
            </span>
          </CardContent>
        </Card>

        {/* Card 2: Valor Atual / Base */}
        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-sans block">
              Valor Atual ({isPj ? 'Mensalidade' : 'Salário'})
            </span>
            <div className="text-lg font-black text-[#212B55] dark:text-[#F7F8FB] font-mono mt-0.5 truncate">
              R${' '}
              {(Number(pessoa.valor_contratado) || 0).toLocaleString('pt-BR', {
                minimumFractionDigits: 2,
              })}
            </div>
            <span className="text-[10px] text-muted-foreground font-mono block mt-0.5">
              R$ {Number(pessoa.valor_hora || 0).toFixed(2)}/h ({pessoa.horas_mensais_base || 160}
              h/mês)
            </span>
          </CardContent>
        </Card>

        {/* Card 3: Dias até Renovação / Término */}
        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-sans block">
              Vencimento / Renovação
            </span>
            <div
              className={`text-lg font-black font-mono mt-0.5 ${
                diasRenovacao !== undefined && diasRenovacao < 0
                  ? 'text-red-600'
                  : diasRenovacao !== undefined && diasRenovacao <= 30
                    ? 'text-amber-600'
                    : 'text-[#212B55] dark:text-[#F7F8FB]'
              }`}
            >
              {diasRenovacao !== undefined
                ? diasRenovacao < 0
                  ? `Venceu há ${Math.abs(diasRenovacao)}d`
                  : `${diasRenovacao} dias`
                : 'Indeterminado'}
            </div>
            <span className="text-[10px] text-muted-foreground font-mono block mt-0.5 truncate">
              {pessoa.data_renovacao || pessoa.data_fim
                ? new Date(pessoa.data_renovacao || pessoa.data_fim!).toLocaleDateString('pt-BR')
                : 'Vigência indeterminada'}
            </span>
          </CardContent>
        </Card>

        {/* Card 4: % Integração & Alertas de Documentos */}
        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-sans block">
              Integração & Cofre
            </span>
            <div className="text-lg font-black text-[#212B55] dark:text-[#F7F8FB] font-mono mt-0.5 flex items-center justify-between">
              <span>{pessoa.percentual_integracao || 0}% 30-60-90</span>
              {docsVencidos.length > 0 ? (
                <Badge className="bg-red-500 text-white text-[10px]">
                  {docsVencidos.length} vencido(s)
                </Badge>
              ) : docsVencendo.length > 0 ? (
                <Badge className="bg-amber-500 text-white text-[10px]">
                  {docsVencendo.length} a vencer
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-[10px] text-emerald-600 border-emerald-300"
                >
                  Docs em dia
                </Badge>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground font-sans block mt-0.5">
              {documentos.length} documento(s) arquivado(s)
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Principais da Ficha da Pessoa */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="bg-card border border-border/80 p-1 rounded-xl flex-wrap">
          <TabsTrigger
            value="dados"
            className="text-xs font-bold font-sans gap-1.5 data-[state=active]:bg-[#FEF1EA] data-[state=active]:text-[#E9530E] dark:data-[state=active]:bg-[#212B55]"
          >
            <Building2 className="w-3.5 h-3.5" />
            Dados Cadastrais
          </TabsTrigger>
          <TabsTrigger
            value="vinculos"
            className="text-xs font-bold font-sans gap-1.5 data-[state=active]:bg-[#FEF1EA] data-[state=active]:text-[#E9530E] dark:data-[state=active]:bg-[#212B55]"
          >
            <Briefcase className="w-3.5 h-3.5" />
            Contratos & Vínculos ({vinculos.length})
          </TabsTrigger>
          <TabsTrigger
            value="horas"
            className="text-xs font-bold font-sans gap-1.5 data-[state=active]:bg-[#FEF1EA] data-[state=active]:text-[#E9530E] dark:data-[state=active]:bg-[#212B55]"
          >
            <Clock className="w-3.5 h-3.5" />
            Horas & Competências
          </TabsTrigger>
          <TabsTrigger
            value="timeline"
            className="text-xs font-bold font-sans gap-1.5 data-[state=active]:bg-[#FEF1EA] data-[state=active]:text-[#E9530E] dark:data-[state=active]:bg-[#212B55]"
          >
            <Clock className="w-3.5 h-3.5" />
            Linha do Tempo Unificada ({eventos.length})
          </TabsTrigger>
          <TabsTrigger
            value="cofre"
            className="text-xs font-bold font-sans gap-1.5 data-[state=active]:bg-[#FEF1EA] data-[state=active]:text-[#E9530E] dark:data-[state=active]:bg-[#212B55]"
          >
            <FileText className="w-3.5 h-3.5" />
            Cofre de Documentos ({documentos.length})
          </TabsTrigger>
        </TabsList>

        {/* ABA NOVA: HORAS E FECHAMENTO DE COMPETÊNCIA */}
        <TabsContent value="horas" className="space-y-4">
          <TabErrorBoundary
            tabName="Horas & Competências"
            onResetToDefaultTab={() => handleTabChange('dados')}
          >
            <AbaHorasPessoa pessoa={pessoa} onAtualizar={carregarFicha} />
          </TabErrorBoundary>
        </TabsContent>

        {/* ABA NOVA: CONTRATOS & VÍNCULOS UNIFICADOS */}
        <TabsContent value="vinculos" className="space-y-4">
          <TabErrorBoundary
            tabName="Contratos & Vínculos"
            onResetToDefaultTab={() => handleTabChange('dados')}
          >
            <SecaoContratosEVinculos
              pessoa={pessoa}
              vinculos={vinculos || []}
              prestadorPj={prestadorPj || null}
              contratosPj={contratosPj || []}
              aditivosPj={aditivosPj || []}
              marcosLifecycle={marcosLifecycle || []}
              documentosCofre={documentos || []}
              onAtualizar={carregarFicha}
            />
          </TabErrorBoundary>
        </TabsContent>

        {/* ABA A: DADOS CADASTRAIS */}
        <TabsContent value="dados" className="space-y-4">
          <Card className="bg-card border-border/80">
            <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between border-b border-border/60">
              <div>
                <CardTitle className="text-base font-bold text-[#212B55] dark:text-[#F7F8FB] font-display">
                  Informações Cadastrais e Remuneração
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Dados de vínculo empregatício CLT ou contrato de prestação PJ.
                </CardDescription>
              </div>

              {!editando ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditando(true)}
                  className="text-xs font-semibold gap-1"
                >
                  <PenTool className="w-3.5 h-3.5 text-[#E9530E]" />
                  Editar Dados
                </Button>
              ) : (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditForm({ ...pessoa })
                      setEditando(false)
                    }}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSalvarDados}
                    disabled={salvandoDados}
                    className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-bold"
                  >
                    {salvandoDados ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              )}
            </CardHeader>

            <CardContent className="p-5">
              {!editando ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-y-4 gap-x-6 text-xs font-sans">
                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      Nome Completo
                    </span>
                    <span className="font-bold text-foreground text-sm block mt-0.5">
                      {pessoa.nome}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      Tipo de Pessoa / Modalidade
                    </span>
                    <span className="font-bold text-foreground text-sm block mt-0.5">
                      {pessoa.tipo_pessoa} — {pessoa.modalidade}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      CPF / CNPJ
                    </span>
                    <span className="font-mono text-foreground text-sm block mt-0.5">
                      {pessoa.cpf_cnpj || 'Não informado'}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      E-mail Institucional / Contato
                    </span>
                    <span className="text-foreground text-sm block mt-0.5">
                      {pessoa.email || 'Não informado'}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      Telefone / Celular
                    </span>
                    <span className="text-foreground text-sm block mt-0.5">
                      {pessoa.telefone || 'Não informado'}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      Cargo / Função
                    </span>
                    <span className="font-bold text-foreground text-sm block mt-0.5">
                      {pessoa.cargo_funcao}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      Empresa do Grupo
                    </span>
                    <span className="font-bold text-[#E9530E] text-sm block mt-0.5">
                      {pessoa.empresa_nome || 'Não vinculada'}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      Área / Unidade
                    </span>
                    <span className="font-semibold text-foreground text-sm block mt-0.5">
                      {pessoa.area_nome || pessoa.departamento || 'Não vinculada'}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      Centro de Custo
                    </span>
                    <span className="font-mono text-foreground text-sm block mt-0.5">
                      {pessoa.centro_custo || 'Não informado'}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      Gestor Responsável
                    </span>
                    <span className="font-semibold text-foreground text-sm block mt-0.5">
                      {pessoa.gestor_nome || 'Não atribuído'}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      Data de Início
                    </span>
                    <span className="font-mono text-foreground text-sm block mt-0.5">
                      {pessoa.data_inicio
                        ? new Date(pessoa.data_inicio).toLocaleDateString('pt-BR')
                        : 'Não informada'}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      Data de Renovação / Fim
                    </span>
                    <span className="font-mono text-foreground text-sm block mt-0.5">
                      {pessoa.data_renovacao || pessoa.data_fim
                        ? new Date(pessoa.data_renovacao || pessoa.data_fim!).toLocaleDateString(
                            'pt-BR',
                          )
                        : 'Indeterminado'}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      Tipo de Prazo
                    </span>
                    <span className="text-foreground text-sm block mt-0.5">
                      {pessoa.prazo_tipo || 'Indeterminado'}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      Valor Contratado Mensal
                    </span>
                    <span className="font-mono font-bold text-foreground text-sm block mt-0.5">
                      R${' '}
                      {(Number(pessoa.valor_contratado) || 0).toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      Base de Horas / Mês
                    </span>
                    <span className="font-mono text-foreground text-sm block mt-0.5">
                      {pessoa.horas_mensais_base || 160}h
                    </span>
                  </div>

                  <div>
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      Valor / Hora Calculado
                    </span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm block mt-0.5">
                      R$ {Number(pessoa.valor_hora || 0).toFixed(2)}/h
                    </span>
                  </div>

                  <div className="sm:col-span-3 pt-2 border-t border-border/50">
                    <span className="text-muted-foreground block text-[11px] uppercase font-semibold">
                      Observações e Contexto
                    </span>
                    <p className="text-foreground text-xs mt-1 leading-relaxed">
                      {pessoa.observacoes || 'Nenhuma observação complementar registrada.'}
                    </p>
                  </div>
                </div>
              ) : (
                <form
                  onSubmit={handleSalvarDados}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <Label htmlFor="ed-nome">Nome Completo</Label>
                    <Input
                      id="ed-nome"
                      value={editForm.nome || ''}
                      onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Modalidade</Label>
                    <Select
                      value={editForm.modalidade}
                      onValueChange={(val: any) => setEditForm({ ...editForm, modalidade: val })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CLT">CLT</SelectItem>
                        <SelectItem value="PJ">PJ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ed-doc">CPF ou CNPJ</Label>
                    <Input
                      id="ed-doc"
                      value={editForm.cpf_cnpj || ''}
                      onChange={(e) => setEditForm({ ...editForm, cpf_cnpj: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ed-email">E-mail</Label>
                    <Input
                      id="ed-email"
                      value={editForm.email || ''}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ed-tel">Telefone</Label>
                    <Input
                      id="ed-tel"
                      value={editForm.telefone || ''}
                      onChange={(e) => setEditForm({ ...editForm, telefone: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ed-cargo">Cargo / Função</Label>
                    <Input
                      id="ed-cargo"
                      value={editForm.cargo_funcao || ''}
                      onChange={(e) => setEditForm({ ...editForm, cargo_funcao: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ed-dep">Departamento</Label>
                    <Input
                      id="ed-dep"
                      value={editForm.departamento || ''}
                      onChange={(e) => setEditForm({ ...editForm, departamento: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ed-cc">Centro de Custo</Label>
                    <Input
                      id="ed-cc"
                      value={editForm.centro_custo || ''}
                      onChange={(e) => setEditForm({ ...editForm, centro_custo: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ed-gestor">Gestor Responsável</Label>
                    <Input
                      id="ed-gestor"
                      value={editForm.gestor_nome || ''}
                      onChange={(e) => setEditForm({ ...editForm, gestor_nome: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label>Situação do Contrato</Label>
                    <Select
                      value={editForm.situacao_contrato}
                      onValueChange={(val: any) =>
                        setEditForm({ ...editForm, situacao_contrato: val })
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Vigente">Vigente</SelectItem>
                        <SelectItem value="Em integração">Em integração</SelectItem>
                        <SelectItem value="Pausado">Pausado</SelectItem>
                        <SelectItem value="Encerrado">Encerrado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ed-inicio">Data de Início</Label>
                    <Input
                      id="ed-inicio"
                      type="date"
                      value={editForm.data_inicio ? editForm.data_inicio.split('T')[0] : ''}
                      onChange={(e) => setEditForm({ ...editForm, data_inicio: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ed-renovacao">Data de Renovação</Label>
                    <Input
                      id="ed-renovacao"
                      type="date"
                      value={editForm.data_renovacao ? editForm.data_renovacao.split('T')[0] : ''}
                      onChange={(e) => setEditForm({ ...editForm, data_renovacao: e.target.value })}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ed-valor">Valor Mensal (R$)</Label>
                    <Input
                      id="ed-valor"
                      type="number"
                      step="0.01"
                      value={editForm.valor_contratado || ''}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0
                        const h = editForm.horas_mensais_base || 160
                        setEditForm({
                          ...editForm,
                          valor_contratado: val,
                          valor_hora: h > 0 ? Number((val / h).toFixed(2)) : 0,
                        })
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ed-horas">Base Horas/Mês</Label>
                    <Input
                      id="ed-horas"
                      type="number"
                      value={editForm.horas_mensais_base || 160}
                      onChange={(e) => {
                        const h = parseFloat(e.target.value) || 160
                        const val = editForm.valor_contratado || 0
                        setEditForm({
                          ...editForm,
                          horas_mensais_base: h,
                          valor_hora: h > 0 ? Number((val / h).toFixed(2)) : 0,
                        })
                      }}
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="ed-vhora">Valor Hora (R$)</Label>
                    <Input
                      id="ed-vhora"
                      type="number"
                      step="0.01"
                      value={editForm.valor_hora || ''}
                      onChange={(e) =>
                        setEditForm({ ...editForm, valor_hora: parseFloat(e.target.value) || 0 })
                      }
                    />
                  </div>

                  <div className="space-y-1 sm:col-span-3">
                    <Label htmlFor="ed-obs">Observações</Label>
                    <Input
                      id="ed-obs"
                      value={editForm.observacoes || ''}
                      onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                    />
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ABA B: HISTÓRICO EM LINHA DO TEMPO */}
        <TabsContent value="timeline" className="space-y-4">
          <TabErrorBoundary
            tabName="Linha do Tempo Unificada"
            onResetToDefaultTab={() => handleTabChange('dados')}
          >
            <Card className="bg-card border-border/80">
              <CardHeader className="p-4 sm:p-5 border-b border-border/60">
                <CardTitle className="text-base font-bold text-[#212B55] dark:text-[#F7F8FB] font-display flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#E9530E]" />
                  Cronologia Unificada do Ciclo de Vida
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground">
                  Eventos integrados em tempo real a partir de recrutamento, contratação, aditivos
                  contratuais, check-ins de integração 30-60-90 e cofre de documentos.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-5">
                {eventos.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-xs">
                    Nenhum evento registrado ainda na linha do tempo.
                  </div>
                ) : (
                  <div className="relative border-l-2 border-[#2E3A6E]/40 dark:border-[#2E3A6E] ml-3 sm:ml-4 space-y-6 py-2">
                    {eventos.map((ev) => {
                      const dataObj = new Date(ev.data)
                      const dataFormatada = !isNaN(dataObj.getTime())
                        ? dataObj.toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })
                        : 'Data recente'

                      return (
                        <div key={ev.id} className="relative pl-6 sm:pl-7 group">
                          {/* Marcador na linha */}
                          <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-card border-2 border-[#E9530E] flex items-center justify-center group-hover:scale-110 transition-transform">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#E9530E]" />
                          </div>

                          {/* Card do evento */}
                          <div className="p-3.5 rounded-xl border border-border/80 bg-card hover:border-[#E9530E]/40 transition-colors shadow-2xs space-y-1.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-muted text-muted-foreground font-sans">
                                  {ev.categoria}
                                </span>
                                {ev.tipoBadge && (
                                  <Badge variant="outline" className="text-[10px]">
                                    {ev.tipoBadge}
                                  </Badge>
                                )}
                                {ev.statusBadge && (
                                  <Badge className="text-[10px] bg-[#212B55] text-white">
                                    {ev.statusBadge}
                                  </Badge>
                                )}
                              </div>

                              <span className="text-xs font-mono text-muted-foreground font-bold">
                                {dataFormatada}
                              </span>
                            </div>

                            <h4 className="text-xs sm:text-sm font-bold text-[#212B55] dark:text-[#F7F8FB] font-display">
                              {ev.titulo}
                            </h4>

                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {ev.descricao}
                            </p>

                            {ev.autor && (
                              <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/40 flex items-center justify-between">
                                <span>
                                  Registrado por:{' '}
                                  <strong className="text-foreground">{ev.autor}</strong>
                                </span>
                                <span className="capitalize text-muted-foreground">
                                  Módulo: {ev.origemModulo}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabErrorBoundary>
        </TabsContent>

        {/* ABA C: COFRE DE DOCUMENTOS COM UPLOAD REAL */}
        <TabsContent value="cofre" className="space-y-4">
          <TabErrorBoundary
            tabName="Cofre de Documentos"
            onResetToDefaultTab={() => handleTabChange('dados')}
          >
            <Card className="bg-card border-border/80">
              <CardHeader className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60">
                <div>
                  <CardTitle className="text-base font-bold text-[#212B55] dark:text-[#F7F8FB] font-display flex items-center gap-2">
                    <FileCheck2 className="w-4 h-4 text-[#E9530E]" />
                    Cofre Digital de Documentos
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Armazenamento real de PDFs e imagens com validação de vencimento e conformidade.
                  </CardDescription>
                </div>

                <Button
                  size="sm"
                  onClick={() => setModalUploadAberto(true)}
                  className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-bold gap-1.5 shadow-xs"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload de Documento
                </Button>
              </CardHeader>

              <CardContent className="p-5">
                {documentos.length === 0 ? (
                  <div className="p-12 text-center flex flex-col items-center justify-center max-w-sm mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#FEF1EA] dark:bg-[#212B55] flex items-center justify-center text-[#E9530E]">
                      <UploadCloud className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-bold text-foreground font-display">
                      Nenhum documento anexado ainda
                    </h4>
                    <p className="text-xs text-muted-foreground">
                      O cofre está vazio. Envie o contrato assinado, certidão fiscal ou documentação
                      admissional para centralizar o arquivo.
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setModalUploadAberto(true)}
                      className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Enviar Primeiro Arquivo
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {documentos.map((doc) => {
                      const isVencido = doc.statusCalculado === 'vencido'
                      const isVencendo = doc.statusCalculado === 'vencendo'
                      const tamanhoKb = doc.tamanho_bytes
                        ? Math.round(doc.tamanho_bytes / 1024)
                        : null

                      return (
                        <div
                          key={doc.id}
                          className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                            isVencido
                              ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
                              : isVencendo
                                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                                : 'bg-card border-border hover:border-[#E9530E]/40'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                                isVencido
                                  ? 'bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-200'
                                  : isVencendo
                                    ? 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-200'
                                    : 'bg-[#FEF1EA] text-[#E9530E] dark:bg-[#212B55] dark:text-[#F19763]'
                              }`}
                            >
                              <FileText className="w-5 h-5" />
                            </div>

                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold text-sm text-[#212B55] dark:text-[#F7F8FB] truncate font-display">
                                  {doc.nome}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] font-sans ${
                                    isVencido
                                      ? 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/60 dark:text-red-300'
                                      : isVencendo
                                        ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/60 dark:text-amber-300'
                                        : 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-900/60 dark:text-emerald-300'
                                  }`}
                                >
                                  {isVencido
                                    ? `Vencido (${Math.abs(doc.diasParaVencer || 0)}d)`
                                    : isVencendo
                                      ? `Vence em ${doc.diasParaVencer}d`
                                      : doc.statusCalculado === 'vigente'
                                        ? 'Vigente'
                                        : 'Sem validade'}
                                </Badge>
                              </div>

                              <p className="text-xs text-muted-foreground flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-foreground">{doc.tipo}</span>
                                {tamanhoKb && <span>· {tamanhoKb} KB</span>}
                                {doc.data_vencimento && (
                                  <span>
                                    · Vencimento:{' '}
                                    <strong className="font-mono text-foreground">
                                      {new Date(doc.data_vencimento).toLocaleDateString('pt-BR')}
                                    </strong>
                                  </span>
                                )}
                              </p>

                              {doc.observacoes && (
                                <p className="text-[11px] text-muted-foreground italic">
                                  &quot;{doc.observacoes}&quot;
                                </p>
                              )}

                              <div className="text-[10px] text-muted-foreground">
                                Enviado por {doc.enviado_por_nome || 'Gente & Gestão'} em{' '}
                                <span className="font-mono">
                                  {new Date(doc.created).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Ações do Documento */}
                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <Button
                              asChild
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs font-semibold gap-1.5"
                            >
                              <a href={doc.urlArquivo} target="_blank" rel="noreferrer" download>
                                <Download className="w-3.5 h-3.5 text-[#E9530E]" />
                                Baixar / Ver
                              </a>
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setDocParaExcluir(doc)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Excluir documento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabErrorBoundary>
        </TabsContent>
      </Tabs>

      {/* MODAL DE UPLOAD REAL DE DOCUMENTO */}
      <Dialog open={modalUploadAberto} onOpenChange={setModalUploadAberto}>
        <DialogContent className="max-w-md">
          <form onSubmit={handleUploadDocumento}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-base text-[#212B55] dark:text-[#F7F8FB]">
                <UploadCloud className="w-5 h-5 text-[#E9530E]" />
                Upload Real de Arquivo no Cofre
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Envie documentos em formato PDF ou imagens (PNG, JPG) de até 10MB para armazenamento
                permanente.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-3 text-xs">
              {/* Dropzone / Seleção de arquivo */}
              <div className="space-y-1">
                <Label>Arquivo * (PDF, PNG, JPG até 10MB)</Label>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-[#E9530E] hover:bg-muted/30 transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    required
                    accept=".pdf,image/png,image/jpeg,image/webp,.docx"
                    onChange={handleArquivoChange}
                    className="hidden"
                  />
                  <UploadCloud className="w-8 h-8 text-[#E9530E] mx-auto mb-1.5" />
                  {arquivoSelecionado ? (
                    <div className="text-xs font-bold text-foreground">
                      {arquivoSelecionado.name} ({Math.round(arquivoSelecionado.size / 1024)} KB)
                    </div>
                  ) : (
                    <>
                      <div className="text-xs font-semibold text-foreground">
                        Clique para escolher o arquivo
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        PDF, PNG ou JPG
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="doc-nome">Nome / Título do Documento *</Label>
                <Input
                  id="doc-nome"
                  required
                  value={docForm.nome}
                  onChange={(e) => setDocForm({ ...docForm, nome: e.target.value })}
                  placeholder="Ex: Contrato de Prestação de Serviços Assinado"
                />
              </div>

              <div className="space-y-1">
                <Label>Tipo de Documento *</Label>
                <Select
                  value={docForm.tipo}
                  onValueChange={(val: any) => setDocForm({ ...docForm, tipo: val })}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Contrato de Prestação / Admissão">
                      Contrato de Prestação / Admissão
                    </SelectItem>
                    <SelectItem value="Contrato Social / Ato Constitutivo">
                      Contrato Social / Ato Constitutivo
                    </SelectItem>
                    <SelectItem value="Certidão Fiscal (CND / Federal / Estadual)">
                      Certidão Fiscal (CND / Federal / Estadual)
                    </SelectItem>
                    <SelectItem value="Termo Assinado">Termo Assinado</SelectItem>
                    <SelectItem value="Documentação Admissional (RG / CPF / CTPS)">
                      Documentação Admissional (RG / CPF / CTPS)
                    </SelectItem>
                    <SelectItem value="Certificado / Comprovante">
                      Certificado / Comprovante
                    </SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="doc-emissao">Data de Emissão</Label>
                  <Input
                    id="doc-emissao"
                    type="date"
                    value={docForm.data_emissao}
                    onChange={(e) => setDocForm({ ...docForm, data_emissao: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="doc-vencimento">Data de Vencimento</Label>
                  <Input
                    id="doc-vencimento"
                    type="date"
                    value={docForm.data_vencimento}
                    onChange={(e) => setDocForm({ ...docForm, data_vencimento: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="doc-obs">Observações</Label>
                <Input
                  id="doc-obs"
                  value={docForm.observacoes}
                  onChange={(e) => setDocForm({ ...docForm, observacoes: e.target.value })}
                  placeholder="Ex: Autenticado digitalmente via DocuSign"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalUploadAberto(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={enviandoDoc || !arquivoSelecionado}
                className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-bold"
              >
                {enviandoDoc ? 'Enviando arquivo...' : 'Concluir Upload'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      <AlertDialog open={Boolean(docParaExcluir)} onOpenChange={() => setDocParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-[#212B55] dark:text-[#F7F8FB] font-display">
              Excluir Documento do Cofre?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Esta ação removerá o arquivo permanentemente dos servidores e não poderá ser desfeita.
              Deseja prosseguir com a remoção de &quot;{docParaExcluir?.nome}&quot;?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmarExcluirDoc}
              disabled={excluindoDoc}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
            >
              {excluindoDoc ? 'Excluindo...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
