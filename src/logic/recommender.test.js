import { describe, it, expect } from 'vitest'
import { buildTasteProfile, scoreRecommendations } from './recommender.js'

describe('buildTasteProfile', () => {
  it('calculates average score and tracks total vs scored count per genre', () => {
    const entries = [
      { score: 8, media: { genres: ['Action', 'Adventure'] } },
      { score: 6, media: { genres: ['Action', 'Drama'] } },
      { score: 9, media: { genres: ['Adventure', 'Fantasy'] } },
      { score: 0, media: { genres: ['Action'] } }, // completed but unscored
    ]

    const profile = buildTasteProfile(entries)

    expect(profile.get('Action')).toEqual({ average: 7, count: 3, scoredCount: 2 })
    expect(profile.get('Adventure')).toEqual({ average: 8.5, count: 2, scoredCount: 2 })
  })

  it('excludes genres with fewer than 2 scored anime', () => {
    const entries = [
      { score: 10, media: { genres: ['Mecha'] } },
      { score: 0, media: { genres: ['Mecha'] } }, // total 2, but only 1 scored
      { score: 8, media: { genres: ['Action'] } },
      { score: 7, media: { genres: ['Action'] } },
    ]

    const profile = buildTasteProfile(entries)

    expect(profile.has('Mecha')).toBe(false)
    expect(profile.has('Action')).toBe(true)
  })

  it('returns empty map when all entries are unscored', () => {
    const entries = [
      { score: 0, media: { genres: ['Action'] } },
      { score: 0, media: { genres: ['Drama'] } },
    ]

    const profile = buildTasteProfile(entries)

    expect(profile.size).toBe(0)
  })

  it('uses default parameter when completedEntries is not provided', () => {
    const profile = buildTasteProfile()

    expect(profile).toBeInstanceOf(Map)
    expect(profile.size).toBe(0)
  })

  it('safely handles missing or null media and genres', () => {
    const entries = [
      null,
      {},
      { media: null },
      { score: 8, media: { genres: null } },
      { score: 8, media: { genres: ['Action'] } },
      { score: 9, media: { genres: ['Action'] } },
    ]

    const profile = buildTasteProfile(entries)

    expect(profile.get('Action')).toEqual({ average: 8.5, count: 2, scoredCount: 2 })
  })
})

describe('scoreRecommendations', () => {
  const tasteProfile = new Map([
    ['Action', { average: 5, count: 15, scoredCount: 10 }],
    ['Adventure', { average: 9, count: 5, scoredCount: 4 }],
    ['Drama', { average: 7, count: 8, scoredCount: 6 }],
  ])

  it('uses default parameters when arguments are not provided', () => {
    const result = scoreRecommendations()

    expect(result).toEqual([])
  })

  it('safely handles missing or null media, genres, title, and coverImage', () => {
    const planning = [
      {
        media: null,
      },
      {
        media: {
          id: 10,
          title: null,
          coverImage: null,
          genres: null,
          averageScore: 70,
        },
      },
      {
        media: {
          id: 11,
          title: { english: null, romaji: null },
          coverImage: {},
          genres: undefined,
          averageScore: 80,
        },
      },
    ]

    const result = scoreRecommendations(planning, tasteProfile)

    expect(result).toHaveLength(3)

    const nullMediaResult = result.find((r) => r.id === undefined)
    expect(nullMediaResult).toEqual({
      id: undefined,
      title: 'Untitled',
      coverImage: '',
      genres: [],
      predictedScore: 0,
      communityScore: 0,
    })

    const entry10Result = result.find((r) => r.id === 10)
    expect(entry10Result).toEqual({
      id: 10,
      title: 'Untitled',
      coverImage: '',
      genres: [],
      predictedScore: 7,
      communityScore: 7,
    })

    const entry11Result = result.find((r) => r.id === 11)
    expect(entry11Result).toEqual({
      id: 11,
      title: 'Untitled',
      coverImage: '',
      genres: [],
      predictedScore: 8,
      communityScore: 8,
    })
  })

  it('calculates predicted score from matching genre averages', () => {
    const planning = [
      {
        media: {
          id: 1,
          title: { romaji: 'Test A', english: 'Test A' },
          genres: ['Action', 'Adventure'],
          coverImage: { large: 'a.jpg' },
          averageScore: 80,
          popularity: 1000,
        },
      },
    ]

    const result = scoreRecommendations(planning, tasteProfile)

    expect(result[0].predictedScore).toBe(7) // (5 + 9) / 2
  })

  it('uses community averageScore as fallback when no genres match', () => {
    const planning = [
      {
        media: {
          id: 2,
          title: { romaji: 'Unknown Genre', english: null },
          genres: ['Mecha'],
          coverImage: { large: 'b.jpg' },
          averageScore: 75,
          popularity: 500,
        },
      },
    ]

    const result = scoreRecommendations(planning, tasteProfile)

    expect(result[0].predictedScore).toBe(7.5) // 75 / 10
  })

  it('sorts by predictedScore descending, then communityScore descending', () => {
    const planning = [
      {
        media: {
          id: 1, title: { romaji: 'Low', english: 'Low' },
          genres: ['Action'], coverImage: { large: '' },
          averageScore: 60, popularity: 100,
        },
      },
      {
        media: {
          id: 2, title: { romaji: 'High', english: 'High' },
          genres: ['Adventure'], coverImage: { large: '' },
          averageScore: 90, popularity: 200,
        },
      },
      {
        media: {
          id: 3, title: { romaji: 'Mid', english: 'Mid' },
          genres: ['Action', 'Drama'], coverImage: { large: '' },
          averageScore: 85, popularity: 150,
        },
      },
    ]

    const result = scoreRecommendations(planning, tasteProfile)

    expect(result.map((r) => r.id)).toEqual([2, 3, 1]) // 9, 6, 5
  })

  it('uses communityScore as tiebreaker', () => {
    const planning = [
      {
        media: {
          id: 1, title: { romaji: 'A', english: 'A' },
          genres: ['Action'], coverImage: { large: '' },
          averageScore: 70, popularity: 100,
        },
      },
      {
        media: {
          id: 2, title: { romaji: 'B', english: 'B' },
          genres: ['Action'], coverImage: { large: '' },
          averageScore: 90, popularity: 200,
        },
      },
    ]

    const result = scoreRecommendations(planning, tasteProfile)

    // Same predictedScore (5), B has higher communityScore (90 > 70)
    expect(result[0].id).toBe(2)
    expect(result[1].id).toBe(1)
  })

  it('returns title with english preferred, romaji fallback', () => {
    const planning = [
      {
        media: {
          id: 1, title: { romaji: 'Romaji Name', english: null },
          genres: ['Action'], coverImage: { large: '' },
          averageScore: 70, popularity: 100,
        },
      },
    ]

    const result = scoreRecommendations(planning, tasteProfile)

    expect(result[0].title).toBe('Romaji Name')
  })
})

