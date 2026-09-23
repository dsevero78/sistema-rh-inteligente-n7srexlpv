import React, { useState, useEffect, useMemo } from 'react'
import {
  Network,
  Users,
  Building2,
  Calendar,
  AlertCircle,
  Search,
  ChevronRight,
  ChevronDown,
  ShieldAlert,
  Info,
  Briefcase,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/contexts/AuthContext'
import {
  organogramaService,
  NodoOrganograma,
  EmpresaOrganograma,
} from '@/services/organogramaService'
import { toast } from '@/hooks/use-toast'

interface ItemArvoreProps {
  nodo: NodoOrganograma
  nivel: number
  busca: string
  onSelecionar: (nodo: NodoOrganograma) => void
  nodoSelecionadoId: string | null
}

const ItemArvore: React.FC<ItemArvoreProps> = ({
  nodo,
  nivel,
  busca,
  onSelecionar,
  nodoSelecionadoId,
}) => {
  const [expandido, setExpandido] = useState<boolean>(true)
  const temSubordinados = nodo.subordinados && nodo.subordinados.length > 0

  const matchesBusca = useMemo(() => {
    if (!busca) return true
    const term = busca.toLowerCase()
    return (
      nodo.nome.toLowerCase().includes(term) ||
      nodo.cargo.toLowerCase().includes(term) ||
      nodo.departamento.toLowerCase().includes(term) ||
      nodo.empresa_nome.toLowerCase().includes(term)
    )
  }, [nodo, busca])

  const isSelecionado = nodoSelecionadoId === nodo.id

  return (
    <div className="w-full flex flex-col">
      <div
        className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all cursor-pointer ${
          isSelecionado
            ? 'bg-orange-50/80 border-orange-400 shadow-sm'
            : 'bg-white hover:bg-slate-50/80 border-slate-200'
        } ${!matchesBusca && busca ? 'opacity-40' : ''}`}
        style={{ marginLeft: `${Math.min(nivel * 20, 160)}px` }}
        onClick={() => onSelecionar(nodo)}
      >
        {temSubordinados ? (
          <button
            type="button"
            className="p-1 hover:bg-slate-200/60 rounded text-slate-500"
            onClick={(e) => {
              e.stopPropagation()
              setExpandido(!expandido)
            }}
            title={expandido ? 'Recolher equipe' : 'Expandir equipe'}
          >
            {expandido ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        ) : (
          <span className="w-6 text-center text-slate-300">•</span>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-slate-900 truncate">{nodo.nome}</span>
            <Badge variant="outline" className="text-xs font-normal">
              {nodo.modalidade || 'CLT'}
            </Badge>
            {nodo.gestor_imediato_id ? (
              <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-none text-[11px]">
                Subordinado
              </Badge>
            ) : (
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 text-[11px]">
                Liderança de Topo / Sem Gestor Direto
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5 flex-wrap">
            <span className="truncate">{nodo.cargo}</span>
            <span>•</span>
            <span className="truncate text-slate-600">{nodo.empresa_nome}</span>
            {nodo.area_nome && (
              <>
                <span>•</span>
                <span className="truncate text-slate-400">{nodo.area_nome}</span>
              </>
            )}
          </div>
        </div>

        <div className="text-right flex flex-col items-end shrink-0 pl-2">
          <span className="text-[11px] font-medium text-slate-500">
            {nodo.subordinados?.length ? `${nodo.subordinados.length} liderado(s)` : 'Especialista'}
          </span>
          <span className="text-[10px] text-slate-400 truncate max-w-[130px]">
            {nodo.rotulo_vigencia || 'Vigente'}
          </span>
        </div>
      </div>

      {temSubordinados && expandido && (
        <div className="flex flex-col gap-1.5 mt-1.5 border-l-2 border-slate-200/70 pl-2">
          {nodo.subordinados!.map((sub) => (
            <ItemArvore
              key={sub.id}
              nodo={sub}
              nivel={nivel + 1}
              busca={busca}
              onSelecionar={onSelecionar}
              nodoSelecionadoId={nodoSelecionadoId}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export const OrganogramaPage: React.FC = () => {
  const { user } = useAuth()
  const isRhOuDiretoria =
    user?.cargo_funcao === 'RH / Recrutador' || user?.cargo_funcao === 'Diretoria / Executivo'

  const [carregando, setCarregando] = useState<boolean>(true)
  const [dataReferencia, setDataReferencia] = useState<string>(
    new Date().toISOString().split('T')[0],
  )
  const [buSelecionada, setBuSelecionada] = useState<string>('todas')
  const [busca, setBusca] = useState<string>('')
  const [abaAtiva, setAbaAtiva] = useState<'arvore' | 'tabela' | 'empresas_bu'>('arvore')

  const [nodosPlanos, setNodosPlanos] = useState<NodoOrganograma[]>([])
  const [empresas, setEmpresas] = useState<EmpresaOrganograma[]>([])
  const [nodoSelecionado, setNodoSelecionado] = useState<NodoOrganograma | null>(null)

  const carregarDados = async () => {
    try {
      setCarregando(true)
      const res = await organogramaService.obterOrganograma(dataReferencia, buSelecionada)
      setNodosPlanos(res.nodos || [])
      setEmpresas(res.empresas || [])
      if (res.nodos?.length > 0 && !nodoSelecionado) {
        setNodoSelecionado(res.nodos[0])
      }
    } catch (err: any) {
      console.error('Erro ao carregar organograma:', err)
      toast({
        title: 'Falha ao carregar organograma',
        description: err?.message || 'Verifique sua conexão ou permissões no sistema.',
        variant: 'destructive',
      })
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [dataReferencia, buSelecionada])

  // Filtragem plana por busca
  const nodosFiltrados = useMemo(() => {
    if (!busca) return nodosPlanos
    const term = busca.toLowerCase()
    return nodosPlanos.filter(
      (n) =>
        n.nome.toLowerCase().includes(term) ||
        n.cargo.toLowerCase().includes(term) ||
        n.departamento.toLowerCase().includes(term) ||
        n.empresa_nome.toLowerCase().includes(term),
    )
  }, [nodosPlanos, busca])

  // Montagem da árvore
  const arvoreNodos = useMemo(() => {
    return organogramaService.construirArvore(nodosPlanos)
  }, [nodosPlanos])

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-16">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Organograma Corporativo & Hierarquia
            </h1>
            <Badge className="bg-orange-100 text-orange-800 border-orange-300">v0.0.93</Badge>
          </div>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Visualização estrutural de vínculos organizacionais, relações de subordinação
            hierárquica e separação entre Pessoa Jurídica (CNPJ) e Unidades de Negócio (BU).
          </p>
        </div>

        {/* Controles de data e atualização */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-lg border border-slate-200">
            <Calendar className="w-4 h-4 text-slate-500 ml-1" />
            <span className="text-xs font-medium text-slate-700">Data de Referência:</span>
            <Input
              type="date"
              value={dataReferencia}
              onChange={(e) => setDataReferencia(e.target.value)}
              className="h-8 w-36 text-xs bg-white"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={carregarDados}
            disabled={carregando}
            className="h-9 gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${carregando ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Destaque conceitual e aviso de governança */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-100 bg-blue-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <Building2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-xs text-blue-900">
                Hierarquia Organizacional ≠ Alocação
              </p>
              <p className="text-xs text-blue-800/80 mt-0.5">
                A subordinação define reporte disciplinar e liderança formal. Alocações em projetos
                e demandas temporárias não alteram a linha de reporte.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-100 bg-amber-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <Layers className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-xs text-amber-900">
                Empresa Jurídica × BU Operacional
              </p>
              <p className="text-xs text-amber-800/80 mt-0.5">
                Pessoas jurídicas possuem CNPJ formal; BUs são unidades de negócio. A
                correspondência automática permanece como pendência de decisão de negócio.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-emerald-50/50">
          <CardContent className="p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-xs text-emerald-900">
                Segurança Fail-Closed & Ciclos
              </p>
              <p className="text-xs text-emerald-800/80 mt-0.5">
                Ciclos (A → B → A) são rejeitados no servidor. Dados de remuneração são estritamente
                ocultos para perfis sem alçada de RH ou Diretoria.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros e Busca */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-lg border shadow-xs">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <Input
              placeholder="Buscar por colaborador, cargo ou área..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="w-48">
            <Select value={buSelecionada} onValueChange={setBuSelecionada}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Filtrar por BU" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Unidades</SelectItem>
                {empresas.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id}>
                    {emp.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs value={abaAtiva} onValueChange={(v) => setAbaAtiva(v as any)}>
          <TabsList className="h-9">
            <TabsTrigger value="arvore" className="text-xs gap-1.5">
              <Network className="w-3.5 h-3.5" />
              Árvore Hierárquica
            </TabsTrigger>
            <TabsTrigger value="tabela" className="text-xs gap-1.5">
              <Users className="w-3.5 h-3.5" />
              Visão em Tabela
            </TabsTrigger>
            <TabsTrigger value="empresas_bu" className="text-xs gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              PJ × BU ({empresas.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Conteúdo principal */}
      {carregando ? (
        <Card className="p-12 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-400 mb-2" />
          <p className="text-sm font-medium">Carregando posições organizacionais e vigências...</p>
        </Card>
      ) : (
        <>
          {/* ABA 1: ÁRVORE HIERÁRQUICA */}
          {abaAtiva === 'arvore' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Coluna da Árvore (2 cols) */}
              <div className="lg:col-span-2 space-y-3">
                <Card>
                  <CardHeader className="py-3.5 px-4 border-b flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        Estrutura de Subordinação
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Navegação vertical responsiva sem rolagem horizontal forçada.
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {nodosPlanos.length} Posições Vigentes
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-4 space-y-2 max-h-[640px] overflow-y-auto">
                    {arvoreNodos.length === 0 ? (
                      <div className="p-8 text-center text-slate-500 text-xs">
                        Nenhuma posição ativa encontrada para a data de referência selecionada.
                      </div>
                    ) : (
                      arvoreNodos.map((raiz) => (
                        <ItemArvore
                          key={raiz.id}
                          nodo={raiz}
                          nivel={0}
                          busca={busca}
                          onSelecionar={setNodoSelecionado}
                          nodoSelecionadoId={nodoSelecionado?.id || null}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Coluna de Detalhes da Posição Selecionada (1 col) */}
              <div className="space-y-4">
                {nodoSelecionado ? (
                  <Card className="border-orange-200">
                    <CardHeader className="p-4 pb-2 border-b bg-orange-50/40">
                      <div className="flex items-center justify-between">
                        <Badge className="bg-orange-600 text-white text-[11px]">
                          Ficha de Vínculo
                        </Badge>
                        <span className="text-xs text-slate-400 font-mono">
                          ID: {nodoSelecionado.id.slice(0, 8)}
                        </span>
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900 mt-2">
                        {nodoSelecionado.nome}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-600">
                        {nodoSelecionado.cargo}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3 text-xs">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Unidade / Empresa:</span>
                        <span className="font-semibold text-slate-800">
                          {nodoSelecionado.empresa_nome}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block mb-0.5">Área / Departamento:</span>
                        <span className="font-medium text-slate-800">
                          {nodoSelecionado.area_nome} — {nodoSelecionado.departamento || 'Geral'}
                        </span>
                      </div>

                      <div className="pt-2 border-t">
                        <span className="text-slate-400 block mb-1">Linha de Reporte:</span>
                        {nodoSelecionado.gestor_imediato_id ? (
                          <div className="p-2 rounded bg-slate-50 border text-slate-700">
                            <span className="font-medium text-slate-900 block">
                              Reporta ao colaborador:
                            </span>
                            <span className="text-slate-600">
                              {nodosPlanos.find((n) => n.id === nodoSelecionado.gestor_imediato_id)
                                ?.nome || nodoSelecionado.gestor_imediato_id}
                            </span>
                          </div>
                        ) : (
                          <div className="p-2 rounded bg-amber-50/70 border border-amber-200 text-amber-900 flex items-start gap-1.5">
                            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-semibold block">Ausência de Gestor Direto</span>
                              <span>
                                Sem vínculo de subordinação hierárquica cadastrado. Posição no topo
                                ou com reporte à governança.
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t">
                        <span className="text-slate-400 block mb-1">Vigência Organizacional:</span>
                        <div className="p-2 rounded bg-slate-50 border space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Início:</span>
                            <span className="font-medium text-slate-800">
                              {nodoSelecionado.vigencia_inicio
                                ? new Date(nodoSelecionado.vigencia_inicio).toLocaleDateString(
                                    'pt-BR',
                                  )
                                : 'Vigente a partir da implantação'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Término:</span>
                            <span className="font-medium text-slate-800">
                              {nodoSelecionado.vigencia_fim
                                ? new Date(nodoSelecionado.vigencia_fim).toLocaleDateString('pt-BR')
                                : 'Indeterminado'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 pt-1 border-t">
                            Rótulo: {nodoSelecionado.rotulo_vigencia}
                          </div>
                        </div>
                      </div>

                      {/* Dados sensíveis e remuneração */}
                      <div className="pt-2 border-t">
                        <span className="text-slate-400 block mb-1">
                          Dados Financeiros & Remuneração:
                        </span>
                        {nodoSelecionado.dados_financeiros_ocultos ? (
                          <div className="p-2.5 rounded bg-slate-100 border border-slate-200 text-slate-600 flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium block">Restrito por Alçada</span>
                              <span className="text-[11px]">
                                Valores contratuais e remuneração individual são protegidos e
                                visíveis apenas para perfis autorizados de RH e Diretoria.
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 space-y-1">
                            <div className="flex justify-between">
                              <span>Valor Contratado Mensal:</span>
                              <span className="font-bold">
                                R${' '}
                                {Number(nodoSelecionado.valor_contratado || 0).toLocaleString(
                                  'pt-BR',
                                  {
                                    minimumFractionDigits: 2,
                                  },
                                )}
                              </span>
                            </div>
                            {Number(nodoSelecionado.valor_hora || 0) > 0 && (
                              <div className="flex justify-between text-[11px] text-emerald-800">
                                <span>Valor Hora Base:</span>
                                <span>
                                  R${' '}
                                  {Number(nodoSelecionado.valor_hora).toLocaleString('pt-BR', {
                                    minimumFractionDigits: 2,
                                  })}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="p-6 text-center text-slate-400 text-xs">
                    Selecione um colaborador na árvore para visualizar os detalhes de vigência e
                    reporte.
                  </Card>
                )}
              </div>
            </div>
          )}

          {/* ABA 2: VISÃO EM TABELA */}
          {abaAtiva === 'tabela' && (
            <Card>
              <CardHeader className="py-3 px-4 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Posições Organizacionais em Tabela
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Visualização consolidada com ordenação e identificação de subordinação direta.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {nodosFiltrados.length} Registros
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 text-slate-700 border-b font-semibold">
                      <tr>
                        <th className="p-3">Colaborador / Posição</th>
                        <th className="p-3">Unidade (BU)</th>
                        <th className="p-3">Área / Depto</th>
                        <th className="p-3">Gestor Direto</th>
                        <th className="p-3">Vigência Organizacional</th>
                        <th className="p-3">Remuneração</th>
                        <th className="p-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {nodosFiltrados.map((nodo) => (
                        <tr key={nodo.id} className="hover:bg-slate-50/70">
                          <td className="p-3 font-medium text-slate-900">
                            <div>{nodo.nome}</div>
                            <div className="text-[11px] text-slate-500 font-normal">
                              {nodo.cargo} • {nodo.modalidade}
                            </div>
                          </td>
                          <td className="p-3 text-slate-700">{nodo.empresa_nome}</td>
                          <td className="p-3 text-slate-600">
                            {nodo.area_nome}
                            {nodo.departamento ? ` (${nodo.departamento})` : ''}
                          </td>
                          <td className="p-3">
                            {nodo.gestor_imediato_id ? (
                              <span className="text-slate-800 font-medium">
                                {nodosPlanos.find((n) => n.id === nodo.gestor_imediato_id)?.nome ||
                                  'Gestor vinculado'}
                              </span>
                            ) : (
                              <Badge
                                variant="outline"
                                className="text-[10px] text-amber-700 bg-amber-50 border-amber-200"
                              >
                                Sem gestor direto
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-slate-600">
                            <div>
                              {nodo.vigencia_inicio
                                ? new Date(nodo.vigencia_inicio).toLocaleDateString('pt-BR')
                                : 'Vigente inicial'}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {nodo.rotulo_vigencia || 'Ativo'}
                            </div>
                          </td>
                          <td className="p-3">
                            {nodo.dados_financeiros_ocultos ? (
                              <span className="text-slate-400 italic text-[11px]">
                                Confidencial
                              </span>
                            ) : (
                              <span className="font-semibold text-emerald-700">
                                R${' '}
                                {Number(nodo.valor_contratado || 0).toLocaleString('pt-BR', {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setNodoSelecionado(nodo)
                                setAbaAtiva('arvore')
                              }}
                            >
                              Ver na Árvore
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ABA 3: EMPRESAS JURÍDICAS × UNIDADES DE NEGÓCIO (BU) */}
          {abaAtiva === 'empresas_bu' && (
            <div className="space-y-4">
              <Card className="border-slate-200">
                <CardHeader className="py-3.5 px-4 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-900">
                        Relações entre Pessoas Jurídicas (CNPJ) e Unidades de Negócio (BU)
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-500">
                        Evolução da governança: uma empresa jurídica formal pode abrigar múltiplas
                        BUs.
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs bg-slate-50">
                      Decisão de Correspondência Pendente de Negócio
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  <div className="p-3 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">
                        Status de Correspondência das BUs SouYess
                      </span>
                      <span>
                        Os registros existentes (Tecnologia, Vértice Mídia, Operações) foram
                        preservados e NÃO foram associados compulsoriamente às 5 BUs da SouYess.
                        Esta correspondência está formalmente registrada no sistema como{' '}
                        <strong>"pendente de decisão de negócio"</strong>, respeitando a governança
                        corporativa.
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {empresas.map((emp) => (
                      <div
                        key={emp.id}
                        className="p-3.5 rounded-lg border bg-white space-y-2 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-sm text-slate-900">{emp.nome}</span>
                            <span className="block text-xs text-slate-500 font-mono">
                              CNPJ: {emp.cnpj || 'Não cadastrado'}
                            </span>
                          </div>
                          <Badge
                            className={
                              emp.is_unidade_negocio
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : 'bg-slate-100 text-slate-800 border-slate-200'
                            }
                          >
                            {emp.is_unidade_negocio ? 'Unidade de Negócio (BU)' : 'Pessoa Jurídica'}
                          </Badge>
                        </div>

                        <div className="text-xs text-slate-600 space-y-1 pt-1 border-t">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Razão Social:</span>
                            <span className="font-medium text-slate-800 truncate max-w-[220px]">
                              {emp.razao_social || emp.nome}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Classificação:</span>
                            <span className="font-medium text-slate-800">{emp.tipo}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Status da Correspondência BU:</span>
                            <Badge
                              variant="outline"
                              className="text-[10px] text-amber-700 bg-amber-50"
                            >
                              {emp.correspondencia_bu_status === 'pendente_decisao_negocio'
                                ? 'Pendente Decisão de Negócio'
                                : emp.correspondencia_bu_status}
                            </Badge>
                          </div>
                          {emp.empresa_juridica_pai && (
                            <div className="flex justify-between text-blue-700">
                              <span>Empresa Jurídica Vinculada:</span>
                              <span className="font-medium">
                                {empresas.find((e) => e.id === emp.empresa_juridica_pai)?.nome ||
                                  emp.empresa_juridica_pai}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default OrganogramaPage
