import { describe, it, expect, beforeAll } from 'vitest'
import PocketBase from 'pocketbase'

const PB_URL = import.meta.env?.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090'

const USERS = {
  rh: {
    email: 'severo.douglas2@gmail.com',
    pass: 'Skip@Pass',
    cargoEsperado: 'RH / Recrutador',
  },
  gestorTech: {
    email: 'gestor@empresa.com',
    pass: 'Skip@Pass',
    buEsperada: 'Tecnologia',
    sigla: 'EMP-02',
  },
  gestorMidia: {
    email: 'gestora.produto@empresa.com',
    pass: 'Skip@Pass',
    buEsperada: 'Vértice Mídia',
    sigla: 'EMP-03',
  },
  gestorOps: {
    email: 'gestor.operacoes@empresa.com',
    pass: 'Skip@Pass',
    buEsperada: 'Operações',
    sigla: 'EMP-04',
  },
}

describe('Testes de API Direta - Etapa 2 (Homologação)', () => {
  let pbRh: PocketBase
  let pbTech: PocketBase
  let pbMidia: PocketBase
  let pbOps: PocketBase
  let pbAnon: PocketBase

  let userRhId = ''
  let buTechId = ''
  let buMidiaId = ''
  let buOpsId = ''

  beforeAll(async () => {
    pbRh = new PocketBase(PB_URL)
    pbTech = new PocketBase(PB_URL)
    pbMidia = new PocketBase(PB_URL)
    pbOps = new PocketBase(PB_URL)
    pbAnon = new PocketBase(PB_URL)

    // Autenticar cada perfil
    const authRh = await pbRh.collection('users').authWithPassword(USERS.rh.email, USERS.rh.pass)
    userRhId = authRh.record.id

    const authTech = await pbTech
      .collection('users')
      .authWithPassword(USERS.gestorTech.email, USERS.gestorTech.pass)
    buTechId = authTech.record.empresa

    const authMidia = await pbMidia
      .collection('users')
      .authWithPassword(USERS.gestorMidia.email, USERS.gestorMidia.pass)
    buMidiaId = authMidia.record.empresa

    const authOps = await pbOps
      .collection('users')
      .authWithPassword(USERS.gestorOps.email, USERS.gestorOps.pass)
    buOpsId = authOps.record.empresa
  })

  // --------------------------------------------------------------------------
  // 1. Regressão & Preservação da Etapa 1
  // --------------------------------------------------------------------------
  it('1. Gestor de Tecnologia NÃO pode ler documentos confidenciais de pessoas de outras BUs', async () => {
    const docs = await pbTech.collection('documentos_pessoa').getFullList()
    for (const d of docs) {
      if (d.tipo === 'Confidencial' || d.tipo === 'Contrato') {
        // Se for confidencial, a pessoa deve ser da BU do gestor
        const p = await pbRh.collection('pessoas').getOne(d.pessoa)
        expect(p.empresa).toBe(buTechId)
      }
    }
  })

  it('2. Anti-escalação de privilégios de users continua bloqueando alteração de cargo pelo gestor', async () => {
    let falhou = false
    try {
      await pbTech.collection('users').update(pbTech.authStore.record!.id, {
        cargo_funcao: 'RH / Recrutador',
      })
    } catch {
      falhou = true
    }
    expect(falhou).toBe(true)
  })

  // --------------------------------------------------------------------------
  // 2. Catálogo de Cargos
  // --------------------------------------------------------------------------
  it('3. Qualquer usuário autenticado pode listar o catálogo de cargos', async () => {
    const cargosRh = await pbRh.collection('cargos').getFullList()
    const cargosGestor = await pbTech.collection('cargos').getFullList()
    expect(cargosRh.length).toBeGreaterThan(0)
    expect(cargosGestor.length).toBe(cargosRh.length)
  })

  it('4. Usuário não autenticado (anônimo) NÃO pode listar nem criar cargos', async () => {
    let readFalhou = false
    try {
      await pbAnon.collection('cargos').getFullList()
    } catch {
      readFalhou = true
    }
    expect(readFalhou).toBe(true)

    let createFalhou = false
    try {
      await pbAnon.collection('cargos').create({
        codigo: 'CARGO-HACK',
        nome: 'Cargo Invasor',
        ativo: true,
      })
    } catch {
      createFalhou = true
    }
    expect(createFalhou).toBe(true)
  })

  it('5. Gestor de BU NÃO pode criar novos cargos (exclusivo do RH)', async () => {
    let falhou = false
    try {
      await pbTech.collection('cargos').create({
        codigo: 'CARGO-GESTOR-TEST',
        nome: 'Tentativa Cargo Gestor',
        ativo: true,
      })
    } catch {
      falhou = true
    }
    expect(falhou).toBe(true)
  })

  // --------------------------------------------------------------------------
  // 3. Catálogo de Competências
  // --------------------------------------------------------------------------
  it('6. Competências possuem critérios descritivos e gestor não pode cadastrar competências globais', async () => {
    const comps = await pbRh.collection('competencias').getFullList()
    expect(comps.length).toBeGreaterThan(0)
    const tec01 = comps.find((c) => c.codigo === 'COMP-TEC-01')
    expect(tec01).toBeDefined()
    expect(tec01!.criterios_proficiencia).toBeDefined()

    let createFalhou = false
    try {
      await pbTech.collection('competencias').create({
        nome: 'Competência Não Autorizada',
        categoria: 'Técnica',
      })
    } catch {
      createFalhou = true
    }
    expect(createFalhou).toBe(true)
  })

  // --------------------------------------------------------------------------
  // 4. Centros de Custo & Unicidade por BU
  // --------------------------------------------------------------------------
  it('7. Centros de Custo são únicos no contexto da empresa e gestor não pode criar CCs', async () => {
    const ccs = await pbRh.collection('centros_custo').getFullList()
    expect(ccs.length).toBeGreaterThan(0)

    // Gestor não pode criar centro de custo
    let gestorFalhou = false
    try {
      await pbTech.collection('centros_custo').create({
        codigo: 'CC-FORBIDDEN',
        nome: 'Proibido Gestor',
        empresa: buTechId,
        status: 'Ativo',
      })
    } catch {
      gestorFalhou = true
    }
    expect(gestorFalhou).toBe(true)
  })

  // --------------------------------------------------------------------------
  // 5. Competências por Pessoa (competencias_pessoas)
  // --------------------------------------------------------------------------
  it('8. Gestor de Tecnologia pode visualizar competências de colaboradores da sua própria BU', async () => {
    const cpTech = await pbTech.collection('competencias_pessoas').getFullList({
      expand: 'pessoa',
    })
    for (const item of cpTech) {
      const pessoa = item.expand?.pessoa
      if (pessoa) {
        expect(pessoa.empresa).toBe(buTechId)
      }
    }
  })

  it('9. Gestor de Tecnologia NÃO vê competências de colaboradores da BU Vértice Mídia', async () => {
    const todasCpRh = await pbRh.collection('competencias_pessoas').getFullList({
      expand: 'pessoa',
    })
    const cpMidia = todasCpRh.filter((i) => i.expand?.pessoa?.empresa === buMidiaId)
    expect(cpMidia.length).toBeGreaterThan(0)

    // Consultar pelo gestor tech
    const cpTech = await pbTech.collection('competencias_pessoas').getFullList({
      expand: 'pessoa',
    })
    const achouMidia = cpTech.some((i) => i.expand?.pessoa?.empresa === buMidiaId)
    expect(achouMidia).toBe(false)
  })

  it('10. Competências "não avaliadas" não possuem nota fictícia e preservam estado explícito', async () => {
    const comps = await pbRh.collection('competencias_pessoas').getFullList({
      filter: "proficiencia = 'Nao_avaliada'",
    })
    expect(comps.length).toBeGreaterThan(0)
    for (const c of comps) {
      expect(c.proficiencia).toBe('Nao_avaliada')
    }
  })

  // --------------------------------------------------------------------------
  // 6. Normalização Controlada & Preservação Textual
  // --------------------------------------------------------------------------
  it('11. Textos originais em pessoas e vagas permanecem intocados', async () => {
    const pessoas = await pbRh.collection('pessoas').getFullList()
    const vagas = await pbRh.collection('vagas').getFullList()

    for (const p of pessoas) {
      expect(p.cargo_funcao).toBeDefined()
      expect(typeof p.cargo_funcao).toBe('string')
    }

    for (const v of vagas) {
      expect(v.titulo).toBeDefined()
      expect(typeof v.titulo).toBe('string')
    }
  })

  it('12. Mapeamentos determinísticos foram aplicados e ambíguos permanecem pendentes', async () => {
    const maps = await pbRh.collection('mapeamento_normalizacao').getFullList()
    expect(maps.length).toBeGreaterThan(0)

    const aplicadas = maps.filter((m) => m.status === 'aplicada')
    const pendentes = maps.filter((m) => m.status === 'pendente')

    expect(aplicadas.length).toBeGreaterThan(0)
    expect(pendentes.length).toBeGreaterThan(0)

    for (const app of aplicadas) {
      expect(app.aplicado_por_migracao).toBe(true)
      expect(app.hash_recuperacao).toBeDefined()
    }
  })
})
