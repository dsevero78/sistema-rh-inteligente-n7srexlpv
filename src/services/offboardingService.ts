import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import { notificacoesRhService } from '@/services/notificacoesRh'

export type ModalidadeOffboarding = 'CLT' | 'PJ'

export type TipoDesligamentoClt =
  | 'Pedido de demissão'
  | 'Demissão sem justa causa'
  | 'Demissão por justa causa'
  | 'Acordo mútuo (Art. 484-A CLT)'
  | 'Término de contrato de experiência'

export type TipoDesligamentoPj =
  | 'Término de contrato PJ'
  | 'Rescisão antecipada PJ'
  | 'Não renovação PJ'

export type TipoDesligamento = TipoDesligamentoClt | TipoDesligamentoPj

export type TipoAvisoPrevio = 'Trabalhado' | 'Indenizado' | 'Dispensado' | 'Não aplicável'

export type StatusOffboarding =
  | 'Em andamento'
  | 'Aguardando homologação'
  | 'Concluído'
  | 'Cancelado'

export type CategoriaChecklistOffboarding =
  | 'saude_seguranca'
  | 'dp'
  | 'juridico'
  | 'patrimonio'
  | 'seguranca'
  | 'financeiro'
  | 'rh'

export interface ItemChecklistOffboarding {
  id: string
  titulo: string
  categoria: CategoriaChecklistOffboarding
  responsavel: string
  obrigatorio: boolean
  concluido: boolean
  dataConclusao?: string
  observacao?: string
  comprovanteNome?: string
  // Itens específicos como devolução de equipamento ou revogação
  metaExtra?: {
    itemPatrimonio?: string
    quantidade?: number
    numeroSerie?: string
    sistemasRevogados?: string[]
    contatoEmergencialAtualizado?: boolean
    [key: string]: any
  }
}

export interface CalculoRescisorioClt {
  modalidade: 'CLT'
  tipoDesligamento: TipoDesligamentoClt
  salarioBase: number
  saldoSalarioDias: number
  saldoSalarioValor: number
  avisoPrevioDias: number
  avisoPrevioValor: number
  avisoPrevioDesconto: number
  decimoTerceiroProporcionalMeses: number
  decimoTerceiroProporcionalValor: number
  feriasVencidasDias: number
  feriasVencidasValor: number
  feriasProporcionaisMeses: number
  feriasProporcionaisValor: number
  tercoConstitucionalFerias: number
  multaFgtsPercentual: number
  saldoFgtsEstimado?: number
  multaFgtsValor: number
  saqueFgtsHabilitado: boolean
  totalBrutoProventos: number
  totalDescontos: number
  totalLiquidoRescisao: number
}

export interface DetalheItemPj {
  descricao: string
  valor: number
  status: string
  nfId?: string
  competencia?: string
}

export interface CalculoRescisorioPj {
  modalidade: 'PJ'
  valorContratadoMensal: number
  horasCompetenciaAberta: number
  valorCompetenciaAberta: number
  nfsPendentesValor: number
  totalGeralDevido: number
  detalhes: DetalheItemPj[]
}

export type CalculoRescisorio = CalculoRescisorioClt | CalculoRescisorioPj

export interface OffboardingRegistro {
  id: string
  pessoa: string
  vinculo_origem_id?: string
  modalidade: ModalidadeOffboarding
  tipo_desligamento: TipoDesligamento
  data_aviso: string
  data_desligamento: string
  aviso_previo_tipo?: TipoAvisoPrevio
  dias_aviso_previo?: number
  status: StatusOffboarding
  responsavel_rh?: string
  responsavel_nome?: string
  empresa?: string
  empresa_nome?: string
  motivo_detalhado?: string
  itens_checklist: ItemChecklistOffboarding[]
  calculo_rescisorio: CalculoRescisorio
  total_rescisorio: number
  observacoes_finais?: string
  data_conclusao?: string
  concluido_por?: string
  termo_rescisao_arquivo?: string
  created: string
  updated: string
  // Expands
  expand?: {
    pessoa?: RecordModel
    responsavel_rh?: RecordModel
    empresa?: RecordModel
  }
}

