import type { JobStatus } from '../types'

const BADGE_CLASSES: Record<JobStatus, string> = {
  queued:    'bg-zinc-700 text-zinc-300',
  building:  'bg-yellow-900 text-yellow-300',
  running:   'bg-blue-900 text-blue-300',
  completed: 'bg-green-900 text-green-300',
  failed:    'bg-red-900 text-red-300',
  cancelled: 'bg-orange-900 text-orange-300',
}

interface Props {
  status: JobStatus
}

export function StatusBadge({ status }: Props) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium uppercase tracking-wide ${BADGE_CLASSES[status]}`}
    >
      {status}
    </span>
  )
}
