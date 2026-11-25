import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { detectBrowserLanguage } from './languageDetector.js'
import { STORAGE_KEYS } from './storageKeys.js'

describe('languageDetector', () => {
  const originalNavigator = window.navigator

  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    Object.defineProperty(window, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    })
  })

  it('returns stored language if present in localStorage', () => {
    window.localStorage.setItem(STORAGE_KEYS.LANG, 'ja')
    expect(detectBrowserLanguage()).toBe('ja')
  })

  it('detects pt-BR when browser language starts with pt', () => {
    Object.defineProperty(window, 'navigator', {
      value: { language: 'pt-PT', languages: ['pt-PT', 'pt', 'en'] },
      configurable: true,
      writable: true,
    })
    expect(detectBrowserLanguage()).toBe('pt-BR')
  })

  it('detects ja when browser language starts with ja', () => {
    Object.defineProperty(window, 'navigator', {
      value: { language: 'ja-JP', languages: ['ja-JP', 'ja'] },
      configurable: true,
      writable: true,
    })
    expect(detectBrowserLanguage()).toBe('ja')
  })

  it('defaults to en for English browser language', () => {
    Object.defineProperty(window, 'navigator', {
      value: { language: 'en-US', languages: ['en-US', 'en'] },
      configurable: true,
      writable: true,
    })
    expect(detectBrowserLanguage()).toBe('en')
  })

  it('defaults to en for any other browser language (e.g. es, fr, de)', () => {
    Object.defineProperty(window, 'navigator', {
      value: { language: 'es-ES', languages: ['es-ES', 'es'] },
      configurable: true,
      writable: true,
    })
    expect(detectBrowserLanguage()).toBe('en')

    Object.defineProperty(window, 'navigator', {
      value: { language: 'fr-FR', languages: ['fr-FR'] },
      configurable: true,
      writable: true,
    })
    expect(detectBrowserLanguage()).toBe('en')
  })
})
