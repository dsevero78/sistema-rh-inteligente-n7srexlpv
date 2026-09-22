import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

let refreshPromise: Promise<boolean> | null = null

/**
 * Executa authRefresh de maneira coalescida (single flight),
 * evitando múltiplos refreshes simultâneos que invalidem o token.
 */
export async function singleFlightAuthRefresh(): Promise<boolean> {
  if (!pb.authStore.isValid) return false
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    try {
      await pb.collection('users').authRefresh()
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export { pb }
export default pb
