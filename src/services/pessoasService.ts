import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

export type ModalidadePessoa = 'CLT' | 'PJ'
export type TipoPessoa = 'PF' | 'PJ'
export type SituacaoContratoPessoa = 'Vigente' | 'Em integração' | 'Encerrado' | 'Pausado'
export type PrazoTipoPessoa = 'Indeterminado' | 'Determinado' | 'Projeto Especifico'

export type TipoDocumentoPessoa =
  | 'Contrato de Prestação / Admissão'
  | 'Contrato Social / Ato Constitutivo'
  | 'Certidão Fiscal (CND / Federal / Estadual)'
  | 'Termo Assinado'
  | 'Documentação Admissional (RG / CPF / CTPS)'
  | 'Certificado / Comprovante'
  | 'Outro'

export type StatusDocumentoPessoa = 'vigente' | 'vencendo' | 'vencido' | 'sem_validade'

export interface DocumentoPessoa {
  id: string
  pessoa: string
  nome: string
  tipo: TipoDocumentoPessoa
  arquivo: string
  data_emissao?: string
  data_vencimento?: string
  tamanho_bytes?: number
  enviado_por_nome?: string
  enviado_por_usuario?: string
  observacoes?: string
  created: string
  updated: string
  // Campos computados
  statusCalculado: StatusDocumentoPessoa
  diasParaVencer?: number
  urlArquivo: string
}

export interface EventoTimelineUnificada {
  id: string
  data: string
  origemModulo: 'candidatos' | 'aditivos' | 'integracao' | 'contratos' | 'documentos' | 'sistema'
  categoria: string
  titulo: string
  descricao: string
  autor?: string
  tipoBadge?: string
  statusBadge?: string
  metadados?: Record<string, any>
}

export interface PessoaUnificada {
  id: string
  nome: string
  tipo_pessoa: TipoPessoa
  modalidade: ModalidadePessoa
  cpf_cnpj?: string
  email?: string
  telefone?: string
  cargo_funcao: string
  departamento?: string
  centro_custo?: string
  gestor_responsavel?: string
  gestor_nome?: string
  data_inicio?: string
  data_fim?: string
  data_renovacao?: string
  situacao_contrato: SituacaoContratoPessoa
  valor_contratado?: number
  horas_mensais_base?: number
  valor_hora?: number
  duracao_meses?: number
  prazo_tipo?: PrazoTipoPessoa
  percentual_integracao?: number
  observacoes?: string
  origem_importacao?: string
  prestador_origem?: string
  candidato_origem?: string
  rotina_origem?: string
  empresa?: string
  empresa_nome?: string
  area?: string
  area_nome?: string
  created: string
  updated: string
  // Campos agregados na visualização
  diasAteRenovacao?: number
  documentosCount?: number
  documentosVencidosCount?: number
  documentosVencendoCount?: number
}

export type TipoVinculo = 'PJ' | 'CLT' | 'Estágio' | 'Temporário'
export type SituacaoVinculo =
  | 'Vigente'
  | 'Vencendo'
  | 'Em integração'
  | 'Renovado'
  | 'Encerrado'
  | 'Rescindido'
  | 'Pausado'
  | 'Suspensão programada'

export interface VinculoPessoa {
  id: string
  pessoaId: string
  tipo: TipoVinculo
  origem: 'contratos_pj' | 'pessoas' | 'rotinas_integracao'
  origemId: string
  titulo: string
  numeroContrato?: string
  valorMensal: number
  valorHora: number
  horasMensaisBase: number
  tipoRemuneracao?: 'Mensal' | 'Por hora' | 'Por projeto' | 'Salário Fixo'
  dataInicio: string
  dataFim?: string
  situacao: SituacaoVinculo
  prazoTipo?: PrazoTipoPessoa
  gestorNome?: string
  departamento?: string
  empresaId?: string
  empresaNome?: string
  areaId?: string
  areaNome?: string
  cargoFuncao?: string
  // Regras e dados estendidos PJ
  prestadorPjId?: string
  contadorAditivos?: number
  clausulasResumo?: string
  contratoAssinadoAnexo?: string
  recordOriginal?: RecordModel
}

