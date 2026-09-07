import { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { ErrorMessage } from '../components/ui'
import type { SystemStats } from '../types'

interface ImageOption {
  label: string
  value: string
}

const CPU_IMAGES: ImageOption[] = [
  { label: 'Python 3.12 slim (CPU)', value: 'python:3.12-slim' },
  { label: 'Custom image…', value: '__custom__' },
]

const ROCM_IMAGES: ImageOption[] = [
  { label: 'ROCm 7.2.1 · PyTorch 2.9.1 · Python 3.12 (AMD GPU)', value: 'rocm/pytorch:rocm7.2.1_ubuntu24.04_py3.12_pytorch_release_2.9.1' },
  { label: 'Python 3.12 slim (CPU fallback)', value: 'python:3.12-slim' },
  { label: 'Custom image…', value: '__custom__' },
]

const CUDA_IMAGES: ImageOption[] = [
  { label: 'PyTorch 2.4 · CUDA 12.1 · Python 3.11', value: 'pytorch/pytorch:2.4.0-cuda12.1-cudnn9-runtime' },
  { label: 'Python 3.12 slim (CPU fallback)', value: 'python:3.12-slim' },
  { label: 'Custom image…', value: '__custom__' },
]

function getImages(stats: SystemStats | null): ImageOption[] {
  if (!stats?.gpu) return CPU_IMAGES
  if (stats.gpu.vendor === 'AMD') return ROCM_IMAGES
  if (stats.gpu.vendor === 'NVIDIA') return CUDA_IMAGES
  return CPU_IMAGES
}

const DEFAULT_ENTRYPOINT = 'pip install -r requirements.txt && python train.py'

function parseAuthError(raw: string): string {
  // raw is like "401 {"detail":"Incorrect username or password"}"
  try {
    const jsonStart = raw.indexOf('{')
    if (jsonStart !== -1) {
      const body = JSON.parse(raw.slice(jsonStart))
      if (body.detail) return body.detail
    }
  } catch { /* ignore */ }
  if (raw.startsWith('401')) return 'Incorrect username or password.'
  if (raw.startsWith('422')) return 'Invalid input. Check your fields.'
  if (raw.startsWith('409')) return 'That username is already taken.'
  if (raw.startsWith('5')) return 'Server error. Try again in a moment.'
  return 'Submission failed. Please try again.'
}

export function JobSubmitPage() {
  const navigate = useNavigate()

  const [stats, setStats] = useState<SystemStats | null>(null)
  const [imageSelection, setImageSelection] = useState<string>('')
  const [customImage, setCustomImage]       = useState('')
  const [entrypoint, setEntrypoint]         = useState(DEFAULT_ENTRYPOINT)
  const [file, setFile]                     = useState<File | null>(null)
  const [dragging, setDragging]             = useState(false)
  const [submitting, setSubmitting]         = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const fileRef                             = useRef<HTMLInputElement>(null)

  // Load system stats once to pick the right default image
  useEffect(() => {
    api.getSystemStats()
      .then(s => {
        setStats(s)
        const images = getImages(s)
        setImageSelection(images[0].value)
      })
      .catch(() => {
        setImageSelection(CPU_IMAGES[0].value)
      })
  }, [])

  const images = getImages(stats)
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
      const job = await api.submitJob(file, image, entrypoint)
      navigate(`/jobs/${job.id}`)
    } catch (err) {
      setError(parseAuthError(err instanceof Error ? err.message : 'Submission failed.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto py-10 px-4">
      <div className="mb-8">
        <h1 className="text-xl font-semibold text-zinc-100">Submit training job</h1>
        <p className="text-sm text-zinc-500 mt-1">Upload a ZIP containing your training script and dependencies.</p>
        {stats?.gpu && (
          <p className="text-xs text-zinc-600 mt-1.5 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            {stats.gpu.vendor} GPU detected — GPU images shown by default
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">

        {/* ZIP upload */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs uppercase tracking-wide text-zinc-500 font-medium">Training ZIP</label>
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
          {imageSelection === '' ? (
            <div className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-500 animate-pulse">
              Detecting GPU…
            </div>
          ) : (
            <select
              id="image-select"
              value={imageSelection}
              onChange={e => setImageSelection(e.target.value)}
              className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 focus:outline-none focus:border-blue-500 transition-colors appearance-none"
            >
              {images.map(img => (
                <option key={img.value} value={img.value}>{img.label}</option>
              ))}
            </select>
          )}
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
          <span className="text-xs text-zinc-600">
            Shell command run inside the container. Use <code className="text-zinc-400">&&</code> to chain steps.
          </span>
        </div>

        {error && <ErrorMessage message={error} />}

        <button
          type="submit"
          disabled={submitting || !file || imageSelection === ''}
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
