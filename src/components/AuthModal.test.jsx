import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import AuthModal from './AuthModal.jsx'
import * as AuthContextModule from '../auth/AuthContext.jsx'

vi.mock('../auth/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}))

describe('AuthModal', () => {
  let mockSignInWithPassword
  let mockSignUpWithPassword
  let mockSignInWithOAuth
  let mockSignOut

  beforeEach(() => {
    vi.clearAllMocks()
    mockSignInWithPassword = vi.fn()
    mockSignUpWithPassword = vi.fn()
    mockSignInWithOAuth = vi.fn()
    mockSignOut = vi.fn()

    AuthContextModule.useAuth.mockReturnValue({
      user: null,
      session: null,
      isLoading: false,
      signInWithPassword: mockSignInWithPassword,
      signUpWithPassword: mockSignUpWithPassword,
      signInWithOAuth: mockSignInWithOAuth,
      signOut: mockSignOut,
    })
  })

  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <AuthModal isOpen={false} onClose={vi.fn()} />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders dialog when isOpen is true with title and tabs', () => {
    render(<AuthModal isOpen={true} onClose={vi.fn()} />)

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(dialog).toHaveAttribute('aria-modal', 'true')

    expect(screen.getByRole('tab', { name: /Entrar|Login/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Criar Conta|Sign Up/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Senha|Password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Continuar com Google|Google/i })).toBeInTheDocument()
  })

  it('handles tab switching between login and signup', () => {
    render(<AuthModal isOpen={true} onClose={vi.fn()} />)

    const loginTab = screen.getByRole('tab', { name: /Entrar|Login/i })
    const signupTab = screen.getByRole('tab', { name: /Criar Conta|Sign Up/i })

    expect(loginTab).toHaveAttribute('aria-selected', 'true')
    expect(signupTab).toHaveAttribute('aria-selected', 'false')

    fireEvent.click(signupTab)

    expect(loginTab).toHaveAttribute('aria-selected', 'false')
    expect(signupTab).toHaveAttribute('aria-selected', 'true')
  })

  it('respects initialTab prop', () => {
    render(<AuthModal isOpen={true} initialTab="signup" onClose={vi.fn()} />)

    const signupTab = screen.getByRole('tab', { name: /Criar Conta|Sign Up/i })
    expect(signupTab).toHaveAttribute('aria-selected', 'true')
  })

  it('submits email and password for login and calls onClose on success', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: '123' } }, error: null })
    const handleClose = vi.fn()

    render(<AuthModal isOpen={true} onClose={handleClose} />)

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText(/Senha|Password/i), { target: { value: 'password123' } })

    const submitBtn = screen.getByRole('button', { name: /^Entrar$|^Login$/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'user@example.com',
        password: 'password123',
      })
    })

    await waitFor(() => {
      expect(handleClose).toHaveBeenCalled()
    })
  })

  it('displays error message when login fails', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid login credentials' },
    })

    render(<AuthModal isOpen={true} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText(/Senha|Password/i), { target: { value: 'wrongpassword' } })

    const submitBtn = screen.getByRole('button', { name: /^Entrar$|^Login$/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Invalid login credentials/i)
    })
  })

  it('submits email and password for signup and shows confirmation message', async () => {
    mockSignUpWithPassword.mockResolvedValue({
      data: { user: { id: '456' } },
      error: null,
    })

    render(<AuthModal isOpen={true} initialTab="signup" onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'newuser@example.com' } })
    fireEvent.change(screen.getByLabelText(/Senha|Password/i), { target: { value: 'securepassword' } })

    const submitBtn = screen.getByRole('button', { name: /^Criar Conta$|^Sign Up$/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(mockSignUpWithPassword).toHaveBeenCalledWith({
        email: 'newuser@example.com',
        password: 'securepassword',
      })
    })

    await waitFor(() => {
      expect(screen.getByText(/Verifique seu email|confirm/i)).toBeInTheDocument()
    })
  })

  it('displays error message when signup fails', async () => {
    mockSignUpWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' },
    })

    render(<AuthModal isOpen={true} initialTab="signup" onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'existing@example.com' } })
    fireEvent.change(screen.getByLabelText(/Senha|Password/i), { target: { value: 'securepassword' } })

    const submitBtn = screen.getByRole('button', { name: /^Criar Conta$|^Sign Up$/i })
    fireEvent.click(submitBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/User already registered/i)
    })
  })

  it('validates password length before submitting', async () => {
    render(<AuthModal isOpen={true} onClose={vi.fn()} />)

    fireEvent.change(screen.getByLabelText(/Email/i), { target: { value: 'user@example.com' } })
    fireEvent.change(screen.getByLabelText(/Senha|Password/i), { target: { value: '123' } })

    const submitBtn = screen.getByRole('button', { name: /^Entrar$|^Login$/i })
    fireEvent.click(submitBtn)

    expect(mockSignInWithPassword).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(/6 caracteres|6 characters/i)
  })

  it('triggers Google OAuth login when clicking Google button', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { provider: 'google' }, error: null })

    render(<AuthModal isOpen={true} onClose={vi.fn()} />)

    const googleBtn = screen.getByRole('button', { name: /Continuar com Google|Google/i })
    fireEvent.click(googleBtn)

    await waitFor(() => {
      expect(mockSignInWithOAuth).toHaveBeenCalledWith({ provider: 'google' })
    })
  })

  it('displays error message when Google OAuth fails', async () => {
    mockSignInWithOAuth.mockResolvedValue({
      data: null,
      error: { message: 'OAuth provider error' },
    })

    render(<AuthModal isOpen={true} onClose={vi.fn()} />)

    const googleBtn = screen.getByRole('button', { name: /Continuar com Google|Google/i })
    fireEvent.click(googleBtn)

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/OAuth provider error/i)
    })
  })

  it('closes on Escape key or close button or overlay click', () => {
    const handleClose = vi.fn()
    render(<AuthModal isOpen={true} onClose={handleClose} />)

    // Close button
    const closeBtn = screen.getByLabelText(/Fechar|Close/i)
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalledTimes(1)

    // Overlay click
    const overlay = screen.getByTestId('auth-modal-overlay')
    fireEvent.click(overlay)
    expect(handleClose).toHaveBeenCalledTimes(2)

    // Escape key
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(3)
  })
})
