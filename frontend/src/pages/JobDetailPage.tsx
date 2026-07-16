import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useInterval } from '../hooks/useInterval'
import { StatusBadge } from '../components/StatusBadge'
import { RelativeTime } from '../components/RelativeTime'
import { Spinner, ErrorMessage, Field } from '../components/ui'
import type { Job } from '../types'

const POLL_MS = 2000
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled'])

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [job, setJob]     = useState<Job | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchJob = useCallback(async () => {
    if (!id) return
    try {
      const data = await api.getJob(id)
      setJob(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job.')
    }
  }, [id])

  // Stop polling once job reaches a terminal status
  const isTerminal = job ? TERMINAL_STATUSES.has(job.status) : false
  useInterval(fetchJob, isTerminal ? null : POLL_MS)

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="mb-6">
        <Link to="/jobs" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          ← Jobs
        </Link>
      </div>

      {error && <ErrorMessage message={error} />}
      {job === null && !error && <Spinner />}

      {job && (
        <div className="flex flex-col gap-6">
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-mono text-zinc-200 text-sm break-all">{job.id}</h1>
              <p className="text-xs text-zinc-500 mt-1">
                Created <RelativeTime isoString={job.created_at} />
                {' · '}
                Updated <RelativeTime isoString={job.updated_at} />
              </p>
            </div>
            <StatusBadge status={job.status} />
          </div>

          {/* Details card */}
          <div className="rounded border border-zinc-800 bg-zinc-900 divide-y divide-zinc-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
              <Field label="Source type" value={job.source_type} />
              <Field label="Exit code"   value={job.exit_code} />
            </div>
            <div className="p-4">
              <Field label="Image" value={job.image} mono />
            </div>
            <div className="p-4">
              <Field label="Entrypoint" value={job.entrypoint} mono />
            </div>
            {job.error_message && (
              <div className="p-4">
                <span className="text-xs uppercase tracking-wide text-zinc-500 mb-1.5 block">
                  Error message
                </span>
                <pre className="text-sm text-red-300 font-mono whitespace-pre-wrap break-all">
                  {job.error_message}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
