import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ErrorMessage } from '../components/ui'

const IMAGES = [
  {
    label: 'ROCm 7.2.1 · PyTorch 2.9.1 · Python 3.12',
    value: 'rocm/pytorch:rocm7.2.1_ubuntu24.04_py3.12_pytorch_release_2.9.1',
  },
  {
    label: 'Custom image…',
    value: '__custom__',
  },
]

const DEFAULT_ENTRYPOINT = 'pip install -r requirements.txt && python train.py'

export function JobSubmitPage() {
  const navigate = useNavigate()

  const [imageSelection, setImageSelection] = useState(IMAGES[0].value)
  const [customImage, setCustomImage]       = useState('')
  const [entrypoint, setEntrypoint]         = useState(DEFAULT_ENTRYPOINT)
  const [file, setFile]                     = useState<File | null>(null)
  const [dragging, setDragging]             = useState(false)
  const [submitting, setSubmitting]         = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const fileRef                             = useRef<HTMLInputElement>(null)

  const image = imageSelection === '__custom__' ? customImage : imageSelection

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped?.name.endsWith('.zip')) {
      setFile(dropped)
      setError(null)
    } else {
      setError('Only .zip files are supported.')
    }
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Select a ZIP file to submit.'); return }
    if (!image) { setError('Select or enter a Docker image.'); return }
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
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-100">Submit training job</h1>
        <p className="text-sm text-zinc-500 mt-1">Upload a ZIP containing your training script and dependencies.</p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* ZIP upload — drag and drop */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase tracking-wide text-zinc-500 font-medium">
            Training ZIP
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`
              flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed
              px-6 py-8 cursor-pointer transition-all
              ${dragging
                ? 'border-blue-500 bg-blue-950/30'
                : file
                  ? 'border-green-700 bg-green-950/20'
                  : 'border-zinc-700 bg-zinc-900 hover:border-zinc-500 hover:bg-zinc-800/50'
              }
            `}
          >
            {file ? (
              <>
                <span className="text-2xl">📦</span>
                <span className="text-sm text-zinc-200 font-medium">{file.name}</span>
                <span className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB · click to replace</span>
              </>
            ) : (
              <>
                <span className="text-2xl text-zinc-600">⬆</span>
                <span className="text-sm text-zinc-400">Drop a <span className="text-zinc-200">.zip</span> here or click to browse</span>
              </>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={e => { setFile(e.target.files?.[0] ?? null); setError(null) }}
          />
        </div>

        {/* Image selector */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="image-select" className="text-xs uppercase tracking-wide text-zinc-500 font-medium">
            Docker image
          </label>
          <select
            id="image-select"
            value={imageSelection}
            onChange={e => setImageSelection(e.target.value)}
            className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors appearance-none"
          >
            {IMAGES.map(img => (
              <option key={img.value} value={img.value}>{img.label}</option>
            ))}
          </select>
          {imageSelection === '__custom__' && (
            <input
              type="text"
              placeholder="e.g. nvidia/cuda:12.4.0-runtime-ubuntu22.04"
              value={customImage}
              onChange={e => setCustomImage(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 font-mono focus:outline-none focus:border-blue-500 transition-colors"
              required
            />
          )}
        </div>

        {/* Entrypoint */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="entrypoint" className="text-xs uppercase tracking-wide text-zinc-500 font-medium">
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
          <span className="text-xs text-zinc-600">Shell command run inside the container. Use <code className="text-zinc-400">&&</code> to chain steps.</span>
        </div>

        {error && <ErrorMessage message={error} />}

        <button
          type="submit"
          disabled={submitting || !file}
          className="rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
        >
          {submitting
            ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting…</>
            : '🚀 Submit job'
          }
        </button>
      </form>
    </div>
  )
}
