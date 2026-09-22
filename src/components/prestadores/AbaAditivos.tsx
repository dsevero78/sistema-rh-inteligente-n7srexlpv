import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AditivoPJ,
  ContratoPJ,
  PrestadorPJ,
  prestadoresService,
  calcularValorHora,
  HORAS_MES_PADRAO,
  getAnexoUrl,
} from '@/services/prestadoresPj'
import { useToast } from '@/hooks/use-toast'
import {
  FileSignature,
  Plus,
  Calendar,
  Clock,
  TrendingUp,
  FileText,
  ExternalLink,
  Edit2,
  Trash2,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Hourglass,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Scale,
} from 'lucide-react'
import { ModalNovoAditivo } from './ModalNovoAditivo'
import { DocumentViewerModal } from './DocumentViewerModal'
import { ModalFluxoJuridicoAditivo } from './ModalFluxoJuridicoAditivo'

interface AbaAditivosProps {
  prestador: PrestadorPJ
  contratos: ContratoPJ[]
  aditivos: AditivoPJ[]
  onAtualizar: () => void
}

export const AbaAditivos: React.FC<AbaAditivosProps> = ({
  prestador,
  contratos,
  aditivos,
  onAtualizar,
}) => {
  const { toast } = useToast()

  const [modalNovoOpen, setModalNovoOpen] = useState(false)
  const [aditivoParaEditar, setAditivoParaEditar] = useState<AditivoPJ | null>(null)
  const [contratoPreSelecionadoId, setContratoPreSelecionadoId] = useState<string | undefined>(
    undefined,
  )

  // Visualizador de anexos
  const [viewerOpen, setViewerOpen] = useState(false)
  const [viewerUrl, setViewerUrl] = useState('')
  const [viewerTitle, setViewerTitle] = useState('')
  const [viewerFilename, setViewerFilename] = useState<string | undefined>(undefined)

  // Estado para aprovação interna do jurídico
  const [modalJuridicoOpen, setModalJuridicoOpen] = useState(false)
  const [aditivoJuridico, setAditivoJuridico] = useState<AditivoPJ | null>(null)

  const abrirVisualizador = (aditivo: AditivoPJ) => {
    if (!aditivo.anexo_aditivo) return
    const url = getAnexoUrl(aditivo, aditivo.anexo_aditivo)
    setViewerUrl(url)
    setViewerTitle(
      `Aditivo ${aditivo.numero_aditivo} - ${prestador.nome_fantasia || prestador.razao_social}`,
    )
    setViewerFilename(aditivo.anexo_aditivo)
    setViewerOpen(true)
  }

  const handleExcluirAditivo = async (aditivo: AditivoPJ) => {
    if (
      !confirm(
        `Deseja realmente remover o aditivo ${aditivo.numero_aditivo}? O histórico e contadores serão recalculados.`,
      )
    ) {
      return
    }

    try {
      await prestadoresService.excluirAditivo(aditivo.id)
      toast({
        title: 'Aditivo removido',
        description: `O aditivo ${aditivo.numero_aditivo} foi removido com sucesso.`,
      })
      onAtualizar()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao excluir aditivo',
        description: err instanceof Error ? err.message : 'Falha.',
        variant: 'destructive',
      })
    }
  }

  const handleMarcarComoVigente = async (aditivo: AditivoPJ) => {
    try {
      await prestadoresService.atualizarAditivo(aditivo.id, {
        status: 'Vigente',
        data_assinatura:
          aditivo.data_assinatura || new Date().toISOString().substring(0, 10) + ' 00:00:00.000Z',
      })
      toast({
        title: 'Aditivo Ativado com Sucesso!',
        description: `O aditivo ${aditivo.numero_aditivo} agora está Vigente e as vigências/valores foram aplicados.`,
      })
      onAtualizar()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao ativar aditivo',
        description: err instanceof Error ? err.message : 'Falha ao atualizar.',
        variant: 'destructive',
      })
    }
  }

  // Agrupamento de aditivos ou ordenação cronológica
  const aditivosOrdenados = [...aditivos].sort((a, b) => {
    // Ordenar por data ou por sequência decrescente
    const seqA = a.sequencia || 0
    const seqB = b.sequencia || 0
    return seqB - seqA
  })

  // Badges de Status do Aditivo
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Vigente':
        return (
          <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700 text-xs font-bold gap-1 shadow-2xs">
            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Vigente
          </Badge>
        )
      case 'Aprovado pelo jurídico':
        return (
          <Badge className="bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-700 text-xs font-bold gap-1 shadow-2xs">
            <CheckCircle2 className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            Aprovado pelo Jurídico
          </Badge>
        )
      case 'Em análise pelo jurídico':
        return (
          <Badge className="bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700 text-xs font-bold gap-1 shadow-2xs">
            <Hourglass className="w-3 h-3 text-purple-600 dark:text-purple-400 animate-spin" />
            Em análise pelo Jurídico
          </Badge>
        )
      case 'Ajustes solicitados':
        return (
          <Badge className="bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700 text-xs font-bold gap-1 shadow-2xs">
            <AlertCircle className="w-3 h-3 text-rose-600 dark:text-rose-400" />
            Ajustes Solicitados
          </Badge>
        )
      case 'Minuta gerada':
        return (
          <Badge className="bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 text-xs font-bold gap-1 shadow-2xs">
            <FileSignature className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            Minuta Gerada
          </Badge>
        )
      case 'Pendente de assinatura':
        return (
          <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700 text-xs font-bold gap-1 shadow-2xs">
            <Hourglass className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            Pendente de assinatura
          </Badge>
        )
      case 'Rascunho':
      default:
        return (
          <Badge
            variant="outline"
            className="text-xs text-slate-600 dark:text-slate-400 border-slate-300 dark:border-[#2E3A6E]"
          >
            Rascunho
          </Badge>
        )
    }
  }

  // Badges de Tipo de Aditivo
  const renderTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'Reajuste de valor':
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200 text-[11px]">
            Reajuste de valor
          </Badge>
        )
      case 'Prolongamento de vigência':
        return (
          <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[11px]">
            Prolongamento de vigência
          </Badge>
        )
      case 'Reajuste e Prolongamento':
        return (
          <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200 text-[11px]">
            Reajuste & Prorrogação
          </Badge>
        )
      case 'Mudança de escopo':
        return (
          <Badge className="bg-teal-100 text-teal-800 border-teal-200 text-[11px]">
            Mudança de escopo
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-[11px] text-slate-600">
            {tipo}
          </Badge>
        )
    }
  }

  // Contadores globais
  const totalAditivos = aditivos.length
  const vigentes = aditivos.filter((a) => a.status === 'Vigente').length
  const pendentes = aditivos.filter((a) => a.status === 'Pendente de assinatura').length

  return (
    <div className="space-y-5">
      {/* Topo da Aba com Estatísticas e Botão Novo Aditivo */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <FileSignature className="w-4 h-4 text-indigo-600" />
              Gestão de Aditivos Contratuais & Histórico de Alterações
            </h3>{' '}
            <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold text-xs">
              {totalAditivos} aditivo(s)
            </Badge>
          </div>
          <p className="text-xs text-slate-500">
            Controle de prorrogação de vigência, reajustes de valor, cálculo de valor-hora (base
            160h/mês) e histórico imutável.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => {
            setAditivoParaEditar(null)
            setContratoPreSelecionadoId(undefined)
            setModalNovoOpen(true)
          }}
          disabled={contratos.length === 0}
          className="h-8.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Novo Aditivo
        </Button>
      </div>

      {/* Mini-KPIs dos Aditivos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Total de Aditivos
            </span>
            <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
              {totalAditivos} formalizados
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs font-mono">
            {totalAditivos}
          </div>
        </div>

        <div className="bg-emerald-50/60 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 block">
              Aditivos Vigentes
            </span>
            <span className="text-xl font-bold font-mono text-emerald-900 dark:text-emerald-200 tabular-nums">
              {vigentes} em execução
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 flex items-center justify-between">
          <div>
            <span className="font-display text-[11px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
              Aguardando Assinatura
            </span>
            <span className="text-xl font-bold font-mono text-amber-900 dark:text-amber-200 tabular-nums">
              {pendentes} pendente(s)
            </span>
          </div>
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 flex items-center justify-center">
            <Hourglass className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Lista Cronológica de Aditivos */}
      {aditivosOrdenados.length === 0 ? (
        <Card className="border-dashed border-slate-300">
          <CardContent className="p-10 text-center space-y-3">
            <FileSignature className="w-10 h-10 text-slate-300 mx-auto" />
            <div>
              <h4 className="font-display text-base font-bold text-slate-800">
                Nenhum aditivo registrado
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                Formalize prorrogações de prazo ou reajustes periódicos sem sobrescrever os termos
                iniciais do contrato.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setAditivoParaEditar(null)
                setModalNovoOpen(true)
              }}
              disabled={contratos.length === 0}
              variant="outline"
              className="text-xs border-indigo-300 text-indigo-700 hover:bg-indigo-50"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Criar Primeiro Aditivo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {aditivosOrdenados.map((aditivo) => {
            const contratoVinculado =
              aditivo.expand?.contrato || contratos.find((c) => c.id === aditivo.contrato)

            // Cálculos de valor-hora
            const novoValorMensal = aditivo.novo_valor_mensal || 0
            const valorAnterior = aditivo.valor_anterior || contratoVinculado?.valor || 0
            const deltaValor = novoValorMensal > 0 ? novoValorMensal - valorAnterior : 0
            const valorHoraNovo =
              novoValorMensal > 0 ? (novoValorMensal / HORAS_MES_PADRAO).toFixed(2) : null
            const valorHoraAnterior =
              valorAnterior > 0 ? (valorAnterior / HORAS_MES_PADRAO).toFixed(2) : null

            // Datas formatadas
            const dataAssinaturaFmt = aditivo.data_assinatura
              ? new Date(aditivo.data_assinatura).toLocaleDateString('pt-BR')
              : 'Pendente de formalização'

            const vigenciaNovaFmt = aditivo.nova_vigencia_fim
              ? new Date(aditivo.nova_vigencia_fim).toLocaleDateString('pt-BR')
              : null

            const vigenciaAntigaFmt = aditivo.vigencia_anterior_fim
              ? new Date(aditivo.vigencia_anterior_fim).toLocaleDateString('pt-BR')
              : contratoVinculado?.data_fim
                ? new Date(contratoVinculado.data_fim).toLocaleDateString('pt-BR')
                : null

            return (
              <Card
                key={aditivo.id}
                className={`border shadow-xs transition-all ${
                  aditivo.status === 'Pendente de assinatura' ||
                  aditivo.status === 'Em análise pelo jurídico'
                    ? 'border-amber-300 dark:border-amber-700 bg-amber-50/20 dark:bg-[#1A2240] hover:border-amber-400'
                    : 'border-slate-200 dark:border-[#2E3A6E] bg-white dark:bg-[#1A2240] hover:border-indigo-300'
                }`}
              >
                <CardContent className="p-5 space-y-4">
                  {/* Linha 1: Cabeçalho com Número, Tipo e Status */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs font-mono">
                        #{aditivo.sequencia}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900 font-mono">
                            {aditivo.numero_aditivo}
                          </h4>
                          {renderTipoBadge(aditivo.tipo)}
                          {renderStatusBadge(aditivo.status)}
                        </div>
                        <span className="text-[11px] text-slate-500">
                          Contrato:{' '}
                          <strong>{contratoVinculado?.titulo || 'Contrato não localizado'}</strong>
                          {contratoVinculado?.numero_contrato
                            ? ` (${contratoVinculado.numero_contrato})`
                            : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Botão de Trâmite do Jurídico */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAditivoJuridico(aditivo)
                          setModalJuridicoOpen(true)
                        }}
                        className="h-7 text-xs border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 font-semibold"
                        title="Fluxo de aprovação e parecer interno do Jurídico"
                      >
                        <Scale className="w-3.5 h-3.5 mr-1" />
                        Aprovação Jurídico
                      </Button>

                      {aditivo.status === 'Pendente de assinatura' && (
                        <Button
                          size="sm"
                          onClick={() => handleMarcarComoVigente(aditivo)}
                          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-2xs"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          Marcar como Vigente
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setAditivoParaEditar(aditivo)
                          setModalNovoOpen(true)
                        }}
                        className="h-7 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Editar
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleExcluirAditivo(aditivo)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Linha 2: Destaques de Delta de Valor e Delta de Vigência */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Bloco 1: Alteração Financeira & Valor-Hora */}
                    <div className="bg-slate-50 dark:bg-[#11162B] p-3 rounded-xl border border-slate-100 dark:border-[#2E3A6E] text-xs space-y-1.5">
                      <span className="font-display text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <DollarSign className="w-3 h-3 text-emerald-600" />
                        Ajuste Financeiro
                      </span>
                      {novoValorMensal > 0 ? (
                        <>
                          <div className="flex items-baseline justify-between">
                            <span className="text-slate-600 dark:text-slate-300">
                              Novo Valor Mensal:
                            </span>
                            <strong className="text-sm font-bold text-slate-900 dark:text-[#F7F8FB]">
                              R${' '}
                              {novoValorMensal.toLocaleString('pt-BR', {
                                minimumFractionDigits: 2,
                              })}
                            </strong>
                          </div>

                          <div className="flex items-baseline justify-between text-[11px]">
                            <span className="text-slate-500 dark:text-slate-400">
                              Valor-Hora (÷ 160h):
                            </span>
                            <strong className="text-indigo-700 dark:text-indigo-400 font-bold">
                              R$ {valorHoraNovo}
                              <span className="text-[10px] text-slate-400 font-normal"> /h</span>
                            </strong>
                          </div>

                          {deltaValor !== 0 && (
                            <div className="flex items-baseline justify-between text-[11px] pt-1 border-t border-slate-200/60 dark:border-[#2E3A6E]">
                              <span className="text-slate-500 dark:text-slate-400">
                                Delta s/ valor anterior:
                              </span>
                              <strong
                                className={
                                  deltaValor > 0
                                    ? 'text-emerald-700 dark:text-emerald-400 font-bold'
                                    : 'text-rose-700 dark:text-rose-400 font-bold'
                                }
                              >
                                {deltaValor > 0
                                  ? `+R$ ${deltaValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                                  : `-R$ ${Math.abs(deltaValor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                              </strong>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-slate-400 italic py-1">Valor mensal inalterado</div>
                      )}
                    </div>

                    {/* Bloco 2: Delta de Vigência */}
                    <div className="bg-slate-50 dark:bg-[#11162B] p-3 rounded-xl border border-slate-100 dark:border-[#2E3A6E] text-xs space-y-1.5">
                      <span className="font-display text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-purple-600" />
                        Prorrogação de Vigência
                      </span>

                      {vigenciaNovaFmt ? (
                        <>
                          <div className="flex items-baseline justify-between">
                            <span className="text-slate-600 dark:text-slate-300">
                              Nova Vigência Fim:
                            </span>
                            <strong className="text-sm font-bold text-purple-900 dark:text-purple-300">
                              {vigenciaNovaFmt}
                            </strong>
                          </div>

                          {vigenciaAntigaFmt && vigenciaAntigaFmt !== vigenciaNovaFmt && (
                            <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <span>Anterior: {vigenciaAntigaFmt}</span>
                              <ArrowRight className="w-3 h-3 text-purple-400 inline" />
                              <span className="text-purple-700 dark:text-purple-300 font-semibold">
                                {vigenciaNovaFmt}
                              </span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-slate-400 italic py-1">Vigência inalterada</div>
                      )}

                      <div className="text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-[#2E3A6E]">
                        Assinatura:{' '}
                        <strong className="text-slate-800 dark:text-[#F7F8FB]">
                          {dataAssinaturaFmt}
                        </strong>
                      </div>
                    </div>

                    {/* Bloco 3: Anexo e Auditoria */}
                    <div className="bg-slate-50 dark:bg-[#11162B] p-3 rounded-xl border border-slate-100 dark:border-[#2E3A6E] text-xs flex flex-col justify-between">
                      <div>
                        <span className="font-display text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mb-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Documento & Auditoria
                        </span>
                        <p className="text-[11px] text-slate-600">
                          {aditivo.status === 'Vigente'
                            ? 'Aditivo em plena eficácia jurídica.'
                            : 'Aguardando coleta de assinaturas digitais.'}
                        </p>
                      </div>

                      <div className="pt-2">
                        {aditivo.anexo_aditivo ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => abrirVisualizador(aditivo)}
                            className="w-full h-7 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          >
                            <ExternalLink className="w-3 h-3 mr-1" />
                            Visualizar Anexo Assinado
                          </Button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic block text-center">
                            Sem anexo digital vinculado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Descrição / Objeto do Aditivo */}
                  {aditivo.descricao && (
                    <div className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50/70 dark:bg-[#11162B] p-2.5 rounded-lg border border-slate-100 dark:border-[#2E3A6E]">
                      <strong className="text-slate-700 dark:text-[#F7F8FB] block mb-0.5">
                        Objeto / Justificativa:
                      </strong>
                      <p className="italic">{aditivo.descricao}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal de Cadastro/Edição de Aditivo */}
      <ModalNovoAditivo
        open={modalNovoOpen}
        onOpenChange={setModalNovoOpen}
        prestador={prestador}
        contratos={contratos}
        contratoPreSelecionadoId={contratoPreSelecionadoId}
        aditivoParaEditar={aditivoParaEditar}
        onSuccess={onAtualizar}
      />

      {/* Visualizador de PDF */}
      <DocumentViewerModal
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        url={viewerUrl}
        title={viewerTitle}
        filename={viewerFilename}
      />

      {/* Modal de Fluxo de Aprovação Interna do Jurídico */}
      <ModalFluxoJuridicoAditivo
        open={modalJuridicoOpen}
        onOpenChange={setModalJuridicoOpen}
        aditivo={aditivoJuridico}
        onSuccess={onAtualizar}
      />
    </div>
  )
}
export default AbaAditivos
