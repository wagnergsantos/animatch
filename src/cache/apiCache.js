/**
 * Cache de resposta de API em `localStorage`, com TTL e eviction LRU por
 * índice. Extraído do padrão que estava duplicado (quase idêntico) em
 * `src/api/providers/{anilist,kitsu,mal}.js` — cada provider reimplementava
 * seu próprio `getItem`/`setItem`/`JSON.parse` com TTL, sem eviction.
 *
 * Resolve dois problemas do pré-spec original:
 * - A6 (duplicação): um só lugar implementa o padrão, os providers só chamam.
 * - A1 (crescimento sem limite): um índice (`animatch_cache_index`) guarda
 *   no máximo `MAX_CACHED_USERS` chaves; ao exceder, remove a mais antiga
 *   (LRU) antes de gravar a nova, em vez de acumular para sempre.
 */

const INDEX_KEY = 'animatch_cache_index'
const MAX_CACHED_USERS = 15 // mesmo teto usado por recentUsers em App.jsx

function readIndex() {
  try {
    const raw = localStorage.getItem(INDEX_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeIndex(index) {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index))
  } catch {
    // quota excedida ao gravar o índice — degrada graciosamente: a próxima
    // escrita bem-sucedida volta a manter o teto, não é um erro fatal.
  }
}

/** Move `cacheKey` para o topo do índice (mais recentemente usado) e evicta o mais antigo se passar do teto. */
function touchIndex(cacheKey) {
  const index = readIndex().filter((key) => key !== cacheKey)
  index.push(cacheKey)

  while (index.length > MAX_CACHED_USERS) {
    const oldestKey = index.shift()
    try {
      localStorage.removeItem(oldestKey)
    } catch {
      // ignora — item antigo só continua ocupando espaço até a próxima tentativa
    }
  }

  writeIndex(index)
}

function forgetIndex(cacheKey) {
  writeIndex(readIndex().filter((key) => key !== cacheKey))
}

/**
 * @param {string} cacheKey - chave completa já montada pelo provider (ex.:
 *   `animatch_kitsu_cache_${username}`).
 * @param {number} ttlMs
 * @returns {unknown|null} o valor cacheado dentro do TTL, ou `null` (miss).
 */
export function readCache(cacheKey, ttlMs) {
  try {
    const raw = localStorage.getItem(cacheKey)
    if (!raw) return null
    const { timestamp, value } = JSON.parse(raw)
    if (typeof timestamp !== 'number' || Date.now() - timestamp >= ttlMs) return null
    return value === undefined ? null : value
  } catch {
    return null
  }
}

/** @param {string} cacheKey @param {unknown} value */
export function writeCache(cacheKey, value) {
  try {
    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), value }))
    touchIndex(cacheKey)
  } catch {
    // quota excedida — essa resposta específica simplesmente não fica em cache
  }
}

/** Usado por `clear*Cache()` de cada provider (ex.: forceRefresh manual, logout). */
export function clearCache(cacheKey) {
  try {
    localStorage.removeItem(cacheKey)
  } catch {
    // ignora
  }
  forgetIndex(cacheKey)
}
