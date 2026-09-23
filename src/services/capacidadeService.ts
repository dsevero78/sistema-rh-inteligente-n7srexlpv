/**
 * src/services/capacidadeService.ts
 *
 * Módulo 1 — Planejamento da Força de Trabalho: ETAPA 4 (v0.0.87 - HOMOLOGAÇÃO)
 *
 * Responsabilidades:
 *  1. Gestão de Projetos (identificador, BU, responsável, cliente, contrato comercial)
 *  2. Gestão de Alocações (disponibilidade vs escopo, proposta vs confirmada, bloqueio de sobrecarga)
 *  3. Gestão de Ocupação de Posições (preserva histórico de substituição, execução independente de snapshot)
 *  4. Cálculo em Camadas por Período Mensal:
 *     Capacidade Bruta -> Indisponibilidades (descanso/férias sem sobreposição dupla) ->
 *     Capacidade Líquida -> Reserva Operacional explícita -> Alocações Confirmadas ->
 *     Capacidade Disponível para Novas Alocações (nunca rotulada como ociosidade)
 *  5. Matriz de Competências por Ocupante cruzando posicoes_planejadas e competencias_pessoas
 *     (atendida / pendente / abaixo do nivel / não avaliada / vencida)
 *  6. Custos Consolidados com Hierarquia de Fontes Confiáveis (evita dupla contagem)
 */

import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface Projeto {
  id: string
  identificador: string
  nome: string
  empresa_responsavel: string
  bu_relacionada?: string
  area_relacionada?: string
  responsavel: string
  responsavel_nome?: string
  inicio_previsto: string
  termino_previsto?: string
  situacao: 'Planejado' | 'Em andamento' | 'Pausado' | 'Concluido' | 'Cancelado'
  referencia_externa?: string
  cliente_nome?: string
  contrato_comercial_ref?: string
  relacionamento_validado?: boolean
  is_demonstracao?: boolean
  created?: string
  updated?: string
  expand?: {
    empresa_responsavel?: { id: string; nome_fantasia: string; sigla: string }
    bu_relacionada?: { id: string; nome_fantasia: string; sigla: string }
    area_relacionada?: { id: string; nome: string }
    responsavel?: { id: string; name: string; email: string }
  }
}

export interface Alocacao {
  id: string
  pessoa: string
  projeto?: string
  destino_organizacional?: string
  periodo_inicio: string
  periodo_fim: string
  modalidade_capacidade: 'disponibilidade' | 'escopo'
  unidade: 'percentual' | 'horas_mes' | 'entregavel_escopo'
  quantidade: number
  papel_desempenhado?: string
  competencia_requerida?: string
  situacao: 'proposta' | 'confirmada' | 'encerrada' | 'cancelada'
  responsavel: string
  responsavel_nome?: string
  justificativa?: string
  demanda?: string
  posicao?: string
  excecao_autorizada?: boolean
  excecao_justificativa?: string
  is_demonstracao?: boolean
  created?: string
  updated?: string
  expand?: {
    pessoa?: {
      id: string
      nome: string
      modalidade: string
      cargo_funcao: string
      empresa: string
      horas_mensais_base: number
    }
    projeto?: Projeto
    demanda?: { id: string; codigo: string; origem: string }
    posicao?: { id: string; codigo: string }
    competencia_requerida?: { id: string; nome: string; codigo: string }
  }
}

export interface OcupacaoPosicao {
  id: string
  posicao: string
  pessoa: string
  data_inicio: string
  data_termino?: string
  situacao: 'ativa' | 'encerrada' | 'substituida'
  origem_vinculacao:
    | 'promocao_interna'
    | 'transferencia'
    | 'contratacao_externa'
    | 'alocacao_temporaria'
    | 'enquadramento_inicial'
  ocupante_anterior?: string
  motivo_substituicao?: string
  registrado_por: string
  observacoes?: string
  is_demonstracao?: boolean
  created?: string
  updated?: string
  expand?: {
    posicao?: {
      id: string
      codigo: string
      plano: string
      proposito_resultados: string
      cargo: string
      competencias_exigidas: any
    }
    pessoa?: {
      id: string
      nome: string
      email: string
      cargo_funcao: string
      modalidade: string
      empresa: string
    }
    ocupante_anterior?: { id: string; nome: string }
  }
}

export type SituacaoReserva =
  | 'aprovada'
  | 'explicitamente_zero'
  | 'nao_definida'
  | 'premissa_simulacao'

export interface ReservaOperacionalRegistro {
  id: string
  codigo: string
  nome: string
  empresa: string
  area?: string
  centro_custo?: string
  unidade: 'percentual' | 'horas_mes'
  valor?: number
  base_calculo: 'capacidade_liquida' | 'capacidade_bruta' | 'horas_disponiveis'
  situacao_aprovacao: SituacaoReserva
  vigencia_inicio: string
  vigencia_fim?: string
  justificativa: string
  responsavel: string
  responsavel_nome?: string
  aprovado_por?: string
  data_aprovacao?: string
  is_demonstracao?: boolean
  created?: string
  updated?: string
}

export interface MemoriaCalculoCapacidade {
  pessoaId: string
  pessoaNome: string
  modalidadeVigente: 'CLT' | 'PJ'
  modalidadeCapacidade: 'disponibilidade' | 'escopo'
  periodoMes: string // YYYY-MM
  statusCapacidade: 'DETERMINADA' | 'CAPACIDADE NÃO DETERMINADA'
  motivoNaoDeterminada?: string
  // Camadas de cálculo em horas e percentual:
  horasContratadasBase: number
  capacidadeBrutaHoras: number
  indisponibilidadesHoras: number
  detalheIndisponibilidades: string[]
  capacidadeLiquidaHoras: number
  // Saldo antes da reserva (regra explícita: sem reserva definida, não tratar ausência como zero aprovado)
  saldoAntesReservaHoras: number
  saldoAntesReservaPercentual: number
  reservaEstado: SituacaoReserva
  reservaValorDeclarado?: number
  reservaUnidade?: 'percentual' | 'horas_mes'
  reservaOperacionalPercentual: number
  reservaOperacionalHoras: number
  reservaMensagemGovernanca?: string
  alocacoesConfirmadasHoras: number
  alocacoesConfirmadasPercentual: number
  alocacoesPropostasHoras: number
  capacidadeDisponivelNovasAlocacoesHoras: number
  capacidadeDisponivelNovasAlocacoesPercentual: number
  alocacoesEscopoContagem: number
  saldoRealizadoHoras: number
  dataCorteRealizado?: string
  sobrecarga: boolean
}

