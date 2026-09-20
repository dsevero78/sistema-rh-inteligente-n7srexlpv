// Hook para verificação e geração de alertas automáticos quando talentos do banco se enquadram em vagas abertas
// Inclui:
// 1. cronAdd: varredura periódica a cada 30 minutos
// 2. onRecordAfterCreateSuccess('vagas'): disparo imediato ao criar nova vaga
// 3. onRecordAfterUpdateSuccess('vagas'): disparo se vaga for reativada para 'Ativa'
// 4. routerAdd POST /backend/v1/alertas/varredura: endpoint autenticado para acionamento manual da varredura

cronAdd('alertas_talentos_cron', '*/30 * * * *', () => {
  try {
    const vagasAtivas = $app.findRecordsByFilter('vagas', "status = 'Ativa'", '-created', 20, 0)
    if (!vagasAtivas || vagasAtivas.length === 0) return

    const candidatosBanco = $app.findRecordsByFilter(
      'candidatos',
      'banco_talentos = true',
      '-score_semantico',
      100,
      0,
    )
    if (!candidatosBanco || candidatosBanco.length === 0) return

    const alertasCol = $app.findCollectionByNameOrId('alertas')
    const mailClient = $app.newMailClient()
    const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
    const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'

    // Buscar admin para envio de e-mail de alerta
    let adminEmail = 'severo.douglas2@gmail.com'
    try {
      const users = $app.findRecordsByFilter('users', '', '-created', 1, 0)
      if (users && users.length > 0 && users[0].getString('email')) {
        adminEmail = users[0].getString('email')
      }
    } catch (_) {}

    for (let v = 0; v < vagasAtivas.length; v++) {
      const vaga = vagasAtivas[v]
      const vagaId = vaga.id
      const vagaTitulo = vaga.getString('titulo')
      const departamento = vaga.getString('departamento')

      for (let c = 0; c < candidatosBanco.length; c++) {
        const cand = candidatosBanco[c]
        const candId = cand.id
        const candNome = cand.getString('nome')
        const cargoAtual = cand.getString('cargo_atual')

        // Checar se já existe alerta para esse par vaga↔candidato
        try {
          const existentes = $app.findRecordsByFilter(
            'alertas',
            "vaga = '" + vagaId + "' && candidato = '" + candId + "'",
            '',
            1,
            0,
          )
          if (existentes && existentes.length > 0) {
            continue // já processado
          }
        } catch (_) {}

        // Calcular score de matching
        // Reusar lógica de matching baseada em score_semantico, relatorios prévios ou avaliação
        let scoreFinal = cand.getInt('score_semantico') || 70
        let justificativa = ''

        // Verificar se existe relatório prévio para a vaga ou para vaga de origem
        try {
          const rels = $app.findRecordsByFilter(
            'relatorios',
            "candidato = '" + candId + "'",
            '-created',
            1,
            0,
          )
          if (rels && rels.length > 0) {
            const rel = rels[0]
            if (rel.getInt('score_geral') > 0) {
              scoreFinal = rel.getInt('score_geral')
            }
          }
        } catch (_) {}

        // Se o score atender ao limiar configurável (>= 75)
        if (scoreFinal >= 75) {
          const motivoBanco = cand.getString('motivo_banco_talentos') || ''
          const resumoPerfil = cand.getString('resumo') || ''

          if (motivoBanco) {
            justificativa =
              candNome +
              ' está no Banco de Talentos com histórico de alta performance. ' +
              motivoBanco
          } else if (resumoPerfil) {
            justificativa =
              candNome +
              ' (' +
              cargoAtual +
              ') apresenta competências altamente compatíveis com os requisitos da vaga de ' +
              vagaTitulo +
              '.'
          } else {
            justificativa =
              candNome +
              ' possui score de aderência de ' +
              scoreFinal +
              '% calculado para a oportunidade ' +
              vagaTitulo +
              '.'
          }

          const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'

          // Criar registro na coleção 'alertas'
          const novoAlerta = new Record(alertasCol)
          novoAlerta.set('vaga', vagaId)
          novoAlerta.set('candidato', candId)
          novoAlerta.set('score', scoreFinal)
          novoAlerta.set('tipo', 'talento_para_vaga')
          novoAlerta.set('status', 'Novo')
          novoAlerta.set('resumo_ia', justificativa)
          novoAlerta.set('criado_em', agoraIso)
          $app.save(novoAlerta)

          // Disparar e-mail de notificação para o gestor/admin
          try {
            const htmlEmail =
              '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
              '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
              '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
              '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Alerta Automático de Talento Compatível</p>' +
              '</div>' +
              '<p style="color: #334155; font-size: 15px; line-height: 1.6;">Identificamos um profissional de alto potencial no <strong>Banco de Talentos</strong> com forte aderência para uma vaga recém-aberta.</p>' +
              '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0;">' +
              '<h3 style="color: #1d4ed8; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Resumo do Matching</h3>' +
              '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Vaga Aberta:</strong> ' +
              vagaTitulo +
              ' (' +
              departamento +
              ')</p>' +
              '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Candidato:</strong> ' +
              candNome +
              ' — ' +
              cargoAtual +
              '</p>' +
              '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Score de Aderência:</strong> <span style="background-color: #dbeafe; color: #1e40af; font-weight: bold; padding: 2px 8px; border-radius: 4px;">' +
              scoreFinal +
              '%</span></p>' +
              '<p style="margin: 12px 0 6px 0; color: #334155; font-size: 13px; line-height: 1.5; font-style: italic; background-color: #f1f5f9; padding: 10px; border-radius: 6px;">' +
              justificativa +
              '</p>' +
              '</div>' +
              '<p style="color: #64748b; font-size: 13px; line-height: 1.5;">Você pode visualizar o perfil completo e acionar o reaproveitamento direto no sistema através da central de alertas.</p>' +
              '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Sistema RH Inteligente — Gente & Gestão</strong></p>' +
              '</div>'

            const msg = new MailerMessage({
              from: {
                address: senderAddress,
                name: senderName,
              },
              to: [{ address: adminEmail }],
              subject: 'Alerta de Talento: ' + candNome + ' para a vaga ' + vagaTitulo,
              html: htmlEmail,
            })
            mailClient.send(msg)
          } catch (mailErr) {
            console.log('Falha ao enviar e-mail de alerta de talento:', mailErr)
          }
        }
      }
    }
  } catch (err) {
    console.log('Erro no cron de alertas de talentos:', err)
  }
})

