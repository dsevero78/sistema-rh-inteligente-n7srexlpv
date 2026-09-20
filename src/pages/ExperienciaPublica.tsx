import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Heart,
  Star,
  CheckCircle2,
  Clock,
  Sparkles,
  Building2,
  ShieldCheck,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  Send,
  Loader2,
  MessageSquare,
  Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'

interface DadosPesquisa {
  id: string
  token: string
  respondido: boolean
  data_resposta?: string
  status_processo: 'Contratado' | 'Recusado'
  candidato_nome: string
  vaga_titulo: string
  vaga_departamento?: string
}

interface DimensaoAvaliacao {
  id: 'clareza_processo' | 'tempo_resposta' | 'tratamento_rh' | 'clareza_vaga'
  titulo: string
  descricao: string
}

const DIMENSOES: DimensaoAvaliacao[] = [
  {
    id: 'clareza_processo',
    titulo: 'Clareza das Etapas',
    descricao: 'As etapas, expectativas e próximos passos foram explicados com transparência?',
  },
  {
    id: 'tempo_resposta',
    titulo: 'Tempo de Resposta & Comunicação',
    descricao: 'A comunicação foi ágil e os retornos foram pontuais ao longo do processo?',
  },
  {
    id: 'tratamento_rh',
    titulo: 'Acolhimento & Respeito do RH',
    descricao:
      'Como você avalia a empatia, escuta ativa e profissionalismo da equipe de Gente & Gestão?',
  },
  {
    id: 'clareza_vaga',
    titulo: 'Alinhamento da Vaga & Desafios',
    descricao: 'As responsabilidades e desafios do cargo foram explicados com precisão?',
  },
]

