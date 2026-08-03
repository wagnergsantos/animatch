import { describe, it, expect } from 'vitest'
import { buildTasteProfile, scoreRecommendations, resolveYear } from './recommender.js'

describe('resolveYear', () => {
  it('returns null for null/undefined input', () => {
    expect(resolveYear(null)).toBeNull()
    expect(resolveYear(undefined)).toBeNull()
  })

  it('resolves from item.year', () => {
    expect(resolveYear({ year: 2020 })).toBe(2020)
  })

  it('resolves from item.seasonYear when year is missing', () => {
    expect(resolveYear({ seasonYear: 2019 })).toBe(2019)
  })

  it('resolves from item.startDate.year when year and seasonYear are missing', () => {
    expect(resolveYear({ startDate: { year: 2018 } })).toBe(2018)
  })

  it('resolves from item.media.year when top-level fields are missing', () => {
    expect(resolveYear({ media: { year: 2017 } })).toBe(2017)
  })

  it('resolves from item.media.seasonYear when higher-priority fields are missing', () => {
    expect(resolveYear({ media: { seasonYear: 2016 } })).toBe(2016)
  })

  it('resolves from item.media.startDate.year as the last fallback', () => {
    expect(resolveYear({ media: { startDate: { year: 2015 } } })).toBe(2015)
  })

  it('returns null when no year source is present', () => {
    expect(resolveYear({ title: 'No Year Anime' })).toBeNull()
  })

  it('prioritizes top-level year over media year when both are present', () => {
    expect(resolveYear({ year: 2021, media: { year: 2010 } })).toBe(2021)
  })

  it('treats year 0 as a valid falsy-but-present value via nullish coalescing', () => {
    // 0 ?? seasonYear should short-circuit to 0, not fall through
    expect(resolveYear({ year: 0, seasonYear: 1999 })).toBe(0)
  })
})

describe('buildTasteProfile', () => {
  it('calculates average score and tracks total vs scored count per genre', () => {
    const entries = [
      { score: 8, media: { genres: ['Action', 'Adventure'] } },
      { score: 6, media: { genres: ['Action', 'Drama'] } },
      { score: 9, media: { genres: ['Adventure', 'Fantasy'] } },
      { score: 0, media: { genres: ['Action'] } }, // completed but unscored
    ]

    const profile = buildTasteProfile(entries)

    expect(profile.get('Action')).toEqual({ average: 7, adjustedAverage: 7.59, count: 3, scoredCount: 2 })
    expect(profile.get('Adventure')).toEqual({ average: 8.5, adjustedAverage: 7.76, count: 2, scoredCount: 2 })
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

    expect(profile.get('Action')).toEqual({ average: 8.5, adjustedAverage: 8.35, count: 2, scoredCount: 2 })
  })

  it('calculates Bayesian adjustedAverage using user global average and C=15', () => {
    // Genre Action: 15 entries, sum = 124.95 -> real average = 8.33
    // Genre Fantasy: 114 entries, sum = 931.38 -> real average = 8.17
    // Genre Drama: 129 entries, sum = 752.07 -> overall user global average = 7.0
    const entries = [
      ...Array.from({ length: 15 }, () => ({ score: 8.33, media: { genres: ['Action'] } })),
      ...Array.from({ length: 114 }, () => ({ score: 8.17, media: { genres: ['Fantasy'] } })),
      ...Array.from({ length: 129 }, () => ({ score: 5.83, media: { genres: ['Drama'] } })),
    ]

    const profile = buildTasteProfile(entries)

    expect(profile.get('Action').adjustedAverage).toBe(7.67)
    expect(profile.get('Fantasy').adjustedAverage).toBe(8.04)
    // Fantasy has higher adjustedAverage than Action because of volume!
    expect(profile.get('Fantasy').adjustedAverage).toBeGreaterThan(profile.get('Action').adjustedAverage)
  })

  it('calculates Bayesian adjustedAverage using C=15 and 2 decimal precision', () => {
    const entries = [
      ...Array.from({ length: 15 }, () => ({ score: 8.33, media: { genres: ['Action'] } })),
      ...Array.from({ length: 114 }, () => ({ score: 8.17, media: { genres: ['Fantasy'] } })),
    ]

    const profile = buildTasteProfile(entries)

    expect(profile.get('Action').adjustedAverage).toBe(8.26)
    expect(profile.get('Fantasy').adjustedAverage).toBe(8.17)
  })
})

