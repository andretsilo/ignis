import { useState, useEffect } from 'react'

function formatRelative(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 5)  return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`

  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`

  const diffDay = Math.floor(diffHr / 24)
  return `${diffDay}d ago`
}

interface Props {
  isoString: string
  /** Update interval in ms. Defaults to 30 000 (30 s). */
  interval?: number
}

export function RelativeTime({ isoString, interval = 30_000 }: Props) {
  const [label, setLabel] = useState(() => formatRelative(isoString))

  useEffect(() => {
    setLabel(formatRelative(isoString))
    const id = setInterval(() => setLabel(formatRelative(isoString)), interval)
    return () => clearInterval(id)
  }, [isoString, interval])

  return (
    <time
      dateTime={isoString}
      title={new Date(isoString).toLocaleString()}
      className="text-zinc-400"
    >
      {label}
    </time>
  )
}
