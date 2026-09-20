import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  ContratoPJ,
  AditivoPJ,
  calcularPrazosContrato,
  calcularValorHora,
  calcularValorMensalEfetivo,
  calcularVigenciaFimEfetiva,
  HORAS_MES_PADRAO,
} from '@/services/prestadoresPj'
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  FileSignature,
  DollarSign,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
  Plus,
} from 'lucide-react'

interface BlocoPrazosEFinanceiroContratoProps {
  contrato: ContratoPJ
  aditivos?: AditivoPJ[]
  onNovoAditivo?: () => void
}

export const BlocoPrazosEFinanceiroContrato: React.FC<BlocoPrazosEFinanceiroContratoProps> = ({
  contrato,
  aditivos = [],
  onNovoAditivo,
}) => {
  // Aditivos vigentes deste contrato
  const aditivosDoContrato = aditivos.filter((a) => a.contrato === contrato.id)
  const contadorAditivos = aditivosDoContrato.length

  // Datas e valores vigentes efetivos
  const vigenciaFimEfetiva = calcularVigenciaFimEfetiva(contrato, aditivosDoContrato)
  const valorMensalEfetivo = calcularValorMensalEfetivo(contrato, aditivosDoContrato)
  const infoValorHora = calcularValorHora(contrato, aditivosDoContrato)

  // Cálculo de prazos e semáforo
  const prazos = calcularPrazosContrato(contrato.data_inicio, vigenciaFimEfetiva)

  // Configuração visual do semáforo
  const semaforoConfig = {
    verde: {
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      indicadorCor: 'bg-emerald-500',
      barraCor: 'bg-emerald-600',
      cardBorda: 'border-emerald-200 bg-emerald-50/10',
      icone: CheckCircle2,
      titulo: 'Vigência Regular',
    },
    ambar: {
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-300',
      indicadorCor: 'bg-amber-500 animate-pulse',
      barraCor: 'bg-amber-500',
      cardBorda: 'border-amber-300 bg-amber-50/20',
      icone: Clock,
      titulo: 'Atenção ao Prazo',
    },
    vermelho: {
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-300',
      indicadorCor: 'bg-rose-500 animate-pulse',
      barraCor: 'bg-rose-600',
      cardBorda: 'border-rose-300 bg-rose-50/30',
      icone: AlertTriangle,
      titulo: 'Vencendo em até 30 dias',
    },
    vencido: {
      badgeBg: 'bg-slate-200 text-slate-800 border-slate-300',
      indicadorCor: 'bg-slate-600',
      barraCor: 'bg-slate-600',
      cardBorda: 'border-slate-300 bg-slate-50',
      icone: AlertCircle,
      titulo: 'Contrato Vencido',
    },
  }[prazos.statusSemaforo]

  const IconeSemaforo = semaforoConfig.icone

  const inicioFmt = new Date(contrato.data_inicio).toLocaleDateString('pt-BR')
  const fimFmt = new Date(vigenciaFimEfetiva).toLocaleDateString('pt-BR')
  const fimOriginalFmt = new Date(contrato.data_fim).toLocaleDateString('pt-BR')
  const houveProrrogacao = vigenciaFimEfetiva !== contrato.data_fim

  return (
    <Card className={`border shadow-xs ${semaforoConfig.cardBorda} transition-all`}>
      <CardContent className="p-5 space-y-4">
        {/* Topo: Título do Contrato, Semáforo e Botão Novo Aditivo */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-bold text-slate-900">{contrato.titulo}</h4>
              <Badge variant="outline" className="text-[11px] font-mono">
                {contrato.numero_contrato || 'S/N'}
              </Badge>
              <Badge className={semaforoConfig.badgeBg}>
                <span className={`w-2 h-2 rounded-full ${semaforoConfig.indicadorCor} mr-1.5`} />
                {prazos.statusTexto}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500">
              Tipo: <strong>{contrato.tipo}</strong> &bull; Gestor:{' '}
              <strong>{contrato.gestor_nome || 'RH / Jurídico'}</strong>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="bg-indigo-50/70 border-indigo-200 text-indigo-700 text-xs font-semibold px-2.5 py-1"
            >
              <FileSignature className="w-3.5 h-3.5 mr-1" />
              {contadorAditivos} aditivo(s)
            </Badge>

            {onNovoAditivo && (
              <Button
                size="sm"
                variant="outline"
                onClick={onNovoAditivo}
                className="h-8 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                <Plus className="w-3 h-3 mr-1" />
                Aditivo
              </Button>
            )}
          </div>
        </div>

        {/* Grade Central: Prazos com Semáforo e Bloco Financeiro com Valor-Hora */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Coluna 1: Prazos, Vigência e Barra de Decurso */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-purple-600" />
                Cronograma de Vigência
              </span>
              <span className="text-[11px] font-bold text-slate-600">
                {prazos.percentualDecorrido}% decorrido
              </span>
            </div>

            {/* Barra de Progresso do Tempo de Contrato */}
            <div className="space-y-1">
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full ${semaforoConfig.barraCor} transition-all duration-300`}
                  style={{ width: `${prazos.percentualDecorrido}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Início: {inicioFmt}</span>
                <span>Término: {fimFmt}</span>
              </div>
            </div>

            {/* Detalhes de Dias Restantes e Prorrogações */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Dias Restantes</span>
                <strong
                  className={`text-base font-bold ${
                    prazos.diasRestantes <= 30
                      ? 'text-rose-600'
                      : prazos.diasRestantes <= 60
                        ? 'text-amber-600'
                        : 'text-slate-900'
                  }`}
                >
                  {prazos.diasRestantes > 0 ? prazos.diasRestantes : 0}
                </strong>
                <span className="text-[10px] text-slate-400 block">
                  de {prazos.diasTotais} dias totais
                </span>
              </div>

              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Vigência Final</span>
                <strong className="text-sm font-bold text-purple-900 block truncate">
                  {fimFmt}
                </strong>
                {houveProrrogacao && (
                  <span className="text-[10px] text-purple-600 font-medium block truncate">
                    Prorrogado via aditivo
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Coluna 2: Controle Financeiro em Destaque & Valor-Hora (Base 160h/mês) */}
          <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                Valor da Prestação & Valor-Hora
              </span>
              <span className="text-[11px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-semibold border border-indigo-200">
                base 160h/mês
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Valor Mensal Atual */}
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <span className="text-[10px] text-slate-400 block">Valor Mensal Atual</span>
                <strong className="text-base font-extrabold text-blue-700 block">
                  R$ {valorMensalEfetivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </strong>
                <span className="text-[10px] text-slate-500">
                  {contrato.valor !== valorMensalEfetivo
                    ? `Reajustado de R$ ${contrato.valor?.toLocaleString('pt-BR')}`
                    : 'Valor inicial de contrato'}
                </span>
              </div>

              {/* Valor-Hora Calculado (÷ 160) */}
              <div className="bg-indigo-50/60 p-2.5 rounded-lg border border-indigo-200/70">
                <span className="text-[10px] text-indigo-600 font-semibold block">
                  Valor-Hora Calculado
                </span>
                <strong className="text-base font-extrabold text-indigo-900 block">
                  R${' '}
                  {infoValorHora.valorHora.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  <span className="text-xs font-normal text-indigo-600">/h</span>
                </strong>
                <span className="text-[10px] text-indigo-700 font-mono block">
                  (R$ {valorMensalEfetivo.toLocaleString('pt-BR')} ÷ 160h)
                </span>
              </div>
            </div>

            {/* Alerta de Estimativa ou Regra do Contrato */}
            <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
              <span>
                Faturamento: <strong>{contrato.tipo}</strong>
              </span>
              {infoValorHora.isEstimativa && (
                <span className="text-amber-700 font-medium">Equivalência mensal estimada</span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
export default BlocoPrazosEFinanceiroContrato
