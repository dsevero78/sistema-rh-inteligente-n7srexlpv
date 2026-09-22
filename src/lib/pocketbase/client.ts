import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

// Controle de voo único (single-flight) para authRefresh evitar chamadas concorrentes
let refreshPromise: Promise<boolean> | null = null

export async function singleFlightAuthRefresh(): Promise<boolean> {
  if (refreshPromise) {
    return refreshPromise
  }

  refreshPromise = (async () => {
    try {
      if (!pb.authStore.isValid) {
        return false
      }
      await pb.collection('users').authRefresh()
      return true
    } catch (err: any) {
      console.warn('[pocketbase] authRefresh single-flight falhou:', err?.status || err?.message)
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

export default pb
