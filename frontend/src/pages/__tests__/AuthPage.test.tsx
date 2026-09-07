import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthPage } from '../AuthPage'
import { AuthProvider } from '../../context/AuthContext'
import { describe, it, expect, vi } from 'vitest'

// Prevent actual fetch calls
vi.mock('../../api', () => ({
  api: {
    login: vi.fn(),
    register: vi.fn(),
  },
}))

function renderAuthPage() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <AuthPage />
      </AuthProvider>
    </MemoryRouter>
  )
}

describe('AuthPage', () => {
  it('renders username input by default', () => {
    renderAuthPage()
    expect(screen.getByPlaceholderText('your_username')).toBeInTheDocument()
  })

  it('renders sign in submit button by default', () => {
    renderAuthPage()
    // There are two "Sign in" buttons (tab + submit); the submit button has type="submit"
    const submitBtn = screen.getAllByRole('button', { name: /sign in/i })
      .find(b => b.getAttribute('type') === 'submit')
    expect(submitBtn).toBeDefined()
  })

  it('switches to register mode and shows confirm field', async () => {
    renderAuthPage()
    // Click the tab button (not the submit button)
    const tabButtons = screen.getAllByRole('button', { name: /create account/i })
    // Tab button has no type="submit"
    const tabBtn = tabButtons.find(b => b.getAttribute('type') !== 'submit')!
    await userEvent.click(tabBtn)
    // After switching, there should be two password inputs (password + confirm)
    const passwordInputs = screen.getAllByPlaceholderText('••••••••')
    expect(passwordInputs.length).toBe(2)
  })

  it('shows passwords do not match error in register mode', async () => {
    renderAuthPage()
    // Switch to register tab
    const tabButtons = screen.getAllByRole('button', { name: /create account/i })
    const tabBtn = tabButtons.find(b => b.getAttribute('type') !== 'submit')!
    await userEvent.click(tabBtn)

    await userEvent.type(screen.getByPlaceholderText('your_username'), 'alice')
    const passwordInputs = screen.getAllByPlaceholderText('••••••••')
    await userEvent.type(passwordInputs[0], 'password123')
    await userEvent.type(passwordInputs[1], 'different456')

    // Click the submit button
    const submitBtn = screen.getAllByRole('button', { name: /create account/i })
      .find(b => b.getAttribute('type') === 'submit')!
    await userEvent.click(submitBtn)

    expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
  })
})
