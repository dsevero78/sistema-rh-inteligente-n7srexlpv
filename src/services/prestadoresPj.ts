import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface PrestadorPJ extends RecordModel {
  razao_social: string
  nome_fantasia?: string
  cnpj: string
  area_atuacao: string
  contato_nome?: string
  contato_email?: string
  contato_telefone?: string
  endereco?: string
  dados_bancarios?: string
  banco?: string
  regime_tributario?: 'Simples Nacional' | 'Lucro Presumido' | 'Lucro Real' | 'MEI'
  status: 'Ativo' | 'Em renovação' | 'Pausado' | 'Encerrado'
  observacoes?: string
  contrato_social_anexo?: string
  data_inicio_parceria?: string
  media_avaliacao?: number
  total_avaliacoes?: number
}

export interface ContratoPJ extends RecordModel {
  prestador: string
  titulo: string
  numero_contrato?: string
  valor: number
  tipo: 'Mensal' | 'Por hora' | 'Por projeto'
  data_inicio: string
  data_fim: string
  status: 'Vigente' | 'Vencendo' | 'Renovado' | 'Encerrado' | 'Rescindido'
  gestor_responsavel?: string
  gestor_nome?: string
  clausulas_resumo?: string
  contrato_assinado_anexo?: string
  expand?: {
    prestador?: PrestadorPJ
  }
}

export interface DocumentoPJ extends RecordModel {
  prestador: string
  tipo_documento:
    | 'Contrato social'
    | 'Certidão negativa federal'
    | 'Certidão estadual/municipal'
    | 'FGTS/CRF'
    | 'CNDT'
    | 'Certificado digital'
    | 'Outro'
  titulo_personalizado?: string
  data_emissao?: string
  data_validade?: string
  anexo?: string
  status_calculado?: 'Válido' | 'Vencendo' | 'Vencido' | 'Sem validade'
  observacao?: string
}

export interface NotaFiscalPJ extends RecordModel {
  prestador: string
  contrato?: string
  numero_nf: string
  competencia: string // MM/AAAA
  valor: number
  data_emissao: string
  data_vencimento: string
  data_pagamento?: string
  status:
    | 'Recebida'
    | 'Em conferência'
    | 'Aprovada para pagamento'
    | 'Paga'
    | 'Atrasada'
    | 'Glosada'
  anexo?: string
  motivo_glosa?: string
  observacao?: string
  expand?: {
    prestador?: PrestadorPJ
    contrato?: ContratoPJ
  }
}

export interface AvaliacaoPrestadorPJ extends RecordModel {
  prestador: string
  contrato?: string
  avaliador?: string
  avaliador_nome?: string
  periodo_avaliado: string
  nota_qualidade_tecnica: number
  nota_prazo: number
  nota_comunicacao: number
  nota_aderencia_cultural: number
  nota_media: number
  recomendacao: 'Continuar' | 'Renovar com ressalvas' | 'Não renovar'
  comentario?: string
  pontos_fortes?: string
  pontos_melhoria?: string
  expand?: {
    prestador?: PrestadorPJ
    contrato?: ContratoPJ
  }
}

// Validação de CNPJ brasileiro com dígitos verificadores
export function validarCNPJ(cnpjRaw: string): boolean {
  if (!cnpjRaw) return false
  const cnpj = cnpjRaw.replace(/[^\d]+/g, '')
  if (cnpj.length !== 14) return false

  // Elimina CNPJs conhecidos inválidos
  if (/^(\d)\1+$/.test(cnpj)) return false

  // Valida 1º dígito
  let tamanho = cnpj.length - 2
  let numeros = cnpj.substring(0, tamanho)
  const digitos = cnpj.substring(tamanho)
  let soma = 0
  let pos = tamanho - 7
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--
    if (pos < 2) pos = 9
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== parseInt(digitos.charAt(0), 10)) return false

  // Valida 2º dígito
  tamanho = tamanho + 1
  numeros = cnpj.substring(0, tamanho)
  soma = 0
  pos = tamanho - 7
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--
    if (pos < 2) pos = 9
  }
  resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== parseInt(digitos.charAt(1), 10)) return false

  return true
}

