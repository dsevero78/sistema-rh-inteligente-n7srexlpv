import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export type EtapaLifecyclePJ = 'Entrada' | 'Ativo' | 'Mudanças' | 'Saída'
export type StatusMarcoLifecycle =
  | 'REGISTRADO'
  | 'PENDENTE DO PJ'
  | 'PENDENTE DA EMPRESA'
  | 'NÃO ENVIADO'

export interface AuditoriaMarcoItem {
  status: StatusMarcoLifecycle
  data: string
  autor?: string
  obs?: string
}

export type CategoriaTimelinePJ = 'REGISTRO' | 'DOCUMENTOS' | 'GESTÃO' | 'AUSÊNCIAS' | 'AVALIAÇÃO'

export interface EventoTimelinePJ extends RecordModel {
  prestador: string
  categoria: CategoriaTimelinePJ
  titulo: string
  complemento?: string
  autor: string
  origem: 'sistema' | 'usuario'
  data_evento: string
  referencia_tipo?: string
  referencia_id?: string
  expand?: {
    prestador?: PrestadorPJ
  }
}

export interface MarcoLifecyclePJ extends RecordModel {
  prestador: string
  etapa: EtapaLifecyclePJ
  chave_marco: string
  nome_marco: string
  ordem: number
  status: StatusMarcoLifecycle
  data_conclusao?: string
  responsavel?: string
  observacao?: string
  historico_auditoria?: AuditoriaMarcoItem[]
}

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
  etapa_lifecycle?: EtapaLifecyclePJ
  observacoes?: string
  contrato_social_anexo?: string
  data_inicio_parceria?: string
  media_avaliacao?: number
  total_avaliacoes?: number
  valor_mensal_atual?: number
}

export type TipoAditivoPJ =
  | 'Reajuste de valor'
  | 'Prolongamento de vigência'
  | 'Reajuste e Prolongamento'
  | 'Mudança de escopo'
  | 'Outro'

export type StatusAditivoPJ = 'Rascunho' | 'Pendente de assinatura' | 'Vigente'