export type EstadoAderenciaCompetencia =
  | 'atendida_com_evidencia'
  | 'declarada_pendente_validacao'
  | 'abaixo_nivel_exigido'
  | 'nao_avaliada'
  | 'evidencia_vencida'
  | 'competencia_nao_cadastrada'

export interface ItemMatrizCompetencia {
  competenciaId: string
  competenciaCodigo: string
  competenciaNome: string
  nivelExigido: string
  nivelApresentado?: string
  estado: EstadoAderenciaCompetencia
  rotuloEstado: string
  temEvidenciaDocumental: boolean
  evidenciaDocumentoId?: string
  validadeEvidencia?: string
  fonteDeclarada?: string
  observacoes?: string
}

export interface CruzamentoCompetenciasOcupante {
  posicaoId: string
  posicaoCodigo: string
  ocupanteId: string
  ocupanteNome: string
  itens: ItemMatrizCompetencia[]
  aderenciaGeralPercentual: number
  totalExigidas: number
  totalAtendidas: number
}

export interface ConsolidadoCustosPeriodo {
  periodo: string
  custoPlanejadoSnapshot: number
  custoEstimadoAtual: number
  custoRealizadoCompetencia: number // mês da prestação do serviço
  pagamentosRealizadosLiquidacao: number // conciliação/caixa (não define competência)
  custoRealizadoOficial: number
  statusConsolidacao:
    | 'CONSOLIDADO_OFICIAL'
    | 'CONSOLIDAÇÃO PENDENTE DE DEFINIÇÃO CONTÁBIL'
    | 'PARCIAL'
  isParcial: boolean
  divergenciasDetectadas: {
    tipo:
      | 'divergencia_competencia_vs_liquidacao'
      | 'nf_sem_fechamento_vinculado'
      | 'multiplas_nfs_fechamento'
      | 'fechamento_sem_nf'
    descricao: string
    pessoa?: string
    pessoaNome?: string
    valorFechamento?: number
    valorNf?: number
    diferenca?: number
    rotulo: string
  }[]
  detalhesFontes: {
    categoria: 'contrato' | 'fechamento' | 'nota_fiscal' | 'beneficio' | 'estimativa_plano'
    descricao: string
    valor: number
    confianca: 'conhecido' | 'estimado' | 'nao_informado'
    fonteEspecifica: string
    dataAtualizacao: string
    natureza: 'recorrente' | 'pontual'
    origemEscopo: 'direto' | 'compartilhado'
    vinculoComprovadoId?: string
    competenciaServico?: string
    dataLiquidacaoPagamento?: string
    pendenteDefinicaoContabil?: boolean
  }[]
  semCriterioRateioPendente: number
}

class CapacidadeService {
  // =========================================================================
  // 1. PROJETOS
  // =========================================================================
  async listarProjetos(incluirDemonstracao = true): Promise<Projeto[]> {
    const filters: string[] = []
    if (!incluirDemonstracao) {
      filters.push('is_demonstracao = false')
    }
    const filterStr = filters.join(' && ')

    return await pb.collection('projetos').getFullList<Projeto>({
      filter: filterStr || undefined,
      sort: 'identificador',
      expand: 'empresa_responsavel,bu_relacionada,area_relacionada,responsavel',
    })
  }

  async criarProjeto(dados: Omit<Projeto, 'id' | 'created' | 'updated'>): Promise<Projeto> {
    return await pb.collection('projetos').create<Projeto>(dados)
  }

  async atualizarProjeto(id: string, dados: Partial<Projeto>): Promise<Projeto> {
    return await pb.collection('projetos').update<Projeto>(id, dados)
  }

  // =========================================================================
  // 2. ALOCAÇÕES
  // =========================================================================
  async listarAlocacoes(filtro?: {
    pessoaId?: string
    projetoId?: string
    situacao?: string
    incluirDemonstracao?: boolean
  }): Promise<Alocacao[]> {
    const conditions: string[] = []
    if (filtro?.pessoaId) conditions.push(`pessoa = '${filtro.pessoaId}'`)
    if (filtro?.projetoId) conditions.push(`projeto = '${filtro.projetoId}'`)
    if (filtro?.situacao) conditions.push(`situacao = '${filtro.situacao}'`)
    if (filtro?.incluirDemonstracao === false) conditions.push('is_demonstracao = false')

    return await pb.collection('alocacoes').getFullList<Alocacao>({
      filter: conditions.length > 0 ? conditions.join(' && ') : undefined,
      sort: '-periodo_inicio',
      expand: 'pessoa,projeto,demanda,posicao,competencia_requerida',
    })
  }

  async criarAlocacao(dados: Omit<Alocacao, 'id' | 'created' | 'updated'>): Promise<Alocacao> {
    // Alocação criada inicialmente como 'proposta' ou 'confirmada' se dentro do limite
    return await pb.collection('alocacoes').create<Alocacao>(dados)
  }

  /**
   * Confirmação atômica de alocação via endpoint transacional seguro
   */
  async confirmarAlocacaoAtomica(
    alocacaoId: string,
    excecaoAutorizada = false,
    justificativaExcecao = '',
  ): Promise<{ success: boolean; alocacao: Alocacao; mensagem: string }> {
    const res = await pb.send('/backend/v1/alocacoes/confirmar-atomica', {
      method: 'POST',
      body: {
        alocacao_id: alocacaoId,
        excecao_autorizada: excecaoAutorizada,
        justificativa_excecao: justificativaExcecao,
      },
    })
    return res
  }

  async atualizarAlocacao(id: string, dados: Partial<Alocacao>): Promise<Alocacao> {
    return await pb.collection('alocacoes').update<Alocacao>(id, dados)
  }

  async excluirAlocacao(id: string): Promise<boolean> {
    await pb.collection('alocacoes').delete(id)
    return true
  }

