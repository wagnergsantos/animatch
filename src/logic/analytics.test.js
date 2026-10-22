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
      status: 'DROPPED',
      score: 2,
      media: { episodes: 12, seasonYear: 2020, genres: ['Action'] }
    },
    {
      status: 'PLANNING',
      score: 0,
      media: { episodes: 12, seasonYear: 2021, genres: ['Sci-Fi'], averageScore: 80 }
    }
  ]

  it('computes overview stats correctly, ignoring PLANNING for totals and DROPPED for average', () => {
    const stats = computeOverviewStats(sampleEntries)
    // 3 animes (COMPLETED, COMPLETED, DROPPED) - ignores PLANNING
    expect(stats.totalAnimes).toBe(3)
    // 12 + 24 + 12 = 48 episodes
    expect(stats.totalEpisodes).toBe(48)
    // score sum: 8 + 10 = 18. Count: 2 (DROPPED is ignored) -> average: 9.0
    expect(stats.userAverageScore).toBe(9.0)
  })

  it('computes status distribution', () => {
    const dist = computeStatusDistribution(sampleEntries)
    expect(dist.COMPLETED).toBe(2)
    expect(dist.PLANNING).toBe(1)
    expect(dist.CURRENT).toBe(0)
    expect(dist.DROPPED).toBe(1)
    expect(dist.PAUSED).toBe(0)
  })

  it('computes year distribution', () => {
    const years = computeYearDistribution(sampleEntries)
    expect(years).toEqual([
      { year: 2020, count: 3 },
      { year: 2021, count: 1 }
    ])
  })

  it('computes bayesian genre stats filtered by min 2 scored entries including plannedCount and lowerBound', () => {
    const genreStats = computeBayesianGenreStats(sampleEntries, 15)
    // Only Action has 2 scored entries in sample
    expect(genreStats).toHaveLength(1)
    expect(genreStats[0].genre).toBe('Action')
    expect(genreStats[0].count).toBe(2)
    expect(genreStats[0].scoredCount).toBe(2)
    expect(genreStats[0].plannedCount).toBe(0)
    expect(genreStats[0].realAverage).toBe(9.0)
    expect(genreStats[0].bayesianAverage).toBeDefined()
    expect(genreStats[0].lowerBound).toBeDefined()
    expect(genreStats[0].lowerBound).toBeLessThan(genreStats[0].bayesianAverage)
  })

  it('ranks high-volume solid genres above low-volume inflated genres using lowerBound and C=25', () => {
    const testEntries = [
      ...Array.from({ length: 4 }, () => ({
        status: 'COMPLETED',
        score: 9.75,
        media: { genres: ['China'] },
      })),
      ...Array.from({ length: 129 }, () => ({
        status: 'COMPLETED',
        score: 8.26,
        media: { genres: ['Drama'] },
      })),
      ...Array.from({ length: 159 }, () => ({
        status: 'COMPLETED',
        score: 8.07,
        media: { genres: ['Fantasy'] },
      })),
      ...Array.from({ length: 100 }, () => ({
        status: 'COMPLETED',
        score: 7.5,
        media: { genres: ['Sci-Fi'] },
      })),
    ]

    const stats = computeBayesianGenreStats(testEntries)
    // By default C=25 and sorted by lowerBound descending
    expect(stats[0].genre).toBe('Drama')
    const fantasy = stats.find((s) => s.genre === 'Fantasy')
    const china = stats.find((s) => s.genre === 'China')

    expect(fantasy.lowerBound).toBeGreaterThan(china.lowerBound)
  })

  it('includes scored CURRENT/WATCHING entries with 0.7 weight matching recommender logic', () => {
    const entries = [
      { status: 'COMPLETED', score: 10, media: { genres: ['Action'] } },
      { status: 'CURRENT', score: 10, media: { genres: ['Action'] } },
    ]

    const stats = computeBayesianGenreStats(entries)
    expect(stats).toHaveLength(1)
    expect(stats[0].genre).toBe('Action')
    expect(stats[0].realAverage).toBe(10)
    expect(stats[0].scoredCount).toBe(2)
  })

  it('excludes NOT_YET_RELEASED and unscored PLANNING entries from status, year, and plannedCount stats', () => {
    const entries = [
      ...sampleEntries,
      {
        status: 'PLANNING',
        score: 0,
        media: { status: 'NOT_YET_RELEASED', seasonYear: 2027, genres: ['Action'], averageScore: 85 },
      },
      {
        status: 'PLANNING',
        score: 0,
        media: { status: 'FINISHED', seasonYear: 2025, genres: ['Action'], averageScore: 0 },
      },
    ]

    const dist = computeStatusDistribution(entries)
    expect(dist.PLANNING).toBe(1) // only the eligible 2021 planning item from sampleEntries

    const years = computeYearDistribution(entries)
    expect(years.find((y) => y.year === 2027)).toBeUndefined()
    expect(years.find((y) => y.year === 2025)).toBeUndefined()

    const genreStats = computeBayesianGenreStats(entries, 15)
    expect(genreStats[0].plannedCount).toBe(0)
  })
})