export interface NovaPessoaInput {
  nome: string
  tipo_pessoa: TipoPessoa
  modalidade: ModalidadePessoa
  cpf_cnpj?: string
  email?: string
  telefone?: string
  cargo_funcao: string
  departamento?: string
  centro_custo?: string
  gestor_responsavel?: string
  gestor_nome?: string
  data_inicio?: string
  data_fim?: string
  data_renovacao?: string
  situacao_contrato: SituacaoContratoPessoa
  valor_contratado?: number
  horas_mensais_base?: number
  valor_hora?: number
  duracao_meses?: number
  prazo_tipo?: PrazoTipoPessoa
  percentual_integracao?: number
  observacoes?: string
  origem_importacao?: string
  prestador_origem?: string
  candidato_origem?: string
  rotina_origem?: string
  empresa?: string
  area?: string
}

export function calcularStatusDocumento(dataVencimento?: string): {
  status: StatusDocumentoPessoa
  diasParaVencer?: number
} {
  if (!dataVencimento) {
    return { status: 'sem_validade' }
  }

  const agora = new Date()
  agora.setHours(0, 0, 0, 0)
  const venc = new Date(dataVencimento)
  venc.setHours(0, 0, 0, 0)

  const diffMs = venc.getTime() - agora.getTime()
  const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (dias < 0) {
    return { status: 'vencido', diasParaVencer: dias }
  } else if (dias <= 30) {
    return { status: 'vencendo', diasParaVencer: dias }
  } else {
    return { status: 'vigente', diasParaVencer: dias }
  }
}

export function calcularDiasAteRenovacao(dataRenovacaoOuFim?: string): number | undefined {
  if (!dataRenovacaoOuFim) return undefined
  const agora = new Date()
  agora.setHours(0, 0, 0, 0)
  const data = new Date(dataRenovacaoOuFim)
  data.setHours(0, 0, 0, 0)
  const diffMs = data.getTime() - agora.getTime()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}

