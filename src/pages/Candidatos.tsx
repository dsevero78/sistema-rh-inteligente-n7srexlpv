import React, { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import { useRealtime } from '@/hooks/use-realtime'
import { extractFieldErrors } from '@/lib/pocketbase/errors'
import { candidatosTimelineService } from '@/services/candidatosTimeline'
import {
  Plus,
  Search,
  Filter,
  Users,
  Briefcase,
  MapPin,
  Sparkles,
  ExternalLink,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  Upload,
  X,
  Loader2,
  SlidersHorizontal,
  FileSpreadsheet,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import type { RecordModel } from 'pocketbase'

// Animated Matching Progress Ring
export function ScoreProgressRing({ score, size = 48 }: { score: number; size?: number }) {
  const strokeWidth = 4
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (score / 100) * circumference

  const color =
    score >= 75
      ? 'text-emerald-500 stroke-emerald-500'
      : score >= 50
        ? 'text-amber-500 stroke-amber-500'
        : 'text-rose-500 stroke-rose-500'

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg className="w-full h-full -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-slate-200"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className={`${color} transition-all duration-700 ease-out`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-slate-900 tabular-nums">{score}%</span>
    </div>
  )
}

export default function Candidatos() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { toast } = useToast()

  const [candidatos, setCandidatos] = useState<RecordModel[]>([])
  const [vagas, setVagas] = useState<RecordModel[]>([])
  const [entrevistasRealizadasCandIds, setEntrevistasRealizadasCandIds] = useState<Set<string>>(
    new Set(),
  )
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [vagaFilter, setVagaFilter] = useState(searchParams.get('vaga') || 'all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [minScore, setMinScore] = useState<number>(0)
  const [buscaSemantica, setBuscaSemantica] = useState(false)

  // Modal create/edit
  const [modalOpen, setModalOpen] = useState(false)
  const [editingCand, setEditingCand] = useState<RecordModel | null>(null)
  const [saving, setSaving] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Form states
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cargoAtual, setCargoAtual] = useState('')
  const [empresaAtual, setEmpresaAtual] = useState('')
  const [localizacao, setLocalizacao] = useState('')
  const [vagaId, setVagaId] = useState<string>('')
  const [canalOrigem, setCanalOrigem] = useState<string>('Página de Carreira')
  const [linkedin, setLinkedin] = useState('')
  const [github, setGithub] = useState('')
  const [resumo, setResumo] = useState('')
  const [candStatus, setCandStatus] = useState<string>('Triagem')

  // Lists
  const [habTecnicas, setHabTecnicas] = useState<string[]>([])
  const [inputHab, setInputHab] = useState('')

  const [compComportamentais, setCompComportamentais] = useState<string[]>([])
  const [inputComp, setInputComp] = useState('')

  const [idiomas, setIdiomas] = useState<string[]>([])
  const [inputIdioma, setInputIdioma] = useState('')

  // Experiências list
  const [experiencias, setExperiencias] = useState<
    Array<{ cargo: string; empresa: string; periodo: string; descricao: string }>
  >([])
  const [expCargo, setExpCargo] = useState('')
  const [expEmpresa, setExpEmpresa] = useState('')
  const [expPeriodo, setExpPeriodo] = useState('')
  const [expDesc, setExpDesc] = useState('')

  // Educação list
  const [educacao, setEducacao] = useState<
    Array<{ instituicao: string; curso: string; periodo: string }>
  >([])
  const [eduInst, setEduInst] = useState('')
  const [eduCurso, setEduCurso] = useState('')
  const [eduPeriodo, setEduPeriodo] = useState('')

  // File upload PDF & Vídeo
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [curriculoFile, setCurriculoFile] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoLink, setVideoLink] = useState('')

  const fetchData = async () => {
    try {
      const [cList, vList, eList] = await Promise.all([
        pb.collection('candidatos').getFullList({ sort: '-created', expand: 'vaga' }),
        pb.collection('vagas').getFullList({ sort: '-created' }),
        pb.collection('entrevistas').getFullList({
          filter: 'avaliacao_realizada = true',
          fields: 'candidato',
        }),
      ])
      const avaliadosSet = new Set(eList.map((e) => e.candidato as string))
      setEntrevistasRealizadasCandIds(avaliadosSet)
      setCandidatos(cList)
      setVagas(vList)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useRealtime('candidatos', () => fetchData())
  useRealtime('vagas', () => fetchData())
  useRealtime('entrevistas', () => fetchData())

  const openCreateModal = () => {
    setEditingCand(null)
    setNome('')
    setEmail('')
    setTelefone('')
    setCargoAtual('')
    setEmpresaAtual('')
    setLocalizacao('São Paulo, SP')
    setVagaId(vagas[0]?.id || '')
    setCanalOrigem('Indicação interna')
    setLinkedin('')
    setGithub('')
    setResumo('')
    setCandStatus('Triagem')
    setHabTecnicas([])
    setCompComportamentais([])
    setIdiomas(['Português (Nativo)'])
    setExperiencias([])
    setEducacao([])
    setCurriculoFile(null)
    setVideoFile(null)
    setVideoLink('')
    setFieldErrors({})
    setModalOpen(true)
  }

  const openEditModal = (c: RecordModel) => {
    setEditingCand(c)
    setNome(c.nome || '')
    setEmail(c.email || '')
    setTelefone(c.telefone || '')
    setCargoAtual(c.cargo_atual || '')
    setEmpresaAtual(c.empresa_atual || '')
    setLocalizacao(c.localizacao || '')
    setVagaId(c.vaga || '')
    setCanalOrigem(c.canal_origem || 'Outros canais')
    setLinkedin(c.linkedin || '')
    setGithub(c.github || '')
    setResumo(c.resumo || '')
    setCandStatus(c.status || 'Triagem')
    setHabTecnicas(Array.isArray(c.habilidades_tecnicas) ? c.habilidades_tecnicas : [])
    setCompComportamentais(
      Array.isArray(c.competencias_comportamentais) ? c.competencias_comportamentais : [],
    )
    setIdiomas(Array.isArray(c.idiomas) ? c.idiomas : [])
    setExperiencias(Array.isArray(c.experiencias) ? c.experiencias : [])
    setEducacao(Array.isArray(c.educacao) ? c.educacao : [])
    setCurriculoFile(null)
    setVideoFile(null)
    setVideoLink(c.video_link || '')
    setFieldErrors({})
    setModalOpen(true)
  }

  const handleSaveCandidato = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFieldErrors({})

    const formData = new FormData()
    formData.append('nome', nome)
    formData.append('email', email)
    formData.append('telefone', telefone)
    formData.append('cargo_atual', cargoAtual)
    formData.append('empresa_atual', empresaAtual)
    formData.append('localizacao', localizacao)
    formData.append('canal_origem', canalOrigem)
    if (vagaId) formData.append('vaga', vagaId)
    formData.append('linkedin', linkedin)
    formData.append('github', github)
    formData.append('resumo', resumo)
    formData.append('status', candStatus)
    formData.append('habilidades_tecnicas', JSON.stringify(habTecnicas))
    formData.append('competencias_comportamentais', JSON.stringify(compComportamentais))
    formData.append('idiomas', JSON.stringify(idiomas))
    formData.append('experiencias', JSON.stringify(experiencias))
    formData.append('educacao', JSON.stringify(educacao))
    if (!editingCand) {
      formData.append('score_semantico', '75')
    }
    formData.append('video_link', videoLink)
    if (curriculoFile) {
      formData.append('curriculo', curriculoFile)
    }
    if (videoFile) {
      const formatos = [
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'video/x-matroska',
        'video/ogg',
        'video/x-msvideo',
      ]
      const ext = '.' + (videoFile.name.split('.').pop() || '').toLowerCase()
      const extensoes = ['.mp4', '.webm', '.mov', '.mkv', '.ogg', '.avi']

      if (videoFile.type && !formatos.includes(videoFile.type) && !extensoes.includes(ext)) {
        toast({
          title: 'Formato de vídeo incompatível',
          description: 'Apenas arquivos de vídeo (.mp4, .webm, .mov) são permitidos.',
          variant: 'destructive',
        })
        setSaving(false)
        return
      }

      if (videoFile.size > 100 * 1024 * 1024) {
        toast({
          title: 'Vídeo excede o limite',
          description: `O arquivo tem ${(videoFile.size / (1024 * 1024)).toFixed(1)}MB. O limite máximo é de 100MB.`,
          variant: 'destructive',
        })
        setSaving(false)
        return
      }

      formData.append('video_apresentacao', videoFile)
    }

    try {
      if (editingCand) {
        await pb.collection('candidatos').update(editingCand.id, formData)
        toast({ title: 'Candidato atualizado com sucesso!' })
      } else {
        const novo = await pb.collection('candidatos').create(formData)
        // Also register in pipeline
        if (vagaId) {
          const pipeCriado = await pb.collection('pipeline').create({
            candidato: novo.id,
            vaga: vagaId,
            estagio: candStatus || 'Triagem',
            anotacoes: 'Candidato cadastrado manualmente pelo RH.',
            historico: [
              {
                data: new Date().toISOString(),
                estagio: candStatus || 'Triagem',
                autor: 'Time Gente & Gestão',
                nota: 'Candidatura adicionada.',
              },
            ],
          })

          // Registrar na timeline do candidato
          await candidatosTimelineService.registrarEventoSeguro({
            candidato: novo.id,
            categoria: 'CANDIDATURA',
            titulo: 'Candidatura registrada pelo RH:',
            complemento: `Cadastrado manualmente para a vaga no estágio "${candStatus || 'Triagem'}".`,
            autor: pb.authStore.record?.name || 'Gente & Gestão',
            origem: 'usuario',
            referencia_tipo: 'pipeline',
            referencia_id: pipeCriado.id,
          })
        }
        toast({ title: 'Candidato cadastrado com sucesso!' })
      }
      setModalOpen(false)
      fetchData()
    } catch (err: unknown) {
      const extracted = extractFieldErrors(err)
      if (Object.keys(extracted).length > 0) {
        setFieldErrors(extracted)
      } else {
        toast({
          title: 'Erro ao salvar candidato',
          description: err instanceof Error ? err.message : 'Falha na validação.',
          variant: 'destructive',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (candId: string) => {
    if (!confirm('Deseja realmente remover este candidato do banco de talentos?')) return
    try {
      await pb.collection('candidatos').delete(candId)
      toast({ title: 'Candidato removido com sucesso' })
      fetchData()
    } catch (err) {
      toast({ title: 'Erro ao excluir candidato', variant: 'destructive' })
    }
  }

  // Experiências add/remove
  const addExperiencia = () => {
    if (expCargo.trim() && expEmpresa.trim()) {
      setExperiencias([
        ...experiencias,
        {
          cargo: expCargo.trim(),
          empresa: expEmpresa.trim(),
          periodo: expPeriodo.trim(),
          descricao: expDesc.trim(),
        },
      ])
      setExpCargo('')
      setExpEmpresa('')
      setExpPeriodo('')
      setExpDesc('')
    }
  }
  const removeExperiencia = (idx: number) => {
    setExperiencias(experiencias.filter((_, i) => i !== idx))
  }

  // Educação add/remove
  const addEdu = () => {
    if (eduInst.trim() && eduCurso.trim()) {
      setEducacao([
        ...educacao,
        { instituicao: eduInst.trim(), curso: eduCurso.trim(), periodo: eduPeriodo.trim() },
      ])
      setEduInst('')
      setEduCurso('')
      setEduPeriodo('')
    }
  }
  const removeEdu = (idx: number) => {
    setEducacao(educacao.filter((_, i) => i !== idx))
  }

  // Filter logic
  const filteredCandidatos = useMemo(() => {
    return candidatos.filter((c) => {
      const q = search.toLowerCase()
      const matchesSearch =
        c.nome.toLowerCase().includes(q) ||
        c.cargo_atual?.toLowerCase().includes(q) ||
        c.empresa_atual?.toLowerCase().includes(q) ||
        c.localizacao?.toLowerCase().includes(q) ||
        (Array.isArray(c.habilidades_tecnicas) &&
          c.habilidades_tecnicas.some((h: string) => h.toLowerCase().includes(q)))

      const matchesVaga = vagaFilter === 'all' || c.vaga === vagaFilter
      const matchesStatus = statusFilter === 'all' || c.status === statusFilter
      const matchesScore = !minScore || (c.score_semantico || 70) >= minScore

      return matchesSearch && matchesVaga && matchesStatus && matchesScore
    })
  }, [candidatos, search, vagaFilter, statusFilter, minScore])

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      {/* Header Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div>
          <div className="font-display text-[11px] uppercase font-bold tracking-widest text-[#E9530E] mb-1">
            Gestão de Candidatos · SouYess People
          </div>
          <h1 className="font-display text-2xl sm:text-[26px] font-bold text-[#212B55] dark:text-[#F7F8FB] tracking-tight">
            Banco de Talentos
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Gerencie perfis, analise o score inteligente e acompanhe o avanço nos processos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => navigate('/importar?tipo=candidatos')}
            variant="outline"
            className="border-[#FBDCC9] dark:border-[#E9530E]/30 text-[#E9530E] bg-[#FEF1EA] dark:bg-[#E9530E]/10 font-bold hover:bg-[#FBDCC9] h-10 text-xs px-3"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
            Importar Planilha
          </Button>

          <Button
            onClick={openCreateModal}
            className="bg-[#E9530E] hover:bg-[#C5430A] text-white font-display font-bold shadow-xs h-10 text-xs px-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Candidato
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white dark:bg-[#1A2240] p-4 rounded-xl border border-slate-200/80 dark:border-[#2E3A6E] shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-400 absolute left-3 top-3" />
            <Input
              placeholder="Buscar por nome, cargo, empresa ou habilidade técnica..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 text-xs bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] dark:text-[#F7F8FB]"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Select value={vagaFilter} onValueChange={setVagaFilter}>
              <SelectTrigger className="w-[180px] h-10 text-xs bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] dark:text-[#F7F8FB]">
                <SelectValue placeholder="Filtrar por vaga" />
              </SelectTrigger>
              <SelectContent className="dark:bg-[#1A2240] dark:border-[#2E3A6E]">
                <SelectItem value="all" className="text-xs">
                  Todas as vagas
                </SelectItem>
                {vagas.map((v) => (
                  <SelectItem key={v.id} value={v.id} className="text-xs">
                    {v.titulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px] h-10 text-xs bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] dark:text-[#F7F8FB]">
                <SelectValue placeholder="Estágio" />
              </SelectTrigger>
              <SelectContent className="dark:bg-[#1A2240] dark:border-[#2E3A6E]">
                <SelectItem value="all" className="text-xs">
                  Todos estágios
                </SelectItem>
                <SelectItem value="Triagem" className="text-xs">
                  Triagem
                </SelectItem>
                <SelectItem value="Entrevista com RH" className="text-xs">
                  Entrevista com RH
                </SelectItem>
                <SelectItem value="Entrevista técnica" className="text-xs">
                  Entrevista técnica
                </SelectItem>
                <SelectItem value="Match técnico/comportamental (IA)" className="text-xs">
                  Match IA
                </SelectItem>
                <SelectItem value="Proposta" className="text-xs">
                  Proposta
                </SelectItem>
                <SelectItem value="Aprovado" className="text-xs">
                  Aprovado
                </SelectItem>
                <SelectItem value="Recusado" className="text-xs">
                  Recusado
                </SelectItem>
              </SelectContent>
            </Select>

            <Select value={String(minScore)} onValueChange={(val) => setMinScore(Number(val))}>
              <SelectTrigger className="w-[150px] h-10 text-xs bg-slate-50 dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] dark:text-[#F7F8FB]">
                <SelectValue placeholder="Score mínimo" />
              </SelectTrigger>
              <SelectContent className="dark:bg-[#1A2240] dark:border-[#2E3A6E]">
                <SelectItem value="0" className="text-xs">
                  Qualquer score
                </SelectItem>
                <SelectItem value="50" className="text-xs">
                  ≥ 50% de match
                </SelectItem>
                <SelectItem value="75" className="text-xs">
                  ≥ 75% (Alta aderência)
                </SelectItem>
                <SelectItem value="85" className="text-xs">
                  ≥ 85% (Excelente)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Semantic search toggle banner */}
        <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-[#2E3A6E] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#E9530E]" />
            <span>
              Matching Inteligente ativo: vetor semântico gerado automaticamente a partir do resumo
              e histórico.
            </span>
          </div>

          <span className="font-mono font-bold text-[#212B55] dark:text-[#F7F8FB] tabular-nums text-xs">
            {filteredCandidatos.length}{' '}
            {filteredCandidatos.length === 1 ? 'candidato encontrado' : 'candidatos encontrados'}
          </span>
        </div>
      </div>

      {/* Lista de Candidatos */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4 border-slate-200">
              <Skeleton className="h-12 w-full" />
            </Card>
          ))}
        </div>
      ) : filteredCandidatos.length === 0 ? (
        <div className="bg-white dark:bg-[#1A2240] rounded-2xl border-2 border-dashed border-slate-300 dark:border-[#2E3A6E] p-10 sm:p-14 text-center max-w-2xl mx-auto shadow-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#FEF1EA] dark:bg-[#E9530E]/20 text-[#E9530E] flex items-center justify-center mx-auto mb-4 shadow-xs">
            <Users className="w-8 h-8" />
          </div>
          <span className="font-display text-[10px] uppercase font-bold tracking-widest text-[#E9530E] bg-[#FEF1EA] dark:bg-[#E9530E]/20 px-2.5 py-0.5 rounded-full border border-[#FBDCC9] dark:border-[#E9530E]/30">
            Onboarding em 10 Minutos
          </span>
          <h3 className="text-base sm:text-lg font-bold text-[#212B55] dark:text-[#F7F8FB] mt-2 font-display">
            Nenhum candidato cadastrado ainda
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 leading-relaxed">
            Popule seu banco de talentos em segundos com nossa importação de planilhas (CSV ou
            Excel) e veja o ranking com IA e o funil de seleção funcionando.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Button
              onClick={() => navigate('/importar?tipo=candidatos')}
              className="bg-[#E9530E] hover:bg-[#C5430A] text-white text-xs font-bold shadow-xs px-5 h-9"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5" />
              Importar Candidatos via Planilha
            </Button>
            <Button
              onClick={openCreateModal}
              variant="outline"
              className="text-xs font-semibold border-slate-300 dark:border-[#2E3A6E] text-slate-700 dark:text-slate-300 h-9"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Cadastrar Manualmente
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredCandidatos.map((cand) => {
            const score = cand.score_semantico || 75
            const initials = cand.nome
              .split(' ')
              .map((n: string) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase()

            return (
              <Card
                key={cand.id}
                className="border-slate-200/90 dark:border-[#2E3A6E] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all bg-white dark:bg-[#1A2240] group"
              >
                <CardContent className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  {/* Left: Avatar + Details */}
                  <div
                    onClick={() => navigate(`/candidatos/${cand.id}`)}
                    className="flex items-center gap-3.5 min-w-0 cursor-pointer flex-1"
                  >
                    <div className="w-12 h-12 rounded-full bg-[#FEF1EA] dark:bg-[#212B55] text-[#E9530E] dark:text-[#F19763] font-display font-bold flex items-center justify-center text-sm shrink-0 border border-[#FBDCC9] dark:border-[#2E3A6E] shadow-xs">
                      {initials}
                    </div>

                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-display text-base font-bold text-[#212B55] dark:text-[#F7F8FB] group-hover:text-[#E9530E] transition-colors truncate">
                          {cand.nome}
                        </h3>
                        <Badge
                          variant="outline"
                          className="font-display text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#141B34] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-[#2E3A6E]"
                        >
                          {cand.status}
                        </Badge>

                        {cand.reprovado_triagem_auto && (
                          <Badge
                            variant="outline"
                            className="font-display text-xs bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 font-bold px-2 py-0.5 rounded-full"
                          >
                            Reprovado na Triagem
                          </Badge>
                        )}

                        {cand.video_status === 'analise_concluida' ? (
                          <Badge
                            variant="outline"
                            className="font-display text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-bold px-2 py-0.5 rounded-full"
                          >
                            Vídeo IA: {cand.video_score_geral || 90}/100
                          </Badge>
                        ) : cand.video_link || cand.video_apresentacao ? (
                          <Badge
                            variant="outline"
                            className="font-display text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-bold px-2 py-0.5 rounded-full"
                          >
                            Vídeo Disponível
                          </Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 truncate">
                        <span className="font-semibold text-slate-800 dark:text-slate-100">
                          {cand.cargo_atual || 'Profissional'}
                        </span>
                        {cand.empresa_atual && <span> em {cand.empresa_atual}</span>}
                        {cand.localizacao && <span> · {cand.localizacao}</span>}
                        {cand.canal_origem && (
                          <span className="text-slate-400 dark:text-slate-400">
                            {' '}
                            · Origem: {cand.canal_origem}
                          </span>
                        )}
                      </p>

                      <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate flex items-center gap-1">
                        <Briefcase className="w-3 h-3" />
                        <span>{cand.expand?.vaga?.titulo || 'Sem vaga associada'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: Score + Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-6 w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-[#2E3A6E]">
                    {/* Matching Progress Ring */}
                    <div className="flex items-center gap-2.5">
                      <ScoreProgressRing score={score} size={44} />
                      <div className="flex flex-col text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-[11px] uppercase font-bold text-[#6B7384] dark:text-slate-400 tracking-wider">
                            Match IA
                          </span>
                          {entrevistasRealizadasCandIds.has(cand.id) && (
                            <span className="font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                              Ajustado
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white tabular-nums">
                            {score}%
                          </span>
                          <span
                            className={`text-xs font-semibold ${
                              score >= 75
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : score >= 50
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-rose-600 dark:text-rose-400'
                            }`}
                          >
                            ·{' '}
                            {score >= 75
                              ? 'Alta aderência'
                              : score >= 50
                                ? 'Média aderência'
                                : 'Baixa aderência'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className={`text-xs font-semibold h-8 border transition-all ${
                          cand.banco_talentos
                            ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                            : 'border-slate-200 text-slate-600 hover:text-amber-600'
                        }`}
                        title={
                          cand.banco_talentos
                            ? 'No Banco de Talentos'
                            : 'Adicionar ao Banco de Talentos'
                        }
                        onClick={async (e) => {
                          e.stopPropagation()
                          const novoStatus = !cand.banco_talentos
                          try {
                            await pb.collection('candidatos').update(cand.id, {
                              banco_talentos: novoStatus,
                              data_adicao_banco: novoStatus ? new Date().toISOString() : null,
                              motivo_banco_talentos: novoStatus
                                ? cand.motivo_banco_talentos || 'Destacado para futuras vagas'
                                : cand.motivo_banco_talentos,
                            })
                            toast({
                              title: novoStatus
                                ? 'Adicionado ao Banco de Talentos!'
                                : 'Removido do Banco de Talentos',
                            })
                            fetchData()
                          } catch (err) {
                            toast({ title: 'Erro ao atualizar', variant: 'destructive' })
                          }
                        }}
                      >
                        <Sparkles
                          className={`w-3.5 h-3.5 mr-1 ${
                            cand.banco_talentos ? 'fill-amber-400 text-amber-500' : 'text-slate-400'
                          }`}
                        />
                        {cand.banco_talentos ? 'Talento ★' : 'Guardar'}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/candidatos/${cand.id}`)}
                        className="text-xs font-semibold h-8 border-slate-200 text-slate-700 hover:text-blue-600"
                      >
                        Ver Perfil
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>

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
                            onClick={() => navigate(`/candidatos/${cand.id}`)}
                            className="cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 mr-2 text-blue-600" />
                            Visualizar dossiê completo
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openEditModal(cand)}
                            className="cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5 mr-2 text-slate-500" />
                            Editar dados cadastrais
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(cand.id)}
                            className="text-red-600 cursor-pointer focus:text-red-600"
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Excluir candidato
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Adicionar / Editar Candidato */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="font-display text-[11px] uppercase font-bold tracking-widest text-[#E9530E]">
              {editingCand ? 'Dossiê do Profissional' : 'Novo Perfil Profissional'}
            </div>
            <DialogTitle className="font-display text-lg sm:text-xl font-bold text-[#212B55] dark:text-[#F7F8FB]">
              {editingCand ? 'Editar Candidato' : 'Cadastrar Novo Candidato'}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
              Preencha os dados profissionais para alimentar o perfil e o cálculo de matching
              inteligente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCandidato} className="space-y-4 py-2">
            {/* Dados Básicos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="nome" className="text-xs font-semibold text-slate-700">
                  Nome completo *
                </Label>
                <Input
                  id="nome"
                  placeholder="Ex: Mariana Silva"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className={`text-xs ${fieldErrors.nome ? 'border-red-500' : ''}`}
                  required
                />
                {fieldErrors.nome && <p className="text-xs text-red-600">{fieldErrors.nome}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Email profissional *
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="mariana@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`text-xs ${fieldErrors.email ? 'border-red-500' : ''}`}
                  required
                />
                {fieldErrors.email && <p className="text-xs text-red-600">{fieldErrors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telefone" className="text-xs font-semibold text-slate-700">
                  Telefone / WhatsApp
                </Label>
                <Input
                  id="telefone"
                  placeholder="(11) 99999-9999"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cargoAtual" className="text-xs font-semibold text-slate-700">
                  Cargo atual
                </Label>
                <Input
                  id="cargoAtual"
                  placeholder="Ex: Engenheiro de Software Pleno"
                  value={cargoAtual}
                  onChange={(e) => setCargoAtual(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="empresaAtual" className="text-xs font-semibold text-slate-700">
                  Empresa atual
                </Label>
                <Input
                  id="empresaAtual"
                  placeholder="Ex: Tech Corp"
                  value={empresaAtual}
                  onChange={(e) => setEmpresaAtual(e.target.value)}
                  className="text-xs"
                />
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
                <Label htmlFor="vaga" className="text-xs font-semibold text-slate-700">
                  Vaga associada
                </Label>
                <Select value={vagaId} onValueChange={setVagaId}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione a vaga" />
                  </SelectTrigger>
                  <SelectContent>
                    {vagas.map((v) => (
                      <SelectItem key={v.id} value={v.id} className="text-xs">
                        {v.titulo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700">Canal de Origem</Label>
                <Select value={canalOrigem} onValueChange={setCanalOrigem}>
                  <SelectTrigger className="text-xs">
                    <SelectValue placeholder="Selecione o canal" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Página de Carreira" className="text-xs">
                      Página de Carreira
                    </SelectItem>
                    <SelectItem value="LinkedIn" className="text-xs">
                      LinkedIn
                    </SelectItem>
                    <SelectItem value="Indicação" className="text-xs">
                      Indicação (Programa de Talentos)
                    </SelectItem>
                    <SelectItem value="Indicação interna" className="text-xs">
                      Indicação interna
                    </SelectItem>
                    <SelectItem value="Site da empresa" className="text-xs">
                      Site da empresa
                    </SelectItem>
                    <SelectItem value="Banco de talentos" className="text-xs">
                      Banco de talentos
                    </SelectItem>
                    <SelectItem value="Outros canais" className="text-xs">
                      Outros canais
                    </SelectItem>{' '}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="linkedin" className="text-xs font-semibold text-slate-700">
                  LinkedIn (URL)
                </Label>
                <Input
                  id="linkedin"
                  placeholder="https://linkedin.com/in/usuario"
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                  className="text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="github" className="text-xs font-semibold text-slate-700">
                  GitHub / Portfólio (URL)
                </Label>
                <Input
                  id="github"
                  placeholder="https://github.com/usuario"
                  value={github}
                  onChange={(e) => setGithub(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            {/* Currículo PDF Upload */}
            <div className="space-y-1.5 border-t border-slate-200 pt-3">
              <Label className="text-xs font-semibold text-slate-700">
                Currículo em PDF (máx. 10MB)
              </Label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setCurriculoFile(e.target.files[0])
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs border-slate-300"
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                  {curriculoFile ? 'Substituir PDF' : 'Anexar arquivo PDF'}
                </Button>
                {curriculoFile && (
                  <span className="text-xs text-slate-600 truncate max-w-xs font-medium">
                    {curriculoFile.name}
                  </span>
                )}
              </div>
            </div>

            {/* MÓDULO 3: Vídeo de Apresentação (Upload ou Link Externo) */}
            <div className="space-y-3 border-t border-slate-200 pt-3 bg-blue-50/40 p-3 rounded-lg border">
              <Label className="text-xs font-bold text-slate-900 flex items-center justify-between">
                <span>Vídeo de Apresentação do Candidato</span>
                <span className="text-[11px] text-blue-600 font-normal">
                  Formatos: MP4, WebM, MOV · Até 100 MB
                </span>
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-700 block">
                    Opção A: Upload do arquivo (.mp4, .webm, .mov)
                  </span>
                  <input
                    type="file"
                    ref={videoInputRef}
                    accept="video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0] || null
                      if (f) {
                        const formatos = [
                          'video/mp4',
                          'video/webm',
                          'video/quicktime',
                          'video/x-matroska',
                          'video/ogg',
                          'video/x-msvideo',
                        ]
                        const ext = '.' + (f.name.split('.').pop() || '').toLowerCase()
                        const extensoes = ['.mp4', '.webm', '.mov', '.mkv', '.ogg', '.avi']
                        if (f.type && !formatos.includes(f.type) && !extensoes.includes(ext)) {
                          toast({
                            title: 'Formato inválido',
                            description:
                              'Por favor selecione um arquivo em formato MP4, WebM ou MOV.',
                            variant: 'destructive',
                          })
                          e.target.value = ''
                          setVideoFile(null)
                          return
                        }
                        if (f.size > 100 * 1024 * 1024) {
                          toast({
                            title: 'Arquivo muito grande',
                            description: `O arquivo tem ${(f.size / (1024 * 1024)).toFixed(1)}MB. O limite máximo permitido é de 100 MB.`,
                            variant: 'destructive',
                          })
                          e.target.value = ''
                          setVideoFile(null)
                          return
                        }
                        setVideoFile(f)
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => videoInputRef.current?.click()}
                    className="text-xs border-slate-300 bg-white w-full justify-start"
                  >
                    <Upload className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                    {videoFile ? 'Substituir Vídeo' : 'Anexar Vídeo (MP4, WebM, MOV)'}
                  </Button>
                  {videoFile && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-[11px] text-emerald-700 font-medium truncate">
                        ✓ {videoFile.name} ({(videoFile.size / (1024 * 1024)).toFixed(1)}MB)
                      </p>
                      <video
                        src={URL.createObjectURL(videoFile)}
                        controls
                        className="w-full rounded-md max-h-32 bg-black object-contain"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-slate-700 block">
                    Opção B: Ou link externo (YouTube/Loom/Drive)
                  </span>
                  <Input
                    placeholder="https://loom.com/share/... ou YouTube"
                    value={videoLink}
                    onChange={(e) => setVideoLink(e.target.value)}
                    className="text-xs bg-white"
                  />
                  <p className="text-[11px] text-slate-500">
                    Insira a URL pública do vídeo caso o arquivo esteja na nuvem.
                  </p>
                </div>
              </div>
            </div>

            {/* Resumo Profissional */}
            <div className="space-y-1.5 border-t border-slate-200 pt-3">
              <Label htmlFor="resumo" className="text-xs font-semibold text-slate-700">
                Resumo profissional e realizações
              </Label>
              <Textarea
                id="resumo"
                rows={3}
                placeholder="Principais entregas, anos de experiência, liderança e conquistas relevantes..."
                value={resumo}
                onChange={(e) => setResumo(e.target.value)}
                className="text-xs resize-none"
              />
            </div>

            {/* Habilidades Técnicas Tags */}
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <Label className="text-xs font-bold text-slate-900">Habilidades Técnicas</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: React, Node.js, SQL, AWS..."
                  value={inputHab}
                  onChange={(e) => setInputHab(e.target.value)}
                  className="text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (inputHab.trim()) {
                        setHabTecnicas([...habTecnicas, inputHab.trim()])
                        setInputHab('')
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="text-xs"
                  onClick={() => {
                    if (inputHab.trim()) {
                      setHabTecnicas([...habTecnicas, inputHab.trim()])
                      setInputHab('')
                    }
                  }}
                >
                  Adicionar
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {habTecnicas.map((h, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 text-xs font-medium border border-blue-200"
                  >
                    <span>{h}</span>
                    <button
                      type="button"
                      onClick={() => setHabTecnicas(habTecnicas.filter((_, idx) => idx !== i))}
                      className="text-blue-500 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Competências Comportamentais Tags */}
            <div className="space-y-2 border-t border-slate-200 pt-3">
              <Label className="text-xs font-bold text-slate-900">
                Competências Comportamentais
              </Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Ex: Autonomia, Comunicação assertiva..."
                  value={inputComp}
                  onChange={(e) => setInputComp(e.target.value)}
                  className="text-xs flex-1"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      if (inputComp.trim()) {
                        setCompComportamentais([...compComportamentais, inputComp.trim()])
                        setInputComp('')
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="text-xs"
                  onClick={() => {
                    if (inputComp.trim()) {
                      setCompComportamentais([...compComportamentais, inputComp.trim()])
                      setInputComp('')
                    }
                  }}
                >
                  Adicionar
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {compComportamentais.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-purple-50 text-purple-800 text-xs font-medium border border-purple-200"
                  >
                    <span>{c}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setCompComportamentais(compComportamentais.filter((_, idx) => idx !== i))
                      }
                      className="text-purple-500 hover:text-purple-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Experiências Profissionais */}
            <div className="space-y-3 border-t border-slate-200 pt-3">
              <Label className="text-xs font-bold text-slate-900">
                Experiências Profissionais Anteriores
              </Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <Input
                  placeholder="Cargo (ex: Dev Sênior)"
                  value={expCargo}
                  onChange={(e) => setExpCargo(e.target.value)}
                  className="text-xs bg-white"
                />
                <Input
                  placeholder="Empresa"
                  value={expEmpresa}
                  onChange={(e) => setExpEmpresa(e.target.value)}
                  className="text-xs bg-white"
                />
                <Input
                  placeholder="Período (ex: 2021 - Presente)"
                  value={expPeriodo}
                  onChange={(e) => setExpPeriodo(e.target.value)}
                  className="text-xs bg-white"
                />
                <div className="sm:col-span-3 flex gap-2">
                  <Input
                    placeholder="Descrição breve de realizações..."
                    value={expDesc}
                    onChange={(e) => setExpDesc(e.target.value)}
                    className="text-xs bg-white flex-1"
                  />
                  <Button
                    type="button"
                    onClick={addExperiencia}
                    size="sm"
                    variant="secondary"
                    className="text-xs"
                  >
                    Adicionar
                  </Button>
                </div>
              </div>

              {experiencias.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {experiencias.map((exp, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded bg-slate-100 text-xs"
                    >
                      <div>
                        <span className="font-bold text-slate-800">{exp.cargo}</span> em{' '}
                        {exp.empresa} ({exp.periodo})
                      </div>
                      <button
                        type="button"
                        onClick={() => removeExperiencia(i)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Estágio no Pipeline */}
            <div className="space-y-1.5 border-t border-slate-200 pt-3">
              <Label className="text-xs font-semibold text-slate-700">
                Estágio Inicial no Pipeline
              </Label>
              <Select value={candStatus} onValueChange={setCandStatus}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Triagem" className="text-xs">
                    Triagem
                  </SelectItem>
                  <SelectItem value="Entrevista com RH" className="text-xs">
                    Entrevista com RH
                  </SelectItem>
                  <SelectItem value="Entrevista técnica" className="text-xs">
                    Entrevista técnica
                  </SelectItem>
                  <SelectItem value="Match técnico/comportamental (IA)" className="text-xs">
                    Match técnico/comportamental (IA)
                  </SelectItem>
                  <SelectItem value="Proposta" className="text-xs">
                    Proposta
                  </SelectItem>
                  <SelectItem value="Aprovado" className="text-xs">
                    Aprovado
                  </SelectItem>
                  <SelectItem value="Recusado" className="text-xs">
                    Recusado
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
                ) : editingCand ? (
                  'Salvar Alterações'
                ) : (
                  'Cadastrar Candidato'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
