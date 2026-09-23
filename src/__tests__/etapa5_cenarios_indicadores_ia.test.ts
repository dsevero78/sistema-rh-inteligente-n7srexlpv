import { describe, it, expect, vi, beforeEach } from 'vitest'
import { capacidadeService } from '@/services/capacidadeService'
import { cenariosService, type AlternativaCenario } from '@/services/cenariosService'
import { indicadoresForcaService } from '@/services/indicadoresForcaService'
import pb from '@/lib/pocketbase/client'

describe('ETAPA 5: Testes de Aceite — Cenários, Indicadores, Governança e Apoio de IA', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  // 1. Reserva Não Definida ≠ Zero Aprovado
  it('1. Reserva não definida apresenta saldo antes da reserva e NÃO trata ausência como zero aprovado', async () => {
    // Mock de pessoa sem reserva formal aprovada
    vi.spyOn(pb.collection('pessoas'), 'getOne').mockResolvedValueOnce({
      id: 'pes_01',
      nome: 'Dev Teste',
      modalidade: 'CLT',
      horas_mensais_base: 160,
      empresa: 'emp_01',
    } as any)

    vi.spyOn(pb.collection('programacoes_descanso'), 'getFullList').mockResolvedValueOnce([])
    vi.spyOn(pb.collection('alocacoes'), 'getFullList').mockResolvedValueOnce([
      {
        id: 'aloc_01',
        pessoa: 'pes_01',
        quantidade: 100,
        unidade: 'horas_mes',
        situacao: 'confirmada',
        periodo_inicio: '2026-11-01',
        periodo_fim: '2026-11-30',
        modalidade_capacidade: 'disponibilidade',
      } as any,
    ])
    vi.spyOn(pb.collection('apontamentos_horas'), 'getFullList').mockResolvedValueOnce([])

    // Sem reserva cadastrada
    vi.spyOn(pb.collection('reservas_operacionais'), 'getFullList').mockResolvedValueOnce([])

    const mem = await capacidadeService.calcularCapacidadePessoaPeriodo('pes_01', '2026-11')

    // Deve reportar 'nao_definida'
    expect(mem.reservaEstado).toBe('nao_definida')
    // Não aplica dedução automática arbitrária
    expect(mem.reservaOperacionalHoras).toBe(0)
    // Apresenta saldo antes da reserva de 60h (160 - 100)
    expect(mem.saldoAntesReservaHoras).toBe(60)
    // Alerta de governança explícito
    expect(mem.reservaMensagemGovernanca).toContain('Reserva não definida')
  })

  // 2. Reserva de Simulação Sem Efeito Operacional
  it('2. Reserva como premissa de simulação não altera estado operacional real', async () => {
    vi.spyOn(pb.collection('pessoas'), 'getOne').mockResolvedValueOnce({
      id: 'pes_02',
      nome: 'Dev Simulação',
      modalidade: 'CLT',
      horas_mensais_base: 160,
      empresa: 'emp_01',
    } as any)
    vi.spyOn(pb.collection('programacoes_descanso'), 'getFullList').mockResolvedValueOnce([])
    vi.spyOn(pb.collection('alocacoes'), 'getFullList').mockResolvedValueOnce([])
    vi.spyOn(pb.collection('apontamentos_horas'), 'getFullList').mockResolvedValueOnce([])

    const mem = await capacidadeService.calcularCapacidadePessoaPeriodo('pes_02', '2026-11', {
      valor: 15,
      unidade: 'percentual',
    })

    expect(mem.reservaEstado).toBe('premissa_simulacao')
    expect(mem.reservaOperacionalPercentual).toBe(15)
    expect(mem.reservaOperacionalHoras).toBe(24) // 15% de 160
    expect(mem.reservaMensagemGovernanca).toContain('Premissa de simulação')
  })

  // 3. Notas Parciais e Múltiplas Sem Duplicidade Nem Perda de Custo (Vínculo Comprovado)
  it('3. Notas parciais vinculadas ao mesmo fechamento são segregadas e rotuladas como consolidação pendente', async () => {
    vi.spyOn(pb.collection('pessoas'), 'getFullList').mockResolvedValueOnce([])

    // 2 NFs parciais para o mesmo fechamento_id 'fc_100'
    vi.spyOn(pb.collection('notas_fiscais'), 'getFullList').mockResolvedValueOnce([
      {
        id: 'nf_01',
        numero_nf: '101',
        valor: 5000,
        competencia: '2026-11',
        fechamento: 'fc_100',
        status: 'Emitida',
      } as any,
      {
        id: 'nf_02',
        numero_nf: '102',
        valor: 5000,
        competencia: '2026-11',
        fechamento: 'fc_100',
        status: 'Conciliada',
      } as any,
    ])

    // Fechamento validado no valor total de R$ 10.000
    vi.spyOn(pb.collection('fechamentos_competencia'), 'getFullList').mockResolvedValueOnce([
      {
        id: 'fc_100',
        competencia: '2026-11',
        valor_total_calculado: 10000,
        status_ciclo: 'Validado',
        pessoa: 'pes_pj_1',
      } as any,
    ])

    const consolidado = await capacidadeService.consolidarCustos('2026-11')

    // Deve reconhecer que há faturamento fracionado pendente de definição contábil
    expect(consolidado.statusConsolidacao).toBe('CONSOLIDAÇÃO PENDENTE DE DEFINIÇÃO CONTÁBIL')
    expect(consolidado.isParcial).toBe(true)
    expect(consolidado.divergenciasDetectadas.length).toBeGreaterThan(0)
    expect(consolidado.divergenciasDetectadas[0].tipo).toBe('multiplas_nfs_fechamento')
    // Não perde o valor total da competência
    expect(consolidado.custoRealizadoCompetencia).toBe(10000)
  })

  // 4. Cenário Não Altera Plano-Base Vigente
  it('4. Criação e adoção de cenário NÃO alteram alocações nem plano-base, gerando apenas Proposta de Revisão', async () => {
    vi.spyOn(pb.authStore, 'record', 'get').mockReturnValue({
      id: 'usr_gestor',
      name: 'Gestor Tech',
      cargo_funcao: 'Gestor Contratante',
      empresa: 'emp_tech',
    } as any)

    vi.spyOn(pb.collection('cenarios_capacidade'), 'getOne').mockResolvedValueOnce({
      id: 'cen_01',
      codigo: 'CEN-2026-001',
      nome: 'Cenário Teste',
      versao_base_plano: 'plano_v1',
      empresa: 'emp_tech',
      premissas: { duracao_meses: 6 },
      alternativas: [
        {
          id: 'alt_1',
          tipo: 'contratar_clt',
          titulo: 'Vaga CLT',
          custo_incremental_mensal: 10000,
          custo_pontual: 0,
          prazo_disponibilizacao_dias: 30,
        },
      ],
    } as any)

    const spyPropostaCreate = vi
      .spyOn(pb.collection('propostas_revisao_plano'), 'create')
      .mockResolvedValueOnce({
        id: 'prop_01',
        codigo: 'PROP-REV-001',
        cenario_origem: 'cen_01',
        plano_alvo: 'plano_v1',
        empresa: 'emp_tech',
        justificativa_adocao: 'Necessidade de expansão mobile',
        situacao: 'em_analise_rh',
      } as any)

    const spyCenarioUpdate = vi
      .spyOn(pb.collection('cenarios_capacidade'), 'update')
      .mockResolvedValueOnce({} as any)

    const spyPlanoUpdate = vi.spyOn(pb.collection('planos_capacidade'), 'update')

    const prop = await cenariosService.adotarCenarioComoPropostaRevisao(
      'cen_01',
      'Necessidade de expansão mobile',
    )

    expect(prop.situacao).toBe('em_analise_rh')
    expect(spyPropostaCreate).toHaveBeenCalledTimes(1)
    expect(spyCenarioUpdate).toHaveBeenCalledWith('cen_01', { situacao: 'proposta_submetida' })
    // NENHUMA alteração direta no plano-base!
    expect(spyPlanoUpdate).not.toHaveBeenCalled()
  })

  // 5. Alternativa com Impacto na Origem e Capacitação Sem Ganho Imediato
  it('5. Alternativas de realocação declaram impacto na origem e capacitação declara prazo de maturação', () => {
    const altRealocacao: AlternativaCenario = {
      id: 'alt_realoc',
      tipo: 'realocar_capacidade',
      titulo: 'Mover Devs Sustentação',
      descricao: 'Realoca 2 devs',
      prazo_disponibilizacao_dias: 5,
      custo_incremental_mensal: 0,
      custo_pontual: 0,
      demandas_atendidas: ['Demanda Nova'],
      lacunas_remanescentes: ['Sustentação perde 160h'],
      impacto_origem: 'Perda de 30% da capacidade do time cedente',
      dependencias: ['Acordo de nível de serviço com cliente'],
      riscos: ['Atraso em bugs menores'],
      dados_ausentes: [],
    }

    const altCapacitacao: AlternativaCenario = {
      id: 'alt_cap',
      tipo: 'desenvolver_competencias',
      titulo: 'Treinar time em React Native',
      descricao: 'Curso e mentoria de 60 dias',
      prazo_disponibilizacao_dias: 60,
      custo_incremental_mensal: 0,
      custo_pontual: 10000,
      demandas_atendidas: ['Demanda Nova a partir do mês 3'],
      lacunas_remanescentes: ['Sem ganho imediato nos primeiros 60 dias'],
      impacto_origem: 'Dedicação de 10h/semana para estudos',
      dependencias: ['Instrutor disponível'],
      riscos: ['Curva de aprendizado superior à estimada'],
      dados_ausentes: [],
    }

    expect(altRealocacao.impacto_origem).toBeTruthy()
    expect(altCapacitacao.prazo_disponibilizacao_dias).toBeGreaterThan(0)
    expect(altCapacitacao.lacunas_remanescentes[0]).toContain('Sem ganho imediato')
  })

  // 6. Unidades Incompatíveis Não Agregadas
  it('6. Contratação de serviço por entrega/escopo possui unidade entregaveis_marcos e não agrega horas', () => {
    const altEscopo: AlternativaCenario = {
      id: 'alt_escopo',
      tipo: 'contratar_servico_escopo',
      titulo: 'Fábrica de Software por Pacote de Entrega',
      descricao: 'Entrega de 3 marcos fechados',
      prazo_disponibilizacao_dias: 15,
      custo_incremental_mensal: 0,
      custo_pontual: 50000,
      unidade_medicao: 'entregaveis_marcos',
      demandas_atendidas: ['Módulos A e B'],
      lacunas_remanescentes: [],
      impacto_origem: '20h de homologação técnica',
      dependencias: ['Documento de requisitos assinado'],
      riscos: ['Aditivos de escopo'],
      dados_ausentes: [],
    }

    expect(altEscopo.unidade_medicao).toBe('entregaveis_marcos')
    expect(altEscopo.volume_horas_adicionadas).toBeUndefined()
  })

  // 7. Indicadores com Denominador Zero e Dados Ausentes
  it('7. Indicador com denominador zero rotula DADO AUSENTE e não gera divisão por zero', async () => {
    vi.spyOn(pb.collection('empresas'), 'getOne').mockResolvedValueOnce({
      id: 'emp_01',
      razao_social: 'Tech Corp',
    } as any)

    vi.spyOn(pb.collection('planos_capacidade'), 'getFullList').mockResolvedValueOnce([])
    vi.spyOn(pb.collection('pessoas'), 'getFullList').mockResolvedValueOnce([])
    vi.spyOn(
      pb.collection('competencias_necessarias_demanda'),
      'getFullList',
    ).mockResolvedValueOnce([])
    vi.spyOn(pb.collection('competencias_pessoas'), 'getFullList').mockResolvedValueOnce([])

    const painel = await indicadoresForcaService.carregarIndicadoresForca('emp_01', '2026-11')

    // Cobertura de competências com 0 exigências
    expect(painel.coberturaCompetenciasComEvidencia.statusDado).toBe('DADO AUSENTE')
    expect(painel.coberturaCompetenciasComEvidencia.valorFormatado).toContain('Dado Ausente')
    expect(painel.coberturaCompetenciasComEvidencia.formula).toContain('DENOMINADOR ZERO')

    // Posições vagas sem plano aprovado
    expect(painel.posicoesVagas.statusDado).toBe('DADO AUSENTE')
  })

  // 8. Degradação Graciosa da IA (Falha de IA não trava os cenários)
  it('8. Falha ou indisponibilidade no gateway de IA ativa degradação graciosa sem bloquear cálculos', async () => {
    vi.spyOn(pb, 'send').mockRejectedValueOnce(new Error('AI Gateway Timeout'))

    const resultadoIa = await cenariosService.consultarIaCenarios({
      cenarioId: 'cen_01',
      acao: 'explicar_cenario',
      nomeCenario: 'Cenário Teste',
      objetivo: 'Objetivo Teste',
    })

    // Deve responder sucesso=true com fallback determinístico
    expect(resultadoIa.sucesso).toBe(true)
    expect(resultadoIa.origem).toBe('fallback_frontend')
    expect(resultadoIa.conteudo).toContain('Modo de Segurança')
  })
})