export interface CriarOffboardingInput {
  pessoaId: string
  vinculoOrigemId?: string
  modalidade: ModalidadeOffboarding
  tipoDesligamento: TipoDesligamento
  dataAviso: string
  dataDesligamento: string
  avisoPrevioTipo?: TipoAvisoPrevio
  diasAvisoPrevio?: number
  responsavelRhId?: string
  responsavelNome?: string
  empresaId?: string
  motivoDetalhado?: string
  checklistCustomizado?: ItemChecklistOffboarding[]
  salarioBaseOuContrato?: number
  dataAdmissaoOuInicio?: string
}

/**
 * Cria a lista padrão de checklist por modalidade
 */
export function gerarChecklistPadrao(
  modalidade: ModalidadeOffboarding,
  tipoDesligamento: TipoDesligamento,
): ItemChecklistOffboarding[] {
  if (modalidade === 'PJ') {
    return [
      {
        id: 'pj-item-1',
        titulo: 'Ciência formal do término contratual e assinatura do distrato',
        categoria: 'juridico',
        responsavel: 'RH / Jurídico',
        obrigatorio: true,
        concluido: false,
        observacao: 'Emitir distrato ou termo de encerramento da prestação de serviços PJ.',
      },
      {
        id: 'pj-item-2',
        titulo: 'Verificação de pendências fiscais e conciliação de NFs em aberto',
        categoria: 'financeiro',
        responsavel: 'Financeiro / RH',
        obrigatorio: true,
        concluido: false,
        observacao: 'Verificar fechamentos de horas pendentes e NFs emitidas sem pagamento.',
      },
      {
        id: 'pj-item-3',
        titulo: 'Devolução de equipamentos corporativos e crachás',
        categoria: 'patrimonio',
        responsavel: 'Facilities / TI',
        obrigatorio: true,
        concluido: false,
        observacao: 'Registrar item, número de série e comprovante de entrega.',
        metaExtra: {
          itemPatrimonio: 'Equipamentos de trabalho',
          quantidade: 1,
        },
      },
      {
        id: 'pj-item-4',
        titulo: 'Revogação de acessos a sistemas, e-mail institucional e VPN',
        categoria: 'seguranca',
        responsavel: 'TI / Segurança',
        obrigatorio: true,
        concluido: false,
        observacao: 'Encerrar credenciais de acesso na data do último dia de prestação.',
        metaExtra: {
          sistemasRevogados: ['E-mail', 'Slack / Teams', 'Github / Repositórios', 'Acessos Cloud'],
        },
      },
      {
        id: 'pj-item-5',
        titulo: 'Atualização de contatos e baixa no cofre de documentos',
        categoria: 'rh',
        responsavel: 'Gente & Gestão',
        obrigatorio: true,
        concluido: false,
        observacao: 'Confirmar e-mail e telefone de contato e arquivar contrato encerrado.',
      },
    ]
  }

  // Checklist CLT
  const isJustaCausa = tipoDesligamento === 'Demissão por justa causa'
  return [
    {
      id: 'clt-item-1',
      titulo: 'Exame médico demissional (ASO Demissional)',
      categoria: 'saude_seguranca',
      responsavel: 'Médico do Trabalho / RH',
      obrigatorio: true,
      concluido: false,
      observacao: 'Realizar até a data da homologação conforme exigência do PCMSO e eSocial.',
    },
    {
      id: 'clt-item-2',
      titulo: 'Formalização do aviso prévio (comunicação assinada)',
      categoria: 'rh',
      responsavel: 'Gente & Gestão / Colaborador',
      obrigatorio: true,
      concluido: false,
      observacao: isJustaCausa
        ? 'Carta de rescisão por justa causa com enquadramento do Art. 482 CLT.'
        : 'Carta de demissão/aviso prévio assinada por ambas as partes.',
    },
    {
      id: 'clt-item-3',
      titulo: 'Conferência da memória de cálculo rescisório e TRCT',
      categoria: 'dp',
      responsavel: 'Departamento Pessoal',
      obrigatorio: true,
      concluido: false,
      observacao: 'Validar saldo de salário, 13º, férias proporcionais + 1/3 e FGTS.',
    },
    {
      id: 'clt-item-4',
      titulo: 'Devolução de equipamentos (Notebook, celular, periféricos e crachá)',
      categoria: 'patrimonio',
      responsavel: 'TI / Operações',
      obrigatorio: true,
      concluido: false,
      observacao: 'Checklist de conferência física e termo de devolução de patrimônio.',
      metaExtra: {
        itemPatrimonio: 'Notebook Corporativo',
        quantidade: 1,
      },
    },
    {
      id: 'clt-item-5',
      titulo: 'Revogação de acessos, contas corporativas e single sign-on',
      categoria: 'seguranca',
      responsavel: 'Segurança da Informação',
      obrigatorio: true,
      concluido: false,
      observacao: 'Bloquear e-mail, VPN, sistemas internos e credenciais operacionais.',
      metaExtra: {
        sistemasRevogados: ['Google Workspace', 'Sistemas Internos', 'Crachá de Acesso Predial'],
      },
    },
    {
      id: 'clt-item-6',
      titulo: 'Transmissão do evento S-2299 (Desligamento) ao eSocial',
      categoria: 'dp',
      responsavel: 'Departamento Pessoal',
      obrigatorio: true,
      concluido: false,
      observacao: 'Transmissão no prazo legal de até 10 dias corridos do término.',
    },
    {
      id: 'clt-item-7',
      titulo: 'Homologação e quitação das verbas rescisórias',
      categoria: 'dp',
      responsavel: 'Financeiro / DP',
      obrigatorio: true,
      concluido: false,
      observacao:
        'Pagamento das verbas rescisórias e entrega das guias (FGTS / Seguro Desemprego quando devido).',
    },
  ]
}