// Gatilho imediato após criação de uma vaga
onRecordAfterCreateSuccess((e) => {
  try {
    const vaga = e.record
    if (vaga.getString('status') !== 'Ativa') {
      return e.next()
    }

    const vagaId = vaga.id
    const vagaTitulo = vaga.getString('titulo')
    const departamento = vaga.getString('departamento')

    const candidatosBanco = $app.findRecordsByFilter(
      'candidatos',
      'banco_talentos = true',
      '-score_semantico',
      100,
      0,
    )
    if (!candidatosBanco || candidatosBanco.length === 0) return e.next()

    const alertasCol = $app.findCollectionByNameOrId('alertas')
    const mailClient = $app.newMailClient()
    const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
    const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'

    let adminEmail = 'severo.douglas2@gmail.com'
    try {
      const users = $app.findRecordsByFilter('users', '', '-created', 1, 0)
      if (users && users.length > 0 && users[0].getString('email')) {
        adminEmail = users[0].getString('email')
      }
    } catch (_) {}

    for (let c = 0; c < candidatosBanco.length; c++) {
      const cand = candidatosBanco[c]
      const candId = cand.id
      const candNome = cand.getString('nome')
      const cargoAtual = cand.getString('cargo_atual')

      try {
        const existentes = $app.findRecordsByFilter(
          'alertas',
          "vaga = '" + vagaId + "' && candidato = '" + candId + "'",
          '',
          1,
          0,
        )
        if (existentes && existentes.length > 0) continue
      } catch (_) {}

      let scoreFinal = cand.getInt('score_semantico') || 70
      try {
        const rels = $app.findRecordsByFilter(
          'relatorios',
          "candidato = '" + candId + "'",
          '-created',
          1,
          0,
        )
        if (rels && rels.length > 0) {
          const rel = rels[0]
          if (rel.getInt('score_geral') > 0) {
            scoreFinal = rel.getInt('score_geral')
          }
        }
      } catch (_) {}

      if (scoreFinal >= 75) {
        const motivoBanco = cand.getString('motivo_banco_talentos') || ''
        const resumoPerfil = cand.getString('resumo') || ''
        let justificativa = ''

        if (motivoBanco) {
          justificativa =
            candNome +
            ' está no Banco de Talentos com histórico de alta performance. ' +
            motivoBanco
        } else if (resumoPerfil) {
          justificativa =
            candNome +
            ' (' +
            cargoAtual +
            ') apresenta competências altamente compatíveis com a vaga de ' +
            vagaTitulo +
            '.'
        } else {
          justificativa =
            candNome +
            ' possui score de aderência de ' +
            scoreFinal +
            '% calculado para a oportunidade ' +
            vagaTitulo +
            '.'
        }

        const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'

        const novoAlerta = new Record(alertasCol)
        novoAlerta.set('vaga', vagaId)
        novoAlerta.set('candidato', candId)
        novoAlerta.set('score', scoreFinal)
        novoAlerta.set('tipo', 'talento_para_vaga')
        novoAlerta.set('status', 'Novo')
        novoAlerta.set('resumo_ia', justificativa)
        novoAlerta.set('criado_em', agoraIso)
        $app.save(novoAlerta)

        try {
          const htmlEmail =
            '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
            '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
            '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
            '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Alerta de Talento: Vaga Recém-Aberta</p>' +
            '</div>' +
            '<p style="color: #334155; font-size: 15px; line-height: 1.6;">A nova vaga <strong>' +
            vagaTitulo +
            '</strong> foi aberta e identificamos um candidato compatível guardado no Banco de Talentos.</p>' +
            '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0;">' +
            '<h3 style="color: #1d4ed8; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Resumo do Matching</h3>' +
            '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Vaga:</strong> ' +
            vagaTitulo +
            ' (' +
            departamento +
            ')</p>' +
            '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Candidato:</strong> ' +
            candNome +
            ' — ' +
            cargoAtual +
            '</p>' +
            '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Score:</strong> <span style="background-color: #dbeafe; color: #1e40af; font-weight: bold; padding: 2px 8px; border-radius: 4px;">' +
            scoreFinal +
            '%</span></p>' +
            '<p style="margin: 12px 0 6px 0; color: #334155; font-size: 13px; line-height: 1.5; font-style: italic; background-color: #f1f5f9; padding: 10px; border-radius: 6px;">' +
            justificativa +
            '</p>' +
            '</div>' +
            '<p style="color: #64748b; font-size: 13px; line-height: 1.5;">Acesse a plataforma para aprovar o reaproveitamento ou atribuir um estágio no processo seletivo.</p>' +
            '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Sistema RH Inteligente — Gente & Gestão</strong></p>' +
            '</div>'

          const msg = new MailerMessage({
            from: {
              address: senderAddress,
              name: senderName,
            },
            to: [{ address: adminEmail }],
            subject: 'Alerta de Talento para a vaga recém-aberta: ' + vagaTitulo,
            html: htmlEmail,
          })
          mailClient.send(msg)
        } catch (mailErr) {
          console.log('Falha ao enviar e-mail no gatilho de vaga:', mailErr)
        }
      }
    }
  } catch (err) {
    console.log('Erro no gatilho onRecordAfterCreateSuccess de vagas:', err)
  }

  return e.next()
}, 'vagas')

