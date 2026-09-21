import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import {
  TEMPLATES_CONTRATUAIS,
  type TemplateContrato,
  PLACEHOLDERS_SUPORTADOS,
} from './templatesContrato'

export interface ModeloContratoRegistro extends RecordModel {
  nome: string
  modalidade: 'PJ' | 'CLT'
  tipo_modelo:
    | 'PJ_PRESTACAO_SERVICOS'
    | 'PJ_HORISTA'
    | 'CLT_EXPERIENCIA'
    | 'CLT_INDETERMINADO'
    | 'CLT_TELETRABALHO'
    | 'OUTRO'
  descricao?: string
  corpo_texto: string
  tags?: string[]
  dias_alerta_padrao?: number
  prazo_tipo_sugerido?: 'Indeterminado' | 'Determinado' | 'Experiencia 45+45' | 'Projeto Especifico'
  ativo?: boolean
  eh_padrao_sistema?: boolean
  criado_por_nome?: string
  criado_por_usuario?: string
  created: string
  updated: string
}

export interface CriarModeloContratoInput {
  nome: string
  modalidade: 'PJ' | 'CLT'
  tipo_modelo:
    | 'PJ_PRESTACAO_SERVICOS'
    | 'PJ_HORISTA'
    | 'CLT_EXPERIENCIA'
    | 'CLT_INDETERMINADO'
    | 'CLT_TELETRABALHO'
    | 'OUTRO'
  descricao?: string
  corpo_texto: string
  tags?: string[]
  dias_alerta_padrao?: number
  prazo_tipo_sugerido?: 'Indeterminado' | 'Determinado' | 'Experiencia 45+45' | 'Projeto Especifico'
  ativo?: boolean
  criado_por_nome?: string
  criado_por_usuario?: string
}

export interface AtualizarModeloContratoInput {
  nome?: string
  modalidade?: 'PJ' | 'CLT'
  tipo_modelo?:
    | 'PJ_PRESTACAO_SERVICOS'
    | 'PJ_HORISTA'
    | 'CLT_EXPERIENCIA'
    | 'CLT_INDETERMINADO'
    | 'CLT_TELETRABALHO'
    | 'OUTRO'
  descricao?: string
  corpo_texto?: string
  tags?: string[]
  dias_alerta_padrao?: number
  prazo_tipo_sugerido?: 'Indeterminado' | 'Determinado' | 'Experiencia 45+45' | 'Projeto Especifico'
  ativo?: boolean
}

/**
 * Converte um registro do banco para a interface unificada de exibição TemplateContrato
 */
export function converterRegistroParaTemplate(reg: ModeloContratoRegistro): TemplateContrato {
  return {
    id: reg.id,
    titulo: reg.nome,
    modalidade: reg.modalidade,
    tipoModelo: reg.tipo_modelo,
    descricaoBreve: reg.descricao || '',
    tagsJuridicas: Array.isArray(reg.tags) ? reg.tags : [],
    diasAlertaPadrao: reg.dias_alerta_padrao || (reg.modalidade === 'PJ' ? 60 : 15),
    prazoTipoSugerido: reg.prazo_tipo_sugerido || 'Determinado',
    conteudoPadrao: reg.corpo_texto,
    ehPadraoSistema: !!reg.eh_padrao_sistema,
    ativo: reg.ativo !== false,
    criadoPorNome: reg.criado_por_nome,
    dataAtualizacao: reg.updated,
  }
}

