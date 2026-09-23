import { describe, it, expect, beforeEach, vi } from 'vitest'
import PocketBase from 'pocketbase'
import {
  saveSessionBackup,
  loadSessionBackup,
  restorePbAuthStoreFromBackup,
  clearAllSessionBackups,
  singleFlightSafeAuthRefresh,
} from '@/lib/pocketbase/sessionBackup'

const PB_URL =
  (import.meta as any).env?.VITE_POCKETBASE_URL ||
  'https://sistema-rh-inteligente-4d4e0.shrd00.internal.goskip.dev'

describe('Validação de Login dos Perfis e Barreira Anti-Ejeção', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  const perfis = [
    { nome: 'RH (Douglas Severo)', email: 'severo.douglas2@gmail.com', cargo: 'RH / Recrutador' },
    {
      nome: 'Gestor BU Tecnologia (Carlos)',
      email: 'gestor@empresa.com',
      cargo: 'Gestor Contratante',
    },
    {
      nome: 'Gestora BU Vértice Mídia (Mariana)',
      email: 'gestora.produto@empresa.com',
      cargo: 'Gestor Contratante',
    },
    {
      nome: 'Gestor BU Operações (Roberto)',
      email: 'gestor.operacoes@empresa.com',
      cargo: 'Gestor Contratante',
    },
  ]

  for (const perfil of perfis) {
    it(`[PASS] Login funcional e emissão de token para ${perfil.nome}`, async () => {
      const client = new PocketBase(PB_URL)
      const auth = await client.collection('users').authWithPassword(perfil.email, 'Skip@Pass')
      expect(auth.token).toBeTruthy()
      expect(auth.token.length).toBeGreaterThan(20)
      expect(auth.record.email).toBe(perfil.email)
      expect(auth.record.cargo_funcao).toBe(perfil.cargo)

      // Salva no backup da sessão (mecanismo anti-ejeção do app)
      saveSessionBackup(auth.token, auth.record)
      const backup = loadSessionBackup()
      expect(backup).not.toBeNull()
      expect(backup?.token).toBe(auth.token)
      expect(backup?.model?.email).toBe(perfil.email)
    })
  }

  it('[PASS] Simulação de reload/queda temporária de rede: preserva backup e não ejeta usuário logado', async () => {
    const client = new PocketBase(PB_URL)
    const auth = await client
      .collection('users')
      .authWithPassword('gestor@empresa.com', 'Skip@Pass')
    saveSessionBackup(auth.token, auth.record)

    // Simula reload limpando o client PocketBase em memória
    client.authStore.clear()
    expect(client.authStore.token).toBe('')

    // Mecanismo anti-ejeção: restaura imediatamente do backup local sem navegar para login
    const restored = restorePbAuthStoreFromBackup()
    expect(restored).not.toBeNull()
    expect(restored?.token).toBe(auth.token)
    expect(restored?.model?.email).toBe('gestor@empresa.com')

    // Backup não pode ter sido destruído
    expect(loadSessionBackup()?.token).toBe(auth.token)
  })

  it('[PASS] Logout explícito é o ÚNICO fluxo que limpa o backup da sessão', () => {
    saveSessionBackup('dummy-jwt-token-1234567890', { id: 'u1', email: 'teste@empresa.com' } as any)
    expect(loadSessionBackup()).not.toBeNull()

    // Chamada explícita de logout
    clearAllSessionBackups()
    expect(loadSessionBackup()).toBeNull()
  })
})
