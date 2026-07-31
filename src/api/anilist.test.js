import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchCompletedList, fetchPlanningList } from './anilist.js'

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

  it('throws an error when user is not found', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        errors: [{ message: 'User not found', status: 404 }],
      }),
    })

    await expect(fetchCompletedList('nonexistent')).rejects.toThrow('Usuário não encontrado no AniList.')
  })

  it('throws an error when the list is private', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        errors: [{ message: 'Private', status: 403 }],
      }),
    })

    await expect(fetchCompletedList('privateuser')).rejects.toThrow('A lista deste usuário é privada.')
  })

  it('throws on rate limit (HTTP 429)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
    })

    await expect(fetchCompletedList('testuser')).rejects.toThrow('O AniList está temporariamente indisponível.')
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
  })

  it('returns empty array when user has no planning list', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
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