// Gatilho se uma vaga for reativada para 'Ativa'
onRecordAfterUpdateSuccess((e) => {
  try {
    const vaga = e.record
    if (vaga.getString('status') !== 'Ativa') {
      return e.next()
    }

    const vagaId = vaga.id
    const vagaTitulo = vaga.getString('titulo')
    const departamento = vaga.getString('departamento')

    const candidatosBanco = $app.findRecordsByFilter(
      'candidatos',
      'banco_talentos = true',
      '-score_semantico',
      100,
      0,
    )
    if (!candidatosBanco || candidatosBanco.length === 0) return e.next()

    const alertasCol = $app.findCollectionByNameOrId('alertas')
    const mailClient = $app.newMailClient()
    const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
    const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'

    let adminEmail = 'severo.douglas2@gmail.com'
    try {
      const users = $app.findRecordsByFilter('users', '', '-created', 1, 0)
      if (users && users.length > 0 && users[0].getString('email')) {
        adminEmail = users[0].getString('email')
      }
    } catch (_) {}

    for (let c = 0; c < candidatosBanco.length; c++) {
      const cand = candidatosBanco[c]
      const candId = cand.id
      const candNome = cand.getString('nome')
      const cargoAtual = cand.getString('cargo_atual')

      try {
        const existentes = $app.findRecordsByFilter(
          'alertas',
          "vaga = '" + vagaId + "' && candidato = '" + candId + "'",
          '',
          1,
          0,
        )
        if (existentes && existentes.length > 0) continue
      } catch (_) {}

      let scoreFinal = cand.getInt('score_semantico') || 70
      try {
        const rels = $app.findRecordsByFilter(
          'relatorios',
          "candidato = '" + candId + "'",
          '-created',
          1,
          0,
        )
        if (rels && rels.length > 0) {
          const rel = rels[0]
          if (rel.getInt('score_geral') > 0) {
            scoreFinal = rel.getInt('score_geral')
          }
        }
      } catch (_) {}

      if (scoreFinal >= 75) {
        const motivoBanco = cand.getString('motivo_banco_talentos') || ''
        const resumoPerfil = cand.getString('resumo') || ''
        let justificativa = ''

        if (motivoBanco) {
          justificativa =
            candNome +
            ' está no Banco de Talentos com histórico de alta performance. ' +
            motivoBanco
        } else if (resumoPerfil) {
          justificativa =
            candNome +
            ' (' +
            cargoAtual +
            ') apresenta competências altamente compatíveis com a vaga de ' +
            vagaTitulo +
            '.'
        } else {
          justificativa =
            candNome +
            ' possui score de aderência de ' +
            scoreFinal +
            '% calculado para a vaga reativada ' +
            vagaTitulo +
            '.'
        }

        const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'

        const novoAlerta = new Record(alertasCol)
        novoAlerta.set('vaga', vagaId)
        novoAlerta.set('candidato', candId)
        novoAlerta.set('score', scoreFinal)
        novoAlerta.set('tipo', 'talento_para_vaga')
        novoAlerta.set('status', 'Novo')
        novoAlerta.set('resumo_ia', justificativa)
        novoAlerta.set('criado_em', agoraIso)
        $app.save(novoAlerta)

        try {
          const htmlEmail =
            '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
            '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
            '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
            '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Alerta de Talento: Vaga Ativada</p>' +
            '</div>' +
            '<p style="color: #334155; font-size: 15px; line-height: 1.6;">A vaga <strong>' +
            vagaTitulo +
            '</strong> está ativa e identificamos um candidato compatível no Banco de Talentos.</p>' +
            '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0;">' +
            '<h3 style="color: #1d4ed8; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Resumo do Matching</h3>' +
            '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Vaga:</strong> ' +
            vagaTitulo +
            ' (' +
            departamento +
            ')</p>' +
            '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Candidato:</strong> ' +
            candNome +
            ' — ' +
            cargoAtual +
            '</p>' +
            '<p style="margin: 6px 0; color: #475569; font-size: 14px;"><strong>Score:</strong> <span style="background-color: #dbeafe; color: #1e40af; font-weight: bold; padding: 2px 8px; border-radius: 4px;">' +
            scoreFinal +
            '%</span></p>' +
            '<p style="margin: 12px 0 6px 0; color: #334155; font-size: 13px; line-height: 1.5; font-style: italic; background-color: #f1f5f9; padding: 10px; border-radius: 6px;">' +
            justificativa +
            '</p>' +
            '</div>' +
            '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Sistema RH Inteligente — Gente & Gestão</strong></p>' +
            '</div>'

          const msg = new MailerMessage({
            from: {
              address: senderAddress,
              name: senderName,
            },
            to: [{ address: adminEmail }],
            subject: 'Alerta de Talento: ' + candNome + ' para a vaga ' + vagaTitulo,
            html: htmlEmail,
          })
          mailClient.send(msg)
        } catch (mailErr) {
          console.log('Falha ao enviar e-mail de alerta em update:', mailErr)
        }
      }
    }
  } catch (err) {
    console.log('Erro no gatilho onRecordAfterUpdateSuccess de vagas:', err)
  }

  return e.next()
}, 'vagas')

