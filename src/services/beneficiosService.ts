import { pb } from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export type TipoBeneficio =
  | 'vale_refeicao'
  | 'vale_alimentacao'
  | 'vale_transporte'
  | 'plano_saude'
  | 'plano_odontologico'
  | 'seguro_vida'
  | 'auxilio_creche'
  | 'auxilio_home_office'
  | 'outros'

export const LABELS_TIPO_BENEFICIO: Record<TipoBeneficio, string> = {
  vale_refeicao: 'Vale-Refeição (VR)',
  vale_alimentacao: 'Vale-Alimentação (VA)',
  vale_transporte: 'Vale-Transporte (VT)',
  plano_saude: 'Plano de Saúde Médico',
  plano_odontologico: 'Plano Odontológico',
  seguro_vida: 'Seguro de Vida em Grupo',
  auxilio_creche: 'Auxílio-Creche',
  auxilio_home_office: 'Auxílio Home Office / Conectividade',
  outros: 'Outro Benefício Personalizado',
}

export interface BeneficioVinculo {
  id: string
  pessoa: string
  vinculo_origem_id?: string
  tipo: TipoBeneficio
  nome_personalizado?: string
  valor_mensal: number
  data_inicio: string
  data_fim?: string
  ativo: boolean
  observacao?: string
  created?: string
  updated?: string
}

export interface SalvarBeneficioInput {
  pessoa: string
  vinculo_origem_id?: string
  tipo: TipoBeneficio
  nome_personalizado?: string
  valor_mensal: number
  data_inicio: string
  data_fim?: string
  ativo?: boolean
  observacao?: string
}

export const beneficiosService = {
  async listarPorPessoa(pessoaId: string, vinculoOrigemId?: string): Promise<BeneficioVinculo[]> {
    try {
      let filter = `pessoa = '${pessoaId}'`
      if (vinculoOrigemId) {
        filter += ` && (vinculo_origem_id = '${vinculoOrigemId}' || vinculo_origem_id = '')`
      }
      const records = await pb.collection('beneficios_vinculo').getFullList<RecordModel>({
        filter,
        sort: '-ativo,-valor_mensal',
      })
      return records.map((r) => ({
        id: r.id,
        pessoa: r.pessoa,
        vinculo_origem_id: r.vinculo_origem_id,
        tipo: r.tipo as TipoBeneficio,
        nome_personalizado: r.nome_personalizado || '',
        valor_mensal: Number(r.valor_mensal || 0),
        data_inicio: r.data_inicio,
        data_fim: r.data_fim,
        ativo: r.ativo !== false,
        observacao: r.observacao || '',
        created: r.created,
        updated: r.updated,
      }))
    } catch (err) {
      console.warn('[beneficiosService] Erro ao listar benefícios da pessoa:', err)
      return []
    }
  },

  async listarTodos(): Promise<BeneficioVinculo[]> {
    try {
      const records = await pb.collection('beneficios_vinculo').getFullList<RecordModel>({
        sort: '-ativo',
      })
      return records.map((r) => ({
        id: r.id,
        pessoa: r.pessoa,
        vinculo_origem_id: r.vinculo_origem_id,
        tipo: r.tipo as TipoBeneficio,
        nome_personalizado: r.nome_personalizado || '',
        valor_mensal: Number(r.valor_mensal || 0),
        data_inicio: r.data_inicio,
        data_fim: r.data_fim,
        ativo: r.ativo !== false,
        observacao: r.observacao || '',
        created: r.created,
        updated: r.updated,
      }))
    } catch (err) {
      console.warn('[beneficiosService] Erro ao listar todos os benefícios:', err)
      return []
    }
  },

  async criar(dados: SalvarBeneficioInput): Promise<BeneficioVinculo> {
    const record = await pb.collection('beneficios_vinculo').create({
      pessoa: dados.pessoa,
      vinculo_origem_id: dados.vinculo_origem_id || '',
      tipo: dados.tipo,
      nome_personalizado: dados.nome_personalizado || '',
      valor_mensal: Number(dados.valor_mensal || 0),
      data_inicio: dados.data_inicio,
      data_fim: dados.data_fim || '',
      ativo: dados.ativo !== false,
      observacao: dados.observacao || '',
    })

    return {
      id: record.id,
      pessoa: record.pessoa,
      vinculo_origem_id: record.vinculo_origem_id,
      tipo: record.tipo as TipoBeneficio,
      nome_personalizado: record.nome_personalizado,
      valor_mensal: Number(record.valor_mensal || 0),
      data_inicio: record.data_inicio,
      data_fim: record.data_fim,
      ativo: record.ativo,
      observacao: record.observacao,
      created: record.created,
      updated: record.updated,
    }
  },

  async atualizar(id: string, dados: Partial<SalvarBeneficioInput>): Promise<BeneficioVinculo> {
    const record = await pb.collection('beneficios_vinculo').update(id, {
      ...dados,
      valor_mensal: dados.valor_mensal !== undefined ? Number(dados.valor_mensal) : undefined,
    })

    return {
      id: record.id,
      pessoa: record.pessoa,
      vinculo_origem_id: record.vinculo_origem_id,
      tipo: record.tipo as TipoBeneficio,
      nome_personalizado: record.nome_personalizado,
      valor_mensal: Number(record.valor_mensal || 0),
      data_inicio: record.data_inicio,
      data_fim: record.data_fim,
      ativo: record.ativo,
      observacao: record.observacao,
      created: record.created,
      updated: record.updated,
    }
  },

  async excluir(id: string): Promise<boolean> {
    return await pb.collection('beneficios_vinculo').delete(id)
  },
}
