export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-zinc-600 border-t-blue-400 rounded-full animate-spin" />
    </div>
  )
}

interface ErrorMessageProps {
  message: string
}

export function ErrorMessage({ message }: ErrorMessageProps) {
  return (
    <div className="rounded border border-red-800 bg-red-950 text-red-300 px-4 py-3 text-sm font-mono">
      {message}
    </div>
  )
}

interface FieldProps {
  label: string
  value: string | number | null | undefined
  mono?: boolean
}

export function Field({ label, value, mono = false }: FieldProps) {
  const display = value === null || value === undefined ? '—' : String(value)
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wide text-zinc-500">{label}</span>
      <span className={`text-sm text-zinc-200 break-all ${mono ? 'font-mono' : ''}`}>
        {display}
      </span>
    </div>
  )
}
