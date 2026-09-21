import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import {
  calcularDecisaoRenovacaoPrestador,
  type DecisaoRenovacaoInfo,
} from '@/components/prestadores/BannerDecisaoRenovacao'
import type {
  PrestadorPJ,
  ContratoPJ,
  AditivoPJ,
  AvaliacaoPrestadorPJ,
} from '@/services/prestadoresPj'

export type SeveridadeMeuDia = 'urgente' | 'atencao' | 'acompanhar'
export type ModuloOrigemMeuDia =
  | 'vagas'
  | 'candidatos'
  | 'entrevistas'
  | 'onboarding'
  | 'pj_aditivos'
  | 'pj_renovacoes'
  | 'indicacoes'
  | 'alertas'

export interface ItemMeuDia {
  id: string
  tituloAcao: string // Linguagem de ação em primeira pessoa / imperativo claro
  contexto: string // Vaga, candidato, prestador ou métrica
  detalhe?: string
  modulo: ModuloOrigemMeuDia
  moduloLabel: string
  severidade: SeveridadeMeuDia
  severidadeLabel: 'Urgente' | 'Atenção' | 'Acompanhar'
  dataLimite?: string // ISO ou formatada
  dataLimiteLabel?: string // Formato mono legível (ex. "Hoje às 14:00", "Até 25/09")
  rotaDestino: string // 1-click navigate
  origemRecordId?: string
  concluido?: boolean // Persistência local ou no backend
  metaExtra?: Record<string, any>
}

export interface KpisMeuDia {
  totalPendencias: number
  urgentesHoje: number
  atencaoSemana: number
  acompanharCount: number
  concluidas7d: number
  focoPrincipal: string
}

export interface MeuDiaDados {
  itens: ItemMeuDia[]
  kpis: KpisMeuDia
  totalUrgentes: number
  totalAtencao: number
  totalAcompanhar: number
}

// Chave para persistir no localStorage itens concluídos manualmente quando não houver campo direto
const LS_RESOLVIDOS_KEY = 'souyess_meu_dia_resolvidos_v1'

export function getItensResolvidosLocais(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_RESOLVIDOS_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw)
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

export function alternarItemResolvidoLocal(itemId: string, resolvido: boolean) {
  try {
    const set = getItensResolvidosLocais()
    if (resolvido) {
      set.add(itemId)
    } else {
      set.delete(itemId)
    }
    localStorage.setItem(LS_RESOLVIDOS_KEY, JSON.stringify(Array.from(set)))
  } catch {
    // no-op
  }
}

/**
 * Agrega e calcula as pendências reais de acordo com o usuário logado e seu papel no SouYess.
 */
