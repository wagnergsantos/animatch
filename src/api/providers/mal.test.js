import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../supabase.js', () => ({
  supabaseClient: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))

import { supabaseClient } from '../../supabase.js'
import { malFetchAll, clearMalCache } from './mal.js'

const CACHE_PREFIX = 'animatch_mal_cache_'

function makeEntry(overrides = {}) {
  return {
    status: 'COMPLETED',
    score: 8,
    media: {
      id: 1,
      provider: 'mal',
      title: { romaji: 'Test Anime', english: 'Test Anime' },
      genres: ['Action', 'Adventure'],
      averageScore: 85,
      episodes: 12,
      status: 'FINISHED',
      format: 'TV',
      seasonYear: 2020,
      startDate: { year: 2020, month: 4, day: 1 },
      coverImage: { large: 'https://cdn.mal.co/img.jpg' },
      siteUrl: 'https://myanimelist.net/anime/1',
      description: 'Test',
      streamingLinks: [],
    },
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
})

describe('malFetchAll', () => {
  it('retorna entries normalizadas do Edge Function', async () => {
    const mockEntries = [makeEntry(), makeEntry({ status: 'PLANNING', media: { ...makeEntry().media, id: 2 } })]
    supabaseClient.functions.invoke
      .mockResolvedValueOnce({ data: { data: mockEntries.filter(e => e.status === 'COMPLETED') }, error: null })
      .mockResolvedValueOnce({ data: { data: mockEntries.filter(e => e.status === 'PLANNING') }, error: null })
      .mockResolvedValueOnce({ data: { data: [] }, error: null })
      .mockResolvedValueOnce({ data: { data: [] }, error: null })
      .mockResolvedValueOnce({ data: { data: [] }, error: null })

    const result = await malFetchAll('testuser')

    expect(result).toHaveLength(2)
    expect(result[0].media.provider).toBe('mal')
    expect(supabaseClient.functions.invoke).toHaveBeenCalledTimes(5)
  })

  it('retorna cache quando TTL não expirou', async () => {
    const cached = [makeEntry()]
    localStorage.setItem(
      CACHE_PREFIX + 'testuser',
      JSON.stringify({ timestamp: Date.now(), entries: cached })
    )

    const result = await malFetchAll('testuser')

    expect(result).toEqual(cached)
    expect(supabaseClient.functions.invoke).not.toHaveBeenCalled()
  })

  it('ignora cache expirado e busca novamente', async () => {
    const cached = [makeEntry()]
    localStorage.setItem(
      CACHE_PREFIX + 'testuser',
      JSON.stringify({ timestamp: Date.now() - 10 * 60 * 1000, entries: cached })
    )

    const fresh = [makeEntry(), makeEntry({ media: { ...makeEntry().media, id: 99 } })]
    supabaseClient.functions.invoke
      .mockResolvedValueOnce({ data: { data: fresh.slice(0, 1) }, error: null })
      .mockResolvedValueOnce({ data: { data: [] }, error: null })
      .mockResolvedValueOnce({ data: { data: [] }, error: null })
      .mockResolvedValueOnce({ data: { data: [] }, error: null })
      .mockResolvedValueOnce({ data: { data: [] }, error: null })

    const result = await malFetchAll('testuser')
    expect(result).toHaveLength(1)
    expect(supabaseClient.functions.invoke).toHaveBeenCalled()
  })

  it('força refresh com forceRefresh: true', async () => {
    const cached = [makeEntry()]
    localStorage.setItem(
      CACHE_PREFIX + 'testuser',
      JSON.stringify({ timestamp: Date.now(), entries: cached })
    )

    supabaseClient.functions.invoke
      .mockResolvedValueOnce({ data: { data: [] }, error: null })
      .mockResolvedValueOnce({ data: { data: [] }, error: null })
      .mockResolvedValueOnce({ data: { data: [] }, error: null })
      .mockResolvedValueOnce({ data: { data: [] }, error: null })
      .mockResolvedValueOnce({ data: { data: [] }, error: null })

    await malFetchAll('testuser', { forceRefresh: true })
    expect(supabaseClient.functions.invoke).toHaveBeenCalled()
  })

  it('lança erro quando usuário não encontrado', async () => {
    supabaseClient.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'Usuário não encontrado no MyAnimeList.' },
    })

    await expect(malFetchAll('noexist')).rejects.toThrow('Usuário não encontrado no MyAnimeList.')
  })

  it('lança erro quando lista é privada', async () => {
    supabaseClient.functions.invoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'A lista deste usuário é privada.' },
    })

    await expect(malFetchAll('privateuser')).rejects.toThrow('A lista deste usuário é privada.')
  })

  it('deduplica entries com mesmo id', async () => {
    const dup = [makeEntry(), makeEntry()] // mesmo id=1
    supabaseClient.functions.invoke
      .mockResolvedValueOnce({ data: { data: dup }, error: null })
      .mockResolvedValueOnce({ data: { data: [] }, error: null })
      .mockResolvedValueOnce({ data: { data: [] }, error: null })
      .mockResolvedValueOnce({ data: { data: [] }, error: null })
      .mockResolvedValueOnce({ data: { data: [] }, error: null })

    const result = await malFetchAll('testuser')
    expect(result).toHaveLength(1)
  })
})

describe('clearMalCache', () => {
  it('remove cache do localStorage', () => {
    localStorage.setItem(CACHE_PREFIX + 'testuser', 'x')
    clearMalCache('testuser')
    expect(localStorage.getItem(CACHE_PREFIX + 'testuser')).toBeNull()
  })
})
