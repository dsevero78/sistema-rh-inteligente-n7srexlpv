/**
 * Migração: 1741500044_seed_etapa3_planos_demandas_posicoes.js
 *
 * Popula dados demonstrativos da Etapa 3 em homologação:
 *  - Plano v1 Aprovado para BU Tecnologia (com snapshot íntegro, demandas e posições)
 *  - Plano v1 Rascunho para BU Vértice Mídia
 *  - Plano v1 Em Análise para BU Operações (com alçada bloqueada por padrão)
 *  - Preserva correspondências pendentes e escopos
 */

migrate(
  (app) => {
    // 1. Obter referências seguras de empresas e usuários
    const userRh = app.findFirstRecordByData('users', 'email', 'severo.douglas2@gmail.com')
    const userTech = app.findFirstRecordByData('users', 'email', 'gestor@empresa.com')
    const userMidia = app.findFirstRecordByData('users', 'email', 'gestora.produto@empresa.com')
    const userOps = app.findFirstRecordByData('users', 'email', 'gestor.operacoes@empresa.com')

    const empTech = app.findFirstRecordByData('empresas', 'sigla', 'EMP-02')
    const empMidia = app.findFirstRecordByData('empresas', 'sigla', 'EMP-03')
    const empOps = app.findFirstRecordByData('empresas', 'sigla', 'EMP-04')

    const areaEng = app.findFirstRecordByData('areas', 'id', 'q3j60jnmloq9qnl')
    const areaMkt = app.findFirstRecordByData('areas', 'id', 'va0m01ydzxj2nc6')
    const areaOps = app.findFirstRecordByData('areas', 'id', 'b1zb2q1saq8wsui')

    const cargoBackend = app.findFirstRecordByData('cargos', 'codigo', 'CARGO-ENG-02')
    const cargoDevOps = app.findFirstRecordByData('cargos', 'codigo', 'CARGO-ENG-01')
    const cargoMkt = app.findFirstRecordByData('cargos', 'codigo', 'CARGO-MKT-01')
    const cargoOps = app.findFirstRecordByData('cargos', 'codigo', 'CARGO-OPS-01')

    const ccSw = app.findFirstRecordByData('centros_custo', 'codigo', 'CC-ENG-SW')
    const ccCloud = app.findFirstRecordByData('centros_custo', 'codigo', 'CC-ENG-CLOUD')
    const ccBrand = app.findFirstRecordByData('centros_custo', 'codigo', 'CC-MKT-BRAND')
    const ccFac = app.findFirstRecordByData('centros_custo', 'codigo', 'CC-OPS-FAC')

    const compTech01 = app.findFirstRecordByData('competencias', 'codigo', 'COMP-TEC-01')
    const compTech02 = app.findFirstRecordByData('competencias', 'codigo', 'COMP-TEC-02')

    const colPlanos = app.findCollectionByNameOrId('planos_capacidade')
    const colDemandas = app.findCollectionByNameOrId('demandas_planejadas')
    const colPosicoes = app.findCollectionByNameOrId('posicoes_planejadas')

    // -------------------------------------------------------------------------
    // PLANO 1: BU Tecnologia - APROVADO (com snapshot histórico imutável)
    // -------------------------------------------------------------------------
    let planoTech
    try {
      planoTech = app.findFirstRecordByData('planos_capacidade', 'codigo', 'PLANO-2026-TECH-01')
    } catch (_) {}

    if (!planoTech) {
      planoTech = new Record(colPlanos)
      planoTech.set('codigo', 'PLANO-2026-TECH-01')
      planoTech.set('nome', 'Plano Estratégico de Capacidade Tech Q3/Q4')
      planoTech.set('periodo_referencia', '2026-Q3/Q4')
      planoTech.set('empresa', empTech.id)
      planoTech.set('area', areaEng.id)
      planoTech.set('responsavel', userTech.id)
      planoTech.set('responsavel_nome', 'Carlos Mendonça')
      planoTech.set(
        'objetivo',
        'Expansão da sustentação das plataformas core de microsserviços e resiliência cloud.',
      )
      planoTech.set(
        'premissas',
        'Arquitetura descentralizada em Kubernetes; orçamento preliminar alinhado ao planejamento plurianual.',
      )
      planoTech.set('versao_numero', 1)
      planoTech.set('rotulo_versao', 'v1.0')
      planoTech.set('situacao', 'Aprovado')
      planoTech.set('data_submissao', '2026-09-10 10:00:00.000Z')
      planoTech.set('submetido_por', userTech.id)
      planoTech.set('data_decisao', '2026-09-15 14:30:00.000Z')
      planoTech.set('decidido_por', userRh.id)
      planoTech.set('alcada_aprovacao_definida', true)
      app.save(planoTech)

      // Demanda 1 para BU Tech
      const dem1 = new Record(colDemandas)
      dem1.set('plano', planoTech.id)
      dem1.set('codigo', 'DEM-TECH-2026-001')
      dem1.set('origem', 'Expansão de Microserviços de Pagamento')
      dem1.set(
        'problema_necessidade',
        'Sobrecarga de chamadas concorrentes gerando fila nos serviços de liquidação.',
      )
      dem1.set('resultado_esperado', 'Redução do P99 de latência para menos de 180ms.')
      dem1.set('responsavel', userTech.id)
      dem1.set('responsavel_nome', 'Carlos Mendonça')
      dem1.set('empresa', empTech.id)
      dem1.set('area', areaEng.id)
      dem1.set('periodo_necessario', '2026-Q3')
      dem1.set('data_necessaria', '2026-10-01 00:00:00.000Z')
      dem1.set('prioridade', 'Alta')
      dem1.set('grau_confirmacao', 'confirmada')
      dem1.set('quantidade', 2)
      dem1.set('unidade_necessidade', 'posicoes_engenharia')
      dem1.set('premissas', 'Contratação via modelo CLT com stack Go/Node/PostgreSQL.')
      dem1.set(
        'consequencia_nao_atendimento',
        'Risco de indisponibilidade em janelas de pico financeiro e perda de SLA contratual.',
      )
      dem1.set('competencias_necessarias', [
        {
          competencia_id: compTech02.id,
          competencia_codigo: compTech02.getString('codigo'),
          competencia_nome: compTech02.getString('nome'),
          nivel_minimo: 'Nivel_3_Avancado',
        },
      ])
      dem1.set('referencia_projeto_cliente', 'Projeto Plataforma Pagamentos Omni (Informativo)')
      dem1.set('projeto_nao_vinculado_info', true)
      app.save(dem1)

      // Demanda 2 exploratória
      const dem2 = new Record(colDemandas)
      dem2.set('plano', planoTech.id)
      dem2.set('codigo', 'DEM-TECH-2026-002')
      dem2.set('origem', 'Migração Multi-Cloud & FinOps')
      dem2.set(
        'problema_necessidade',
        'Consolidação de workloads para mitigar dependência de provedor único.',
      )
      dem2.set('resultado_esperado', 'Otimização de até 22% dos custos fixos de infraestrutura.')
      dem2.set('responsavel', userTech.id)
      dem2.set('responsavel_nome', 'Carlos Mendonça')
      dem2.set('empresa', empTech.id)
      dem2.set('area', areaEng.id)
      dem2.set('periodo_necessario', '2026-Q4')
      dem2.set('data_necessaria', '2026-11-15 00:00:00.000Z')
      dem2.set('prioridade', 'Media')
      dem2.set('grau_confirmacao', 'provavel')
      dem2.set('quantidade', 1)
      dem2.set('unidade_necessidade', 'especialista_cloud')
      dem2.set('premissas', 'Necessidade dependente de validação orçamentária final.')
      dem2.set(
        'consequencia_nao_atendimento',
        'Adiamento da modernização de esteiras multi-região.',
      )
      dem2.set('competencias_necessarias', [
        {
          competencia_id: compTech01.id,
          competencia_codigo: compTech01.getString('codigo'),
          competencia_nome: compTech01.getString('nome'),
          nivel_minimo: 'Nivel_4_Especialista',
        },
      ])
      app.save(dem2)

      // Posição 1: Nova posição vinculada à Demanda 1
      const pos1 = new Record(colPosicoes)
      pos1.set('plano', planoTech.id)
      pos1.set('codigo', 'POS-2026-TECH-001')
      pos1.set('demanda', dem1.id)
      pos1.set('cargo', cargoBackend.id)
      pos1.set('empresa', empTech.id)
      pos1.set('area', areaEng.id)
      pos1.set('centro_custo', ccSw.id)
      pos1.set(
        'proposito_resultados',
        'Desenvolvimento de pipelines de mensagens resilientes e APIs REST assíncronas.',
      )
      pos1.set('competencias_exigidas', [
        {
          competencia_id: compTech02.id,
          competencia_codigo: compTech02.getString('codigo'),
          competencia_nome: compTech02.getString('nome'),
          nivel_minimo: 'Nivel_3_Avancado',
        },
      ])
      pos1.set('criticidade', 'Alta')
      pos1.set('modalidade_prevista', 'Remoto')
      pos1.set('tipo', 'nova_posicao')
      pos1.set('data_inicio_prevista', '2026-10-15 00:00:00.000Z')
      pos1.set('justificativa', 'Atender ao crescimento de tráfego do gateway corporativo.')
      pos1.set('custo_tipo', 'recorrente')
      pos1.set('custo_periodicidade', 'mensal')
      pos1.set('custo_estimado', 13500.0)
      pos1.set('custo_informado', true)
      pos1.set('custo_periodo_incidencia', 'Mensal a partir de out/2026')
      pos1.set('custo_fonte', 'Tabela Salarial Referência v0.0.85')
      pos1.set('custo_data_estimativa', '2026-09-10 00:00:00.000Z')
      pos1.set('custo_premissas', 'CLT Pleno + Encargos padrão + Benefícios.')
      pos1.set('lote_identificador', 'LOTE-BKND-2026-1')
      pos1.set('lote_indice', 1)
      app.save(pos1)

      // Posição 2: Segunda posição do lote da Demanda 1 (com custo explicitamente NÃO INFORMADO para teste)
      const pos2 = new Record(colPosicoes)
      pos2.set('plano', planoTech.id)
      pos2.set('codigo', 'POS-2026-TECH-002')
      pos2.set('demanda', dem1.id)
      pos2.set('cargo', cargoBackend.id)
      pos2.set('empresa', empTech.id)
      pos2.set('area', areaEng.id)
      pos2.set('centro_custo', ccSw.id)
      pos2.set(
        'proposito_resultados',
        'Desenvolvimento de pipelines de mensagens resilientes e suporte de microserviços.',
      )
      pos2.set('competencias_exigidas', [
        {
          competencia_id: compTech02.id,
          competencia_codigo: compTech02.getString('codigo'),
          competencia_nome: compTech02.getString('nome'),
          nivel_minimo: 'Nivel_3_Avancado',
        },
      ])
      pos2.set('criticidade', 'Alta')
      pos2.set('modalidade_prevista', 'Remoto')
      pos2.set('tipo', 'nova_posicao')
      pos2.set('data_inicio_prevista', '2026-11-01 00:00:00.000Z')
      pos2.set('justificativa', 'Complemento do squad de sustentação de mensageria.')
      // Custo NÃO INFORMADO propositalmente (custo_informado: false, não deve ser tratado como 0)
      pos2.set('custo_informado', false)
      pos2.set('custo_tipo', 'recorrente')
      pos2.set('custo_periodicidade', 'mensal')
      pos2.set('custo_fonte', 'Pendente de validação com People Finance')
      pos2.set('lote_identificador', 'LOTE-BKND-2026-1')
      pos2.set('lote_indice', 2)
      app.save(pos2)

      // Posição 3: Vinculada à Demanda 2 (Necessidade temporária / DevOps)
      const pos3 = new Record(colPosicoes)
      pos3.set('plano', planoTech.id)
      pos3.set('codigo', 'POS-2026-TECH-003')
      pos3.set('demanda', dem2.id)
      pos3.set('cargo', cargoDevOps.id)
      pos3.set('empresa', empTech.id)
      pos3.set('area', areaEng.id)
      pos3.set('centro_custo', ccCloud.id)
      pos3.set('proposito_resultados', 'Arquitetura de esteiras IaC (Terraform) e Kubernetes.')
      pos3.set('competencias_exigidas', [
        {
          competencia_id: compTech01.id,
          competencia_codigo: compTech01.getString('codigo'),
          competencia_nome: compTech01.getString('nome'),
          nivel_minimo: 'Nivel_4_Especialista',
        },
      ])
      pos3.set('criticidade', 'Critica')
      pos3.set('modalidade_prevista', 'Hibrido')
      pos3.set('tipo', 'necessidade_temporaria')
      pos3.set('data_inicio_prevista', '2026-11-15 00:00:00.000Z')
      pos3.set('data_termino_prevista', '2027-05-15 00:00:00.000Z')
      pos3.set('justificativa', 'Sprint extraordinária de transição de esteira de deploy.')
      pos3.set('custo_tipo', 'pontual')
      pos3.set('custo_periodicidade', 'unico')
      pos3.set('custo_estimado', 45000.0)
      pos3.set('custo_informado', true)
      pos3.set('custo_periodo_incidencia', 'Contrato fechado por entregável de 6 meses')
      pos3.set('custo_fonte', 'Proposta de prestação PJ referenciada')
      pos3.set('custo_data_estimativa', '2026-09-12 00:00:00.000Z')
      app.save(pos3)

      // Gravar snapshot completo de aprovação no plano Aprovado
      const snapshot = {
        versao: 'v1.0',
        codigo: planoTech.getString('codigo'),
        nome: planoTech.getString('nome'),
        data_aprovacao: '2026-09-15 14:30:00.000Z',
        aprovado_por: {
          id: userRh.id,
          nome: userRh.getString('name'),
          email: userRh.getString('email'),
          cargo: userRh.getString('cargo_funcao'),
        },
        empresa: {
          id: empTech.id,
          nome_fantasia: empTech.getString('nome_fantasia'),
          sigla: empTech.getString('sigla'),
        },
        area: {
          id: areaEng.id,
          nome: areaEng.getString('nome'),
        },
        demandas: [
          {
            id: dem1.id,
            codigo: dem1.getString('codigo'),
            origem: dem1.getString('origem'),
            problema_necessidade: dem1.getString('problema_necessidade'),
            resultado_esperado: dem1.getString('resultado_esperado'),
            prioridade: dem1.getString('prioridade'),
            grau_confirmacao: dem1.getString('grau_confirmacao'),
            quantidade: dem1.getInt('quantidade'),
            consequencia_nao_atendimento: dem1.getString('consequencia_nao_atendimento'),
          },
          {
            id: dem2.id,
            codigo: dem2.getString('codigo'),
            origem: dem2.getString('origem'),
            problema_necessidade: dem2.getString('problema_necessidade'),
            resultado_esperado: dem2.getString('resultado_esperado'),
            prioridade: dem2.getString('prioridade'),
            grau_confirmacao: dem2.getString('grau_confirmacao'),
            quantidade: dem2.getInt('quantidade'),
            consequencia_nao_atendimento: dem2.getString('consequencia_nao_atendimento'),
          },
        ],
        posicoes: [
          {
            id: pos1.id,
            codigo: pos1.getString('codigo'),
            cargo_nome: cargoBackend.getString('nome'),
            cargo_codigo: cargoBackend.getString('codigo'),
            tipo: pos1.getString('tipo'),
            criticidade: pos1.getString('criticidade'),
            modalidade: pos1.getString('modalidade_prevista'),
            custo_estimado: pos1.getFloat('custo_estimado'),
            custo_informado: pos1.getBool('custo_informado'),
          },
          {
            id: pos2.id,
            codigo: pos2.getString('codigo'),
            cargo_nome: cargoBackend.getString('nome'),
            cargo_codigo: cargoBackend.getString('codigo'),
            tipo: pos2.getString('tipo'),
            criticidade: pos2.getString('criticidade'),
            modalidade: pos2.getString('modalidade_prevista'),
            custo_informado: false,
          },
          {
            id: pos3.id,
            codigo: pos3.getString('codigo'),
            cargo_nome: cargoDevOps.getString('nome'),
            cargo_codigo: cargoDevOps.getString('codigo'),
            tipo: pos3.getString('tipo'),
            criticidade: pos3.getString('criticidade'),
            modalidade: pos3.getString('modalidade_prevista'),
            custo_estimado: pos3.getFloat('custo_estimado'),
            custo_informado: pos3.getBool('custo_informado'),
          },
        ],
        resumo_custos: {
          total_recorrente_mensal: 13500.0,
          total_pontual: 45000.0,
          status_calculo: 'PARCIAL',
          posicoes_com_custo_informado: 2,
          posicoes_sem_custo_informado: 1,
        },
      }

      planoTech.set('snapshot_aprovacao', snapshot)
      planoTech.set(
        'hash_aprovacao',
        $security.sha256(JSON.stringify(snapshot) + '_PLANO-2026-TECH-01_v1.0'),
      )
      app.save(planoTech)
    }

    // -------------------------------------------------------------------------
    // PLANO 2: BU Vértice Mídia - RASCUNHO (Permite edição e testes de elaboração)
    // -------------------------------------------------------------------------
    let planoMidia
    try {
      planoMidia = app.findFirstRecordByData('planos_capacidade', 'codigo', 'PLANO-2026-MIDIA-01')
    } catch (_) {}

    if (!planoMidia) {
      planoMidia = new Record(colPlanos)
      planoMidia.set('codigo', 'PLANO-2026-MIDIA-01')
      planoMidia.set('nome', 'Planejamento de Força de Criação e Branding H2')
      planoMidia.set('periodo_referencia', '2026-H2')
      planoMidia.set('empresa', empMidia.id)
      planoMidia.set('area', areaMkt.id)
      planoMidia.set('responsavel', userMidia.id)
      planoMidia.set('responsavel_nome', 'Mariana Siqueira')
      planoMidia.set(
        'objetivo',
        'Estruturação da equipe para novas contas institucionais e campanhas de marca.',
      )
      planoMidia.set(
        'premissas',
        'Reforço em liderança criativa e formatos multimídia para employer branding.',
      )
      planoMidia.set('versao_numero', 1)
      planoMidia.set('rotulo_versao', 'v1.0')
      planoMidia.set('situacao', 'Rascunho')
      planoMidia.set('alcada_aprovacao_definida', false)
      app.save(planoMidia)

      const demMidia = new Record(colDemandas)
      demMidia.set('plano', planoMidia.id)
      demMidia.set('codigo', 'DEM-MIDIA-2026-001')
      demMidia.set('origem', 'Expansão de Campanhas Digitais')
      demMidia.set(
        'problema_necessidade',
        'Necessidade de criação de peças e campanhas com prazos reduzidos.',
      )
      demMidia.set('resultado_esperado', 'Aumento de 40% no volume de produção de materiais.')
      demMidia.set('responsavel', userMidia.id)
      demMidia.set('responsavel_nome', 'Mariana Siqueira')
      demMidia.set('empresa', empMidia.id)
      demMidia.set('area', areaMkt.id)
      demMidia.set('periodo_necessario', '2026-Q4')
      demMidia.set('data_necessaria', '2026-11-01 00:00:00.000Z')
      demMidia.set('prioridade', 'Alta')
      demMidia.set('grau_confirmacao', 'provavel')
      demMidia.set('quantidade', 1)
      demMidia.set('unidade_necessidade', 'posicao_branding')
      demMidia.set('premissas', 'Perfil híbrido em São Paulo.')
      demMidia.set(
        'consequencia_nao_atendimento',
        'Gargalo de entrega nos cronogramas de clientes.',
      )
      app.save(demMidia)

      const posMidia = new Record(colPosicoes)
      posMidia.set('plano', planoMidia.id)
      posMidia.set('codigo', 'POS-2026-MIDIA-001')
      posMidia.set('demanda', demMidia.id)
      posMidia.set('cargo', cargoMkt.id)
      posMidia.set('empresa', empMidia.id)
      posMidia.set('area', areaMkt.id)
      posMidia.set('centro_custo', ccBrand.id)
      posMidia.set(
        'proposito_resultados',
        'Criação de conceitos visuais e gestão de campanhas de atração.',
      )
      posMidia.set('criticidade', 'Media')
      posMidia.set('modalidade_prevista', 'Hibrido')
      posMidia.set('tipo', 'nova_posicao')
      posMidia.set('data_inicio_prevista', '2026-11-01 00:00:00.000Z')
      posMidia.set('justificativa', 'Atender à nova demanda de employer branding institucional.')
      posMidia.set('custo_tipo', 'recorrente')
      posMidia.set('custo_periodicidade', 'mensal')
      posMidia.set('custo_estimado', 11000.0)
      posMidia.set('custo_informado', true)
      posMidia.set('custo_fonte', 'Estimativa preliminar de RH')
      app.save(posMidia)
    }

    // -------------------------------------------------------------------------
    // PLANO 3: BU Operações - EM ANÁLISE (Congelado para edição, alçada restrita/bloqueada)
    // -------------------------------------------------------------------------
    let planoOps
    try {
      planoOps = app.findFirstRecordByData('planos_capacidade', 'codigo', 'PLANO-2026-OPS-01')
    } catch (_) {}

    if (!planoOps) {
      planoOps = new Record(colPlanos)
      planoOps.set('codigo', 'PLANO-2026-OPS-01')
      planoOps.set('nome', 'Dimensionamento de Serviços de Infraestrutura e Apoio')
      planoOps.set('periodo_referencia', '2026-Q4')
      planoOps.set('empresa', empOps.id)
      planoOps.set('area', areaOps.id)
      planoOps.set('responsavel', userOps.id)
      planoOps.set('responsavel_nome', 'Roberto Farias')
      planoOps.set(
        'objetivo',
        'Garantir dimensionamento adequado dos serviços corporativos compartilhados.',
      )
      planoOps.set('premissas', 'Suporte às rotinas prediais e facilities.')
      planoOps.set('versao_numero', 1)
      planoOps.set('rotulo_versao', 'v1.0')
      planoOps.set('situacao', 'Em análise')
      planoOps.set('data_submissao', '2026-09-18 09:00:00.000Z')
      planoOps.set('submetido_por', userOps.id)
      // Alçada ainda NÃO definida explicitamente (conforme item 7 do briefing: aprovação fica BLOQUEADA até definição)
      planoOps.set('alcada_aprovacao_definida', false)
      app.save(planoOps)

      const demOps = new Record(colDemandas)
      demOps.set('plano', planoOps.id)
      demOps.set('codigo', 'DEM-OPS-2026-001')
      demOps.set('origem', 'Atendimento aos novos hubs regionais')
      demOps.set('problema_necessidade', 'Ampliação dos postos presenciais em Campinas.')
      demOps.set('resultado_esperado', 'Manutenção do tempo de atendimento de tickets prediais.')
      demOps.set('responsavel', userOps.id)
      demOps.set('responsavel_nome', 'Roberto Farias')
      demOps.set('empresa', empOps.id)
      demOps.set('area', areaOps.id)
      demOps.set('periodo_necessario', '2026-Q4')
      demOps.set('data_necessaria', '2026-11-20 00:00:00.000Z')
      demOps.set('prioridade', 'Media')
      demOps.set('grau_confirmacao', 'confirmada')
      demOps.set('quantidade', 1)
      demOps.set('unidade_necessidade', 'analista_facilities')
      demOps.set('premissas', 'Presencial em Campinas.')
      demOps.set('consequencia_nao_atendimento', 'Degradação dos serviços de apoio ao time.')
      app.save(demOps)

      const posOps = new Record(colPosicoes)
      posOps.set('plano', planoOps.id)
      posOps.set('codigo', 'POS-2026-OPS-001')
      posOps.set('demanda', demOps.id)
      posOps.set('cargo', cargoOps.id)
      posOps.set('empresa', empOps.id)
      posOps.set('area', areaOps.id)
      posOps.set('centro_custo', ccFac.id)
      posOps.set('proposito_resultados', 'Gestão de contratos operacionais e infraestrutura.')
      posOps.set('criticidade', 'Media')
      posOps.set('modalidade_prevista', 'Presencial')
      posOps.set('tipo', 'nova_posicao')
      posOps.set('data_inicio_prevista', '2026-11-20 00:00:00.000Z')
      posOps.set('justificativa', 'Aumento de postos de trabalho presenciais.')
      posOps.set('custo_tipo', 'recorrente')
      posOps.set('custo_periodicidade', 'mensal')
      posOps.set('custo_estimado', 7800.0)
      posOps.set('custo_informado', true)
      posOps.set('custo_fonte', 'Média salarial da categoria')
      app.save(posOps)
    }

    console.log('[1741500044] Seed da Etapa 3 executado com sucesso.')
  },
  (app) => {
    console.log('[1741500044] Reversão de seed executada.')
  },
)
