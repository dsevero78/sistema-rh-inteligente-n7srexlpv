import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

let refreshPromise: Promise<boolean> | null = null

/**
 * Executa authRefresh com single-flight (apenas uma requisição em voo por vez).
 * Retorna true se a sessão foi renovada com sucesso no backend.
 */
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
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export { pb }
export default pb
