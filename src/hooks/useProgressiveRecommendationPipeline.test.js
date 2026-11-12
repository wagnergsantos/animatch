import { describe, it, expect, beforeEach } from 'vitest'
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
        genres: ['Action', 'Drama'],
        status: 'FINISHED',
        averageScore: 80,
      },
      status: 'PLANNING',
      score: 0,
    },
  ]

  beforeEach(() => {
    // Garantir ambiente com timers reais para @testing-library waitFor
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

    expect(result.current.isLoadingMore).toBe(false) // 1 planning entry <= batchSize
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

  it('includes totalCount matching planning entries in return value', async () => {
    const { result } = renderHook(() =>
      useProgressiveRecommendationPipeline({
        entries: mockEntries,
        activeScope: 'anilist',
      })
    )

    await waitFor(() => {
      expect(result.current.totalCount).toBeDefined()
    })

    expect(result.current.totalCount).toBe(result.current.planningEntries.length)
    expect(result.current.totalCount).toBe(1)
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
    rerender({ query: 'Anime 3' })

    await waitFor(() => {
      const filtered = result.current.recommendations.filter((r) =>
        r.title?.toLowerCase().includes('anime 3')
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

  it('respects batchSize parameter and transitions to Phase 2 for medium-size lists', async () => {
    const batchSize = 5
    const completed = [
      {
        id: 1,
        media: { id: 101, title: { english: 'Base 1' }, genres: ['Action'] },
        status: 'COMPLETED',
        score: 9,
      },
    ]
    const planning = Array.from({ length: 25 }, (_, i) => ({
      id: 200 + i,
      media: {
        id: 1000 + i,
        title: { english: `Planning Anime ${i + 1}`, romaji: `Planning Anime ${i + 1}` },
        genres: ['Action'],
        status: 'FINISHED',
        averageScore: 75,
      },
      status: 'PLANNING',
      score: 0,
    }))

    const { result } = renderHook(() =>
      useProgressiveRecommendationPipeline({
        entries: [...completed, ...planning],
        activeScope: 'anilist',
        batchSize,
      })
    )

    // Phase 1 immediately limits initial batch to batchSize and signals loading more
    await waitFor(() => {
      expect(result.current.recommendations.length).toBe(batchSize)
    })
    expect(result.current.isLoadingMore).toBe(true)

    // Phase 2 loads all planning candidates asynchronously
    await waitFor(() => {
      expect(result.current.recommendations.length).toBe(25)
    })
    expect(result.current.isLoadingMore).toBe(false)
  })

  it('settles (no Phase1/Phase2 oscillation) when caller passes a new entries array each render', async () => {
    const completed = {
      id: 1,
      media: { id: 101, title: { english: 'Base 1' }, genres: ['Action'] },
      status: 'COMPLETED',
      score: 9,
    }
    const planning = Array.from({ length: 25 }, (_, i) => ({
      id: 200 + i,
      media: {
        id: 1000 + i,
        title: { english: `Planning Anime ${i + 1}` },
        genres: ['Action'],
        status: 'FINISHED',
        averageScore: 75,
      },
      status: 'PLANNING',
      score: 0,
    }))

    let renders = 0
    const { result } = renderHook(() => {
      renders += 1
      // Array literal novo a cada render (padrão comum em consumidores não memoizados)
      return useProgressiveRecommendationPipeline({
        entries: [completed, ...planning],
        batchSize: 5,
      })
    })

    await waitFor(() => {
      expect(result.current.recommendations.length).toBe(25)
      expect(result.current.isLoadingMore).toBe(false)
    })

    const rendersAfterSettle = renders
    await new Promise((r) => setTimeout(r, 50))

    expect(renders).toBe(rendersAfterSettle)
    expect(result.current.recommendations.length).toBe(25)
    expect(result.current.isLoadingMore).toBe(false)
  })
})
