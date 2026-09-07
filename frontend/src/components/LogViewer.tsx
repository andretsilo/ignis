import { useEffect, useRef } from 'react'

interface Props {
  lines: string[]
  autoScroll?: boolean
  maxHeight?: string
}

// Strip ANSI escape codes for clean display
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '')
}

export function LogViewer({ lines, autoScroll = true, maxHeight = '400px' }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoScroll && bottomRef.current && typeof bottomRef.current.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [lines, autoScroll])

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900">
        <span className="text-xs text-zinc-500 uppercase tracking-wide font-medium">Live logs</span>
        <span className="text-xs text-zinc-600">{lines.length} lines</span>
      </div>
      <div
        className="overflow-y-auto font-mono text-xs leading-relaxed"
        style={{ maxHeight }}
      >
        {lines.length === 0 ? (
          <p className="text-zinc-600 px-4 py-8 text-center">Waiting for logs…</p>
        ) : (
          <div className="px-4 py-3">
            {lines.map((line, i) => (
              <div key={i} className="text-zinc-300 whitespace-pre-wrap break-all">
                {stripAnsi(line)}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  )
}
