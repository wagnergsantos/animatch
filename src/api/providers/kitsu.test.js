import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

beforeEach(() => {
  mockFetch.mockReset()
  localStorage.clear()
})

// Importar após setup do mock
import { kitsuFetchAll, clearKitsuCache } from './kitsu.js'

describe('kitsuFetchAll', () => {
  it('throws when user is not found on Kitsu', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] }),
    })

    await expect(kitsuFetchAll('nonexistentuser')).rejects.toThrow(
      'Usuário não encontrado no Kitsu.'
    )
  })

  it('fetches user ID then library entries and normalizes to AnimeEntry format', async () => {
    // 1st call: user lookup
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [{ id: '12345', type: 'users', attributes: { name: 'testuser' } }],
      }),
    })

    // 2nd call: library-entries
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [
          {
            id: '100',
            type: 'libraryEntries',
            attributes: { status: 'completed', ratingTwenty: 16 },
            relationships: {
              anime: { data: { type: 'anime', id: '999' } },
            },
          },
        ],
        included: [
          {
            id: '999',
            type: 'anime',
            attributes: {
              canonicalTitle: 'Steins;Gate',
              titles: { en: 'Steins;Gate', en_jp: 'Steins;Gate' },
              episodeCount: 24,
              status: 'finished',
              subtype: 'TV',
              startDate: '2011-04-06',
              averageRating: '89.23',
              posterImage: { large: 'https://media.kitsu.io/anime/poster/999/large.jpg' },
              description: 'A sci-fi thriller about time travel.',
            },
            relationships: {
              categories: { data: [{ type: 'categories', id: 'c1' }, { type: 'categories', id: 'c2' }] },
              streamingLinks: { data: [{ type: 'streamingLinks', id: 'sl1' }] },
            },
          },
          {
            id: 'c1',
            type: 'categories',
            attributes: { title: 'Sci-Fi', isVanilla: true },
          },
          {
            id: 'c2',
            type: 'categories',
            attributes: { title: 'Germany', isVanilla: false },
          },
          {
            id: 'sl1',
            type: 'streamingLinks',
            attributes: { url: 'https://www.crunchyroll.com/steins-gate' },
            relationships: {
              streamer: { data: { type: 'streamers', id: 'st1' } },
            },
          },
          {
            id: 'st1',
            type: 'streamers',
            attributes: { siteName: 'Crunchyroll' },
          },
        ],
        links: {},
      }),
    })

    const result = await kitsuFetchAll('testuser')

    expect(result).toHaveLength(1)
    expect(result[0].status).toBe('COMPLETED')
    expect(result[0].score).toBe(8) // ratingTwenty 16 / 2 = 8.0
    expect(result[0].media.id).toBe(999)
    expect(result[0].media.provider).toBe('kitsu')
    expect(result[0].media.title.english).toBe('Steins;Gate')
    expect(result[0].media.title.romaji).toBe('Steins;Gate')
    expect(result[0].media.episodes).toBe(24)
    expect(result[0].media.status).toBe('FINISHED')
    expect(result[0].media.format).toBe('TV')
    expect(result[0].media.seasonYear).toBe(2011)
    expect(result[0].media.startDate).toEqual({ year: 2011, month: 4, day: 6 })
    expect(result[0].media.genres).toEqual(['Sci-Fi', 'Germany'])
    expect(result[0].media.averageScore).toBe(89)
    expect(result[0].media.coverImage.large).toBe('https://media.kitsu.io/anime/poster/999/large.jpg')
    expect(result[0].media.siteUrl).toBe('https://kitsu.io/anime/999')
    expect(result[0].media.description).toBe('A sci-fi thriller about time travel.')
    expect(result[0].media.streamingLinks).toEqual([
      { site: 'Crunchyroll', url: 'https://www.crunchyroll.com/steins-gate' },
    ])
  })



  it('maps Kitsu library statuses correctly', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [{ id: '1', type: 'users', attributes: { name: 'user' } }],
      }),
    })

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: '1', type: 'libraryEntries', attributes: { status: 'planned', ratingTwenty: null }, relationships: { anime: { data: { type: 'anime', id: '101' } } } },
          { id: '2', type: 'libraryEntries', attributes: { status: 'current', ratingTwenty: 10 }, relationships: { anime: { data: { type: 'anime', id: '102' } } } },
          { id: '3', type: 'libraryEntries', attributes: { status: 'on_hold', ratingTwenty: 12 }, relationships: { anime: { data: { type: 'anime', id: '103' } } } },
          { id: '4', type: 'libraryEntries', attributes: { status: 'dropped', ratingTwenty: 4 }, relationships: { anime: { data: { type: 'anime', id: '104' } } } },
        ],
        included: [
          { id: '101', type: 'anime', attributes: { canonicalTitle: 'Anime 1', titles: {}, episodeCount: 12, status: 'current', subtype: 'TV', startDate: '2024-01-01', averageRating: '75.0', posterImage: { large: '' }, description: '' }, relationships: { categories: { data: [] }, streamingLinks: { data: [] } } },
          { id: '102', type: 'anime', attributes: { canonicalTitle: 'Anime 2', titles: {}, episodeCount: 12, status: 'finished', subtype: 'movie', startDate: '2023-06-15', averageRating: '80.0', posterImage: { large: '' }, description: '' }, relationships: { categories: { data: [] }, streamingLinks: { data: [] } } },
          { id: '103', type: 'anime', attributes: { canonicalTitle: 'Anime 3', titles: {}, episodeCount: 12, status: 'upcoming', subtype: 'OVA', startDate: null, averageRating: null, posterImage: { large: '' }, description: '' }, relationships: { categories: { data: [] }, streamingLinks: { data: [] } } },
          { id: '104', type: 'anime', attributes: { canonicalTitle: 'Anime 4', titles: {}, episodeCount: 6, status: 'unreleased', subtype: 'special', startDate: null, averageRating: '60.0', posterImage: { large: '' }, description: '' }, relationships: { categories: { data: [] }, streamingLinks: { data: [] } } },
        ],
        links: {},
      }),
    })

    const result = await kitsuFetchAll('user')

    expect(result[0].status).toBe('PLANNING')
    expect(result[0].score).toBe(0) // null ratingTwenty -> 0
    expect(result[1].status).toBe('CURRENT')
    expect(result[1].score).toBe(5) // 10 / 2 = 5
    expect(result[1].media.format).toBe('MOVIE')
    expect(result[2].status).toBe('PAUSED')
    expect(result[2].media.status).toBe('NOT_YET_RELEASED')
    expect(result[3].status).toBe('DROPPED')
    expect(result[3].media.status).toBe('NOT_YET_RELEASED')
    expect(result[3].media.format).toBe('SPECIAL')
  })

  it('throws on HTTP 500 with Portuguese error message', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Server Error')),
    })

    await expect(kitsuFetchAll('testuser')).rejects.toThrow('Erro ao conectar com o Kitsu.')
  })

  it('handles pagination with links.next', async () => {
    // 1st: user lookup
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [{ id: '1', type: 'users', attributes: { name: 'user' } }],
      }),
    })

    // 2nd: first page of library entries
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: '1', type: 'libraryEntries', attributes: { status: 'completed', ratingTwenty: 20 }, relationships: { anime: { data: { type: 'anime', id: '101' } } } },
        ],
        included: [
          { id: '101', type: 'anime', attributes: { canonicalTitle: 'Anime 1', titles: {}, episodeCount: 12, status: 'finished', subtype: 'TV', startDate: '2024-01-01', averageRating: '85.0', posterImage: { large: '' }, description: '' }, relationships: { categories: { data: [] }, streamingLinks: { data: [] } } },
        ],
        links: { next: 'https://kitsu.io/api/edge/library-entries?page[offset]=500' },
      }),
    })

    // 3rd: second page (no more pages)
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: '2', type: 'libraryEntries', attributes: { status: 'planned', ratingTwenty: null }, relationships: { anime: { data: { type: 'anime', id: '102' } } } },
        ],
        included: [
          { id: '102', type: 'anime', attributes: { canonicalTitle: 'Anime 2', titles: {}, episodeCount: 24, status: 'finished', subtype: 'TV', startDate: '2023-01-01', averageRating: '78.0', posterImage: { large: '' }, description: '' }, relationships: { categories: { data: [] }, streamingLinks: { data: [] } } },
        ],
        links: {},
      }),
    })

    const result = await kitsuFetchAll('user')

    expect(result).toHaveLength(2)
    expect(mockFetch).toHaveBeenCalledTimes(3) // user + page1 + page2
  })

  it('uses localStorage cache on consecutive calls within TTL', async () => {
    // First call - user lookup
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [{ id: '1', type: 'users', attributes: { name: 'cached' } }],
      }),
    })

    // First call - library entries
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: [
          { id: '1', type: 'libraryEntries', attributes: { status: 'completed', ratingTwenty: 18 }, relationships: { anime: { data: { type: 'anime', id: '101' } } } },
        ],
        included: [
          { id: '101', type: 'anime', attributes: { canonicalTitle: 'Cached Anime', titles: {}, episodeCount: 12, status: 'finished', subtype: 'TV', startDate: '2024-01-01', averageRating: '90.0', posterImage: { large: '' }, description: '' }, relationships: { categories: { data: [] }, streamingLinks: { data: [] } } },
        ],
        links: {},
      }),
    })

    const firstCall = await kitsuFetchAll('cached')
    expect(firstCall).toHaveLength(1)
    expect(mockFetch).toHaveBeenCalledTimes(2)

    // Second call should use cache
    const secondCall = await kitsuFetchAll('cached')
    expect(secondCall).toEqual(firstCall)
    expect(mockFetch).toHaveBeenCalledTimes(2) // no additional fetches
  })
})

describe('clearKitsuCache', () => {
  it('removes correct localStorage key', () => {
    localStorage.setItem('animatch_kitsu_cache_user', 'data')
    clearKitsuCache('user')
    expect(localStorage.getItem('animatch_kitsu_cache_user')).toBeNull()
  })
})

