import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  FileCheck2,
  DollarSign,
  Laptop,
  Compass,
  CheckCircle2,
  Clock,
  Calendar,
  UserCheck,
  Users2,
  Building2,
  ChevronRight,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import type {
  RotinaIntegracao,
  ItemChecklistRotina,
  Marco306090,
} from '@/services/rotinaIntegracaoService'

interface FluxoRotina4FasesProps {
  rotina: RotinaIntegracao
  onToggleItem: (itemId: string, concluido: boolean) => Promise<void>
  onAbrirCheckIn: (marco: Marco306090) => void
  onAbrirNps: () => void
}

const FASES_INFO = [
  {
    fase: 0 as const,
    numero: 'Fase 0',
    nome: 'Pré-contratação',
    descricao:
      'Cadastro do colaborador/prestador, CPF/CNPJ, cargo, modalidade CLT/PJ e documentação básica.',
    icone: FileCheck2,
    badgeColor: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200',
  },
  {
    fase: 1 as const,
    numero: 'Fase 1',
    nome: 'Dados Contratuais',
    descricao:
      'Data de início, valor contratado (salário CLT ou mensalidade PJ), valor/hora e alçadas de aprovação.',
    icone: DollarSign,
    badgeColor:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200',
  },
  {
    fase: 2 as const,
    numero: 'Fase 2',
    nome: 'Pré-board (Antes do Dia 1)',
    descricao:
      'Acessos a sistemas, envio de kit/equipamento, boas-vindas do gestor e agenda do primeiro dia compartilhada.',
    icone: Laptop,
    badgeColor:
      'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border-purple-200',
  },
  {
    fase: 3 as const,
    numero: 'Fase 3',
    nome: 'Plano de Integração 30-60-90',
    descricao:
      'Metas e entregas por marco (30/60/90 dias) com check-ins de gestor em cada marco, buddy e avaliação final.',
    icone: Compass,
    badgeColor:
      'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200',
  },
]

