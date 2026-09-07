import { render, screen } from '@testing-library/react'
import { LogViewer } from '../LogViewer'
import { describe, it, expect } from 'vitest'

describe('LogViewer', () => {
  it('shows waiting message when no lines', () => {
    render(<LogViewer lines={[]} />)
    expect(screen.getByText(/waiting for logs/i)).toBeInTheDocument()
  })

  it('renders log lines', () => {
    render(<LogViewer lines={['line one', 'line two']} />)
    expect(screen.getByText('line one')).toBeInTheDocument()
    expect(screen.getByText('line two')).toBeInTheDocument()
  })

  it('shows line count', () => {
    render(<LogViewer lines={['a', 'b', 'c']} />)
    expect(screen.getByText('3 lines')).toBeInTheDocument()
  })

  it('strips ANSI escape codes', () => {
    render(<LogViewer lines={['\x1b[32mhello\x1b[0m world']} />)
    expect(screen.getByText('hello world')).toBeInTheDocument()
  })

  it('shows 0 lines when empty', () => {
    render(<LogViewer lines={[]} />)
    expect(screen.getByText('0 lines')).toBeInTheDocument()
  })
})
