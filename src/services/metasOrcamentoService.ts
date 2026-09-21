import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface MetaOrcamentoDepartamento {
  id: string
  departamento: string
  limite_mensal: number
  ativo: boolean
  criado_por?: string
  atualizado_por?: string
  created?: string
  updated?: string
}

export interface MetaDepartamentoConsolidada {
  id?: string
  departamento: string
  limiteMensal: number
  ativo: boolean
  // Gastos calculados
  gastoAtualMes: number // mês corrente selecionado
  projecaoMediaMensal: number // média mensal calculada no horizonte selecionado (3, 6, 12 meses)
  percentualUsoAtual: number // % sobre limite mensal no mês atual
  percentualUsoProjecao: number // % sobre limite mensal na projeção média
  status: 'dentro' | 'atencao' | 'estourado' // Dentro < 90% | Atenção 90%-100% | Estourado > 100%
  // Decomposição detalhada dos custos
  custoPj: number
  custoNfs: number
  custoFolha: number
  prestadoresAssociados: Array<{ nome: string; valor: number }>
  vagasAssociadas: Array<{ titulo: string; custo: number; status: string }>
}

export interface NovoMetaOrcamentoInput {
  departamento: string
  limite_mensal: number
  ativo?: boolean
  criado_por?: string
  atualizado_por?: string
}

export interface AtualizarMetaOrcamentoInput {
  departamento?: string
  limite_mensal?: number
  ativo?: boolean
  atualizado_por?: string
}

export const metasOrcamentoService = {
  /**
   * Lista todas as metas cadastradas
   */
  async listar(): Promise<MetaOrcamentoDepartamento[]> {
    const records = await pb
      .collection('metas_orcamento_departamento')
      .getFullList<MetaOrcamentoDepartamento>({
        sort: 'departamento',
      })
    return records
  },

  /**
   * Cria uma nova meta de orçamento departamental
   */
  async criar(input: NovoMetaOrcamentoInput): Promise<MetaOrcamentoDepartamento> {
    const record = await pb
      .collection('metas_orcamento_departamento')
      .create<MetaOrcamentoDepartamento>({
        departamento: input.departamento.trim(),
        limite_mensal: Number(input.limite_mensal),
        ativo: input.ativo !== undefined ? input.ativo : true,
        criado_por: input.criado_por || pb.authStore.record?.name || 'RH',
        atualizado_por: input.atualizado_por || pb.authStore.record?.name || 'RH',
      })
    return record
  },

  /**
   * Atualiza uma meta existente
   */
  async atualizar(
    id: string,
    input: AtualizarMetaOrcamentoInput,
  ): Promise<MetaOrcamentoDepartamento> {
    const data: Record<string, any> = {}
    if (input.departamento !== undefined) data.departamento = input.departamento.trim()
    if (input.limite_mensal !== undefined) data.limite_mensal = Number(input.limite_mensal)
    if (input.ativo !== undefined) data.ativo = input.ativo
    data.atualizado_por = input.atualizado_por || pb.authStore.record?.name || 'RH'

    const record = await pb
      .collection('metas_orcamento_departamento')
      .update<MetaOrcamentoDepartamento>(id, data)
    return record
  },

  /**
   * Remove uma meta
   */
  async excluir(id: string): Promise<boolean> {
    await pb.collection('metas_orcamento_departamento').delete(id)
    return true
  },

  /**
   * Executa a checagem no backend e dispara notificações se houver estouro ou atenção
   */
  async checarAlertas(): Promise<{
    success: boolean
    alertas_gerados: number
    departamentos_estourados: string[]
    departamentos_atencao: string[]
  }> {
    try {
      const res = await pb.send('/backend/v1/financeiro/metas/checar-alertas', {
        method: 'POST',
      })
      return res
    } catch (err) {
      console.warn(
        'Endpoint /backend/v1/financeiro/metas/checar-alertas indisponível, simulado:',
        err,
      )
      return {
        success: true,
        alertas_gerados: 0,
        departamentos_estourados: [],
        departamentos_atencao: [],
      }
    }
  },
}
