migrate(
  (app) => {
    // 1. Atualizar campo status_ciclo na coleção fechamentos_competencia
    // Substituir 'Aguardando validação do gestor' por 'Aguardando validação do RH'
    const fechamentosCol = app.findCollectionByNameOrId('fechamentos_competencia')
    const statusField = fechamentosCol.fields.getByName('status_ciclo')

    if (statusField) {
      statusField.values = [
        'Em apontamento',
        'Aguardando validação do RH',
        'Devolvido para ajustes',
        'Validado',
        'NF solicitada',
        'NF recebida',
        'Fechado',
      ]
      app.save(fechamentosCol)
    }

    // 2. Atualizar registros existentes que tinham status 'Aguardando validação do gestor'
    try {
      app
        .db()
        .newQuery(
          "UPDATE fechamentos_competencia SET status_ciclo = 'Aguardando validação do RH' WHERE status_ciclo = 'Aguardando validação do gestor'",
        )
        .execute()
    } catch (err) {
      console.log('Erro ao atualizar status_ciclo via SQL:', err)
    }

    // 3. Atualizar histórico do seed da competência 2026-09 do Renato Albuquerque se existir
    try {
      const fech202609 = app.findRecordsByFilter(
        'fechamentos_competencia',
        "competencia = '2026-09' && vinculo_referencia ~ 'Nexus Cloud'",
        '-created',
        1,
        0,
      )
      if (fech202609 && fech202609.length > 0) {
        const rec = fech202609[0]
        rec.set('status_ciclo', 'Aguardando validação do RH')
        rec.set('historico_eventos', [
          {
            data: '2026-09-21T16:00:00Z',
            autor: 'Carlos Mendonça (Gestor)',
            acao: 'Envio para validação do RH',
            observacao:
              'Fechamento de competência 2026-09 lançado pelo gestor com 152h normais + 8h extras',
          },
        ])
        app.save(rec)
      }
    } catch (err) {
      console.log('Aviso ao atualizar seed Renato 2026-09:', err)
    }

    // 4. Se a coleção notificacoes_rh tiver campo tipo, garantir que suporte 'fechamento_horas_rh' e 'fechamento_horas_gestor' se necessário
    try {
      const notifCol = app.findCollectionByNameOrId('notificacoes_rh')
      const tipoNotifField = notifCol.fields.getByName('tipo')
      if (tipoNotifField && Array.isArray(tipoNotifField.values)) {
        const novosValores = [...tipoNotifField.values]
        if (!novosValores.includes('fechamento_horas_rh')) novosValores.push('fechamento_horas_rh')
        if (!novosValores.includes('fechamento_horas_gestor'))
          novosValores.push('fechamento_horas_gestor')
        tipoNotifField.values = novosValores
        app.save(notifCol)
      }
    } catch (err) {
      console.log('Aviso ao atualizar tipo em notificacoes_rh:', err)
    }
  },
  (app) => {
    const fechamentosCol = app.findCollectionByNameOrId('fechamentos_competencia')
    const statusField = fechamentosCol.fields.getByName('status_ciclo')

    if (statusField) {
      statusField.values = [
        'Em apontamento',
        'Aguardando validação do gestor',
        'Devolvido para ajustes',
        'Validado',
        'NF solicitada',
        'NF recebida',
        'Fechado',
      ]
      app.save(fechamentosCol)
    }

    try {
      app
        .db()
        .newQuery(
          "UPDATE fechamentos_competencia SET status_ciclo = 'Aguardando validação do gestor' WHERE status_ciclo = 'Aguardando validação do RH'",
        )
        .execute()
    } catch (_) {}
  },
)
