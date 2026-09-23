/// <reference path="../pb_data/types.d.ts" />

/**
 * Hook pb_hooks: hierarquia_e_vigencia_validacoes.js
 *
 * Módulo 1 (v0.0.93):
 * 1. Bloqueio de ciclos hierárquicos:
 *    - Impede que A reporte a B e B reporte a A (A -> B -> A), direta ou indiretamente
 *    - Validação em onRecordCreateRequest('pessoas') e onRecordUpdateRequest('pessoas')
 *    - Sem declarações de nível superior (tudo inline dentro dos callbacks por convenção PocketBase JSVM)
 *
 * 2. Validação contra sobreposição e inconsistência de vigências
 *
 * 3. Endpoint de organograma com sanitização segura de dados financeiros por perfil
 */

// 1. Validação no create de pessoas
onRecordCreateRequest((e) => {
  const record = e.record
  const novoGestor = record.getString('gestor_imediato_pessoa')
  if (novoGestor && novoGestor === record.id) {
    throw new BadRequestError('Ciclo hierárquico inválido: uma pessoa não pode ser seu próprio gestor imediato.')
  }

  const vInicio = record.getString('vigencia_inicio')
  const vFim = record.getString('vigencia_fim')
  if (vInicio && vFim) {
    const dInicio = new Date(vInicio).getTime()
    const dFim = new Date(vFim).getTime()
    if (dFim < dInicio) {
      throw new BadRequestError('Data de término da vigência não pode ser anterior à data de início.')
    }
  }

  e.next()
}, 'pessoas')

// 2. Validação no update de pessoas
onRecordUpdateRequest((e) => {
  const record = e.record
  const pessoaId = record.id
  const novoGestor = record.getString('gestor_imediato_pessoa')

  if (novoGestor) {
    if (novoGestor === pessoaId) {
      throw new BadRequestError('Ciclo hierárquico inválido: uma pessoa não pode ser gestora de si mesma.')
    }

    // Algoritmo de detecção de ciclo inline
    const visitadosSet = new Set()
    visitadosSet.add(pessoaId)

    let atualId = novoGestor
    let profundidade = 0
    let temCiclo = false

    while (atualId && profundidade < 50) {
      if (atualId === pessoaId || visitadosSet.has(atualId)) {
        temCiclo = true
        break
      }
      visitadosSet.add(atualId)

      try {
        const rec = e.app.findRecordById('pessoas', atualId)
        if (!rec) break
        atualId = rec.getString('gestor_imediato_pessoa')
        profundidade++
      } catch (_) {
        break
      }
    }

    if (temCiclo) {
      throw new BadRequestError('Ciclo hierárquico detectado: a subordinação selecionada geraria uma referência circular (A -> B -> A).')
    }
  }

  const vInicio = record.getString('vigencia_inicio')
  const vFim = record.getString('vigencia_fim')
  if (vInicio && vFim) {
    const dInicio = new Date(vInicio).getTime()
    const dFim = new Date(vFim).getTime()
    if (dFim < dInicio) {
      throw new BadRequestError('Data de término da vigência não pode ser anterior à data de início.')
    }
  }

  // Gravar histórico se mudou gestor ou vigência
  try {
    const original = e.app.findRecordById('pessoas', pessoaId)
    const gestorAntigo = original.getString('gestor_imediato_pessoa')
    const inicioAntigo = original.getString('vigencia_inicio')
    const fimAntigo = original.getString('vigencia_fim')

    if (
      gestorAntigo !== novoGestor ||
      inicioAntigo !== vInicio ||
      fimAntigo !== vFim
    ) {
      let historico = []
      try {
        const histRaw = original.get('historico_movimentacoes')
        if (Array.isArray(histRaw)) {
          historico = histRaw
        } else if (typeof histRaw === 'string' && histRaw.trim()) {
          historico = JSON.parse(histRaw)
        }
      } catch (_) {
        historico = []
      }

      historico.push({
        data_movimentacao: new Date().toISOString(),
        usuario_responsavel: e.auth ? e.auth.id : 'sistema',
        gestor_anterior: gestorAntigo,
        gestor_novo: novoGestor,
        vigencia_inicio_anterior: inicioAntigo,
        vigencia_inicio_nova: vInicio,
        vigencia_fim_anterior: fimAntigo,
        vigencia_fim_nova: vFim,
        motivo: 'Atualização de estrutura organizacional / vigência',
      })

      record.set('historico_movimentacoes', historico)
    }
  } catch (errHist) {
    console.warn('[hierarquia_hook] Aviso ao processar histórico:', errHist)
  }

  e.next()
}, 'pessoas')

