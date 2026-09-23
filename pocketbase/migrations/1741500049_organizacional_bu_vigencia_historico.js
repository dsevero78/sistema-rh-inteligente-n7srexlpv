/// <reference path="../pb_data/types.d.ts" />

/**
 * Migração: 1741500049_organizacional_bu_vigencia_historico.js
 *
 * Módulo 1: Regularização do Fechamento v0.0.93
 * 1. Evolução aditiva em `empresas`:
 *    - `is_unidade_negocio` (bool): diferencia BU operacional de Pessoa Jurídica formal (CNPJ)
 *    - `is_pessoa_juridica` (bool): marca formalmente entidades com CNPJ jurídico
 *    - `empresa_juridica_pai` (relation -> empresas): permite que uma Empresa Jurídica formal relacione-se com múltiplas BUs
 *    - `correspondencia_bu_status` (select): 'pendente_decisao_negocio' | 'definida' | 'nao_aplicavel'
 *    - `is_demonstracao` (bool): isola registros de teste/demonstração
 *
 * 2. Vigência e Histórico Organizacional em `pessoas`:
 *    - `gestor_imediato_pessoa` (relation -> pessoas): subordinação direta entre colaboradores
 *    - `vigencia_inicio` (date): início da relação organizacional atual (default ou retroativo)
 *    - `vigencia_fim` (date): encerramento da vigência organizacional
 *    - `historico_movimentacoes` (json): array com trilha de auditoria e movimentações
 *    - `rotulo_vigencia` (text): ex. "Vigente a partir da implantação"
 *
 * 3. Campos em `areas`:
 *    - `vigencia_inicio` (date)
 *    - `vigencia_fim` (date)
 *
 * 4. Seed demonstrativo isolado de PJ com múltiplas BUs:
 *    - Exemplo de empresa jurídica mãe compartilhada sem quebrar integridade existente
 */

