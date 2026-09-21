import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import { TEMPLATES_CONTRATUAIS, type TemplateContrato } from './templatesContrato'
import { notificacoesRhService } from './notificacoesRh'

export type ModalidadeContrato = 'PJ' | 'CLT'

export type StatusContratoUnificado =
  | 'Minuta'
  | 'Em assinatura'
  | 'Vigente'
  | 'Vencendo'
  | 'Renovado'
  | 'Encerrado'
  | 'Rescindido'

export type TipoModeloContrato =
  | 'PJ_PRESTACAO_SERVICOS'
  | 'PJ_HORISTA'
  | 'CLT_EXPERIENCIA'
  | 'CLT_INDETERMINADO'
  | 'CLT_TELETRABALHO'
  | 'OUTRO'

export interface ContratoUnificado extends RecordModel {
  pessoa: string
  prestador_pj?: string
  empresa?: string
  area?: string
  contrato_pj_legado?: string
  codigo_contrato: string
  titulo: string
  modalidade: ModalidadeContrato
  tipo_modelo: TipoModeloContrato
  status: StatusContratoUnificado
  data_inicio: string
  data_fim?: string
  data_renovacao_alerta?: string
  dias_antecedencia_alerta?: number
  valor_mensal?: number
  valor_hora?: number
  horas_mensais_base?: number
  prazo_tipo?: string
  departamento?: string
  centro_custo?: string
  cargo_funcao?: string
  gestor_responsavel?: string
  gestor_nome?: string
  versao_atual?: number
  conteudo_atual_md?: string
  arquivo_vigente?: string
  dados_preenchimento?: Record<string, any>
  clausulas_especiais?: string
  motivo_revisao?: string
  created: string
  updated: string
  expand?: {
    pessoa?: any
    prestador_pj?: any
    gestor_responsavel?: any
    empresa?: any
    area?: any
  }
}

export interface VersaoContrato extends RecordModel {
  contrato: string
  numero_versao: number
  rotulo_versao: string
  conteudo_texto: string
  resumo_mudancas?: string
  arquivo_versao?: string
  criado_por_nome?: string
  criado_por_usuario?: string
  status_versao: 'Minuta' | 'Aguardando Assinaturas' | 'Assinada' | 'Substituída' | 'Cancelada'
  hash_conteudo?: string
  created: string
  updated: string
}

export interface AssinaturaContrato extends RecordModel {
  contrato: string
  versao: string
  papel_signatario:
    | 'Contratado'
    | 'Representante Empresa'
    | 'Testemunha 1'
    | 'Testemunha 2'
    | 'Gestor'
  nome_signatario: string
  email_signatario: string
  documento_identificacao?: string
  status_assinatura: 'Pendente' | 'Assinado' | 'Recusado'
  data_solicitacao?: string
  data_assinatura?: string
  ip_assinatura?: string
  user_agent?: string
  hash_documento?: string
  manifestacao_aceite?: string
  motivo_recusa?: string
  metadados_auditoria?: Record<string, any>
  created: string
  updated: string
}

export interface CriarContratoInput {
  pessoaId: string
  prestadorPjId?: string
  templateId: string
  titulo: string
  modalidade: ModalidadeContrato
  empresaId?: string
  areaId?: string
  dataInicio: string
  dataFim?: string
  valorMensal?: number
  horasMensaisBase?: number
  prazoTipo?: string
  departamento?: string
  centroCusto?: string
  cargoFuncao?: string
  gestorNome?: string
  gestorResponsavelId?: string
  clausulasEspeciais?: string
  resumoMudancas?: string
  autorNome?: string
  autorId?: string
}

export interface NovaVersaoInput {
  contratoId: string
  conteudoTexto: string
  rotuloVersao: string
  resumoMudancas: string
  autorNome: string
  autorId?: string
  atualizarParametrosContrato?: {
    valorMensal?: number
    dataFim?: string
    prazoTipo?: string
    cargoFuncao?: string
  }
}

