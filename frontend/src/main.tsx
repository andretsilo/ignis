import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { App } from './App'
import { JobListPage }   from './pages/JobListPage'
import { JobDetailPage } from './pages/JobDetailPage'
import { JobSubmitPage } from './pages/JobSubmitPage'
import './index.css'

const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      { index: true,            element: <Navigate to="/jobs" replace /> },
      { path: 'jobs',           element: <JobListPage /> },
      { path: 'jobs/:id',       element: <JobDetailPage /> },
      { path: 'submit',         element: <JobSubmitPage /> },
    ],
  },
])

const root = document.getElementById('root')!
createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
