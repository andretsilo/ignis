import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import { SystemGauges } from './components/SystemGauges'

function Nav() {
  const { logout } = useAuth()
  const navigate   = useNavigate()

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${isActive ? 'text-zinc-100 font-medium' : 'text-zinc-500 hover:text-zinc-300'}`

  function handleLogout() {
    logout()
    navigate('/auth', { replace: true })
  }

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 h-12 flex items-center gap-6">
        <NavLink to="/jobs" className="flex items-center gap-2 group">
          <span className="text-orange-400 group-hover:text-orange-300 transition-colors text-base">🔥</span>
          <span className="font-bold text-zinc-100 text-sm tracking-tight">ignis</span>
        </NavLink>
        <div className="h-4 w-px bg-zinc-800" />
        <nav className="flex items-center gap-4 flex-1">
          <NavLink to="/jobs"   className={linkClass}>Jobs</NavLink>
          <NavLink to="/submit" className={linkClass}>Submit</NavLink>
          <NavLink to="/help"   className={linkClass}>Help</NavLink>
        </nav>
        <button
          onClick={handleLogout}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}

export function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <Nav />
      <main>
        <Outlet />
      </main>
      {/* System resource gauges — fixed bottom-right, out of the way */}
      <div className="fixed bottom-4 right-4 z-20">
        <SystemGauges />
      </div>
    </div>
  )
}
