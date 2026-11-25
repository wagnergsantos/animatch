import { STORAGE_KEYS } from './storageKeys.js'

/**
 * Detects the initial language:
 * 1. Explicitly stored language in localStorage.
 * 2. Browser user agent preference:
 *    - startsWith 'pt' -> 'pt-BR'
 *    - startsWith 'ja' -> 'ja'
 *    - any other -> 'en'
 */
export function detectBrowserLanguage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(STORAGE_KEYS.LANG)
      if (stored) return stored
    }
  } catch {
    // ignore
  }

  const nav = (
    (typeof navigator !== 'undefined' &&
      (navigator.languages?.[0] || navigator.language || navigator.userLanguage)) ||
    ''
  ).toLowerCase()

  if (nav.startsWith('pt')) return 'pt-BR'
  if (nav.startsWith('ja')) return 'ja'
  return 'en'
}
