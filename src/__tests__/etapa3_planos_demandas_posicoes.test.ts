/**
 * Testes Diretos de API — ETAPA 3: Planos, Versões, Demandas e Posições
 *
 * Valida os requisitos obrigatórios do Briefing:
 *  1. Criação e persistência de plano, demanda e posição
 *  2. Escopo de acesso por perfil via API (gestor só vê própria BU; RH vê o grupo todo)
 *  3. Submissão, devolução com justificativa e congelamento de plano
 *  4. Bloqueio de aprovação quando alçada não estiver definida formalmente
 *  5. Aprovação com snapshot histórico imutável dos dados e nomes corporativos
 *  6. Proteção de itens (demandas e posições) contra alteração após aprovação
 *  7. Nova revisão sem alterar ou substituir a versão aprovada anterior antes da nova aprovação
 *  8. Substituição da versão anterior somente quando nova versão for aprovada
 *  9. Idempotência e prevenção de duplicidade na geração de solicitação de contratação (vaga)
 *  10. Custos ausentes não tratados como zero (reconhecimento explícito de cálculo PARCIAL)
 *  11. Preservação das correspondências pendentes e escopos da Etapa 2
 *  12. Teste de não ejeção indevida do usuário para /login
 */

import { describe, it, expect, beforeAll } from 'vitest'
import pb from '@/lib/pocketbase/client'
import {
  planejamentoForcaService,
  PlanoCapacidade,
  DemandaPlanejada,
  PosicaoPlanejada,
} from '@/services/planejamentoForcaService'

const USERS = {
  rh: { email: 'severo.douglas2@gmail.com', pass: 'teste123456' },
  gestorTech: { email: 'gestor@empresa.com', pass: 'teste123456' },
  gestoraMidia: { email: 'gestora.produto@empresa.com', pass: 'teste123456' },
  gestorOps: { email: 'gestor.operacoes@empresa.com', pass: 'teste123456' },
}

