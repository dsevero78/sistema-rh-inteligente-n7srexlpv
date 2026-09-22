import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Deduplicação de chamadas concorrentes ao authRefresh via single-flight
let refreshPromise: Promise<boolean> | null = null

export async function singleFlightAuthRefresh(): Promise<boolean> {
  if (!pb.authStore.isValid && !pb.authStore.token) {
    return false
  }

  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      await pb.collection('users').authRefresh()
      return true
    } catch (err: unknown) {
      console.warn('[PocketBase] Falha ao executar authRefresh:', err)
      throw err
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export { pb }
export default pb
