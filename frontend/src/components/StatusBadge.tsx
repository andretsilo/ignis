import type { JobStatus } from '../types'

const BADGE: Record<JobStatus, { bg: string; text: string; dot?: string }> = {
  queued:    { bg: 'bg-zinc-800',    text: 'text-zinc-400' },
  building:  { bg: 'bg-yellow-950', text: 'text-yellow-300', dot: 'bg-yellow-400' },
  running:   { bg: 'bg-blue-950',   text: 'text-blue-300',   dot: 'bg-blue-400' },
  completed: { bg: 'bg-green-950',  text: 'text-green-300' },
  failed:    { bg: 'bg-red-950',    text: 'text-red-300' },
  cancelled: { bg: 'bg-orange-950', text: 'text-orange-300' },
}

interface Props {
  status: JobStatus
}

export function StatusBadge({ status }: Props) {
  const { bg, text, dot } = BADGE[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wide ${bg} ${text}`}
    >
      {dot && (
        <span className={`w-1.5 h-1.5 rounded-full ${dot} animate-pulse`} />
      )}
      {status}
    </span>
  )
}
