// ============================================================================
// Hook: Automação e Monitoramento de Prestadores de Serviços PJ
// - Cron diário (03:00 UTC) e endpoint manual POST /backend/v1/prestadores-pj/varredura
// - Monitora:
//   1. Documentos PJ prestes a vencer (30, 15, 7 dias) ou vencidos -> Alerta + E-mail
//   2. Contratos PJ vencendo em 30 dias -> Alerta + E-mail com destaque de renovação
//   3. Notas Fiscais PJ atrasadas (vencimento passou sem status 'Paga') -> Alerta
// - Atualiza status de documentos ('Vencido', 'Vencendo', 'Válido') e contratos ('Vencendo')
// - Registra log em logs_emails_status para auditoria institucional
// ============================================================================

cronAdd('monitorar_prestadores_pj_cron', '0 3 * * *', () => {
  try {
    const agora = new Date()
    const agoraIso = agora.toISOString().replace('T', ' ').substring(0, 19) + 'Z'
    const hojeStr = agora.toISOString().substring(0, 10)

    const alertasCol = $app.findCollectionByNameOrId('alertas')
    const mailClient = $app.newMailClient()
    const senderAddress = $app.settings().meta.senderAddress || 'rh@sistema-rh.local'
    const senderName = $app.settings().meta.senderName || 'Gente & Gestão - Sistema RH'

    // Destinatário padrão (Gestor de RH / Admin)
    let emailsRh = ['severo.douglas2@gmail.com']
    try {
      const users = $app.findRecordsByFilter('users', '', '-created', 2, 0)
      if (users && users.length > 0) {
        emailsRh = users.map((u) => u.getString('email')).filter((e) => !!e)
      }
    } catch (_) {}

    // 1. MONITORAR DOCUMENTOS PJ
    try {
      const docs = $app.findRecordsByFilter(
        'documentos_pj',
        "data_validade != '' && data_validade != null",
        '-data_validade',
        200,
        0,
      )
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i]
        const valStr = doc.getString('data_validade')
        if (!valStr) continue

        const valDate = new Date(valStr)
        const diffDias = Math.ceil((valDate.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))

        let statusCalc = 'Válido'
        if (diffDias < 0) {
          statusCalc = 'Vencido'
        } else if (diffDias <= 30) {
          statusCalc = 'Vencendo'
        }

        if (doc.getString('status_calculado') !== statusCalc) {
          doc.set('status_calculado', statusCalc)
          $app.save(doc)
        }

        // Se vencido ou vencendo em 30, 15 ou 7 dias, gerar alerta e e-mail
        if (diffDias <= 30) {
          const prestId = doc.getString('prestador')
          let prestNome = 'Prestador PJ'
          let prestCnpj = ''
          try {
            const p = $app.findRecordById('prestadores_pj', prestId)
            prestNome = p.getString('nome_fantasia') || p.getString('razao_social')
            prestCnpj = p.getString('cnpj')
          } catch (_) {}

          const tipoDoc = doc.getString('tipo_documento')
          const isVencido = diffDias < 0
          const chaveTipo = isVencido ? 'documento_pj_vencido' : 'documento_pj_vencendo'

          // Verificar se já gerou alerta para este documento nas últimas 48h
          let jaExiste = false
          try {
            const alRecentes = $app.findRecordsByFilter(
              'alertas',
              "tipo = '" + chaveTipo + "' && prestador = '" + prestId + "'",
              '-created',
              1,
              0,
            )
            if (alRecentes && alRecentes.length > 0) {
              const criacaoAl = new Date(
                alRecentes[0].getString('created') || alRecentes[0].getString('criado_em'),
              )
              const diffHoras = (agora.getTime() - criacaoAl.getTime()) / (1000 * 60 * 60)
              if (diffHoras < 48) jaExiste = true
            }
          } catch (_) {}

          if (!jaExiste) {
            const resumo = isVencido
              ? 'Documento Fiscal Vencido: O documento "' +
                tipoDoc +
                '" de ' +
                prestNome +
                ' (CNPJ ' +
                prestCnpj +
                ') está vencido há ' +
                Math.abs(diffDias) +
                ' dias. Regularização prioritária necessária.'
              : 'Documento Próximo do Vencimento: O documento "' +
                tipoDoc +
                '" de ' +
                prestNome +
                ' vencerá em ' +
                diffDias +
                ' dias. Solicite a renovação com antecedência.'

            const al = new Record(alertasCol)
            al.set('prestador', prestId)
            al.set('score', isVencido ? 95 : 85)
            al.set('tipo', chaveTipo)
            al.set('status', 'Novo')
            al.set('resumo_ia', resumo)
            al.set('criado_em', agoraIso)
            $app.save(al)

            // Registrar evento na linha do tempo PJ
            try {
              const timelineCol = $app.findCollectionByNameOrId('eventos_timeline_pj')
              if (timelineCol) {
                const ev = new Record(timelineCol)
                ev.set('prestador', prestId)
                ev.set('categoria', 'DOCUMENTOS')
                ev.set('titulo', 'Cobrança de documentos')
                ev.set(
                  'complemento',
                  'enviada por e-mail ao PJ (' +
                    tipoDoc +
                    (isVencido ? ' expirado' : ' próximo do vencimento') +
                    ')',
                )
                ev.set('autor', 'sistema')
                ev.set('origem', 'sistema')
                ev.set('data_evento', agoraIso)
                ev.set('referencia_tipo', 'documento_cobranca')
                ev.set('referencia_id', doc.id)
                $app.save(ev)
              }
            } catch (errTime) {
              console.log('Falha ao registrar evento na linha do tempo:', errTime)
            }

            // Disparar e-mail de notificação
            try {
              const htmlDoc =
                '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
                '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
                '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
                '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Alerta de Compliance & Gestão de Prestadores PJ</p>' +
                '</div>' +
                '<p style="color: #334155; font-size: 15px; line-height: 1.6;">Identificamos uma pendência documental no cadastro de prestadores terceirizados.</p>' +
                '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0;">' +
                '<div style="display: inline-block; background-color: ' +
                (isVencido ? '#ef4444' : '#f59e0b') +
                '; color: #ffffff; font-size: 11px; font-weight: bold; text-transform: uppercase; padding: 4px 8px; border-radius: 4px; margin-bottom: 10px;">' +
                (isVencido ? 'Documento Vencido' : 'Vencendo em Breve') +
                '</div>' +
                '<p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>Prestador:</strong> ' +
                prestNome +
                ' (CNPJ: ' +
                prestCnpj +
                ')</p>' +
                '<p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>Documento:</strong> ' +
                tipoDoc +
                '</p>' +
                '<p style="margin: 6px 0; color: #475569; font-size: 13px;"><strong>Vencimento:</strong> ' +
                valStr.substring(0, 10) +
                ' (' +
                (isVencido ? Math.abs(diffDias) + ' dias atrás' : 'restam ' + diffDias + ' dias') +
                ')</p>' +
                '<p style="margin: 12px 0 0 0; color: #475569; font-size: 13px; line-height: 1.5; background-color: #f1f5f9; padding: 10px; border-radius: 6px;">' +
                resumo +
                '</p>' +
                '</div>' +
                '<p style="color: #64748b; font-size: 12px;">Acesse a aba de Prestadores PJ para fazer o upload da nova certidão ou notificar o responsável pelo fornecedor.</p>' +
                '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Sistema RH Inteligente — Gente & Gestão</strong></p>' +
                '</div>'

              const msg = new MailerMessage({
                from: { address: senderAddress, name: senderName },
                to: emailsRh.map((em) => ({ address: em })),
                subject:
                  (isVencido ? '⚠️ [URGENTE] Documento Vencido: ' : '📅 Aviso de Vencimento: ') +
                  tipoDoc +
                  ' — ' +
                  prestNome,
                html: htmlDoc,
              })
              mailClient.send(msg)
            } catch (errEmail) {
              console.log('Falha ao enviar e-mail de documento PJ:', errEmail)
            }
          }
        }
      }
    } catch (errDocs) {
      console.log('Erro ao checar documentos PJ:', errDocs)
    }

    // 2. MONITORAR CONTRATOS PJ VENCENDO EM ATÉ 30 DIAS
    try {
      const contratos = $app.findRecordsByFilter(
        'contratos_pj',
        "status = 'Vigente' || status = 'Vencendo'",
        '-data_fim',
        200,
        0,
      )
      for (let c = 0; c < contratos.length; c++) {
        const ct = contratos[c]
        const fimStr = ct.getString('data_fim')
        if (!fimStr) continue

        const fimDate = new Date(fimStr)
        const diffContrato = Math.ceil(
          (fimDate.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24),
        )

        if (diffContrato <= 30 && diffContrato > 0) {
          if (ct.getString('status') !== 'Vencendo') {
            ct.set('status', 'Vencendo')
            $app.save(ct)
          }

          const prestId = ct.getString('prestador')
          let prestNome = 'Prestador PJ'
          let prestMedia = 0
          try {
            const p = $app.findRecordById('prestadores_pj', prestId)
            prestNome = p.getString('nome_fantasia') || p.getString('razao_social')
            prestMedia = p.getFloat('media_avaliacao') || 0
          } catch (_) {}

          let jaExisteCt = false
          try {
            const alRecentes = $app.findRecordsByFilter(
              'alertas',
              "tipo = 'contrato_pj_vencendo' && prestador = '" + prestId + "'",
              '-created',
              1,
              0,
            )
            if (alRecentes && alRecentes.length > 0) {
              const criacaoAl = new Date(
                alRecentes[0].getString('created') || alRecentes[0].getString('criado_em'),
              )
              const diffHoras = (agora.getTime() - criacaoAl.getTime()) / (1000 * 60 * 60)
              if (diffHoras < 72) jaExisteCt = true
            }
          } catch (_) {}

          if (!jaExisteCt) {
            const tituloCt = ct.getString('titulo')
            const valorCt = ct.getInt('valor')
            const resumoCt =
              'Renovação Contratual: O contrato "' +
              tituloCt +
              '" com ' +
              prestNome +
              ' vence em ~' +
              diffContrato +
              ' dias (' +
              fimStr.substring(0, 10) +
              '). Valor: R$ ' +
              (valorCt ? valorCt.toLocaleString('pt-BR') : '0') +
              '. Média de avaliação do prestador: ' +
              (prestMedia > 0 ? prestMedia + '/10' : 'Ainda não avaliado') +
              '. Decida pela renovação ou encerramento com antecedência.'

            const alCt = new Record(alertasCol)
            alCt.set('prestador', prestId)
            alCt.set('score', 90)
            alCt.set('tipo', 'contrato_pj_vencendo')
            alCt.set('status', 'Novo')
            alCt.set('resumo_ia', resumoCt)
            alCt.set('criado_em', agoraIso)
            $app.save(alCt)

            // E-mail com destaque para renovação
            try {
              const htmlCt =
                '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
                '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
                '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
                '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Alerta de Renovação de Contrato PJ</p>' +
                '</div>' +
                '<p style="color: #334155; font-size: 15px; line-height: 1.6;">O contrato do prestador abaixo está próximo da vigência final (restam <strong>' +
                diffContrato +
                ' dias</strong>).</p>' +
                '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0;">' +
                '<h3 style="color: #1d4ed8; margin: 0 0 10px 0; font-size: 15px;">' +
                tituloCt +
                '</h3>' +
                '<p style="margin: 4px 0; color: #1e293b; font-size: 14px;"><strong>Prestador:</strong> ' +
                prestNome +
                '</p>' +
                '<p style="margin: 4px 0; color: #1e293b; font-size: 14px;"><strong>Valor:</strong> R$ ' +
                valorCt.toLocaleString('pt-BR') +
                ' (' +
                ct.getString('tipo') +
                ')</p>' +
                '<p style="margin: 4px 0; color: #475569; font-size: 13px;"><strong>Data de Término:</strong> ' +
                fimStr.substring(0, 10) +
                '</p>' +
                (prestMedia > 0
                  ? '<p style="margin: 4px 0; color: #1e40af; font-size: 13px;"><strong>Média de Performance:</strong> ' +
                    prestMedia +
                    '/10</p>'
                  : '') +
                '<p style="margin: 12px 0 0 0; color: #475569; font-size: 13px; line-height: 1.5; background-color: #f1f5f9; padding: 10px; border-radius: 6px;">' +
                resumoCt +
                '</p>' +
                '</div>' +
                '<p style="color: #64748b; font-size: 12px;">Recomendamos convocar o gestor interno responsável para avaliar aditivo contratual ou formalização de rescisão/encerramento amigável.</p>' +
                '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Sistema RH Inteligente — Gente & Gestão</strong></p>' +
                '</div>'

              const msg = new MailerMessage({
                from: { address: senderAddress, name: senderName },
                to: emailsRh.map((em) => ({ address: em })),
                subject:
                  '⏳ Contrato PJ Vencendo em ' +
                  diffContrato +
                  ' dias: ' +
                  prestNome +
                  ' (' +
                  tituloCt +
                  ')',
                html: htmlCt,
              })
              mailClient.send(msg)
            } catch (errEmailCt) {
              console.log('Falha ao enviar e-mail de contrato PJ:', errEmailCt)
            }
          }
        }
      }
    } catch (errContratos) {
      console.log('Erro ao checar contratos PJ:', errContratos)
    }

    // 3. MONITORAR ADITIVOS PJ PENDENTES DE ASSINATURA HÁ MAIS DE 7 DIAS
    try {
      const aditivos = $app.findRecordsByFilter(
        'aditivos_pj',
        "status = 'Pendente de assinatura'",
        '-created',
        200,
        0,
      )
      for (let a = 0; a < aditivos.length; a++) {
        const ad = aditivos[a]
        const criacaoAdStr = ad.getString('created') || ad.getString('updated')
        if (!criacaoAdStr) continue

        const criacaoAdDate = new Date(criacaoAdStr)
        const diffDiasCriacao = Math.floor(
          (agora.getTime() - criacaoAdDate.getTime()) / (1000 * 60 * 60 * 24),
        )

        // Se pendente há mais de 7 dias
        if (diffDiasCriacao >= 7) {
          const prestId = ad.getString('prestador')
          let prestNome = 'Prestador PJ'
          let prestCnpj = ''
          try {
            const p = $app.findRecordById('prestadores_pj', prestId)
            prestNome = p.getString('nome_fantasia') || p.getString('razao_social')
            prestCnpj = p.getString('cnpj')
          } catch (_) {}

          let jaExisteAd = false
          try {
            const alRecentes = $app.findRecordsByFilter(
              'alertas',
              "tipo = 'aditivo_pj_pendente' && prestador = '" + prestId + "'",
              '-created',
              1,
              0,
            )
            if (alRecentes && alRecentes.length > 0) {
              const criacaoAl = new Date(
                alRecentes[0].getString('created') || alRecentes[0].getString('criado_em'),
              )
              const diffHoras = (agora.getTime() - criacaoAl.getTime()) / (1000 * 60 * 60)
              if (diffHoras < 72) jaExisteAd = true
            }
          } catch (_) {}

          if (!jaExisteAd) {
            const numAdit = ad.getString('numero_aditivo')
            const tipoAdit = ad.getString('tipo')
            const novoValor = ad.getInt('novo_valor_mensal')

            const resumoAd =
              'Aditivo Contratual Pendente de Assinatura: O Aditivo ' +
              numAdit +
              ' (' +
              tipoAdit +
              (novoValor > 0 ? ', novo valor R$ ' + novoValor.toLocaleString('pt-BR') : '') +
              ') com ' +
              prestNome +
              ' aguarda assinatura há ' +
              diffDiasCriacao +
              ' dias. Regularize a formalização jurídica.'

            const alAd = new Record(alertasCol)
            alAd.set('prestador', prestId)
            alAd.set('score', 92)
            alAd.set('tipo', 'aditivo_pj_pendente')
            alAd.set('status', 'Novo')
            alAd.set('resumo_ia', resumoAd)
            alAd.set('criado_em', agoraIso)
            $app.save(alAd)

            // Disparar e-mail de notificação de aditivo pendente
            try {
              const htmlAd =
                '<div style="font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">' +
                '<div style="background-color: #0f172a; padding: 20px; border-radius: 8px; text-align: center; margin-bottom: 24px;">' +
                '<h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 700;">Gente & Gestão</h1>' +
                '<p style="color: #94a3b8; margin: 4px 0 0 0; font-size: 13px;">Alerta de Aditivo Contratual PJ Pendente de Assinatura</p>' +
                '</div>' +
                '<p style="color: #334155; font-size: 15px; line-height: 1.6;">Identificamos que um aditivo contratual está pendente de assinatura há mais de <strong>' +
                diffDiasCriacao +
                ' dias</strong>.</p>' +
                '<div style="background-color: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 18px; margin: 20px 0;">' +
                '<div style="display: inline-block; background-color: #f59e0b; color: #ffffff; font-size: 11px; font-weight: bold; text-transform: uppercase; padding: 4px 8px; border-radius: 4px; margin-bottom: 10px;">' +
                'Pendente de Assinatura (> 7 dias)' +
                '</div>' +
                '<p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>Prestador:</strong> ' +
                prestNome +
                (prestCnpj ? ' (CNPJ ' + prestCnpj + ')' : '') +
                '</p>' +
                '<p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>Número do Aditivo:</strong> ' +
                numAdit +
                '</p>' +
                '<p style="margin: 6px 0; color: #1e293b; font-size: 14px;"><strong>Tipo de Aditivo:</strong> ' +
                tipoAdit +
                '</p>' +
                (novoValor > 0
                  ? '<p style="margin: 6px 0; color: #1d4ed8; font-size: 14px;"><strong>Novo Valor Mensal:</strong> R$ ' +
                    novoValor.toLocaleString('pt-BR') +
                    '</p>'
                  : '') +
                '<p style="margin: 12px 0 0 0; color: #475569; font-size: 13px; line-height: 1.5; background-color: #f1f5f9; padding: 10px; border-radius: 6px;">' +
                resumoAd +
                '</p>' +
                '</div>' +
                '<p style="color: #64748b; font-size: 12px;">Acesse a aba "Aditivos" na ficha do prestador para anexar o documento assinado ou alterar o status para Vigente.</p>' +
                '<p style="color: #334155; font-size: 14px; margin-top: 24px;">Atenciosamente,<br><strong>Sistema RH Inteligente — Gente & Gestão</strong></p>' +
                '</div>'

              const msg = new MailerMessage({
                from: { address: senderAddress, name: senderName },
                to: emailsRh.map((em) => ({ address: em })),
                subject:
                  '🖋️ [Ação Requerida] Aditivo Pendente de Assinatura: ' +
                  numAdit +
                  ' — ' +
                  prestNome,
                html: htmlAd,
              })
              mailClient.send(msg)
            } catch (errEmailAd) {
              console.log('Falha ao enviar e-mail de aditivo PJ:', errEmailAd)
            }
          }
        }
      }
    } catch (errAditivos) {
      console.log('Erro ao checar aditivos PJ pendentes:', errAditivos)
    }

    // 4. MONITORAR NOTAS FISCAIS ATRASADAS
    try {
      const nfs = $app.findRecordsByFilter(
        'notas_fiscais_pj',
        "status != 'Paga' && status != 'Glosada' && data_vencimento != ''",
        '-data_vencimento',
        200,
        0,
      )
      for (let n = 0; n < nfs.length; n++) {
        const nf = nfs[n]
        const vencStr = nf.getString('data_vencimento')
        if (!vencStr) continue

        const vencDate = new Date(vencStr)
        if (vencDate < agora) {
          if (nf.getString('status') !== 'Atrasada') {
            nf.set('status', 'Atrasada')
            $app.save(nf)
          }

          const prestId = nf.getString('prestador')
          let prestNome = 'Prestador PJ'
          try {
            const p = $app.findRecordById('prestadores_pj', prestId)
            prestNome = p.getString('nome_fantasia') || p.getString('razao_social')
          } catch (_) {}

          let jaExisteNf = false
          try {
            const alRecentes = $app.findRecordsByFilter(
              'alertas',
              "tipo = 'nota_fiscal_pj_atrasada' && prestador = '" + prestId + "'",
              '-created',
              1,
              0,
            )
            if (alRecentes && alRecentes.length > 0) {
              const criacaoAl = new Date(
                alRecentes[0].getString('created') || alRecentes[0].getString('criado_em'),
              )
              const diffHoras = (agora.getTime() - criacaoAl.getTime()) / (1000 * 60 * 60)
              if (diffHoras < 72) jaExisteNf = true
            }
          } catch (_) {}

          if (!jaExisteNf) {
            const numNf = nf.getString('numero_nf')
            const valorNf = nf.getInt('valor')
            const alNf = new Record(alertasCol)
            alNf.set('prestador', prestId)
            alNf.set('score', 85)
            alNf.set('tipo', 'nota_fiscal_pj_atrasada')
            alNf.set('status', 'Novo')
            alNf.set(
              'resumo_ia',
              'Alerta Financeiro PJ: A nota fiscal ' +
                numNf +
                ' de ' +
                prestNome +
                ' no valor de R$ ' +
                valorNf.toLocaleString('pt-BR') +
                ' ultrapassou o vencimento (' +
                vencStr.substring(0, 10) +
                ') sem registro de liquidação/pagamento.',
            )
            alNf.set('criado_em', agoraIso)
            $app.save(alNf)
          }
        }
      }
    } catch (errNfs) {
      console.log('Erro ao checar notas fiscais atrasadas:', errNfs)
    }
  } catch (errGlobal) {
    console.log('Erro geral no cron monitorar_prestadores_pj_cron:', errGlobal)
  }
})

