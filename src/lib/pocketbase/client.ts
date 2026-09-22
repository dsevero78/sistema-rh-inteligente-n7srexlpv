import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)
pb.autoCancellation(false)

let inFlightAuthRefresh: Promise<boolean> | null = null

/**
 * Garante que apenas uma requisição de authRefresh ocorra ao mesmo tempo (single-flight),
 * evitando corrida entre múltiplas abas, listeners ou inicialização.
 */
export async function singleFlightAuthRefresh(): Promise<boolean> {
  if (inFlightAuthRefresh) {
    return inFlightAuthRefresh
  }

  inFlightAuthRefresh = (async () => {
    try {
      if (!pb.authStore.token) {
        return false
      }
      await pb.collection('users').authRefresh()
      return true
    } catch (err: unknown) {
      const status =
        (err as { status?: number; response?: { status?: number } })?.status ||
        (err as { response?: { status?: number } })?.response?.status
      // Se rejeitado explicitamente como 401 ou 403 (token revogado/inválido), relança para o chamador decidir
      if (status === 401 || status === 403) {
        throw err
      }
      // Outros erros (rede, offline, latência, timeout) são transitórios
      console.warn('[singleFlightAuthRefresh] Falha transitória ao renovar auth:', err)
      return false
    } finally {
      inFlightAuthRefresh = null
    }
  })()

  return inFlightAuthRefresh
}

export { pb }
export default pb
