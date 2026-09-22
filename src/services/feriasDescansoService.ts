import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export type TipoProgramacaoDescanso = 'CLT_FERIAS' | 'PJ_DESCANSO'
export type StatusProgramacaoDescanso = 'Programadas' | 'Em Gozo' | 'Concluidas' | 'Canceladas'

export interface ProgramacaoDescanso {
  id: string
  pessoa: string
  vinculo_origem_id?: string
  tipo: TipoProgramacaoDescanso
  data_inicio: string
  data_fim: string
  dias: number
  status: StatusProgramacaoDescanso
  valor_periodo: number
  valor_base_mensal?: number
  adicional_terco_constitucional?: number
  periodo_aquisitivo_inicio?: string
  periodo_aquisitivo_fim?: string
  periodo_concessivo_limite?: string
  dias_saldo_remanescente?: number
  observacao?: string
  created?: string
  updated?: string
}

export interface SalvarProgramacaoDescansoInput {
  pessoa: string
  vinculo_origem_id?: string
  tipo: TipoProgramacaoDescanso
  data_inicio: string
  data_fim: string
  dias: number
  status: StatusProgramacaoDescanso
  valor_periodo: number
  valor_base_mensal?: number
  adicional_terco_constitucional?: number
  periodo_aquisitivo_inicio?: string
  periodo_aquisitivo_fim?: string
  periodo_concessivo_limite?: string
  dias_saldo_remanescente?: number
  observacao?: string
}

/**
 * Funções matemáticas de cálculo de férias e descanso
 */
export function calcularValorFeriasClt(
  salarioMensal: number,
  dias: number,
): {
  valorProporcional: number
  tercoConstitucional: number
  valorTotal: number
} {
  const salario = Number(salarioMensal) || 0
  const totalDias = Math.max(1, Math.min(30, Number(dias) || 0))
  // (salário mensal / 30) * dias + 1/3 constitucional
  const valorProporcional = Number(((salario / 30) * totalDias).toFixed(2))
  const tercoConstitucional = Number((valorProporcional / 3).toFixed(2))
  const valorTotal = Number((valorProporcional + tercoConstitucional).toFixed(2))

  return {
    valorProporcional,
    tercoConstitucional,
    valorTotal,
  }
}

export function calcularValorDescansoPj(
  valorMensalContrato: number,
  dias: number,
): {
  valorSugerido: number
} {
  const valorContrato = Number(valorMensalContrato) || 0
  const totalDias = Math.max(1, Math.min(30, Number(dias) || 0))
  // Se 30 dias -> valor mensal integral. Se fracionado -> proporcional: (valorContrato / 30) * dias
  const valorSugerido =
    totalDias === 30 ? valorContrato : Number(((valorContrato / 30) * totalDias).toFixed(2))

  return {
    valorSugerido,
  }
}

/**
 * Calcula quantidade de dias entre duas datas (inclusive)
 */
export function calcularDiasEntreDatas(dataInicio: string, dataFim: string): number {
  if (!dataInicio || !dataFim) return 0
  const d1 = new Date(dataInicio)
  const d2 = new Date(dataFim)
  d1.setHours(0, 0, 0, 0)
  d2.setHours(0, 0, 0, 0)
  const diffTime = d2.getTime() - d1.getTime()
  if (diffTime < 0) return 0
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  return Math.min(30, diffDays)
}

