import pb from '@/lib/pocketbase/client'

export type TipoEmpresa = 'Holding / Matriz' | 'BU / Filial'
export type StatusEmpresa = 'Operando' | 'Inativa'

export interface Empresa {
  id: string
  nome_fantasia: string
  razao_social: string
  cnpj: string
  tipo: TipoEmpresa
  status: StatusEmpresa
  cnae?: string
  endereco_cidade?: string
  endereco_uf?: string
  telefone?: string
  logo_cor?: string
  sigla?: string
  empresa_pai?: string
  empresa_pai_nome?: string
  ordem_exibicao?: number
  observacoes?: string
  created?: string
  updated?: string
  // Métricas calculadas para visualização
  total_vinculos?: number
  total_clt?: number
  total_pj?: number
  total_areas?: number
  custo_mensal?: number
}

export interface Area {
  id: string
  nome: string
  empresa: string
  empresa_nome?: string
  responsavel_nome?: string
  descricao?: string
  ativa: boolean
  total_vinculos?: number
  created?: string
  updated?: string
}

export interface CriarEmpresaInput {
  nome_fantasia: string
  razao_social: string
  cnpj: string
  tipo: TipoEmpresa
  status: StatusEmpresa
  cnae?: string
  endereco_cidade?: string
  endereco_uf?: string
  telefone?: string
  logo_cor?: string
  sigla?: string
  empresa_pai?: string
  ordem_exibicao?: number
  observacoes?: string
}

export interface AtualizarEmpresaInput extends Partial<CriarEmpresaInput> {
  id: string
}

export interface CriarAreaInput {
  nome: string
  empresa: string
  responsavel_nome?: string
  descricao?: string
  ativa?: boolean
}

export interface AtualizarAreaInput extends Partial<CriarAreaInput> {
  id: string
}

/**
 * Validação formal de CNPJ com cálculo de dígitos verificadores
 */
export function validarCNPJ(cnpjRaw: string): boolean {
  if (!cnpjRaw) return false
  const limpo = cnpjRaw.replace(/\D/g, '')
  if (limpo.length !== 14) return false

  // Rejeita sequências de dígitos repetidos conhecidas (00000000000000, 11111111111111, etc.)
  if (/^(\d)\1{13}$/.test(limpo)) return false

  // Primeiro dígito verificador
  let tamanho = 12
  let numeros = limpo.substring(0, tamanho)
  const digitos = limpo.substring(tamanho)
  let soma = 0
  let pos = tamanho - 7
  for (let i = tamanho; i >= 1; i--) {
    soma += parseInt(numeros.charAt(tamanho - i), 10) * pos--
    if (pos < 2) pos = 9
  }
  let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11)
  if (resultado !== parseInt(digitos.charAt(0), 10)) return false

  // Segundo dígito verificador
  tamanho = 13
  numeros = limpo.substring(0, tamanho)
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

/**
 * Formata CNPJ para o padrão XX.XXX.XXX/XXXX-XX
 */
