import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import {
  catalogosService,
  Cargo,
  Competencia,
  CentroCusto,
  CompetenciaPessoa,
  MapeamentoNormalizacao,
  PossivelDuplicidade,
} from '@/services/catalogosService'
import { empresasService, Empresa } from '@/services/empresasService'
import { pessoasService, PessoaUnificada } from '@/services/pessoasService'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Briefcase,
  Award,
  Wallet,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Search,
  Plus,
  ArrowRight,
  ShieldAlert,
  Building2,
  Users,
  Eye,
  FileCheck,
  Check,
  X,
  ExternalLink,
} from 'lucide-react'

export default function CatalogosNormalizacaoPage() {
  const { user } = useAuth()
  const { toast } = useToast()

  const isRh = user?.cargo_funcao === 'RH / Recrutador' || !user?.cargo_funcao
  const isGestor = user?.cargo_funcao === 'Gestor Contratante'

  // Estados de dados
  const [cargos, setCargos] = useState<Cargo[]>([])
  const [competencias, setCompetencias] = useState<Competencia[]>([])
  const [centrosCusto, setCentrosCusto] = useState<CentroCusto[]>([])
  const [competenciasPessoas, setCompetenciasPessoas] = useState<CompetenciaPessoa[]>([])
  const [mapeamentos, setMapeamentos] = useState<MapeamentoNormalizacao[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [pessoas, setPessoas] = useState<PessoaUnificada[]>([])

  const [loading, setLoading] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState('cargos')
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const [filtroEmpresa, setFiltroEmpresa] = useState('todos')

  // Modais de Criação / Edição
  const [modalCargoOpen, setModalCargoOpen] = useState(false)
  const [cargoForm, setCargoForm] = useState({
    codigo: '',
    nome: '',
    descricao: '',
    ativo: true,
    competencias: [] as string[],
  })

  const [modalCompOpen, setModalCompOpen] = useState(false)
  const [compForm, setCompForm] = useState({
    nome: '',
    codigo: '',
    categoria: 'Técnica' as Competencia['categoria'],
    descricao: '',
    ativo: true,
  })

  const [modalCcOpen, setModalCcOpen] = useState(false)
  const [ccForm, setCcForm] = useState({
    codigo: '',
    nome: '',
    empresa: '',
    status: 'Ativo' as 'Ativo' | 'Inativo',
    identificador_externo: '',
  })

  const [modalCompPessoaOpen, setModalCompPessoaOpen] = useState(false)
  const [compPessoaForm, setCompPessoaForm] = useState({
    pessoa: '',
    competencia: '',
    proficiencia: 'Nao_avaliada' as CompetenciaPessoa['proficiencia'],
    fonte: 'gestor' as CompetenciaPessoa['fonte'],
    observacoes: '',
  })

  // Carregar dados
  const carregarDados = async () => {
    setLoading(true)
    try {
      const [cRes, compRes, ccRes, cpRes, mapRes, empRes, pRes] = await Promise.all([
        catalogosService.listarCargos(true),
        catalogosService.listarCompetencias(true),
        catalogosService.listarCentrosCusto(true),
        catalogosService.listarTodasCompetenciasPessoas(),
        catalogosService.listarMapeamentos(),
        empresasService.listarEmpresas(),
        pessoasService.listar(),
      ])

      setCargos(cRes)
      setCompetencias(compRes)
      setCentrosCusto(ccRes)
      setCompetenciasPessoas(cpRes)
      setMapeamentos(mapRes)
      setEmpresas(empRes)
      setPessoas(pRes)
    } catch (err) {
      console.error('Erro ao carregar catálogos e normalização:', err)
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar os catálogos corporativos.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Detecção de duplicidades de cargos
  const duplicidadesCargos = useMemo(() => {
    return catalogosService.detectarPossiveisDuplicidadesCargos(cargos)
  }, [cargos])

  // Métricas de normalização
  const metricasNormalizacao = useMemo(() => {
    const total = mapeamentos.length
    const aplicadas = mapeamentos.filter((m) => m.status === 'aplicada').length
    const pendentes = mapeamentos.filter((m) => m.status === 'pendente').length
    const rejeitadas = mapeamentos.filter((m) => m.status === 'rejeitada').length
    return { total, aplicadas, pendentes, rejeitadas }
  }, [mapeamentos])

  // Ações de Normalização
  const handleAprovar = async (m: MapeamentoNormalizacao) => {
    if (!isRh) {
      toast({
        title: 'Acesso restrito',
        description: 'Apenas usuários com perfil RH podem aprovar correspondências.',
        variant: 'destructive',
      })
      return
    }
    try {
      await catalogosService.aprovarEAplicarCorrespondencia(
        m.id,
        user?.id || '',
        'Aprovado manualmente via Painel de Normalização pelo RH.',
      )
      toast({
        title: 'Correspondência aplicada com sucesso!',
        description: `Vínculo criado ao lado do texto original sem sobrescrever.`,
      })
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao aprovar',
        description: err?.message || 'Falha ao aplicar normalização.',
        variant: 'destructive',
      })
    }
  }

  const handleRejeitar = async (m: MapeamentoNormalizacao) => {
    if (!isRh) {
      toast({
        title: 'Acesso restrito',
        description: 'Apenas usuários com perfil RH podem rejeitar correspondências.',
        variant: 'destructive',
      })
      return
    }
    try {
      await catalogosService.rejeitarCorrespondencia(
        m.id,
        user?.id || '',
        'Rejeitado pelo analista de RH após revisão textual e de escopo.',
      )
      toast({
        title: 'Correspondência rejeitada',
        description: 'O texto original permanece sem vínculo ao catálogo.',
      })
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao rejeitar',
        description: err?.message || 'Falha ao rejeitar mapeamento.',
        variant: 'destructive',
      })
    }
  }

  const handleDesfazer = async (m: MapeamentoNormalizacao) => {
    if (!isRh) {
      toast({
        title: 'Acesso restrito',
        description: 'Apenas usuários com perfil RH podem executar a recuperação segura.',
        variant: 'destructive',
      })
      return
    }
    try {
      const res = await catalogosService.desfazerVinculoNormalizacao(m.id)
      if (res.sucesso) {
        toast({
          title: 'Procedimento de Recuperação Executado',
          description: res.mensagem,
        })
        await carregarDados()
      } else {
        toast({
          title: 'Operação não permitida',
          description: res.mensagem,
          variant: 'destructive',
        })
      }
    } catch (err: any) {
      toast({
        title: 'Erro na recuperação',
        description: err?.message || 'Falha ao desfazer vínculo.',
        variant: 'destructive',
      })
    }
  }

  // Criação de Cargo
  const handleCriarCargo = async () => {
    if (!cargoForm.nome.trim() || !cargoForm.codigo.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Código e Nome do cargo são necessários.',
        variant: 'destructive',
      })
      return
    }
    try {
      await catalogosService.criarCargo({
        codigo: cargoForm.codigo.trim().toUpperCase(),
        nome: cargoForm.nome.trim(),
        descricao: cargoForm.descricao.trim() || undefined,
        ativo: cargoForm.ativo,
        competencias_referencia: cargoForm.competencias,
      })
      toast({
        title: 'Cargo cadastrado com sucesso!',
        description: `${cargoForm.nome} foi adicionado ao catálogo oficial.`,
      })
      setModalCargoOpen(false)
      setCargoForm({ codigo: '', nome: '', descricao: '', ativo: true, competencias: [] })
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar cargo',
        description: err?.message || 'Verifique se o código já existe.',
        variant: 'destructive',
      })
    }
  }

  // Criação de Competência
  const handleCriarComp = async () => {
    if (!compForm.nome.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Nome da competência é necessário.',
        variant: 'destructive',
      })
      return
    }
    try {
      await catalogosService.criarCompetencia({
        nome: compForm.nome.trim(),
        codigo: compForm.codigo.trim().toUpperCase() || undefined,
        categoria: compForm.categoria,
        descricao: compForm.descricao.trim() || undefined,
        ativo: compForm.ativo,
      })
      toast({
        title: 'Competência cadastrada com sucesso!',
        description: `${compForm.nome} foi adicionada ao catálogo.`,
      })
      setModalCompOpen(false)
      setCompForm({
        nome: '',
        codigo: '',
        categoria: 'Técnica',
        descricao: '',
        ativo: true,
      })
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar competência',
        description: err?.message || 'Falha ao criar competência.',
        variant: 'destructive',
      })
    }
  }

  // Criação de Centro de Custo
  const handleCriarCc = async () => {
    if (!ccForm.codigo.trim() || !ccForm.nome.trim() || !ccForm.empresa) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Código, Nome e Empresa responsável são obrigatórios.',
        variant: 'destructive',
      })
      return
    }
    try {
      await catalogosService.criarCentroCusto({
        codigo: ccForm.codigo.trim().toUpperCase(),
        nome: ccForm.nome.trim(),
        empresa: ccForm.empresa,
        status: ccForm.status,
        identificador_externo: ccForm.identificador_externo.trim() || undefined,
      })
      toast({
        title: 'Centro de Custo cadastrado!',
        description: `${ccForm.codigo} foi criado no contexto da BU selecionada.`,
      })
      setModalCcOpen(false)
      setCcForm({
        codigo: '',
        nome: '',
        empresa: '',
        status: 'Ativo',
        identificador_externo: '',
      })
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao cadastrar centro de custo',
        description: err?.message || 'Código já existente nesta empresa ou dados inválidos.',
        variant: 'destructive',
      })
    }
  }

  // Adicionar Competência à Pessoa
  const handleCriarCompPessoa = async () => {
    if (!compPessoaForm.pessoa || !compPessoaForm.competencia) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione a pessoa e a competência.',
        variant: 'destructive',
      })
      return
    }
    try {
      await catalogosService.criarCompetenciaPessoa({
        pessoa: compPessoaForm.pessoa,
        competencia: compPessoaForm.competencia,
        proficiencia: compPessoaForm.proficiencia,
        fonte: compPessoaForm.fonte,
        observacoes: compPessoaForm.observacoes || undefined,
      })
      toast({
        title: 'Competência atribuída com sucesso!',
        description:
          compPessoaForm.fonte === 'curriculo_extraido' || compPessoaForm.fonte === 'autodeclarada'
            ? 'Registro cadastrado com validação pendente pelo RH.'
            : 'Registro cadastrado no histórico da pessoa.',
      })
      setModalCompPessoaOpen(false)
      setCompPessoaForm({
        pessoa: '',
        competencia: '',
        proficiencia: 'Nao_avaliada',
        fonte: 'gestor',
        observacoes: '',
      })
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao vincular competência',
        description: err?.message || 'Falha ao registrar competência da pessoa.',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header Institucional */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-amber-500/10 text-amber-600 border-amber-300 font-mono text-[11px]"
            >
              HOMOLOGAÇÃO — ETAPA 2 (v0.0.85)
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              Não publicar em produção
            </span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-[#212B55] dark:text-[#F7F8FB] mt-1 font-display">
            Catálogos Oficiais & Normalização Controlada
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão unificada de Cargos, Competências e Centros de Custo com preservação integral dos
            textos legados e rastreabilidade total.
          </p>
        </div>

        {/* Resumo Rápido de Status */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4" />
            <span>{metricasNormalizacao.aplicadas} Aplicadas</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <Clock className="w-4 h-4" />
            <span>{metricasNormalizacao.pendentes} Pendentes</span>
          </div>
        </div>
      </div>

      {/* Tabs Principais */}
      <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="space-y-4">
        <TabsList className="bg-slate-100 dark:bg-[#1A2240] p-1 border border-slate-200 dark:border-[#2E3A6E] rounded-xl">
          <TabsTrigger value="cargos" className="gap-2 text-xs font-semibold">
            <Briefcase className="w-3.5 h-3.5" />
            Catálogo de Cargos ({cargos.length})
          </TabsTrigger>
          <TabsTrigger value="competencias" className="gap-2 text-xs font-semibold">
            <Award className="w-3.5 h-3.5" />
            Competências ({competencias.length})
          </TabsTrigger>
          <TabsTrigger value="centros_custo" className="gap-2 text-xs font-semibold">
            <Wallet className="w-3.5 h-3.5" />
            Centros de Custo ({centrosCusto.length})
          </TabsTrigger>
          <TabsTrigger value="competencias_pessoas" className="gap-2 text-xs font-semibold">
            <Users className="w-3.5 h-3.5" />
            Matriz por Pessoa ({competenciasPessoas.length})
          </TabsTrigger>
          <TabsTrigger
            value="normalizacao"
            className="gap-2 text-xs font-semibold text-[#E9530E] dark:text-[#F19763] data-[state=active]:bg-[#FEF1EA] dark:data-[state=active]:bg-[#212B55]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Revisão de Correspondências ({mapeamentos.length})
          </TabsTrigger>
        </TabsList>

        {/* ========================================================================= */}
        {/* ABA 1: CARGOS */}
        {/* ========================================================================= */}
        <TabsContent value="cargos" className="space-y-4">
          {/* Alertas de Duplicidade */}
          {duplicidadesCargos.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-semibold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {duplicidadesCargos.length} Possível(is) duplicidade(s) identificada(s) por
                  similaridade de grafia:
                </span>
              </div>
              <div className="space-y-1.5 pl-6">
                {duplicidadesCargos.map((d, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-2"
                  >
                    <span className="font-mono font-bold">{d.itemA.codigo}</span>
                    <span>({d.itemA.nome})</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="font-mono font-bold">{d.itemB.codigo}</span>
                    <span>({d.itemB.nome})</span>
                    <span className="text-[11px] text-muted-foreground italic">
                      — {d.motivo} (Aviso informativo, não bloqueante)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Barra de Ações */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou código..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            {isRh && (
              <Button
                onClick={() => setModalCargoOpen(true)}
                size="sm"
                className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Cargo no Catálogo
              </Button>
            )}
          </div>

          {/* Lista de Cargos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cargos
              .filter(
                (c) =>
                  !busca ||
                  c.nome.toLowerCase().includes(busca.toLowerCase()) ||
                  c.codigo.toLowerCase().includes(busca.toLowerCase()),
              )
              .map((cg) => (
                <Card
                  key={cg.id}
                  className={`border transition-all ${!cg.ativo ? 'opacity-60 bg-slate-50 dark:bg-slate-900/40' : ''}`}
                >
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] font-bold text-[#E9530E] bg-[#FEF1EA] dark:bg-[#212B55] px-2 py-0.5 rounded">
                        {cg.codigo}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          cg.ativo
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600 border-slate-300'
                        }
                      >
                        {cg.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold mt-2 font-display">{cg.nome}</CardTitle>
                    {cg.descricao && (
                      <CardDescription className="text-xs line-clamp-2">
                        {cg.descricao}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 pt-2 border-t mt-2">
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Competências Vinculadas ({cg.competencias_referencia?.length || 0})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {cg.expand?.competencias_referencia?.map((comp) => (
                          <span
                            key={comp.id}
                            className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded border font-medium"
                          >
                            {comp.nome}
                          </span>
                        ))}
                        {(!cg.competencias_referencia ||
                          cg.competencias_referencia.length === 0) && (
                          <span className="text-[11px] text-muted-foreground italic">
                            Nenhuma competência de referência vinculada.
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 2: COMPETÊNCIAS */}
        {/* ========================================================================= */}
        <TabsContent value="competencias" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar competência ou categoria..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
            {isRh && (
              <Button
                onClick={() => setModalCompOpen(true)}
                size="sm"
                className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Competência
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {competencias
              .filter(
                (comp) =>
                  !busca ||
                  comp.nome.toLowerCase().includes(busca.toLowerCase()) ||
                  comp.categoria.toLowerCase().includes(busca.toLowerCase()),
              )
              .map((cp) => (
                <Card key={cp.id} className="border">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-[11px] font-semibold">
                        {cp.categoria}
                      </Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {cp.codigo || '—'}
                      </span>
                    </div>
                    <CardTitle className="text-sm font-bold mt-2">{cp.nome}</CardTitle>
                    {cp.descricao && (
                      <CardDescription className="text-xs">{cp.descricao}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="p-4 pt-2 border-t mt-2">
                    <div className="space-y-1.5 text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Critérios de Proficiência (1 a 5)
                      </span>
                      {cp.criterios_proficiencia ? (
                        <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-2 rounded border">
                          <div>
                            <strong>Nível 1 (Básico):</strong>{' '}
                            {cp.criterios_proficiencia.nivel_1 || 'Operação assistida'}
                          </div>
                          <div>
                            <strong>Nível 3 (Avançado):</strong>{' '}
                            {cp.criterios_proficiencia.nivel_3 || 'Autonomia completa'}
                          </div>
                          <div>
                            <strong>Nível 5 (Referência):</strong>{' '}
                            {cp.criterios_proficiencia.nivel_5 || 'Referência técnica/cultural'}
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground italic">
                          Critérios descritivos padrão definidos no manual.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 3: CENTROS DE CUSTO */}
        {/* ========================================================================= */}
        <TabsContent value="centros_custo" className="space-y-4">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-center justify-between">
            <span>
              ℹ️ <strong>Conceito Institucional:</strong> Áreas e Centros de Custo são entidades
              distintas. O código do centro de custo é único por BU / Empresa (índice composto
              empresa + código).
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar centro de custo..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-9 h-9 text-xs"
                />
              </div>
              <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
                <SelectTrigger className="w-48 h-9 text-xs">
                  <SelectValue placeholder="Filtrar por BU" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as BUs</SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome_fantasia} ({e.sigla})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isRh && (
              <Button
                onClick={() => setModalCcOpen(true)}
                size="sm"
                className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Novo Centro de Custo
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {centrosCusto
              .filter(
                (cc) =>
                  (!busca ||
                    cc.nome.toLowerCase().includes(busca.toLowerCase()) ||
                    cc.codigo.toLowerCase().includes(busca.toLowerCase())) &&
                  (filtroEmpresa === 'todos' || cc.empresa === filtroEmpresa),
              )
              .map((cc) => (
                <Card key={cc.id} className="border">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded">
                        {cc.codigo}
                      </span>
                      <Badge
                        variant="outline"
                        className={
                          cc.status === 'Ativo'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-600'
                        }
                      >
                        {cc.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-sm font-bold mt-2">{cc.nome}</CardTitle>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{cc.expand?.empresa?.nome_fantasia || 'Empresa Vinculada'}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 border-t mt-2 text-xs text-muted-foreground flex items-center justify-between">
                    <span>
                      ERP Ref: <strong>{cc.identificador_externo || 'Sem integração'}</strong>
                    </span>
                    <span>Vigência: 2024–Indet.</span>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 4: MATRIZ DE COMPETÊNCIAS POR PESSOA */}
        {/* ========================================================================= */}
        <TabsContent value="competencias_pessoas" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Diferenciação explícita entre competências autodeclaradas, validadas e não avaliadas.
              Gestores podem apontar competências de sua BU; validação formal é do RH.
            </p>
            <Button
              onClick={() => setModalCompPessoaOpen(true)}
              size="sm"
              className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Atribuir Competência à Pessoa
            </Button>
          </div>

          <div className="divide-y border rounded-xl bg-white dark:bg-[#1A2240] overflow-hidden">
            {competenciasPessoas.map((cp) => {
              const isNaoAvaliada = cp.proficiencia === 'Nao_avaliada'
              return (
                <div
                  key={cp.id}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-[#212B55] dark:text-[#F7F8FB]">
                        {cp.expand?.pessoa?.nome || 'Colaborador'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({cp.expand?.pessoa?.cargo_funcao || 'Cargo'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline" className="font-semibold">
                        {cp.expand?.competencia?.nome || 'Competência'}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className={
                          isNaoAvaliada ? 'bg-slate-100 text-slate-500' : 'bg-blue-50 text-blue-700'
                        }
                      >
                        {isNaoAvaliada ? 'Não Avaliada' : cp.proficiencia.replace('_', ' ')}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        Fonte: <strong>{cp.fonte}</strong>
                      </span>
                    </div>
                    {cp.observacoes && (
                      <p className="text-xs text-slate-500 italic">"{cp.observacoes}"</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {cp.evidencia_documento && (
                      <Badge
                        variant="outline"
                        className="bg-purple-50 text-purple-700 border-purple-200 text-[11px] gap-1"
                      >
                        <FileCheck className="w-3 h-3" />
                        Evidência no Cofre
                      </Badge>
                    )}

                    <Badge
                      className={
                        cp.status_validacao === 'validada'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : cp.status_validacao === 'rejeitada'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                      }
                    >
                      {cp.status_validacao.toUpperCase()}
                    </Badge>

                    {isRh && cp.status_validacao === 'pendente' && (
                      <div className="flex items-center gap-1 ml-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs"
                          onClick={async () => {
                            await catalogosService.validarCompetenciaPessoa(
                              cp.id,
                              true,
                              user?.id || '',
                            )
                            toast({ title: 'Competência Validada pelo RH!' })
                            carregarDados()
                          }}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          Validar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-red-700 border-red-300 hover:bg-red-50 text-xs"
                          onClick={async () => {
                            await catalogosService.validarCompetenciaPessoa(
                              cp.id,
                              false,
                              user?.id || '',
                            )
                            toast({ title: 'Competência Rejeitada.' })
                            carregarDados()
                          }}
                        >
                          <X className="w-3 h-3 mr-1" />
                          Rejeitar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* ========================================================================= */}
        {/* ABA 5: REVISÃO DE CORRESPONDÊNCIAS LADO A LADO */}
        {/* ========================================================================= */}
        <TabsContent value="normalizacao" className="space-y-4">
          {/* Header Explicativo da Normalização Controlada */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-orange-50 to-amber-50 dark:from-slate-900 dark:to-[#1A2240] border border-orange-200 dark:border-[#2E3A6E] space-y-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-[#E9530E]" />
              <h3 className="text-sm font-bold text-[#212B55] dark:text-[#F7F8FB]">
                Normalização Controlada com Preservação Integral de Textos Legados
              </h3>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              O sistema <strong>NÃO sobrescreve</strong> os campos textuais originais de
              colaboradores e vagas (ex: "cargo_funcao", "departamento", "centro_custo"). Cada
              correspondência cria um vínculo aditivo ao catálogo oficial com justificativa
              auditada. Casos ambíguos permanecem <strong>PENDENTES</strong> para revisão e decisão
              do RH.
            </p>
          </div>

          {/* Filtros da Tabela */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant={filtroStatus === 'todos' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('todos')}
                className="text-xs h-8"
              >
                Todos ({mapeamentos.length})
              </Button>
              <Button
                variant={filtroStatus === 'pendente' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('pendente')}
                className="text-xs h-8"
              >
                Pendentes ({metricasNormalizacao.pendentes})
              </Button>
              <Button
                variant={filtroStatus === 'aplicada' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFiltroStatus('aplicada')}
                className="text-xs h-8"
              >
                Aplicadas ({metricasNormalizacao.aplicadas})
              </Button>
            </div>
          </div>

          {/* Tabela de Mapeamento Lado a Lado */}
          <div className="border rounded-xl bg-white dark:bg-[#1A2240] overflow-hidden divide-y">
            {mapeamentos
              .filter((m) => filtroStatus === 'todos' || m.status === filtroStatus)
              .map((m) => {
                const destinoNome =
                  m.tipo_destino === 'cargo'
                    ? m.expand?.cargo_destino?.nome || 'Cargo Oficial'
                    : m.tipo_destino === 'centro_custo'
                      ? `${m.expand?.centro_custo_destino?.codigo} - ${m.expand?.centro_custo_destino?.nome}`
                      : 'Área Oficial'

                return (
                  <div
                    key={m.id}
                    className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
                  >
                    {/* Origem */}
                    <div className="lg:col-span-4 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        <Badge variant="outline" className="text-[10px]">
                          {m.registro_origem_colecao.toUpperCase()}
                        </Badge>
                        <span>Campo: {m.campo_origem}</span>
                      </div>
                      <div className="font-semibold text-sm text-[#212B55] dark:text-[#F7F8FB] bg-slate-50 dark:bg-slate-900/40 p-2 rounded border font-mono">
                        "{m.texto_original}"
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                        <span>
                          Contexto: <strong>{m.expand?.empresa_contexto?.sigla || 'Grupo'}</strong>
                        </span>
                        {m.expand?.area_contexto && <span>• {m.expand.area_contexto.nome}</span>}
                      </div>
                    </div>

                    {/* Seta e Tipo */}
                    <div className="lg:col-span-1 flex flex-col items-center justify-center text-muted-foreground">
                      <ArrowRight className="w-5 h-5 text-[#E9530E]" />
                      <span className="text-[10px] uppercase font-bold mt-1">{m.tipo_destino}</span>
                    </div>

                    {/* Destino Proposto */}
                    <div className="lg:col-span-4 space-y-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Destino Proposto (Catálogo Oficial)
                      </span>
                      <div className="font-semibold text-sm text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 p-2 rounded border border-emerald-200">
                        {destinoNome}
                      </div>
                      <p className="text-[11px] text-muted-foreground italic line-clamp-2">
                        Justificativa: {m.justificativa}
                      </p>
                    </div>

                    {/* Status e Ações */}
                    <div className="lg:col-span-3 flex flex-col items-end justify-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <Badge
                          className={
                            m.status === 'aplicada'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : m.status === 'pendente'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-red-100 text-red-800'
                          }
                        >
                          {m.status.toUpperCase()}
                        </Badge>
                        {m.confianca_metodo === 'deterministico_exato' && (
                          <Badge
                            variant="outline"
                            className="text-[10px] text-blue-600 border-blue-200"
                          >
                            Exato (100%)
                          </Badge>
                        )}
                      </div>

                      {/* Botões de Ação para RH */}
                      {isRh && (
                        <div className="flex items-center gap-1.5 mt-1">
                          {m.status === 'pendente' && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleAprovar(m)}
                                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              >
                                <Check className="w-3.5 h-3.5 mr-1" />
                                Aprovar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejeitar(m)}
                                className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
                              >
                                <X className="w-3.5 h-3.5 mr-1" />
                                Rejeitar
                              </Button>
                            </>
                          )}

                          {m.status === 'aplicada' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDesfazer(m)}
                              className="h-7 text-[11px] text-slate-500 hover:text-red-600"
                              title="Procedimento de Recuperação Segura: desfaz apenas vínculos não alterados manualmente"
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Desfazer Vínculo
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
          </div>
        </TabsContent>
      </Tabs>

      {/* ========================================================================= */}
      {/* MODAL: NOVO CARGO */}
      {/* ========================================================================= */}
      <Dialog open={modalCargoOpen} onOpenChange={setModalCargoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cargo Oficial</DialogTitle>
            <DialogDescription>
              Cadastre um cargo no catálogo com normalização de grafia e código institucional único.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Código do Cargo (Ex: CARGO-TECH-01)</Label>
              <Input
                placeholder="Ex: CARGO-OPS-02"
                value={cargoForm.codigo}
                onChange={(e) => setCargoForm({ ...cargoForm, codigo: e.target.value })}
                className="text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Nome do Cargo</Label>
              <Input
                placeholder="Ex: Coordenador de Infraestrutura"
                value={cargoForm.nome}
                onChange={(e) => setCargoForm({ ...cargoForm, nome: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Descrição das Responsabilidades</Label>
              <Textarea
                placeholder="Breve resumo das atribuições estratégicas..."
                value={cargoForm.descricao}
                onChange={(e) => setCargoForm({ ...cargoForm, descricao: e.target.value })}
                className="text-xs"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCargoOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCriarCargo}
              className="bg-[#E9530E] hover:bg-[#C5430A] text-white"
            >
              Salvar Cargo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: NOVA COMPETÊNCIA */}
      {/* ========================================================================= */}
      <Dialog open={modalCompOpen} onOpenChange={setModalCompOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Competência de Referência</DialogTitle>
            <DialogDescription>
              Adicione competências técnicas, comportamentais ou de liderança ao catálogo oficial.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Nome da Competência</Label>
              <Input
                placeholder="Ex: Gestão de Incidentes SRE"
                value={compForm.nome}
                onChange={(e) => setCompForm({ ...compForm, nome: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Categoria</Label>
              <Select
                value={compForm.categoria}
                onValueChange={(val: any) => setCompForm({ ...compForm, categoria: val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Técnica">Técnica</SelectItem>
                  <SelectItem value="Comportamental">Comportamental</SelectItem>
                  <SelectItem value="Liderança">Liderança</SelectItem>
                  <SelectItem value="Gestão & Negócios">Gestão & Negócios</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Descrição e Critérios</Label>
              <Textarea
                placeholder="Definição da competência e impacto esperado..."
                value={compForm.descricao}
                onChange={(e) => setCompForm({ ...compForm, descricao: e.target.value })}
                className="text-xs"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCompOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCriarComp}
              className="bg-[#E9530E] hover:bg-[#C5430A] text-white"
            >
              Salvar Competência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: NOVO CENTRO DE CUSTO */}
      {/* ========================================================================= */}
      <Dialog open={modalCcOpen} onOpenChange={setModalCcOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Centro de Custo</DialogTitle>
            <DialogDescription>
              O código é único dentro da BU selecionada (índice composto empresa + código).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Empresa / BU Responsável</Label>
              <Select
                value={ccForm.empresa}
                onValueChange={(val) => setCcForm({ ...ccForm, empresa: val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome_fantasia} ({e.sigla})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Código do Centro de Custo (Ex: CC-ENG-01)</Label>
              <Input
                placeholder="Ex: CC-TI-01"
                value={ccForm.codigo}
                onChange={(e) => setCcForm({ ...ccForm, codigo: e.target.value })}
                className="text-xs font-mono"
              />
            </div>
            <div>
              <Label className="text-xs">Nome do Centro de Custo</Label>
              <Input
                placeholder="Ex: Engenharia de Plataforma"
                value={ccForm.nome}
                onChange={(e) => setCcForm({ ...ccForm, nome: e.target.value })}
                className="text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">Identificador Externo (ERP)</Label>
              <Input
                placeholder="Ex: ERP-CC-4010"
                value={ccForm.identificador_externo}
                onChange={(e) => setCcForm({ ...ccForm, identificador_externo: e.target.value })}
                className="text-xs"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCcOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCriarCc} className="bg-[#E9530E] hover:bg-[#C5430A] text-white">
              Salvar Centro de Custo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL: ATRIBUIR COMPETÊNCIA À PESSOA */}
      {/* ========================================================================= */}
      <Dialog open={modalCompPessoaOpen} onOpenChange={setModalCompPessoaOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Atribuir Competência à Pessoa</DialogTitle>
            <DialogDescription>
              Registre competências autodeclaradas, do gestor ou extraídas de currículo.
              Competências não avaliadas não recebem nota fictícia.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs">Colaborador / Prestador</Label>
              <Select
                value={compPessoaForm.pessoa}
                onValueChange={(val) => setCompPessoaForm({ ...compPessoaForm, pessoa: val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione o profissional" />
                </SelectTrigger>
                <SelectContent>
                  {pessoas.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.nome} ({p.cargo_funcao || p.modalidade})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Competência do Catálogo</Label>
              <Select
                value={compPessoaForm.competencia}
                onValueChange={(val) => setCompPessoaForm({ ...compPessoaForm, competencia: val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione a competência" />
                </SelectTrigger>
                <SelectContent>
                  {competencias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} ({c.categoria})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Proficiência</Label>
              <Select
                value={compPessoaForm.proficiencia}
                onValueChange={(val: any) =>
                  setCompPessoaForm({ ...compPessoaForm, proficiencia: val })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Nao_avaliada">Não avaliada (Sem nota fictícia)</SelectItem>
                  <SelectItem value="Nivel_1_Basico">Nível 1 - Básico</SelectItem>
                  <SelectItem value="Nivel_2_Intermediario">Nível 2 - Intermediário</SelectItem>
                  <SelectItem value="Nivel_3_Avancado">Nível 3 - Avançado</SelectItem>
                  <SelectItem value="Nivel_4_Especialista">Nível 4 - Especialista</SelectItem>
                  <SelectItem value="Nivel_5_Referencia">Nível 5 - Referência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Fonte da Informação</Label>
              <Select
                value={compPessoaForm.fonte}
                onValueChange={(val: any) => setCompPessoaForm({ ...compPessoaForm, fonte: val })}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gestor">Avaliação do Gestor</SelectItem>
                  <SelectItem value="autodeclarada">Autodeclarada pelo Profissional</SelectItem>
                  <SelectItem value="certificado">Certificado / Comprovação</SelectItem>
                  <SelectItem value="curriculo_extraido">
                    Extraído de Currículo (Nasce Pendente)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Observações / Evidência</Label>
              <Textarea
                placeholder="Comentários sobre a evidência ou observações de desenvolvimento..."
                value={compPessoaForm.observacoes}
                onChange={(e) =>
                  setCompPessoaForm({
                    ...compPessoaForm,
                    observacoes: e.target.value,
                  })
                }
                className="text-xs"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalCompPessoaOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCriarCompPessoa}
              className="bg-[#E9530E] hover:bg-[#C5430A] text-white"
            >
              Atribuir Competência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
