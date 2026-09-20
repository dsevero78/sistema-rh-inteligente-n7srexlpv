import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  PrestadorPJ,
  MarcoLifecyclePJ,
  EtapaLifecyclePJ,
  StatusMarcoLifecycle,
  prestadoresService,
} from '@/services/prestadoresPj'
import { useToast } from '@/hooks/use-toast'
import {
  Check,
  Clock,
  Lock,
  Minus,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Edit2,
} from 'lucide-react'
import { ModalEditarMarco } from './ModalEditarMarco'

interface LifecycleJornadaPJProps {
  prestador: PrestadorPJ
  marcos: MarcoLifecyclePJ[]
  onAtualizar: () => void
}

const ETAPAS_ORDENADAS: EtapaLifecyclePJ[] = ['Entrada', 'Ativo', 'Mudanças', 'Saída']

export const LifecycleJornadaPJ: React.FC<LifecycleJornadaPJProps> = ({
  prestador,
  marcos,
  onAtualizar,
}) => {
  const { toast } = useToast()

  // Etapa selecionada para visualização (padrão é a etapa atual do prestador)
  const etapaAtualPrestador: EtapaLifecyclePJ =
    prestador.etapa_lifecycle && ETAPAS_ORDENADAS.includes(prestador.etapa_lifecycle)
      ? prestador.etapa_lifecycle
      : prestador.status === 'Em renovação'
        ? 'Mudanças'
        : prestador.status === 'Encerrado'
          ? 'Saída'
          : 'Ativo'

  const [etapaVisualizada, setEtapaVisualizada] = useState<EtapaLifecyclePJ>(etapaAtualPrestador)

  // Sincronizar visualização se prestador mudar
  React.useEffect(() => {
    setEtapaVisualizada(etapaAtualPrestador)
  }, [prestador.id, prestador.etapa_lifecycle])

  // Modal para editar marco selecionado
  const [marcoSelecionado, setMarcoSelecionado] = useState<MarcoLifecyclePJ | null>(null)
  const [modalEditarOpen, setModalEditarOpen] = useState(false)
  const [salvandoAvanco, setSalvandoAvanco] = useState(false)

  // Marcos da etapa selecionada
  const marcosDaEtapa = React.useMemo(() => {
    return marcos.filter((m) => m.etapa === etapaVisualizada).sort((a, b) => a.ordem - b.ordem)
  }, [marcos, etapaVisualizada])

  // Métricas da etapa visualizada
  const totalMarcosEtapa = marcosDaEtapa.length
  const concluidosEtapa = marcosDaEtapa.filter((m) => m.status === 'REGISTRADO').length
  const pendentesPj = marcosDaEtapa.filter((m) => m.status === 'PENDENTE DO PJ').length
  const pendentesEmpresa = marcosDaEtapa.filter((m) => m.status === 'PENDENTE DA EMPRESA').length
  const todosConcluidos = totalMarcosEtapa > 0 && concluidosEtapa === totalMarcosEtapa

  const indexEtapaAtual = ETAPAS_ORDENADAS.indexOf(etapaAtualPrestador)
  const indexEtapaVisualizada = ETAPAS_ORDENADAS.indexOf(etapaVisualizada)

  // Avançar ou Retroceder Etapa do Prestador
  const handleMudarEtapaPrestador = async (novaEtapa: EtapaLifecyclePJ) => {
    setSalvandoAvanco(true)
    try {
      await prestadoresService.atualizarEtapaLifecycle(prestador.id, novaEtapa)
      setEtapaVisualizada(novaEtapa)
      toast({
        title: 'Etapa da Jornada Atualizada',
        description: `O prestador agora está na etapa "${novaEtapa}".`,
      })
      onAtualizar()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao alterar etapa',
        description: err instanceof Error ? err.message : 'Falha ao gravar.',
        variant: 'destructive',
      })
    } finally {
      setSalvandoAvanco(false)
    }
  }

  // Alternar rapidamente o status clicando no badge
  const handleCiclarStatus = async (marco: MarcoLifecyclePJ, e: React.MouseEvent) => {
    e.stopPropagation()
    const ciclo: StatusMarcoLifecycle[] = [
      'REGISTRADO',
      'PENDENTE DO PJ',
      'PENDENTE DA EMPRESA',
      'NÃO ENVIADO',
    ]
    const idx = ciclo.indexOf(marco.status)
    const proximo = ciclo[(idx + 1) % ciclo.length]

    try {
      await prestadoresService.atualizarStatusMarco(marco.id, proximo, {
        autor: 'RH / Ação Rápida',
        observacao: `Status alterado rapidamente para ${proximo}`,
      })
      toast({
        title: `Marco: ${proximo}`,
        description: `"${marco.nome_marco}" atualizado.`,
      })
      onAtualizar()
    } catch (err: unknown) {
      toast({
        title: 'Erro ao alternar status',
        description: err instanceof Error ? err.message : 'Falha.',
        variant: 'destructive',
      })
    }
  }

  // Componente de Badge fiel aos prints
  const renderBadgeStatus = (status: StatusMarcoLifecycle, marco: MarcoLifecyclePJ) => {
    switch (status) {
      case 'REGISTRADO':
        return (
          <span
            onClick={(e) => handleCiclarStatus(marco, e)}
            title="Clique para alternar status ou clique na linha para editar detalhes"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-[#E8F8F0] text-[#1E7E34] hover:bg-[#D4F2E2] cursor-pointer transition-colors shadow-2xs select-none"
          >
            <Check className="w-3.5 h-3.5 stroke-[3] text-[#1E7E34]" />
            REGISTRADO
          </span>
        )

      case 'PENDENTE DO PJ':
        return (
          <span
            onClick={(e) => handleCiclarStatus(marco, e)}
            title="Clique para alternar status ou clique na linha para editar detalhes"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-[#FDF0E5] text-[#B85D19] hover:bg-[#FAE2CF] cursor-pointer transition-colors shadow-2xs select-none"
          >
            <Clock className="w-3.5 h-3.5 text-[#B85D19]" />
            PENDENTE DO PJ
          </span>
        )

      case 'PENDENTE DA EMPRESA':
        return (
          <span
            onClick={(e) => handleCiclarStatus(marco, e)}
            title="Clique para alternar status ou clique na linha para editar detalhes"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-[#EDF2FE] text-[#2855C7] hover:bg-[#DEE7FD] cursor-pointer transition-colors shadow-2xs select-none"
          >
            <Clock className="w-3.5 h-3.5 text-[#2855C7]" />
            PENDENTE DA EMPRESA
          </span>
        )

      case 'NÃO ENVIADO':
      default:
        return (
          <span
            onClick={(e) => handleCiclarStatus(marco, e)}
            title="Clique para alternar status ou clique na linha para editar detalhes"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold tracking-wide uppercase bg-[#EEF2F6] text-[#475569] hover:bg-[#E2E8F0] cursor-pointer transition-colors shadow-2xs select-none"
          >
            <Minus className="w-3.5 h-3.5 stroke-[3] text-[#475569]" />
            NÃO ENVIADO
          </span>
        )
    }
  }

  return (
    <div className="space-y-4">
      {/* Bloco Principal da Jornada com Estilo Clean Exato dos Prints */}
      <Card className="border border-slate-200/80 bg-white shadow-xs rounded-2xl overflow-hidden">
        <CardContent className="p-6 sm:p-8 space-y-8">
          {/* -------------------------------------------------------------- */}
          {/* 1. STEPPER HORIZONTAL NO TOPO                                  */}
          {/* -------------------------------------------------------------- */}
          <div className="w-full max-w-2xl mx-auto px-4 sm:px-8">
            <div className="relative flex items-center justify-between">
              {/* Linhas conectoras de fundo e ativas */}
              <div className="absolute left-6 right-6 top-3.5 -translate-y-1/2 h-0.5 bg-slate-200 z-0" />

              {ETAPAS_ORDENADAS.map((etapaNome, idx) => {
                const isConcluida = idx < indexEtapaAtual
                const isAtual = idx === indexEtapaAtual
                const isVisualizada = etapaNome === etapaVisualizada

                // Linha entre esta etapa e a anterior
                let linhaConectada = false
                if (idx > 0 && idx <= indexEtapaAtual) {
                  linhaConectada = true
                }

                return (
                  <div
                    key={etapaNome}
                    className="relative z-10 flex flex-col items-center cursor-pointer group"
                    onClick={() => setEtapaVisualizada(etapaNome)}
                  >
                    {/* Círculo da Etapa */}
                    {isConcluida ? (
                      // Etapa Concluída: Círculo verde com anel e ponto verde escuro
                      <div className="w-7 h-7 rounded-full bg-white border-2 border-[#2D7A4D] flex items-center justify-center transition-transform group-hover:scale-105">
                        <div className="w-3.5 h-3.5 rounded-full bg-[#2D7A4D]" />
                      </div>
                    ) : isAtual ? (
                      // Etapa Atual: Círculo em destaque com anel verde + halo
                      <div className="relative flex items-center justify-center">
                        <div className="absolute -inset-1 rounded-full bg-[#C8F0D6] opacity-70 animate-pulse" />
                        <div className="w-7 h-7 rounded-full bg-white border-2 border-[#2D7A4D] flex items-center justify-center relative z-10">
                          <div className="w-3.5 h-3.5 rounded-full bg-[#2D7A4D]" />
                        </div>
                      </div>
                    ) : (
                      // Etapa Futura: Cinza claro
                      <div className="w-7 h-7 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center group-hover:border-slate-400 transition-colors">
                        <div className="w-3 h-3 rounded-full bg-slate-200" />
                      </div>
                    )}

                    {/* Linha de preenchimento verde para etapas concluídas */}
                    {idx > 0 && linhaConectada && (
                      <div
                        className="absolute h-0.5 bg-[#2D7A4D] -z-10"
                        style={{
                          right: '50%',
                          width: 'calc(100vw / 4)',
                          maxWidth: '180px',
                          top: '14px',
                        }}
                      />
                    )}

                    {/* Rótulo / Pílula abaixo do círculo */}
                    <div className="mt-3 flex flex-col items-center min-w-[70px]">
                      {isAtual ? (
                        // Pílula verde-clara com o nome da etapa em negrito (como no print)
                        <span className="px-3.5 py-1 rounded-full bg-[#E5F9ED] text-[#1E3A2B] text-xs font-bold tracking-tight shadow-2xs border border-[#C6EFD7]">
                          {etapaNome}
                        </span>
                      ) : (
                        <span
                          className={`text-xs font-medium transition-colors ${
                            isVisualizada
                              ? 'text-slate-900 font-bold underline decoration-[#2D7A4D] decoration-2 underline-offset-4'
                              : isConcluida
                                ? 'text-slate-700 font-semibold'
                                : 'text-slate-400'
                          }`}
                        >
                          {etapaNome}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Barra de Contexto da Etapa Visualizada (Avisos de Conclusão / Ações do RH) */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">
                Visualizando marcos da etapa:
              </span>
              <Badge
                variant="outline"
                className="text-xs font-semibold border-slate-300 text-slate-800"
              >
                {etapaVisualizada}
              </Badge>
              {etapaVisualizada === etapaAtualPrestador && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px] font-bold">
                  Etapa Atual do Prestador
                </Badge>
              )}
              <span className="text-xs text-slate-400">
                ({concluidosEtapa} de {totalMarcosEtapa} registrados)
              </span>
            </div>

            {/* Ações de Avançar / Definir como Etapa do Prestador */}
            <div className="flex items-center gap-2">
              {etapaVisualizada !== etapaAtualPrestador && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={salvandoAvanco}
                  onClick={() => handleMudarEtapaPrestador(etapaVisualizada)}
                  className="h-8 text-xs border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Definir "{etapaVisualizada}" como Etapa Atual
                </Button>
              )}

              {etapaVisualizada === etapaAtualPrestador &&
                indexEtapaAtual < ETAPAS_ORDENADAS.length - 1 && (
                  <Button
                    size="sm"
                    disabled={salvandoAvanco || !todosConcluidos}
                    onClick={() => handleMudarEtapaPrestador(ETAPAS_ORDENADAS[indexEtapaAtual + 1])}
                    className={`h-8 text-xs font-semibold ${
                      todosConcluidos
                        ? 'bg-[#2D7A4D] hover:bg-[#23633E] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                    title={
                      !todosConcluidos
                        ? 'Conclua todos os marcos desta etapa para avançar na jornada'
                        : 'Avançar para a próxima etapa da jornada'
                    }
                  >
                    <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                    Concluir & Avançar para {ETAPAS_ORDENADAS[indexEtapaAtual + 1]}
                  </Button>
                )}
            </div>
          </div>

          {/* -------------------------------------------------------------- */}
          {/* 2. LISTA DE MARCOS / CHECKLIST DA ETAPA (FIEL AOS PRINTS)      */}
          {/* -------------------------------------------------------------- */}
          <div className="divide-y divide-slate-100 border-y border-slate-100">
            {marcosDaEtapa.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhum marco configurado para esta etapa.
              </div>
            ) : (
              marcosDaEtapa.map((marco) => {
                return (
                  <div
                    key={marco.id}
                    onClick={() => {
                      setMarcoSelecionado(marco)
                      setModalEditarOpen(true)
                    }}
                    className="py-4.5 px-2 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors rounded-lg cursor-pointer group"
                  >
                    {/* Nome do Marco à Esquerda com Tipografia Idêntica aos Prints */}
                    <div className="flex-1 min-w-0 pr-4">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base sm:text-[17px] font-bold text-[#2A3742] tracking-tight group-hover:text-blue-700 transition-colors truncate">
                          {marco.nome_marco}
                        </h4>
                        <Edit2 className="w-3.5 h-3.5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      </div>

                      {/* Sub-informação discreta: data ou responsável se houver */}
                      {(marco.responsavel || marco.observacao || marco.data_conclusao) && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {marco.responsavel && (
                            <span className="font-medium text-slate-500">{marco.responsavel}</span>
                          )}
                          {marco.responsavel && marco.observacao && <span> &bull; </span>}
                          {marco.observacao && <span className="italic">{marco.observacao}</span>}
                          {marco.data_conclusao && (
                            <span className="ml-1 text-[10px] text-emerald-700/80">
                              (Concluído em{' '}
                              {new Date(marco.data_conclusao).toLocaleDateString('pt-BR')})
                            </span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Badge de Status à Direita (fiel aos 4 tipos) */}
                    <div className="shrink-0">{renderBadgeStatus(marco.status, marco)}</div>
                  </div>
                )
              })
            )}
          </div>

          {/* -------------------------------------------------------------- */}
          {/* 3. RODAPÉ COM NOTA DISCRETA DE AUDITORIA E CADEADO             */}
          {/* -------------------------------------------------------------- */}
          <div className="flex items-center gap-2 text-slate-400 text-xs sm:text-[13px] pt-1">
            <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="tracking-tight text-slate-400">
              Histórico preservado, pronto pra auditoria.
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Modal para Editar o Marco Clicado */}
      <ModalEditarMarco
        open={modalEditarOpen}
        onOpenChange={setModalEditarOpen}
        marco={marcoSelecionado}
        onSuccess={onAtualizar}
      />
    </div>
  )
}
export default LifecycleJornadaPJ
