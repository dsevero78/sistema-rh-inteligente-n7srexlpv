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
  login: (email: string, pass: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = 'pocketbase_auth'

/**
 * Lê credenciais salvas no localStorage caso o authStore em memória tenha sido esvaziado
 */
function getStoredAuth(): { token: string; model: RecordModel | null } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed.token === 'string' && parsed.token.length > 0) {
      return {
        token: parsed.token,
        model: parsed.record || parsed.model || null,
      }
    }
  } catch {
    // Ignora erros de parsing
  }
  return null
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<RecordModel | null>(pb.authStore.record)
  const [token, setToken] = useState<string>(pb.authStore.token)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  // 2.a) Flag de logout intencional
  const isIntentionalLogoutRef = useRef<boolean>(false)
  // Flag indicando se há recuperação/refresh em andamento para manter isAuthenticated durante o retry
  const isRecoveringAuthRef = useRef<boolean>(false)

  useEffect(() => {
    // Listen for auth state changes
    const unsub = pb.authStore.onChange(async (tok, model) => {
      // 1. Caso com token e model válidos
      if (tok && model) {
        setToken(tok)
        setUser(model)
        return
      }

      // 2. Caso (!tok && !model)
      if (!tok && !model) {
        // Se for logout explicitamente disparado pelo usuário (logout() chamado), limpa tudo
        if (isIntentionalLogoutRef.current) {
          setToken('')
          setUser(null)
          return
        }

        // Se NÃO foi intencional (ex.: SDK PocketBase limpou authStore internamente após 401 transitório),
        // NÃO deslogar imediatamente. Tentar recuperar pelo localStorage e executar singleFlightAuthRefresh()
        if (isRecoveringAuthRef.current) {
          // Já está em processo de recuperação, aguardar
          return
        }

        const stored = getStoredAuth()
        if (stored && stored.token) {
          isRecoveringAuthRef.current = true
          console.warn(
            '[AuthContext] Limpeza não-intencional de sessão detectada. Tentando restabelecer do localStorage...',
          )

          // Restaura temporariamente em memória para não quebrar componentes imediatamente
          pb.authStore.save(stored.token, stored.model)
          setToken(stored.token)
          if (stored.model) setUser(stored.model)

          // Tenta atualizar a sessão via backend
          const ok = await singleFlightAuthRefresh()
          isRecoveringAuthRef.current = false

          if (ok && pb.authStore.isValid) {
            console.info('[AuthContext] Sessão revalidada com sucesso!')
            setToken(pb.authStore.token)
            setUser(pb.authStore.record)
          } else {
            // Só desloga de verdade se o refresh falhou e o token for comprovadamente inválido
            if (!pb.authStore.isValid && !pb.authStore.token) {
              console.warn('[AuthContext] Sessão expirada em definitivo pelo servidor.')
              setToken('')
              setUser(null)
            }
          }
        } else {
          // Não há dados nem no localStorage, zera de fato
          setToken('')
          setUser(null)
        }
      }
    })

    // Validação inicial ao carregar a página
    async function initAuth() {
      // Se pb.authStore não tem token mas localStorage tem, restaura antes do init
      if (!pb.authStore.token) {
        const stored = getStoredAuth()
        if (stored?.token) {
          pb.authStore.save(stored.token, stored.model)
          setToken(stored.token)
          if (stored.model) setUser(stored.model)
        }
      }

      if (pb.authStore.isValid) {
        try {
          await singleFlightAuthRefresh()
          setUser(pb.authStore.record)
          setToken(pb.authStore.token)
        } catch (err: any) {
          const status = err?.status || err?.response?.status
          if (status === 401 || status === 403) {
            // Rejeição definitiva de credenciais pelo servidor
            isIntentionalLogoutRef.current = true
            pb.authStore.clear()
            setUser(null)
            setToken('')
          } else {
            // Mantém os dados locais persistidos caso tenha sido falha de rede temporária
            setUser(pb.authStore.record)
            setToken(pb.authStore.token)
          }
        }
      } else {
        // Inicializa com o que estiver presente
        setUser(pb.authStore.record || null)
        setToken(pb.authStore.token || '')
      }
      setIsLoading(false)
    }

    initAuth()

    return () => {
      unsub()
    }
  }, [])

  const login = async (email: string, pass: string) => {
    isIntentionalLogoutRef.current = false
    const authData = await pb.collection('users').authWithPassword(email, pass)
    setUser(authData.record)
    setToken(authData.token)
  }

  const logout = () => {
    // 2.a) Apenas logout() manual marca isIntentionalLogout e limpa authStore
    isIntentionalLogoutRef.current = true
    pb.authStore.clear()
    setUser(null)
    setToken('')
  }

  const refreshUser = async () => {
    if (pb.authStore.isValid) {
      try {
        const ok = await singleFlightAuthRefresh()
        if (ok) {
          setUser(pb.authStore.record)
          setToken(pb.authStore.token)
        }
      } catch (_) {
        // no-op
      }
    }
  }

  const isGestorContratante = user?.cargo_funcao === 'Gestor Contratante'
  const isRh = !isGestorContratante
  const isRH = isRh

  const empresa = user?.empresa || ''
  const empresa_nome = user?.empresa_nome || user?.expand?.empresa?.nome || ''
  const area = user?.area || user?.area_atuacao || ''

  // 2.c) Manter estado autenticado durante o retry: se tivermos user e token OU recuperação ativa com token no store
  const isAuthed = (!!user && !!token) || (isRecoveringAuthRef.current && !!pb.authStore.token)

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: isAuthed,
        isLoading,
        isGestorContratante,
        isRh,
        isRH,
        empresa,
        empresa_nome,
        area,
        login,
        logout,
        refreshUser,
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
