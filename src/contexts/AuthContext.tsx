import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import pb, { singleFlightAuthRefresh } from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'

interface AuthContextType {
  user: RecordModel | null
  token: string
  isAuthenticated: boolean
  isLoading: boolean
  isGestorContratante: boolean
  isRh: boolean
  isRH: boolean
  empresa?: string
  empresa_nome?: string
  area?: string
  isRenewingSession: boolean
  login: (email: string, pass: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<boolean>
  syncAuthNow: (token: string, record: RecordModel | null) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = 'pocketbase_auth'

/**
 * Decodifica com segurança o payload do JWT do PocketBase para checar expiração e integridade
 */
function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return false
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    const payload = JSON.parse(jsonPayload)
    if (typeof payload.exp === 'number') {
      const now = Math.floor(Date.now() / 1000)
      return payload.exp < now
    }
  } catch {
    // Se falhar o parse, não assume expirado
  }
  return false
}

/**
 * Lê credenciais salvas no localStorage caso o authStore em memória tenha sido esvaziado
 */
export function getStoredAuth(): { token: string; model: RecordModel | null } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.token === 'string' && parsed.token.length > 10) {
      return {
        token: parsed.token,
        model: (parsed.record || parsed.model || null) as RecordModel | null,
      }
    }
  } catch {
    // Ignora erros de parsing
  }
  return null
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Inicializa já restaurando do localStorage se o authStore do SDK estiver em branco
  const initialStored = getStoredAuth()
  if (!pb.authStore.token && initialStored?.token) {
    try {
      pb.authStore.save(initialStored.token, initialStored.model)
    } catch {
      // no-op
    }
  }

  const [user, setUser] = useState<RecordModel | null>(
    pb.authStore.record || initialStored?.model || null,
  )
  const [token, setToken] = useState<string>(pb.authStore.token || initialStored?.token || '')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isRenewingSession, setIsRenewingSession] = useState<boolean>(false)

  // Flag estrita: apenas o clique explícito de logout() do usuário pode limpar credenciais
  const isExplicitLogoutRef = useRef<boolean>(false)
  // Flag para rastrear refresh em andamento
  const isRecoveringAuthRef = useRef<boolean>(false)

  useEffect(() => {
    // Listener de mudanças no authStore do PocketBase
    const unsub = pb.authStore.onChange(async (tok, model) => {
      // 1. Caso com token e model válidos
      if (tok && model) {
        setToken(tok)
        setUser(model)
        return
      }

      // 2. Caso (token ou model estejam ausentes no evento do onChange)
      // Se foi um logout explicitamente disparado pelo usuário (logout() chamado), limpa tudo
      if (isExplicitLogoutRef.current) {
        setToken('')
        setUser(null)
        setIsRenewingSession(false)
        return
      }

      // Se NÃO foi logout explícito, verificar se ainda há credencial no localStorage
      const stored = getStoredAuth()
      if (stored?.token) {
        // PRESERVAÇÃO SILENCIOSA: Há credencial no localStorage!
        // Não rebaixa o estado para deslogado por transição de evento, reconexão SSE ou troca de aba.
        console.warn(
          '[AuthContext] Evento transitório do authStore detectado. Preservando sessão pelo localStorage...',
        )

        // Restaura em memória no pb.authStore imediatamente
        pb.authStore.save(stored.token, stored.model)
        setToken(stored.token)
        if (stored.model) setUser(stored.model)

        // Se já há um refresh ou recuperação em andamento, não duplica
        if (isRecoveringAuthRef.current) {
          return
        }

        isRecoveringAuthRef.current = true
        setIsRenewingSession(true)

        try {
          const ok = await singleFlightAuthRefresh()
          if (ok && pb.authStore.isValid) {
            console.info('[AuthContext] Sessão revalidada silenciosamente com sucesso!')
            setToken(pb.authStore.token)
            setUser(pb.authStore.record)
          }
        } catch (err: unknown) {
          const status =
            (err as { status?: number; response?: { status?: number } })?.status ||
            (err as { response?: { status?: number } })?.response?.status

          // `setUser(null)` / `setIsAuthed(false)` SÓ quando o backend rejeitar explicitamente (401/403 com token inválido/revogado)
          if (status === 401 || status === 403) {
            console.error(
              '[AuthContext] Sessão rejeitada em definitivo pelo servidor (401/403). Limpando credenciais.',
            )
            logout()
          } else {
            console.warn(
              '[AuthContext] Falha transitória de rede/latência ao revalidar sessão. Mantendo usuário ativo.',
            )
            // Mantém usuário e token restaurados silenciosamente
            if (stored.token) setToken(stored.token)
            if (stored.model) setUser(stored.model)
          }
        } finally {
          isRecoveringAuthRef.current = false
          setIsRenewingSession(false)
        }
      } else {
        // Não há credencial alguma no localStorage
        console.info('[AuthContext] Nenhuma credencial no storage. Definindo sessão como vazia.')
        setToken('')
        setUser(null)
        setIsRenewingSession(false)
      }
    })

    // Validação inicial ao carregar o aplicativo
    async function initAuth() {
      // 1. Se pb.authStore não tem token mas localStorage tem, restaura antes do init
      if (!pb.authStore.token) {
        const stored = getStoredAuth()
        if (stored?.token) {
          pb.authStore.save(stored.token, stored.model)
          setToken(stored.token)
          if (stored.model) setUser(stored.model)
        }
      }

      const storedNow = getStoredAuth()
      const hasAnyToken = Boolean(pb.authStore.token || storedNow?.token)

      if (hasAnyToken) {
        // Se temos credencial local, manter usuário em memória enquanto revalida silenciosamente
        const currentToken = pb.authStore.token || storedNow?.token || ''
        const currentModel = pb.authStore.record || storedNow?.model || null

        setToken(currentToken)
        if (currentModel) setUser(currentModel)

        // Se o token ainda é válido ou recém-restaurado, tenta um refresh silencioso
        try {
          setIsRenewingSession(true)
          await singleFlightAuthRefresh()
          setUser(pb.authStore.record)
          setToken(pb.authStore.token)
        } catch (err: unknown) {
          const status =
            (err as { status?: number; response?: { status?: number } })?.status ||
            (err as { response?: { status?: number } })?.response?.status

          // SÓ desloga se o servidor rejeitou explicitamente como 401/403 com token inválido
          if (status === 401 || status === 403) {
            console.warn('[AuthContext] Token rejeitado no init (401/403).')
            logout()
          } else {
            console.warn(
              '[AuthContext] Revalidação inicial falhou por rede/offline. Mantendo credencial local preservada.',
            )
            setUser(pb.authStore.record || currentModel)
            setToken(pb.authStore.token || currentToken)
          }
        } finally {
          setIsRenewingSession(false)
        }
      } else {
        setUser(null)
        setToken('')
      }
      setIsLoading(false)
    }

    initAuth()

    return () => {
      unsub()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    isExplicitLogoutRef.current = false
    const authData = await pb.collection('users').authWithPassword(email, pass)
    // Sincroniza imediatamente o authStore e o localStorage
    if (authData.token) {
      pb.authStore.save(authData.token, authData.record)
    }
    setToken(authData.token)
    setUser(authData.record)
    setIsLoading(false)
  }

  const logout = () => {
    // 3. Logout estrito: pb.authStore.clear() e limpeza de storage apenas no clique explícito de "Sair".
    isExplicitLogoutRef.current = true
    pb.authStore.clear()
    setUser(null)
    setToken('')
    setIsRenewingSession(false)
  }

  const syncAuthNow = (newToken: string, newRecord: RecordModel | null) => {
    isExplicitLogoutRef.current = false
    if (newToken) {
      pb.authStore.save(newToken, newRecord)
    }
    setToken(newToken)
    setUser(newRecord)
    setIsLoading(false)
  }

  const refreshUser = async (): Promise<boolean> => {
    const stored = getStoredAuth()
    if (pb.authStore.isValid || stored?.token) {
      try {
        setIsRenewingSession(true)
        if (!pb.authStore.token && stored?.token) {
          pb.authStore.save(stored.token, stored.model)
        }
        const ok = await singleFlightAuthRefresh()
        if (ok) {
          setUser(pb.authStore.record)
          setToken(pb.authStore.token)
          return true
        }
      } catch (err: unknown) {
        const status =
          (err as { status?: number; response?: { status?: number } })?.status ||
          (err as { response?: { status?: number } })?.response?.status
        if (status === 401 || status === 403) {
          logout()
        }
        throw err
      } finally {
        setIsRenewingSession(false)
      }
    }
    return false
  }

  const isGestorContratante = user?.cargo_funcao === 'Gestor Contratante'
  const isRh = !isGestorContratante
  const isRH = isRh

  const empresa = user?.empresa || ''
  const empresa_nome = user?.empresa_nome || user?.expand?.empresa?.nome || ''
  const area = user?.area || user?.area_atuacao || ''

  // 1. Preservação silenciosa do estado:
  // Enquanto houver credencial no localStorage ou user/token válidos em memória, NÃO deslogar por transitoriedade
  const storedAuth = getStoredAuth()
  const hasValidStoredCredential = Boolean(
    !isExplicitLogoutRef.current && storedAuth?.token && storedAuth.token.length > 10,
  )

  const hasAnyValidToken = Boolean(
    !isExplicitLogoutRef.current &&
    (Boolean(token && token.length > 10) ||
      Boolean(pb.authStore.token && pb.authStore.token.length > 10) ||
      hasValidStoredCredential),
  )

  const isAuthed =
    !isExplicitLogoutRef.current &&
    ((Boolean(user) && Boolean(token)) ||
      hasAnyValidToken ||
      (isRecoveringAuthRef.current && Boolean(pb.authStore.token)))

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: isAuthed,
        isLoading,
        isRenewingSession,
        isGestorContratante,
        isRh,
        isRH,
        empresa,
        empresa_nome,
        area,
        login,
        logout,
        refreshUser,
        syncAuthNow,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