export const feriasDescansoService = {
  async listarPorPessoa(
    pessoaId: string,
    tipo?: TipoProgramacaoDescanso,
  ): Promise<ProgramacaoDescanso[]> {
    try {
      let filter = `pessoa = '${pessoaId}'`
      if (tipo) {
        filter += ` && tipo = '${tipo}'`
      }
      const records = await pb.collection('programacoes_descanso').getFullList<RecordModel>({
        filter,
        sort: '-data_inicio',
      })
      return records.map((r) => ({
        id: r.id,
        pessoa: r.pessoa,
        vinculo_origem_id: r.vinculo_origem_id,
        tipo: r.tipo as TipoProgramacaoDescanso,
        data_inicio: r.data_inicio,
        data_fim: r.data_fim,
        dias: Number(r.dias || 0),
        status: r.status as StatusProgramacaoDescanso,
        valor_periodo: Number(r.valor_periodo || 0),
        valor_base_mensal: Number(r.valor_base_mensal || 0),
        adicional_terco_constitucional: Number(r.adicional_terco_constitucional || 0),
        periodo_aquisitivo_inicio: r.periodo_aquisitivo_inicio,
        periodo_aquisitivo_fim: r.periodo_aquisitivo_fim,
        periodo_concessivo_limite: r.periodo_concessivo_limite,
        dias_saldo_remanescente: Number(r.dias_saldo_remanescente || 0),
        observacao: r.observacao || '',
        created: r.created,
        updated: r.updated,
      }))
    } catch (err) {
      console.warn('[feriasDescansoService] Erro ao listar programações:', err)
      return []
    }
  },

  async listarTodos(): Promise<ProgramacaoDescanso[]> {
    try {
      const records = await pb.collection('programacoes_descanso').getFullList<RecordModel>({
        sort: '-data_inicio',
      })
      return records.map((r) => ({
        id: r.id,
        pessoa: r.pessoa,
        vinculo_origem_id: r.vinculo_origem_id,
        tipo: r.tipo as TipoProgramacaoDescanso,
        data_inicio: r.data_inicio,
        data_fim: r.data_fim,
        dias: Number(r.dias || 0),
        status: r.status as StatusProgramacaoDescanso,
        valor_periodo: Number(r.valor_periodo || 0),
        valor_base_mensal: Number(r.valor_base_mensal || 0),
        adicional_terco_constitucional: Number(r.adicional_terco_constitucional || 0),
        periodo_aquisitivo_inicio: r.periodo_aquisitivo_inicio,
        periodo_aquisitivo_fim: r.periodo_aquisitivo_fim,
        periodo_concessivo_limite: r.periodo_concessivo_limite,
        dias_saldo_remanescente: Number(r.dias_saldo_remanescente || 0),
        observacao: r.observacao || '',
        created: r.created,
        updated: r.updated,
      }))
    } catch (err) {
      console.warn('[feriasDescansoService] Erro ao listar todas as programações:', err)
      return []
    }
  },

  async criar(dados: SalvarProgramacaoDescansoInput): Promise<ProgramacaoDescanso> {
    const record = await pb.collection('programacoes_descanso').create({
      pessoa: dados.pessoa,
      vinculo_origem_id: dados.vinculo_origem_id || '',
      tipo: dados.tipo,
      data_inicio: dados.data_inicio,
      data_fim: dados.data_fim,
      dias: Number(dados.dias || 0),
      status: dados.status || 'Programadas',
      valor_periodo: Number(dados.valor_periodo || 0),
      valor_base_mensal: Number(dados.valor_base_mensal || 0),
      adicional_terco_constitucional: Number(dados.adicional_terco_constitucional || 0),
      periodo_aquisitivo_inicio: dados.periodo_aquisitivo_inicio || '',
      periodo_aquisitivo_fim: dados.periodo_aquisitivo_fim || '',
      periodo_concessivo_limite: dados.periodo_concessivo_limite || '',
      dias_saldo_remanescente: Number(dados.dias_saldo_remanescente || 0),
      observacao: dados.observacao || '',
    })

    return {
      id: record.id,
      pessoa: record.pessoa,
      vinculo_origem_id: record.vinculo_origem_id,
      tipo: record.tipo as TipoProgramacaoDescanso,
      data_inicio: record.data_inicio,
      data_fim: record.data_fim,
      dias: Number(record.dias || 0),
      status: record.status as StatusProgramacaoDescanso,
      valor_periodo: Number(record.valor_periodo || 0),
      valor_base_mensal: Number(record.valor_base_mensal || 0),
      adicional_terco_constitucional: Number(record.adicional_terco_constitucional || 0),
      periodo_aquisitivo_inicio: record.periodo_aquisitivo_inicio,
      periodo_aquisitivo_fim: record.periodo_aquisitivo_fim,
      periodo_concessivo_limite: record.periodo_concessivo_limite,
      dias_saldo_remanescente: Number(record.dias_saldo_remanescente || 0),
      observacao: record.observacao,
      created: record.created,
      updated: record.updated,
    }
  },

  async atualizar(
    id: string,
    dados: Partial<SalvarProgramacaoDescansoInput>,
  ): Promise<ProgramacaoDescanso> {
    const record = await pb.collection('programacoes_descanso').update(id, {
      ...dados,
      dias: dados.dias !== undefined ? Number(dados.dias) : undefined,
      valor_periodo: dados.valor_periodo !== undefined ? Number(dados.valor_periodo) : undefined,
      valor_base_mensal:
        dados.valor_base_mensal !== undefined ? Number(dados.valor_base_mensal) : undefined,
      adicional_terco_constitucional:
        dados.adicional_terco_constitucional !== undefined
          ? Number(dados.adicional_terco_constitucional)
          : undefined,
      dias_saldo_remanescente:
        dados.dias_saldo_remanescente !== undefined
          ? Number(dados.dias_saldo_remanescente)
          : undefined,
    })

    return {
      id: record.id,
      pessoa: record.pessoa,
      vinculo_origem_id: record.vinculo_origem_id,
      tipo: record.tipo as TipoProgramacaoDescanso,
      data_inicio: record.data_inicio,
      data_fim: record.data_fim,
      dias: Number(record.dias || 0),
      status: record.status as StatusProgramacaoDescanso,
      valor_periodo: Number(record.valor_periodo || 0),
      valor_base_mensal: Number(record.valor_base_mensal || 0),
      adicional_terco_constitucional: Number(record.adicional_terco_constitucional || 0),
      periodo_aquisitivo_inicio: record.periodo_aquisitivo_inicio,
      periodo_aquisitivo_fim: record.periodo_aquisitivo_fim,
      periodo_concessivo_limite: record.periodo_concessivo_limite,
      dias_saldo_remanescente: Number(record.dias_saldo_remanescente || 0),
      observacao: record.observacao,
      created: record.created,
      updated: record.updated,
    }
  },

  async excluir(id: string): Promise<boolean> {
    return await pb.collection('programacoes_descanso').delete(id)
  },
}
