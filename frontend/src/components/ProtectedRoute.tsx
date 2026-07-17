import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import type { ReactNode } from 'react'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  if (!token) return <Navigate to="/auth" replace />
  return <>{children}</>
}
