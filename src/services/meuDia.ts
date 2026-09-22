/**
 * Módulo Meu Dia — SouYess People Hub
 * Regras de agregação, perfilamento e régua de severidade operacional.
 *
 * ============================================================================
 * RÉGUA DE SEVERIDADE OFICIAL (AUDITADA):
 * ============================================================================
 * - URGENTE (ação hoje):
 *   * Prazo vence hoje ou já expirou;
 *   * Bloqueio direto de terceiros;
 *   * Risco de conformidade iminente (ex: Parecer Jurídico no aditivo ADIT-2026-02);
 *   * Onboarding <60% com admissão imediata (ex: Juliana Mendes Castro a 46%/54%);
 *   * Entrevista agendada para hoje ou entrevista atrasada;
 *   * Entrevista realizada sem avaliação/parecer formal registrado;
 *   * Validação de vaga pendente pelo gestor contratante;
 *   * Vaga aguardando retorno/aprovação do gestor há mais de 48h (cobrança ativa pelo RH);
 *   * Parecer técnico de candidato com vídeo/análise IA pronta ou fit altíssimo aguardando decisão;
 *   * Contrato PJ vencendo em <=20 dias ou prestador com recomendação REAVALIAR.
 *
 * - ATENÇÃO (esta semana):
 *   * Vencimento em 1–7 dias;
 *   * Acompanhamento de SLA entre áreas (RH aguardando jurídico para ADIT-2026-02);
 *   * Gestor aguardado para aprovação de vaga há <48h;
 *   * Decisão contratual em janela intermediária (21–45 dias);
 *   * Candidatos quentes em triagem (fit IA >= 80%);
 *   * Parecer técnico do gestor para candidatos sem urgência imediata;
 *   * Onboarding >60% em andamento;
 *   * Entrevistas agendadas para os próximos dias da semana.
 *
 * - ACOMPANHAR:
 *   * Sem prazo imediato ou janela longa (>45–60 dias);
 *   * Oportunidades proativas/IA: indicações internas novas, reaproveitamento de talentos
 *     via Match Inteligente do Banco de Talentos;
 *   * Aditivos PJ aguardando assinatura das partes;
 *   * Renovação PJ saudável tier RENOVAR a 60 dias.
 * ============================================================================
 */

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
  | 'integracao_rotina'
  | 'pj_aditivos'
  | 'pj_renovacoes'
  | 'indicacoes'
  | 'alertas'
  | 'documentos_pessoa'
  | 'horas_competencias'
  | 'notas_fiscais'
  | 'contratos'

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
  erro?: string | null
  entidadesComFalha?: string[]
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
    usuario.email?.toLowerCase().includes('juridico')
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
    const queries = [
      {
        nome: 'vagas',
        fn: () =>
          pb.collection('vagas').getFullList({ sort: '-created', expand: 'gestor_responsavel' }),
      },
      {
        nome: 'entrevistas',
        fn: () =>
          pb.collection('entrevistas').getFullList({
            sort: 'data_hora',
            expand: 'candidato,vaga,responsavel_usuario',
          }),
      },
      {
        nome: 'candidatos',
        fn: () =>
          pb.collection('candidatos').getFullList({
            sort: '-score_semantico',
            expand: 'vaga',
          }),
      },
      {
        nome: 'aditivos_pj',
        fn: () =>
          pb.collection('aditivos_pj').getFullList({
            sort: '-sequencia',
            expand: 'contrato,prestador,aprovado_por',
          }),
      },
      {
        nome: 'onboardings',
        fn: () =>
          pb.collection('onboardings').getFullList({
            sort: '-created',
            expand: 'candidato,vaga',
          }),
      },
      {
        nome: 'contratos_pj',
        fn: () =>
          pb.collection('contratos_pj').getFullList({
            sort: '-created',
            expand: 'prestador',
          }),
      },
      {
        nome: 'prestadores_pj',
        fn: () =>
          pb.collection('prestadores_pj').getFullList({
            sort: '-created',
          }),
      },
      {
        nome: 'avaliacoes_prestador_pj',
        fn: () =>
          pb.collection('avaliacoes_prestador_pj').getFullList({
            sort: '-created',
          }),
      },
      {
        nome: 'indicacoes',
        fn: () =>
          pb.collection('indicacoes').getFullList({
            sort: '-created',
            expand: 'vaga,indicador',
          }),
      },
      {
        nome: 'alertas',
        fn: () =>
          pb.collection('alertas').getFullList({
            filter: "status = 'Novo'",
            sort: '-created',
            expand: 'vaga,candidato,prestador',
          }),
      },
      {
        nome: 'feedbacks_gestor',
        fn: () =>
          pb.collection('feedbacks_gestor').getFullList({
            sort: '-created',
          }),
      },
      {
        nome: 'analises_video_ia',
        fn: () =>
          pb.collection('analises_video_ia').getFullList({
            sort: '-created',
          }),
      },
      {
        nome: 'janelas_entrevista_candidato',
        fn: () =>
          pb.collection('janelas_entrevista_candidato').getFullList({
            sort: '-updated',
            expand: 'candidato,vaga',
          }),
      },
      {
        nome: 'documentos_pessoa',
        fn: () =>
          pb.collection('documentos_pessoa').getFullList({
            sort: '-created',
            expand: 'pessoa',
          }),
      },
      {
        nome: 'pessoas',
        fn: () =>
          pb.collection('pessoas').getFullList({
            sort: 'nome',
          }),
      },
      {
        nome: 'fechamentos_competencia',
        fn: () =>
          pb.collection('fechamentos_competencia').getFullList({
            sort: '-competencia',
            expand: 'pessoa,gestor_validador',
          }),
      },
      {
        nome: 'notas_fiscais',
        fn: () =>
          pb.collection('notas_fiscais').getFullList({
            sort: '-created',
            expand: 'pessoa,fechamento',
          }),
      },
      {
        nome: 'contratos_unificados',
        fn: () =>
          pb.collection('contratos').getFullList({
            sort: '-created',
            expand: 'pessoa,prestador_pj',
          }),
      },
      {
        nome: 'programacoes_descanso',
        fn: () =>
          pb.collection('programacoes_descanso').getFullList({
            sort: '-data_inicio',
            expand: 'pessoa',
          }),
      },
    ]

    const resultadosSettled = await Promise.allSettled(queries.map((q) => q.fn()))

    const entidadesComFalha: string[] = []
    const dadosMapeados: Record<string, RecordModel[]> = {}

    queries.forEach((q, idx) => {
      const res = resultadosSettled[idx]
      if (res.status === 'fulfilled') {
        dadosMapeados[q.nome] = res.value as RecordModel[]
      } else {
        console.warn(`[MeuDia] Falha não impeditiva ao consultar coleção "${q.nome}":`, res.reason)
        entidadesComFalha.push(q.nome)
        dadosMapeados[q.nome] = []
      }
    })

    const vagas = dadosMapeados['vagas']
    const entrevistas = dadosMapeados['entrevistas']
    const candidatos = dadosMapeados['candidatos']
    const aditivos = dadosMapeados['aditivos_pj']
    const onboardings = dadosMapeados['onboardings']
    const contratosPj = dadosMapeados['contratos_pj']
    const prestadoresPj = dadosMapeados['prestadores_pj']
    const avaliacoesPj = dadosMapeados['avaliacoes_prestador_pj']
    const indicacoes = dadosMapeados['indicacoes']
    const alertas = dadosMapeados['alertas']
    const feedbacksGestor = dadosMapeados['feedbacks_gestor']
    const analisesVideoIa = dadosMapeados['analises_video_ia']
    const janelasEntrevista = dadosMapeados['janelas_entrevista_candidato']
    const documentosPessoas = dadosMapeados['documentos_pessoa']
    const pessoas = dadosMapeados['pessoas']
    const fechamentosComp = dadosMapeados['fechamentos_competencia'] || []
    const notasFiscais = dadosMapeados['notas_fiscais'] || []
    const contratosUnificados = dadosMapeados['contratos_unificados'] || []
    const programacoesDescanso = dadosMapeados['programacoes_descanso'] || []

    // =========================================================================
    // 2. REGRAS PARA O GESTOR CONTRATANTE (Líder de BU)
    // =========================================================================
    // O Gestor Contratante atua estritamente escopado à sua BU (empresa) e área.
    // Ele NÃO recebe burocracia PJ/admissional nem itens de outras BUs.
    if (isGestor) {
      const gestorBuId = usuario.empresa || ''
      const gestorAreaId = usuario.area || ''

      // 2.1 Vagas atribuídas ao gestor aguardando aprovação ou com ajustes solicitados
      // Filtradas por gestor responsável ou pela BU do gestor
      const minhasVagas = vagas.filter((v) => {
        if (v.gestor_responsavel === usuario.id) return true
        if (gestorBuId && (v as any).empresa === gestorBuId) return true
        return false
      })
      const minhasVagasIds = new Set(minhasVagas.map((v) => v.id))

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
              'Aguardando sua validação formal para o RH iniciar a captação de talentos.',
            modulo: 'vagas',
            moduloLabel: 'Validação de Vagas',
            severidade: 'urgente',
            severidadeLabel: 'Urgente',
            dataLimiteLabel: 'Hoje',
            rotaDestino: `/gestor`,
            origemRecordId: v.id,
            metaExtra: { vagaId: v.id },
          })
        }
      }

      // 2.2 Candidatos em etapas decisórias aguardando feedback do gestor
      // Etapas: "Match técnico/comportamental (IA)", "Entrevista com RH", "Entrevista técnica"
      // Se não houver feedback registrado pelo gestor na tabela feedbacks_gestor:
      // Gerar card direto no Meu Dia do Gestor.
      // Candidatos com vídeo de apresentação e percepções de IA prontas (ex: Lucas Ferreira)
      // vêm priorizados com o score semântico em destaque no card.
      const candsDecisorios = candidatos.filter(
        (c) =>
          !c.banco_talentos &&
          minhasVagasIds.has(c.vaga) &&
          (c.status === 'Match técnico/comportamental (IA)' ||
            c.status === 'Entrevista com RH' ||
            c.status === 'Entrevista técnica'),
      )

      for (const c of candsDecisorios) {
        const jaAvaliou = feedbacksGestor.some(
          (f) => f.vaga === c.vaga && f.candidato === c.id && f.gestor === usuario.id,
        )

        if (!jaAvaliou) {
          const analiseIa = analisesVideoIa.find(
            (a) => a.candidato === c.id || (a.vaga === c.vaga && a.candidato === c.id),
          )
          const temVideoOuIa = Boolean(c.video_link || c.video_apresentacao || analiseIa)
          const vObj = minhasVagas.find((v) => v.id === c.vaga)
          const score = c.score_semantico || 0

          let tituloAcao = `Emitir parecer do candidato ${c.nome}`
          let detalhe = `Candidato na etapa "${c.status}". Analise o perfil e emita sua recomendação para o avanço no processo.`

          if (temVideoOuIa) {
            tituloAcao = `Avaliar candidato ${c.nome} (Vídeo & Percepção IA prontos — Match ${score}%)`
            detalhe = analiseIa?.resumo_executivo
              ? `Síntese IA (${analiseIa.recomendacao_geral || 'Recomendado'}): ${analiseIa.resumo_executivo}`
              : `Vídeo de apresentação e triagem semântica (${score}% fit) disponíveis para validação imediata do gestor.`
          }

          // Priorização: se tem vídeo/IA pronta ou fit >= 80%, régua urgente; senão atenção
          const isUrgente = temVideoOuIa || score >= 80

          itens.push({
            id: `gestor-parecer-cand-${c.id}`,
            tituloAcao,
            contexto: `Vaga: ${vObj?.titulo || 'Minha vaga'} · Score Semântico: ${score}% fit`,
            detalhe,
            modulo: 'candidatos',
            moduloLabel: 'Parecer Técnico',
            severidade: isUrgente ? 'urgente' : 'atencao',
            severidadeLabel: isUrgente ? 'Urgente' : 'Atenção',
            dataLimiteLabel: isUrgente ? 'Hoje' : 'Esta semana',
            rotaDestino: `/gestor`,
            origemRecordId: c.id,
            metaExtra: {
              candidatoId: c.id,
              vagaId: c.vaga,
              scoreSemantico: score,
              temVideo: Boolean(c.video_link || c.video_apresentacao),
              temAnaliseIa: Boolean(analiseIa),
            },
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

      // 2.4 APONTAMENTO E FECHAMENTO DE HORAS PELO GESTOR CONTRATANTE
      // O Gestor é quem aponta as horas e fecha a competência dos prestadores da sua BU/área:
      // - Quando em "Devolvido para ajustes": URGENTE (ajustar correções apontadas pelo RH)
      // - Quando em "Em apontamento" ou sem fechamento na competência ativa/anterior:
      //   Urgente se perto do fim do mês (dia >= 25) ou mês anterior não fechado; Atenção se aberta.
      // IMPORTANTE: Isolamento estrito por BU do gestor logado!
      const prestadoresDoGestor = pessoas.filter((p) => {
        if (p.modalidade !== 'PJ' || p.situacao_contrato === 'Encerrado') return false

        // Se o gestor possui BU vinculada, o vínculo de empresa é OBRIGATÓRIO
        if (gestorBuId) {
          if (p.empresa !== gestorBuId) return false
          if (gestorAreaId && p.area !== gestorAreaId) return false
          return true
        }

        // Se não possui BU configurada, usa atribuição direta como fallback
        if (p.gestor_responsavel === usuario.id) return true
        if (
          p.gestor_nome &&
          usuario.name &&
          p.gestor_nome.toLowerCase().includes(usuario.name.toLowerCase().split(' ')[0])
        )
          return true

        return false
      })

      const mesPassado = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
      const compAnterior = `${mesPassado.getFullYear()}-${String(mesPassado.getMonth() + 1).padStart(2, '0')}`
      const compAtual = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`
      const diaDoMes = agora.getDate()

      for (const p of prestadoresDoGestor) {
        // Verificar fechamentos da pessoa
        const fechsPessoa = fechamentosComp.filter((f) => f.pessoa === p.id)

        // 1. Fechamentos Devolvidos pelo RH para ajustes (Urgente!)
        const devolvidos = fechsPessoa.filter((f) => f.status_ciclo === 'Devolvido para ajustes')
        for (const dev of devolvidos) {
          itens.push({
            id: `gestor-horas-devolvido-${dev.id}`,
            tituloAcao: `Corrigir apontamento de horas de ${p.nome} (${dev.competencia})`,
            contexto: `${p.nome} (PJ) · Devolvido pelo RH · Total: ${dev.total_horas}h`,
            detalhe: dev.parecer_gestor
              ? `O RH devolveu com a seguinte observação: "${dev.parecer_gestor}". Faça os ajustes e reenvie.`
              : 'O RH devolveu o fechamento para correções nos apontamentos de horas. Ajuste e reenvie.',
            modulo: 'horas_competencias',
            moduloLabel: 'Apontamento de Horas',
            severidade: 'urgente',
            severidadeLabel: 'Urgente',
            dataLimiteLabel: 'Hoje',
            rotaDestino: `/horas-competencias?comp=${dev.competencia}`,
            origemRecordId: dev.id,
            metaExtra: { fechamentoId: dev.id, competencia: dev.competencia, pessoaId: p.id },
          })
        }

        // 2. Apontamentos pendentes de fechamento na competência anterior ou atual perto do fim do mês
        const fechAnt = fechsPessoa.find((f) => f.competencia === compAnterior)
        if (!fechAnt || fechAnt.status_ciclo === 'Em apontamento') {
          const isUrgente = diaDoMes >= 5
          itens.push({
            id: `gestor-horas-fechar-${p.id}-${compAnterior}`,
            tituloAcao: `Lançar e fechar horas da competência ${compAnterior}: ${p.nome}`,
            contexto: `${p.nome} (PJ) · Base: ${p.horas_mensais_base || 160}h/mês · Sua área`,
            detalhe: isUrgente
              ? `A competência de ${compAnterior} está aberta e já passou do dia 05. Lance as horas e envie ao RH para não atrasar o faturamento.`
              : `Lance as horas trabalhadas por ${p.nome} em ${compAnterior} e conclua o envio para validação do RH.`,
            modulo: 'horas_competencias',
            moduloLabel: 'Apontamento de Horas',
            severidade: isUrgente ? 'urgente' : 'atencao',
            severidadeLabel: isUrgente ? 'Urgente' : 'Atenção',
            dataLimiteLabel: isUrgente ? 'Vencido' : 'Até dia 05',
            rotaDestino: `/horas-competencias?comp=${compAnterior}`,
            origemRecordId: p.id,
            metaExtra: { pessoaId: p.id, competencia: compAnterior },
          })
        } else {
          // Se competência anterior já foi tratada, verificar competência atual se estiver perto do fim do mês (dia >= 25)
          const fechAtual = fechsPessoa.find((f) => f.competencia === compAtual)
          if (diaDoMes >= 25 && (!fechAtual || fechAtual.status_ciclo === 'Em apontamento')) {
            itens.push({
              id: `gestor-horas-fechar-${p.id}-${compAtual}`,
              tituloAcao: `Apontar horas da competência ${compAtual}: ${p.nome}`,
              contexto: `${p.nome} (PJ) · Fim do mês se aproximando · Base: ${p.horas_mensais_base || 160}h`,
              detalhe: `Estamos nos dias finais de ${compAtual}. Mantenha os apontamentos em dia para fechamento da área.`,
              modulo: 'horas_competencias',
              moduloLabel: 'Apontamento de Horas',
              severidade: 'atencao',
              severidadeLabel: 'Atenção',
              dataLimiteLabel: 'Esta semana',
              rotaDestino: `/horas-competencias?comp=${compAtual}`,
              origemRecordId: p.id,
              metaExtra: { pessoaId: p.id, competencia: compAtual },
            })
          }
        }
      }
    }

    // =========================================================================
    // 3. REGRAS PARA O JURÍDICO
    // =========================================================================
    // O Jurídico foca exclusivamente na conformidade contratual:
    // - ADIT-2026-02 "Em análise pelo jurídico" = URGENTE (ação hoje)
    // - Garantir que NÃO receba pendências operacionais de recrutamento (triagem, entrevistas, onboarding)
    if (isJuridico) {
      // 3.1 Aditivos aguardando parecer jurídico (URGENTE — ação hoje)
      const aditivosJuridico = aditivos.filter((a) => a.status === 'Em análise pelo jurídico')
      for (const a of aditivosJuridico) {
        const prest =
          a.expand?.prestador?.nome_fantasia || a.expand?.prestador?.razao_social || 'Prestador PJ'
        // Localizar a pessoa associada ao prestador para rota direta da ficha
        const pessoaDestePrest = pessoas.find(
          (p) =>
            p.prestador_origem === a.prestador ||
            (a.expand?.prestador?.cnpj && p.cpf_cnpj === a.expand?.prestador?.cnpj),
        )
        const rotaFicha = pessoaDestePrest
          ? `/pessoas/${pessoaDestePrest.id}`
          : `/pessoas/${a.prestador}`

        itens.push({
          id: `juridico-aditivo-${a.id}`,
          tituloAcao: `Analisar e emitir parecer na minuta do aditivo ${a.numero_aditivo || 'PJ'}`,
          contexto: `Pessoa/Prestador: ${pessoaDestePrest?.nome || prest} · Tipo: ${a.tipo || 'Alteração contratual'} · Conformidade Jurídica`,
          detalhe:
            a.descricao ||
            'Minuta elaborada pelo RH aguardando parecer jurídico para prosseguir com assinaturas.',
          modulo: 'pj_aditivos',
          moduloLabel: 'Jurídico Contratual',
          severidade: 'urgente',
          severidadeLabel: 'Urgente',
          dataLimiteLabel: 'Hoje',
          rotaDestino: rotaFicha,
          origemRecordId: a.id,
        })
      }

      // 3.2 Aditivos com ajustes solicitados (Atenção esta semana)
      const aditivosAjustes = aditivos.filter((a) => a.status === 'Ajustes solicitados')
      for (const a of aditivosAjustes) {
        const prest =
          a.expand?.prestador?.nome_fantasia || a.expand?.prestador?.razao_social || 'Prestador PJ'
        const pessoaDestePrest = pessoas.find(
          (p) =>
            p.prestador_origem === a.prestador ||
            (a.expand?.prestador?.cnpj && p.cpf_cnpj === a.expand?.prestador?.cnpj),
        )
        const rotaFicha = pessoaDestePrest
          ? `/pessoas/${pessoaDestePrest.id}`
          : `/pessoas/${a.prestador}`

        itens.push({
          id: `juridico-ajustes-${a.id}`,
          tituloAcao: `Acompanhar ajustes solicitados no aditivo ${a.numero_aditivo}`,
          contexto: `Pessoa/Prestador: ${pessoaDestePrest?.nome || prest} · Ajustes em conferência com o RH`,
          detalhe:
            a.parecer_juridico ||
            'Aguardando adequação de redação ou cláusulas complementares pelo RH.',
          modulo: 'pj_aditivos',
          moduloLabel: 'Jurídico Contratual',
          severidade: 'atencao',
          severidadeLabel: 'Atenção',
          dataLimiteLabel: 'Esta semana',
          rotaDestino: rotaFicha,
          origemRecordId: a.id,
        })
      }
    }

    // =========================================================================
    // 4. REGRAS PARA RH / RECRUTADOR / ADMIN (severo.douglas2@gmail.com)
    // =========================================================================
    if (isRhOuAdmin) {
      // 4.1 Entrevistas agendadas para hoje ou pendentes de avaliação
      const entrevistasHojeOuAtrasadas = entrevistas.filter((e) => {
        if (e.status !== 'Agendada' && !e.avaliacao_realizada) return false
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

      // 4.2 Onboarding em andamento (ex: Juliana Mendes Castro 54%/46% — urgente se <60% com admissão próxima)
      for (const onb of onboardings) {
        if (onb.status === 'Ativo') {
          const cand = onb.expand?.candidato
          const vaga = onb.expand?.vaga
          const perc = onb.percentual_conclusao || 0
          const candNome = cand?.nome || 'Novo Contratado'
          const vagaTitulo = vaga?.titulo || 'Posição'

          let itensEmpresaAbertos = 0
          if (Array.isArray(onb.itens)) {
            itensEmpresaAbertos = onb.itens.filter(
              (it: any) => !it.concluido && !it.aCargoDoContratado,
            ).length
          }

          const isUrgente = perc < 60

          itens.push({
            id: `rh-onboarding-${onb.id}`,
            tituloAcao: `Acompanhar onboarding de ${candNome} (${perc}% concluído)`,
            contexto: `Vaga: ${vagaTitulo} · Data de Admissão: ${
              onb.data_admissao
                ? new Date(onb.data_admissao).toLocaleDateString('pt-BR')
                : 'A definir'
            }`,
            detalhe:
              onb.status_admissao === 'Em preenchimento'
                ? `Candidato em preenchimento da ficha admissional. Restam ${itensEmpresaAbertos} itens críticos a cargo da empresa.`
                : `Status admissional: ${onb.status_admissao || 'Em andamento'}. Libere acessos corporativos e kit de boas-vindas.`,
            modulo: 'onboarding',
            moduloLabel: 'Onboarding & Dia 1',
            severidade: isUrgente ? 'urgente' : 'atencao',
            severidadeLabel: isUrgente ? 'Urgente' : 'Atenção',
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
      // NOVO REQUISITO: Vaga aguardando retorno/aprovação do gestor há mais de 48h
      // deve aparecer como cobrança ativa: URGENTE se >48h, ATENÇÃO caso contrário.
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
            // Calcular tempo de espera desde a criação ou última atualização da vaga
            const dataBaseVaga = new Date(v.created || v.updated || Date.now())
            const horasAguardando = Math.max(
              0,
              Math.floor((agora.getTime() - dataBaseVaga.getTime()) / (1000 * 60 * 60)),
            )
            const maisDe48h = horasAguardando >= 48

            itens.push({
              id: `rh-vaga-cobrar-${v.id}`,
              tituloAcao: maisDe48h
                ? `Cobrança ativa: retorno do gestor há ${Math.floor(horasAguardando / 24)}d na vaga ${v.titulo}`
                : `Acompanhar retorno do gestor na vaga ${v.titulo}`,
              contexto: `Responsável: ${gestorResp} · Departamento: ${v.departamento || 'Geral'}`,
              detalhe: maisDe48h
                ? `A vaga está parada aguardando parecer do gestor há ${horasAguardando}h (>48h). Faça uma cobrança ativa para destravar a publicação.`
                : 'A vaga aguarda retorno formal do gestor contratante dentro do prazo de SLA.',
              modulo: 'vagas',
              moduloLabel: 'Gestão de Vagas',
              severidade: maisDe48h ? 'urgente' : 'atencao',
              severidadeLabel: maisDe48h ? 'Urgente' : 'Atenção',
              dataLimiteLabel: maisDe48h ? 'Cobrança Hoje' : 'Esta semana',
              rotaDestino: `/vagas/${v.id}`,
              origemRecordId: v.id,
              metaExtra: { horasAguardando, maisDe48h },
            })
          }
        }
      }

      // 4.4 Aditivos PJ
      // ITEM 1 DO BRIEFING: Aditivos PJ em fase jurídica (ex: ADIT-2026-02 "Em análise pelo jurídico")
      // NÃO devem mais aparecer como "Urgente — ação hoje" para o RH:
      // Calibrar para "Atenção esta semana" (acompanhamento de SLA — o RH já cumpriu seu papel e aguarda parecer jurídico).
      // Se houver "Ajustes solicitados", continua Urgente (pois a bola voltou para o RH).
      // Se houver "Minuta gerada", é Urgente (RH precisa enviar ao jurídico).
      // Se "Pendente de assinatura", entra em Acompanhar.
      for (const a of aditivos) {
        const prest =
          a.expand?.prestador?.nome_fantasia || a.expand?.prestador?.razao_social || 'Prestador PJ'
        const pessoaDestePrest = pessoas.find(
          (p) =>
            p.prestador_origem === a.prestador ||
            (a.expand?.prestador?.cnpj && p.cpf_cnpj === a.expand?.prestador?.cnpj),
        )
        const rotaFicha = pessoaDestePrest
          ? `/pessoas/${pessoaDestePrest.id}`
          : `/pessoas/${a.prestador}`

        if (a.status === 'Ajustes solicitados') {
          itens.push({
            id: `rh-aditivo-ajustes-${a.id}`,
            tituloAcao: `Revisar minuta do aditivo ${a.numero_aditivo} (Jurídico pediu ajustes)`,
            contexto: `Pessoa/Prestador: ${pessoaDestePrest?.nome || prest} · Tipo: ${a.tipo}`,
            detalhe:
              a.parecer_juridico ||
              'O parecer jurídico apontou correções necessárias na redação da minuta.',
            modulo: 'pj_aditivos',
            moduloLabel: 'Contratos PJ',
            severidade: 'urgente',
            severidadeLabel: 'Urgente',
            dataLimiteLabel: 'Hoje',
            rotaDestino: rotaFicha,
            origemRecordId: a.id,
          })
        } else if (a.status === 'Minuta gerada') {
          itens.push({
            id: `rh-aditivo-minuta-${a.id}`,
            tituloAcao: `Enviar minuta do aditivo ${a.numero_aditivo} para o jurídico`,
            contexto: `Pessoa/Prestador: ${pessoaDestePrest?.nome || prest} · Minuta pronta`,
            detalhe:
              'Minuta calculada pelo sistema aguardando seu envio formal para o departamento jurídico.',
            modulo: 'pj_aditivos',
            moduloLabel: 'Contratos PJ',
            severidade: 'urgente',
            severidadeLabel: 'Urgente',
            dataLimiteLabel: 'Hoje',
            rotaDestino: rotaFicha,
            origemRecordId: a.id,
          })
        } else if (a.status === 'Em análise pelo jurídico') {
          // CALIBRADO PARA "ATENÇÃO ESTA SEMANA" (Acompanhamento de SLA)
          itens.push({
            id: `rh-aditivo-juridico-acompanhar-${a.id}`,
            tituloAcao: `Acompanhar parecer jurídico do aditivo ${a.numero_aditivo}`,
            contexto: `Pessoa/Prestador: ${pessoaDestePrest?.nome || prest} · Em análise pelo Jurídico (SLA)`,
            detalhe:
              'Minuta encaminhada para validação jurídica. O RH cumpriu a elaboração e agora monitora o prazo de retorno.',
            modulo: 'pj_aditivos',
            moduloLabel: 'Contratos PJ',
            severidade: 'atencao',
            severidadeLabel: 'Atenção',
            dataLimiteLabel: 'Esta semana',
            rotaDestino: rotaFicha,
            origemRecordId: a.id,
          })
        } else if (a.status === 'Pendente de assinatura') {
          itens.push({
            id: `rh-aditivo-assinatura-${a.id}`,
            tituloAcao: `Coletar assinaturas no aditivo ${a.numero_aditivo}`,
            contexto: `Pessoa/Prestador: ${pessoaDestePrest?.nome || prest} · Minuta aprovada pelo Jurídico`,
            detalhe:
              'Parecer jurídico favorável emitido. Aguardando conclusão da coleta de assinaturas digitais.',
            modulo: 'pj_aditivos',
            moduloLabel: 'Contratos PJ',
            severidade: 'acompanhar',
            severidadeLabel: 'Acompanhar',
            dataLimiteLabel: 'Acompanhar',
            rotaDestino: rotaFicha,
            origemRecordId: a.id,
          })
        }
      }

      // 4.4.1 Contratos Unificados (PJ e CLT) vencendo ou em janela de renovação (60d PJ / 15d CLT)
      for (const ct of contratosUnificados as any[]) {
        if (ct.status === 'Encerrado' || ct.status === 'Rescindido') continue

        const pObj = ct.expand?.pessoa || pessoas.find((p) => p.id === ct.pessoa)
        const pNome = pObj?.nome || 'Colaborador/Prestador'
        const isClt = ct.modalidade === 'CLT'
        const diasAlerta = ct.dias_antecedencia_alerta || (isClt ? 15 : 60)

        // Se o contrato estiver em "Em assinatura", gerar card para o RH acompanhar / assinar
        if (ct.status === 'Em assinatura') {
          itens.push({
            id: `rh-contrato-em-assinatura-${ct.id}`,
            tituloAcao: `Coletar assinaturas no contrato ${ct.codigo_contrato} (${pNome})`,
            contexto: `${pNome} (${ct.modalidade}) · ${ct.titulo} · Versão v${ct.versao_atual || 1}.0`,
            detalhe: 'Minuta gerada e encaminhada para coleta de assinaturas internas auditáveis.',
            modulo: 'pj_aditivos',
            moduloLabel: 'Contratos Digitais',
            severidade: 'atencao',
            severidadeLabel: 'Atenção',
            dataLimiteLabel: 'Esta semana',
            rotaDestino: `/pessoas/${ct.pessoa || pObj?.id}`,
            origemRecordId: ct.id,
          })
        }

        // Se houver data_fim, calcular dias restantes até o término
        if (ct.data_fim) {
          const agoraZero = new Date(agora)
          agoraZero.setHours(0, 0, 0, 0)
          const dFim = new Date(ct.data_fim)
          dFim.setHours(0, 0, 0, 0)

          const diffDias = Math.ceil((dFim.getTime() - agoraZero.getTime()) / (1000 * 60 * 60 * 24))

          if (diffDias <= diasAlerta) {
            let severidade: SeveridadeMeuDia = 'acompanhar'
            let severidadeLabel: 'Urgente' | 'Atenção' | 'Acompanhar' = 'Acompanhar'

            if (diffDias <= (isClt ? 7 : 20)) {
              severidade = 'urgente'
              severidadeLabel = 'Urgente'
            } else if (diffDias <= (isClt ? 15 : 45)) {
              severidade = 'atencao'
              severidadeLabel = 'Atenção'
            }

            const tipoDesc = isClt ? 'Término de Experiência CLT' : 'Vencimento de Contrato PJ'

            itens.push({
              id: `rh-contrato-vencendo-${ct.id}`,
              tituloAcao: `${tipoDesc}: ${pNome} (Vence em ${diffDias} dias)`,
              contexto: `${pNome} (${ct.modalidade}) · ${ct.codigo_contrato} · R$ ${(ct.valor_mensal || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês`,
              detalhe: isClt
                ? `O contrato de trabalho de ${pNome} atinge o término em ${dFim.toLocaleDateString('pt-BR')}. Avalie a rotina 30-60-90 para efetivação ou término do período experimental.`
                : `O contrato de prestação de serviços expira em ${diffDias} dias. Inicie a renovação assistida ou formalize o termo aditivo de prorrogação.`,
              modulo: isClt ? 'onboarding' : 'pj_renovacoes',
              moduloLabel: isClt ? 'Renovação CLT' : 'Renovação PJ',
              severidade,
              severidadeLabel,
              dataLimiteLabel: `Em ${diffDias}d`,
              rotaDestino: `/pessoas/${ct.pessoa || pObj?.id}`,
              origemRecordId: ct.id,
            })
          }
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
          // Régua de severidade:
          // Urgente se <= 20 dias ou se REAVALIAR
          // Atenção se 21 a 45 dias
          // Acompanhar se > 45 dias (janela longa saudável com tier RENOVAR)
          let severidade: SeveridadeMeuDia = 'acompanhar'
          let severidadeLabel: 'Urgente' | 'Atenção' | 'Acompanhar' = 'Acompanhar'

          if (decisao.diasRestantes <= 20 || decisao.tier === 'REAVALIAR') {
            severidade = 'urgente'
            severidadeLabel = 'Urgente'
          } else if (decisao.diasRestantes <= 45) {
            severidade = 'atencao'
            severidadeLabel = 'Atenção'
          }

          const pessoaDestePrest = pessoas.find(
            (pessoa) => pessoa.prestador_origem === p.id || (p.cnpj && pessoa.cpf_cnpj === p.cnpj),
          )
          const rotaFicha = pessoaDestePrest
            ? `/pessoas/${pessoaDestePrest.id}`
            : `/pessoas/${p.id}`

          itens.push({
            id: `rh-renovacao-pj-${p.id}`,
            tituloAcao: `Decisão de renovação: ${pessoaDestePrest?.nome || p.nome_fantasia || p.razao_social} (${decisao.tier})`,
            contexto: `Vence em ~${decisao.diasRestantes} dias · R$ ${decisao.valorHora.toFixed(2)}/h · Nota ${decisao.notaMedia.toFixed(1)}/10`,
            detalhe: decisao.recomendacaoCurta,
            modulo: 'pj_renovacoes',
            moduloLabel: 'Renovação PJ',
            severidade,
            severidadeLabel,
            dataLimiteLabel: `~${decisao.diasRestantes} dias`,
            rotaDestino: rotaFicha,
            origemRecordId: p.id,
          })
        }
      }

      // 4.6 Candidatos parados no pipeline em Triagem ou Match de IA com alto fit (fit >= 80% = ATENÇÃO)
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

      // 4.7 Indicações novas aguardando avaliação (ACOMPANHAR)
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

      // 4.8 Alertas novos de reaproveitamento de talentos do banco (ACOMPANHAR)
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

      // 4.9 Alertas do Cofre de Documentos de Pessoas:
      // Documentos vencidos -> "Urgente — requer ação hoje"
      // Documentos vencendo em <= 30 dias -> "Atenção esta semana"
      for (const doc of documentosPessoas || []) {
        if (!doc.data_vencimento) continue

        const pObj = doc.expand?.pessoa || pessoas.find((p) => p.id === doc.pessoa)
        const pNome = pObj?.nome || 'Colaborador/Prestador'
        const pMod = pObj?.modalidade || 'CLT/PJ'

        const agoraZero = new Date(agora)
        agoraZero.setHours(0, 0, 0, 0)
        const vencDate = new Date(doc.data_vencimento)
        vencDate.setHours(0, 0, 0, 0)

        const diffDias = Math.ceil(
          (vencDate.getTime() - agoraZero.getTime()) / (1000 * 60 * 60 * 24),
        )

        if (diffDias < 0) {
          // Documento já vencido: URGENTE
          const diasAtraso = Math.abs(diffDias)
          itens.push({
            id: `doc-pessoa-vencido-${doc.id}`,
            tituloAcao: `Regularizar documento vencido de ${pNome}: ${doc.nome}`,
            contexto: `${pNome} (${pMod}) · ${doc.tipo} · Venceu há ${diasAtraso}d`,
            detalhe: `O documento "${doc.nome}" do cofre venceu em ${vencDate.toLocaleDateString('pt-BR')}. Solicite ou anexe imediatamente a via atualizada para mitigar riscos de conformidade.`,
            modulo: 'documentos_pessoa',
            moduloLabel: 'Cofre de Documentos',
            severidade: 'urgente',
            severidadeLabel: 'Urgente',
            dataLimiteLabel: 'Vencido',
            rotaDestino: `/pessoas/${doc.pessoa || pObj?.id}`,
            origemRecordId: doc.id,
            metaExtra: { pessoaId: doc.pessoa || pObj?.id, documentoId: doc.id, diffDias },
          })
        } else if (diffDias <= 30) {
          // Documento vencendo em <= 30 dias: ATENÇÃO ESTA SEMANA
          itens.push({
            id: `doc-pessoa-vencendo-${doc.id}`,
            tituloAcao: `Renovar documento de ${pNome} (Vence em ${diffDias}d): ${doc.nome}`,
            contexto: `${pNome} (${pMod}) · ${doc.tipo} · Prazo ${vencDate.toLocaleDateString('pt-BR')}`,
            detalhe: `O documento "${doc.nome}" expira em ${diffDias} dias. Notifique o colaborador/prestador ou inicie a emissão da nova certidão/termo.`,
            modulo: 'documentos_pessoa',
            moduloLabel: 'Cofre de Documentos',
            severidade: 'atencao',
            severidadeLabel: 'Atenção',
            dataLimiteLabel: `Em ${diffDias}d`,
            rotaDestino: `/pessoas/${doc.pessoa || pObj?.id}`,
            origemRecordId: doc.id,
            metaExtra: { pessoaId: doc.pessoa || pObj?.id, documentoId: doc.id, diffDias },
          })
        }
      }
    }

    // 4.10 Agendamentos de Entrevistas Confirmados ou Reagendamentos pelo Candidato (Portal Self-Service)
    for (const jan of janelasEntrevista || []) {
      const cand = jan.expand?.candidato
      const vaga = jan.expand?.vaga
      const candNome = cand?.nome || 'Candidato'
      const vagaNome = vaga?.titulo || 'Vaga ativa'

      if (jan.status === 'Confirmado' && jan.janela_escolhida) {
        const slot = jan.janela_escolhida
        itens.push({
          id: `rh-cand-entrevista-confirmada-${jan.id}`,
          tituloAcao: `Entrevista confirmada pelo candidato: ${candNome}`,
          contexto: `Vaga: ${vagaNome} · Horário escolhido: ${slot.label || slot.data_inicio}`,
          detalhe: `O candidato confirmou a entrevista via portal self-service para ${slot.label || slot.data_inicio}. Formato: ${jan.formato || 'Online'}. Entrevistador: ${jan.responsavel_nome}.`,
          modulo: 'entrevistas',
          moduloLabel: 'Experiência do Candidato',
          severidade: 'urgente',
          severidadeLabel: 'Urgente',
          dataLimiteLabel: 'Agendada',
          rotaDestino: `/candidatos/${cand?.id || jan.candidato}`,
          origemRecordId: jan.id,
        })
      } else if (jan.status === 'Reagendamento solicitado') {
        itens.push({
          id: `rh-cand-reagendamento-solicitado-${jan.id}`,
          tituloAcao: `Propor novos horários para ${candNome} (Reagendamento solicitado)`,
          contexto: `Vaga: ${vagaNome} · Candidato solicitou nova janela`,
          detalhe: `Motivo informado pelo candidato: "${jan.motivo_reagendamento || 'Conflito de agenda'}". Acesse a ficha do candidato e cadastre novas janelas disponíveis.`,
          modulo: 'entrevistas',
          moduloLabel: 'Experiência do Candidato',
          severidade: 'urgente',
          severidadeLabel: 'Urgente',
          dataLimiteLabel: 'Hoje',
          rotaDestino: `/candidatos/${cand?.id || jan.candidato}`,
          origemRecordId: jan.id,
        })
      }
    }

    // 4.11 VALIDAÇÃO DE HORAS PELO RH E NOTAS FISCAIS EM ATRASO
    if (isRhOuAdmin) {
      // 4.11.1 Competências aguardando validação do RH (Gestor concluiu os apontamentos)
      // O RH agora valida ou devolve com observações. Urgente se a competência já encerrou o mês ou >2 dias úteis.
      const fechsParaValidarRh = fechamentosComp.filter(
        (f) => f.status_ciclo === 'Aguardando validação do RH',
      )

      for (const f of fechsParaValidarRh) {
        const pObj = f.expand?.pessoa || pessoas.find((p) => p.id === f.pessoa)
        const pNome = pObj?.nome || 'Prestador PJ'
        const vTot = f.valor_total_calculado || 0
        const isCompPassada =
          f.competencia < `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, '0')}`

        itens.push({
          id: `rh-validar-horas-${f.id}`,
          tituloAcao: `Validar competência ${f.competencia} de ${pNome} (${f.total_horas}h)`,
          contexto: `Prestador PJ: ${pNome} · Gestor: ${f.gestor_nome || 'Gestor Contratante'} · R$ ${vTot.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
          detalhe: `O gestor concluiu os apontamentos de horas (${f.total_horas}h). Valide as entregas ou devolva com correções para liberar a solicitação de NF.`,
          modulo: 'horas_competencias',
          moduloLabel: 'Validação de Horas',
          severidade: isCompPassada ? 'urgente' : 'atencao',
          severidadeLabel: isCompPassada ? 'Urgente' : 'Atenção',
          dataLimiteLabel: isCompPassada ? 'Prioritário' : 'Esta semana',
          rotaDestino: `/horas-competencias?comp=${f.competencia}`,
          origemRecordId: f.id,
          metaExtra: { fechamentoId: f.id, competencia: f.competencia, pessoaId: f.pessoa },
        })
      }

      // 4.11.2 Competências ainda em aberto / não submetidas pelos gestores após o dia 5
      const mesPassado = new Date(agora.getFullYear(), agora.getMonth() - 1, 1)
      const compAnterior = `${mesPassado.getFullYear()}-${String(mesPassado.getMonth() + 1).padStart(2, '0')}`
      const diaDoMes = agora.getDate()

      const prestadoresPjAtivos = pessoas.filter(
        (p) => p.modalidade === 'PJ' && p.situacao_contrato !== 'Encerrado',
      )

      if (diaDoMes >= 5) {
        prestadoresPjAtivos.forEach((p) => {
          const fechAnt = fechamentosComp.find(
            (f) => f.pessoa === p.id && f.competencia === compAnterior,
          )

          const isPendenteGestor =
            !fechAnt ||
            fechAnt.status_ciclo === 'Em apontamento' ||
            fechAnt.status_ciclo === 'Devolvido para ajustes'

          if (isPendenteGestor) {
            itens.push({
              id: `rh-cobrar-gestor-horas-${p.id}-${compAnterior}`,
              tituloAcao: `Cobrar fechamento de horas de ${p.nome} com o gestor (${compAnterior})`,
              contexto: `${p.nome} · Gestor: ${p.gestor_nome || 'Área solicitante'} · Ultrapassou dia 05`,
              detalhe: `O gestor responsável ainda não concluiu o lançamento/fechamento das horas da competência ${compAnterior}. Faça uma cobrança ativa para viabilizar o ciclo fiscal.`,
              modulo: 'horas_competencias',
              moduloLabel: 'Horas & Competências',
              severidade: 'urgente',
              severidadeLabel: 'Urgente',
              dataLimiteLabel: 'Cobrança Urgente',
              rotaDestino: `/horas-competencias?comp=${compAnterior}`,
              origemRecordId: p.id,
              metaExtra: { pessoaId: p.id, competencia: compAnterior },
            })
          }
        })
      }

      // 4.11.3 NOTAS FISCAIS EM ATRASO (Inadimplência de envio de NF pelo prestador PJ)
      const nfsAtrasadas = notasFiscais.filter((nf) => nf.status === 'Em atraso')
      for (const nf of nfsAtrasadas) {
        const pObj = nf.expand?.pessoa || pessoas.find((p) => p.id === nf.pessoa)
        const pNome = pObj?.nome || 'Prestador PJ'
        const vTot = nf.valor || 0
        const limiteStr = nf.data_limite_envio
          ? new Date(nf.data_limite_envio).toLocaleDateString('pt-BR')
          : 'Prazo expirado'

        itens.push({
          id: `rh-nf-em-atraso-${nf.id}`,
          tituloAcao: `Cobrar envio de Nota Fiscal de ${pNome} (${nf.competencia})`,
          contexto: `${pNome} · Valor: R$ ${vTot.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} · Limite: ${limiteStr}`,
          detalhe: `O prazo de envio da Nota Fiscal referente à competência ${nf.competencia} expirou. Registre cobrança ativa ou anexe o documento recebido.`,
          modulo: 'notas_fiscais',
          moduloLabel: 'Notas Fiscais em Lote',
          severidade: 'urgente',
          severidadeLabel: 'Urgente',
          dataLimiteLabel: 'Cobrança Urgente',
          rotaDestino: `/horas-competencias?comp=${nf.competencia}`,
          origemRecordId: nf.id,
          metaExtra: { nfId: nf.id, competencia: nf.competencia, valor: vTot },
        })
      }
    }

    // 4.12 FÉRIAS CLT (VENCENDO / PERÍODO AQUISITIVO) E DESCANSO REMUNERADO PJ (30 DIAS ANTES)
    if (isRhOuAdmin) {
      // 4.12.1 Programações de Férias CLT & Períodos aquisitivos próximos do limite concessivo
      const cltsAtivos = pessoas.filter(
        (p) => p.modalidade === 'CLT' && p.situacao_contrato !== 'Encerrado',
      )

      for (const clt of cltsAtivos) {
        // Encontrar programações de férias cadastradas para este CLT
        const progClt = programacoesDescanso.filter(
          (pr) => pr.pessoa === clt.id && pr.tipo === 'CLT_FERIAS' && pr.status !== 'Canceladas',
        )

        // Se tem férias programadas iniciando em breve (próximos 30 dias)
        for (const prog of progClt) {
          if (prog.status === 'Programadas' && prog.data_inicio) {
            const dtIni = new Date(prog.data_inicio)
            const diasAteInicio = Math.ceil(
              (dtIni.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24),
            )
            if (diasAteInicio >= 0 && diasAteInicio <= 30) {
              const dtIniStr = dtIni.toLocaleDateString('pt-BR')
              const dtFimStr = prog.data_fim
                ? new Date(prog.data_fim).toLocaleDateString('pt-BR')
                : ''
              itens.push({
                id: `rh-ferias-programadas-${prog.id}`,
                tituloAcao: `Férias programadas de ${clt.nome} em ${diasAteInicio === 0 ? 'hoje' : `${diasAteInicio} dias`}`,
                contexto: `${clt.nome} (${clt.cargo_funcao || 'CLT'}) · Período: ${dtIniStr} a ${dtFimStr} (${prog.dias} dias)`,
                detalhe: `Valor do período com 1/3: R$ ${Number(prog.valor_periodo || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Programar pagamento de adiantamento de férias e escala de cobertura.`,
                modulo: 'contratos',
                moduloLabel: 'Férias CLT',
                severidade: diasAteInicio <= 7 ? 'urgente' : 'atencao',
                severidadeLabel: diasAteInicio <= 7 ? 'Urgente' : 'Atenção',
                dataLimiteLabel: diasAteInicio <= 7 ? 'Esta semana' : 'Em 30 dias',
                rotaDestino: `/pessoas/${clt.id}?tab=vinculos`,
                origemRecordId: prog.id,
                metaExtra: { pessoaId: clt.id, programacaoId: prog.id },
              })
            }
          }

          // Checar se o período concessivo limite está próximo de vencer (< 60 dias) gerando risco de férias em dobro
          if (prog.periodo_concessivo_limite) {
            const dtLimite = new Date(prog.periodo_concessivo_limite)
            const diasAteLimite = Math.ceil(
              (dtLimite.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24),
            )
            if (
              diasAteLimite <= 60 &&
              diasAteLimite > 0 &&
              Number(prog.dias_saldo_remanescente) > 0
            ) {
              itens.push({
                id: `rh-ferias-limite-concessivo-${prog.id}`,
                tituloAcao: `Atenção: Limite concessivo de férias de ${clt.nome} vence em ${diasAteLimite} dias`,
                contexto: `${clt.nome} · Saldo: ${prog.dias_saldo_remanescente} dias · Risco de dobra legal`,
                detalhe: `O prazo limite concessivo das férias vence em ${dtLimite.toLocaleDateString('pt-BR')}. Conceda os dias restantes para evitar o pagamento de férias em dobro.`,
                modulo: 'contratos',
                moduloLabel: 'Férias CLT',
                severidade: diasAteLimite <= 30 ? 'urgente' : 'atencao',
                severidadeLabel: diasAteLimite <= 30 ? 'Urgente' : 'Atenção',
                dataLimiteLabel: dtLimite.toLocaleDateString('pt-BR'),
                rotaDestino: `/pessoas/${clt.id}?tab=vinculos`,
                origemRecordId: prog.id,
                metaExtra: { pessoaId: clt.id, programacaoId: prog.id },
              })
            }
          }
        }
      }

      // 4.12.2 Programações de Descanso Remunerado PJ (Alerta antecipado 30 dias antes para contabilidade/fiscal)
      const progsDescansoPj = programacoesDescanso.filter(
        (pr) => pr.tipo === 'PJ_DESCANSO' && pr.status !== 'Canceladas',
      )

      for (const prog of progsDescansoPj) {
        if (prog.data_inicio) {
          const dtIni = new Date(prog.data_inicio)
          const diasAteInicio = Math.ceil(
            (dtIni.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24),
          )
          const pObj = prog.expand?.pessoa || pessoas.find((p) => p.id === prog.pessoa)
          const pNome = pObj?.nome || 'Prestador PJ'

          if (diasAteInicio >= 0 && diasAteInicio <= 45) {
            const dtIniStr = dtIni.toLocaleDateString('pt-BR')
            const dtFimStr = prog.data_fim
              ? new Date(prog.data_fim).toLocaleDateString('pt-BR')
              : ''
            const vPer = Number(prog.valor_periodo || 0).toLocaleString('pt-BR', {
              minimumFractionDigits: 2,
            })

            itens.push({
              id: `rh-descanso-pj-30d-${prog.id}`,
              tituloAcao: `Programar contabilidade: Descanso PJ de ${pNome} em ${diasAteInicio === 0 ? 'hoje' : `${diasAteInicio} dias`}`,
              contexto: `${pNome} · Suspensão Programada: ${dtIniStr} a ${dtFimStr} (${prog.dias} dias)`,
              detalhe: `Período acordado após 12 meses de parceria. Valor negociado do período: R$ ${vPer}. Atualizar previsão fiscal, emissão de NF proporcional e alinhamento de SLA com a contabilidade.`,
              modulo: 'contratos',
              moduloLabel: 'Descanso PJ',
              severidade: diasAteInicio <= 15 ? 'urgente' : 'atencao',
              severidadeLabel: diasAteInicio <= 15 ? 'Urgente' : 'Atenção',
              dataLimiteLabel: diasAteInicio <= 15 ? 'Ação Imediata' : '30 dias',
              rotaDestino: `/pessoas/${prog.pessoa}?tab=vinculos`,
              origemRecordId: prog.id,
              metaExtra: { pessoaId: prog.pessoa, programacaoId: prog.id },
            })
          }
        }
      }

      // 4.12.3 Elegibilidade de Descanso Remunerado PJ (completou 12 meses sem descanso agendado)
      const pjsAtivos = pessoas.filter(
        (p) => p.modalidade === 'PJ' && p.situacao_contrato !== 'Encerrado',
      )

      for (const pj of pjsAtivos) {
        if (!pj.data_inicio) continue
        const dtIniPj = new Date(pj.data_inicio)
        const mesesContrato =
          (agora.getFullYear() - dtIniPj.getFullYear()) * 12 +
          (agora.getMonth() - dtIniPj.getMonth())

        // Se tem 12 ou mais meses de parceria
        if (mesesContrato >= 12) {
          // Checar se já tem descanso programado ou em gozo
          const temDescansoAtivo = programacoesDescanso.some(
            (pr) =>
              pr.pessoa === pj.id &&
              pr.tipo === 'PJ_DESCANSO' &&
              (pr.status === 'Programadas' || pr.status === 'Em Gozo'),
          )

          if (!temDescansoAtivo) {
            itens.push({
              id: `rh-elegibilidade-descanso-pj-${pj.id}`,
              tituloAcao: `Elegibilidade de Descanso PJ: ${pj.nome} completou ${mesesContrato} meses`,
              contexto: `${pj.nome} · ${pj.cargo_funcao || 'Prestador PJ'} · Parceria desde ${dtIniPj.toLocaleDateString('pt-BR')}`,
              detalhe: `Prestador atingiu a marca de 12 meses de prestação contínua. Alinhe com a liderança e prestador a programação da suspensão temporária acordada e valor do período.`,
              modulo: 'contratos',
              moduloLabel: 'Descanso PJ',
              severidade: 'acompanhar',
              severidadeLabel: 'Acompanhar',
              dataLimiteLabel: '12m cumpridos',
              rotaDestino: `/pessoas/${pj.id}?tab=vinculos`,
              origemRecordId: pj.id,
              metaExtra: { pessoaId: pj.id, mesesContrato },
            })
          }
        }
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
      entidadesComFalha: entidadesComFalha.length > 0 ? entidadesComFalha : undefined,
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
      erro: err instanceof Error ? err.message : 'Erro ao conectar aos serviços da SouYess',
    }
  }
}
