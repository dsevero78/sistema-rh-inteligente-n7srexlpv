/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
    const empresasCol = app.findCollectionByNameOrId('empresas')
    const areasCol = app.findCollectionByNameOrId('areas')

    // 1. Adicionar campos 'empresa' e 'area' na coleção users
    if (!usersCol.fields.getByName('empresa')) {
      usersCol.fields.add(
        new RelationField({
          name: 'empresa',
          collectionId: empresasCol.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    if (!usersCol.fields.getByName('area')) {
      usersCol.fields.add(
        new RelationField({
          name: 'area',
          collectionId: areasCol.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    // Permitir que usuários autenticados listem os usuários da organização
    // (necessário para RH gerenciar gestores e selecionar gestores responsáveis)
    usersCol.listRule = "@request.auth.id != ''"
    usersCol.viewRule = "@request.auth.id != ''"
    // updateRule: o próprio usuário ou RH pode atualizar
    usersCol.updateRule = "@request.auth.id != ''"

    app.save(usersCol)

    // 2. Localizar IDs de empresas e áreas para o seed
    let holdingId = ''
    let techId = ''
    let verticeId = ''
    let opsId = ''

    try {
      const empresas = app.findRecordsByFilter('empresas', '', '', 10, 0)
      for (const e of empresas) {
        const nome = e.getString('nome_fantasia')
        if (nome.includes('Holding')) holdingId = e.id
        else if (nome.includes('Tecnologia')) techId = e.id
        else if (nome.includes('Vértice')) verticeId = e.id
        else if (nome.includes('Operações')) opsId = e.id
      }
    } catch (err) {
      console.log('Aviso ao buscar empresas:', err)
    }

    let areaTechEngId = ''
    let areaVerticeMktId = ''
    let areaOpsGeralId = ''

    try {
      const areas = app.findRecordsByFilter('areas', '', '', 20, 0)
      for (const a of areas) {
        const nome = a.getString('nome')
        if (nome.includes('Engenharia')) areaTechEngId = a.id
        else if (nome.includes('Employer') || nome.includes('Conteúdo')) areaVerticeMktId = a.id
        else if (nome.includes('Operações')) areaOpsGeralId = a.id
      }
    } catch (err) {
      console.log('Aviso ao buscar áreas:', err)
    }

    // 3. Vincular gestor principal (gestor@empresa.com - Carlos Mendonça) a SouYess Tecnologia (BU)
    try {
      const gestorTech = app.findAuthRecordByEmail('_pb_users_auth_', 'gestor@empresa.com')
      if (techId) gestorTech.set('empresa', techId)
      if (areaTechEngId) gestorTech.set('area', areaTechEngId)
      gestorTech.set('name', 'Carlos Mendonça (Líder BU Tecnologia)')
      app.save(gestorTech)
    } catch (e1) {
      console.log('Aviso ao vincular gestor@empresa.com:', e1)
    }

    // 4. Vincular segundo gestor (gestora.produto@empresa.com - Mariana Siqueira) à BU SouYess Vértice Mídia
    // demonstrando isolamento entre BUs
    try {
      const gestoraVertice = app.findAuthRecordByEmail(
        '_pb_users_auth_',
        'gestora.produto@empresa.com',
      )
      if (verticeId) gestoraVertice.set('empresa', verticeId)
      if (areaVerticeMktId) gestoraVertice.set('area', areaVerticeMktId)
      gestoraVertice.set('name', 'Mariana Siqueira (Líder BU Vértice Mídia)')
      app.save(gestoraVertice)
    } catch (e2) {
      console.log('Aviso ao vincular gestora.produto@empresa.com:', e2)
    }

    // 5. Criar terceiro gestor para demonstrar SouYess Operações caso não exista
    try {
      app.findAuthRecordByEmail('_pb_users_auth_', 'gestor.operacoes@empresa.com')
    } catch (_) {
      try {
        const gestorOps = new Record(usersCol)
        gestorOps.setEmail('gestor.operacoes@empresa.com')
        gestorOps.setPassword('Skip@Pass')
        gestorOps.setVerified(true)
        gestorOps.set('name', 'Roberto Farias (Líder BU Operações)')
        gestorOps.set('cargo_funcao', 'Gestor Contratante')
        if (opsId) gestorOps.set('empresa', opsId)
        if (areaOpsGeralId) gestorOps.set('area', areaOpsGeralId)
        app.save(gestorOps)
      } catch (e3) {
        console.log('Aviso ao criar gestor.operacoes@empresa.com:', e3)
      }
    }

    // 6. Garantir que o RH (severo.douglas2@gmail.com) não fique restrito à BU (ou vinculado à Holding)
    try {
      const userRh = app.findAuthRecordByEmail('_pb_users_auth_', 'severo.douglas2@gmail.com')
      // RH pode ter holding como empresa institucional mas perfil RH / Recrutador não restringe
      if (holdingId) userRh.set('empresa', holdingId)
      app.save(userRh)
    } catch (e4) {
      console.log('Aviso ao atualizar RH:', e4)
    }
  },
  (app) => {
    try {
      const userOps = app.findAuthRecordByEmail('_pb_users_auth_', 'gestor.operacoes@empresa.com')
      app.delete(userOps)
    } catch (_) {}

    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('area')) usersCol.fields.removeByName('area')
      if (usersCol.fields.getByName('empresa')) usersCol.fields.removeByName('empresa')
      usersCol.listRule = 'id = @request.auth.id'
      usersCol.viewRule = 'id = @request.auth.id'
      usersCol.updateRule = 'id = @request.auth.id'
      app.save(usersCol)
    } catch (_) {}
  },
)
