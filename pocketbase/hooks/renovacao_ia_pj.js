// ============================================================================
// Hook: Renovação Assistida por IA para Prestadores PJ
// Endpoint: POST /backend/v1/prestadores-pj/renovacao-ia
// Produz:
// 1. Rascunho de E-mail de negociação/renovação profissional
// 2. Minuta Contratual Estruturada (Termo Aditivo de Prorrogação/Renovação)
// 3. Registra auditoria na linha do tempo institucional (eventos_timeline_pj)
// ============================================================================

routerAdd(
  'POST',
  '/backend/v1/prestadores-pj/renovacao-ia',
  (e) => {
    try {
      const authUser = e.auth
      if (!authUser || !authUser.id) {
        return e.json(401, { error: 'Autenticação necessária' })
      }

      const body = e.requestInfo().body || {}
      const prestadorId = body.prestador_id
      if (!prestadorId) {
        return e.badRequestError('prestador_id obrigatório')
      }

      // 1. Carregar prestador
      const prestador = $app.findRecordById('prestadores_pj', prestadorId)
      const nomePrestador =
        prestador.getString('nome_fantasia') ||
        prestador.getString('razao_social') ||
        'Prestador PJ'
      const razaoSocial = prestador.getString('razao_social') || nomePrestador
      const cnpj = prestador.getString('cnpj') || ''
      const areaAtuacao = prestador.getString('area_atuacao') || 'Serviços Especializados'
      const contatoNome = prestador.getString('contato_nome') || 'Prezado(a) Parceiro(a)'
      const contatoEmail = prestador.getString('contato_email') || ''
      const mediaAvaliacao = prestador.getFloat('media_avaliacao') || 0
      const totalAvaliacoes = prestador.getInt('total_avaliacoes') || 0
      const enderecoPrestador = prestador.getString('endereco') || 'São Paulo - SP'

      // 2. Carregar contrato principal/vigente
      let contrato = null
      try {
        if (body.contrato_id) {
          contrato = $app.findRecordById('contratos_pj', body.contrato_id)
        } else {
          const contratos = $app.findRecordsByFilter(
            'contratos_pj',
            "prestador = '" + prestadorId + "' && (status = 'Vigente' || status = 'Vencendo')",
            '-data_fim',
            1,
            0,
          )
          if (contratos && contratos.length > 0) {
            contrato = contratos[0]
          }
        }
      } catch (_) {}

      // Se ainda não encontrou contrato específico, buscar qualquer um do prestador
      if (!contrato) {
        try {
          const cts = $app.findRecordsByFilter(
            'contratos_pj',
            "prestador = '" + prestadorId + "'",
            '-created',
            1,
            0,
          )
          if (cts && cts.length > 0) {
            contrato = cts[0]
          }
        } catch (_) {}
      }

      const numeroContrato = contrato ? contrato.getString('numero_contrato') : 'CT-PJ-2025'
      const tituloContrato = contrato
        ? contrato.getString('titulo')
        : 'Prestação de Serviços Profissionais'
      const valorBaseContrato = contrato ? contrato.getInt('valor') || 0 : 0
      let dataInicioContrato = contrato ? contrato.getString('data_inicio') : ''
      let dataFimContrato = contrato ? contrato.getString('data_fim') : ''
      const clausulasResumo = contrato ? contrato.getString('clausulas_resumo') : ''

      // 3. Carregar aditivos do prestador
      let aditivos = []
      try {
        aditivos = $app.findRecordsByFilter(
          'aditivos_pj',
          "prestador = '" + prestadorId + "'",
          '-sequencia,-created',
          20,
          0,
        )
      } catch (_) {}

      let dataFimEfetiva = dataFimContrato
      let valorMensalEfetivo = prestador.getInt('valor_mensal_atual') || valorBaseContrato
      let ultimoAditivoVigente = null
      let temAditivoPendente = false
      let aditivoPendenteObj = null

      for (let i = 0; i < aditivos.length; i++) {
        const ad = aditivos[i]
        const st = ad.getString('status')
        if (st === 'Vigente') {
          const novaFim = ad.getString('nova_vigencia_fim')
          if (novaFim && novaFim > dataFimEfetiva) {
            dataFimEfetiva = novaFim
          }
          const novoVal = ad.getInt('novo_valor_mensal')
          if (
            novoVal > 0 &&
            (!prestador.getInt('valor_mensal_atual') || prestador.getInt('valor_mensal_atual') <= 0)
          ) {
            valorMensalEfetivo = novoVal
          }
          if (!ultimoAditivoVigente) {
            ultimoAditivoVigente = ad
          }
        } else if (st === 'Pendente de assinatura') {
          temAditivoPendente = true
          if (!aditivoPendenteObj) {
            aditivoPendenteObj = ad
          }
        }
      }

      // 4. Carregar avaliações do prestador
      let avaliacoes = []
      let ultimaAvaliacao = null
      try {
        avaliacoes = $app.findRecordsByFilter(
          'avaliacoes_prestador_pj',
          "prestador = '" + prestadorId + "'",
          '-created',
          5,
          0,
        )
        if (avaliacoes && avaliacoes.length > 0) {
          ultimaAvaliacao = avaliacoes[0]
        }
      } catch (_) {}

      const notaQualidade = ultimaAvaliacao ? ultimaAvaliacao.getInt('nota_qualidade_tecnica') : 9
      const notaPrazo = ultimaAvaliacao ? ultimaAvaliacao.getInt('nota_prazo') : 8
      const notaComunicacao = ultimaAvaliacao ? ultimaAvaliacao.getInt('nota_comunicacao') : 9
      const recomendacaoAvaliacao = ultimaAvaliacao
        ? ultimaAvaliacao.getString('recomendacao')
        : 'Renovar'
      const comentarioAvaliacao = ultimaAvaliacao ? ultimaAvaliacao.getString('comentario') : ''
      const pontosFortes = ultimaAvaliacao ? ultimaAvaliacao.getString('pontos_fortes') : ''
      const pontosMelhoria = ultimaAvaliacao ? ultimaAvaliacao.getString('pontos_melhoria') : ''

      // 5. Mediana e semáforo do portfólio
      const todosPrestadores = $app.findRecordsByFilter(
        'prestadores_pj',
        "status = 'Ativo' || status = 'Em renovação'",
        '',
        100,
        0,
      )
      let valoresHora = []
      for (let p = 0; p < todosPrestadores.length; p++) {
        const vm = todosPrestadores[p].getInt('valor_mensal_atual') || 0
        if (vm > 0) valoresHora.push(vm / 160)
      }
      valoresHora.sort((a, b) => a - b)
      let medianaValorHora = 100
      if (valoresHora.length > 0) {
        const mid = Math.floor(valoresHora.length / 2)
        medianaValorHora =
          valoresHora.length % 2 !== 0
            ? valoresHora[mid]
            : (valoresHora[mid - 1] + valoresHora[mid]) / 2
      }

      const valorHora = valorMensalEfetivo > 0 ? valorMensalEfetivo / 160 : 0
      const notaBaseCalculo = mediaAvaliacao > 0 ? mediaAvaliacao : 8.5
      const custoPorPonto = valorHora / notaBaseCalculo
      const acimaDaMediana = valorHora > medianaValorHora

      // Decisão do semáforo
      let decisao = 'RENOVAR'
      let emojiDecisao = '🟢'
      let justificativa = ''
      let propostaAjuste = ''

      if (mediaAvaliacao < 8.0 || recomendacaoAvaliacao.toLowerCase().includes('não renovar')) {
        decisao = 'REAVALIAR'
        emojiDecisao = '🔴'
        justificativa =
          'Desempenho abaixo do limiar (nota ' +
          mediaAvaliacao.toFixed(1) +
          '/10). Recomenda-se reunião de alinhamento com plano corretivo ou transição/concorrência no mercado.'
        propostaAjuste = 'Manutenção estrita ou redução de escopo/honorários condicionado a metas.'
      } else if (
        acimaDaMediana ||
        mediaAvaliacao < 9.0 ||
        temAditivoPendente ||
        recomendacaoAvaliacao.toLowerCase().includes('ressalvas')
      ) {
        decisao = 'RENEGOCIAR'
        emojiDecisao = '🟡'
        justificativa =
          'Valor-hora (R$ ' +
          valorHora.toFixed(2) +
          '/h) acima da mediana do portfólio (R$ ' +
          medianaValorHora.toFixed(2) +
          '/h) ou avaliação com ressalvas operacionais (nota ' +
          mediaAvaliacao.toFixed(1) +
          '/10).'
        propostaAjuste =
          'Ajuste para valor-hora próximo à mediana corporativa ou redefinição dos entregáveis e prazos.'
      } else {
        decisao = 'RENOVAR'
        emojiDecisao = '🟢'
        justificativa =
          'Excelente desempenho (nota ' +
          mediaAvaliacao.toFixed(1) +
          '/10) e custo por ponto competitivo (R$ ' +
          custoPorPonto.toFixed(2) +
          '/pt).'
        propostaAjuste =
          'Prorrogação de 12 meses mantendo condições ou reajuste inflacionário padrão.'
      }

      // Calcular dias para o vencimento
      const hoje = new Date()
      let diasRestantes = 30
      if (dataFimEfetiva) {
        const fimD = new Date(dataFimEfetiva)
        diasRestantes = Math.ceil((fimD.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
      }

      // 6. Montar prompt estruturado para o Skip AI Gateway (model: fast)
      const prompt =
        'Você é o Diretor Jurídico e de Gente & Gestão da organização contratante. ' +
        'Gere uma proposta institucional e jurídica completa de renovação contratual para um prestador de serviços PJ, ' +
        'baseando-se com rigor nos dados reais do contrato, aditivos, avaliações e na decisão do comparativo de custo.\n\n' +
        '=== DADOS DO PRESTADOR E CONTRATO ===\n' +
        'Nome Fantasia: ' +
        nomePrestador +
        '\n' +
        'Razão Social: ' +
        razaoSocial +
        '\n' +
        'CNPJ: ' +
        cnpj +
        '\n' +
        'Área: ' +
        areaAtuacao +
        '\n' +
        'Contato do Prestador: ' +
        contatoNome +
        ' (' +
        contatoEmail +
        ')\n' +
        'Endereço: ' +
        enderecoPrestador +
        '\n' +
        'Contrato Vigente: ' +
        numeroContrato +
        ' — "' +
        tituloContrato +
        '"\n' +
        'Data Início Original: ' +
        dataInicioContrato +
        '\n' +
        'Vigência Fim Efetiva Atual: ' +
        dataFimEfetiva +
        ' (restam ' +
        diasRestantes +
        ' dias)\n' +
        'Valor Mensal Atual: R$ ' +
        valorMensalEfetivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) +
        ' (R$ ' +
        valorHora.toFixed(2) +
        '/h base 160h)\n' +
        'Escopo/Cláusulas vigentes: ' +
        (clausulasResumo || 'Prestação continuada de serviços técnicos especializados.') +
        '\n\n' +
        '=== DESEMPENHO E COMPARATIVO DE CUSTO ===\n' +
        'Nota Média Geral: ' +
        (mediaAvaliacao > 0 ? mediaAvaliacao.toFixed(1) + '/10' : '8.8/10') +
        ' (' +
        totalAvaliacoes +
        ' avaliações)\n' +
        'Notas por Quesito: Qualidade=' +
        notaQualidade +
        '/10, Prazos=' +
        notaPrazo +
        '/10, Comunicação=' +
        notaComunicacao +
        '/10\n' +
        'Recomendação Técnica: "' +
        recomendacaoAvaliacao +
        '"\n' +
        'Pontos Fortes: ' +
        (pontosFortes || 'Qualidade técnica nas entregas') +
        '\n' +
        'Pontos de Atenção/Melhoria: ' +
        (pontosMelhoria || 'Prazos de entrega de versões finais') +
        '\n' +
        'Comentário da Liderança: ' +
        (comentarioAvaliacao || 'Parceria com boa entrega de resultados') +
        '\n' +
        'Mediana do Portfólio de Prestadores: R$ ' +
        medianaValorHora.toFixed(2) +
        '/h\n' +
        'Custo por Ponto de Avaliação: R$ ' +
        custoPorPonto.toFixed(2) +
        '/ponto\n' +
        'Decisão do Comparativo: ' +
        decisao +
        ' (' +
        emojiDecisao +
        ')\n' +
        'Justificativa Técnica: ' +
        justificativa +
        '\n' +
        'Proposta Estratégica: ' +
        propostaAjuste +
        '\n' +
        (temAditivoPendente
          ? 'ATENÇÃO: Há aditivo pendente de assinatura (' +
            (aditivoPendenteObj ? aditivoPendenteObj.getString('numero_aditivo') : 'em aberto') +
            '). Regularizar formalização na negociação.\n'
          : '') +
        '\n' +
        '=== INSTRUÇÕES DE SAÍDA ===\n' +
        'Retorne EXCLUSIVAMENTE um objeto JSON válido (sem marcadores markdown ```json ou ``` e sem preâmbulos) contendo:\n' +
        '{\n' +
        '  "email": {\n' +
        '    "assunto": "Assunto do e-mail profissional e cordial em pt-BR",\n' +
        '    "destinatario_nome": "' +
        contatoNome +
        '",\n' +
        '    "destinatario_email": "' +
        contatoEmail +
        '",\n' +
        '    "corpo_texto": "Texto completo do e-mail em pt-BR com quebras de linha \\\\n. O tom deve ser corporativo, cordial e transparente, citando o reconhecimento do trabalho, a decisão do comparativo (' +
        decisao +
        ') e as condições propostas (ex: alinhamento de prazos, adequação do valor-hora com base na mediana e custo/ponto quando for Renegociar, ou reconhecimento da nota alta quando for Renovar), convidando para assinatura da minuta em anexo ou reunião de alinhamento.",\n' +
        '    "tom_comunicacao": "Cordial e Negocial / Estratégico"\n' +
        '  },\n' +
        '  "minuta": {\n' +
        '    "titulo": "TERMO ADITIVO DE RENOVAÇÃO CONTRATUAL AO CONTRATO Nº ' +
        numeroContrato +
        '",\n' +
        '    "preambulo_partes": "Texto identificando a CONTRATANTE e a CONTRATADA (' +
        razaoSocial +
        ', CNPJ ' +
        cnpj +
        ', endereço ' +
        enderecoPrestador +
        ')",\n' +
        '    "clausula_objeto": "Texto da Cláusula Primeira - Objeto e Prorrogação de Vigência...",\n' +
        '    "clausula_vigencia": "Texto da Cláusula Segunda - Do Prazo de Vigência (nova vigência proposta de 12 meses a partir do término atual)...",\n' +
        '    "clausula_valor": "Texto da Cláusula Terceira - Do Valor e Forma de Pagamento (especificando valor mensal e valor-hora base 160h)...",\n' +
        '    "clausula_sla_entregas": "Texto da Cláusula Quarta - Dos Níveis de Serviço, Prazos e Qualidade Técnica (incorporando as melhorias das avaliações)...",\n' +
        '    "clausula_confidencialidade_lgpd": "Texto da Cláusula Quinta - Da Confidencialidade e Conformidade LGPD...",\n' +
        '    "clausula_disposicoes_gerais": "Texto da Cláusula Sexta - Da Ratificação e Foro...",\n' +
        '    "prazo_assinatura_dias": 10,\n' +
        '    "texto_completo_formatado": "Texto integral da minuta compilado para leitura contínua e exportação rápida..."\n' +
        '  },\n' +
        '  "sintese_decisao": {\n' +
        '    "decisao": "' +
        decisao +
        '",\n' +
        '    "emoji": "' +
        emojiDecisao +
        '",\n' +
        '    "valor_mensal_proposto": ' +
        valorMensalEfetivo +
        ',\n' +
        '    "valor_hora_proposto": ' +
        Number(valorHora.toFixed(2)) +
        ',\n' +
        '    "dias_para_vencer": ' +
        diasRestantes +
        ',\n' +
        '    "recomendacao_resumo": "' +
        justificativa +
        '"\n' +
        '  }\n' +
        '}'

      let aiRes = null
      try {
        aiRes = $ai.chat({
          model: 'fast',
          messages: [
            {
              role: 'system',
              content:
                'Você é um Head Jurídico e de Gente & Gestão especializado em contratos de prestação de serviços PJ. Responda EXCLUSIVAMENTE com um JSON válido, sem tags de código.',
            },
            { role: 'user', content: prompt },
          ],
        })
      } catch (errAi) {
        console.log('Erro ao chamar $ai.chat na renovação assistida PJ:', errAi)
      }

      let raw = ''
      if (aiRes && aiRes.choices && aiRes.choices.length > 0 && aiRes.choices[0].message) {
        raw = aiRes.choices[0].message.content || ''
      }
      raw = raw.trim()
      if (raw.startsWith('```json')) raw = raw.substring(7)
      if (raw.startsWith('```')) raw = raw.substring(3)
      if (raw.endsWith('```')) raw = raw.substring(0, raw.length - 3)
      raw = raw.trim()

      let parsed = null
      try {
        parsed = JSON.parse(raw)
      } catch (errJson) {
        console.log('Fallback estruturado para renovação PJ:', errJson)
        // Fallback robusto e profissional caso a resposta não seja JSON perfeito
        const novaDataFimAnoSeguinte = dataFimEfetiva
          ? new Date(
              new Date(dataFimEfetiva).setFullYear(new Date(dataFimEfetiva).getFullYear() + 1),
            )
              .toISOString()
              .substring(0, 10)
          : '2027-10-10'

        const emailTexto =
          'Prezada ' +
          contatoNome +
          ' e equipe ' +
          nomePrestador +
          ',\n\n' +
          'Esperamos que este e-mail os encontre bem.\n\n' +
          'Em virtude da proximidade do término de vigência do Contrato nº ' +
          numeroContrato +
          ' (' +
          tituloContrato +
          '), previsto para ' +
          (dataFimEfetiva || 'o próximo ciclo') +
          ', nossa equipe de Gente & Gestão realizou a avaliação periódica de desempenho e o comparativo anual de custos corporativos.\n\n' +
          'Gostaríamos de destacar os pontos positivos da parceria no período recente, com nota média de ' +
          mediaAvaliacao.toFixed(1) +
          '/10' +
          (pontosFortes ? ' e excelente ' + pontosFortes.toLowerCase() : '') +
          '.\n\n' +
          (decisao === 'RENEGOCIAR'
            ? 'Para viabilizar a prorrogação por mais 12 meses em conformidade com as diretrizes financeiras da organização (onde a mediana de mercado está calibrada em R$ ' +
              medianaValorHora.toFixed(2) +
              '/hora), propomos um alinhamento sobre as entregas prioritárias e a adequação das condições de honorários, garantindo sinergia e sustentabilidade para ambas as partes.\n\n'
            : 'Considerando o alto nível de entrega e a competitividade do custo por ponto apurado em nossa matriz, confirmamos o interesse institucional na renovação integral da vigência por mais 12 (doze) meses, mantendo a estrutura vigente.\n\n') +
          'Encaminhamos anexa a Minuta do Termo Aditivo de Renovação para conferência prévia. Solicitamos a gentileza de nos enviar suas considerações em até 10 (dez) dias úteis ou sinalizar disponibilidade para uma breve reunião de alinhamento.\n\n' +
          'Atenciosamente,\n\n' +
          (authUser.name || 'Gente & Gestão') +
          '\nDiretoria de Gente, Gestão & Jurídico Corporativo\nSistema RH Inteligente'

        const minutaTexto =
          'TERMO ADITIVO DE RENOVAÇÃO CONTRATUAL AO CONTRATO Nº ' +
          numeroContrato +
          '\n\n' +
          'Pelo presente instrumento particular, de um lado SISTEMA RH INTELIGENTE S.A. ("CONTRATANTE"), e de outro lado ' +
          razaoSocial +
          ', inscrita no CNPJ sob o nº ' +
          cnpj +
          ', com sede em ' +
          enderecoPrestador +
          ' ("CONTRATADA"), têm entre si justo e acordado o presente Termo Aditivo:\n\n' +
          'CLÁUSULA PRIMEIRA - DO OBJETO E PRORROGAÇÃO:\n' +
          'O presente Aditivo tem por objeto prorrogar a vigência do Contrato nº ' +
          numeroContrato +
          ' referente a ' +
          tituloContrato +
          ', por mais 12 (doze) meses, fixando o novo termo final em ' +
          novaDataFimAnoSeguinte +
          '.\n\n' +
          'CLÁUSULA SEGUNDA - DO VALOR E FORMA DE PAGAMENTO:\n' +
          'A CONTRATANTE pagará à CONTRATADA o valor mensal de R$ ' +
          valorMensalEfetivo.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) +
          ' (equivalente a R$ ' +
          valorHora.toFixed(2) +
          '/h sob a premissa referencial de 160h/mês), mediante apresentação de Nota Fiscal regular e Relatório de Medição até o 5º dia útil.\n\n' +
          'CLÁUSULA TERCEIRA - DOS NÍVEIS DE SERVIÇO E AVALIAÇÃO:\n' +
          'A CONTRATADA compromete-se a manter nota média de avaliação de qualidade e pontualidade igual ou superior a 8.5/10 nas medições trimestrais realizadas pela liderança contratante.\n\n' +
          'CLÁUSULA QUARTA - DA CONFIDENCIALIDADE E LGPD:\n' +
          'As partes ratificam o compromisso irrestrito de proteção de dados pessoais e sigilo comercial nos termos da Lei Geral de Proteção de Dados (Lei 13.709/2018).\n\n' +
          'CLÁUSULA QUINTA - DA RATIFICAÇÃO:\n' +
          'Permanecem inalteradas todas as demais cláusulas e condições do contrato original que não colidam com o presente aditivo.\n\n' +
          'São Paulo, ' +
          hoje.toLocaleDateString('pt-BR') +
          '.\n\n' +
          '_____________________________\nCONTRATANTE\n\n' +
          '_____________________________\nCONTRATADA (' +
          razaoSocial +
          ')'

        parsed = {
          email: {
            assunto:
              (decisao === 'RENOVAR'
                ? '🟢 Renovação Contratual: '
                : '🟡 Alinhamento de Renovação Contratual: ') +
              tituloContrato +
              ' — ' +
              nomePrestador,
            destinatario_nome: contatoNome,
            destinatario_email: contatoEmail,
            corpo_texto: emailTexto,
            tom_comunicacao:
              decisao === 'RENOVAR' ? 'Cordial e Confirmatório' : 'Cordial e Negocial',
          },
          minuta: {
            titulo: 'TERMO ADITIVO DE RENOVAÇÃO AO CONTRATO Nº ' + numeroContrato,
            preambulo_partes:
              'Contratante: Sistema RH Inteligente S.A. | Contratada: ' +
              razaoSocial +
              ' (CNPJ ' +
              cnpj +
              ')',
            clausula_objeto:
              'Prorrogação da vigência da prestação de serviços de ' +
              tituloContrato +
              ' por 12 meses.',
            clausula_vigencia:
              'Vigência estendida até ' + novaDataFimAnoSeguinte + ' mantendo os termos pactuados.',
            clausula_valor:
              'Remuneração mensal de R$ ' +
              valorMensalEfetivo.toLocaleString('pt-BR') +
              ' (R$ ' +
              valorHora.toFixed(2) +
              '/h base 160h).',
            clausula_sla_entregas:
              'Manutenção de índice de qualidade >= 8.5/10 e pontualidade de entregas.',
            clausula_confidencialidade_lgpd:
              'Cumprimento integral da LGPD e guarda de sigilo institucional.',
            clausula_disposicoes_gerais:
              'Ratificação das demais cláusulas e foro da Comarca de São Paulo.',
            prazo_assinatura_dias: 10,
            texto_completo_formatado: minutaTexto,
          },
          sintese_decisao: {
            decisao: decisao,
            emoji: emojiDecisao,
            valor_mensal_proposto: valorMensalEfetivo,
            valor_hora_proposto: Number(valorHora.toFixed(2)),
            dias_para_vencer: diasRestantes,
            recomendacao_resumo: justificativa,
          },
        }
      }

      // 7. Gravar evento de auditoria na linha do tempo do prestador (eventos_timeline_pj)
      try {
        const timelineCol = $app.findCollectionByNameOrId('eventos_timeline_pj')
        if (timelineCol) {
          const ev = new Record(timelineCol)
          ev.set('prestador', prestadorId)
          ev.set('categoria', 'REGISTRO')
          ev.set('titulo', 'Renovação Assistida por IA Gerada:')
          ev.set(
            'complemento',
            'Rascunho de e-mail e minuta de renovação contratual elaborados com base na decisão do comparativo: ' +
              decisao +
              ' (R$ ' +
              valorHora.toFixed(2) +
              '/h base 160h, nota ' +
              mediaAvaliacao.toFixed(1) +
              '/10).',
          )
          ev.set('autor', authUser.getString('name') || 'Gestor RH')
          ev.set('origem', 'sistema')
          ev.set('data_evento', new Date().toISOString())
          ev.set('referencia_tipo', 'renovacao_ia')
          if (contrato) {
            ev.set('referencia_id', contrato.id)
          }
          $app.save(ev)
        }
      } catch (errEv) {
        console.log('Aviso ao registrar evento de renovação IA na timeline:', errEv)
      }

      return e.json(200, {
        success: true,
        prestador: {
          id: prestadorId,
          nome: nomePrestador,
          cnpj: cnpj,
        },
        contrato: {
          id: contrato ? contrato.id : '',
          numero: numeroContrato,
          titulo: tituloContrato,
        },
        decisao: decisao,
        emoji: emojiDecisao,
        resultado: parsed,
      })
    } catch (err) {
      return e.json(500, {
        error: err.message || 'Falha ao processar renovação assistida por IA',
      })
    }
  },
  $apis.requireAuth(),
)
