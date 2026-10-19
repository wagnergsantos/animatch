import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../supabase.js', () => ({
  supabaseClient: {
    auth: {
      getSession: vi.fn(),
    },
    from: vi.fn(),
  },
}))

import { supabaseClient } from '../supabase.js'
import {
  fetchCloudAnimeList,
  scheduleCloudAnimeListSync,
  getAuthenticatedUserId,
} from './cloudListSync.js'
import { DEFAULT_CACHE_TTL } from './apiCache.js'

describe('cloudListSync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    })
  })

  it('retorna userId autenticado via getAuthenticatedUserId', async () => {
    supabaseClient.auth.getSession.mockResolvedValueOnce({
      data: { session: { user: { id: 'user-123' } } },
    })

    await expect(getAuthenticatedUserId()).resolves.toBe('user-123')
  })

  it('busca lista fresca (< 6h) em user_anime_lists no Supabase', async () => {
    const mockEntries = [{ status: 'PLANNING', media: { id: 1 } }]
    const recentIso = new Date(Date.now() - 30 * 60 * 1000).toISOString()

    const singleMock = vi.fn().mockResolvedValueOnce({
      data: { entries: mockEntries, updated_at: recentIso },
      error: null,
    })
    const eqUsernameMock = vi.fn(() => ({ single: singleMock }))
    const eqProviderMock = vi.fn(() => ({ eq: eqUsernameMock }))
    const eqUserIdMock = vi.fn(() => ({ eq: eqProviderMock }))
    const selectMock = vi.fn(() => ({ eq: eqUserIdMock }))
    supabaseClient.from.mockReturnValue({ select: selectMock })

    const result = await fetchCloudAnimeList('user-123', 'AniList', 'TestUser', DEFAULT_CACHE_TTL)

    expect(supabaseClient.from).toHaveBeenCalledWith('user_anime_lists')
    expect(eqUserIdMock).toHaveBeenCalledWith('user_id', 'user-123')
    expect(eqProviderMock).toHaveBeenCalledWith('provider', 'anilist')
    expect(eqUsernameMock).toHaveBeenCalledWith('username', 'testuser')
    expect(result).not.toBeNull()
    expect(result.entries).toEqual(mockEntries)
    expect(result.isFresh).toBe(true)
    expect(result.isStale).toBe(false)
  })

  it('identifica lista na nuvem como stale quando updated_at >= 6h', async () => {
    const mockEntries = [{ status: 'COMPLETED', score: 10, media: { id: 2 } }]
    const eightHoursAgoIso = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()

    const singleMock = vi.fn().mockResolvedValueOnce({
      data: { entries: mockEntries, updated_at: eightHoursAgoIso },
      error: null,
    })
    supabaseClient.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            eq: () => ({ single: singleMock }),
          }),
        }),
      }),
    })

    const result = await fetchCloudAnimeList('user-123', 'kitsu', 'userk', DEFAULT_CACHE_TTL)
    expect(result).not.toBeNull()
    expect(result.isFresh).toBe(false)
    expect(result.isStale).toBe(true)
  })

  it('faz upsert com debounce (last-write-wins) em scheduleCloudAnimeListSync', async () => {
    vi.useFakeTimers()
    const upsertMock = vi.fn().mockResolvedValue({ error: null })
    supabaseClient.from.mockReturnValue({ upsert: upsertMock })

    const entries1 = [{ status: 'PLANNING', media: { id: 1 } }]
    const entries2 = [
      { status: 'PLANNING', media: { id: 1 } },
      { status: 'COMPLETED', score: 9, media: { id: 2 } },
    ]

    scheduleCloudAnimeListSync('user-123', 'anilist', 'Wag', entries1, 200)
    const promise2 = scheduleCloudAnimeListSync('user-123', 'anilist', 'Wag', entries2, 200)

    await vi.advanceTimersByTimeAsync(250)
    const ok = await promise2

    expect(ok).toBe(true)
    expect(upsertMock).toHaveBeenCalledTimes(1)
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        provider: 'anilist',
        username: 'wag',
        entries: entries2,
      })
    )
    vi.useRealTimers()
  })

  it('não faz chamada de rede quando navigator.onLine === false', async () => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    })

    const fetched = await fetchCloudAnimeList('user-123', 'anilist', 'wag')
    const synced = await scheduleCloudAnimeListSync('user-123', 'anilist', 'wag', [{ id: 1 }], 10)

    expect(fetched).toBeNull()
    expect(synced).toBe(false)
    expect(supabaseClient.from).not.toHaveBeenCalled()
  })
})
