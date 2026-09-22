import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  saveSessionBackup,
  loadSessionBackup,
  clearAllSessionBackups,
  restorePbAuthStoreFromBackup,
  singleFlightSafeAuthRefresh,
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

  it('loadSessionBackup preserva credenciais mesmo quando token expirou, sinalizando needsRefresh', () => {
    const pastExp = Math.floor(Date.now() / 1000) - 3600
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({ id: 'u_exp', exp: pastExp }))
    const expiredToken = `${header}.${payload}.sig`
    const userModel = { id: 'u_exp', email: 'expired@empresa.com' } as any

    saveSessionBackup(expiredToken, userModel)

    // O backup DEVE ser retornado para que o app tente refresh em vez de ejetar
    const backup = loadSessionBackup()
    expect(backup).not.toBeNull()
    expect(backup?.token).toBe(expiredToken)
    expect(backup?.needsRefresh).toBe(true)
    expect(backup?.model?.id).toBe('u_exp')
  })

  it('no reload em /login com credencial válida: restaura credencial síncrona antes de chamar singleFlightSafeAuthRefresh', async () => {
    const futureExp = Math.floor(Date.now() / 1000) + 7200
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = btoa(JSON.stringify({ id: 'user_reload_test', exp: futureExp }))
    const validJwt = `${header}.${payload}.sig`
    const userModel = { id: 'user_reload_test', email: 'severo.douglas2@gmail.com' } as any

    // Simula reload da página: gravação prévia no localStorage da sessão
    saveSessionBackup(validJwt, userModel)

    // Esvazia memória do SDK (como acontece ao recarregar a página)
    pb.authStore.clear()
    expect(pb.authStore.token).toBe('')
    expect(pb.authStore.record).toBeNull()

    // 1. Restauração síncrona imediata
    const restored = restorePbAuthStoreFromBackup()
    expect(restored).not.toBeNull()
    expect(restored?.token).toBe(validJwt)
    expect(pb.authStore.token).toBe(validJwt)
    expect(pb.authStore.record?.id).toBe('user_reload_test')

    // 2. Mock de sucesso do authRefresh da coleção users
    const refreshedToken = `${header}.${btoa(JSON.stringify({ id: 'user_reload_test', exp: futureExp + 3600 }))}.sig2`
    const authRefreshSpy = vi.spyOn(pb.collection('users'), 'authRefresh').mockResolvedValueOnce({
      token: refreshedToken,
      record: userModel,
    } as any)

    // 3. Execução do singleFlightSafeAuthRefresh
    const ok = await singleFlightSafeAuthRefresh()
    expect(ok).toBe(true)
    expect(authRefreshSpy).toHaveBeenCalledTimes(1)
    expect(pb.authStore.token).toBe(refreshedToken)

    // 4. Confirma que o backup foi consolidado com o novo token
    const updatedBackup = loadSessionBackup()
    expect(updatedBackup?.token).toBe(refreshedToken)
  })
})
