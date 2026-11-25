export const STREAMING_SERVICES = [
  'Crunchyroll',
  'Netflix',
  'Prime Video',
  'Disney+',
  'Max',
  'HIDIVE',
]

export const STREAMING_BOOST_MULTIPLIER = 1.02

const NORMALIZATION_MAP = {
  crunchyroll: 'Crunchyroll',
  netflix: 'Netflix',
  'prime video': 'Prime Video',
  'amazon prime video': 'Prime Video',
  amazon: 'Prime Video',
  'disney+': 'Disney+',
  'disney plus': 'Disney+',
  disney: 'Disney+',
  max: 'Max',
  'hbo max': 'Max',
  hbo: 'Max',
  hidive: 'HIDIVE',
}

export function isSafeExternalUrl(url) {
  if (typeof url !== 'string') return false
  return /^https?:\/\//i.test(url.trim())
}

const REGION_BLOCKED_SITES_BR = new Set([
  'hulu',
  'youtube',
  'vrv',
  'funimation',
  'animelab',
  'wakanim',
  'bilibili',
  'iqiyi',
])

export function isPlatformAvailableInRegion(siteName, region = 'BR') {
  if (!siteName || typeof siteName !== 'string') return false
  const lower = siteName.toLowerCase().trim()
  if (region === 'BR' || region === 'pt-BR') {
    if (REGION_BLOCKED_SITES_BR.has(lower)) return false
  }
  return true
}

export function filterRegionalStreamingLinks(links = [], region = 'BR') {
  if (!Array.isArray(links)) return []
  return links.filter((link) => link?.site && isPlatformAvailableInRegion(link.site, region))
}

export function normalizeServiceName(name) {
  if (!name || typeof name !== 'string') return ''
  const lower = name.toLowerCase().trim()
  return NORMALIZATION_MAP[lower] || name.trim()
}

export function getAnimeStreamingServices(anime) {
  if (!anime) return []
  const links = anime.streamingLinks || anime.media?.streamingLinks || []
  const services = new Set()
  for (const link of links) {
    if (link?.site) {
      services.add(normalizeServiceName(link.site))
    }
  }
  return Array.from(services)
}

export function matchesUserSubscriptions(anime, userSubscriptions = []) {
  if (!userSubscriptions || userSubscriptions.length === 0 || !anime) return false
  const animeServices = getAnimeStreamingServices(anime)
  return animeServices.some((service) => userSubscriptions.includes(service))
}

export function applyStreamingBoost(
  recommendations = [],
  userSubscriptions = [],
  boostMultiplier = STREAMING_BOOST_MULTIPLIER
) {
  if (
    !Array.isArray(recommendations) ||
    !userSubscriptions ||
    userSubscriptions.length === 0 ||
    !boostMultiplier ||
    boostMultiplier <= 1.0
  ) {
    return Array.isArray(recommendations) ? recommendations : []
  }
  return recommendations.map((rec) => {
    if (!rec) return rec
    const isAvailable = matchesUserSubscriptions(rec, userSubscriptions)
    if (!isAvailable) return rec
    return {
      ...rec,
      hasStreamingBoost: true,
    }
  })
}
