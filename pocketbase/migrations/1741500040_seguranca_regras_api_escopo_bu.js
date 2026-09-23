/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração: 1741500040_seguranca_regras_api_escopo_bu.js
 *
 * Objetivo:
 * Etapa 1 — Segurança e Confiabilidade:
 * Substituir as regras genéricas ("@request.auth.id != ''") por regras de autorização
 * escopadas no servidor baseadas no perfil do usuário:
 * - RH / Recrutador: Acesso consolidado ao grupo econômico
 * - Diretoria / Executivo: Leitura ampla consolidada, escrita restrita ao RH
 * - Gestor Contratante: Escopado à própria BU / Empresa e área correspondente.
 *
 * PROCEDIMENTO DE RECUPERAÇÃO SEGURA:
 * Caso alguma regra cause impacto imprevisto em ambiente de desenvolvimento/homologação:
 * 1. NÃO restaurar a regra permissiva anterior ("@request.auth.id != ''") que abria todo o banco.
 * 2. Identificar a coleção e ação afetada (ex: list, create ou update).
 * 3. Aplicar correção pontual ajustando a cláusula específica da coleção via migração corretiva aditiva.
 * 4. Manter sempre o isolamento entre BUs e a integridade de escrita garantida no servidor.
 */

migrate(
  (app) => {
    // Helper para atualizar regras com log seguro
    const aplicarRegras = (nomeCol, regras) => {
      try {
        const col = app.findCollectionByNameOrId(nomeCol)
        if (regras.listRule !== undefined) col.listRule = regras.listRule
        if (regras.viewRule !== undefined) col.viewRule = regras.viewRule
        if (regras.createRule !== undefined) col.createRule = regras.createRule
        if (regras.updateRule !== undefined) col.updateRule = regras.updateRule
        if (regras.deleteRule !== undefined) col.deleteRule = regras.deleteRule
        app.save(col)
        console.log(`[1741500040] Regras aplicadas com sucesso em: ${nomeCol}`)
      } catch (err) {
        console.log(`[1741500040] Erro ao aplicar regras em ${nomeCol}:`, err)
        throw err
      }
    }

    // Regras de macro-perfis reutilizáveis
    // RH ou Diretoria para leitura ampla
    const rhOuDiretoria =
      "@request.auth.id != '' && (@request.auth.cargo_funcao = 'RH / Recrutador' || @request.auth.cargo_funcao = 'Diretoria / Executivo')"
    // Apenas RH
    const apenasRh = "@request.auth.id != '' && @request.auth.cargo_funcao = 'RH / Recrutador'"

    // =========================================================================
    // 1. Coleção: users
    // =========================================================================
    // Leitura: qualquer autenticado pode ver colegas/gestores
    // Update: o próprio usuário pode editar seu registro (com hook bloqueando campos sensíveis) OU RH
    // Create/Delete: superusuário / sistema
    aplicarRegras('users', {
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: null,
      updateRule: `@request.auth.id != '' && (id = @request.auth.id || @request.auth.cargo_funcao = 'RH / Recrutador')`,
      deleteRule: null,
    })

    // =========================================================================
    // 2. Coleção: pessoas
    // =========================================================================
    // List/View: RH/Diretoria veem todas; Gestor vê apenas se pertencer à mesma empresa OU for o gestor_responsavel
    // Create/Update: RH pode tudo; Gestor pode atualizar registros de sua empresa ou sob sua responsabilidade
    // Delete: Apenas RH
    const pessoasRead = `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && empresa = @request.auth.empresa || gestor_responsavel = @request.auth.id))`
    const pessoasWrite = `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && empresa = @request.auth.empresa || gestor_responsavel = @request.auth.id))`

    aplicarRegras('pessoas', {
      listRule: pessoasRead,
      viewRule: pessoasRead,
      createRule: pessoasWrite,
      updateRule: pessoasWrite,
      deleteRule: apenasRh,
    })

    // =========================================================================
    // 3. Coleção: contratos
    // =========================================================================
    const contratosRead = `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && empresa = @request.auth.empresa || gestor_responsavel = @request.auth.id || pessoa.empresa = @request.auth.empresa))`
    const contratosUpdate = `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && empresa = @request.auth.empresa || gestor_responsavel = @request.auth.id))`

    aplicarRegras('contratos', {
      listRule: contratosRead,
      viewRule: contratosRead,
      createRule: apenasRh,
      updateRule: contratosUpdate,
      deleteRule: apenasRh,
    })

    // =========================================================================
    // 4. Coleção: contratos_pj (legada)
    // =========================================================================
    const contratosPjRead = `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && gestor_responsavel = @request.auth.id)`
    aplicarRegras('contratos_pj', {
      listRule: contratosPjRead,
      viewRule: contratosPjRead,
      createRule: apenasRh,
      updateRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && gestor_responsavel = @request.auth.id)`,
      deleteRule: apenasRh,
    })

    // =========================================================================
    // 5. Coleção: prestadores_pj
    // =========================================================================
    // List/View: RH/Diretoria vê tudo; Gestor vê através de contratos ou rotinas associadas
    aplicarRegras('prestadores_pj', {
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: apenasRh,
      updateRule: apenasRh,
      deleteRule: apenasRh,
    })

    // =========================================================================
    // 6. Coleção: metas_orcamento_departamento (Valores financeiros de teto)
    // =========================================================================
    // List/View: Usuários autenticados (RH, Diretoria e Gestor para visualização de dashboards)
    // Create/Update/Delete: EXCLUSIVAMENTE RH
    aplicarRegras('metas_orcamento_departamento', {
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: apenasRh,
      updateRule: apenasRh,
      deleteRule: apenasRh,
    })

    // =========================================================================
    // 7. Coleção: vagas
    // =========================================================================
    // Gestor pode criar vaga para si/sua área, atualizar vagas onde é responsável (aprovar/devolver)
    const vagasRead = `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante')`
    const vagasUpdate = `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && gestor_responsavel = @request.auth.id)`

    aplicarRegras('vagas', {
      listRule: vagasRead,
      viewRule: vagasRead,
      createRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante')`,
      updateRule: vagasUpdate,
      deleteRule: apenasRh,
    })

    // =========================================================================
    // 8. Coleção: candidatos
    // =========================================================================
    // List/View: RH/Diretoria tudo; Gestor vê candidatos vinculados à vaga onde é gestor_responsavel
    const candidatosRead = `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (vaga.gestor_responsavel = @request.auth.id || vaga = null))`
    const candidatosUpdate = `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && vaga.gestor_responsavel = @request.auth.id)`

    aplicarRegras('candidatos', {
      listRule: candidatosRead,
      viewRule: candidatosRead,
      createRule: apenasRh, // criação pública é feita via hook /backend/v1/public/candidatar
      updateRule: candidatosUpdate,
      deleteRule: apenasRh,
    })

    // =========================================================================
    // 9. Coleções de fluxo de candidatos (pipeline, entrevistas, relatorios, etc.)
    // =========================================================================
    aplicarRegras('pipeline', {
      listRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && vaga.gestor_responsavel = @request.auth.id)`,
      viewRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && vaga.gestor_responsavel = @request.auth.id)`,
      createRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && vaga.gestor_responsavel = @request.auth.id)`,
      updateRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && vaga.gestor_responsavel = @request.auth.id)`,
      deleteRule: apenasRh,
    })

    aplicarRegras('entrevistas', {
      listRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (vaga.gestor_responsavel = @request.auth.id || responsavel_usuario = @request.auth.id))`,
      viewRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (vaga.gestor_responsavel = @request.auth.id || responsavel_usuario = @request.auth.id))`,
      createRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && vaga.gestor_responsavel = @request.auth.id)`,
      updateRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (vaga.gestor_responsavel = @request.auth.id || responsavel_usuario = @request.auth.id))`,
      deleteRule: apenasRh,
    })

    aplicarRegras('feedbacks_gestor', {
      listRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (gestor = @request.auth.id || vaga.gestor_responsavel = @request.auth.id))`,
      viewRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (gestor = @request.auth.id || vaga.gestor_responsavel = @request.auth.id))`,
      createRule: `@request.auth.id != '' && (gestor = @request.auth.id || @request.auth.cargo_funcao = 'RH / Recrutador')`,
      updateRule: `@request.auth.id != '' && (gestor = @request.auth.id || @request.auth.cargo_funcao = 'RH / Recrutador')`,
      deleteRule: apenasRh,
    })

    aplicarRegras('questionarios_vaga', {
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && vaga.gestor_responsavel = @request.auth.id)`,
      updateRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && vaga.gestor_responsavel = @request.auth.id)`,
      deleteRule: apenasRh,
    })

    aplicarRegras('respostas_triagem', {
      listRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && vaga.gestor_responsavel = @request.auth.id)`,
      viewRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && vaga.gestor_responsavel = @request.auth.id)`,
      createRule: apenasRh, // submissão pública via hook
      updateRule: apenasRh,
      deleteRule: apenasRh,
    })

    aplicarRegras('percepcoes_rh', {
      listRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && visibilidade = 'Compartilhada com o gestor' && vaga.gestor_responsavel = @request.auth.id)`,
      viewRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && visibilidade = 'Compartilhada com o gestor' && vaga.gestor_responsavel = @request.auth.id)`,
      createRule: apenasRh,
      updateRule: `${apenasRh} && autor = @request.auth.id`,
      deleteRule: `${apenasRh} && autor = @request.auth.id`,
    })

    aplicarRegras('analises_video_ia', {
      listRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && vaga.gestor_responsavel = @request.auth.id)`,
      viewRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && vaga.gestor_responsavel = @request.auth.id)`,
      createRule: apenasRh,
      updateRule: apenasRh,
      deleteRule: apenasRh,
    })

    aplicarRegras('ofertas', {
      listRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && vaga.gestor_responsavel = @request.auth.id)`,
      viewRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && vaga.gestor_responsavel = @request.auth.id)`,
      createRule: apenasRh,
      updateRule: apenasRh,
      deleteRule: apenasRh,
    })

    // =========================================================================
    // 10. Coleção: rotinas_integracao (Onboarding / Integração)
    // =========================================================================
    const rotinasRead = `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && gestor_responsavel = @request.auth.id)`
    aplicarRegras('rotinas_integracao', {
      listRule: rotinasRead,
      viewRule: rotinasRead,
      createRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante')`,
      updateRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && gestor_responsavel = @request.auth.id)`,
      deleteRule: apenasRh,
    })

    // =========================================================================
    // 11. Coleção: apontamentos_horas (Lançamento de horas pelo gestor)
    // =========================================================================
    // Gestor pode ver e criar apontamentos apenas para pessoas da sua BU/empresa ou sob sua gestão
    const horasRead = `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && pessoa.empresa = @request.auth.empresa || pessoa.gestor_responsavel = @request.auth.id))`
    const horasWrite = `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && pessoa.empresa = @request.auth.empresa || pessoa.gestor_responsavel = @request.auth.id))`

    aplicarRegras('apontamentos_horas', {
      listRule: horasRead,
      viewRule: horasRead,
      createRule: horasWrite,
      updateRule: horasWrite,
      deleteRule: apenasRh,
    })

    // =========================================================================
    // 12. Coleção: fechamentos_competencia (Ciclo de fechamento mensal)
    // =========================================================================
    const fechamentosRead = `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && pessoa.empresa = @request.auth.empresa || pessoa.gestor_responsavel = @request.auth.id || gestor_validador = @request.auth.id))`
    const fechamentosUpdate = `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && pessoa.empresa = @request.auth.empresa || pessoa.gestor_responsavel = @request.auth.id || gestor_validador = @request.auth.id))`

    aplicarRegras('fechamentos_competencia', {
      listRule: fechamentosRead,
      viewRule: fechamentosRead,
      createRule: apenasRh,
      updateRule: fechamentosUpdate,
      deleteRule: apenasRh,
    })

    // =========================================================================
    // 13. Coleção: notas_fiscais & notas_fiscais_pj
    // =========================================================================
    const nfRead = `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && pessoa.empresa = @request.auth.empresa || pessoa.gestor_responsavel = @request.auth.id))`
    aplicarRegras('notas_fiscais', {
      listRule: nfRead,
      viewRule: nfRead,
      createRule: apenasRh,
      updateRule: apenasRh,
      deleteRule: apenasRh,
    })

    aplicarRegras('notas_fiscais_pj', {
      listRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && contrato.gestor_responsavel = @request.auth.id)`,
      viewRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && contrato.gestor_responsavel = @request.auth.id)`,
      createRule: apenasRh,
      updateRule: apenasRh,
      deleteRule: apenasRh,
    })

    // =========================================================================
    // 14. Coleção: documentos_pessoa & documentos_pj
    // =========================================================================
    const docPessoaRead = `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && pessoa.empresa = @request.auth.empresa || pessoa.gestor_responsavel = @request.auth.id))`
    aplicarRegras('documentos_pessoa', {
      listRule: docPessoaRead,
      viewRule: docPessoaRead,
      createRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && pessoa.empresa = @request.auth.empresa || pessoa.gestor_responsavel = @request.auth.id))`,
      updateRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && pessoa.empresa = @request.auth.empresa || pessoa.gestor_responsavel = @request.auth.id))`,
      deleteRule: apenasRh,
    })

    aplicarRegras('documentos_pj', {
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: apenasRh,
      updateRule: apenasRh,
      deleteRule: apenasRh,
    })

    // =========================================================================
    // 15. Coleções: aditivos_pj, marcos_lifecycle_pj, avaliacoes_prestador_pj
    // =========================================================================
    aplicarRegras('aditivos_pj', {
      listRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && contrato.gestor_responsavel = @request.auth.id)`,
      viewRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && contrato.gestor_responsavel = @request.auth.id)`,
      createRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && contrato.gestor_responsavel = @request.auth.id)`,
      updateRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && contrato.gestor_responsavel = @request.auth.id)`,
      deleteRule: apenasRh,
    })

    aplicarRegras('marcos_lifecycle_pj', {
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: apenasRh,
      updateRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante')`,
      deleteRule: apenasRh,
    })

    aplicarRegras('avaliacoes_prestador_pj', {
      listRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (avaliador = @request.auth.id || contrato.gestor_responsavel = @request.auth.id))`,
      viewRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (avaliador = @request.auth.id || contrato.gestor_responsavel = @request.auth.id))`,
      createRule: `@request.auth.id != '' && (avaliador = @request.auth.id || @request.auth.cargo_funcao = 'RH / Recrutador')`,
      updateRule: `@request.auth.id != '' && (avaliador = @request.auth.id || @request.auth.cargo_funcao = 'RH / Recrutador')`,
      deleteRule: apenasRh,
    })

    // =========================================================================
    // 16. Coleções: contrato_versoes, contrato_assinaturas, modelos_contrato
    // =========================================================================
    const ctVersoesRead = `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && contrato.empresa = @request.auth.empresa || contrato.gestor_responsavel = @request.auth.id))`
    aplicarRegras('contrato_versoes', {
      listRule: ctVersoesRead,
      viewRule: ctVersoesRead,
      createRule: apenasRh,
      updateRule: apenasRh,
      deleteRule: apenasRh,
    })

    aplicarRegras('contrato_assinaturas', {
      listRule: ctVersoesRead,
      viewRule: ctVersoesRead,
      createRule: apenasRh,
      updateRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && contrato.gestor_responsavel = @request.auth.id)`,
      deleteRule: apenasRh,
    })

    aplicarRegras('modelos_contrato', {
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: apenasRh,
      updateRule: apenasRh,
      deleteRule: apenasRh,
    })

    // =========================================================================
    // 17. Coleções: beneficios_vinculo, programacoes_descanso, offboardings
    // =========================================================================
    const benRead = `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && pessoa.empresa = @request.auth.empresa || pessoa.gestor_responsavel = @request.auth.id))`
    aplicarRegras('beneficios_vinculo', {
      listRule: benRead,
      viewRule: benRead,
      createRule: apenasRh,
      updateRule: apenasRh,
      deleteRule: apenasRh,
    })

    aplicarRegras('programacoes_descanso', {
      listRule: benRead,
      viewRule: benRead,
      createRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && pessoa.empresa = @request.auth.empresa || pessoa.gestor_responsavel = @request.auth.id))`,
      updateRule: `${apenasRh} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && pessoa.empresa = @request.auth.empresa || pessoa.gestor_responsavel = @request.auth.id))`,
      deleteRule: apenasRh,
    })

    aplicarRegras('offboardings', {
      listRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && empresa = @request.auth.empresa || responsavel_rh = @request.auth.id))`,
      viewRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (@request.auth.empresa != '' && empresa = @request.auth.empresa || responsavel_rh = @request.auth.id))`,
      createRule: apenasRh,
      updateRule: apenasRh,
      deleteRule: apenasRh,
    })

    // =========================================================================
    // 18. Coleções estruturais e timelines
    // =========================================================================
    aplicarRegras('empresas', {
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: apenasRh,
      updateRule: apenasRh,
      deleteRule: apenasRh,
    })

    aplicarRegras('areas', {
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: apenasRh,
      updateRule: apenasRh,
      deleteRule: apenasRh,
    })

    aplicarRegras('eventos_timeline_pj', {
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: apenasRh,
      deleteRule: apenasRh,
    })

    aplicarRegras('eventos_timeline_candidato', {
      listRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (candidato.vaga.gestor_responsavel = @request.auth.id || candidato.vaga = null))`,
      viewRule: `${rhOuDiretoria} || (@request.auth.cargo_funcao = 'Gestor Contratante' && (candidato.vaga.gestor_responsavel = @request.auth.id || candidato.vaga = null))`,
      createRule: "@request.auth.id != ''",
      updateRule: apenasRh,
      deleteRule: apenasRh,
    })

    aplicarRegras('notificacoes_rh', {
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != ''",
      deleteRule: apenasRh,
    })
  },
  (app) => {
    // Reversão segura: restabelece autenticação básica controlada se necessário
    const colecoes = [
      'users',
      'pessoas',
      'contratos',
      'contratos_pj',
      'prestadores_pj',
      'metas_orcamento_departamento',
      'vagas',
      'candidatos',
      'pipeline',
      'entrevistas',
      'feedbacks_gestor',
      'questionarios_vaga',
      'respostas_triagem',
      'percepcoes_rh',
      'analises_video_ia',
      'ofertas',
      'rotinas_integracao',
      'apontamentos_horas',
      'fechamentos_competencia',
      'notas_fiscais',
      'notas_fiscais_pj',
      'documentos_pessoa',
      'documentos_pj',
      'aditivos_pj',
      'marcos_lifecycle_pj',
      'avaliacoes_prestador_pj',
      'contrato_versoes',
      'contrato_assinaturas',
      'modelos_contrato',
      'beneficios_vinculo',
      'programacoes_descanso',
      'offboardings',
      'empresas',
      'areas',
      'eventos_timeline_pj',
      'eventos_timeline_candidato',
      'notificacoes_rh',
    ]

    for (const cName of colecoes) {
      try {
        const col = app.findCollectionByNameOrId(cName)
        col.listRule = "@request.auth.id != ''"
        col.viewRule = "@request.auth.id != ''"
        col.createRule = "@request.auth.id != ''"
        col.updateRule = "@request.auth.id != ''"
        col.deleteRule = "@request.auth.id != ''"
        app.save(col)
      } catch (_) {}
    }
  },
)
