import React, { useEffect } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import {
  loadSessionBackup,
  restorePbAuthStoreFromBackup,
  isJwtTokenExpired,
  singleFlightSafeAuthRefresh,
} from '@/lib/pocketbase/sessionBackup'
import { Loader2 } from 'lucide-react'

/**
 * Guarda para rotas protegidas (ex.: /dashboard, /vagas, etc.).
 * Se houver backup no localStorage ou authStore válido, não chuta para /login.
 * Restaura o estado e permite acesso imediato.
 */
export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, syncAuthNow } = useAuth()
  const location = useLocation()

  // Checagem síncrona profunda de credencial existente
  const backup = loadSessionBackup()
  const hasValidBackup = Boolean(
    backup?.token && backup.token.length > 10 && !isJwtTokenExpired(backup.token),
  )
  const hasPbToken = Boolean(pb.authStore.token && pb.authStore.token.length > 10)
  const hasAnyCred = hasValidBackup || hasPbToken

  // Se o contexto ainda não registrou isAuthenticated mas há backup íntegro, auto-restaura
  useEffect(() => {
    if (!isAuthenticated && hasAnyCred) {
      const restored = restorePbAuthStoreFromBackup()
      if (restored) {
        syncAuthNow(restored.token, restored.model)
      }
    }
  }, [isAuthenticated, hasAnyCred, syncAuthNow])

  // Se estiver em carregamento inicial OU temos credencial local mas o react state está transitando:
  if (isLoading || (hasAnyCred && !isAuthenticated)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FB] dark:bg-[#11162B]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#E9530E] animate-spin" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Validando acesso seguro...
          </p>
        </div>
      </div>
    )
  }

  // Apenas se realmente não há credencial nem no app nem no backend:
  if (!isAuthenticated && !hasAnyCred) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}

/**
 * Guarda para rotas públicas de autenticação (ex.: /login, /forgot-password).
 * NUNCA renderiza o formulário de login se houver backup de sessão válido no localStorage ou authStore.
 * Exibe tela de "Verificando sessão ativa..." e força redirecionamento para o Dashboard com garantia dupla.
 */
export const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading, syncAuthNow } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const rawTarget =
    (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
  const destination = rawTarget.startsWith('/login') ? '/dashboard' : rawTarget

  // Checagem direta de credencial
  const backup = loadSessionBackup()
  const hasValidBackup = Boolean(
    backup?.token && backup.token.length > 10 && !isJwtTokenExpired(backup.token),
  )
  const hasPbToken = Boolean(pb.authStore.token && pb.authStore.token.length > 10)
  const hasCredential = isAuthenticated || hasValidBackup || hasPbToken

  useEffect(() => {
    if (!hasCredential) return

    let isSubscribed = true
    let fallbackTimer: ReturnType<typeof setTimeout> | null = null

    const runRedirectFlow = async () => {
      // 1. Restaura síncrono e consolida estado do contexto
      const restored = restorePbAuthStoreFromBackup()
      const effectiveToken = restored?.token || pb.authStore.token
      const effectiveModel = restored?.model || pb.authStore.record
      if (effectiveToken) {
        syncAuthNow(effectiveToken, effectiveModel)
      }

      // 2. Aguarda a validação do token com o backend de forma síncrona/esperada
      try {
        await singleFlightSafeAuthRefresh()
        if (pb.authStore.token && isSubscribed) {
          syncAuthNow(pb.authStore.token, pb.authStore.record)
        }
      } catch (err) {
        console.warn('[PublicRoute] Revalidação authRefresh falhou de forma não-fatal:', err)
      }

      if (!isSubscribed) return

      // 3. Navega para o destino
      console.info(`[PublicRoute] Redirecionando sessão validada para ${destination}`)
      try {
        navigate(destination, { replace: true })
      } catch (err) {
        console.warn('[PublicRoute] navigate falhou, recorrendo a window.location', err)
      }

      // 4. Fallback forçado com verificação real de rota: se após ~500ms ainda estiver em rota pública,
      // força window.location.replace para desbloquear o Dashboard
      fallbackTimer = setTimeout(() => {
        if (
          typeof window !== 'undefined' &&
          (window.location.pathname.startsWith('/login') ||
            window.location.pathname.startsWith('/forgot-password') ||
            window.location.pathname.startsWith('/reset-password') ||
            window.location.pathname === '/')
        ) {
          console.warn(
            `[PublicRoute] Fallback forçado acionado (ainda em ${window.location.pathname}). Executando window.location.replace('${destination}')...`,
          )
          window.location.replace(destination)
        }
      }, 500)
    }

    runRedirectFlow()

    return () => {
      isSubscribed = false
      if (fallbackTimer) {
        clearTimeout(fallbackTimer)
      }
    }
  }, [hasCredential, destination, navigate, syncAuthNow])

  // Se tem credencial ou está carregando, JAMAIS mostra o formulário de login
  if (hasCredential || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FB] dark:bg-[#11162B]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#E9530E] animate-spin" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            Verificando sessão ativa...
          </p>
          <span className="text-xs text-slate-500">Restaurando credenciais corporativas</span>
        </div>
      </div>
    )
  }

  // Apenas renderiza formulário de login se comprovadamente NÃO tem credencial
  return <>{children}</>
}
