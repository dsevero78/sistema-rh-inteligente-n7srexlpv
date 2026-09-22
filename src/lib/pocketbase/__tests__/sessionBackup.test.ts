import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveSessionBackup,
  loadSessionBackup,
  clearAllSessionBackups,
  restorePbAuthStoreFromBackup,
  isJwtTokenExpired,
  APP_SESSION_BACKUP_KEY,
  PB_AUTH_STORAGE_KEY,
} from '@/lib/pocketbase/sessionBackup'
import pb from '@/lib/pocketbase/client'

describe('SessionBackup & Auto-Recovery', () => {
  beforeEach(() => {
    localStorage.clear()
    pb.authStore.clear()
    vi.restoreAllMocks()
  })

  it('salva e restaura backup com sucesso', () => {
    const dummyToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXIxMjMiLCJleHAiOjI1MjQ2MDgwMDB9.dummy'
    const dummyRecord = { id: 'user123', email: 'test@empresa.com' } as any

    saveSessionBackup(dummyToken, dummyRecord)

    const backup = loadSessionBackup()
    expect(backup).not.toBeNull()
    expect(backup?.token).toBe(dummyToken)
    expect(backup?.model?.id).toBe('user123')

    // Confirma que pb.authStore estava vazio e é restaurado
    expect(pb.authStore.token).toBe('')
    const restored = restorePbAuthStoreFromBackup()
    expect(restored).not.toBeNull()
    expect(pb.authStore.token).toBe(dummyToken)
    expect(pb.authStore.record?.id).toBe('user123')
  })

  it('migra de chave legada pocketbase_auth para chave proprietária souyess.session.backup', () => {
    const dummyToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImxlZ2FjeSIsImV4cCI6MjUyNDYwODAwMH0.dummy'
    localStorage.setItem(
      PB_AUTH_STORAGE_KEY,
      JSON.stringify({ token: dummyToken, record: { id: 'legacy' } }),
    )

    const loaded = loadSessionBackup()
    expect(loaded?.token).toBe(dummyToken)
    expect(loaded?.model?.id).toBe('legacy')

    // Verifica que agora também foi gravado na nova chave do app
    const rawAppKey = localStorage.getItem(APP_SESSION_BACKUP_KEY)
    expect(rawAppKey).not.toBeNull()
  })

  it('clearAllSessionBackups limpa ambas as chaves apenas no logout explícito', () => {
    saveSessionBackup('dummy_token_123456789', { id: 'u1' } as any)
    expect(loadSessionBackup()).not.toBeNull()

    clearAllSessionBackups()
    expect(loadSessionBackup()).toBeNull()
    expect(localStorage.getItem(APP_SESSION_BACKUP_KEY)).toBeNull()
    expect(localStorage.getItem(PB_AUTH_STORAGE_KEY)).toBeNull()
  })

  it('valida expiração do JWT corretamente', () => {
    const futureExp = Math.floor(Date.now() / 1000) + 3600
    const pastExp = Math.floor(Date.now() / 1000) - 3600

    const makeToken = (exp: number) => {
      const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
      const payload = btoa(JSON.stringify({ id: 'u1', exp }))
      return `${header}.${payload}.sig`
    }

    expect(isJwtTokenExpired(makeToken(futureExp))).toBe(false)
    expect(isJwtTokenExpired(makeToken(pastExp))).toBe(true)
  })
})
