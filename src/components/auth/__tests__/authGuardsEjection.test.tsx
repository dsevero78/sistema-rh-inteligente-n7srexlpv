import { describe, it, expect, beforeEach, vi } from 'vitest'
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ProtectedRoute } from '@/components/auth/AuthGuards'
import { saveSessionBackup, restorePbAuthStoreFromBackup } from '@/lib/pocketbase/sessionBackup'
import pb from '@/lib/pocketbase/client'

// Componente simulando página interna
const DummyInternalPage = () => {
  const { user, refreshUser } = useAuth()
  return (
    <div>
      <h1>Página Interna Protegida</h1>
      <p data-testid="user-email">{user?.email || 'sem-email'}</p>
      <button data-testid="trigger-refresh" onClick={() => refreshUser()}>
        Background Refresh
      </button>
    </div>
  )
}

const DummyLoginPage = () => <h1>Página de Login</h1>

describe('Proteção de Sessão contra Ejeção', () => {
  beforeEach(() => {
    localStorage.clear()
    pb.authStore.clear()
    vi.restoreAllMocks()
  })

  it('usuário em página interna → refresh de token em background → não deve navegar para /login', async () => {
    const validToken =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6InVzZXJfZDJkIiwgImV4cCI6MjUyNDYwODAwMH0.dummy'
    const userModel = { id: 'user_d2d', email: 'rh@empresa.com' } as any

    // 1. Simula usuário com sessão salva e ativa
    saveSessionBackup(validToken, userModel)
    restorePbAuthStoreFromBackup()

    // 2. Simula o authRefresh de background falhando ou oscilando
    const refreshSpy = vi.spyOn(pb.collection('users'), 'authRefresh').mockRejectedValueOnce({
      status: 0,
      message: 'Network error',
    })

    const { getByText, queryByText, getByTestId } = render(
      <MemoryRouter initialEntries={['/candidatos']}>
        <AuthProvider>
          <Routes>
            <Route
              path="/candidatos"
              element={
                <ProtectedRoute>
                  <DummyInternalPage />
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<DummyLoginPage />} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    )

    // Confirma que a página interna foi renderizada
    expect(getByText('Página Interna Protegida')).toBeDefined()
    expect(queryByText('Página de Login')).toBeNull()

    // 3. Dispara o refresh de background
    const refreshBtn = getByTestId('trigger-refresh')
    refreshBtn.click()

    // 4. Confirma que o refresh foi invocado
    await waitFor(() => {
      expect(refreshSpy).toHaveBeenCalledTimes(1)
    })

    // 5. Garante que o usuário CONTINUA na página interna e JAMAIS caiu em /login
    expect(getByText('Página Interna Protegida')).toBeDefined()
    expect(queryByText('Página de Login')).toBeNull()
    expect(localStorage.getItem('souyess.session.backup')).not.toBeNull()
  })
})
