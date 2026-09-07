import type { Job, SubmitJobResponse, ArtifactsResponse, SystemStats } from './types'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'
const WS_BASE = (import.meta.env.VITE_WS_URL as string | undefined) ??
  BASE_URL.replace(/^http/, 'ws')
const TOKEN_KEY = 'ignis_token'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY)
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> ?? {}),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status} ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

interface TokenResponse {
  access_token: string
  token_type: string
}

export const api = {
  /** Log in — returns a JWT */
  async login(username: string, password: string): Promise<TokenResponse> {
    const form = new URLSearchParams()
    form.append('username', username)
    form.append('password', password)
    return request<TokenResponse>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    })
  },

  /** Register a new account — returns a JWT */
  register(username: string, password: string): Promise<TokenResponse> {
    return request<TokenResponse>('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  },

  /** Submit a new training job via ZIP upload */
  submitJob(zip: File, image: string, entrypoint: string): Promise<SubmitJobResponse> {
    const form = new FormData()
    form.append('zip', zip)
    form.append('image', image)
    form.append('entrypoint', entrypoint)
    return request<SubmitJobResponse>('/jobs', { method: 'POST', body: form })
  },

  /** List all jobs */
  listJobs(): Promise<Job[]> {
    return request<Job[]>('/jobs')
  },

  /** Get a single job by ID */
  getJob(id: string): Promise<Job> {
    return request<Job>(`/jobs/${id}`)
  },

  /** Cancel a running or queued job */
  cancelJob(id: string): Promise<void> {
    return request<void>(`/jobs/${id}/cancel`, { method: 'POST' })
  },

  /** List all files for a completed job */
  getArtifacts(id: string): Promise<ArtifactsResponse> {
    return request<ArtifactsResponse>(`/jobs/${id}/artifacts`)
  },

  /** Return a download URL for a job artifact (includes auth token) */
  getArtifactDownloadUrl(id: string, file: string): string {
    const token = localStorage.getItem(TOKEN_KEY)
    return `${BASE_URL}/jobs/${id}/artifacts/download?file=${encodeURIComponent(file)}&token=${token}`
  },

  /** Get system CPU / RAM / GPU stats */
  getSystemStats(): Promise<SystemStats> {
    return request<SystemStats>('/system/stats')
  },

  /** WebSocket URL for live job logs */
  getWsUrl(jobId: string): string {
    return `${WS_BASE}/ws/jobs/${jobId}`
  },
}
