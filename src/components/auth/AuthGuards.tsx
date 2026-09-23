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

  // Checagem síncrona rigorosa de credencial existente no storage e memória
  const backup = loadSessionBackup()
  const backupTokenHasLength = Boolean(backup?.token && backup.token.length > 10)
  const pbTokenHasLength = Boolean(pb.authStore.token && pb.authStore.token.length > 10)

  // Checagem direta de fallback de strings em localStorage caso loadSessionBackup não tenha capturado
  let directStorageHasToken = false
  if (typeof window !== 'undefined') {
    try {
      const rawApp = localStorage.getItem('souyess.session.backup')
      if (rawApp) {
        const parsedApp = JSON.parse(rawApp)
        if (
          parsedApp?.token &&
          typeof parsedApp.token === 'string' &&
          parsedApp.token.length > 10
        ) {
          directStorageHasToken = true
        }
      }
      const rawPb = localStorage.getItem('pocketbase_auth')
      if (rawPb) {
        const parsedPb = JSON.parse(rawPb)
        if (parsedPb?.token && typeof parsedPb.token === 'string' && parsedPb.token.length > 10) {
          directStorageHasToken = true
        }
      }
    } catch {
      /* intentionally ignored */
    }
  }

  const hasAnyCred = Boolean(backupTokenHasLength || pbTokenHasLength || directStorageHasToken)

  // Se o contexto ainda não registrou isAuthenticated mas há credencial em localStorage/SDK, auto-restaura
  useEffect(() => {
    if (hasAnyCred) {
      const restored = restorePbAuthStoreFromBackup()
      const effectiveToken = restored?.token || pb.authStore.token
      const effectiveModel = restored?.model || pb.authStore.record
      if (effectiveToken && !isAuthenticated) {
        syncAuthNow(effectiveToken, effectiveModel)
      }
    }
  }, [isAuthenticated, hasAnyCred, syncAuthNow])

  // Se existir QUALQUER credencial salva (backup em localStorage ou token no pb.authStore),
  // NUNCA ejeta para /login — mantém a tela de transição até o estado consolidar!
  if (hasAnyCred) {
    if (!isAuthenticated || isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F7F8FB] dark:bg-[#11162B]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#E9530E] animate-spin" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Verificando sessão ativa...
            </p>
          </div>
        </div>
      )
    }
    return <>{children}</>
  }

  // Se estiver em carregamento inicial sem credenciais salvas identificadas ainda:
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FB] dark:bg-[#11162B]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#E9530E] animate-spin" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Verificando sessão ativa...
          </p>
        </div>
      </div>
    )
  }

  // ANTES de qualquer <Navigate to="/login">, última verificação síncrona estrita
  // Tolera qualquer token salvo com comprimento > 10, sem ejetar caso precise de refresh
  const lastCheckBackup = loadSessionBackup()
  if (lastCheckBackup?.token && lastCheckBackup.token.length > 10) {
    restorePbAuthStoreFromBackup()
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FB] dark:bg-[#11162B]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#E9530E] animate-spin" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Verificando sessão ativa...
          </p>
        </div>
      </div>
    )
  }

  // Apenas navega para /login se expressamente NÃO existir credencial alguma em localStorage nem em memória:
  if (!isAuthenticated && !hasAnyCred) {
    // Barreira ativa hiper-estrita: se houver QUALQUER resquício de token no localStorage,
    // JAMAIS navega para /login. Restaura a sessão e mantém a visualização.
    let storageHasToken = false
    if (typeof window !== 'undefined') {
      try {
        const rawApp = localStorage.getItem('souyess.session.backup')
        if (rawApp) {
          const parsedApp = JSON.parse(rawApp)
          if (
            parsedApp?.token &&
            typeof parsedApp.token === 'string' &&
            parsedApp.token.length > 10
          ) {
            storageHasToken = true
          }
        }
        const rawPb = localStorage.getItem('pocketbase_auth')
        if (rawPb) {
          const parsedPb = JSON.parse(rawPb)
          if (parsedPb?.token && typeof parsedPb.token === 'string' && parsedPb.token.length > 10) {
            storageHasToken = true
          }
        }
      } catch {
        /* noop */
      }
    }

    if (storageHasToken) {
      const restored = restorePbAuthStoreFromBackup()
      if (restored?.token && !isAuthenticated) {
        syncAuthNow(restored.token, restored.model)
      }
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#F7F8FB] dark:bg-[#11162B]">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-[#E9530E] animate-spin" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
              Verificando sessão ativa...
            </p>
          </div>
        </div>
      )
    }

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
  const { isAuthenticated, isLoading, isRenewingSession, syncAuthNow } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const rawTarget =
    (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard'
  const destination = rawTarget.startsWith('/login') ? '/dashboard' : rawTarget

  // Checagem direta de credencial
  const backup = loadSessionBackup()
  let directStorageHasToken = false
  if (typeof window !== 'undefined') {
    try {
      const rawApp = localStorage.getItem('souyess.session.backup')
      if (rawApp) {
        const parsedApp = JSON.parse(rawApp)
        if (
          parsedApp?.token &&
          typeof parsedApp.token === 'string' &&
          parsedApp.token.length > 10
        ) {
          directStorageHasToken = true
        }
      }
      const rawPb = localStorage.getItem('pocketbase_auth')
      if (rawPb) {
        const parsedPb = JSON.parse(rawPb)
        if (parsedPb?.token && typeof parsedPb.token === 'string' && parsedPb.token.length > 10) {
          directStorageHasToken = true
        }
      }
    } catch {
      /* intentionally ignored */
    }
  }

  const hasAnyBackup = Boolean(backup?.token && backup.token.length > 10)
  const hasPbToken = Boolean(pb.authStore.token && pb.authStore.token.length > 10)
  const hasCredential = isAuthenticated || hasAnyBackup || hasPbToken || directStorageHasToken

  useEffect(() => {
    if (!hasCredential) return

    let isSubscribed = true

    const runRedirectFlow = async () => {
      // 1. Restaura síncrono e consolida estado do contexto
      const restored = restorePbAuthStoreFromBackup()
      const effectiveToken = restored?.token || pb.authStore.token
      const effectiveModel = restored?.model || pb.authStore.record
      if (effectiveToken && !isAuthenticated) {
        syncAuthNow(effectiveToken, effectiveModel)
      }

      // 2. Aguarda a validação do token com o backend de forma resolvida (Promise/await real)
      // NENHUM timer arbitrário (ex: 150ms). Apenas segue adiante quando a Promise for resolvida.
      try {
        await singleFlightSafeAuthRefresh()
        if (pb.authStore.token && isSubscribed) {
          syncAuthNow(pb.authStore.token, pb.authStore.record)
        }
      } catch (err) {
        console.warn('[PublicRoute] Revalidação authRefresh finalizada:', err)
      }

      if (!isSubscribed) return

      // 3. Com o estado de autenticação plenamente resolvido, navega para o destino
      console.info(`[PublicRoute] Redirecionando sessão autenticada resolvida para ${destination}`)
      navigate(destination, { replace: true })
    }

    runRedirectFlow()

    return () => {
      isSubscribed = false
    }
  }, [hasCredential, destination, navigate, syncAuthNow, isAuthenticated])

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
