import type { RecordModel } from 'pocketbase'
import pb from '@/lib/pocketbase/client'

export const APP_SESSION_BACKUP_KEY = 'souyess.session.backup'
export const PB_AUTH_STORAGE_KEY = 'pocketbase_auth'

export interface AppSessionBackup {
  token: string
  model: RecordModel | null
  savedAt: number
  /**
   * Indica se o token precisa de refresh em segundo plano (ex.: expirado ou próximo de expirar).
   * A presença do backup NUNCA é descartada localmente apenas por expiração de tempo.
   */
  needsRefresh?: boolean
}

/**
 * Checa expiração do JWT PocketBase com tolerância.
 * Retorna true se expirado de forma explícita.
 */
export function isJwtTokenExpired(token: string): boolean {
  if (!token || typeof token !== 'string') return true
  try {
    const parts = token.split('.')
    if (parts.length < 2) return false
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    // Tolerância com padding em base64
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=')
    const maybeBuffer = (globalThis as Record<string, any>).Buffer
    const decodedStr =
      typeof atob !== 'undefined'
        ? atob(padded)
        : maybeBuffer && typeof maybeBuffer.from === 'function'
          ? maybeBuffer.from(padded, 'base64').toString('binary')
          : ''
    if (!decodedStr) return false

    const jsonPayload = decodeURIComponent(
      decodedStr
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    )
    const payload = JSON.parse(jsonPayload)
    if (typeof payload.exp === 'number') {
      const now = Math.floor(Date.now() / 1000)
      // Se o token já passou da expiração real, considera expirado
      return payload.exp <= now
    }
  } catch {
    // Se não conseguiu decodificar, não assume expirado para tolerar tokens válidos
  }
  return false
}

/**
 * Salva atomicamente no backup controlado pelo app (`souyess.session.backup`)
 * e sincroniza também o pocketbase_auth padrão.
 */
export function saveSessionBackup(token: string, model: RecordModel | null): void {
  if (typeof window === 'undefined') return
  if (!token || token.length < 10) return

  const backup: AppSessionBackup = {
    token,
    model: model || null,
    savedAt: Date.now(),
  }

  try {
    localStorage.setItem(APP_SESSION_BACKUP_KEY, JSON.stringify(backup))
  } catch (err) {
    console.error('[SessionBackup] Erro ao gravar backup de sessão no localStorage:', err)
  }

  // Garante que o SDK também tenha uma cópia íntegra
  try {
    const standardPb = {
      token,
      record: model || null,
      model: model || null,
    }
    localStorage.setItem(PB_AUTH_STORAGE_KEY, JSON.stringify(standardPb))
  } catch {
    // no-op
  }
}

/**
 * Carrega a credencial do backup próprio do app (`souyess.session.backup`),
 * com fallback para `pocketbase_auth` legado se o backup próprio ainda não tiver sido gravado.
 */
export function loadSessionBackup(): AppSessionBackup | null {
  if (typeof window === 'undefined') return null

  // 1. Tenta carregar a chave proprietária do app
  try {
    const rawBackup = localStorage.getItem(APP_SESSION_BACKUP_KEY)
    if (rawBackup) {
      const parsed = JSON.parse(rawBackup) as Partial<AppSessionBackup>
      if (parsed && typeof parsed.token === 'string' && parsed.token.length > 10) {
        const expired = isJwtTokenExpired(parsed.token)
        return {
          token: parsed.token,
          model: (parsed.model || null) as RecordModel | null,
          savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : Date.now(),
          needsRefresh: expired,
        }
      }
    }
  } catch (err) {
    console.warn('[SessionBackup] Falha ao ler APP_SESSION_BACKUP_KEY:', err)
  }

  // 2. Fallback para a chave padrão do SDK (migração transparente)
  try {
    const rawLegacy = localStorage.getItem(PB_AUTH_STORAGE_KEY)
    if (rawLegacy) {
      const parsed = JSON.parse(rawLegacy)
      if (parsed && typeof parsed.token === 'string' && parsed.token.length > 10) {
        const expired = isJwtTokenExpired(parsed.token)
        const legacyBackup: AppSessionBackup = {
          token: parsed.token,
          model: (parsed.record || parsed.model || null) as RecordModel | null,
          savedAt: Date.now(),
          needsRefresh: expired,
        }
        // Migra atomicamente para a chave proprietária mantendo integridade
        saveSessionBackup(legacyBackup.token, legacyBackup.model)
        return legacyBackup
      }
    }
  } catch (err) {
    console.warn('[SessionBackup] Falha ao ler PB_AUTH_STORAGE_KEY legado:', err)
  }

  return null
}

/**
 * Remove em definitivo qualquer rastro de credencial de ambas as chaves.
 * DEVE ser acionado EXCLUSIVAMENTE pelo fluxo de logout explícito ou 401/403 confirmado do servidor.
 */
export function clearAllSessionBackups(): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(APP_SESSION_BACKUP_KEY)
    localStorage.removeItem(PB_AUTH_STORAGE_KEY)
  } catch (err) {
    console.error('[SessionBackup] Erro ao limpar chaves de sessão:', err)
  }
}

/**
 * Restaura o pb.authStore a partir do backup se o authStore estiver vazio.
 * Retorna o backup se restaurou ou já estava preenchido.
 */
export function restorePbAuthStoreFromBackup(): AppSessionBackup | null {
  const backup = loadSessionBackup()
  if (!backup) return null

  if (!pb.authStore.token || pb.authStore.token !== backup.token) {
    try {
      pb.authStore.save(backup.token, backup.model)
    } catch (e) {
      console.warn('[SessionBackup] Falha ao injetar credenciais no pb.authStore:', e)
    }
  }
  return backup
}

/**
 * Single-flight deduplicado para authRefresh com sincronização atômica do backup.
 */
let activeRefreshPromise: Promise<boolean> | null = null

export async function singleFlightSafeAuthRefresh(): Promise<boolean> {
  if (activeRefreshPromise) {
    return activeRefreshPromise
  }

  activeRefreshPromise = (async () => {
    // Garante que o authStore esteja abastecido com o melhor token disponível antes do refresh
    restorePbAuthStoreFromBackup()

    if (!pb.authStore.token) {
      return false
    }

    try {
      const authData = await pb.collection('users').authRefresh()
      if (authData?.token) {
        // Sincronização atômica garantida: grava no backup ANTES ou junto para nunca ficar sem token
        saveSessionBackup(authData.token, authData.record)
        pb.authStore.save(authData.token, authData.record)
        return true
      }
      return false
    } catch (err: unknown) {
      const status =
        (err as { status?: number; response?: { status?: number } })?.status ||
        (err as { response?: { status?: number } })?.response?.status

      // Regra inegociável: logout SOMENTE pelo clique explícito no botão "Sair".
      // Nenhum evento em background (refresh, timeout, oscilação de rede) pode limpar as credenciais
      // ou disparar ejeção da sessão do usuário.
      console.warn(
        '[SessionBackup] Falha ou rejeição no authRefresh em segundo plano (status:',
        status,
        '). Mantendo credencial salva intacta e restaurando pb.authStore.',
      )
      // Garante que o authStore continue com o token salvo do backup
      restorePbAuthStoreFromBackup()
      return false
    } finally {
      activeRefreshPromise = null
    }
  })()

  return activeRefreshPromise
}