describe('scoreRecommendations', () => {
  const tasteProfile = new Map([
    ['Action', { average: 5, adjustedAverage: 5, count: 15, scoredCount: 10 }],
    ['Adventure', { average: 9, adjustedAverage: 9, count: 5, scoredCount: 4 }],
    ['Drama', { average: 7, adjustedAverage: 7, count: 8, scoredCount: 6 }],
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

    expect(result).toHaveLength(2)

    const entry10Result = result.find((r) => r.id === 10)
    expect(entry10Result).toEqual({
      id: 10,
      title: 'Untitled',
      description: undefined,
      coverImage: '',
      genres: [],
      format: 'OTHER',
      year: null,
      episodes: null,
      status: null,
      predictedScore: 7,
      communityScore: 7,
      siteUrl: 'https://anilist.co/anime/10',
      streamingLinks: [],
      provider: 'anilist',
    })

    const entry11Result = result.find((r) => r.id === 11)
    expect(entry11Result).toEqual({
      id: 11,
      title: 'Untitled',
      description: undefined,
      coverImage: '',
      genres: [],
      format: 'OTHER',
      year: null,
      episodes: null,
      status: null,
      predictedScore: 8,
      communityScore: 8,
      siteUrl: 'https://anilist.co/anime/11',
      streamingLinks: [],
      provider: 'anilist',
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

  it('uses adjustedAverage over average when available', () => {
    const customProfile = new Map([
      ['Action', { average: 9.0, adjustedAverage: 7.5, count: 10, scoredCount: 5 }],
      ['Adventure', { average: 8.0, adjustedAverage: 8.5, count: 5, scoredCount: 5 }],
    ])
    const planning = [
      {
        media: {
          id: 1,
          genres: ['Action', 'Adventure'],
          averageScore: 70,
        },
      },
    ]

    const result = scoreRecommendations(planning, customProfile)
    expect(result[0].predictedScore).toBe(8) // (7.5 + 8.5) / 2 = 8.0
  })

  it('falls back to average when adjustedAverage is undefined', () => {
    const customProfile = new Map([
      ['Action', { average: 6.0, count: 10, scoredCount: 5 }],
    ])
    const planning = [
      {
        media: {
          id: 1,
          genres: ['Action'],
          averageScore: 70,
        },
      },
    ]

    const result = scoreRecommendations(planning, customProfile)
    expect(result[0].predictedScore).toBe(6)
  })

  it('filters out unreleased anime where averageScore is null or 0', () => {
    const planning = [
      {
        media: {
          id: 1, title: { romaji: 'Released', english: 'Released' },
          genres: ['Action'], coverImage: { large: '' }, averageScore: 70, siteUrl: 'https://anilist.co/anime/1',
        },
      },
      {
        media: {
          id: 2, title: { romaji: 'Unreleased Null', english: 'Unreleased Null' },
          genres: ['Action'], coverImage: { large: '' }, averageScore: null, siteUrl: 'https://anilist.co/anime/2',
        },
      },
      {
        media: {
          id: 3, title: { romaji: 'Unreleased Zero', english: 'Unreleased Zero' },
          genres: ['Action'], coverImage: { large: '' }, averageScore: 0, siteUrl: 'https://anilist.co/anime/3',
        },
      },
    ]

    const result = scoreRecommendations(planning, tasteProfile)

    expect(result).toHaveLength(1)
    expect(result[0].id).toBe(1)
    expect(result[0].siteUrl).toBe('https://anilist.co/anime/1')
  })

  it('filters recommendations by genre if selectedGenre is specified', () => {
    const planning = [
      { media: { id: 1, title: { romaji: 'Anime 1' }, genres: ['Action', 'Fantasy'], averageScore: 80 } },
      { media: { id: 2, title: { romaji: 'Anime 2' }, genres: ['Drama', 'Romance'], averageScore: 85 } },
    ]
    const profile = new Map([['Action', { average: 8.5, adjustedAverage: 8.2 }]])

    const actionOnly = scoreRecommendations(planning, profile, 'Action')
    expect(actionOnly).toHaveLength(1)
    expect(actionOnly[0].id).toBe(1)
  })
})