export function formatarCNPJ(valor: string): string {
  if (!valor) return ''
  const apenasNumeros = valor.replace(/\D/g, '').slice(0, 14)
  return apenasNumeros
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export const empresasService = {
  /**
   * Lista todas as empresas cadastradas com métricas consolidadas
   */
  async listarEmpresas(): Promise<Empresa[]> {
    try {
      const records = await pb.collection('empresas').getFullList({
        sort: 'ordem_exibicao,nome_fantasia',
        expand: 'empresa_pai',
      })

      // Buscar vínculos e áreas para enriquecer as métricas
      const [areas, pessoas] = await Promise.all([
        pb
          .collection('areas')
          .getFullList()
          .catch(() => []),
        pb
          .collection('pessoas')
          .getFullList()
          .catch(() => []),
      ])

      return records.map((r) => {
        const empPai = r.expand?.empresa_pai as { nome_fantasia?: string } | undefined
        const pessoasEmpresa = pessoas.filter((p) => p.empresa === r.id)
        const cltCount = pessoasEmpresa.filter(
          (p) => p.modalidade === 'CLT' || p.tipo_pessoa === 'PF',
        ).length
        const pjCount = pessoasEmpresa.filter(
          (p) => p.modalidade === 'PJ' || p.tipo_pessoa === 'PJ',
        ).length
        const areasCount = areas.filter((a) => a.empresa === r.id).length
        const custoTotal = pessoasEmpresa.reduce(
          (acc, cur) => acc + (Number(cur.valor_contratado) || 0),
          0,
        )

        return {
          id: r.id,
          nome_fantasia: r.nome_fantasia || '',
          razao_social: r.razao_social || '',
          cnpj: r.cnpj || '',
          tipo: (r.tipo as TipoEmpresa) || 'BU / Filial',
          status: (r.status as StatusEmpresa) || 'Operando',
          cnae: r.cnae || '',
          endereco_cidade: r.endereco_cidade || '',
          endereco_uf: r.endereco_uf || '',
          telefone: r.telefone || '',
          logo_cor: r.logo_cor || '#0D9488',
          sigla: r.sigla || 'EMP',
          empresa_pai: r.empresa_pai || '',
          empresa_pai_nome: empPai?.nome_fantasia || '',
          ordem_exibicao: r.ordem_exibicao || 0,
          observacoes: r.observacoes || '',
          created: r.created,
          updated: r.updated,
          total_vinculos: pessoasEmpresa.length,
          total_clt: cltCount,
          total_pj: pjCount,
          total_areas: areasCount,
          custo_mensal: custoTotal,
        }
      })
    } catch (e) {
      console.error('Erro ao listar empresas:', e)
      return []
    }
  },

  /**
   * Obtém uma empresa por ID
   */
  async obterEmpresa(id: string): Promise<Empresa | null> {
    try {
      const r = await pb.collection('empresas').getOne(id, {
        expand: 'empresa_pai',
      })
      const empPai = r.expand?.empresa_pai as { nome_fantasia?: string } | undefined
      return {
        id: r.id,
        nome_fantasia: r.nome_fantasia,
        razao_social: r.razao_social,
        cnpj: r.cnpj,
        tipo: r.tipo as TipoEmpresa,
        status: r.status as StatusEmpresa,
        cnae: r.cnae,
        endereco_cidade: r.endereco_cidade,
        endereco_uf: r.endereco_uf,
        telefone: r.telefone,
        logo_cor: r.logo_cor,
        sigla: r.sigla,
        empresa_pai: r.empresa_pai,
        empresa_pai_nome: empPai?.nome_fantasia,
        ordem_exibicao: r.ordem_exibicao,
        observacoes: r.observacoes,
        created: r.created,
        updated: r.updated,
      }
    } catch {
      return null
    }
  },

  /**
   * Cria uma nova empresa (Holding ou BU)
   */
  async criarEmpresa(input: CriarEmpresaInput): Promise<Empresa> {
    const payload = {
      ...input,
      cnpj: input.cnpj.trim(),
      nome_fantasia: input.nome_fantasia.trim(),
      razao_social: input.razao_social.trim(),
    }
    const record = await pb.collection('empresas').create(payload)
    return {
      id: record.id,
      nome_fantasia: record.nome_fantasia,
      razao_social: record.razao_social,
      cnpj: record.cnpj,
      tipo: record.tipo as TipoEmpresa,
      status: record.status as StatusEmpresa,
      cnae: record.cnae,
      endereco_cidade: record.endereco_cidade,
      endereco_uf: record.endereco_uf,
      telefone: record.telefone,
      logo_cor: record.logo_cor,
      sigla: record.sigla,
      empresa_pai: record.empresa_pai,
      ordem_exibicao: record.ordem_exibicao,
      observacoes: record.observacoes,
      created: record.created,
      updated: record.updated,
    }
  },

  /**
   * Atualiza dados de uma empresa
   */
  async atualizarEmpresa(input: AtualizarEmpresaInput): Promise<void> {
    const { id, ...data } = input
    await pb.collection('empresas').update(id, data)
  },

  /**
   * Exclui empresa somente se não possuir vínculos associados
   */
  async excluirEmpresa(id: string): Promise<{ success: boolean; motivo?: string }> {
    try {
      const pessoasVinculadas = await pb.collection('pessoas').getList(1, 1, {
        filter: `empresa = "${id}"`,
      })
      if (pessoasVinculadas.totalItems > 0) {
        return {
          success: false,
          motivo: `Não é possível excluir: existem ${pessoasVinculadas.totalItems} colaborador(es)/prestador(es) vinculados a esta empresa.`,
        }
      }

      const areasVinculadas = await pb.collection('areas').getList(1, 1, {
        filter: `empresa = "${id}"`,
      })
      if (areasVinculadas.totalItems > 0) {
        return {
          success: false,
          motivo: `Não é possível excluir: remova ou reatribua as ${areasVinculadas.totalItems} área(s) vinculadas antes de excluir a empresa.`,
        }
      }

      await pb.collection('empresas').delete(id)
      return { success: true }
    } catch (e: any) {
      return { success: false, motivo: e.message || 'Erro ao excluir empresa.' }
    }
  },

  /**
   * Lista áreas, opcionalmente filtradas por empresa
   */
  async listarAreas(empresaId?: string): Promise<Area[]> {
    try {
      const filter = empresaId ? `empresa = "${empresaId}"` : ''
      const records = await pb.collection('areas').getFullList({
        filter,
        sort: 'nome',
        expand: 'empresa',
      })

      const pessoas = await pb
        .collection('pessoas')
        .getFullList()
        .catch(() => [])

      return records.map((r) => {
        const emp = r.expand?.empresa as { nome_fantasia?: string } | undefined
        const totalVinculos = pessoas.filter((p) => p.area === r.id).length
        return {
          id: r.id,
          nome: r.nome || '',
          empresa: r.empresa || '',
          empresa_nome: emp?.nome_fantasia || '',
          responsavel_nome: r.responsavel_nome || '',
          descricao: r.descricao || '',
          ativa: r.ativa !== false,
          total_vinculos: totalVinculos,
          created: r.created,
          updated: r.updated,
        }
      })
    } catch (e) {
      console.error('Erro ao listar áreas:', e)
      return []
    }
  },

  /**
   * Cria uma nova área vinculada a uma empresa
   */
  async criarArea(input: CriarAreaInput): Promise<Area> {
    const record = await pb.collection('areas').create({
      nome: input.nome.trim(),
      empresa: input.empresa,
      responsavel_nome: input.responsavel_nome?.trim() || '',
      descricao: input.descricao?.trim() || '',
      ativa: input.ativa !== undefined ? input.ativa : true,
    })
    return {
      id: record.id,
      nome: record.nome,
      empresa: record.empresa,
      responsavel_nome: record.responsavel_nome,
      descricao: record.descricao,
      ativa: record.ativa,
      created: record.created,
      updated: record.updated,
    }
  },

  /**
   * Atualiza dados de uma área
   */
  async atualizarArea(input: AtualizarAreaInput): Promise<void> {
    const { id, ...data } = input
    await pb.collection('areas').update(id, data)
  },

  /**
   * Exclui uma área caso não haja vínculos associados
   */
  async excluirArea(id: string): Promise<{ success: boolean; motivo?: string }> {
    try {
      const vinculos = await pb.collection('pessoas').getList(1, 1, {
        filter: `area = "${id}"`,
      })
      if (vinculos.totalItems > 0) {
        return {
          success: false,
          motivo: `Não é possível excluir: existem ${vinculos.totalItems} vínculo(s) associados a esta área. Desative-a ou transfira os vínculos antes.`,
        }
      }
      await pb.collection('areas').delete(id)
      return { success: true }
    } catch (e: any) {
      return { success: false, motivo: e.message || 'Erro ao excluir área.' }
    }
  },

  /**
   * Lista usuários com perfil de gestor ou membros da equipe com suas BUs e Áreas vinculadas
   */
  async listarUsuariosGestao(): Promise<
    Array<{
      id: string
      name: string
      email: string
      cargo_funcao?: string
      empresa?: string
      empresa_nome?: string
      area?: string
      area_nome?: string
      created?: string
    }>
  > {
    try {
      const records = await pb.collection('users').getFullList({
        sort: 'name',
        expand: 'empresa,area',
      })

      return records.map((u) => {
        const expand = u.expand as
          | {
              empresa?: { nome_fantasia?: string }
              area?: { nome?: string }
            }
          | undefined

        return {
          id: u.id,
          name: u.name || u.email,
          email: u.email,
          cargo_funcao: u.cargo_funcao,
          empresa: u.empresa || '',
          empresa_nome: expand?.empresa?.nome_fantasia || '',
          area: u.area || '',
          area_nome: expand?.area?.nome || '',
          created: u.created,
        }
      })
    } catch (e) {
      console.error('Erro ao listar usuários:', e)
      return []
    }
  },

  /**
   * Atualiza a atribuição de BU e Área de um usuário
   */
  async atualizarEscopoUsuario(
    userId: string,
    dados: { empresa?: string; area?: string; cargo_funcao?: string; name?: string },
  ): Promise<void> {
    await pb.collection('users').update(userId, {
      empresa: dados.empresa || null,
      area: dados.area || null,
      ...(dados.cargo_funcao ? { cargo_funcao: dados.cargo_funcao } : {}),
      ...(dados.name ? { name: dados.name } : {}),
    })
  },
}
