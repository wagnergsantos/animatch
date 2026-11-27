import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getCachedSynopsis,
  setCachedSynopsis,
  translateSynopsis,
} from './synopsisTranslator.js'

describe('synopsisTranslator', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear()
    }
    vi.restoreAllMocks()
  })

  it('stores and retrieves cached synopsis in memory and localStorage', () => {
    const id = 123
    const originalText = 'A great anime about adventure.'
    const translated = 'Um ótimo anime sobre aventura.'

    expect(getCachedSynopsis(id, originalText, 'pt-BR')).toBeNull()

    setCachedSynopsis(id, originalText, translated, 'pt-BR')
    expect(getCachedSynopsis(id, originalText, 'pt-BR')).toBe(translated)
  })

  it('fetches translation from /api/translate when not cached', async () => {
    const mockTranslated = 'Sinopse traduzida com sucesso.'
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        translatedText: mockTranslated,
        source: 'workers-ai',
      }),
    })

    const res = await translateSynopsis('Original synopsis in English.', {
      animeId: 456,
      title: 'One Piece',
      targetLang: 'pt-BR',
    })

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      '/api/translate',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Requested-With': 'Animatch-Client',
        }),
      })
    )
    expect(res.translatedText).toBe(mockTranslated)
    expect(res.source).toBe('workers-ai')

    // Second call should come from cache
    const cachedRes = await translateSynopsis('Original synopsis in English.', {
      animeId: 456,
      targetLang: 'pt-BR',
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(cachedRes.source).toBe('cache')
    expect(cachedRes.translatedText).toBe(mockTranslated)
  })

  it('throws descriptive error when fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: 'Muitas requisições' }),
    })

    await expect(
      translateSynopsis('Some text to translate.', { animeId: 789 })
    ).rejects.toThrow('Muitas requisições')
  })

  it('handles empty text gracefully', async () => {
    const res = await translateSynopsis('')
    expect(res.translatedText).toBe('')
    expect(res.source).toBe('empty')
  })
})