/**
 * Motor de Cálculo Rescisório CLT Completo
 */
export function calcularRescisaoClt(params: {
  salarioBase: number
  tipoDesligamento: TipoDesligamentoClt
  dataAdmissao: string
  dataAviso: string
  dataDesligamento: string
  avisoPrevioTipo: TipoAvisoPrevio
  diasAvisoPrevio?: number
  saldoFgtsInformado?: number
}): CalculoRescisorioClt {
  const {
    salarioBase,
    tipoDesligamento,
    dataAdmissao,
    dataDesligamento,
    avisoPrevioTipo,
    saldoFgtsInformado,
  } = params

  const dtDeslig = new Date(dataDesligamento)
  const diaMesDeslig = dtDeslig.getDate()

  // 1. Saldo de Salário: dias trabalhados no mês do desligamento
  const saldoSalarioDias = Math.max(1, Math.min(30, diaMesDeslig))
  const saldoSalarioValor = Number(((salarioBase / 30) * saldoSalarioDias).toFixed(2))

  // 2. Tempo de casa (para apuração de 13º e férias)
  const dtAdm = new Date(dataAdmissao)
  const anoDeslig = dtDeslig.getFullYear()
  const mesDeslig = dtDeslig.getMonth() + 1 // 1..12

  // 13º Proporcional: meses trabalhados no ano civil (>=15 dias no mês conta como mês cheio)
  let meses13 = mesDeslig - 1
  if (diaMesDeslig >= 15) {
    meses13 += 1
  }
  // Se admitido no mesmo ano, ajusta
  if (dtAdm.getFullYear() === anoDeslig) {
    const mesAdm = dtAdm.getMonth() + 1
    const diasMesAdm = 30 - dtAdm.getDate() + 1
    meses13 = mesDeslig - mesAdm
    if (diasMesAdm >= 15) meses13 += 1
    if (diaMesDeslig >= 15) meses13 += 1
  }
  meses13 = Math.max(1, Math.min(12, meses13))

  // Férias Proporcionais (meses trabalhados no período aquisitivo vigente)
  let mesesFerias = meses13
  const totalMesesCasa = Math.max(
    1,
    Math.round((dtDeslig.getTime() - dtAdm.getTime()) / (1000 * 60 * 60 * 24 * 30.41)),
  )
  mesesFerias = totalMesesCasa % 12 || 12

  // 3. Regras por Tipo de Desligamento CLT:
  // - Demissão sem justa causa: saldo + aviso indenizado (se aplicável) + 13º + férias prop + 1/3 + multa 40% FGTS + saque FGTS
  // - Pedido de demissão: saldo + 13º + férias prop + 1/3 (SEM multa FGTS, SEM saque FGTS; se aviso indenizado não trabalhado -> desconto do aviso)
  // - Justa causa: APENAS saldo de salário + férias vencidas (SEM 13º prop, SEM férias prop, SEM aviso, SEM FGTS)
  // - Acordo mútuo (Art. 484-A): saldo + 50% do aviso + 13º + férias prop + 1/3 + multa de 20% do FGTS + saque de até 80% do FGTS
  // - Término de experiência: saldo + 13º + férias prop + 1/3 (SEM aviso prévio, SEM multa FGTS)

  let avisoPrevioDias = params.diasAvisoPrevio || 30
  let avisoPrevioValor = 0
  let avisoPrevioDesconto = 0
  let decimoTerceiroValor = 0
  let feriasProporcionaisValor = 0
  let tercoConstitucionalValor = 0
  let multaFgtsPercentual = 0
  let saqueFgtsHabilitado = false

  switch (tipoDesligamento) {
    case 'Demissão sem justa causa':
      if (avisoPrevioTipo === 'Indenizado') {
        avisoPrevioValor = Number(((salarioBase / 30) * avisoPrevioDias).toFixed(2))
      }
      decimoTerceiroValor = Number(((salarioBase / 12) * meses13).toFixed(2))
      feriasProporcionaisValor = Number(((salarioBase / 12) * mesesFerias).toFixed(2))
      tercoConstitucionalValor = Number((feriasProporcionaisValor / 3).toFixed(2))
      multaFgtsPercentual = 40
      saqueFgtsHabilitado = true
      break

    case 'Pedido de demissão':
      if (avisoPrevioTipo === 'Indenizado') {
        // Quando o funcionário pede demissão e não cumpre o aviso, a empresa desconta
        avisoPrevioDesconto = Number(((salarioBase / 30) * avisoPrevioDias).toFixed(2))
      }
      decimoTerceiroValor = Number(((salarioBase / 12) * meses13).toFixed(2))
      feriasProporcionaisValor = Number(((salarioBase / 12) * mesesFerias).toFixed(2))
      tercoConstitucionalValor = Number((feriasProporcionaisValor / 3).toFixed(2))
      multaFgtsPercentual = 0
      saqueFgtsHabilitado = false
      break

    case 'Demissão por justa causa':
      // Sem direito a 13º proporcional, sem férias proporcionais, sem aviso, sem FGTS
      decimoTerceiroValor = 0
      feriasProporcionaisValor = 0
      tercoConstitucionalValor = 0
      avisoPrevioValor = 0
      multaFgtsPercentual = 0
      saqueFgtsHabilitado = false
      break

    case 'Acordo mútuo (Art. 484-A CLT)':
      // Aviso prévio pela metade (se indenizado)
      if (avisoPrevioTipo === 'Indenizado') {
        avisoPrevioValor = Number(((salarioBase / 30) * (avisoPrevioDias / 2)).toFixed(2))
      }
      decimoTerceiroValor = Number(((salarioBase / 12) * meses13).toFixed(2))
      feriasProporcionaisValor = Number(((salarioBase / 12) * mesesFerias).toFixed(2))
      tercoConstitucionalValor = Number((feriasProporcionaisValor / 3).toFixed(2))
      multaFgtsPercentual = 20
      saqueFgtsHabilitado = true // até 80% do saldo
      break

    case 'Término de contrato de experiência':
      avisoPrevioValor = 0
      decimoTerceiroValor = Number(((salarioBase / 12) * meses13).toFixed(2))
      feriasProporcionaisValor = Number(((salarioBase / 12) * mesesFerias).toFixed(2))
      tercoConstitucionalValor = Number((feriasProporcionaisValor / 3).toFixed(2))
      multaFgtsPercentual = 0
      saqueFgtsHabilitado = true
      break
  }

  // Estimativa de saldo do FGTS (8% ao mês com base no tempo de casa, caso não informado diretamente)
  const saldoFgtsEstimado =
    saldoFgtsInformado !== undefined
      ? saldoFgtsInformado
      : Number((salarioBase * 0.08 * totalMesesCasa).toFixed(2))

  const multaFgtsValor =
    multaFgtsPercentual > 0
      ? Number(((saldoFgtsEstimado * multaFgtsPercentual) / 100).toFixed(2))
      : 0

  const totalBrutoProventos = Number(
    (
      saldoSalarioValor +
      avisoPrevioValor +
      decimoTerceiroValor +
      feriasProporcionaisValor +
      tercoConstitucionalValor
    ).toFixed(2),
  )

  const totalDescontos = avisoPrevioDesconto

  const totalLiquidoRescisao = Number((totalBrutoProventos - totalDescontos).toFixed(2))

  return {
    modalidade: 'CLT',
    tipoDesligamento,
    salarioBase,
    saldoSalarioDias,
    saldoSalarioValor,
    avisoPrevioDias,
    avisoPrevioValor,
    avisoPrevioDesconto,
    decimoTerceiroProporcionalMeses: meses13,
    decimoTerceiroProporcionalValor: decimoTerceiroValor,
    feriasVencidasDias: 0,
    feriasVencidasValor: 0,
    feriasProporcionaisMeses: mesesFerias,
    feriasProporcionaisValor: feriasProporcionaisValor,
    tercoConstitucionalFerias: tercoConstitucionalValor,
    multaFgtsPercentual,
    saldoFgtsEstimado,
    multaFgtsValor,
    saqueFgtsHabilitado,
    totalBrutoProventos,
    totalDescontos,
    totalLiquidoRescisao,
  }
}

