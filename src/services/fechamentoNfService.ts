import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import { horasService } from './horasService'
import { notificacoesRhService } from './notificacoesRh'

export type StatusNotaFiscal = 'Solicitada' | 'Recebida' | 'Em atraso' | 'Conciliada'

export interface HistoricoCobrancaItem {
  data: string
  canal: 'Email' | 'WhatsApp' | 'In-app' | 'Telefone'
  cobrado_por: string
  observacao?: string
}

export interface NotaFiscalLoteItem extends RecordModel {
  fechamento?: string
  pessoa: string
  competencia: string // 'AAAA-MM'
  valor: number
  numero_nf?: string
  data_emissao?: string
  data_limite_envio?: string
  status: StatusNotaFiscal
  arquivo_nf?: string
  historico_cobrancas?: HistoricoCobrancaItem[]
  data_recebimento?: string
  data_conciliacao?: string
  conciliado_por?: string
  observacao?: string
  prestador?: string
  expand?: {
    pessoa?: RecordModel
    fechamento?: RecordModel
    prestador?: RecordModel
  }
}

export interface SolicitarNfInput {
  fechamentoId?: string
  pessoaId: string
  competencia: string
  valor: number
  prazoDiasUteis?: number
  observacao?: string
  prestadorId?: string
  usuarioNome: string
}

