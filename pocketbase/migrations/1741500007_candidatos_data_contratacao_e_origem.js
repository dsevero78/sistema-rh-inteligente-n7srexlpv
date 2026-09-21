migrate(
  (app) => {
    const candidatos = app.findCollectionByNameOrId('candidatos')

    // Adicionar campo data_contratacao se não existir
    if (!candidatos.fields.getByName('data_contratacao')) {
      candidatos.fields.add(
        new DateField({
          name: 'data_contratacao',
          required: false,
        }),
      )
    }

    // Adicionar campo canal_origem caso falte ou atualizar
    if (!candidatos.fields.getByName('canal_origem')) {
      candidatos.fields.add(
        new SelectField({
          name: 'canal_origem',
          required: false,
          values: [
            'Página de Carreira',
            'LinkedIn',
            'Indicação interna',
            'Site da empresa',
            'Banco de talentos',
            'Outros canais',
            'Indicação',
          ],
          maxSelect: 1,
        }),
      )
    }

    app.save(candidatos)

    // Preencher dados coerentes de canal_origem e data_contratacao nos registros seeds existentes
    try {
      // 1. Juliana Mendes Castro (Contratada/Aprovada em 2026-09-22)
      app
        .db()
        .newQuery(`
      UPDATE candidatos 
      SET canal_origem = 'LinkedIn', data_contratacao = '2026-09-22 10:00:00.000Z'
      WHERE email = 'juliana.mendes@exemplo.com'
    `)
        .execute()

      // 2. Lucas Ferreira Lima (Entrevista técnica)
      app
        .db()
        .newQuery(`
      UPDATE candidatos 
      SET canal_origem = 'LinkedIn'
      WHERE email = 'lucas.ferreira@exemplo.com' AND (canal_origem IS NULL OR canal_origem = '')
    `)
        .execute()

      // 3. Camila Ribeiro Santos (Match IA)
      app
        .db()
        .newQuery(`
      UPDATE candidatos 
      SET canal_origem = 'Página de Carreira'
      WHERE email = 'camila.ribeiro@exemplo.com' AND (canal_origem IS NULL OR canal_origem = '')
    `)
        .execute()

      // 4. Renato Albuquerque (Triagem)
      app
        .db()
        .newQuery(`
      UPDATE candidatos 
      SET canal_origem = 'Página de Carreira'
      WHERE email = 'renato.albuquerque@exemplo.com' AND (canal_origem IS NULL OR canal_origem = '')
    `)
        .execute()

      // 5. Gabriel Souza Nogueira (Triagem)
      app
        .db()
        .newQuery(`
      UPDATE candidatos 
      SET canal_origem = 'Site da empresa'
      WHERE email = 'gabriel.nogueira@exemplo.com' AND (canal_origem IS NULL OR canal_origem = '')
    `)
        .execute()

      // 6. Mariana Prado Duarte (Entrevista RH)
      app
        .db()
        .newQuery(`
      UPDATE candidatos 
      SET canal_origem = 'Indicação interna'
      WHERE email = 'mariana.prado@exemplo.com' AND (canal_origem IS NULL OR canal_origem = '')
    `)
        .execute()

      // 7. Leonardo Bastos Silveira (Banco de Talentos)
      app
        .db()
        .newQuery(`
      UPDATE candidatos 
      SET canal_origem = 'LinkedIn'
      WHERE email = 'leonardo.bastos@exemplo.com' AND (canal_origem IS NULL OR canal_origem = '')
    `)
        .execute()

      // 8. Beatriz Nogueira Fontes (Banco de Talentos)
      app
        .db()
        .newQuery(`
      UPDATE candidatos 
      SET canal_origem = 'Página de Carreira'
      WHERE email = 'beatriz.fontes@exemplo.com' AND (canal_origem IS NULL OR canal_origem = '')
    `)
        .execute()

      // 9. Vinicius Moreira Duarte (Banco de Talentos)
      app
        .db()
        .newQuery(`
      UPDATE candidatos 
      SET canal_origem = 'Outros canais'
      WHERE email = 'vinicius.moreira@exemplo.com' AND (canal_origem IS NULL OR canal_origem = '')
    `)
        .execute()
    } catch (err) {
      console.log('Aviso ao popular campos de candidatos:', err)
    }
  },
  (app) => {
    const candidatos = app.findCollectionByNameOrId('candidatos')
    const f = candidatos.fields.getByName('data_contratacao')
    if (f) {
      candidatos.fields.remove(f)
      app.save(candidatos)
    }
  },
)
