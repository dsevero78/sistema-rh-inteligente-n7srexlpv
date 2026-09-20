import pb from '@/lib/pocketbase/client'

export type CategoriaTimelineCandidato =
  | 'CANDIDATURA'
  | 'AVALIAÇÃO'
  | 'ENTREVISTA'
  | 'GESTÃO'
  | 'STATUS'

import type { RecordModel } from 'pocketbase'

export interface EventoTimelineCandidato extends RecordModel {
  candidato: string
  categoria: CategoriaTimelineCandidato
  titulo: string
  complemento?: string
  autor: string
  origem: 'sistema' | 'usuario'
  data_evento: string
  referencia_tipo?: string
  referencia_id?: string
  expand?: {
    candidato?: {
      id: string
      nome: string
      email: string
      cargo_atual?: string
      vaga?: string
    }
  }
}

export interface NovoEventoTimelineCandidatoInput {
  candidato: string
  categoria: CategoriaTimelineCandidato
  titulo: string
  complemento?: string
  autor?: string
  origem?: 'sistema' | 'usuario'
  data_evento?: string
  referencia_tipo?: string
  referencia_id?: string
}

export const candidatosTimelineService = {
  /**
   * Listar eventos da timeline do candidato, com suporte opcional a filtro por categoria.
   */
  async listarEventos(
    candidatoId: string,
    categoriaFiltro?: CategoriaTimelineCandidato | 'TODAS',
  ): Promise<EventoTimelineCandidato[]> {
    let filter = `candidato = '${candidatoId}'`
    if (categoriaFiltro && categoriaFiltro !== 'TODAS') {
      filter += ` && categoria = '${categoriaFiltro}'`
    }

    return await pb.collection('eventos_timeline_candidato').getFullList<EventoTimelineCandidato>({
      filter,
      sort: '-data_evento',
      expand: 'candidato',
    })
  },

  /**
   * Criar um novo evento na timeline do candidato.
   * Se autor for omitido ou vazio, usa o nome do usuário logado no pb.authStore ou 'sistema'.
   */
  async criarEvento(dados: NovoEventoTimelineCandidatoInput): Promise<EventoTimelineCandidato> {
    const usuarioLogado = pb.authStore.record?.name || pb.authStore.record?.email
    const autorFinal = dados.autor?.trim() || usuarioLogado || 'sistema'
    const origemFinal =
      dados.origem || (autorFinal.toLowerCase() === 'sistema' ? 'sistema' : 'usuario')
    const dataEventoFinal = dados.data_evento || new Date().toISOString()

    return await pb.collection('eventos_timeline_candidato').create<EventoTimelineCandidato>({
      candidato: dados.candidato,
      categoria: dados.categoria,
      titulo: dados.titulo,
      complemento: dados.complemento || '',
      autor: autorFinal,
      origem: origemFinal,
      data_evento: dataEventoFinal,
      referencia_tipo: dados.referencia_tipo || '',
      referencia_id: dados.referencia_id || '',
    })
  },

  /**
   * Registrar evento de forma segura (sem lançar erro caso falhe, apenas logando aviso).
   * Ideal para ser chamado em fluxos de criação/edição em componentes sem quebrar o fluxo principal.
   */
  async registrarEventoSeguro(
    dados: NovoEventoTimelineCandidatoInput,
  ): Promise<EventoTimelineCandidato | null> {
    try {
      return await this.criarEvento(dados)
    } catch (err) {
      console.warn('Aviso: falha ao registrar evento na timeline do candidato:', err)
      return null
    }
  },

  /**
   * Excluir um evento da timeline por ID.
   */
  async excluirEvento(id: string): Promise<boolean> {
    return await pb.collection('eventos_timeline_candidato').delete(id)
  },
}