export const fechamentoNfService = {
  async listarNfsPorCompetencia(competencia: string): Promise<NotaFiscalLoteItem[]> {
    try {
      const records = await pb.collection('notas_fiscais').getFullList<NotaFiscalLoteItem>({
        filter: `competencia = "${competencia}"`,
        sort: '-created',
        expand: 'pessoa,fechamento,prestador',
      })
      return records
    } catch (err) {
      console.error('Erro ao listar notas_fiscais da competencia:', err)
      return []
    }
  },

  async listarNfsPorPessoa(pessoaId: string): Promise<NotaFiscalLoteItem[]> {
    try {
      const records = await pb.collection('notas_fiscais').getFullList<NotaFiscalLoteItem>({
        filter: `pessoa = "${pessoaId}"`,
        sort: '-competencia',
        expand: 'pessoa,fechamento,prestador',
      })
      return records
    } catch (err) {
      console.error('Erro ao listar notas_fiscais da pessoa:', err)
      return []
    }
  },

  async solicitarNf(input: SolicitarNfInput): Promise<NotaFiscalLoteItem> {
    const dias = input.prazoDiasUteis || 5
    // Calcular data limite (dias úteis simples ou corridos +5d)
    const dataLimite = new Date()
    dataLimite.setDate(dataLimite.getDate() + dias)

    const payload: Partial<NotaFiscalLoteItem> = {
      pessoa: input.pessoaId,
      competencia: input.competencia,
      valor: input.valor,
      data_limite_envio: dataLimite.toISOString(),
      status: 'Solicitada',
      observacao: input.observacao || `NF solicitada para a competência ${input.competencia}`,
      historico_cobrancas: [],
    }

    if (input.fechamentoId) payload.fechamento = input.fechamentoId
    if (input.prestadorId) payload.prestador = input.prestadorId

    const rec = await pb.collection('notas_fiscais').create<NotaFiscalLoteItem>(payload, {
      expand: 'pessoa,fechamento',
    })

    // Se houver fechamento associado, avançar status para 'NF solicitada'
    if (input.fechamentoId) {
      try {
        const fechamento = await pb.collection('fechamentos_competencia').getOne(input.fechamentoId)
        const hist = Array.isArray(fechamento.historico_eventos)
          ? [...fechamento.historico_eventos]
          : []
        hist.push({
          data: new Date().toISOString(),
          autor: input.usuarioNome,
          acao: 'Solicitação de NF',
          observacao: `NF solicitada no valor de R$ ${input.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Prazo de envio: ${dataLimite.toLocaleDateString('pt-BR')}.`,
        })

        await pb.collection('fechamentos_competencia').update(input.fechamentoId, {
          status_ciclo: 'NF solicitada',
          historico_eventos: hist,
        })
      } catch (err) {
        console.warn('Não foi possível atualizar status do fechamento:', err)
      }
    }

    // Gerar notificação in-app para registro
    try {
      const pessoaNome = rec.expand?.pessoa?.nome || 'Prestador PJ'
      await notificacoesRhService.criarNotificacao({
        titulo: `NF solicitada: ${pessoaNome} (${input.competencia})`,
        mensagem: `Solicitação de Nota Fiscal disparada no valor de R$ ${input.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Prazo: ${dataLimite.toLocaleDateString('pt-BR')}.`,
        tipo: 'sistema',
        link: `/horas-competencias?comp=${input.competencia}`,
        referencia_tipo: 'notas_fiscais',
        referencia_id: rec.id,
      })
    } catch (err) {
      console.warn('Erro ao disparar notificacao de solicitacao de NF:', err)
    }

    return rec
  },

  async solicitarEmLote(
    itens: {
      fechamentoId?: string
      pessoaId: string
      competencia: string
      valor: number
      prestadorId?: string
    }[],
    usuarioNome: string,
    prazoDiasUteis = 5,
  ): Promise<{ solicitadas: number; erros: number }> {
    let solicitadas = 0
    let erros = 0

    for (const it of itens) {
      try {
        await this.solicitarNf({
          fechamentoId: it.fechamentoId,
          pessoaId: it.pessoaId,
          competencia: it.competencia,
          valor: it.valor,
          prestadorId: it.prestadorId,
          prazoDiasUteis,
          usuarioNome,
        })
        solicitadas++
      } catch (err) {
        console.error('Falha ao solicitar NF individual do lote:', err)
        erros++
      }
    }

    // Notificação resumo do lote
    if (solicitadas > 0) {
      try {
        await notificacoesRhService.criarNotificacao({
          titulo: `Disparo de NFs em Lote Concluído`,
          mensagem: `${solicitadas} solicitações de NFs disparadas pelo RH com prazo de ${prazoDiasUteis} dias úteis.`,
          tipo: 'sistema',
          link: `/horas-competencias`,
        })
      } catch {
        /* intentionally ignored */
      }
    }

    return { solicitadas, erros }
  },

  async registrarCobranca(
    nfId: string,
    canal: 'Email' | 'WhatsApp' | 'In-app' | 'Telefone',
    cobradoPor: string,
    observacao?: string,
  ): Promise<NotaFiscalLoteItem> {
    const atual = await pb.collection('notas_fiscais').getOne<NotaFiscalLoteItem>(nfId, {
      expand: 'pessoa',
    })
    const historico = Array.isArray(atual.historico_cobrancas) ? [...atual.historico_cobrancas] : []

    historico.push({
      data: new Date().toISOString(),
      canal,
      cobrado_por: cobradoPor,
      observacao: observacao || `Cobrança formalizada via ${canal}.`,
    })

    const rec = await pb.collection('notas_fiscais').update<NotaFiscalLoteItem>(
      nfId,
      {
        status: 'Em atraso',
        historico_cobrancas: historico,
      },
      { expand: 'pessoa' },
    )

    // Notificação in-app
    try {
      const pNome = rec.expand?.pessoa?.nome || 'Prestador'
      await notificacoesRhService.criarNotificacao({
        titulo: `Cobrança de NF enviada: ${pNome}`,
        mensagem: `Cobrança registrada via ${canal} referente à competência ${rec.competencia} (R$ ${rec.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).`,
        tipo: 'sistema',
        link: `/horas-competencias?comp=${rec.competencia}`,
        referencia_tipo: 'notas_fiscais',
        referencia_id: rec.id,
      })
    } catch {
      /* intentionally ignored */
    }

    return rec
  },

  async anexarArquivoNf(
    nfId: string,
    arquivo: File,
    numeroNf?: string,
    dataEmissao?: string,
  ): Promise<NotaFiscalLoteItem> {
    const formData = new FormData()
    formData.append('arquivo_nf', arquivo)
    formData.append('status', 'Recebida')
    formData.append('data_recebimento', new Date().toISOString())
    if (numeroNf) formData.append('numero_nf', numeroNf)
    if (dataEmissao) formData.append('data_emissao', dataEmissao)

    const rec = await pb
      .collection('notas_fiscais')
      .update<NotaFiscalLoteItem>(nfId, formData, { expand: 'pessoa,fechamento' })

    // Se houver fechamento associado, atualizar para 'NF recebida'
    if (rec.fechamento) {
      try {
        const fech = await pb.collection('fechamentos_competencia').getOne(rec.fechamento)
        const hist = Array.isArray(fech.historico_eventos) ? [...fech.historico_eventos] : []
        hist.push({
          data: new Date().toISOString(),
          autor: rec.expand?.pessoa?.nome || 'Prestador',
          acao: 'Upload da NF',
          observacao: `Arquivo da NF ${numeroNf || ''} recebido e pronto para conciliação.`,
        })

        await pb.collection('fechamentos_competencia').update(rec.fechamento, {
          status_ciclo: 'NF recebida',
          historico_eventos: hist,
        })
      } catch (err) {
        console.warn('Erro ao atualizar fechamento pós upload NF:', err)
      }
    }

    return rec
  },

  async conciliarNf(nfId: string, usuarioNome: string): Promise<NotaFiscalLoteItem> {
    const rec = await pb.collection('notas_fiscais').update<NotaFiscalLoteItem>(
      nfId,
      {
        status: 'Conciliada',
        data_conciliacao: new Date().toISOString(),
        conciliado_por: usuarioNome,
      },
      { expand: 'pessoa,fechamento' },
    )

    // Se houver fechamento, concluir o ciclo como 'Fechado'
    if (rec.fechamento) {
      try {
        const fech = await pb.collection('fechamentos_competencia').getOne(rec.fechamento)
        const hist = Array.isArray(fech.historico_eventos) ? [...fech.historico_eventos] : []
        hist.push({
          data: new Date().toISOString(),
          autor: usuarioNome,
          acao: 'Conciliação e Fechamento',
          observacao: `NF ${rec.numero_nf || ''} conciliada. Ciclo de competência encerrado.`,
        })

        await pb.collection('fechamentos_competencia').update(rec.fechamento, {
          status_ciclo: 'Fechado',
          historico_eventos: hist,
        })
      } catch (err) {
        console.warn('Erro ao concluir ciclo de fechamento:', err)
      }
    }

    return rec
  },

  obterUrlArquivoNf(record: RecordModel, filename?: string): string {
    if (!filename) return ''
    return pb.files.getURL(record, filename)
  },
}
