/**
 * pb_hook: alocacoes_concorrencia_validacao.js
 *
 * Validação server-side atômica de alocações:
 * 1. Impede confirmação de alocações que ultrapassem a capacidade disponível calculada
 * 2. Bloqueia concorrência: duas confirmações simultâneas não podem estourar o 100% de disponibilidade
 * 3. Permite ultrapassar apenas se excecao_autorizada = true com justificativa formal registrada
 * 4. Valida se a modalidade é disponibilidade vs escopo (prestador por escopo não desconta horas de disponibilidade)
 */

routerAdd('POST', '/backend/v1/alocacoes/confirmar-atomica', (c) => {
  const authRecord = c.get('authRecord')
  if (!authRecord) {
    return c.json(401, { error: 'Autenticação necessária' })
  }

  const body = $apis.requestInfo(c).data
  const alocacaoId = body.alocacao_id
  const excecaoAutorizada = Boolean(body.excecao_autorizada)
  const justificativaExcecao = body.justificativa_excecao || ''

  if (!alocacaoId) {
    return c.json(400, { error: 'ID da alocação obrigatório' })
  }

  let resultado
  try {
    $app.runInTransaction((txApp) => {
      const aloc = txApp.findRecordById('alocacoes', alocacaoId)
      if (!aloc) {
        throw new Error('Alocação não encontrada')
      }

      // Se já estiver confirmada, retorna idempotente
      if (aloc.getString('situacao') === 'confirmada') {
        resultado = aloc
        return
      }

      const pessoaId = aloc.getString('pessoa')
      const pessoa = txApp.findRecordById('pessoas', pessoaId)
      const modalidadeAloc = aloc.getString('modalidade_capacidade')
      const unidadeAloc = aloc.getString('unidade')
      const qtdAloc = aloc.getFloat('quantidade')
      const dtInicio = aloc.getString('periodo_inicio')
      const dtFim = aloc.getString('periodo_fim')

      // Se for por escopo, não concorre na capacidade de horas/percentual
      if (modalidadeAloc === 'escopo') {
        aloc.set('situacao', 'confirmada')
        txApp.save(aloc)
        resultado = aloc
        return
      }

      // Validação de disponibilidade para modalidade disponibilidade:
      // Busca todas as alocações ativas/confirmadas para esta pessoa que se sobrepõem ao período
      const querySobreposicao = `
        SELECT id, quantidade, unidade, modalidade_capacidade
        FROM alocacoes
        WHERE pessoa = {:pessoaId}
          AND situacao = 'confirmada'
          AND id != {:alocId}
          AND modalidade_capacidade = 'disponibilidade'
          AND date(periodo_inicio) <= date({:fim})
          AND date(periodo_fim) >= date({:inicio})
      `

      const rows = []
      txApp
        .db()
        .newQuery(querySobreposicao)
        .bind({
          pessoaId: pessoaId,
          alocId: alocId,
          inicio: dtInicio,
          fim: dtFim,
        })
        .all(rows)

      let totalJaAlocadoPercentual = 0
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        if (r.unidade === 'percentual') {
          totalJaAlocadoPercentual += Number(r.quantidade)
        } else if (r.unidade === 'horas_mes') {
          // Converte horas_mes para percentual baseado em horas_mensais_base da pessoa (padrão 160)
          const baseHoras = pessoa.getFloat('horas_mensais_base') || 160
          totalJaAlocadoPercentual += (Number(r.quantidade) / baseHoras) * 100
        }
      }

      // Nova alocação convertida para percentual
      let novaQtdPercentual = 0
      if (unidadeAloc === 'percentual') {
        novaQtdPercentual = qtdAloc
      } else if (unidadeAloc === 'horas_mes') {
        const baseHoras = pessoa.getFloat('horas_mensais_base') || 160
        novaQtdPercentual = (qtdAloc / baseHoras) * 100
      }

      const totalAposConfirmacao = totalJaAlocadoPercentual + novaQtdPercentual

      if (totalAposConfirmacao > 100) {
        if (!excecaoAutorizada || !justificativaExcecao.trim()) {
          throw new Error(
            `BLOQUEIO_CAPACIDADE: A alocação demandaria ${totalAposConfirmacao.toFixed(1)}% da capacidade, excedendo o limite de 100% (já alocado: ${totalJaAlocadoPercentual.toFixed(1)}%). Requer exceção formal autorizada.`,
          )
        }
        aloc.set('excecao_autorizada', true)
        aloc.set('excecao_justificativa', justificativaExcecao)
      }

      aloc.set('situacao', 'confirmada')
      txApp.save(aloc)
      resultado = aloc
    })
  } catch (err) {
    return c.json(400, { error: err.message })
  }

  return c.json(200, {
    success: true,
    alocacao: resultado,
    mensagem: 'Alocação confirmada com sucesso com validação de capacidade atômica.',
  })
})
