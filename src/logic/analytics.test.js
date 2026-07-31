import { describe, it, expect } from 'vitest'
import {
  computeOverviewStats,
  computeStatusDistribution,
  computeYearDistribution,
  computeBayesianGenreStats,
} from './analytics.js'

describe('analytics logic', () => {
  const sampleEntries = [
    {
      status: 'COMPLETED',
      score: 8,
      media: { episodes: 12, seasonYear: 2020, genres: ['Action', 'Sci-Fi'] }
    },
    {
      status: 'COMPLETED',
      score: 10,
      media: { episodes: 24, startDate: { year: 2020 }, genres: ['Action'] }
    },
    {
      status: 'PLANNING',
      score: 0,
      media: { episodes: 12, seasonYear: 2021, genres: ['Sci-Fi'] }
    }
  ]

  it('computes overview stats correctly', () => {
    const stats = computeOverviewStats(sampleEntries)
    expect(stats.totalAnimes).toBe(3)
    expect(stats.totalEpisodes).toBe(48)
    expect(stats.userAverageScore).toBe(9.0)
  })

  it('computes status distribution', () => {
    const dist = computeStatusDistribution(sampleEntries)
    expect(dist.COMPLETED).toBe(2)
    expect(dist.PLANNING).toBe(1)
    expect(dist.CURRENT).toBe(0)
    expect(dist.DROPPED).toBe(0)
    expect(dist.PAUSED).toBe(0)
  })

  it('computes year distribution', () => {
    const years = computeYearDistribution(sampleEntries)
    expect(years).toEqual([
      { year: 2020, count: 2 },
      { year: 2021, count: 1 }
    ])
  })

  it('computes bayesian genre stats filtered by min 2 scored entries', () => {
    const completed = sampleEntries.filter(e => e.status === 'COMPLETED')
    const genreStats = computeBayesianGenreStats(completed, 15)
    // Only Action has 2 scored entries in sample
    expect(genreStats).toHaveLength(1)
    expect(genreStats[0].genre).toBe('Action')
    expect(genreStats[0].scoredCount).toBe(2)
    expect(genreStats[0].realAverage).toBe(9.0)
  })
})
