import { supabaseClient } from '../../supabase.js'
import { UserNotFoundError, RetryableError, NonRetryableError, RateLimitError } from '../errors.js'
import { readCache, writeCache, clearCache, DEFAULT_CACHE_TTL } from '../../cache/apiCache.js'
import { CACHE_PREFIXES } from '../../lib/storageKeys.js'

const CACHE_PREFIX = CACHE_PREFIXES.MAL
const CACHE_TTL = DEFAULT_CACHE_TTL // 6 horas

export function clearMalCache(username) {
  clearCache(CACHE_PREFIX + username.toLowerCase())
}

async function invokeProxy(username, status) {
  const { data, error } = await supabaseClient.functions.invoke('mal-proxy', {
    body: { username, status },
  })

  if (error) throw new RetryableError(error.message ?? 'Erro ao conectar com o MyAnimeList.')
  if (data?.error) {
    const errMsg = data.error
    if (errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('não encontrado')) {
      throw new UserNotFoundError('MyAnimeList')
    }
    if (errMsg.includes('429') || errMsg.toLowerCase().includes('muitas requisições')) {
      const retryAfterSec = Number.parseInt(data.retryAfter, 10)
      const retryMinutes =
        Number.isFinite(retryAfterSec) && retryAfterSec > 0 ? Math.max(1, Math.ceil(retryAfterSec / 60)) : 1
      throw new RateLimitError('MyAnimeList', retryMinutes, { statusCode: 429, isRetryable: false })
    }
    throw new NonRetryableError(errMsg)
  }

  return data?.data ?? []
}

export async function malFetchAll(username, options = {}) {
  const { forceRefresh = false } = options
  const cacheKey = CACHE_PREFIX + username.toLowerCase()

  if (!forceRefresh) {
    const cached = readCache(cacheKey, CACHE_TTL)
    if (Array.isArray(cached)) return cached
  }

  // Busca todos os status em paralelo
  const [completedEntries, planningEntries, watchingEntries, onHoldEntries, droppedEntries] = await Promise.all([
    invokeProxy(username, 'completed'),
    invokeProxy(username, 'plan_to_watch'),
    invokeProxy(username, 'watching'),
    invokeProxy(username, 'on_hold'),
    invokeProxy(username, 'dropped'),
  ])

  const all = [...completedEntries, ...planningEntries, ...watchingEntries, ...onHoldEntries, ...droppedEntries]

  // Deduplicar por media.id e filtrar conteúdo adulto (+18)
  const seen = new Set()
  const entries = all.filter((entry) => {
    const media = entry?.media
    const id = media?.id
    if (!id || seen.has(id)) return false
    if (media?.isAdult === true || media?.nsfw === 'black') return false
    if (Array.isArray(media?.genres) && media.genres.some((g) => g === 'Hentai' || g === 'Erotica')) {
      return false
    }
    seen.add(id)
    return true
  })

  writeCache(cacheKey, entries)

  return entries
}
