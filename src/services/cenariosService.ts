import { pb } from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export type TipoAlternativaCenario =
  | 'realocar_capacidade'
  | 'desenvolver_competencias'
  | 'contratar_clt'
  | 'contratar_prestador_disponibilidade'
  | 'contratar_servico_escopo'
  | 'reprogramar_demanda'

export interface AlternativaCenario {
  id: string
  tipo: TipoAlternativaCenario
  titulo: string
  descricao: string
  prazo_disponibilizacao_dias: number
  custo_incremental_mensal: number
  custo_pontual: number
  unidade_medicao?: 'horas_mes' | 'entregaveis_marcos' | 'percentual'
  volume_horas_adicionadas?: number
  entregaveis_previstos?: string[]
  demandas_atendidas: string[]
  lacunas_remanescentes: string[]
  impacto_origem: string // Ex: perda de capacidade na BU de origem ou dedicação do time
  dependencias: string[]
  riscos: string[]
  dados_ausentes: string[]
}

export interface PremissasCenario {
  data_inicio: string // YYYY-MM-DD
  duracao_meses: number
  volume_capacidade_necessaria_horas: number
  prazo_medio_contratacao_dias?: number
  prazo_desenvolvimento_competencia_dias?: number
  reserva_operacional_aplicada_percentual?: number
  grau_confirmacao_demanda: 'planejada' | 'confirmada' | 'em_revisao'
  // NENHUMA probabilidade inventada: dados objetivos apenas
}

export interface FonteDadosCenario {
  fonte: string
  registro_id?: string
  confianca: 'oficial_aprovado' | 'vigente_assinado' | 'normalizado' | 'declarado_usuario'
}

export interface CenarioCapacidade {
  id: string
  codigo: string
  nome: string
  objetivo: string
  versao_base_plano: string
  empresa: string
  area?: string
  data_referencia: string
  horizonte_temporal: string
  autor: string
  autor_nome?: string
  situacao: 'em_estudo' | 'proposta_submetida' | 'reprovado' | 'adotado_como_revisao'
  premissas: PremissasCenario
  alteracoes_propostas?: Record<string, any>
  alternativas: AlternativaCenario[]
  fontes_dados: FonteDadosCenario[]
  qualidade_dados_declarada: string
  resumo_comparativo?: Record<string, any>
  is_demonstracao?: boolean
  created?: string
  updated?: string
  expand?: {
    versao_base_plano?: RecordModel
    empresa?: RecordModel
    area?: RecordModel
    autor?: RecordModel
  }
}

export interface PropostaRevisaoPlano {
  id: string
  codigo: string
  cenario_origem: string
  plano_alvo: string
  empresa: string
  justificativa_adocao: string
  impactos_previstos: Record<string, any>
  situacao: 'em_analise_rh' | 'aprovada_para_revisao' | 'rejeitada' | 'cancelada'
  proposto_por: string
  proposto_por_nome?: string
  decidido_por?: string
  data_decisao?: string
  parecer_decisao?: string
  is_demonstracao?: boolean
  created?: string
  updated?: string
}

export interface NovoCenarioInput {
  nome: string
  objetivo: string
  versao_base_plano: string
  empresa: string
  area?: string
  data_referencia: string
  horizonte_temporal: string
  premissas: PremissasCenario
  qualidade_dados_declarada: string
  alternativas?: AlternativaCenario[]
  fontes_dados?: FonteDadosCenario[]
}

