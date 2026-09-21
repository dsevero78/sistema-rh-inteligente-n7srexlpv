import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  HelpCircle,
  TrendingUp,
  Award,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  GitCompare,
  ArrowRight,
  UserCheck,
  FileText,
  Clock,
  Briefcase,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import pb from '@/lib/pocketbase/client'

export interface PerguntaEntrevistaGap {
  tema: string
  pergunta: string
  o_que_avaliar: string
}

export interface FinalistaComparativo {
  candidato_id: string
  nome: string
  cargo_atual?: string
  score_geral: number
  score_tecnico: number
  score_comportamental: number
  estagio_atual: string
  risco_contratacao: 'Baixo' | 'Médio' | 'Alto' | string
  justificativa_risco: string
  sintese_executiva: string
  forcas_lado_a_lado: string[]
  riscos_lado_a_lado: string[]
  trade_off: string
  perguntas_entrevista_gaps: PerguntaEntrevistaGap[]
}

export interface MatrizTradeoffDimensao {
  criterio: string
  analise?: string
  lucas?: string
  rodrigo?: string
  vantagem: string
}

export interface SinteseExecutivaData {
  versao?: string
  gerado_em?: string
  modelo_utilizado?: string
  vaga_titulo?: string
  total_finalistas: number
  recomendacao_final: {
    candidato_escolhido: string
    nivel_confianca: string
    resumo_decisao: string
    condicoes_ou_cuidados?: string[]
  }
  comparativo_finalistas: FinalistaComparativo[]
  matriz_tradeoffs?: {
    dimensoes: MatrizTradeoffDimensao[]
  }
}

interface SinteseExecutivaFinalistasProps {
  vagaId: string
  vagaTitulo: string
  sinteseInicial?: SinteseExecutivaData | null
  dataSinteseInicial?: string | null
  onSinteseAtualizada?: (sintese: SinteseExecutivaData) => void
}