export const pessoasService = {
  /**
   * Listar todas as pessoas unificadas
   */
  async listar(): Promise<PessoaUnificada[]> {
    const [records, empresasList, areasList] = await Promise.all([
      pb.collection('pessoas').getFullList<RecordModel>({
        sort: '-created',
        expand: 'empresa,area',
      }),
      pb
        .collection('empresas')
        .getFullList<RecordModel>()
        .catch(() => []),
      pb
        .collection('areas')
        .getFullList<RecordModel>()
        .catch(() => []),
    ])

    const empresasMap = new Map<string, string>()
    empresasList.forEach((e) => empresasMap.set(e.id, e.nome_fantasia || e.razao_social))

    const areasMap = new Map<string, string>()
    areasList.forEach((a) => areasMap.set(a.id, a.nome))

    // Buscar contagem de documentos para alimentar alertas de topo
    let docsList: RecordModel[] = []
    try {
      docsList = await pb.collection('documentos_pessoa').getFullList<RecordModel>({})
    } catch {
      /* intentionally ignored */
    }

    return records.map((r) => {
      const expEmp = r.expand?.empresa as
        | { nome_fantasia?: string; razao_social?: string }
        | undefined
      const expArea = r.expand?.area as { nome?: string } | undefined
      const empNome = expEmp?.nome_fantasia || (r.empresa ? empresasMap.get(r.empresa) : undefined)
      const arNome = expArea?.nome || (r.area ? areasMap.get(r.area) : undefined)
      const docsPessoa = docsList.filter((d) => d.pessoa === r.id)
      let vencidos = 0
      let vencendo = 0

      for (const d of docsPessoa) {
        const { status } = calcularStatusDocumento(d.data_vencimento)
        if (status === 'vencido') vencidos++
        if (status === 'vencendo') vencendo++
      }

      const refData = r.data_renovacao || r.data_fim
      const diasAteRenovacao = calcularDiasAteRenovacao(refData)

      return {
        id: r.id,
        nome: r.nome,
        tipo_pessoa: r.tipo_pessoa || (r.modalidade === 'PJ' ? 'PJ' : 'PF'),
        modalidade: r.modalidade || 'CLT',
        cpf_cnpj: r.cpf_cnpj || '',
        email: r.email || '',
        telefone: r.telefone || '',
        cargo_funcao: r.cargo_funcao,
        departamento: r.departamento || '',
        centro_custo: r.centro_custo || '',
        gestor_responsavel: r.gestor_responsavel || '',
        gestor_nome: r.gestor_nome || '',
        data_inicio: r.data_inicio || '',
        data_fim: r.data_fim || '',
        data_renovacao: r.data_renovacao || '',
        situacao_contrato: r.situacao_contrato || 'Vigente',
        valor_contratado: Number(r.valor_contratado || 0),
        horas_mensais_base: Number(r.horas_mensais_base || 160),
        valor_hora: Number(r.valor_hora || 0),
        duracao_meses: Number(r.duracao_meses || 0),
        prazo_tipo: r.prazo_tipo,
        percentual_integracao: Number(r.percentual_integracao || 0),
        observacoes: r.observacoes || '',
        origem_importacao: r.origem_importacao || '',
        prestador_origem: r.prestador_origem || '',
        candidato_origem: r.candidato_origem || '',
        rotina_origem: r.rotina_origem || '',
        empresa: r.empresa || '',
        empresa_nome: empNome,
        area: r.area || '',
        area_nome: arNome,
        created: r.created,
        updated: r.updated,
        diasAteRenovacao,
        documentosCount: docsPessoa.length,
        documentosVencidosCount: vencidos,
        documentosVencendoCount: vencendo,
      }
    })
  },

  /**
   * Obter ficha da pessoa por ID
   */
  async obterPorId(id: string): Promise<PessoaUnificada | null> {
    try {
      const r = await pb.collection('pessoas').getOne<RecordModel>(id, {
        expand: 'empresa,area',
      })
      const docsPessoa = await pb.collection('documentos_pessoa').getFullList<RecordModel>({
        filter: `pessoa = '${id}'`,
      })

      const expEmp = r.expand?.empresa as
        | { nome_fantasia?: string; razao_social?: string }
        | undefined
      const expArea = r.expand?.area as { nome?: string } | undefined

      let vencidos = 0
      let vencendo = 0
      for (const d of docsPessoa) {
        const { status } = calcularStatusDocumento(d.data_vencimento)
        if (status === 'vencido') vencidos++
        if (status === 'vencendo') vencendo++
      }

      const refData = r.data_renovacao || r.data_fim
      const diasAteRenovacao = calcularDiasAteRenovacao(refData)

      return {
        id: r.id,
        nome: r.nome,
        tipo_pessoa: r.tipo_pessoa || (r.modalidade === 'PJ' ? 'PJ' : 'PF'),
        modalidade: r.modalidade || 'CLT',
        cpf_cnpj: r.cpf_cnpj || '',
        email: r.email || '',
        telefone: r.telefone || '',
        cargo_funcao: r.cargo_funcao,
        departamento: r.departamento || '',
        centro_custo: r.centro_custo || '',
        gestor_responsavel: r.gestor_responsavel || '',
        gestor_nome: r.gestor_nome || '',
        data_inicio: r.data_inicio || '',
        data_fim: r.data_fim || '',
        data_renovacao: r.data_renovacao || '',
        situacao_contrato: r.situacao_contrato || 'Vigente',
        valor_contratado: Number(r.valor_contratado || 0),
        horas_mensais_base: Number(r.horas_mensais_base || 160),
        valor_hora: Number(r.valor_hora || 0),
        duracao_meses: Number(r.duracao_meses || 0),
        prazo_tipo: r.prazo_tipo,
        percentual_integracao: Number(r.percentual_integracao || 0),
        observacoes: r.observacoes || '',
        origem_importacao: r.origem_importacao || '',
        prestador_origem: r.prestador_origem || '',
        candidato_origem: r.candidato_origem || '',
        rotina_origem: r.rotina_origem || '',
        empresa: r.empresa || '',
        empresa_nome: expEmp?.nome_fantasia || expEmp?.razao_social,
        area: r.area || '',
        area_nome: expArea?.nome,
        created: r.created,
        updated: r.updated,
        diasAteRenovacao,
        documentosCount: docsPessoa.length,
        documentosVencidosCount: vencidos,
        documentosVencendoCount: vencendo,
      }
    } catch {
      return null
    }
  },

  /**
   * Criar pessoa unificada
   */
  async criar(dados: NovaPessoaInput): Promise<RecordModel> {
    const horasBase = Number(dados.horas_mensais_base || 160)
    const valorContratado = Number(dados.valor_contratado || 0)
    const valorHoraCalculado =
      dados.valor_hora !== undefined
        ? Number(dados.valor_hora)
        : horasBase > 0
          ? Number((valorContratado / horasBase).toFixed(2))
          : 0

    return await pb.collection('pessoas').create({
      ...dados,
      horas_mensais_base: horasBase,
      valor_hora: valorHoraCalculado,
    })
  },

  /**
   * Atualizar pessoa unificada
   */
  async atualizar(id: string, dados: Partial<NovaPessoaInput>): Promise<RecordModel> {
    const horasBase = Number(dados.horas_mensais_base || 160)
    let payload = { ...dados }
    if (dados.valor_contratado !== undefined && dados.valor_hora === undefined && horasBase > 0) {
      payload.valor_hora = Number((Number(dados.valor_contratado) / horasBase).toFixed(2))
    }
    return await pb.collection('pessoas').update(id, payload)
  },

  /**
   * Excluir pessoa unificada
   */
  async excluir(id: string): Promise<boolean> {
    return await pb.collection('pessoas').delete(id)
  },

  /**
   * Listar documentos do cofre da pessoa
   */
  async listarDocumentos(pessoaId: string): Promise<DocumentoPessoa[]> {
    const records = await pb.collection('documentos_pessoa').getFullList<RecordModel>({
      filter: `pessoa = '${pessoaId}'`,
      sort: '-created',
    })

    return records.map((r) => {
      const calc = calcularStatusDocumento(r.data_vencimento)
      const urlArquivo = pb.files.getURL(r, r.arquivo)

      return {
        id: r.id,
        pessoa: r.pessoa,
        nome: r.nome,
        tipo: r.tipo,
        arquivo: r.arquivo,
        data_emissao: r.data_emissao,
        data_vencimento: r.data_vencimento,
        tamanho_bytes: r.tamanho_bytes,
        enviado_por_nome: r.enviado_por_nome,
        enviado_por_usuario: r.enviado_por_usuario,
        observacoes: r.observacoes,
        created: r.created,
        updated: r.updated,
        statusCalculado: calc.status,
        diasParaVencer: calc.diasParaVencer,
        urlArquivo,
      }
    })
  },

  /**
   * Enviar novo documento para o cofre com upload real de arquivo (FormData)
   */
  async enviarDocumento(
    pessoaId: string,
    file: File,
    metadados: {
      nome: string
      tipo: TipoDocumentoPessoa
      data_emissao?: string
      data_vencimento?: string
      observacoes?: string
      enviado_por_nome?: string
      enviado_por_usuario?: string
    },
  ): Promise<RecordModel> {
    const formData = new FormData()
    formData.append('pessoa', pessoaId)
    formData.append('nome', metadados.nome)
    formData.append('tipo', metadados.tipo)
    formData.append('arquivo', file)
    formData.append('tamanho_bytes', String(file.size))

    if (metadados.data_emissao) {
      formData.append('data_emissao', metadados.data_emissao)
    }
    if (metadados.data_vencimento) {
      formData.append('data_vencimento', metadados.data_vencimento)
    }
    if (metadados.observacoes) {
      formData.append('observacoes', metadados.observacoes)
    }
    if (metadados.enviado_por_nome) {
      formData.append('enviado_por_nome', metadados.enviado_por_nome)
    }
    if (metadados.enviado_por_usuario) {
      formData.append('enviado_por_usuario', metadados.enviado_por_usuario)
    }

    return await pb.collection('documentos_pessoa').create(formData)
  },

  /**
   * Excluir documento do cofre
   */
  async excluirDocumento(documentoId: string): Promise<boolean> {
    return await pb.collection('documentos_pessoa').delete(documentoId)
  },

  /**
   * Carregar cronologia unificada consolidando todos os eventos das coleções reais:
   * - Candidatos / Contratação (eventos_timeline_candidato, data_contratacao)
   * - Prestadores PJ (eventos_timeline_pj, contratos_pj)
   * - Aditivos Contratuais (aditivos_pj com parecer jurídico e histórico)
   * - Rotinas de Integração (marcos 30-60-90 com nota e parecer, checklist, NPS)
   * - Cofre de Documentos (documentos_pessoa)
   */
  async carregarLinhaDoTempoUnificada(pessoa: PessoaUnificada): Promise<EventoTimelineUnificada[]> {
    const eventos: EventoTimelineUnificada[] = []

    // 1. Evento de Início / Criação de Cadastro
    if (pessoa.data_inicio) {
      eventos.push({
        id: `inicio-${pessoa.id}`,
        data: pessoa.data_inicio,
        origemModulo: 'sistema',
        categoria: 'CONTRATAÇÃO',
        titulo: `Início de Vínculo Contratual (${pessoa.modalidade})`,
        descricao: `Admissão/início na posição de ${pessoa.cargo_funcao}. Valor acordado: R$ ${pessoa.valor_contratado?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês (${pessoa.prazo_tipo || 'Prazo'}).`,
        autor: pessoa.gestor_nome || 'Gente & Gestão',
        tipoBadge: pessoa.modalidade,
      })
    }

    // 2. Se houver candidato_origem ou vinculação por email/cpf
    try {
      let candId = pessoa.candidato_origem
      if (!candId && pessoa.email) {
        const c = await pb.collection('candidatos').getFirstListItem(`email = '${pessoa.email}'`)
        candId = c.id
      }

      if (candId) {
        const tlCands = await pb.collection('eventos_timeline_candidato').getFullList<RecordModel>({
          filter: `candidato = '${candId}'`,
          sort: '-data_evento',
        })

        for (const ev of tlCands) {
          eventos.push({
            id: `cand-${ev.id}`,
            data: ev.data_evento || ev.created,
            origemModulo: 'candidatos',
            categoria: ev.categoria || 'RECRUTAMENTO',
            titulo: ev.titulo,
            descricao: ev.complemento || 'Etapa registrada no processo seletivo',
            autor: ev.autor || 'Recrutamento',
            tipoBadge: 'Processo Seletivo',
          })
        }
      }
    } catch {
      /* intentionally ignored */
    }

    // 3. Se houver prestador_origem (PJ) -> puxar timeline de PJ e aditivos
    try {
      let prestId = pessoa.prestador_origem
      if (!prestId && pessoa.cpf_cnpj && pessoa.modalidade === 'PJ') {
        const p = await pb
          .collection('prestadores_pj')
          .getFirstListItem(`cnpj = '${pessoa.cpf_cnpj}'`)
        prestId = p.id
      }

      if (prestId) {
        // Eventos timeline PJ
        const tlPj = await pb.collection('eventos_timeline_pj').getFullList<RecordModel>({
          filter: `prestador = '${prestId}'`,
          sort: '-data_evento',
        })

        for (const ev of tlPj) {
          eventos.push({
            id: `pj-ev-${ev.id}`,
            data: ev.data_evento || ev.created,
            origemModulo: 'contratos',
            categoria: ev.categoria || 'GESTÃO PJ',
            titulo: ev.titulo,
            descricao: ev.complemento || 'Registro operacional da parceria PJ',
            autor: ev.autor || 'Time PJ',
            tipoBadge: 'Prestação de Serviços',
          })
        }

        // Aditivos PJ vinculados ao prestador
        const aditivos = await pb.collection('aditivos_pj').getFullList<RecordModel>({
          filter: `prestador = '${prestId}'`,
          sort: '-created',
        })

        for (const adit of aditivos) {
          const parecerTexto = adit.parecer_juridico
            ? ` Parecer Jurídico: "${adit.parecer_juridico}".`
            : ''
          const dataAdit = adit.data_assinatura || adit.data_aprovacao_juridico || adit.created

          eventos.push({
            id: `adit-${adit.id}`,
            data: dataAdit,
            origemModulo: 'aditivos',
            categoria: 'ADITIVO CONTRATUAL',
            titulo: `Aditivo ${adit.numero_aditivo || 'Contratual'}: ${adit.tipo}`,
            descricao: `${adit.descricao || 'Aditamento contratual formalizado.'}${parecerTexto} Status: ${adit.status}. Novo valor: R$ ${adit.novo_valor_mensal?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/mês.`,
            autor: adit.parecer_juridico ? 'Jurídico Corporativo' : 'Gente & Gestão',
            tipoBadge: 'Aditivo Contratual',
            statusBadge: adit.status,
          })
        }
      }
    } catch {
      /* intentionally ignored */
    }

    // 4. Se houver rotina_origem ou rotina com documento/email
    try {
      let rotinaRecord: RecordModel | null = null
      if (pessoa.rotina_origem) {
        rotinaRecord = await pb.collection('rotinas_integracao').getOne(pessoa.rotina_origem)
      } else if (pessoa.cpf_cnpj) {
        rotinaRecord = await pb
          .collection('rotinas_integracao')
          .getFirstListItem(`documento_identificacao = '${pessoa.cpf_cnpj}'`)
      } else if (pessoa.email) {
        rotinaRecord = await pb
          .collection('rotinas_integracao')
          .getFirstListItem(`email_contato = '${pessoa.email}'`)
      }

      if (rotinaRecord) {
        // Check-ins dos marcos 30-60-90
        const marcos = rotinaRecord.marcos_30_60_90
        if (Array.isArray(marcos)) {
          for (const m of marcos) {
            if (m.checkInRealizado && m.dataCheckIn) {
              const nota =
                m.notaAvaliacao !== null && m.notaAvaliacao !== undefined
                  ? ` (Nota: ${m.notaAvaliacao}/10)`
                  : ''
              const parecer = m.parecerGestor ? ` Parecer: "${m.parecerGestor}".` : ''
              eventos.push({
                id: `marco-${m.marco}-${rotinaRecord.id}`,
                data: m.dataCheckIn,
                origemModulo: 'integracao',
                categoria: 'CHECK-IN 30-60-90',
                titulo: `Check-in de Integração (${m.marco.replace('_', ' ')}) Realizado${nota}`,
                descricao: `Entregas avaliadas: "${m.entregasEsperadas || 'Avaliação do período'}".${parecer}`,
                autor: rotinaRecord.gestor_nome || 'Gestor Responsável',
                tipoBadge: 'Integração',
                statusBadge: m.decisaoContinuar || 'Aprovado',
              })
            }
          }
        }

        // NPS de Onboarding
        if (rotinaRecord.nps_onboarding_score) {
          eventos.push({
            id: `nps-${rotinaRecord.id}`,
            data: rotinaRecord.updated || rotinaRecord.created,
            origemModulo: 'integracao',
            categoria: 'EXPERIÊNCIA ONBOARDING',
            titulo: `NPS de Integração Avaliado: Nota ${rotinaRecord.nps_onboarding_score}/10`,
            descricao: rotinaRecord.nps_comentarios
              ? `Comentário do integrado: "${rotinaRecord.nps_comentarios}"`
              : 'Pesquisa de percepção de onboarding respondida.',
            autor: pessoa.nome,
            tipoBadge: 'Pesquisa NPS',
          })
        }
      }
    } catch {
      /* intentionally ignored */
    }

    // 5. Documentos adicionados ao cofre
    try {
      const docs = await pb.collection('documentos_pessoa').getFullList<RecordModel>({
        filter: `pessoa = '${pessoa.id}'`,
        sort: '-created',
      })

      for (const d of docs) {
        const calc = calcularStatusDocumento(d.data_vencimento)
        eventos.push({
          id: `doc-${d.id}`,
          data: d.created,
          origemModulo: 'documentos',
          categoria: 'COFRE DE DOCUMENTOS',
          titulo: `Upload de Documento: ${d.nome}`,
          descricao: `Tipo: ${d.tipo}. Vencimento: ${d.data_vencimento ? new Date(d.data_vencimento).toLocaleDateString('pt-BR') : 'Sem validade'} (${calc.status}).`,
          autor: d.enviado_por_nome || 'Time RH',
          tipoBadge: 'Documento',
          statusBadge:
            calc.status === 'vencido'
              ? 'Vencido'
              : calc.status === 'vencendo'
                ? 'Vencendo'
                : 'Vigente',
        })
      }
    } catch {
      /* intentionally ignored */
    }

    // 6. Benefícios do Vínculo
    try {
      const beneficios = await pb.collection('beneficios_vinculo').getFullList<RecordModel>({
        filter: `pessoa = '${pessoa.id}'`,
        sort: '-created',
      })

      for (const b of beneficios) {
        const nomeBen = b.nome_personalizado || b.tipo
        const vMensal = Number(b.valor_mensal || 0).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
        })
        eventos.push({
          id: `ben-${b.id}`,
          data: b.updated || b.created,
          origemModulo: 'contratos',
          categoria: 'BENEFÍCIOS',
          titulo: `Benefício Registrado: ${nomeBen}`,
          descricao: `Valor mensal: R$ ${vMensal}. Status: ${b.ativo !== false ? 'Ativo' : 'Inativo'}.${b.observacao ? ` Obs: "${b.observacao}".` : ''}`,
          autor: 'Gente & Gestão',
          tipoBadge: 'Benefício',
          statusBadge: b.ativo !== false ? 'Ativo' : 'Inativo',
        })
      }
    } catch {
      /* intentionally ignored */
    }

    // 7. Férias CLT e Descanso Remunerado PJ
    try {
      const programacoes = await pb.collection('programacoes_descanso').getFullList<RecordModel>({
        filter: `pessoa = '${pessoa.id}'`,
        sort: '-data_inicio',
      })

      for (const p of programacoes) {
        const isClt = p.tipo === 'CLT_FERIAS'
        const tit = isClt ? 'Programação de Férias CLT' : 'Programação de Descanso PJ'
        const dtIni = p.data_inicio ? new Date(p.data_inicio).toLocaleDateString('pt-BR') : ''
        const dtFim = p.data_fim ? new Date(p.data_fim).toLocaleDateString('pt-BR') : ''
        const vPer = Number(p.valor_periodo || 0).toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
        })
        const comp1Terco =
          isClt && p.adicional_terco_constitucional
            ? ` (inclui 1/3 constitucional de R$ ${Number(p.adicional_terco_constitucional).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`
            : ''

        eventos.push({
          id: `desc-${p.id}`,
          data: p.data_inicio || p.created,
          origemModulo: 'contratos',
          categoria: isClt ? 'FÉRIAS CLT' : 'DESCANSO PJ',
          titulo: `${tit} (${p.dias} dias)`,
          descricao: `Período: ${dtIni} a ${dtFim}. Valor do período: R$ ${vPer}${comp1Terco}. Status: ${p.status}.${p.observacao ? ` Obs: "${p.observacao}".` : ''}`,
          autor: 'Gente & Gestão',
          tipoBadge: isClt ? 'Férias' : 'Descanso PJ',
          statusBadge: p.status,
        })
      }
    } catch {
      /* intentionally ignored */
    }

    // Ordenar descrescente por data
    eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())

    return eventos
  },

  /**
   * Resolver vínculo PJ e carregar o PrestadorPJ correspondente à pessoa
   */
  async obterPrestadorVinculado(pessoa: PessoaUnificada): Promise<RecordModel | null> {
    try {
      if (pessoa.prestador_origem) {
        return await pb.collection('prestadores_pj').getOne<RecordModel>(pessoa.prestador_origem)
      }
      if (pessoa.cpf_cnpj) {
        const porCnpj = await pb
          .collection('prestadores_pj')
          .getFirstListItem<RecordModel>(`cnpj = '${pessoa.cpf_cnpj}'`)
        return porCnpj
      }
      if (pessoa.email) {
        const porEmail = await pb
          .collection('prestadores_pj')
          .getFirstListItem<RecordModel>(`contato_email = '${pessoa.email}'`)
        return porEmail
      }
    } catch {
      /* not found */
    }
    return null
  },

  /**
   * Listar todos os vínculos da pessoa (CLT e PJ, ativos e encerrados).
   * Consolida:
   * 1. Contratos formais PJ em `contratos_pj` (se houver prestador_origem ou PJ com mesmo CNPJ)
   * 2. Vínculo CLT registrado na ficha da pessoa
   * 3. Vínculos adicionais de rotinas de integração se houver
   */
  async listarVinculosPessoa(pessoa: PessoaUnificada): Promise<VinculoPessoa[]> {
    const vinculos: VinculoPessoa[] = []

    // 1. Vínculo principal direto da ficha de Pessoa
    const horasBase = pessoa.horas_mensais_base || 160
    const vTotal = pessoa.valor_contratado || 0
    const vHora = pessoa.valor_hora || (horasBase > 0 ? Number((vTotal / horasBase).toFixed(2)) : 0)

    vinculos.push({
      id: `ficha-${pessoa.id}`,
      pessoaId: pessoa.id,
      tipo: (pessoa.modalidade as TipoVinculo) || 'CLT',
      origem: 'pessoas',
      origemId: pessoa.id,
      titulo: `Vínculo Principal — ${pessoa.modalidade} (${pessoa.cargo_funcao})`,
      valorMensal: vTotal,
      valorHora: vHora,
      horasMensaisBase: horasBase,
      tipoRemuneracao: pessoa.modalidade === 'PJ' ? 'Mensal' : 'Salário Fixo',
      dataInicio: pessoa.data_inicio,
      dataFim: pessoa.data_fim || pessoa.data_renovacao,
      situacao: (pessoa.situacao_contrato as SituacaoVinculo) || 'Vigente',
      prazoTipo: pessoa.prazo_tipo,
      gestorNome: pessoa.gestor_nome,
      departamento: pessoa.departamento,
      empresaId: pessoa.empresa,
      empresaNome: pessoa.empresa_nome,
      areaId: pessoa.area,
      areaNome: pessoa.area_nome,
      cargoFuncao: pessoa.cargo_funcao,
      prestadorPjId: pessoa.prestador_origem,
    })

    // 2. Se for PJ ou possuir prestador_origem / cnpj associado, carregar contratos de `contratos_pj`
    try {
      let prestId = pessoa.prestador_origem
      if (!prestId && pessoa.cpf_cnpj) {
        const pj = await pb
          .collection('prestadores_pj')
          .getFirstListItem<RecordModel>(`cnpj = '${pessoa.cpf_cnpj}'`)
        prestId = pj.id
      }

      if (prestId) {
        const contratos = await pb.collection('contratos_pj').getFullList<RecordModel>({
          filter: `prestador = '${prestId}'`,
          sort: '-data_inicio',
        })

        for (const c of contratos) {
          const valor = Number(c.valor || 0)
          const vh = horasBase > 0 ? Number((valor / horasBase).toFixed(2)) : 0

          // Evita duplicar se for ID idêntico
          vinculos.push({
            id: `contrato-${c.id}`,
            pessoaId: pessoa.id,
            tipo: 'PJ',
            origem: 'contratos_pj',
            origemId: c.id,
            titulo: c.titulo || `Contrato PJ ${c.numero_contrato || ''}`,
            numeroContrato: c.numero_contrato,
            valorMensal: valor,
            valorHora: vh,
            horasMensaisBase: horasBase,
            tipoRemuneracao: c.tipo || 'Mensal',
            dataInicio: c.data_inicio,
            dataFim: c.data_fim,
            situacao: (c.status as SituacaoVinculo) || 'Vigente',
            prazoTipo: 'Determinado',
            gestorNome: c.gestor_nome || pessoa.gestor_nome,
            departamento: pessoa.departamento,
            empresaId: c.empresa || pessoa.empresa,
            empresaNome: pessoa.empresa_nome,
            areaId: c.area || pessoa.area,
            areaNome: pessoa.area_nome,
            cargoFuncao: pessoa.cargo_funcao,
            prestadorPjId: prestId,
            contadorAditivos: c.contador_aditivos,
            clausulasResumo: c.clausulas_resumo,
            contratoAssinadoAnexo: c.contrato_assinado_anexo,
            recordOriginal: c,
          })
        }
      }
    } catch {
      /* ignore error when loading extra contracts */
    }

    return vinculos
  },

  /**
   * Buscar fontes disponíveis para pré-preenchimento / importação rápida:
   * - Prestadores PJ existentes (que ainda não foram unificados)
   * - Candidatos aprovados
   * - Rotinas de integração existentes
   */
  async listarFontesImportacaoDisponiveis() {
    const [prestadores, candidatos, rotinas, pessoasExistentes] = await Promise.all([
      pb.collection('prestadores_pj').getFullList<RecordModel>({ sort: 'nome_fantasia' }),
      pb.collection('candidatos').getFullList<RecordModel>({
        filter: "status = 'Aprovado' || status = 'Proposta'",
        sort: 'nome',
      }),
      pb.collection('rotinas_integracao').getFullList<RecordModel>({ sort: 'nome_completo' }),
      pb.collection('pessoas').getFullList<RecordModel>({}),
    ])

    const cnpjsPessoas = new Set(pessoasExistentes.map((p) => p.cpf_cnpj).filter(Boolean))
    const emailsPessoas = new Set(
      pessoasExistentes.map((p) => p.email?.toLowerCase()).filter(Boolean),
    )

    return {
      prestadores: prestadores.map((p) => ({
        id: p.id,
        nome: p.nome_fantasia || p.razao_social,
        razao_social: p.razao_social,
        cnpj: p.cnpj,
        contato_nome: p.contato_nome,
        email: p.contato_email,
        telefone: p.contato_telefone,
        area_atuacao: p.area_atuacao,
        valor_mensal: Number(p.valor_mensal_atual || 0),
        data_inicio: p.data_inicio_parceria,
        jaCadastrado: cnpjsPessoas.has(p.cnpj) || emailsPessoas.has(p.contato_email?.toLowerCase()),
      })),
      candidatos: candidatos.map((c) => ({
        id: c.id,
        nome: c.nome,
        email: c.email,
        telefone: c.telefone,
        cargo: c.cargo_atual || 'Colaborador',
        data_contratacao: c.data_contratacao,
        status: c.status,
        jaCadastrado: emailsPessoas.has(c.email?.toLowerCase()),
      })),
      rotinas: rotinas.map((r) => ({
        id: r.id,
        nome: r.nome_completo,
        tipo: r.tipo_integrado,
        cargo: r.cargo_funcao,
        departamento: r.departamento,
        email: r.email_contato,
        telefone: r.telefone_contato,
        documento: r.documento_identificacao,
        valor_contratado: Number(r.valor_contratado || 0),
        percentual: Number(r.percentual_conclusao || 0),
        gestor_nome: r.gestor_nome,
        gestor_responsavel: r.gestor_responsavel,
        data_inicio: r.data_inicio,
        jaCadastrado:
          (r.documento_identificacao && cnpjsPessoas.has(r.documento_identificacao)) ||
          (r.email_contato && emailsPessoas.has(r.email_contato.toLowerCase())),
      })),
    }
  },
}
