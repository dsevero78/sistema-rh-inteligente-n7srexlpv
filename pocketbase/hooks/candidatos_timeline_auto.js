// ============================================================================
// Hook: Automação da Linha do Tempo do Candidato (candidatos_timeline_auto.js)
// Registra automaticamente eventos ricos na coleção 'eventos_timeline_candidato'
// para garantir que nenhuma ação do sistema ou backend fique órfã.
// ============================================================================

// 1. Gatilho quando um novo Candidato é criado (candidatura pública, indicação ou manual)
onRecordAfterCreateSuccess((e) => {
  try {
    const cand = e.record
    const candId = cand.id
    const canal = cand.getString('canal_origem') || 'Página de Carreira'
    const reprovadoAuto = cand.getBool('reprovado_triagem_auto')
    const motivoReprovacao = cand.getString('motivo_reprovacao_triagem')

    let vagaTitulo = ''
    const vagaId = cand.getString('vaga')
    if (vagaId) {
      try {
        const v = $app.findRecordById('vagas', vagaId)
        if (v) vagaTitulo = v.getString('titulo')
      } catch (_) {}
    }

    const timelineCol = $app.findCollectionByNameOrId('eventos_timeline_candidato')
    const agoraIso = new Date().toISOString()

    // 1.1 Evento de Candidatura Submetida
    const evtCandidatura = new Record(timelineCol)
    evtCandidatura.set('candidato', candId)
    evtCandidatura.set('categoria', 'CANDIDATURA')
    evtCandidatura.set('titulo', 'Candidatura recebida:')
    evtCandidatura.set(
      'complemento',
      'Inscrição registrada via canal ' +
        canal +
        (vagaTitulo ? ' para a vaga "' + vagaTitulo + '"' : '') +
        (cand.getBool('consentimento_lgpd') ? ' com termo LGPD autorizado' : ''),
    )
    evtCandidatura.set('autor', 'sistema')
    evtCandidatura.set('origem', 'sistema')
    evtCandidatura.set('data_evento', agoraIso)
    evtCandidatura.set('referencia_tipo', 'candidatos')
    evtCandidatura.set('referencia_id', candId)
    $app.save(evtCandidatura)

    // 1.2 Se reprovado automaticamente na triagem
    if (reprovadoAuto) {
      const evtTriagem = new Record(timelineCol)
      evtTriagem.set('candidato', candId)
      evtTriagem.set('categoria', 'CANDIDATURA')
      evtTriagem.set('titulo', 'Reprovação automática na triagem:')
      evtTriagem.set(
        'complemento',
        motivoReprovacao ||
          'Candidato não atingiu os critérios eliminatórios configurados na triagem.',
      )
      evtTriagem.set('autor', 'sistema')
      evtTriagem.set('origem', 'sistema')
      evtTriagem.set('data_evento', new Date(Date.now() + 1000).toISOString())
      evtTriagem.set('referencia_tipo', 'triagem')
      evtTriagem.set('referencia_id', candId)
      $app.save(evtTriagem)
    }
  } catch (err) {
    console.log('Aviso ao registrar evento de criação de candidato na timeline:', err)
  }

  return e.next()
}, 'candidatos')

// 2. Gatilho quando o pipeline é atualizado (mudança de estágio, motivo de recusa, banco de talentos)
onRecordAfterUpdateSuccess((e) => {
  try {
    const pipe = e.record
    const estagioNovo = pipe.getString('estagio')
    const estagioAnterior = pipe.original().getString('estagio')
    const candidatoId = pipe.getString('candidato')

    if (!candidatoId) return e.next()

    // Se houve mudança de estágio
    if (estagioNovo && estagioNovo !== estagioAnterior) {
      const timelineCol = $app.findCollectionByNameOrId('eventos_timeline_candidato')
      const agoraIso = new Date().toISOString()

      let vagaTitulo = ''
      const vagaId = pipe.getString('vaga')
      if (vagaId) {
        try {
          const v = $app.findRecordById('vagas', vagaId)
          if (v) vagaTitulo = v.getString('titulo')
        } catch (_) {}
      }

      const evtPipeline = new Record(timelineCol)
      evtPipeline.set('candidato', candidatoId)
      evtPipeline.set('categoria', 'STATUS')

      if (estagioNovo === 'Aprovado') {
        evtPipeline.set('titulo', 'Candidato contratado / aprovado:')
        evtPipeline.set(
          'complemento',
          'Aprovação final confirmada no processo seletivo' +
            (vagaTitulo ? ' para ' + vagaTitulo : '') +
            '. Encaminhado para formalização e admissão.',
        )
      } else if (estagioNovo === 'Recusado') {
        const motivoRecusa = pipe.getString('motivo_recusa')
        evtPipeline.set('titulo', 'Candidato recusado no processo:')
        evtPipeline.set(
          'complemento',
          motivoRecusa
            ? 'Motivo registrado: ' + motivoRecusa
            : 'Processo seletivo concluído nesta posição. Perfil mantido no histórico.',
        )
      } else {
        evtPipeline.set('titulo', 'Movimentação no pipeline:')
        evtPipeline.set(
          'complemento',
          'Estágio alterado de "' +
            (estagioAnterior || 'Início') +
            '" para "' +
            estagioNovo +
            '"' +
            (vagaTitulo ? ' na vaga ' + vagaTitulo : ''),
        )
      }

      evtPipeline.set('autor', 'sistema')
      evtPipeline.set('origem', 'sistema')
      evtPipeline.set('data_evento', agoraIso)
      evtPipeline.set('referencia_tipo', 'pipeline')
      evtPipeline.set('referencia_id', pipe.id)
      $app.save(evtPipeline)
    }
  } catch (err) {
    console.log('Aviso ao registrar evento de pipeline na timeline do candidato:', err)
  }

  return e.next()
}, 'pipeline')

