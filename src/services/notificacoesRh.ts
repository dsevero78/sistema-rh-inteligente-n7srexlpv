import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export type TipoNotificacaoRH =
  | 'vaga_aprovada'
  | 'vaga_ajustes'
  | 'parecer_candidato'
  | 'aditivo_juridico'
  | 'sistema'

export interface NotificacaoRH extends RecordModel {
  titulo: string
  mensagem: string
  tipo: TipoNotificacaoRH
  lida: boolean
  link?: string
  autor_nome?: string
  autor_email?: string
  referencia_tipo?: string
  referencia_id?: string
  metadata?: Record<string, any>
  created: string
  updated: string
}

export interface CriarNotificacaoRHInput {
  titulo: string
  mensagem: string
  tipo: TipoNotificacaoRH
  link?: string
  autor_nome?: string
  autor_email?: string
  referencia_tipo?: string
  referencia_id?: string
  metadata?: Record<string, any>
}

export const notificacoesRhService = {
  async listar(limit = 50): Promise<NotificacaoRH[]> {
    try {
      const records = await pb.collection('notificacoes_rh').getList<NotificacaoRH>(1, limit, {
        sort: '-created',
      })
      return records.items
    } catch (err) {
      console.error('Erro ao listar notificacoes_rh:', err)
      return []
    }
  },

  async contarNaoLidas(): Promise<number> {
    try {
      const res = await pb.collection('notificacoes_rh').getList(1, 1, {
        filter: 'lida != true',
      })
      return res.totalItems
    } catch {
      return 0
    }
  },

  async marcarComoLida(id: string): Promise<boolean> {
    try {
      await pb.collection('notificacoes_rh').update(id, { lida: true })
      return true
    } catch (err) {
      console.error('Erro ao marcar notificacao como lida:', err)
      return false
    }
  },

  async marcarTodasComoLidas(): Promise<boolean> {
    try {
      const naoLidas = await pb.collection('notificacoes_rh').getFullList({
        filter: 'lida != true',
      })
      await Promise.all(
        naoLidas.map((item) => pb.collection('notificacoes_rh').update(item.id, { lida: true })),
      )
      return true
    } catch (err) {
      console.error('Erro ao marcar todas notificacoes como lidas:', err)
      return false
    }
  },

  async criarNotificacao(input: CriarNotificacaoRHInput): Promise<NotificacaoRH | null> {
    try {
      const rec = await pb.collection('notificacoes_rh').create<NotificacaoRH>({
        ...input,
        lida: false,
      })
      return rec
    } catch (err) {
      console.error('Erro ao criar notificacao_rh:', err)
      return null
    }
  },
}
