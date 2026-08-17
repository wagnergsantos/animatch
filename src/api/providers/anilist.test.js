import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchCompletedList, fetchPlanningList, fetchAllLists, flattenEntries } from './anilist.js'
import { UserNotFoundError, PrivateListError, RateLimitError, NonRetryableError, RetryableError } from '../errors.js'


const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
})

describe('fetchCompletedList', () => {
  it('returns flat array of entries from a successful response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          MediaListCollection: {
            lists: [
              {
                entries: [
                  {
                    score: 8.5,
                    media: {
                      id: 1,
                      title: { romaji: 'Shingeki no Kyojin', english: 'Attack on Titan' },
                      genres: ['Action', 'Drama'],
                      coverImage: { large: 'https://img.example.com/aot.jpg' },
                    },
                  },
                  {
                    score: 0,
                    media: {
                      id: 2,
                      title: { romaji: 'Naruto', english: 'Naruto' },
                      genres: ['Action', 'Adventure'],
                      coverImage: { large: 'https://img.example.com/naruto.jpg' },
                    },
                  },
                ],
              },
            ],
          },
        },
      }),
    })

    const result = await fetchCompletedList('testuser')

    expect(result).toHaveLength(2)
    expect(result[0].score).toBe(8.5)
    expect(result[0].media.title.english).toBe('Attack on Titan')
    expect(result[1].score).toBe(0)
  })

  it('throws UserNotFoundError when user is not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({
        errors: [{ message: 'User not found', status: 404 }],
      }),
    })

    await expect(fetchCompletedList('nonexistent')).rejects.toThrow(UserNotFoundError)
  })

  it('throws RateLimitError when response status is HTTP 403', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({
        errors: [{ message: 'Forbidden', status: 403 }],
      }),
    })

    await expect(fetchCompletedList('privateuser')).rejects.toThrow(RateLimitError)
  })

  it('throws UserNotFoundError when GraphQL error status is 404', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        errors: [{ message: 'Not Found', status: 404 }],
      }),
    })

    await expect(fetchCompletedList('nonexistent')).rejects.toThrow(UserNotFoundError)
  })

  it('throws PrivateListError when GraphQL error status indicates private list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        errors: [{ message: 'Private', status: 403 }],
      }),
    })

    await expect(fetchCompletedList('privateuser')).rejects.toThrow(PrivateListError)
  })

  it('throws NonRetryableError message for other GraphQL errors', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        errors: [{ message: 'Internal GraphQL Error' }],
      }),
    })

    await expect(fetchCompletedList('testuser')).rejects.toThrow(NonRetryableError)
  })

  it('throws RetryableError connection error on non-429/404/403 HTTP error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Invalid JSON')),
    })

    await expect(fetchCompletedList('testuser')).rejects.toThrow(RetryableError)
  })

  it('throws NonRetryableError on rate limit (HTTP 429)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    })

    await expect(fetchCompletedList('testuser')).rejects.toThrow(NonRetryableError)
  })
})

describe('fetchPlanningList', () => {
  it('returns flat array of entries from a successful response', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          MediaListCollection: {
            lists: [
              {
                entries: [
                  {
                    media: {
                      id: 10,
                      title: { romaji: 'Made in Abyss', english: 'Made in Abyss' },
                      genres: ['Adventure', 'Fantasy'],
                      coverImage: { large: 'https://img.example.com/mia.jpg' },
                      averageScore: 84,
                      popularity: 120000,
                      siteUrl: 'https://anilist.co/anime/10',
                    },
                  },
                ],
              },
            ],
          },
        },
      }),
    })

    const result = await fetchPlanningList('testuser')

    expect(result).toHaveLength(1)
    expect(result[0].media.averageScore).toBe(84)
    expect(result[0].media.siteUrl).toBe('https://anilist.co/anime/10')
  })

  it('returns empty array when user has no planning list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        data: {
          MediaListCollection: {
            lists: [],
          },
        },
      }),
    })

    const result = await fetchPlanningList('testuser')

    expect(result).toEqual([])
  })
})