export interface AditivoPJ extends RecordModel {
  numero_aditivo: string
  sequencia: number
  tipo: TipoAditivoPJ
  contrato: string
  prestador: string
  data_assinatura?: string
  nova_vigencia_fim?: string
  novo_valor_mensal?: number
  valor_anterior?: number
  vigencia_anterior_fim?: string
  descricao?: string
  status: StatusAditivoPJ
  anexo_aditivo?: string
  expand?: {
    contrato?: ContratoPJ
    prestador?: PrestadorPJ
  }
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
  contador_aditivos?: number
  expand?: {
    prestador?: PrestadorPJ
    aditivos_pj_via_contrato?: AditivoPJ[]
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

// ----------------------------------------------------------------------------
// Cálculos Financeiros: Valor Mensal Atual e Valor-Hora (Base 160h/mês)
// ----------------------------------------------------------------------------
export const HORAS_MES_PADRAO = 160

/**
 * Recalcula o valor-hora dividindo pela premissa base de 160 horas.
 */
export function calcularValorHoraPor160(valorMensal?: number | null): number {
  if (!valorMensal || valorMensal <= 0) return 0
  return Number((valorMensal / HORAS_MES_PADRAO).toFixed(2))
}

/**
 * Retorna o valor mensal atual efetivo de um prestador considerando:
 * 1. O campo `valor_mensal_atual` configurado no cadastro do prestador
 * 2. Caso não esteja configurado, o último aditivo vigente do contrato
 * 3. O valor base do contrato
 */
export function obterValorMensalPrestador(
  prestador?: PrestadorPJ | null,
  contrato?: ContratoPJ | null,
  aditivos: AditivoPJ[] = [],
): number {
  if (!prestador && !contrato) return 0

  // Se o prestador já tiver valor_mensal_atual configurado explicitamente no seu cadastro
  if (
    prestador &&
    typeof prestador.valor_mensal_atual === 'number' &&
    prestador.valor_mensal_atual > 0
  ) {
    return prestador.valor_mensal_atual
  }

  if (contrato) {
    return calcularValorMensalEfetivo(contrato, aditivos)
  }

  return 0
}

/**
 * Retorna o valor mensal atual efetivo de um contrato,
 * considerando o último aditivo Vigente que tenha reajustado o valor.
 */
export function calcularValorMensalEfetivo(
  contrato: ContratoPJ,
  aditivosDoContrato: AditivoPJ[] = [],
): number {
  if (!contrato) return 0

  // Filtrar aditivos vigentes deste contrato que tenham novo_valor_mensal definido
  const aditivosReajuste = aditivosDoContrato
    .filter(
      (a) =>
        a.contrato === contrato.id &&
        a.status === 'Vigente' &&
        (a.tipo === 'Reajuste de valor' || a.tipo === 'Reajuste e Prolongamento') &&
        typeof a.novo_valor_mensal === 'number' &&
        a.novo_valor_mensal > 0,
    )
    .sort((a, b) => (b.sequencia || 0) - (a.sequencia || 0))

  if (aditivosReajuste.length > 0 && aditivosReajuste[0].novo_valor_mensal) {
    return aditivosReajuste[0].novo_valor_mensal
  }

  return contrato.valor || 0
}

/**
 * Retorna a vigência final efetiva de um contrato,
 * considerando o último aditivo Vigente que tenha prolongado o prazo.
 */
export function calcularVigenciaFimEfetiva(
  contrato: ContratoPJ,
  aditivosDoContrato: AditivoPJ[] = [],
): string {
  if (!contrato) return ''

  const aditivosProrrogacao = aditivosDoContrato
    .filter(
      (a) =>
        a.contrato === contrato.id &&
        a.status === 'Vigente' &&
        (a.tipo === 'Prolongamento de vigência' || a.tipo === 'Reajuste e Prolongamento') &&
        !!a.nova_vigencia_fim,
    )
    .sort((a, b) => (b.sequencia || 0) - (a.sequencia || 0))

  if (aditivosProrrogacao.length > 0 && aditivosProrrogacao[0].nova_vigencia_fim) {
    return aditivosProrrogacao[0].nova_vigencia_fim
  }

  return contrato.data_fim || ''
}

/**
 * Calcula o valor-hora considerando a premissa padrão de 160 horas no mês.
 * Formula: valorMensalAtual / 160
 * Se o contrato for 'Por hora', o valor contratado já é o valor-hora.
 */
export function calcularValorHora(
  contrato: ContratoPJ,
  aditivosDoContrato: AditivoPJ[] = [],
): {
  valorHora: number
  valorMensal: number
  premissaTexto: string
  isEstimativa: boolean
} {
  if (!contrato) {
    return { valorHora: 0, valorMensal: 0, premissaTexto: 'base 160h/mês', isEstimativa: false }
  }

  const valorMensalAtual = calcularValorMensalEfetivo(contrato, aditivosDoContrato)

  if (contrato.tipo === 'Por hora') {
    const valorHora = valorMensalAtual
    const valorMensalEstimado = valorHora * HORAS_MES_PADRAO
    return {
      valorHora,
      valorMensal: valorMensalEstimado,
      premissaTexto: 'taxa/hora (est. 160h/mês)',
      isEstimativa: true,
    }
  }

  if (contrato.tipo === 'Por projeto') {
    // Para contrato por projeto, dividimos o valor por 160h ou exibimos a média
    const valorHora = Number((valorMensalAtual / HORAS_MES_PADRAO).toFixed(2))
    return {
      valorHora,
      valorMensal: valorMensalAtual,
      premissaTexto: 'projeto (base 160h/mês)',
      isEstimativa: true,
    }
  }

  // Padrão: Mensal
  const valorHora = Number((valorMensalAtual / HORAS_MES_PADRAO).toFixed(2))
  return {
    valorHora,
    valorMensal: valorMensalAtual,
    premissaTexto: 'base 160h/mês',
    isEstimativa: false,
  }
}

/**
 * Calcula os dias restantes até o término da vigência e o status do semáforo.
 */
export function calcularPrazosContrato(
  dataInicioStr: string,
  dataFimStr: string,
): {
  diasRestantes: number
  diasTotais: number
  diasDecorridos: number
  percentualDecorrido: number
  statusSemaforo: 'verde' | 'ambar' | 'vermelho' | 'vencido'
  statusTexto: string
} {
  const agora = new Date()
  const fim = new Date(dataFimStr)
  const inicio = new Date(dataInicioStr)

  const diffMs = fim.getTime() - agora.getTime()
  const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  const totalMs = fim.getTime() - inicio.getTime()
  const diasTotais = Math.max(1, Math.ceil(totalMs / (1000 * 60 * 60 * 24)))

  const decorridoMs = agora.getTime() - inicio.getTime()
  const diasDecorridos = Math.max(0, Math.ceil(decorridoMs / (1000 * 60 * 60 * 24)))
  const percentualDecorrido = Math.min(
    100,
    Math.max(0, Math.round((diasDecorridos / diasTotais) * 100)),
  )

  if (diasRestantes < 0) {
    return {
      diasRestantes,
      diasTotais,
      diasDecorridos,
      percentualDecorrido: 100,
      statusSemaforo: 'vencido',
      statusTexto: `Vencido há ${Math.abs(diasRestantes)} dias`,
    }
  }

  if (diasRestantes <= 30) {
    return {
      diasRestantes,
      diasTotais,
      diasDecorridos,
      percentualDecorrido,
      statusSemaforo: 'vermelho',
      statusTexto: `Vencendo em ${diasRestantes} dias`,
    }
  }

  if (diasRestantes <= 60) {
    return {
      diasRestantes,
      diasTotais,
      diasDecorridos,
      percentualDecorrido,
      statusSemaforo: 'ambar',
      statusTexto: `Atenção: ${diasRestantes} dias restantes`,
    }
  }

  return {
    diasRestantes,
    diasTotais,
    diasDecorridos,
    percentualDecorrido,
    statusSemaforo: 'verde',
    statusTexto: `Vigência regular (${diasRestantes} dias)`,
  }
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
    let novoPrestador: PrestadorPJ
    if (anexoFile) {
      const formData = new FormData()
      Object.entries(dados).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          formData.append(k, String(v))
        }
      })
      formData.append('contrato_social_anexo', anexoFile)
      novoPrestador = await pb.collection('prestadores_pj').create<PrestadorPJ>(formData)
    } else {
      novoPrestador = await pb.collection('prestadores_pj').create<PrestadorPJ>(dados)
    }

    // Inicializar template de marcos
    try {
      await this.inicializarMarcosParaPrestador(novoPrestador.id, novoPrestador)
    } catch (errMarco) {
      console.warn('Aviso ao inicializar marcos do novo prestador:', errMarco)
    }

    // Registrar evento inicial na linha do tempo
    try {
      await this.criarEventoTimeline({
        prestador: novoPrestador.id,
        categoria: 'REGISTRO',
        titulo: 'Prestador PJ cadastrado:',
        complemento: `${novoPrestador.razao_social} (CNPJ: ${novoPrestador.cnpj})`,
        autor: 'Gestor RH',
        origem: 'usuario',
        data_evento: new Date().toISOString(),
        referencia_tipo: 'prestador',
        referencia_id: novoPrestador.id,
      })
    } catch (errTime) {
      console.warn('Aviso ao registrar evento de cadastro do prestador:', errTime)
    }

    return novoPrestador
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
    let novoContrato: ContratoPJ
    if (anexoFile) {
      const formData = new FormData()
      Object.entries(dados).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          formData.append(k, String(v))
        }
      })
      formData.append('contrato_assinado_anexo', anexoFile)
      novoContrato = await pb.collection('contratos_pj').create<ContratoPJ>(formData)
    } else {
      novoContrato = await pb.collection('contratos_pj').create<ContratoPJ>(dados)
    }

    // Registrar evento na linha do tempo do prestador
    try {
      if (novoContrato.prestador) {
        const valFormat = novoContrato.valor
          ? `R$ ${novoContrato.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : ''
        const inicioFormat = novoContrato.data_inicio
          ? new Date(novoContrato.data_inicio).toLocaleDateString('pt-BR')
          : ''

        await this.criarEventoTimeline({
          prestador: novoContrato.prestador,
          categoria: 'REGISTRO',
          titulo: 'Novo contrato firmado:',
          complemento: `${novoContrato.titulo}${inicioFormat ? `, início em ${inicioFormat}` : ''}${valFormat ? `, ${valFormat}` : ''}`,
          autor: novoContrato.gestor_nome || 'Gestor RH',
          origem: 'usuario',
          data_evento: new Date().toISOString(),
          referencia_tipo: 'contrato',
          referencia_id: novoContrato.id,
        })
      }
    } catch (errTime) {
      console.warn('Aviso ao registrar evento de contrato na linha do tempo:', errTime)
    }

    return novoContrato
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
  // Aditivos Contratuais PJ
  // --------------------------------------------------------------------------
  async listarAditivos(filtros?: {
    prestadorId?: string
    contratoId?: string
  }): Promise<AditivoPJ[]> {
    const parts: string[] = []
    if (filtros?.prestadorId) parts.push(`prestador = '${filtros.prestadorId}'`)
    if (filtros?.contratoId) parts.push(`contrato = '${filtros.contratoId}'`)
    const filter = parts.join(' && ')

    return await pb.collection('aditivos_pj').getFullList<AditivoPJ>({
      filter,
      sort: '-sequencia,-created',
      expand: 'contrato,prestador',
    })
  },

  async obterAditivo(id: string): Promise<AditivoPJ> {
    return await pb.collection('aditivos_pj').getOne<AditivoPJ>(id, {
      expand: 'contrato,prestador',
    })
  },

  async criarAditivo(dados: Partial<AditivoPJ>, anexoFile?: File): Promise<AditivoPJ> {
    // Se não informou sequência, autocalcular pelo contrato
    let sequencia = dados.sequencia
    if (!sequencia && dados.contrato) {
      try {
        const existentes = await pb.collection('aditivos_pj').getFullList<AditivoPJ>({
          filter: `contrato = '${dados.contrato}'`,
          sort: '-sequencia',
          fields: 'sequencia',
        })
        sequencia = existentes.length > 0 ? (existentes[0].sequencia || 0) + 1 : 1
      } catch (_) {
        sequencia = 1
      }
    }

    const payload: Partial<AditivoPJ> = {
      ...dados,
      sequencia: sequencia || 1,
    }

    let criado: AditivoPJ
    if (anexoFile) {
      const formData = new FormData()
      Object.entries(payload).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          formData.append(k, String(v))
        }
      })
      formData.append('anexo_aditivo', anexoFile)
      criado = await pb.collection('aditivos_pj').create<AditivoPJ>(formData)
    } else {
      criado = await pb.collection('aditivos_pj').create<AditivoPJ>(payload)
    }

    // Se o aditivo foi criado como Vigente ou precisa atualizar o contrato
    await this.sincronizarEfeitosAditivo(criado)

    // Registrar evento na linha do tempo PJ com o delta exato
    try {
      if (criado.prestador) {
        let tituloAdit = `Aditivo ${criado.numero_aditivo || ''} formalizado:`
        let complementoAdit = criado.descricao || criado.tipo

        if (
          (criado.tipo === 'Reajuste de valor' || criado.tipo === 'Reajuste e Prolongamento') &&
          criado.novo_valor_mensal &&
          criado.valor_anterior
        ) {
          const deStr = `R$ ${Math.round(criado.valor_anterior).toLocaleString('pt-BR')}`
          const paraStr = `R$ ${Math.round(criado.novo_valor_mensal).toLocaleString('pt-BR')}`
          tituloAdit = criado.status === 'Vigente' ? 'Reajuste aprovado:' : 'Reajuste proposto:'
          complementoAdit = `de ${deStr} para ${paraStr} (${criado.numero_aditivo})`
        } else if (criado.tipo === 'Prolongamento de vigência' && criado.nova_vigencia_fim) {
          const dataFimStr = new Date(criado.nova_vigencia_fim).toLocaleDateString('pt-BR')
          tituloAdit = 'Vigência prorrogada:'
          complementoAdit = `até ${dataFimStr} formalizada pelo ${criado.numero_aditivo}`
        }

        await this.criarEventoTimeline({
          prestador: criado.prestador,
          categoria: 'REGISTRO',
          titulo: tituloAdit,
          complemento: complementoAdit,
          autor: 'Gestor RH',
          origem: 'usuario',
          data_evento: new Date().toISOString(),
          referencia_tipo: 'aditivo',
          referencia_id: criado.id,
        })
      }
    } catch (errTime) {
      console.warn('Aviso ao registrar evento de aditivo na linha do tempo:', errTime)
    }

    return criado
  },

  async atualizarAditivo(
    id: string,
    dados: Partial<AditivoPJ>,
    anexoFile?: File,
  ): Promise<AditivoPJ> {
    let atualizado: AditivoPJ
    if (anexoFile) {
      const formData = new FormData()
      Object.entries(dados).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          formData.append(k, String(v))
        }
      })
      formData.append('anexo_aditivo', anexoFile)
      atualizado = await pb.collection('aditivos_pj').update<AditivoPJ>(id, formData)
    } else {
      atualizado = await pb.collection('aditivos_pj').update<AditivoPJ>(id, dados)
    }

    await this.sincronizarEfeitosAditivo(atualizado)

    return atualizado
  },

  async excluirAditivo(id: string): Promise<boolean> {
    const aditivo = await pb.collection('aditivos_pj').getOne<AditivoPJ>(id)
    const contratoId = aditivo.contrato
    const res = await pb.collection('aditivos_pj').delete(id)

    // Recalcular contador no contrato
    if (contratoId) {
      try {
        const restantes = await pb.collection('aditivos_pj').getFullList({
          filter: `contrato = '${contratoId}'`,
        })
        await pb.collection('contratos_pj').update(contratoId, {
          contador_aditivos: restantes.length,
        })
      } catch (errRecalc) {
        console.warn('Aviso ao recalcular contador do contrato após exclusão:', errRecalc)
      }
    }

    return res
  },

  /**
   * Sincroniza os efeitos colaterais de um aditivo:
   * 1. Atualiza o contador de aditivos no contrato vinculado.
   * 2. Se o aditivo estiver com status 'Vigente':
   *    - Reajuste de valor -> atualiza valor no contrato_pj
   *    - Prolongamento de vigência -> atualiza data_fim no contrato_pj
   *    - Reajuste e Prolongamento -> atualiza ambos
   * 3. Se estiver 'Pendente de assinatura', atualiza o marco de lifecycle correspondente.
   */
  async sincronizarEfeitosAditivo(aditivo: AditivoPJ): Promise<void> {
    if (!aditivo.contrato) return

    try {
      const [todosDoContrato, contratoAtual] = await Promise.all([
        pb.collection('aditivos_pj').getFullList<AditivoPJ>({
          filter: `contrato = '${aditivo.contrato}'`,
          sort: 'sequencia',
        }),
        pb.collection('contratos_pj').getOne<ContratoPJ>(aditivo.contrato),
      ])

      const patchContrato: Partial<ContratoPJ> = {
        contador_aditivos: todosDoContrato.length,
      }

      // Se aditivo está Vigente, aplicar seus efeitos no contrato
      if (aditivo.status === 'Vigente') {
        const reajustaValor =
          aditivo.tipo === 'Reajuste de valor' || aditivo.tipo === 'Reajuste e Prolongamento'
        const prorrogaVigencia =
          aditivo.tipo === 'Prolongamento de vigência' ||
          aditivo.tipo === 'Reajuste e Prolongamento'

        if (
          reajustaValor &&
          typeof aditivo.novo_valor_mensal === 'number' &&
          aditivo.novo_valor_mensal > 0
        ) {
          patchContrato.valor = aditivo.novo_valor_mensal
        }

        if (prorrogaVigencia && aditivo.nova_vigencia_fim) {
          patchContrato.data_fim = aditivo.nova_vigencia_fim
          // Se estava 'Vencendo', verificar se agora tem mais de 30 dias
          const fimNova = new Date(aditivo.nova_vigencia_fim)
          const diffDias = Math.ceil(
            (fimNova.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24),
          )
          if (diffDias > 30 && contratoAtual.status === 'Vencendo') {
            patchContrato.status = 'Vigente'
          }
        }
      }

      await pb.collection('contratos_pj').update(aditivo.contrato, patchContrato)

      // Atualizar marco de aditivo_contrato no lifecycle PJ
      if (aditivo.prestador) {
        try {
          const marcos = await pb.collection('marcos_lifecycle_pj').getFullList<MarcoLifecyclePJ>({
            filter: `prestador = '${aditivo.prestador}' && chave_marco = 'aditivo_contrato'`,
          })
          if (marcos.length > 0) {
            const m = marcos[0]
            if (aditivo.status === 'Vigente') {
              await this.atualizarStatusMarco(m.id, 'REGISTRADO', {
                responsavel: 'Jurídico / Diretor',
                observacao: `Aditivo ${aditivo.numero_aditivo} vigente (${aditivo.tipo})`,
                autor: 'Módulo de Aditivos PJ',
              })
            } else if (aditivo.status === 'Pendente de assinatura') {
              await this.atualizarStatusMarco(m.id, 'PENDENTE DO PJ', {
                responsavel: 'Fornecedor PJ / Sócios',
                observacao: `Aditivo ${aditivo.numero_aditivo} aguardando assinatura`,
                autor: 'Módulo de Aditivos PJ',
              })
            }
          }
        } catch (marcoErr) {
          console.warn('Aviso ao sincronizar marco de aditivo no lifecycle:', marcoErr)
        }
      }
    } catch (err) {
      console.warn('Aviso ao sincronizar efeitos do aditivo no contrato:', err)
    }
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
    let docCriado: DocumentoPJ

    if (anexoFile) {
      const formData = new FormData()
      Object.entries(dadosAtualizados).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          formData.append(k, String(v))
        }
      })
      formData.append('anexo', anexoFile)
      docCriado = await pb.collection('documentos_pj').create<DocumentoPJ>(formData)
    } else {
      docCriado = await pb.collection('documentos_pj').create<DocumentoPJ>(dadosAtualizados)
    }

    // Registrar evento na linha do tempo PJ
    try {
      if (docCriado.prestador) {
        await this.criarEventoTimeline({
          prestador: docCriado.prestador,
          categoria: 'DOCUMENTOS',
          titulo: 'Documento arquivado:',
          complemento: `${docCriado.titulo_personalizado || docCriado.tipo_documento} inserido no dossiê`,
          autor: 'Compliance RH',
          origem: 'usuario',
          data_evento: new Date().toISOString(),
          referencia_tipo: 'documento',
          referencia_id: docCriado.id,
        })
      }
    } catch (errTime) {
      console.warn('Aviso ao registrar evento de documento na linha do tempo:', errTime)
    }

    return docCriado
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
    let nfCriada: NotaFiscalPJ
    if (anexoFile) {
      const formData = new FormData()
      Object.entries(dados).forEach(([k, v]) => {
        if (v !== undefined && v !== null) {
          formData.append(k, String(v))
        }
      })
      formData.append('anexo', anexoFile)
      nfCriada = await pb.collection('notas_fiscais_pj').create<NotaFiscalPJ>(formData)
    } else {
      nfCriada = await pb.collection('notas_fiscais_pj').create<NotaFiscalPJ>(dados)
    }

    // Registrar evento na linha do tempo
    try {
      if (nfCriada.prestador) {
        const valStr = nfCriada.valor
          ? `R$ ${nfCriada.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : ''
        await this.criarEventoTimeline({
          prestador: nfCriada.prestador,
          categoria: 'GESTÃO',
          titulo: `Nota fiscal ${nfCriada.numero_nf} lançada:`,
          complemento: `Competência ${nfCriada.competencia}${valStr ? ` no valor de ${valStr}` : ''} (status: ${nfCriada.status})`,
          autor: 'Financeiro / Prestador',
          origem: 'usuario',
          data_evento: new Date().toISOString(),
          referencia_tipo: 'nota_fiscal',
          referencia_id: nfCriada.id,
        })
      }
    } catch (errTime) {
      console.warn('Aviso ao registrar evento de NF na linha do tempo:', errTime)
    }

    return nfCriada
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

    // Registrar evento de avaliação na linha do tempo
    try {
      await this.criarEventoTimeline({
        prestador: dados.prestador,
        categoria: 'AVALIAÇÃO',
        titulo: 'Avaliação registrada:',
        complemento: `Período ${dados.periodo_avaliado} (Nota ${media.toFixed(1)}/10, recomendação "${dados.recomendacao}")`,
        autor: dados.avaliador_nome || 'Gestor RH',
        origem: 'usuario',
        data_evento: new Date().toISOString(),
        referencia_tipo: 'avaliacao',
        referencia_id: novaAvaliacao.id,
      })
    } catch (errTime) {
      console.warn('Aviso ao registrar evento de avaliação na linha do tempo:', errTime)
    }

    return novaAvaliacao
  },

  // --------------------------------------------------------------------------
  // Marcos do Ciclo de Vida (Lifecycle PJ)
  // --------------------------------------------------------------------------
  async listarMarcosLifecycle(prestadorId: string): Promise<MarcoLifecyclePJ[]> {
    return await pb.collection('marcos_lifecycle_pj').getFullList<MarcoLifecyclePJ>({
      filter: `prestador = '${prestadorId}'`,
      sort: 'ordem,created',
    })
  },

  async atualizarStatusMarco(
    marcoId: string,
    novoStatus: StatusMarcoLifecycle,
    dados?: {
      responsavel?: string
      observacao?: string
      autor?: string
    },
  ): Promise<MarcoLifecyclePJ> {
    const atual = await pb.collection('marcos_lifecycle_pj').getOne<MarcoLifecyclePJ>(marcoId)
    const historico = Array.isArray(atual.historico_auditoria) ? [...atual.historico_auditoria] : []

    historico.unshift({
      status: novoStatus,
      data: new Date().toISOString(),
      autor: dados?.autor || 'RH / Gestor',
      obs: dados?.observacao || undefined,
    })

    const patch: Partial<MarcoLifecyclePJ> = {
      status: novoStatus,
      historico_auditoria: historico,
    }

    if (novoStatus === 'REGISTRADO') {
      patch.data_conclusao = new Date().toISOString()
    } else {
      patch.data_conclusao = ''
    }

    if (dados?.responsavel !== undefined) {
      patch.responsavel = dados.responsavel
    }
    if (dados?.observacao !== undefined) {
      patch.observacao = dados.observacao
    }

    const atualizado = await pb
      .collection('marcos_lifecycle_pj')
      .update<MarcoLifecyclePJ>(marcoId, patch)

    // Se o marco ficou "PENDENTE DO PJ" além de data ou recém-marcado, registrar alerta no sino se ainda não houver
    if (novoStatus === 'PENDENTE DO PJ') {
      try {
        const prest = await pb.collection('prestadores_pj').getOne<PrestadorPJ>(atual.prestador)
        await pb.collection('alertas').create({
          score: 80,
          tipo: 'marco_lifecycle_pj_pendente',
          status: 'Novo',
          prestador: prest.id,
          resumo_ia: `Ação Pendente do PJ: O marco "${atual.nome_marco}" (${atual.etapa}) do prestador ${prest.nome_fantasia || prest.razao_social} está pendente do PJ. Observação: ${dados?.observacao || 'Aguardando ação externa.'}`,
          criado_em: new Date().toISOString(),
        })
      } catch (errAlerta) {
        console.warn('Aviso ao gerar alerta de pendência PJ:', errAlerta)
      }
    }

    // Registrar evento na linha do tempo quando marco é concluído ou atualizado
    try {
      const prest = await pb.collection('prestadores_pj').getOne<PrestadorPJ>(atual.prestador)
      let cat: CategoriaTimelinePJ = 'GESTÃO'
      if (atual.etapa === 'Entrada' && atual.chave_marco === 'contrato_assinado') {
        cat = 'DOCUMENTOS'
      } else if (atual.chave_marco === 'ausencias_periodo') {
        cat = 'AUSÊNCIAS'
      } else if (atual.chave_marco === 'reajuste_alcada') {
        cat = 'REGISTRO'
      }

      const tituloEvt =
        novoStatus === 'REGISTRADO'
          ? `${atual.nome_marco}: concluído`
          : `${atual.nome_marco}: status alterado para ${novoStatus}`

      await this.criarEventoTimeline({
        prestador: prest.id,
        categoria: cat,
        titulo: tituloEvt,
        complemento: dados?.observacao || `Marco da etapa ${atual.etapa}`,
        autor: dados?.autor || 'RH / Gestor',
        origem: 'usuario',
        data_evento: new Date().toISOString(),
        referencia_tipo: 'marco_lifecycle',
        referencia_id: marcoId,
      })
    } catch (errTimeline) {
      console.warn('Aviso ao registrar evento de marco na linha do tempo:', errTimeline)
    }

    return atualizado
  },

  async atualizarEtapaLifecycle(
    prestadorId: string,
    novaEtapa: EtapaLifecyclePJ,
  ): Promise<PrestadorPJ> {
    // Mapear etapa para status coerente se aplicável
    let novoStatus: 'Ativo' | 'Em renovação' | 'Pausado' | 'Encerrado' | undefined = undefined
    if (novaEtapa === 'Entrada') novoStatus = 'Ativo'
    else if (novaEtapa === 'Ativo') novoStatus = 'Ativo'
    else if (novaEtapa === 'Mudanças') novoStatus = 'Em renovação'
    else if (novaEtapa === 'Saída') novoStatus = 'Encerrado'

    const payload: Partial<PrestadorPJ> = {
      etapa_lifecycle: novaEtapa,
    }
    if (novoStatus) payload.status = novoStatus

    return await pb.collection('prestadores_pj').update<PrestadorPJ>(prestadorId, payload)
  },

  // Inicializar template de marcos se o prestador não possuir marcos cadastrados
  async inicializarMarcosParaPrestador(
    prestadorId: string,
    prestador?: PrestadorPJ,
  ): Promise<MarcoLifecyclePJ[]> {
    const existentes = await this.listarMarcosLifecycle(prestadorId)
    if (existentes.length > 0) return existentes

    const templateMarcos: Record<
      EtapaLifecyclePJ,
      Array<{ chave: string; nome: string; ordem: number }>
    > = {
      Entrada: [
        { chave: 'cnpj_validado', nome: 'Cadastro com CNPJ validado', ordem: 1 },
        { chave: 'contrato_assinado', nome: 'Contrato assinado pelas duas partes', ordem: 2 },
        { chave: 'documentos_aprovados', nome: 'Documentos da contratação aprovados', ordem: 3 },
        { chave: 'beneficios_cadastrados', nome: 'Benefícios e adicionais cadastrados', ordem: 4 },
      ],
      Ativo: [
        { chave: 'nf_periodo', nome: 'Nota fiscal do período', ordem: 1 },
        { chave: 'reembolso_periodo', nome: 'Reembolso do período', ordem: 2 },
        { chave: 'aprovacao_gestor', nome: 'Aprovação do gestor', ordem: 3 },
        { chave: 'pagamento_periodo', nome: 'Pagamento do período', ordem: 4 },
      ],
      Mudanças: [
        { chave: 'reajuste_alcada', nome: 'Reajuste aprovado na alçada', ordem: 1 },
        { chave: 'aditivo_contrato', nome: 'Aditivo de contrato', ordem: 2 },
        { chave: 'mudanca_escopo', nome: 'Mudança de escopo registrada', ordem: 3 },
        { chave: 'ausencias_periodo', nome: 'Ausências do período lançadas', ordem: 4 },
      ],
      Saída: [
        { chave: 'encerramento_escopo', nome: 'Encerramento de escopo/atividades', ordem: 1 },
        { chave: 'nf_final_quites', nome: 'NF final e quites', ordem: 2 },
        { chave: 'revogacao_acessos', nome: 'Devolução/revogação de acessos', ordem: 3 },
        { chave: 'termo_encerramento', nome: 'Termo de encerramento assinado', ordem: 4 },
        { chave: 'certidoes_finais', nome: 'Certidões de regularidade finais', ordem: 5 },
      ],
    }

    // Se temos dados do prestador, auto-derivar marcos da Entrada
    const cnpjOk = prestador?.cnpj ? true : false
    const docs = await this.listarDocumentos(prestadorId)
    const contratos = await this.listarContratos(prestadorId)

    const criados: MarcoLifecyclePJ[] = []
    const etapas: EtapaLifecyclePJ[] = ['Entrada', 'Ativo', 'Mudanças', 'Saída']

    for (const etapa of etapas) {
      for (const item of templateMarcos[etapa]) {
        let statusInicial: StatusMarcoLifecycle = 'NÃO ENVIADO'
        let obsInicial = ''
        let respInicial = ''
        let conclusao: string | undefined = undefined

        if (etapa === 'Entrada') {
          if (item.chave === 'cnpj_validado' && cnpjOk) {
            statusInicial = 'REGISTRADO'
            obsInicial = 'CNPJ cadastrado e formatado no padrão da Receita Federal'
            respInicial = 'Validação Automática'
            conclusao = new Date().toISOString()
          } else if (item.chave === 'contrato_assinado' && contratos.length > 0) {
            statusInicial = 'REGISTRADO'
            obsInicial = `Contrato vinculado: ${contratos[0].titulo}`
            respInicial = contratos[0].gestor_nome || 'Jurídico Interno'
            conclusao = new Date().toISOString()
          } else if (item.chave === 'documentos_aprovados' && docs.length > 0) {
            statusInicial = 'REGISTRADO'
            obsInicial = `${docs.length} documento(s) anexado(s)`
            respInicial = 'Compliance RH'
            conclusao = new Date().toISOString()
          } else if (
            item.chave === 'beneficios_cadastrados' &&
            (prestador?.dados_bancarios || prestador?.banco)
          ) {
            statusInicial = 'REGISTRADO'
            obsInicial = 'Dados de faturamento e dados bancários preenchidos'
            respInicial = 'RH Operações'
            conclusao = new Date().toISOString()
          }
        }

        const criado = await pb.collection('marcos_lifecycle_pj').create<MarcoLifecyclePJ>({
          prestador: prestadorId,
          etapa,
          chave_marco: item.chave,
          nome_marco: item.nome,
          ordem: item.ordem,
          status: statusInicial,
          data_conclusao: conclusao,
          responsavel: respInicial,
          observacao: obsInicial,
          historico_auditoria: [
            {
              status: statusInicial,
              data: new Date().toISOString(),
              autor: 'Sistema RH Inteligente',
              obs: obsInicial || 'Inicialização de template de ciclo de vida',
            },
          ],
        })
        criados.push(criado)
      }
    }

    return criados
  },

  // Sincronizar marcos com dados reais existentes (CNPJ, Contratos, Documentos, NFs)
  async sincronizarMarcosComDadosReais(
    prestador: PrestadorPJ,
    marcos: MarcoLifecyclePJ[],
    contratos: ContratoPJ[],
    documentos: DocumentoPJ[],
    notasFiscais: NotaFiscalPJ[],
  ): Promise<boolean> {
    let houveAlteracao = false

    for (const marco of marcos) {
      if (marco.etapa === 'Entrada') {
        if (
          marco.chave_marco === 'cnpj_validado' &&
          marco.status !== 'REGISTRADO' &&
          prestador.cnpj
        ) {
          await this.atualizarStatusMarco(marco.id, 'REGISTRADO', {
            responsavel: 'Validação Automática RFB',
            observacao: `CNPJ ${prestador.cnpj} validado`,
            autor: 'Sincronizador Automático',
          })
          houveAlteracao = true
        }
        if (
          marco.chave_marco === 'contrato_assinado' &&
          marco.status !== 'REGISTRADO' &&
          contratos.length > 0
        ) {
          const temAssinado = contratos.some((c) => !!c.contrato_assinado_anexo)
          if (temAssinado) {
            await this.atualizarStatusMarco(marco.id, 'REGISTRADO', {
              responsavel: 'Jurídico / Diretor',
              observacao: 'Contrato assinado em arquivo anexado',
              autor: 'Sincronizador Automático',
            })
            houveAlteracao = true
          }
        }
        if (
          marco.chave_marco === 'documentos_aprovados' &&
          marco.status !== 'REGISTRADO' &&
          documentos.length > 0
        ) {
          const temDocsValidos = documentos.some(
            (d) => d.status_calculado === 'Válido' || d.status_calculado === 'Sem validade',
          )
          if (temDocsValidos) {
            await this.atualizarStatusMarco(marco.id, 'REGISTRADO', {
              responsavel: 'Compliance RH',
              observacao: `${documentos.length} certidão(ões) e documento(s) em conformidade`,
              autor: 'Sincronizador Automático',
            })
            houveAlteracao = true
          }
        }
        if (marco.chave_marco === 'beneficios_cadastrados' && marco.status !== 'REGISTRADO') {
          if (prestador.dados_bancarios || prestador.banco) {
            await this.atualizarStatusMarco(marco.id, 'REGISTRADO', {
              responsavel: 'RH Operações',
              observacao: 'Conta bancária e chave PIX cadastradas',
              autor: 'Sincronizador Automático',
            })
            houveAlteracao = true
          }
        }
      }

      // Ativo: auto-apoiar em notas_fiscais_pj se houver NF aprovada/paga
      if (marco.etapa === 'Ativo') {
        if (
          marco.chave_marco === 'nf_periodo' &&
          marco.status === 'NÃO ENVIADO' &&
          notasFiscais.length > 0
        ) {
          await this.atualizarStatusMarco(marco.id, 'REGISTRADO', {
            responsavel: 'Contabilidade / Fornecedor',
            observacao: `NF ${notasFiscais[0].numero_nf} (${notasFiscais[0].competencia}) lançada`,
            autor: 'Sincronizador Automático',
          })
          houveAlteracao = true
        }
        if (marco.chave_marco === 'pagamento_periodo' && marco.status !== 'REGISTRADO') {
          const temPaga = notasFiscais.some((n) => n.status === 'Paga')
          if (temPaga) {
            await this.atualizarStatusMarco(marco.id, 'REGISTRADO', {
              responsavel: 'Tesouraria',
              observacao: 'Nota fiscal com comprovante de liquidação liquidada',
              autor: 'Sincronizador Automático',
            })
            houveAlteracao = true
          }
        }
      }
    }

    return houveAlteracao
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

  // --------------------------------------------------------------------------
  // Linha do Tempo (Eventos de Acompanhamento PJ)
  // --------------------------------------------------------------------------
  async listarEventosTimeline(
    prestadorId: string,
    categoriaFiltro?: CategoriaTimelinePJ | 'TODAS',
  ): Promise<EventoTimelinePJ[]> {
    let filter = `prestador = '${prestadorId}'`
    if (categoriaFiltro && categoriaFiltro !== 'TODAS') {
      filter += ` && categoria = '${categoriaFiltro}'`
    }
    return await pb.collection('eventos_timeline_pj').getFullList<EventoTimelinePJ>({
      filter,
      sort: '-data_evento',
      expand: 'prestador',
    })
  },

  async criarEventoTimeline(dados: {
    prestador: string
    categoria: CategoriaTimelinePJ
    titulo: string
    complemento?: string
    autor?: string
    origem?: 'sistema' | 'usuario'
    data_evento?: string
    referencia_tipo?: string
    referencia_id?: string
  }): Promise<EventoTimelinePJ> {
    const autorFinal = dados.autor || 'sistema'
    const origemFinal =
      dados.origem || (autorFinal.toLowerCase() === 'sistema' ? 'sistema' : 'usuario')
    const dataEventoFinal = dados.data_evento || new Date().toISOString()

    return await pb.collection('eventos_timeline_pj').create<EventoTimelinePJ>({
      prestador: dados.prestador,
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

  async excluirEventoTimeline(id: string): Promise<boolean> {
    return await pb.collection('eventos_timeline_pj').delete(id)
  },
}