export const cenariosService = {
  /**
   * Lista cenários com escopo de BU respeitado pela API rule
   */
  async listarCenarios(empresaId?: string): Promise<CenarioCapacidade[]> {
    const filter = empresaId ? `empresa = '${empresaId}'` : ''
    const records = await pb.collection('cenarios_capacidade').getFullList<RecordModel>({
      filter,
      sort: '-created',
      expand: 'versao_base_plano,empresa,area,autor',
    })

    return records.map((r) => ({
      id: r.id,
      codigo: r.codigo,
      nome: r.nome,
      objetivo: r.objetivo,
      versao_base_plano: r.versao_base_plano,
      empresa: r.empresa,
      area: r.area,
      data_referencia: r.data_referencia,
      horizonte_temporal: r.horizonte_temporal,
      autor: r.autor,
      autor_nome: r.autor_nome,
      situacao: r.situacao,
      premissas: r.premissas || {},
      alteracoes_propostas: r.alteracoes_propostas,
      alternativas: Array.isArray(r.alternativas) ? r.alternativas : [],
      fontes_dados: Array.isArray(r.fontes_dados) ? r.fontes_dados : [],
      qualidade_dados_declarada: r.qualidade_dados_declarada || 'Não declarada',
      resumo_comparativo: r.resumo_comparativo,
      is_demonstracao: r.is_demonstracao,
      created: r.created,
      updated: r.updated,
      expand: r.expand as any,
    }))
  },

  async buscarCenarioPorId(id: string): Promise<CenarioCapacidade> {
    const r = await pb.collection('cenarios_capacidade').getOne<RecordModel>(id, {
      expand: 'versao_base_plano,empresa,area,autor',
    })
    return {
      id: r.id,
      codigo: r.codigo,
      nome: r.nome,
      objetivo: r.objetivo,
      versao_base_plano: r.versao_base_plano,
      empresa: r.empresa,
      area: r.area,
      data_referencia: r.data_referencia,
      horizonte_temporal: r.horizonte_temporal,
      autor: r.autor,
      autor_nome: r.autor_nome,
      situacao: r.situacao,
      premissas: r.premissas || {},
      alteracoes_propostas: r.alteracoes_propostas,
      alternativas: Array.isArray(r.alternativas) ? r.alternativas : [],
      fontes_dados: Array.isArray(r.fontes_dados) ? r.fontes_dados : [],
      qualidade_dados_declarada: r.qualidade_dados_declarada || 'Não declarada',
      resumo_comparativo: r.resumo_comparativo,
      is_demonstracao: r.is_demonstracao,
      created: r.created,
      updated: r.updated,
      expand: r.expand as any,
    }
  },

  async criarCenario(input: NovoCenarioInput): Promise<CenarioCapacidade> {
    const user = pb.authStore.record
    const timestamp = Date.now().toString().slice(-4)
    const codigo = `CEN-${new Date().getFullYear()}-${timestamp}`

    const payload = {
      codigo,
      nome: input.nome,
      objetivo: input.objetivo,
      versao_base_plano: input.versao_base_plano,
      empresa: input.empresa,
      area: input.area || null,
      data_referencia: input.data_referencia,
      horizonte_temporal: input.horizonte_temporal,
      autor: user?.id,
      autor_nome: user?.name || user?.email || 'Usuário Atual',
      situacao: 'em_estudo',
      premissas: input.premissas,
      alternativas: input.alternativas || [],
      fontes_dados: input.fontes_dados || [
        {
          fonte: 'planos_capacidade',
          registro_id: input.versao_base_plano,
          confianca: 'oficial_aprovado',
        },
      ],
      qualidade_dados_declarada: input.qualidade_dados_declarada,
      is_demonstracao: false,
    }

    const created = await pb.collection('cenarios_capacidade').create<RecordModel>(payload)
    return this.buscarCenarioPorId(created.id)
  },

  async atualizarAlternativas(
    cenarioId: string,
    alternativas: AlternativaCenario[],
  ): Promise<CenarioCapacidade> {
    await pb.collection('cenarios_capacidade').update(cenarioId, {
      alternativas,
    })
    return this.buscarCenarioPorId(cenarioId)
  },

  /**
   * Adotar Cenário:
   * REGRA CRÍTICA: Adoção gera EXCLUSIVAMENTE uma PROPOSTA DE REVISÃO no fluxo de aprovação existente.
   * NUNCA autoriza contratação, movimentação nem altera o plano-base diretamente.
   */
  /**
   * Chamada ao hook de inteligência artificial com escopo de BU e degradação graciosa
   */
  async consultarIaCenarios(params: {
    cenarioId?: string
    empresaId?: string
    acao?: 'explicar_cenario' | 'sugerir_alternativas' | 'justificativa_adocao'
    nomeCenario?: string
    objetivo?: string
    premissas?: PremissasCenario
    alternativas?: AlternativaCenario[]
  }): Promise<{ sucesso: boolean; origem: string; conteudo: string; metadados?: any }> {
    try {
      const res = await pb.send<{
        sucesso: boolean
        origem: string
        conteudo: string
        metadados?: any
      }>('/backend/v1/planejamento/cenarios-ia', {
        method: 'POST',
        body: params,
      })
      return res
    } catch (err: any) {
      console.warn('[cenariosService] Falha na chamada da IA, aplicando fallback gracioso:', err)
      return {
        sucesso: true,
        origem: 'fallback_frontend',
        conteudo: `### Síntese em Modo de Segurança\n\nNão foi possível conectar ao gateway de IA no momento (${err.message || 'Erro de rede'}). As regras e cálculos determinísticos dos cenários continuam operando normalmente.\n\n- O cenário não altera o plano-base.\n- As alternativas foram calculadas sem score arbitrário.\n- Decisão sujeita à alçada de governança.`,
      }
    }
  },

  async adotarCenarioComoPropostaRevisao(
    cenarioId: string,
    justificativa: string,
  ): Promise<PropostaRevisaoPlano> {
    const cenario = await this.buscarCenarioPorId(cenarioId)
    const user = pb.authStore.record

    const timestamp = Date.now().toString().slice(-4)
    const codigo = `PROP-REV-${timestamp}`

    // Resumo dos impactos previstos a partir das alternativas
    const alternativas = cenario.alternativas || []
    const custoIncrementalTotal = alternativas.reduce(
      (acc, alt) =>
        acc +
        alt.custo_incremental_mensal * (cenario.premissas?.duracao_meses || 1) +
        alt.custo_pontual,
      0,
    )

    const proposta = await pb.collection('propostas_revisao_plano').create<RecordModel>({
      codigo,
      cenario_origem: cenario.id,
      plano_alvo: cenario.versao_base_plano,
      empresa: cenario.empresa,
      justificativa_adocao: justificativa,
      impactos_previstos: {
        cenario_codigo: cenario.codigo,
        cenario_nome: cenario.nome,
        total_alternativas_avaliadas: alternativas.length,
        custo_incremental_estimado: custoIncrementalTotal,
        duracao_meses: cenario.premissas?.duracao_meses || 1,
        aviso_governanca:
          'Proposta gerada a partir de simulação de capacidade. Requer aprovação de RH e alçada orçamentária para abertura de ciclo de revisão do plano.',
      },
      situacao: 'em_analise_rh',
      proposto_por: user?.id,
      proposto_por_nome: user?.name || user?.email || 'Usuário Atual',
      is_demonstracao: Boolean(cenario.is_demonstracao),
    })

    // Atualiza status do cenário
    await pb.collection('cenarios_capacidade').update(cenario.id, {
      situacao: 'proposta_submetida',
    })

    return {
      id: proposta.id,
      codigo: proposta.codigo,
      cenario_origem: proposta.cenario_origem,
      plano_alvo: proposta.plano_alvo,
      empresa: proposta.empresa,
      justificativa_adocao: proposta.justificativa_adocao,
      impactos_previstos: proposta.impactos_previstos,
      situacao: proposta.situacao,
      proposto_por: proposta.proposto_por,
      proposto_por_nome: proposta.proposto_por_nome,
      is_demonstracao: proposta.is_demonstracao,
      created: proposta.created,
      updated: proposta.updated,
    }
  },

  /**
   * Lista propostas de revisão vinculadas ao plano ou empresa
   */
  async listarPropostasRevisao(empresaId?: string): Promise<PropostaRevisaoPlano[]> {
    const filter = empresaId ? `empresa = '${empresaId}'` : ''
    const list = await pb.collection('propostas_revisao_plano').getFullList<RecordModel>({
      filter,
      sort: '-created',
    })
    return list.map((p) => ({
      id: p.id,
      codigo: p.codigo,
      cenario_origem: p.cenario_origem,
      plano_alvo: p.plano_alvo,
      empresa: p.empresa,
      justificativa_adocao: p.justificativa_adocao,
      impactos_previstos: p.impactos_previstos || {},
      situacao: p.situacao,
      proposto_por: p.proposto_por,
      proposto_por_nome: p.proposto_por_nome,
      decidido_por: p.decidido_por,
      data_decisao: p.data_decisao,
      parecer_decisao: p.parecer_decisao,
      is_demonstracao: p.is_demonstracao,
      created: p.created,
      updated: p.updated,
    }))
  },
}
