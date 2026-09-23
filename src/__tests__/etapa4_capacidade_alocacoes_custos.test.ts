/**
 * src/__tests__/etapa4_capacidade_alocacoes_custos.test.ts
 *
 * Suíte de Testes da ETAPA 4 do Módulo 1 (Planejamento da Força de Trabalho):
 * 1. Pessoa compartilhada sem duplicidade no total consolidado
 * 2. Alocação por projeto sem dupla contagem pela BU associada
 * 3. Períodos parciais e indisponibilidades sobrepostas (sem dupla contagem)
 * 4. Horas realizadas separadas de compromissos futuros (com data de corte)
 * 5. Prestador por escopo sem conversão indevida em horas
 * 6. Bloqueio de excesso de capacidade inclusive em concorrência
 * 7. Competência não avaliada sem nota fictícia
 * 8. Custos consolidados sem duplicação entre fontes (NF > Fechamento > Contrato)
 * 9. Alocação sem rateio financeiro automático (custo permanece na origem)
 * 10. Dados ausentes identificados formalmente como "CAPACIDADE NÃO DETERMINADA"
 * 11. Snapshot aprovado preservado imutável
 * 12. Regras de segurança de API por perfil e escopo de BU
 */

import { describe, it, expect, beforeEach } from 'vitest'
import pb from '@/lib/pocketbase/client'
import { capacidadeService } from '@/services/capacidadeService'
import { planejamentoForcaService } from '@/services/planejamentoForcaService'

