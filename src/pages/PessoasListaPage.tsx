import React, { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Users,
  Search,
  Plus,
  ArrowUpDown,
  Filter,
  FileCheck2,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  Building2,
  Briefcase,
  ChevronRight,
  UserCheck,
  Compass,
  FileText,
  BadgeAlert,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/contexts/AuthContext'
import {
  pessoasService,
  type PessoaUnificada,
  type ModalidadePessoa,
  type SituacaoContratoPessoa,
  type NovaPessoaInput,
} from '@/services/pessoasService'
import { empresasService, type Empresa, type Area } from '@/services/empresasService'
import pb from '@/lib/pocketbase/client'

export default function PessoasListaPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [pessoas, setPessoas] = useState<PessoaUnificada[]>([])
  const [loading, setLoading] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroModalidade, setFiltroModalidade] = useState<string>('todas')
  const [filtroSituacao, setFiltroSituacao] = useState<string>('todas')
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('todas')
  const [filtroArea, setFiltroArea] = useState<string>('todas')

  // Lista de empresas e áreas cadastradas no sistema
  const [empresasCadastradas, setEmpresasCadastradas] = useState<Empresa[]>([])
  const [areasCadastradas, setAreasCadastradas] = useState<Area[]>([])

  // Modais de Criação & Importação
  const [modalNovoAberto, setModalNovoAberto] = useState(false)
  const [modalImportarAberto, setModalImportarAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  // Fontes de importação
  const [carregandoFontes, setCarregandoFontes] = useState(false)
  const [fontes, setFontes] = useState<{
    prestadores: any[]
    candidatos: any[]
    rotinas: any[]
  }>({ prestadores: [], candidatos: [], rotinas: [] })

  // Formulário de Nova Pessoa Manual ou Pré-preenchida
  const [form, setForm] = useState<NovaPessoaInput>({
    nome: '',
    tipo_pessoa: 'PF',
    modalidade: 'CLT',
    cpf_cnpj: '',
    email: '',
    telefone: '',
    cargo_funcao: '',
    departamento: '',
    centro_custo: '',
    gestor_nome: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_fim: '',
    data_renovacao: '',
    situacao_contrato: 'Vigente',
    valor_contratado: 0,
    horas_mensais_base: 160,
    valor_hora: 0,
    duracao_meses: 12,
    prazo_tipo: 'Indeterminado',
    percentual_integracao: 0,
    observacoes: '',
    empresa: '',
    area: '',
  })

  const carregarDados = async () => {
    try {
      setLoading(true)
      const [data, emps, ars] = await Promise.all([
        pessoasService.listar(),
        empresasService.listarEmpresas(),
        empresasService.listarAreas(),
      ])
      setPessoas(data)
      setEmpresasCadastradas(emps)
      setAreasCadastradas(ars)
    } catch (err) {
      console.error('Erro ao carregar pessoas:', err)
      toast({
        title: 'Erro ao carregar cadastro unificado',
        description: 'Não foi possível carregar a listagem de pessoas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [])

  const abrirImportador = async () => {
    setModalImportarAberto(true)
    setCarregandoFontes(true)
    try {
      const data = await pessoasService.listarFontesImportacaoDisponiveis()
      setFontes(data)
    } catch (err) {
      console.error('Erro ao carregar fontes:', err)
    } finally {
      setCarregandoFontes(false)
    }
  }

  const selecionarFonteParaImportar = (
    tipoFonte: 'prestador' | 'candidato' | 'rotina',
    item: any,
  ) => {
    if (tipoFonte === 'prestador') {
      const horasBase = 160
      const valorMensal = item.valor_mensal || 0
      const vHora = horasBase > 0 ? Number((valorMensal / horasBase).toFixed(2)) : 0
      setForm({
        nome: item.contato_nome || item.nome,
        tipo_pessoa: 'PJ',
        modalidade: 'PJ',
        cpf_cnpj: item.cnpj || '',
        email: item.email || '',
        telefone: item.telefone || '',
        cargo_funcao: item.area_atuacao || 'Prestador Especialista',
        departamento: 'Operações & Tecnologia',
        centro_custo: 'CC-PJ-FORNECEDOR',
        gestor_nome: user?.name || 'Gestor Contratante',
        data_inicio: item.data_inicio
          ? item.data_inicio.split('T')[0]
          : new Date().toISOString().split('T')[0],
        data_fim: '',
        data_renovacao: '',
        situacao_contrato: 'Vigente',
        valor_contratado: valorMensal,
        horas_mensais_base: horasBase,
        valor_hora: vHora,
        duracao_meses: 12,
        prazo_tipo: 'Determinado',
        percentual_integracao: 100,
        observacoes: `Cadastro importado do prestador PJ "${item.razao_social || item.nome}".`,
        prestador_origem: item.id,
        origem_importacao: `prestador_pj:${item.id}`,
      })
    } else if (tipoFonte === 'candidato') {
      setForm({
        nome: item.nome,
        tipo_pessoa: 'PF',
        modalidade: 'CLT',
        cpf_cnpj: '',
        email: item.email || '',
        telefone: item.telefone || '',
        cargo_funcao: item.cargo || 'Colaborador CLT',
        departamento: 'Gente & Gestão',
        centro_custo: 'CC-ADM-01',
        gestor_nome: user?.name || 'Douglas Severo',
        data_inicio: item.data_contratacao
          ? item.data_contratacao.split('T')[0]
          : new Date().toISOString().split('T')[0],
        data_fim: '',
        data_renovacao: '',
        situacao_contrato: 'Em integração',
        valor_contratado: 8500,
        horas_mensais_base: 160,
        valor_hora: Number((8500 / 160).toFixed(2)),
        duracao_meses: 0,
        prazo_tipo: 'Indeterminado',
        percentual_integracao: 35,
        observacoes: `Cadastro importado do candidato aprovado "${item.nome}".`,
        candidato_origem: item.id,
        origem_importacao: `candidatos:${item.id}`,
      })
    } else if (tipoFonte === 'rotina') {
      const horasBase = (item.horas_semanais ? item.horas_semanais * 4 : 160) || 160
      const vHora =
        horasBase > 0 ? Number(((item.valor_contratado || 0) / horasBase).toFixed(2)) : 0
      setForm({
        nome: item.nome,
        tipo_pessoa: item.tipo === 'PJ' ? 'PJ' : 'PF',
        modalidade: item.tipo === 'PJ' ? 'PJ' : 'CLT',
        cpf_cnpj: item.documento || '',
        email: item.email || '',
        telefone: item.telefone || '',
        cargo_funcao: item.cargo || 'Especialista',
        departamento: item.departamento || 'Tecnologia',
        centro_custo: item.tipo === 'PJ' ? 'CC-PJ-OP' : 'CC-CLT-OP',
        gestor_nome: item.gestor_nome || user?.name || 'Gestor Responsável',
        gestor_responsavel: item.gestor_responsavel || '',
        data_inicio: item.data_inicio
          ? item.data_inicio.split('T')[0]
          : new Date().toISOString().split('T')[0],
        data_fim: '',
        data_renovacao: '',
        situacao_contrato: item.percentual >= 100 ? 'Vigente' : 'Em integração',
        valor_contratado: item.valor_contratado || 0,
        horas_mensais_base: horasBase,
        valor_hora: vHora,
        duracao_meses: 12,
        prazo_tipo: item.tipo === 'PJ' ? 'Determinado' : 'Indeterminado',
        percentual_integracao: item.percentual || 0,
        observacoes: `Cadastro unificado a partir da Rotina de Integração de ${item.nome}.`,
        rotina_origem: item.id,
        origem_importacao: `rotinas_integracao:${item.id}`,
      })
    }

    setModalImportarAberto(false)
    setModalNovoAberto(true)
    toast({
      title: 'Dados pré-preenchidos',
      description: 'Revise e confirme os dados para consolidar a ficha única da pessoa.',
    })
  }

  const handleSalvarPessoa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.nome || !form.cargo_funcao) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome completo e Cargo/Função são necessários.',
        variant: 'destructive',
      })
      return
    }

    setSalvando(true)
    try {
      const horas = Number(form.horas_mensais_base || 160)
      const vTotal = Number(form.valor_contratado || 0)
      const vHoraCalc = horas > 0 ? Number((vTotal / horas).toFixed(2)) : 0

      const payload: NovaPessoaInput = {
        ...form,
        valor_contratado: vTotal,
        horas_mensais_base: horas,
        valor_hora: vHoraCalc,
        percentual_integracao: Number(form.percentual_integracao || 0),
      }

      const criada = await pessoasService.criar(payload)
      toast({
        title: 'Pessoa cadastrada com sucesso!',
        description: 'Ficha única criada no sistema.',
      })
      setModalNovoAberto(false)
      await carregarDados()
      navigate(`/pessoas/${criada.id}`)
    } catch (err: any) {
      console.error('Erro ao cadastrar pessoa:', err)
      toast({
        title: 'Falha ao cadastrar',
        description: err?.message || 'Verifique os dados informados.',
        variant: 'destructive',
      })
    } finally {
      setSalvando(false)
    }
  }

  // Filtragem e busca
  const pessoasFiltradas = useMemo(() => {
    return pessoas.filter((p) => {
      const matchBusca =
        !busca.trim() ||
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.cargo_funcao.toLowerCase().includes(busca.toLowerCase()) ||
        (p.departamento && p.departamento.toLowerCase().includes(busca.toLowerCase())) ||
        (p.cpf_cnpj && p.cpf_cnpj.toLowerCase().includes(busca.toLowerCase())) ||
        (p.email && p.email.toLowerCase().includes(busca.toLowerCase()))

      const matchModalidade = filtroModalidade === 'todas' || p.modalidade === filtroModalidade

      const matchSituacao = filtroSituacao === 'todas' || p.situacao_contrato === filtroSituacao

      const matchEmpresa = filtroEmpresa === 'todas' || p.empresa === filtroEmpresa

      const matchArea = filtroArea === 'todas' || p.area === filtroArea

      return matchBusca && matchModalidade && matchSituacao && matchEmpresa && matchArea
    })
  }, [pessoas, busca, filtroModalidade, filtroSituacao, filtroEmpresa, filtroArea])

  // Áreas filtradas pela empresa selecionada no form
  const areasFiltradasForm = useMemo(() => {
    if (!form.empresa) return []
    return areasCadastradas.filter((a) => a.empresa === form.empresa)
  }, [areasCadastradas, form.empresa])

  // Métricas de cabeçalho
  const metricas = useMemo(() => {
    const total = pessoas.length
    const clt = pessoas.filter((p) => p.modalidade === 'CLT').length
    const pj = pessoas.filter((p) => p.modalidade === 'PJ').length
    const emIntegracao = pessoas.filter((p) => p.situacao_contrato === 'Em integração').length
    const valorMensalTotal = pessoas
      .filter((p) => p.situacao_contrato !== 'Encerrado')
      .reduce((acc, p) => acc + (p.valor_contratado || 0), 0)
    const docsVencidosOuVencendo = pessoas.reduce(
      (acc, p) => acc + (p.documentosVencidosCount || 0) + (p.documentosVencendoCount || 0),
      0,
    )

    return { total, clt, pj, emIntegracao, valorMensalTotal, docsVencidosOuVencendo }
  }, [pessoas])

  return (
    <div className="space-y-6">
      {/* Top Header SouYess */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-[#212B55] dark:text-[#F7F8FB] font-display">
              Cadastro Unificado de Pessoas
            </h1>
            <Badge className="bg-[#E9530E]/15 text-[#E9530E] border-[#E9530E]/30 font-display">
              Ficha Única Vitalícia
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-sans">
            Consolidação de colaboradores CLT e prestadores PJ: dados cadastrais, histórico
            unificado e cofre de documentos com upload real.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            onClick={abrirImportador}
            className="border-[#2E3A6E]/30 hover:border-[#E9530E] hover:bg-[#FEF1EA] dark:hover:bg-[#212B55] text-xs font-semibold gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E9530E]" />
            Aproveitar Fontes (PJ / Candidatos / Integração)
          </Button>

          <Button
            onClick={() => {
              setForm({
                nome: '',
                tipo_pessoa: 'PF',
                modalidade: 'CLT',
                cpf_cnpj: '',
                email: '',
                telefone: '',
                cargo_funcao: '',
                departamento: '',
                centro_custo: '',
                gestor_nome: user?.name || '',
                data_inicio: new Date().toISOString().split('T')[0],
                data_fim: '',
                data_renovacao: '',
                situacao_contrato: 'Vigente',
                valor_contratado: 0,
                horas_mensais_base: 160,
                valor_hora: 0,
                duracao_meses: 12,
                prazo_tipo: 'Indeterminado',
                percentual_integracao: 0,
                observacoes: '',
                empresa: empresasCadastradas[0]?.id || '',
                area: '',
              })
              setModalNovoAberto(true)
            }}
            className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-bold gap-1.5 shadow-[0_2px_8px_rgba(233,83,14,0.35)]"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova Pessoa
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider font-sans">
              Total Unificado
            </span>
            <div className="text-2xl font-black text-[#212B55] dark:text-[#F7F8FB] font-mono mt-0.5">
              {metricas.total}
            </div>
            <span className="text-[10px] text-muted-foreground font-sans">
              CLT + PJ consolidados
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider font-sans">
              CLT
            </span>
            <div className="text-2xl font-black text-blue-700 dark:text-blue-300 font-mono mt-0.5">
              {metricas.clt}
            </div>
            <span className="text-[10px] text-muted-foreground font-sans">
              Contratos formais CLT
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider font-sans">
              Prestadores PJ
            </span>
            <div className="text-2xl font-black text-purple-700 dark:text-purple-300 font-mono mt-0.5">
              {metricas.pj}
            </div>
            <span className="text-[10px] text-muted-foreground font-sans">PJs sob gestão</span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-sans">
              Em Integração
            </span>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-300 font-mono mt-0.5">
              {metricas.emIntegracao}
            </div>
            <span className="text-[10px] text-muted-foreground font-sans">
              Plano 30-60-90 ativo
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-sans">
              Folha + Mensalidade
            </span>
            <div className="text-base sm:text-lg font-black text-emerald-700 dark:text-emerald-300 font-mono mt-1 truncate">
              R$ {metricas.valorMensalTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </div>
            <span className="text-[10px] text-muted-foreground font-sans">
              Total mensal sob gestão
            </span>
          </CardContent>
        </Card>

        <Card className="bg-card border-border/80 shadow-xs">
          <CardContent className="p-3.5">
            <span className="text-[11px] font-semibold text-[#E9530E] uppercase tracking-wider font-sans flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" />
              Alertas Cofre
            </span>
            <div className="text-2xl font-black text-[#E9530E] font-mono mt-0.5">
              {metricas.docsVencidosOuVencendo}
            </div>
            <span className="text-[10px] text-muted-foreground font-sans">
              Vencendo ou vencidos
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <Card className="bg-card border-border/70 shadow-xs">
        <CardContent className="p-3 sm:p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, cargo, departamento, CPF/CNPJ ou e-mail..."
              className="pl-9 h-9 text-xs sm:text-sm bg-background border-border"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 min-w-[130px]">
              <span className="text-[11px] text-muted-foreground font-medium font-sans">
                Modalidade:
              </span>
              <Select value={filtroModalidade} onValueChange={setFiltroModalidade}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="CLT">CLT</SelectItem>
                  <SelectItem value="PJ">PJ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 min-w-[150px]">
              <span className="text-[11px] text-muted-foreground font-medium font-sans">
                Situação:
              </span>
              <Select value={filtroSituacao} onValueChange={setFiltroSituacao}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="Vigente">Vigente</SelectItem>
                  <SelectItem value="Em integração">Em integração</SelectItem>
                  <SelectItem value="Encerrado">Encerrado</SelectItem>
                  <SelectItem value="Pausado">Pausado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 min-w-[170px]">
              <span className="text-[11px] text-muted-foreground font-medium font-sans">
                Empresa:
              </span>
              <Select
                value={filtroEmpresa}
                onValueChange={(val) => {
                  setFiltroEmpresa(val)
                  setFiltroArea('todas')
                }}
              >
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Empresas</SelectItem>
                  {empresasCadastradas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nome_fantasia}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1.5 min-w-[150px]">
              <span className="text-[11px] text-muted-foreground font-medium font-sans">Área:</span>
              <Select value={filtroArea} onValueChange={setFiltroArea}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Áreas</SelectItem>
                  {areasCadastradas
                    .filter((a) => filtroEmpresa === 'todas' || a.empresa === filtroEmpresa)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Pessoas */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground text-sm flex flex-col items-center justify-center gap-2">
          <Clock className="w-6 h-6 animate-spin text-[#E9530E]" />
          Carregando pessoas unificadas...
        </div>
      ) : pessoasFiltradas.length === 0 ? (
        <Card className="border-dashed border-2 border-border/80 bg-muted/20">
          <CardContent className="p-12 text-center flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#FEF1EA] dark:bg-[#212B55] flex items-center justify-center text-[#E9530E]">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#212B55] dark:text-[#F7F8FB] font-display">
              Nenhuma pessoa encontrada
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {busca || filtroModalidade !== 'todas' || filtroSituacao !== 'todas'
                ? 'Nenhum resultado corresponde aos filtros aplicados. Tente limpar os termos.'
                : 'Você ainda não possui pessoas cadastradas ou importadas. Importe prestadores PJ ou candidatos aprovados para começar.'}
            </p>
            <div className="flex items-center gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={abrirImportador} className="text-xs">
                <Sparkles className="w-3.5 h-3.5 mr-1 text-[#E9530E]" />
                Importar de Fontes
              </Button>
              <Button
                size="sm"
                onClick={() => setModalNovoAberto(true)}
                className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Criar Manualmente
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pessoasFiltradas.map((p) => {
            const isPj = p.modalidade === 'PJ'
            const diasRenovacao = p.diasAteRenovacao
            const temAlertaDocs =
              (p.documentosVencidosCount || 0) > 0 || (p.documentosVencendoCount || 0) > 0

            return (
              <Card
                key={p.id}
                className="bg-card hover:border-[#E9530E]/50 transition-all duration-150 shadow-xs hover:shadow-md flex flex-col justify-between group"
              >
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 font-display ${
                          isPj
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                        }`}
                      >
                        {isPj ? 'PJ' : 'CLT'}
                      </div>
                      <div className="min-w-0">
                        <Link
                          to={`/pessoas/${p.id}`}
                          className="font-bold text-sm sm:text-base text-[#212B55] dark:text-[#F7F8FB] hover:text-[#E9530E] dark:hover:text-[#F19763] transition-colors truncate block font-display"
                        >
                          {p.nome}
                        </Link>
                        <p className="text-xs text-muted-foreground truncate">{p.cargo_funcao}</p>
                        {(p.empresa_nome || p.area_nome) && (
                          <div className="flex items-center gap-1 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 font-sans">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                              {p.empresa_nome || 'Empresa'}
                            </span>
                            {p.area_nome && (
                              <>
                                <span>•</span>
                                <span>{p.area_nome}</span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] shrink-0 font-sans ${
                        p.situacao_contrato === 'Vigente'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300'
                          : p.situacao_contrato === 'Em integração'
                            ? 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {p.situacao_contrato}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="p-4 pt-2 space-y-3 font-sans text-xs">
                  {/* Grid de detalhes */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50 text-muted-foreground">
                    <div>
                      <span className="text-[10px] block uppercase font-medium">Gestor</span>
                      <span className="font-semibold text-foreground truncate block">
                        {p.gestor_nome || 'Não atribuído'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] block uppercase font-medium">
                        Valor Contratado
                      </span>
                      <span className="font-mono font-bold text-foreground block">
                        R${' '}
                        {p.valor_contratado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        <span className="text-[10px] font-normal text-muted-foreground">/mês</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] block uppercase font-medium">Início</span>
                      <span className="font-mono text-foreground block">
                        {p.data_inicio ? new Date(p.data_inicio).toLocaleDateString('pt-BR') : '—'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] block uppercase font-medium">Renovação/Fim</span>
                      <span className="font-mono text-foreground block">
                        {diasRenovacao !== undefined ? (
                          <span
                            className={
                              diasRenovacao < 0
                                ? 'text-red-600 font-bold'
                                : diasRenovacao <= 30
                                  ? 'text-amber-600 font-bold'
                                  : 'text-foreground'
                            }
                          >
                            {diasRenovacao < 0
                              ? `Venceu há ${Math.abs(diasRenovacao)}d`
                              : `${diasRenovacao} dias`}
                          </span>
                        ) : (
                          'Indeterminado'
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Barra de Integração se houver */}
                  {(p.situacao_contrato === 'Em integração' ||
                    (p.percentual_integracao || 0) > 0) && (
                    <div className="space-y-1 pt-1 border-t border-border/40">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground font-medium flex items-center gap-1">
                          <Compass className="w-3 h-3 text-[#E9530E]" />
                          Integração 30-60-90
                        </span>
                        <span className="font-mono font-bold text-[#212B55] dark:text-[#F7F8FB]">
                          {p.percentual_integracao || 0}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-[#E9530E] h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, p.percentual_integracao || 0)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Alerta de Documentos */}
                  {temAlertaDocs && (
                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 flex items-center justify-between text-[11px] text-amber-800 dark:text-amber-300">
                      <span className="flex items-center gap-1.5 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600" />
                        {(p.documentosVencidosCount || 0) > 0
                          ? `${p.documentosVencidosCount} doc(s) vencido(s)`
                          : `${p.documentosVencendoCount} doc(s) vencendo`}
                      </span>
                      <span className="text-[10px] font-semibold underline">Ver cofre</span>
                    </div>
                  )}

                  {/* Footer Card */}
                  <div className="pt-2 flex items-center justify-between border-t border-border/50">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                      <FileText className="w-3 h-3" />
                      {p.documentosCount || 0} doc(s) no cofre
                    </span>

                    <Button
                      asChild
                      variant="ghost"
                      size="sm"
                      className="text-xs text-[#E9530E] hover:text-[#C5430A] hover:bg-[#FEF1EA] dark:hover:bg-[#212B55] h-7 px-2 font-bold gap-1"
                    >
                      <Link to={`/pessoas/${p.id}`}>
                        Abrir Ficha
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* MODAL 1: APROVEITAR FONTES (IMPORTAÇÃO RÁPIDA) */}
      <Dialog open={modalImportarAberto} onOpenChange={setModalImportarAberto}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-lg text-[#212B55] dark:text-[#F7F8FB]">
              <Sparkles className="w-5 h-5 text-[#E9530E]" />
              Aproveitar Fontes Existentes (Sem Duplicar Cadastro)
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Selecione um prestador PJ, candidato aprovado ou rotina de integração já registrada
              para pré-preencher a ficha única com 1 clique.
            </DialogDescription>
          </DialogHeader>

          {carregandoFontes ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Clock className="w-5 h-5 animate-spin text-[#E9530E]" />
              Mapeando fontes do sistema...
            </div>
          ) : (
            <div className="space-y-4 py-2 text-xs">
              {/* Prestadores PJ */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-[#212B55] dark:text-[#F7F8FB] uppercase tracking-wider text-[11px]">
                    1. Prestadores PJ Registrados
                  </h4>
                  <Badge variant="outline" className="text-[10px]">
                    {fontes.prestadores.length} encontrados
                  </Badge>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {fontes.prestadores.map((pj) => (
                    <div
                      key={pj.id}
                      className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between gap-2 hover:border-[#E9530E]/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-foreground truncate">{pj.nome}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {pj.cnpj} · {pj.area_atuacao} · R${' '}
                          {pj.valor_mensal.toLocaleString('pt-BR')}/mês
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={pj.jaCadastrado}
                        onClick={() => selecionarFonteParaImportar('prestador', pj)}
                        className={`text-xs h-7 px-2.5 ${
                          pj.jaCadastrado
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-[#E9530E] hover:bg-[#C5430A] text-white'
                        }`}
                      >
                        {pj.jaCadastrado ? 'Já Unificado' : 'Importar PJ'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Candidatos Aprovados */}
              <div className="pt-2 border-t border-border/60">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-[#212B55] dark:text-[#F7F8FB] uppercase tracking-wider text-[11px]">
                    2. Candidatos Aprovados / Proposta
                  </h4>
                  <Badge variant="outline" className="text-[10px]">
                    {fontes.candidatos.length} disponíveis
                  </Badge>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {fontes.candidatos.map((cand) => (
                    <div
                      key={cand.id}
                      className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between gap-2 hover:border-[#E9530E]/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-foreground truncate">{cand.nome}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {cand.cargo} · {cand.email} · Status: {cand.status}
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={cand.jaCadastrado}
                        onClick={() => selecionarFonteParaImportar('candidato', cand)}
                        className={`text-xs h-7 px-2.5 ${
                          cand.jaCadastrado
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-[#E9530E] hover:bg-[#C5430A] text-white'
                        }`}
                      >
                        {cand.jaCadastrado ? 'Já Unificado' : 'Importar Candidato'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rotinas de Integração */}
              <div className="pt-2 border-t border-border/60">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-[#212B55] dark:text-[#F7F8FB] uppercase tracking-wider text-[11px]">
                    3. Rotinas de Integração 30-60-90
                  </h4>
                  <Badge variant="outline" className="text-[10px]">
                    {fontes.rotinas.length} disponíveis
                  </Badge>
                </div>

                <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                  {fontes.rotinas.map((rot) => (
                    <div
                      key={rot.id}
                      className="p-2.5 rounded-lg border border-border bg-card flex items-center justify-between gap-2 hover:border-[#E9530E]/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-foreground truncate">
                          {rot.nome} ({rot.tipo})
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {rot.cargo} · {rot.departamento} · {rot.percentual}% concluído
                        </div>
                      </div>

                      <Button
                        size="sm"
                        disabled={rot.jaCadastrado}
                        onClick={() => selecionarFonteParaImportar('rotina', rot)}
                        className={`text-xs h-7 px-2.5 ${
                          rot.jaCadastrado
                            ? 'bg-muted text-muted-foreground'
                            : 'bg-[#E9530E] hover:bg-[#C5430A] text-white'
                        }`}
                      >
                        {rot.jaCadastrado ? 'Já Unificado' : 'Importar Rotina'}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setModalImportarAberto(false)}
              className="text-xs"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: CADASTRO / EDIÇÃO MANUAL OU PRÉ-PREENCHIDA */}
      <Dialog open={modalNovoAberto} onOpenChange={setModalNovoAberto}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSalvarPessoa}>
            <DialogHeader>
              <DialogTitle className="font-display text-lg text-[#212B55] dark:text-[#F7F8FB]">
                {form.nome ? `Ficha Unificada: ${form.nome}` : 'Nova Pessoa no Cadastro Unificado'}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Informe os dados cadastrais, modalidade de contratação e valores de remuneração.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 text-xs">
              <div className="space-y-1">
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Juliana Mendes Castro"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label>Tipo de Pessoa</Label>
                  <Select
                    value={form.tipo_pessoa}
                    onValueChange={(val: any) => setForm({ ...form, tipo_pessoa: val })}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PF">PF (Física)</SelectItem>
                      <SelectItem value="PJ">PJ (Jurídica)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label>Modalidade *</Label>
                  <Select
                    value={form.modalidade}
                    onValueChange={(val: any) => setForm({ ...form, modalidade: val })}
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
              </div>

              <div className="space-y-1">
                <Label htmlFor="cpf_cnpj">CPF ou CNPJ</Label>
                <Input
                  id="cpf_cnpj"
                  value={form.cpf_cnpj || ''}
                  onChange={(e) => setForm({ ...form, cpf_cnpj: e.target.value })}
                  placeholder="000.000.000-00 ou 00.000.000/0001-00"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="email">E-mail de Contato</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email || ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="contato@exemplo.com"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                <Input
                  id="telefone"
                  value={form.telefone || ''}
                  onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  placeholder="(11) 98765-4321"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="cargo_funcao">Cargo / Função *</Label>
                <Input
                  id="cargo_funcao"
                  required
                  value={form.cargo_funcao}
                  onChange={(e) => setForm({ ...form, cargo_funcao: e.target.value })}
                  placeholder="Ex: Business Partner Sênior"
                />
              </div>

              {/* Seleção de Empresa e Área (Requisito Multi-Empresa) */}
              <div className="space-y-1">
                <Label>Empresa do Grupo (Holding ou BU) *</Label>
                <Select
                  value={form.empresa || ''}
                  onValueChange={(val) => {
                    const emp = empresasCadastradas.find((e) => e.id === val)
                    setForm({
                      ...form,
                      empresa: val,
                      area: '',
                    })
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione a empresa contratante..." />
                  </SelectTrigger>
                  <SelectContent>
                    {empresasCadastradas.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.sigla ? `[${e.sigla}] ` : ''}
                        {e.nome_fantasia} ({e.tipo === 'Holding / Matriz' ? 'Holding' : 'BU'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Área / Unidade da Empresa</Label>
                <Select
                  value={form.area || ''}
                  onValueChange={(val) => {
                    const aObj = areasCadastradas.find((a) => a.id === val)
                    setForm({
                      ...form,
                      area: val,
                      departamento: aObj?.nome || form.departamento,
                    })
                  }}
                  disabled={!form.empresa}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue
                      placeholder={
                        form.empresa
                          ? 'Selecione a área vinculada...'
                          : 'Escolha a empresa primeiro'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {areasFiltradasForm.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="departamento">Departamento / Descrição Lotação</Label>
                <Input
                  id="departamento"
                  value={form.departamento || ''}
                  onChange={(e) => setForm({ ...form, departamento: e.target.value })}
                  placeholder="Ex: Gente & Gestão"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="centro_custo">Centro de Custo</Label>
                <Input
                  id="centro_custo"
                  value={form.centro_custo || ''}
                  onChange={(e) => setForm({ ...form, centro_custo: e.target.value })}
                  placeholder="Ex: CC-PEOPLE-01"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="gestor_nome">Gestor Responsável</Label>
                <Input
                  id="gestor_nome"
                  value={form.gestor_nome || ''}
                  onChange={(e) => setForm({ ...form, gestor_nome: e.target.value })}
                  placeholder="Ex: Douglas Severo"
                />
              </div>

              <div className="space-y-1">
                <Label>Situação do Contrato</Label>
                <Select
                  value={form.situacao_contrato}
                  onValueChange={(val: any) => setForm({ ...form, situacao_contrato: val })}
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
                <Label htmlFor="data_inicio">Data de Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={form.data_inicio || ''}
                  onChange={(e) => setForm({ ...form, data_inicio: e.target.value })}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="data_renovacao">Data de Renovação / Fim</Label>
                <Input
                  id="data_renovacao"
                  type="date"
                  value={form.data_renovacao || ''}
                  onChange={(e) => setForm({ ...form, data_renovacao: e.target.value })}
                />
              </div>

              {/* Financeiro */}
              <div className="space-y-1">
                <Label htmlFor="valor_contratado">Valor Contratado Mensal (R$)</Label>
                <Input
                  id="valor_contratado"
                  type="number"
                  step="0.01"
                  value={form.valor_contratado || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0
                    const h = form.horas_mensais_base || 160
                    const vh = h > 0 ? Number((val / h).toFixed(2)) : 0
                    setForm({ ...form, valor_contratado: val, valor_hora: vh })
                  }}
                  placeholder="9500.00"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="horas_mensais_base">Base Horas/Mês</Label>
                  <Input
                    id="horas_mensais_base"
                    type="number"
                    value={form.horas_mensais_base || 160}
                    onChange={(e) => {
                      const h = parseFloat(e.target.value) || 160
                      const val = form.valor_contratado || 0
                      const vh = h > 0 ? Number((val / h).toFixed(2)) : 0
                      setForm({ ...form, horas_mensais_base: h, valor_hora: vh })
                    }}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="valor_hora">Valor/Hora (R$)</Label>
                  <Input
                    id="valor_hora"
                    type="number"
                    step="0.01"
                    value={form.valor_hora || ''}
                    onChange={(e) =>
                      setForm({ ...form, valor_hora: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="observacoes">Observações Gerais</Label>
                <Input
                  id="observacoes"
                  value={form.observacoes || ''}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  placeholder="Anotações de histórico ou detalhes do contrato..."
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalNovoAberto(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={salvando}
                className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-bold"
              >
                {salvando ? 'Salvando...' : 'Salvar Pessoa'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
