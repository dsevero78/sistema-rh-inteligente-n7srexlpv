import PocketBase from 'pocketbase'

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

/**
 * Single-flight auth refresh: evita requisições concorrentes de renovação de token.
 * Retorna true se a renovação foi bem-sucedida ou se já havia token válido.
 */
let refreshPromise: Promise<boolean> | null = null

export async function singleFlightAuthRefresh(): Promise<boolean> {
  if (!pb.authStore.isValid || !pb.authStore.token) {
    return false
  }

  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      await pb.collection('users').authRefresh()
      return true
    } catch (err: any) {
      const status = err?.status || err?.response?.status
      if (status === 401 || status === 403) {
        // Token definitivamente expirado/inválido
        return false
      }
      // Outro erro de rede temporário: mantém o token local
      return pb.authStore.isValid
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export default pb