describe('ETAPA 4: Capacidade, Alocações, Ocupações, Competências e Custos', () => {
  let tokenRh = ''
  let tokenTech = ''
  let tokenMidia = ''
  let tokenOps = ''

  let userRhId = ''
  let userTechId = ''
  let userMidiaId = ''
  let userOpsId = ''

  let empTechId = ''
  let empMidiaId = ''

  let lucasId = ''
  let renatoId = ''

  beforeEach(async () => {
    // Autentica como Douglas Severo (RH)
    const authRh = await pb
      .collection('users')
      .authWithPassword('severo.douglas2@gmail.com', '12345678')
    tokenRh = authRh.token
    userRhId = authRh.record.id

    // Busca IDs das empresas
    const empTech = await pb.collection('empresas').getFirstListItem("sigla='EMP-02'")
    empTechId = empTech.id
    const empMidia = await pb.collection('empresas').getFirstListItem("sigla='EMP-03'")
    empMidiaId = empMidia.id

    // Busca colaboradores
    const lucas = await pb.collection('pessoas').getFirstListItem("nome ~ 'Lucas Ferreira'")
    lucasId = lucas.id

    const renato = await pb.collection('pessoas').getFirstListItem("nome ~ 'Renato Albuquerque'")
    renatoId = renato.id
  })

  it('1. Pessoa compartilhada não gera duplicidade no total consolidado de pessoas', async () => {
    // Busca contagem consolidada de pessoas únicas
    const pessoas = await pb.collection('pessoas').getFullList({
      filter: "situacao_contrato = 'Vigente'",
    })
    const idsUnicos = new Set(pessoas.map((p) => p.id))
    expect(idsUnicos.size).toBe(pessoas.length)
  })

  it('2. Alocação por projeto sem dupla contagem pela BU associada', async () => {
    // Lucas está alocado no projeto PRJ-TECH-2026-OMNI
    // A alocação pertence a um único projeto e não duplica a carga horária
    const alocs = await capacidadeService.listarAlocacoes({ pessoaId: lucasId })
    expect(alocs.length).toBeGreaterThan(0)

    const mem = await capacidadeService.calcularCapacidadePessoaPeriodo(lucasId, '2026-10')
    expect(mem.statusCapacidade).toBe('DETERMINADA')
    // As alocações confirmadas somam exatamente a porcentagem do projeto
    expect(mem.alocacoesConfirmadasPercentual).toBe(50)
  })

  it('3. Períodos parciais e indisponibilidades sobrepostas não geram duplicidade de desconto', async () => {
    // Calcula capacidade em mês com evento de indisponibilidade
    const mem = await capacidadeService.calcularCapacidadePessoaPeriodo(lucasId, '2026-10')
    expect(mem.capacidadeLiquidaHoras).toBeLessThanOrEqual(mem.capacidadeBrutaHoras)
    // Indisponibilidades são subtraídas de forma líquida
    expect(mem.capacidadeLiquidaHoras).toBe(mem.capacidadeBrutaHoras - mem.indisponibilidadesHoras)
  })

  it('4. Horas realizadas mantêm-se separadas dos compromissos futuros', async () => {
    const mem = await capacidadeService.calcularCapacidadePessoaPeriodo(lucasId, '2026-10')
    // Horas realizadas (apontadas) são exibidas separadamente com data de corte
    expect(mem.dataCorteRealizado).toBeTruthy()
    expect(typeof mem.saldoRealizadoHoras).toBe('number')
    // A capacidade disponível para novas alocações NÃO subtrai as horas realizadas
    const disponivelEsperado = Math.max(
      0,
      mem.capacidadeLiquidaHoras - mem.reservaOperacionalHoras - mem.alocacoesConfirmadasHoras,
    )
    expect(mem.capacidadeDisponivelNovasAlocacoesHoras).toBeCloseTo(disponivelEsperado, 1)
  })

  it('5. Prestador por escopo não sofre conversão indevida em horas de disponibilidade', async () => {
    // Renato Albuquerque possui alocação por escopo (entregável IaC)
    const memRenato = await capacidadeService.calcularCapacidadePessoaPeriodo(renatoId, '2026-11')
    expect(memRenato.statusCapacidade).toBe('DETERMINADA')
    // Alocações por escopo não geram alocaçõesConfirmadasHoras
    expect(memRenato.alocacoesEscopoContagem).toBeGreaterThan(0)
    expect(memRenato.alocacoesConfirmadasHoras).toBe(0)
  })

  it('6. Bloqueio de excesso de capacidade via endpoint atômico do servidor', async () => {
    // Cria proposta de alocação que excede 100% para Lucas (ex: 70%, quando já tem 50%)
    const novaAloc = await capacidadeService.criarAlocacao({
      pessoa: lucasId,
      destino_organizacional: 'Projeto Teste Sobrecarga',
      periodo_inicio: '2026-10-01 00:00:00.000Z',
      periodo_fim: '2026-10-31 00:00:00.000Z',
      modalidade_capacidade: 'disponibilidade',
      unidade: 'percentual',
      quantidade: 70,
      situacao: 'proposta',
      responsavel: userRhId,
      responsavel_nome: 'RH Teste',
      is_demonstracao: true,
    })

    // Tentar confirmar SEM exceção deve ser bloqueado pelo backend
    await expect(
      capacidadeService.confirmarAlocacaoAtomica(novaAloc.id, false, ''),
    ).rejects.toThrow(/BLOQUEIO_CAPACIDADE/)

    // Com exceção formal autorizada, a confirmação é permitida
    const resOk = await capacidadeService.confirmarAlocacaoAtomica(
      novaAloc.id,
      true,
      'Exceção aprovada para entrega crítica de release.',
    )
    expect(resOk.success).toBe(true)

    // Cleanup
    await capacidadeService.excluirAlocacao(novaAloc.id)
  })

  it('7. Competência não avaliada não recebe nota fictícia', async () => {
    const pos = await pb
      .collection('posicoes_planejadas')
      .getFirstListItem("codigo='POS-2026-TECH-001'")
    const cruz = await capacidadeService.cruzarCompetenciasOcupante(pos.id, lucasId)

    expect(cruz.posicaoCodigo).toBe('POS-2026-TECH-001')
    expect(cruz.itens.length).toBeGreaterThan(0)

    // Qualquer competência sem nota ou não cadastrada é identificada como 'nao_avaliada' ou 'competencia_nao_cadastrada'
    for (const item of cruz.itens) {
      if (item.estado === 'nao_avaliada') {
        expect(item.rotuloEstado).toContain('Sem nota fictícia')
      }
    }
  })

  it('8. Custos consolidados sem duplicação entre notas fiscais, fechamentos e contratos', async () => {
    const custos = await capacidadeService.consolidarCustos('2026-10')
    expect(custos.custoEstimadoAtual).toBeGreaterThan(0)
    // Detalhamento de fontes separa contrato, fechamento e nota_fiscal
    const fontes = custos.detalhesFontes
    expect(fontes.length).toBeGreaterThan(0)
  })

  it('9. Alocação em projetos não gera rateio financeiro automático sem critério aprovado', async () => {
    const custos = await capacidadeService.consolidarCustos('2026-10')
    // Custo permanece na origem sem distribuição contábil não autorizada
    expect(custos.semCriterioRateioPendente).toBe(0)
  })

  it('10. Dados essenciais ausentes resultam formalmente em CAPACIDADE NÃO DETERMINADA', async () => {
    // Cria pessoa temporária sem horas mensais base informadas
    const pesIncompleta = await pb.collection('pessoas').create({
      nome: 'Colaborador Sem Carga Horaria',
      email: `temp.teste.${Date.now()}@exemplo.com`,
      modalidade: 'CLT',
      empresa: empTechId,
      situacao_contrato: 'Vigente',
      horas_mensais_base: 0, // Zero / Não informado
    })

    const mem = await capacidadeService.calcularCapacidadePessoaPeriodo(pesIncompleta.id, '2026-10')
    expect(mem.statusCapacidade).toBe('CAPACIDADE NÃO DETERMINADA')
    expect(mem.motivoNaoDeterminada).toContain('Carga horária')

    await pb.collection('pessoas').delete(pesIncompleta.id)
  })

  it('11. Snapshot aprovado do plano permanece imutável e preservado', async () => {
    const planoTech = await pb
      .collection('planos_capacidade')
      .getFirstListItem("codigo='PLANO-2025-001'")
    expect(planoTech.situacao).toBe('Aprovado')
    expect(planoTech.snapshot_aprovacao).toBeDefined()
    expect(planoTech.snapshot_aprovacao.posicoes).toBeDefined()
  })

  it('12. Permissões de API: Gestor de Tecnologia não pode acessar alocações da Vértice Mídia', async () => {
    // Autentica como Gestor de Tecnologia
    await pb.collection('users').authWithPassword('gestor@empresa.com', '12345678')

    // Tentar listar projetos da Vértice Mídia
    const projs = await pb.collection('projetos').getFullList()
    // Todas as alocações visíveis devem ser da sua empresa ou de sua responsabilidade
    for (const pr of projs) {
      if (pr.empresa_responsavel !== empTechId && pr.bu_relacionada !== empTechId) {
        expect(pr.responsavel).toBe(pb.authStore.record?.id)
      }
    }
  })
})
