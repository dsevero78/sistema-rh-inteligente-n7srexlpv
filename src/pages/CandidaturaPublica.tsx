import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  Briefcase,
  MapPin,
  Clock,
  DollarSign,
  Building2,
  CheckCircle2,
  AlertCircle,
  Upload,
  Video,
  FileText,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
  Send,
  X,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'

interface VagaPublica {
  id: string
  titulo: string
  departamento: string
  localizacao: string
  modalidade: string
  faixa_salarial: string
  descricao: string
  requisitos_obrigatorios: string[]
  requisitos_desejaveis: string[]
  habilidades_tecnicas: Array<{ nome: string; peso?: number } | string>
  competencias_comportamentais: string[]
}

interface PerguntaTriagem {
  id: string
  enunciado: string
  tipo: 'sim_nao' | 'escolha_unica' | 'numero' | 'texto'
  opcoes?: string[]
  eliminatoria?: boolean
}

interface QuestionarioPublico {
  id: string
  titulo: string
  descricao: string
  perguntas: PerguntaTriagem[]
}

export default function CandidaturaPublica() {
  const { vagaId } = useParams<{ vagaId?: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  // Estados de listagem e seleção
  const [vagas, setVagas] = useState<VagaPublica[]>([])
  const [vagaSelecionada, setVagaSelecionada] = useState<VagaPublica | null>(null)
  const [questionario, setQuestionario] = useState<QuestionarioPublico | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingVaga, setLoadingVaga] = useState(false)

  // Formulário: Dados Pessoais
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [cargoAtual, setCargoAtual] = useState('')
  const [linkedin, setLinkedin] = useState('')
  const [github, setGithub] = useState('')
  const [resumo, setResumo] = useState('')

  // Habilidades e Experiências
  const [habilidadesInput, setHabilidadesInput] = useState('')
  const [habilidadesLista, setHabilidadesLista] = useState<string[]>([])
  const [experienciasTexto, setExperienciasTexto] = useState('')

  // Arquivos: Currículo PDF
  const curriculoInputRef = useRef<HTMLInputElement>(null)
  const [curriculoFile, setCurriculoFile] = useState<File | null>(null)

  // Vídeo de Apresentação: Arquivo ou Link Externo
  const [tipoVideo, setTipoVideo] = useState<'upload' | 'link'>('upload')
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoLink, setVideoLink] = useState('')

  // Respostas do Questionário de Triagem
  const [respostasTriagem, setRespostasTriagem] = useState<Record<string, any>>({})

  // Consentimento LGPD
  const [consentimentoLgpd, setConsentimentoLgpd] = useState(false)

  // Submissão
  const [submetendo, setSubmetendo] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [sucessoMensagem, setSucessoMensagem] = useState('')
  const [jaCandidatadoAviso, setJaCandidatadoAviso] = useState(false)

  // Carregar vagas disponíveis
  useEffect(() => {
    const carregarVagas = async () => {
      try {
        const url = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/public/vagas`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setVagas(data.items || [])
        }
      } catch (err) {
        console.error('Falha ao buscar vagas públicas:', err)
      } finally {
        setLoading(false)
      }
    }

    carregarVagas()
  }, [])

  // Carregar detalhes da vaga e questionário quando vagaId mudar ou for selecionada
  useEffect(() => {
    const targetId = vagaId || (vagas.length === 1 ? vagas[0].id : null)
    if (!targetId) return

    const carregarDetalhes = async () => {
      setLoadingVaga(true)
      try {
        const url = `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/public/vagas/${targetId}`
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setVagaSelecionada(data.vaga)
          setQuestionario(data.questionario)

          // Inicializar respostas
          if (data.questionario && Array.isArray(data.questionario.perguntas)) {
            const initialMap: Record<string, any> = {}
            data.questionario.perguntas.forEach((p: PerguntaTriagem) => {
              if (p.tipo === 'sim_nao') initialMap[p.id] = 'Sim'
              else if (p.tipo === 'escolha_unica') initialMap[p.id] = p.opcoes?.[0] || ''
              else initialMap[p.id] = ''
            })
            setRespostasTriagem(initialMap)
          }
        }
      } catch (err) {
        console.error('Falha ao carregar detalhes da vaga pública:', err)
      } finally {
        setLoadingVaga(false)
      }
    }

    carregarDetalhes()
  }, [vagaId, vagas])

  // Adicionar Habilidade
  const handleAddHabilidade = () => {
    const limpo = habilidadesInput.trim()
    if (!limpo) return
    if (!habilidadesLista.includes(limpo)) {
      setHabilidadesLista([...habilidadesLista, limpo])
    }
    setHabilidadesInput('')
  }

  const handleRemoveHabilidade = (hab: string) => {
    setHabilidadesLista(habilidadesLista.filter((h) => h !== hab))
  }

  // Manipular Respostas de Triagem
  const handleRespostaChange = (perguntaId: string, valor: any) => {
    setRespostasTriagem((prev) => ({
      ...prev,
      [perguntaId]: valor,
    }))
  }

  // Submissão do Formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!vagaSelecionada) {
      toast({
        title: 'Selecione uma vaga',
        description: 'Por favor, escolha uma vaga para se candidatar.',
        variant: 'destructive',
      })
      return
    }

    if (!nome.trim() || !email.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Nome completo e e-mail são obrigatórios.',
        variant: 'destructive',
      })
      return
    }

    if (!consentimentoLgpd) {
      toast({
        title: 'Consentimento obrigatório',
        description:
          'É necessário autorizar o tratamento de dados pessoais conforme a LGPD para prosseguir.',
        variant: 'destructive',
      })
      return
    }

    setSubmetendo(true)
    setJaCandidatadoAviso(false)

    try {
      const formData = new FormData()
      formData.append('nome', nome.trim())
      formData.append('email', email.trim().toLowerCase())
      formData.append('telefone', telefone.trim())
      formData.append('vagaId', vagaSelecionada.id)
      formData.append('cargoAtual', cargoAtual.trim())
      formData.append('linkedin', linkedin.trim())
      formData.append('github', github.trim())
      formData.append('resumo', resumo.trim())
      formData.append('consentimento_lgpd', 'true')

      // Habilidades
      formData.append('habilidades_tecnicas', JSON.stringify(habilidadesLista))

      // Experiências em formato estruturado
      if (experienciasTexto.trim()) {
        formData.append(
          'experiencias',
          JSON.stringify([
            {
              empresa: 'Trajetória Profissional',
              cargo: cargoAtual || 'Candidato',
              descricao: experienciasTexto.trim(),
            },
          ]),
        )
      }

      // Currículo
      if (curriculoFile) {
        formData.append('curriculo', curriculoFile)
      }

      // Vídeo de apresentação
      if (tipoVideo === 'upload' && videoFile) {
        formData.append('video_apresentacao', videoFile)
      } else if (tipoVideo === 'link' && videoLink.trim()) {
        formData.append('videoLink', videoLink.trim())
      }

      // Questionário de triagem formatado
      if (questionario && questionario.perguntas.length > 0) {
        const respostasArray = questionario.perguntas.map((p) => ({
          perguntaId: p.id,
          resposta: respostasTriagem[p.id],
        }))
        formData.append('respostas_triagem', JSON.stringify(respostasArray))
      }

      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/public/candidatar`,
        {
          method: 'POST',
          body: formData,
        },
      )

      const result = await res.json()

      if (res.status === 409) {
        // E-mail duplicado na mesma vaga
        setJaCandidatadoAviso(true)
        setSucessoMensagem(result.error)
        setSucesso(true)
        return
      }

      if (!res.ok) {
        throw new Error(result.error || 'Falha ao processar candidatura')
      }

      setSucesso(true)
      setSucessoMensagem(
        result.mensagem ||
          'Candidatura submetida com sucesso! Nosso time de Gente & Gestão entrará em contato.',
      )
    } catch (err: any) {
      toast({
        title: 'Falha no envio da candidatura',
        description:
          err.message || 'Ocorreu um erro ao enviar. Verifique os dados e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmetendo(false)
    }
  }

  // TELA DE SUCESSO
  if (sucesso) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
        {/* Cabeçalho Institucional */}
        <header className="bg-[#0F172A] text-white border-b border-slate-800">
          <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#1D4ED8] flex items-center justify-center font-bold text-white shadow-xs">
                RH
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">Portal de Carreiras</h1>
                <p className="text-[11px] text-slate-400">
                  Gente & Gestão · Oportunidades Oficiais
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Card de Confirmação */}
        <main className="max-w-2xl mx-auto px-4 py-16 flex-1 flex items-center">
          <Card className="border-slate-200/90 shadow-lg bg-white p-8 text-center space-y-6 rounded-2xl w-full">
            <div
              className={`w-16 h-16 rounded-full mx-auto flex items-center justify-center ${
                jaCandidatadoAviso
                  ? 'bg-amber-100 text-amber-600'
                  : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {jaCandidatadoAviso ? (
                <AlertCircle className="w-8 h-8" />
              ) : (
                <CheckCircle2 className="w-8 h-8" />
              )}
            </div>

            <div className="space-y-2">
              <Badge
                variant="outline"
                className={`text-xs px-3 py-1 font-semibold ${
                  jaCandidatadoAviso
                    ? 'border-amber-300 bg-amber-50 text-amber-800'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-800'
                }`}
              >
                {jaCandidatadoAviso ? 'Candidatura Já Registrada' : 'Candidatura Recebida'}
              </Badge>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                {jaCandidatadoAviso
                  ? 'Identificamos sua candidatura!'
                  : 'Tudo pronto! Sua candidatura foi enviada com sucesso.'}
              </h2>
              <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed pt-2">
                {sucessoMensagem}
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-5 text-left text-xs text-slate-600 space-y-2.5">
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#1D4ED8]" />
                Próximas Etapas do Processo Seletivo
              </div>
              <p className="leading-relaxed">
                1. <strong>Confirmação de recebimento:</strong> Enviamos uma mensagem de confirmação
                para <strong>{email}</strong>.
              </p>
              <p className="leading-relaxed">
                2. <strong>Triagem e Avaliação de Perfil:</strong> Nosso time de Gente & Gestão e a
                liderança contratante avaliarão seu currículo, competências e vídeo de apresentação.
              </p>
              <p className="leading-relaxed">
                3. <strong>Atualizações automáticas de status:</strong> A cada avanço no pipeline,
                você receberá notificações cordiais por e-mail informando o progresso da sua
                candidatura.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                variant="outline"
                className="w-full sm:w-auto text-xs border-slate-300"
                onClick={() => {
                  setSucesso(false)
                  navigate('/candidatar')
                }}
              >
                Ver outras vagas abertas
              </Button>
              <Link to="/candidatar" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto text-xs bg-[#1D4ED8] hover:bg-blue-700 text-white">
                  Voltar à Página Inicial
                </Button>
              </Link>
            </div>
          </Card>
        </main>

        {/* Rodapé LGPD */}
        <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>© {new Date().getFullYear()} Sistema RH Inteligente · Gente & Gestão</span>
            <span className="flex items-center gap-1.5 text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Processamento seguro em conformidade com a LGPD (Lei nº 13.709/2018)
            </span>
          </div>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-between">
      {/* Top Banner Institucional Premium */}
      <header className="bg-[#0F172A] text-white border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#1D4ED8] flex items-center justify-center font-bold text-white shadow-xs">
              RH
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold tracking-tight">Portal de Carreiras</h1>
                <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  Vagas Abertas
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                Gente & Gestão · Venha construir o futuro conosco
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-slate-300 hover:text-white hover:bg-slate-800"
              >
                Acesso Interno (RH)
                <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex-1 w-full space-y-8">
        {/* Seção 1: Seleção de Vagas Aprovadas */}
        <section className="space-y-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#1D4ED8] bg-blue-50 px-2.5 py-1 rounded">
              Oportunidades em Aberto
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-2">
              Escolha a oportunidade desejada e candidate-se
            </h2>
            <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
              Nosso processo seletivo valoriza suas habilidades práticas, experiências e
              autenticidade. Preencha o formulário, responda à triagem da vaga e compartilhe seu
              vídeo de apresentação.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-5">
                  <Skeleton className="h-5 w-40 mb-3" />
                  <Skeleton className="h-4 w-28 mb-4" />
                  <Skeleton className="h-16 w-full" />
                </Card>
              ))}
            </div>
          ) : vagas.length === 0 ? (
            <Card className="p-8 text-center bg-white border-slate-200">
              <Briefcase className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800">
                Nenhuma vaga pública aberta no momento
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Todas as nossas posições foram preenchidas recentemente. Novas oportunidades serão
                publicadas em breve.
              </p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vagas.map((v) => {
                const isSelected = vagaSelecionada?.id === v.id
                return (
                  <Card
                    key={v.id}
                    onClick={() => {
                      setVagaSelecionada(v)
                      navigate(`/candidatar/${v.id}`)
                    }}
                    className={`cursor-pointer transition-all duration-200 p-5 rounded-xl border flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#1D4ED8] bg-blue-50/40 shadow-md ring-2 ring-[#1D4ED8]/30'
                        : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className="text-[10px] font-bold border-slate-200 bg-slate-50 text-slate-700"
                        >
                          {v.departamento || 'Geral'}
                        </Badge>
                        <Badge
                          className={`text-[10px] font-semibold ${
                            v.modalidade === 'Remoto'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {v.modalidade || 'Híbrido'}
                        </Badge>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 group-hover:text-[#1D4ED8] transition-colors leading-snug">
                        {v.titulo}
                      </h3>

                      <div className="mt-2.5 flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        {v.localizacao && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {v.localizacao}
                          </span>
                        )}
                        {v.faixa_salarial && (
                          <span className="flex items-center gap-1 text-slate-700 font-medium">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            {v.faixa_salarial}
                          </span>
                        )}
                      </div>

                      {v.descricao && (
                        <p className="mt-3 text-xs text-slate-600 line-clamp-3 leading-relaxed">
                          {v.descricao}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-[#1D4ED8]' : 'text-slate-500'
                        }`}
                      >
                        {isSelected ? 'Vaga selecionada ✓' : 'Ver requisitos e candidatar'}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 transition-transform ${
                          isSelected ? 'text-[#1D4ED8] translate-x-1' : 'text-slate-400'
                        }`}
                      />
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        {/* Seção 2: Formulário de Candidatura Completo */}
        {vagaSelecionada && (
          <section className="space-y-6 pt-4 border-t border-slate-200 animate-in fade-in-50 duration-300">
            {/* Resumo da Vaga Selecionada */}
            <Card className="border-blue-200 bg-linear-to-r from-blue-50/70 via-white to-white p-6 shadow-xs rounded-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#1D4ED8]">
                      Candidatura Aberta para
                    </span>
                    <Badge className="bg-[#1D4ED8] text-white text-[10px]">Ativa</Badge>
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                    {vagaSelecionada.titulo}
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-slate-600 mt-2 flex-wrap">
                    <span className="flex items-center gap-1 font-medium">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {vagaSelecionada.departamento}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      {vagaSelecionada.localizacao}
                    </span>
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {vagaSelecionada.modalidade}
                    </span>
                    {vagaSelecionada.faixa_salarial && (
                      <span className="flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                        {vagaSelecionada.faixa_salarial}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">Canal de Inscrição:</span>
                  <span className="text-xs font-bold text-slate-900">
                    Página de Carreira Oficial
                  </span>
                </div>
              </div>

              {/* Requisitos em destaque */}
              <div className="mt-5 pt-4 border-t border-blue-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {Array.isArray(vagaSelecionada.requisitos_obrigatorios) &&
                  vagaSelecionada.requisitos_obrigatorios.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#1D4ED8]" />
                        Requisitos Obrigatórios:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                        {vagaSelecionada.requisitos_obrigatorios.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                {Array.isArray(vagaSelecionada.requisitos_desejaveis) &&
                  vagaSelecionada.requisitos_desejaveis.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        Requisitos Desejáveis:
                      </span>
                      <ul className="list-disc list-inside space-y-1 text-slate-600 pl-1">
                        {vagaSelecionada.requisitos_desejaveis.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            </Card>

            {/* FORMULÁRIO */}
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* BLOCO 1: Dados Pessoais & Contato */}
              <Card className="border-slate-200 shadow-xs bg-white p-6 rounded-xl space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-blue-50 text-[#1D4ED8] flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Dados Pessoais e Contato</h4>
                    <p className="text-[11px] text-slate-500">
                      Informações para identificação e comunicação sobre o processo seletivo
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Nome Completo *</Label>
                    <Input
                      required
                      placeholder="Ex: Mariana Albuquerque da Silva"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="text-xs bg-slate-50/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      E-mail Profissional *
                    </Label>
                    <Input
                      required
                      type="email"
                      placeholder="Ex: mariana.silva@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="text-xs bg-slate-50/50"
                    />
                    <span className="text-[10px] text-slate-400">
                      Você receberá as notificações e confirmações por este e-mail.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Telefone / WhatsApp *
                    </Label>
                    <Input
                      required
                      placeholder="Ex: (11) 98765-4321"
                      value={telefone}
                      onChange={(e) => setTelefone(e.target.value)}
                      className="text-xs bg-slate-50/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Cargo / Função Atual
                    </Label>
                    <Input
                      placeholder="Ex: Desenvolvedora Backend Pleno / Product Designer"
                      value={cargoAtual}
                      onChange={(e) => setCargoAtual(e.target.value)}
                      className="text-xs bg-slate-50/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">LinkedIn (URL)</Label>
                    <Input
                      type="url"
                      placeholder="https://linkedin.com/in/mariana-silva"
                      value={linkedin}
                      onChange={(e) => setLinkedin(e.target.value)}
                      className="text-xs bg-slate-50/50"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      GitHub ou Portfólio (URL)
                    </Label>
                    <Input
                      type="url"
                      placeholder="https://github.com/marianasilva ou portfólio"
                      value={github}
                      onChange={(e) => setGithub(e.target.value)}
                      className="text-xs bg-slate-50/50"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Resumo Profissional / Apresentação Inicial
                  </Label>
                  <Textarea
                    rows={3}
                    placeholder="Conte resumidamente sobre sua trajetória, projetos mais relevantes e o que mais te motiva nesta oportunidade..."
                    value={resumo}
                    onChange={(e) => setResumo(e.target.value)}
                    className="text-xs bg-slate-50/50 resize-none leading-relaxed"
                  />
                </div>
              </Card>

              {/* BLOCO 2: Habilidades, Experiência & Currículo PDF */}
              <Card className="border-slate-200 shadow-xs bg-white p-6 rounded-xl space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-blue-50 text-[#1D4ED8] flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">
                      Competências, Experiência & Currículo
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Dados que alimentam a análise de compatibilidade técnica e comportamental
                    </p>
                  </div>
                </div>

                {/* Habilidades Técnicas com tags */}
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Principais Habilidades e Tecnologias
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ex: Go, TypeScript, Docker, Gestão de Pessoas, Figma..."
                      value={habilidadesInput}
                      onChange={(e) => setHabilidadesInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddHabilidade()
                        }
                      }}
                      className="text-xs bg-slate-50/50"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddHabilidade}
                      className="text-xs shrink-0"
                    >
                      Adicionar
                    </Button>
                  </div>

                  {habilidadesLista.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {habilidadesLista.map((hab) => (
                        <Badge
                          key={hab}
                          variant="secondary"
                          className="text-xs px-2.5 py-1 bg-slate-100 text-slate-800 flex items-center gap-1.5"
                        >
                          {hab}
                          <button
                            type="button"
                            onClick={() => handleRemoveHabilidade(hab)}
                            className="text-slate-400 hover:text-rose-600"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Experiências Profissionais */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Histórico de Experiências Profissionais
                  </Label>
                  <Textarea
                    rows={3}
                    placeholder="Descreva suas últimas experiências, cargos, empresas e realizações relevantes..."
                    value={experienciasTexto}
                    onChange={(e) => setExperienciasTexto(e.target.value)}
                    className="text-xs bg-slate-50/50 resize-none leading-relaxed"
                  />
                </div>

                {/* Upload Currículo PDF */}
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-semibold text-slate-700">
                    Currículo Atualizado (PDF obrigatório) *
                  </Label>
                  <input
                    type="file"
                    ref={curriculoInputRef}
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0]
                        if (file.type !== 'application/pdf') {
                          toast({
                            title: 'Formato inválido',
                            description: 'Por favor, selecione um arquivo no formato PDF.',
                            variant: 'destructive',
                          })
                          return
                        }
                        if (file.size > 10 * 1024 * 1024) {
                          toast({
                            title: 'Arquivo muito grande',
                            description: 'O currículo deve ter no máximo 10MB.',
                            variant: 'destructive',
                          })
                          return
                        }
                        setCurriculoFile(file)
                      }
                    }}
                  />

                  <div
                    onClick={() => curriculoInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                      curriculoFile
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-slate-300 hover:border-[#1D4ED8] bg-slate-50/50 hover:bg-blue-50/30'
                    }`}
                  >
                    {curriculoFile ? (
                      <div className="flex items-center justify-center gap-3 text-emerald-800">
                        <FileText className="w-6 h-6 text-emerald-600 shrink-0" />
                        <div className="text-left">
                          <p className="text-xs font-bold truncate max-w-sm">
                            {curriculoFile.name}
                          </p>
                          <p className="text-[10px] text-emerald-600">
                            {Math.round(curriculoFile.size / 1024)} KB · Clique para substituir
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        <Upload className="w-6 h-6 text-slate-400 mx-auto" />
                        <p className="text-xs font-semibold text-slate-800">
                          Clique para selecionar ou arraste seu currículo em PDF
                        </p>
                        <p className="text-[10px] text-slate-400">PDF de até 10MB</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>

              {/* BLOCO 3: Questionário de Triagem da Vaga */}
              {questionario &&
                Array.isArray(questionario.perguntas) &&
                questionario.perguntas.length > 0 && (
                  <Card className="border-slate-200 shadow-xs bg-white p-6 rounded-xl space-y-5">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-blue-50 text-[#1D4ED8] flex items-center justify-center font-bold text-xs">
                          3
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            Questionário de Triagem da Vaga
                          </h4>
                          <p className="text-[11px] text-slate-500">
                            Responda com precisão aos critérios essenciais da posição
                          </p>
                        </div>
                      </div>

                      <Badge
                        variant="outline"
                        className="text-[10px] bg-slate-50 text-slate-600 font-semibold border-slate-200"
                      >
                        {questionario.perguntas.length} pergunta(s)
                      </Badge>
                    </div>

                    <div className="space-y-5 pt-1">
                      {questionario.perguntas.map((p, idx) => (
                        <div
                          key={p.id}
                          className="p-4 rounded-xl border border-slate-200/90 bg-slate-50/50 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <Label className="text-xs font-bold text-slate-900 leading-snug">
                              {idx + 1}. {p.enunciado}
                              {p.eliminatoria && (
                                <span className="text-rose-600 ml-1 font-bold">*</span>
                              )}
                            </Label>
                            {p.eliminatoria && (
                              <Badge className="bg-rose-50 text-rose-700 border-rose-200 text-[9px] font-bold shrink-0">
                                Critério Essencial
                              </Badge>
                            )}
                          </div>

                          {/* Tipo: Sim / Não */}
                          {p.tipo === 'sim_nao' && (
                            <div className="flex gap-3">
                              {['Sim', 'Não'].map((opt) => (
                                <label
                                  key={opt}
                                  className={`flex-1 flex items-center justify-center gap-2 p-2.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
                                    respostasTriagem[p.id] === opt
                                      ? 'border-[#1D4ED8] bg-blue-50 text-[#1D4ED8]'
                                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`pergunta-${p.id}`}
                                    value={opt}
                                    checked={respostasTriagem[p.id] === opt}
                                    onChange={(e) => handleRespostaChange(p.id, e.target.value)}
                                    className="hidden"
                                  />
                                  <span>{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {/* Tipo: Escolha Única */}
                          {p.tipo === 'escolha_unica' && p.opcoes && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {p.opcoes.map((opt) => (
                                <label
                                  key={opt}
                                  className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-medium cursor-pointer transition-colors ${
                                    respostasTriagem[p.id] === opt
                                      ? 'border-[#1D4ED8] bg-blue-50 text-[#1D4ED8] font-bold'
                                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`pergunta-${p.id}`}
                                    value={opt}
                                    checked={respostasTriagem[p.id] === opt}
                                    onChange={(e) => handleRespostaChange(p.id, e.target.value)}
                                    className="text-[#1D4ED8]"
                                  />
                                  <span className="truncate">{opt}</span>
                                </label>
                              ))}
                            </div>
                          )}

                          {/* Tipo: Número / Salário */}
                          {p.tipo === 'numero' && (
                            <div className="relative">
                              <Input
                                type="number"
                                placeholder="Informe o valor numérico (ex: 15000)"
                                value={respostasTriagem[p.id] || ''}
                                onChange={(e) => handleRespostaChange(p.id, e.target.value)}
                                className="text-xs bg-white border-slate-200"
                              />
                            </div>
                          )}

                          {/* Tipo: Texto livre */}
                          {p.tipo === 'texto' && (
                            <Textarea
                              rows={2}
                              placeholder="Digite sua resposta objetiva..."
                              value={respostasTriagem[p.id] || ''}
                              onChange={(e) => handleRespostaChange(p.id, e.target.value)}
                              className="text-xs bg-white border-slate-200 resize-none"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}

              {/* BLOCO 4: Vídeo de Apresentação (Upload MP4/WebM ou Link Externo) */}
              <Card className="border-slate-200 shadow-xs bg-white p-6 rounded-xl space-y-5">
                <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-blue-50 text-[#1D4ED8] flex items-center justify-center font-bold text-xs">
                      4
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">
                        Vídeo de Apresentação (Pitch / Mini-Entrevista)
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Apresente-se em até 2 a 3 minutos para que os avaliadores conheçam sua
                        comunicação
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setTipoVideo('upload')}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                        tipoVideo === 'upload'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Enviar Arquivo (MP4/WebM)
                    </button>
                    <button
                      type="button"
                      onClick={() => setTipoVideo('link')}
                      className={`text-[11px] font-semibold px-2.5 py-1 rounded-md transition-colors ${
                        tipoVideo === 'link'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Link Externo (Loom/YouTube/Drive)
                    </button>
                  </div>
                </div>

                {tipoVideo === 'upload' ? (
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={videoInputRef}
                      accept="video/mp4,video/webm,video/quicktime,video/x-matroska"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0]
                          if (file.size > 100 * 1024 * 1024) {
                            toast({
                              title: 'Vídeo muito grande',
                              description: 'O arquivo de vídeo deve ter no máximo 100MB.',
                              variant: 'destructive',
                            })
                            return
                          }
                          setVideoFile(file)
                        }
                      }}
                    />

                    <div
                      onClick={() => videoInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                        videoFile
                          ? 'border-emerald-300 bg-emerald-50/40'
                          : 'border-slate-300 hover:border-[#1D4ED8] bg-slate-50/50 hover:bg-blue-50/30'
                      }`}
                    >
                      {videoFile ? (
                        <div className="flex items-center justify-center gap-3 text-emerald-800">
                          <Video className="w-6 h-6 text-emerald-600 shrink-0" />
                          <div className="text-left">
                            <p className="text-xs font-bold truncate max-w-sm">{videoFile.name}</p>
                            <p className="text-[10px] text-emerald-600">
                              {Math.round(videoFile.size / 1024 / 1024)} MB · Clique para substituir
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <Video className="w-6 h-6 text-slate-400 mx-auto" />
                          <p className="text-xs font-semibold text-slate-800">
                            Clique para selecionar ou arraste seu vídeo de apresentação
                          </p>
                          <p className="text-[10px] text-slate-400">
                            Formatos suportados: MP4, WebM, MOV ou MKV (até 100MB)
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Link do Vídeo (Loom, YouTube, Google Drive, Vimeo)
                    </Label>
                    <div className="relative">
                      <LinkIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <Input
                        type="url"
                        placeholder="https://www.loom.com/share/... ou https://youtu.be/..."
                        value={videoLink}
                        onChange={(e) => setVideoLink(e.target.value)}
                        className="pl-9 text-xs bg-slate-50/50"
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Certifique-se de que o link esteja acessível publicamente ou com permissão de
                      visualização.
                    </span>
                  </div>
                )}
              </Card>

              {/* BLOCO 5: Termo de Consentimento LGPD Obrigatório */}
              <Card className="border-blue-200 bg-blue-50/50 p-5 rounded-xl space-y-3">
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    <input
                      type="checkbox"
                      id="consentimento_lgpd"
                      required
                      checked={consentimentoLgpd}
                      onChange={(e) => setConsentimentoLgpd(e.target.checked)}
                      className="rounded border-blue-300 text-[#1D4ED8] focus:ring-blue-500 w-4 h-4 cursor-pointer"
                    />
                  </div>
                  <label
                    htmlFor="consentimento_lgpd"
                    className="text-xs text-slate-700 cursor-pointer leading-relaxed"
                  >
                    <strong className="text-slate-900">
                      Autorizo expressamente o tratamento dos meus dados pessoais para fins de
                      processo seletivo
                    </strong>{' '}
                    pela equipe de Gente & Gestão, em estrita conformidade com a Lei Geral de
                    Proteção de Dados (Lei nº 13.709/2018 - LGPD). Estou ciente de que meus dados e
                    arquivos serão utilizados exclusivamente para avaliação de perfil e comunicação
                    referente a esta e futuras oportunidades compatíveis.
                  </label>
                </div>
              </Card>

              {/* Botão de Envio */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Ambiente seguro com criptografia de ponta a ponta</span>
                </div>

                <Button
                  type="submit"
                  disabled={submetendo}
                  className="w-full sm:w-auto h-11 px-8 text-xs font-bold bg-[#1D4ED8] hover:bg-blue-700 text-white shadow-md transition-all hover:scale-[1.01]"
                >
                  {submetendo ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processando candidatura...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-3.5 h-3.5" />
                      Enviar Minha Candidatura
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </section>
        )}
      </main>

      {/* Rodapé da Página */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 mt-12">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} Sistema RH Inteligente · Gente & Gestão</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Processamento transparente e seguro de candidaturas
          </span>
        </div>
      </footer>
    </div>
  )
}
