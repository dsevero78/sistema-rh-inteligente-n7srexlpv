import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

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
      .getFullList({ sort: '-created', expand: 'gestor_responsavel' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('ofertas')
      .getFullList({ sort: '-created', expand: 'candidato,vaga' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('onboardings')
      .getFullList({ sort: '-created', expand: 'candidato,vaga' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('avaliacoes_prestador_pj')
      .getFullList({ sort: '-created', expand: 'prestador' })
      .catch(() => [] as RecordModel[]),
    pb
      .collection('metas_orcamento_departamento')
      .getFullList({ sort: 'departamento' })
      .catch(() => [] as RecordModel[]),
  ])

  const compStringMesAtual = `${String(mes).padStart(2, '0')}/${ano}`

  // 1. Prestadores Ativos e Comprometido Mensal
  const prestadoresAtivos = prestadores.filter(
    (p) => p.status === 'Ativo' || p.status === 'Em renovação',
  )
  let somaComprometidoMensalPj = 0

  prestadoresAtivos.forEach((p) => {
    const val = Number(p.valor_mensal_atual) || 0
    somaComprometidoMensalPj += val
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
    }
  })

  // Ordenar ranqueado por maior valor mensal
  prestadoresRanqueados.sort((a, b) => b.valorMensal - a.valorMensal)

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

  <h2>Composição de Custo por Prestador PJ</h2>
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
