import { describe, it, expect, beforeAll } from 'vitest'
import PocketBase from 'pocketbase'

const PB_URL =
  (import.meta as any).env?.VITE_POCKETBASE_URL ||
  'https://sistema-rh-inteligente-4d4e0.shrd00.internal.goskip.dev'

describe('TESTE PROBE HOOK DE SANITIZAÇÃO', () => {
  it('Verifica endpoint test-enrich-check', async () => {
    const res = await fetch(`${PB_URL}/backend/v1/test-enrich-check`)
    const data = await res.json()
    // Força falha para ler o console / resultado retornado pelo hook
    expect(JSON.stringify(data)).toBe('FORCE_SHOW')
  })
})
