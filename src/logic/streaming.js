export const STREAMING_SERVICES = [
  'Crunchyroll',
  'Netflix',
  'Prime Video',
  'Disney+',
  'Max',
  'HIDIVE',
]

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

export function applyStreamingBoost(recommendations = [], userSubscriptions = [], boostAmount = 0.3) {
  if (!userSubscriptions || userSubscriptions.length === 0 || !boostAmount) {
    return recommendations
  }
  return recommendations.map((rec) => {
    const isAvailable = matchesUserSubscriptions(rec, userSubscriptions)
    if (!isAvailable) return rec
    const originalScore = rec.predictedScore ?? 0
    const boostedScore = Math.round((originalScore + boostAmount) * 100) / 100
    return {
      ...rec,
      predictedScore: boostedScore,
      hasStreamingBoost: true,
    }
  })
}