export async function carregarMeuDia(usuario: RecordModel | null): Promise<MeuDiaDados> {
  const itens: ItemMeuDia[] = []
  const resolvidosLocais = getItensResolvidosLocais()

  if (!usuario) {
    return {
      itens: [],
      kpis: {
        totalPendencias: 0,
        urgentesHoje: 0,
        atencaoSemana: 0,
        acompanharCount: 0,
        concluidas7d: 0,
        focoPrincipal: 'Faça login para visualizar sua rotina',
      },
      totalUrgentes: 0,
      totalAtencao: 0,
      totalAcompanhar: 0,
    }
  }

  const isGestor = usuario.cargo_funcao === 'Gestor Contratante'
  const isJuridico =
    usuario.cargo_funcao === 'Jurídico' ||
    usuario.cargo_funcao?.includes('Jurídico') ||
    usuario.email?.includes('juridico')
  const isRhOuAdmin = !isGestor && !isJuridico

  const agora = new Date()
  const hojeInicio = new Date()
  hojeInicio.setHours(0, 0, 0, 0)
  const hojeFim = new Date()
  hojeFim.setHours(23, 59, 59, 999)

  const fimSemana = new Date()
  fimSemana.setDate(fimSemana.getDate() + 7)

  // =========================================================================
  // 1. CARREGAR DADOS CONCURRENTEMENTE DO POCKETBASE
  // =========================================================================
  try {
    const [
      vagas,
      entrevistas,
      candidatos,
      aditivos,
      onboardings,
      contratosPj,
      prestadoresPj,
      avaliacoesPj,
      indicacoes,
      alertas,
      feedbacksGestor,
    ] = await Promise.all([
      pb.collection('vagas').getFullList({ sort: '-created', expand: 'gestor_responsavel' }),
      pb.collection('entrevistas').getFullList({
        sort: 'data_hora',
        expand: 'candidato,vaga,responsavel_usuario',
      }),
      pb.collection('candidatos').getFullList({
        sort: '-score_semantico',
        expand: 'vaga',
      }),
      pb.collection('aditivos_pj').getFullList({
        sort: '-created',
        expand: 'contrato,prestador,aprovado_por',
      }),
      pb.collection('onboardings').getFullList({
        sort: '-created',
        expand: 'candidato,vaga',
      }),
      pb.collection('contratos_pj').getFullList({
        sort: '-created',
        expand: 'prestador',
      }),
      pb.collection('prestadores_pj').getFullList({
        sort: '-created',
      }),
      pb.collection('avaliacoes_prestador_pj').getFullList({
        sort: '-created',
      }),
      pb.collection('indicacoes').getFullList({
        sort: '-created',
        expand: 'vaga,indicador',
      }),
      pb.collection('alertas').getFullList({
        filter: "status = 'Novo'",
        sort: '-created',
        expand: 'vaga,candidato,prestador',
      }),
      pb.collection('feedbacks_gestor').getFullList({
        sort: '-created',
      }),
    ])

    // =========================================================================
    // 2. REGRAS PARA O GESTOR CONTRATANTE
    // =========================================================================
    if (isGestor) {
      // 2.1 Vagas atribuídas ao gestor aguardando aprovação ou com ajustes
      const minhasVagas = vagas.filter((v) => v.gestor_responsavel === usuario.id)
      for (const v of minhasVagas) {
        if (
          !v.status_aprovacao_gestor ||
          v.status_aprovacao_gestor === 'Aguardando aprovação' ||
          v.status_aprovacao_gestor === 'Ajustes solicitados'
        ) {
          const isAjustes = v.status_aprovacao_gestor === 'Ajustes solicitados'
          itens.push({
            id: `vaga-gestor-aprov-${v.id}`,
            tituloAcao: isAjustes
              ? `Revisar ajustes solicitados na vaga ${v.titulo}`
              : `Validar e aprovar abertura da vaga ${v.titulo}`,
            contexto: `Vaga de ${v.departamento || 'Tecnologia'} · Orçamento: ${v.faixa_salarial || 'A definir'}`,
            detalhe:
              v.parecer_gestor_vaga ||
              'Aguardando sua validação formal para o RH iniciar a captação.',
            modulo: 'vagas',
            moduloLabel: 'Vagas & Aprovação',
            severidade: isAjustes ? 'urgente' : 'urgente',
            severidadeLabel: 'Urgente',
            dataLimiteLabel: 'Hoje',
            rotaDestino: `/gestor`,
            origemRecordId: v.id,
            metaExtra: { vagaId: v.id },
          })
        }
      }

      // 2.2 Candidatos da vaga do gestor aguardando seu feedback/parecer
      const minhasVagasIds = new Set(minhasVagas.map((v) => v.id))
      const candsMinhasVagas = candidatos.filter(
        (c) =>
          minhasVagasIds.has(c.vaga) &&
          (c.status === 'Entrevista técnica' ||
            c.status === 'Match técnico/comportamental (IA)' ||
            c.status === 'Entrevista com RH'),
      )

      for (const c of candsMinhasVagas) {
        const jaAvaliou = feedbacksGestor.some(
          (f) => f.vaga === c.vaga && f.candidato === c.id && f.gestor === usuario.id,
        )
        if (!jaAvaliou) {
          const vObj = minhasVagas.find((v) => v.id === c.vaga)
          itens.push({
            id: `gestor-parecer-cand-${c.id}`,
            tituloAcao: `Emitir parecer do candidato ${c.nome}`,
            contexto: `Vaga: ${vObj?.titulo || 'Minha vaga'} · Score Fit: ${c.score_semantico || 0}%`,
            detalhe: `Candidato no estágio "${c.status}". Assista ao vídeo de apresentação e emita a recomendação para o RH.`,
            modulo: 'candidatos',
            moduloLabel: 'Parecer Técnico',
            severidade: (c.score_semantico || 0) >= 80 ? 'urgente' : 'atencao',
            severidadeLabel: (c.score_semantico || 0) >= 80 ? 'Urgente' : 'Atenção',
            dataLimiteLabel: 'Esta semana',
            rotaDestino: `/gestor`,
            origemRecordId: c.id,
            metaExtra: { candidatoId: c.id, vagaId: c.vaga },
          })
        }
      }

      // 2.3 Entrevistas onde o gestor é responsável ou da sua vaga agendadas
      const minhasEntrevistas = entrevistas.filter((e) => {
        if (e.status !== 'Agendada') return false
        if (e.responsavel_usuario === usuario.id) return true
        if (minhasVagasIds.has(e.vaga)) return true
        return false
      })

      for (const e of minhasEntrevistas) {
        const d = new Date(e.data_hora)
        const isHoje = d >= hojeInicio && d <= hojeFim
        const cNome = e.expand?.candidato?.nome || 'Candidato'
        const vNome = e.expand?.vaga?.titulo || 'Vaga'
        itens.push({
          id: `gestor-entrevista-${e.id}`,
          tituloAcao: `Realizar entrevista técnica com ${cNome}`,
          contexto: `Vaga: ${vNome} · Formato: ${e.formato || 'Online'} (${e.duracao_minutos || 60}min)`,
          detalhe:
            e.observacoes || 'Conduzir alinhamento técnico e registrar notas pós-entrevista.',
          modulo: 'entrevistas',
          moduloLabel: 'Entrevistas',
          severidade: isHoje ? 'urgente' : 'atencao',
          severidadeLabel: isHoje ? 'Urgente' : 'Atenção',
          dataLimite: e.data_hora,
          dataLimiteLabel: isHoje
            ? `Hoje às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
            : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
          rotaDestino: `/entrevistas`,
          origemRecordId: e.id,
        })
      }
    }

    // =========================================================================
    // 3. REGRAS PARA O JURÍDICO
    // =========================================================================
    if (isJuridico) {
      // Aditivos aguardando parecer jurídico
      const aditivosJuridico = aditivos.filter((a) => a.status === 'Em análise pelo jurídico')
      for (const a of aditivosJuridico) {
        const prest =
          a.expand?.prestador?.nome_fantasia || a.expand?.prestador?.razao_social || 'Prestador PJ'
        itens.push({
          id: `juridico-aditivo-${a.id}`,
          tituloAcao: `Analisar e emitir parecer na minuta do aditivo ${a.numero_aditivo || 'PJ'}`,
          contexto: `Prestador: ${prest} · Tipo: ${a.tipo || 'Alteração contratual'}`,
          detalhe:
            a.descricao ||
            'Minuta elaborada pelo RH aguardando parecer jurídico para prosseguir com assinaturas.',
          modulo: 'pj_aditivos',
          moduloLabel: 'Jurídico Contratual',
          severidade: 'urgente',
          severidadeLabel: 'Urgente',
          dataLimiteLabel: 'Hoje',
          rotaDestino: `/prestadores-pj`,
          origemRecordId: a.id,
        })
      }

      // Aditivos com ajustes solicitados
      const aditivosAjustes = aditivos.filter((a) => a.status === 'Ajustes solicitados')
      for (const a of aditivosAjustes) {
        const prest =
          a.expand?.prestador?.nome_fantasia || a.expand?.prestador?.razao_social || 'Prestador PJ'
        itens.push({
          id: `juridico-ajustes-${a.id}`,
          tituloAcao: `Acompanhar ajustes solicitados no aditivo ${a.numero_aditivo}`,
          contexto: `Prestador: ${prest} · Ajustes em conferência com o RH`,
          modulo: 'pj_aditivos',
          moduloLabel: 'Jurídico Contratual',
          severidade: 'atencao',
          severidadeLabel: 'Atenção',
          dataLimiteLabel: 'Esta semana',
          rotaDestino: `/prestadores-pj`,
          origemRecordId: a.id,
        })
      }
    }

    // =========================================================================
    // 4. REGRAS PARA RH / RECRUTADOR / ADMIN
    // =========================================================================
    if (isRhOuAdmin) {
      // 4.1 Entrevistas agendadas para hoje ou pendentes de avaliação
      const entrevistasHojeOuAtrasadas = entrevistas.filter((e) => {
        if (e.status !== 'Agendada' && !e.avaliacao_realizada) return false
        const d = new Date(e.data_hora)
        // Agendada hoje ou nos próximos dias
        return (
          e.status === 'Agendada' ||
          (e.status === 'Realizada' && !e.avaliacao_realizada && !e.recomendacao_final)
        )
      })

      for (const e of entrevistasHojeOuAtrasadas) {
        const d = new Date(e.data_hora)
        const isHoje = d >= hojeInicio && d <= hojeFim
        const isAtrasada = d < hojeInicio && e.status === 'Agendada'
        const pendAvaliacao = e.status === 'Realizada' && !e.avaliacao_realizada

        const cNome = e.expand?.candidato?.nome || 'Candidato'
        const vNome = e.expand?.vaga?.titulo || 'Vaga'

        if (pendAvaliacao) {
          itens.push({
            id: `rh-entrevista-aval-${e.id}`,
            tituloAcao: `Preencher avaliação da entrevista realizada com ${cNome}`,
            contexto: `Vaga: ${vNome} · Entrevista concluída sem parecer formal`,
            detalhe:
              'Registre as notas técnica e comportamental para destravar o avanço no pipeline.',
            modulo: 'entrevistas',
            moduloLabel: 'Entrevistas RH',
            severidade: 'urgente',
            severidadeLabel: 'Urgente',
            dataLimiteLabel: 'Hoje',
            rotaDestino: `/entrevistas`,
            origemRecordId: e.id,
          })
        } else if (isHoje || isAtrasada) {
          itens.push({
            id: `rh-entrevista-agenda-${e.id}`,
            tituloAcao: isAtrasada
              ? `Remarcar ou atualizar status da entrevista com ${cNome}`
              : `Conduzir entrevista com ${cNome}`,
            contexto: `Vaga: ${vNome} · Formato: ${e.formato || 'Online'} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`,
            detalhe: e.observacoes || 'Alinhamento comportamental e triagem avançada.',
            modulo: 'entrevistas',
            moduloLabel: 'Entrevistas RH',
            severidade: 'urgente',
            severidadeLabel: 'Urgente',
            dataLimite: e.data_hora,
            dataLimiteLabel: isHoje
              ? `Hoje às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Pendente',
            rotaDestino: `/entrevistas`,
            origemRecordId: e.id,
          })
        }
      }

      // 4.2 Onboarding em andamento (ex. Juliana Mendes a 46% ou pendências de admissão)
      for (const onb of onboardings) {
        if (onb.status === 'Ativo') {
          const cand = onb.expand?.candidato
          const vaga = onb.expand?.vaga
          const perc = onb.percentual_conclusao || 0
          const candNome = cand?.nome || 'Novo Contratado'
          const vagaTitulo = vaga?.titulo || 'Posição'

          // Verificar itens atrasados ou críticos na empresa
          let itensEmpresaAbertos = 0
          if (Array.isArray(onb.itens)) {
            itensEmpresaAbertos = onb.itens.filter(
              (it: any) => !it.concluido && !it.aCargoDoContratado,
            ).length
          }

          itens.push({
            id: `rh-onboarding-${onb.id}`,
            tituloAcao: `Acompanhar onboarding de ${candNome} (${perc}% concluído)`,
            contexto: `Vaga: ${vagaTitulo} · Data de Admissão: ${onb.data_admissao ? new Date(onb.data_admissao).toLocaleDateString('pt-BR') : 'A definir'}`,
            detalhe:
              onb.status_admissao === 'Em preenchimento'
                ? `Candidato em preenchimento da ficha. Restam ${itensEmpresaAbertos} itens a cargo da empresa.`
                : `Status admissional: ${onb.status_admissao || 'Em andamento'}. Libere acessos e kit de boas-vindas.`,
            modulo: 'onboarding',
            moduloLabel: 'Onboarding & Dia 1',
            severidade: perc < 60 ? 'urgente' : 'atencao',
            severidadeLabel: perc < 60 ? 'Urgente' : 'Atenção',
            dataLimiteLabel: onb.data_admissao
              ? new Date(onb.data_admissao).toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit',
                })
              : 'Em andamento',
            rotaDestino: `/onboarding?id=${onb.id}`,
            origemRecordId: onb.id,
          })
        }
      }

      // 4.3 Vagas com aprovação pendente ou ajustes solicitados
      for (const v of vagas) {
        if (v.status === 'Ativa') {
          const gestorResp = v.expand?.gestor_responsavel?.name || 'Gestor'
          if (v.status_aprovacao_gestor === 'Ajustes solicitados') {
            itens.push({
              id: `rh-vaga-ajustes-${v.id}`,
              tituloAcao: `Adequar requisitos da vaga ${v.titulo} (Ajustes solicitados)`,
              contexto: `Gestor: ${gestorResp} · Departamento: ${v.departamento || 'Geral'}`,
              detalhe:
                v.parecer_gestor_vaga ||
                'O gestor solicitou alterações nos requisitos antes da aprovação final.',
              modulo: 'vagas',
              moduloLabel: 'Gestão de Vagas',
              severidade: 'urgente',
              severidadeLabel: 'Urgente',
              dataLimiteLabel: 'Hoje',
              rotaDestino: `/vagas/${v.id}`,
              origemRecordId: v.id,
            })
          } else if (
            v.gestor_responsavel &&
            (!v.status_aprovacao_gestor || v.status_aprovacao_gestor === 'Aguardando aprovação')
          ) {
            itens.push({
              id: `rh-vaga-cobrar-${v.id}`,
              tituloAcao: `Cobrar aprovação do gestor na vaga ${v.titulo}`,
              contexto: `Responsável: ${gestorResp} · Departamento: ${v.departamento}`,
              detalhe:
                'A vaga está aguardando retorno formal do gestor para prosseguir com a triagem.',
              modulo: 'vagas',
              moduloLabel: 'Gestão de Vagas',
              severidade: 'atencao',
              severidadeLabel: 'Atenção',
              dataLimiteLabel: 'Esta semana',
              rotaDestino: `/vagas/${v.id}`,
              origemRecordId: v.id,
            })
          }
        }
      }

      // 4.4 Aditivos PJ em fluxo crítico (Em análise pelo jurídico, Ajustes solicitados, Minuta gerada)
      for (const a of aditivos) {
        const prest =
          a.expand?.prestador?.nome_fantasia || a.expand?.prestador?.razao_social || 'Prestador PJ'
        if (a.status === 'Ajustes solicitados') {
          itens.push({
            id: `rh-aditivo-ajustes-${a.id}`,
            tituloAcao: `Revisar minuta do aditivo ${a.numero_aditivo} (Jurídico pediu ajustes)`,
            contexto: `Prestador: ${prest} · Tipo: ${a.tipo}`,
            detalhe:
              a.parecer_juridico ||
              'O parecer jurídico apontou correções necessárias na redação da minuta.',
            modulo: 'pj_aditivos',
            moduloLabel: 'Contratos PJ',
            severidade: 'urgente',
            severidadeLabel: 'Urgente',
            dataLimiteLabel: 'Hoje',
            rotaDestino: `/prestadores-pj`,
            origemRecordId: a.id,
          })
        } else if (a.status === 'Em análise pelo jurídico') {
          itens.push({
            id: `rh-aditivo-juridico-acompanhar-${a.id}`,
            tituloAcao: `Acompanhar parecer jurídico do aditivo ${a.numero_aditivo}`,
            contexto: `Prestador: ${prest} · Em análise pelo Jurídico`,
            detalhe: 'Minuta encaminhada para validação das cláusulas e novo teto financeiro.',
            modulo: 'pj_aditivos',
            moduloLabel: 'Contratos PJ',
            severidade: 'atencao',
            severidadeLabel: 'Atenção',
            dataLimiteLabel: 'Esta semana',
            rotaDestino: `/prestadores-pj`,
            origemRecordId: a.id,
          })
        } else if (a.status === 'Minuta gerada') {
          itens.push({
            id: `rh-aditivo-minuta-${a.id}`,
            tituloAcao: `Enviar minuta do aditivo ${a.numero_aditivo} para o jurídico`,
            contexto: `Prestador: ${prest} · Minuta pronta`,
            detalhe:
              'Minuta calculada pelo sistema aguardando seu envio formal para o departamento jurídico.',
            modulo: 'pj_aditivos',
            moduloLabel: 'Contratos PJ',
            severidade: 'urgente',
            severidadeLabel: 'Urgente',
            dataLimiteLabel: 'Hoje',
            rotaDestino: `/prestadores-pj`,
            origemRecordId: a.id,
          })
        }
      }

      // 4.5 Prestadores PJ com renovação inteligente aproximando (janela <= 60 dias)
      for (const p of prestadoresPj as PrestadorPJ[]) {
        const decisao = calcularDecisaoRenovacaoPrestador(
          p,
          contratosPj as ContratoPJ[],
          aditivos as AditivoPJ[],
          avaliacoesPj as AvaliacaoPrestadorPJ[],
          prestadoresPj as PrestadorPJ[],
        )
        if (decisao && decisao.diasRestantes <= 60) {
          const isUrgente = decisao.diasRestantes <= 20 || decisao.tier === 'REAVALIAR'
          itens.push({
            id: `rh-renovacao-pj-${p.id}`,
            tituloAcao: `Decisão de renovação: ${p.nome_fantasia || p.razao_social} (${decisao.tier})`,
            contexto: `Vence em ~${decisao.diasRestantes} dias · R$ ${decisao.valorHora.toFixed(2)}/h · Nota ${decisao.notaMedia.toFixed(1)}/10`,
            detalhe: decisao.recomendacaoCurta,
            modulo: 'pj_renovacoes',
            moduloLabel: 'Renovação PJ',
            severidade: isUrgente ? 'urgente' : 'atencao',
            severidadeLabel: isUrgente ? 'Urgente' : 'Atenção',
            dataLimiteLabel: `~${decisao.diasRestantes} dias`,
            rotaDestino: `/prestadores-pj`,
            origemRecordId: p.id,
          })
        }
      }

      // 4.6 Candidatos parados no pipeline em Triagem ou Match de IA com alto fit
      const candsTriagemQuentes = candidatos.filter(
        (c) =>
          !c.banco_talentos &&
          !c.reprovado_triagem_auto &&
          (c.status === 'Triagem' || c.status === 'Match técnico/comportamental (IA)') &&
          (c.score_semantico || 0) >= 80,
      )

      for (const c of candsTriagemQuentes.slice(0, 3)) {
        const vagaNome = c.expand?.vaga?.titulo || 'Vaga ativa'
        itens.push({
          id: `rh-triagem-quente-${c.id}`,
          tituloAcao: `Triar candidato qualificado ${c.nome} (Fit ${c.score_semantico}%)`,
          contexto: `Vaga: ${vagaNome} · Estágio: ${c.status}`,
          detalhe: `Candidato de alta aderência aguardando parecer inicial do RH para avançar no processo seletivo.`,
          modulo: 'candidatos',
          moduloLabel: 'Pipeline de Recrutamento',
          severidade: 'atencao',
          severidadeLabel: 'Atenção',
          dataLimiteLabel: 'Esta semana',
          rotaDestino: `/candidatos/${c.id}`,
          origemRecordId: c.id,
        })
      }

      // 4.7 Indicações novas aguardando avaliação
      const indicacoesNovas = indicacoes.filter((i) => i.status === 'Nova')
      for (const ind of indicacoesNovas.slice(0, 2)) {
        const vagaNome = ind.expand?.vaga?.titulo || 'Vaga'
        itens.push({
          id: `rh-indicacao-nova-${ind.id}`,
          tituloAcao: `Avaliar nova indicação interna: ${ind.indicado_nome}`,
          contexto: `Indicado para ${vagaNome} · Aguardando análise de currículo`,
          detalhe: ind.mensagem_indicador || 'Indicação recomendada por colaborador da SouYess.',
          modulo: 'indicacoes',
          moduloLabel: 'Programa de Indicações',
          severidade: 'acompanhar',
          severidadeLabel: 'Acompanhar',
          dataLimiteLabel: 'Próximos dias',
          rotaDestino: `/indicacoes`,
          origemRecordId: ind.id,
        })
      }

      // 4.8 Alertas novos de reaproveitamento de talentos do banco
      const alertasTalentos = alertas.filter(
        (a) => a.tipo === 'talento_para_vaga' && a.status === 'Novo',
      )
      if (alertasTalentos.length > 0) {
        const primeiro = alertasTalentos[0]
        const candNome = primeiro.expand?.candidato?.nome || 'Talento em Destaque'
        const vagaNome = primeiro.expand?.vaga?.titulo || 'Vaga Aberta'
        itens.push({
          id: `rh-alerta-banco-${primeiro.id}`,
          tituloAcao: `Reaproveitar talento do banco: ${candNome} (${primeiro.score || 90}% fit)`,
          contexto: `Vaga: ${vagaNome} · ${alertasTalentos.length} sugestão(ões) com alto match`,
          detalhe:
            primeiro.resumo_ia ||
            'A IA identificou um perfil com alta sinergia já cadastrado no banco da SouYess.',
          modulo: 'alertas',
          moduloLabel: 'Match Inteligente IA',
          severidade: 'acompanhar',
          severidadeLabel: 'Acompanhar',
          dataLimiteLabel: 'Oportunidade',
          rotaDestino: `/alertas`,
          origemRecordId: primeiro.id,
        })
      }
    }

    // =========================================================================
    // 5. APLICAR MARCAÇÃO DE RESOLVIDOS E ORDENAR
    // =========================================================================
    for (const it of itens) {
      if (resolvidosLocais.has(it.id)) {
        it.concluido = true
      }
    }

    // Ordenação: Pendentes primeiro; dentro deles: Urgente > Atenção > Acompanhar
    const pesoSeveridade: Record<SeveridadeMeuDia, number> = {
      urgente: 3,
      atencao: 2,
      acompanhar: 1,
    }

    itens.sort((a, b) => {
      if (a.concluido !== b.concluido) {
        return a.concluido ? 1 : -1
      }
      return pesoSeveridade[b.severidade] - pesoSeveridade[a.severidade]
    })

    // Contadores de KPIs
    const itensPendentes = itens.filter((i) => !i.concluido)
    const urgentesHoje = itensPendentes.filter((i) => i.severidade === 'urgente').length
    const atencaoSemana = itensPendentes.filter((i) => i.severidade === 'atencao').length
    const acompanharCount = itensPendentes.filter((i) => i.severidade === 'acompanhar').length
    const concluidas7d = itens.filter((i) => i.concluido).length

    // Definição do Foco do Dia
    let focoPrincipal = 'Tudo em dia por aqui! Aproveite para planejar o ciclo.'
    const primeiroUrgente = itensPendentes.find((i) => i.severidade === 'urgente')
    if (primeiroUrgente) {
      focoPrincipal = primeiroUrgente.tituloAcao
    } else {
      const primeiroAtencao = itensPendentes.find((i) => i.severidade === 'atencao')
      if (primeiroAtencao) {
        focoPrincipal = primeiroAtencao.tituloAcao
      }
    }

    return {
      itens,
      kpis: {
        totalPendencias: itensPendentes.length,
        urgentesHoje,
        atencaoSemana,
        acompanharCount,
        concluidas7d,
        focoPrincipal,
      },
      totalUrgentes: urgentesHoje,
      totalAtencao: atencaoSemana,
      totalAcompanhar: acompanharCount,
    }
  } catch (err) {
    console.error('Erro ao consolidar pendências de Meu Dia:', err)
    return {
      itens: [],
      kpis: {
        totalPendencias: 0,
        urgentesHoje: 0,
        atencaoSemana: 0,
        acompanharCount: 0,
        concluidas7d: 0,
        focoPrincipal: 'Erro ao conectar aos serviços da SouYess',
      },
      totalUrgentes: 0,
      totalAtencao: 0,
      totalAcompanhar: 0,
    }
  }
}
