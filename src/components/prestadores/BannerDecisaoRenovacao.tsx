import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  PrestadorPJ,
  ContratoPJ,
  AditivoPJ,
  AvaliacaoPrestadorPJ,
  calcularVigenciaFimEfetiva,
  calcularValorMensalEfetivo,
  HORAS_MES_PADRAO,
} from '@/services/prestadoresPj'
import { ModalRenovacaoAssistidaIA } from './ModalRenovacaoAssistidaIA'
import {
  Sparkles,
  ArrowRight,
  Clock,
  DollarSign,
  Star,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Scale,
} from 'lucide-react'

export interface DecisaoRenovacaoInfo {
  tier: 'RENOVAR' | 'RENEGOCIAR' | 'REAVALIAR'
  emoji: string
  diasRestantes: number
  dataFimEfetiva: string
  contrato: ContratoPJ | null
  valorMensal: number
  valorHora: number
  custoPorPonto: number
  medianaPortforlio: number
  notaMedia: number
  recomendacaoCurta: string
  acimaDaMediana: boolean
  temAditivoPendente: boolean
}

/**
 * Calcula se o prestador possui contrato na janela de renovação (<= 60 dias)
 * e determina a decisão do comparativo de custo de forma idempotente com o backend.
 */
export function calcularDecisaoRenovacaoPrestador(
  prestador: PrestadorPJ,
  contratos: ContratoPJ[],
  aditivos: AditivoPJ[],
  avaliacoes: AvaliacaoPrestadorPJ[],
  todosPrestadores: PrestadorPJ[] = [],
): DecisaoRenovacaoInfo | null {
  const contratosDoPrestador = contratos.filter(
    (c) => c.prestador === prestador.id && (c.status === 'Vigente' || c.status === 'Vencendo'),
  )

  if (contratosDoPrestador.length === 0) return null

  // Calcular vigência final efetiva considerando os aditivos de prolongamento
  let contratoAlvo: ContratoPJ | null = null
  let menorDiffDias = Infinity
  let dataFimEfetivaFinal = ''

  const agora = new Date()

  for (const c of contratosDoPrestador) {
    const aditsDoC = aditivos.filter((a) => a.contrato === c.id)
    const fimEfetivoStr = calcularVigenciaFimEfetiva(c, aditsDoC)
    if (!fimEfetivoStr) continue

    const fimDate = new Date(fimEfetivoStr)
    const diffDias = Math.ceil((fimDate.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))

    // Janela de renovação inteligente: <= 60 dias e não encerrado há mais de 30 dias
    if (diffDias <= 60 && diffDias < menorDiffDias) {
      menorDiffDias = diffDias
      contratoAlvo = c
      dataFimEfetivaFinal = fimEfetivoStr
    }
  }

  if (!contratoAlvo || menorDiffDias > 60) return null

  // Aditivos do prestador
  const aditsPrestador = aditivos.filter((a) => a.prestador === prestador.id)
  const temAditivoPendente = aditsPrestador.some((a) => a.status === 'Pendente de assinatura')

  // Valor mensal efetivo
  let valorMensal =
    prestador.valor_mensal_atual && prestador.valor_mensal_atual > 0
      ? prestador.valor_mensal_atual
      : calcularValorMensalEfetivo(contratoAlvo, aditsPrestador)

  const valorHora = Number((valorMensal / HORAS_MES_PADRAO).toFixed(2))

  // Mediana do portfólio
  const listaPortfólio = todosPrestadores.length > 0 ? todosPrestadores : [prestador]
  const valoresHoraPort = listaPortfólio
    .map((p) => (p.valor_mensal_atual && p.valor_mensal_atual > 0 ? p.valor_mensal_atual / 160 : 0))
    .filter((v) => v > 0)
    .sort((a, b) => a - b)

  let mediana = 100
  if (valoresHoraPort.length > 0) {
    const mid = Math.floor(valoresHoraPort.length / 2)
    mediana =
      valoresHoraPort.length % 2 !== 0
        ? valoresHoraPort[mid]
        : (valoresHoraPort[mid - 1] + valoresHoraPort[mid]) / 2
    mediana = Number(mediana.toFixed(2))
  }

  // Avaliação
  const avs = avaliacoes.filter((a) => a.prestador === prestador.id)
  const notaMedia = prestador.media_avaliacao || (avs.length > 0 ? avs[0].nota_media : 8.8)
  const recomendacao = avs.length > 0 ? avs[0].recomendacao || '' : ''

  const custoPorPonto = notaMedia > 0 ? Number((valorHora / notaMedia).toFixed(2)) : valorHora
  const acimaDaMediana = valorHora > mediana

  let tier: 'RENOVAR' | 'RENEGOCIAR' | 'REAVALIAR' = 'RENOVAR'
  let emoji = '🟢'
  let recomendacaoCurta = ''

  if (notaMedia < 8.0 || recomendacao.toLowerCase().includes('não renovar')) {
    tier = 'REAVALIAR'
    emoji = '🔴'
    recomendacaoCurta =
      'Desempenho abaixo do limiar (nota ' +
      notaMedia.toFixed(1) +
      '/10). Abrir cotação no mercado para substituição ou plano de recuperação.'
  } else if (
    acimaDaMediana ||
    notaMedia < 9.0 ||
    temAditivoPendente ||
    recomendacao.toLowerCase().includes('ressalvas')
  ) {
    tier = 'RENEGOCIAR'
    emoji = '🟡'
    recomendacaoCurta =
      'Custo-hora acima da mediana ou avaliação com ressalvas. Renegociar escopo/taxas e tramitar aditivo formal.'
  } else {
    tier = 'RENOVAR'
    emoji = '🟢'
    recomendacaoCurta =
      'Excelente entrega (nota ' +
      notaMedia.toFixed(1) +
      '/10) e custo por ponto competitivo. Prorrogar vigência mantendo bases vigentes.'
  }

  return {
    tier,
    emoji,
    diasRestantes: menorDiffDias,
    dataFimEfetiva: dataFimEfetivaFinal,
    contrato: contratoAlvo,
    valorMensal,
    valorHora,
    custoPorPonto,
    medianaPortforlio: mediana,
    notaMedia,
    recomendacaoCurta,
    acimaDaMediana,
    temAditivoPendente,
  }
}

