import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useTranslatedSynopsis } from './useTranslatedSynopsis.js'
import * as translator from '../api/synopsisTranslator.js'

describe('useTranslatedSynopsis', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.clear()
    }
  })

  it('does not translate when anime has no description', () => {
    const { result } = renderHook(() => useTranslatedSynopsis(null, 'pt-BR'))

    expect(result.current.synopsis).toBe('')
    expect(result.current.isTranslating).toBe(false)
    expect(result.current.isTranslated).toBe(false)
  })

  it('does not translate when locale is not pt', () => {
    const anime = {
      id: 1,
      description: 'The story follows a young ninja who seeks recognition from his peers.',
    }
    const translateSpy = vi.spyOn(translator, 'translateSynopsis')

    const { result } = renderHook(() => useTranslatedSynopsis(anime, 'en'))

    expect(result.current.isTranslating).toBe(false)
    expect(result.current.isTranslated).toBe(false)
    expect(translateSpy).not.toHaveBeenCalled()
  })

  it('automatically translates english synopsis when locale is pt-BR and allows toggle', async () => {
    const anime = {
      id: 2,
      description: 'The story follows a young ninja who seeks recognition from his peers.',
    }

    vi.spyOn(translator, 'translateSynopsis').mockResolvedValue({
      translatedText: 'A história segue um jovem ninja que busca reconhecimento.',
      source: 'workers-ai',
    })

    const { result } = renderHook(() => useTranslatedSynopsis(anime, 'pt-BR'))

    // Initially translating
    expect(result.current.isTranslating).toBe(true)

    await waitFor(() => {
      expect(result.current.isTranslating).toBe(false)
      expect(result.current.isTranslated).toBe(true)
    })

    expect(result.current.synopsis).toBe('A história segue um jovem ninja que busca reconhecimento.')
    expect(result.current.hasTranslation).toBe(true)

    // Toggle to view original
    act(() => {
      result.current.toggleShowOriginal()
    })

    expect(result.current.synopsis).toBe(result.current.originalSynopsis)
    expect(result.current.showOriginal).toBe(true)

    // Toggle back to translated
    act(() => {
      result.current.toggleShowOriginal()
    })

    expect(result.current.synopsis).toBe('A história segue um jovem ninja que busca reconhecimento.')
  })

  it('falls back to original text when translation fails', async () => {
    const anime = {
      id: 3,
      description: 'The story follows a young ninja who seeks recognition from his peers.',
    }

    vi.spyOn(translator, 'translateSynopsis').mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useTranslatedSynopsis(anime, 'pt-BR'))

    await waitFor(() => {
      expect(result.current.isTranslating).toBe(false)
    })

    expect(result.current.isTranslated).toBe(false)
    expect(result.current.translationError).toBe('Network error')
    expect(result.current.synopsis).toContain('The story follows a young ninja')
  })
})