/**
 * Motor de Cálculo Rescisório PJ (competências em aberto + NFs não recebidas/não pagas)
 */
export async function calcularRescisaoPj(params: {
  pessoaId: string
  valorMensalContrato: number
}): Promise<CalculoRescisorioPj> {
  const { pessoaId, valorMensalContrato } = params

  let nfsPendentesValor = 0
  let valorCompetenciaAberta = 0
  let horasCompetenciaAberta = 0
  const detalhes: DetalheItemPj[] = []

  try {
    // 1. Buscar fechamentos de competência da pessoa
    const fechamentos = await pb.collection('fechamentos_competencia').getFullList<RecordModel>({
      filter: `pessoa = '${pessoaId}'`,
      sort: '-competencia',
    })

    for (const f of fechamentos) {
      const valor = Number(f.valor_total_calculado || 0)
      const horas = Number(f.total_horas || 0)
      if (
        f.status_ciclo === 'Em apontamento' ||
        f.status_ciclo === 'Aguardando validação do RH' ||
        f.status_ciclo === 'Devolvido para ajustes' ||
        f.status_ciclo === 'Validado'
      ) {
        valorCompetenciaAberta += valor
        horasCompetenciaAberta += horas
        detalhes.push({
          descricao: `Fechamento de competência ${f.competencia} (${f.status_ciclo})`,
          valor,
          status: f.status_ciclo,
          competencia: f.competencia,
        })
      }
    }

    // 2. Buscar NFs em aberto / solicitadas
    const nfs = await pb.collection('notas_fiscais').getFullList<RecordModel>({
      filter: `pessoa = '${pessoaId}'`,
      sort: '-created',
    })

    for (const n of nfs) {
      const val = Number(n.valor || 0)
      if (n.status === 'Solicitada' || n.status === 'Em atraso') {
        nfsPendentesValor += val
        detalhes.push({
          descricao: `Nota Fiscal competência ${n.competencia || 'atual'} (${n.status})`,
          valor: val,
          status: n.status,
          nfId: n.id,
          competencia: n.competencia,
        })
      }
    }
  } catch (err) {
    console.warn('[calcularRescisaoPj] Erro ao buscar fechamentos/nfs:', err)
  }

  // Se não houver itens nas tabelas de horas, usa valor mensal de referência
  if (detalhes.length === 0) {
    valorCompetenciaAberta = valorMensalContrato
    detalhes.push({
      descricao: 'Competência corrente estimada de encerramento da prestação',
      valor: valorMensalContrato,
      status: 'A faturar',
    })
  }

  const totalGeralDevido = Number((valorCompetenciaAberta + nfsPendentesValor).toFixed(2))

  return {
    modalidade: 'PJ',
    valorContratadoMensal: valorMensalContrato,
    horasCompetenciaAberta,
    valorCompetenciaAberta,
    nfsPendentesValor,
    totalGeralDevido,
    detalhes,
  }
}

