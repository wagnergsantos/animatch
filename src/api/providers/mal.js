import { supabaseClient } from '../../supabase.js'

const CACHE_PREFIX = 'animatch_mal_cache_'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

export function clearMalCache(username) {
  try {
    localStorage.removeItem(CACHE_PREFIX + username.toLowerCase())
  } catch (e) {
    // Ignore
  }
}

async function invokeProxy(username, status) {
  const { data, error } = await supabaseClient.functions.invoke('mal-proxy', {
    body: { username, status },
  })

  if (error) throw new Error(error.message ?? 'Erro ao conectar com o MyAnimeList.')
  if (data?.error) throw new Error(data.error)

  return data?.data ?? []
}

export async function malFetchAll(username, options = {}) {
  const { forceRefresh = false } = options
  const cacheKey = CACHE_PREFIX + username.toLowerCase()

  if (!forceRefresh) {
    try {
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        const { timestamp, entries } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_TTL && Array.isArray(entries)) {
          return entries
        }
      }
    } catch (e) {
      // Ignore cache read error
    }
  }

  // Busca completed e plan_to_watch em paralelo
  const [completedEntries, planningEntries] = await Promise.all([
    invokeProxy(username, 'completed'),
    invokeProxy(username, 'plan_to_watch'),
  ])

  const all = [...completedEntries, ...planningEntries]

  // Deduplicar por media.id
  const seen = new Set()
  const entries = all.filter((entry) => {
    const id = entry?.media?.id
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })

  try {
    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), entries }))
  } catch (e) {
    // Ignore quota exceeded
  }

  return entries
}
