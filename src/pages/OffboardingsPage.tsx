import { useState, useEffect } from 'react'
import {
  OffboardingRegistro,
  offboardingService,
  ModalidadeOffboarding,
  StatusOffboarding,
} from '@/services/offboardingService'
import { empresasService, Empresa } from '@/services/empresasService'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
import { FichaOffboardingDetalhes } from '@/components/offboarding/FichaOffboardingDetalhes'
import {
  UserMinus,
  Search,
  Filter,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  ArrowRight,
  PlusCircle,
  FileText,
  AlertCircle,
} from 'lucide-react'
import { Link } from 'react-router-dom'

export function OffboardingsPage() {
  const { user } = useAuth()
  const [carregando, setCarregando] = useState(true)
  const [lista, setLista] = useState<OffboardingRegistro[]>([])
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [offboardingSelecionado, setOffboardingSelecionado] = useState<OffboardingRegistro | null>(
    null,
  )

  // Filtros
  const [busca, setBusca] = useState('')
  const [filtroEmpresa, setFiltroEmpresa] = useState<string>('todas')
  const [filtroModalidade, setFiltroModalidade] = useState<string>('todas')
  const [filtroStatus, setFiltroStatus] = useState<string>('todas')

  // Identifica BU do usuário para respeitar o escopamento por empresa
  const userEmpresaId = user?.empresa_id || (user as any)?.empresa || null
  const isGestorBu = Boolean(user?.role === 'gestor' && userEmpresaId)

  useEffect(() => {
    carregarDados()
  }, [])

  const carregarDados = async () => {
    try {
      setCarregando(true)
      const [todosOffboardings, todasEmpresas] = await Promise.all([
        offboardingService.listar(),
        empresasService.listarEmpresas(),
      ])
      setLista(todosOffboardings)
      setEmpresas(todasEmpresas)
    } catch (err) {
      console.error('Erro ao carregar offboardings:', err)
    } finally {
      setCarregando(false)
    }
  }

  const recarregarAtual = async () => {
    if (offboardingSelecionado) {
      const atualizado = await offboardingService.obterPorId(offboardingSelecionado.id)
      setOffboardingSelecionado(atualizado)
    }
    await carregarDados()
  }

  // Filtragem com regra permanente de escopamento por BU
  const offboardingsFiltrados = lista.filter((item) => {
    // 1. Escopamento por BU: líder de BU vê apenas a própria empresa
    if (isGestorBu && item.empresa !== userEmpresaId) {
      return false
    }

    // 2. Filtro manual por BU (se RH ou se selecionado)
    if (filtroEmpresa !== 'todas' && item.empresa !== filtroEmpresa) {
      return false
    }

    // 3. Filtro de Modalidade
    if (filtroModalidade !== 'todas' && item.modalidade !== filtroModalidade) {
      return false
    }

    // 4. Filtro de Status
    if (filtroStatus !== 'todas' && item.status !== filtroStatus) {
      return false
    }

    // 5. Busca por texto
    if (busca.trim()) {
      const termo = busca.toLowerCase()
      const nomePessoa = item.expand?.pessoa?.nome?.toLowerCase() || ''
      const cargo = item.expand?.pessoa?.cargo?.toLowerCase() || ''
      const empresaNome = item.empresa_nome?.toLowerCase() || ''
      const motivo = item.motivo_detalhado?.toLowerCase() || ''
      return (
        nomePessoa.includes(termo) ||
        cargo.includes(termo) ||
        empresaNome.includes(termo) ||
        motivo.includes(termo)
      )
    }

    return true
  })

  // KPIs Rápidos
  const totalEmAndamento = offboardingsFiltrados.filter((i) => i.status === 'Em andamento').length
  const totalConcluidos = offboardingsFiltrados.filter((i) => i.status === 'Concluído').length
  const totalClt = offboardingsFiltrados.filter((i) => i.modalidade === 'CLT').length
  const totalPj = offboardingsFiltrados.filter((i) => i.modalidade === 'PJ').length

  const formatarMoeda = (val: number) => {
    return (val || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const formatarData = (d?: string) => {
    if (!d) return '-'
    return new Date(d).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
  }

  if (offboardingSelecionado) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <FichaOffboardingDetalhes
          offboarding={offboardingSelecionado}
          onAtualizado={recarregarAtual}
          onVoltar={() => setOffboardingSelecionado(null)}
        />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              Desligamentos & Offboarding
            </h1>
            <Badge
              variant="secondary"
              className="font-semibold text-xs bg-slate-100 text-slate-700"
            >
              Módulo RH Inteligente
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gestão integrada de encerramentos CLT e PJ com checklist por área, memória de cálculo
            rescisório e histórico vitalício sem exclusão de registros.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/pessoas">
            <Button variant="outline" className="gap-2">
              <UserMinus className="w-4 h-4" />
              Iniciar pela Ficha da Pessoa
            </Button>
          </Link>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Em Andamento
                </p>
                <h3 className="text-2xl font-bold text-amber-600 mt-0.5">{totalEmAndamento}</h3>
              </div>
              <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Processos com pendências ativas
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Concluídos / Homologados
                </p>
                <h3 className="text-2xl font-bold text-emerald-600 mt-0.5">{totalConcluidos}</h3>
              </div>
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">
              Vínculos formalmente encerrados
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Rescisões CLT
                </p>
                <h3 className="text-2xl font-bold text-blue-600 mt-0.5">{totalClt}</h3>
              </div>
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">Com saldo, 13º, férias e FGTS</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase">
                  Encerramentos PJ
                </p>
                <h3 className="text-2xl font-bold text-purple-600 mt-0.5">{totalPj}</h3>
              </div>
              <div className="p-2.5 bg-purple-50 text-purple-600 rounded-lg">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground mt-2">NFs pendentes e fechamentos</p>
          </CardContent>
        </Card>
      </div>

      {/* Barra de Filtros */}
      <Card>
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              <Input
                placeholder="Buscar por colaborador/prestador, cargo, empresa ou motivo..."
                className="pl-9"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>

            {/* BU / Empresa (se não for gestor restrito) */}
            {!isGestorBu && (
              <Select value={filtroEmpresa} onValueChange={setFiltroEmpresa}>
                <SelectTrigger className="w-full md:w-[220px]">
                  <SelectValue placeholder="Todas as Unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas as Unidades / BUs</SelectItem>
                  {empresas.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.nome_fantasia || emp.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Modalidade */}
            <Select value={filtroModalidade} onValueChange={setFiltroModalidade}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Modalidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas Modalidades</SelectItem>
                <SelectItem value="CLT">Apenas CLT</SelectItem>
                <SelectItem value="PJ">Apenas PJ</SelectItem>
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-full md:w-[170px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos os Status</SelectItem>
                <SelectItem value="Em andamento">Em andamento</SelectItem>
                <SelectItem value="Concluído">Concluídos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Offboardings */}
      {carregando ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          Carregando processos de offboarding...
        </div>
      ) : offboardingsFiltrados.length === 0 ? (
        <Card className="p-8 text-center border-dashed">
          <UserMinus className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
          <h3 className="font-semibold text-slate-800">
            Nenhum processo de desligamento encontrado
          </h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Não há registros correspondentes aos filtros selecionados. Você pode iniciar um novo
            desligamento a partir da ficha do colaborador ou prestador em Pessoas.
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {offboardingsFiltrados.map((item) => {
            const itensConcluidos = item.itens_checklist.filter((i) => i.concluido).length
            const totalItens = item.itens_checklist.length
            const pct = totalItens > 0 ? Math.round((itensConcluidos / totalItens) * 100) : 0

            return (
              <Card
                key={item.id}
                className="hover:shadow-md transition-all cursor-pointer border-slate-200"
                onClick={() => setOffboardingSelecionado(item)}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Informações da Pessoa */}
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={
                            item.modalidade === 'CLT'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }
                        >
                          {item.modalidade}
                        </Badge>
                        <Badge
                          className={
                            item.status === 'Concluído'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-500 text-white'
                          }
                        >
                          {item.status}
                        </Badge>
                        <span className="text-xs font-semibold text-slate-700">
                          {item.tipo_desligamento}
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900">
                        {item.expand?.pessoa?.nome || 'Colaborador'}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                        <span className="flex items-center gap-1 font-medium text-slate-700">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          {item.empresa_nome || 'Empresa do Grupo'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Aviso: {formatarData(item.data_aviso)}
                        </span>
                        <span className="flex items-center gap-1 font-semibold text-red-600">
                          <Calendar className="w-3.5 h-3.5 text-red-500" />
                          Último dia: {formatarData(item.data_desligamento)}
                        </span>
                      </div>

                      {item.motivo_detalhado && (
                        <p className="text-xs text-slate-600 line-clamp-1 italic pt-0.5">
                          "{item.motivo_detalhado}"
                        </p>
                      )}
                    </div>

                    {/* Progresso do Checklist */}
                    <div className="w-full lg:w-48 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground font-medium">Checklist:</span>
                        <span className="font-bold text-slate-800">
                          {itensConcluidos}/{totalItens} ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            pct === 100 ? 'bg-emerald-500' : 'bg-blue-600'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    {/* Valor Rescisório / Pendências */}
                    <div className="text-left lg:text-right space-y-0.5 min-w-[150px]">
                      <span className="text-[11px] uppercase font-semibold text-muted-foreground">
                        {item.modalidade === 'CLT' ? 'Total Rescisório' : 'Pendências PJ'}
                      </span>
                      <div className="text-base font-bold text-slate-900">
                        {formatarMoeda(item.total_rescisorio)}
                      </div>
                      <span className="text-[11px] text-muted-foreground block">
                        Resp: {item.responsavel_nome || 'RH'}
                      </span>
                    </div>

                    <div className="flex items-center justify-end">
                      <Button variant="ghost" size="sm" className="gap-1.5 text-blue-600">
                        Ver Ficha
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
