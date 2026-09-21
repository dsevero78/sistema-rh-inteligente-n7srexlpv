import React, { useState, useEffect, useMemo } from 'react'
import {
  Building2,
  Plus,
  Search,
  CheckCircle2,
  Users,
  Layers,
  MapPin,
  Phone,
  FileText,
  Edit2,
  Trash2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  FolderTree,
  DollarSign,
  Briefcase,
  X,
  Filter,
  ShieldCheck,
} from 'lucide-react'
import { AbaGestaoUsuarios } from '@/components/AbaGestaoUsuarios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { toast } from '@/hooks/use-toast'
import {
  empresasService,
  Empresa,
  Area,
  TipoEmpresa,
  StatusEmpresa,
  validarCNPJ,
  formatarCNPJ,
  CriarEmpresaInput,
} from '@/services/empresasService'
import { useNavigate } from 'react-router-dom'

export function EmpresasUnidadesPage() {
  const navigate = useNavigate()

  // Estados principais
  const [abaAtiva, setAbaAtiva] = useState<'empresas' | 'usuarios'>('empresas')
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [areas, setAreas] = useState<Area[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros e busca
  const [termoBusca, setTermoBusca] = useState('')
  const [filtroContexto, setFiltroContexto] = useState<string>('todos') // 'todos' ou ID da empresa selecionada

  // Modais
  const [modalEmpresaAberta, setModalEmpresaAberta] = useState(false)
  const [empresaEmEdicao, setEmpresaEmEdicao] = useState<Empresa | null>(null)

  const [modalAreasAberta, setModalAreasAberta] = useState(false)
  const [empresaSelecionadaParaAreas, setEmpresaSelecionadaParaAreas] = useState<Empresa | null>(
    null,
  )

  const [modalExcluirAberta, setModalExcluirAberta] = useState(false)
  const [empresaParaExcluir, setEmpresaParaExcluir] = useState<Empresa | null>(null)
  const [excluindoLoading, setExcluindoLoading] = useState(false)

  // Form de Empresa
  const [formNomeFantasia, setFormNomeFantasia] = useState('')
  const [formRazaoSocial, setFormRazaoSocial] = useState('')
  const [formCnpj, setFormCnpj] = useState('')
  const [formTipo, setFormTipo] = useState<TipoEmpresa>('BU / Filial')
  const [formStatus, setFormStatus] = useState<StatusEmpresa>('Operando')
  const [formCnae, setFormCnae] = useState('')
  const [formCidade, setFormCidade] = useState('')
  const [formUf, setFormUf] = useState('')
  const [formTelefone, setFormTelefone] = useState('')
  const [formSigla, setFormSigla] = useState('')
  const [formCor, setFormCor] = useState('#0D9488')
  const [formEmpresaPai, setFormEmpresaPai] = useState<string>('none')
  const [formObservacoes, setFormObservacoes] = useState('')
  const [salvandoEmpresa, setSalvandoEmpresa] = useState(false)
  const [cnpjErro, setCnpjErro] = useState('')

  // Form de Área
  const [areaNome, setAreaNome] = useState('')
  const [areaResp, setAreaResp] = useState('')
  const [areaDesc, setAreaDesc] = useState('')
  const [areaAtiva, setAreaAtiva] = useState(true)
  const [areaEmEdicaoId, setAreaEmEdicaoId] = useState<string | null>(null)
  const [salvandoArea, setSalvandoArea] = useState(false)

  // Carregar dados
  const carregarDados = async () => {
    try {
      setLoading(true)
      const [listaEmpresas, listaAreas] = await Promise.all([
        empresasService.listarEmpresas(),
        empresasService.listarAreas(),
      ])
      setEmpresas(listaEmpresas)
      setAreas(listaAreas)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Erro ao carregar empresas',
        description: 'Não foi possível carregar a estrutura de unidades.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  // Métricas Consolidadas para os KPIs de topo
  const kpis = useMemo(() => {
    const totalEmpresas = empresas.length
    const ativas = empresas.filter((e) => e.status === 'Operando').length
    const totalVinculos = empresas.reduce((acc, cur) => acc + (cur.total_vinculos || 0), 0)
    const totalAreas = areas.length
    const totalMatriz = empresas.filter((e) => e.tipo === 'Holding / Matriz').length
    const totalBUs = empresas.filter((e) => e.tipo === 'BU / Filial').length
    const totalCustoGrupo = empresas.reduce((acc, cur) => acc + (cur.custo_mensal || 0), 0)

    return {
      totalEmpresas,
      ativas,
      totalVinculos,
      totalAreas,
      totalMatriz,
      totalBUs,
      totalCustoGrupo,
    }
  }, [empresas, areas])

  // Lista de empresas filtradas
  const empresasFiltradas = useMemo(() => {
    return empresas.filter((emp) => {
      // Filtro de contexto selecionado (topo)
      if (filtroContexto !== 'todos' && emp.id !== filtroContexto) {
        return false
      }

      // Filtro de busca textual
      if (!termoBusca.trim()) return true
      const termo = termoBusca.toLowerCase()
      const matchNome = emp.nome_fantasia.toLowerCase().includes(termo)
      const matchRazao = emp.razao_social.toLowerCase().includes(termo)
      const matchCnpj = emp.cnpj.replace(/\D/g, '').includes(termo.replace(/\D/g, ''))
      const matchSigla = emp.sigla?.toLowerCase().includes(termo)
      const matchCidade = emp.endereco_cidade?.toLowerCase().includes(termo)
      return matchNome || matchRazao || matchCnpj || matchSigla || matchCidade
    })
  }, [empresas, filtroContexto, termoBusca])

  // Abrir Modal de Criação de Empresa
  const abrirModalNovaEmpresa = () => {
    setEmpresaEmEdicao(null)
    const proximaOrdem = empresas.length + 1
    const proximaSigla = `EMP-${String(proximaOrdem).padStart(2, '0')}`
    setFormNomeFantasia('')
    setFormRazaoSocial('')
    setFormCnpj('')
    setFormTipo('BU / Filial')
    setFormStatus('Operando')
    setFormCnae('')
    setFormCidade('')
    setFormUf('SP')
    setFormTelefone('')
    setFormSigla(proximaSigla)
    setFormCor('#2563EB')
    // Holding padrão se existir
    const holding = empresas.find((e) => e.tipo === 'Holding / Matriz')
    setFormEmpresaPai(holding ? holding.id : 'none')
    setFormObservacoes('')
    setCnpjErro('')
    setModalEmpresaAberta(true)
  }

  // Abrir Modal de Edição de Empresa
  const abrirModalEditarEmpresa = (emp: Empresa) => {
    setEmpresaEmEdicao(emp)
    setFormNomeFantasia(emp.nome_fantasia)
    setFormRazaoSocial(emp.razao_social)
    setFormCnpj(emp.cnpj)
    setFormTipo(emp.tipo)
    setFormStatus(emp.status)
    setFormCnae(emp.cnae || '')
    setFormCidade(emp.endereco_cidade || '')
    setFormUf(emp.endereco_uf || '')
    setFormTelefone(emp.telefone || '')
    setFormSigla(emp.sigla || 'EMP')
    setFormCor(emp.logo_cor || '#0D9488')
    setFormEmpresaPai(emp.empresa_pai || 'none')
    setFormObservacoes(emp.observacoes || '')
    setCnpjErro('')
    setModalEmpresaAberta(true)
  }

  // Salvar Empresa (Criar ou Atualizar)
  const handleSalvarEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    setCnpjErro('')

    if (!formNomeFantasia.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe o Nome Fantasia da empresa.' })
      return
    }
    if (!formRazaoSocial.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe a Razão Social.' })
      return
    }

    const cnpjFormatado = formatarCNPJ(formCnpj)
    if (!validarCNPJ(cnpjFormatado)) {
      setCnpjErro('CNPJ inválido. Verifique os 14 dígitos e o cálculo verificador.')
      return
    }

    try {
      setSalvandoEmpresa(true)
      const payload: CriarEmpresaInput = {
        nome_fantasia: formNomeFantasia,
        razao_social: formRazaoSocial,
        cnpj: cnpjFormatado,
        tipo: formTipo,
        status: formStatus,
        cnae: formCnae || undefined,
        endereco_cidade: formCidade || undefined,
        endereco_uf: formUf || undefined,
        telefone: formTelefone || undefined,
        logo_cor: formCor || '#0D9488',
        sigla: formSigla || 'EMP',
        empresa_pai: formEmpresaPai !== 'none' ? formEmpresaPai : undefined,
        observacoes: formObservacoes || undefined,
      }

      if (empresaEmEdicao) {
        await empresasService.atualizarEmpresa({
          id: empresaEmEdicao.id,
          ...payload,
        })
        toast({
          title: 'Empresa atualizada com sucesso',
          description: `${formNomeFantasia} teve seus dados salvos.`,
        })
      } else {
        await empresasService.criarEmpresa(payload)
        toast({
          title: 'Nova empresa cadastrada!',
          description: `${formNomeFantasia} foi adicionada ao Grupo Econômico.`,
        })
      }

      setModalEmpresaAberta(false)
      await carregarDados()
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar empresa',
        description: err.message || 'Verifique se o CNPJ já está cadastrado.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoEmpresa(false)
    }
  }

  // Confirmar Exclusão de Empresa
  const handleExcluirEmpresa = async () => {
    if (!empresaParaExcluir) return
    try {
      setExcluindoLoading(true)
      const res = await empresasService.excluirEmpresa(empresaParaExcluir.id)
      if (!res.success) {
        toast({
          title: 'Não foi possível excluir',
          description: res.motivo,
          variant: 'destructive',
        })
        return
      }

      toast({
        title: 'Empresa removida',
        description: `${empresaParaExcluir.nome_fantasia} foi excluída com sucesso.`,
      })
      if (filtroContexto === empresaParaExcluir.id) {
        setFiltroContexto('todos')
      }
      setModalExcluirAberta(false)
      setEmpresaParaExcluir(null)
      await carregarDados()
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Falha na exclusão da empresa.',
        variant: 'destructive',
      })
    } finally {
      setExcluindoLoading(false)
    }
  }

  // Gestão de Áreas da Empresa
  const abrirGestaoAreas = (emp: Empresa) => {
    setEmpresaSelecionadaParaAreas(emp)
    setAreaNome('')
    setAreaResp('')
    setAreaDesc('')
    setAreaAtiva(true)
    setAreaEmEdicaoId(null)
    setModalAreasAberta(true)
  }

  const areasDaEmpresaSelecionada = useMemo(() => {
    if (!empresaSelecionadaParaAreas) return []
    return areas.filter((a) => a.empresa === empresaSelecionadaParaAreas.id)
  }, [areas, empresaSelecionadaParaAreas])

  const handleSalvarArea = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaSelecionadaParaAreas) return
    if (!areaNome.trim()) {
      toast({ title: 'Campo obrigatório', description: 'Informe o nome da área.' })
      return
    }

    try {
      setSalvandoArea(true)
      if (areaEmEdicaoId) {
        await empresasService.atualizarArea({
          id: areaEmEdicaoId,
          nome: areaNome,
          empresa: empresaSelecionadaParaAreas.id,
          responsavel_nome: areaResp,
          descricao: areaDesc,
          ativa: areaAtiva,
        })
        toast({ title: 'Área atualizada!' })
      } else {
        await empresasService.criarArea({
          nome: areaNome,
          empresa: empresaSelecionadaParaAreas.id,
          responsavel_nome: areaResp,
          descricao: areaDesc,
          ativa: areaAtiva,
        })
        toast({ title: 'Área criada com sucesso!' })
      }

      // Limpar formulário de área
      setAreaNome('')
      setAreaResp('')
      setAreaDesc('')
      setAreaAtiva(true)
      setAreaEmEdicaoId(null)

      // Recarregar
      const listaAreas = await empresasService.listarAreas()
      setAreas(listaAreas)
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar área',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setSalvandoArea(false)
    }
  }

  const handleEditarArea = (a: Area) => {
    setAreaEmEdicaoId(a.id)
    setAreaNome(a.nome)
    setAreaResp(a.responsavel_nome || '')
    setAreaDesc(a.descricao || '')
    setAreaAtiva(a.ativa)
  }

  const handleExcluirArea = async (a: Area) => {
    if (a.total_vinculos && a.total_vinculos > 0) {
      toast({
        title: 'Área possui colaboradores vinculados',
        description: `Existem ${a.total_vinculos} vínculo(s) associados a "${a.nome}". Transfira-os antes de excluir.`,
        variant: 'destructive',
      })
      return
    }
    if (!confirm(`Deseja realmente excluir a área "${a.nome}"?`)) return

    try {
      const res = await empresasService.excluirArea(a.id)
      if (!res.success) {
        toast({ title: 'Aviso', description: res.motivo, variant: 'destructive' })
        return
      }
      toast({ title: 'Área excluída com sucesso!' })
      const listaAreas = await empresasService.listarAreas()
      setAreas(listaAreas)
    } catch (err: any) {
      toast({ title: 'Erro ao excluir área', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOPO: TÍTULO, SUBTÍTULO E BOTÃO DE NOVA EMPRESA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span className="p-2 rounded-lg bg-orange-100 text-[#E9530E] dark:bg-orange-950/40 dark:text-orange-400">
                <Building2 className="w-5 h-5" />
              </span>
              Gestão Multi-Empresa & Unidades
            </h1>
            <Badge
              variant="secondary"
              className="bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-medium text-xs px-2.5 py-0.5 rounded-full"
            >
              Grupo Econômico
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cadastro de múltiplos CNPJs (Holding e BUs), separação de vínculos CLT/PJ e
            departamentos por unidade.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={abrirModalNovaEmpresa}
            className="bg-[#E9530E] hover:bg-[#d44808] text-white shadow-sm flex items-center gap-2 font-medium"
          >
            <Plus className="w-4 h-4" />
            Nova Empresa / CNPJ
          </Button>
        </div>
      </div>

      {/* Navegação entre Unidades e Gestão de Usuários / Líderes de BU */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setAbaAtiva('empresas')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            abaAtiva === 'empresas'
              ? 'border-[#E9530E] text-[#E9530E]'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          Estrutura de Empresas & BUs ({empresas.length})
        </button>
        <button
          onClick={() => setAbaAtiva('usuarios')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 transition-colors ${
            abaAtiva === 'usuarios'
              ? 'border-[#E9530E] text-[#E9530E]'
              : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          Líderes de BU & Controle de Acesso
        </button>
      </div>

      {abaAtiva === 'usuarios' ? (
        <AbaGestaoUsuarios empresas={empresas} areas={areas} />
      ) : (
        <>
          {/* 2. KPIS NO TOPO (Estilo visual exato do print) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* KPI 1: Empresas Cadastradas */}
            <div className="bg-white dark:bg-[#151B2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>EMPRESAS CADASTRADAS</span>
                <span className="p-1.5 rounded-lg bg-orange-50 text-[#E9530E] dark:bg-orange-950/30">
                  <Building2 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {kpis.totalEmpresas}
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {kpis.totalMatriz} Holding/Matriz • {kpis.totalBUs} BUs
              </div>
            </div>

            {/* KPI 2: Empresas Ativas */}
            <div className="bg-white dark:bg-[#151B2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>EMPRESAS ATIVAS</span>
                <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 text-3xl font-bold text-emerald-600 dark:text-emerald-400">
                {kpis.ativas}
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Operações correntes no grupo
              </div>
            </div>

            {/* KPI 3: Colaboradores & Prestadores Ativos */}
            <div className="bg-white dark:bg-[#151B2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>VÍNCULOS ATIVOS NO GRUPO</span>
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
                  <Users className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {kpis.totalVinculos}
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Total distribuído entre as BUs
              </div>
            </div>

            {/* KPI 4: Áreas e Departamentos */}
            <div className="bg-white dark:bg-[#151B2E] p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <span>ÁREAS & UNIDADES INTERNAS</span>
                <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/30 dark:text-purple-400">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <div className="mt-3 text-3xl font-bold text-slate-900 dark:text-slate-100">
                {kpis.totalAreas}
              </div>
              <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Departamentos mapeados
              </div>
            </div>
          </div>

          {/* 3. BANNER CONSOLIDADO / CONTEXTO ATIVO (Como o banner escuro do print) */}
          <div className="bg-[#11162B] text-white p-5 rounded-xl border border-slate-800 shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold bg-emerald-950/70 border border-emerald-700/50 text-emerald-400 px-2 py-0.5 rounded-full">
                  Holding SouYess • Multi-Empresa
                </span>
                <span className="text-slate-400 text-xs">• Estrutura Corporativa</span>
              </div>
              <h2 className="text-lg font-bold text-slate-100">
                Grupo Econômico SouYess — Visão Consolidada de Pessoas & Custos
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                Alterne o contexto de trabalho a qualquer momento. No modo{' '}
                <strong className="text-white">Consolidado</strong>, os indicadores de Gente &
                Gestão somam todas as operações. Ao selecionar uma empresa específica, os vínculos e
                áreas são filtrados.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="bg-[#1A223B] border border-slate-700 rounded-lg p-2.5 flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">
                    Comprometimento Mensal Grupo
                  </span>
                  <span className="text-base font-bold text-white">
                    R${' '}
                    {kpis.totalCustoGrupo.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="h-8 w-px bg-slate-700" />
                <Button
                  variant={filtroContexto === 'todos' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFiltroContexto('todos')}
                  className={
                    filtroContexto === 'todos'
                      ? 'bg-[#E9530E] hover:bg-[#d44808] text-white font-medium text-xs'
                      : 'bg-transparent border-slate-600 text-slate-200 hover:bg-slate-800 text-xs'
                  }
                >
                  <Layers className="w-3.5 h-3.5 mr-1.5" />
                  {filtroContexto === 'todos' ? 'Consolidado Ativo' : 'Ver Consolidado'}
                </Button>
              </div>
            </div>
          </div>

          {/* 4. BARRA DE BUSCA E FILTROS */}
          <div className="bg-white dark:bg-[#151B2E] p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                placeholder="Buscar por razão social, nome fantasia, CNPJ, sigla ou cidade..."
                className="pl-9 bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-slate-700 text-sm"
              />
              {termoBusca && (
                <button
                  onClick={() => setTermoBusca('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Switcher de contexto de exibição */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
              <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline whitespace-nowrap">
                Contexto:
              </span>
              <Select value={filtroContexto} onValueChange={setFiltroContexto}>
                <SelectTrigger className="w-full sm:w-[260px] bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-slate-700 text-xs">
                  <SelectValue placeholder="Selecionar contexto..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Consolidado (Todas as BUs e Holding)</SelectItem>
                  {empresas.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.sigla ? `[${emp.sigla}] ` : ''}
                      {emp.nome_fantasia} ({emp.tipo === 'Holding / Matriz' ? 'Holding' : 'BU'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 5. GRID DE CARDS DAS EMPRESAS (Seguindo o print fielmente) */}
          {loading ? (
            <div className="text-center py-16 text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E9530E] mx-auto mb-3" />
              Carregando empresas e unidades do grupo...
            </div>
          ) : empresasFiltradas.length === 0 ? (
            <div className="bg-white dark:bg-[#151B2E] border border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center">
              <Building2 className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                Nenhuma empresa encontrada
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Não encontramos nenhuma empresa que corresponda aos filtros informados.
              </p>
              <Button
                onClick={() => {
                  setTermoBusca('')
                  setFiltroContexto('todos')
                }}
                variant="outline"
                size="sm"
                className="mt-4"
              >
                Limpar filtros
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {empresasFiltradas.map((emp) => {
                const isFocada = filtroContexto === emp.id
                const isMatriz = emp.tipo === 'Holding / Matriz'

                return (
                  <div
                    key={emp.id}
                    className={`bg-white dark:bg-[#151B2E] rounded-xl border transition-all duration-200 shadow-sm flex flex-col justify-between overflow-hidden ${
                      isFocada
                        ? 'border-[#E9530E] ring-2 ring-orange-500/20 shadow-md'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    {/* Cabeçalho do Card */}
                    <div className="p-5 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          {/* Avatar / Sigla colorida */}
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-xs shadow-inner flex-shrink-0"
                            style={{ backgroundColor: emp.logo_cor || '#0D9488' }}
                          >
                            {emp.sigla || 'EMP'}
                          </div>

                          <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 leading-snug">
                              {emp.nome_fantasia}
                            </h3>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                              CNPJ: {emp.cnpj}
                            </div>
                          </div>
                        </div>

                        {/* Badges de Tipo e Status */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge
                            variant="secondary"
                            className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                              isMatriz
                                ? 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200'
                                : 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            }`}
                          >
                            {isMatriz ? 'MATRIZ / HOLDING' : 'BU / FILIAL'}
                          </Badge>

                          <div className="flex items-center gap-1.5 text-xs">
                            <span
                              className={`w-2 h-2 rounded-full ${
                                emp.status === 'Operando' ? 'bg-emerald-500' : 'bg-slate-400'
                              }`}
                            />
                            <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                              {emp.status}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Informações detalhadas */}
                      <div className="mt-4 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                        <p className="font-semibold text-slate-800 dark:text-slate-200 line-clamp-1">
                          {emp.razao_social}
                        </p>

                        {emp.cnae && (
                          <p className="text-slate-500 dark:text-slate-400 line-clamp-1">
                            CNAE: {emp.cnae}
                          </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 pt-1 text-slate-500 dark:text-slate-400">
                          {(emp.endereco_cidade || emp.endereco_uf) && (
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span>
                                {emp.endereco_cidade}
                                {emp.endereco_uf ? `/${emp.endereco_uf}` : ''}
                              </span>
                            </div>
                          )}

                          {emp.telefone && (
                            <div className="flex items-center gap-1">
                              <Phone className="w-3.5 h-3.5 text-slate-400" />
                              <span>{emp.telefone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Bloco de Métricas de RH e Custos (Rodapé cinza claro estilo print) */}
                    <div className="mx-4 my-2 p-3 rounded-lg bg-slate-50 dark:bg-[#11162B] border border-slate-100 dark:border-slate-800/80">
                      <div className="grid grid-cols-2 gap-3 mb-2">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                            Vínculos Ativos
                          </span>
                          <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {emp.total_vinculos || 0}
                          </span>
                          <span className="text-[10px] text-slate-500 block">
                            {emp.total_clt || 0} CLT • {emp.total_pj || 0} PJ
                          </span>
                        </div>

                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">
                            Áreas Internas
                          </span>
                          <div className="flex items-center justify-between">
                            <span className="text-lg font-bold text-slate-900 dark:text-slate-100">
                              {emp.total_areas || 0}
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => abrirGestaoAreas(emp)}
                              className="h-6 text-[11px] px-1.5 text-[#E9530E] hover:text-[#d44808] hover:bg-orange-50 dark:hover:bg-orange-950/20"
                            >
                              Gerenciar Áreas
                            </Button>
                          </div>
                          <span className="text-[10px] text-slate-500 block">departamentos</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
                        <span className="text-slate-500 text-[11px]">Comprometimento Mensal:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                          R${' '}
                          {(emp.custo_mensal || 0).toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Rodapé de Ações: Selecionar (foca), Editar, Excluir */}
                    <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <Button
                        variant={isFocada ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          if (isFocada) {
                            setFiltroContexto('todos')
                          } else {
                            setFiltroContexto(emp.id)
                          }
                        }}
                        className={`h-8 text-xs font-medium flex items-center gap-1.5 ${
                          isFocada
                            ? 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {isFocada ? 'Selecionada' : 'Selecionar'}
                      </Button>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => abrirModalEditarEmpresa(emp)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          title="Editar dados da empresa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEmpresaParaExcluir(emp)
                            setModalExcluirAberta(true)
                          }}
                          className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Excluir empresa"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* 6. MODAL CRIAR / EDITAR EMPRESA */}
      <Dialog open={modalEmpresaAberta} onOpenChange={setModalEmpresaAberta}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Building2 className="w-5 h-5 text-[#E9530E]" />
              {empresaEmEdicao ? 'Editar Empresa / CNPJ' : 'Nova Empresa / CNPJ do Grupo'}
            </DialogTitle>
            <DialogDescription>
              Cadastre as informações da Holding ou BU do Grupo Econômico SouYess.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSalvarEmpresa} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nome Fantasia <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formNomeFantasia}
                  onChange={(e) => setFormNomeFantasia(e.target.value)}
                  placeholder="Ex: SouYess Tecnologia"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Razão Social <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formRazaoSocial}
                  onChange={(e) => setFormRazaoSocial(e.target.value)}
                  placeholder="Ex: SouYess Tecnologia e Gestão de Software S.A."
                  className="mt-1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  CNPJ <span className="text-red-500">*</span>
                </label>
                <Input
                  value={formCnpj}
                  onChange={(e) => {
                    setFormCnpj(formatarCNPJ(e.target.value))
                    setCnpjErro('')
                  }}
                  placeholder="00.000.000/0000-00"
                  className={`mt-1 font-mono ${cnpjErro ? 'border-red-500' : ''}`}
                  required
                />
                {cnpjErro && <p className="text-[11px] text-red-500 mt-1">{cnpjErro}</p>}
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tipo Societário
                </label>
                <Select value={formTipo} onValueChange={(val) => setFormTipo(val as TipoEmpresa)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Holding / Matriz">Holding / Matriz</SelectItem>
                    <SelectItem value="BU / Filial">BU / Filial</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Status Operacional
                </label>
                <Select
                  value={formStatus}
                  onValueChange={(val) => setFormStatus(val as StatusEmpresa)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operando">Operando</SelectItem>
                    <SelectItem value="Inativa">Inativa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Sigla do Card
                </label>
                <Input
                  value={formSigla}
                  onChange={(e) => setFormSigla(e.target.value.toUpperCase())}
                  placeholder="EMP-01"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Cor de Identificação
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="color"
                    value={formCor}
                    onChange={(e) => setFormCor(e.target.value)}
                    className="w-9 h-9 rounded border border-slate-300 cursor-pointer"
                  />
                  <Input
                    value={formCor}
                    onChange={(e) => setFormCor(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Holding Controladora
                </label>
                <Select value={formEmpresaPai} onValueChange={setFormEmpresaPai}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione a Holding..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma (Empresa Mãe)</SelectItem>
                    {empresas
                      .filter((e) => !empresaEmEdicao || e.id !== empresaEmEdicao.id)
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.nome_fantasia}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  CNAE Principal
                </label>
                <Input
                  value={formCnae}
                  onChange={(e) => setFormCnae(e.target.value)}
                  placeholder="Ex: 6202-3/00: Desenvolvimento e licenciamento de software"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Telefone
                </label>
                <Input
                  value={formTelefone}
                  onChange={(e) => setFormTelefone(e.target.value)}
                  placeholder="(11) 3214-5500"
                  className="mt-1"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Cidade
                </label>
                <Input
                  value={formCidade}
                  onChange={(e) => setFormCidade(e.target.value)}
                  placeholder="Ex: São Paulo"
                  className="mt-1"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Estado (UF)
                </label>
                <Input
                  value={formUf}
                  onChange={(e) => setFormUf(e.target.value.toUpperCase())}
                  placeholder="SP"
                  maxLength={2}
                  className="mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Observações Corporativas
              </label>
              <Textarea
                value={formObservacoes}
                onChange={(e) => setFormObservacoes(e.target.value)}
                placeholder="Escopo de atuação da BU, política de contratação, centro de custo geral..."
                rows={2}
                className="mt-1"
              />
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" onClick={() => setModalEmpresaAberta(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvandoEmpresa}
                className="bg-[#E9530E] hover:bg-[#d44808] text-white"
              >
                {salvandoEmpresa
                  ? 'Salvando...'
                  : empresaEmEdicao
                    ? 'Atualizar Empresa'
                    : 'Cadastrar Empresa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* 7. MODAL GESTÃO DE ÁREAS DA EMPRESA */}
      <Dialog open={modalAreasAberta} onOpenChange={setModalAreasAberta}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <FolderTree className="w-5 h-5 text-[#E9530E]" />
              Áreas & Departamentos — {empresaSelecionadaParaAreas?.nome_fantasia}
            </DialogTitle>
            <DialogDescription>
              Cadastre as áreas para onde os colaboradores CLT e prestadores PJ poderão ser
              contratados.
            </DialogDescription>
          </DialogHeader>

          {/* Formulário de Adicionar / Editar Área */}
          <form
            onSubmit={handleSalvarArea}
            className="p-4 rounded-xl bg-slate-50 dark:bg-[#11162B] border border-slate-200 dark:border-slate-800 space-y-3"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              {areaEmEdicaoId ? 'Editar Área' : 'Nova Área / Departamento'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nome da Área <span className="text-red-500">*</span>
                </label>
                <Input
                  value={areaNome}
                  onChange={(e) => setAreaNome(e.target.value)}
                  placeholder="Ex: Engenharia de Software & Cloud"
                  className="mt-1 text-sm"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Responsável / BP / Gestor
                </label>
                <Input
                  value={areaResp}
                  onChange={(e) => setAreaResp(e.target.value)}
                  placeholder="Ex: Carlos Mendonça"
                  className="mt-1 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Descrição do Escopo
              </label>
              <Input
                value={areaDesc}
                onChange={(e) => setAreaDesc(e.target.value)}
                placeholder="Ex: Arquitetura, DevOps, desenvolvimento web e microsserviços"
                className="mt-1 text-sm"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={areaAtiva}
                  onChange={(e) => setAreaAtiva(e.target.checked)}
                  className="rounded border-slate-300 text-[#E9530E] focus:ring-[#E9530E]"
                />
                Área ativa para novas contratações
              </label>

              <div className="flex items-center gap-2">
                {areaEmEdicaoId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAreaEmEdicaoId(null)
                      setAreaNome('')
                      setAreaResp('')
                      setAreaDesc('')
                      setAreaAtiva(true)
                    }}
                    className="text-xs"
                  >
                    Cancelar Edição
                  </Button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={salvandoArea}
                  className="bg-[#E9530E] hover:bg-[#d44808] text-white text-xs font-medium"
                >
                  {salvandoArea
                    ? 'Salvando...'
                    : areaEmEdicaoId
                      ? 'Salvar Alterações'
                      : 'Adicionar Área'}
                </Button>
              </div>
            </div>
          </form>

          {/* Lista de áreas cadastradas */}
          <div className="mt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-2">
              Áreas Cadastradas ({areasDaEmpresaSelecionada.length})
            </h4>

            {areasDaEmpresaSelecionada.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500 border border-dashed rounded-lg">
                Nenhuma área cadastrada para esta empresa. Adicione a primeira acima.
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {areasDaEmpresaSelecionada.map((a) => (
                  <div
                    key={a.id}
                    className="p-3 rounded-lg bg-white dark:bg-[#151B2E] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {a.nome}
                        </span>
                        {!a.ativa && (
                          <Badge
                            variant="secondary"
                            className="text-[10px] bg-slate-100 text-slate-600"
                          >
                            Inativa
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className="text-[10px] text-blue-600 dark:text-blue-400 border-blue-200"
                        >
                          {a.total_vinculos || 0} vínculo(s)
                        </Badge>
                      </div>

                      {a.responsavel_nome && (
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          Resp:{' '}
                          <strong className="text-slate-700 dark:text-slate-300">
                            {a.responsavel_nome}
                          </strong>
                        </p>
                      )}

                      {a.descricao && (
                        <p className="text-slate-400 text-[11px] line-clamp-1 mt-0.5">
                          {a.descricao}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditarArea(a)}
                        className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800"
                        title="Editar área"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExcluirArea(a)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                        title="Excluir área"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-3">
            <Button variant="outline" onClick={() => setModalAreasAberta(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 8. MODAL CONFIRMAÇÃO DE EXCLUSÃO DE EMPRESA */}
      <Dialog open={modalExcluirAberta} onOpenChange={setModalExcluirAberta}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Excluir Empresa / CNPJ
            </DialogTitle>
            <DialogDescription>
              Tem certeza de que deseja excluir a empresa{' '}
              <strong>{empresaParaExcluir?.nome_fantasia}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 text-xs text-slate-600 dark:text-slate-300 space-y-2">
            <p>Esta ação removerá permanentemente o registro societário do sistema.</p>
            <p className="text-amber-600 dark:text-amber-400 font-medium">
              Nota: A exclusão só é permitida se a empresa não tiver colaboradores ou áreas
              associadas.
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setModalExcluirAberta(false)}
              disabled={excluindoLoading}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleExcluirEmpresa}
              disabled={excluindoLoading}
            >
              {excluindoLoading ? 'Excluindo...' : 'Confirmar Exclusão'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
