/**
 * Migração: 1741500046_seed_etapa4_dados.js
 *
 * Popula dados para teste e validação da Etapa 4:
 * 1. Projetos com identificadores, empresa responsável, cliente, referência externa
 * 2. Ocupação da posição POS-2026-TECH-001 por Lucas Ferreira Lima
 * 3. Alocações em projetos e destinos organizacionais (disponibilidade vs escopo)
 * 4. Flag is_demonstracao para permitir isolar dados demonstrativos vs operacionais
 */

migrate(
  (app) => {
    const colProjetos = app.findCollectionByNameOrId('projetos')
    const colAlocacoes = app.findCollectionByNameOrId('alocacoes')
    const colOcupacoes = app.findCollectionByNameOrId('ocupacoes_posicao')

    const empTech = app.findFirstRecordByData('empresas', 'sigla', 'EMP-02')
    const empMidia = app.findFirstRecordByData('empresas', 'sigla', 'EMP-03')
    const empOps = app.findFirstRecordByData('empresas', 'sigla', 'EMP-04')

    const userRh = app.findFirstRecordByData('users', 'email', 'severo.douglas2@gmail.com')
    const userTech = app.findFirstRecordByData('users', 'email', 'gestor@empresa.com')
    const userMidia = app.findFirstRecordByData('users', 'email', 'gestora.produto@empresa.com')

    const renatoPj = app.findFirstRecordByData('pessoas', 'nome', 'Renato Albuquerque')
    const lucasClt = app.findFirstRecordByData('pessoas', 'nome', 'Lucas Ferreira Lima')
    const camilaPj = app.findFirstRecordByData('pessoas', 'nome', 'Camila Vasconcelos')

    // 1. Projeto 1: Gateway Omni Pagamentos (Tech)
    let proj1
    try {
      proj1 = app.findFirstRecordByData('projetos', 'identificador', 'PRJ-TECH-2026-OMNI')
    } catch (_) {}

    if (!proj1) {
      proj1 = new Record(colProjetos)
      proj1.set('identificador', 'PRJ-TECH-2026-OMNI')
      proj1.set('nome', 'Plataforma Integrada de Liquidação e Pagamentos Omni')
      proj1.set('empresa_responsavel', empTech.id)
      proj1.set('bu_relacionada', empTech.id)
      proj1.set('responsavel', userTech.id)
      proj1.set('responsavel_nome', 'Carlos Mendonça')
      proj1.set('inicio_previsto', '2026-06-01 00:00:00.000Z')
      proj1.set('termino_previsto', '2027-03-31 00:00:00.000Z')
      proj1.set('situacao', 'Em andamento')
      proj1.set('cliente_nome', 'Banco Parceiro S.A.')
      proj1.set('contrato_comercial_ref', 'CONTRATO-COMERCIAL-2026-088')
      proj1.set('relacionamento_validado', true)
      proj1.set('is_demonstracao', false)
      app.save(proj1)
    }

    // 2. Projeto 2: Migração Multi-Cloud (Tech - Escopo Especializado)
    let proj2
    try {
      proj2 = app.findFirstRecordByData('projetos', 'identificador', 'PRJ-TECH-2026-FINOPS')
    } catch (_) {}

    if (!proj2) {
      proj2 = new Record(colProjetos)
      proj2.set('identificador', 'PRJ-TECH-2026-FINOPS')
      proj2.set('nome', 'Modernização de Infraestrutura e FinOps Kubernetes')
      proj2.set('empresa_responsavel', empTech.id)
      proj2.set('bu_relacionada', empTech.id)
      proj2.set('responsavel', userTech.id)
      proj2.set('responsavel_nome', 'Carlos Mendonça')
      proj2.set('inicio_previsto', '2026-08-01 00:00:00.000Z')
      proj2.set('termino_previsto', '2026-12-31 00:00:00.000Z')
      proj2.set('situacao', 'Em andamento')
      proj2.set('referencia_externa', 'JIRA-FINOPS-CORE')
      proj2.set('relacionamento_validado', true)
      proj2.set('is_demonstracao', false)
      app.save(proj2)
    }

    // 3. Projeto 3: Campanha Institucional Marca SouYess (Vértice Mídia)
    let proj3
    try {
      proj3 = app.findFirstRecordByData('projetos', 'identificador', 'PRJ-MIDIA-2026-BRAND')
    } catch (_) {}

    if (!proj3) {
      proj3 = new Record(colProjetos)
      proj3.set('identificador', 'PRJ-MIDIA-2026-BRAND')
      proj3.set('nome', 'Campanha de Employer Branding 2026')
      proj3.set('empresa_responsavel', empMidia.id)
      proj3.set('bu_relacionada', empMidia.id)
      proj3.set('responsavel', userMidia.id)
      proj3.set('responsavel_nome', 'Mariana Siqueira')
      proj3.set('inicio_previsto', '2026-07-01 00:00:00.000Z')
      proj3.set('termino_previsto', '2026-12-31 00:00:00.000Z')
      proj3.set('situacao', 'Em andamento')
      proj3.set('cliente_nome', 'SouYess Holding')
      proj3.set('contrato_comercial_ref', 'REF-INFORMATIVA-INTERNA')
      proj3.set('relacionamento_validado', false) // Referência apenas informativa
      proj3.set('is_demonstracao', true)
      app.save(proj3)
    }

    // Ocupação de Posição Planejada Aprovada: POS-2026-TECH-001 ocupada por Lucas Ferreira Lima
    try {
      const posBackend = app.findFirstRecordByData(
        'posicoes_planejadas',
        'codigo',
        'POS-2026-TECH-001',
      )
      let ocupacaoLucas
      try {
        ocupacaoLucas = app.findFirstRecordByData('ocupacoes_posicao', 'posicao', posBackend.id)
      } catch (_) {}

      if (!ocupacaoLucas) {
        ocupacaoLucas = new Record(colOcupacoes)
        ocupacaoLucas.set('posicao', posBackend.id)
        ocupacaoLucas.set('pessoa', lucasClt.id)
        ocupacaoLucas.set('data_inicio', '2026-10-01 00:00:00.000Z')
        ocupacaoLucas.set('situacao', 'ativa')
        ocupacaoLucas.set('origem_vinculacao', 'transferencia')
        ocupacaoLucas.set('registrado_por', userRh.id)
        ocupacaoLucas.set(
          'observacoes',
          'Alocação formalizada na posição planejada do plano Tech aprovado.',
        )
        ocupacaoLucas.set('is_demonstracao', false)
        app.save(ocupacaoLucas)
      }
    } catch (e) {
      console.log('[Seed Etapa 4] Posição POS-2026-TECH-001 não encontrada ou já ocupada:', e)
    }

    // Alocações de teste:
    // Lucas Ferreira: 50% em PRJ-TECH-2026-OMNI para o mês de outubro de 2026
    let alocLucas
    try {
      const existingAlocs = app.findRecordsByFilter(
        'alocacoes',
        `pessoa = '${lucasClt.id}' && projeto = '${proj1.id}'`,
        '',
        1,
        0,
      )
      if (existingAlocs.length > 0) alocLucas = existingAlocs[0]
    } catch (_) {}

    if (!alocLucas) {
      alocLucas = new Record(colAlocacoes)
      alocLucas.set('pessoa', lucasClt.id)
      alocLucas.set('projeto', proj1.id)
      alocLucas.set('destino_organizacional', 'Squad Pagamentos Omni')
      alocLucas.set('periodo_inicio', '2026-10-01 00:00:00.000Z')
      alocLucas.set('periodo_fim', '2026-10-31 00:00:00.000Z')
      alocLucas.set('modalidade_capacidade', 'disponibilidade')
      alocLucas.set('unidade', 'percentual')
      alocLucas.set('quantidade', 50)
      alocLucas.set('papel_desempenhado', 'Backend Engineer')
      alocLucas.set('situacao', 'confirmada')
      alocLucas.set('responsavel', userTech.id)
      alocLucas.set('responsavel_nome', 'Carlos Mendonça')
      alocLucas.set('justificativa', 'Construção da mensageria do gateway.')
      alocLucas.set('is_demonstracao', false)
      app.save(alocLucas)
    }

    // Renato Albuquerque: Alocação por ESCOPO (entregável IaC) em PRJ-TECH-2026-FINOPS
    let alocRenato
    try {
      const existingAlocsRenato = app.findRecordsByFilter(
        'alocacoes',
        `pessoa = '${renatoPj.id}' && projeto = '${proj2.id}'`,
        '',
        1,
        0,
      )
      if (existingAlocsRenato.length > 0) alocRenato = existingAlocsRenato[0]
    } catch (_) {}

    if (!alocRenato) {
      alocRenato = new Record(colAlocacoes)
      alocRenato.set('pessoa', renatoPj.id)
      alocRenato.set('projeto', proj2.id)
      alocRenato.set('destino_organizacional', 'Módulo FinOps Terraform')
      alocRenato.set('periodo_inicio', '2026-11-01 00:00:00.000Z')
      alocRenato.set('periodo_fim', '2026-12-31 00:00:00.000Z')
      alocRenato.set('modalidade_capacidade', 'escopo')
      alocRenato.set('unidade', 'entregavel_escopo')
      alocRenato.set('quantidade', 1)
      alocRenato.set('papel_desempenhado', 'Especialista Cloud FinOps')
      alocRenato.set('situacao', 'confirmada')
      alocRenato.set('responsavel', userTech.id)
      alocRenato.set('responsavel_nome', 'Carlos Mendonça')
      alocRenato.set(
        'justificativa',
        'Entrega de módulos Terraform com esteira de auditoria de custos.',
      )
      alocRenato.set('is_demonstracao', false)
      app.save(alocRenato)
    }
  },
  (app) => {
    // Reversão
  },
)
