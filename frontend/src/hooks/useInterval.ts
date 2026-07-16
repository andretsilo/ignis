import { useEffect, useRef } from 'react'

/**
 * Runs `callback` immediately and then every `delay` milliseconds.
 * Passing `null` as delay pauses the interval.
 */
export function useInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback)

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return
    // fire immediately on mount
    savedCallback.current()
    const id = setInterval(() => savedCallback.current(), delay)
    return () => clearInterval(id)
  }, [delay])
}
