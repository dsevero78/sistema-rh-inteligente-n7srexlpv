import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Upload,
  User,
  Mail,
  Phone,
  Linkedin,
  MessageSquare,
  Briefcase,
  Loader2,
  FileText,
  Gift,
  ArrowRight,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
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
  habilidades_tecnicas: { nome: string; peso: number }[]
}

interface DadosIndicador {
  id: string
  nome: string
  nps: number
  total_indicadas: number
  total_convertidas: number
}

export default function IndicarPublica() {
  const { token } = useParams<{ token: string }>()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [naoElegivel, setNaoElegivel] = useState(false)
  const [indicador, setIndicador] = useState<DadosIndicador | null>(null)
  const [vagas, setVagas] = useState<VagaPublica[]>([])
  const [sucesso, setSucesso] = useState(false)
  const [submetendo, setSubmetendo] = useState(false)

  // Formulário da Indicação
  const [vagaSelecionada, setVagaSelecionada] = useState<string>('')
  const [nomeIndicado, setNomeIndicado] = useState('')
  const [emailIndicado, setEmailIndicado] = useState('')
  const [telefoneIndicado, setTelefoneIndicado] = useState('')
  const [linkedinIndicado, setLinkedinIndicado] = useState('')
  const [mensagemIndicador, setMensagemIndicador] = useState('')
  const [curriculoFile, setCurriculoFile] = useState<File | null>(null)
  const [consentimentoLgpd, setConsentimentoLgpd] = useState(false)

  // Respostas de triagem opcional
  const [perguntasVaga, setPerguntasVaga] = useState<any[]>([])
  const [respostasTriagem, setRespostasTriagem] = useState<Record<string, any>>({})
  const [carregandoTriagem, setCarregandoTriagem] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const carregarDadosIndicador = async () => {
    if (!token) {
      setErro('Token de indicação não fornecido.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/public/indicar/${token}`,
      )
      const data = await res.json()
      if (!res.ok) {
        if (data.naoElegivel) {
          setNaoElegivel(true)
        }
        throw new Error(data.error || 'Link de indicação inválido.')
      }

      setIndicador(data.indicador)
      setVagas(data.vagas || [])
      if (data.vagas && data.vagas.length > 0) {
        setVagaSelecionada(data.vagas[0].id)
      }
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Falha ao validar link de indicação.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarDadosIndicador()
  }, [token])

  // Ao mudar de vaga, carregar perguntas de triagem se existirem
  useEffect(() => {
    if (!vagaSelecionada) {
      setPerguntasVaga([])
      return
    }

    const buscarTriagem = async () => {
      setCarregandoTriagem(true)
      try {
        const res = await fetch(
          `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/public/vagas/${vagaSelecionada}`,
        )
        if (res.ok) {
          const d = await res.json()
          if (d.questionario?.perguntas && Array.isArray(d.questionario.perguntas)) {
            setPerguntasVaga(d.questionario.perguntas)
          } else {
            setPerguntasVaga([])
          }
        }
      } catch {
        setPerguntasVaga([])
      } finally {
        setCarregandoTriagem(false)
      }
    }

    buscarTriagem()
  }, [vagaSelecionada])

  const handleSubmeter = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!token) return
    if (!vagaSelecionada) {
      toast({
        title: 'Selecione uma vaga',
        description: 'Escolha a oportunidade para a qual deseja indicar.',
        variant: 'destructive',
      })
      return
    }

    if (!nomeIndicado.trim() || !emailIndicado.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Informe o nome completo e o e-mail do profissional indicado.',
        variant: 'destructive',
      })
      return
    }

    if (!consentimentoLgpd) {
      toast({
        title: 'Consentimento LGPD obrigatório',
        description:
          'É necessário declarar o consentimento para o tratamento dos dados do profissional indicado.',
        variant: 'destructive',
      })
      return
    }

    setSubmetendo(true)
    try {
      // Montar multipart/form-data para suportar upload de currículo em PDF
      const formData = new FormData()
      formData.append('vagaId', vagaSelecionada)
      formData.append('indicado_nome', nomeIndicado.trim())
      formData.append('indicado_email', emailIndicado.trim())
      formData.append('indicado_telefone', telefoneIndicado.trim())
      formData.append('indicado_linkedin', linkedinIndicado.trim())
      formData.append('mensagem_indicador', mensagemIndicador.trim())
      formData.append('consentimento_lgpd', 'true')

      if (curriculoFile) {
        formData.append('curriculo', curriculoFile)
      }

      // Formatando respostas de triagem caso existam
      if (perguntasVaga.length > 0) {
        const respFormatadas = perguntasVaga.map((p) => ({
          perguntaId: p.id,
          resposta: respostasTriagem[p.id] ?? null,
        }))
        formData.append('respostas_triagem', JSON.stringify(respFormatadas))
      }

      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/public/indicar/${token}`,
        {
          method: 'POST',
          body: formData,
        },
      )

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao registrar indicação.')
      }

      setSucesso(true)
      toast({
        title: 'Indicação enviada com sucesso!',
        description: 'Obrigado por nos ajudar a encontrar grandes talentos.',
      })
    } catch (err: unknown) {
      toast({
        title: 'Erro no envio da indicação',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmetendo(false)
    }
  }

  const vagaAtualObj = vagas.find((v) => v.id === vagaSelecionada)

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <h2 className="text-sm font-bold text-slate-800">
            Carregando Programa de Indicação de Talentos...
          </h2>
          <p className="text-xs text-slate-400">Validando elegibilidade e vagas ativas.</p>
        </div>
      </div>
    )
  }

  // Link Inválido ou Não Elegível
  if (erro || !indicador) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-slate-200 shadow-sm text-center p-8 bg-white">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            {naoElegivel
              ? 'Programa Exclusivo para Promotores'
              : 'Link de Indicação Não Localizado'}
          </h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {erro ||
              'O Programa de Indicação é reservado aos candidatos com avaliação de experiência de alto nível (NPS 9 ou 10).'}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link to="/candidatar">
              <Button variant="outline" size="sm" className="text-xs w-full">
                Ver Vagas Abertas na Carreira
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Top Header Institucional */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 shadow-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight block">Gente & Gestão</span>
              <span className="text-[10px] text-slate-400 font-medium">
                Programa de Indicação de Talentos
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-[11px] font-semibold text-emerald-300 border-emerald-500/30 bg-emerald-500/10"
            >
              ⭐ Promotor NPS ({indicador.nps}/10)
            </Badge>
          </div>
        </div>
      </header>

      {/* Hero Personalizado de Boas-Vindas */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white py-10 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-semibold">
            <Gift className="w-3.5 h-3.5 text-blue-400" />
            Embaixador de Marca Empregadora
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Olá, {indicador.nome}! Sua opinião vale muito.
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-3xl">
            Como você avaliou nosso processo seletivo de forma exemplar (nota {indicador.nps} no
            NPS), confiamos plenamente no seu julgamento técnico e humano. Indique profissionais que
            compartilham dos mesmos valores e competências para fazer parte do nosso time.
          </p>

          {/* Mini Reconhecimento */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="text-slate-400">Suas indicações:</span>
              <strong className="text-white tabular-nums">{indicador.total_indicadas}</strong>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
              <span className="text-slate-400">Convertidas no funil:</span>
              <strong className="text-emerald-400 tabular-nums">
                {indicador.total_convertidas}
              </strong>
            </div>
          </div>
        </div>
      </section>

      {/* Formulário Principal */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 -mt-4">
        {sucesso ? (
          <Card className="border-emerald-200 bg-white shadow-sm p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Indicação Realizada com Sucesso! 🎉
            </h2>

            <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
              O perfil de <strong>{nomeIndicado}</strong> já foi recebido com prioridade pela equipe
              de Gente & Gestão para a posição selecionada. Enviamos uma mensagem de agradecimento
              ao seu e-mail e você será avisado(a) quando a indicação evoluir no processo seletivo.
            </p>

            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => {
                  setSucesso(false)
                  setNomeIndicado('')
                  setEmailIndicado('')
                  setTelefoneIndicado('')
                  setLinkedinIndicado('')
                  setMensagemIndicador('')
                  setCurriculoFile(null)
                  setRespostasTriagem({})
                }}
              >
                Fazer Outra Indicação
              </Button>
              <Link to="/candidatar">
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white text-xs">
                  Ver Mais Vagas Abertas
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <form onSubmit={handleSubmeter} className="space-y-6">
            {/* 1. Escolha da Vaga Ativa */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-sm font-bold text-slate-900">
                    1. Selecione a Vaga Ativa
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Apenas vagas com processo seletivo aberto e aprovado pela liderança contratante.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700">
                    Posição para indicação *
                  </Label>
                  <Select value={vagaSelecionada} onValueChange={setVagaSelecionada}>
                    <SelectTrigger className="text-xs bg-slate-50 border-slate-200 h-10">
                      <SelectValue placeholder="Selecione a vaga..." />
                    </SelectTrigger>
                    <SelectContent>
                      {vagas.map((v) => (
                        <SelectItem key={v.id} value={v.id} className="text-xs">
                          {v.titulo} ({v.departamento} · {v.modalidade})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {vagaAtualObj && (
                  <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-lg text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-blue-900">{vagaAtualObj.titulo}</span>
                      <Badge variant="outline" className="text-[10px] bg-white border-blue-300">
                        {vagaAtualObj.modalidade} · {vagaAtualObj.localizacao}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {vagaAtualObj.descricao}
                    </p>
                    {vagaAtualObj.faixa_salarial && (
                      <p className="text-[11px] font-semibold text-blue-700 pt-1">
                        Remuneração Alvo: {vagaAtualObj.faixa_salarial}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Dados do Profissional Indicado */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" />
                  <CardTitle className="text-sm font-bold text-slate-900">
                    2. Dados da Pessoa Indicada
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Informações de contato e perfil para abordagem respeitosa e personalizada.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Nome completo *</Label>
                    <Input
                      placeholder="Ex: Lucas Almeida Silva"
                      value={nomeIndicado}
                      onChange={(e) => setNomeIndicado(e.target.value)}
                      required
                      className="text-xs bg-slate-50 border-slate-200 h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      E-mail corporativo ou pessoal *
                    </Label>
                    <Input
                      type="email"
                      placeholder="lucas.almeida@exemplo.com"
                      value={emailIndicado}
                      onChange={(e) => setEmailIndicado(e.target.value)}
                      required
                      className="text-xs bg-slate-50 border-slate-200 h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Telefone / WhatsApp (opcional)
                    </Label>
                    <Input
                      placeholder="(11) 98765-4321"
                      value={telefoneIndicado}
                      onChange={(e) => setTelefoneIndicado(e.target.value)}
                      className="text-xs bg-slate-50 border-slate-200 h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      LinkedIn ou Portfólio (opcional)
                    </Label>
                    <Input
                      placeholder="https://linkedin.com/in/perfil"
                      value={linkedinIndicado}
                      onChange={(e) => setLinkedinIndicado(e.target.value)}
                      className="text-xs bg-slate-50 border-slate-200 h-9"
                    />
                  </div>
                </div>

                {/* Mensagem / Justificativa */}
                <div className="space-y-1.5 pt-1">
                  <Label className="text-xs font-semibold text-slate-700 flex items-center justify-between">
                    <span>Por que você indica este talento? (Sua recomendação) *</span>
                    <span className="text-[10px] text-slate-400 font-normal">
                      Importante para a análise do RH
                    </span>
                  </Label>
                  <Textarea
                    rows={3}
                    placeholder="Conte como vocês trabalharam juntos, principais qualidades técnicas e por que acredita no sucesso dessa pessoa na oportunidade..."
                    value={mensagemIndicador}
                    onChange={(e) => setMensagemIndicador(e.target.value)}
                    className="text-xs resize-none bg-slate-50 border-slate-200"
                    required
                  />
                </div>

                {/* Upload Currículo PDF Opcional */}
                <div className="space-y-1.5 border-t border-slate-100 pt-3">
                  <Label className="text-xs font-semibold text-slate-700">
                    Currículo em PDF (opcional, máx. 10MB)
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
                      className="text-xs bg-white border-slate-200 h-9"
                    >
                      <Upload className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                      {curriculoFile ? 'Substituir PDF' : 'Anexar Currículo (PDF)'}
                    </Button>
                    {curriculoFile && (
                      <span className="text-xs text-slate-600 truncate font-medium">
                        ✓ {curriculoFile.name} ({Math.round(curriculoFile.size / 1024)} KB)
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 3. Questionário de Triagem Opcional (se a vaga tiver) */}
            {perguntasVaga.length > 0 && (
              <Card className="border-slate-200 bg-white shadow-xs">
                <CardHeader className="p-4 sm:p-5 pb-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-sm font-bold text-slate-900">
                      3. Critérios de Triagem Prévia da Vaga (Opcional)
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    Se você conhecer bem o histórico da pessoa, responda com base na sua vivência
                    para adiantar a triagem técnica. Se não souber, o candidato responderá
                    posteriormente.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4 sm:p-5 pt-0 space-y-3.5 divide-y divide-slate-100">
                  {perguntasVaga.map((p, idx) => (
                    <div key={p.id || idx} className="pt-3.5 first:pt-0 space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                        <span>{p.enunciado}</span>
                        {p.eliminatoria && (
                          <Badge
                            variant="outline"
                            className="text-[9px] bg-amber-50 text-amber-800 border-amber-200 font-bold"
                          >
                            Eliminatória
                          </Badge>
                        )}
                      </Label>

                      {p.tipo === 'sim_nao' ? (
                        <div className="flex gap-2">
                          {['Sim', 'Não'].map((opt) => (
                            <button
                              type="button"
                              key={opt}
                              onClick={() =>
                                setRespostasTriagem((prev) => ({ ...prev, [p.id]: opt }))
                              }
                              className={`h-8 px-3 text-xs font-medium rounded-md border transition-all ${
                                respostasTriagem[p.id] === opt
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              {opt}
                            </button>
                          ))}
                        </div>
                      ) : p.tipo === 'numero' ? (
                        <Input
                          type="number"
                          placeholder="Ex: 5"
                          value={respostasTriagem[p.id] || ''}
                          onChange={(e) =>
                            setRespostasTriagem((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          className="text-xs w-32 bg-slate-50 border-slate-200 h-8"
                        />
                      ) : (
                        <Input
                          placeholder="Sua resposta..."
                          value={respostasTriagem[p.id] || ''}
                          onChange={(e) =>
                            setRespostasTriagem((prev) => ({ ...prev, [p.id]: e.target.value }))
                          }
                          className="text-xs bg-slate-50 border-slate-200 h-8"
                        />
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* 4. Termo LGPD e Envio */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardContent className="p-4 sm:p-5 space-y-4">
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Termo de Consentimento e Privacidade (LGPD):
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Ao realizar a indicação, você confirma que possui prévia autorização da pessoa
                    indicada para compartilhar seus dados de contato e currículo profissional com a
                    nossa equipe de Gente & Gestão, exclusivamente para fins de recrutamento nesta
                    vaga. Gravamos data, hora e endereço IP em auditoria.
                  </p>
                  <label className="flex items-start gap-2 pt-1 font-semibold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentimentoLgpd}
                      onChange={(e) => setConsentimentoLgpd(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4 mt-0.5 shrink-0"
                      required
                    />
                    <span className="text-xs">
                      Declaro que possuo o consentimento da pessoa indicada para compartilhar seus
                      dados e concordo com o tratamento para seleção profissional. *
                    </span>
                  </label>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-slate-400">
                    O indicado receberá um convite cordial por e-mail com a sua citação.
                  </div>

                  <Button
                    type="submit"
                    disabled={submetendo || !consentimentoLgpd}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs h-10 px-6 shadow-xs"
                  >
                    {submetendo ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando Indicação...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        Concluir Indicação de Talento
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        )}
      </main>
    </div>
  )
}
