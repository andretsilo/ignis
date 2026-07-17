import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { ErrorMessage } from '../components/ui'

type Mode = 'login' | 'register'

export function AuthPage() {
  const { login } = useAuth()
  const navigate   = useNavigate()

  const [mode, setMode]         = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setPassword('')
    setConfirm('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === 'register' && password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const { access_token } = mode === 'login'
        ? await api.login(username, password)
        : await api.register(username, password)
      login(access_token)
      navigate('/jobs', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-4xl">🔥</span>
          <h1 className="text-2xl font-bold text-zinc-100 mt-2">ignis</h1>
          <p className="text-sm text-zinc-500 mt-1">Self-hosted GPU training platform</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">

          {/* Tab switcher */}
          <div className="flex rounded-lg bg-zinc-800 p-1 mb-6">
            {(['login', 'register'] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-all capitalize ${
                  mode === m
                    ? 'bg-zinc-700 text-zinc-100 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {m === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                required
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="your_username"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-zinc-500 uppercase tracking-wide">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                placeholder="••••••••"
              />
            </div>

            {mode === 'register' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-zinc-500 uppercase tracking-wide">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && <ErrorMessage message={error} />}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Loading…</>
                : mode === 'login' ? 'Sign in' : 'Create account'
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
