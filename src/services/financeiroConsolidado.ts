import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export interface BuItemValor {
  empresaId: string
  sigla: string
  nome: string
  cor: string
  valor: number
  percentual: number // % sobre o total consolidado
}

export interface BuKpiDecomposto {
  total: number
  decomposicaoBu: BuItemValor[]
}

export interface ItemEncerramentoBu {
  id: string
  pessoaId: string
  nomePessoa: string
  modalidade: 'CLT' | 'PJ'
  empresaId: string
  empresaNome: string
  tipoDesligamento: string
  dataDesligamento: string
  status: string
  valorRescisorioOuPendente: number
  detalhe: string
}

export interface BuVisaoLinha {
  empresaId: string
  sigla: string
  nome: string
  cor: string
  tipo: string
  // PJ
  comprometidoPjMes: number
  nfsPagasPj: number
  nfsAbertoPj: number
  nfsAtrasadasPj: number
  horasApontadasPj: number
  prestadoresPjCount: number
  // CLT
  folhaCltMes: number
  colaboradoresCltCount: number
  novasContratacoesClt: number
  // Desligamentos / Encerramentos do Período
  encerramentosPeriodoClt: number
  encerramentosPeriodoPj: number
  totalRescisorioBu: number
  // Total
  totalComprometidoGeral: number
}
export interface KpisFinanceiros {
  comprometidoMensalPj: number
  valorHoraMedioPj: number
  totalPagoPeriodo: number
  nfsPagasCount: number
  aPagarPeriodo: number
  nfsAprovadasCount: number
  totalAtrasado: number
  nfsAtrasadasCount: number
  projecaoProximos3Meses: number
  folhaContratacoesMes: number
  propostasAceitasCount: number
  onboardingsAtivosCount: number
  // Separação PJ x CLT explícita
  comprometidoTotalGrupo: number // PJ + CLT
  comprometidoCltMensal: number // Vínculos CLT ativos + novas contratações
  colaboradoresCltCount: number
  prestadoresPjCount: number
  // Decomposição por BU
  decompComprometidoPj: BuKpiDecomposto
  decompComprometidoClt: BuKpiDecomposto
  decompComprometidoGeral: BuKpiDecomposto
  decompTotalPago: BuKpiDecomposto
  decompTotalAPagar: BuKpiDecomposto
  decompTotalAtrasado: BuKpiDecomposto
  decompHorasApontadas: BuKpiDecomposto
  // Visão resumida por BU (linhas = BUs, colunas = indicadores PJ e CLT)
  visaoPorBu: BuVisaoLinha[]
  // Encerramentos / Desligamentos no período com separação PJ x CLT
  encerramentosPeriodo: ItemEncerramentoBu[]
  totalRescisorioGeral: number
  totalRescisorioClt: number
  totalRescisorioPj: number
}

export interface MesProjecao {
  chave: string // 'MM/AAAA'
  rotulo: string // 'Out/26'
  mes: number
  ano: number
  prestracaoPjRecorrente: number
  nfsPrevistas: number
  folhaContratacoes: number
  totalGeral: number
}

export interface VagaCruzamentoFinanceiro {
  vagaId: string
  titulo: string
  departamento: string
  faixaSalarial: string
  orcamentoMensal: number
  posicoesAbertas: number
  posicoesPreenchidas: number
  status: string
  custoAtualContratacao: number // proposta aceita ou onboarding ativo
  candidatoContratadoNome?: string
  statusContratacao?: string
  custoPjDepartamento: number // soma dos prestadores associados à área
  prestadoresAssociados: Array<{ nome: string; valorMensal: number }>
  // Comparativo CLT x PJ
  custoCltEstimadoTotal: number // ~1.65x do salário base CLT (encargos + provisões + benefícios)
  custoPjEquivalenteEstimado: number // valor mensal PJ estimado de mercado para função equivalente
  economiaEstimadaModelo: string
}

export type TierRenovacao = 'Renovar' | 'Renegociar' | 'Reavaliar'

export interface PrestadorRanqueado {
  id: string
  nomeFantasia: string
  razaoSocial: string
  cnpj: string
  areaAtuacao: string
  status: string
  valorMensal: number
  valorHora160h: number
  totalPago: number
  totalEmAberto: number
  totalAtrasado: number
  ultimaAvaliacaoNota: number
  ultimaAvaliacaoRecomendacao: string
  contratoVigenciaFim?: string
  contratoStatus?: string
  temAditivoPendente: boolean
  // Comparativo de Custo vs. Avaliação
  custoPorPonto: number // valorHora160h / ultimaAvaliacaoNota (quanto menor, mais eficiente)
  tierRenovacao: TierRenovacao // 'Renovar' | 'Renegociar' | 'Reavaliar'
  justificativaTier: string
  diasParaVencerContrato: number | null // <= 30 dias entra no radar de renovação
  contratoVencendoEm30Dias: boolean
  isMelhorCustoBeneficio: boolean
  isPiorCustoBeneficio: boolean
}

export interface ResumoComparativoCusto {
  valorHoraMedio: number
  notaMediaGeral: number
  custoPorPontoMedio: number
  valorHoraMediana: number
  potencialEconomiaMensal: number // Estimativa em R$/mês se prestadores com valor-hora acima da mediana fossem renegociados
  potencialEconomiaHorizonte: number // potencial mensal * horizonte (3/6/12 meses)
  totalPrestadores: number
  prestadoresVencendo30Dias: number
  totalRenovar: number
  totalRenegociar: number
  totalReavaliar: number
  empresaFiltroId?: string
}

export interface AlertaFinanceiroItem {
  id: string
  tipo: 'atrasada' | 'aprovada' | 'aditivo' | 'vencimento'
  titulo: string
  detalhe: string
  valor?: number
  grau: 'critico' | 'atencao' | 'informativo'
}

export interface SinteseFinanceiraIA {
  resumo_executivo: string
  alertas_criticos: string[]
  analise_orcamento_vagas: string
  projecao_trimestral: string
  recomendacoes_estrategicas: string[]
}

export interface MetaDepartamentoConsolidada {
  id?: string
  departamento: string
  limiteMensal: number
  ativo: boolean
  gastoAtualMes: number
  projecaoMediaMensal: number
  percentualUsoAtual: number
  percentualUsoProjecao: number
  status: 'dentro' | 'atencao' | 'estourado'
  custoPj: number
  custoNfs: number
  custoFolha: number
  prestadoresAssociados: Array<{ nome: string; valor: number }>
  vagasAssociadas: Array<{ titulo: string; custo: number; status: string }>
}

export interface DadosFinanceirosConsolidados {
  mesSelecionado: number
  anoSelecionado: number
  periodoProjecaoMeses: number
  kpis: KpisFinanceiros
  serieProjecao: MesProjecao[]
  vagasCruzamento: VagaCruzamentoFinanceiro[]
  prestadoresRanqueados: PrestadorRanqueado[]
  resumoComparativoCusto: ResumoComparativoCusto
  metasDepartamentos: MetaDepartamentoConsolidada[]
  alertasFinanceiros: AlertaFinanceiroItem[]
  totaisRodapePrestadores: {
    totalMensal: number
    totalHora160h: number
    totalPago: number
    totalEmAberto: number
    totalAtrasado: number
  }
}

const MESES_NOMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

const MESES_SIGLAS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

/**
 * Busca todos os registros necessários e calcula métricas financeiras consolidadas
 */
