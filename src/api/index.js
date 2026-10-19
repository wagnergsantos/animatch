import { fetchAllLists as anilistFetchAll, clearUserCache as anilistClearCache } from './providers/anilist.js'
import { kitsuFetchAll, clearKitsuCache } from './providers/kitsu.js'
import { malFetchAll, clearMalCache } from './providers/mal.js'
import { UserNotFoundError, PrivateListError } from './errors.js'
import {
  readIdbCache,
  writeIdbCache,
  clearIdbCache,
  buildProviderCacheKey,
} from '../cache/idbCache.js'
import {
  fetchCloudAnimeList,
  scheduleCloudAnimeListSync,
  getAuthenticatedUserId,
} from '../cache/cloudListSync.js'

export * from './errors.js'

const SUPPORTED_PROVIDERS = ['anilist', 'kitsu', 'mal']

/**
 * Anexa metadados de cache não-enumeráveis ao array de entries para manter
 * 100% de compatibilidade com `Array.isArray` e `toEqual([...])`.
 *
 * @param {object[]} entries
 * @param {{ source: string, isStale: boolean, timestamp: number }} meta
 * @returns {object[]}
 */
export function attachCacheMeta(entries, meta) {
  if (!Array.isArray(entries)) return entries
  try {
    Object.defineProperty(entries, '_cacheMeta', {
      value: meta,
      enumerable: false,
      configurable: true,
      writable: true,
    })
  } catch {
    // ignore if frozen
  }
  return entries
}

async function callProviderAdapter(username, provider, options) {
  if (provider === 'anilist') {
    return anilistFetchAll(username, options)
  }
  if (provider === 'kitsu') {
    return kitsuFetchAll(username, options)
  }
  if (provider === 'mal') {
    return malFetchAll(username, options)
  }
  throw new Error(`Provedor "${provider}" ainda não foi implementado.`)
}

export async function fetchUserEntries(username, provider = 'anilist', options = {}) {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new Error(`Provedor "${provider}" não é suportado.`)
  }

  const cacheKey = buildProviderCacheKey(provider, username)
  const localCached = await readIdbCache(cacheKey)
  let cloudRecord = null
  let resolvedUserId = options.userId ?? null

  if (!options.forceRefresh) {
    if (localCached?.isFresh && Array.isArray(localCached.value)) {
      // Garante em background que o cache local existente também seja salvo no Supabase (ex.: MAL já em cache local ao recarregar)
      Promise.resolve(resolvedUserId || getAuthenticatedUserId())
        .then((uid) => {
          if (uid && localCached.value.length > 0) {
            scheduleCloudAnimeListSync(uid, provider, username, localCached.value)
          }
        })
        .catch(() => {})

      return attachCacheMeta(localCached.value, {
        source: localCached.source || 'idb',
        isStale: false,
        timestamp: localCached.timestamp,
      })
    }

    if (!resolvedUserId) {
      resolvedUserId = await getAuthenticatedUserId()
    }

    if (resolvedUserId) {
      cloudRecord = await fetchCloudAnimeList(resolvedUserId, provider, username)
      if (cloudRecord?.isFresh && Array.isArray(cloudRecord.entries)) {
        await writeIdbCache(cacheKey, cloudRecord.entries, {
          timestamp: cloudRecord.timestamp,
          provider,
          username,
        })
        return attachCacheMeta(cloudRecord.entries, {
          source: 'cloud',
          isStale: false,
          timestamp: cloudRecord.timestamp,
        })
      }
    }
  }

  try {
    const entries = await callProviderAdapter(username, provider, options)

    if (Array.isArray(entries) && entries.length > 0) {
      const now = Date.now()
      await writeIdbCache(cacheKey, entries, {
        timestamp: now,
        provider,
        username,
      })

      if (!resolvedUserId) {
        resolvedUserId = await getAuthenticatedUserId()
      }
      if (resolvedUserId) {
        scheduleCloudAnimeListSync(resolvedUserId, provider, username, entries)
      }
    }

    return attachCacheMeta(entries, {
      source: 'network',
      isStale: false,
      timestamp: Date.now(),
    })
  } catch (err) {
    if (err instanceof UserNotFoundError || err instanceof PrivateListError) {
      throw err
    }

    if (!cloudRecord && !resolvedUserId) {
      resolvedUserId = await getAuthenticatedUserId()
    }
    if (!cloudRecord && resolvedUserId) {
      cloudRecord = await fetchCloudAnimeList(resolvedUserId, provider, username)
    }

    const candidates = []
    if (localCached && Array.isArray(localCached.value) && localCached.value.length > 0) {
      candidates.push({
        entries: localCached.value,
        timestamp: localCached.timestamp || 0,
        source: 'stale-idb',
      })
    }
    if (cloudRecord && Array.isArray(cloudRecord.entries) && cloudRecord.entries.length > 0) {
      candidates.push({
        entries: cloudRecord.entries,
        timestamp: cloudRecord.timestamp || 0,
        source: 'stale-cloud',
      })
    }

    if (candidates.length > 0) {
      candidates.sort((a, b) => b.timestamp - a.timestamp)
      const best = candidates[0]
      if (best.source === 'stale-idb' && resolvedUserId && !cloudRecord) {
        scheduleCloudAnimeListSync(resolvedUserId, provider, username, best.entries)
      }
      return attachCacheMeta(best.entries, {
        source: best.source,
        isStale: true,
        timestamp: best.timestamp,
      })
    }

    throw err
  }
}

export function clearProviderCache(username, provider = 'anilist') {
  const cacheKey = buildProviderCacheKey(provider, username)
  clearIdbCache(cacheKey)

  if (provider === 'anilist') {
    anilistClearCache(username)
  }
  if (provider === 'kitsu') {
    clearKitsuCache(username)
  }
  if (provider === 'mal') {
    clearMalCache(username)
  }
}