// Rota para acionamento manual de varredura
routerAdd(
  'POST',
  '/backend/v1/alertas/varredura',
  (e) => {
    try {
      const authUser = e.auth
      if (!authUser || !authUser.id) {
        return e.json(401, { error: 'Autenticação obrigatória' })
      }

      const vagasAtivas = $app.findRecordsByFilter('vagas', "status = 'Ativa'", '-created', 20, 0)
      const candidatosBanco = $app.findRecordsByFilter(
        'candidatos',
        'banco_talentos = true',
        '-score_semantico',
        100,
        0,
      )

      const alertasCol = $app.findCollectionByNameOrId('alertas')
      let gerados = 0

      for (let v = 0; v < vagasAtivas.length; v++) {
        const vaga = vagasAtivas[v]
        for (let c = 0; c < candidatosBanco.length; c++) {
          const cand = candidatosBanco[c]
          try {
            const existentes = $app.findRecordsByFilter(
              'alertas',
              "vaga = '" + vaga.id + "' && candidato = '" + cand.id + "'",
              '',
              1,
              0,
            )
            if (existentes && existentes.length > 0) continue
          } catch (_) {}

          let scoreFinal = cand.getInt('score_semantico') || 70
          try {
            const rels = $app.findRecordsByFilter(
              'relatorios',
              "candidato = '" + cand.id + "'",
              '-created',
              1,
              0,
            )
            if (rels && rels.length > 0 && rels[0].getInt('score_geral') > 0) {
              scoreFinal = rels[0].getInt('score_geral')
            }
          } catch (_) {}

          if (scoreFinal >= 75) {
            const agoraIso = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'
            const novoAlerta = new Record(alertasCol)
            novoAlerta.set('vaga', vaga.id)
            novoAlerta.set('candidato', cand.id)
            novoAlerta.set('score', scoreFinal)
            novoAlerta.set('tipo', 'talento_para_vaga')
            novoAlerta.set('status', 'Novo')
            novoAlerta.set(
              'resumo_ia',
              cand.getString('nome') +
                ' possui aderência de ' +
                scoreFinal +
                '% para a oportunidade ' +
                vaga.getString('titulo') +
                '. Perfil com competências requeridas.',
            )
            novoAlerta.set('criado_em', agoraIso)
            $app.save(novoAlerta)
            gerados++
          }
        }
      }

      return e.json(200, {
        success: true,
        alertas_gerados: gerados,
        mensagem: 'Varredura de talentos concluída com sucesso.',
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao executar varredura' })
    }
  },
  $apis.requireAuth(),
)
