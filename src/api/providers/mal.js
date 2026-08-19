import { supabaseClient } from '../../supabase.js'
import { UserNotFoundError, RetryableError, NonRetryableError } from '../errors.js'
import { readCache, writeCache, clearCache } from '../../cache/apiCache.js'

const CACHE_PREFIX = 'animatch_mal_cache_'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

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

  // Deduplicar por media.id
  const seen = new Set()
  const entries = all.filter((entry) => {
    const id = entry?.media?.id
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })

  writeCache(cacheKey, entries)

  return entries
}
