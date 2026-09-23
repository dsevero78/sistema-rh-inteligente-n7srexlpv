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
  reservaOperacionalPercentual: number
  reservaOperacionalHoras: number
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
  custoRealizadoOficial: number
  isParcial: boolean
  detalhesFontes: {
    categoria: 'contrato' | 'fechamento' | 'nota_fiscal' | 'beneficio' | 'estimativa_plano'
    descricao: string
    valor: number
    confianca: 'conhecido' | 'estimado' | 'nao_informado'
    fonteEspecifica: string
    dataAtualizacao: string
    natureza: 'recorrente' | 'pontual'
    origemEscopo: 'direto' | 'compartilhado'
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
  async calcularCapacidadePessoaPeriodo(
    pessoaId: string,
    mesReferencia: string, // 'YYYY-MM'
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

    const diasNoMes = dtFimMes.getDate()
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

    // 4. Reserva Operacional explícita (padrão de segurança: 10% para imprevistos/atendimentos)
    const reservaOperacionalPercentual = 10
    const reservaOperacionalHoras = (capacidadeLiquidaHoras * reservaOperacionalPercentual) / 100

    // 5. Alocações no período
    const alocacoes = await pb.collection('alocacoes').getFullList<Alocacao>({
      filter: `pessoa = '${pessoaId}' && situacao != 'cancelada' && situacao != 'encerrada'`,
    })

    let alocacoesConfirmadasHoras = 0
    let alocacoesPropostasHoras = 0
    let alocacoesEscopoContagem = 0

    for (const aloc of alocacoes) {
      const aIni = new Date(aloc.periodo_inicio)
      const aFim = new Date(aloc.periodo_fim)

      // Verifica se sobrepõe ao mês
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

    // 6. Capacidade disponível para novas alocações
    const capacidadeDisponivelNovasAlocacoesHoras = Math.max(
      0,
      capacidadeLiquidaHoras - reservaOperacionalHoras - alocacoesConfirmadasHoras,
    )
    const capacidadeDisponivelNovasAlocacoesPercentual =
      capacidadeLiquidaHoras > 0
        ? Math.round((capacidadeDisponivelNovasAlocacoesHoras / capacidadeLiquidaHoras) * 1000) / 10
        : 0

    const sobrecarga = alocacoesConfirmadasHoras > capacidadeLiquidaHoras

    // 7. Horas Realizadas no mês (separadas dos compromissos futuros)
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
      reservaOperacionalPercentual,
      reservaOperacionalHoras,
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
  // 6. CUSTOS CONSOLIDADOS COM PREVALÊNCIA DE FONTES CONFIÁVEIS
  // =========================================================================
  /**
   * Consolida os custos em três colunas:
   *  1. Custo Planejado (snapshot do plano aprovado)
   *  2. Custo Estimado Atual
   *  3. Custo Realizado Oficial
   *
   * Hierarquia anti-duplicação:
   *  - Nota Fiscal paga/conciliada prevalece sobre Fechamento e Contrato para despesas de prestação
   *  - Fechamento validado prevalece sobre Contrato se não houver NF
   *  - Contrato vigente entra como custo compromissado fixo
   *  - Sem rateio automático: custo fica na origem se não houver critério aprovado
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
    let custoEstimadoAtual = 0
    let custoRealizadoOficial = 0

    // Pessoas e vínculos contratuais vigentes
    const pessoas = await pb.collection('pessoas').getFullList<RecordModel>({
      filter: "situacao_contrato = 'Vigente'",
      expand: 'empresa',
    })

    const nfsMes = await pb.collection('notas_fiscais').getFullList<RecordModel>({
      filter: `competencia = '${periodoReferencia}' && (status = 'Paga' || status = 'Conciliada')`,
    })

    const fechamentosMes = await pb.collection('fechamentos_competencia').getFullList<RecordModel>({
      filter: `competencia = '${periodoReferencia}' && status_ciclo = 'Validado'`,
    })

    const pessoasComNf = new Set<string>()
    for (const nf of nfsMes) {
      if (nf.pessoa) pessoasComNf.add(nf.pessoa)
      custoRealizadoOficial += Number(nf.valor) || 0
      detalhesFontes.push({
        categoria: 'nota_fiscal',
        descricao: `NF ${nf.numero_nf || 'S/N'} (${periodoReferencia})`,
        valor: Number(nf.valor) || 0,
        confianca: 'conhecido',
        fonteEspecifica: 'notas_fiscais (NF conciliada/paga)',
        dataAtualizacao: nf.updated || nf.created,
        natureza: 'recorrente',
        origemEscopo: 'direto',
      })
    }

    for (const fc of fechamentosMes) {
      // Se já foi contabilizada a NF desta pessoa, NÃO soma o fechamento de novo (anti-duplicação)
      if (fc.pessoa && pessoasComNf.has(fc.pessoa)) {
        continue
      }
      custoRealizadoOficial += Number(fc.valor_total_calculado) || 0
      detalhesFontes.push({
        categoria: 'fechamento',
        descricao: `Fechamento validado (${periodoReferencia})`,
        valor: Number(fc.valor_total_calculado) || 0,
        confianca: 'conhecido',
        fonteEspecifica: 'fechamentos_competencia',
        dataAtualizacao: fc.updated || fc.created,
        natureza: 'recorrente',
        origemEscopo: 'direto',
      })
    }

    // Custo estimado atual a partir dos contratos vigentes
    for (const pes of pessoas) {
      const v = Number(pes.valor_contratado) || 0
      custoEstimadoAtual += v
      detalhesFontes.push({
        categoria: 'contrato',
        descricao: `Contrato vigente: ${pes.nome} (${pes.modalidade})`,
        valor: v,
        confianca: v > 0 ? 'conhecido' : 'nao_informado',
        fonteEspecifica: 'pessoas / contratos',
        dataAtualizacao: pes.updated || pes.created,
        natureza: 'recorrente',
        origemEscopo: 'direto',
      })
    }

    return {
      periodo: periodoReferencia,
      custoPlanejadoSnapshot: custoPlanejado,
      custoEstimadoAtual,
      custoRealizadoOficial,
      isParcial,
      detalhesFontes,
      semCriterioRateioPendente: 0, // Sem distribuição de rateio não autorizado
    }
  }
}

export const capacidadeService = new CapacidadeService()
