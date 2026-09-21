/// <reference path="../pb_data/types.d.ts" />

migrate(
  (app) => {
    const indicacoesCol = app.findCollectionByNameOrId('indicacoes')
    const agora = new Date().toISOString().replace('T', ' ').substring(0, 19) + 'Z'

    // Seed de indicações realistas de promotores/colaboradores para formar um ranking rico e competitivo
    // Leonardo Bastos (candidato: csa9v27ya5porr9, token: ind-leonardo-bastos-seed)
    // 1 indicação convertida, 2 em avaliação, 1 nova
    const indLeo1 = new Record(indicacoesCol)
    indLeo1.set('token_indicador', 'ind-leonardo-bastos-seed')
    indLeo1.set('indicador', 'csa9v27ya5porr9')
    indLeo1.set('vaga', '0vxbkci9xsth920')
    indLeo1.set('indicado_nome', 'Rafael Menezes de Castro')
    indLeo1.set('indicado_email', 'rafael.castro.dev@exemplo.com')
    indLeo1.set('indicado_telefone', '(11) 99122-3344')
    indLeo1.set('indicado_linkedin', 'https://linkedin.com/in/rafael-menezes-go')
    indLeo1.set(
      'mensagem_indicador',
      'Excelente engenheiro de software com forte bagagem em Go e arquitetura de microsserviços.',
    )
    indLeo1.set('status', 'Convertida')
    indLeo1.set('consentimento_lgpd', true)
    indLeo1.set('consentimento_lgpd_data', agora)
    indLeo1.set('consentimento_lgpd_ip', '189.40.55.12')
    app.save(indLeo1)

    const indLeo2 = new Record(indicacoesCol)
    indLeo2.set('token_indicador', 'ind-leonardo-bastos-seed')
    indLeo2.set('indicador', 'csa9v27ya5porr9')
    indLeo2.set('vaga', '0vxbkci9xsth920')
    indLeo2.set('indicado_nome', 'Felipe Antunes Lima')
    indLeo2.set('indicado_email', 'felipe.antunes.dev@exemplo.com')
    indLeo2.set('indicado_telefone', '(11) 98234-5678')
    indLeo2.set('indicado_linkedin', 'https://linkedin.com/in/felipe-antunes-backend')
    indLeo2.set(
      'mensagem_indicador',
      'Atuamos juntos na modernização de clusters Kubernetes. Profissional com altíssima resiliência técnica.',
    )
    indLeo2.set('status', 'Convertida')
    indLeo2.set('consentimento_lgpd', true)
    indLeo2.set('consentimento_lgpd_data', agora)
    indLeo2.set('consentimento_lgpd_ip', '189.40.55.12')
    app.save(indLeo2)

    const indLeo3 = new Record(indicacoesCol)
    indLeo3.set('token_indicador', 'ind-leonardo-bastos-seed')
    indLeo3.set('indicador', 'csa9v27ya5porr9')
    indLeo3.set('vaga', '0vxbkci9xsth920')
    indLeo3.set('indicado_nome', 'Rodrigo Nogueira Campos')
    indLeo3.set('indicado_email', 'rodrigo.campos.go@exemplo.com')
    indLeo3.set('indicado_telefone', '(11) 97345-6789')
    indLeo3.set('mensagem_indicador', 'Especialista em mensageria Kafka e gRPC.')
    indLeo3.set('status', 'Em avaliação')
    indLeo3.set('consentimento_lgpd', true)
    indLeo3.set('consentimento_lgpd_data', agora)
    indLeo3.set('consentimento_lgpd_ip', '189.40.55.12')
    app.save(indLeo3)

    // Camila Ribeiro (z4quacvi8w2e996) - Promotora de Design
    const indCamila1 = new Record(indicacoesCol)
    indCamila1.set('token_indicador', 'ind-camila-ribeiro-seed')
    indCamila1.set('indicador', 'z4quacvi8w2e996')
    indCamila1.set('vaga', 'm929c4k7sgpxifg')
    indCamila1.set('indicado_nome', 'Beatriz Fontes Moraes')
    indCamila1.set('indicado_email', 'beatriz.fontes.ui@exemplo.com')
    indCamila1.set('indicado_telefone', '(19) 98877-6655')
    indCamila1.set('indicado_linkedin', 'https://linkedin.com/in/beatriz-fontes-design')
    indCamila1.set(
      'mensagem_indicador',
      'Designer sênior com projetos premiados em acessibilidade digital e pesquisa etnográfica.',
    )
    indCamila1.set('status', 'Convertida')
    indCamila1.set('consentimento_lgpd', true)
    indCamila1.set('consentimento_lgpd_data', agora)
    indCamila1.set('consentimento_lgpd_ip', '177.30.12.8')
    app.save(indCamila1)

    const indCamila2 = new Record(indicacoesCol)
    indCamila2.set('token_indicador', 'ind-camila-ribeiro-seed')
    indCamila2.set('indicador', 'z4quacvi8w2e996')
    indCamila2.set('vaga', 'm929c4k7sgpxifg')
    indCamila2.set('indicado_nome', 'Guilherme Sampaio Leite')
    indCamila2.set('indicado_email', 'guilherme.leite.ux@exemplo.com')
    indCamila2.set('indicado_telefone', '(19) 97766-5544')
    indCamila2.set('mensagem_indicador', 'Excelente em ideação rápida e testes com usuários reais.')
    indCamila2.set('status', 'Nova')
    indCamila2.set('consentimento_lgpd', true)
    indCamila2.set('consentimento_lgpd_data', agora)
    indCamila2.set('consentimento_lgpd_ip', '177.30.12.8')
    app.save(indCamila2)

    // Lucas Ferreira Lima (ek2yvowslfrsyuy)
    const indLucas1 = new Record(indicacoesCol)
    indLucas1.set('token_indicador', 'ind-lucas-ferreira-seed')
    indLucas1.set('indicador', 'ek2yvowslfrsyuy')
    indLucas1.set('vaga', '0vxbkci9xsth920')
    indLucas1.set('indicado_nome', 'Daniel Vianna Prado')
    indLucas1.set('indicado_email', 'daniel.vianna.cloud@exemplo.com')
    indLucas1.set('indicado_telefone', '(11) 96543-2109')
    indLucas1.set('mensagem_indicador', 'Engenheiro de dados e pipelines distribuídos.')
    indLucas1.set('status', 'Em avaliação')
    indLucas1.set('consentimento_lgpd', true)
    indLucas1.set('consentimento_lgpd_data', agora)
    indLucas1.set('consentimento_lgpd_ip', '187.12.44.89')
    app.save(indLucas1)

    // Também garantir avaliação de experiência para os que não tinham
    try {
      const avalsCol = app.findCollectionByNameOrId('avaliacoes_experiencia')

      // Camila
      const avCamila = new Record(avalsCol)
      avCamila.set('candidato', 'z4quacvi8w2e996')
      avCamila.set('vaga', 'm929c4k7sgpxifg')
      avCamila.set('nota_geral', 10)
      avCamila.set('nps_score', 10)
      avCamila.set('tempo_resposta', 10)
      avCamila.set('clareza_processo', 10)
      avCamila.set('tratamento_rh', 10)
      avCamila.set('clareza_vaga', 9)
      avCamila.set('respondido', true)
      avCamila.set('recomendaria_empresa', 'Sim, com certeza')
      avCamila.set('comentario', 'Processo seletivo mais transparente e humanizado que participei.')
      avCamila.set('token_indicador', 'ind-camila-ribeiro-seed')
      avCamila.set('token_pesquisa', 'exp-camila-ribeiro-seed')
      avCamila.set('status_processo', 'Em andamento')
      app.save(avCamila)

      // Lucas Ferreira
      const avLucas = new Record(avalsCol)
      avLucas.set('candidato', 'ek2yvowslfrsyuy')
      avLucas.set('vaga', '0vxbkci9xsth920')
      avLucas.set('nota_geral', 9)
      avLucas.set('nps_score', 9)
      avLucas.set('tempo_resposta', 9)
      avLucas.set('clareza_processo', 9)
      avLucas.set('tratamento_rh', 10)
      avLucas.set('clareza_vaga', 9)
      avLucas.set('respondido', true)
      avLucas.set('recomendaria_empresa', 'Sim, com certeza')
      avLucas.set('comentario', 'Excelente alinhamento técnico e clareza nas expectativas.')
      avLucas.set('token_indicador', 'ind-lucas-ferreira-seed')
      avLucas.set('token_pesquisa', 'exp-lucas-ferreira-seed')
      avLucas.set('status_processo', 'Em andamento')
      app.save(avLucas)
    } catch (_) {}
  },
  (app) => {
    try {
      const list = app.findRecordsByFilter(
        'indicacoes',
        "indicado_email ~ '@exemplo.com'",
        '',
        50,
        0,
      )
      for (let i = 0; i < list.length; i++) {
        app.delete(list[i])
      }
    } catch (_) {}
  },
)
