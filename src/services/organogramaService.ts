import pb from '@/lib/pocketbase/client'

export interface NodoOrganograma {
  id: string
  nome: string
  cargo: string
  modalidade: string
  tipo_pessoa: string
  departamento: string
  empresa_id: string
  empresa_nome: string
  area_id: string
  area_nome: string
  gestor_imediato_id: string | null
  gestor_responsavel_user_id: string | null
  gestor_nome: string
  vigencia_inicio: string | null
  vigencia_fim: string | null
  rotulo_vigencia: string
  situacao_contrato: string
  valor_contratado?: number
  valor_hora?: number
  dados_financeiros_ocultos: boolean
  subordinados?: NodoOrganograma[]
}

export interface EmpresaOrganograma {
  id: string
  nome: string
  razao_social: string
  cnpj: string
  tipo: string
  is_unidade_negocio: boolean
  is_pessoa_juridica: boolean
  empresa_juridica_pai?: string
  correspondencia_bu_status: 'pendente_decisao_negocio' | 'definida' | 'nao_aplicavel'
}

export interface OrganogramaDataResponse {
  success: boolean
  data_referencia: string
  total_posicoes: number
  nodos: NodoOrganograma[]
  empresas: EmpresaOrganograma[]
}

export const organogramaService = {
  /**
   * Consulta a árvore hierárquica e posições por data de referência via backend seguro
   */
  async obterOrganograma(dataReferencia?: string, buId?: string): Promise<OrganogramaDataResponse> {
    const params = new URLSearchParams()
    if (dataReferencia) params.append('data_referencia', dataReferencia)
    if (buId && buId !== 'todas') params.append('bu_id', buId)

    const url = `/backend/v1/organograma/arvore?${params.toString()}`
    const res = await pb.send<OrganogramaDataResponse>(url, {
      method: 'GET',
    })
    return res
  },

  /**
   * Valida localmente se vincular pessoaId a novoGestorId criaria ciclo direto ou indireto
   */
  verificarCicloHierarquicoLocal(
    pessoaId: string,
    novoGestorId: string | null | undefined,
    pessoas: Array<{ id: string; gestor_imediato_pessoa?: string | null }>,
  ): { temCiclo: boolean; motivo?: string } {
    if (!novoGestorId) return { temCiclo: false }
    if (pessoaId === novoGestorId) {
      return { temCiclo: true, motivo: 'Uma pessoa não pode ser gestora direta de si mesma.' }
    }

    const mapGestores = new Map<string, string | null>()
    pessoas.forEach((p) => {
      mapGestores.set(p.id, p.gestor_imediato_pessoa || null)
    })

    const visitados = new Set<string>()
    visitados.add(pessoaId)

    let atual: string | null | undefined = novoGestorId
    let prof = 0
    while (atual && prof < 50) {
      if (atual === pessoaId) {
        return {
          temCiclo: true,
          motivo:
            'Ciclo hierárquico detectado: a pessoa selecionada já se subordina direta ou indiretamente a este colaborador (A → B → A).',
        }
      }
      if (visitados.has(atual)) {
        return {
          temCiclo: true,
          motivo: 'Ciclo hierárquico detectado na cadeia de subordinação.',
        }
      }
      visitados.add(atual)
      atual = mapGestores.get(atual)
      prof++
    }

    return { temCiclo: false }
  },

  /**
   * Monta hierarquia em árvore (Nodos com subordinados) a partir da lista plana
   */
  construirArvore(nodos: NodoOrganograma[]): NodoOrganograma[] {
    const map = new Map<string, NodoOrganograma>()
    nodos.forEach((n) => {
      map.set(n.id, { ...n, subordinados: [] })
    })

    const raizes: NodoOrganograma[] = []

    nodos.forEach((n) => {
      const atual = map.get(n.id)!
      if (n.gestor_imediato_id && map.has(n.gestor_imediato_id)) {
        const gestor = map.get(n.gestor_imediato_id)!
        gestor.subordinados = gestor.subordinados || []
        gestor.subordinados.push(atual)
      } else {
        // Sem gestor imediato cadastrado no período: fica como nó de topo
        raizes.push(atual)
      }
    })

    return raizes
  },
}
