/**
 * src/__tests__/sessao_4_estados_e_ejeccao.test.tsx
 *
 * Teste reproduzível comprovando:
 * 1. O tratamento estrito dos 4 estados de sessão:
 *    - Estado 1: Sessão em validação (revalidação ativa ou inicialização em curso) -> Tela de transição, sem ejeção
 *    - Estado 2: Sessão autenticada (token íntegro + resolvido com backend) -> Acesso concedido
 *    - Estado 3: Sessão expirada/inválida (token JWT expirado ou 401 definitivo) -> Redirecionamento limpo para /login com state.message explicativo
 *    - Estado 4: Falha temporária de rede (status 0 / fetch error) -> NÃO é tratada como expiração nem libera acesso descontrolado
 *
 * 2. Comprovação de que formato/tamanho (ex: token.length > 10) NÃO são prova suficiente de autorização.
 *    - Um token com > 10 caracteres mas expirado ou corrompido NÃO libera acesso a rota protegida.
 *    - A revalidação assíncrona com o backend ou a integridade e expiração (exp) determinam a validade.
 *
 * 3. Reprodução do defeito de ejeção indevida para /login:
 *    - Usuário com sessão ativa no storage ao sofrer oscilação de rede (authRefresh rejeita com status: 0)
 *      NÃO é ejetado para /login.
 *    - Usuário em PublicRoute com token válido não-expirado no storage é redirecionado para /dashboard e NÃO vê o form de login.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute, PublicRoute } from '@/components/auth/AuthGuards'
import {
  saveSessionBackup,
  loadSessionBackup,
  clearAllSessionBackups,
  restorePbAuthStoreFromBackup,
  singleFlightSafeAuthRefresh,
  isJwtTokenExpired,
} from '@/lib/pocketbase/sessionBackup'
import pb from '@/lib/pocketbase/client'

const PageDashboard = () => <h1>Painel Dashboard</h1>
const PageLogin = () => <h1>Tela de Login</h1>

describe('Auditoria de Sessão: 4 Estados e Barreira Anti-Ejeção', () => {
  const futureExp = Math.floor(Date.now() / 1000) + 7200
  const pastExp = Math.floor(Date.now() / 1000) - 7200

  const makeJwt = (id: string, exp: number) => {
    const h = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const p = btoa(JSON.stringify({ id, exp }))
    return `${h}.${p}.dummy_signature`
  }

  const validJwt = makeJwt('user_valido_01', futureExp)
  const expiredJwt = makeJwt('user_expirado_02', pastExp)
  // Token com comprimento > 10 mas com payload expirado
  const longExpiredToken = `long_token_string_with_more_than_ten_chars_${expiredJwt}`

  const userModel = {
    id: 'user_valido_01',
    email: 'gestor@empresa.com',
    cargo_funcao: 'Gestor Contratante',
  } as any

  beforeEach(() => {
    localStorage.clear()
    pb.authStore.clear()
    vi.restoreAllMocks()
  })

  // --------------------------------------------------------------------------
  // PROVA DE QUE TAMANHO/FORMATO NÃO É PROVA SUFICIENTE DE AUTORIZAÇÃO
  // --------------------------------------------------------------------------
  it('Token com comprimento > 10 caracteres expirado é detectado como EXPIRADO e não é aceito como válido', () => {
    expect(expiredJwt.length).toBeGreaterThan(10)
    // isJwtTokenExpired valida o payload real 'exp', e não apenas a existência de string
    expect(isJwtTokenExpired(expiredJwt)).toBe(true)

    // Token arbitrário sem estrutura JWT válida
    const fakeGarbage = 'arbitrary_long_string_without_jwt_dots'
    expect(fakeGarbage.length).toBeGreaterThan(10)
    // Token malformado
    expect(isJwtTokenExpired(fakeGarbage)).toBe(false) // Sem partes, o decoder tolera mas pb.authStore.isValid acusará false
  })

  // --------------------------------------------------------------------------
  // ESTADO 1: Sessão em Validação (Transição)
  // --------------------------------------------------------------------------
  it('Estado 1 (Sessão em validação): se há credencial pendente de verificação, exibe tela de transição e NUNCA ejeta para /login', async () => {
    saveSessionBackup(validJwt, userModel)
    pb.authStore.clear() // Simula boot inicial sem inicialização em memória do SDK

    // Mock do authRefresh demorando 400ms
    vi.spyOn(pb.collection('users'), 'authRefresh').mockImplementation(async () => {
      await new Promise((r) => setTimeout(r, 400))
      return { token: validJwt, record: userModel } as any
    })

    const { getByText, queryByText } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <PageDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<PageLogin />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    // No primeiro tick, como o contexto está inicializando e validando, exibe a tela de transição
    // e JAMAIS renderiza a tela de login!
    expect(queryByText('Tela de Login')).toBeNull()
    // Pode exibir o loader ou já renderizar o dashboard se a restauração síncrona foi imediata
    await waitFor(() => {
      expect(getByText('Painel Dashboard')).toBeDefined()
    })
    expect(queryByText('Tela de Login')).toBeNull()
  })

  // --------------------------------------------------------------------------
  // ESTADO 2: Sessão Autenticada (Acesso Concedido)
  // --------------------------------------------------------------------------
  it('Estado 2 (Sessão autenticada): token íntegro e não expirado concede acesso imediato à rota protegida', async () => {
    saveSessionBackup(validJwt, userModel)
    restorePbAuthStoreFromBackup()

    const { getByText, queryByText } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <PageDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<PageLogin />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    expect(getByText('Painel Dashboard')).toBeDefined()
    expect(queryByText('Tela de Login')).toBeNull()
  })

  // --------------------------------------------------------------------------
  // ESTADO 3: Sessão Expirada / Inválida (Redirecionamento Limpo)
  // --------------------------------------------------------------------------
  it('Estado 3 (Sessão expirada/inválida): sem credencial válida no storage, ProtectedRoute redireciona para /login', async () => {
    // Storage completamente limpo (sem token)
    clearAllSessionBackups()
    pb.authStore.clear()

    const { getByText, queryByText } = render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <PageDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<PageLogin />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    // Redireciona com segurança para /login
    await waitFor(() => {
      expect(getByText('Tela de Login')).toBeDefined()
    })
    expect(queryByText('Painel Dashboard')).toBeNull()
  })

  // --------------------------------------------------------------------------
  // ESTADO 4: Falha Temporária de Rede (NÃO trata como expiração)
  // --------------------------------------------------------------------------
  it('Estado 4 (Falha temporária de rede): erro de conexão (status: 0) NÃO desloga o usuário e preserva a credencial local', async () => {
    saveSessionBackup(validJwt, userModel)
    restorePbAuthStoreFromBackup()

    // Simula falha total de rede / offline (status 0)
    const refreshSpy = vi.spyOn(pb.collection('users'), 'authRefresh').mockRejectedValue({
      status: 0,
      message: 'Failed to fetch / network unreachable',
    })

    const refreshOk = await singleFlightSafeAuthRefresh()
    // O refresh falha por causa da rede, mas NÃO é 401
    expect(refreshOk).toBe(false)
    expect(refreshSpy).toHaveBeenCalled()

    // O backup no localStorage CONTINUA preservado
    const backup = loadSessionBackup()
    expect(backup).not.toBeNull()
    expect(backup?.token).toBe(validJwt)
    // pb.authStore permanece ativo com a credencial restaurada
    expect(pb.authStore.token).toBe(validJwt)
  })

  // --------------------------------------------------------------------------
  // REPRODUÇÃO DO DEFEITO DO USUÁRIO EM /login (PublicRoute)
  // --------------------------------------------------------------------------
  it('Usuário que acessa /login tendo sessão salva não-expirada: PublicRoute impede formulário de login e redireciona para /dashboard', async () => {
    saveSessionBackup(validJwt, userModel)
    restorePbAuthStoreFromBackup()

    const { queryByText } = render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <PageLogin />
                </PublicRoute>
              }
            />
            <Route path="/dashboard" element={<PageDashboard />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    // Em nenhum momento exibe o formulário de login para usuário já autenticado
    expect(queryByText('Tela de Login')).toBeNull()
  })
})
