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
  user_id: string | null
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
  id: string  // JobOut returns 'id', not 'job_id'
}

export interface ArtifactFile {
  name: string
  size: number
}

export interface ArtifactsResponse {
  job_id: string
  files: ArtifactFile[]
}

export interface SystemStats {
  cpu_pct: number
  ram_pct: number
  ram_used_gb: number
  ram_total_gb: number
  gpu: {
    vendor: string
    util_pct: number | null
    mem_used_pct: number | null
  } | null
}
