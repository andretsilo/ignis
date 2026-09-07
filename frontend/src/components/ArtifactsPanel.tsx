import { useEffect, useState } from 'react'
import { api } from '../api'
import type { ArtifactFile } from '../types'

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  jobId: string
}

export function ArtifactsPanel({ jobId }: Props) {
  const [files, setFiles] = useState<ArtifactFile[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getArtifacts(jobId)
      .then(r => setFiles(r.files))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load artifacts'))
  }, [jobId])

  if (error) return (
    <div className="text-xs text-red-400 font-mono px-1">{error}</div>
  )

  if (files === null) return (
    <div className="text-xs text-zinc-600 px-1">Loading…</div>
  )

  if (files.length === 0) return (
    <div className="text-xs text-zinc-600 px-1">No artifacts found.</div>
  )

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/50 overflow-hidden">
      <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-900">
        <span className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
          Files ({files.length})
        </span>
      </div>
      <ul className="divide-y divide-zinc-800/60">
        {files.map(f => (
          <li key={f.name} className="flex items-center justify-between px-4 py-2.5 hover:bg-zinc-900/50">
            <span className="font-mono text-xs text-zinc-300 truncate max-w-[60%]" title={f.name}>
              {f.name}
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs text-zinc-600">{formatSize(f.size)}</span>
              <a
                href={api.getArtifactDownloadUrl(jobId, f.name)}
                download={f.name.split('/').pop()}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                ↓ Download
              </a>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
