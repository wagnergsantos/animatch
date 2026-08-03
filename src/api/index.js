import { fetchAllLists as anilistFetchAll, fetchDubInfo as anilistFetchDub, clearUserCache as anilistClearCache } from "./providers/anilist.js"
import { kitsuFetchAll, kitsuFetchDubInfo, clearKitsuCache } from './providers/kitsu.js'

const SUPPORTED_PROVIDERS = ["anilist", "kitsu"]

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

  throw new Error(`Provedor "${provider}" ainda não foi implementado.`)
}

export async function fetchDubInfo(mediaIds, language = "pt-br", provider = "anilist") {
  if (provider === "anilist") {
    return anilistFetchDub(mediaIds, language)
  }
  if (provider === 'kitsu') {
    return kitsuFetchDubInfo(mediaIds, language)
  }

  return new Map()
}

export function clearProviderCache(username, provider = "anilist") {
  if (provider === "anilist") {
    anilistClearCache(username)
  }
  if (provider === 'kitsu') {
    clearKitsuCache(username)
  }
}

export { DUB_LANGUAGE_MAP } from "./providers/anilist.js"