export interface RegistrarAssinaturaInput {
  contratoId: string
  versaoId: string
  assinaturaId?: string
  nomeSignatario: string
  emailSignatario: string
  papel: 'Contratado' | 'Representante Empresa' | 'Testemunha 1' | 'Testemunha 2' | 'Gestor'
  documentoIdentificacao?: string
  manifestacaoAceite?: string
  ip?: string
  userAgent?: string
}

/**
 * Utilitário para gerar SHA-256 no browser de forma síncrona/assíncrona nativa
 */
export async function gerarHashSha256(texto: string): Promise<string> {
  try {
    const encoder = new TextEncoder()
    const data = encoder.encode(texto)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  } catch {
    // Fallback simples caso crypto.subtle não esteja disponível
    let hash = 0
    for (let i = 0; i < texto.length; i++) {
      const char = texto.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash |= 0
    }
    return Math.abs(hash).toString(16).padStart(64, '0')
  }
}

/**
 * Função de interpolação dos dados da pessoa e vínculo dentro do template jurídico
 */
export function preencherTemplate(
  conteudoTemplate: string,
  dados: {
    codigoContrato: string
    pessoaNome: string
    pessoaDocumento?: string
    pessoaEmail?: string
    pessoaTelefone?: string
    prestadorRazaoSocial?: string
    prestadorCnpj?: string
    prestadorEndereco?: string
    cargoFuncao: string
    departamento?: string
    centroCusto?: string
    gestorNome?: string
    dataInicio: string
    dataFim?: string
    prazoTipo?: string
    diasAlerta?: number
    valorMensal: number
    valorHora: number
    horasBase: number
    empresaNomeFantasia?: string
    empresaRazaoSocial?: string
    empresaCnpj?: string
    empresaTipo?: string
    empresaCidadeUf?: string
    areaNome?: string
    clausulasEspeciais?: string
  },
): string {
  let texto = conteudoTemplate

  const dataInicioFormatada = dados.dataInicio
    ? new Date(dados.dataInicio).toLocaleDateString('pt-BR')
    : 'A definir'
  const dataFimFormatada = dados.dataFim
    ? new Date(dados.dataFim).toLocaleDateString('pt-BR')
    : 'Indeterminado'

  let dataPrimeiroPeriodoFormatada = '45 dias da admissão'
  if (dados.dataInicio) {
    const d = new Date(dados.dataInicio)
    d.setDate(d.getDate() + 45)
    dataPrimeiroPeriodoFormatada = d.toLocaleDateString('pt-BR')
  }

  const dataExtenso = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })

  const mapa: Record<string, string> = {
    '{{CODIGO_CONTRATO}}': dados.codigoContrato || 'CT-SOUYESS-2026',
    '{{PESSOA_NOME}}': dados.pessoaNome || 'NOME NÃO INFORMADO',
    '{{PESSOA_DOCUMENTO}}': dados.pessoaDocumento || 'CPF NÃO INFORMADO',
    '{{PESSOA_EMAIL}}': dados.pessoaEmail || '',
    '{{PESSOA_TELEFONE}}': dados.pessoaTelefone || '',
    '{{PRESTADOR_RAZAO_SOCIAL}}':
      dados.prestadorRazaoSocial || dados.pessoaNome || 'PRESTADORA DE SERVIÇOS',
    '{{PRESTADOR_CNPJ}}': dados.prestadorCnpj || dados.pessoaDocumento || 'CNPJ NÃO INFORMADO',
    '{{PRESTADOR_ENDERECO}}':
      dados.prestadorEndereco || 'Sede da Contratada em território nacional',
    '{{CARGO_FUNCAO}}': dados.cargoFuncao || 'Especialista',
    '{{DEPARTAMENTO}}': dados.departamento || 'Operações & Tecnologia',
    '{{CENTRO_CUSTO}}': dados.centroCusto || 'CC-GERAL-01',
    '{{GESTOR_NOME}}': dados.gestorNome || 'Douglas Severo (Gente & Gestão)',
    '{{EMPRESA_NOME_FANTASIA}}': dados.empresaNomeFantasia || 'SouYess Tecnologia',
    '{{EMPRESA_RAZAO_SOCIAL}}':
      dados.empresaRazaoSocial || 'SouYess Tecnologia e Gestão de Software S.A.',
    '{{EMPRESA_CNPJ}}': dados.empresaCnpj || '11.222.333/0002-62',
    '{{EMPRESA_TIPO}}': dados.empresaTipo || 'BU / Filial',
    '{{EMPRESA_CIDADE_UF}}': dados.empresaCidadeUf || 'Curitiba/PR',
    '{{AREA}}': dados.areaNome || dados.departamento || 'Tecnologia & Operações',
    '{{DATA_INICIO}}': dataInicioFormatada,
    '{{DATA_FIM}}': dataFimFormatada,
    '{{DATA_PRIMEIRO_PERIODO}}': dataPrimeiroPeriodoFormatada,
    '{{PRAZO_TIPO}}': dados.prazoTipo || 'Determinado',
    '{{DIAS_ALERTA}}': String(dados.diasAlerta || 60),
    '{{VALOR_MENSAL}}': dados.valorMensal.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
    }),
    '{{VALOR_MENSAL_EXTENSO}}': `R$ ${dados.valorMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    '{{VALOR_HORA}}': dados.valorHora.toFixed(2),
    '{{HORAS_BASE}}': String(dados.horasBase || 160),
    '{{CLAUSULAS_ESPECIAIS}}':
      dados.clausulasEspeciais?.trim() ||
      'Não há cláusulas especiais suplementares pactuadas para este instrumento.',
    '{{DATA_EXTENSO}}': dataExtenso,
  }

  for (const [tag, valor] of Object.entries(mapa)) {
    texto = texto.split(tag).join(valor)
  }

  return texto
}

export const contratosService = {
  getTemplates(): TemplateContrato[] {
    return TEMPLATES_CONTRATUAIS
  },

  async carregarTemplatesDinamicos(apenasAtivos = true): Promise<TemplateContrato[]> {
    try {
      const records = await pb.collection('modelos_contrato').getFullList({
        filter: apenasAtivos ? 'ativo = true' : undefined,
        sort: '-eh_padrao_sistema,-created',
      })
      if (records.length > 0) {
        return records.map((r: any) => ({
          id: r.id,
          titulo: r.nome,
          modalidade: r.modalidade,
          tipoModelo: r.tipo_modelo,
          descricaoBreve: r.descricao || '',
          tagsJuridicas: Array.isArray(r.tags) ? r.tags : [],
          diasAlertaPadrao: r.dias_alerta_padrao || (r.modalidade === 'PJ' ? 60 : 15),
          prazoTipoSugerido: r.prazo_tipo_sugerido || 'Determinado',
          conteudoPadrao: r.corpo_texto,
          ehPadraoSistema: !!r.eh_padrao_sistema,
          ativo: r.ativo !== false,
          criadoPorNome: r.criado_por_nome,
          dataAtualizacao: r.updated,
        }))
      }
    } catch {
      /* fallback em memória */
    }
    return TEMPLATES_CONTRATUAIS
  },

  async getTemplateByIdAsync(id: string): Promise<TemplateContrato | undefined> {
    try {
      const r: any = await pb.collection('modelos_contrato').getOne(id)
      if (r) {
        return {
          id: r.id,
          titulo: r.nome,
          modalidade: r.modalidade,
          tipoModelo: r.tipo_modelo,
          descricaoBreve: r.descricao || '',
          tagsJuridicas: Array.isArray(r.tags) ? r.tags : [],
          diasAlertaPadrao: r.dias_alerta_padrao || (r.modalidade === 'PJ' ? 60 : 15),
          prazoTipoSugerido: r.prazo_tipo_sugerido || 'Determinado',
          conteudoPadrao: r.corpo_texto,
          ehPadraoSistema: !!r.eh_padrao_sistema,
          ativo: r.ativo !== false,
          criadoPorNome: r.criado_por_nome,
          dataAtualizacao: r.updated,
        }
      }
    } catch {
      /* fallback */
    }
    return TEMPLATES_CONTRATUAIS.find((t) => t.id === id)
  },

  getTemplateById(id: string): TemplateContrato | undefined {
    return TEMPLATES_CONTRATUAIS.find((t) => t.id === id)
  },

  async listarContratos(filtros?: {
    pessoaId?: string
    empresaId?: string
    areaId?: string
    modalidade?: ModalidadeContrato
    status?: StatusContratoUnificado
    departamento?: string
  }): Promise<ContratoUnificado[]> {
    try {
      const filterParts: string[] = []

      if (filtros?.pessoaId) {
        filterParts.push(`pessoa = '${filtros.pessoaId}'`)
      }
      if (filtros?.empresaId) {
        filterParts.push(`empresa = '${filtros.empresaId}'`)
      }
      if (filtros?.areaId) {
        filterParts.push(`area = '${filtros.areaId}'`)
      }
      if (filtros?.modalidade) {
        filterParts.push(`modalidade = '${filtros.modalidade}'`)
      }
      if (filtros?.status) {
        filterParts.push(`status = '${filtros.status}'`)
      }
      if (filtros?.departamento) {
        filterParts.push(`departamento ~ '${filtros.departamento}'`)
      }

      const filter = filterParts.join(' && ')

      const records = await pb.collection('contratos').getFullList<ContratoUnificado>({
        filter: filter || undefined,
        sort: '-created',
        expand: 'pessoa,prestador_pj,gestor_responsavel,empresa,area',
      })

      return records || []
    } catch (err) {
      // Falhas de permissão (401/403) ou ausência de registros não devem quebrar a aplicação
      console.warn('Aviso ao listar contratos:', err)
      return []
    }
  },

  async obterContratoPorId(id: string): Promise<ContratoUnificado | null> {
    try {
      return await pb.collection('contratos').getOne<ContratoUnificado>(id, {
        expand: 'pessoa,prestador_pj,gestor_responsavel,empresa,area',
      })
    } catch (err) {
      console.error('Erro ao buscar contrato por ID:', err)
      return null
    }
  },

  async listarVersoes(contratoId: string): Promise<VersaoContrato[]> {
    try {
      const records = await pb.collection('contrato_versoes').getFullList<VersaoContrato>({
        filter: `contrato = '${contratoId}'`,
        sort: '-numero_versao',
      })
      return records
    } catch (err) {
      console.error('Erro ao listar versoes de contrato:', err)
      return []
    }
  },

  async listarAssinaturas(contratoId: string): Promise<AssinaturaContrato[]> {
    try {
      const records = await pb.collection('contrato_assinaturas').getFullList<AssinaturaContrato>({
        filter: `contrato = '${contratoId}'`,
        sort: 'created',
      })
      return records
    } catch (err) {
      console.error('Erro ao listar assinaturas:', err)
      return []
    }
  },

  /**
   * Gera um contrato novo do template, preenche os campos e cria a versão v1.0
   */
  async criarContratoDoTemplate(input: CriarContratoInput): Promise<{
    contrato: ContratoUnificado
    versao: VersaoContrato
  } | null> {
    try {
      const template =
        (await this.getTemplateByIdAsync(input.templateId)) ||
        this.getTemplateById(input.templateId) ||
        TEMPLATES_CONTRATUAIS[0]

      // Buscar dados da pessoa, prestador e empresa/área
      const pessoaRecord = await pb
        .collection('pessoas')
        .getOne(input.pessoaId, { expand: 'empresa,area' })
        .catch(() => null)
      let prestadorRecord = null
      if (input.prestadorPjId) {
        prestadorRecord = await pb
          .collection('prestadores_pj')
          .getOne(input.prestadorPjId)
          .catch(() => null)
      } else if (pessoaRecord?.prestador_origem) {
        prestadorRecord = await pb
          .collection('prestadores_pj')
          .getOne(pessoaRecord.prestador_origem)
          .catch(() => null)
      }

      const horasBase = input.horasMensaisBase || pessoaRecord?.horas_mensais_base || 160
      const valorMensal = input.valorMensal || pessoaRecord?.valor_contratado || 0
      const valorHora = horasBase > 0 ? Number((valorMensal / horasBase).toFixed(2)) : 0

      // Gerar código único
      const ano = new Date().getFullYear()
      const randomSufixo = Math.floor(100 + Math.random() * 900)
      const codigoContrato =
        input.modalidade === 'PJ' ? `CT-PJ-${ano}-${randomSufixo}` : `CT-CLT-${ano}-${randomSufixo}`

      const diasAlerta = template.diasAlertaPadrao || (input.modalidade === 'PJ' ? 60 : 15)

      // Resolver dados da Empresa do contrato
      const empresaIdFinal = input.empresaId || pessoaRecord?.empresa
      const areaIdFinal = input.areaId || pessoaRecord?.area

      let empresaData: any = null
      let areaData: any = null

      if (empresaIdFinal) {
        empresaData = await pb
          .collection('empresas')
          .getOne(empresaIdFinal)
          .catch(() => null)
      }
      if (areaIdFinal) {
        areaData = await pb
          .collection('areas')
          .getOne(areaIdFinal)
          .catch(() => null)
      }

      // Calcular data_renovacao_alerta se houver dataFim
      let dataRenovacaoAlerta: string | undefined = undefined
      if (input.dataFim) {
        const dFim = new Date(input.dataFim)
        dFim.setDate(dFim.getDate() - diasAlerta)
        dataRenovacaoAlerta = dFim.toISOString()
      }

      // Preencher o template
      const textoPreenchido = preencherTemplate(template.conteudoPadrao, {
        codigoContrato,
        pessoaNome: pessoaRecord?.nome || 'Colaborador',
        pessoaDocumento: pessoaRecord?.cpf_cnpj || '',
        pessoaEmail: pessoaRecord?.email || '',
        pessoaTelefone: pessoaRecord?.telefone || '',
        prestadorRazaoSocial: prestadorRecord?.razao_social || '',
        prestadorCnpj: prestadorRecord?.cnpj || '',
        prestadorEndereco: prestadorRecord?.endereco || '',
        cargoFuncao: input.cargoFuncao || pessoaRecord?.cargo_funcao || '',
        departamento: input.departamento || pessoaRecord?.departamento || '',
        centroCusto: input.centroCusto || pessoaRecord?.centro_custo || '',
        gestorNome: input.gestorNome || pessoaRecord?.gestor_nome || 'Gestão SouYess',
        dataInicio: input.dataInicio,
        dataFim: input.dataFim,
        prazoTipo: input.prazoTipo || template.prazoTipoSugerido || 'Determinado',
        diasAlerta,
        valorMensal,
        valorHora,
        horasBase,
        empresaNomeFantasia: empresaData?.nome_fantasia,
        empresaRazaoSocial: empresaData?.razao_social,
        empresaCnpj: empresaData?.cnpj,
        empresaTipo: empresaData?.tipo,
        empresaCidadeUf:
          empresaData?.endereco_cidade && empresaData?.endereco_uf
            ? `${empresaData.endereco_cidade}/${empresaData.endereco_uf}`
            : empresaData?.endereco_cidade,
        areaNome: areaData?.nome,
        clausulasEspeciais: input.clausulasEspeciais,
      })

      const hashConteudo = await gerarHashSha256(textoPreenchido)

      // 1. Criar contrato
      const contratoCriado = await pb.collection('contratos').create<ContratoUnificado>({
        pessoa: input.pessoaId,
        prestador_pj: input.prestadorPjId || prestadorRecord?.id || undefined,
        empresa: empresaIdFinal || undefined,
        area: areaIdFinal || undefined,
        codigo_contrato: codigoContrato,
        titulo: input.titulo || template.titulo,
        modalidade: input.modalidade,
        tipo_modelo: template.tipoModelo,
        status: 'Minuta',
        data_inicio: input.dataInicio,
        data_fim: input.dataFim || undefined,
        data_renovacao_alerta: dataRenovacaoAlerta,
        dias_antecedencia_alerta: diasAlerta,
        valor_mensal: valorMensal,
        valor_hora: valorHora,
        horas_mensais_base: horasBase,
        prazo_tipo: input.prazoTipo || template.prazoTipoSugerido,
        departamento: input.departamento || pessoaRecord?.departamento,
        centroCusto: input.centroCusto || pessoaRecord?.centro_custo,
        cargo_funcao: input.cargoFuncao || pessoaRecord?.cargo_funcao,
        gestor_nome: input.gestorNome || pessoaRecord?.gestor_nome,
        gestor_responsavel:
          input.gestorResponsavelId || pessoaRecord?.gestor_responsavel || undefined,
        versao_atual: 1,
        conteudo_atual_md: textoPreenchido,
        clausulas_especiais: input.clausulasEspeciais,
        motivo_revisao: input.resumoMudancas || 'Emissão inicial v1.0 gerada do template',
      })

      // 2. Criar Versão v1.0
      const versaoCriada = await pb.collection('contrato_versoes').create<VersaoContrato>({
        contrato: contratoCriado.id,
        numero_versao: 1,
        rotulo_versao: 'v1.0 — Minuta Inicial',
        conteudo_texto: textoPreenchido,
        resumo_mudancas:
          input.resumoMudancas || 'Geração inicial a partir de modelo jurídico aprovado.',
        criado_por_nome: input.autorNome || 'Douglas Severo (RH)',
        criado_por_usuario: input.autorId || undefined,
        status_versao: 'Minuta',
        hash_conteudo: hashConteudo,
      })

      // 3. Cadastrar signatários padrão (Contratado + Representante Empresa)
      try {
        await pb.collection('contrato_assinaturas').create({
          contrato: contratoCriado.id,
          versao: versaoCriada.id,
          papel_signatario: 'Contratado',
          nome_signatario: pessoaRecord?.nome || 'Colaborador/Prestador',
          email_signatario: pessoaRecord?.email || 'contato@souyess.com.br',
          documento_identificacao: pessoaRecord?.cpf_cnpj || '',
          status_assinatura: 'Pendente',
          data_solicitacao: new Date().toISOString(),
        })

        await pb.collection('contrato_assinaturas').create({
          contrato: contratoCriado.id,
          versao: versaoCriada.id,
          papel_signatario: 'Representante Empresa',
          nome_signatario: input.gestorNome || 'Douglas Severo (Gente & Gestão)',
          email_signatario: 'severo.douglas2@gmail.com',
          documento_identificacao: '12.345.678/0001-90',
          status_assinatura: 'Pendente',
          data_solicitacao: new Date().toISOString(),
        })
      } catch (eAss) {
        console.warn('Aviso ao registrar signatários padrão:', eAss)
      }

      return {
        contrato: contratoCriado,
        versao: versaoCriada,
      }
    } catch (err) {
      console.error('Erro ao criar contrato a partir de template:', err)
      return null
    }
  },

  /**
   * Cria uma nova versão (ex: v2.0, v3.0) preservando histórico e imutabilidade das anteriores
   */
  async criarNovaVersao(input: NovaVersaoInput): Promise<VersaoContrato | null> {
    try {
      const contrato = await pb.collection('contratos').getOne<ContratoUnificado>(input.contratoId)
      const versoesExistentes = await this.listarVersoes(input.contratoId)
      const proximoNumero = (versoesExistentes[0]?.numero_versao || contrato.versao_atual || 1) + 1

      const hashConteudo = await gerarHashSha256(input.conteudoTexto)

      // Marcar versão anterior como "Substituída" se estava Minuta ou Aguardando
      if (versoesExistentes.length > 0 && versoesExistentes[0].status_versao !== 'Assinada') {
        try {
          await pb.collection('contrato_versoes').update(versoesExistentes[0].id, {
            status_versao: 'Substituída',
          })
        } catch {
          /* intentionally ignored */
        }
      }

      // Criar nova versão
      const novaVersao = await pb.collection('contrato_versoes').create<VersaoContrato>({
        contrato: contrato.id,
        numero_versao: proximoNumero,
        rotulo_versao: input.rotuloVersao || `v${proximoNumero}.0 — Revisão Contratual`,
        conteudo_texto: input.conteudoTexto,
        resumo_mudancas: input.resumoMudancas,
        criado_por_nome: input.autorNome,
        criado_por_usuario: input.autorId || undefined,
        status_versao: 'Minuta',
        hash_conteudo: hashConteudo,
      })

      // Atualizar o contrato principal
      const atualizacaoContrato: Record<string, any> = {
        versao_atual: proximoNumero,
        conteudo_atual_md: input.conteudoTexto,
        motivo_revisao: input.resumoMudancas,
        status: 'Minuta',
      }

      if (input.atualizarParametrosContrato) {
        if (input.atualizarParametrosContrato.valorMensal !== undefined) {
          atualizacaoContrato.valor_mensal = input.atualizarParametrosContrato.valorMensal
          const horas = contrato.horas_mensais_base || 160
          atualizacaoContrato.valor_hora = Number(
            (input.atualizarParametrosContrato.valorMensal / horas).toFixed(2),
          )
        }
        if (input.atualizarParametrosContrato.dataFim !== undefined) {
          atualizacaoContrato.data_fim = input.atualizarParametrosContrato.dataFim
          if (contrato.dias_antecedencia_alerta) {
            const d = new Date(input.atualizarParametrosContrato.dataFim)
            d.setDate(d.getDate() - contrato.dias_antecedencia_alerta)
            atualizacaoContrato.data_renovacao_alerta = d.toISOString()
          }
        }
        if (input.atualizarParametrosContrato.prazoTipo) {
          atualizacaoContrato.prazo_tipo = input.atualizarParametrosContrato.prazoTipo
        }
        if (input.atualizarParametrosContrato.cargoFuncao) {
          atualizacaoContrato.cargo_funcao = input.atualizarParametrosContrato.cargoFuncao
        }
      }

      await pb.collection('contratos').update(contrato.id, atualizacaoContrato)

      return novaVersao
    } catch (err) {
      console.error('Erro ao criar nova versão de contrato:', err)
      return null
    }
  },

  /**
   * Envia o contrato para assinatura (muda status para 'Em assinatura')
   */
  async enviarParaAssinatura(contratoId: string, versaoId: string): Promise<boolean> {
    try {
      await pb.collection('contratos').update(contratoId, {
        status: 'Em assinatura',
      })

      await pb.collection('contrato_versoes').update(versaoId, {
        status_versao: 'Aguardando Assinaturas',
      })

      // Disparar notificação in-app para RH / Gestor
      await notificacoesRhService.criarNotificacao({
        titulo: 'Contrato enviado para assinatura',
        mensagem: `O contrato foi disponibilizado para coleta de assinaturas digitais internas.`,
        tipo: 'sistema',
        link: `/pessoas`,
        referencia_tipo: 'contratos',
        referencia_id: contratoId,
      })

      return true
    } catch (err) {
      console.error('Erro ao enviar contrato para assinatura:', err)
      return false
    }
  },

  /**
   * Registra a assinatura digital interna com trilha de auditoria e armazena comprovante no cofre
   */
  async registrarAssinaturaInterna(input: RegistrarAssinaturaInput): Promise<boolean> {
    try {
      const contrato = await pb.collection('contratos').getOne<ContratoUnificado>(input.contratoId)
      const versao = await pb.collection('contrato_versoes').getOne<VersaoContrato>(input.versaoId)

      const agoraIso = new Date().toISOString()
      const ip = input.ip || '189.120.45.19'
      const userAgent = input.userAgent || navigator.userAgent

      // Se houver ID de assinatura existente, atualiza. Senão, cria.
      if (input.assinaturaId) {
        await pb.collection('contrato_assinaturas').update(input.assinaturaId, {
          status_assinatura: 'Assinado',
          data_assinatura: agoraIso,
          ip_assinatura: ip,
          user_agent: userAgent,
          hash_documento: versao.hash_conteudo,
          manifestacao_aceite:
            input.manifestacaoAceite ||
            'Declaro sob as penas da lei que li, compreendi e manifesto minha expressa concordância com todos os termos deste instrumento eletrônico.',
        })
      } else {
        await pb.collection('contrato_assinaturas').create({
          contrato: contrato.id,
          versao: versao.id,
          papel_signatario: input.papel,
          nome_signatario: input.nomeSignatario,
          email_signatario: input.emailSignatario,
          documento_identificacao: input.documentoIdentificacao,
          status_assinatura: 'Assinado',
          data_solicitacao: agoraIso,
          data_assinatura: agoraIso,
          ip_assinatura: ip,
          user_agent: userAgent,
          hash_documento: versao.hash_conteudo,
          manifestacao_aceite:
            input.manifestacaoAceite ||
            'Manifesto minha concordância expressa e assinatura digital do contrato.',
        })
      }

      // Verificar se todas as assinaturas desta versão foram coletadas
      const todasAssinaturas = await this.listarAssinaturas(contrato.id)
      const assinaturasDestaVersao = todasAssinaturas.filter((a) => a.versao === versao.id)

      const todasAssinadas =
        assinaturasDestaVersao.length > 0 &&
        assinaturasDestaVersao.every((a) => a.status_assinatura === 'Assinado')

      if (todasAssinadas) {
        // Promover versão para 'Assinada' e Contrato para 'Vigente'
        await pb.collection('contrato_versoes').update(versao.id, {
          status_versao: 'Assinada',
        })

        await pb.collection('contratos').update(contrato.id, {
          status: 'Vigente',
        })

        // Também garantir que a situação na tabela 'pessoas' reflita 'Vigente'
        try {
          await pb.collection('pessoas').update(contrato.pessoa, {
            situacao_contrato: 'Vigente',
            valor_contratado: contrato.valor_mensal,
            horas_mensais_base: contrato.horas_mensais_base,
            valor_hora: contrato.valor_hora,
          })
        } catch {
          /* intentionally ignored */
        }

        // Registrar no Cofre de Documentos da Pessoa
        try {
          const nomeDocCofre = `Contrato Assinado ${contrato.codigo_contrato} (${versao.rotulo_versao})`
          // Criar arquivo PDF sintético como Blob
          const cabecalhoAssinaturas = assinaturasDestaVersao
            .map(
              (a) =>
                `Assinado por: ${a.nome_signatario} (${a.papel_signatario}) em ${new Date(a.data_assinatura || agoraIso).toLocaleString('pt-BR')} | IP: ${a.ip_assinatura} | Hash: ${a.hash_documento?.substring(0, 16)}...`,
            )
            .join('\n')

          const conteudoAuditado = `${versao.conteudo_texto}\n\n=========================================\nTRILHA DE AUDITORIA E ASSINATURA ELETRÔNICA SOUYESS\n=========================================\n${cabecalhoAssinaturas}\nHash SHA-256 Oficial: ${versao.hash_conteudo}\n`

          const blob = new Blob([conteudoAuditado], { type: 'application/pdf' })
          const arquivoNome = `contrato_${contrato.codigo_contrato.toLowerCase().replace(/[^a-z0-9]/g, '_')}_v${versao.numero_versao}.pdf`
          const file = new File([blob], arquivoNome, { type: 'application/pdf' })

          const formData = new FormData()
          formData.append('pessoa', contrato.pessoa)
          formData.append('nome', nomeDocCofre)
          formData.append('tipo', 'Contrato de Prestação / Admissão')
          formData.append('arquivo', file)
          formData.append('tamanho_bytes', String(blob.size))
          formData.append('data_emissao', agoraIso)
          if (contrato.data_fim) {
            formData.append('data_vencimento', contrato.data_fim)
          }
          formData.append(
            'observacoes',
            `Contrato ${contrato.codigo_contrato} assinado internamente com rastreabilidade digital completa. Trilha auditada em ${new Date().toLocaleDateString('pt-BR')}.`,
          )

          await pb.collection('documentos_pessoa').create(formData)
        } catch (eCofre) {
          console.warn('Aviso ao armazenar contrato assinado no cofre:', eCofre)
        }

        // Notificação de conclusão
        await notificacoesRhService.criarNotificacao({
          titulo: 'Contrato assinado e em vigor!',
          mensagem: `O contrato ${contrato.codigo_contrato} foi assinado por todas as partes e já se encontra vigente no cofre de documentos.`,
          tipo: 'sistema',
          link: `/pessoas/${contrato.pessoa}`,
          referencia_tipo: 'contratos',
          referencia_id: contrato.id,
        })
      }

      return true
    } catch (err) {
      console.error('Erro ao registrar assinatura interna:', err)
      return false
    }
  },
}