export function FluxoRotina4Fases({
  rotina,
  onToggleItem,
  onAbrirCheckIn,
  onAbrirNps,
}: FluxoRotina4FasesProps) {
  const [faseAtiva, setFaseAtiva] = useState<0 | 1 | 2 | 3>(0)
  const [loadingItem, setLoadingItem] = useState<string | null>(null)

  const itensPorFase = (faseNum: 0 | 1 | 2 | 3) => {
    return rotina.itens_checklist.filter((it) => it.fase === faseNum)
  }

  const handleCheckboxClick = async (item: ItemChecklistRotina) => {
    setLoadingItem(item.id)
    try {
      await onToggleItem(item.id, !item.concluido)
    } finally {
      setLoadingItem(null)
    }
  }

  // Progresso por fase
  const calcularProgressoFase = (faseNum: 0 | 1 | 2 | 3) => {
    const itens = itensPorFase(faseNum)
    if (itens.length === 0) return 100
    const concluidos = itens.filter((i) => i.concluido).length
    return Math.round((concluidos / itens.length) * 100)
  }

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------------------------ */}
      {/* NAVEGAÇÃO HORIZONTAL EM 4 FASES COM BARRA SOUYESS                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {FASES_INFO.map((fase) => {
          const Icon = fase.icone
          const isAtiva = faseAtiva === fase.fase
          const progresso = calcularProgressoFase(fase.fase)
          const is100 = progresso === 100

          return (
            <button
              key={fase.fase}
              onClick={() => setFaseAtiva(fase.fase)}
              className={`p-4 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                isAtiva
                  ? 'bg-white dark:bg-[#1A2240] border-[#E9530E] shadow-md ring-2 ring-[#E9530E]/20'
                  : 'bg-white/70 dark:bg-[#141B34] border-slate-200 dark:border-[#2E3A6E] hover:border-slate-300 dark:hover:border-[#4A567E]'
              }`}
            >
              {/* Indicador de barra ativa no topo */}
              {isAtiva && (
                <span className="absolute top-0 left-0 right-0 h-1 bg-[#E9530E] rounded-t-xl" />
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider font-display text-slate-400">
                    {fase.numero}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {is100 ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <span className="text-xs font-mono font-bold text-slate-600 dark:text-[#A8B0C9]">
                        {progresso}%
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                      isAtiva
                        ? 'bg-[#E9530E] text-white'
                        : 'bg-slate-100 dark:bg-[#212B55] text-slate-600 dark:text-[#D3D7E5]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <h4 className="font-display font-bold text-sm text-slate-900 dark:text-[#F7F8FB] leading-tight truncate">
                    {fase.nome}
                  </h4>
                </div>
              </div>

              {/* Barra de progresso da fase em Laranja SouYess */}
              <div className="mt-3">
                <div className="w-full bg-slate-100 dark:bg-[#212B55] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#E9530E] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CONTEÚDO DETALHADO DA FASE ATIVA                                   */}
      {/* ------------------------------------------------------------------ */}
      <Card className="border-slate-200 dark:border-[#2E3A6E] shadow-sm bg-white dark:bg-[#1A2240]">
        <CardHeader className="p-5 border-b border-slate-100 dark:border-[#2E3A6E]/50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Badge className={FASES_INFO[faseAtiva].badgeColor}>
                  {FASES_INFO[faseAtiva].numero}
                </Badge>
                <CardTitle className="font-display text-lg font-bold text-slate-900 dark:text-[#F7F8FB]">
                  {FASES_INFO[faseAtiva].nome}
                </CardTitle>
              </div>
              <p className="text-xs text-slate-500 dark:text-[#A8B0C9] mt-1">
                {FASES_INFO[faseAtiva].descricao}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-slate-700 dark:text-[#D3D7E5]">
                {itensPorFase(faseAtiva).filter((i) => i.concluido).length} de{' '}
                {itensPorFase(faseAtiva).length} concluídos
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-6">
          {/* Seção especial para Fase 1: Resumo Contratual & Financeiro */}
          {faseAtiva === 1 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-[#11162B]/50 p-4 rounded-xl border border-slate-200 dark:border-[#2E3A6E]/50">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-display">
                  Data de Início
                </span>
                <p className="font-mono font-bold text-sm text-slate-900 dark:text-[#F7F8FB] mt-0.5">
                  {new Date(rotina.data_inicio).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-display">
                  {rotina.tipo_integrado === 'PJ'
                    ? 'Valor Contratado Mensal'
                    : 'Salário Contratado'}
                </span>
                <p className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400 mt-0.5">
                  R${' '}
                  {(rotina.valor_contratado || 0).toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-display">
                  Valor/Hora Efetivo
                </span>
                <p className="font-mono font-bold text-sm text-[#E9530E] mt-0.5">
                  R$ {(rotina.valor_hora || 0).toFixed(2)}/h
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 font-display">
                  Prazo / Modalidade
                </span>
                <p className="font-mono font-bold text-sm text-slate-900 dark:text-[#F7F8FB] mt-0.5">
                  {rotina.prazo_contrato_tipo || 'Indeterminado'} ({rotina.tipo_integrado})
                </p>
              </div>
            </div>
          )}

          {/* Seção especial para Fase 2: Kit Pré-embarque & Mentoria */}
          {faseAtiva === 2 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-50/50 dark:bg-purple-950/20 p-4 rounded-xl border border-purple-100 dark:border-purple-900/40 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
                  <Users2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 font-display">
                    Buddy / Mentor de Acolhimento
                  </span>
                  <p className="font-bold text-slate-900 dark:text-[#F7F8FB]">
                    {rotina.buddy_mentor_nome || 'Não designado ainda'}
                  </p>
                  {rotina.buddy_mentor_email && (
                    <p className="text-[11px] text-slate-500 font-mono">
                      {rotina.buddy_mentor_email}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-700 dark:text-blue-300 font-display">
                    Gestor Direto Responsável
                  </span>
                  <p className="font-bold text-slate-900 dark:text-[#F7F8FB]">
                    {rotina.gestor_nome || 'Gestor Contratante'}
                  </p>
                  <p className="text-[11px] text-slate-500">Conduz os check-ins formais 30-60-90</p>
                </div>
              </div>
            </div>
          )}

          {/* Checklist marcável da fase */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-[#D3D7E5] font-display flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#E9530E]" />
              Checklist Operacional da Fase
            </h4>

            {itensPorFase(faseAtiva).length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 dark:bg-[#11162B]/30 rounded-xl border border-dashed border-slate-200 dark:border-[#2E3A6E]">
                Nenhum item específico configurado para esta fase.
              </div>
            ) : (
              <div className="space-y-2">
                {itensPorFase(faseAtiva).map((item) => {
                  const isChecked = item.concluido
                  const isLoading = loadingItem === item.id

                  return (
                    <div
                      key={item.id}
                      onClick={() => !isLoading && handleCheckboxClick(item)}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-start gap-3.5 ${
                        isChecked
                          ? 'bg-slate-50/80 dark:bg-[#11162B]/40 border-slate-200 dark:border-[#2E3A6E]/60 text-slate-500 dark:text-[#A8B0C9]'
                          : 'bg-white dark:bg-[#141B34] border-slate-200 dark:border-[#2E3A6E] hover:border-[#E9530E]/50 text-slate-900 dark:text-[#F7F8FB] shadow-xs'
                      }`}
                    >
                      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isChecked}
                          disabled={isLoading}
                          onCheckedChange={() => handleCheckboxClick(item)}
                          className="data-[state=checked]:bg-[#E9530E] data-[state=checked]:border-[#E9530E]"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <p
                            className={`text-xs font-semibold leading-relaxed ${
                              isChecked ? 'line-through text-slate-400 dark:text-slate-500' : ''
                            }`}
                          >
                            {item.titulo}
                          </p>

                          <div className="flex items-center gap-2 shrink-0">
                            {item.responsavel && (
                              <Badge
                                variant="outline"
                                className="text-[10px] font-sans border-slate-200 dark:border-[#2E3A6E]"
                              >
                                {item.responsavel}
                              </Badge>
                            )}

                            {item.dataConclusao && (
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                                Concluído em{' '}
                                {new Date(item.dataConclusao).toLocaleDateString('pt-BR', {
                                  timeZone: 'UTC',
                                })}
                              </span>
                            )}
                          </div>
                        </div>

                        {item.observacao && (
                          <p className="text-[11px] text-slate-400 mt-1">{item.observacao}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Seção especial para Fase 3: Os 3 Marcos 30-60-90 com Check-in de Gestor */}
          {faseAtiva === 3 && (
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-[#2E3A6E]/50">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <h4 className="font-display font-bold text-sm text-slate-900 dark:text-[#F7F8FB] flex items-center gap-2">
                    <Compass className="w-4 h-4 text-[#E9530E]" />
                    Marcos Estratégicos 30-60-90 & Check-ins de Liderança
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-[#A8B0C9]">
                    Avaliação formal em cada ciclo com impacto direto no "Meu Dia" do gestor
                    contratante.
                  </p>
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={onAbrirNps}
                  className="text-xs border-[#E9530E]/30 text-[#E9530E] hover:bg-[#FEF1EA] dark:hover:bg-[#E9530E]/10 font-bold"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  {rotina.nps_onboarding_score !== null && rotina.nps_onboarding_score !== undefined
                    ? `NPS Onboarding: ${rotina.nps_onboarding_score}/10`
                    : 'Registrar NPS de Onboarding'}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {rotina.marcos_30_60_90.map((marco) => {
                  const isConcluido = marco.checkInRealizado || marco.status === 'concluido'
                  const prazoData = marco.prazo ? new Date(marco.prazo) : null

                  return (
                    <div
                      key={marco.marco}
                      className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
                        isConcluido
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/40'
                          : 'bg-white dark:bg-[#11162B] border-slate-200 dark:border-[#2E3A6E] shadow-xs'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-1">
                          <Badge
                            className={
                              isConcluido
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 text-slate-700 dark:bg-[#212B55] dark:text-[#D3D7E5]'
                            }
                          >
                            {marco.marco.replace('_', ' ').toUpperCase()}
                          </Badge>

                          {prazoData && (
                            <span className="text-[10px] font-mono text-slate-500">
                              Prazo: {prazoData.toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                            </span>
                          )}
                        </div>

                        <h5 className="font-display font-bold text-xs text-slate-900 dark:text-[#F7F8FB] leading-snug">
                          {marco.titulo}
                        </h5>

                        <div className="space-y-1 pt-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-display">
                            Entregas Esperadas:
                          </span>
                          <p className="text-[11px] text-slate-600 dark:text-[#A8B0C9] leading-relaxed">
                            {marco.entregasEsperadas}
                          </p>
                        </div>

                        {marco.objetivos && marco.objetivos.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-display">
                              Metas do Marco:
                            </span>
                            <ul className="text-[10px] text-slate-500 dark:text-[#A8B0C9] list-disc pl-3.5 space-y-0.5">
                              {marco.objetivos.slice(0, 2).map((obj, i) => (
                                <li key={i} className="line-clamp-1">
                                  {obj}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-[#2E3A6E]/50">
                        {isConcluido ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Check-in Realizado
                              </span>
                              {marco.notaAvaliacao && (
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                                  Nota: {marco.notaAvaliacao.toFixed(1)}/10
                                </span>
                              )}
                            </div>
                            {marco.parecerGestor && (
                              <p className="text-[10px] text-slate-500 italic line-clamp-2">
                                "{marco.parecerGestor}"
                              </p>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onAbrirCheckIn(marco)}
                              className="w-full h-7 text-[10px] text-slate-600 hover:text-slate-900 dark:text-[#A8B0C9]"
                            >
                              Editar Parecer
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => onAbrirCheckIn(marco)}
                            className="w-full text-xs bg-[#E9530E] hover:bg-[#C5430A] text-white font-bold shadow-xs"
                          >
                            Registrar Check-in
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