export const offboardingService = {
  /**
   * Listar todos os offboardings com opção de filtro por BU (empresa) e status
   */
  async listar(filtros?: {
    empresaId?: string
    modalidade?: ModalidadeOffboarding
    status?: StatusOffboarding
  }): Promise<OffboardingRegistro[]> {
    let filterParts: string[] = []

    if (filtros?.empresaId) {
      filterParts.push(`empresa = '${filtros.empresaId}'`)
    }
    if (filtros?.modalidade) {
      filterParts.push(`modalidade = '${filtros.modalidade}'`)
    }
    if (filtros?.status) {
      filterParts.push(`status = '${filtros.status}'`)
    }

    const filter = filterParts.join(' && ')

    const records = await pb.collection('offboardings').getFullList<RecordModel>({
      filter: filter || undefined,
      sort: '-created',
      expand: 'pessoa,responsavel_rh,empresa',
    })

    return records.map((r) => ({
      id: r.id,
      pessoa: r.pessoa,
      vinculo_origem_id: r.vinculo_origem_id,
      modalidade: r.modalidade as ModalidadeOffboarding,
      tipo_desligamento: r.tipo_desligamento as TipoDesligamento,
      data_aviso: r.data_aviso,
      data_desligamento: r.data_desligamento,
      aviso_previo_tipo: r.aviso_previo_tipo as TipoAvisoPrevio,
      dias_aviso_previo: Number(r.dias_aviso_previo || 0),
      status: r.status as StatusOffboarding,
      responsavel_rh: r.responsavel_rh,
      responsavel_nome: r.responsavel_nome,
      empresa: r.empresa,
      empresa_nome: r.expand?.empresa?.nome_fantasia || r.expand?.empresa?.razao_social,
      motivo_detalhado: r.motivo_detalhado || '',
      itens_checklist: Array.isArray(r.itens_checklist) ? r.itens_checklist : [],
      calculo_rescisorio: r.calculo_rescisorio || {},
      total_rescisorio: Number(r.total_rescisorio || 0),
      observacoes_finais: r.observacoes_finais || '',
      data_conclusao: r.data_conclusao,
      concluido_por: r.concluido_por,
      termo_rescisao_arquivo: r.termo_rescisao_arquivo,
      created: r.created,
      updated: r.updated,
      expand: r.expand,
    }))
  },

  /**
   * Obter ficha completa de um processo de offboarding
   */
  async obterPorId(id: string): Promise<OffboardingRegistro | null> {
    try {
      const r = await pb.collection('offboardings').getOne<RecordModel>(id, {
        expand: 'pessoa,responsavel_rh,empresa',
      })

      return {
        id: r.id,
        pessoa: r.pessoa,
        vinculo_origem_id: r.vinculo_origem_id,
        modalidade: r.modalidade as ModalidadeOffboarding,
        tipo_desligamento: r.tipo_desligamento as TipoDesligamento,
        data_aviso: r.data_aviso,
        data_desligamento: r.data_desligamento,
        aviso_previo_tipo: r.aviso_previo_tipo as TipoAvisoPrevio,
        dias_aviso_previo: Number(r.dias_aviso_previo || 0),
        status: r.status as StatusOffboarding,
        responsavel_rh: r.responsavel_rh,
        responsavel_nome: r.responsavel_nome,
        empresa: r.empresa,
        empresa_nome: r.expand?.empresa?.nome_fantasia || r.expand?.empresa?.razao_social,
        motivo_detalhado: r.motivo_detalhado || '',
        itens_checklist: Array.isArray(r.itens_checklist) ? r.itens_checklist : [],
        calculo_rescisorio: r.calculo_rescisorio || {},
        total_rescisorio: Number(r.total_rescisorio || 0),
        observacoes_finais: r.observacoes_finais || '',
        data_conclusao: r.data_conclusao,
        concluido_por: r.concluido_por,
        termo_rescisao_arquivo: r.termo_rescisao_arquivo,
        created: r.created,
        updated: r.updated,
        expand: r.expand,
      }
    } catch {
      return null
    }
  },

  /**
   * Iniciar novo processo de desligamento
   */
  async iniciar(input: CriarOffboardingInput): Promise<OffboardingRegistro> {
    const checklist =
      input.checklistCustomizado || gerarChecklistPadrao(input.modalidade, input.tipoDesligamento)

    let calculoRescisorio: CalculoRescisorio
    let totalRescisorio = 0

    if (input.modalidade === 'CLT') {
      const salario = Number(input.salarioBaseOuContrato || 5000)
      const resClt = calcularRescisaoClt({
        salarioBase: salario,
        tipoDesligamento: input.tipoDesligamento as TipoDesligamentoClt,
        dataAdmissao: input.dataAdmissaoOuInicio || new Date().toISOString(),
        dataAviso: input.dataAviso,
        dataDesligamento: input.dataDesligamento,
        avisoPrevioTipo: input.avisoPrevioTipo || 'Indenizado',
        diasAvisoPrevio: input.diasAvisoPrevio || 30,
      })
      calculoRescisorio = resClt
      totalRescisorio = resClt.totalLiquidoRescisao
    } else {
      const valorMensal = Number(input.salarioBaseOuContrato || 10000)
      const resPj = await calcularRescisaoPj({
        pessoaId: input.pessoaId,
        valorMensalContrato: valorMensal,
      })
      calculoRescisorio = resPj
      totalRescisorio = resPj.totalGeralDevido
    }

    const payload = {
      pessoa: input.pessoaId,
      vinculo_origem_id: input.vinculoOrigemId || `ficha-${input.pessoaId}`,
      modalidade: input.modalidade,
      tipo_desligamento: input.tipoDesligamento,
      data_aviso: input.dataAviso,
      data_desligamento: input.dataDesligamento,
      aviso_previo_tipo: input.avisoPrevioTipo || 'Não aplicável',
      dias_aviso_previo: input.diasAvisoPrevio || 0,
      status: 'Em andamento',
      responsavel_rh: input.responsavelRhId || '',
      responsavel_nome: input.responsavelNome || 'Gente & Gestão',
      empresa: input.empresaId || '',
      motivo_detalhado: input.motivoDetalhado || '',
      itens_checklist: checklist,
      calculo_rescisorio: calculoRescisorio,
      total_rescisorio: totalRescisorio,
    }

    const rec = await pb.collection('offboardings').create(payload)

    // Atualizar data de fim/desligamento na ficha da pessoa
    try {
      await pb.collection('pessoas').update(input.pessoaId, {
        data_fim: input.dataDesligamento,
      })
    } catch (e) {
      console.warn('[Offboarding] Falha ao atualizar data_fim da pessoa:', e)
    }

    // Disparar notificação in-app para o RH
    try {
      await notificacoesRhService.criar({
        titulo: `Novo processo de desligamento iniciado (${input.modalidade})`,
        mensagem: `Iniciado offboarding por ${input.tipoDesligamento}. Término previsto para ${new Date(input.dataDesligamento).toLocaleDateString('pt-BR')}.`,
        tipo: 'sistema',
        referencia_tipo: 'offboarding',
        referencia_id: rec.id,
        link: `/pessoas?aba=desligamentos`,
      })
    } catch {
      /* intentionally ignored */
    }

    return (await this.obterPorId(rec.id))!
  },

  /**
   * Alternar status de um item do checklist
   */
  async alternarItemChecklist(
    offboardingId: string,
    itemId: string,
    concluido: boolean,
    observacao?: string,
  ): Promise<OffboardingRegistro> {
    const atual = await this.obterPorId(offboardingId)
    if (!atual) throw new Error('Offboarding não encontrado')

    const novaLista = atual.itens_checklist.map((it) => {
      if (it.id === itemId) {
        return {
          ...it,
          concluido,
          dataConclusao: concluido ? new Date().toISOString() : undefined,
          observacao: observacao !== undefined ? observacao : it.observacao,
        }
      }
      return it
    })

    await pb.collection('offboardings').update(offboardingId, {
      itens_checklist: novaLista,
    })

    return (await this.obterPorId(offboardingId))!
  },

  /**
   * Atualizar cálculo rescisório do offboarding
   */
  async atualizarCalculo(
    offboardingId: string,
    novoCalculo: CalculoRescisorio,
    totalRescisorio: number,
  ): Promise<OffboardingRegistro> {
    await pb.collection('offboardings').update(offboardingId, {
      calculo_rescisorio: novoCalculo,
      total_rescisorio: totalRescisorio,
    })
    return (await this.obterPorId(offboardingId))!
  },

  /**
   * Conclusão formal do processo de desligamento:
   * 1. Marca offboarding como 'Concluído'
   * 2. Atualiza a situação do vínculo da pessoa para 'Encerrado' (NUNCA exclui dados)
   * 3. Registra data_conclusao e responsável
   * 4. Desativa benefícios ativos do vínculo
   * 5. Se for PJ com prestador vinculado, atualiza status do prestador/contrato para 'Encerrado'
   */
  async concluirFormalmente(
    offboardingId: string,
    concluidoPorNome: string,
    observacoesFinais?: string,
  ): Promise<OffboardingRegistro> {
    const atual = await this.obterPorId(offboardingId)
    if (!atual) throw new Error('Offboarding não encontrado')

    const dataHojeIso = new Date().toISOString()

    // 1. Atualizar offboarding
    await pb.collection('offboardings').update(offboardingId, {
      status: 'Concluído',
      data_conclusao: dataHojeIso,
      concluido_por: concluidoPorNome,
      observacoes_finais: observacoesFinais || atual.observacoes_finais,
    })

    // 2. Atualizar situação da pessoa para 'Encerrado'
    try {
      await pb.collection('pessoas').update(atual.pessoa, {
        situacao_contrato: 'Encerrado',
        data_fim: atual.data_desligamento,
      })
    } catch (e) {
      console.warn('[Offboarding] Falha ao atualizar situação da pessoa:', e)
    }

    // 3. Desativar benefícios ativos vinculados a essa pessoa
    try {
      const bens = await pb.collection('beneficios_vinculo').getFullList<RecordModel>({
        filter: `pessoa = '${atual.pessoa}' && ativo = true`,
      })
      for (const b of bens) {
        await pb.collection('beneficios_vinculo').update(b.id, {
          ativo: false,
          data_fim: atual.data_desligamento,
          observacao: `${b.observacao ? b.observacao + ' | ' : ''}Cancelado por encerramento de vínculo (${atual.tipo_desligamento}).`,
        })
      }
    } catch (e) {
      console.warn('[Offboarding] Falha ao desativar benefícios:', e)
    }

    // 4. Se houver contratos formais em contratos_unificados ou contratos_pj, marcar como 'Encerrado'
    try {
      const contratos = await pb.collection('contratos').getFullList<RecordModel>({
        filter: `pessoa = '${atual.pessoa}' && status != 'Encerrado' && status != 'Rescindido'`,
      })
      for (const c of contratos) {
        await pb.collection('contratos').update(c.id, {
          status: 'Encerrado',
          data_fim: atual.data_desligamento,
        })
      }
    } catch {
      /* intentionally ignored */
    }

    // Notificação
    try {
      await notificacoesRhService.criar({
        titulo: `Offboarding concluído com sucesso`,
        mensagem: `Vínculo encerrado formalmente para a pessoa. Histórico vitalício preservado.`,
        tipo: 'sistema',
        referencia_tipo: 'offboarding',
        referencia_id: offboardingId,
        link: `/pessoas/${atual.pessoa}`,
      })
    } catch {
      /* intentionally ignored */
    }

    return (await this.obterPorId(offboardingId))!
  },

  /**
   * Upload do termo de rescisão assinado
   */
  async anexarTermoRescisao(offboardingId: string, arquivo: File): Promise<OffboardingRegistro> {
    const formData = new FormData()
    formData.append('termo_rescisao_arquivo', arquivo)
    await pb.collection('offboardings').update(offboardingId, formData)
    return (await this.obterPorId(offboardingId))!
  },
}
