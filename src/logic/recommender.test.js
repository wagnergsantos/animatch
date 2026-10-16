import {
  buildTasteProfile,
  scoreRecommendations,
  resolveYear,
  DEFAULT_MIN_GENRE_COUNT,
  DEFAULT_CONFIDENCE_CONSTANT,
} from './recommender.js'

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

    expect(profile.get('Action')).toMatchObject({ average: 7, count: 3, scoredCount: 2 })
    expect(profile.get('Adventure')).toMatchObject({ average: 8.5, count: 2, scoredCount: 2 })
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

    expect(profile.get('Action')).toMatchObject({ average: 8.5, count: 2, scoredCount: 2 })
    expect(profile.get('Action').adjustedAverage).toBeDefined()
    expect(profile.get('Action').lowerBound).toBeDefined()
  })

  it('calculates Bayesian adjustedAverage using Lower Bound with C=25', () => {
    // Genre Action: 15 entries, sum = 124.95 -> real average = 8.33
    // Genre Fantasy: 114 entries, sum = 931.38 -> real average = 8.17
    // Genre Drama: 129 entries, sum = 752.07 -> overall user global average = 7.0
    const entries = [
      ...Array.from({ length: 15 }, () => ({ score: 8.33, media: { genres: ['Action'] } })),
      ...Array.from({ length: 114 }, () => ({ score: 8.17, media: { genres: ['Fantasy'] } })),
      ...Array.from({ length: 129 }, () => ({ score: 5.83, media: { genres: ['Drama'] } })),
    ]

    const profile = buildTasteProfile(entries)

    // Fantasy has higher adjustedAverage than Action because of volume and Lower Bound!
    expect(profile.get('Fantasy').adjustedAverage).toBeGreaterThan(profile.get('Action').adjustedAverage)
    expect(profile.get('Fantasy').lowerBound).toBeDefined()
    expect(profile.get('Fantasy').bayesianAverage).toBeDefined()
  })


  test("buildTasteProfile includes sourceAnimes for each genre", () => {
    const mockCompleted = [
      {
        score: 9,
        status: "COMPLETED",
        media: {
          id: 101,
          title: { english: "Anime A", romaji: "Anime A" },
          genres: ["Action", "Drama"],
          coverImage: { large: "http://img.com/a.jpg" }
        }
      },
      {
        score: 8,
        status: "COMPLETED",
        media: {
          id: 102,
          title: { english: "Anime B", romaji: "Anime B" },
          genres: ["Action"],
          coverImage: { large: "http://img.com/b.jpg" }
        }
      }
    ]

    const profile = buildTasteProfile(mockCompleted)
    const actionStats = profile.get("Action")

    expect(actionStats).toBeDefined()
    expect(actionStats.sourceAnimes).toHaveLength(2)
    expect(actionStats.sourceAnimes[0]).toEqual({
      id: 101,
      title: "Anime A",
      titleObj: {
        english: "Anime A",
        romaji: "Anime A",
      },
      score: 9,
      coverImage: "http://img.com/a.jpg",
      status: "COMPLETED"
    })
  })
  it('ranks high-volume genres with solid scores higher in adjustedAverage than low-volume genres with slightly higher scores', () => {
    const entries = [
      ...Array.from({ length: 4 }, () => ({ score: 9.75, media: { genres: ['China'] } })),
      ...Array.from({ length: 159 }, () => ({ score: 8.07, media: { genres: ['Fantasy'] } })),
      ...Array.from({ length: 129 }, () => ({ score: 8.26, media: { genres: ['Drama'] } })),
      ...Array.from({ length: 100 }, () => ({ score: 7.5, media: { genres: ['Sci-Fi'] } })),
    ]

    const profile = buildTasteProfile(entries)

    expect(profile.get('Fantasy').adjustedAverage).toBeGreaterThan(profile.get('China').adjustedAverage)
    expect(profile.get('Drama').adjustedAverage).toBeGreaterThan(profile.get('Fantasy').adjustedAverage)
  })

  it('includes CURRENT/WATCHING entries with score > 0 weighted by 0.7', () => {
    const entries = [
      { score: 10, status: 'COMPLETED', media: { genres: ['Action'] } },
      { score: 10, status: 'CURRENT', media: { genres: ['Action'] } },
    ]

    const profile = buildTasteProfile(entries)
    const action = profile.get('Action')

    expect(action).toBeDefined()
    expect(action.scoredCount).toBe(2)
    // real average: (10*1.0 + 10*0.7) / (1.0 + 0.7) = 17 / 1.7 = 10
    expect(action.average).toBe(10)
    // userGlobalAverage = 17 / 1.7 = 10
    expect(action.bayesianAverage).toBe(10)
    // lowerBound penalizes small sample size (n=2)
    expect(action.lowerBound).toBeLessThan(10)
    expect(action.adjustedAverage).toBe(action.lowerBound)
  })

  it('ignores CURRENT/WATCHING entries with score <= 0', () => {
    const entries = [
      { score: 10, status: 'COMPLETED', media: { genres: ['Action'] } },
      { score: 0, status: 'CURRENT', media: { genres: ['Action'] } },
    ]

    const profile = buildTasteProfile(entries)
    // Only 1 valid entry for Action -> MIN_GENRE_COUNT is 2, so Action shouldn't be included
    expect(profile.has('Action')).toBe(false)
  })

  it('completely ignores DROPPED, PAUSED, and PLANNING entries even if they have scores', () => {
    const entries = [
      { score: 10, status: 'COMPLETED', media: { genres: ['Action'] } },
      { score: 10, status: 'DROPPED', media: { genres: ['Action'] } },
      { score: 10, status: 'PAUSED', media: { genres: ['Action'] } },
      { score: 10, status: 'PLANNING', media: { genres: ['Action'] } },
    ]

    const profile = buildTasteProfile(entries)
    // Only 1 completed entry -> Action does not meet MIN_GENRE_COUNT of 2
    expect(profile.has('Action')).toBe(false)
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
      titleObj: {
        english: '',
        romaji: '',
      },
      description: undefined,
      coverImage: '',
      genres: [],
      matchingGenres: [],
      topContributingGenres: [],
      anchorAnimes: [],
      baseTasteScore: null,
      predictionSource: 'community',
      badges: [],
      format: 'OTHER',
      year: null,
      episodes: null,
      status: null,
      predictedScore: 7,
      communityScore: 7,
      siteUrl: 'https://anilist.co/anime/10',
      streamingLinks: [],
      provider: 'anilist',
      planningProviders: [],
      sourceProviders: [],
      providerUrls: {},
    })

    const entry11Result = result.find((r) => r.id === 11)
    expect(entry11Result).toEqual({
      id: 11,
      title: 'Untitled',
      titleObj: {
        english: '',
        romaji: '',
      },
      description: undefined,
      coverImage: '',
      genres: [],
      matchingGenres: [],
      topContributingGenres: [],
      anchorAnimes: [],
      baseTasteScore: null,
      predictionSource: 'community',
      badges: [],
      format: 'OTHER',
      year: null,
      episodes: null,
      status: null,
      predictedScore: 8,
      communityScore: 8,
      siteUrl: 'https://anilist.co/anime/11',
      streamingLinks: [],
      provider: 'anilist',
      planningProviders: [],
      sourceProviders: [],
      providerUrls: {},
    })
  })

  it('calculates predicted score from matching genre averages and returns predictionSource taste', () => {
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

    // Taste average: (5 + 9) / 2 = 7.0
    // Community score: 8.0
    // Hybrid: 7.0 * 0.85 + 8.0 * 0.15 = 5.95 + 1.2 = 7.15
    expect(result[0].predictedScore).toBe(7.15)
    expect(result[0].baseTasteScore).toBe(7)
    expect(result[0].predictionSource).toBe('taste')
    expect(result[0].matchingGenres).toEqual([
      { genre: 'Action', score: 5 },
      { genre: 'Adventure', score: 9 },
    ])
  })

  it('uses community averageScore as fallback when no genres match and sets predictionSource community', () => {
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
    expect(result[0].predictionSource).toBe('community')
    expect(result[0].matchingGenres).toEqual([])
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
    // Base taste: (7.5 + 8.5) / 2 = 8.0
    // Community: 70 / 10 = 7.0
    // Hybrid: 8.0 * 0.85 + 7.0 * 0.15 = 6.8 + 1.05 = 7.85
    expect(result[0].predictedScore).toBe(7.85)
    expect(result[0].baseTasteScore).toBe(8)
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
    // Base taste: 6.0
    // Community: 70 / 10 = 7.0
    // Hybrid: 6.0 * 0.85 + 7.0 * 0.15 = 5.1 + 1.05 = 6.15
    expect(result[0].predictedScore).toBe(6.15)
    expect(result[0].baseTasteScore).toBe(6)
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

  it('respects custom minGenreCount and confidenceConstant options', () => {
    expect(DEFAULT_MIN_GENRE_COUNT).toBe(2)
    expect(DEFAULT_CONFIDENCE_CONSTANT).toBe(25)

    const entries = [
      { score: 9, media: { genres: ['Sci-Fi'] } },
    ]

    // Default requires 2 scored animes -> Sci-Fi excluded
    const defaultProfile = buildTasteProfile(entries)
    expect(defaultProfile.has('Sci-Fi')).toBe(false)

    // With minGenreCount = 1 -> Sci-Fi included
    const customProfile = buildTasteProfile(entries, { minGenreCount: 1, confidenceConstant: 5 })
    expect(customProfile.has('Sci-Fi')).toBe(true)
    expect(customProfile.get('Sci-Fi').count).toBe(1)
  })

  it('extracts topContributingGenres and anchorAnimes from matching genres', () => {
    const profile = new Map([
      [
        'Sci-Fi',
        {
          average: 9.0,
          adjustedAverage: 8.8,
          sourceAnimes: [
            { id: 101, title: 'Steins;Gate', score: 10, coverImage: 'sg.jpg' },
            { id: 102, title: 'Psycho-Pass', score: 8, coverImage: 'pp.jpg' },
          ],
        },
      ],
      [
        'Drama',
        {
          average: 8.5,
          adjustedAverage: 8.2,
          sourceAnimes: [
            { id: 103, title: 'Monster', score: 9.5, coverImage: 'm.jpg' },
            { id: 101, title: 'Steins;Gate', score: 10, coverImage: 'sg.jpg' }, // duplicata de anime em outro genero
          ],
        },
      ],
    ])

    const planning = [
      {
        media: {
          id: 50,
          title: { english: 'Cyberpunk', romaji: 'Cyberpunk' },
          genres: ['Sci-Fi', 'Drama', 'Comedy'],
          averageScore: 82,
        },
      },
    ]

    const result = scoreRecommendations(planning, profile)
    expect(result).toHaveLength(1)
    
    // topContributingGenres ordenados por score decrescente
    expect(result[0].topContributingGenres).toEqual([
      { genre: 'Sci-Fi', score: 8.8 },
      { genre: 'Drama', score: 8.2 },
    ])

    // anchorAnimes ordenados por nota decrescente, sem duplicatas e maximo 3
    expect(result[0].anchorAnimes).toEqual([
      { id: 101, title: 'Steins;Gate', score: 10, coverImage: 'sg.jpg' },
      { id: 103, title: 'Monster', score: 9.5, coverImage: 'm.jpg' },
      { id: 102, title: 'Psycho-Pass', score: 8, coverImage: 'pp.jpg' },
    ])
  })

  describe('DISCOVERY badge (Out of Comfort Zone)', () => {
    const discoveryProfile = new Map([
      ['Action', { average: 8.5, adjustedAverage: 8.2, count: 60, scoredCount: 50 }],
      ['Fantasy', { average: 8.3, adjustedAverage: 8.0, count: 45, scoredCount: 40 }],
      ['Mystery', { average: 8.8, adjustedAverage: 7.4, count: 6, scoredCount: 5 }],
      ['Sports', { average: 7.2, adjustedAverage: 6.8, count: 4, scoredCount: 4 }],
    ])

    it('assigns DISCOVERY when anime has >=1 promising genre (scoredCount <= 15, average >= 8.0), >=50% low-watched genres, and communityScore >= 7.5', () => {
      const planning = [
        {
          media: {
            id: 201,
            title: { english: 'Odd Taxi' },
            genres: ['Mystery', 'Psychological'],
            averageScore: 86,
          },
        },
        {
          media: {
            id: 202,
            title: { english: 'Action Mystery Mix' },
            genres: ['Action', 'Mystery'],
            averageScore: 78,
          },
        },
      ]

      const result = scoreRecommendations(planning, discoveryProfile)
      const oddTaxi = result.find((r) => r.id === 201)
      const mix = result.find((r) => r.id === 202)

      expect(oddTaxi.badges).toContain('DISCOVERY')
      expect(mix.badges).toContain('DISCOVERY')
    })

    it('does NOT assign DISCOVERY when majority (>50%) of genres are high-watched comfort zone genres', () => {
      const planning = [
        {
          media: {
            id: 203,
            title: { english: 'Comfort Zone Heavy' },
            genres: ['Action', 'Fantasy', 'Mystery'],
            averageScore: 85,
          },
        },
      ]

      const result = scoreRecommendations(planning, discoveryProfile)
      expect(result[0].badges).not.toContain('DISCOVERY')
    })

    it('does NOT assign DISCOVERY when low-watched genre has real average < 8.0 or communityScore < 7.5', () => {
      const planning = [
        {
          media: {
            id: 204,
            title: { english: 'Low Real Average' },
            genres: ['Sports'],
            averageScore: 85,
          },
        },
        {
          media: {
            id: 205,
            title: { english: 'Low Community Score' },
            genres: ['Mystery'],
            averageScore: 70,
          },
        },
      ]

      const result = scoreRecommendations(planning, discoveryProfile)
      expect(result.find((r) => r.id === 204).badges).not.toContain('DISCOVERY')
      expect(result.find((r) => r.id === 205).badges).not.toContain('DISCOVERY')
    })

    it('assigns DISCOVERY via fallback when predictionSource is community, genres is non-empty, and communityScore >= 8.0', () => {
      const planning = [
        {
          media: {
            id: 206,
            title: { english: 'Acclaimed Unexplored' },
            genres: ['Mecha', 'Music'],
            averageScore: 82,
          },
        },
        {
          media: {
            id: 207,
            title: { english: 'Mediocre Unexplored' },
            genres: ['Mecha'],
            averageScore: 78,
          },
        },
      ]

      const result = scoreRecommendations(planning, discoveryProfile)
      expect(result.find((r) => r.id === 206).badges).toContain('DISCOVERY')
      expect(result.find((r) => r.id === 207).badges).not.toContain('DISCOVERY')
    })
  })
})

