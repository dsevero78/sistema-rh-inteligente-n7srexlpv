import pb from '@/lib/pocketbase/client'

export interface Competencia {
  id: string
  nome: string
  codigo?: string
  categoria: 'Técnica' | 'Comportamental' | 'Liderança' | 'Gestão & Negócios'
  descricao?: string
  criterios_proficiencia?: {
    nivel_1?: string
    nivel_2?: string
    nivel_3?: string
    nivel_4?: string
    nivel_5?: string
  }
  ativo: boolean
  created?: string
  updated?: string
}

export interface Cargo {
  id: string
  codigo: string
  nome: string
  descricao?: string
  ativo: boolean
  competencias_referencia?: string[]
  expand?: {
    competencias_referencia?: Competencia[]
  }
  created?: string
  updated?: string
}

export interface CentroCusto {
  id: string
  codigo: string
  nome: string
  empresa: string
  vigencia_inicio?: string
  vigencia_fim?: string
  status: 'Ativo' | 'Inativo'
  identificador_externo?: string
  expand?: {
    empresa?: {
      id: string
      nome_fantasia: string
      sigla: string
      tipo: string
    }
  }
  created?: string
  updated?: string
}

export type ProficienciaCompetencia =
  | 'Nao_avaliada'
  | 'Nivel_1_Basico'
  | 'Nivel_2_Intermediario'
  | 'Nivel_3_Avancado'
  | 'Nivel_4_Especialista'
  | 'Nivel_5_Referencia'

export type FonteCompetencia = 'autodeclarada' | 'gestor' | 'certificado' | 'curriculo_extraido'
export type StatusValidacaoCompetencia = 'pendente' | 'validada' | 'rejeitada'

export interface CompetenciaPessoa {
  id: string
  pessoa: string
  competencia: string
  proficiencia: ProficienciaCompetencia
  fonte: FonteCompetencia
  status_validacao: StatusValidacaoCompetencia
  evidencia_documento?: string
  responsavel_validacao?: string
  data_validacao?: string
  validade?: string
  observacoes?: string
  expand?: {
    pessoa?: {
      id: string
      nome: string
      cargo_funcao?: string
      departamento?: string
      empresa?: string
    }
    competencia?: Competencia
    evidencia_documento?: {
      id: string
      nome: string
      tipo: string
      arquivo: string
    }
    responsavel_validacao?: {
      id: string
      name: string
      email: string
    }
  }
  created?: string
  updated?: string
}

export interface MapeamentoNormalizacao {
  id: string
  registro_origem_colecao: 'pessoas' | 'vagas'
  registro_origem_id: string
  campo_origem: string
  texto_original: string
  empresa_contexto?: string
  area_contexto?: string
  tipo_destino: 'cargo' | 'centro_custo' | 'area'
  cargo_destino?: string
  centro_custo_destino?: string
  area_destino?: string
  justificativa?: string
  status: 'pendente' | 'aprovada' | 'aplicada' | 'rejeitada'
  confianca_metodo: 'deterministico_exato' | 'revisao_manual' | 'sugerido'
  responsavel_decisao?: string
  data_decisao?: string
  aplicado_em?: string
  aplicado_por_migracao?: boolean
  hash_recuperacao?: string
  expand?: {
    empresa_contexto?: { id: string; nome_fantasia: string; sigla: string }
    area_contexto?: { id: string; nome: string }
    cargo_destino?: Cargo
    centro_custo_destino?: CentroCusto
    responsavel_decisao?: { id: string; name: string }
  }
  created?: string
  updated?: string
}

export interface PossivelDuplicidade<T> {
  itemA: T
  itemB: T
  motivo: string
}

