/**
 * synopsisTranslator.js
 * Serviço de tradução de sinopses para o Animatch.
 * Consome a Cloudflare Function /api/translate com cache em memória e localStorage.
 */

const memoryCache = new Map()
const STORAGE_PREFIX = 'animatch_synopsis_'

/**
 * Gera uma chave única para o cache de tradução baseada no id ou texto e idioma.
 */
function getCacheKey(id, text, targetLang = 'pt-BR') {
  if (id) {
    return `${STORAGE_PREFIX}${targetLang}_${id}`
  }
  // Fallback hash simples
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash |= 0
  }
  return `${STORAGE_PREFIX}${targetLang}_h${hash}`
}

/**
 * Lê do cache (memória ou localStorage)
 */
export function getCachedSynopsis(id, text, targetLang = 'pt-BR') {
  if (!text) return null
  const key = getCacheKey(id, text, targetLang)

  if (memoryCache.has(key)) {
    return memoryCache.get(key)
  }

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored) {
        memoryCache.set(key, stored)
        return stored
      }
    } catch {
      // Ignora erro de localStorage
    }
  }

  return null
}

/**
 * Salva no cache
 */
export function setCachedSynopsis(id, text, translatedText, targetLang = 'pt-BR') {
  if (!text || !translatedText) return
  const key = getCacheKey(id, text, targetLang)

  memoryCache.set(key, translatedText)

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(key, translatedText)
    } catch {
      // localStorage pode estar cheio, silenciosamente ignora
    }
  }
}

/**
 * Requisita tradução ao endpoint /api/translate.
 *
 * @param {string} text - Texto original em inglês
 * @param {object} [options]
 * @param {string} [options.targetLang='pt-BR']
 * @param {string|number} [options.animeId]
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ translatedText: string, source: string }>}
 */
export async function translateSynopsis(text, options = {}) {
  const { targetLang = 'pt-BR', animeId = null, signal = null } = options

  if (!text || typeof text !== 'string') {
    return { translatedText: '', source: 'empty' }
  }

  // Checa cache primeiro
  const cached = getCachedSynopsis(animeId, text, targetLang)
  if (cached) {
    return { translatedText: cached, source: 'cache' }
  }

  const response = await fetch('/api/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      targetLang,
      animeId,
    }),
    signal,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `HTTP ${response.status}`)
  }

  const data = await response.json()
  const translated = data?.translatedText?.trim() || ''

  if (translated) {
    setCachedSynopsis(animeId, text, translated, targetLang)
  }

  return {
    translatedText: translated || text,
    source: data?.source || 'workers-ai',
  }
}