// 3. Endpoint para consulta do organograma por data de referência com sanitização segura
routerAdd('GET', '/backend/v1/organograma/arvore', (c) => {
  const authRecord = c.get('authRecord')
  if (!authRecord) {
    return c.json(401, { error: 'Autenticação requerida' })
  }

  const dataReferenciaStr = c.queryParam('data_referencia') || new Date().toISOString().split('T')[0]
  const dataRef = new Date(dataReferenciaStr).getTime()
  const buFiltro = c.queryParam('bu_id') || ''

  // Permissões
  const cargo = authRecord.getString('cargo_funcao')
  const userEmpresa = authRecord.getString('empresa')
  const isRhOuDiretoria = cargo === 'RH / Recrutador' || cargo === 'Diretoria / Executivo'

  // Regra fail-closed: se gestor contratante, deve ver apenas a sua BU
  let filtroBuFinal = buFiltro
  if (!isRhOuDiretoria) {
    if (!userEmpresa) {
      return c.json(403, { error: 'Acesso negado: usuário gestor sem empresa/BU vinculada.' })
    }
    filtroBuFinal = userEmpresa
  }

  // Buscar pessoas
  let filtroPessoas = "situacao_contrato != 'Encerrado'"
  if (filtroBuFinal) {
    filtroPessoas += ` && empresa = '${filtroBuFinal}'`
  }

  const pessoas = c.app.findRecordsByFilter('pessoas', filtroPessoas, 'nome', 200, 0)
  const empresas = c.app.findRecordsByFilter('empresas', '', 'ordem_exibicao', 50, 0)
  const areas = c.app.findRecordsByFilter('areas', '', 'nome', 100, 0)

  // Mapear empresas e áreas em lookups
  const empresaMap = {}
  for (let i = 0; i < empresas.length; i++) {
    const emp = empresas[i]
    empresaMap[emp.id] = {
      id: emp.id,
      nome: emp.getString('nome_fantasia') || emp.getString('razao_social'),
      razao_social: emp.getString('razao_social'),
      cnpj: emp.getString('cnpj'),
      tipo: emp.getString('tipo'),
      is_unidade_negocio: emp.getBool('is_unidade_negocio'),
      is_pessoa_juridica: emp.getBool('is_pessoa_juridica'),
      empresa_juridica_pai: emp.getString('empresa_juridica_pai'),
      correspondencia_bu_status: emp.getString('correspondencia_bu_status'),
    }
  }

  const areaMap = {}
  for (let j = 0; j < areas.length; j++) {
    const a = areas[j]
    areaMap[a.id] = {
      id: a.id,
      nome: a.getString('nome'),
      empresa: a.getString('empresa'),
    }
  }

  // Filtrar pessoas vigentes na data de referência e sanitizar dados financeiros sensíveis
  const nodes = []
  for (let k = 0; k < pessoas.length; k++) {
    const p = pessoas[k]
    const vInicioStr = p.getString('vigencia_inicio') || p.getString('data_inicio')
    const vFimStr = p.getString('vigencia_fim') || p.getString('data_fim')

    if (vInicioStr) {
      const dInicio = new Date(vInicioStr).getTime()
      if (dInicio > dataRef) {
        continue // ainda não vigente na data selecionada
      }
    }
    if (vFimStr) {
      const dFim = new Date(vFimStr).getTime()
      if (dFim < dataRef) {
        continue // já encerrado na data selecionada
      }
    }

    const node = {
      id: p.id,
      nome: p.getString('nome'),
      cargo: p.getString('cargo_funcao'),
      modalidade: p.getString('modalidade'),
      tipo_pessoa: p.getString('tipo_pessoa'),
      departamento: p.getString('departamento'),
      empresa_id: p.getString('empresa'),
      empresa_nome: empresaMap[p.getString('empresa')] ? empresaMap[p.getString('empresa')].nome : 'Não informada',
      area_id: p.getString('area'),
      area_nome: areaMap[p.getString('area')] ? areaMap[p.getString('area')].nome : 'Não informada',
      gestor_imediato_id: p.getString('gestor_imediato_pessoa') || null,
      gestor_responsavel_user_id: p.getString('gestor_responsavel') || null,
      gestor_nome: p.getString('gestor_nome') || '',
      vigencia_inicio: vInicioStr,
      vigencia_fim: vFimStr,
      rotulo_vigencia: p.getString('rotulo_vigencia') || 'Vigente a partir da implantação',
      situacao_contrato: p.getString('situacao_contrato'),
    }

    // SANITIZAÇÃO DE DADOS FINANCEIROS:
    // Apenas RH / Recrutador e Diretoria podem ver remuneração/valores contratuais
    if (isRhOuDiretoria) {
      node.valor_contratado = p.getInt('valor_contratado')
      node.valor_hora = p.getInt('valor_hora')
      node.dados_financeiros_ocultos = false
    } else {
      node.dados_financeiros_ocultos = true
      // valor_contratado e valor_hora estritamente omitidos
    }

    nodes.push(node)
  }

  return c.json(200, {
    success: true,
    data_referencia: dataReferenciaStr,
    total_posicoes: nodes.length,
    nodos: nodes,
    empresas: Object.values(empresaMap),
  })
})