import { describe, it } from 'vitest'

describe('test_probe', () => {
  it('probe failure', () => {
    // PRESERVAÇÃO INTEGRAL DA FALHA CONTROLADA ORIGINAL CONFORME DIRETRIZ
    throw new Error('TESTE_FALHA_CONTROLADA')
  })
})
