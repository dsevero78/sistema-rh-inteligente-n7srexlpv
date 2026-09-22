import { useEffect, useRef } from 'react'
import type { RecordModel, RecordSubscription } from 'pocketbase'

import pb from '@/lib/pocketbase/client'
import { restorePbAuthStoreFromBackup } from '@/lib/pocketbase/sessionBackup'

/**
 * Hook resiliente para inscrições em tempo real do PocketBase.
 *
 * Princípios de Resiliência:
 * 1. NUNCA derruba ou afeta a sessão do usuário se a conexão falhar ou cair.
 * 2. Reconecta silenciosamente com exponential backoff e jitter caso o SSE caia.
 * 3. Trata erros 400 "Invalid realtime client" e 404 "Missing or invalid client id" sem propagar exceções.
 * 4. Desinscreve de forma segura no unmount sem deixar conexões órfãs ou promessas pendentes.
 */
export function useRealtime<TRecord extends RecordModel = RecordModel>(
  collectionName: string,
  callback: (data: RecordSubscription<TRecord>) => void,
  enabled: boolean = true,
) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    let isMounted = true
    let unsubscribeFn: (() => Promise<void>) | undefined
    let reconnectTimeout: ReturnType<typeof setTimeout> | undefined
    let attemptCount = 0

    const connect = async () => {
      if (!isMounted) return

      try {
        // Assegura que o authStore esteja íntegro antes de estabelecer o canal
        restorePbAuthStoreFromBackup()

        const fn = await pb.collection<TRecord>(collectionName).subscribe('*', (e) => {
          if (isMounted) {
            try {
              callbackRef.current(e)
            } catch (cbErr) {
              console.warn(`[useRealtime] Erro no callback de ${collectionName}:`, cbErr)
            }
          }
        })

        if (!isMounted) {
          fn().catch(() => {})
          return
        }

        unsubscribeFn = fn
        attemptCount = 0 // Conexão bem-sucedida, reseta tentativas
      } catch (err: unknown) {
        if (!isMounted) return

        attemptCount++
        // Backoff exponencial com limite: 2s, 4s, 8s, até no máximo 30s
        const backoffMs = Math.min(1000 * Math.pow(2, attemptCount), 30000)
        // Adiciona jitter de até 1s
        const jitter = Math.floor(Math.random() * 1000)
        const delay = backoffMs + jitter

        // Não polui o console se for erro comum de SSE/reconnect
        const errStr = String(err)
        if (!errStr.includes('autocancelled') && !errStr.includes('abort')) {
          console.warn(
            `[useRealtime] Falha transitória na conexão realtime para '${collectionName}'. Próxima tentativa em ${Math.round(
              delay / 1000,
            )}s...`,
          )
        }

        // Garante que o authStore não seja afetado pelo erro do realtime
        restorePbAuthStoreFromBackup()

        // Agenda reconexão silenciosa com backoff
        reconnectTimeout = setTimeout(() => {
          if (isMounted) {
            connect()
          }
        }, delay)
      }
    }

    connect()

    return () => {
      isMounted = false
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (unsubscribeFn) {
        unsubscribeFn().catch(() => {})
      }
    }
  }, [collectionName, enabled])
}

export default useRealtime
