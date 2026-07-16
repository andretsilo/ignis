import { NavLink, Outlet } from 'react-router-dom'

function Nav() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `text-sm transition-colors ${isActive ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'}`

  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="max-w-4xl mx-auto px-4 h-12 flex items-center gap-6">
        <NavLink to="/jobs" className="font-semibold text-zinc-100 text-sm tracking-tight">
          ignis
        </NavLink>
        <nav className="flex items-center gap-4">
          <NavLink to="/jobs"   className={linkClass}>Jobs</NavLink>
          <NavLink to="/submit" className={linkClass}>Submit</NavLink>
        </nav>
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
    </div>
  )
}
