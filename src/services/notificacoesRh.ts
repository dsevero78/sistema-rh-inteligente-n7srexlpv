import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export type TipoNotificacaoRH =
  | 'vaga_aprovada'
  | 'vaga_ajustes'
  | 'parecer_candidato'
  | 'aditivo_juridico'
  | 'sistema'
  | 'alerta_contrato'
  | 'fechamento_horas_rh'
  | 'fechamento_horas_gestor'

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

  async criar(input: CriarNotificacaoRHInput): Promise<NotificacaoRH | null> {
    return this.criarNotificacao(input)
  },

  async criarNotificacao(input: CriarNotificacaoRHInput): Promise<NotificacaoRH | null> {
    try {
      const rec = await pb.collection('notificacoes_rh').create<NotificacaoRH>({
        ...input,
        lida: false,
      })

      // A coleção logs_emails_status exige obrigatoriamente relações válidas:
      // - candidato (relation -> candidatos)
      // - vaga (relation -> vagas)
      // - estagio (select com valores de funil de recrutamento)
      // Se não houver contexto válido de recrutamento (ex.: notificações de contratos, fechamento de horas, sistema),
      // a notificação in-app em notificacoes_rh já cumpre todo o papel e NÃO tentamos gravar em logs_emails_status (evita erro 400).
      const candidatoId = input.metadata?.candidato || input.metadata?.candidato_id
      const vagaId = input.metadata?.vaga || input.metadata?.vaga_id

      const ESTAGIOS_VALIDOS_LOG = [
        'Candidatura Recebida',
        'Triagem',
        'Entrevista com RH',
        'Entrevista técnica',
        'Match técnico/comportamental (IA)',
        'Proposta',
        'Aprovado',
        'Recusado',
      ] as const

      const estagioCandidatura = input.metadata?.estagio || input.referencia_tipo
      const estagioValido = ESTAGIOS_VALIDOS_LOG.find(
        (e) => e.toLowerCase() === String(estagioCandidatura || '').toLowerCase(),
      )

      if (candidatoId && vagaId && estagioValido) {
        try {
          await pb.collection('logs_emails_status').create({
            candidato: candidatoId,
            vaga: vagaId,
            estagio: estagioValido,
            candidato_nome: input.metadata?.candidato_nome || 'Candidato',
            candidato_email: input.metadata?.candidato_email || 'severo.douglas2@gmail.com',
            vaga_titulo: input.metadata?.vaga_titulo || 'Processo Seletivo',
            assunto: `[SouYess RH] ${input.titulo}`,
            status_envio: 'Enviado',
            mensagem_resumo: input.mensagem,
            data_envio: new Date().toISOString(),
          })
        } catch (logErr) {
          // Log de e-mail é secundário e nunca bloqueia a notificação in-app
          console.warn('[notificacoesRh] Falha ao registrar log de email secundário:', logErr)
        }
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
