import { describe, it, expect, beforeAll } from 'vitest'
import PocketBase from 'pocketbase'

const PB_URL =
  (import.meta as any).env?.VITE_POCKETBASE_URL ||
  'https://sistema-rh-inteligente-4d4e0.shrd00.internal.goskip.dev'

describe('REPRODUÇÃO DE RISCO: Proteção de Dados Sensíveis na Mesma BU', () => {
  let pbRh: PocketBase
  let pbTech: PocketBase

  let userRh: any
  let userTech: any

  beforeAll(async () => {
    pbRh = new PocketBase(PB_URL)
    pbTech = new PocketBase(PB_URL)

    const authRh = await pbRh
      .collection('users')
      .authWithPassword('severo.douglas2@gmail.com', 'Skip@Pass')
    userRh = authRh.record

    const authTech = await pbTech
      .collection('users')
      .authWithPassword('gestor@empresa.com', 'Skip@Pass')
    userTech = authTech.record
  })

  it('Verifica se RH e Gestor são da mesma ou têm acesso a pessoas da BU Tecnologia', () => {
    expect(userRh.cargo_funcao).toBe('RH / Recrutador')
    expect(userTech.cargo_funcao).toBe('Gestor Contratante')
    expect(userTech.empresa).toBe('xtt7smd3mrppw30')
  })

  it('RISCO REPRODUZIDO (a): Gestor listando pessoas da mesma BU recebe valor_contratado e valor_hora expostos', async () => {
    const pessoas = await pbTech.collection('pessoas').getFullList()
    expect(pessoas.length).toBeGreaterThan(0)

    // Verifica se os campos sensíveis NÃO estão nulos/zerados para o gestor
    const pessoaComSalario = pessoas.find((p) => p.valor_contratado > 0)
    expect(pessoaComSalario).toBeDefined()
    expect(pessoaComSalario!.valor_contratado).toBeGreaterThan(0)
  })

  it('RISCO REPRODUZIDO (b): Gestor acessando pessoa individualmente por ID (view) recebe valor_contratado exposto', async () => {
    // Renato Albuquerque: yrk1td6xkivtcmt
    const p = await pbTech.collection('pessoas').getOne('yrk1td6xkivtcmt')
    expect(p.valor_contratado).toBe(24500)
    expect(p.valor_hora).toBe(153.13)
  })

  it('RISCO REPRODUZIDO (c): Gestor listando contratos com expand=pessoa recebe valores contratuais e remuneração expandida', async () => {
    const contratos = await pbTech.collection('contratos').getFullList({ expand: 'pessoa' })
    expect(contratos.length).toBeGreaterThan(0)
    const ct = contratos[0]
    expect(ct.valor_mensal).toBeGreaterThan(0)
    expect(ct.expand?.pessoa?.valor_contratado).toBeGreaterThan(0)
  })

  it('RISCO REPRODUZIDO (d): Gestor listando contratos_pj e prestadores_pj recebe valores financeiros sem sanitização', async () => {
    const prestadores = await pbTech.collection('prestadores_pj').getFullList()
    expect(prestadores.length).toBeGreaterThan(0)
    const prestadorComValor = prestadores.find((p) => p.valor_mensal_atual > 0)
    expect(prestadorComValor).toBeDefined()
  })

  it('RISCO REPRODUZIDO (e): Gestor listando fechamentos_competencia recebe valor_total_calculado e valor_hora_congelado', async () => {
    const fechamentos = await pbTech.collection('fechamentos_competencia').getFullList()
    if (fechamentos.length > 0) {
      expect(fechamentos[0].valor_total_calculado).toBeGreaterThan(0)
    }
  })
})
