import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import pb from '@/lib/pocketbase/client'
import {
  ArrowLeft,
  Printer,
  Sparkles,
  Award,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
  Briefcase,
  Share2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import type { RecordModel } from 'pocketbase'

export default function RelatorioDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [relatorio, setRelatorio] = useState<RecordModel | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchRelatorio = async () => {
    if (!id) return
    try {
      const r = await pb.collection('relatorios').getOne(id, {
        expand: 'candidato,vaga',
      })
      setRelatorio(r)
    } catch (err) {
      console.error(err)
      toast({
        title: 'Relatório não encontrado',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRelatorio()
  }, [id])

  const handlePrint = () => {
    window.print()
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-44 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  if (!relatorio) {
    return (
      <div className="text-center py-12">
        <h3 className="text-base font-bold text-slate-800">Relatório indisponível</h3>
        <Button onClick={() => navigate('/relatorios')} className="mt-4">
          Voltar para lista de relatórios
        </Button>
      </div>
    )
  }

  const cand = relatorio.expand?.candidato
  const vaga = relatorio.expand?.vaga
  const conteudo = relatorio.conteudo || {}

  const scoreGeral = relatorio.score_geral || conteudo.score_geral || 75
  const scoreTec = relatorio.score_tecnico || conteudo.score_tecnico || 75
  const scoreComp = relatorio.score_comportamental || conteudo.score_comportamental || 75
  const veredito = relatorio.veredito || conteudo.veredito || 'Recomendar'

  const vereditoColor =
    veredito === 'Recomendar'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
      : veredito === 'Considerar'
        ? 'bg-amber-50 text-amber-800 border-amber-300'
        : 'bg-rose-50 text-rose-800 border-rose-300'

  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300 max-w-4xl mx-auto print:p-0 print:max-w-none">
      {/* Top back & print actions (hidden in print) */}
      <div className="flex items-center justify-between print:hidden">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/relatorios')}
          className="text-xs text-slate-600 hover:text-slate-900 -ml-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          Voltar para Relatórios
        </Button>

        <div className="flex items-center gap-2">
          {vaga && (
            <Link to={`/vagas/${vaga.id}`}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-bold text-[#E9530E] border-orange-200 hover:bg-orange-50 h-9"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-[#E9530E]" />
                Ver Síntese de Finalistas da Vaga
              </Button>
            </Link>
          )}

          <Button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Exportar como PDF / Imprimir
          </Button>
        </div>
      </div>

      {/* Main Document Paper Sheet */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-8 sm:p-10 space-y-8 print:border-0 print:shadow-none print:p-0">
        {/* Document Header */}
        <div className="flex items-start justify-between border-b border-slate-200 pb-6 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">
                Gente & Gestão · Relatório Oficial de IA
              </span>
            </div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Dossiê de Avaliação e Matching
            </h1>
            <p className="text-xs text-slate-500">
              Emitido pelo agente nativo{' '}
              <span className="font-semibold text-slate-700">Gestor de Talentos</span> em{' '}
              {new Date(relatorio.created).toLocaleDateString('pt-BR')} às{' '}
              {new Date(relatorio.created).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          <Badge variant="outline" className={`text-xs px-3 py-1 font-bold ${vereditoColor}`}>
            Veredito: {veredito}
          </Badge>
        </div>

        {/* Candidate & Vaga Info Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/70 text-xs">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Candidato Avaliado
            </span>
            <p className="font-bold text-slate-900 text-sm">{cand?.nome || 'Candidato'}</p>
            <p className="text-slate-600">
              {cand?.cargo_atual} · {cand?.empresa_atual}
            </p>
            <p className="text-slate-500">
              {cand?.email} · {cand?.telefone}
            </p>
          </div>

          <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Posição Alvo
            </span>
            <p className="font-bold text-slate-900 text-sm">
              {vaga?.titulo || 'Posição Estratégica'}
            </p>
            <p className="text-slate-600">
              Departamento: {vaga?.departamento} · Modalidade: {vaga?.modalidade}
            </p>
            <p className="text-slate-500">Localização: {vaga?.localizacao}</p>
          </div>
        </div>

        {/* Three Score Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 text-center space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-800">
              Score Geral
            </span>
            <p className="text-3xl font-extrabold text-blue-900 tabular-nums">{scoreGeral}%</p>
            <p className="text-[11px] text-blue-700 font-medium">
              {conteudo.veredito_textual || 'Alta aderência'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
              Aderência Técnica
            </span>
            <p className="text-3xl font-extrabold text-slate-900 tabular-nums">{scoreTec}%</p>
            <p className="text-[11px] text-slate-500">Correspondência de stack</p>
          </div>

          <div className="p-4 rounded-xl bg-purple-50/50 border border-purple-200 text-center space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-800">
              Aderência Comportamental
            </span>
            <p className="text-3xl font-extrabold text-purple-900 tabular-nums">{scoreComp}%</p>
            <p className="text-[11px] text-purple-700">Soft skills e cultura</p>
          </div>
        </div>

        {/* Justificativa Executiva */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5">
            1. Justificativa e Parecer Geral
          </h3>
          <p className="text-xs text-slate-700 leading-relaxed">
            {conteudo.justificativa ||
              'O candidato demonstra alinhamento sólido com os principais direcionadores técnicos e maturidade para atuar no nível esperado para o papel. A trajetória profissional comprova experiências compatíveis com os desafios da cadeira.'}
          </p>
        </div>

        {/* Avaliação Detalhada por Dimensão Técnica e Comportamental */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-200 pb-1.5">
            2. Avaliação por Dimensões & Evidências Citadas
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Dimensão Técnica */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">Dimensão Técnica</h4>
                <Badge
                  variant="secondary"
                  className="text-[11px] font-bold bg-blue-100 text-blue-800"
                >
                  {scoreTec}%
                </Badge>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {conteudo.avaliacao_dimensoes?.tecnica?.analise ||
                  'Demonstra domínio prático nas linguagens e arquiteturas prioritárias para a posição.'}
              </p>
              {conteudo.avaliacao_dimensoes?.tecnica?.evidencias && (
                <div className="pt-1 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Evidências citadas do perfil:
                  </span>
                  <ul className="text-[11px] text-slate-600 space-y-0.5">
                    {conteudo.avaliacao_dimensoes.tecnica.evidencias.map(
                      (ev: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-blue-600 font-bold">•</span>
                          <span>{ev}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}
            </div>

            {/* Dimensão Comportamental */}
            <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900">Dimensão Comportamental</h4>
                <Badge
                  variant="secondary"
                  className="text-[11px] font-bold bg-purple-100 text-purple-800"
                >
                  {scoreComp}%
                </Badge>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {conteudo.avaliacao_dimensoes?.comportamental?.analise ||
                  'Apresenta facilidade de comunicação, foco em resolução de problemas e capacidade de trabalho em equipe multidisciplinar.'}
              </p>
              {conteudo.avaliacao_dimensoes?.comportamental?.evidencias && (
                <div className="pt-1 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Evidências citadas do perfil:
                  </span>
                  <ul className="text-[11px] text-slate-600 space-y-0.5">
                    {conteudo.avaliacao_dimensoes.comportamental.evidencias.map(
                      (ev: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-purple-600 font-bold">•</span>
                          <span>{ev}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Pontos Fortes & Riscos / Lacunas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Pontos Fortes Identificados</span>
            </div>
            <ul className="text-xs text-slate-700 space-y-1">
              {(
                conteudo.pontos_fortes || [
                  'Correspondência direta com os requisitos obrigatórios',
                  'Experiência consolidada e com impacto mensurado',
                  'Boa aderência com os valores e rotina do time',
                ]
              ).map((p: string, i: number) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-emerald-600 font-bold">•</span>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-2">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs uppercase tracking-wider">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span>Riscos e Lacunas Técnicas</span>
            </div>
            <ul className="text-xs text-slate-700 space-y-1">
              {(
                conteudo.riscos_lacunas || [
                  'Validar experiência prática nas ferramentas secundárias',
                  'Alinhar expectativa de evolução salarial na etapa de proposta',
                ]
              ).map((r: string, i: number) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span className="text-amber-600 font-bold">•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Recomendação de Contratação & Próximo Passo */}
        <div className="p-5 rounded-xl bg-slate-900 text-white space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] uppercase tracking-wider text-blue-300 font-bold">
              Recomendação Final do Gestor de Talentos
            </span>
            <Badge className="bg-blue-600 text-white border-0 text-[10px]">
              Decisão: {veredito}
            </Badge>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {conteudo.recomendacao_proximo_passo ||
              'Avançar para entrevista técnica e validação de cases práticos.'}
          </p>
        </div>

        {/* Document Footer */}
        <div className="border-t border-slate-200 pt-6 flex items-center justify-between text-[11px] text-slate-400">
          <span>Sistema RH Inteligente · Gente & Gestão</span>
          <span>Confidencial · Uso restrito à liderança e RH</span>
        </div>
      </div>
    </div>
  )
}
