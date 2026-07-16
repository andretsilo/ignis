import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useInterval } from '../hooks/useInterval'
import { StatusBadge } from '../components/StatusBadge'
import { RelativeTime } from '../components/RelativeTime'
import { Spinner, ErrorMessage } from '../components/ui'
import type { Job } from '../types'

const POLL_MS = 2000

export function JobListPage() {
  const [jobs, setJobs]   = useState<Job[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchJobs = useCallback(async () => {
    try {
      const data = await api.listJobs()
      setJobs(data.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs.')
    }
  }, [])

  useInterval(fetchJobs, POLL_MS)

  const running = jobs?.filter(j => j.status === 'running' || j.status === 'building').length ?? 0

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-zinc-100">Jobs</h1>
          {jobs !== null && (
            <p className="text-sm text-zinc-500 mt-0.5">
              {jobs.length} total
              {running > 0 && (
                <span className="ml-2 inline-flex items-center gap-1 text-blue-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  {running} active
                </span>
              )}
            </p>
          )}
        </div>
        <Link
          to="/submit"
          className="rounded-lg bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-sm font-semibold text-white transition-colors flex items-center gap-1.5"
        >
          <span>+</span> New job
        </Link>
      </div>

      {error && <ErrorMessage message={error} />}
      {jobs === null && !error && <Spinner />}

      {jobs !== null && jobs.length === 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 py-16 flex flex-col items-center gap-3 text-center">
          <span className="text-4xl">🔥</span>
          <p className="text-zinc-400 font-medium">No jobs yet</p>
          <p className="text-sm text-zinc-600">Submit a training script to get started.</p>
          <Link to="/submit" className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors">
            Submit your first job →
          </Link>
        </div>
      )}

      {jobs !== null && jobs.length > 0 && (
        <div className="rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-900 border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3 font-medium">Job ID</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Image</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Entrypoint</th>
                <th className="px-4 py-3 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {jobs.map(job => (
                <tr
                  key={job.id}
                  className="bg-zinc-950 hover:bg-zinc-900/80 transition-colors"
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="font-mono text-blue-400 hover:text-blue-300 text-xs hover:underline"
                    >
                      {job.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="font-mono text-zinc-500 text-xs truncate max-w-[200px] block" title={job.image}>
                      {job.image.split(':')[0]}
                    </span>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell font-mono text-zinc-500 text-xs">
                    {job.entrypoint.length > 40 ? job.entrypoint.slice(0, 40) + '…' : job.entrypoint}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    <RelativeTime isoString={job.created_at} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
