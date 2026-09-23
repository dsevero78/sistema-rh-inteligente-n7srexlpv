import React, { useState, useEffect, useCallback } from 'react'
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Clock,
  Layers,
  FileText,
  DollarSign,
  ShieldAlert,
  Loader2,
  Info,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  indicadoresForcaService,
  type PainelIndicadoresForcaTrabalho,
  type MetadadosIndicador,
} from '@/services/indicadoresForcaService'

interface Props {
  empresaId: string
  periodoReferencia: string // YYYY-MM
}

export const AbaIndicadoresForca: React.FC<Props> = ({ empresaId, periodoReferencia }) => {
  const { toast } = useToast()
  const [painel, setPainel] = useState<PainelIndicadoresForcaTrabalho | null>(null)
  const [loading, setLoading] = useState(false)
  const [indicadorDetalhe, setIndicadorDetalhe] = useState<MetadadosIndicador | null>(null)

  const carregarIndicadores = useCallback(async () => {
    setLoading(true)
    try {
      const data = await indicadoresForcaService.carregarIndicadoresForca(
        empresaId,
        periodoReferencia,
        false, // dados demonstrativos excluídos por padrão
      )
      setPainel(data)
    } catch (err: any) {
      toast({
        title: 'Erro ao consolidar indicadores',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [empresaId, periodoReferencia, toast])

  useEffect(() => {
    carregarIndicadores()
  }, [empresaId, periodoReferencia])

  const renderBadgeStatus = (status: MetadadosIndicador['statusDado']) => {
    switch (status) {
      case 'CONFIRMADO':
        return (
          <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 text-[10px]">
            Confirmado
          </Badge>
        )
      case 'PARCIAL':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 text-[10px]">
            Dado Parcial
          </Badge>
        )
      case 'DADO AUSENTE':
        return (
          <Badge className="bg-rose-100 text-rose-800 hover:bg-rose-100 text-[10px]">
            Dado Ausente
          </Badge>
        )
      case 'PENDENTE DE GOVERNANÇA':
        return (
          <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100 text-[10px]">
            Pendente Governança
          </Badge>
        )
    }
  }

  const renderCardIndicador = (ind: MetadadosIndicador) => {
    return (
      <Card
        key={ind.id}
        onClick={() => setIndicadorDetalhe(ind)}
        className="border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer transition-all hover:shadow-sm"
      >
        <CardHeader className="pb-2 flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {ind.nome}
            </CardTitle>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{ind.definicao}</p>
          </div>
          {renderBadgeStatus(ind.statusDado)}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-bold text-slate-900 dark:text-white">
              {ind.valorFormatado}
            </span>
            <span className="text-[10px] text-slate-400 font-mono">{ind.unidade}</span>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
            <span>Fonte: {ind.fonteDados.split('/')[0]}</span>
            <span className="text-indigo-600 dark:text-indigo-400 font-medium">Ver memória →</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Aviso de Governança dos Indicadores */}
      <div className="p-3.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-start gap-3">
        <Info className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
          <p className="font-semibold text-slate-800 dark:text-slate-200">
            Painel de Indicadores Determinísticos e Verificáveis (Módulo 1)
          </p>
          <p>
            Todos os indicadores são extraídos diretamente dos registros do sistema com regras
            matemáticas estritas.
            <strong> Dados ausentes nunca aparecem como zero aritmético arbitrário</strong>, e
            totais incompletos são explicitamente rotulados como <em>Parciais</em>.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-[#E9530E]" />
          <p className="text-xs text-slate-500">Calculando indicadores da força de trabalho...</p>
        </div>
      ) : painel ? (
        <div className="space-y-6">
          {/* Seção 1: Capacidade e Posições */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              1. Posições e Demandas Organizacionais
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderCardIndicador(painel.posicoesAprovadas)}
              {renderCardIndicador(painel.posicoesOcupadas)}
              {renderCardIndicador(painel.posicoesVagas)}
              {renderCardIndicador(painel.demandasSemAtendimento)}
            </div>
          </div>

          {/* Seção 2: Capacidade Operacional e Margem */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              2. Capacidade da Força de Trabalho & Governança de Reserva
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderCardIndicador(painel.capacidadeLiquidaTotal)}
              {renderCardIndicador(painel.capacidadeComprometidaTotal)}
              {renderCardIndicador(painel.saldoAntesReserva)}
              {renderCardIndicador(painel.disponivelAposReservaAprovada)}
            </div>
          </div>

          {/* Seção 3: Competências e Custos */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              3. Competências com Evidência & Consolidação de Custos
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {renderCardIndicador(painel.coberturaCompetenciasComEvidencia)}
              {renderCardIndicador(painel.custosPlanejadosSnapshot)}
              {renderCardIndicador(painel.custosEstimadosAtuais)}
              {renderCardIndicador(painel.custosRealizadosOficiais)}
            </div>
          </div>

          {/* Pendências e Divergências Detectadas */}
          {painel.pendenciasQueAfetamCalculos.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Pendências e Condições de Governança que Afetam os Cálculos
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 text-xs text-amber-900 dark:text-amber-200">
                <ul className="list-disc pl-5 space-y-1">
                  {painel.pendenciasQueAfetamCalculos.map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      ) : null}

      {/* MODAL DETALHE / MEMÓRIA DO INDICADOR */}
      <Dialog open={Boolean(indicadorDetalhe)} onOpenChange={() => setIndicadorDetalhe(null)}>
        <DialogContent className="max-w-lg">
          {indicadorDetalhe && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 bg-slate-100 rounded text-slate-600">
                    {indicadorDetalhe.id}
                  </span>
                  {renderBadgeStatus(indicadorDetalhe.statusDado)}
                </div>
                <DialogTitle className="text-base font-bold">{indicadorDetalhe.nome}</DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {indicadorDetalhe.definicao}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3 py-2 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Valor Apurado:</span>
                  <span className="text-lg font-bold text-slate-900 dark:text-white">
                    {indicadorDetalhe.valorFormatado}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">Fórmula de Cálculo:</span>
                    <span className="font-mono text-slate-800 dark:text-slate-200">
                      {indicadorDetalhe.formula}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">Fonte de Dados:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {indicadorDetalhe.fonteDados}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">Período de Referência:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {indicadorDetalhe.periodoReferencia}
                    </span>
                  </div>
                  <div className="flex justify-between border-b pb-1">
                    <span className="text-slate-500">Última Atualização:</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {indicadorDetalhe.dataAtualizacao?.slice(0, 19).replace('T', ' ')}
                    </span>
                  </div>
                </div>

                {indicadorDetalhe.exclusoes?.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Exclusões Aplicadas:
                    </span>
                    <ul className="list-disc pl-4 text-slate-500 text-[11px] space-y-0.5">
                      {indicadorDetalhe.exclusoes.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {indicadorDetalhe.limitacoes?.length > 0 && (
                  <div>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                      Limitações Metodológicas:
                    </span>
                    <ul className="list-disc pl-4 text-slate-500 text-[11px] space-y-0.5">
                      {indicadorDetalhe.limitacoes.map((l, i) => (
                        <li key={i}>{l}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => setIndicadorDetalhe(null)}>
                  Fechar
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
