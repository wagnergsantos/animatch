import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  useImageFallback,
  extractMalId,
  getUiAvatarUrl,
  jikanImageCache,
} from './useImageFallback.js'

describe('useImageFallback', () => {
  beforeEach(() => {
    jikanImageCache.clear()
    vi.restoreAllMocks()
  })

  it('extractMalId identifies malId from anime structures', () => {
    expect(extractMalId({ idMal: 1234 })).toBe(1234)
    expect(extractMalId({ media: { idMal: 5678 } })).toBe(5678)
    expect(extractMalId({ provider: 'mal', id: 999 })).toBe(999)
    expect(extractMalId({ provider: 'anilist', id: 100 })).toBeNull()
    expect(extractMalId(null)).toBeNull()
  })

  it('getUiAvatarUrl formats sanitized dynamic avatar URL', () => {
    const url = getUiAvatarUrl('Steins;Gate 0')
    expect(url).toContain('https://ui-avatars.com/api/?name=SteinsGate%200')
    expect(url).toContain('background=1e293b')
  })

  it('initializes in Tier 1 with original coverImage', () => {
    const anime = {
      title: 'Anime Alpha',
      coverImage: 'https://cdn.anilist.co/alpha.jpg',
    }

    const { result } = renderHook(() => useImageFallback(anime))

    expect(result.current.tier).toBe(1)
    expect(result.current.currentSrc).toBe('https://cdn.anilist.co/alpha.jpg')
    expect(result.current.isError).toBe(false)
  })

  it('falls back to Tier 2 (Jikan API) on error when malId is present', async () => {
    const anime = {
      title: 'Monster',
      idMal: 19,
      coverImage: 'https://broken.cdn/monster.jpg',
    }

    const mockJikanResponse = {
      data: {
        images: {
          jpg: {
            large_image_url: 'https://cdn.myanimelist.net/monster_large.jpg',
          },
        },
      },
    }

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockJikanResponse,
    })

    const { result } = renderHook(() => useImageFallback(anime))

    await act(async () => {
      await result.current.handleImageError()
    })

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://api.jikan.moe/v4/anime/19',
      expect.objectContaining({ signal: expect.any(Object) })
    )
    expect(result.current.tier).toBe(2)
    expect(result.current.currentSrc).toBe('https://cdn.myanimelist.net/monster_large.jpg')
    expect(jikanImageCache.get(19)).toBe('https://cdn.myanimelist.net/monster_large.jpg')
  })

  it('falls back to Tier 3 (UI Avatars) if Jikan fails', async () => {
    const anime = {
      title: 'Unknown Series',
      idMal: 404,
      coverImage: 'https://broken.cdn/unknown.jpg',
    }

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
    })

    const { result } = renderHook(() => useImageFallback(anime))

    await act(async () => {
      await result.current.handleImageError()
    })

    expect(result.current.tier).toBe(3)
    expect(result.current.currentSrc).toContain('https://ui-avatars.com/api/?name=Unknown%20Series')
  })

  it('falls back directly to Tier 3 when no malId is present', async () => {
    const anime = {
      title: 'No Mal Anime',
      coverImage: 'https://broken.cdn/nomal.jpg',
    }

    const { result } = renderHook(() => useImageFallback(anime))

    await act(async () => {
      await result.current.handleImageError()
    })

    expect(result.current.tier).toBe(3)
    expect(result.current.currentSrc).toContain('https://ui-avatars.com/api/?name=No%20Mal%20Anime')
  })

  it('falls back to Tier 4 (static fallback / isError = true) when Tier 3 errors', async () => {
    const anime = {
      title: 'Offline Anime',
      coverImage: 'https://broken.cdn/offline.jpg',
    }

    const { result } = renderHook(() => useImageFallback(anime))

    // Tier 1 -> Tier 3
    await act(async () => {
      await result.current.handleImageError()
    })
    expect(result.current.tier).toBe(3)

    // Tier 3 -> Tier 4
    await act(async () => {
      await result.current.handleImageError()
    })
    expect(result.current.tier).toBe(4)
    expect(result.current.currentSrc).toBeNull()
    expect(result.current.isError).toBe(true)
  })

  it('reuses jikanImageCache without calling fetch twice for the same malId', async () => {
    jikanImageCache.set(777, 'https://cached.cdn/cached_777.jpg')
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const anime = {
      title: 'Cached Anime',
      idMal: 777,
      coverImage: 'https://broken.cdn/cached.jpg',
    }

    const { result } = renderHook(() => useImageFallback(anime))

    await act(async () => {
      await result.current.handleImageError()
    })

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(result.current.tier).toBe(2)
    expect(result.current.currentSrc).toBe('https://cached.cdn/cached_777.jpg')
  })
})