export default function ExperienciaPublica() {
  const { token } = useParams<{ token: string }>()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [dados, setDados] = useState<DadosPesquisa | null>(null)
  const [sucesso, setSucesso] = useState(false)
  const [submetendo, setSubmetendo] = useState(false)

  // Formulário de Avaliação
  const [notaGeral, setNotaGeral] = useState<number>(10)
  const [dimensoesNotas, setDimensoesNotas] = useState<Record<string, number>>({
    clareza_processo: 10,
    tempo_resposta: 10,
    tratamento_rh: 10,
    clareza_vaga: 10,
  })
  const [npsScore, setNpsScore] = useState<number>(10)
  const [recomendaria, setRecomendaria] = useState<
    'Sim, com certeza' | 'Talvez' | 'Não recomendaria'
  >('Sim, com certeza')
  const [comentario, setComentario] = useState('')

  const carregarPesquisa = async () => {
    if (!token) {
      setErro('Token da pesquisa não informado.')
      setLoading(false)
      return
    }

    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/public/experiencia/${token}`,
      )
      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Pesquisa de experiência não encontrada.')
      }

      setDados(data)
      if (data.respondido) {
        setSucesso(true)
      }
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Falha ao acessar a pesquisa de experiência.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    carregarPesquisa()
  }, [token])

  const handleSubmeter = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) return

    setSubmetendo(true)
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/public/experiencia/${token}/responder`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nota_geral: notaGeral,
            clareza_processo: dimensoesNotas.clareza_processo,
            tempo_resposta: dimensoesNotas.tempo_resposta,
            tratamento_rh: dimensoesNotas.tratamento_rh,
            clareza_vaga: dimensoesNotas.clareza_vaga,
            nps_score: npsScore,
            recomendaria_empresa: recomendaria,
            comentario: comentario.trim(),
          }),
        },
      )

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao enviar avaliação')
      }

      setSucesso(true)
      toast({
        title: 'Avaliação recebida com sucesso!',
        description: 'Agradecemos por compartilhar sua opinião sincera conosco.',
      })
    } catch (err: unknown) {
      toast({
        title: 'Erro ao enviar',
        description: err instanceof Error ? err.message : 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmetendo(false)
    }
  }

  // Seletor numérico de 0 a 10 reutilizável
  const renderScale0to10 = (
    valorAtual: number,
    onChange: (val: number) => void,
    rotuloMenor = 'Muito ruim',
    rotuloMaior = 'Excelente',
  ) => (
    <div className="space-y-1.5">
      <div className="grid grid-cols-11 gap-1 sm:gap-1.5">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
          const isSelected = valorAtual === num
          return (
            <button
              type="button"
              key={num}
              onClick={() => onChange(num)}
              className={`h-9 sm:h-10 text-xs sm:text-sm font-bold rounded-lg border transition-all flex items-center justify-center cursor-pointer ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm scale-105'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              {num}
            </button>
          )
        })}
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
        <span>0 = {rotuloMenor}</span>
        <span>10 = {rotuloMaior}</span>
      </div>
    </div>
  )

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
          <h2 className="text-sm font-bold text-slate-700">
            Carregando pesquisa de experiência...
          </h2>
          <p className="text-xs text-slate-400">
            Garantindo a confidencialidade da sua participação.
          </p>
        </div>
      </div>
    )
  }

  // Link Inválido ou Erro
  if (erro || !dados) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-slate-200 shadow-sm text-center p-8 bg-white">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 border border-rose-200">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Pesquisa Indisponível ou Link Expirado
          </h2>
          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
            {erro || 'Este link de pesquisa é inválido ou foi utilizado anteriormente.'}
          </p>
          <div className="mt-6">
            <Link to="/candidatar">
              <Button variant="outline" size="sm" className="text-xs">
                Ir para Banco de Oportunidades
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
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-black text-sm">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-tight block">Gente & Gestão</span>
              <span className="text-[10px] text-slate-400 font-medium">
                Pesquisa de Candidate Experience
              </span>
            </div>
          </div>

          <Badge
            variant="outline"
            className="text-[11px] font-semibold text-slate-300 border-slate-700 bg-slate-800/60"
          >
            100% Confidencial
          </Badge>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white py-10 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20 text-xs font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
            Tempo estimado: ~1 minuto
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Sua opinião transforma nosso RH ✨
          </h1>

          <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
            Olá, <strong className="text-white">{dados.candidato_nome}</strong>! Agradecemos sua
            dedicação no processo seletivo para a posição de{' '}
            <strong className="text-white">{dados.vaga_titulo}</strong>. Queremos ouvir sua
            avaliação franca sobre como foi sua experiência com nossa equipe.
          </p>

          <div className="pt-2 flex items-center gap-2 text-slate-400 text-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>
              As respostas alimentam nossos indicadores de qualidade de atendimento e melhoria de
              processos.
            </span>
          </div>
        </div>
      </section>

      {/* Conteúdo do Formulário */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 -mt-4">
        {sucesso ? (
          <Card className="border-emerald-200 bg-white shadow-sm p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Muito obrigado pela sua avaliação!
            </h2>

            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Sua resposta foi registrada com sucesso. Ela contribui de forma decisiva para que a
              equipe de Gente & Gestão aprimore o acolhimento, os prazos de resposta e o respeito
              com todos os profissionais que interagem com a nossa organização.
            </p>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-3">
              <Link to="/candidatar">
                <Button variant="outline" size="sm" className="text-xs">
                  Ver Novas Vagas Abertas
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <form onSubmit={handleSubmeter} className="space-y-6">
            {/* 1. Nota Geral do Processo */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                  <CardTitle className="text-sm font-bold text-slate-900">
                    1. Como você avalia sua experiência geral no processo seletivo?
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Dê uma nota de 0 (péssima) a 10 (excelente).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-5 pt-0">
                {renderScale0to10(notaGeral, setNotaGeral, 'Péssima', 'Excelente')}
              </CardContent>
            </Card>

            {/* 2. Avaliação por Dimensões */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-sm font-bold text-slate-900">
                    2. Avaliação por Dimensões do Atendimento
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Ajude-nos a entender com precisão quais aspectos foram positivos e quais precisam
                  de melhoria.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 pt-0 divide-y divide-slate-100 space-y-4">
                {DIMENSOES.map((dim) => (
                  <div key={dim.id} className="pt-4 first:pt-0 space-y-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{dim.titulo}</h4>
                      <p className="text-[11px] text-slate-500">{dim.descricao}</p>
                    </div>

                    {renderScale0to10(
                      dimensoesNotas[dim.id] ?? 10,
                      (val) => setDimensoesNotas((prev) => ({ ...prev, [dim.id]: val })),
                      'Insatisfatório',
                      'Exemplar',
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* 3. NPS / Recomendação */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />
                  <CardTitle className="text-sm font-bold text-slate-900">
                    3. Você recomendaria a um colega ou amigo participar de um processo seletivo
                    conosco?
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Em uma escala de 0 a 10, qual a probabilidade de recomendar nossa empresa como boa
                  empregadora?
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
                {renderScale0to10(npsScore, setNpsScore, 'Improvável', 'Com certeza')}

                <div className="pt-3 border-t border-slate-100">
                  <label className="text-xs font-bold text-slate-800 block mb-2">
                    De forma geral, você recomendaria a nossa empresa?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        val: 'Sim, com certeza',
                        label: 'Sim, com certeza',
                        icon: ThumbsUp,
                        cor: 'border-emerald-300 text-emerald-700 bg-emerald-50/50',
                      },
                      {
                        val: 'Talvez',
                        label: 'Talvez / Neutro',
                        icon: HelpCircle,
                        cor: 'border-amber-300 text-amber-700 bg-amber-50/50',
                      },
                      {
                        val: 'Não recomendaria',
                        label: 'Não recomendaria',
                        icon: ThumbsDown,
                        cor: 'border-rose-300 text-rose-700 bg-rose-50/50',
                      },
                    ].map((opt) => {
                      const Icon = opt.icon
                      const isSel = recomendaria === opt.val
                      return (
                        <button
                          type="button"
                          key={opt.val}
                          onClick={() => setRecomendaria(opt.val as any)}
                          className={`p-3 rounded-lg border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                            isSel
                              ? `${opt.cor} ring-2 ring-blue-500 font-extrabold`
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{opt.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 4. Comentário Aberto */}
            <Card className="border-slate-200 bg-white shadow-xs">
              <CardHeader className="p-4 sm:p-5 pb-3">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  <CardTitle className="text-sm font-bold text-slate-900">
                    4. Espaço Aberto para Comentários & Sugestões (Opcional)
                  </CardTitle>
                </div>
                <CardDescription className="text-xs text-slate-500">
                  Gostaria de destacar algum ponto alto ou sugerir algo que poderíamos ter feito
                  melhor?
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 sm:p-5 pt-0">
                <Textarea
                  placeholder="Compartilhe livremente sua percepção sobre as conversas, prazos, postura dos entrevistadores ou dicas para nosso time..."
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  className="min-h-[100px] text-xs bg-slate-50/60 border-slate-200 leading-relaxed"
                />
              </CardContent>
            </Card>

            {/* Botão de Envio */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-slate-400">
                Sua resposta será tratada de acordo com as normas da LGPD e os princípios éticos da
                organização.
              </span>

              <Button
                type="submit"
                disabled={submetendo}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs h-10 px-8 shadow-xs"
              >
                {submetendo ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando avaliação...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Avaliação de Experiência
                  </>
                )}
              </Button>
            </div>
          </form>
        )}
      </main>
    </div>
  )
}
