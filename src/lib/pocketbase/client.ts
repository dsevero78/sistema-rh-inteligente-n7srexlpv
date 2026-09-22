import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

let activeRefreshPromise: Promise<boolean> | null = null

/**
 * Garante que apenas UMA requisição de auth-refresh ocorra ao mesmo tempo (single-flight)
 * Evita concorrência e race condition que corrompem o authStore.
 */
export { pb }

export async function singleFlightAuthRefresh(): Promise<boolean> {
  if (activeRefreshPromise) {
    return activeRefreshPromise
  }

  activeRefreshPromise = (async () => {
    try {
      if (!pb.authStore.isValid && !pb.authStore.token) {
        return false
      }
      await pb.collection('users').authRefresh()
      return true
    } catch (err: unknown) {
      const status =
        (err as { status?: number; response?: { status?: number } })?.status ||
        (err as { response?: { status?: number } })?.response?.status
      if (status === 401 || status === 403) {
        throw err
      }
      // Erro de rede ou transitório não deve quebrar
      return false
    } finally {
      activeRefreshPromise = null
    }
  })()

  return activeRefreshPromise
}

export default pb
