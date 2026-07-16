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
      // newest first
      setJobs(data.slice().sort((a, b) => b.created_at.localeCompare(a.created_at)))
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load jobs.')
    }
  }, [])

  useInterval(fetchJobs, POLL_MS)

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-semibold text-zinc-100">Jobs</h1>
        <Link
          to="/submit"
          className="rounded bg-blue-600 hover:bg-blue-500 px-3 py-1.5 text-sm font-medium text-white transition-colors"
        >
          + New job
        </Link>
      </div>

      {error && <ErrorMessage message={error} />}

      {jobs === null && !error && <Spinner />}

      {jobs !== null && jobs.length === 0 && (
        <p className="text-sm text-zinc-500">No jobs yet. Submit one to get started.</p>
      )}

      {jobs !== null && jobs.length > 0 && (
        <div className="rounded border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-xs uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-2.5 font-medium">ID</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="px-4 py-2.5 font-medium hidden md:table-cell">Image</th>
                <th className="px-4 py-2.5 font-medium hidden sm:table-cell">Entrypoint</th>
                <th className="px-4 py-2.5 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {jobs.map((job, i) => (
                <tr
                  key={job.id}
                  className={`border-b border-zinc-800 last:border-0 hover:bg-zinc-800/50 transition-colors ${
                    i % 2 === 0 ? 'bg-zinc-900' : 'bg-zinc-900/60'
                  }`}
                >
                  <td className="px-4 py-3">
                    <Link
                      to={`/jobs/${job.id}`}
                      className="font-mono text-blue-400 hover:text-blue-300 text-xs"
                    >
                      {job.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell font-mono text-zinc-400 text-xs max-w-xs truncate">
                    {job.image}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell font-mono text-zinc-400 text-xs">
                    {job.entrypoint}
                  </td>
                  <td className="px-4 py-3 text-xs">
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
