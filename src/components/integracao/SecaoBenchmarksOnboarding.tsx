import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  Award,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  ArrowRight,
} from 'lucide-react'
import { BENCHMARKS_TECH_ONBOARDING, BenchmarkEmpresa } from '@/services/rotinaIntegracaoService'

interface SecaoBenchmarksOnboardingProps {
  onAplicarTemplateSugerido?: (empresaNome: string) => void
}

export function SecaoBenchmarksOnboarding({
  onAplicarTemplateSugerido,
}: SecaoBenchmarksOnboardingProps) {
  const [expandido, setExpandido] = useState(false)
  const [empresaAtivaIndex, setEmpresaAtivaIndex] = useState(0)

  const empresaAtiva = BENCHMARKS_TECH_ONBOARDING[empresaAtivaIndex]

  return (
    <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-sm bg-gradient-to-br from-white via-orange-50/20 to-slate-50/60 dark:from-[#141B34] dark:via-[#1A2240] dark:to-[#11162B] overflow-hidden">
      <CardHeader className="p-4 sm:p-5 border-b border-slate-200/70 dark:border-[#2E3A6E]/60">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#E9530E] text-white flex items-center justify-center font-bold shadow-xs">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="font-display text-base sm:text-lg font-bold text-slate-900 dark:text-[#F7F8FB]">
                  Inspiração dos Benchmarks Tech de Mercado
                </CardTitle>
                <Badge className="bg-[#E9530E]/15 text-[#E9530E] dark:bg-[#E9530E]/20 dark:text-[#F19763] border-none text-[10px] font-bold">
                  Melhores Práticas
                </Badge>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#A8B0C9] mt-0.5">
                Práticas concretas de pré-embarque, rotina 30-60-90, buddy system e check-ins das
                gigantes de tecnologia.
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpandido(!expandido)}
            className="text-xs text-[#E9530E] hover:text-[#C5430A] hover:bg-[#FEF1EA] dark:hover:bg-[#E9530E]/10 self-start sm:self-auto font-semibold"
          >
            {expandido ? (
              <>
                Recolher benchmarks <ChevronUp className="w-3.5 h-3.5 ml-1" />
              </>
            ) : (
              <>
                Ver todas as 5 empresas <ChevronDown className="w-3.5 h-3.5 ml-1" />
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* Pills seletoras de empresas */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {BENCHMARKS_TECH_ONBOARDING.map((b, idx) => {
            const isAtivo = idx === empresaAtivaIndex
            return (
              <button
                key={b.empresa}
                onClick={() => setEmpresaAtivaIndex(idx)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 font-display ${
                  isAtivo
                    ? 'bg-[#E9530E] text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-[#212B55] dark:hover:bg-[#2E3A6E] text-slate-700 dark:text-[#D3D7E5]'
                }`}
              >
                <span>{b.empresa}</span>
                <span className="text-[10px] opacity-75">({b.paisOrigem})</span>
              </button>
            )
          })}
        </div>

        {/* Detalhe da Empresa Ativa */}
        <div className="bg-white/80 dark:bg-[#11162B]/80 rounded-xl p-4 sm:p-5 border border-slate-200/80 dark:border-[#2E3A6E]/80 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 dark:border-[#2E3A6E]/40 pb-3">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#E9530E] font-display">
                Pilar Estratégico de Onboarding
              </span>
              <h3 className="font-display text-base font-bold text-slate-900 dark:text-[#F7F8FB]">
                {empresaAtiva.destaque}
              </h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Fonte: {empresaAtiva.fonte}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {empresaAtiva.praticas.map((pratica, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-slate-50 dark:bg-[#1A2240]/60 border border-slate-100 dark:border-[#2E3A6E]/40 text-xs text-slate-700 dark:text-[#D3D7E5] flex items-start gap-2"
              >
                <div className="w-5 h-5 rounded-md bg-[#FEF1EA] dark:bg-[#E9530E]/20 text-[#E9530E] flex items-center justify-center shrink-0 font-bold text-[11px] mt-0.5">
                  {i + 1}
                </div>
                <p className="leading-relaxed">{pratica}</p>
              </div>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-[#2E3A6E]/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <blockquote className="text-xs italic text-slate-500 dark:text-[#A8B0C9] flex items-center gap-1.5">
              <span className="text-[#E9530E] font-bold text-sm">“</span>
              {empresaAtiva.citacao}
              <span className="text-[#E9530E] font-bold text-sm">”</span>
            </blockquote>

            {onAplicarTemplateSugerido && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAplicarTemplateSugerido(empresaAtiva.empresa)}
                className="text-xs border-[#E9530E]/30 text-[#E9530E] hover:bg-[#FEF1EA] dark:hover:bg-[#E9530E]/10 shrink-0 font-bold"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-[#E9530E]" />
                Aplicar Rotina Deste Benchmark
              </Button>
            )}
          </div>
        </div>

        {/* Grade comparativa quando expandido */}
        {expandido && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2 animate-in fade-in-50 duration-200">
            {BENCHMARKS_TECH_ONBOARDING.map((b) => (
              <div
                key={b.empresa}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240] space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold font-display text-slate-900 dark:text-[#F7F8FB]">
                    {b.empresa}
                  </h4>
                  <Badge variant="outline" className="text-[9px]">
                    {b.paisOrigem}
                  </Badge>
                </div>
                <p className="text-[11px] font-semibold text-[#E9530E]">{b.destaque}</p>
                <ul className="space-y-1 text-[11px] text-slate-600 dark:text-[#A8B0C9] pl-3 list-disc">
                  {b.praticas.map((p, idx) => (
                    <li key={idx} className="line-clamp-2">
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
