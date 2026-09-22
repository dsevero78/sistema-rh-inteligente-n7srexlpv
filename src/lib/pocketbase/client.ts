import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

let refreshPromise: Promise<boolean> | null = null

/**
 * Executa authRefresh com single-flight (evita múltiplas chamadas simultâneas)
 */
export async function singleFlightAuthRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      if (!pb.authStore.isValid && !pb.authStore.token) {
        return false
      }
      await pb.collection('users').authRefresh()
      return true
    } catch (err) {
      console.warn('[singleFlightAuthRefresh] Falha ao renovar token:', err)
      throw err
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export { pb }
export default pb