describe('fetchAllLists', () => {
  it('returns flat array of entries across all lists with metadata', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          MediaListCollection: {
            lists: [
              {
                name: 'Completed',
                status: 'COMPLETED',
                entries: [
                  {
                    status: 'COMPLETED',
                    score: 9.0,
                    media: {
                      id: 1,
                      title: { romaji: 'Frieren', english: 'Frieren: Beyond Journey\'s End' },
                      format: 'TV',
                      episodes: 28,
                      seasonYear: 2023,
                      startDate: { year: 2023, month: 9, day: 29 },
                      genres: ['Adventure', 'Drama', 'Fantasy'],
                      coverImage: { large: 'https://img.example.com/frieren.jpg' },
                      averageScore: 91,
                      popularity: 150000,
                      siteUrl: 'https://anilist.co/anime/1',
                    },
                  },
                ],
              },
              {
                name: 'Planning',
                status: 'PLANNING',
                entries: [
                  {
                    status: 'PLANNING',
                    score: 0,
                    media: {
                      id: 2,
                      title: { romaji: 'Dungeon Meshi', english: 'Delicious in Dungeon' },
                      format: 'TV',
                      episodes: 24,
                      seasonYear: 2024,
                      startDate: { year: 2024, month: 1, day: 4 },
                      genres: ['Comedy', 'Fantasy'],
                      coverImage: { large: 'https://img.example.com/dunmeshi.jpg' },
                      averageScore: 86,
                      popularity: 90000,
                      siteUrl: 'https://anilist.co/anime/2',
                    },
                  },
                ],
              },
            ],
          },
        },
      }),
    })

    const result = await fetchAllLists('testuser')

    expect(result).toHaveLength(2)
    expect(result[0].status).toBe('COMPLETED')
    expect(result[0].score).toBe(9.0)
    expect(result[0].media.format).toBe('TV')
    expect(result[0].media.episodes).toBe(28)
    expect(result[0].media.seasonYear).toBe(2023)
    expect(result[0].media.startDate).toEqual({ year: 2023, month: 9, day: 29 })
    expect(result[1].status).toBe('PLANNING')
    expect(result[1].media.averageScore).toBe(86)
  })

  it('throws an error when user is not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: () => Promise.resolve({
        errors: [{ message: 'User not found', status: 404 }],
      }),
    })

    await expect(fetchAllLists('nonexistent')).rejects.toThrow('Usuário não encontrado no AniList.')
  })

  it('throws an error when the list is private (HTTP 403)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () => Promise.resolve({
        errors: [{ message: 'Private', status: 403 }],
      }),
    })

    await expect(fetchAllLists('privateuser')).rejects.toThrow('A lista deste usuário é privada.')
  })

  it('returns empty array when user has no lists', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        data: {
          MediaListCollection: {
            lists: [],
          },
        },
      }),
    })

    const result = await fetchAllLists('testuser')
    expect(result).toEqual([])
  })

  it('uses localStorage cache on consecutive calls within TTL', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          MediaListCollection: {
            lists: [{ entries: [{ status: 'COMPLETED', media: { id: 100, title: { english: 'Cached Anime' } } }] }],
          },
        },
      }),
    })

    const firstCall = await fetchAllLists('cacheduser')
    expect(firstCall).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledTimes(1)

    // Second call should return cached data without calling fetch again
    const secondCall = await fetchAllLists('cacheduser')
    expect(secondCall).toEqual(firstCall)
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('bypasses cache when forceRefresh option is true', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        data: {
          MediaListCollection: {
            lists: [{ entries: [{ status: 'COMPLETED', media: { id: 100, title: { english: 'Anime' } } }] }],
          },
        },
      }),
    })

    await fetchAllLists('refresheduser')
    expect(mockFetch).toHaveBeenCalledTimes(1)

    await fetchAllLists('refresheduser', { forceRefresh: true })
    expect(mockFetch).toHaveBeenCalledTimes(2)
  })
})


describe('flattenEntries', () => {
  it('returns empty array when receiving null', () => {
    expect(flattenEntries(null)).toEqual([])
  })

  it('returns empty array when MediaListCollection is null', () => {
    expect(flattenEntries({ MediaListCollection: null })).toEqual([])
  })

  it('deduplicates entries by media.id', () => {
    const data = {
      MediaListCollection: {
        lists: [
          {
            entries: [
              { media: { id: 1, title: { romaji: 'Anime 1' } } },
              { media: { id: 2, title: { romaji: 'Anime 2' } } },
            ]
          },
          {
            entries: [
              { media: { id: 2, title: { romaji: 'Anime 2' } } }, // Duplicate
              { media: { id: 3, title: { romaji: 'Anime 3' } } },
            ]
          }
        ]
      }
    }
    const result = flattenEntries(data)
    expect(result).toHaveLength(3)
    expect(result.map(e => e.media.id)).toEqual([1, 2, 3])
  })
})


