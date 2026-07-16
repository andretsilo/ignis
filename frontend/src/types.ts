export type JobStatus =
  | 'queued'
  | 'building'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled'

export type SourceType = 'zip' | 'git'

export interface Job {
  id: string
  status: JobStatus
  source_type: SourceType
  image: string
  entrypoint: string
  exit_code: number | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface SubmitJobResponse {
  job_id: string
}
