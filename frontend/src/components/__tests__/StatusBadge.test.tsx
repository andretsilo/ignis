import { render, screen } from '@testing-library/react'
import { StatusBadge } from '../StatusBadge'
import { describe, it, expect } from 'vitest'

describe('StatusBadge', () => {
  it('renders queued status', () => {
    render(<StatusBadge status="queued" />)
    expect(screen.getByText('queued')).toBeInTheDocument()
  })

  it('renders running status with animated dot', () => {
    const { container } = render(<StatusBadge status="running" />)
    expect(screen.getByText('running')).toBeInTheDocument()
    // running badge has an animated dot
    expect(container.querySelector('.animate-pulse')).not.toBeNull()
  })

  it('renders building status with animated dot', () => {
    const { container } = render(<StatusBadge status="building" />)
    expect(container.querySelector('.animate-pulse')).not.toBeNull()
  })

  it('renders all statuses without throwing', () => {
    const statuses = ['queued', 'building', 'running', 'completed', 'failed', 'cancelled'] as const
    statuses.forEach(status => {
      const { unmount } = render(<StatusBadge status={status} />)
      expect(screen.getByText(status)).toBeInTheDocument()
      unmount()
    })
  })

  it('completed has no animated dot', () => {
    const { container } = render(<StatusBadge status="completed" />)
    expect(container.querySelector('.animate-pulse')).toBeNull()
  })
})