// Máscara de CNPJ: 00.000.000/0000-00
export function formatarCNPJ(valor: string): string {
  const digits = valor.replace(/\D/g, '').substring(0, 14)
  if (!digits) return ''
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

// Helper para calcular status visual do documento a partir da data de validade
export function calcularStatusDocumento(
  dataValidade?: string,
): 'Válido' | 'Vencendo' | 'Vencido' | 'Sem validade' {
  if (!dataValidade) return 'Sem validade'
  const agora = new Date()
  const val = new Date(dataValidade)
  const diffDias = Math.ceil((val.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDias < 0) return 'Vencido'
  if (diffDias <= 30) return 'Vencendo'
  return 'Válido'
}

// Helper para obter URL do arquivo no PocketBase
export function getAnexoUrl(record: RecordModel, filename?: string): string {
  if (!filename) return ''
  return pb.files.getURL(record, filename)
}

// ============================================================================
// Métodos de Acesso ao PocketBase
// ============================================================================

export const prestadoresService = {
  // Listar prestadores
  async listarPrestadores(): Promise<PrestadorPJ[]> {
    return await pb.collection('prestadores_pj').getFullList<PrestadorPJ>({
      sort: '-created',
    })
  },

  // Obter detalhes de um prestador
  async obterPrestador(id: string): Promise<PrestadorPJ> {
    return await pb.collection('prestadores_pj').getOne<PrestadorPJ>(id)
  },

  // Criar prestador (com suporte a upload)
  async criarPrestador(dados: Partial<PrestadorPJ>, anexoFile?: File): Promise<PrestadorPJ> {
    if (anexoFile) {
      const formData = new FormData()
      Object.entries(dados).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          formData.append(k, String(v))
        }
      })
      formData.append('contrato_social_anexo', anexoFile)
      return await pb.collection('prestadores_pj').create<PrestadorPJ>(formData)
    }
    return await pb.collection('prestadores_pj').create<PrestadorPJ>(dados)
  },

  // Atualizar prestador
  async atualizarPrestador(
    id: string,
    dados: Partial<PrestadorPJ>,
    anexoFile?: File,
  ): Promise<PrestadorPJ> {
    if (anexoFile) {
      const formData = new FormData()
      Object.entries(dados).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          formData.append(k, String(v))
        }
      })
      formData.append('contrato_social_anexo', anexoFile)
      return await pb.collection('prestadores_pj').update<PrestadorPJ>(id, formData)
    }
    return await pb.collection('prestadores_pj').update<PrestadorPJ>(id, dados)
  },

  // Validação de dependências antes da exclusão
  async verificarDependenciasExclusao(prestadorId: string): Promise<{
    podeExcluir: boolean
    motivo?: string
    contratosAbertos: number
    nfsAbertas: number
  }> {
    const [contratos, nfs] = await Promise.all([
      pb.collection('contratos_pj').getFullList({
        filter: `prestador = '${prestadorId}' && (status = 'Vigente' || status = 'Vencendo')`,
      }),
      pb.collection('notas_fiscais_pj').getFullList({
        filter: `prestador = '${prestadorId}' && status != 'Paga' && status != 'Glosada'`,
      }),
    ])

    if (contratos.length > 0 || nfs.length > 0) {
      return {
        podeExcluir: false,
        motivo: `O prestador possui ${contratos.length} contrato(s) ativo(s) e ${nfs.length} nota(s) fiscal(is) pendente(s) de liquidação. Finalize ou encerre os contratos e notas antes de remover.`,
        contratosAbertos: contratos.length,
        nfsAbertas: nfs.length,
      }
    }

    return { podeExcluir: true, contratosAbertos: 0, nfsAbertas: 0 }
  },

  // Excluir prestador
  async excluirPrestador(id: string): Promise<boolean> {
    return await pb.collection('prestadores_pj').delete(id)
  },

  // --------------------------------------------------------------------------
  // Contratos PJ
  // --------------------------------------------------------------------------
  async listarContratos(prestadorId?: string): Promise<ContratoPJ[]> {
    const filter = prestadorId ? `prestador = '${prestadorId}'` : ''
    return await pb.collection('contratos_pj').getFullList<ContratoPJ>({
      filter,
      sort: '-data_inicio',
      expand: 'prestador',
    })
  },

  async criarContrato(dados: Partial<ContratoPJ>, anexoFile?: File): Promise<ContratoPJ> {
    if (anexoFile) {
      const formData = new FormData()
      Object.entries(dados).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          formData.append(k, String(v))
        }
      })
      formData.append('contrato_assinado_anexo', anexoFile)
      return await pb.collection('contratos_pj').create<ContratoPJ>(formData)
    }
    return await pb.collection('contratos_pj').create<ContratoPJ>(dados)
  },

  async atualizarContrato(
    id: string,
    dados: Partial<ContratoPJ>,
    anexoFile?: File,
  ): Promise<ContratoPJ> {
    if (anexoFile) {
      const formData = new FormData()
      Object.entries(dados).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          formData.append(k, String(v))
        }
      })
      formData.append('contrato_assinado_anexo', anexoFile)
      return await pb.collection('contratos_pj').update<ContratoPJ>(id, formData)
    }
    return await pb.collection('contratos_pj').update<ContratoPJ>(id, dados)
  },

  async excluirContrato(id: string): Promise<boolean> {
    return await pb.collection('contratos_pj').delete(id)
  },

  // --------------------------------------------------------------------------
  // Documentos PJ
  // --------------------------------------------------------------------------
  async listarDocumentos(prestadorId?: string): Promise<DocumentoPJ[]> {
    const filter = prestadorId ? `prestador = '${prestadorId}'` : ''
    return await pb.collection('documentos_pj').getFullList<DocumentoPJ>({
      filter,
      sort: '-created',
    })
  },

  async criarDocumento(dados: Partial<DocumentoPJ>, anexoFile?: File): Promise<DocumentoPJ> {
    const statusCalc = calcularStatusDocumento(dados.data_validade)
    const dadosAtualizados = { ...dados, status_calculado: statusCalc }

    if (anexoFile) {
      const formData = new FormData()
      Object.entries(dadosAtualizados).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          formData.append(k, String(v))
        }
      })
      formData.append('anexo', anexoFile)
      return await pb.collection('documentos_pj').create<DocumentoPJ>(formData)
    }
    return await pb.collection('documentos_pj').create<DocumentoPJ>(dadosAtualizados)
  },

  async atualizarDocumento(
    id: string,
    dados: Partial<DocumentoPJ>,
    anexoFile?: File,
  ): Promise<DocumentoPJ> {
    let statusCalc = dados.status_calculado
    if (dados.data_validade) {
      statusCalc = calcularStatusDocumento(dados.data_validade)
    }
    const dadosAtualizados = { ...dados, status_calculado: statusCalc }

    if (anexoFile) {
      const formData = new FormData()
      Object.entries(dadosAtualizados).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          formData.append(k, String(v))
        }
      })
      formData.append('anexo', anexoFile)
      return await pb.collection('documentos_pj').update<DocumentoPJ>(id, formData)
    }
    return await pb.collection('documentos_pj').update<DocumentoPJ>(id, dadosAtualizados)
  },

  async excluirDocumento(id: string): Promise<boolean> {
    return await pb.collection('documentos_pj').delete(id)
  },

  // --------------------------------------------------------------------------
  // Notas Fiscais PJ
  // --------------------------------------------------------------------------
  async listarNotasFiscais(prestadorId?: string): Promise<NotaFiscalPJ[]> {
    const filter = prestadorId ? `prestador = '${prestadorId}'` : ''
    return await pb.collection('notas_fiscais_pj').getFullList<NotaFiscalPJ>({
      filter,
      sort: '-data_emissao',
      expand: 'prestador,contrato',
    })
  },

  async criarNotaFiscal(dados: Partial<NotaFiscalPJ>, anexoFile?: File): Promise<NotaFiscalPJ> {
    if (anexoFile) {
      const formData = new FormData()
      Object.entries(dados).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          formData.append(k, String(v))
        }
      })
      formData.append('anexo', anexoFile)
      return await pb.collection('notas_fiscais_pj').create<NotaFiscalPJ>(formData)
    }
    return await pb.collection('notas_fiscais_pj').create<NotaFiscalPJ>(dados)
  },

  async atualizarNotaFiscal(
    id: string,
    dados: Partial<NotaFiscalPJ>,
    anexoFile?: File,
  ): Promise<NotaFiscalPJ> {
    if (anexoFile) {
      const formData = new FormData()
      Object.entries(dados).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          formData.append(k, String(v))
        }
      })
      formData.append('anexo', anexoFile)
      return await pb.collection('notas_fiscais_pj').update<NotaFiscalPJ>(id, formData)
    }
    return await pb.collection('notas_fiscais_pj').update<NotaFiscalPJ>(id, dados)
  },

  async excluirNotaFiscal(id: string): Promise<boolean> {
    return await pb.collection('notas_fiscais_pj').delete(id)
  },

  // --------------------------------------------------------------------------
  // Avaliações de Desempenho PJ
  // --------------------------------------------------------------------------
  async listarAvaliacoes(prestadorId?: string): Promise<AvaliacaoPrestadorPJ[]> {
    const filter = prestadorId ? `prestador = '${prestadorId}'` : ''
    return await pb.collection('avaliacoes_prestador_pj').getFullList<AvaliacaoPrestadorPJ>({
      filter,
      sort: '-created',
      expand: 'prestador,contrato',
    })
  },

  async criarAvaliacao(dados: {
    prestador: string
    contrato?: string
    avaliador?: string
    avaliador_nome?: string
    periodo_avaliado: string
    nota_qualidade_tecnica: number
    nota_prazo: number
    nota_comunicacao: number
    nota_aderencia_cultural: number
    recomendacao: 'Continuar' | 'Renovar com ressalvas' | 'Não renovar'
    comentario?: string
    pontos_fortes?: string
    pontos_melhoria?: string
  }): Promise<AvaliacaoPrestadorPJ> {
    const media = Number(
      (
        (dados.nota_qualidade_tecnica +
          dados.nota_prazo +
          dados.nota_comunicacao +
          dados.nota_aderencia_cultural) /
        4
      ).toFixed(1),
    )

    const novaAvaliacao = await pb
      .collection('avaliacoes_prestador_pj')
      .create<AvaliacaoPrestadorPJ>({
        ...dados,
        nota_media: media,
      })

    // Recalcular média no cadastro do prestador
    try {
      const todas = await pb.collection('avaliacoes_prestador_pj').getFullList({
        filter: `prestador = '${dados.prestador}'`,
      })
      const somaMedias = todas.reduce((acc, cur) => acc + (cur.nota_media || 0), 0)
      const mediaGeral = todas.length > 0 ? Number((somaMedias / todas.length).toFixed(1)) : 0

      await pb.collection('prestadores_pj').update(dados.prestador, {
        media_avaliacao: mediaGeral,
        total_avaliacoes: todas.length,
      })
    } catch (errRecalc) {
      console.warn('Aviso ao recalcular média do prestador:', errRecalc)
    }

    return novaAvaliacao
  },

  // Disparo manual da varredura de pendências PJ
  async executarVarreduraPJ(): Promise<{
    success: boolean
    alertas_gerados: number
    mensagem: string
  }> {
    return await pb.send('/backend/v1/prestadores-pj/varredura', {
      method: 'POST',
    })
  },
}