export const catalogosService = {
  // -------------------------------------------------------------
  // CARGOS
  // -------------------------------------------------------------
  async listarCargos(incluirInativos = true): Promise<Cargo[]> {
    const filter = incluirInativos ? '' : 'ativo = true'
    return await pb.collection('cargos').getFullList<Cargo>({
      filter,
      sort: 'nome',
      expand: 'competencias_referencia',
    })
  },

  async criarCargo(dados: Partial<Cargo>): Promise<Cargo> {
    return await pb.collection('cargos').create<Cargo>(dados)
  },

  async atualizarCargo(id: string, dados: Partial<Cargo>): Promise<Cargo> {
    return await pb.collection('cargos').update<Cargo>(id, dados)
  },

  detectarPossiveisDuplicidadesCargos(cargos: Cargo[]): PossivelDuplicidade<Cargo>[] {
    const duplicidades: PossivelDuplicidade<Cargo>[] = []
    const normalizar = (txt: string) =>
      txt
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')

    for (let i = 0; i < cargos.length; i++) {
      for (let j = i + 1; j < cargos.length; j++) {
        const a = cargos[i]
        const b = cargos[j]
        const normA = normalizar(a.nome)
        const normB = normalizar(b.nome)

        if (normA === normB && a.id !== b.id) {
          duplicidades.push({
            itemA: a,
            itemB: b,
            motivo: 'Grafia quase idêntica (diferenças apenas de espaçamento, acentuação ou caixa)',
          })
        } else if (
          (normA.includes(normB) || normB.includes(normA)) &&
          Math.abs(normA.length - normB.length) < 4
        ) {
          duplicidades.push({
            itemA: a,
            itemB: b,
            motivo: 'Alta similaridade fonética e estrutural de função',
          })
        }
      }
    }
    return duplicidades
  },

  // -------------------------------------------------------------
  // COMPETÊNCIAS
  // -------------------------------------------------------------
  async listarCompetencias(incluirInativos = true): Promise<Competencia[]> {
    const filter = incluirInativos ? '' : 'ativo = true'
    return await pb.collection('competencias').getFullList<Competencia>({
      filter,
      sort: 'categoria,nome',
    })
  },

  async criarCompetencia(dados: Partial<Competencia>): Promise<Competencia> {
    return await pb.collection('competencias').create<Competencia>(dados)
  },

  async atualizarCompetencia(id: string, dados: Partial<Competencia>): Promise<Competencia> {
    return await pb.collection('competencias').update<Competencia>(id, dados)
  },

  // -------------------------------------------------------------
  // CENTROS DE CUSTO
  // -------------------------------------------------------------
  async listarCentrosCusto(incluirInativos = true, empresaId?: string): Promise<CentroCusto[]> {
    const filters: string[] = []
    if (!incluirInativos) filters.push("status = 'Ativo'")
    if (empresaId) filters.push(`empresa = '${empresaId}'`)

    return await pb.collection('centros_custo').getFullList<CentroCusto>({
      filter: filters.join(' && '),
      sort: 'empresa,codigo',
      expand: 'empresa',
    })
  },

  async criarCentroCusto(dados: Partial<CentroCusto>): Promise<CentroCusto> {
    return await pb.collection('centros_custo').create<CentroCusto>(dados)
  },

  async atualizarCentroCusto(id: string, dados: Partial<CentroCusto>): Promise<CentroCusto> {
    return await pb.collection('centros_custo').update<CentroCusto>(id, dados)
  },

  // -------------------------------------------------------------
  // COMPETÊNCIAS POR PESSOA
  // -------------------------------------------------------------
  async listarCompetenciasPessoa(pessoaId: string): Promise<CompetenciaPessoa[]> {
    return await pb.collection('competencias_pessoas').getFullList<CompetenciaPessoa>({
      filter: `pessoa = '${pessoaId}'`,
      sort: '-created',
      expand: 'competencia,evidencia_documento,responsavel_validacao',
    })
  },

  async listarTodasCompetenciasPessoas(): Promise<CompetenciaPessoa[]> {
    return await pb.collection('competencias_pessoas').getFullList<CompetenciaPessoa>({
      sort: '-created',
      expand: 'pessoa,competencia,evidencia_documento,responsavel_validacao',
    })
  },

  async criarCompetenciaPessoa(dados: {
    pessoa: string
    competencia: string
    proficiencia: ProficienciaCompetencia
    fonte: FonteCompetencia
    status_validacao?: StatusValidacaoCompetencia
    evidencia_documento?: string
    observacoes?: string
    validade?: string
  }): Promise<CompetenciaPessoa> {
    // Regra rígida: fontes como "curriculo_extraido" ou "autodeclarada" nascem sempre pendentes
    let status = dados.status_validacao || 'pendente'
    if (dados.fonte === 'curriculo_extraido') {
      status = 'pendente'
    }

    return await pb.collection('competencias_pessoas').create<CompetenciaPessoa>({
      ...dados,
      status_validacao: status,
    })
  },

  async validarCompetenciaPessoa(
    id: string,
    aprovada: boolean,
    validadorUserId: string,
    observacoes?: string,
  ): Promise<CompetenciaPessoa> {
    return await pb.collection('competencias_pessoas').update<CompetenciaPessoa>(id, {
      status_validacao: aprovada ? 'validada' : 'rejeitada',
      responsavel_validacao: validadorUserId,
      data_validacao: new Date().toISOString().slice(0, 10),
      ...(observacoes ? { observacoes } : {}),
    })
  },

  // -------------------------------------------------------------
  // MAPEAMENTO DE NORMALIZAÇÃO CONTROLADA
  // -------------------------------------------------------------
  async listarMapeamentos(status?: string): Promise<MapeamentoNormalizacao[]> {
    const filter = status && status !== 'todos' ? `status = '${status}'` : ''
    return await pb.collection('mapeamento_normalizacao').getFullList<MapeamentoNormalizacao>({
      filter,
      sort: '-created',
      expand:
        'empresa_contexto,area_contexto,cargo_destino,centro_custo_destino,responsavel_decisao',
    })
  },

  /**
   * Aprovar e aplicar correspondência manualmente pelo RH
   */
  async aprovarEAplicarCorrespondencia(
    mapId: string,
    userId: string,
    justificativa?: string,
  ): Promise<MapeamentoNormalizacao> {
    const mapRecord = await pb
      .collection('mapeamento_normalizacao')
      .getOne<MapeamentoNormalizacao>(mapId)

    // Atualiza o registro de mapeamento
    const updatedMap = await pb
      .collection('mapeamento_normalizacao')
      .update<MapeamentoNormalizacao>(mapId, {
        status: 'aplicada',
        responsavel_decisao: userId,
        data_decisao: new Date().toISOString().slice(0, 10),
        aplicado_em: new Date().toISOString().slice(0, 10),
        justificativa: justificativa || mapRecord.justificativa,
        hash_recuperacao: `RECUP_MANUAL_${mapRecord.registro_origem_colecao}_${mapRecord.registro_origem_id}_${Date.now()}`,
      })

    // Aplica o vínculo no registro de origem ao lado do texto
    if (mapRecord.registro_origem_colecao === 'pessoas') {
      const updatePayload: Record<string, any> = {}
      if (mapRecord.tipo_destino === 'cargo' && mapRecord.cargo_destino) {
        updatePayload.cargo_catalogo = mapRecord.cargo_destino
      } else if (mapRecord.tipo_destino === 'centro_custo' && mapRecord.centro_custo_destino) {
        updatePayload.centro_custo_catalogo = mapRecord.centro_custo_destino
      }
      if (Object.keys(updatePayload).length > 0) {
        await pb.collection('pessoas').update(mapRecord.registro_origem_id, updatePayload)
      }
    } else if (mapRecord.registro_origem_colecao === 'vagas') {
      if (mapRecord.tipo_destino === 'cargo' && mapRecord.cargo_destino) {
        await pb.collection('vagas').update(mapRecord.registro_origem_id, {
          cargo_catalogo: mapRecord.cargo_destino,
        })
      }
    }

    return updatedMap
  },

  async rejeitarCorrespondencia(
    mapId: string,
    userId: string,
    motivo: string,
  ): Promise<MapeamentoNormalizacao> {
    return await pb.collection('mapeamento_normalizacao').update<MapeamentoNormalizacao>(mapId, {
      status: 'rejeitada',
      responsavel_decisao: userId,
      data_decisao: new Date().toISOString().slice(0, 10),
      justificativa: motivo,
    })
  },

  /**
   * PROCEDIMENTO DE RECUPERAÇÃO SEGURA:
   * Desfaz apenas vínculos criados por migração/automação cuja destinação
   * ainda coincida exatamente com o registro mapeado (sem sobrescrever alterações manuais posteriores).
   */
  async desfazerVinculoNormalizacao(
    mapId: string,
  ): Promise<{ sucesso: boolean; mensagem: string }> {
    const map = await pb.collection('mapeamento_normalizacao').getOne<MapeamentoNormalizacao>(mapId)
    if (map.status !== 'aplicada') {
      return { sucesso: false, mensagem: 'Este mapeamento não está com status aplicado.' }
    }

    if (map.registro_origem_colecao === 'pessoas') {
      const p = await pb.collection('pessoas').getOne(map.registro_origem_id)
      if (map.tipo_destino === 'cargo') {
        if (p.cargo_catalogo === map.cargo_destino) {
          await pb.collection('pessoas').update(p.id, { cargo_catalogo: null })
        } else {
          return {
            sucesso: false,
            mensagem:
              'O cargo desta pessoa foi alterado posteriormente de forma legítima. Desfazimento cancelado por segurança.',
          }
        }
      } else if (map.tipo_destino === 'centro_custo') {
        if (p.centro_custo_catalogo === map.centro_custo_destino) {
          await pb.collection('pessoas').update(p.id, { centro_custo_catalogo: null })
        } else {
          return {
            sucesso: false,
            mensagem:
              'O centro de custo foi alterado posteriormente. Desfazimento cancelado por segurança.',
          }
        }
      }
    } else if (map.registro_origem_colecao === 'vagas') {
      const v = await pb.collection('vagas').getOne(map.registro_origem_id)
      if (map.tipo_destino === 'cargo') {
        if (v.cargo_catalogo === map.cargo_destino) {
          await pb.collection('vagas').update(v.id, { cargo_catalogo: null })
        } else {
          return {
            sucesso: false,
            mensagem: 'O cargo da vaga foi alterado posteriormente. Desfazimento cancelado.',
          }
        }
      }
    }

    await pb.collection('mapeamento_normalizacao').update(mapId, {
      status: 'pendente',
      aplicado_em: null,
    })

    return {
      sucesso: true,
      mensagem: 'Vínculo desfeito com segurança e retornado ao status pendente.',
    }
  },
}