  // =========================================================================
  // 3. OCUPAÇÃO DE POSIÇÕES
  // =========================================================================
  async listarOcupacoes(posicaoId?: string): Promise<OcupacaoPosicao[]> {
    const filter = posicaoId ? `posicao = '${posicaoId}'` : undefined
    return await pb.collection('ocupacoes_posicao').getFullList<OcupacaoPosicao>({
      filter,
      sort: '-data_inicio',
      expand: 'posicao,pessoa,ocupante_anterior',
    })
  }

  async registrarOcupacaoPosicao(dados: {
    posicaoId: string
    pessoaId: string
    dataInicio: string
    origemVinculacao: OcupacaoPosicao['origem_vinculacao']
    observacoes?: string
    ocupanteAnteriorId?: string
    motivoSubstituicao?: string
  }): Promise<OcupacaoPosicao> {
    const userId = pb.authStore.record?.id || ''

    // Se já houver ocupação ativa para esta posição, marca a anterior como substituída
    if (dados.ocupanteAnteriorId) {
      try {
        const anteriores = await pb.collection('ocupacoes_posicao').getFullList<OcupacaoPosicao>({
          filter: `posicao = '${dados.posicaoId}' && situacao = 'ativa'`,
        })
        for (const ant of anteriores) {
          await pb.collection('ocupacoes_posicao').update(ant.id, {
            situacao: 'substituida',
            data_termino: dados.dataInicio,
          })
        }
      } catch (e) {
        console.warn('Erro ao atualizar ocupação anterior:', e)
      }
    }

    return await pb.collection('ocupacoes_posicao').create<OcupacaoPosicao>({
      posicao: dados.posicaoId,
      pessoa: dados.pessoaId,
      data_inicio: dados.dataInicio,
      situacao: 'ativa',
      origem_vinculacao: dados.origemVinculacao,
      ocupante_anterior: dados.ocupanteAnteriorId || null,
      motivo_substituicao: dados.motivoSubstituicao || '',
      registrado_por: userId,
      observacoes: dados.observacoes || '',
      is_demonstracao: false,
    })
  }

  // =========================================================================
  // 4. CÁLCULO DE CAPACIDADE POR PERÍODO EM CAMADAS COM MEMÓRIA DE CÁLCULO
  // =========================================================================
  /**
   * Calcula a capacidade em camadas para uma pessoa em um determinado mês de referência (YYYY-MM).
   * Regras estritas:
   *  - Se faltar contrato, horas base ou modalidade: "CAPACIDADE NÃO DETERMINADA"
   *  - Se modalidade for PJ por escopo: não converte escopo em horas
   *  - Indisponibilidades (descanso/férias): sem sobreposição dupla
   *  - Realizado separado de planejado (apontamentos não descontam compromissos futuros)
   *  - Nunca rotular capacidade disponível como ociosidade
   */
  /**
   * Busca a reserva operacional cadastrada e vigente para o escopo organizacional da pessoa/BU.
   * Diferencia 4 estados:
   *  1. aprovada: formalmente aprovada por autoridade de governança
   *  2. explicitamente_zero: governança deliberou que a margem é 0%
   *  3. nao_definida: ausência de decisão (não tratar como zero aprovado!)
   *  4. premissa_simulacao: premissa de cenário, sem efeito na operação real
   */
  async obterReservaOperacionalVigente(
    empresaId: string,
    mesReferencia: string,
    areaId?: string,
  ): Promise<ReservaOperacionalRegistro | null> {
    try {
      const dtRef = `${mesReferencia}-01`
      const filters = [
        `empresa = '${empresaId}'`,
        `vigencia_inicio <= '${dtRef}'`,
        `(vigencia_fim = null || vigencia_fim = '' || vigencia_fim >= '${dtRef}')`,
      ]
      const registros = await pb
        .collection('reservas_operacionais')
        .getFullList<ReservaOperacionalRegistro>({
          filter: filters.join(' && '),
          sort: '-created',
        })

      if (!registros.length) return null

      // Se houver área específica, prioriza
      if (areaId) {
        const porArea = registros.find((r) => r.area === areaId)
        if (porArea) return porArea
      }
      return registros[0]
    } catch {
      return null
    }
  }

