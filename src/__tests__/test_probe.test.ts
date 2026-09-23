import { describe, it, expect, beforeAll } from 'vitest'
import PocketBase from 'pocketbase'

const PB_URL =
  (import.meta as any).env?.VITE_POCKETBASE_URL ||
  'https://sistema-rh-inteligente-4d4e0.shrd00.internal.goskip.dev'

describe('TESTE PROBE HOOK DE SANITIZAÇÃO', () => {
  it('Verifica endpoint test-enrich-check', async () => {
    throw new Error('TESTE_FALHA_CONTROLADA')
  })
})
