import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export type TipoApontamentoHora = 'Normal' | 'Extra' | 'Sobreaviso' | 'Compensação'
export type StatusApontamentoHora = 'Pendente' | 'Aprovado' | 'Rejeitado'

export interface ApontamentoHora extends RecordModel {
  pessoa: string
  competencia: string // 'AAAA-MM'
  data: string
  horas: number
  tipo: TipoApontamentoHora
  descricao?: string
  status: StatusApontamentoHora
  vinculo_referencia?: string
  contrato?: string
  criado_por?: string
  atualizado_por?: string
  expand?: {
    pessoa?: RecordModel
    contrato?: RecordModel
  }
}

export type StatusCicloFechamento =
  | 'Em apontamento'
  | 'Aguardando validação do gestor'
  | 'Devolvido para ajustes'
  | 'Validado'
  | 'NF solicitada'
  | 'NF recebida'
  | 'Fechado'

export interface EventoHistoricoFechamento {
  data: string
  autor: string
  acao: string
  observacao?: string
}

export interface FechamentoCompetencia extends RecordModel {
  pessoa: string
  competencia: string // 'AAAA-MM'
  total_horas: number
  horas_normais?: number
  horas_extras?: number
  horas_sobreaviso?: number
  horas_base_contrato?: number
  valor_hora_congelado: number
  valor_total_calculado: number
  status_ciclo: StatusCicloFechamento
  gestor_validador?: string
  gestor_nome?: string
  data_validacao?: string
  parecer_gestor?: string
  historico_eventos?: EventoHistoricoFechamento[]
  vinculo_referencia?: string
  contrato?: string
  prestador?: string
  expand?: {
    pessoa?: RecordModel
    gestor_validador?: RecordModel
    contrato?: RecordModel
    prestador?: RecordModel
  }
}

export interface CriarApontamentoInput {
  pessoa: string
  competencia: string
  data: string
  horas: number
  tipo: TipoApontamentoHora
  descricao?: string
  status?: StatusApontamentoHora
  vinculo_referencia?: string
  contrato?: string
  criado_por?: string
}