interface BannerDecisaoRenovacaoProps {
  prestador: PrestadorPJ
  decisao: DecisaoRenovacaoInfo
  variante?: 'compacto' | 'completo'
  onAtualizar?: () => void
}

export const BannerDecisaoRenovacao: React.FC<BannerDecisaoRenovacaoProps> = ({
  prestador,
  decisao,
  variante = 'compacto',
  onAtualizar,
}) => {
  const [modalIaOpen, setModalIaOpen] = useState(false)

  const isRenovar = decisao.tier === 'RENOVAR'
  const isRenegociar = decisao.tier === 'RENEGOCIAR'
  const isReavaliar = decisao.tier === 'REAVALIAR'

  const corBorda = isRenovar
    ? 'border-emerald-300 bg-gradient-to-r from-emerald-50/70 via-white to-emerald-50/30'
    : isRenegociar
      ? 'border-amber-300 bg-gradient-to-r from-amber-50/80 via-white to-amber-50/30'
      : 'border-rose-300 bg-gradient-to-r from-rose-50/80 via-white to-rose-50/30'

  const corTexto = isRenovar
    ? 'text-emerald-900'
    : isRenegociar
      ? 'text-amber-950'
      : 'text-rose-950'

  const corBadge = isRenovar
    ? 'bg-emerald-600 text-white shadow-xs shadow-emerald-500/20'
    : isRenegociar
      ? 'bg-amber-600 text-white shadow-xs shadow-amber-500/20'
      : 'bg-rose-600 text-white shadow-xs shadow-rose-500/20'

  if (variante === 'compacto') {
    return (
      <>
        <div
          onClick={(e) => e.stopPropagation()}
          className={`rounded-xl border p-3 shadow-2xs transition-all ${corBorda} space-y-2`}
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${corBadge}`}
              >
                {decisao.emoji} Decisão: {decisao.tier}
              </span>
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                {decisao.diasRestantes <= 0 ? 'Vence hoje' : `Restam ${decisao.diasRestantes} dias`}
              </span>
            </div>

            <div className="text-[11px] font-mono font-semibold text-slate-700">
              R$ {decisao.valorHora.toFixed(2)}/h
            </div>
          </div>

          <p className="text-[11px] text-slate-700 leading-snug line-clamp-2">
            {decisao.recomendacaoCurta}
          </p>

          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
            <span className="text-[10px] text-slate-500">
              Custo/pt: <strong>R$ {decisao.custoPorPonto.toFixed(2)}</strong> (nota{' '}
              {decisao.notaMedia.toFixed(1)})
            </span>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setModalIaOpen(true)}
              className="h-6 text-[10px] px-2 font-bold border-purple-200 text-purple-800 bg-white hover:bg-purple-50"
            >
              <Sparkles className="w-3 h-3 mr-1 text-purple-600" />
              Renovar com IA
            </Button>
          </div>
        </div>

        <ModalRenovacaoAssistidaIA
          open={modalIaOpen}
          onOpenChange={setModalIaOpen}
          prestador={prestador}
          contrato={decisao.contrato || undefined}
          onSucesso={onAtualizar}
        />
      </>
    )
  }

  // VARIANTE COMPLETO (Ficha do Prestador)
  return (
    <>
      <Card className={`border-2 shadow-sm rounded-2xl overflow-hidden ${corBorda}`}>
        <CardContent className="p-5 sm:p-6 space-y-4">
          {/* Topo do Banner Completo */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`font-display text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${corBadge}`}
                >
                  {decisao.emoji} Decisão de Renovação: {decisao.tier}
                </span>
                <Badge
                  variant="outline"
                  className="font-display text-xs bg-white/90 border-slate-300 font-bold text-slate-700"
                >
                  <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                  Janela de 60 dias aberta (
                  <span className="font-mono">{decisao.diasRestantes}</span> dias restantes)
                </Badge>
                {decisao.temAditivoPendente && (
                  <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-xs font-medium">
                    Aditivo pendente de assinatura
                  </Badge>
                )}
              </div>

              <h3 className={`font-display text-base sm:text-lg font-bold ${corTexto}`}>
                Parecer Estratégico do Comparativo de Custos & Performance
              </h3>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed max-w-3xl">
                {decisao.recomendacaoCurta}
              </p>
            </div>

            {/* CTAs de Ação Rápida */}
            <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
              <Link to="/financeiro?tab=comparativo">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-xs font-bold border-slate-300 bg-white text-slate-800 hover:bg-slate-50 shadow-2xs"
                >
                  <Scale className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
                  Ver Comparativo de Custo
                  <ChevronRight className="w-3.5 h-3.5 ml-1 text-slate-400" />
                </Button>
              </Link>

              <Button
                size="sm"
                onClick={() => setModalIaOpen(true)}
                className="h-9 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Gerar Renovação com IA
              </Button>
            </div>
          </div>

          {/* Grid dos Números que Sustentam a Decisão */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 pt-2 border-t border-slate-200/80">
            <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
              <span className="font-display text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                Valor Mensal Atual
              </span>
              <span className="text-sm font-bold font-mono text-slate-900 block mt-0.5 tabular-nums">
                R$ {decisao.valorMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-[9px] text-slate-400">Contrato vigente</span>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
              <span className="font-display text-[10px] text-indigo-700 font-bold block uppercase tracking-wider">
                Valor-Hora (160h)
              </span>
              <span className="text-sm font-bold font-mono text-indigo-900 block mt-0.5 tabular-nums">
                R$ {decisao.valorHora.toFixed(2)}/h
              </span>
              <span className="text-[9px] text-indigo-600">Base contratual</span>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
              <span className="font-display text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                Custo por Ponto
              </span>
              <span className="text-sm font-bold font-mono text-slate-900 block mt-0.5 tabular-nums">
                R$ {decisao.custoPorPonto.toFixed(2)}/pt
              </span>
              <span className="text-[9px] text-slate-400">Hora ÷ Nota</span>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
              <span className="font-display text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                Nota de Avaliação
              </span>
              <span className="text-sm font-bold font-mono text-purple-700 block mt-0.5 flex items-center gap-1 tabular-nums">
                <Star className="w-3.5 h-3.5 fill-purple-600 text-purple-600" />
                {decisao.notaMedia.toFixed(1)}/10
              </span>
              <span className="text-[9px] text-slate-400">Desempenho</span>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
              <span className="font-display text-[10px] text-slate-500 font-bold block uppercase tracking-wider">
                Mediana do Portfólio
              </span>
              <span className="text-sm font-bold font-mono text-slate-800 block mt-0.5 tabular-nums">
                R$ {decisao.medianaPortforlio.toFixed(2)}/h
              </span>
              <span
                className={`text-[9px] font-bold ${decisao.acimaDaMediana ? 'text-amber-700' : 'text-emerald-700'}`}
              >
                {decisao.acimaDaMediana ? 'Acima da mediana' : 'Na mediana'}
              </span>
            </div>

            <div className="bg-white/80 p-2.5 rounded-xl border border-slate-200/70">
              <span className="font-display text-[10px] text-amber-700 font-bold block uppercase tracking-wider">
                Dias para Vencer
              </span>
              <span className="text-sm font-bold font-mono text-amber-800 block mt-0.5 tabular-nums">
                ~{decisao.diasRestantes} dias
              </span>
              <span className="text-[9px] text-slate-400">
                {decisao.dataFimEfetiva
                  ? new Date(decisao.dataFimEfetiva).toLocaleDateString('pt-BR')
                  : 'Vigência final'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <ModalRenovacaoAssistidaIA
        open={modalIaOpen}
        onOpenChange={setModalIaOpen}
        prestador={prestador}
        contrato={decisao.contrato || undefined}
        onSucesso={onAtualizar}
      />
    </>
  )
}