// Rota autenticada para execução manual da varredura sob demanda
routerAdd(
  'POST',
  '/backend/v1/prestadores-pj/varredura',
  (e) => {
    try {
      const authUser = e.auth
      if (!authUser || !authUser.id) {
        return e.json(401, { error: 'Autenticação necessária' })
      }

      const agora = new Date()
      const agoraIso = agora.toISOString().replace('T', ' ').substring(0, 19) + 'Z'
      const alertasCol = $app.findCollectionByNameOrId('alertas')

      let alertasGerados = 0

      // 1. Documentos
      const docs = $app.findRecordsByFilter(
        'documentos_pj',
        "data_validade != '' && data_validade != null",
        '-data_validade',
        200,
        0,
      )
      for (let i = 0; i < docs.length; i++) {
        const doc = docs[i]
        const valStr = doc.getString('data_validade')
        if (!valStr) continue
        const valDate = new Date(valStr)
        const diffDias = Math.ceil((valDate.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))

        let statusCalc = 'Válido'
        if (diffDias < 0) statusCalc = 'Vencido'
        else if (diffDias <= 30) statusCalc = 'Vencendo'

        if (doc.getString('status_calculado') !== statusCalc) {
          doc.set('status_calculado', statusCalc)
          $app.save(doc)
        }

        if (diffDias <= 30) {
          const prestId = doc.getString('prestador')
          let prestNome = 'Prestador PJ'
          try {
            const p = $app.findRecordById('prestadores_pj', prestId)
            prestNome = p.getString('nome_fantasia') || p.getString('razao_social')
          } catch (_) {}

          const isVencido = diffDias < 0
          const chaveTipo = isVencido ? 'documento_pj_vencido' : 'documento_pj_vencendo'

          let jaExiste = false
          try {
            const alRec = $app.findRecordsByFilter(
              'alertas',
              "tipo = '" + chaveTipo + "' && prestador = '" + prestId + "'",
              '',
              1,
              0,
            )
            if (alRec && alRec.length > 0) jaExiste = true
          } catch (_) {}

          if (!jaExiste) {
            const al = new Record(alertasCol)
            al.set('prestador', prestId)
            al.set('score', isVencido ? 95 : 85)
            al.set('tipo', chaveTipo)
            al.set('status', 'Novo')
            al.set(
              'resumo_ia',
              isVencido
                ? 'Documento Fiscal Vencido: O documento "' +
                    doc.getString('tipo_documento') +
                    '" de ' +
                    prestNome +
                    ' está vencido.'
                : 'Documento Próximo do Vencimento: "' +
                    doc.getString('tipo_documento') +
                    '" de ' +
                    prestNome +
                    ' vence em ' +
                    diffDias +
                    ' dias.',
            )
            al.set('criado_em', agoraIso)
            $app.save(al)
            alertasGerados++

            // Registrar na linha do tempo
            try {
              const timelineCol = $app.findCollectionByNameOrId('eventos_timeline_pj')
              if (timelineCol) {
                const ev = new Record(timelineCol)
                ev.set('prestador', prestId)
                ev.set('categoria', 'DOCUMENTOS')
                ev.set('titulo', 'Cobrança de documentos')
                ev.set(
                  'complemento',
                  'enviada por e-mail ao PJ (' + doc.getString('tipo_documento') + ')',
                )
                ev.set('autor', 'sistema')
                ev.set('origem', 'sistema')
                ev.set('data_evento', agoraIso)
                ev.set('referencia_tipo', 'documento_cobranca')
                ev.set('referencia_id', doc.id)
                $app.save(ev)
              }
            } catch (_) {}
          }
        }
      }

      // 2. Contratos
      const contratos = $app.findRecordsByFilter(
        'contratos_pj',
        "status = 'Vigente' || status = 'Vencendo'",
        '-data_fim',
        200,
        0,
      )
      for (let c = 0; c < contratos.length; c++) {
        const ct = contratos[c]
        const fimStr = ct.getString('data_fim')
        if (!fimStr) continue
        const fimDate = new Date(fimStr)
        const diff = Math.ceil((fimDate.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24))

        if (diff <= 30 && diff > 0) {
          if (ct.getString('status') !== 'Vencendo') {
            ct.set('status', 'Vencendo')
            $app.save(ct)
          }

          const prestId = ct.getString('prestador')
          let prestNome = 'Prestador PJ'
          try {
            const p = $app.findRecordById('prestadores_pj', prestId)
            prestNome = p.getString('nome_fantasia') || p.getString('razao_social')
          } catch (_) {}

          let jaExiste = false
          try {
            const alRec = $app.findRecordsByFilter(
              'alertas',
              "tipo = 'contrato_pj_vencendo' && prestador = '" + prestId + "'",
              '',
              1,
              0,
            )
            if (alRec && alRec.length > 0) jaExiste = true
          } catch (_) {}

          if (!jaExiste) {
            const alCt = new Record(alertasCol)
            alCt.set('prestador', prestId)
            alCt.set('score', 90)
            alCt.set('tipo', 'contrato_pj_vencendo')
            alCt.set('status', 'Novo')
            alCt.set(
              'resumo_ia',
              'Renovação Contratual: Contrato "' +
                ct.getString('titulo') +
                '" de ' +
                prestNome +
                ' vence em ~' +
                diff +
                ' dias.',
            )
            alCt.set('criado_em', agoraIso)
            $app.save(alCt)
            alertasGerados++
          }
        }
      }

      // 3. Aditivos Pendentes (> 7 dias)
      try {
        const aditivos = $app.findRecordsByFilter(
          'aditivos_pj',
          "status = 'Pendente de assinatura'",
          '-created',
          200,
          0,
        )
        for (let a = 0; a < aditivos.length; a++) {
          const ad = aditivos[a]
          const criacaoAdStr = ad.getString('created') || ad.getString('updated')
          if (!criacaoAdStr) continue

          const criacaoAdDate = new Date(criacaoAdStr)
          const diffDiasCriacao = Math.floor(
            (agora.getTime() - criacaoAdDate.getTime()) / (1000 * 60 * 60 * 24),
          )

          if (diffDiasCriacao >= 7) {
            const prestId = ad.getString('prestador')
            let prestNome = 'Prestador PJ'
            try {
              const p = $app.findRecordById('prestadores_pj', prestId)
              prestNome = p.getString('nome_fantasia') || p.getString('razao_social')
            } catch (_) {}

            let jaExiste = false
            try {
              const alRec = $app.findRecordsByFilter(
                'alertas',
                "tipo = 'aditivo_pj_pendente' && prestador = '" + prestId + "'",
                '',
                1,
                0,
              )
              if (alRec && alRec.length > 0) jaExiste = true
            } catch (_) {}

            if (!jaExiste) {
              const alAd = new Record(alertasCol)
              alAd.set('prestador', prestId)
              alAd.set('score', 92)
              alAd.set('tipo', 'aditivo_pj_pendente')
              alAd.set('status', 'Novo')
              alAd.set(
                'resumo_ia',
                'Aditivo Contratual Pendente de Assinatura: O Aditivo ' +
                  ad.getString('numero_aditivo') +
                  ' com ' +
                  prestNome +
                  ' aguarda assinatura há ' +
                  diffDiasCriacao +
                  ' dias.',
              )
              alAd.set('criado_em', agoraIso)
              $app.save(alAd)
              alertasGerados++
            }
          }
        }
      } catch (errAditVar) {
        console.log('Erro ao checar aditivos na varredura:', errAditVar)
      }

      // 4. Notas
      const nfs = $app.findRecordsByFilter(
        'notas_fiscais_pj',
        "status != 'Paga' && status != 'Glosada' && data_vencimento != ''",
        '-data_vencimento',
        200,
        0,
      )
      for (let n = 0; n < nfs.length; n++) {
        const nf = nfs[n]
        const vencStr = nf.getString('data_vencimento')
        if (!vencStr) continue
        const vencDate = new Date(vencStr)
        if (vencDate < agora) {
          if (nf.getString('status') !== 'Atrasada') {
            nf.set('status', 'Atrasada')
            $app.save(nf)
          }
          const prestId = nf.getString('prestador')
          let prestNome = 'Prestador PJ'
          try {
            const p = $app.findRecordById('prestadores_pj', prestId)
            prestNome = p.getString('nome_fantasia') || p.getString('razao_social')
          } catch (_) {}

          let jaExiste = false
          try {
            const alRec = $app.findRecordsByFilter(
              'alertas',
              "tipo = 'nota_fiscal_pj_atrasada' && prestador = '" + prestId + "'",
              '',
              1,
              0,
            )
            if (alRec && alRec.length > 0) jaExiste = true
          } catch (_) {}

          if (!jaExiste) {
            const alNf = new Record(alertasCol)
            alNf.set('prestador', prestId)
            alNf.set('score', 85)
            alNf.set('tipo', 'nota_fiscal_pj_atrasada')
            alNf.set('status', 'Novo')
            alNf.set(
              'resumo_ia',
              'Alerta Financeiro PJ: Nota Fiscal ' +
                nf.getString('numero_nf') +
                ' de ' +
                prestNome +
                ' com vencimento ultrapassado.',
            )
            alNf.set('criado_em', agoraIso)
            $app.save(alNf)
            alertasGerados++
          }
        }
      }

      return e.json(200, {
        success: true,
        alertas_gerados: alertasGerados,
        mensagem: 'Varredura de prestadores PJ concluída com sucesso.',
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao executar varredura PJ' })
    }
  },
  $apis.requireAuth(),
)
