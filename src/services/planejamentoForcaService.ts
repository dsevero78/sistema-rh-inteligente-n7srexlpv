import pb from '@/lib/pocketbase/client'

export type SituacaoPlano =
  | 'Rascunho'
  | 'Em análise'
  | 'Devolvido para ajuste'
  | 'Aprovado'
  | 'Substituído por nova versão'
  | 'Arquivado'

export type PrioridadeDemanda = 'Alta' | 'Media' | 'Baixa' | 'Critica'
export type GrauConfirmacaoDemanda = 'confirmada' | 'provavel' | 'exploratoria'

export type CriticidadePosicao = 'Baixa' | 'Media' | 'Alta' | 'Critica'
export type ModalidadePosicao = 'Presencial' | 'Hibrido' | 'Remoto'
export type TipoPosicao = 'nova_posicao' | 'substituicao' | 'necessidade_temporaria'

export interface CompetenciaNecessariaItem {
  competencia_id: string
  competencia_codigo?: string
  competencia_nome: string
  nivel_minimo: string
}

export interface PlanoCapacidade {
  id: string
  codigo: string
  nome: string
  periodo_referencia: string
  empresa: string
  area?: string
  responsavel: string
  responsavel_nome?: string
  objetivo: string
  premissas?: string
  versao_numero: number
  rotulo_versao: string
  situacao: SituacaoPlano
  data_submissao?: string
  submetido_por?: string
  data_decisao?: string
  decidido_por?: string
  justificativa_devolucao?: string
  plano_origem_revisao?: string
  snapshot_aprovacao?: any
  hash_aprovacao?: string
  alcada_aprovacao_definida?: boolean
  created: string
  updated: string
  expand?: {
    empresa?: { id: string; nome_fantasia: string; razao_social: string; sigla: string }
    area?: { id: string; nome: string }
    responsavel?: { id: string; name: string; email: string; cargo_funcao: string }
    decidido_por?: { id: string; name: string; email: string; cargo_funcao: string }
    submetido_por?: { id: string; name: string; email: string }
  }
}

export interface DemandaPlanejada {
  id: string
  plano: string
  codigo: string
  origem: string
  problema_necessidade: string
  resultado_esperado: string
  responsavel: string
  responsavel_nome?: string
  empresa: string
  area?: string
  periodo_necessario: string
  data_necessaria: string
  prioridade: PrioridadeDemanda
  grau_confirmacao: GrauConfirmacaoDemanda
  quantidade: number
  unidade_necessidade: string
  premissas?: string
  consequencia_nao_atendimento: string
  competencias_necessarias?: CompetenciaNecessariaItem[]
  referencia_projeto_cliente?: string
  projeto_nao_vinculado_info?: boolean
  created: string
  updated: string
  expand?: {
    empresa?: { id: string; nome_fantasia: string; sigla: string }
    area?: { id: string; nome: string }
    responsavel?: { id: string; name: string; email: string }
  }
}

export interface PosicaoPlanejada {
  id: string
  plano: string
  codigo: string
  demanda?: string
  cargo: string
  empresa: string
  area?: string
  centro_custo?: string
  proposito_resultados: string
  competencias_exigidas?: CompetenciaNecessariaItem[]
  criticidade: CriticidadePosicao
  modalidade_prevista: ModalidadePosicao
  tipo: TipoPosicao
  data_inicio_prevista: string
  data_termino_prevista?: string
  justificativa: string
  // Custos preliminares
  custo_tipo?: 'recorrente' | 'pontual'
  custo_periodicidade?: 'mensal' | 'anual' | 'unico' | 'hora'
  custo_estimado?: number
  custo_informado?: boolean
  custo_periodo_incidencia?: string
  custo_fonte?: string
  custo_data_estimativa?: string
  custo_premissas?: string
  lote_identificador?: string
  lote_indice?: number
  created: string
  updated: string
  expand?: {
    cargo?: { id: string; codigo: string; nome: string }
    empresa?: { id: string; nome_fantasia: string; sigla: string }
    area?: { id: string; nome: string }
    centro_custo?: { id: string; codigo: string; nome: string }
    demanda?: DemandaPlanejada
  }
}

