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
  | 'Aguardando validação do RH'
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

  /**
   * O GESTOR conclui os apontamentos de horas da competência e submete para validação do RH.
   */
  async enviarParaValidacaoRh(
    fechamentoId: string,
    autorNome: string,
    observacaoGestor?: string,
  ): Promise<FechamentoCompetencia> {
    const atual = await pb
      .collection('fechamentos_competencia')
      .getOne<FechamentoCompetencia>(fechamentoId, { expand: 'pessoa' })
    const historico = Array.isArray(atual.historico_eventos) ? [...atual.historico_eventos] : []

    historico.push({
      data: new Date().toISOString(),
      autor: `${autorNome} (Gestor)`,
      acao: 'Envio para validação do RH',
      observacao:
        observacaoGestor ||
        `Fechamento de competência concluído e enviado pelo gestor para conferência do RH. Total: ${atual.total_horas}h.`,
    })

    const atualizado = await pb
      .collection('fechamentos_competencia')
      .update<FechamentoCompetencia>(fechamentoId, {
        status_ciclo: 'Aguardando validação do RH',
        historico_eventos: historico,
      })

    // Notificar o RH via Central de Notificações
    try {
      const { notificacoesRhService } = await import('./notificacoesRh')
      const pessoaNome = atual.expand?.pessoa?.nome || 'Prestador PJ'
      await notificacoesRhService.criarNotificacao({
        titulo: `Competência ${atual.competencia} pronta para validação: ${pessoaNome}`,
        mensagem: `${autorNome} (Gestor) concluiu os apontamentos (${atual.total_horas}h - R$ ${(atual.valor_total_calculado || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Valide ou devolva com observações para emissão de NF.`,
        tipo: 'fechamento_horas_rh',
        link: `/horas-competencias?comp=${atual.competencia}`,
        referencia_tipo: 'fechamentos_competencia',
        referencia_id: fechamentoId,
        autor_nome: autorNome,
      })
    } catch (e) {
      console.warn('Aviso ao disparar notificação para o RH:', e)
    }

    return atualizado
  },

  /**
   * O RH valida e aprova o fechamento de horas do gestor (→ status "Validado", valor calculado congelado).
   */
  async aprovarPeloRh(
    fechamentoId: string,
    rhId: string,
    rhNome: string,
    parecer?: string,
  ): Promise<FechamentoCompetencia> {
    const atual = await pb
      .collection('fechamentos_competencia')
      .getOne<FechamentoCompetencia>(fechamentoId, { expand: 'pessoa' })
    const historico = Array.isArray(atual.historico_eventos) ? [...atual.historico_eventos] : []

    historico.push({
      data: new Date().toISOString(),
      autor: `${rhNome} (RH)`,
      acao: 'Validação e aprovação pelo RH',
      observacao:
        parecer ||
        'Horas e entregas validadas pelo RH. Competência pronta para solicitação de Nota Fiscal.',
    })

    const atualizado = await pb
      .collection('fechamentos_competencia')
      .update<FechamentoCompetencia>(fechamentoId, {
        status_ciclo: 'Validado',
        gestor_validador: rhId,
        data_validacao: new Date().toISOString(),
        parecer_gestor: parecer || 'Validado e aprovado pelo RH',
        historico_eventos: historico,
      })

    // Notificar o gestor da área sobre a validação
    try {
      const { notificacoesRhService } = await import('./notificacoesRh')
      const pessoaNome = atual.expand?.pessoa?.nome || 'Prestador PJ'
      await notificacoesRhService.criarNotificacao({
        titulo: `Competência ${atual.competencia} validada pelo RH: ${pessoaNome}`,
        mensagem: `${rhNome} (RH) aprovou o fechamento de ${atual.total_horas}h. A solicitação de Nota Fiscal será iniciada.`,
        tipo: 'fechamento_horas_gestor',
        link: `/horas-competencias?comp=${atual.competencia}`,
        referencia_tipo: 'fechamentos_competencia',
        referencia_id: fechamentoId,
        autor_nome: rhNome,
      })
    } catch (e) {
      console.warn('Aviso ao notificar aprovação ao gestor:', e)
    }

    return atualizado
  },

  /**
   * O RH devolve o fechamento para o gestor com observações/correções (→ volta para "Devolvido para ajustes").
   */
  async devolverParaAjustesPeloRh(
    fechamentoId: string,
    rhNome: string,
    motivo: string,
  ): Promise<FechamentoCompetencia> {
    const atual = await pb
      .collection('fechamentos_competencia')
      .getOne<FechamentoCompetencia>(fechamentoId, { expand: 'pessoa' })
    const historico = Array.isArray(atual.historico_eventos) ? [...atual.historico_eventos] : []

    historico.push({
      data: new Date().toISOString(),
      autor: `${rhNome} (RH)`,
      acao: 'Devolução para ajustes com observações do RH',
      observacao: motivo,
    })

    const atualizado = await pb
      .collection('fechamentos_competencia')
      .update<FechamentoCompetencia>(fechamentoId, {
        status_ciclo: 'Devolvido para ajustes',
        parecer_gestor: motivo,
        historico_eventos: historico,
      })

    // Notificar o gestor responsável para realizar as correções
    try {
      const { notificacoesRhService } = await import('./notificacoesRh')
      const pessoaNome = atual.expand?.pessoa?.nome || 'Prestador PJ'
      await notificacoesRhService.criarNotificacao({
        titulo: `Ajustes necessários no apontamento de ${pessoaNome} (${atual.competencia})`,
        mensagem: `${rhNome} (RH) devolveu o apontamento de horas com as seguintes observações: "${motivo}". Acesse o sistema para corrigir e reenviar.`,
        tipo: 'fechamento_horas_gestor',
        link: `/horas-competencias?comp=${atual.competencia}`,
        referencia_tipo: 'fechamentos_competencia',
        referencia_id: fechamentoId,
        autor_nome: rhNome,
      })
    } catch (e) {
      console.warn('Aviso ao notificar devolução ao gestor:', e)
    }

    return atualizado
  },

  // Aliases para retrocompatibilidade sem quebras
  async enviarParaValidacaoGestor(
    fechamentoId: string,
    autorNome: string,
  ): Promise<FechamentoCompetencia> {
    return this.enviarParaValidacaoRh(fechamentoId, autorNome)
  },
  async aprovarPeloGestor(
    fechamentoId: string,
    gestorId: string,
    gestorNome: string,
    parecer?: string,
  ): Promise<FechamentoCompetencia> {
    return this.aprovarPeloRh(fechamentoId, gestorId, gestorNome, parecer)
  },
  async devolverParaAjustes(
    fechamentoId: string,
    gestorNome: string,
    motivo: string,
  ): Promise<FechamentoCompetencia> {
    return this.devolverParaAjustesPeloRh(fechamentoId, gestorNome, motivo)
  },
}
