import React, { createContext, useContext, useEffect, useRef, useState } from 'react'
import pb from '@/lib/pocketbase/client'
import type { RecordModel } from 'pocketbase'
import {
  saveSessionBackup,
  loadSessionBackup,
  clearAllSessionBackups,
  restorePbAuthStoreFromBackup,
  singleFlightSafeAuthRefresh,
  isJwtTokenExpired,
  type AppSessionBackup,
} from '@/lib/pocketbase/sessionBackup'

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

/**
 * Compatibilidade legada para funções que importavam getStoredAuth()
 */
export function getStoredAuth(): { token: string; model: RecordModel | null } | null {
  const backup = loadSessionBackup()
  if (!backup) return null
  return {
    token: backup.token,
    model: backup.model,
  }
}

/**
 * Exporta o refresh seguro com single flight
 */
export const singleFlightAuthRefresh = singleFlightSafeAuthRefresh

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. Restauração imediata síncrona na montagem
  const initialBackup = restorePbAuthStoreFromBackup()
  const initialToken = pb.authStore.token || initialBackup?.token || ''
  const initialModel = pb.authStore.record || initialBackup?.model || null

  const [user, setUser] = useState<RecordModel | null>(initialModel)
  const [token, setToken] = useState<string>(initialToken)
  // Se já possui token de backup válido na inicialização síncrona, isLoading inicia falso para não travar
  const [isLoading, setIsLoading] = useState<boolean>(
    Boolean(!initialToken && !initialBackup?.token),
  )
  const [isRenewingSession, setIsRenewingSession] = useState<boolean>(false)

  // Flag estrita: apenas o clique explícito de logout() do usuário pode limpar credenciais
  const isExplicitLogoutRef = useRef<boolean>(false)
  // Flag para evitar loops de recuperação
  const isRecoveringAuthRef = useRef<boolean>(false)

  useEffect(() => {
    // Listener de mudanças no authStore do PocketBase
    const unsub = pb.authStore.onChange(async (tok, model) => {
      // 1. Caso com token e model válidos no evento
      if (tok && model) {
        setToken(tok)
        setUser(model)
        // Salva backup proprietário atualizado
        saveSessionBackup(tok, model)
        return
      }

      // 2. Se foi um logout explicitamente disparado pelo usuário (logout() chamado), limpa tudo
      if (isExplicitLogoutRef.current) {
        setToken('')
        setUser(null)
        setIsRenewingSession(false)
        clearAllSessionBackups()
        return
      }

      // 3. Se NÃO foi logout explícito, verificar o backup do app no localStorage
      const backup = loadSessionBackup()
      if (backup?.token) {
        console.warn(
          '[AuthContext] SDK authStore foi esvaziado externamente (evento transitório/reconexão). Auto-restaurando a partir do backup...',
        )

        // Restaura imediatamente no pb.authStore em memória
        restorePbAuthStoreFromBackup()
        setToken(backup.token)
        if (backup.model) setUser(backup.model)

        // Evita chamadas concorrentes de recuperação
        if (isRecoveringAuthRef.current) {
          return
        }

        isRecoveringAuthRef.current = true
        setIsRenewingSession(true)

        try {
          const ok = await singleFlightSafeAuthRefresh()
          if (ok && pb.authStore.isValid) {
            console.info('[AuthContext] Sessão revalidada silenciosamente com sucesso via backup!')
            setToken(pb.authStore.token)
            setUser(pb.authStore.record)
          }
        } catch (err: unknown) {
          const status =
            (err as { status?: number; response?: { status?: number } })?.status ||
            (err as { response?: { status?: number } })?.response?.status

          // `setUser(null)` SÓ quando o backend rejeitar explicitamente (401/403 com token inválido/revogado)
          if (status === 401 || status === 403) {
            console.error(
              '[AuthContext] Sessão rejeitada em definitivo pelo servidor (401/403). Limpando credenciais.',
            )
            isExplicitLogoutRef.current = true
            clearAllSessionBackups()
            pb.authStore.clear()
            setToken('')
            setUser(null)
          } else {
            console.warn(
              '[AuthContext] Falha transitória de rede ao revalidar sessão. Mantendo usuário ativo pelo backup.',
            )
            // Mantém usuário e token restaurados silenciosamente
            if (backup.token) setToken(backup.token)
            if (backup.model) setUser(backup.model)
          }
        } finally {
          isRecoveringAuthRef.current = false
          setIsRenewingSession(false)
        }
      } else {
        // Não há credencial alguma no backup
        console.info('[AuthContext] Nenhuma credencial no backup. Definindo sessão como vazia.')
        setToken('')
        setUser(null)
        setIsRenewingSession(false)
      }
    })

    // Validação inicial ao carregar o aplicativo
    async function initAuth() {
      // 1. Restaura do backup se authStore não tem token
      const backup = restorePbAuthStoreFromBackup()
      const hasAnyToken = Boolean(pb.authStore.token || backup?.token)

      if (hasAnyToken) {
        const currentToken = pb.authStore.token || backup?.token || ''
        const currentModel = pb.authStore.record || backup?.model || null

        setToken(currentToken)
        if (currentModel) setUser(currentModel)

        // Validação proativa em segundo plano
        try {
          setIsRenewingSession(true)
          const refreshed = await singleFlightSafeAuthRefresh()
          if (refreshed && pb.authStore.token) {
            setUser(pb.authStore.record)
            setToken(pb.authStore.token)
          }
        } catch (err: unknown) {
          const status =
            (err as { status?: number; response?: { status?: number } })?.status ||
            (err as { response?: { status?: number } })?.response?.status

          // SÓ desloga se o servidor rejeitou explicitamente como 401/403
          if (status === 401 || status === 403) {
            console.warn('[AuthContext] Token rejeitado no init (401/403). Limpando backup.')
            isExplicitLogoutRef.current = true
            clearAllSessionBackups()
            pb.authStore.clear()
            setUser(null)
            setToken('')
          } else {
            console.warn(
              '[AuthContext] Revalidação inicial falhou por rede/latência. Mantendo credencial local restaurada.',
            )
            setUser(pb.authStore.record || currentModel)
            setToken(pb.authStore.token || currentToken)
          }
        } finally {
          setIsRenewingSession(false)
          setIsLoading(false)
        }
      } else {
        setUser(null)
        setToken('')
        setIsLoading(false)
      }
    }

    initAuth()

    return () => {
      unsub()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    isExplicitLogoutRef.current = false
    const authData = await pb.collection('users').authWithPassword(email, pass)
    if (authData.token) {
      // 1. Salva no authStore do PocketBase
      pb.authStore.save(authData.token, authData.record)
      // 2. Salva atomicamente no backup proprietário do app
      saveSessionBackup(authData.token, authData.record)
    }
    setToken(authData.token)
    setUser(authData.record)
    setIsLoading(false)
  }

  const logout = () => {
    // Logout estrito: acionado unicamente pelo clique explícito no botão "Sair"
    console.info('[AuthContext] Logout solicitado explicitamente pelo usuário.')
    isExplicitLogoutRef.current = true
    clearAllSessionBackups()
    pb.authStore.clear()
    setUser(null)
    setToken('')
    setIsRenewingSession(false)
  }

  const syncAuthNow = (newToken: string, newRecord: RecordModel | null) => {
    isExplicitLogoutRef.current = false
    if (newToken) {
      pb.authStore.save(newToken, newRecord)
      saveSessionBackup(newToken, newRecord)
    }
    setToken(newToken)
    setUser(newRecord)
    setIsLoading(false)
  }

  const refreshUser = async (): Promise<boolean> => {
    const backup = loadSessionBackup()
    if (pb.authStore.isValid || backup?.token) {
      try {
        setIsRenewingSession(true)
        restorePbAuthStoreFromBackup()
        const ok = await singleFlightSafeAuthRefresh()
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

  // Preservação da autenticação:
  // Se o usuário não deu logout explícito e houver backup íntegro ou token válido,
  // considera como autenticado!
  const backupNow = loadSessionBackup()
  const hasTokenStr = Boolean(token && token.length > 10)
  const hasPbStoreToken = Boolean(pb.authStore.token && pb.authStore.token.length > 10)
  const hasValidBackup = Boolean(
    backupNow?.token && backupNow.token.length > 10 && !isJwtTokenExpired(backupNow.token),
  )

  const isAuthed =
    !isExplicitLogoutRef.current &&
    (hasTokenStr ||
      hasPbStoreToken ||
      hasValidBackup ||
      (isRecoveringAuthRef.current && Boolean(backupNow?.token)))

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