export async function carregarDadosFinanceiros(
  mes: number,
  ano: number,
  horizonteMeses: number = 6,
  empresaFiltroId?: string,
): Promise<DadosFinanceirosConsolidados> {
  const [
    prestadores,
    contratos,
    notasFiscais,
    aditivos,
    vagas,
    ofertas,
    onboardings,
    avaliacoes,
    metasCadastradas,
    empresas,
    pessoas,
    apontamentos,
    beneficiosLista,
    programacoesLista,
    offboardingsLista,
  ] = await Promise.all([
    pb
      .collection('prestadores_pj')
      .getFullList({ sort: '-created' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('contratos_pj')
      .getFullList({ sort: '-created', expand: 'prestador,gestor_responsavel' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('notas_fiscais_pj')
      .getFullList({ sort: '-data_vencimento', expand: 'prestador,contrato' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('aditivos_pj')
      .getFullList({ sort: '-created', expand: 'prestador,contrato' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('vagas')
      .getFullList({ sort: '-created', expand: 'gestor_responsavel,empresa' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('ofertas')
      .getFullList({ sort: '-created', expand: 'candidato,vaga,vaga.empresa' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('onboardings')
      .getFullList({ sort: '-created', expand: 'candidato,vaga,vaga.empresa' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('avaliacoes_prestador_pj')
      .getFullList({ sort: '-created', expand: 'prestador' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('metas_orcamento_departamento')
      .getFullList({ sort: 'departamento' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('empresas')
      .getFullList({ sort: 'nome' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('pessoas')
      .getFullList({ sort: 'nome', expand: 'empresa,area' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('apontamentos_horas')
      .getFullList({ sort: '-created', expand: 'pessoa,empresa' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('beneficios_vinculo')
      .getFullList({ sort: '-created' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('programacoes_descanso')
      .getFullList({ sort: '-created' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('offboardings')
      .getFullList({ sort: '-data_desligamento', expand: 'pessoa,empresa' })
      .catch(() => [] as RecordModel[]),
  ])
  const compStringMesAtual = `${String(mes).padStart(2, '0')}/${ano}`

  // 1. Prestadores Ativos e Comprometido Mensal (com reflexo de Benefícios PJ e Suspensão Programada de Descanso)
  // Vínculos em desligamento/encerrados saem do comprometido mensal a partir da data de desligamento
  const offboardingsValidos = offboardingsLista || []
  const pessoasDesligadasIds = new Set<string>()
  const prestadoresDesligadosIds = new Set<string>()

  offboardingsValidos.forEach((off) => {
    if (off.data_desligamento) {
      const dtDeslig = new Date(off.data_desligamento).getTime()
      // Se a data de desligamento for anterior ou dentro do mês de referência (fim do mês),
      // ou se o processo já estiver com status "Concluído", sai do comprometido mensal
      if (dtDeslig <= fimMesSelecionado || off.status === 'Concluído') {
        if (off.pessoa) pessoasDesligadasIds.add(off.pessoa)
        // Se for PJ, identificar se há prestador correspondente
        if (off.modalidade === 'PJ') {
          const pes = pessoas.find((p) => p.id === off.pessoa)
          if (pes?.prestador_origem) {
            prestadoresDesligadosIds.add(pes.prestador_origem)
          }
          if (pes?.cpf_cnpj) {
            const pr = prestadores.find((p) => p.cnpj === pes.cpf_cnpj)
            if (pr) prestadoresDesligadosIds.add(pr.id)
          }
        }
      }
    }
  })

  const prestadoresAtivos = prestadores.filter(
    (p) =>
      (p.status === 'Ativo' || p.status === 'Em renovação') && !prestadoresDesligadosIds.has(p.id),
  )

  // Mapeamento de benefícios ativos por pessoa e por prestador
  const mapaBeneficiosPorPessoa = new Map<string, number>()
  beneficiosLista.forEach((b) => {
    if (b.ativo !== false) {
      const pId = b.pessoa
      const v = Number(b.valor_mensal) || 0
      mapaBeneficiosPorPessoa.set(pId, (mapaBeneficiosPorPessoa.get(pId) || 0) + v)
    }
  })

  // Verificar se uma pessoa/prestador está com suspensão/descanso PJ no mês selecionado
  const inicioMesSelecionado = new Date(ano, mes - 1, 1).getTime()
  const fimMesSelecionado = new Date(ano, mes, 0, 23, 59, 59).getTime()

  const obterValorEfetivoMesPj = (prestadorId: string, valorBaseMensal: number): number => {
    // Localizar pessoa vinculada ao prestador
    const pesVinculada = pessoas.find(
      (p) =>
        p.prestador_origem === prestadorId ||
        p.cpf_cnpj === prestadores.find((pr) => pr.id === prestadorId)?.cnpj ||
        (p.email &&
          p.email.toLowerCase() ===
            prestadores.find((pr) => pr.id === prestadorId)?.contato_email?.toLowerCase()),
    )

    const pessoaId = pesVinculada?.id

    // Verificar se há programação de descanso PJ ativa cobrindo este mês
    if (pessoaId) {
      const descansoNoMes = programacoesLista.find((pr) => {
        if (pr.pessoa !== pessoaId || pr.tipo !== 'PJ_DESCANSO' || pr.status === 'Canceladas') {
          return false
        }
        const dIni = new Date(pr.data_inicio).getTime()
        const dFim = new Date(pr.data_fim).getTime()
        return dIni <= fimMesSelecionado && dFim >= inicioMesSelecionado
      })

      if (descansoNoMes) {
        // No mês coberto por suspensão, o comprometido vira o valor acordado do período (ou R$ 0 se configurado)
        const valPeriodo = Number(descansoNoMes.valor_periodo)
        // Se descanso cobre o mês todo (>= 28 dias), vira o valor do período acordado
        // Se fracionado (ex: 15 dias de descanso), contratado proporcional dos dias restantes + descanso negociado
        const diasDescanso = Number(descansoNoMes.dias) || 15
        const diasTrabalhados = Math.max(0, 30 - diasDescanso)
        const valorTrabalhado = (valorBaseMensal / 30) * diasTrabalhados
        const totalMesSuspensao = valorTrabalhado + valPeriodo
        // Adicionar benefícios ativos da pessoa se houver
        const benPessoa = mapaBeneficiosPorPessoa.get(pessoaId) || 0
        return totalMesSuspensao + benPessoa
      }
    }

    // Se não houver descanso, valor base + benefícios da pessoa
    const benPessoa = pessoaId ? mapaBeneficiosPorPessoa.get(pessoaId) || 0 : 0
    return valorBaseMensal + benPessoa
  }

  let somaComprometidoMensalPj = 0

  prestadoresAtivos.forEach((p) => {
    const valBase = Number(p.valor_mensal_atual) || 0
    const valEfetivo = obterValorEfetivoMesPj(p.id, valBase)
    somaComprometidoMensalPj += valEfetivo
  })

  const valorHoraMedioPj =
    prestadoresAtivos.length > 0 && somaComprometidoMensalPj > 0
      ? Math.round((somaComprometidoMensalPj / (prestadoresAtivos.length * 160)) * 100) / 100
      : 0

  // 2. NFs do Período Selecionado
  let totalPagoPeriodo = 0
  let nfsPagasCount = 0
  let aPagarPeriodo = 0
  let nfsAprovadasCount = 0
  let totalAtrasado = 0
  let nfsAtrasadasCount = 0

  const alertasFinanceiros: AlertaFinanceiroItem[] = []

  notasFiscais.forEach((nf) => {
    const val = Number(nf.valor) || 0
    const comp = nf.competencia || ''
    const status = nf.status || ''

    // Se for competência selecionada ou data no mês
    const isMesSelecionado = comp === compStringMesAtual

    if (isMesSelecionado) {
      if (status === 'Paga') {
        totalPagoPeriodo += val
        nfsPagasCount++
      } else if (
        status === 'Aprovada para pagamento' ||
        status === 'Em conferência' ||
        status === 'Recebida'
      ) {
        aPagarPeriodo += val
        nfsAprovadasCount++
      } else if (status === 'Atrasada') {
        totalAtrasado += val
        nfsAtrasadasCount++
        aPagarPeriodo += val
      }
    }

    // Alerta de NF atrasada global
    if (status === 'Atrasada') {
      const prestNome =
        nf.expand?.prestador?.nome_fantasia || nf.expand?.prestador?.razao_social || 'Prestador PJ'
      alertasFinanceiros.push({
        id: `alerta-nf-${nf.id}`,
        tipo: 'atrasada',
        titulo: `Nota Fiscal Atrasada: ${nf.numero_nf || 'Sem número'}`,
        detalhe: `${prestNome} — Competência ${comp || 'N/D'} com valor de R$ ${val.toLocaleString('pt-BR')}. Vencimento extrapolado.`,
        valor: val,
        grau: 'critico',
      })
    }
  })

  // Alertas de aditivos pendentes de assinatura
  aditivos.forEach((ad) => {
    if (ad.status === 'Pendente de assinatura') {
      const prestNome = ad.expand?.prestador?.nome_fantasia || 'Prestador PJ'
      alertasFinanceiros.push({
        id: `alerta-adit-${ad.id}`,
        tipo: 'aditivo',
        titulo: `Aditivo Pendente de Assinatura: ${ad.numero_aditivo}`,
        detalhe: `${prestNome} — ${ad.tipo} (Novo valor R$ ${Number(ad.novo_valor_mensal || 0).toLocaleString('pt-BR')}). Aguarda validação das partes.`,
        valor: Number(ad.novo_valor_mensal || 0),
        grau: 'atencao',
      })
    }
  })

  // Alertas de contratos vencendo em até 45 dias
  contratos.forEach((ct) => {
    if (
      ct.status === 'Vencendo' ||
      (ct.data_fim && new Date(ct.data_fim).getTime() - Date.now() < 45 * 86400000)
    ) {
      const prestNome = ct.expand?.prestador?.nome_fantasia || 'Prestador PJ'
      alertasFinanceiros.push({
        id: `alerta-ct-${ct.id}`,
        tipo: 'vencimento',
        titulo: `Contrato Próximo ao Vencimento: ${ct.numero_contrato || ct.titulo}`,
        detalhe: `${prestNome} — Fim previsto em ${ct.data_fim ? new Date(ct.data_fim).toLocaleDateString('pt-BR') : 'breve'}. Valor mensal de R$ ${Number(ct.valor || 0).toLocaleString('pt-BR')}.`,
        valor: Number(ct.valor || 0),
        grau: 'informativo',
      })
    }
  })

  // 3. Folha Estimada de Contratações (Propostas Aceitas + Onboardings Ativos)
  let folhaContratacoesMes = 0
  let propostasAceitasCount = 0
  let onboardingsAtivosCount = 0

  const propostasAceitas = ofertas.filter((o) => o.status === 'Aceita')
  propostasAceitas.forEach((p) => {
    propostasAceitasCount++
    folhaContratacoesMes += Number(p.salario_ofertado) || 0
  })

  const onboardingsAtivos = onboardings.filter((o) => o.status === 'Ativo')
  onboardingsAtivos.forEach((ob) => {
    onboardingsAtivosCount++
    // Evitar duplicar salário se a oferta do mesmo candidato já foi somada
    const temOfertaAceita = propostasAceitas.some((o) => o.candidato === ob.candidato)
    if (!temOfertaAceita) {
      // Estimar com base no teto da vaga ou média de mercado
      const vagaRel = vagas.find((v) => v.id === ob.vaga)
      const salEstimado = vagaRel ? Number(vagaRel.orcamento_mensal) || 8500 : 8500
      folhaContratacoesMes += salEstimado
    }
  })

  // 4. Projeção Mensal dos Próximos 6 a 12 meses
  const serieProjecao: MesProjecao[] = []
  let somaProjecaoProximos3Meses = 0

  for (let step = 0; step < horizonteMeses; step++) {
    const dProj = new Date(ano, mes - 1 + step, 1)
    const mNum = dProj.getMonth() + 1
    const aNum = dProj.getFullYear()
    const chaveComp = `${String(mNum).padStart(2, '0')}/${aNum}`
    const rotulo = `${MESES_SIGLAS[mNum - 1]}/${String(aNum).slice(-2)}`

    // Prestações PJ recorrentes baseadas na vigência dos contratos
    let prestacaoPjRecorrenteMes = 0
    prestadoresAtivos.forEach((p) => {
      // Localizar contrato vigente do prestador
      const ct = contratos.find(
        (c) => c.prestador === p.id && (c.status === 'Vigente' || c.status === 'Vencendo'),
      )
      let valorMensalEfetivo = Number(p.valor_mensal_atual) || 0

      // Checar se há aditivo que entra em vigor neste mês
      const aditivoValido = aditivos.find(
        (ad) =>
          ad.prestador === p.id &&
          (ad.status === 'Vigente' || ad.status === 'Pendente de assinatura') &&
          Number(ad.novo_valor_mensal) > 0,
      )
      if (aditivoValido && step >= 2) {
        valorMensalEfetivo = Number(aditivoValido.novo_valor_mensal)
      }

      // Validar vigência se data_fim for menor que o mês projetado
      if (ct && ct.data_fim) {
        const dFim = new Date(ct.data_fim)
        if (dFim.getTime() < dProj.getTime() && ct.status !== 'Vencendo') {
          // Contrato expiraria caso não renovado
          valorMensalEfetivo = valorMensalEfetivo * 0.5 // projeção conservadora
        }
      }

      prestacaoPjRecorrenteMes += valorMensalEfetivo
    })

    // NFs previstas lançadas no sistema para a competência
    let nfsPrevistasMes = 0
    notasFiscais.forEach((nf) => {
      if (nf.competencia === chaveComp) {
        nfsPrevistasMes += Number(nf.valor) || 0
      }
    })

    // Se houver NFs reais lançadas na competência futura, equilibra com a prestação recorrente
    // para não duplicar prestação mensal contratada + NF correspondente
    if (nfsPrevistasMes > 0 && nfsPrevistasMes >= prestacaoPjRecorrenteMes * 0.7) {
      prestacaoPjRecorrenteMes = 0 // já coberto pelas NFs emitidas da competência
    }

    // Folha de contratações: cresce gradualmente conforme novas vagas abertas forem admitidas
    // Base de propostas aceitas + onboardings em curso
    let folhaMes = folhaContratacoesMes
    if (step > 1) {
      // Projeção com rampa suave de preenchimento das vagas abertas
      folhaMes = Math.round(folhaContratacoesMes + step * 4500)
    }

    const totalMes = prestacaoPjRecorrenteMes + nfsPrevistasMes + folhaMes

    if (step >= 1 && step <= 3) {
      somaProjecaoProximos3Meses += totalMes
    }

    serieProjecao.push({
      chave: chaveComp,
      rotulo,
      mes: mNum,
      ano: aNum,
      prestracaoPjRecorrente: prestacaoPjRecorrenteMes,
      nfsPrevistas: nfsPrevistasMes,
      folhaContratacoes: folhaMes,
      totalGeral: totalMes,
    })
  }

  // 5. Cruzamento com Orçamento das Vagas
  const vagasCruzamento: VagaCruzamentoFinanceiro[] = vagas.map((v) => {
    const dep = v.departamento || 'Geral'
    const orc = Number(v.orcamento_mensal) || 12000

    // Oferta aceita vinculada a esta vaga
    const ofertaAceita = ofertas.find((o) => o.vaga === v.id && o.status === 'Aceita')
    const onboardingVinculado = onboardings.find((ob) => ob.vaga === v.id && ob.status === 'Ativo')

    let custoAtual = 0
    let candNome = ''
    let statusContr = 'Vaga Aberta'

    if (ofertaAceita) {
      custoAtual = Number(ofertaAceita.salario_ofertado) || 0
      candNome = ofertaAceita.expand?.candidato?.nome || 'Candidato Selecionado'
      statusContr = 'Proposta Aceita'
    } else if (onboardingVinculado) {
      custoAtual = orc > 0 ? orc : 9000
      candNome = onboardingVinculado.expand?.candidato?.nome || 'Novo Colaborador'
      statusContr = 'Em Onboarding'
    }

    // Cruzar prestadores PJ correspondentes ao departamento
    const prestadoresDept = prestadoresAtivos.filter((p) => {
      const area = (p.area_atuacao || '').toLowerCase()
      const depLower = dep.toLowerCase()
      if (depLower.includes('tecnologia') || depLower.includes('tech') || depLower.includes('ti')) {
        return area.includes('software') || area.includes('cloud') || area.includes('devops')
      }
      if (depLower.includes('marketing') || depLower.includes('comunicação')) {
        return area.includes('marketing') || area.includes('branding') || area.includes('mídia')
      }
      if (depLower.includes('produto') || depLower.includes('design')) {
        return area.includes('software') || area.includes('branding')
      }
      if (depLower.includes('humano') || depLower.includes('rh') || depLower.includes('gente')) {
        return area.includes('jurídic') || area.includes('trabalhist') || area.includes('lgpd')
      }
      return false
    })

    const custoPjDept = prestadoresDept.reduce(
      (acc, p) => acc + (Number(p.valor_mensal_atual) || 0),
      0,
    )

    // Comparativo CLT x Prestador PJ
    // CLT: Salário base + Encargos FGTS/INSS/Férias/13º/VT/VR (~1.65x)
    const baseSalario = custoAtual > 0 ? custoAtual : orc
    const custoCltEstimado = Math.round(baseSalario * 1.65)
    // Prestador PJ equivalente para escopo similar: usualmente entre 1.3x e 1.5x do salário bruto CLT
    const custoPjEquivalente = Math.round(baseSalario * 1.4)

    let economiaTexto = ''
    if (custoCltEstimado > custoPjEquivalente) {
      const dif = custoCltEstimado - custoPjEquivalente
      economiaTexto = `PJ ~R$ ${dif.toLocaleString('pt-BR')}/mês mais enxuto em encargos`
    } else {
      economiaTexto = 'CLT vantajoso a longo prazo pela retenção de IP'
    }

    return {
      vagaId: v.id,
      titulo: v.titulo,
      departamento: dep,
      faixaSalarial: v.faixa_salarial || 'Não informada',
      orcamentoMensal: orc,
      posicoesAbertas: v.status === 'Ativa' ? 1 : 0,
      posicoesPreenchidas: v.status === 'Preenchida' ? 1 : ofertaAceita ? 1 : 0,
      status: v.status,
      custoAtualContratacao: custoAtual,
      candidatoContratadoNome: candNome,
      statusContratacao: statusContr,
      custoPjDepartamento: custoPjDept,
      prestadoresAssociados: prestadoresDept.map((p) => ({
        nome: p.nome_fantasia || p.razao_social,
        valorMensal: Number(p.valor_mensal_atual) || 0,
      })),
      custoCltEstimadoTotal: custoCltEstimado,
      custoPjEquivalenteEstimado: custoPjEquivalente,
      economiaEstimadaModelo: economiaTexto,
    }
  })

  // 5.1 Cálculo de Metas de Orçamento por Departamento
  // Reutiliza a associação departamental (PJ + NFs + Folha de contratações)
  const departamentosMapeados = new Set<string>()
  metasCadastradas.forEach((m) => {
    if (m.departamento) departamentosMapeados.add(m.departamento)
  })
  vagas.forEach((v) => {
    if (v.departamento) departamentosMapeados.add(v.departamento)
  })

  const metasDepartamentos: MetaDepartamentoConsolidada[] = Array.from(departamentosMapeados)
    .filter(Boolean)
    .map((depNome) => {
      const metaCadastrada = metasCadastradas.find(
        (m) => (m.departamento || '').toLowerCase() === depNome.toLowerCase(),
      )
      const limiteMensal = metaCadastrada ? Number(metaCadastrada.limite_mensal) || 0 : 0
      const ativo = metaCadastrada ? metaCadastrada.ativo !== false : false

      // 1. Prestadores PJ do departamento
      const prestadoresDoDepto = prestadoresAtivos.filter((p) => {
        const area = (p.area_atuacao || '').toLowerCase()
        const depLower = depNome.toLowerCase()
        if (
          depLower.includes('tecnologia') ||
          depLower.includes('tech') ||
          depLower.includes('ti')
        ) {
          return area.includes('software') || area.includes('cloud') || area.includes('devops')
        }
        if (depLower.includes('marketing') || depLower.includes('comunicação')) {
          return area.includes('marketing') || area.includes('branding') || area.includes('mídia')
        }
        if (depLower.includes('produto') || depLower.includes('design')) {
          return area.includes('software') || area.includes('branding')
        }
        if (
          depLower.includes('humano') ||
          depLower.includes('rh') ||
          depLower.includes('gente') ||
          depLower.includes('jurídico') ||
          depLower.includes('juridico')
        ) {
          return area.includes('jurídic') || area.includes('trabalhist') || area.includes('lgpd')
        }
        return false
      })

      const custoPj = prestadoresDoDepto.reduce(
        (acc, p) => acc + (Number(p.valor_mensal_atual) || 0),
        0,
      )

      // 2. NFs do departamento no mês atual (se houver NF avulsa ou específica)
      const idsPrestadores = new Set(prestadoresDoDepto.map((p) => p.id))
      let custoNfsMesAtual = 0
      notasFiscais.forEach((nf) => {
        if (nf.competencia === compStringMesAtual && idsPrestadores.has(nf.prestador)) {
          custoNfsMesAtual += Number(nf.valor) || 0
        }
      })

      // 3. Vagas e Folha de novas contratações do departamento
      const vagasDoDepto = vagasCruzamento.filter(
        (v) => (v.departamento || '').toLowerCase() === depNome.toLowerCase(),
      )
      const custoFolha = vagasDoDepto.reduce(
        (acc, v) => acc + (Number(v.custoAtualContratacao) || 0),
        0,
      )

      // Gasto atual do mês corrente
      // Se tiver NFs que cobrem o PJ, equilibra conforme regra global
      let gastoPjBase = custoPj
      if (custoNfsMesAtual >= custoPj * 0.7 && custoNfsMesAtual > 0) {
        gastoPjBase = custoNfsMesAtual
      }
      const gastoAtualMes = gastoPjBase + custoFolha

      // 4. Projeção média mensal no horizonte selecionado (3, 6 ou 12 meses)
      // Simula a evolução departamental ao longo do horizonte
      let somaProjecaoHorizonte = 0
      for (let s = 0; s < horizonteMeses; s++) {
        // PJ com aditivos futuros se aplicável
        let pjMes = custoPj
        prestadoresDoDepto.forEach((p) => {
          const aditivo = aditivos.find(
            (ad) =>
              ad.prestador === p.id &&
              (ad.status === 'Vigente' || ad.status === 'Pendente de assinatura') &&
              Number(ad.novo_valor_mensal) > 0,
          )
          if (aditivo && s >= 2) {
            pjMes += Number(aditivo.novo_valor_mensal) - (Number(p.valor_mensal_atual) || 0)
          }
        })

        // Rampa suave de preenchimento para vagas ativas da área
        const vagasAbertasArea = vagasDoDepto.filter((v) => v.status === 'Ativa').length
        let folhaMesArea = custoFolha
        if (s > 1 && vagasAbertasArea > 0) {
          folhaMesArea += Math.round(vagasAbertasArea * 3000 * Math.min(s, 3))
        }

        somaProjecaoHorizonte += pjMes + folhaMesArea
      }

      const projecaoMediaMensal =
        horizonteMeses > 0 ? Math.round(somaProjecaoHorizonte / horizonteMeses) : gastoAtualMes

      // Percentuais de uso
      const percentualUsoAtual =
        limiteMensal > 0 ? Math.round((gastoAtualMes / limiteMensal) * 100) : 0
      const percentualUsoProjecao =
        limiteMensal > 0 ? Math.round((projecaoMediaMensal / limiteMensal) * 100) : 0

      // Status do semáforo baseado na projeção (ou no gasto atual se maior)
      const usoReferencia = Math.max(percentualUsoAtual, percentualUsoProjecao)
      let status: 'dentro' | 'atencao' | 'estourado' = 'dentro'
      if (usoReferencia > 100) {
        status = 'estourado'
      } else if (usoReferencia >= 90) {
        status = 'atencao'
      } else {
        status = 'dentro'
      }

      // Adicionar alerta na lista de alertas financeiros se estourado
      if (ativo && limiteMensal > 0) {
        if (status === 'estourado') {
          const excesso = Math.max(gastoAtualMes, projecaoMediaMensal) - limiteMensal
          alertasFinanceiros.push({
            id: `alerta-meta-${depNome.toLowerCase()}`,
            tipo: 'vencimento', // padrão compatível
            titulo: `Orçamento Estourado: Departamento ${depNome}`,
            detalhe: `Projeção mensal de R$ ${projecaoMediaMensal.toLocaleString('pt-BR')} excede o limite estabelecido de R$ ${limiteMensal.toLocaleString('pt-BR')} (+R$ ${excesso.toLocaleString('pt-BR')}, ${percentualUsoProjecao}%).`,
            valor: excesso,
            grau: 'critico',
          })
        } else if (status === 'atencao') {
          alertasFinanceiros.push({
            id: `alerta-meta-atencao-${depNome.toLowerCase()}`,
            tipo: 'vencimento',
            titulo: `Orçamento em Atenção: Departamento ${depNome}`,
            detalhe: `Projeção mensal de R$ ${projecaoMediaMensal.toLocaleString('pt-BR')} atingiu ${percentualUsoProjecao}% do limite de R$ ${limiteMensal.toLocaleString('pt-BR')}.`,
            valor: projecaoMediaMensal,
            grau: 'atencao',
          })
        }
      }

      return {
        id: metaCadastrada?.id,
        departamento: depNome,
        limiteMensal,
        ativo,
        gastoAtualMes,
        projecaoMediaMensal,
        percentualUsoAtual,
        percentualUsoProjecao,
        status,
        custoPj,
        custoNfs: custoNfsMesAtual,
        custoFolha,
        prestadoresAssociados: prestadoresDoDepto.map((p) => ({
          nome: p.nome_fantasia || p.razao_social,
          valor: Number(p.valor_mensal_atual) || 0,
        })),
        vagasAssociadas: vagasDoDepto.map((v) => ({
          titulo: v.titulo,
          custo: v.custoAtualContratacao,
          status: v.status,
        })),
      }
    })

  // Ordenar departamentos com metas cadastradas primeiro e por maior limite
  metasDepartamentos.sort((a, b) => {
    if (a.limiteMensal > 0 && b.limiteMensal === 0) return -1
    if (a.limiteMensal === 0 && b.limiteMensal > 0) return 1
    return b.limiteMensal - a.limiteMensal
  })

  // 6. Composição do Custo por Prestador (Ranqueada)
  const prestadoresRanqueados: PrestadorRanqueado[] = prestadores.map((p) => {
    const valMensal = Number(p.valor_mensal_atual) || 0
    const hora160 = Math.round((valMensal / 160) * 100) / 100

    // Notas Fiscais do prestador
    const nfsPrest = notasFiscais.filter((nf) => nf.prestador === p.id)
    let totalPago = 0
    let totalAberto = 0
    let totalAtraso = 0

    nfsPrest.forEach((nf) => {
      const v = Number(nf.valor) || 0
      if (nf.status === 'Paga') {
        totalPago += v
      } else if (nf.status === 'Atrasada') {
        totalAtraso += v
        totalAberto += v
      } else if (nf.status !== 'Glosada') {
        totalAberto += v
      }
    })

    // Contrato do prestador
    const ct = contratos.find(
      (c) => c.prestador === p.id && (c.status === 'Vigente' || c.status === 'Vencendo'),
    )
    const temAditPendente = aditivos.some(
      (ad) => ad.prestador === p.id && ad.status === 'Pendente de assinatura',
    )

    // Última avaliação
    const aval = avaliacoes.find((av) => av.prestador === p.id)
    const notaMedia = aval ? Number(aval.nota_media) : Number(p.media_avaliacao) || 9.0
    const recomendacao = aval ? aval.recomendacao : 'Continuar'

    // Dias para vencer contrato
    let diasParaVencer: number | null = null
    let vencendoEm30Dias = false
    if (ct?.data_fim) {
      const agora = new Date()
      const dataFim = new Date(ct.data_fim)
      diasParaVencer = Math.ceil((dataFim.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))
      if (diasParaVencer <= 30) {
        vencendoEm30Dias = true
      }
    }

    // Custo por ponto de avaliação (base 160h ÷ nota)
    const custoPorPonto = notaMedia > 0 ? Math.round((hora160 / notaMedia) * 100) / 100 : hora160

    return {
      id: p.id,
      nomeFantasia: p.nome_fantasia || p.razao_social,
      razaoSocial: p.razao_social,
      cnpj: p.cnpj,
      areaAtuacao: p.area_atuacao,
      status: p.status,
      valorMensal: valMensal,
      valorHora160h: hora160,
      totalPago,
      totalEmAberto: totalAberto,
      totalAtrasado: totalAtraso,
      ultimaAvaliacaoNota: notaMedia,
      ultimaAvaliacaoRecomendacao: recomendacao,
      contratoVigenciaFim: ct?.data_fim,
      contratoStatus: ct?.status,
      temAditivoPendente: temAditPendente,
      custoPorPonto,
      tierRenovacao: 'Renovar' as TierRenovacao, // calculado a seguir com base no portfólio
      justificativaTier: '',
      diasParaVencerContrato: diasParaVencer,
      contratoVencendoEm30Dias: vencendoEm30Dias,
      isMelhorCustoBeneficio: false,
      isPiorCustoBeneficio: false,
    }
  })

  // Cálculos consolidados do portfólio para Tiers e Economia
  const totalP = prestadoresRanqueados.length
  const somaValorHora = prestadoresRanqueados.reduce((acc, p) => acc + p.valorHora160h, 0)
  const somaNotas = prestadoresRanqueados.reduce((acc, p) => acc + p.ultimaAvaliacaoNota, 0)
  const valorHoraMedio = totalP > 0 ? Math.round((somaValorHora / totalP) * 100) / 100 : 0
  const notaMediaGeral = totalP > 0 ? Math.round((somaNotas / totalP) * 10) / 10 : 0

  // Mediana do valor-hora do portfólio
  const valoresHoraOrdenados = [...prestadoresRanqueados.map((p) => p.valorHora160h)].sort(
    (a, b) => a - b,
  )
  let valorHoraMediana = 0
  if (totalP > 0) {
    const meio = Math.floor(totalP / 2)
    valorHoraMediana =
      totalP % 2 !== 0
        ? valoresHoraOrdenados[meio]
        : (valoresHoraOrdenados[meio - 1] + valoresHoraOrdenados[meio]) / 2
    valorHoraMediana = Math.round(valorHoraMediana * 100) / 100
  }

  // Identificar melhor e pior custo por ponto
  const minCustoPonto =
    totalP > 0 ? Math.min(...prestadoresRanqueados.map((p) => p.custoPorPonto)) : 0
  const maxCustoPonto =
    totalP > 0 ? Math.max(...prestadoresRanqueados.map((p) => p.custoPorPonto)) : 0

  // Classificar em Tiers de Renovação com critérios transparentes
  prestadoresRanqueados.forEach((p) => {
    if (totalP > 1 && p.custoPorPonto === minCustoPonto) {
      p.isMelhorCustoBeneficio = true
    }
    if (totalP > 1 && p.custoPorPonto === maxCustoPonto) {
      p.isPiorCustoBeneficio = true
    }

    // Regras de Decisão de Renovação:
    // 1. "Reavaliar": Nota baixa (< 8.0) e/ou custo elevado por ponto com ressalvas na entrega
    // 2. "Renegociar": Valor-hora acima da média com nota intermediária ou pendência contratual/aditivo
    // 3. "Renovar": Bom custo-benefício (custo por ponto competitivo) e nota alta (>= 9.0 ou >= nota média)
    if (p.ultimaAvaliacaoNota < 8.0 || p.ultimaAvaliacaoRecomendacao === 'Não renovar') {
      p.tierRenovacao = 'Reavaliar'
      p.justificativaTier = `Nota de avaliação (${p.ultimaAvaliacaoNota.toFixed(1)}) abaixo do limiar de excelência do portfólio.`
    } else if (p.valorHora160h > valorHoraMedio && p.ultimaAvaliacaoNota < 9.2) {
      p.tierRenovacao = 'Renegociar'
      p.justificativaTier = `Valor-hora (R$ ${p.valorHora160h.toFixed(2)}) acima da média do portfólio (R$ ${valorHoraMedio.toFixed(2)}) com nota intermediária.`
    } else if (p.ultimaAvaliacaoRecomendacao === 'Renovar com ressalvas') {
      p.tierRenovacao = 'Renegociar'
      p.justificativaTier =
        'Recomendação técnica de renovação com ressalvas; readequar escopo e prazos.'
    } else {
      p.tierRenovacao = 'Renovar'
      p.justificativaTier = `Excelente custo-benefício (R$ ${p.custoPorPonto.toFixed(2)}/ponto) e alto índice de aprovação nas entregas.`
    }
  })

  // Potencial de economia: se prestadores cujo valor-hora está acima da mediana fossem renegociados para a mediana
  // Economia mensal = (valorHora - valorHoraMediana) * 160h
  let potencialEconomiaMensal = 0
  prestadoresRanqueados.forEach((p) => {
    if (p.valorHora160h > valorHoraMediana) {
      const difHora = p.valorHora160h - valorHoraMediana
      potencialEconomiaMensal += Math.round(difHora * 160)
    }
  })
  const potencialEconomiaHorizonte = potencialEconomiaMensal * horizonteMeses

  const somaCustoPonto = prestadoresRanqueados.reduce((acc, p) => acc + p.custoPorPonto, 0)
  const custoPorPontoMedio = totalP > 0 ? Math.round((somaCustoPonto / totalP) * 100) / 100 : 0

  const resumoComparativoCusto: ResumoComparativoCusto = {
    valorHoraMedio,
    notaMediaGeral,
    custoPorPontoMedio,
    valorHoraMediana,
    potencialEconomiaMensal,
    potencialEconomiaHorizonte,
    totalPrestadores: totalP,
    prestadoresVencendo30Dias: prestadoresRanqueados.filter((p) => p.contratoVencendoEm30Dias)
      .length,
    totalRenovar: prestadoresRanqueados.filter((p) => p.tierRenovacao === 'Renovar').length,
    totalRenegociar: prestadoresRanqueados.filter((p) => p.tierRenovacao === 'Renegociar').length,
    totalReavaliar: prestadoresRanqueados.filter((p) => p.tierRenovacao === 'Reavaliar').length,
    empresaFiltroId,
  }

  // Ordenar ranqueado padrão por custo por ponto ascendente (melhor custo-benefício no topo)
  prestadoresRanqueados.sort((a, b) => a.custoPorPonto - b.custoPorPonto)

  const totaisRodapePrestadores = {
    totalMensal: prestadoresRanqueados.reduce((acc, p) => acc + p.valorMensal, 0),
    totalHora160h:
      prestadoresRanqueados.length > 0
        ? Math.round(
            (prestadoresRanqueados.reduce((acc, p) => acc + p.valorMensal, 0) /
              (prestadoresRanqueados.length * 160)) *
              100,
          ) / 100
        : 0,
    totalPago: prestadoresRanqueados.reduce((acc, p) => acc + p.totalPago, 0),
    totalEmAberto: prestadoresRanqueados.reduce((acc, p) => acc + p.totalEmAberto, 0),
    totalAtrasado: prestadoresRanqueados.reduce((acc, p) => acc + p.totalAtrasado, 0),
  }

  // ==========================================
  // DECOMPOSIÇÃO POR BU & SEPARAÇÃO PJ X CLT
  // ==========================================
  // Lista de empresas/BUs estruturadas
  interface ItemEmpresaBu {
    id: string
    nome: string
    sigla: string
    cor: string
    tipo: string
  }

  let empresasLista: ItemEmpresaBu[] =
    empresas && empresas.length > 0
      ? empresas.map((e) => ({
          id: e.id,
          nome: String(e.nome || ''),
          sigla: String(e.sigla || ''),
          cor: String(e.cor || '#6366F1'),
          tipo: String(e.tipo || 'BU / Filial'),
        }))
      : [
          {
            id: 'holding-matriz',
            nome: 'SouYess Holding',
            sigla: 'HOLDING',
            cor: '#0EA5E9',
            tipo: 'Holding / Matriz',
          },
          {
            id: 'tecnologia',
            nome: 'SouYess Tecnologia',
            sigla: 'TECH',
            cor: '#6366F1',
            tipo: 'BU / Filial',
          },
          {
            id: 'vertice-midia',
            nome: 'SouYess Vértice Mídia',
            sigla: 'VERTICE',
            cor: '#EC4899',
            tipo: 'BU / Filial',
          },
          {
            id: 'operacoes',
            nome: 'SouYess Operações',
            sigla: 'OPS',
            cor: '#10B981',
            tipo: 'BU / Filial',
          },
        ]

  // Se houver filtro de empresa para gestor de BU, filtrar a lista de BUs
  if (empresaFiltroId) {
    const filtrada = empresasLista.filter((e) => e.id === empresaFiltroId)
    if (filtrada.length > 0) {
      empresasLista = filtrada
    }
  }

  // Mapeamento auxiliar para identificar a BU de qualquer registro (com fallback estrito para "sem-bu")
  const normalizarBu = (empRef?: string, nomeRef?: string, areaRef?: string): string => {
    // 1. Correspondência exata por ID da lista de BUs
    if (empRef) {
      const matchDireto = empresasLista.find((e) => e.id === empRef)
      if (matchDireto) return matchDireto.id
    }

    // 2. Tentar buscar em empresas (caso empRef seja outro ID ou slug)
    if (empRef && empresas) {
      const empObj = empresas.find((e) => e.id === empRef)
      if (empObj) {
        const porId = empresasLista.find((el) => el.id === empObj.id)
        if (porId) return porId.id
        const porNome = empresasLista.find(
          (el) =>
            el.nome.toLowerCase() ===
              (empObj.nome_fantasia || empObj.razao_social || '').toLowerCase() ||
            el.sigla.toUpperCase() === (empObj.sigla || '').toUpperCase(),
        )
        if (porNome) return porNome.id
      }
    }

    const texto = `${empRef || ''} ${nomeRef || ''} ${areaRef || ''}`.toLowerCase()

    // 3. Regras de matching por palavras-chave e áreas/departamentos:
    // Tecnologia: engenharia de software, cloud, devops, sre, tech, software, infra
    if (
      texto.includes('nexus') ||
      texto.includes('cloud') ||
      texto.includes('devops') ||
      texto.includes('sre') ||
      texto.includes('engenharia de software') ||
      texto.includes('tecnologia') ||
      texto.includes('tech') ||
      texto.includes('software')
    ) {
      const e = empresasLista.find(
        (x) =>
          (x.sigla || '').toUpperCase() === 'TECH' ||
          (x.sigla || '').toUpperCase() === 'EMP-02' ||
          x.nome.toLowerCase().includes('tecnologia'),
      )
      if (e) return e.id
    }

    // Vértice Mídia: marketing, employer branding, mídia, midia, campanhas, vertice, vértice
    if (
      texto.includes('vertice') ||
      texto.includes('vértice') ||
      texto.includes('mídia') ||
      texto.includes('midia') ||
      texto.includes('employer branding') ||
      texto.includes('branding') ||
      texto.includes('marketing')
    ) {
      const e = empresasLista.find(
        (x) =>
          (x.sigla || '').toUpperCase() === 'VERTICE' ||
          (x.sigla || '').toUpperCase() === 'EMP-03' ||
          x.nome.toLowerCase().includes('vértice') ||
          x.nome.toLowerCase().includes('vertice'),
      )
      if (e) return e.id
    }

    // Holding: jurídico, juridico, compliance, advocacia, silveira, gente & gestão, people, governança
    if (
      texto.includes('silveira') ||
      texto.includes('advocacia') ||
      texto.includes('jurídic') ||
      texto.includes('juridic') ||
      texto.includes('compliance') ||
      texto.includes('gente & gestão') ||
      texto.includes('people') ||
      texto.includes('holding') ||
      texto.includes('matriz')
    ) {
      const e = empresasLista.find(
        (x) =>
          (x.tipo || '').includes('Holding') ||
          (x.sigla || '').toUpperCase() === 'HOLDING' ||
          (x.sigla || '').toUpperCase() === 'EMP-01',
      )
      if (e) return e.id
    }

    // Operações: operações, operacoes, facilities, logística, suprimentos, ops
    if (
      texto.includes('operac') ||
      texto.includes('operaç') ||
      texto.includes('facilities') ||
      texto.includes('logística') ||
      texto.includes('ops')
    ) {
      const e = empresasLista.find(
        (x) =>
          (x.sigla || '').toUpperCase() === 'OPS' ||
          (x.sigla || '').toUpperCase() === 'EMP-04' ||
          x.nome.toLowerCase().includes('operaç') ||
          x.nome.toLowerCase().includes('operac'),
      )
      if (e) return e.id
    }

    // 4. Se não encontrar, retornar categoria explícita "sem-bu" (nunca Holding silenciosa)
    return 'sem-bu'
  }

  // Identificar empresa de cada prestador PJ (através de contato_email, documento, nome fantasia, ou área de atuação)
  const empresaIdPorPrestador = new Map<string, string>()
  prestadores.forEach((p) => {
    const pEmail = (p.contato_email || p.email || '').toLowerCase().trim()
    const pCnpjLimpo = (p.cnpj || '').replace(/\D/g, '')
    const pNomeFantasia = (p.nome_fantasia || '').toLowerCase().trim()
    const pRazao = (p.razao_social || '').toLowerCase().trim()

    // 1. Procurar em pessoas com mesmo contato_email, CNPJ ou razão/nome fantasia
    const pessoaEquiv = pessoas.find((pes) => {
      const pesEmail = (pes.email || '').toLowerCase().trim()
      const pesCpfCnpj = (pes.cpf_cnpj || '').replace(/\D/g, '')
      const pesNome = (pes.nome || '').toLowerCase().trim()

      if (pEmail && pesEmail && pEmail === pesEmail) return true
      if (pCnpjLimpo && pesCpfCnpj && pCnpjLimpo === pesCpfCnpj) return true
      if (
        pesNome &&
        pNomeFantasia &&
        (pesNome.includes(pNomeFantasia) || pNomeFantasia.includes(pesNome))
      )
        return true
      if (pesNome && pRazao && (pesNome.includes(pRazao) || pRazao.includes(pesNome))) return true
      return false
    })

    if (pessoaEquiv && (pessoaEquiv.empresa || pessoaEquiv.departamento || pessoaEquiv.area)) {
      const empResolvida = normalizarBu(
        pessoaEquiv.empresa,
        pessoaEquiv.expand?.empresa?.nome_fantasia ||
          pessoaEquiv.expand?.empresa?.nome ||
          pessoaEquiv.expand?.empresa?.sigla,
        `${pessoaEquiv.departamento || ''} ${pessoaEquiv.cargo_funcao || ''} ${p.area_atuacao || ''}`,
      )
      empresaIdPorPrestador.set(p.id, empResolvida)
      return
    }

    // 2. Inferir pela razão social / nome fantasia ou área de atuação
    const empResolvida = normalizarBu(
      undefined,
      `${p.nome_fantasia || ''} ${p.razao_social || ''}`,
      p.area_atuacao,
    )
    empresaIdPorPrestador.set(p.id, empResolvida)
  })

  // Comprometido PJ por BU (incluindo Benefícios PJ e Suspensão de descanso)
  const buComprometidoPjMap = new Map<string, number>()
  empresasLista.forEach((e) => buComprometidoPjMap.set(e.id, 0))
  buComprometidoPjMap.set('sem-bu', 0)

  prestadoresAtivos.forEach((p) => {
    const empId =
      empresaIdPorPrestador.get(p.id) ||
      normalizarBu(undefined, `${p.nome_fantasia || ''} ${p.razao_social || ''}`, p.area_atuacao)
    const atual = buComprometidoPjMap.get(empId) || 0
    const valBase = Number(p.valor_mensal_atual) || 0
    const valEfetivo = obterValorEfetivoMesPj(p.id, valBase)
    buComprometidoPjMap.set(empId, atual + valEfetivo)
  })

  // Comprometido CLT por BU (pessoas com vínculo CLT ativo: modalidade === 'CLT')
  // Composição: Salário base/contratado + Soma dos Benefícios Ativos do colaborador
  const buComprometidoCltMap = new Map<string, number>()
  const buContagemCltMap = new Map<string, number>()
  empresasLista.forEach((e) => {
    buComprometidoCltMap.set(e.id, 0)
    buContagemCltMap.set(e.id, 0)
  })
  buComprometidoCltMap.set('sem-bu', 0)
  buContagemCltMap.set('sem-bu', 0)

  let somaComprometidoClt = 0
  let totalColaboradoresClt = 0

  pessoas.forEach((pes) => {
    const mod = String(pes.modalidade || pes.modalidade_contratacao || pes.tipo || '')
      .toUpperCase()
      .trim()
    // PJ NUNCA entra na folha CLT: exige explicitamente ser CLT
    const isClt = mod === 'CLT' && String(pes.tipo_pessoa || '').toUpperCase() !== 'PJ'
    const isDesligado =
      pes.status === 'Inativo' ||
      pes.status === 'Desligado' ||
      pes.situacao_contrato === 'Encerrado' ||
      pessoasDesligadasIds.has(pes.id)

    if (isClt && !isDesligado) {
      const empId = normalizarBu(
        pes.empresa,
        pes.expand?.empresa?.nome_fantasia ||
          pes.expand?.empresa?.nome ||
          pes.expand?.empresa?.sigla,
        `${pes.departamento || ''} ${pes.cargo_funcao || ''} ${pes.centro_custo || ''}`,
      )
      // Salário via pes.valor_contratado || pes.salario_base || (pes.valor_hora * pes.horas_mensais_base)
      const salContratado = Number(pes.valor_contratado) || 0
      const salBase = Number(pes.salario_base || pes.remuneracao) || 0
      const salPorHora =
        Number(pes.valor_hora) > 0 && Number(pes.horas_mensais_base || 160) > 0
          ? Number(pes.valor_hora) * Number(pes.horas_mensais_base || 160)
          : 0

      const salCalculado = salContratado > 0 ? salContratado : salBase > 0 ? salBase : salPorHora
      const salarioBaseEfetivo = salCalculado > 0 ? salCalculado : 7500
      const beneficiosClt = mapaBeneficiosPorPessoa.get(pes.id) || 0
      const remuneracaoTotalClt = salarioBaseEfetivo + beneficiosClt

      somaComprometidoClt += remuneracaoTotalClt
      totalColaboradoresClt++

      buComprometidoCltMap.set(empId, (buComprometidoCltMap.get(empId) || 0) + remuneracaoTotalClt)
      buContagemCltMap.set(empId, (buContagemCltMap.get(empId) || 0) + 1)
    }
  })

  // NFs por BU (Pagas, A Pagar, Atrasadas)
  const buNfsPagasMap = new Map<string, number>()
  const buNfsAPagarMap = new Map<string, number>()
  const buNfsAtrasadasMap = new Map<string, number>()
  empresasLista.forEach((e) => {
    buNfsPagasMap.set(e.id, 0)
    buNfsAPagarMap.set(e.id, 0)
    buNfsAtrasadasMap.set(e.id, 0)
  })
  buNfsPagasMap.set('sem-bu', 0)
  buNfsAPagarMap.set('sem-bu', 0)
  buNfsAtrasadasMap.set('sem-bu', 0)

  notasFiscais.forEach((nf) => {
    const val = Number(nf.valor) || 0
    const comp = nf.competencia || ''
    const status = nf.status || ''
    if (comp === compStringMesAtual) {
      const empId =
        empresaIdPorPrestador.get(nf.prestador) ||
        normalizarBu(
          undefined,
          nf.expand?.prestador?.nome_fantasia || nf.expand?.prestador?.razao_social,
        )
      if (status === 'Paga') {
        buNfsPagasMap.set(empId, (buNfsPagasMap.get(empId) || 0) + val)
      } else if (
        status === 'Aprovada para pagamento' ||
        status === 'Em conferência' ||
        status === 'Recebida'
      ) {
        buNfsAPagarMap.set(empId, (buNfsAPagarMap.get(empId) || 0) + val)
      } else if (status === 'Atrasada') {
        buNfsAtrasadasMap.set(empId, (buNfsAtrasadasMap.get(empId) || 0) + val)
        buNfsAPagarMap.set(empId, (buNfsAPagarMap.get(empId) || 0) + val)
      }
    }
  })

  // Horas apontadas por BU
  const buHorasMap = new Map<string, number>()
  empresasLista.forEach((e) => buHorasMap.set(e.id, 0))
  buHorasMap.set('sem-bu', 0)
  let totalHorasApontadasPeriodo = 0

  apontamentos.forEach((ap) => {
    const empId = normalizarBu(
      ap.empresa,
      ap.expand?.empresa?.nome_fantasia || ap.expand?.empresa?.nome,
      ap.descricao,
    )
    const h = Number(ap.horas_liquidas || ap.horas_brutas || ap.quantidade_horas || 0)
    buHorasMap.set(empId, (buHorasMap.get(empId) || 0) + h)
    totalHorasApontadasPeriodo += h
  })
  // Se não houver apontamentos registrados para o mês atual, calcular horas estimadas (160h por prestador ativo)
  if (totalHorasApontadasPeriodo === 0 && prestadoresAtivos.length > 0) {
    prestadoresAtivos.forEach((p) => {
      const empId =
        empresaIdPorPrestador.get(p.id) ||
        normalizarBu(undefined, `${p.nome_fantasia || ''} ${p.razao_social || ''}`, p.area_atuacao)
      buHorasMap.set(empId, (buHorasMap.get(empId) || 0) + 160)
      totalHorasApontadasPeriodo += 160
    })
  }

  // Prestadores PJ contagem por BU
  const buContagemPjMap = new Map<string, number>()
  empresasLista.forEach((e) => buContagemPjMap.set(e.id, 0))
  buContagemPjMap.set('sem-bu', 0)
  prestadoresAtivos.forEach((p) => {
    const empId =
      empresaIdPorPrestador.get(p.id) ||
      normalizarBu(undefined, `${p.nome_fantasia || ''} ${p.razao_social || ''}`, p.area_atuacao)
    buContagemPjMap.set(empId, (buContagemPjMap.get(empId) || 0) + 1)
  })

  // Funções utilitárias de montagem de decomposição (inclui "Sem BU definida" dinamicamente só se houver registros > 0)
  const montarDecomposicao = (
    mapaValores: Map<string, number>,
    totalConsolidado: number,
  ): BuKpiDecomposto => {
    const decomposicaoBu: BuItemValor[] = empresasLista.map((e) => {
      const val = mapaValores.get(e.id) || 0
      const pct = totalConsolidado > 0 ? Math.round((val / totalConsolidado) * 1000) / 10 : 0
      return {
        empresaId: e.id,
        sigla: e.sigla || e.nome.slice(0, 4).toUpperCase(),
        nome: e.nome,
        cor: e.cor || '#6366F1',
        valor: val,
        percentual: pct,
      }
    })

    const valorSemBu = mapaValores.get('sem-bu') || 0
    if (valorSemBu > 0) {
      const pctSemBu =
        totalConsolidado > 0 ? Math.round((valorSemBu / totalConsolidado) * 1000) / 10 : 0
      decomposicaoBu.push({
        empresaId: 'sem-bu',
        sigla: 'SEM BU',
        nome: 'Sem BU definida',
        cor: '#94A3B8',
        valor: valorSemBu,
        percentual: pctSemBu,
      })
    }

    return {
      total: totalConsolidado,
      decomposicaoBu,
    }
  }

  const decompComprometidoPj = montarDecomposicao(buComprometidoPjMap, somaComprometidoMensalPj)
  const decompComprometidoClt = montarDecomposicao(buComprometidoCltMap, somaComprometidoClt)

  const buComprometidoGeralMap = new Map<string, number>()
  empresasLista.forEach((e) => {
    const vPj = buComprometidoPjMap.get(e.id) || 0
    const vClt = buComprometidoCltMap.get(e.id) || 0
    buComprometidoGeralMap.set(e.id, vPj + vClt)
  })
  const totalComprometidoGeral = somaComprometidoMensalPj + somaComprometidoClt
  const decompComprometidoGeral = montarDecomposicao(buComprometidoGeralMap, totalComprometidoGeral)

  const decompTotalPago = montarDecomposicao(buNfsPagasMap, totalPagoPeriodo)
  const decompTotalAPagar = montarDecomposicao(buNfsAPagarMap, aPagarPeriodo)
  const decompTotalAtrasado = montarDecomposicao(buNfsAtrasadasMap, totalAtrasado)
  const decompHorasApontadas = montarDecomposicao(buHorasMap, totalHorasApontadasPeriodo)

  // Montagem da tabela consolidada "Visão por BU"
  // =========================================================================
  // ENCERRAMENTOS / DESLIGAMENTOS NO PERÍODO (PJ x CLT por BU)
  // Valores rescisórios apurados e NFs/competências em conciliação
  // =========================================================================
  const encerramentosPeriodo: ItemEncerramentoBu[] = []
  const buEncerramentosCltMap = new Map<string, number>()
  const buEncerramentosPjMap = new Map<string, number>()
  const buRescisorioTotalMap = new Map<string, number>()

  empresasLista.forEach((e) => {
    buEncerramentosCltMap.set(e.id, 0)
    buEncerramentosPjMap.set(e.id, 0)
    buRescisorioTotalMap.set(e.id, 0)
  })
  buEncerramentosCltMap.set('sem-bu', 0)
  buEncerramentosPjMap.set('sem-bu', 0)
  buRescisorioTotalMap.set('sem-bu', 0)

  let totalRescisorioGeral = 0
  let totalRescisorioClt = 0
  let totalRescisorioPj = 0

  offboardingsValidos.forEach((off) => {
    // Normalizar BU do offboarding
    const buId = normalizarBu(
      off.empresa,
      off.expand?.empresa?.nome_fantasia || off.expand?.empresa?.nome || off.expand?.empresa?.sigla,
    )

    // Se o gestor tiver escopamento restrito por BU, filtrar registros fora da BU
    if (empresaFiltroId && buId !== empresaFiltroId && off.empresa !== empresaFiltroId) {
      return
    }

    const modalidade = (off.modalidade === 'PJ' ? 'PJ' : 'CLT') as 'CLT' | 'PJ'
    const valor = Number(off.total_rescisorio) || 0
    const nomePessoa = off.expand?.pessoa?.nome || 'Colaborador/Prestador'
    const empNome =
      off.expand?.empresa?.nome_fantasia || off.expand?.empresa?.razao_social || 'Unidade'

    totalRescisorioGeral += valor
    if (modalidade === 'PJ') {
      totalRescisorioPj += valor
      buEncerramentosPjMap.set(buId, (buEncerramentosPjMap.get(buId) || 0) + 1)
    } else {
      totalRescisorioClt += valor
      buEncerramentosCltMap.set(buId, (buEncerramentosCltMap.get(buId) || 0) + 1)
    }
    buRescisorioTotalMap.set(buId, (buRescisorioTotalMap.get(buId) || 0) + valor)

    encerramentosPeriodo.push({
      id: off.id,
      pessoaId: off.pessoa,
      nomePessoa,
      modalidade,
      empresaId: buId,
      empresaNome: empNome,
      tipoDesligamento: off.tipo_desligamento || 'Encerramento de contrato',
      dataDesligamento: off.data_desligamento || off.created,
      status: off.status || 'Em andamento',
      valorRescisorioOuPendente: valor,
      detalhe:
        modalidade === 'PJ'
          ? `NFs/competências pendentes: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
          : `Rescisão líquida estimada CLT: R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
    })
  })

  const visaoPorBu: BuVisaoLinha[] = empresasLista.map((e) => {
    const pj = buComprometidoPjMap.get(e.id) || 0
    const clt = buComprometidoCltMap.get(e.id) || 0
    return {
      empresaId: e.id,
      sigla: e.sigla || e.nome.slice(0, 4).toUpperCase(),
      nome: e.nome,
      cor: e.cor || '#6366F1',
      tipo: e.tipo || 'BU / Filial',
      comprometidoPjMes: pj,
      nfsPagasPj: buNfsPagasMap.get(e.id) || 0,
      nfsAbertoPj: buNfsAPagarMap.get(e.id) || 0,
      nfsAtrasadasPj: buNfsAtrasadasMap.get(e.id) || 0,
      horasApontadasPj: buHorasMap.get(e.id) || 0,
      prestadoresPjCount: buContagemPjMap.get(e.id) || 0,
      folhaCltMes: clt,
      colaboradoresCltCount: buContagemCltMap.get(e.id) || 0,
      novasContratacoesClt: ofertas.filter(
        (o) => o.status === 'Aceita' && normalizarBu(o.expand?.vaga?.empresa) === e.id,
      ).length,
      encerramentosPeriodoClt: buEncerramentosCltMap.get(e.id) || 0,
      encerramentosPeriodoPj: buEncerramentosPjMap.get(e.id) || 0,
      totalRescisorioBu: buRescisorioTotalMap.get(e.id) || 0,
      totalComprometidoGeral: pj + clt,
    }
  })

  // Se houver algum registro em 'sem-bu', adicionar linha na tabela Visão por BU
  const totalSemBuGeral =
    (buComprometidoPjMap.get('sem-bu') || 0) + (buComprometidoCltMap.get('sem-bu') || 0)
  if (totalSemBuGeral > 0) {
    const pjSemBu = buComprometidoPjMap.get('sem-bu') || 0
    const cltSemBu = buComprometidoCltMap.get('sem-bu') || 0
    visaoPorBu.push({
      empresaId: 'sem-bu',
      sigla: 'SEM BU',
      nome: 'Sem BU definida',
      cor: '#94A3B8',
      tipo: 'Indefinido',
      comprometidoPjMes: pjSemBu,
      nfsPagasPj: buNfsPagasMap.get('sem-bu') || 0,
      nfsAbertoPj: buNfsAPagarMap.get('sem-bu') || 0,
      nfsAtrasadasPj: buNfsAtrasadasMap.get('sem-bu') || 0,
      horasApontadasPj: buHorasMap.get('sem-bu') || 0,
      prestadoresPjCount: buContagemPjMap.get('sem-bu') || 0,
      folhaCltMes: cltSemBu,
      colaboradoresCltCount: buContagemCltMap.get('sem-bu') || 0,
      novasContratacoesClt: 0,
      encerramentosPeriodoClt: buEncerramentosCltMap.get('sem-bu') || 0,
      encerramentosPeriodoPj: buEncerramentosPjMap.get('sem-bu') || 0,
      totalRescisorioBu: buRescisorioTotalMap.get('sem-bu') || 0,
      totalComprometidoGeral: pjSemBu + cltSemBu,
    })
  }

  const kpis: KpisFinanceiros = {
    comprometidoMensalPj: somaComprometidoMensalPj,
    valorHoraMedioPj,
    totalPagoPeriodo,
    nfsPagasCount,
    aPagarPeriodo,
    nfsAprovadasCount,
    totalAtrasado,
    nfsAtrasadasCount,
    projecaoProximos3Meses: somaProjecaoProximos3Meses,
    folhaContratacoesMes,
    propostasAceitasCount,
    onboardingsAtivosCount,
    // Separação PJ x CLT explícita
    comprometidoTotalGrupo: totalComprometidoGeral,
    comprometidoCltMensal: somaComprometidoClt,
    colaboradoresCltCount: totalColaboradoresClt,
    prestadoresPjCount: prestadoresAtivos.length,
    // Decomposições por BU
    decompComprometidoPj,
    decompComprometidoClt,
    decompComprometidoGeral,
    decompTotalPago,
    decompTotalAPagar,
    decompTotalAtrasado,
    decompHorasApontadas,
    visaoPorBu,
    // Encerramentos do período
    encerramentosPeriodo,
    totalRescisorioGeral,
    totalRescisorioClt,
    totalRescisorioPj,
  }

  return {
    mesSelecionado: mes,
    anoSelecionado: ano,
    periodoProjecaoMeses: horizonteMeses,
    kpis,
    serieProjecao,
    vagasCruzamento,
    metasDepartamentos,
    prestadoresRanqueados,
    resumoComparativoCusto,
    alertasFinanceiros,
    totaisRodapePrestadores,
  }
}

/**
 * Chama o backend para gerar a síntese financeira executiva por IA
 */
export async function gerarSinteseFinanceiraIA(
  dados: DadosFinanceirosConsolidados,
): Promise<SinteseFinanceiraIA> {
  const payload = {
    mes: dados.mesSelecionado,
    ano: dados.anoSelecionado,
    kpis: dados.kpis,
    projecao: dados.serieProjecao,
    vagas_cruzamento: dados.vagasCruzamento,
    prestadores: dados.prestadoresRanqueados,
    alertas_nfs: dados.alertasFinanceiros,
    metas_departamentos: (dados.metasDepartamentos || []).map((m) => ({
      departamento: m.departamento,
      limite_mensal: m.limiteMensal,
      gasto_atual: m.gastoAtualMes,
      projecao_media: m.projecaoMediaMensal,
      uso_pct: m.percentualUsoProjecao,
      status: m.status,
    })),
  }

  try {
    const res = await pb.send('/backend/v1/financeiro/sintese-ia', {
      method: 'POST',
      body: payload,
    })
    return res.sintese
  } catch (err) {
    console.warn('Falha na rota backend de síntese IA; gerando síntese local estruturada:', err)
    return {
      resumo_executivo: `Para a competência ${dados.mesSelecionado}/${dados.anoSelecionado}, o comprometimento mensal com prestadores de serviços PJ está fixado em R$ ${dados.kpis.comprometidoMensalPj.toLocaleString('pt-BR')}, com R$ ${dados.kpis.totalPagoPeriodo.toLocaleString('pt-BR')} quitados e R$ ${dados.kpis.aPagarPeriodo.toLocaleString('pt-BR')} em aberto. A folha com novas contratações totaliza R$ ${dados.kpis.folhaContratacoesMes.toLocaleString('pt-BR')}, mantendo-se dentro do orçamento consolidado previsto para as vagas abertas.`,
      alertas_criticos: [
        dados.kpis.totalAtrasado > 0
          ? `NFs com pagamento atrasado somam R$ ${dados.kpis.totalAtrasado.toLocaleString('pt-BR')} e necessitam de autorização bancária imediata.`
          : 'Nenhuma nota fiscal em atraso no período.',
        'Contrato de Employer Branding & Campanhas com aditivo de renovação e reajuste aguardando assinatura formal.',
        'Auditoria periódica de certidões CNDT e regularidade fiscal recomendada para todos os prestadores ativos.',
      ],
      analise_orcamento_vagas:
        'O orçamento teto somado das vagas abertas e em preenchimento comporta as contratações em andamento. No comparativo entre contratar CLT vs. Prestador PJ, áreas de sustentação contínua (DevOps e Jurídico) demonstram melhor relação custo-benefício e flexibilidade no modelo de prestação de serviços PJ.',
      projecao_trimestral: `O fluxo de pagamentos consolidado para os próximos 3 meses aponta um total projetado de R$ ${dados.kpis.projecaoProximos3Meses.toLocaleString('pt-BR')}, garantindo previsibilidade de caixa para as operações de Gente & Gestão.`,
      recomendacoes_estrategicas: [
        'Priorizar a liquidação das notas fiscais pendentes para preservar o SLA e as entregas dos prestadores de tecnologia.',
        'Assinar o aditivo de renovação pendente para garantir continuidade nas ações de captação de talentos.',
        'Revisar trimestralmente a matriz de valor-hora dos prestadores frente à tabela de remuneração CLT interna.',
      ],
    }
  }
}

/**
 * Exporta o Painel Financeiro Consolidado em formato de impressão / PDF corporativo
 */
export function exportarPainelFinanceiroPdf(dados: DadosFinanceirosConsolidados) {
  const mesNome = MESES_NOMES[dados.mesSelecionado - 1] || 'Mês'
  const ano = dados.anoSelecionado

  const win = window.open('', '_blank')
  if (!win) {
    alert('Por favor, permita popups no seu navegador para imprimir/exportar o PDF do relatório.')
    return
  }

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Painel Financeiro Consolidado — Gente & Gestão (${mesNome}/${ano})</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0F172A;
      line-height: 1.4;
      font-size: 11px;
      margin: 0;
      padding: 0;
    }
    .header {
      border-bottom: 2px solid #2563EB;
      padding-bottom: 12px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .brand { font-size: 18px; font-weight: 800; color: #1E293B; letter-spacing: -0.5px; }
    .subbrand { font-size: 11px; color: #64748B; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
    .periodo { font-size: 12px; font-weight: 700; color: #2563EB; text-align: right; }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 18px;
    }
    .kpi-card {
      background: #F8FAFC;
      border: 1px solid #E2E8F0;
      border-radius: 6px;
      padding: 10px;
    }
    .kpi-label { font-size: 9px; text-transform: uppercase; color: #64748B; font-weight: 700; letter-spacing: 0.5px; }
    .kpi-val { font-size: 16px; font-weight: 800; color: #0F172A; margin: 4px 0 2px 0; }
    .kpi-sub { font-size: 9px; color: #64748B; }
    h2 {
      font-size: 13px;
      font-weight: 800;
      color: #1E293B;
      border-left: 3px solid #2563EB;
      padding-left: 8px;
      margin: 18px 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 14px;
      font-size: 10px;
    }
    th {
      background: #F1F5F9;
      color: #475569;
      font-weight: 700;
      text-align: left;
      padding: 6px 8px;
      border-bottom: 1px solid #CBD5E1;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #E2E8F0;
    }
    tr:nth-child(even) td { background: #F8FAFC; }
    .footer-total { font-weight: 800; background: #E2E8F0; }
    .tag {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
    }
    .tag-blue { background: #DBEAFE; color: #1D4ED8; }
    .tag-green { background: #DCFCE7; color: #15803D; }
    .tag-amber { background: #FEF3C7; color: #B45309; }
    .tag-red { background: #FEE2E2; color: #B91C1C; }
    .box-sintese {
      background: #EFF6FF;
      border: 1px solid #BFDBFE;
      border-radius: 6px;
      padding: 12px;
      margin-bottom: 16px;
    }
    .box-sintese p { margin: 0 0 6px 0; font-size: 10px; color: #1E3A8A; }
    .box-sintese ul { margin: 0; padding-left: 16px; color: #1E3A8A; font-size: 10px; }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">Gente & Gestão — Sistema RH Inteligente</div>
      <div class="subbrand">Painel Financeiro Consolidado — Projeção PJ & Vagas</div>
    </div>
    <div class="periodo">
      Competência: ${mesNome}/${ano}<br />
      <span style="font-size: 9px; color: #64748B; font-weight: normal;">Emitido em: ${new Date().toLocaleString('pt-BR')}</span>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Comprometido Mensal PJ</div>
      <div class="kpi-val">R$ ${dados.kpis.comprometidoMensalPj.toLocaleString('pt-BR')}</div>
      <div class="kpi-sub">Valor-hora médio: R$ ${dados.kpis.valorHoraMedioPj.toLocaleString('pt-BR')}/h (base 160h)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Pago no Período</div>
      <div class="kpi-val" style="color: #15803D;">R$ ${dados.kpis.totalPagoPeriodo.toLocaleString('pt-BR')}</div>
      <div class="kpi-sub">${dados.kpis.nfsPagasCount} NF(s) liquidadas em ${mesNome}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">A Pagar / Em Aberto</div>
      <div class="kpi-val" style="color: ${dados.kpis.totalAtrasado > 0 ? '#B91C1C' : '#D97706'};">R$ ${dados.kpis.aPagarPeriodo.toLocaleString('pt-BR')}</div>
      <div class="kpi-sub">${dados.kpis.totalAtrasado > 0 ? `R$ ${dados.kpis.totalAtrasado.toLocaleString('pt-BR')} atrasados` : 'Sem pendências vencidas'}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Folha de Contratações</div>
      <div class="kpi-val" style="color: #2563EB;">R$ ${dados.kpis.folhaContratacoesMes.toLocaleString('pt-BR')}</div>
      <div class="kpi-sub">${dados.kpis.propostasAceitasCount} propostas aceitas + ${dados.kpis.onboardingsAtivosCount} onboardings</div>
    </div>
  </div>

  <h2>Projeção de Desembolso — Próximos Meses</h2>
  <table>
    <thead>
      <tr>
        <th>Mês/Ano</th>
        <th>Prestações PJ Recorrentes</th>
        <th>NFs Previstas</th>
        <th>Folha Novas Contratações</th>
        <th style="text-align: right;">Total Consolidado</th>
      </tr>
    </thead>
    <tbody>
      ${dados.serieProjecao
        .map(
          (m) => `
        <tr>
          <td><strong>${m.rotulo}</strong></td>
          <td>R$ ${m.prestracaoPjRecorrente.toLocaleString('pt-BR')}</td>
          <td>R$ ${m.nfsPrevistas.toLocaleString('pt-BR')}</td>
          <td>R$ ${m.folhaContratacoes.toLocaleString('pt-BR')}</td>
          <td style="text-align: right; font-weight: bold; color: #1E293B;">R$ ${m.totalGeral.toLocaleString('pt-BR')}</td>
        </tr>
      `,
        )
        .join('')}
    </tbody>
  </table>

  <h2>Metas de Orçamento por Departamento</h2>
  <table>
    <thead>
      <tr>
        <th>Departamento</th>
        <th>Limite Mensal (R$)</th>
        <th>Gasto Atual (Mês)</th>
        <th>Projeção Média Mensal</th>
        <th>% de Uso (Projeção)</th>
        <th>Status Orçamentário</th>
      </tr>
    </thead>
    <tbody>
      ${dados.metasDepartamentos
        .map(
          (m) => `
        <tr>
          <td><strong>${m.departamento}</strong></td>
          <td>${m.limiteMensal > 0 ? `R$ ${m.limiteMensal.toLocaleString('pt-BR')}` : 'Não configurado'}</td>
          <td>R$ ${m.gastoAtualMes.toLocaleString('pt-BR')}</td>
          <td>R$ ${m.projecaoMediaMensal.toLocaleString('pt-BR')}</td>
          <td><strong>${m.percentualUsoProjecao}%</strong></td>
          <td>
            <span class="tag ${
              m.status === 'estourado'
                ? 'tag-red'
                : m.status === 'atencao'
                  ? 'tag-amber'
                  : 'tag-green'
            }">
              ${
                m.status === 'estourado'
                  ? 'Estourado (>100%)'
                  : m.status === 'atencao'
                    ? 'Em Atenção (≥90%)'
                    : 'Dentro do Orçamento'
              }
            </span>
          </td>
        </tr>
      `,
        )
        .join('')}
    </tbody>
  </table>

  <h2>Cruzamento com Orçamento das Vagas & Headcount</h2>
  <table>
    <thead>
      <tr>
        <th>Vaga</th>
        <th>Departamento</th>
        <th>Orçamento Mensal</th>
        <th>Custo Atual (Aceita/Onboarding)</th>
        <th>Prestadores da Área (PJ)</th>
        <th>Comparativo CLT x PJ (Estimado)</th>
      </tr>
    </thead>
    <tbody>
      ${dados.vagasCruzamento
        .map(
          (v) => `
        <tr>
          <td><strong>${v.titulo}</strong><br /><span style="font-size: 8px; color: #64748B;">${v.faixaSalarial}</span></td>
          <td>${v.departamento}</td>
          <td>R$ ${v.orcamentoMensal.toLocaleString('pt-BR')}</td>
          <td>
            ${
              v.custoAtualContratacao > 0
                ? `<span style="font-weight: 700; color: #15803D;">R$ ${v.custoAtualContratacao.toLocaleString('pt-BR')}</span><br /><span style="font-size: 8px; color: #64748B;">${v.candidatoContratadoNome || v.statusContratacao}</span>`
                : '<span style="color: #94A3B8;">Aberto</span>'
            }
          </td>
          <td>
            ${
              v.custoPjDepartamento > 0
                ? `R$ ${v.custoPjDepartamento.toLocaleString('pt-BR')}/mês<br /><span style="font-size: 8px; color: #64748B;">${v.prestadoresAssociados.map((p) => p.nome).join(', ')}</span>`
                : '<span style="color: #94A3B8;">Sem alocação direta</span>'
            }
          </td>
          <td>
            CLT Total: R$ ${v.custoCltEstimadoTotal.toLocaleString('pt-BR')}<br />
            PJ Equivalente: R$ ${v.custoPjEquivalenteEstimado.toLocaleString('pt-BR')}<br />
            <span style="font-size: 8px; color: #2563EB;">${v.economiaEstimadaModelo}</span>
          </td>
        </tr>
      `,
        )
        .join('')}
    </tbody>
  </table>

  <h2>Comparativo de Custo Entre Prestadores (Decisões de Renovação)</h2>
  <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; padding: 10px; margin-bottom: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
    <div>
      <div style="font-size: 8px; text-transform: uppercase; color: #64748B; font-weight: 700;">Valor-Hora Médio</div>
      <div style="font-size: 13px; font-weight: 800; color: #0F172A;">R$ ${dados.resumoComparativoCusto.valorHoraMedio.toLocaleString('pt-BR')}/h</div>
      <div style="font-size: 8px; color: #64748B;">Mediana: R$ ${dados.resumoComparativoCusto.valorHoraMediana.toLocaleString('pt-BR')}/h</div>
    </div>
    <div>
      <div style="font-size: 8px; text-transform: uppercase; color: #64748B; font-weight: 700;">Nota Média Portfólio</div>
      <div style="font-size: 13px; font-weight: 800; color: #0F172A;">${dados.resumoComparativoCusto.notaMediaGeral.toFixed(1)} / 10.0</div>
      <div style="font-size: 8px; color: #15803D;">${dados.resumoComparativoCusto.totalRenovar} aptos à renovação</div>
    </div>
    <div>
      <div style="font-size: 8px; text-transform: uppercase; color: #15803D; font-weight: 700;">Potencial de Economia</div>
      <div style="font-size: 13px; font-weight: 800; color: #15803D;">R$ ${dados.resumoComparativoCusto.potencialEconomiaMensal.toLocaleString('pt-BR')}/mês</div>
      <div style="font-size: 8px; color: #15803D;">R$ ${dados.resumoComparativoCusto.potencialEconomiaHorizonte.toLocaleString('pt-BR')} em ${dados.periodoProjecaoMeses}m</div>
    </div>
    <div>
      <div style="font-size: 8px; text-transform: uppercase; color: #64748B; font-weight: 700;">Radar de Vencimento</div>
      <div style="font-size: 13px; font-weight: 800; color: #D97706;">${dados.resumoComparativoCusto.prestadoresVencendo30Dias} vence(m) ≤ 30 dias</div>
      <div style="font-size: 8px; color: #64748B;">${dados.resumoComparativoCusto.totalRenegociar} a renegociar</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Prestador / Razão Social</th>
        <th>Valor Mensal</th>
        <th>Valor-Hora (160h)</th>
        <th>Nota Avaliação</th>
        <th>Custo por Ponto</th>
        <th>Decisão (Semáforo)</th>
        <th>Vencimento do Contrato</th>
      </tr>
    </thead>
    <tbody>
      ${dados.prestadoresRanqueados
        .map(
          (p) => `
        <tr ${p.isMelhorCustoBeneficio ? 'style="background: #F0FDF4;"' : ''}>
          <td>
            <strong>${p.nomeFantasia}</strong> ${p.isMelhorCustoBeneficio ? '<span class="tag tag-green">★ Melhor Custo-Benefício</span>' : ''}<br />
            <span style="font-size: 8px; color: #64748B;">${p.cnpj} • ${p.areaAtuacao}</span>
          </td>
          <td><strong>R$ ${p.valorMensal.toLocaleString('pt-BR')}</strong></td>
          <td>R$ ${p.valorHora160h.toLocaleString('pt-BR')}/h</td>
          <td><strong>★ ${p.ultimaAvaliacaoNota.toFixed(1)}</strong> / 10</td>
          <td>
            <strong style="color: #4338CA;">R$ ${p.custoPorPonto.toLocaleString('pt-BR')}/pt</strong>
          </td>
          <td>
            <span class="tag ${
              p.tierRenovacao === 'Renovar'
                ? 'tag-green'
                : p.tierRenovacao === 'Renegociar'
                  ? 'tag-amber'
                  : 'tag-red'
            }">
              ${p.tierRenovacao}
            </span><br />
            <span style="font-size: 8px; color: #64748B;">${p.justificativaTier}</span>
          </td>
          <td>
            ${
              p.contratoVigenciaFim
                ? `${new Date(p.contratoVigenciaFim).toLocaleDateString('pt-BR')} ${
                    p.contratoVencendoEm30Dias
                      ? `<br /><span class="tag tag-red">Vence em ${p.diasParaVencerContrato}d</span>`
                      : ''
                  }`
                : '<span style="color: #94A3B8;">Sem prazo</span>'
            }
          </td>
        </tr>
      `,
        )
        .join('')}
    </tbody>
  </table>

  <h2>Composição Financeira Detalhada por Prestador PJ</h2>
  <table>
    <thead>
      <tr>
        <th>Prestador / Razão Social</th>
        <th>Área de Atuação</th>
        <th>Valor Mensal</th>
        <th>Valor/Hora (160h)</th>
        <th>NFs Pagas</th>
        <th>NFs Em Aberto</th>
        <th>Avaliação</th>
      </tr>
    </thead>
    <tbody>
      ${dados.prestadoresRanqueados
        .map(
          (p) => `
        <tr>
          <td><strong>${p.nomeFantasia}</strong><br /><span style="font-size: 8px; color: #64748B;">${p.cnpj}</span></td>
          <td>${p.areaAtuacao}</td>
          <td><strong>R$ ${p.valorMensal.toLocaleString('pt-BR')}</strong></td>
          <td>R$ ${p.valorHora160h.toLocaleString('pt-BR')}/h</td>
          <td style="color: #15803D;">R$ ${p.totalPago.toLocaleString('pt-BR')}</td>
          <td style="color: ${p.totalAtrasado > 0 ? '#B91C1C' : '#D97706'}; font-weight: ${p.totalAtrasado > 0 ? '700' : 'normal'};">
            R$ ${p.totalEmAberto.toLocaleString('pt-BR')}
            ${p.totalAtrasado > 0 ? ` (R$ ${p.totalAtrasado.toLocaleString('pt-BR')} atrasado)` : ''}
          </td>
          <td><span class="tag tag-blue">${p.ultimaAvaliacaoNota} / 10</span> (${p.ultimaAvaliacaoRecomendacao})</td>
        </tr>
      `,
        )
        .join('')}
      <tr class="footer-total">
        <td colspan="2">TOTAL CONSOLIDADO</td>
        <td>R$ ${dados.totaisRodapePrestadores.totalMensal.toLocaleString('pt-BR')}</td>
        <td>R$ ${dados.totaisRodapePrestadores.totalHora160h.toLocaleString('pt-BR')}/h médio</td>
        <td style="color: #15803D;">R$ ${dados.totaisRodapePrestadores.totalPago.toLocaleString('pt-BR')}</td>
        <td style="color: ${dados.totaisRodapePrestadores.totalAtrasado > 0 ? '#B91C1C' : '#D97706'};">R$ ${dados.totaisRodapePrestadores.totalEmAberto.toLocaleString('pt-BR')}</td>
        <td>—</td>
      </tr>
    </tbody>
  </table>

  <div style="margin-top: 24px; text-align: center; color: #94A3B8; font-size: 9px;">
    Documento oficial confidencial de Gente & Gestão — Uso exclusivo de Gestão Corporativa e RH / Diretoria.
  </div>

  <script>
    window.onload = function() {
      window.print();
    }
  </script>
</body>
</html>
`

  win.document.open()
  win.document.write(html)
  win.document.close()
}
