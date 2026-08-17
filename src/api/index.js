import { fetchAllLists as anilistFetchAll, clearUserCache as anilistClearCache } from "./providers/anilist.js"
import { kitsuFetchAll, clearKitsuCache } from './providers/kitsu.js'
import { malFetchAll, clearMalCache } from './providers/mal.js'

export * from './errors.js'

const SUPPORTED_PROVIDERS = ["anilist", "kitsu", "mal"]

export async function fetchUserEntries(username, provider = "anilist", options = {}) {
  if (!SUPPORTED_PROVIDERS.includes(provider)) {
    throw new Error(`Provedor "${provider}" não é suportado.`)
  }

  if (provider === "anilist") {
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

export function clearProviderCache(username, provider = "anilist") {
  if (provider === "anilist") {
    anilistClearCache(username)
  }
  if (provider === 'kitsu') {
    clearKitsuCache(username)
  }
  if (provider === 'mal') {
    clearMalCache(username)
  }
}