export interface SolicitacaoContratacaoPlano {
  id: string
  plano: string
  posicao: string
  demanda?: string
  vaga?: string
  empresa: string
  area?: string
  status: 'solicitada' | 'vaga_em_aprovacao' | 'vaga_aberta' | 'cancelada'
  solicitado_por: string
  solicitado_por_nome?: string
  data_solicitacao: string
  idempotency_key: string
  historico_rastreabilidade?: any[]
  created: string
  updated: string
  expand?: {
    vaga?: { id: string; titulo: string; status: string; status_aprovacao_gestor: string }
    posicao?: PosicaoPlanejada
  }
}

// Resumo financeiro preliminar computado
export interface ResumoCustosPlano {
  totalRecorrenteMensal: number
  totalPontual: number
  custosNaoInformadosCount: number
  custosInformadosCount: number
  isTotalParcial: boolean
}

export const planejamentoForcaService = {
  /**
   * Listar planos com base na permissão do usuário logado
   */
  async listarPlanos(empresaFiltro?: string): Promise<PlanoCapacidade[]> {
    let filter = ''
    if (empresaFiltro && empresaFiltro !== 'todas') {
      filter = `empresa = '${empresaFiltro}'`
    }

    return await pb.collection('planos_capacidade').getFullList<PlanoCapacidade>({
      filter,
      sort: '-versao_numero,-created',
      expand: 'empresa,area,responsavel,decidido_por,submetido_por',
    })
  },

  /**
   * Obter plano por ID
   */
  async obterPlano(id: string): Promise<PlanoCapacidade> {
    return await pb.collection('planos_capacidade').getOne<PlanoCapacidade>(id, {
      expand: 'empresa,area,responsavel,decidido_por,submetido_por',
    })
  },

  /**
   * Criar novo plano (inicia sempre em Rascunho, v1.0)
   */
  async criarPlano(dados: {
    codigo: string
    nome: string
    periodo_referencia: string
    empresa: string
    area?: string
    responsavel: string
    responsavel_nome?: string
    objetivo: string
    premissas?: string
    alcada_aprovacao_definida?: boolean
  }): Promise<PlanoCapacidade> {
    return await pb.collection('planos_capacidade').create<PlanoCapacidade>({
      ...dados,
      versao_numero: 1,
      rotulo_versao: 'v1.0',
      situacao: 'Rascunho',
      alcada_aprovacao_definida: Boolean(dados.alcada_aprovacao_definida),
    })
  },

  /**
   * Editar plano (somente quando Rascunho ou Devolvido para ajuste)
   */
  async atualizarPlano(
    id: string,
    dados: Partial<{
      nome: string
      periodo_referencia: string
      area: string
      objetivo: string
      premissas: string
      alcada_aprovacao_definida: boolean
    }>,
  ): Promise<PlanoCapacidade> {
    const plano = await pb.collection('planos_capacidade').getOne<PlanoCapacidade>(id)
    if (plano.situacao !== 'Rascunho' && plano.situacao !== 'Devolvido para ajuste') {
      throw new Error('Planos em análise ou aprovados não podem ser editados.')
    }
    return await pb.collection('planos_capacidade').update<PlanoCapacidade>(id, dados)
  },

  /**
   * Submeter plano para análise (congelamento)
   */
  async submeterPlano(id: string, userId: string): Promise<PlanoCapacidade> {
    const plano = await pb.collection('planos_capacidade').getOne<PlanoCapacidade>(id)
    if (plano.situacao !== 'Rascunho' && plano.situacao !== 'Devolvido para ajuste') {
      throw new Error('Apenas planos em Rascunho ou Devolvidos podem ser submetidos.')
    }

    // Servidor carimba data e submetido_por
    return await pb.collection('planos_capacidade').update<PlanoCapacidade>(id, {
      situacao: 'Em análise',
      data_submissao: new Date().toISOString(),
      submetido_por: userId,
      justificativa_devolucao: '',
    })
  },

  /**
   * Devolver plano com justificativa obrigatória
   */
  async devolverPlano(id: string, userId: string, justificativa: string): Promise<PlanoCapacidade> {
    if (!justificativa || !justificativa.trim()) {
      throw new Error('A justificativa de devolução é obrigatória.')
    }

    const plano = await pb.collection('planos_capacidade').getOne<PlanoCapacidade>(id)
    if (plano.situacao !== 'Em análise') {
      throw new Error('Apenas planos com situação "Em análise" podem ser devolvidos.')
    }

    return await pb.collection('planos_capacidade').update<PlanoCapacidade>(id, {
      situacao: 'Devolvido para ajuste',
      justificativa_devolucao: justificativa.trim(),
      decidido_por: userId,
      data_decisao: new Date().toISOString(),
    })
  },

  /**
   * Aprovar plano:
   *  - Bloqueado se a alçada não estiver definida
   *  - Gera SNAPSHOT imutável dos dados e referências
   *  - Congela plano e itens
   */
  async aprovarPlano(
    id: string,
    userId: string,
    permitirAprovacaoTesteHomologacao = false,
  ): Promise<PlanoCapacidade> {
    const plano = await pb.collection('planos_capacidade').getOne<PlanoCapacidade>(id, {
      expand: 'empresa,area,responsavel',
    })

    if (plano.situacao !== 'Em análise') {
      throw new Error('Apenas planos "Em análise" podem ser aprovados.')
    }

    // Validação estrita da regra de alçada (briefing item 7)
    if (!plano.alcada_aprovacao_definida && !permitirAprovacaoTesteHomologacao) {
      throw new Error(
        'Aprovação bloqueada: a alçada executiva deste plano ainda não foi formalizada pela governança corporativa.',
      )
    }

    // Buscar demandas e posições do plano para compor o snapshot
    const demandas = await pb.collection('demandas_planejadas').getFullList<DemandaPlanejada>({
      filter: `plano = '${id}'`,
      sort: 'codigo',
    })

    const posicoes = await pb.collection('posicoes_planejadas').getFullList<PosicaoPlanejada>({
      filter: `plano = '${id}'`,
      sort: 'codigo',
      expand: 'cargo,centro_custo',
    })

    // Resumo de custos
    const resumo = this.calcularResumoCustos(posicoes)

    // Snapshot histórico com NOMES de referência corporativa congelados
    const snapshot = {
      plano_id: plano.id,
      codigo: plano.codigo,
      nome: plano.nome,
      versao_numero: plano.versao_numero,
      rotulo_versao: plano.rotulo_versao,
      periodo_referencia: plano.periodo_referencia,
      data_aprovacao_oficial: new Date().toISOString(),
      aprovador_id: userId,
      empresa: {
        id: plano.empresa,
        nome: plano.expand?.empresa?.nome_fantasia || '',
        sigla: plano.expand?.empresa?.sigla || '',
      },
      area: {
        id: plano.area || '',
        nome: plano.expand?.area?.nome || '',
      },
      responsavel: {
        id: plano.responsavel,
        nome: plano.expand?.responsavel?.name || plano.responsavel_nome || '',
      },
      demandas: demandas.map((d) => ({
        id: d.id,
        codigo: d.codigo,
        origem: d.origem,
        problema: d.problema_necessidade,
        resultado: d.resultado_esperado,
        prioridade: d.prioridade,
        grau_confirmacao: d.grau_confirmacao,
        quantidade: d.quantidade,
        unidade: d.unidade_necessidade,
        consequencia_nao_atendimento: d.consequencia_nao_atendimento,
        competencias_necessarias: d.competencias_necessarias || [],
      })),
      posicoes: posicoes.map((p) => ({
        id: p.id,
        codigo: p.codigo,
        demanda_id: p.demanda,
        cargo_id: p.cargo,
        cargo_nome: p.expand?.cargo?.nome || '',
        cargo_codigo: p.expand?.cargo?.codigo || '',
        centro_custo_codigo: p.expand?.centro_custo?.codigo || '',
        tipo: p.tipo,
        criticidade: p.criticidade,
        modalidade: p.modalidade_prevista,
        data_inicio: p.data_inicio_prevista,
        data_termino: p.data_termino_prevista,
        custo_tipo: p.custo_tipo,
        custo_periodicidade: p.custo_periodicidade,
        custo_estimado: p.custo_estimado,
        custo_informado: p.custo_informado,
        custo_fonte: p.custo_fonte,
      })),
      resumo_financeiro: {
        total_recorrente_mensal: resumo.totalRecorrenteMensal,
        total_pontual: resumo.totalPontual,
        is_parcial: resumo.isTotalParcial,
        posicoes_informadas: resumo.custosInformadosCount,
        posicoes_nao_informadas: resumo.custosNaoInformadosCount,
      },
    }

    // Carimbo server-side
    const hash = `HASH_APROV_${plano.codigo}_V${plano.versao_numero}_${Date.now()}`

    return await pb.collection('planos_capacidade').update<PlanoCapacidade>(id, {
      situacao: 'Aprovado',
      decidido_por: userId,
      data_decisao: new Date().toISOString(),
      snapshot_aprovacao: snapshot,
      hash_aprovacao: hash,
    })
  },

  /**
   * Iniciar nova revisão a partir de versão aprovada:
   * Cria uma nova versão (ex: v2.0) em Rascunho.
   * A versão aprovada anterior PERMANECE 'Aprovada' até que a nova seja formalmente aprovada.
   */
  async iniciarNovaRevisao(planoAprovadoId: string, userId: string): Promise<PlanoCapacidade> {
    const planoOrigem = await pb
      .collection('planos_capacidade')
      .getOne<PlanoCapacidade>(planoAprovadoId)

    if (planoOrigem.situacao !== 'Aprovado') {
      throw new Error('Apenas planos com status "Aprovado" podem gerar nova revisão.')
    }

    const novaVersaoNum = planoOrigem.versao_numero + 1
    const novoRotulo = `v${novaVersaoNum}.0`

    // Criar nova versão como Rascunho
    const novoPlano = await pb.collection('planos_capacidade').create<PlanoCapacidade>({
      codigo: planoOrigem.codigo,
      nome: planoOrigem.nome,
      periodo_referencia: planoOrigem.periodo_referencia,
      empresa: planoOrigem.empresa,
      area: planoOrigem.area,
      responsavel: userId,
      responsavel_nome: pb.authStore.record?.name || 'Gestor',
      objetivo: planoOrigem.objetivo,
      premissas: planoOrigem.premissas,
      versao_numero: novaVersaoNum,
      rotulo_versao: novoRotulo,
      situacao: 'Rascunho',
      plano_origem_revisao: planoOrigem.id,
      alcada_aprovacao_definida: false,
    })

    // Clonar demandas para a nova versão
    const demandasOrigem = await pb
      .collection('demandas_planejadas')
      .getFullList<DemandaPlanejada>({
        filter: `plano = '${planoOrigem.id}'`,
      })

    const mapaDemandasNovas: Record<string, string> = {}

    for (const d of demandasOrigem) {
      const novaDem = await pb.collection('demandas_planejadas').create<DemandaPlanejada>({
        plano: novoPlano.id,
        codigo: d.codigo,
        origem: d.origem,
        problema_necessidade: d.problema_necessidade,
        resultado_esperado: d.resultado_esperado,
        responsavel: userId,
        responsavel_nome: pb.authStore.record?.name || '',
        empresa: d.empresa,
        area: d.area,
        periodo_necessario: d.periodo_necessario,
        data_necessaria: d.data_necessaria,
        prioridade: d.prioridade,
        grau_confirmacao: d.grau_confirmacao,
        quantidade: d.quantidade,
        unidade_necessidade: d.unidade_necessidade,
        premissas: d.premissas,
        consequencia_nao_atendimento: d.consequencia_nao_atendimento,
        competencias_necessarias: d.competencias_necessarias,
        referencia_projeto_cliente: d.referencia_projeto_cliente,
        projeto_nao_vinculado_info: d.projeto_nao_vinculado_info,
      })
      mapaDemandasNovas[d.id] = novaDem.id
    }

    // Clonar posições para a nova versão
    const posicoesOrigem = await pb
      .collection('posicoes_planejadas')
      .getFullList<PosicaoPlanejada>({
        filter: `plano = '${planoOrigem.id}'`,
      })

    for (const p of posicoesOrigem) {
      await pb.collection('posicoes_planejadas').create<PosicaoPlanejada>({
        plano: novoPlano.id,
        codigo: p.codigo,
        demanda: p.demanda ? mapaDemandasNovas[p.demanda] || null : null,
        cargo: p.cargo,
        empresa: p.empresa,
        area: p.area,
        centro_custo: p.centro_custo,
        proposito_resultados: p.proposito_resultados,
        competencias_exigidas: p.competencias_exigidas,
        criticidade: p.criticidade,
        modalidade_prevista: p.modalidade_prevista,
        tipo: p.tipo,
        data_inicio_prevista: p.data_inicio_prevista,
        data_termino_prevista: p.data_termino_prevista,
        justificativa: p.justificativa,
        custo_tipo: p.custo_tipo,
        custo_periodicidade: p.custo_periodicidade,
        custo_estimado: p.custo_estimado,
        custo_informado: p.custo_informado,
        custo_periodo_incidencia: p.custo_periodo_incidencia,
        custo_fonte: p.custo_fonte,
        custo_data_estimativa: p.custo_data_estimativa,
        custo_premissas: p.custo_premissas,
        lote_identificador: p.lote_identificador,
        lote_indice: p.lote_indice,
      })
    }

    return novoPlano
  },

  /**
   * Conclui a aprovação de uma nova revisão e substitui a versão anterior
   */
  async aprovarRevisaoESubstituirAnterior(
    novoPlanoId: string,
    userId: string,
    permitirTeste = false,
  ): Promise<PlanoCapacidade> {
    const novoPlano = await this.aprovarPlano(novoPlanoId, userId, permitirTeste)

    // Se possui versão de origem, agora sim marca a versão anterior como 'Substituído por nova versão'
    if (novoPlano.plano_origem_revisao) {
      try {
        await pb.collection('planos_capacidade').update(novoPlano.plano_origem_revisao, {
          situacao: 'Substituído por nova versão',
        })
      } catch (err) {
        console.warn('Falha ao atualizar plano anterior para substituído:', err)
      }
    }

    return novoPlano
  },

  // =========================================================================
  // DEMANDAS
  // =========================================================================
  async listarDemandas(planoId: string): Promise<DemandaPlanejada[]> {
    return await pb.collection('demandas_planejadas').getFullList<DemandaPlanejada>({
      filter: `plano = '${planoId}'`,
      sort: 'codigo',
      expand: 'empresa,area,responsavel',
    })
  },

  async criarDemanda(
    dados: Omit<DemandaPlanejada, 'id' | 'created' | 'updated'>,
  ): Promise<DemandaPlanejada> {
    const plano = await pb.collection('planos_capacidade').getOne<PlanoCapacidade>(dados.plano)
    if (plano.situacao === 'Aprovado' || plano.situacao === 'Substituído por nova versão') {
      throw new Error('Não é permitido adicionar demandas a um plano aprovado.')
    }
    return await pb.collection('demandas_planejadas').create<DemandaPlanejada>(dados)
  },

  async atualizarDemanda(id: string, dados: Partial<DemandaPlanejada>): Promise<DemandaPlanejada> {
    return await pb.collection('demandas_planejadas').update<DemandaPlanejada>(id, dados)
  },

  async excluirDemanda(id: string): Promise<boolean> {
    await pb.collection('demandas_planejadas').delete(id)
    return true
  },

  // =========================================================================
  // POSIÇÕES
  // =========================================================================
  async listarPosicoes(planoId: string): Promise<PosicaoPlanejada[]> {
    return await pb.collection('posicoes_planejadas').getFullList<PosicaoPlanejada>({
      filter: `plano = '${planoId}'`,
      sort: 'codigo',
      expand: 'cargo,empresa,area,centro_custo,demanda',
    })
  },

  async criarPosicao(
    dados: Omit<PosicaoPlanejada, 'id' | 'created' | 'updated'>,
  ): Promise<PosicaoPlanejada> {
    const plano = await pb.collection('planos_capacidade').getOne<PlanoCapacidade>(dados.plano)
    if (plano.situacao === 'Aprovado' || plano.situacao === 'Substituído por nova versão') {
      throw new Error('Não é permitido adicionar posições a um plano aprovado.')
    }
    return await pb.collection('posicoes_planejadas').create<PosicaoPlanejada>(dados)
  },

  /**
   * Criação de lote de posições com identificadores individuais
   */
  async criarPosicoesEmLote(
    dadosBase: Omit<PosicaoPlanejada, 'id' | 'codigo' | 'created' | 'updated'>,
    quantidade: number,
    prefixoCodigo: string,
  ): Promise<PosicaoPlanejada[]> {
    const plano = await pb.collection('planos_capacidade').getOne<PlanoCapacidade>(dadosBase.plano)
    if (plano.situacao === 'Aprovado' || plano.situacao === 'Substituído por nova versão') {
      throw new Error('Não é permitido adicionar posições a um plano aprovado.')
    }

    const loteId = `LOTE_${Date.now()}`
    const posicoesCriadas: PosicaoPlanejada[] = []

    for (let i = 1; i <= quantidade; i++) {
      const codigoUnico = `${prefixoCodigo}-${String(i).padStart(3, '0')}`
      const pos = await pb.collection('posicoes_planejadas').create<PosicaoPlanejada>({
        ...dadosBase,
        codigo: codigoUnico,
        lote_identificador: loteId,
        lote_indice: i,
      })
      posicoesCriadas.push(pos)
    }

    return posicoesCriadas
  },

  async atualizarPosicao(id: string, dados: Partial<PosicaoPlanejada>): Promise<PosicaoPlanejada> {
    return await pb.collection('posicoes_planejadas').update<PosicaoPlanejada>(id, dados)
  },

  async excluirPosicao(id: string): Promise<boolean> {
    await pb.collection('posicoes_planejadas').delete(id)
    return true
  },

  // =========================================================================
  // INTEGRAÇÃO COM VAGAS (Solicitação de Contratação a partir de Posição Aprovada)
  // =========================================================================
  async listarSolicitacoesPlano(planoId: string): Promise<SolicitacaoContratacaoPlano[]> {
    return await pb
      .collection('solicitacoes_contratacao_plano')
      .getFullList<SolicitacaoContratacaoPlano>({
        filter: `plano = '${planoId}'`,
        sort: '-data_solicitacao',
        expand: 'vaga,posicao',
      })
  },

  /**
   * Gerar solicitação de contratação (Vaga) a partir de uma posição aprovada
   * - Preserva vínculo com plano, versão, demanda e posição
   * - Previne duplicidade via chave de idempotência
   * - Mantém aprovação independente no fluxo de vagas existente
   * - NÃO marca a posição como preenchida
   */
  async gerarSolicitacaoContratacao(dados: {
    planoId: string
    posicaoId: string
    userId: string
    userName: string
  }): Promise<{ solicitacao: SolicitacaoContratacaoPlano; vagaId: string }> {
    const plano = await pb.collection('planos_capacidade').getOne<PlanoCapacidade>(dados.planoId)
    if (plano.situacao !== 'Aprovado') {
      throw new Error(
        'Solicitações de contratação só podem ser geradas a partir de planos aprovados.',
      )
    }

    const posicao = await pb
      .collection('posicoes_planejadas')
      .getOne<PosicaoPlanejada>(dados.posicaoId, { expand: 'cargo,empresa,area' })

    // Chave de idempotência para evitar requisições repetidas/cliques duplos
    const idempotencyKey = `IDEMP_POS_${posicao.id}_PLANO_${plano.id}`

    // Checar se já existe solicitação ativa para esta posição
    try {
      const existing = await pb
        .collection('solicitacoes_contratacao_plano')
        .getFirstListItem<SolicitacaoContratacaoPlano>(`idempotency_key = '${idempotencyKey}'`)
      if (existing && existing.status !== 'cancelada') {
        throw new Error(
          `Já existe uma solicitação de contratação em andamento para a posição ${posicao.codigo}.`,
        )
      }
    } catch (e: any) {
      if (e.message && e.message.includes('Já existe uma solicitação')) {
        throw e
      }
    }

    // 1. Criar vaga no fluxo existente com status inicial pendente de aprovação de contratação
    const cargoNome = posicao.expand?.cargo?.nome || 'Posição Planejada'
    const novaVaga = await pb.collection('vagas').create({
      titulo: cargoNome,
      departamento: posicao.expand?.area?.nome || 'Geral',
      localizacao: posicao.modalidade_prevista === 'Remoto' ? 'Remoto Brasil' : 'Sede Regional',
      modalidade:
        posicao.modalidade_prevista === 'Remoto'
          ? 'Remoto'
          : posicao.modalidade_prevista === 'Hibrido'
            ? 'Híbrido'
            : 'Presencial',
      faixa_salarial: posicao.custo_estimado
        ? `R$ ${posicao.custo_estimado.toLocaleString('pt-BR')}`
        : 'A combinar',
      descricao: `Posição planejada originada do Plano de Força de Trabalho ${plano.codigo} (${plano.nome}).\n\nPropósito: ${posicao.proposito_resultados}\nJustificativa: ${posicao.justificativa}`,
      requisitos_obrigatorios: [
        'Experiência compatível com a posição',
        'Alinhamento com a cultura SouYess',
      ],
      requisitos_desejaveis: [],
      habilidades_tecnicas: posicao.competencias_exigidas?.map((c) => c.competencia_nome) || [],
      competencias_comportamentais: ['Comunicação', 'Trabalho em equipe'],
      status: 'Ativa',
      // Mantém aprovação PRÓPRIA da contratação
      status_aprovacao_gestor: 'Aguardando aprovação',
      gestor_responsavel: dados.userId,
      cargo_catalogo: posicao.cargo,
      orcamento_mensal: posicao.custo_estimado || 0,
    })

    // 2. Criar registro de rastreabilidade de solicitação
    const solicitacao = await pb
      .collection('solicitacoes_contratacao_plano')
      .create<SolicitacaoContratacaoPlano>({
        plano: plano.id,
        posicao: posicao.id,
        demanda: posicao.demanda || null,
        vaga: novaVaga.id,
        empresa: posicao.empresa,
        area: posicao.area || null,
        status: 'solicitada',
        solicitado_por: dados.userId,
        solicitado_por_nome: dados.userName,
        data_solicitacao: new Date().toISOString(),
        idempotency_key: idempotencyKey,
        historico_rastreabilidade: [
          {
            data: new Date().toISOString(),
            autor: dados.userName,
            acao: 'Solicitação gerada',
            detalhe: `Vaga ${novaVaga.id} criada e encaminhada para o fluxo próprio de aprovação.`,
          },
        ],
      })

    return { solicitacao, vagaId: novaVaga.id }
  },

  // =========================================================================
  // CÁLCULOS E CUSTOS PRELIMINARES
  // =========================================================================
  calcularResumoCustos(posicoes: PosicaoPlanejada[]): ResumoCustosPlano {
    let totalRecorrenteMensal = 0
    let totalPontual = 0
    let custosNaoInformadosCount = 0
    let custosInformadosCount = 0

    for (const pos of posicoes) {
      if (
        pos.custo_informado &&
        typeof pos.custo_estimado === 'number' &&
        !isNaN(pos.custo_estimado)
      ) {
        custosInformadosCount++
        if (pos.custo_tipo === 'recorrente') {
          if (pos.custo_periodicidade === 'anual') {
            totalRecorrenteMensal += pos.custo_estimado / 12
          } else {
            totalRecorrenteMensal += pos.custo_estimado
          }
        } else if (pos.custo_tipo === 'pontual') {
          totalPontual += pos.custo_estimado
        }
      } else {
        custosNaoInformadosCount++
      }
    }

    return {
      totalRecorrenteMensal,
      totalPontual,
      custosNaoInformadosCount,
      custosInformadosCount,
      isTotalParcial: custosNaoInformadosCount > 0,
    }
  },
}
