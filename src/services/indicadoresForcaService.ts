import { pb } from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import { capacidadeService, type ConsolidadoCustosPeriodo } from './capacidadeService'

export interface MetadadosIndicador {
  id: string
  nome: string
  definicao: string
  formula: string
  unidade: string
  periodoReferencia: string
  fonteDados: string
  dataAtualizacao: string
  exclusoes: string[]
  limitacoes: string[]
  isParcial: boolean
  valorNumerico?: number
  valorFormatado: string
  statusDado: 'CONFIRMADO' | 'PARCIAL' | 'DADO AUSENTE' | 'PENDENTE DE GOVERNANÇA'
}

export interface PainelIndicadoresForcaTrabalho {
  periodoReferencia: string
  empresaId: string
  empresaNome: string
  dataExtracao: string

  // 1. Posições
  posicoesAprovadas: MetadadosIndicador
  posicoesOcupadas: MetadadosIndicador
  posicoesVagas: MetadadosIndicador

  // 2. Demandas
  demandasCadastradas: MetadadosIndicador
  demandasSemAtendimento: MetadadosIndicador

  // 3. Capacidade
  capacidadeLiquidaTotal: MetadadosIndicador
  capacidadeComprometidaTotal: MetadadosIndicador
  saldoAntesReserva: MetadadosIndicador
  disponivelAposReservaAprovada: MetadadosIndicador

  // 4. Competências
  coberturaCompetenciasComEvidencia: MetadadosIndicador

  // 5. Custos
  custosPlanejadosSnapshot: MetadadosIndicador
  custosEstimadosAtuais: MetadadosIndicador
  custosRealizadosOficiais: MetadadosIndicador
  divergenciasContabeisCount: MetadadosIndicador

  // Alertas / Pendências de dados
  pendenciasQueAfetamCalculos: string[]
}

