import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ErrorMessage } from '../components/ui'

const DEFAULT_IMAGE = 'rocm/pytorch:rocm7.2.1_ubuntu24.04_py3.12_pytorch_release_2.9.1'
const DEFAULT_ENTRYPOINT = 'python train.py'

export function JobSubmitPage() {
  const navigate = useNavigate()

  const [image, setImage]           = useState(DEFAULT_IMAGE)
  const [entrypoint, setEntrypoint] = useState(DEFAULT_ENTRYPOINT)
  const [file, setFile]             = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const fileRef                     = useRef<HTMLInputElement>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Select a ZIP file to submit.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const { job_id } = await api.submitJob(file, image, entrypoint)
      navigate(`/jobs/${job_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <h1 className="text-lg font-semibold text-zinc-100 mb-6">Submit training job</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* ZIP upload */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="zip" className="text-xs uppercase tracking-wide text-zinc-500">
            Training ZIP
          </label>
          <div
            className="flex items-center gap-3 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 cursor-pointer hover:border-zinc-500 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <span className="text-sm text-zinc-400 flex-1 truncate">
              {file ? file.name : 'Click to select a .zip file…'}
            </span>
            <span className="text-xs text-zinc-500 shrink-0">Browse</span>
          </div>
          <input
            ref={fileRef}
            id="zip"
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
          />
          {file && (
            <span className="text-xs text-zinc-500">
              {(file.size / 1024).toFixed(1)} KB
            </span>
          )}
        </div>

        {/* Image */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="image" className="text-xs uppercase tracking-wide text-zinc-500">
            Docker image
          </label>
          <input
            id="image"
            type="text"
            value={image}
            onChange={e => setImage(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:border-blue-500 transition-colors"
            required
          />
        </div>

        {/* Entrypoint */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="entrypoint" className="text-xs uppercase tracking-wide text-zinc-500">
            Entrypoint
          </label>
          <input
            id="entrypoint"
            type="text"
            value={entrypoint}
            onChange={e => setEntrypoint(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:border-blue-500 transition-colors"
            required
          />
        </div>

        {error && <ErrorMessage message={error} />}

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 text-sm font-medium text-white transition-colors"
        >
          {submitting ? 'Submitting…' : 'Submit job'}
        </button>
      </form>
    </div>
  )
}