export function SinteseExecutivaFinalistas({
  vagaId,
  vagaTitulo,
  sinteseInicial,
  dataSinteseInicial,
  onSinteseAtualizada,
}: SinteseExecutivaFinalistasProps) {
  const { toast } = useToast()
  const [sintese, setSintese] = useState<SinteseExecutivaData | null>(sinteseInicial || null)
  const [dataSintese, setDataSintese] = useState<string | null>(dataSinteseInicial || null)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [perguntaCopiadaIdx, setPerguntaCopiadaIdx] = useState<string | null>(null)

  const handleGerarSintese = async () => {
    setLoading(true)
    setErro(null)
    try {
      const res = await pb.send('/backend/v1/relatorios/sintese-finalistas', {
        method: 'POST',
        body: { vagaId },
      })

      if (res && res.sintese) {
        setSintese(res.sintese)
        const agora = new Date().toISOString()
        setDataSintese(agora)
        if (onSinteseAtualizada) {
          onSinteseAtualizada(res.sintese)
        }
        toast({
          title: 'Síntese executiva gerada!',
          description: 'A camada executiva de IA foi atualizada com sucesso para esta vaga.',
        })
      } else {
        throw new Error('Resposta sem dados de síntese')
      }
    } catch (err: unknown) {
      console.error('Erro ao gerar síntese executiva:', err)
      const msg = err instanceof Error ? err.message : 'Falha na comunicação com o Skip AI Gateway.'
      setErro(msg)
      toast({
        title: 'Não foi possível gerar a síntese',
        description:
          'Verifique se a vaga possui candidatos com perfil preenchido e tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCopiarPergunta = (texto: string, id: string) => {
    navigator.clipboard.writeText(texto)
    setPerguntaCopiadaIdx(id)
    toast({
      title: 'Pergunta copiada para a área de transferência',
      description: 'Pronta para uso na entrevista técnica ou comportamental.',
    })
    setTimeout(() => {
      setPerguntaCopiadaIdx(null)
    }, 2500)
  }

  const renderBadgeRisco = (risco: string) => {
    const r = risco.toLowerCase()
    if (r.includes('baixo')) {
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 font-bold text-xs flex items-center gap-1"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Risco Baixo
        </Badge>
      )
    }
    if (r.includes('alto')) {
      return (
        <Badge
          variant="outline"
          className="bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700 font-bold text-xs flex items-center gap-1"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
          Risco Alto
        </Badge>
      )
    }
    return (
      <Badge
        variant="outline"
        className="bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 font-bold text-xs flex items-center gap-1"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
        Risco Moderado
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Banner de Ação & Status */}
      <Card className="border-[#E9530E]/30 bg-gradient-to-r from-orange-50/70 via-white to-blue-50/50 dark:from-[#11162B] dark:via-[#1A2240] dark:to-[#11162B] shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-[11px] uppercase font-bold tracking-widest text-[#E9530E] bg-orange-100/70 dark:bg-[#E9530E]/20 px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-[#E9530E]/40">
                  Camada Executiva de Decisão · IA
                </span>
                {dataSintese && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Última síntese gerada em {new Date(dataSintese).toLocaleDateString(
                      'pt-BR',
                    )} às{' '}
                    {new Date(dataSintese).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                )}
              </div>
              <h3 className="font-display text-lg sm:text-xl font-bold text-[#11162B] dark:text-[#F7F8FB] tracking-tight">
                Síntese Executiva de Finalistas (“So What?” para o Gestor)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Análise comparativa orientada à decisão: forças e trade-offs lado a lado, risco de
                contratação fundamentado, perguntas prontas para cada gap e recomendação formal de
                quem avançar para proposta.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={handleGerarSintese}
                disabled={loading}
                className="bg-[#E9530E] hover:bg-[#C5430A] text-white font-display text-xs font-bold h-10 px-4 shadow-sm"
              >
                <Sparkles className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                {sintese ? 'Regerar Síntese com IA' : 'Gerar Síntese Executiva com IA'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Estado de Erro Degradado Elegante */}
      {erro && (
        <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/20 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-rose-900 dark:text-rose-300">
              Não foi possível concluir a análise pela IA
            </h4>
            <p className="text-xs text-rose-700 dark:text-rose-400 leading-relaxed">{erro}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGerarSintese}
              className="mt-2 text-xs font-semibold border-rose-300 text-rose-800 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-300 h-8"
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      )}

      {/* Skeleton de Carregamento durante a geração */}
      {loading && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-6 rounded-xl border border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240] space-y-4">
            <div className="flex items-center gap-3">
              <RefreshCw className="w-5 h-5 text-[#E9530E] animate-spin" />
              <div className="space-y-1">
                <div className="text-sm font-bold text-[#11162B] dark:text-[#F7F8FB]">
                  Processando dados dos finalistas com o Skip AI Gateway...
                </div>
                <div className="text-xs text-slate-500">
                  Cruzando relatórios técnicos, postura em vídeo, percepções do RH e pareceres do
                  gestor.
                </div>
              </div>
            </div>
            <Skeleton className="h-24 w-full" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </div>
      )}

      {/* Conteúdo Renderizado da Síntese */}
      {!loading && sintese && (
        <div className="space-y-6">
          {/* 1. Recomendação Final Executiva (Decisão Direta) */}
          {sintese.recomendacao_final && (
            <Card className="border-2 border-[#E9530E] bg-white dark:bg-[#1A2240] shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-[#E9530E] to-[#F19763] px-6 py-2.5 flex items-center justify-between text-white">
                <div className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  <span className="font-display text-xs font-bold uppercase tracking-wider">
                    Recomendação Final de Contratação
                  </span>
                </div>
                <Badge className="bg-white/20 text-white border-0 font-mono text-xs font-bold">
                  Confiança: {sintese.recomendacao_final.nivel_confianca}
                </Badge>
              </div>

              <CardContent className="p-6 space-y-4">
                {' '}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-[#2E3A6E]">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Candidato Indicado para Avançar
                    </span>
                    <h4 className="font-display text-xl sm:text-2xl font-bold text-[#11162B] dark:text-[#F7F8FB] flex items-center gap-2">
                      <UserCheck className="w-6 h-6 text-[#E9530E]" />
                      {sintese.recomendacao_final.candidato_escolhido}
                    </h4>
                  </div>
                  <Badge className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 font-display text-xs font-bold px-3 py-1">
                    Prioridade #1 para Proposta
                  </Badge>
                </div>
                <div className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed font-sans bg-slate-50 dark:bg-[#141B34] p-4 rounded-xl border border-slate-200/80 dark:border-[#2E3A6E]">
                  <p className="font-medium">{sintese.recomendacao_final.resumo_decisao}</p>
                </div>
                {sintese.recomendacao_final.condicoes_ou_cuidados &&
                  sintese.recomendacao_final.condicoes_ou_cuidados.length > 0 && (
                    <div className="pt-1">
                      <span className="font-display text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Condições e Cuidados Pré-Fechamento:
                      </span>
                      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                        {sintese.recomendacao_final.condicoes_ou_cuidados.map((item, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-2 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/70 dark:border-amber-900/40"
                          >
                            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </CardContent>
            </Card>
          )}

          {/* 2. Comparativo Lado a Lado dos Finalistas */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-display text-[11px] uppercase font-bold tracking-widest text-[#E9530E]">
                  Avaliação Comparativa
                </span>
                <h3 className="font-display text-lg font-bold text-[#11162B] dark:text-[#F7F8FB]">
                  Dossiê Executivo por Finalista
                </h3>
              </div>
              <span className="text-xs text-slate-500 font-medium font-mono">
                {sintese.comparativo_finalistas.length} finalistas avaliados
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sintese.comparativo_finalistas.map((finalista) => (
                <Card
                  key={finalista.candidato_id}
                  className="border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240] shadow-xs flex flex-col justify-between"
                >
                  <CardHeader className="p-5 border-b border-slate-100 dark:border-[#2E3A6E] pb-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link
                          to={`/candidatos/${finalista.candidato_id}`}
                          className="font-display text-base font-bold text-[#11162B] dark:text-[#F7F8FB] hover:text-[#E9530E] transition-colors flex items-center gap-1.5"
                        >
                          {finalista.nome}
                          <ChevronRight className="w-4 h-4 text-slate-400" />
                        </Link>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {finalista.cargo_atual || 'Candidato Finalista'} ·{' '}
                          {finalista.estagio_atual}
                        </p>
                      </div>

                      {renderBadgeRisco(finalista.risco_contratacao)}
                    </div>

                    {/* Scores e Dimensões */}
                    <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                      <div className="p-2 rounded-lg bg-orange-50/70 dark:bg-orange-950/30 border border-orange-200/80 dark:border-orange-900/40">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                          Geral
                        </span>
                        <span className="font-mono text-lg font-black text-[#E9530E] dark:text-orange-400">
                          {finalista.score_geral}%
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                          Técnico
                        </span>
                        <span className="font-mono text-lg font-black text-blue-700 dark:text-blue-300">
                          {finalista.score_tecnico}%
                        </span>
                      </div>

                      <div className="p-2 rounded-lg bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/40">
                        <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                          Comportam.
                        </span>
                        <span className="font-mono text-lg font-black text-purple-700 dark:text-purple-300">
                          {finalista.score_comportamental}%
                        </span>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="p-5 space-y-4 flex-1">
                    {/* Síntese Executiva Curta (2-4 frases em linguagem de decisão) */}
                    <div className="space-y-1">
                      <span className="font-display text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Síntese de Decisão:
                      </span>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans bg-slate-50/80 dark:bg-[#141B34] p-3 rounded-lg border border-slate-200/70 dark:border-[#2E3A6E] italic">
                        "{finalista.sintese_executiva}"
                      </p>
                    </div>

                    {/* Justificativa de Risco de Contratação */}
                    <div className="space-y-1">
                      <span className="font-display text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Fundamentação do Risco:
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {finalista.justificativa_risco}
                      </p>
                    </div>

                    {/* Forças vs Riscos Lado a Lado */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-1.5">
                        <span className="font-display text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          Forças & Diferenciais
                        </span>
                        <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                          {finalista.forcas_lado_a_lado.map((f, fIdx) => (
                            <li key={fIdx} className="flex items-start gap-1.5">
                              <span className="text-emerald-600 font-bold">•</span>
                              <span>{f}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="p-3 rounded-lg bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-1.5">
                        <span className="font-display text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          Gaps & Riscos Mapeados
                        </span>
                        <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1">
                          {finalista.riscos_lado_a_lado.map((r, rIdx) => (
                            <li key={rIdx} className="flex items-start gap-1.5">
                              <span className="text-amber-600 font-bold">•</span>
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Trade-off Direto */}
                    {finalista.trade_off && (
                      <div className="p-3 rounded-lg bg-blue-50/40 dark:bg-[#141B34] border border-blue-200 dark:border-blue-900/50 text-xs">
                        <span className="font-display text-[11px] font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider block mb-1">
                          Trade-off Direto desta Escolha:
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                          {finalista.trade_off}
                        </p>
                      </div>
                    )}

                    {/* Perguntas Sugeridas para a Entrevista (Para sanar cada gap identificado) */}
                    {finalista.perguntas_entrevista_gaps &&
                      finalista.perguntas_entrevista_gaps.length > 0 && (
                        <div className="pt-2 space-y-2.5">
                          <span className="font-display text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4 text-[#E9530E]" />
                            Perguntas de Entrevista para Sanar Gaps
                          </span>

                          <div className="space-y-2">
                            {finalista.perguntas_entrevista_gaps.map((p, pIdx) => {
                              const copiaId = `${finalista.candidato_id}-${pIdx}`
                              return (
                                <div
                                  key={pIdx}
                                  className="p-3 rounded-lg border border-slate-200 dark:border-[#2E3A6E] bg-slate-50/50 dark:bg-[#141B34] space-y-1.5"
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <Badge
                                      variant="outline"
                                      className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-[#1A2240]"
                                    >
                                      Tema: {p.tema}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleCopiarPergunta(p.pergunta, copiaId)}
                                      className="h-6 px-2 text-[10px] text-slate-500 hover:text-slate-900"
                                    >
                                      {perguntaCopiadaIdx === copiaId ? (
                                        <>
                                          <Check className="w-3 h-3 mr-1 text-emerald-600" />
                                          Copiada
                                        </>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3 mr-1" />
                                          Copiar
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                  <p className="text-xs font-semibold text-slate-900 dark:text-[#F7F8FB] leading-snug">
                                    “{p.pergunta}”
                                  </p>
                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                                    <strong>O que avaliar:</strong> {p.o_que_avaliar}
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* 3. Matriz de Trade-offs e Comparação Dimensional */}
          {sintese.matriz_tradeoffs &&
            sintese.matriz_tradeoffs.dimensoes &&
            sintese.matriz_tradeoffs.dimensoes.length > 0 && (
              <Card className="border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240] p-6 shadow-xs">
                <div className="flex items-center gap-2 pb-4 border-b border-slate-100 dark:border-[#2E3A6E]">
                  <GitCompare className="w-5 h-5 text-[#E9530E]" />
                  <div>
                    <CardTitle className="font-display text-base font-bold text-[#11162B] dark:text-[#F7F8FB]">
                      Matriz Comparativa de Trade-offs
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Critérios fundamentais de decisão comparados dimensão a dimensão
                    </CardDescription>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 dark:divide-[#2E3A6E] pt-2">
                  {sintese.matriz_tradeoffs.dimensoes.map((dim, idx) => (
                    <div
                      key={idx}
                      className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5 max-w-md">
                        <span className="font-bold text-slate-900 dark:text-[#F7F8FB] block">
                          {dim.criterio}
                        </span>
                        {dim.analise && (
                          <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                            {dim.analise}
                          </p>
                        )}
                        {dim.lucas && dim.rodrigo && (
                          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-500 pt-1">
                            <div>
                              <strong className="text-slate-700 dark:text-slate-200">Lucas:</strong>{' '}
                              {dim.lucas}
                            </div>
                            <div>
                              <strong className="text-slate-700 dark:text-slate-200">
                                Rodrigo:
                              </strong>{' '}
                              {dim.rodrigo}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Vantagem:
                        </span>
                        <Badge
                          variant="outline"
                          className="bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800 font-bold text-xs"
                        >
                          {dim.vantagem}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
        </div>
      )}

      {/* Estado Vazio (Sem síntese gerada ainda) */}
      {!loading && !sintese && !erro && (
        <Card className="border-dashed border-slate-300 dark:border-[#2E3A6E] bg-white/50 dark:bg-[#1A2240]/50 p-10 text-center">
          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-[#E9530E]/20 text-[#E9530E] flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4 className="font-display text-base font-bold text-[#11162B] dark:text-[#F7F8FB]">
              Síntese Executiva ainda não gerada para esta vaga
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Clique no botão abaixo para que o modelo Skip AI consolide o comparativo lado a lado
              dos finalistas, risco de contratação e as perguntas recomendadas para a entrevista.
            </p>
            <Button
              onClick={handleGerarSintese}
              className="bg-[#E9530E] hover:bg-[#C5430A] text-white font-display text-xs font-bold h-9 shadow-sm"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Gerar Síntese Executiva Agora
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
