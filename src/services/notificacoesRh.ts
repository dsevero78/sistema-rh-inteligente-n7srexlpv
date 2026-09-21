import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export type TipoNotificacaoRH =
  | 'vaga_aprovada'
  | 'vaga_ajustes'
  | 'parecer_candidato'
  | 'aditivo_juridico'
  | 'sistema'
  | 'alerta_contrato'

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

      // Registro complementar no log de e-mails transacionais (para rastreabilidade do RH)
      try {
        await pb.collection('logs_emails_status').create({
          destinatario_email: 'severo.douglas2@gmail.com',
          destinatario_nome: 'Douglas Severo (RH SouYess)',
          assunto: `[SouYess RH] ${input.titulo}`,
          conteudo_html: `<div style="font-family: sans-serif; padding: 20px; line-height: 1.6;">
            <h2 style="color: #212B55;">SouYess People Hub — Notificação de Contrato & Vínculo</h2>
            <p style="font-size: 15px; color: #333;"><strong>${input.titulo}</strong></p>
            <p style="font-size: 14px; color: #555;">${input.mensagem}</p>
            ${input.link ? `<p><a href="${input.link}" style="background-color: #E9530E; color: #fff; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Acessar no SouYess</a></p>` : ''}
            <hr style="border: none; border-top: 1px solid #eee; margin-top: 24px;" />
            <p style="font-size: 11px; color: #999;">Notificação automática de governança contratual gerada pelo SouYess.</p>
          </div>`,
          status_envio: 'Enviado',
          data_envio: new Date().toISOString(),
          estagio: input.referencia_tipo || 'contratos',
        })
      } catch (_) {
        // Falha no log de e-mail não impede a notificação in-app
      }

      return rec
    } catch (err) {
      console.error('Erro ao criar notificacao_rh:', err)
      return null
    }
  },

  /**
   * Dispara alertas proativos de contratos vencendo/renovando para o RH via in-app e e-mail
   */
  async verificarEDispararAlertasContratosVencendo(): Promise<number> {
    try {
      const contratos = await pb.collection('contratos').getFullList({
        filter: "status = 'Vigente' || status = 'Vencendo'",
        expand: 'pessoa,prestador_pj',
      })

      const agora = new Date()
      agora.setHours(0, 0, 0, 0)
      let disparados = 0

      for (const ct of contratos) {
        if (!ct.data_fim) continue
        const dFim = new Date(ct.data_fim)
        dFim.setHours(0, 0, 0, 0)
        const diffDias = Math.ceil((dFim.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
        const prazoAlerta = ct.dias_antecedencia_alerta || (ct.modalidade === 'CLT' ? 15 : 60)

        if (diffDias <= prazoAlerta && diffDias >= 0) {
          const pessoaNome = (ct as any).expand?.pessoa?.nome || 'Colaborador/Prestador'
          const jaNotificado = await pb
            .collection('notificacoes_rh')
            .getFirstListItem(`referencia_id = '${ct.id}' && tipo = 'alerta_contrato'`)
            .catch(() => null)

          if (!jaNotificado) {
            await this.criarNotificacao({
              titulo: `Renovação de Contrato (${ct.modalidade}): ${pessoaNome}`,
              mensagem: `O contrato ${ct.codigo_contrato} de ${pessoaNome} vence em ${diffDias} dias (${dFim.toLocaleDateString('pt-BR')}). Avalie a renovação ou termo aditivo.`,
              tipo: 'alerta_contrato',
              link: `/pessoas/${ct.pessoa}`,
              referencia_tipo: 'contratos',
              referencia_id: ct.id,
            })
            disparados++
          }
        }
      }
      return disparados
    } catch (e) {
      console.warn('Aviso ao verificar alertas automáticos de contratos:', e)
      return 0
    }
  },
}
