import { renderHook, waitFor, act } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useEnsembleData } from './useEnsembleData.js'
import * as api from '../api/index.js'

vi.mock('../api/index.js', () => ({
  fetchUserEntries: vi.fn(),
}))

describe('useEnsembleData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not fetch if enabled is false or less than 2 usernames provided', () => {
    // enabled is false
    const { result, rerender } = renderHook(
      ({ usernames, options }) => useEnsembleData(usernames, options),
      {
        initialProps: {
          usernames: { anilist: 'user1', mal: 'user2' },
          options: { enabled: false },
        },
      }
    )

    expect(result.current.isLoading).toBe(false)
    expect(result.current.entriesByProvider).toEqual({})
    expect(result.current.consolidatedEntries).toEqual([])
    expect(result.current.failedProviders).toEqual([])
    expect(api.fetchUserEntries).not.toHaveBeenCalled()

    // less than 2 usernames
    rerender({
      usernames: { anilist: 'user1', mal: '   ', kitsu: '' },
      options: { enabled: true },
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.entriesByProvider).toEqual({})
    expect(result.current.consolidatedEntries).toEqual([])
    expect(result.current.failedProviders).toEqual([])
    expect(api.fetchUserEntries).not.toHaveBeenCalled()
  })

  it('fetches entries in parallel for all linked providers and consolidates them', async () => {
    api.fetchUserEntries.mockImplementation((username, provider) => {
      if (provider === 'anilist') {
        return Promise.resolve([
          { status: 'PLANNING', score: 0, media: { id: 1, idMal: 10, title: { english: 'Anime A' } } },
        ])
      }
      if (provider === 'mal') {
        return Promise.resolve([
          { status: 'COMPLETED', score: 8, media: { id: 10, provider: 'mal', title: { english: 'Anime A' } } },
        ])
      }
      return Promise.resolve([])
    })

    const { result } = renderHook(() =>
      useEnsembleData({ anilist: 'alice', mal: 'alice_mal' }, { enabled: true })
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(api.fetchUserEntries).toHaveBeenCalledTimes(2)
    expect(api.fetchUserEntries).toHaveBeenCalledWith('alice', 'anilist', {})
    expect(api.fetchUserEntries).toHaveBeenCalledWith('alice_mal', 'mal', {})

    expect(result.current.failedProviders).toEqual([])
    expect(result.current.consolidatedEntries).toHaveLength(1)
    expect(result.current.consolidatedEntries[0].status).toBe('COMPLETED')
    expect(result.current.entriesByProvider.anilist).toHaveLength(1)
    expect(result.current.entriesByProvider.mal).toHaveLength(1)
  })

  it('handles partial failures gracefully without throwing', async () => {
    api.fetchUserEntries.mockImplementation((username, provider) => {
      if (provider === 'anilist') {
        return Promise.resolve([
          { status: 'PLANNING', score: 0, media: { id: 1, idMal: 10, title: { english: 'Anime A' } } },
        ])
      }
      if (provider === 'mal') {
        return Promise.reject(new Error('Network timeout'))
      }
      return Promise.resolve([])
    })

    const { result } = renderHook(() =>
      useEnsembleData({ anilist: 'alice', mal: 'alice_mal' }, { enabled: true })
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.failedProviders).toEqual(['mal'])
    expect(result.current.consolidatedEntries).toHaveLength(1)
    expect(result.current.entriesByProvider.anilist).toHaveLength(1)
    expect(result.current.entriesByProvider.mal).toBeUndefined()
  })

  it('handles total failure (all reject) gracefully', async () => {
    api.fetchUserEntries.mockRejectedValue(new Error('All providers offline'))

    const { result } = renderHook(() =>
      useEnsembleData({ anilist: 'alice', mal: 'alice_mal' }, { enabled: true })
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.failedProviders).toEqual(['anilist', 'mal'])
    expect(result.current.consolidatedEntries).toEqual([])
    expect(result.current.entriesByProvider).toEqual({})
  })

  it('refetch() triggers reload with forceRefresh: true', async () => {
    api.fetchUserEntries.mockImplementation((username, provider) => {
      return Promise.resolve([
        { status: 'PLANNING', score: 0, media: { id: 1, title: { english: `${provider} item` } } },
      ])
    })

    const { result } = renderHook(() =>
      useEnsembleData({ anilist: 'alice', mal: 'alice_mal' }, { enabled: true })
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(api.fetchUserEntries).toHaveBeenCalledWith('alice', 'anilist', {})
    expect(api.fetchUserEntries).toHaveBeenCalledWith('alice_mal', 'mal', {})

    await act(async () => {
      await result.current.refetch()
    })

    expect(api.fetchUserEntries).toHaveBeenCalledWith('alice', 'anilist', { forceRefresh: true })
    expect(api.fetchUserEntries).toHaveBeenCalledWith('alice_mal', 'mal', { forceRefresh: true })
  })

  it('refetch(provider) triggers reload for single provider with forceRefresh: true', async () => {
    let malAttempt = 0
    api.fetchUserEntries.mockImplementation((username, provider) => {
      if (provider === 'anilist') {
        return Promise.resolve([
          { status: 'PLANNING', score: 0, media: { id: 1, idMal: 10, title: { english: 'Anime A' } } },
        ])
      }
      if (provider === 'mal') {
        malAttempt++
        if (malAttempt === 1) {
          return Promise.reject(new Error('MAL temporarily down'))
        }
        return Promise.resolve([
          { status: 'COMPLETED', score: 9, media: { id: 10, provider: 'mal', title: { english: 'Anime A' } } },
        ])
      }
      return Promise.resolve([])
    })

    const { result } = renderHook(() =>
      useEnsembleData({ anilist: 'alice', mal: 'alice_mal' }, { enabled: true })
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.failedProviders).toEqual(['mal'])
    expect(result.current.consolidatedEntries).toHaveLength(1)
    expect(result.current.consolidatedEntries[0].status).toBe('PLANNING')

    api.fetchUserEntries.mockClear()

    await act(async () => {
      await result.current.refetch('mal')
    })

    expect(api.fetchUserEntries).toHaveBeenCalledTimes(1)
    expect(api.fetchUserEntries).toHaveBeenCalledWith('alice_mal', 'mal', { forceRefresh: true })

    expect(result.current.failedProviders).toEqual([])
    expect(result.current.entriesByProvider.anilist).toBeDefined()
    expect(result.current.entriesByProvider.mal).toBeDefined()
    expect(result.current.consolidatedEntries).toHaveLength(1)
    expect(result.current.consolidatedEntries[0].status).toBe('COMPLETED')
  })

  it('cleanup: prevents state updates after unmount', async () => {
    let resolveAnilist
    api.fetchUserEntries.mockImplementation((username, provider) => {
      if (provider === 'anilist') {
        return new Promise((resolve) => {
          resolveAnilist = resolve
        })
      }
      return Promise.resolve([])
    })

    const { result, unmount } = renderHook(() =>
      useEnsembleData({ anilist: 'alice', mal: 'alice_mal' }, { enabled: true })
    )

    expect(result.current.isLoading).toBe(true)
    unmount()

    // Resolve after unmount
    await act(async () => {
      resolveAnilist([
        { status: 'PLANNING', score: 0, media: { id: 1, title: { english: 'Late item' } } },
      ])
    })

    // No error or crash should occur
  })

  it('resets to empty structures when usernames drop below 2 or enabled becomes false', async () => {
    api.fetchUserEntries.mockImplementation((username, provider) => {
      return Promise.resolve([
        { status: 'PLANNING', score: 0, media: { id: 1, title: { english: `${provider} item` } } },
      ])
    })

    const { result, rerender } = renderHook(
      ({ usernames, options }) => useEnsembleData(usernames, options),
      {
        initialProps: {
          usernames: { anilist: 'alice', mal: 'alice_mal' },
          options: { enabled: true },
        },
      }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.consolidatedEntries).toHaveLength(2)

    // User removes mal account
    rerender({
      usernames: { anilist: 'alice', mal: '' },
      options: { enabled: true },
    })

    expect(result.current.isLoading).toBe(false)
    expect(result.current.entriesByProvider).toEqual({})
    expect(result.current.consolidatedEntries).toEqual([])
    expect(result.current.failedProviders).toEqual([])
  })

  it('tracks granular loadingProviders when refetching a single provider', async () => {
    let resolveMal
    api.fetchUserEntries.mockImplementation((username, provider) => {
      if (provider === 'mal') {
        return new Promise((resolve) => {
          resolveMal = resolve
        })
      }
      return Promise.resolve([])
    })

    const { result } = renderHook(() =>
      useEnsembleData({ anilist: 'alice', mal: 'alice_mal' }, { enabled: true })
    )

    expect(result.current.loadingProviders).toEqual(expect.arrayContaining(['anilist', 'mal']))

    await act(async () => {
      resolveMal([])
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.loadingProviders).toEqual([])

    let resolveMal2
    api.fetchUserEntries.mockImplementation((username, provider) => {
      if (provider === 'mal') {
        return new Promise((resolve) => {
          resolveMal2 = resolve
        })
      }
      return Promise.resolve([])
    })

    act(() => {
      result.current.refetch('mal')
    })

    expect(result.current.loadingProviders).toEqual(['mal'])
    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolveMal2([])
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.loadingProviders).toEqual([])
  })
})

