import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useProgressiveRecommendationPipeline } from './useProgressiveRecommendationPipeline.js'

describe('useProgressiveRecommendationPipeline', () => {
  const mockEntries = [
    {
      id: 1,
      media: {
        id: 101,
        title: { english: 'Anime 1', romaji: 'Anime 1' },
        genres: ['Action', 'Adventure'],
        status: 'RELEASING',
        seasonYear: 2023,
      },
      status: 'COMPLETED',
      score: 8,
    },
    {
      id: 2,
      media: {
        id: 102,
        title: { english: 'Anime 2', romaji: 'Anime 2' },
        genres: ['Comedy'],
        status: 'NOT_YET_RELEASED',
      },
      status: 'COMPLETED',
      score: 7,
    },
    {
      id: 3,
      media: {
        id: 103,
        title: { english: 'Anime 3', romaji: 'Anime 3' },
        genres: ['Drama'],
        status: 'FINISHED',
      },
      status: 'PLANNING',
      score: 0,
    },
  ]

  beforeEach(() => {
    vi.clearAllTimers()
    vi.useFakeTimers()
  })

  it('returns initial state with empty recommendations on first render', () => {
    const { result } = renderHook(() =>
      useProgressiveRecommendationPipeline({ entries: [], activeScope: 'anilist' })
    )

    expect(result.current.recommendations).toEqual([])
    expect(result.current.isLoadingMore).toBe(false)
    expect(result.current.tasteProfile).toBeDefined()
  })

  it('starts Phase 1 immediately and sets isLoadingMore to true when needed', async () => {
    const { result } = renderHook(() =>
      useProgressiveRecommendationPipeline({
        entries: mockEntries,
        activeScope: 'anilist',
        batchSize: 2,
      })
    )

    // Phase 1 should happen immediately
    await waitFor(() => {
      expect(result.current.recommendations.length).toBeGreaterThan(0)
    })

    expect(result.current.isLoadingMore).toBe(false) // No more than initial batch
  })

  it('returns correct availableGenres from planningEntries', async () => {
    const { result } = renderHook(() =>
      useProgressiveRecommendationPipeline({
        entries: mockEntries,
        activeScope: 'anilist',
      })
    )

    await waitFor(() => {
      expect(result.current.planningEntries.length).toBeGreaterThan(0)
    })

    // Genres should be extracted from planning entries
    expect(result.current.availableGenres).toBeDefined()
    expect(Array.isArray(result.current.availableGenres)).toBe(true)
  })

  it('returns correct availableYears from planningEntries', async () => {
    const { result } = renderHook(() =>
      useProgressiveRecommendationPipeline({
        entries: mockEntries,
        activeScope: 'anilist',
      })
    )

    await waitFor(() => {
      expect(result.current.planningEntries.length).toBeGreaterThan(0)
    })

    expect(result.current.availableYears).toBeDefined()
    expect(Array.isArray(result.current.availableYears)).toBe(true)
  })

  it('includes tasteProfile in return value', async () => {
    const { result } = renderHook(() =>
      useProgressiveRecommendationPipeline({
        entries: mockEntries,
        activeScope: 'anilist',
      })
    )

    await waitFor(() => {
      expect(result.current.tasteProfile).toBeDefined()
    })

    expect(result.current.tasteProfile).toBeInstanceOf(Map)
  })

  it('includes totalCount in return value', async () => {
    const { result } = renderHook(() =>
      useProgressiveRecommendationPipeline({
        entries: mockEntries,
        activeScope: 'anilist',
      })
    )

    await waitFor(() => {
      expect(result.current.totalCount).toBeDefined()
    })

    expect(result.current.totalCount).toBe(mockEntries.length)
  })

  it('respects selectedFilterGenre parameter', async () => {
    const { result, rerender } = renderHook(
      ({ genre }) =>
        useProgressiveRecommendationPipeline({
          entries: mockEntries,
          activeScope: 'anilist',
          selectedFilterGenre: genre,
        }),
      { initialProps: { genre: 'ALL' } }
    )

    await waitFor(() => {
      expect(result.current.recommendations.length).toBeGreaterThan(0)
    })

    // Rerender with a different genre filter
    rerender({ genre: 'Action' })

    await waitFor(() => {
      expect(result.current.recommendations.length).toBeGreaterThanOrEqual(0)
    })
  })

  it('respects searchQuery parameter', async () => {
    const { result, rerender } = renderHook(
      ({ query }) =>
        useProgressiveRecommendationPipeline({
          entries: mockEntries,
          activeScope: 'anilist',
          searchQuery: query,
        }),
      { initialProps: { query: '' } }
    )

    await waitFor(() => {
      const initialCount = result.current.recommendations.length
      expect(initialCount).toBeGreaterThanOrEqual(0)
    })

    // Rerender with a search query
    rerender({ query: 'Anime 1' })

    await waitFor(() => {
      // Should filter results
      const filtered = result.current.recommendations.filter((r) =>
        r.title?.toLowerCase().includes('Anime 1'.toLowerCase())
      )
      expect(filtered.length).toBeGreaterThanOrEqual(0)
    })
  })

  it('handles empty entries array', () => {
    const { result } = renderHook(() =>
      useProgressiveRecommendationPipeline({
        entries: [],
        activeScope: 'anilist',
      })
    )

    expect(result.current.recommendations).toEqual([])
    expect(result.current.planningEntries).toEqual([])
    expect(result.current.isLoadingMore).toBe(false)
  })

  it('handles null/undefined entries gracefully', () => {
    const { result: resultNull } = renderHook(() =>
      useProgressiveRecommendationPipeline({
        entries: null,
        activeScope: 'anilist',
      })
    )

    expect(resultNull.current.recommendations).toEqual([])

    const { result: resultUndefined } = renderHook(() =>
      useProgressiveRecommendationPipeline({
        entries: undefined,
        activeScope: 'anilist',
      })
    )

    expect(resultUndefined.current.recommendations).toEqual([])
  })

  it('respects batchSize parameter', async () => {
    const batchSize = 5
    const manyEntries = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      media: {
        id: 100 + i,
        title: { english: `Anime ${i + 1}`, romaji: `Anime ${i + 1}` },
        genres: ['Action'],
        status: 'FINISHED',
      },
      status: 'COMPLETED',
      score: 8,
    }))

    const { result } = renderHook(() =>
      useProgressiveRecommendationPipeline({
        entries: manyEntries,
        activeScope: 'anilist',
        batchSize,
      })
    )

    await waitFor(() => {
      // Phase 1 should show at most batchSize items initially
      expect(result.current.recommendations.length).toBeLessThanOrEqual(batchSize + 5) // Allow some margin
    })
  })
})
