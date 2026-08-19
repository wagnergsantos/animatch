import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockSignOut = vi.fn()

vi.mock('../supabase.js', () => ({
  supabaseClient: {
    auth: {
      getSession: (...args) => mockGetSession(...args),
      onAuthStateChange: (...args) => mockOnAuthStateChange(...args),
      signOut: (...args) => mockSignOut(...args),
    },
  },
}))

beforeEach(() => {
  mockGetSession.mockReset()
  mockOnAuthStateChange.mockReset()
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
