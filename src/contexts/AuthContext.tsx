import React, { createContext, useContext, useEffect, useState } from 'react'
import pb from '@/lib/pocketbase/client'
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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<RecordModel | null>(pb.authStore.record)
  const [token, setToken] = useState<string>(pb.authStore.token)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    // Listen for auth state changes
    const unsub = pb.authStore.onChange((tok, model) => {
      // Se tivermos um token válido no store ou se foi uma limpeza intencional, atualizamos
      if (tok && model) {
        setToken(tok)
        setUser(model)
      } else if (!tok && !model) {
        // Ignorar limpezas transitórias se o token salvo ainda estiver presente no localStorage/store
        // Apenas zerar se não for transitório
        setToken('')
        setUser(null)
      }
    })

    // Validate and refresh session on mount com try/catch seguro
    async function initAuth() {
      if (pb.authStore.isValid) {
        try {
          await pb.collection('users').authRefresh()
          setUser(pb.authStore.record)
          setToken(pb.authStore.token)
        } catch (err: any) {
          // Erros transitórios de rede (status 0) ou falhas temporárias não devem limpar a sessão
          // Apenas se o servidor explicitamente rejeitou as credenciais (ex: 401 ou 403)
          if (err?.status === 401 || err?.status === 403) {
            pb.authStore.clear()
            setUser(null)
            setToken('')
          } else {
            // Mantém os dados locais do authStore já persistidos
            setUser(pb.authStore.record)
            setToken(pb.authStore.token)
          }
        }
      } else {
        // Se já não era válido, inicializa limpo
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
    const authData = await pb.collection('users').authWithPassword(email, pass)
    setUser(authData.record)
    setToken(authData.token)
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setToken('')
  }

  const refreshUser = async () => {
    if (pb.authStore.isValid) {
      try {
        const refreshed = await pb.collection('users').authRefresh()
        setUser(refreshed.record)
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

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
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
