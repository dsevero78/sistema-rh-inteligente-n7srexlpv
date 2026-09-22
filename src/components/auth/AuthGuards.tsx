import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth, getStoredAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { Loader2 } from 'lucide-react'

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  // Checagem imediata se há credencial local válida no storage
  const stored = getStoredAuth()
  const hasLocalCred = Boolean(
    (stored?.token && stored.token.length > 10) ||
    (pb.authStore.token && pb.authStore.token.length > 10),
  )

  // Se estiver carregando OU se houver credencial no localStorage mas o estado React ainda não concluiu a transição,
  // exibe loader e NÃO redireciona de volta para /login.
  if (isLoading || (hasLocalCred && !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Carregando credenciais...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()

  const rawTarget =
    (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
  // Evitar redirecionamento cíclico para /login
  const destination = rawTarget.startsWith('/login') ? '/dashboard' : rawTarget

  // Checagem imediata de credencial síncrona persistida no localStorage ou authStore
  const stored = getStoredAuth()
  const hasLocalCred = Boolean(
    (stored?.token && stored.token.length > 10) ||
    (pb.authStore.token && pb.authStore.token.length > 10),
  )

  // Se já autenticado, redireciona imediatamente
  if (isAuthenticated) {
    return <Navigate to={destination} replace />
  }

  // Enquanto carrega ou enquanto há credencial local sendo validada, exibe tela de verificação
  // e NUNCA renderiza o formulário de login para evitar 'flicker' e retenção indevida
  if (isLoading || hasLocalCred) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Verificando sessão ativa...</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
