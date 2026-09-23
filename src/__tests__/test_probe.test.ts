import { describe, it, expect, beforeAll } from 'vitest'
import PocketBase from 'pocketbase'

const PB_URL =
  (import.meta as any).env?.VITE_POCKETBASE_URL ||
  'https://sistema-rh-inteligente-4d4e0.shrd00.internal.goskip.dev'

describe('TESTE PROBE HOOK DE SANITIZAÇÃO', () => {
  let pbRh: PocketBase
  let pbTech: PocketBase

  beforeAll(async () => {
    pbRh = new PocketBase(PB_URL)
    pbTech = new PocketBase(PB_URL)

    await pbRh.collection('users').authWithPassword('severo.douglas2@gmail.com', 'Skip@Pass')
    await pbTech.collection('users').authWithPassword('gestor@empresa.com', 'Skip@Pass')
  })

  it('RH recebe valor_contratado real', async () => {
    const p = await pbRh.collection('pessoas').getOne('yrk1td6xkivtcmt')
    expect(p.valor_contratado).toBe(24500)
  })

  it('Gestor da mesma BU recebe valor_contratado = 0 (sanitizado)', async () => {
    const p = await pbTech.collection('pessoas').getOne('yrk1td6xkivtcmt')
    console.log('[PROBE GESTOR GET ONE]', p.valor_contratado, p.valor_hora)
    expect(p.valor_contratado).toBe(0)
  })

  it('Gestor da mesma BU listando pessoas recebe valores sanitizados', async () => {
    const list = await pbTech.collection('pessoas').getFullList()
    for (const item of list) {
      console.log(`[PROBE GESTOR LIST] ${item.nome}: valor_contratado=${item.valor_contratado}`)
      expect(item.valor_contratado).toBe(0)
    }
  })

  it('Gestor expandindo pessoa via contratos: verifica se expand sanitiza', async () => {
    const contratos = await pbTech.collection('contratos').getFullList({ expand: 'pessoa' })
    for (const ct of contratos) {
      console.log(
        `[PROBE CONTRATO EXPAND] ${ct.codigo_contrato}: ct.expand.pessoa.valor_contratado=${ct.expand?.pessoa?.valor_contratado}`,
      )
    }
  })
})