// 3. Gatilho quando um relatório de IA é criado (matching / dossiê)
onRecordAfterCreateSuccess((e) => {
  try {
    const rel = e.record
    const candidatoId = rel.getString('candidato')
    if (!candidatoId) return e.next()

    const scoreGeral = rel.getInt('score_geral')
    const scoreTecnico = rel.getInt('score_tecnico')
    const scoreComportamental = rel.getInt('score_comportamental')
    const veredito = rel.getString('veredito') || 'Recomendar'

    const timelineCol = $app.findCollectionByNameOrId('eventos_timeline_candidato')
    const evtRel = new Record(timelineCol)
    evtRel.set('candidato', candidatoId)
    evtRel.set('categoria', 'AVALIAÇÃO')
    evtRel.set('titulo', 'Relatório de IA estruturado gerado:')
    evtRel.set(
      'complemento',
      'Score Geral: ' +
        scoreGeral +
        '% (Técnico: ' +
        scoreTecnico +
        '%, Comportamental: ' +
        scoreComportamental +
        '%). Veredito: ' +
        veredito,
    )
    evtRel.set('autor', 'Gestor de Talentos (IA)')
    evtRel.set('origem', 'sistema')
    evtRel.set('data_evento', new Date().toISOString())
    evtRel.set('referencia_tipo', 'relatorios')
    evtRel.set('referencia_id', rel.id)
    $app.save(evtRel)
  } catch (err) {
    console.log('Aviso ao registrar evento de relatório IA na timeline:', err)
  }

  return e.next()
}, 'relatorios')

// 4. Gatilho quando parecer do gestor é registrado ou atualizado (feedbacks_gestor)
onRecordAfterCreateSuccess((e) => {
  try {
    const fb = e.record
    const candidatoId = fb.getString('candidato')
    if (!candidatoId) return e.next()

    const recomendacao = fb.getString('recomendacao') || 'Avaliado'
    const comentario = fb.getString('comentario')

    const timelineCol = $app.findCollectionByNameOrId('eventos_timeline_candidato')
    const evtFb = new Record(timelineCol)
    evtFb.set('candidato', candidatoId)
    evtFb.set('categoria', 'GESTÃO')
    evtFb.set('titulo', 'Parecer do Gestor registrado:')
    evtFb.set(
      'complemento',
      'Recomendação: "' +
        recomendacao +
        '"' +
        (comentario
          ? ' — ' + (comentario.length > 200 ? comentario.substring(0, 197) + '...' : comentario)
          : ''),
    )
    evtFb.set('autor', 'Gestor Contratante')
    evtFb.set('origem', 'usuario')
    evtFb.set('data_evento', new Date().toISOString())
    evtFb.set('referencia_tipo', 'feedbacks_gestor')
    evtFb.set('referencia_id', fb.id)
    $app.save(evtFb)
  } catch (err) {
    console.log('Aviso ao registrar feedback do gestor na timeline do candidato:', err)
  }

  return e.next()
}, 'feedbacks_gestor')

// 5. Gatilho quando percepção do RH é registrada (percepcoes_rh)
onRecordAfterCreateSuccess((e) => {
  try {
    const p = e.record
    const candidatoId = p.getString('candidato')
    if (!candidatoId) return e.next()

    const autorNome = p.getString('autor_nome') || 'Time RH'
    const visib = p.getString('visibilidade') || 'Compartilhada com o gestor'
    const conclusao = p.getString('conclusao') || 'Avaliação de vídeo e postura concluída'

    const timelineCol = $app.findCollectionByNameOrId('eventos_timeline_candidato')
    const evtP = new Record(timelineCol)
    evtP.set('candidato', candidatoId)
    evtP.set('categoria', 'GESTÃO')
    evtP.set(
      'titulo',
      visib === 'Privada do RH'
        ? 'Percepção interna do RH registrada:'
        : 'Percepção do RH compartilhada com a liderança:',
    )
    evtP.set(
      'complemento',
      conclusao.length > 200 ? conclusao.substring(0, 197) + '...' : conclusao,
    )
    evtP.set('autor', autorNome)
    evtP.set('origem', 'usuario')
    evtP.set('data_evento', new Date().toISOString())
    evtP.set('referencia_tipo', 'percepcoes_rh')
    evtP.set('referencia_id', p.id)
    $app.save(evtP)
  } catch (err) {
    console.log('Aviso ao registrar percepção do RH na timeline:', err)
  }

  return e.next()
}, 'percepcoes_rh')

// 6. Gatilho quando um onboarding é criado (onboarding iniciado)
onRecordAfterCreateSuccess((e) => {
  try {
    const onb = e.record
    const candidatoId = onb.getString('candidato')
    if (!candidatoId) return e.next()

    const timelineCol = $app.findCollectionByNameOrId('eventos_timeline_candidato')
    const evtOnb = new Record(timelineCol)
    evtOnb.set('candidato', candidatoId)
    evtOnb.set('categoria', 'STATUS')
    evtOnb.set('titulo', 'Onboarding iniciado:')
    evtOnb.set(
      'complemento',
      'Trilha de admissão, checklist de documentação e integração corporativa formalmente iniciados.',
    )
    evtOnb.set('autor', 'sistema')
    evtOnb.set('origem', 'sistema')
    evtOnb.set('data_evento', new Date().toISOString())
    evtOnb.set('referencia_tipo', 'onboardings')
    evtOnb.set('referencia_id', onb.id)
    $app.save(evtOnb)
  } catch (err) {
    console.log('Aviso ao registrar início de onboarding na timeline:', err)
  }

  return e.next()
}, 'onboardings')
