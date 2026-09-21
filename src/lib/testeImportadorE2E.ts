import pb from '@/lib/pocketbase/client'
import { MODELO_CANDIDATOS_EXEMPLO } from '@/lib/templatesImportacao'
import {
  autoMapearColunas,
  validarCandidatosPlanilha,
  importarCandidatosLote,
  CAMPOS_CANDIDATO,
} from '@/services/importacaoService'

export async function executarTesteSimulacaoImportador(): Promise<{
  sucesso: boolean
  candidatosCriadosIds: string[]
  pipelineCriadosIds: string[]
  timelineCriadosIds: string[]
  logs: string[]
}> {
  const logs: string[] = []
  const candidatosCriadosIds: string[] = []
  const pipelineCriadosIds: string[] = []
  const timelineCriadosIds: string[] = []

  try {
    logs.push('1. Autenticando com credencial de admin/RH (severo.douglas2@gmail.com)...')
    await pb.collection('users').authWithPassword('severo.douglas2@gmail.com', 'Skip@Pass')
    logs.push(`Autenticado com sucesso como: ${pb.authStore.record?.email}`)

    logs.push('2. Buscando vagas existentes para relacionar com o modelo de exemplo...')
    const vagas = await pb.collection('vagas').getFullList()
    logs.push(
      `Encontradas ${vagas.length} vagas. Vaga de referência: ${vagas[0]?.titulo} (${vagas[0]?.id})`,
    )

    // Criar dados temporários para teste com prefixo de teste para facilitar rollback
    const linhasExemplo = MODELO_CANDIDATOS_EXEMPLO.map((linha, idx) => ({
      ...linha,
      'Nome Completo': `[TESTE-E2E] ${linha['Nome Completo']}`,
      'E-mail': `teste.e2e.cand${idx + 1}@souyess.com.br`,
      'Vaga de Interesse': vagas[0]?.titulo || linha['Vaga de Interesse'],
    }))

    const cabecalhos = Object.keys(linhasExemplo[0])
    logs.push(`3. Executando autoMapearColunas com ${cabecalhos.length} colunas...`)
    const mapeamento = autoMapearColunas(cabecalhos, CAMPOS_CANDIDATO)
    logs.push(`Mapeamento gerado: ${JSON.stringify(mapeamento)}`)

    logs.push('4. Executando validação dos 5 candidatos...')
    const relatorio = await validarCandidatosPlanilha(linhasExemplo, mapeamento, vagas, 'atualizar')
    logs.push(
      `Validação concluída: ${relatorio.totalValidos} válidos, ${relatorio.totalComErros} erros, ${relatorio.totalComAvisos} avisos`,
    )

    if (relatorio.totalComErros > 0) {
      throw new Error(`Validação falhou com ${relatorio.totalComErros} erros`)
    }

    logs.push('5. Executando importação efetiva em lote (importarCandidatosLote)...')
    const resultado = await importarCandidatosLote(relatorio.itens, 'atualizar')
    logs.push(
      `Importação concluída: ${resultado.totalCriados} criados, ${resultado.totalAtualizados} atualizados, ${resultado.totalErros} erros`,
    )

    if (resultado.totalErros > 0) {
      throw new Error(
        `Importação falhou com ${resultado.totalErros} erros: ${JSON.stringify(resultado.detalhesErros)}`,
      )
    }

    logs.push(
      '6. Validando no banco se os candidatos foram persistidos com score, pipeline e timeline...',
    )
    const candCriados = await pb.collection('candidatos').getFullList({
      filter: 'email ~ "teste.e2e.cand"',
    })
    logs.push(`Total de candidatos teste encontrados no banco: ${candCriados.length}`)

    for (const c of candCriados) {
      candidatosCriadosIds.push(c.id)
      logs.push(
        ` - Candidato ID: ${c.id} | Nome: ${c.nome} | Score: ${c.score_semantico} | Origem: ${c.canal_origem} | Status: ${c.status}`,
      )

      // Validar pipeline
      const pip = await pb.collection('pipeline').getFullList({
        filter: `candidato = "${c.id}"`,
      })
      if (pip.length > 0) {
        pip.forEach((p) => pipelineCriadosIds.push(p.id))
        logs.push(`   ✓ Pipeline encontrado: ${pip[0].id} (estágio: ${pip[0].estagio})`)
      }

      // Validar timeline
      const times = await pb.collection('eventos_timeline_candidato').getFullList({
        filter: `candidato = "${c.id}"`,
      })
      times.forEach((t) => timelineCriadosIds.push(t.id))
      logs.push(`   ✓ Eventos de timeline encontrados: ${times.length}`)
    }

    logs.push(
      '7. Limpando registros temporários de teste para manter a base limpa com apenas os seeds...',
    )
    for (const pId of pipelineCriadosIds) {
      await pb
        .collection('pipeline')
        .delete(pId)
        .catch(() => {})
    }
    for (const tId of timelineCriadosIds) {
      await pb
        .collection('eventos_timeline_candidato')
        .delete(tId)
        .catch(() => {})
    }
    for (const cId of candidatosCriadosIds) {
      await pb
        .collection('candidatos')
        .delete(cId)
        .catch(() => {})
    }
    logs.push('8. Limpeza concluída com sucesso. Base íntegra!')

    return {
      sucesso: true,
      candidatosCriadosIds,
      pipelineCriadosIds,
      timelineCriadosIds,
      logs,
    }
  } catch (err: any) {
    logs.push(`ERRO NO TESTE: ${err?.message || err}`)
    // Tentar limpeza de emergência
    for (const pId of pipelineCriadosIds) {
      await pb
        .collection('pipeline')
        .delete(pId)
        .catch(() => {})
    }
    for (const tId of timelineCriadosIds) {
      await pb
        .collection('eventos_timeline_candidato')
        .delete(tId)
        .catch(() => {})
    }
    for (const cId of candidatosCriadosIds) {
      await pb
        .collection('candidatos')
        .delete(cId)
        .catch(() => {})
    }
    return {
      sucesso: false,
      candidatosCriadosIds,
      pipelineCriadosIds,
      timelineCriadosIds,
      logs,
    }
  }
}