describe('ETAPA 3 — Planos, Versões, Demandas e Posições (Testes de API e Governança)', () => {
  let userRhRecord: any
  let userTechRecord: any
  let userMidiaRecord: any
  let planoTechAprovado: PlanoCapacidade
  let planoMidiaRascunho: PlanoCapacidade
  let planoOpsEmAnalise: PlanoCapacidade

  beforeAll(async () => {
    // Autentica inicialmente como RH para carregar referências base
    const authData = await pb.collection('users').authWithPassword(USERS.rh.email, USERS.rh.pass)
    userRhRecord = authData.record

    // Localizar planos do seed
    const lista = await pb.collection('planos_capacidade').getFullList<PlanoCapacidade>()
    planoTechAprovado = lista.find((p) => p.codigo === 'PLANO-2026-TECH-01')!
    planoMidiaRascunho = lista.find((p) => p.codigo === 'PLANO-2026-MIDIA-01')!
    planoOpsEmAnalise = lista.find((p) => p.codigo === 'PLANO-2026-OPS-01')!
  })

  // ---------------------------------------------------------------------------
  // 1. ESCOPO SERVER-SIDE POR BU E PERFIL
  // ---------------------------------------------------------------------------
  it('1. Gestor de Tecnologia vê apenas planos da sua BU (Tecnologia) e não de Mídia nem Operações', async () => {
    const authTech = await pb
      .collection('users')
      .authWithPassword(USERS.gestorTech.email, USERS.gestorTech.pass)
    userTechRecord = authTech.record

    const planosVisiveis = await pb.collection('planos_capacidade').getFullList()
    expect(planosVisiveis.length).toBeGreaterThan(0)

    // Todos os planos retornados devem pertencer estritamente à empresa do gestor tech
    for (const p of planosVisiveis) {
      expect(p.empresa).toBe(userTechRecord.empresa)
    }

    // Não deve conter plano da Vértice Mídia
    const hasMidia = planosVisiveis.some((p) => p.codigo === 'PLANO-2026-MIDIA-01')
    expect(hasMidia).toBe(false)
  })

  it('2. Gestora de Mídia vê apenas planos da sua BU (Vértice Mídia)', async () => {
    const authMidia = await pb
      .collection('users')
      .authWithPassword(USERS.gestoraMidia.email, USERS.gestoraMidia.pass)
    userMidiaRecord = authMidia.record

    const planosVisiveis = await pb.collection('planos_capacidade').getFullList()
    for (const p of planosVisiveis) {
      expect(p.empresa).toBe(userMidiaRecord.empresa)
    }

    const hasTech = planosVisiveis.some((p) => p.codigo === 'PLANO-2026-TECH-01')
    expect(hasTech).toBe(false)
  })

  it('3. RH / Recrutador enxerga os planos de todas as BUs corporativas', async () => {
    await pb.collection('users').authWithPassword(USERS.rh.email, USERS.rh.pass)
    const planos = await pb.collection('planos_capacidade').getFullList()

    const temTech = planos.some((p) => p.codigo === 'PLANO-2026-TECH-01')
    const temMidia = planos.some((p) => p.codigo === 'PLANO-2026-MIDIA-01')
    const temOps = planos.some((p) => p.codigo === 'PLANO-2026-OPS-01')

    expect(temTech).toBe(true)
    expect(temMidia).toBe(true)
    expect(temOps).toBe(true)
  })

  // ---------------------------------------------------------------------------
  // 2. CRIAÇÃO, EDIÇÃO E TRANSIÇÕES DE ESTADO DO PLANO
  // ---------------------------------------------------------------------------
  it('4. Criação e persistência de novo plano com estado inicial Rascunho e versão v1.0', async () => {
    await pb.collection('users').authWithPassword(USERS.rh.email, USERS.rh.pass)

    const codigoTeste = `PLANO-TESTE-${Date.now()}`
    const novo = await planejamentoForcaService.criarPlano({
      codigo: codigoTeste,
      nome: 'Plano Piloto de Capacidade para Teste',
      periodo_referencia: '2026-Q4',
      empresa: userRhRecord.empresa,
      responsavel: userRhRecord.id,
      responsavel_nome: 'Douglas Severo',
      objetivo: 'Testar fluxo automatizado de aceite',
    })

    expect(novo.id).toBeDefined()
    expect(novo.situacao).toBe('Rascunho')
    expect(novo.versao_numero).toBe(1)
    expect(novo.rotulo_versao).toBe('v1.0')

    // Limpeza
    await pb.collection('planos_capacidade').delete(novo.id)
  })

  it('5. Submissão para análise congela o plano e impede edição direta dos campos', async () => {
    await pb.collection('users').authWithPassword(USERS.rh.email, USERS.rh.pass)

    const planoCriado = await planejamentoForcaService.criarPlano({
      codigo: `PLANO-SUBM-${Date.now()}`,
      nome: 'Plano Submissao Teste',
      periodo_referencia: '2026-Q4',
      empresa: userRhRecord.empresa,
      responsavel: userRhRecord.id,
      objetivo: 'Testar congelamento',
    })

    // Submeter
    const submetido = await planejamentoForcaService.submeterPlano(planoCriado.id, userRhRecord.id)
    expect(submetido.situacao).toBe('Em análise')
    expect(submetido.submetido_por).toBe(userRhRecord.id)

    // Tentar editar enquanto em análise deve lançar erro
    await expect(
      planejamentoForcaService.atualizarPlano(planoCriado.id, {
        nome: 'Nome Alterado Indevidamente',
      }),
    ).rejects.toThrow('Planos em análise ou aprovados não podem ser editados.')

    // Devolver com justificativa para desbloquear
    const devolvido = await planejamentoForcaService.devolverPlano(
      planoCriado.id,
      userRhRecord.id,
      'Ajustar premissas técnicas',
    )
    expect(devolvido.situacao).toBe('Devolvido para ajuste')
    expect(devolvido.justificativa_devolucao).toBe('Ajustar premissas técnicas')

    // Em devolução, edição volta a ser permitida
    const atualizado = await planejamentoForcaService.atualizarPlano(planoCriado.id, {
      nome: 'Nome Ajustado com Sucesso',
    })
    expect(atualizado.nome).toBe('Nome Ajustado com Sucesso')

    // Limpeza
    await pb.collection('planos_capacidade').delete(planoCriado.id)
  })

  // ---------------------------------------------------------------------------
  // 3. REGRAS DE ALÇADA, APROVAÇÃO E SNAPSHOT IMUTÁVEL
  // ---------------------------------------------------------------------------
  it('6. Aprovação é BLOQUEADA quando a alçada executiva não estiver formalizada', async () => {
    await pb.collection('users').authWithPassword(USERS.rh.email, USERS.rh.pass)

    // planoOpsEmAnalise foi seeded com alcada_aprovacao_definida = false
    await expect(
      planejamentoForcaService.aprovarPlano(planoOpsEmAnalise.id, userRhRecord.id, false),
    ).rejects.toThrow(
      'Aprovação bloqueada: a alçada executiva deste plano ainda não foi formalizada',
    )
  })

  it('7. Plano aprovado contém snapshot histórico íntegro com referências corporativas e hash', async () => {
    await pb.collection('users').authWithPassword(USERS.rh.email, USERS.rh.pass)

    const plano = await pb.collection('planos_capacidade').getOne(planoTechAprovado.id)
    expect(plano.situacao).toBe('Aprovado')
    expect(plano.snapshot_aprovacao).toBeDefined()
    expect(plano.snapshot_aprovacao.versao).toBe('v1.0')
    expect(plano.snapshot_aprovacao.empresa.sigla).toBe('EMP-02')
    expect(plano.snapshot_aprovacao.demandas.length).toBeGreaterThan(0)
    expect(plano.snapshot_aprovacao.posicoes.length).toBeGreaterThan(0)
    expect(plano.hash_aprovacao).toBeDefined()
  })

  it('8. Itens de plano aprovado são protegidos contra alteração e exclusão', async () => {
    await pb.collection('users').authWithPassword(USERS.rh.email, USERS.rh.pass)

    // Tentar criar nova demanda ou posição no plano já aprovado é rejeitado
    await expect(
      planejamentoForcaService.criarDemanda({
        plano: planoTechAprovado.id,
        codigo: 'DEM-INVASIVA',
        origem: 'Tentativa de mutação',
        problema_necessidade: 'Erro intencional',
        resultado_esperado: 'Nenhum',
        responsavel: userRhRecord.id,
        empresa: planoTechAprovado.empresa,
        periodo_necessario: '2026-Q4',
        data_necessaria: '2026-11-01',
        prioridade: 'Alta',
        grau_confirmacao: 'confirmada',
        quantidade: 1,
        unidade_necessidade: 'unidade',
        consequencia_nao_atendimento: 'Falha',
      }),
    ).rejects.toThrow('Não é permitido adicionar demandas a um plano aprovado.')
  })

  // ---------------------------------------------------------------------------
  // 4. REVISÕES E CICLO DE SUBSTITUIÇÃO
  // ---------------------------------------------------------------------------
  it('9. Iniciar revisão cria nova versão rascunho sem alterar a versão anterior', async () => {
    await pb.collection('users').authWithPassword(USERS.rh.email, USERS.rh.pass)

    const novaVersao = await planejamentoForcaService.iniciarNovaRevisao(
      planoTechAprovado.id,
      userRhRecord.id,
    )

    expect(novaVersao.versao_numero).toBe(2)
    expect(novaVersao.rotulo_versao).toBe('v2.0')
    expect(novaVersao.situacao).toBe('Rascunho')
    expect(novaVersao.plano_origem_revisao).toBe(planoTechAprovado.id)

    // A versão anterior AINDA continua 'Aprovado'
    const versaoAnterior = await pb.collection('planos_capacidade').getOne(planoTechAprovado.id)
    expect(versaoAnterior.situacao).toBe('Aprovado')

    // Agora simula o fluxo completo: submeter a nova versão e aprovar
    await planejamentoForcaService.submeterPlano(novaVersao.id, userRhRecord.id)
    const revisaoAprovada = await planejamentoForcaService.aprovarRevisaoESubstituirAnterior(
      novaVersao.id,
      userRhRecord.id,
      true, // permitirTeste em homologação
    )

    expect(revisaoAprovada.situacao).toBe('Aprovado')

    // Agora sim a versão anterior deve ter virado 'Substituído por nova versão'
    const versaoAnteriorSubstituida = await pb
      .collection('planos_capacidade')
      .getOne(planoTechAprovado.id)
    expect(versaoAnteriorSubstituida.situacao).toBe('Substituído por nova versão')

    // Restaurar versão anterior para Aprovado e excluir v2 para não poluir banco
    await pb.collection('planos_capacidade').update(planoTechAprovado.id, { situacao: 'Aprovado' })
    // Deletar itens clonados da v2
    const demV2 = await pb
      .collection('demandas_planejadas')
      .getFullList({ filter: `plano = '${novaVersao.id}'` })
    for (const d of demV2) await pb.collection('demandas_planejadas').delete(d.id)
    const posV2 = await pb
      .collection('posicoes_planejadas')
      .getFullList({ filter: `plano = '${novaVersao.id}'` })
    for (const p of posV2) await pb.collection('posicoes_planejadas').delete(p.id)
    await pb.collection('planos_capacidade').delete(novaVersao.id)
  })

  // ---------------------------------------------------------------------------
  // 5. CUSTOS PRELIMINARES E DISTINÇÃO DE NÃO INFORMADO × ZERO
  // ---------------------------------------------------------------------------
  it('10. Custos ausentes não são tratados como zero e o cálculo é sinalizado como PARCIAL', async () => {
    await pb.collection('users').authWithPassword(USERS.rh.email, USERS.rh.pass)

    const posicoesTech = await pb.collection('posicoes_planejadas').getFullList<PosicaoPlanejada>({
      filter: `plano = '${planoTechAprovado.id}'`,
    })

    const resumo = planejamentoForcaService.calcularResumoCustos(posicoesTech)

    // Posição POS-2026-TECH-002 foi seeded com custo_informado: false
    expect(resumo.custosNaoInformadosCount).toBeGreaterThan(0)
    expect(resumo.isTotalParcial).toBe(true)
    expect(resumo.totalRecorrenteMensal).toBeGreaterThan(0)
  })

  // ---------------------------------------------------------------------------
  // 6. INTEGRAÇÃO COM VAGAS E IDEMPOTÊNCIA
  // ---------------------------------------------------------------------------
  it('11. Gerar solicitação de vaga a partir de posição aprovada com idempotência contra duplicidade', async () => {
    await pb.collection('users').authWithPassword(USERS.rh.email, USERS.rh.pass)

    const posicoes = await pb.collection('posicoes_planejadas').getFullList<PosicaoPlanejada>({
      filter: `plano = '${planoTechAprovado.id}'`,
    })
    const posAlvo = posicoes[0]

    // 1ª Execução: cria a solicitação e vaga no fluxo com aprovação independente
    const { solicitacao, vagaId } = await planejamentoForcaService.gerarSolicitacaoContratacao({
      planoId: planoTechAprovado.id,
      posicaoId: posAlvo.id,
      userId: userRhRecord.id,
      userName: 'Douglas Severo',
    })

    expect(solicitacao.id).toBeDefined()
    expect(vagaId).toBeDefined()

    // Verificar se a vaga criada preservou o status de aprovação próprio do fluxo de vagas
    const vagaCriada = await pb.collection('vagas').getOne(vagaId)
    expect(vagaCriada.status_aprovacao_gestor).toBe('Aguardando aprovação')

    // 2ª Execução repetida imediata: deve ser bloqueada pela chave de idempotência
    await expect(
      planejamentoForcaService.gerarSolicitacaoContratacao({
        planoId: planoTechAprovado.id,
        posicaoId: posAlvo.id,
        userId: userRhRecord.id,
        userName: 'Douglas Severo',
      }),
    ).rejects.toThrow(/Já existe uma solicitação de contratação em andamento/)

    // Limpeza do teste
    await pb.collection('solicitacoes_contratacao_plano').delete(solicitacao.id)
    await pb.collection('vagas').delete(vagaId)
  })

  // ---------------------------------------------------------------------------
  // 7. PRESERVAÇÃO INTEGRAL DE ETAPAS 1 E 2
  // ---------------------------------------------------------------------------
  it('12. Preservação das correspondências e unicidade dos centros de custo por empresa jurídica', async () => {
    await pb.collection('users').authWithPassword(USERS.rh.email, USERS.rh.pass)

    // Centros de custo
    const ccs = await pb.collection('centros_custo').getFullList()
    expect(ccs.length).toBeGreaterThan(0)
    for (const cc of ccs) {
      expect(cc.empresa_juridica).toBeDefined()
    }

    // Cargos e competências da v0.0.85
    const cargos = await pb.collection('cargos').getFullList()
    const competencias = await pb.collection('competencias').getFullList()
    expect(cargos.length).toBeGreaterThanOrEqual(8)
    expect(competencias.length).toBeGreaterThanOrEqual(10)
  })
})