export const modelosContratoService = {
  getPlaceholdersSuportados() {
    return PLACEHOLDERS_SUPORTADOS
  },

  async listarTodos(apenasAtivos = false): Promise<TemplateContrato[]> {
    try {
      const filter = apenasAtivos ? 'ativo = true' : undefined
      const records = await pb.collection('modelos_contrato').getFullList<ModeloContratoRegistro>({
        filter,
        sort: '-eh_padrao_sistema,-created',
      })

      if (records.length === 0) {
        // Fallback defensivo com os templates em código
        return TEMPLATES_CONTRATUAIS
      }

      return records.map(converterRegistroParaTemplate)
    } catch (err) {
      console.warn('Erro ao carregar modelos do banco, usando fallback:', err)
      return TEMPLATES_CONTRATUAIS
    }
  },

  async listarPorModalidade(
    modalidade: 'PJ' | 'CLT',
    apenasAtivos = true,
  ): Promise<TemplateContrato[]> {
    const todos = await this.listarTodos(apenasAtivos)
    return todos.filter(
      (t) => t.modalidade === modalidade && (apenasAtivos ? t.ativo !== false : true),
    )
  },

  async obterPorId(id: string): Promise<TemplateContrato | null> {
    try {
      // Primeiro tenta buscar na base
      const record = await pb.collection('modelos_contrato').getOne<ModeloContratoRegistro>(id)
      return converterRegistroParaTemplate(record)
    } catch {
      // Fallback em memória pelos IDs legados
      const fallback = TEMPLATES_CONTRATUAIS.find((t) => t.id === id)
      return fallback || null
    }
  },

  async criarModelo(input: CriarModeloContratoInput): Promise<TemplateContrato | null> {
    try {
      const record = await pb.collection('modelos_contrato').create<ModeloContratoRegistro>({
        nome: input.nome,
        modalidade: input.modalidade,
        tipo_modelo: input.tipo_modelo,
        descricao: input.descricao,
        corpo_texto: input.corpo_texto,
        tags: input.tags || [],
        dias_alerta_padrao: input.dias_alerta_padrao || (input.modalidade === 'PJ' ? 60 : 15),
        prazo_tipo_sugerido: input.prazo_tipo_sugerido || 'Determinado',
        ativo: input.ativo !== false,
        eh_padrao_sistema: false,
        criado_por_nome: input.criado_por_nome || 'Usuário',
        criado_por_usuario: input.criado_por_usuario || undefined,
      })

      return converterRegistroParaTemplate(record)
    } catch (err) {
      console.error('Erro ao criar modelo de contrato:', err)
      throw err
    }
  },

  async atualizarModelo(
    id: string,
    input: AtualizarModeloContratoInput,
  ): Promise<TemplateContrato | null> {
    try {
      const record = await pb.collection('modelos_contrato').update<ModeloContratoRegistro>(id, {
        ...(input.nome ? { nome: input.nome } : {}),
        ...(input.modalidade ? { modalidade: input.modalidade } : {}),
        ...(input.tipo_modelo ? { tipo_modelo: input.tipo_modelo } : {}),
        ...(input.descricao !== undefined ? { descricao: input.descricao } : {}),
        ...(input.corpo_texto ? { corpo_texto: input.corpo_texto } : {}),
        ...(input.tags ? { tags: input.tags } : {}),
        ...(input.dias_alerta_padrao !== undefined
          ? { dias_alerta_padrao: input.dias_alerta_padrao }
          : {}),
        ...(input.prazo_tipo_sugerido ? { prazo_tipo_sugerido: input.prazo_tipo_sugerido } : {}),
        ...(input.ativo !== undefined ? { ativo: input.ativo } : {}),
      })

      return converterRegistroParaTemplate(record)
    } catch (err) {
      console.error('Erro ao atualizar modelo de contrato:', err)
      throw err
    }
  },

  async duplicarModelo(
    id: string,
    autorNome = 'Usuário',
    autorId?: string,
  ): Promise<TemplateContrato | null> {
    const original = await this.obterPorId(id)
    if (!original) throw new Error('Modelo original não encontrado.')

    return await this.criarModelo({
      nome: `${original.titulo} (Cópia)`,
      modalidade: original.modalidade,
      tipo_modelo: original.tipoModelo,
      descricao: `Cópia criada a partir do modelo "${original.titulo}". ${original.descricaoBreve || ''}`,
      corpo_texto: original.conteudoPadrao,
      tags: [...original.tagsJuridicas, 'Personalizado'],
      dias_alerta_padrao: original.diasAlertaPadrao,
      prazo_tipo_sugerido: original.prazoTipoSugerido,
      ativo: true,
      criado_por_nome: autorNome,
      criado_por_usuario: autorId,
    })
  },

  async alternarStatusAtivo(id: string, ativoAtual: boolean): Promise<boolean> {
    try {
      await pb.collection('modelos_contrato').update(id, {
        ativo: !ativoAtual,
      })
      return true
    } catch (err) {
      console.error('Erro ao alternar status do modelo:', err)
      return false
    }
  },

  async excluirModelo(id: string): Promise<boolean> {
    try {
      const mod = await this.obterPorId(id)
      if (mod?.ehPadraoSistema) {
        throw new Error(
          'Modelos padrão do sistema não podem ser excluídos. Você pode desativá-los.',
        )
      }
      await pb.collection('modelos_contrato').delete(id)
      return true
    } catch (err) {
      console.error('Erro ao excluir modelo:', err)
      throw err
    }
  },
}
