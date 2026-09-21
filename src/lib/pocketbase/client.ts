import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Decodifica a expiração do JWT (exp em segundos)
export function getTokenExpirationSec(jwtToken: string): number | null {
  if (!jwtToken) return null
  try {
    const parts = jwtToken.split('.')
    if (parts.length < 2) return null
    // Tratamento de base64url para base64 padrão
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) {
      base64 += '='
    }
    const jsonStr = atob(base64)
    const payload = JSON.parse(jsonStr)
    return typeof payload.exp === 'number' ? payload.exp : null
  } catch {
    return null
  }
}

// Verifica se o token precisa de refresh (expirado ou expirando em menos de bufferSeconds)
export function isTokenExpiringSoon(jwtToken: string, bufferSeconds = 300): boolean {
  const exp = getTokenExpirationSec(jwtToken)
  if (!exp) return false
  const nowSec = Math.floor(Date.now() / 1000)
  return exp - nowSec <= bufferSeconds
}

// Single-flight para authRefresh concorrente
let refreshPromise: Promise<boolean> | null = null

export async function singleFlightAuthRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      if (!pb.authStore.token) {
        return false
      }
      await pb.collection('users').authRefresh()
      return true
    } catch (err: any) {
      // Se for erro de rede ou aborto transitório, não limpa token
      const status = err?.status || err?.response?.status
      if (status === 401 || status === 400 || status === 403) {
        console.warn('[PB Client] authRefresh rejeitado pelo servidor com status:', status)
        return false
      }
      console.warn('[PB Client] Erro transitório durante authRefresh (mantendo sessão):', err)
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

// 1.a & 1.b) Wrapper customizado de send para PocketBase:
// - Verificação proativa de token antes de requisições autenticadas (refresh se a < 5min de expirar)
// - Interceptor de 401 com retry único via authRefresh
const originalSend = pb.send.bind(pb)

pb.send = async function (path: string, options: any = {}) {
  // Ignora se for a própria rota de auth-refresh ou authWithPassword para evitar recursão
  const isAuthRoute =
    path.includes('/auth-refresh') ||
    path.includes('/auth-with-password') ||
    path.includes('/auth-with-oauth2')

  // 1.a) Refresh Proativo de Token antes de requisições autenticadas
  if (!isAuthRoute && pb.authStore.token) {
    if (isTokenExpiringSoon(pb.authStore.token, 300)) {
      try {
        await singleFlightAuthRefresh()
      } catch (e) {
        console.warn('[PB Client] Falha silenciosa no refresh proativo:', e)
      }
    }
  }

  // Preservar estado do authStore em caso de 401 para permitir retry antes de deslogar
  const tokenAntes = pb.authStore.token
  const recordAntes = pb.authStore.record

  try {
    return await originalSend(path, options)
  } catch (err: any) {
    const status = err?.status || err?.response?.status

    // 1.b) Interceptor de 401 com retry único
    if (status === 401 && !options?._isRetry && !isAuthRoute && tokenAntes) {
      console.warn(
        `[PB Client] Interceptado HTTP 401 em ${path}. Tentando refresh único de sessão...`,
      )

      // Se o SDK ou chamada limpou o authStore, restaura temporariamente para o refresh
      if (!pb.authStore.token && tokenAntes) {
        pb.authStore.save(tokenAntes, recordAntes)
      }

      const refreshSucesso = await singleFlightAuthRefresh()

      if (refreshSucesso && pb.authStore.token) {
        console.info(`[PB Client] authRefresh com sucesso. Repetindo requisição ${path}...`)
        const retryOptions = {
          ...options,
          _isRetry: true,
          headers: {
            ...options.headers,
            Authorization: pb.authStore.token,
          },
        }
        return await originalSend(path, retryOptions)
      } else {
        console.warn(`[PB Client] authRefresh falhou após 401 para ${path}.`)
      }
    }

    throw err
  }
}

// 1.c) Timer de refresh em background a cada 15 min enquanto aba estiver ativa / em foco
if (typeof window !== 'undefined') {
  const FIFTEEN_MINUTES_MS = 15 * 60 * 1000

  const intervalId = window.setInterval(async () => {
    // Só refresca se documento estiver visível e usuário estiver logado
    if (document.visibilityState === 'visible' && pb.authStore.token) {
      try {
        await singleFlightAuthRefresh()
      } catch (err) {
        console.warn('[PB Client] Falha no refresh de background de 15min:', err)
      }
    }
  }, FIFTEEN_MINUTES_MS)

  // Quando o usuário volta à aba após inatividade prolongada
  window.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible' && pb.authStore.token) {
      if (isTokenExpiringSoon(pb.authStore.token, 600)) {
        try {
          await singleFlightAuthRefresh()
        } catch (err) {
          console.warn('[PB Client] Falha no refresh ao retornar para aba visível:', err)
        }
      }
    }
  })

  // Limpeza em caso de HMR em desenvolvimento
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      window.clearInterval(intervalId)
    })
  }
}

export default pb
