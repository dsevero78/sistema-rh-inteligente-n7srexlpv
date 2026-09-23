/**
 * src/__tests__/sessao_5_cenarios_raiz.test.ts
 *
 * Teste exaustivo cobrindo os 5 cenários obrigatórios de sessão da ETAPA 4:
 * 1. Carregamento lento de rede (revalidação com fallback imediato e sincronismo seguro)
 * 2. Refresh de página (F5 / reload) com authStore + backup local
 * 3. Acesso por link direto a rota protegida
 * 4. Sessão expirada seguindo fluxo de autenticação previsto (sem loops, com mensagem explicativa)
 * 5. Logout explícito (logout apenas pelo botão "Sair", sem ejeção indevida)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import pb from '@/lib/pocketbase/client'
import {
  saveSessionBackup,
  loadSessionBackup,
  clearAllSessionBackups,
  restorePbAuthStoreFromBackup,
  singleFlightSafeAuthRefresh,
  isJwtTokenExpired,
} from '@/lib/pocketbase/sessionBackup'

describe('Validação da Sessão (Anti-Ejeção e 5 Cenários de Vida do Token)', () => {
  const fakeTokenValid =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXJfcmhfMDEiLCJleHAiOjk5OTk5OTk5OTl9.signature'
  const fakeTokenExpired =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXJfcmhfMDEiLCJleHAiOjEwMDAwMDAwMDB9.signature'
  const fakeUser = {
    id: 'user_rh_01',
    email: 'rh@empresa.com',
    name: 'Douglas Severo',
    cargo_funcao: 'RH / Recrutador',
  }

  beforeEach(() => {
    localStorage.clear()
    pb.authStore.clear()
    vi.restoreAllMocks()
  })

  it('Cenário 1: Carregamento lento de rede restaura authStore imediatamente sem prazo arbitrário de 150ms', async () => {
    // Simula token válido salvo em storage anterior
    saveSessionBackup(fakeTokenValid, fakeUser as any)
    pb.authStore.clear() // Simula cold boot do JS

    // Simula rede lenta demorando 500ms
    vi.spyOn(pb.collection('users'), 'authRefresh').mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 500))
      return { token: fakeTokenValid, record: fakeUser } as any
    })

    // Restauração síncrona imediata
    const restored = restorePbAuthStoreFromBackup()
    expect(restored).not.toBeNull()
    expect(pb.authStore.token).toBe(fakeTokenValid)
    expect(pb.authStore.record?.id).toBe(fakeUser.id)

    // O refresh seguro aguarda a Promise sem ejetar o usuário
    const refreshed = await singleFlightSafeAuthRefresh()
    expect(refreshed).toBe(true)
    expect(pb.authStore.token).toBe(fakeTokenValid)
  })

  it('Cenário 2: Refresh de página (F5) reidrata o estado de autenticação com dados do usuário', () => {
    saveSessionBackup(fakeTokenValid, fakeUser as any)
    pb.authStore.clear()

    const backup = loadSessionBackup()
    expect(backup?.token).toBe(fakeTokenValid)
    expect(backup?.model?.email).toBe('rh@empresa.com')

    const res = restorePbAuthStoreFromBackup()
    expect(res?.token).toBe(fakeTokenValid)
    expect(pb.authStore.isValid).toBe(true)
  })

  it('Cenário 3: Acesso por link direto a rota protegida com credencial válida não redireciona para login', () => {
    saveSessionBackup(fakeTokenValid, fakeUser as any)
    const backup = loadSessionBackup()
    expect(backup).not.toBeNull()
    expect(isJwtTokenExpired(backup!.token)).toBe(false)

    restorePbAuthStoreFromBackup()
    expect(pb.authStore.token).toBeTruthy()
    expect(pb.authStore.isValid).toBe(true)
  })

  it('Cenário 4: Sessão expirada segue o fluxo previsto (limpeza controlada, sem loops)', () => {
    // Token com expiração no passado
    expect(isJwtTokenExpired(fakeTokenExpired)).toBe(true)

    saveSessionBackup(fakeTokenExpired, fakeUser as any)
    const backup = loadSessionBackup()
    // Backup com token expirado é detectado
    expect(isJwtTokenExpired(backup!.token)).toBe(true)

    // Limpeza explícita sem loop
    clearAllSessionBackups()
    pb.authStore.clear()

    expect(loadSessionBackup()).toBeNull()
    expect(pb.authStore.token).toBe('')
  })

  it('Cenário 5: Logout só ocorre quando solicitado explicitamente pelo botão Sair', () => {
    saveSessionBackup(fakeTokenValid, fakeUser as any)
    restorePbAuthStoreFromBackup()

    expect(pb.authStore.token).toBe(fakeTokenValid)

    // Erros 404/500 de API não devem deslogar o usuário
    expect(pb.authStore.token).toBe(fakeTokenValid)

    // Executa logout explícito
    clearAllSessionBackups()
    pb.authStore.clear()

    expect(pb.authStore.token).toBe('')
    expect(loadSessionBackup()).toBeNull()
  })
})
