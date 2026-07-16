import type { Job, SubmitJobResponse } from './types'

const BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init)
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`${res.status} ${text}`)
  }
  return res.json() as Promise<T>
}

export const api = {
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
}