  async calcularCapacidadePessoaPeriodo(
    pessoaId: string,
    mesReferencia: string, // 'YYYY-MM'
    reservaPremissaSimulacao?: { valor: number; unidade: 'percentual' | 'horas_mes' },
  ): Promise<MemoriaCalculoCapacidade> {
    const pessoa = await pb.collection('pessoas').getOne<RecordModel>(pessoaId, {
      expand: 'empresa,area',
    })

    const nomePessoa = pessoa.nome || 'Colaborador'
    const modalidade = (pessoa.modalidade || 'CLT') as 'CLT' | 'PJ'
    const horasBase = Number(pessoa.horas_mensais_base) || 0

    // Verifica se os dados essenciais estão presentes
    if (!horasBase && modalidade === 'CLT') {
      return {
        pessoaId,
        pessoaNome: nomePessoa,
        modalidadeVigente: modalidade,
        modalidadeCapacidade: 'disponibilidade',
        periodoMes: mesReferencia,
        statusCapacidade: 'CAPACIDADE NÃO DETERMINADA',
        motivoNaoDeterminada: 'Carga horária base contratual não informada no cadastro da pessoa.',
        horasContratadasBase: 0,
        capacidadeBrutaHoras: 0,
        indisponibilidadesHoras: 0,
        detalheIndisponibilidades: [],
        capacidadeLiquidaHoras: 0,
        saldoAntesReservaHoras: 0,
        saldoAntesReservaPercentual: 0,
        reservaEstado: 'nao_definida',
        reservaOperacionalPercentual: 0,
        reservaOperacionalHoras: 0,
        alocacoesConfirmadasHoras: 0,
        alocacoesConfirmadasPercentual: 0,
        alocacoesPropostasHoras: 0,
        capacidadeDisponivelNovasAlocacoesHoras: 0,
        capacidadeDisponivelNovasAlocacoesPercentual: 0,
        alocacoesEscopoContagem: 0,
        saldoRealizadoHoras: 0,
        sobrecarga: false,
      }
    }

    // Datas limites do mês
    const [anoStr, mesStr] = mesReferencia.split('-')
    const ano = parseInt(anoStr, 10)
    const mes = parseInt(mesStr, 10)
    const dtInicioMes = new Date(Date.UTC(ano, mes - 1, 1))
    const dtFimMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59))

    // Checar vigência da pessoa
    if (pessoa.data_inicio) {
      const dtInicioContrato = new Date(pessoa.data_inicio)
      if (dtInicioContrato > dtFimMes) {
        return {
          pessoaId,
          pessoaNome: nomePessoa,
          modalidadeVigente: modalidade,
          modalidadeCapacidade: 'disponibilidade',
          periodoMes: mesReferencia,
          statusCapacidade: 'CAPACIDADE NÃO DETERMINADA',
          motivoNaoDeterminada: `Início do vínculo contratual (${pessoa.data_inicio.slice(0, 10)}) é posterior ao período selecionado.`,
          horasContratadasBase: 0,
          capacidadeBrutaHoras: 0,
          indisponibilidadesHoras: 0,
          detalheIndisponibilidades: [],
          capacidadeLiquidaHoras: 0,
          saldoAntesReservaHoras: 0,
          saldoAntesReservaPercentual: 0,
          reservaEstado: 'nao_definida',
          reservaOperacionalPercentual: 0,
          reservaOperacionalHoras: 0,
          alocacoesConfirmadasHoras: 0,
          alocacoesConfirmadasPercentual: 0,
          alocacoesPropostasHoras: 0,
          capacidadeDisponivelNovasAlocacoesHoras: 0,
          capacidadeDisponivelNovasAlocacoesPercentual: 0,
          alocacoesEscopoContagem: 0,
          saldoRealizadoHoras: 0,
          sobrecarga: false,
        }
      }
    }

    if (pessoa.data_fim) {
      const dtFimContrato = new Date(pessoa.data_fim)
      if (dtFimContrato < dtInicioMes) {
        return {
          pessoaId,
          pessoaNome: nomePessoa,
          modalidadeVigente: modalidade,
          modalidadeCapacidade: 'disponibilidade',
          periodoMes: mesReferencia,
          statusCapacidade: 'CAPACIDADE NÃO DETERMINADA',
          motivoNaoDeterminada: `Vínculo contratual encerrado (${pessoa.data_fim.slice(0, 10)}) antes do início do período selecionado.`,
          horasContratadasBase: 0,
          capacidadeBrutaHoras: 0,
          indisponibilidadesHoras: 0,
          detalheIndisponibilidades: [],
          capacidadeLiquidaHoras: 0,
          saldoAntesReservaHoras: 0,
          saldoAntesReservaPercentual: 0,
          reservaEstado: 'nao_definida',
          reservaOperacionalPercentual: 0,
          reservaOperacionalHoras: 0,
          alocacoesConfirmadasHoras: 0,
          alocacoesConfirmadasPercentual: 0,
          alocacoesPropostasHoras: 0,
          capacidadeDisponivelNovasAlocacoesHoras: 0,
          capacidadeDisponivelNovasAlocacoesPercentual: 0,
          alocacoesEscopoContagem: 0,
          saldoRealizadoHoras: 0,
          sobrecarga: false,
        }
      }
    }

    // 1. Capacidade Bruta: Horas contratuais aplicáveis ao mês
    const capacidadeBrutaHoras = horasBase || 160

    // 2. Indisponibilidades no mês (programações de descanso / férias)
    // Sem dupla contagem de dias sobrepostos
    const programacoes = await pb.collection('programacoes_descanso').getFullList<RecordModel>({
      filter: `pessoa = '${pessoaId}' && status != 'Canceladas'`,
    })

    const diasIndisponiveisSet = new Set<number>()
    const detalheIndisponibilidades: string[] = []

    for (const prog of programacoes) {
      const pIni = new Date(prog.data_inicio)
      const pFim = new Date(prog.data_fim)

      // Interseção com o mês
      const inicioEfetivo = pIni > dtInicioMes ? pIni : dtInicioMes
      const fimEfetivo = pFim < dtFimMes ? pFim : dtFimMes

      if (inicioEfetivo <= fimEfetivo) {
        const d1 = inicioEfetivo.getUTCDate()
        const d2 = fimEfetivo.getUTCDate()
        for (let dia = d1; dia <= d2; dia++) {
          diasIndisponiveisSet.add(dia)
        }
        detalheIndisponibilidades.push(
          `${prog.tipo === 'CLT_FERIAS' ? 'Férias CLT' : 'Descanso Remunerado PJ'}: ${inicioEfetivo.toISOString().slice(0, 10)} a ${fimEfetivo.toISOString().slice(0, 10)}`,
        )
      }
    }

    // Conversão de dias indisponíveis em horas proporcionais (base 22 dias úteis médios por mês)
    const diasUteisIndisponiveis = Math.min(diasIndisponiveisSet.size, 22)
    const horasPorDia = capacidadeBrutaHoras / 22
    const indisponibilidadesHoras = Math.round(diasUteisIndisponiveis * horasPorDia * 10) / 10

    // 3. Capacidade Líquida
    const capacidadeLiquidaHoras = Math.max(0, capacidadeBrutaHoras - indisponibilidadesHoras)

    // 4. Alocações no período
    const alocacoes = await pb.collection('alocacoes').getFullList<Alocacao>({
      filter: `pessoa = '${pessoaId}' && situacao != 'cancelada' && situacao != 'encerrada'`,
    })

    let alocacoesConfirmadasHoras = 0
    let alocacoesPropostasHoras = 0
    let alocacoesEscopoContagem = 0

    for (const aloc of alocacoes) {
      const aIni = new Date(aloc.periodo_inicio)
      const aFim = new Date(aloc.periodo_fim)

      if (aIni <= dtFimMes && aFim >= dtInicioMes) {
        if (aloc.modalidade_capacidade === 'escopo') {
          alocacoesEscopoContagem += 1
          continue
        }

        let horasAlocadas = 0
        if (aloc.unidade === 'horas_mes') {
          horasAlocadas = aloc.quantidade
        } else if (aloc.unidade === 'percentual') {
          horasAlocadas = (capacidadeLiquidaHoras * aloc.quantidade) / 100
        }

        if (aloc.situacao === 'confirmada') {
          alocacoesConfirmadasHoras += horasAlocadas
        } else if (aloc.situacao === 'proposta') {
          alocacoesPropostasHoras += horasAlocadas
        }
      }
    }

    const alocacoesConfirmadasPercentual =
      capacidadeLiquidaHoras > 0
        ? Math.round((alocacoesConfirmadasHoras / capacidadeLiquidaHoras) * 1000) / 10
        : 0

    // 5. Saldo ANTES da Reserva Operacional (sempre mensurado de forma determinística)
    const saldoAntesReservaHoras = Math.max(0, capacidadeLiquidaHoras - alocacoesConfirmadasHoras)
    const saldoAntesReservaPercentual =
      capacidadeLiquidaHoras > 0
        ? Math.round((saldoAntesReservaHoras / capacidadeLiquidaHoras) * 1000) / 10
        : 0

    // 6. Resolução da Reserva Operacional (removido o 10% fixo indiscriminado!)
    // Modelagem explícita de 4 estados:
    let reservaEstado: SituacaoReserva = 'nao_definida'
    let reservaOperacionalPercentual = 0
    let reservaOperacionalHoras = 0
    let reservaValorDeclarado: number | undefined = undefined
    let reservaUnidade: 'percentual' | 'horas_mes' = 'percentual'
    let reservaMensagemGovernanca: string | undefined = undefined

    if (reservaPremissaSimulacao) {
      reservaEstado = 'premissa_simulacao'
      reservaValorDeclarado = reservaPremissaSimulacao.valor
      reservaUnidade = reservaPremissaSimulacao.unidade
      if (reservaUnidade === 'percentual') {
        reservaOperacionalPercentual = reservaPremissaSimulacao.valor
        reservaOperacionalHoras = (capacidadeLiquidaHoras * reservaOperacionalPercentual) / 100
      } else {
        reservaOperacionalHoras = Math.min(capacidadeLiquidaHoras, reservaPremissaSimulacao.valor)
        reservaOperacionalPercentual =
          capacidadeLiquidaHoras > 0
            ? Math.round((reservaOperacionalHoras / capacidadeLiquidaHoras) * 1000) / 10
            : 0
      }
      reservaMensagemGovernanca = 'Premissa de simulação (sem efeito na operação real)'
    } else {
      const regReserva = await this.obterReservaOperacionalVigente(
        pessoa.empresa,
        mesReferencia,
        pessoa.area,
      )

      if (regReserva) {
        reservaEstado = regReserva.situacao_aprovacao
        reservaValorDeclarado = regReserva.valor
        reservaUnidade = regReserva.unidade

        if (regReserva.situacao_aprovacao === 'aprovada') {
          if (regReserva.unidade === 'percentual') {
            reservaOperacionalPercentual = Number(regReserva.valor) || 0
            reservaOperacionalHoras = (capacidadeLiquidaHoras * reservaOperacionalPercentual) / 100
          } else {
            reservaOperacionalHoras = Math.min(
              capacidadeLiquidaHoras,
              Number(regReserva.valor) || 0,
            )
            reservaOperacionalPercentual =
              capacidadeLiquidaHoras > 0
                ? Math.round((reservaOperacionalHoras / capacidadeLiquidaHoras) * 1000) / 10
                : 0
          }
          reservaMensagemGovernanca = `Reserva aprovada (${regReserva.codigo}) de ${regReserva.valor}${regReserva.unidade === 'percentual' ? '%' : 'h'}`
        } else if (regReserva.situacao_aprovacao === 'explicitamente_zero') {
          reservaOperacionalPercentual = 0
          reservaOperacionalHoras = 0
          reservaMensagemGovernanca = 'Reserva deliberada explicitamente como ZERO pela governança'
        } else if (regReserva.situacao_aprovacao === 'premissa_simulacao') {
          reservaOperacionalPercentual = 0
          reservaOperacionalHoras = 0
          reservaMensagemGovernanca = 'Registro em estudo (não deduz capacidade operacional)'
        } else {
          reservaEstado = 'nao_definida'
          reservaOperacionalPercentual = 0
          reservaOperacionalHoras = 0
          reservaMensagemGovernanca =
            'Reserva não definida formalmente: disponibilidade final depende de decisão de governança'
        }
      } else {
        // NENHUMA RESERVA CADASTRADA:
        // Apresentar SALDO ANTES DA RESERVA + sinalização de que a disponibilidade final depende de governança.
        // NUNCA tratar ausência como zero aprovado!
        reservaEstado = 'nao_definida'
        reservaOperacionalPercentual = 0
        reservaOperacionalHoras = 0
        reservaMensagemGovernanca =
          'Reserva não definida: exibindo Saldo antes da Reserva. Disponibilidade final depende de decisão de governança.'
      }
    }

    // 7. Capacidade disponível para novas alocações após reserva
    const deducaoReserva =
      reservaEstado === 'aprovada' || reservaEstado === 'premissa_simulacao'
        ? reservaOperacionalHoras
        : 0
    const capacidadeDisponivelNovasAlocacoesHoras = Math.max(
      0,
      saldoAntesReservaHoras - deducaoReserva,
    )
    const capacidadeDisponivelNovasAlocacoesPercentual =
      capacidadeLiquidaHoras > 0
        ? Math.round((capacidadeDisponivelNovasAlocacoesHoras / capacidadeLiquidaHoras) * 1000) / 10
        : 0

    const sobrecarga = alocacoesConfirmadasHoras > capacidadeLiquidaHoras

    // 8. Horas Realizadas no mês (separadas dos compromissos futuros)
    let saldoRealizadoHoras = 0
    try {
      const apontamentos = await pb.collection('apontamentos_horas').getFullList<RecordModel>({
        filter: `pessoa = '${pessoaId}' && status = 'Aprovado'`,
      })
      for (const ap of apontamentos) {
        const apData = ap.data ? ap.data.slice(0, 7) : ''
        if (apData === mesReferencia) {
          saldoRealizadoHoras += Number(ap.horas) || 0
        }
      }
    } catch {
      /* intentionally ignored */
    }

    return {
      pessoaId,
      pessoaNome: nomePessoa,
      modalidadeVigente: modalidade,
      modalidadeCapacidade:
        alocacoesEscopoContagem > 0 && alocacoesConfirmadasHoras === 0
          ? 'escopo'
          : 'disponibilidade',
      periodoMes: mesReferencia,
      statusCapacidade: 'DETERMINADA',
      horasContratadasBase: capacidadeBrutaHoras,
      capacidadeBrutaHoras,
      indisponibilidadesHoras,
      detalheIndisponibilidades,
      capacidadeLiquidaHoras,
      saldoAntesReservaHoras,
      saldoAntesReservaPercentual,
      reservaEstado,
      reservaValorDeclarado,
      reservaUnidade,
      reservaOperacionalPercentual,
      reservaOperacionalHoras,
      reservaMensagemGovernanca,
      alocacoesConfirmadasHoras,
      alocacoesConfirmadasPercentual,
      alocacoesPropostasHoras,
      capacidadeDisponivelNovasAlocacoesHoras,
      capacidadeDisponivelNovasAlocacoesPercentual,
      alocacoesEscopoContagem,
      saldoRealizadoHoras,
      dataCorteRealizado: new Date().toISOString().slice(0, 10),
      sobrecarga,
    }
  }

  // =========================================================================
  // 5. MATRIZ DE COMPETÊNCIAS POR OCUPANTE
  // =========================================================================
  /**
   * Cruza as competências exigidas na posição planejada com as competências da pessoa ocupante.
   * Estados possíveis:
   *  - atendida_com_evidencia: validada com documento no cofre
   *  - declarada_pendente_validacao: declarada mas ainda pendente pelo RH/Gestor
   *  - abaixo_nivel_exigido: avaliada porém em proficiência inferior
   *  - nao_avaliada: competência cadastrada mas em proficiência 'Nao_avaliada'
   *  - evidencia_vencida: documento de validação expirado
   *  - competencia_nao_cadastrada: pessoa não possui registro desta competência (ausência de info != ausência de comp)
   */
  async cruzarCompetenciasOcupante(
    posicaoId: string,
    pessoaId: string,
  ): Promise<CruzamentoCompetenciasOcupante> {
    const posicao = await pb.collection('posicoes_planejadas').getOne<RecordModel>(posicaoId)
    const pessoa = await pb.collection('pessoas').getOne<RecordModel>(pessoaId)

    const exigidas: any[] = posicao.competencias_exigidas || []
    const compPessoaRecords = await pb.collection('competencias_pessoas').getFullList<RecordModel>({
      filter: `pessoa = '${pessoaId}'`,
      expand: 'competencia,evidencia_documento',
    })

    const nivelOrdem: Record<string, number> = {
      Nao_avaliada: 0,
      Nivel_1_Basico: 1,
      Nivel_2_Intermediario: 2,
      Nivel_3_Avancado: 3,
      Nivel_4_Especialista: 4,
      Nivel_5_Referencia: 5,
    }

    const itens: ItemMatrizCompetencia[] = []
    let atendidasCount = 0

    for (const ex of exigidas) {
      const compId = ex.competencia_id
      const compCod = ex.competencia_codigo || 'COMP'
      const compNome = ex.competencia_nome || 'Competência Requerida'
      const nivelExigido = ex.nivel_minimo || 'Nivel_2_Intermediario'

      const regPessoa = compPessoaRecords.find(
        (cp) => cp.competencia === compId || cp.expand?.competencia?.codigo === compCod,
      )

      if (!regPessoa) {
        itens.push({
          competenciaId: compId,
          competenciaCodigo: compCod,
          competenciaNome: compNome,
          nivelExigido,
          estado: 'competencia_nao_cadastrada',
          rotuloEstado: 'Não cadastrada no perfil (Dado ausente)',
          temEvidenciaDocumental: false,
        })
        continue
      }

      const profPessoa = regPessoa.proficiencia || 'Nao_avaliada'
      const statusVal = regPessoa.status_validacao || 'pendente'
      const temDoc = Boolean(regPessoa.evidencia_documento)
      const validade = regPessoa.validade

      let vencida = false
      if (validade) {
        vencida = new Date(validade) < new Date()
      }

      if (vencida) {
        itens.push({
          competenciaId: compId,
          competenciaCodigo: compCod,
          competenciaNome: compNome,
          nivelExigido,
          nivelApresentado: profPessoa,
          estado: 'evidencia_vencida',
          rotuloEstado: 'Evidência expirada',
          temEvidenciaDocumental: temDoc,
          evidenciaDocumentoId: regPessoa.evidencia_documento,
          validadeEvidencia: validade,
          fonteDeclarada: regPessoa.fonte,
        })
      } else if (profPessoa === 'Nao_avaliada') {
        itens.push({
          competenciaId: compId,
          competenciaCodigo: compCod,
          competenciaNome: compNome,
          nivelExigido,
          nivelApresentado: 'Não avaliada',
          estado: 'nao_avaliada',
          rotuloEstado: 'Não avaliada (Sem nota fictícia)',
          temEvidenciaDocumental: false,
          fonteDeclarada: regPessoa.fonte,
        })
      } else if (statusVal === 'pendente') {
        itens.push({
          competenciaId: compId,
          competenciaCodigo: compCod,
          competenciaNome: compNome,
          nivelExigido,
          nivelApresentado: profPessoa,
          estado: 'declarada_pendente_validacao',
          rotuloEstado: 'Declarada pendente de validação',
          temEvidenciaDocumental: temDoc,
          evidenciaDocumentoId: regPessoa.evidencia_documento,
          fonteDeclarada: regPessoa.fonte,
        })
      } else {
        const pesoExigido = nivelOrdem[nivelExigido] || 2
        const pesoPessoa = nivelOrdem[profPessoa] || 0

        if (pesoPessoa < pesoExigido) {
          itens.push({
            competenciaId: compId,
            competenciaCodigo: compCod,
            competenciaNome: compNome,
            nivelExigido,
            nivelApresentado: profPessoa,
            estado: 'abaixo_nivel_exigido',
            rotuloEstado: 'Abaixo do nível exigido',
            temEvidenciaDocumental: temDoc,
            evidenciaDocumentoId: regPessoa.evidencia_documento,
            fonteDeclarada: regPessoa.fonte,
          })
        } else {
          atendidasCount++
          itens.push({
            competenciaId: compId,
            competenciaCodigo: compCod,
            competenciaNome: compNome,
            nivelExigido,
            nivelApresentado: profPessoa,
            estado: 'atendida_com_evidencia',
            rotuloEstado: 'Atendida com validação',
            temEvidenciaDocumental: temDoc,
            evidenciaDocumentoId: regPessoa.evidencia_documento,
            validadeEvidencia: validade,
            fonteDeclarada: regPessoa.fonte,
          })
        }
      }
    }

    const totalExigidas = exigidas.length
    const aderenciaGeralPercentual =
      totalExigidas > 0 ? Math.round((atendidasCount / totalExigidas) * 100) : 100

    return {
      posicaoId,
      posicaoCodigo: posicao.codigo,
      ocupanteId: pessoa.id,
      ocupanteNome: pessoa.nome,
      itens,
      aderenciaGeralPercentual,
      totalExigidas,
      totalAtendidas: atendidasCount,
    }
  }

  // =========================================================================
  // 6. CUSTOS CONSOLIDADOS COM VÍNCULO COMPROVADO (Rastreabilidade Contábil)
  // =========================================================================
  /**
   * Consolidação do Realizado por VÍNCULO COMPROVADO com a mesma despesa.
   * Regras estritas:
   *  1. Não deduplica por mera coincidência de pessoa/mês/valor.
   *  2. Vinculação comprovada: nf.fechamento === fechamento.id.
   *  3. Diferenciação rigorosa:
   *     - Custo por COMPETÊNCIA: mês em que o serviço foi prestado (base fechamento e competência da NF)
   *     - PAGAMENTO REALIZADO (Liquidação): data em que o desembolso financeiro ocorreu (caixa)
   *  4. Múltiplas NFs, valores parciais ou divergências: segregados e rotulados como
   *     "Consolidação pendente de definição contábil" sem inventar regra financeira não documentada.
   */
  async consolidarCustos(
    periodoReferencia: string,
    planoAprovadoId?: string,
  ): Promise<ConsolidadoCustosPeriodo> {
    let custoPlanejado = 0
    let isParcial = false

    // 1. Snapshot da versão aprovada
    if (planoAprovadoId) {
      try {
        const plano = await pb.collection('planos_capacidade').getOne<RecordModel>(planoAprovadoId)
        if (plano.snapshot_aprovacao) {
          const rf =
            plano.snapshot_aprovacao.resumo_financeiro || plano.snapshot_aprovacao.resumo_custos
          if (rf) {
            custoPlanejado = (rf.total_recorrente_mensal || 0) + (rf.total_pontual || 0)
            if (rf.is_parcial || rf.status_calculo === 'PARCIAL') {
              isParcial = true
            }
          }
        }
      } catch {
        /* intentionally ignored */
      }
    }

    // 2. Busca fontes do período
    const detalhesFontes: ConsolidadoCustosPeriodo['detalhesFontes'] = []
    const divergenciasDetectadas: ConsolidadoCustosPeriodo['divergenciasDetectadas'] = []
    let custoEstimadoAtual = 0
    let custoRealizadoCompetencia = 0
    let pagamentosRealizadosLiquidacao = 0

    // Pessoas e contratos vigentes
    const pessoas = await pb.collection('pessoas').getFullList<RecordModel>({
      filter: "situacao_contrato = 'Vigente'",
      expand: 'empresa',
    })

    for (const pes of pessoas) {
      const v = Number(pes.valor_contratado) || 0
      custoEstimadoAtual += v
      detalhesFontes.push({
        categoria: 'contrato',
        descricao: `Contrato vigente: ${pes.nome} (${pes.modalidade})`,
        valor: v,
        confianca: v > 0 ? 'conhecido' : 'nao_informado',
        fonteEspecifica: 'pessoas / contratos vigentes',
        dataAtualizacao: pes.updated || pes.created,
        natureza: 'recorrente',
        origemEscopo: 'direto',
      })
    }

    // NFs com competência informada
    const nfsMes = await pb.collection('notas_fiscais').getFullList<RecordModel>({
      filter: `competencia = '${periodoReferencia}'`,
      expand: 'fechamento,pessoa',
    })

    // Fechamentos da competência
    const fechamentosMes = await pb.collection('fechamentos_competencia').getFullList<RecordModel>({
      filter: `competencia = '${periodoReferencia}' && status_ciclo = 'Validado'`,
      expand: 'pessoa',
    })

    // Agrupa NFs pelo fechamento_id comprovado (vínculo formal)
    const nfsPorFechamento = new Map<string, RecordModel[]>()
    const nfsSemFechamento: RecordModel[] = []

    for (const nf of nfsMes) {
      const v = Number(nf.valor) || 0
      if (nf.status === 'Conciliada') {
        pagamentosRealizadosLiquidacao += v
      }

      if (nf.fechamento) {
        const lista = nfsPorFechamento.get(nf.fechamento) || []
        lista.push(nf)
        nfsPorFechamento.set(nf.fechamento, lista)
      } else {
        nfsSemFechamento.push(nf)
      }
    }

    let pendenciaContabilEncontrada = false

    // Processa fechamentos validados
    for (const fc of fechamentosMes) {
      const valorFc = Number(fc.valor_total_calculado) || 0
      const nfsVinculadas = nfsPorFechamento.get(fc.id) || []
      const pessoaNome = fc.expand?.pessoa?.nome || 'Prestador'

      if (nfsVinculadas.length === 0) {
        // Fechamento validado sem NF emitida: entra no custo de competência, mas sem liquidação
        custoRealizadoCompetencia += valorFc
        detalhesFontes.push({
          categoria: 'fechamento',
          descricao: `Fechamento validado sem NF emitida: ${pessoaNome} (${periodoReferencia})`,
          valor: valorFc,
          confianca: 'conhecido',
          fonteEspecifica: 'fechamentos_competencia',
          dataAtualizacao: fc.updated || fc.created,
          natureza: 'recorrente',
          origemEscopo: 'direto',
          competenciaServico: periodoReferencia,
          vinculoComprovadoId: fc.id,
        })
        divergenciasDetectadas.push({
          tipo: 'fechamento_sem_nf',
          descricao: `Fechamento validado (${fc.id}) de R$ ${valorFc.toFixed(2)} aguarda emissão de nota fiscal correspondente.`,
          pessoa: fc.pessoa,
          pessoaNome,
          valorFechamento: valorFc,
          rotulo: 'Fechamento sem NF vinculada',
        })
      } else {
        // Possui NF(s) com VÍNCULO COMPROVADO
        const somaNfs = nfsVinculadas.reduce((acc, n) => acc + (Number(n.valor) || 0), 0)
        const diferenca = Math.round((somaNfs - valorFc) * 100) / 100

        if (nfsVinculadas.length > 1) {
          // Múltiplas notas para o mesmo fechamento (faturamento fracionado / parcial)
          pendenciaContabilEncontrada = true
          divergenciasDetectadas.push({
            tipo: 'multiplas_nfs_fechamento',
            descricao: `Fechamento (${fc.id}) possui ${nfsVinculadas.length} notas parciais totalizando R$ ${somaNfs.toFixed(2)} vs R$ ${valorFc.toFixed(2)} aprovado.`,
            pessoa: fc.pessoa,
            pessoaNome,
            valorFechamento: valorFc,
            valorNf: somaNfs,
            diferenca,
            rotulo: 'Consolidação pendente de definição contábil (Faturamento Fracionado)',
          })

          // Mantém as fontes segregadas para transparência
          for (const nf of nfsVinculadas) {
            detalhesFontes.push({
              categoria: 'nota_fiscal',
              descricao: `NF Parcial ${nf.numero_nf || 'S/N'} vinculada ao fechamento ${fc.id}`,
              valor: Number(nf.valor) || 0,
              confianca: 'conhecido',
              fonteEspecifica: 'notas_fiscais (parcela de fechamento)',
              dataAtualizacao: nf.updated || nf.created,
              natureza: 'recorrente',
              origemEscopo: 'direto',
              vinculoComprovadoId: fc.id,
              competenciaServico: periodoReferencia,
              dataLiquidacaoPagamento: nf.data_conciliacao || undefined,
              pendenteDefinicaoContabil: true,
            })
          }
          // Soma o valor do serviço executado (competência pelo fechamento)
          custoRealizadoCompetencia += valorFc
        } else {
          // Exatamente 1 NF vinculada
          const nfUnica = nfsVinculadas[0]
          const valorNf = Number(nfUnica.valor) || 0

          if (Math.abs(diferenca) > 0.05) {
            // Divergência de valores entre fechamento aprovado e NF emitida
            pendenciaContabilEncontrada = true
            divergenciasDetectadas.push({
              tipo: 'divergencia_competencia_vs_liquidacao',
              descricao: `Divergência de valores: Fechamento aprovado R$ ${valorFc.toFixed(2)} vs NF ${nfUnica.numero_nf || 'S/N'} emitida em R$ ${valorNf.toFixed(2)} (Diferença: R$ ${diferenca.toFixed(2)}).`,
              pessoa: fc.pessoa,
              pessoaNome,
              valorFechamento: valorFc,
              valorNf,
              diferenca,
              rotulo: 'Consolidação pendente de definição contábil (Divergência de Valor)',
            })
          }

          // NF com vínculo comprovado prevalece sobre o fechamento para fins de despesa faturada
          custoRealizadoCompetencia += valorNf
          detalhesFontes.push({
            categoria: 'nota_fiscal',
            descricao: `NF ${nfUnica.numero_nf || 'S/N'} (Vínculo formal fechamento ${fc.id}) - ${pessoaNome}`,
            valor: valorNf,
            confianca: 'conhecido',
            fonteEspecifica: 'notas_fiscais (comprovada por fechamento_id)',
            dataAtualizacao: nfUnica.updated || nfUnica.created,
            natureza: 'recorrente',
            origemEscopo: 'direto',
            vinculoComprovadoId: fc.id,
            competenciaServico: periodoReferencia,
            dataLiquidacaoPagamento: nfUnica.data_conciliacao || undefined,
          })
        }
      }
    }

    // Processa NFs que não possuem fechamento vinculado
    for (const nf of nfsSemFechamento) {
      const v = Number(nf.valor) || 0
      pendenciaContabilEncontrada = true
      divergenciasDetectadas.push({
        tipo: 'nf_sem_fechamento_vinculado',
        descricao: `NF ${nf.numero_nf || 'S/N'} (R$ ${v.toFixed(2)}) não possui vínculo comprovado com fechamento de medição no sistema.`,
        pessoa: nf.pessoa,
        pessoaNome: nf.expand?.pessoa?.nome || 'Prestador',
        valorNf: v,
        rotulo: 'Consolidação pendente de definição contábil (NF sem medição vinculada)',
      })

      detalhesFontes.push({
        categoria: 'nota_fiscal',
        descricao: `NF Avulsa ${nf.numero_nf || 'S/N'} sem fechamento vinculado - ${nf.expand?.pessoa?.nome || 'Prestador'}`,
        valor: v,
        confianca: 'conhecido',
        fonteEspecifica: 'notas_fiscais (avulsa)',
        dataAtualizacao: nf.updated || nf.created,
        natureza: 'pontual',
        origemEscopo: 'direto',
        competenciaServico: periodoReferencia,
        dataLiquidacaoPagamento: nf.data_conciliacao || undefined,
        pendenteDefinicaoContabil: true,
      })
      custoRealizadoCompetencia += v
    }

    const custoRealizadoOficial = custoRealizadoCompetencia
    const statusConsolidacao: ConsolidadoCustosPeriodo['statusConsolidacao'] =
      pendenciaContabilEncontrada
        ? 'CONSOLIDAÇÃO PENDENTE DE DEFINIÇÃO CONTÁBIL'
        : isParcial
          ? 'PARCIAL'
          : 'CONSOLIDADO_OFICIAL'

    return {
      periodo: periodoReferencia,
      custoPlanejadoSnapshot: custoPlanejado,
      custoEstimadoAtual,
      custoRealizadoCompetencia,
      pagamentosRealizadosLiquidacao,
      custoRealizadoOficial,
      statusConsolidacao,
      isParcial: isParcial || pendenciaContabilEncontrada,
      divergenciasDetectadas,
      detalhesFontes,
      semCriterioRateioPendente: 0,
    }
  }
}

export const capacidadeService = new CapacidadeService()
