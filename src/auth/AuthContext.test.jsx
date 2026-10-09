import React from 'react'
import { render, screen, waitFor, act, renderHook } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import * as sessionModule from './session'

vi.mock('./session', () => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  signInWithPassword: vi.fn(),
  signUpWithPassword: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
  getUserId: vi.fn(),
}))

describe('AuthContext & useAuth', () => {
  let authCallback
  let mockUnsubscribe

  beforeEach(() => {
    vi.clearAllMocks()
    mockUnsubscribe = vi.fn()
    sessionModule.onAuthStateChange.mockImplementation((cb) => {
      authCallback = cb
      return mockUnsubscribe
    })
    sessionModule.getSession.mockResolvedValue(null)
  })

  it('throws an error if useAuth is used outside of AuthProvider', () => {
    // Suppress console.error for expected React boundary error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within an AuthProvider')
    spy.mockRestore()
  })

  it('initializes with loading true and resolves session/user', async () => {
    const mockUser = { id: 'u123', email: 'test@example.com' }
    const mockSession = { user: mockUser, access_token: 'token123' }
    sessionModule.getSession.mockResolvedValue(mockSession)

    const TestComponent = () => {
      const { user, session, isLoading } = useAuth()
      if (isLoading) return <div>Loading auth...</div>
      return (
        <div>
          <span data-testid="user-email">{user?.email}</span>
          <span data-testid="token">{session?.access_token}</span>
        </div>
      )
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByText('Loading auth...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.queryByText('Loading auth...')).not.toBeInTheDocument()
    })

    expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    expect(screen.getByTestId('token')).toHaveTextContent('token123')
  })

  it('updates state when onAuthStateChange fires', async () => {
    sessionModule.getSession.mockResolvedValue(null)

    const TestComponent = () => {
      const { user, isLoading } = useAuth()
      if (isLoading) return <div>Loading...</div>
      return <div data-testid="status">{user ? `Logged as ${user.email}` : 'Logged out'}</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('Logged out')
    })

    // Simulate login event from listener
    act(() => {
      authCallback({ user: { id: 'u456', email: 'newuser@example.com' } })
    })

    expect(screen.getByTestId('status')).toHaveTextContent('Logged as newuser@example.com')

    // Simulate logout event
    act(() => {
      authCallback(null)
    })

    expect(screen.getByTestId('status')).toHaveTextContent('Logged out')
  })

  it('calls signInWithPassword and returns result', async () => {
    const mockResult = { data: { user: { id: 'u1' } }, error: null }
    sessionModule.signInWithPassword.mockResolvedValue(mockResult)

    let authContextVal
    const TestComponent = () => {
      authContextVal = useAuth()
      return null
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    let res
    await act(async () => {
      res = await authContextVal.signInWithPassword({ email: 'a@b.com', password: 'secretpassword' })
    })

    expect(sessionModule.signInWithPassword).toHaveBeenCalledWith({ email: 'a@b.com', password: 'secretpassword' })
    expect(res).toEqual(mockResult)
  })

  it('calls signUpWithPassword and returns result', async () => {
    const mockResult = { data: { user: { id: 'u2' } }, error: null }
    sessionModule.signUpWithPassword.mockResolvedValue(mockResult)

    let authContextVal
    const TestComponent = () => {
      authContextVal = useAuth()
      return null
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    let res
    await act(async () => {
      res = await authContextVal.signUpWithPassword({ email: 'new@b.com', password: 'newpassword' })
    })

    expect(sessionModule.signUpWithPassword).toHaveBeenCalledWith({ email: 'new@b.com', password: 'newpassword' })
    expect(res).toEqual(mockResult)
  })

  it('calls signInWithOAuth and returns result', async () => {
    const mockResult = { data: { provider: 'google', url: 'http://auth.url' }, error: null }
    sessionModule.signInWithOAuth.mockResolvedValue(mockResult)

    let authContextVal
    const TestComponent = () => {
      authContextVal = useAuth()
      return null
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    let res
    await act(async () => {
      res = await authContextVal.signInWithOAuth({ provider: 'google' })
    })

    expect(sessionModule.signInWithOAuth).toHaveBeenCalledWith({ provider: 'google' })
    expect(res).toEqual(mockResult)
  })

  it('calls signOut and resets user/session', async () => {
    const mockUser = { id: 'u1', email: 'logout@test.com' }
    sessionModule.getSession.mockResolvedValue({ user: mockUser })
    sessionModule.signOut.mockResolvedValue(undefined)

    let authContextVal
    const TestComponent = () => {
      authContextVal = useAuth()
      return <div data-testid="user-state">{authContextVal.user ? authContextVal.user.email : 'none'}</div>
    }

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    await waitFor(() => {
      expect(screen.getByTestId('user-state')).toHaveTextContent('logout@test.com')
    })

    await act(async () => {
      await authContextVal.signOut()
    })

    expect(sessionModule.signOut).toHaveBeenCalled()
    expect(screen.getByTestId('user-state')).toHaveTextContent('none')
  })

  it('unsubscribes from onAuthStateChange on unmount', () => {
    const { unmount } = render(
      <AuthProvider>
        <div>Child</div>
      </AuthProvider>
    )

    expect(mockUnsubscribe).not.toHaveBeenCalled()
    unmount()
    expect(mockUnsubscribe).toHaveBeenCalled()
  })
})
