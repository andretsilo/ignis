import { useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'
import { useInterval } from '../hooks/useInterval'
import { useJobSocket } from '../hooks/useJobSocket'
import { StatusBadge } from '../components/StatusBadge'
import { RelativeTime } from '../components/RelativeTime'
import { Spinner, ErrorMessage, Field } from '../components/ui'
import { LogViewer } from '../components/LogViewer'
import { ArtifactsPanel } from '../components/ArtifactsPanel'
import type { Job } from '../types'

const POLL_MS = 2000
const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled'])
const CANCELLABLE_STATUSES = new Set(['queued', 'building', 'running'])
// WebSocket is useful while the container is running or building
const ACTIVE_STATUSES = new Set(['building', 'running'])

export function JobDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [job, setJob]           = useState<Job | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)

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

  const isTerminal = job ? TERMINAL_STATUSES.has(job.status) : false
  const isActive   = job ? ACTIVE_STATUSES.has(job.status) : false

  // Poll job metadata — stop once terminal
  useInterval(fetchJob, isTerminal ? null : POLL_MS)

  // Live log stream via WebSocket — only when container is actively running
  const { lines: logLines } = useJobSocket(id, isActive)

  async function handleCancel() {
    if (!id || !job) return
    if (!confirm('Stop this training job?')) return
    setCancelling(true)
    try {
      await api.cancelJob(id)
      await fetchJob()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel job.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10 px-4">

      <div className="mb-6">
        <Link to="/jobs" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1">
          ← Back to jobs
        </Link>
      </div>

      {error && <ErrorMessage message={error} />}
      {job === null && !error && <Spinner />}

      {job && (
        <div className="flex flex-col gap-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-zinc-600 uppercase tracking-wide mb-1">Job</p>
              <h1 className="font-mono text-zinc-200 text-sm break-all">{job.id}</h1>
              <p className="text-xs text-zinc-600 mt-1.5 flex items-center gap-2">
                <span>Created <RelativeTime isoString={job.created_at} /></span>
                <span>·</span>
                <span>Updated <RelativeTime isoString={job.updated_at} /></span>
              </p>
            </div>
            <div className="shrink-0 flex items-center gap-2">
              <StatusBadge status={job.status} />
              {CANCELLABLE_STATUSES.has(job.status) && (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="rounded border border-red-800 bg-red-950/50 hover:bg-red-900/50 text-red-400 hover:text-red-300 px-2.5 py-0.5 text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {cancelling ? 'Stopping…' : '■ Stop'}
                </button>
              )}
            </div>
          </div>

          {/* Details card */}
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden divide-y divide-zinc-800">
            <div className="grid grid-cols-2 gap-4 px-4 py-4">
              <Field label="Source"    value={job.source_type} />
              <Field label="Exit code" value={job.exit_code !== null ? String(job.exit_code) : null} />
            </div>
            <div className="px-4 py-4">
              <Field label="Image" value={job.image} mono />
            </div>
            <div className="px-4 py-4">
              <Field label="Entrypoint" value={job.entrypoint} mono />
            </div>
          </div>

          {/* Live logs — shown when building/running, or when we have lines accumulated */}
          {(isActive || logLines.length > 0) && (
            <LogViewer lines={logLines} />
          )}

          {/* Error output */}
          {job.error_message && (
            <div className="rounded-lg border border-red-900 bg-red-950/30 overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-900/50 bg-red-950/50">
                <span className="text-xs text-red-400 uppercase tracking-wide font-medium">
                  {job.status === 'failed' ? '✗ Error output' : 'Output'}
                </span>
              </div>
              <pre className="px-4 py-4 text-xs text-red-300 font-mono whitespace-pre-wrap break-all leading-relaxed overflow-auto max-h-96">
                {job.error_message}
              </pre>
            </div>
          )}

          {/* Success message */}
          {job.status === 'completed' && (
            <div className="rounded-lg border border-green-900 bg-green-950/30 px-4 py-3 flex items-center gap-2">
              <span className="text-green-400">✓</span>
              <span className="text-sm text-green-300">Training completed successfully with exit code 0.</span>
            </div>
          )}

          {/* Artifacts — shown for completed/failed jobs */}
          {(job.status === 'completed' || job.status === 'failed') && (
            <div>
              <h2 className="text-sm font-medium text-zinc-400 mb-3">Output files</h2>
              <ArtifactsPanel jobId={job.id} />
            </div>
          )}

        </div>
      )}
    </div>
  )
}