export const horasService = {
  async listarApontamentosPorPessoaECompetencia(
    pessoaId: string,
    competencia: string,
  ): Promise<ApontamentoHora[]> {
    try {
      const records = await pb.collection('apontamentos_horas').getFullList<ApontamentoHora>({
        filter: `pessoa = "${pessoaId}" && competencia = "${competencia}"`,
        sort: '-data',
      })
      return records
    } catch (err) {
      console.error('Erro ao listar apontamentos_horas:', err)
      return []
    }
  },

  async listarApontamentosPorCompetencia(competencia: string): Promise<ApontamentoHora[]> {
    try {
      const records = await pb.collection('apontamentos_horas').getFullList<ApontamentoHora>({
        filter: `competencia = "${competencia}"`,
        sort: '-data',
        expand: 'pessoa',
      })
      return records
    } catch (err) {
      console.error('Erro ao listar apontamentos da competencia:', err)
      return []
    }
  },

  async criarApontamento(input: CriarApontamentoInput): Promise<ApontamentoHora> {
    const rec = await pb.collection('apontamentos_horas').create<ApontamentoHora>({
      ...input,
      status: input.status || 'Aprovado',
    })
    return rec
  },

  async criarApontamentosEmLote(itens: CriarApontamentoInput[]): Promise<ApontamentoHora[]> {
    const criados: ApontamentoHora[] = []
    for (const it of itens) {
      const res = await this.criarApontamento(it)
      criados.push(res)
    }
    return criados
  },

  async excluirApontamento(id: string): Promise<boolean> {
    try {
      await pb.collection('apontamentos_horas').delete(id)
      return true
    } catch (err) {
      console.error('Erro ao excluir apontamento:', err)
      return false
    }
  },

  async obterFechamento(
    pessoaId: string,
    competencia: string,
  ): Promise<FechamentoCompetencia | null> {
    try {
      const rec = await pb
        .collection('fechamentos_competencia')
        .getFirstListItem<FechamentoCompetencia>(
          `pessoa = "${pessoaId}" && competencia = "${competencia}"`,
          {
            expand: 'pessoa,gestor_validador,prestador',
          },
        )
      return rec
    } catch {
      return null
    }
  },

  async listarFechamentosPorCompetencia(competencia: string): Promise<FechamentoCompetencia[]> {
    try {
      const records = await pb
        .collection('fechamentos_competencia')
        .getFullList<FechamentoCompetencia>({
          filter: `competencia = "${competencia}"`,
          sort: 'created',
          expand: 'pessoa,gestor_validador,prestador',
        })
      return records
    } catch (err) {
      console.error('Erro ao listar fechamentos_competencia:', err)
      return []
    }
  },

  async listarFechamentosPorPessoa(pessoaId: string): Promise<FechamentoCompetencia[]> {
    try {
      const records = await pb
        .collection('fechamentos_competencia')
        .getFullList<FechamentoCompetencia>({
          filter: `pessoa = "${pessoaId}"`,
          sort: '-competencia',
          expand: 'pessoa,gestor_validador',
        })
      return records
    } catch (err) {
      console.error('Erro ao listar histórico de fechamentos da pessoa:', err)
      return []
    }
  },

  async upsertFechamento(dados: Partial<FechamentoCompetencia>): Promise<FechamentoCompetencia> {
    if (!dados.pessoa || !dados.competencia) {
      throw new Error('Pessoa e competência são obrigatórios para o fechamento.')
    }

    const existente = await this.obterFechamento(dados.pessoa, dados.competencia)
    if (existente) {
      const rec = await pb
        .collection('fechamentos_competencia')
        .update<FechamentoCompetencia>(existente.id, dados, {
          expand: 'pessoa,gestor_validador,prestador',
        })
      return rec
    } else {
      const rec = await pb
        .collection('fechamentos_competencia')
        .create<FechamentoCompetencia>(dados, {
          expand: 'pessoa,gestor_validador,prestador',
        })
      return rec
    }
  },

  async enviarParaValidacaoGestor(
    fechamentoId: string,
    autorNome: string,
  ): Promise<FechamentoCompetencia> {
    const atual = await pb
      .collection('fechamentos_competencia')
      .getOne<FechamentoCompetencia>(fechamentoId)
    const historico = Array.isArray(atual.historico_eventos) ? [...atual.historico_eventos] : []

    historico.push({
      data: new Date().toISOString(),
      autor: autorNome,
      acao: 'Envio para validação do gestor',
      observacao: `Fechamento submetido para conferência do gestor contratante. Total: ${atual.total_horas}h.`,
    })

    return pb.collection('fechamentos_competencia').update<FechamentoCompetencia>(fechamentoId, {
      status_ciclo: 'Aguardando validação do gestor',
      historico_eventos: historico,
    })
  },

  async aprovarPeloGestor(
    fechamentoId: string,
    gestorId: string,
    gestorNome: string,
    parecer?: string,
  ): Promise<FechamentoCompetencia> {
    const atual = await pb
      .collection('fechamentos_competencia')
      .getOne<FechamentoCompetencia>(fechamentoId)
    const historico = Array.isArray(atual.historico_eventos) ? [...atual.historico_eventos] : []

    historico.push({
      data: new Date().toISOString(),
      autor: `${gestorNome} (Gestor)`,
      acao: 'Validação do gestor',
      observacao: parecer || 'Horas validadas e aprovadas sem ressalvas.',
    })

    return pb.collection('fechamentos_competencia').update<FechamentoCompetencia>(fechamentoId, {
      status_ciclo: 'Validado',
      gestor_validador: gestorId,
      gestor_nome: gestorNome,
      data_validacao: new Date().toISOString(),
      parecer_gestor: parecer || 'Aprovado pelo gestor',
      historico_eventos: historico,
    })
  },

  async devolverParaAjustes(
    fechamentoId: string,
    gestorNome: string,
    motivo: string,
  ): Promise<FechamentoCompetencia> {
    const atual = await pb
      .collection('fechamentos_competencia')
      .getOne<FechamentoCompetencia>(fechamentoId)
    const historico = Array.isArray(atual.historico_eventos) ? [...atual.historico_eventos] : []

    historico.push({
      data: new Date().toISOString(),
      autor: `${gestorNome} (Gestor)`,
      acao: 'Devolução para ajustes',
      observacao: motivo,
    })

    return pb.collection('fechamentos_competencia').update<FechamentoCompetencia>(fechamentoId, {
      status_ciclo: 'Devolvido para ajustes',
      parecer_gestor: motivo,
      historico_eventos: historico,
    })
  },
}