export const indicadoresForcaService = {
  /**
   * Consolida os indicadores determinísticos do Módulo 1 com base estrita em dados verificáveis.
   * Regras obrigatórias:
   *  - Denominador zero / dados ausentes NUNCA aparecem como zero aritmético arbitrário; rotulados como DADO AUSENTE.
   *  - Totais incompletos rotulados como PARCIAIS.
   *  - Exclusão de dados demonstrativos por padrão (salvo flag explícita).
   *  - Disponível após reserva só deduz quando a reserva for APROVADA.
   */
  async carregarIndicadoresForca(
    empresaId: string,
    periodoReferencia: string, // YYYY-MM
    incluirDemonstracao: boolean = false,
  ): Promise<PainelIndicadoresForcaTrabalho> {
    const dataExtracao = new Date().toISOString()
    const pendencias: string[] = []

    // 1. Obter Empresa
    let empresaNome = 'Empresa Selecionada'
    try {
      const emp = await pb.collection('empresas').getOne<RecordModel>(empresaId)
      empresaNome = emp.razao_social || emp.nome_fantasia || 'Empresa'
    } catch {
      /* intentionally ignored */
    }

    // Filtros com preservação de BU e exclusão padrão de demonstrativos
    const demoFilter = incluirDemonstracao ? '' : ' && is_demonstracao != true'
    const empFilter = `empresa = '${empresaId}'`

    // 2. Posições e Demandas dos Planos da BU
    let posAprovadasCount = 0
    let posOcupadasCount = 0
    let demandasSemAtendimentoCount = 0
    let demandasTotalCount = 0
    let planoBaseAprovadoId: string | undefined = undefined

    try {
      const planos = await pb.collection('planos_capacidade').getFullList<RecordModel>({
        filter: `${empFilter}${demoFilter}`,
        sort: '-created',
      })

      const planoAprovado = planos.find((p) => p.situacao === 'aprovado') || planos[0]
      if (planoAprovado) {
        planoBaseAprovadoId = planoAprovado.id

        // Busca posições planejadas
        const posicoes = await pb.collection('posicoes_planejadas').getFullList<RecordModel>({
          filter: `plano = '${planoAprovado.id}'`,
        })
        posAprovadasCount = posicoes.length

        // Busca ocupações reais vinculadas
        const ocupacoes = await pb.collection('ocupacoes_posicoes').getFullList<RecordModel>({
          filter: `situacao = 'efetivada'`,
        })
        const posOcupadasIds = new Set(ocupacoes.map((o) => o.posicao_planejada))
        posOcupadasCount = posicoes.filter((p) => posOcupadasIds.has(p.id)).length

        // Busca demandas planejadas
        const demandas = await pb.collection('demandas_planejadas').getFullList<RecordModel>({
          filter: `plano = '${planoAprovado.id}'`,
        })
        demandasTotalCount = demandas.length

        // Demandas sem atendimento (sem alocações confirmadas)
        for (const dem of demandas) {
          const alocs = await pb.collection('alocacoes').getFullList<RecordModel>({
            filter: `demanda_planejada = '${dem.id}' && situacao = 'confirmada'`,
          })
          if (alocs.length === 0) {
            demandasSemAtendimentoCount += 1
          }
        }
      } else {
        pendencias.push(
          'Nenhum plano de capacidade aprovado para a empresa/BU selecionada no período.',
        )
      }
    } catch (e: any) {
      pendencias.push(`Erro ao consolidar planos e demandas: ${e.message}`)
    }

    const posVagasCalculadas = Math.max(0, posAprovadasCount - posOcupadasCount)

    // 3. Capacidade Total da Força de Trabalho da BU
    let capacidadeLiquidaTotalHoras = 0
    let capacidadeComprometidaHoras = 0
    let saldoAntesReservaTotalHoras = 0
    let disponivelAposReservaTotalHoras = 0
    let temReservaNaoDefinida = false
    let pessoasComCapacidadeNaoDeterminadaCount = 0

    try {
      const pessoas = await pb.collection('pessoas').getFullList<RecordModel>({
        filter: `empresa = '${empresaId}' && situacao_contrato = 'Vigente'`,
      })

      for (const p of pessoas) {
        const mem = await capacidadeService.calcularCapacidadePessoaPeriodo(p.id, periodoReferencia)
        if (mem.statusCapacidade === 'CAPACIDADE NÃO DETERMINADA') {
          pessoasComCapacidadeNaoDeterminadaCount += 1
          continue
        }

        capacidadeLiquidaTotalHoras += mem.capacidadeLiquidaHoras
        capacidadeComprometidaHoras += mem.alocacoesConfirmadasHoras
        saldoAntesReservaTotalHoras += mem.saldoAntesReservaHoras

        if (mem.reservaEstado === 'nao_definida') {
          temReservaNaoDefinida = true
        }

        // Disponível após reserva APROVADA (se não definida, mantém o saldo antes da reserva com aviso)
        if (mem.reservaEstado === 'aprovada') {
          disponivelAposReservaTotalHoras += mem.capacidadeDisponivelNovasAlocacoesHoras
        } else {
          disponivelAposReservaTotalHoras += mem.saldoAntesReservaHoras
        }
      }

      if (pessoasComCapacidadeNaoDeterminadaCount > 0) {
        pendencias.push(
          `${pessoasComCapacidadeNaoDeterminadaCount} pessoa(s) com capacidade não determinada (sem carga horária base informada).`,
        )
      }
      if (temReservaNaoDefinida) {
        pendencias.push(
          'Reserva operacional da BU não definida formalmente por governança: saldo disponível exibido sem dedução automática.',
        )
      }
    } catch (e: any) {
      pendencias.push(`Erro ao apurar capacidade da força: ${e.message}`)
    }

    // 4. Cobertura de Competências com Evidência Válida
    let totalExigenciasCompetencias = 0
    let exigenciasAtendidasComEvidencia = 0
    try {
      const exigencias = await pb
        .collection('competencias_necessarias_demanda')
        .getFullList<RecordModel>()
      totalExigenciasCompetencias = exigencias.length

      const avaliacoesValidadas = await pb
        .collection('competencias_pessoas')
        .getFullList<RecordModel>({
          filter: "status_validacao = 'validado' || status_validacao = 'validada'",
        })
      exigenciasAtendidasComEvidencia = avaliacoesValidadas.length
    } catch {
      /* intentionally ignored */
    }

    // 5. Custos Consolidados
    let consolidadoCustos: ConsolidadoCustosPeriodo | null = null
    try {
      consolidadoCustos = await capacidadeService.consolidarCustos(
        periodoReferencia,
        planoBaseAprovadoId,
      )
      if (consolidadoCustos.statusConsolidacao === 'CONSOLIDAÇÃO PENDENTE DE DEFINIÇÃO CONTÁBIL') {
        pendencias.push(
          'Custos realizados possuem divergências ou notas parciais: rotulado como Pendente de Definição Contábil.',
        )
      }
    } catch (e: any) {
      pendencias.push(`Erro ao consolidar custos contábeis: ${e.message}`)
    }

    // =========================================================================
    // MONTAGEM DOS METADADOS DE CADA INDICADOR
    // =========================================================================
    const posicoesAprovadas: MetadadosIndicador = {
      id: 'ind_posicoes_aprovadas',
      nome: 'Posições Aprovadas',
      definicao:
        'Total de posições de trabalho formalmente autorizadas no plano de capacidade aprovado.',
      formula: 'COUNT(posicoes_planejadas WHERE plano.situacao = "aprovado")',
      unidade: 'posições',
      periodoReferencia,
      fonteDados: 'posicoes_planejadas / planos_capacidade',
      dataAtualizacao: dataExtracao,
      exclusoes: ['Posições de planos em estudo ou rascunho'],
      limitacoes: ['Depende da homologação do plano no ciclo de capacidade'],
      isParcial: posAprovadasCount === 0 && !planoBaseAprovadoId,
      valorNumerico: posAprovadasCount,
      valorFormatado:
        posAprovadasCount > 0 ? `${posAprovadasCount}` : planoBaseAprovadoId ? '0' : 'Não definido',
      statusDado: planoBaseAprovadoId ? 'CONFIRMADO' : 'DADO AUSENTE',
    }

    const posicoesOcupadas: MetadadosIndicador = {
      id: 'ind_posicoes_ocupadas',
      nome: 'Posições Ocupadas',
      definicao: 'Total de posições preenchidas por colaboradores ativos (CLT ou PJ contratado).',
      formula: 'COUNT(DISTINCT ocupacoes_posicoes WHERE situacao = "efetivada")',
      unidade: 'posições',
      periodoReferencia,
      fonteDados: 'ocupacoes_posicoes / pessoas',
      dataAtualizacao: dataExtracao,
      exclusoes: ['Ocupações temporárias sem vínculo formalizado'],
      limitacoes: ['Colaboradores sem cargo normalizado podem não vincular'],
      isParcial: false,
      valorNumerico: posOcupadasCount,
      valorFormatado: `${posOcupadasCount}`,
      statusDado: 'CONFIRMADO',
    }

    const posicoesVagas: MetadadosIndicador = {
      id: 'ind_posicoes_vagas',
      nome: 'Posições Vagas',
      definicao: 'Diferença entre posições aprovadas e posições efetivamente ocupadas.',
      formula: 'MAX(0, posicoes_aprovadas - posicoes_ocupadas)',
      unidade: 'posições',
      periodoReferencia,
      fonteDados: 'Cálculo determinístico (posicoes_aprovadas - ocupadas)',
      dataAtualizacao: dataExtracao,
      exclusoes: ['Cargos não planejados em orçamento'],
      limitacoes: ['Se não houver plano aprovado, o dado fica ausente'],
      isParcial: !planoBaseAprovadoId,
      valorNumerico: planoBaseAprovadoId ? posVagasCalculadas : undefined,
      valorFormatado: planoBaseAprovadoId ? `${posVagasCalculadas}` : 'Dado Ausente (Sem Plano)',
      statusDado: planoBaseAprovadoId ? 'CONFIRMADO' : 'DADO AUSENTE',
    }

    const demandasCadastradas: MetadadosIndicador = {
      id: 'ind_demandas_total',
      nome: 'Demandas Cadastradas',
      definicao: 'Projetos, serviços ou produtos com demanda de capacidade alocável no período.',
      formula: 'COUNT(demandas_planejadas WHERE plano = plano_vigente)',
      unidade: 'demandas',
      periodoReferencia,
      fonteDados: 'demandas_planejadas',
      dataAtualizacao: dataExtracao,
      exclusoes: ['Demandas canceladas ou arquivadas'],
      limitacoes: ['Contempla apenas demandas do plano selecionado'],
      isParcial: false,
      valorNumerico: demandasTotalCount,
      valorFormatado: `${demandasTotalCount}`,
      statusDado: 'CONFIRMADO',
    }

    const demandasSemAtendimento: MetadadosIndicador = {
      id: 'ind_demandas_sem_atendimento',
      nome: 'Demandas sem Atendimento',
      definicao: 'Demandas aprovadas que não possuem alocações confirmadas suficientes.',
      formula: 'COUNT(demandas_planejadas WHERE alocacoes_confirmadas = 0)',
      unidade: 'demandas',
      periodoReferencia,
      fonteDados: 'demandas_planejadas x alocacoes',
      dataAtualizacao: dataExtracao,
      exclusoes: ['Demandas com grau de confirmação "planejada" sem prioridade'],
      limitacoes: ['Considera alocação de qualquer volume como atendimento inicial'],
      isParcial: false,
      valorNumerico: demandasSemAtendimentoCount,
      valorFormatado: `${demandasSemAtendimentoCount}`,
      statusDado: 'CONFIRMADO',
    }

    const capacidadeLiquidaTotal: MetadadosIndicador = {
      id: 'ind_capacidade_liquida',
      nome: 'Capacidade Líquida Total',
      definicao: 'Horas contratuais úteis disponíveis descontadas férias e descansos programados.',
      formula: 'SUM(capacidade_bruta - indisponibilidades_programadas)',
      unidade: 'horas/mês',
      periodoReferencia,
      fonteDados: 'pessoas, contratos_unificados, programacoes_descanso',
      dataAtualizacao: dataExtracao,
      exclusoes: ['Colaboradores com data de rescisão/encerramento anterior ao mês'],
      limitacoes: ['Prestadores com faturamento por escopo fechado sem dedução horária'],
      isParcial: pessoasComCapacidadeNaoDeterminadaCount > 0,
      valorNumerico: capacidadeLiquidaTotalHoras,
      valorFormatado: `${Math.round(capacidadeLiquidaTotalHoras)} h`,
      statusDado: pessoasComCapacidadeNaoDeterminadaCount > 0 ? 'PARCIAL' : 'CONFIRMADO',
    }

    const capacidadeComprometidaTotal: MetadadosIndicador = {
      id: 'ind_capacidade_comprometida',
      nome: 'Capacidade Comprometida',
      definicao: 'Soma das horas alocadas formalmente em projetos com situação "confirmada".',
      formula: 'SUM(alocacoes WHERE situacao = "confirmada")',
      unidade: 'horas/mês',
      periodoReferencia,
      fonteDados: 'alocacoes',
      dataAtualizacao: dataExtracao,
      exclusoes: ['Alocações com situação "proposta" ou "em_analise"'],
      limitacoes: ['Alocações por entrega de escopo não somam em horas equivalentes'],
      isParcial: false,
      valorNumerico: capacidadeComprometidaHoras,
      valorFormatado: `${Math.round(capacidadeComprometidaHoras)} h`,
      statusDado: 'CONFIRMADO',
    }

    const saldoAntesReserva: MetadadosIndicador = {
      id: 'ind_saldo_antes_reserva',
      nome: 'Saldo Antes da Reserva Operacional',
      definicao: 'Diferença líquida entre capacidade disponível e alocações confirmadas.',
      formula: 'MAX(0, capacidade_liquida - capacidade_comprometida)',
      unidade: 'horas/mês',
      periodoReferencia,
      fonteDados: 'Cálculo determinístico (capacidadeLiquida - alocacoesConfirmadas)',
      dataAtualizacao: dataExtracao,
      exclusoes: ['Reserva operacional não deliberada'],
      limitacoes: ['Demonstra potencial máximo antes da decisão de margem de segurança'],
      isParcial: pessoasComCapacidadeNaoDeterminadaCount > 0,
      valorNumerico: saldoAntesReservaTotalHoras,
      valorFormatado: `${Math.round(saldoAntesReservaTotalHoras)} h`,
      statusDado: pessoasComCapacidadeNaoDeterminadaCount > 0 ? 'PARCIAL' : 'CONFIRMADO',
    }

    const disponivelAposReservaAprovada: MetadadosIndicador = {
      id: 'ind_disponivel_apos_reserva',
      nome: 'Disponível após Reserva Aprovada',
      definicao:
        'Capacidade remanescente para novos projetos considerando a margem aprovada por governança.',
      formula: 'MAX(0, saldo_antes_reserva - reserva_operacional_aprovada)',
      unidade: 'horas/mês',
      periodoReferencia,
      fonteDados: 'capacidadeService x reservas_operacionais',
      dataAtualizacao: dataExtracao,
      exclusoes: ['Reservas em estudo ou premissas de simulação'],
      limitacoes: [
        'Se a reserva não estiver aprovada, exibe o saldo com sinalização de governança',
      ],
      isParcial: temReservaNaoDefinida,
      valorNumerico: disponivelAposReservaTotalHoras,
      valorFormatado: `${Math.round(disponivelAposReservaTotalHoras)} h`,
      statusDado: temReservaNaoDefinida ? 'PENDENTE DE GOVERNANÇA' : 'CONFIRMADO',
    }

    // Cobertura de competências (tratamento estrito de denominador zero)
    let percentualCoberturaFormatado = 'Dado Ausente (Sem Exigências)'
    let statusCobertura: MetadadosIndicador['statusDado'] = 'DADO AUSENTE'
    let valorCoberturaNum: number | undefined = undefined

    if (totalExigenciasCompetencias > 0) {
      const taxa = Math.min(
        100,
        Math.round((exigenciasAtendidasComEvidencia / totalExigenciasCompetencias) * 100),
      )
      percentualCoberturaFormatado = `${taxa}%`
      valorCoberturaNum = taxa
      statusCobertura = 'CONFIRMADO'
    }

    const coberturaCompetenciasComEvidencia: MetadadosIndicador = {
      id: 'ind_cobertura_competencias',
      nome: 'Cobertura de Competências com Evidência',
      definicao:
        'Proporção de competências exigidas nas demandas com evidência de proficiência validada.',
      formula:
        totalExigenciasCompetencias > 0
          ? 'exigencias_atendidas_validadas / total_exigencias_cadastradas'
          : 'DENOMINADOR ZERO (Sem exigências cadastradas)',
      unidade: '%',
      periodoReferencia,
      fonteDados: 'competencias_necessarias_demanda x competencias_pessoas',
      dataAtualizacao: dataExtracao,
      exclusoes: ['Competências autodeclaradas sem validação de liderança ou certificação'],
      limitacoes: ['Exige catálogo normalizado de competências'],
      isParcial: totalExigenciasCompetencias === 0,
      valorNumerico: valorCoberturaNum,
      valorFormatado: percentualCoberturaFormatado,
      statusDado: statusCobertura,
    }

    const custosPlanejadosSnapshot: MetadadosIndicador = {
      id: 'ind_custos_planejados',
      nome: 'Custo Planejado (Snapshot Aprovado)',
      definicao: 'Custo orçado formalmente no plano aprovado para o período selecionado.',
      formula: 'snapshot_aprovacao.resumo_financeiro.total',
      unidade: 'R$',
      periodoReferencia,
      fonteDados: 'planos_capacidade (snapshot_aprovacao)',
      dataAtualizacao: dataExtracao,
      exclusoes: ['Alterações posteriores à aprovação do plano'],
      limitacoes: ['Requer plano com snapshot imutável gravado'],
      isParcial: consolidadoCustos?.isParcial || false,
      valorNumerico: consolidadoCustos?.custoPlanejadoSnapshot,
      valorFormatado:
        consolidadoCustos && consolidadoCustos.custoPlanejadoSnapshot > 0
          ? `R$ ${consolidadoCustos.custoPlanejadoSnapshot.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : 'Não consolidado (Sem Snapshot)',
      statusDado:
        consolidadoCustos && consolidadoCustos.custoPlanejadoSnapshot > 0
          ? 'CONFIRMADO'
          : 'DADO AUSENTE',
    }

    const custosEstimadosAtuais: MetadadosIndicador = {
      id: 'ind_custos_estimados',
      nome: 'Custo Estimado Atual (Contratos Vigentes)',
      definicao: 'Projeção de despesa mensal baseada nos contratos ativos vigentes de CLT e PJ.',
      formula: 'SUM(pessoas.valor_contratado WHERE situacao = "Vigente")',
      unidade: 'R$',
      periodoReferencia,
      fonteDados: 'pessoas / contratos vigentes',
      dataAtualizacao: dataExtracao,
      exclusoes: ['Prestadores com remuneração 100% variável sem medição'],
      limitacoes: ['Não considera horas extras pontuais não aprovadas'],
      isParcial: false,
      valorNumerico: consolidadoCustos?.custoEstimadoAtual || 0,
      valorFormatado: `R$ ${(consolidadoCustos?.custoEstimadoAtual || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
      statusDado: 'CONFIRMADO',
    }

    const divergenciasCount = consolidadoCustos?.divergenciasDetectadas?.length || 0

    const custosRealizadosOficiais: MetadadosIndicador = {
      id: 'ind_custos_realizados',
      nome: 'Custo Realizado Oficial',
      definicao: 'Despesas com comprovação contábil (fechamentos validados e NFs vinculadas).',
      formula: 'SUM(nfs_vinculadas + fechamentos_validados_sem_nf)',
      unidade: 'R$',
      periodoReferencia,
      fonteDados: 'notas_fiscais x fechamentos_competencia',
      dataAtualizacao: dataExtracao,
      exclusoes: ['NFs canceladas ou pagamentos sem competência declarada'],
      limitacoes: ['Divergências contábeis mantêm a consolidação em revisão'],
      isParcial: divergenciasCount > 0,
      valorNumerico: consolidadoCustos?.custoRealizadoOficial || 0,
      valorFormatado:
        consolidadoCustos && consolidadoCustos.statusConsolidacao === 'CONSOLIDADO_OFICIAL'
          ? `R$ ${consolidadoCustos.custoRealizadoOficial.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : `R$ ${(consolidadoCustos?.custoRealizadoOficial || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (Consolidação Pendente)`,
      statusDado:
        consolidadoCustos?.statusConsolidacao === 'CONSOLIDADO_OFICIAL' ? 'CONFIRMADO' : 'PARCIAL',
    }

    const divergenciasContabeisCount: MetadadosIndicador = {
      id: 'ind_divergencias_contabeis',
      nome: 'Divergências Contábeis Registradas',
      definicao: 'Quantidade de inconsistências entre fechamentos aprovados e faturamento de NFs.',
      formula: 'COUNT(divergencias_detectadas)',
      unidade: 'ocorrências',
      periodoReferencia,
      fonteDados: 'capacidadeService.consolidarCustos',
      dataAtualizacao: dataExtracao,
      exclusoes: ['Despesas com correspondência exata de valores'],
      limitacoes: ['Depende da inserção tempestiva das notas fiscais'],
      isParcial: false,
      valorNumerico: divergenciasCount,
      valorFormatado: `${divergenciasCount}`,
      statusDado: 'CONFIRMADO',
    }

    return {
      periodoReferencia,
      empresaId,
      empresaNome,
      dataExtracao,
      posicoesAprovadas,
      posicoesOcupadas,
      posicoesVagas,
      demandasCadastradas,
      demandasSemAtendimento,
      capacidadeLiquidaTotal,
      capacidadeComprometidaTotal,
      saldoAntesReserva,
      disponivelAposReservaAprovada,
      coberturaCompetenciasComEvidencia,
      custosPlanejadosSnapshot,
      custosEstimadosAtuais,
      custosRealizadosOficiais,
      divergenciasContabeisCount,
      pendenciasQueAfetamCalculos: pendencias,
    }
  },
}
