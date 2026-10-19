import { supabaseClient } from '../supabase.js'
import { DEFAULT_CACHE_TTL } from './apiCache.js'

const pendingSyncTimers = new Map()

/**
 * Obtém o userId autenticado na sessão local do Supabase sem bloquear se não houver sessão.
 * @returns {Promise<string|null>}
 */
export async function getAuthenticatedUserId() {
  try {
    if (!supabaseClient?.auth?.getSession) return null
    const { data } = await supabaseClient.auth.getSession()
    return data?.session?.user?.id || null
  } catch {
    return null
  }
}

/**
 * Busca a lista sincronizada na nuvem (`user_anime_lists`) para um `(userId, provider, username)`.
 *
 * @param {string} userId
 * @param {string} provider
 * @param {string} username
 * @param {number} [ttlMs=DEFAULT_CACHE_TTL]
 * @returns {Promise<{ entries: object[], timestamp: number, isFresh: boolean, isStale: boolean } | null>}
 */
export async function fetchCloudAnimeList(
  userId,
  provider,
  username,
  ttlMs = DEFAULT_CACHE_TTL
) {
  if (!userId || !provider || !username) return null
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null

  try {
    const normProvider = String(provider).trim().toLowerCase()
    const normUsername = String(username).trim().toLowerCase()

    const { data, error } = await supabaseClient
      .from('user_anime_lists')
      .select('entries, updated_at')
      .eq('user_id', userId)
      .eq('provider', normProvider)
      .eq('username', normUsername)
      .single()

    if (error || !data || !Array.isArray(data.entries) || data.entries.length === 0) {
      return null
    }

    const parsedTime = data.updated_at ? new Date(data.updated_at).getTime() : NaN
    const timestamp = Number.isFinite(parsedTime) ? parsedTime : Date.now()
    const isFresh = Date.now() - timestamp < ttlMs

    return {
      entries: data.entries,
      timestamp,
      isFresh,
      isStale: !isFresh,
    }
  } catch {
    return null
  }
}

/**
 * Sincroniza a lista de animes no Supabase em segundo plano (debounced, last-write-wins).
 *
 * @param {string} userId
 * @param {string} provider
 * @param {string} username
 * @param {object[]} entries
 * @param {number} [debounceMs=500]
 * @returns {Promise<boolean>}
 */
export function scheduleCloudAnimeListSync(
  userId,
  provider,
  username,
  entries,
  debounceMs = 500
) {
  if (!userId || !provider || !username || !Array.isArray(entries) || entries.length === 0) {
    return Promise.resolve(false)
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return Promise.resolve(false)
  }

  const normProvider = String(provider).trim().toLowerCase()
  const normUsername = String(username).trim().toLowerCase()
  const timerKey = `${userId}:${normProvider}:${normUsername}`

  if (pendingSyncTimers.has(timerKey)) {
    clearTimeout(pendingSyncTimers.get(timerKey))
  }

  return new Promise((resolve) => {
    const timer = setTimeout(async () => {
      pendingSyncTimers.delete(timerKey)
      try {
        if (typeof navigator !== 'undefined' && navigator.onLine === false) {
          resolve(false)
          return
        }

        const { error } = await supabaseClient.from('user_anime_lists').upsert({
          user_id: userId,
          provider: normProvider,
          username: normUsername,
          entries,
          updated_at: new Date().toISOString(),
        })

        resolve(!error)
      } catch {
        resolve(false)
      }
    }, debounceMs)

    pendingSyncTimers.set(timerKey, timer)
  })
}
