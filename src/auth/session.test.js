import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignUp = vi.fn()
const mockSignInWithOAuth = vi.fn()
const mockSignOut = vi.fn()

vi.mock('../supabase.js', () => ({
  supabaseClient: {
    auth: {
      getSession: (...args) => mockGetSession(...args),
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
      signInWithPassword: (...args) => mockSignInWithPassword(...args),
      signUp: (...args) => mockSignUp(...args),
      signInWithOAuth: (...args) => mockSignInWithOAuth(...args),
      signOut: (...args) => mockSignOut(...args),
    },
  },
}))

beforeEach(() => {
  mockGetSession.mockReset()
  mockOnAuthStateChange.mockReset()
  mockSignInWithPassword.mockReset()
  mockSignUp.mockReset()
  mockSignInWithOAuth.mockReset()
  mockSignOut.mockReset()
})

describe('getSession', () => {
  it('retorna a sessão quando há usuário logado', async () => {
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } })
    const { getSession } = await import('./session.js')
    expect(await getSession()).toEqual({ user: { id: 'u1' } })
  })

  it('retorna null quando não há sessão', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })
    const { getSession } = await import('./session.js')
    expect(await getSession()).toBeNull()
  })
})

describe('onAuthStateChange', () => {
  it('chama o callback com a sessão recebida e retorna unsubscribe', async () => {
    const unsubscribe = vi.fn()
    let registeredCallback
    mockOnAuthStateChange.mockImplementation((cb) => {
      registeredCallback = cb
      return { data: { subscription: { unsubscribe } } }
    })

    const { onAuthStateChange } = await import('./session.js')
    const callback = vi.fn()
    const unsub = onAuthStateChange(callback)

    registeredCallback('SIGNED_IN', { user: { id: 'u2' } })
    expect(callback).toHaveBeenCalledWith({ user: { id: 'u2' } })

    unsub()
    expect(unsubscribe).toHaveBeenCalled()
  })
})

describe('signInWithPassword', () => {
  it('delega chamada ao supabaseClient.auth.signInWithPassword', async () => {
    mockSignInWithPassword.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const { signInWithPassword } = await import('./session.js')
    const res = await signInWithPassword({ email: 'test@example.com', password: '123' })
    expect(mockSignInWithPassword).toHaveBeenCalledWith({ email: 'test@example.com', password: '123' })
    expect(res).toEqual({ data: { user: { id: 'u1' } }, error: null })
  })
})

describe('signUpWithPassword', () => {
  it('delega chamada ao supabaseClient.auth.signUp', async () => {
    mockSignUp.mockResolvedValue({ data: { user: { id: 'u2' } }, error: null })
    const { signUpWithPassword } = await import('./session.js')
    const res = await signUpWithPassword({ email: 'test@example.com', password: '123' })
    expect(mockSignUp).toHaveBeenCalledWith({ email: 'test@example.com', password: '123' })
    expect(res).toEqual({ data: { user: { id: 'u2' } }, error: null })
  })
})

describe('signInWithOAuth', () => {
  it('delega chamada ao supabaseClient.auth.signInWithOAuth', async () => {
    mockSignInWithOAuth.mockResolvedValue({ data: { provider: 'google' }, error: null })
    const { signInWithOAuth } = await import('./session.js')
    const res = await signInWithOAuth({ provider: 'google' })
    expect(mockSignInWithOAuth).toHaveBeenCalledWith({ provider: 'google' })
    expect(res).toEqual({ data: { provider: 'google' }, error: null })
  })
})

describe('signOut', () => {
  it('delega chamada ao supabaseClient.auth.signOut', async () => {
    mockSignOut.mockResolvedValue({})
    const { signOut } = await import('./session.js')
    await signOut()
    expect(mockSignOut).toHaveBeenCalled()
  })
})

describe('getUserId', () => {
  it('extrai o id do usuário da sessão', async () => {
    const { getUserId } = await import('./session.js')
    expect(getUserId({ user: { id: 'u3' } })).toBe('u3')
  })

  it('retorna null quando a sessão é null', async () => {
    const { getUserId } = await import('./session.js')
    expect(getUserId(null)).toBeNull()
  })
})