migrate(
  (app) => {
    // -------------------------------------------------------------------------
    // 1. Atualizar coleção 'empresas' com novos campos aditivos
    // -------------------------------------------------------------------------
    try {
      const colEmpresas = app.findCollectionByNameOrId('empresas')

      // Verificar se campos já existem para idempotência
      const camposAtuais = new Set(colEmpresas.fields.map((f) => f.name))

      if (!camposAtuais.has('is_unidade_negocio')) {
        colEmpresas.fields.push(
          new BoolField({
            name: 'is_unidade_negocio',
            required: false,
          }),
        )
      }

      if (!camposAtuais.has('is_pessoa_juridica')) {
        colEmpresas.fields.push(
          new BoolField({
            name: 'is_pessoa_juridica',
            required: false,
          }),
        )
      }

      if (!camposAtuais.has('empresa_juridica_pai')) {
        colEmpresas.fields.push(
          new RelationField({
            name: 'empresa_juridica_pai',
            collectionId: colEmpresas.id,
            maxSelect: 1,
            required: false,
          }),
        )
      }

      if (!camposAtuais.has('correspondencia_bu_status')) {
        colEmpresas.fields.push(
          new SelectField({
            name: 'correspondencia_bu_status',
            required: false,
            values: ['pendente_decisao_negocio', 'definida', 'nao_aplicavel'],
            maxSelect: 1,
          }),
        )
      }

      if (!camposAtuais.has('is_demonstracao')) {
        colEmpresas.fields.push(
          new BoolField({
            name: 'is_demonstracao',
            required: false,
          }),
        )
      }

      app.save(colEmpresas)
      console.log('[1741500049] Coleção empresas atualizada com campos de BU e correspondência.')
    } catch (err) {
      console.warn('[1741500049] Erro ao adicionar campos em empresas:', err)
    }

    // -------------------------------------------------------------------------
    // 2. Atualizar coleção 'pessoas' com campos de hierarquia e vigência
    // -------------------------------------------------------------------------
    try {
      const colPessoas = app.findCollectionByNameOrId('pessoas')
      const camposPessoas = new Set(colPessoas.fields.map((f) => f.name))

      if (!camposPessoas.has('gestor_imediato_pessoa')) {
        colPessoas.fields.push(
          new RelationField({
            name: 'gestor_imediato_pessoa',
            collectionId: colPessoas.id,
            maxSelect: 1,
            required: false,
          }),
        )
      }

      if (!camposPessoas.has('vigencia_inicio')) {
        colPessoas.fields.push(
          new DateField({
            name: 'vigencia_inicio',
            required: false,
          }),
        )
      }

      if (!camposPessoas.has('vigencia_fim')) {
        colPessoas.fields.push(
          new DateField({
            name: 'vigencia_fim',
            required: false,
          }),
        )
      }

      if (!camposPessoas.has('historico_movimentacoes')) {
        colPessoas.fields.push(
          new JSONField({
            name: 'historico_movimentacoes',
            required: false,
          }),
        )
      }

      if (!camposPessoas.has('rotulo_vigencia')) {
        colPessoas.fields.push(
          new TextField({
            name: 'rotulo_vigencia',
            required: false,
          }),
        )
      }

      app.save(colPessoas)
      console.log(
        '[1741500049] Coleção pessoas atualizada com gestor_imediato_pessoa, vigências e histórico.',
      )
    } catch (err) {
      console.warn('[1741500049] Erro ao adicionar campos em pessoas:', err)
    }

    // -------------------------------------------------------------------------
    // 3. Atualizar coleção 'areas' com campos de vigência
    // -------------------------------------------------------------------------
    try {
      const colAreas = app.findCollectionByNameOrId('areas')
      const camposAreas = new Set(colAreas.fields.map((f) => f.name))

      if (!camposAreas.has('vigencia_inicio')) {
        colAreas.fields.push(
          new DateField({
            name: 'vigencia_inicio',
            required: false,
          }),
        )
      }

      if (!camposAreas.has('vigencia_fim')) {
        colAreas.fields.push(
          new DateField({
            name: 'vigencia_fim',
            required: false,
          }),
        )
      }

      app.save(colAreas)
      console.log('[1741500049] Coleção areas atualizada com vigências.')
    } catch (err) {
      console.warn('[1741500049] Erro ao adicionar campos em areas:', err)
    }

    // -------------------------------------------------------------------------
    // 4. Marcação de vigência para pessoas existentes sem data: "Vigente a partir da implantação"
    //    E manutenção do status das empresas existentes como correspondência pendente
    // -------------------------------------------------------------------------
    try {
      const pessoas = app.findRecordsByFilter('pessoas', '', 'nome', 100, 0)
      for (let i = 0; i < pessoas.length; i++) {
        const p = pessoas[i]
        let mudou = false
        if (!p.getString('rotulo_vigencia')) {
          p.set('rotulo_vigencia', 'Vigente a partir da implantação')
          mudou = true
        }
        if (!p.getString('vigencia_inicio')) {
          p.set('vigencia_inicio', p.getString('data_inicio') || '2025-01-01 00:00:00.000Z')
          mudou = true
        }
        if (mudou) {
          app.save(p)
        }
      }

      const empresas = app.findRecordsByFilter('empresas', '', 'ordem_exibicao', 50, 0)
      for (let j = 0; j < empresas.length; j++) {
        const e = empresas[j]
        let mudou = false
        if (!e.getString('correspondencia_bu_status')) {
          // As empresas existentes NÃO devem ser associadas compulsoriamente às 5 BUs
          // Marcadas estritamente como 'pendente_decisao_negocio'
          e.set('correspondencia_bu_status', 'pendente_decisao_negocio')
          mudou = true
        }
        if (
          e.getBool('is_unidade_negocio') === undefined ||
          e.getBool('is_unidade_negocio') === null
        ) {
          e.set('is_unidade_negocio', e.getString('tipo') === 'BU / Filial')
          e.set('is_pessoa_juridica', true)
          mudou = true
        }
        if (mudou) {
          app.save(e)
        }
      }
    } catch (err) {
      console.warn('[1741500049] Erro ao atualizar registros padrão:', err)
    }

    // -------------------------------------------------------------------------
    // 5. Seed demonstrativo isolado de PJ com múltiplas BUs (flag is_demonstracao = true)
    // -------------------------------------------------------------------------
    try {
      const colEmpresas = app.findCollectionByNameOrId('empresas')

      // Verificar se a PJ demo já existe
      let pjDemo = null
      try {
        pjDemo = app.findFirstRecordByData('empresas', 'cnpj', '99.888.777/0001-99')
      } catch (_) {}

      if (!pjDemo) {
        pjDemo = new Record(colEmpresas)
        pjDemo.set('nome_fantasia', 'SouYess Serviços Compartilhados Jurídica (DEMO)')
        pjDemo.set('razao_social', 'SouYess Serviços Compartilhados e Gestão S.A.')
        pjDemo.set('cnpj', '99.888.777/0001-99')
        pjDemo.set('tipo', 'Holding / Matriz')
        pjDemo.set('status', 'Operando')
        pjDemo.set('is_unidade_negocio', false)
        pjDemo.set('is_pessoa_juridica', true)
        pjDemo.set('correspondencia_bu_status', 'pendente_decisao_negocio')
        pjDemo.set('is_demonstracao', true)
        pjDemo.set('ordem_exibicao', 90)
        app.save(pjDemo)
      }

      // BU demo 1 vinculada à PJ demo
      let buDemo1 = null
      try {
        buDemo1 = app.findFirstRecordByData('empresas', 'cnpj', '99.888.777/0002-77')
      } catch (_) {}

      if (!buDemo1) {
        buDemo1 = new Record(colEmpresas)
        buDemo1.set('nome_fantasia', 'BU Finanças Corporativas (DEMO)')
        buDemo1.set('razao_social', 'SouYess Serviços - BU Finanças')
        buDemo1.set('cnpj', '99.888.777/0002-77')
        buDemo1.set('tipo', 'BU / Filial')
        buDemo1.set('status', 'Operando')
        buDemo1.set('is_unidade_negocio', true)
        buDemo1.set('is_pessoa_juridica', false)
        buDemo1.set('empresa_juridica_pai', pjDemo.id)
        buDemo1.set('correspondencia_bu_status', 'pendente_decisao_negocio')
        buDemo1.set('is_demonstracao', true)
        buDemo1.set('ordem_exibicao', 91)
        app.save(buDemo1)
      }

      // BU demo 2 vinculada à mesma PJ demo
      let buDemo2 = null
      try {
        buDemo2 = app.findFirstRecordByData('empresas', 'cnpj', '99.888.777/0003-55')
      } catch (_) {}

      if (!buDemo2) {
        buDemo2 = new Record(colEmpresas)
        buDemo2.set('nome_fantasia', 'BU Produtos Digitais B2B (DEMO)')
        buDemo2.set('razao_social', 'SouYess Serviços - BU Produtos Digitais')
        buDemo2.set('cnpj', '99.888.777/0003-55')
        buDemo2.set('tipo', 'BU / Filial')
        buDemo2.set('status', 'Operando')
        buDemo2.set('is_unidade_negocio', true)
        buDemo2.set('is_pessoa_juridica', false)
        buDemo2.set('empresa_juridica_pai', pjDemo.id)
        buDemo2.set('correspondencia_bu_status', 'pendente_decisao_negocio')
        buDemo2.set('is_demonstracao', true)
        buDemo2.set('ordem_exibicao', 92)
        app.save(buDemo2)
      }

      console.log('[1741500049] Seed demonstrativo de PJ com múltiplas BUs criado com sucesso.')
    } catch (err) {
      console.warn('[1741500049] Erro no seed demonstrativo:', err)
    }
  },
  (app) => {
    // Reversão limpa
    try {
      const records = app.findRecordsByFilter('empresas', 'is_demonstracao = true', '', 10, 0)
      for (let i = 0; i < records.length; i++) {
        app.delete(records[i])
      }
    } catch (_) {}
  },
)
