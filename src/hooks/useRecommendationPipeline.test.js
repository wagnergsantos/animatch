import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useRecommendationPipeline } from './useRecommendationPipeline.js'

const sampleEntries = [
  {
    status: 'COMPLETED',
    score: 9,
    media: {
      id: 1,
      title: { romaji: 'Monster', english: 'Monster' },
      genres: ['Drama', 'Mystery'],
      averageScore: 89,
    },
  },
  {
    status: 'COMPLETED',
    score: 8,
    media: {
      id: 2,
      title: { romaji: 'Death Note', english: 'Death Note' },
      genres: ['Drama', 'Mystery'],
      averageScore: 84,
    },
  },
  {
    status: 'PLANNING',
    media: {
      id: 10,
      title: { romaji: 'Pluto', english: 'Pluto' },
      genres: ['Drama', 'Mystery'],
      format: 'ONA',
      seasonYear: 2023,
      status: 'FINISHED',
      averageScore: 86,
      streamingLinks: [{ site: 'Netflix', url: 'https://www.netflix.com/title/81281344' }],
    },
    planningProviders: ['anilist', 'mal'],
  },
  {
    status: 'PLANNING',
    media: {
      id: 11,
      title: { romaji: 'Bocchi the Rock!', english: 'Bocchi the Rock!' },
      genres: ['Comedy'],
      format: 'TV',
      seasonYear: 2022,
      status: 'FINISHED',
      averageScore: 88,
      streamingLinks: [{ site: 'Crunchyroll', url: 'https://www.crunchyroll.com/bocchi' }],
    },
  },
]

describe('useRecommendationPipeline', () => {
  it('computes tasteProfile, availableGenres, availableYears, and sorted recommendations', () => {
    const { result } = renderHook(() =>
      useRecommendationPipeline({ entries: sampleEntries })
    )

    expect(result.current.tasteProfile.has('Drama')).toBe(true)
    expect(result.current.tasteProfile.has('Mystery')).toBe(true)
    expect(result.current.planningEntries).toHaveLength(2)
    expect(result.current.availableYears).toEqual([2023, 2022])
    expect(result.current.availableGenres.map((g) => g.name)).toEqual([
      'Comedy',
      'Drama',
      'Mystery',
    ])
    expect(result.current.recommendations).toHaveLength(2)
  })

  it('filters recommendations by searchQuery, format, year, and streaming subscriptions', () => {
    const { result } = renderHook(() =>
      useRecommendationPipeline({
        entries: sampleEntries,
        searchQuery: 'pluto',
        selectedFormat: 'ONA',
        selectedYear: 2023,
        isStreamingOnly: true,
        subscriptions: ['Netflix'],
      })
    )

    expect(result.current.recommendations).toHaveLength(1)
    expect(result.current.recommendations[0].title).toBe('Pluto')
  })

  it('applies ensemble multi-presence boost and streaming boost when enabled', () => {
    const { result: baseResult } = renderHook(() =>
      useRecommendationPipeline({
        entries: sampleEntries,
        activeScope: 'anilist',
        streamingBoost: false,
      })
    )
    const { result: boostedResult } = renderHook(() =>
      useRecommendationPipeline({
        entries: sampleEntries,
        activeScope: 'ensemble',
        streamingBoost: true,
        subscriptions: ['Netflix'],
      })
    )

    const basePluto = baseResult.current.recommendations.find((r) => r.id === 10)
    const boostedPluto = boostedResult.current.recommendations.find((r) => r.id === 10)
    expect(boostedPluto.predictedScore).toBeGreaterThan(basePluto.predictedScore)
  })
})
