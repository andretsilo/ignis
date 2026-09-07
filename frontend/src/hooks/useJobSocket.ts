import { useEffect, useRef, useState, useCallback } from 'react'
import { api } from '../api'

const MAX_LINES = 1000

/**
 * Opens a WebSocket connection to /ws/jobs/{jobId} when `active` is true.
 * Accumulates up to MAX_LINES log lines (ring buffer).
 * Automatically closes the connection when `active` becomes false or the component unmounts.
 */
export function useJobSocket(jobId: string | undefined, active: boolean) {
  const [lines, setLines] = useState<string[]>([])
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback(() => {
    if (!jobId || !active) return
    if (wsRef.current) return  // already connected

    const url = api.getWsUrl(jobId)
    const ws = new WebSocket(url)
    wsRef.current = ws

    ws.onmessage = (evt: MessageEvent<string>) => {
      setLines(prev => {
        const next = [...prev, evt.data]
        return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next
      })
    }

    ws.onerror = () => {
      // Silently ignore — WS might not be running or job might not be active
    }

    ws.onclose = () => {
      wsRef.current = null
    }
  }, [jobId, active])

  useEffect(() => {
    if (active) {
      connect()
    } else {
      wsRef.current?.close()
      wsRef.current = null
    }
    return () => {
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connect, active])

  return { lines }
}
