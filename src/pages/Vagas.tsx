import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import {
  Plus,
  Search,
  Filter,
  MapPin,
  Briefcase,
  Users,
  MoreVertical,
  Edit,
  PauseCircle,
  PlayCircle,
  Archive,
  ArrowRight,
  Sparkles,
  X,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import type { RecordModel } from 'pocketbase'

export default function Vagas() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [vagas, setVagas] = useState<RecordModel[]>([])
  const [candidatosCount, setCandidatosCount] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [deptFilter, setDeptFilter] = useState('all')

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false)
  const [editingVaga, setEditingVaga] = useState<RecordModel | null>(null)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Form states
  const [titulo, setTitulo] = useState('')
  const [departamento, setDepartamento] = useState('')
  const [localizacao, setLocalizacao] = useState('São Paulo, SP')
  const [modalidade, setModalidade] = useState<'Remoto' | 'Presencial' | 'Híbrido'>('Híbrido')
  const [faixaSalarial, setFaixaSalarial] = useState('')
  const [descricao, setDescricao] = useState('')
  const [gestorResponsavel, setGestorResponsavel] = useState('')
  const [status, setStatus] = useState<'Ativa' | 'Pausada' | 'Preenchida' | 'Arquivada'>('Ativa')
  const [gestoresList, setGestoresList] = useState<RecordModel[]>([])

  // Tags
  const [reqObrigatorios, setReqObrigatorios] = useState<string[]>([])
  const [inputReqObrig, setInputReqObrig] = useState('')

  const [reqDesejaveis, setReqDesejaveis] = useState<string[]>([])
  const [inputReqDesej, setInputReqDesej] = useState('')

  const [habTecnicas, setHabTecnicas] = useState<{ nome: string; peso: number }[]>([])
  const [inputHabNome, setInputHabNome] = useState('')
  const [inputHabPeso, setInputHabPeso] = useState('5')

  const [compComportamentais, setCompComportamentais] = useState<string[]>([])
  const [inputComp, setInputComp] = useState('')

  const fetchVagas = async () => {
    try {
      const [vList, cList, uList] = await Promise.all([
        pb.collection('vagas').getFullList({ sort: '-created', expand: 'gestor_responsavel' }),
        pb.collection('candidatos').getFullList({ fields: 'id,vaga' }),
        pb.collection('users').getFullList({ sort: 'name' }),
      ])
      setVagas(vList)
      setGestoresList(uList)

      const counts: Record<string, number> = {}
      cList.forEach((c) => {
        if (c.vaga) {
          counts[c.vaga] = (counts[c.vaga] || 0) + 1
        }
      })
      setCandidatosCount(counts)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchVagas()
  }, [])

  useRealtime('vagas', () => fetchVagas())
  useRealtime('candidatos', () => fetchVagas())

  const openCreateModal = () => {
    setEditingVaga(null)
    setTitulo('')
    setDepartamento('Tecnologia')
    setLocalizacao('São Paulo, SP')
    setModalidade('Híbrido')
    setFaixaSalarial('')
    setDescricao('')
    setGestorResponsavel('')
    setStatus('Ativa')
    setReqObrigatorios([])
    setReqDesejaveis([])
    setHabTecnicas([])
    setCompComportamentais([])
    setFieldErrors({})
    setModalOpen(true)
  }

  const openEditModal = (vaga: RecordModel) => {
    setEditingVaga(vaga)
    setTitulo(vaga.titulo || '')
    setDepartamento(vaga.departamento || '')
    setLocalizacao(vaga.localizacao || '')
    setModalidade(vaga.modalidade || 'Híbrido')
    setFaixaSalarial(vaga.faixa_salarial || '')
    setDescricao(vaga.descricao || '')
    setGestorResponsavel(vaga.gestor_responsavel || '')
    setStatus(vaga.status || 'Ativa')
    setReqObrigatorios(
      Array.isArray(vaga.requisitos_obrigatorios) ? vaga.requisitos_obrigatorios : [],
    )
    setReqDesejaveis(Array.isArray(vaga.requisitos_desejaveis) ? vaga.requisitos_desejaveis : [])
    setHabTecnicas(Array.isArray(vaga.habilidades_tecnicas) ? vaga.habilidades_tecnicas : [])
    setCompComportamentais(
      Array.isArray(vaga.competencias_comportamentais) ? vaga.competencias_comportamentais : [],
    )
    setFieldErrors({})
    setModalOpen(true)
  }

  const handleSaveVaga = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFieldErrors({})

    const payload = {
      titulo,
      departamento,
      localizacao,
      modalidade,
      faixa_salarial: faixaSalarial,
      descricao,
      gestor_responsavel: gestorResponsavel || null,
      requisitos_obrigatorios: reqObrigatorios,
      requisitos_desejaveis: reqDesejaveis,
      habilidades_tecnicas: habTecnicas,
      competencias_comportamentais: compComportamentais,
      status,
    }

    try {
      if (editingVaga) {
        await pb.collection('vagas').update(editingVaga.id, payload)
        toast({ title: 'Vaga atualizada com sucesso!' })
      } else {
        await pb.collection('vagas').create(payload)
        toast({ title: 'Nova vaga criada e publicada com sucesso!' })
      }
      setModalOpen(false)
      fetchVagas()
    } catch (err: unknown) {
      const extracted = extractFieldErrors(err)
      if (Object.keys(extracted).length > 0) {
        setFieldErrors(extracted)
      } else {
        toast({
          title: 'Erro ao salvar vaga',
          description: err instanceof Error ? err.message : 'Falha ao processar.',
          variant: 'destructive',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (
    vaga: RecordModel,
    newStatus: 'Ativa' | 'Pausada' | 'Arquivada',
  ) => {
    try {
      await pb.collection('vagas').update(vaga.id, { status: newStatus })
      toast({
        title: `Vaga ${newStatus === 'Ativa' ? 'reativada' : newStatus === 'Pausada' ? 'pausada' : 'arquivada'}`,
      })
      fetchVagas()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao alterar status',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  // Tag helper functions
  const addReqObrig = () => {
    if (inputReqObrig.trim()) {
      setReqObrigatorios([...reqObrigatorios, inputReqObrig.trim()])
      setInputReqObrig('')
    }
  }
  const removeReqObrig = (index: number) => {
    setReqObrigatorios(reqObrigatorios.filter((_, i) => i !== index))
  }

  const addReqDesej = () => {
    if (inputReqDesej.trim()) {
      setReqDesejaveis([...reqDesejaveis, inputReqDesej.trim()])
      setInputReqDesej('')
    }
  }
  const removeReqDesej = (index: number) => {
    setReqDesejaveis(reqDesejaveis.filter((_, i) => i !== index))
  }

  const addHabTecnica = () => {
    if (inputHabNome.trim()) {
      const pesoNum = parseInt(inputHabPeso, 10) || 5
      setHabTecnicas([...habTecnicas, { nome: inputHabNome.trim(), peso: pesoNum }])
      setInputHabNome('')
    }
  }
  const removeHabTecnica = (index: number) => {
    setHabTecnicas(habTecnicas.filter((_, i) => i !== index))
  }

  const addComp = () => {
    if (inputComp.trim()) {
      setCompComportamentais([...compComportamentais, inputComp.trim()])
      setInputComp('')
    }
  }
  const removeComp = (index: number) => {
    setCompComportamentais(compComportamentais.filter((_, i) => i !== index))
  }

  // Filtered list
  const filteredVagas = useMemo(() => {
    return vagas.filter((v) => {
      const matchesSearch =
        v.titulo.toLowerCase().includes(search.toLowerCase()) ||
        v.departamento?.toLowerCase().includes(search.toLowerCase()) ||
        v.localizacao?.toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === 'all' || v.status === statusFilter
      const matchesDept = deptFilter === 'all' || v.departamento === deptFilter

      return matchesSearch && matchesStatus && matchesDept
    })
  }, [vagas, search, statusFilter, deptFilter])

  const departamentos = useMemo(() => {
    const set = new Set<string>()
    vagas.forEach((v) => {
      if (v.departamento) set.add(v.departamento)
    })
    return Array.from(set)
  }, [vagas])

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="font-display text-[11px] uppercase font-bold tracking-widest text-[#E9530E] mb-1">
            Gestão de Vagas · SouYess People
          </div>
          <h1 className="font-display text-2xl sm:text-[26px] font-bold text-[#212B55] dark:text-[#F7F8FB] tracking-tight">
            Posições Estratégicas
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Cadastre posições, defina matriz de competências e gerencie o fluxo de atração
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-[#E9530E] hover:bg-[#C5430A] text-white font-display font-bold shadow-xs h-10 text-xs px-4"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Vaga
        </Button>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-[#1A2240] p-3.5 rounded-xl border border-slate-200/80 dark:border-[#2E3A6E] shadow-xs flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-3 top-3" />
          <Input
            placeholder="Buscar por cargo, tecnologia ou localidade..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-10 text-xs bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] dark:text-[#F7F8FB]"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px] h-10 text-xs bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] dark:text-[#F7F8FB]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent className="dark:bg-[#1A2240] dark:border-[#2E3A6E]">
              <SelectItem value="all" className="text-xs">
                Todos os status
              </SelectItem>
              <SelectItem value="Ativa" className="text-xs">
                Ativa
              </SelectItem>
              <SelectItem value="Pausada" className="text-xs">
                Pausada
              </SelectItem>
              <SelectItem value="Preenchida" className="text-xs">
                Preenchida
              </SelectItem>
              <SelectItem value="Arquivada" className="text-xs">
                Arquivada
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[160px] h-10 text-xs bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] dark:text-[#F7F8FB]">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent className="dark:bg-[#1A2240] dark:border-[#2E3A6E]">
              <SelectItem value="all" className="text-xs">
                Todos departamentos
              </SelectItem>
              {departamentos.map((dept) => (
                <SelectItem key={dept} value={dept} className="text-xs">
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Grid of Vagas */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="p-5 border-slate-200">
              <Skeleton className="h-5 w-3/4 mb-3" />
              <Skeleton className="h-4 w-1/2 mb-4" />
              <Skeleton className="h-16 w-full mb-4" />
              <Skeleton className="h-8 w-full" />
            </Card>
          ))}
        </div>
      ) : filteredVagas.length === 0 ? (
        <div className="bg-white dark:bg-[#1A2240] rounded-xl border border-dashed border-slate-300 dark:border-[#2E3A6E] p-12 text-center">
          <Briefcase className="w-10 h-10 text-slate-400 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">Nenhuma vaga encontrada</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
            Não há registros correspondentes aos filtros aplicados. Crie uma nova vaga ou limpe a
            busca.
          </p>
          <Button
            onClick={openCreateModal}
            variant="outline"
            size="sm"
            className="mt-4 text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            Cadastrar vaga agora
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVagas.map((vaga) => {
            const numCandidatos = candidatosCount[vaga.id] || 0
            const statusColor =
              vaga.status === 'Ativa'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : vaga.status === 'Pausada'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : vaga.status === 'Preenchida'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'

            return (
              <Card
                key={vaga.id}
                className="border-slate-200/90 dark:border-[#2E3A6E] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all bg-white dark:bg-[#1A2240] flex flex-col justify-between group"
              >
                <div>
                  <CardHeader className="p-5 pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-display text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                            {vaga.departamento || 'Geral'}
                          </span>
                          <Badge
                            variant="outline"
                            className={`font-display text-xs font-bold px-2.5 py-0.5 rounded-full ${statusColor}`}
                          >
                            {vaga.status}
                          </Badge>
                        </div>
                        <CardTitle
                          onClick={() => navigate(`/vagas/${vaga.id}`)}
                          className="font-display text-base sm:text-lg font-bold text-[#212B55] dark:text-[#F7F8FB] group-hover:text-[#E9530E] transition-colors cursor-pointer line-clamp-1 pt-1 tracking-tight"
                        >
                          {vaga.titulo}
                        </CardTitle>

                        {vaga.expand?.gestor_responsavel && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium pt-0.5">
                            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-[#6B7384]">
                              Gestor:
                            </span>
                            <span className="text-[#345EA9] dark:text-blue-300 font-semibold truncate">
                              {vaga.expand.gestor_responsavel.name ||
                                vaga.expand.gestor_responsavel.email}
                            </span>
                            {vaga.status_aprovacao_gestor && (
                              <span
                                className={`font-display text-[11px] px-2 py-0.5 rounded font-bold ${
                                  vaga.status_aprovacao_gestor === 'Aprovada pelo gestor'
                                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                    : vaga.status_aprovacao_gestor === 'Ajustes solicitados'
                                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                                      : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                                }`}
                              >
                                {vaga.status_aprovacao_gestor === 'Aprovada pelo gestor'
                                  ? '✓ Aprovada'
                                  : vaga.status_aprovacao_gestor}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-700"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="text-xs">
                          <DropdownMenuItem
                            onClick={() => navigate(`/vagas/${vaga.id}`)}
                            className="cursor-pointer"
                          >
                            <ArrowRight className="w-3.5 h-3.5 mr-2 text-blue-600" />
                            Ver detalhes e candidatos
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openEditModal(vaga)}
                            className="cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 mr-2 text-slate-500" />
                            Editar dados da vaga
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {vaga.status === 'Ativa' ? (
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(vaga, 'Pausada')}
                              className="text-amber-600 cursor-pointer"
                            >
                              <PauseCircle className="w-3.5 h-3.5 mr-2" />
                              Pausar processo
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(vaga, 'Ativa')}
                              className="text-emerald-600 cursor-pointer"
                            >
                              <PlayCircle className="w-3.5 h-3.5 mr-2" />
                              Reativar vaga
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(vaga, 'Arquivada')}
                            className="text-slate-600 cursor-pointer"
                          >
                            <Archive className="w-3.5 h-3.5 mr-2" />
                            Arquivar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 pt-2">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{vaga.localizacao || 'Brasil'}</span>
                      </div>
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-medium bg-slate-100 text-slate-700"
                      >
                        {vaga.modalidade || 'Híbrido'}
                      </Badge>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 pt-0 pb-3">
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {vaga.descricao || 'Sem descrição cadastrada.'}
                    </p>

                    {/* Technical requirements pills */}
                    {Array.isArray(vaga.habilidades_tecnicas) &&
                      vaga.habilidades_tecnicas.length > 0 && (
                        <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                          {vaga.habilidades_tecnicas.slice(0, 3).map((hab: { nome: string }) => (
                            <span
                              key={hab.nome}
                              className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200"
                            >
                              {hab.nome}
                            </span>
                          ))}
                          {vaga.habilidades_tecnicas.length > 3 && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              +{vaga.habilidades_tecnicas.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                  </CardContent>
                </div>

                <CardFooter className="p-5 pt-3 border-t border-slate-100 dark:border-[#2E3A6E] flex items-center justify-between bg-slate-50/50 dark:bg-[#141B34] rounded-b-xl">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <Users className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    <span>
                      <strong className="font-mono tabular-nums font-bold text-slate-900 dark:text-white mr-1">
                        {numCandidatos}
                      </strong>
                      {numCandidatos === 1 ? 'candidato' : 'candidatos'}
                    </span>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/vagas/${vaga.id}`)}
                    className="h-8 text-xs font-display font-bold text-blue-600 dark:text-blue-400 hover:text-[#E9530E] hover:bg-transparent p-0"
                  >
                    Gerenciar vaga
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Criar / Editar Vaga */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="font-display text-[11px] uppercase font-bold tracking-widest text-[#E9530E]">
              {editingVaga ? 'Edição de Posição' : 'Nova Posição Estratégica'}
            </div>
            <DialogTitle className="font-display text-lg sm:text-xl font-bold text-[#212B55] dark:text-[#F7F8FB]">
              {editingVaga ? 'Editar Posição' : 'Cadastrar Nova Posição'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Defina as atribuições e as competências para alimentar o matching inteligente com IA.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveVaga} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 sm:col-span-2">
                <Label
                  htmlFor="titulo"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Título da vaga *
                </Label>
                <Input
                  id="titulo"
                  placeholder="Ex: Desenvolvedor(a) Backend Sênior"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className={`text-xs dark:bg-[#11162B] dark:border-[#2E3A6E] ${fieldErrors.titulo ? 'border-red-500' : ''}`}
                  required
                />
                {fieldErrors.titulo && <p className="text-xs text-red-600">{fieldErrors.titulo}</p>}
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="departamento"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Departamento
                </Label>
                <Input
                  id="departamento"
                  placeholder="Ex: Tecnologia, Marketing, RH"
                  value={departamento}
                  onChange={(e) => setDepartamento(e.target.value)}
                  className="text-xs dark:bg-[#11162B] dark:border-[#2E3A6E]"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="modalidade"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Modalidade de trabalho
                </Label>
                <Select
                  value={modalidade}
                  onValueChange={(val) => setModalidade(val as 'Remoto' | 'Presencial' | 'Híbrido')}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Remoto" className="text-xs">
                      Remoto
                    </SelectItem>
                    <SelectItem value="Presencial" className="text-xs">
                      Presencial
                    </SelectItem>
                    <SelectItem value="Híbrido" className="text-xs">
                      Híbrido
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="localizacao" className="text-xs font-semibold text-slate-700">
                  Localização
                </Label>
                <Input
                  id="localizacao"
                  placeholder="Ex: São Paulo, SP"
                  value={localizacao}
                  onChange={(e) => setLocalizacao(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="faixaSalarial" className="text-xs font-semibold text-slate-700">
                  Faixa Salarial / Pacote
                </Label>
                <Input
                  id="faixaSalarial"
                  placeholder="Ex: R$ 12.000 - R$ 15.000"
                  value={faixaSalarial}
                  onChange={(e) => setFaixaSalarial(e.target.value)}
                  className="text-xs"
                />
              </div>

              {/* MÓDULO 1: Gestor Responsável */}
              <div className="space-y-1.5 sm:col-span-2">
                <Label
                  htmlFor="gestorResp"
                  className="text-xs font-semibold text-slate-700 flex items-center justify-between"
                >
                  <span>Gestor Contratante Responsável</span>
                  <span className="text-[11px] text-blue-600 font-normal">
                    Módulo de Acesso do Gestor
                  </span>
                </Label>
                <Select
                  value={gestorResponsavel || 'none'}
                  onValueChange={(val) => setGestorResponsavel(val === 'none' ? '' : val)}
                >
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione o gestor solicitante" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs text-slate-400">
                      Nenhum gestor atribuído
                    </SelectItem>
                    {gestoresList.map((u) => (
                      <SelectItem key={u.id} value={u.id} className="text-xs">
                        {u.name || u.email} {u.cargo_funcao ? `(${u.cargo_funcao})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-500">
                  O gestor vinculado terá acesso exclusivo ao portal Minhas Vagas para aprovação de
                  escopo e feedback dos candidatos.
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="descricao" className="text-xs font-semibold text-slate-700">
                Descrição do papel e desafios
              </Label>
              <Textarea
                id="descricao"
                rows={3}
                placeholder="Detalhes da oportunidade, escopo de responsabilidade e contexto do time..."
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            {/* Habilidades Técnicas com Peso (para o Matching) */}
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <Label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>Habilidades Técnicas (com peso p/ matching 1 a 5)</span>
                <span className="text-[11px] text-blue-600 font-normal">
                  Usado pelo agente de IA
                </span>
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Node.js, Go, Figma, Google Ads..."
                  value={inputHabNome}
                  onChange={(e) => setInputHabNome(e.target.value)}
                  className="text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addHabTecnica()
                    }
                  }}
                />
                <Select value={inputHabPeso} onValueChange={setInputHabPeso}>
                  <SelectTrigger className="w-[100px] text-xs">
                    <SelectValue placeholder="Peso" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5" className="text-xs">
                      Peso 5 (Máx)
                    </SelectItem>
                    <SelectItem value="4" className="text-xs">
                      Peso 4 (Alto)
                    </SelectItem>
                    <SelectItem value="3" className="text-xs">
                      Peso 3 (Médio)
                    </SelectItem>
                    <SelectItem value="2" className="text-xs">
                      Peso 2
                    </SelectItem>
                    <SelectItem value="1" className="text-xs">
                      Peso 1
                    </SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={addHabTecnica}
                  size="sm"
                  variant="secondary"
                  className="text-xs"
                >
                  Adicionar
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {habTecnicas.map((hab, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-800 text-xs font-medium border border-blue-200"
                  >
                    <span>
                      {hab.nome} (p:{hab.peso})
                    </span>
                    <button
                      type="button"
                      onClick={() => removeHabTecnica(idx)}
                      className="text-blue-500 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Competências Comportamentais */}
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <Label className="text-xs font-bold text-slate-900">
                Competências Comportamentais
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Liderança, Comunicação, Resolução de problemas..."
                  value={inputComp}
                  onChange={(e) => setInputComp(e.target.value)}
                  className="text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addComp()
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={addComp}
                  size="sm"
                  variant="secondary"
                  className="text-xs"
                >
                  Adicionar
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {compComportamentais.map((comp, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 text-purple-800 text-xs font-medium border border-purple-200"
                  >
                    <span>{comp}</span>
                    <button
                      type="button"
                      onClick={() => removeComp(idx)}
                      className="text-purple-500 hover:text-purple-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Requisitos Obrigatórios */}
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <Label className="text-xs font-bold text-slate-900">
                Requisitos Obrigatórios (Critérios eliminatórios)
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: 5+ anos com arquitetura backend..."
                  value={inputReqObrig}
                  onChange={(e) => setInputReqObrig(e.target.value)}
                  className="text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addReqObrig()
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={addReqObrig}
                  size="sm"
                  variant="secondary"
                  className="text-xs"
                >
                  Adicionar
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {reqObrigatorios.map((req, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 text-xs font-medium border border-slate-200"
                  >
                    <span>{req}</span>
                    <button
                      type="button"
                      onClick={() => removeReqObrig(idx)}
                      className="text-slate-500 hover:text-slate-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Status Selector */}
            <div className="space-y-1.5 border-t border-slate-200 pt-3">
              <Label className="text-xs font-semibold text-slate-700">Status da Vaga</Label>
              <Select
                value={status}
                onValueChange={(val) =>
                  setStatus(val as 'Ativa' | 'Pausada' | 'Preenchida' | 'Arquivada')
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativa" className="text-xs">
                    Ativa (Recebendo candidaturas)
                  </SelectItem>
                  <SelectItem value="Pausada" className="text-xs">
                    Pausada (Em revisão)
                  </SelectItem>
                  <SelectItem value="Preenchida" className="text-xs">
                    Preenchida (Fechada)
                  </SelectItem>
                  <SelectItem value="Arquivada" className="text-xs">
                    Arquivada
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : editingVaga ? (
                  'Salvar Alterações'
                ) : (
                  'Publicar Vaga'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
