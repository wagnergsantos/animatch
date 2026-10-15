/**
 * Pure ensemble logic for cross-provider anime catalog merging and recommendation boosting.
 */

const STATUS_PRIORITY = {
  COMPLETED: 5,
  CURRENT: 4,
  WATCHING: 4,
  PAUSED: 3,
  ON_HOLD: 3,
  DROPPED: 2,
  PLANNING: 1,
  PLAN_TO_WATCH: 1,
  PLANNED: 1,
}

const CANONICAL_STATUS = {
  COMPLETED: 'COMPLETED',
  CURRENT: 'CURRENT',
  WATCHING: 'CURRENT',
  PAUSED: 'PAUSED',
  ON_HOLD: 'PAUSED',
  DROPPED: 'DROPPED',
  PLANNING: 'PLANNING',
  PLAN_TO_WATCH: 'PLANNING',
  PLANNED: 'PLANNING',
}

/**
 * Normalizes an anime entry or media object into a canonical key.
 *
 * @param {object} anime - Anime entry or Media object
 * @returns {string} Canonical key: 'mal:<id>' or 'title:<cleanTitle>_<year>'
 */
export function normalizeAnimeKey(anime) {
  if (!anime) return 'title:unknown_any'

  const media = anime.media || anime
  const idMal = media?.idMal ?? anime?.idMal

  if (idMal != null && Number(idMal) > 0) {
    return `mal:${idMal}`
  }

  const provider = media?.provider ?? anime?.provider
  const id = media?.id ?? anime?.id
  if (provider === 'mal' && id != null && Number(id) > 0) {
    return `mal:${id}`
  }

  const rawTitle =
    media?.title?.english ||
    media?.title?.romaji ||
    media?.title?.userPreferred ||
    media?.title?.canonicalTitle ||
    (typeof media?.title === 'string' ? media?.title : '') ||
    anime?.title?.english ||
    anime?.title?.romaji ||
    anime?.title?.userPreferred ||
    anime?.title?.canonicalTitle ||
    (typeof anime?.title === 'string' ? anime?.title : '') ||
    ''

  const cleanTitle = rawTitle.toLowerCase().replace(/[^a-z0-9]/g, '')

  const year =
    media?.seasonYear ??
    media?.year ??
    media?.startDate?.year ??
    anime?.seasonYear ??
    anime?.year ??
    anime?.startDate?.year ??
    'any'

  return `title:${cleanTitle || 'unknown'}_${year || 'any'}`
}

/**
 * Extracts all non-empty clean titles (english, romaji, userPreferred, canonicalTitle) for an anime.
 *
 * @param {object} entry - Anime entry or Media object
 * @returns {Set<string>} Set of clean alphanumeric lowercase titles
 */
function extractTitles(entry) {
  const media = entry?.media || entry || {}
  const titles = new Set()
  const candidates = [
    media?.title?.english,
    media?.title?.romaji,
    media?.title?.userPreferred,
    media?.title?.canonicalTitle,
    typeof media?.title === 'string' ? media?.title : null,
    entry?.title?.english,
    entry?.title?.romaji,
    entry?.title?.userPreferred,
    entry?.title?.canonicalTitle,
    typeof entry?.title === 'string' ? entry?.title : null,
  ]
  for (const c of candidates) {
    if (typeof c === 'string') {
      const clean = c.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (clean) titles.add(clean)
    }
  }
  return titles
}

/**
 * Extracts normalized metadata (malId, cleanTitles, year) for cross-provider alignment.
 *
 * @param {object} entry - Anime entry
 * @returns {{ malId: string|null, titles: Set<string>, year: number|null }}
 */
function extractAnimeMeta(entry) {
  const media = entry?.media || entry || {}
  const idMal = media?.idMal ?? entry?.idMal

  let malId = null
  if (idMal != null && Number(idMal) > 0) {
    malId = String(idMal)
  } else if ((media?.provider === 'mal' || entry?.provider === 'mal') && (media?.id || entry?.id)) {
    const rawId = media?.id ?? entry?.id
    if (rawId != null && Number(rawId) > 0) {
      malId = String(rawId)
    }
  }

  const titles = extractTitles(entry)

  const rawYear =
    media?.seasonYear ??
    media?.year ??
    media?.startDate?.year ??
    entry?.seasonYear ??
    entry?.year ??
    entry?.startDate?.year ??
    null

  const year = rawYear ? Number(rawYear) : null

  return { malId, titles, year }
}

/**
 * Calculates a completeness score for a media object to prioritize richer metadata.
 *
 * @param {object} entry - Anime entry
 * @returns {number} Completeness score
 */
function getMediaCompletenessScore(entry) {
  const media = entry?.media || entry || {}
  let score = 0
  if (media.description && typeof media.description === 'string' && media.description.trim()) score += 3
  if (media.coverImage?.large || (typeof media.coverImage === 'string' && media.coverImage)) score += 2
  if (Array.isArray(media.genres) && media.genres.length > 0) score += 1
  if (media.episodes) score += 1
  if (media.averageScore) score += 1
  if (media.format) score += 1
  if (media.bannerImage) score += 1
  if (media.siteUrl) score += 1
  return score
}

/**
 * Merges anime entries from multiple providers into a unified canonical catalog.
 *
 * @param {Record<string, object[]>} entriesByProvider - Dictionary mapping provider name to anime entries
 * @returns {object[]} Merged array of anime entries
 */
export function mergeAnimeEntries(entriesByProvider = {}) {
  if (!entriesByProvider || typeof entriesByProvider !== 'object') {
    return []
  }

  const groups = []
  const keyToGroup = new Map()

  for (const [provider, entries] of Object.entries(entriesByProvider)) {
    if (!Array.isArray(entries)) continue

    for (const entry of entries) {
      if (!entry) continue
      const canonicalKey = normalizeAnimeKey(entry)
      const meta = extractAnimeMeta(entry)

      let group = keyToGroup.get(canonicalKey)

      if (!group) {
        // Try to find a compatible existing group by MAL ID or title & year
        for (const existingGroup of groups) {
          if (meta.malId && existingGroup.malIds.has(meta.malId)) {
            group = existingGroup
            break
          }

          const hasSharedTitle = Array.from(meta.titles).some((t) => existingGroup.titles.has(t))
          if (hasSharedTitle) {
            const yearCompatible =
              meta.year == null ||
              existingGroup.years.size === 0 ||
              existingGroup.years.has(meta.year)

            const malCompatible =
              meta.malId == null ||
              existingGroup.malIds.size === 0 ||
              existingGroup.malIds.has(meta.malId)

            if (yearCompatible && malCompatible) {
              group = existingGroup
              break
            }
          }
        }
      }

      if (!group) {
        group = {
          items: [],
          providers: new Set(),
          planningProviders: new Set(),
          canonicalKeys: new Set(),
          malIds: new Set(),
          titles: new Set(),
          years: new Set(),
        }
        groups.push(group)
      }

      group.canonicalKeys.add(canonicalKey)
      keyToGroup.set(canonicalKey, group)

      if (meta.malId) group.malIds.add(meta.malId)
      for (const t of meta.titles) group.titles.add(t)
      if (meta.year) group.years.add(meta.year)

      group.items.push({ entry, provider })
      group.providers.add(provider)

      const statusUpper = (entry.status || '').toUpperCase()
      if (statusUpper === 'PLANNING' || statusUpper === 'PLAN_TO_WATCH' || statusUpper === 'PLANNED') {
        group.planningProviders.add(provider)
      }
    }
  }

  const merged = []

  for (const group of groups) {
    // 1. Status resolution: highest priority status wins
    let bestStatus = 'PLANNING'
    let maxPriority = 0

    for (const { entry } of group.items) {
      const s = (entry.status || 'PLANNING').toUpperCase()
      const prio = STATUS_PRIORITY[s] || 1
      if (prio > maxPriority) {
        maxPriority = prio
        bestStatus = CANONICAL_STATUS[s] || s
      }
    }

    // 2. User score averaging: arithmetic average of personal scores > 0
    let scoreSum = 0
    let scoreCount = 0
    for (const { entry } of group.items) {
      const score = Number(entry.score) || 0
      if (score > 0) {
        scoreSum += score
        scoreCount += 1
      }
    }
    const finalScore = scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 100) / 100 : 0

    // 3. Metadata fusion: pick base media from most complete entry
    let bestEntry = group.items[0].entry
    let bestScore = -1
    for (const { entry } of group.items) {
      const score = getMediaCompletenessScore(entry)
      if (score > bestScore) {
        bestScore = score
        bestEntry = entry
      }
    }

    const baseMedia = bestEntry.media || bestEntry || {}

    // Title fusion: merge title.english and title.romaji across entries
    let mergedTitle = {}
    if (typeof baseMedia.title === 'object' && baseMedia.title !== null) {
      mergedTitle = { ...baseMedia.title }
    } else if (typeof baseMedia.title === 'string' && baseMedia.title) {
      mergedTitle = { english: baseMedia.title, romaji: baseMedia.title }
    }

    for (const { entry } of group.items) {
      const m = entry.media || entry || {}
      if (typeof m.title === 'object' && m.title !== null) {
        if (!mergedTitle.english && m.title.english) mergedTitle.english = m.title.english
        if (!mergedTitle.romaji && m.title.romaji) mergedTitle.romaji = m.title.romaji
        if (!mergedTitle.userPreferred && m.title.userPreferred) mergedTitle.userPreferred = m.title.userPreferred
        if (!mergedTitle.canonicalTitle && m.title.canonicalTitle) mergedTitle.canonicalTitle = m.title.canonicalTitle
      } else if (typeof m.title === 'string' && m.title) {
        if (!mergedTitle.english) mergedTitle.english = m.title
        if (!mergedTitle.romaji) mergedTitle.romaji = m.title
      }
    }

    // Deduplicated genres
    const genresSet = new Set()
    for (const { entry } of group.items) {
      const genres = entry.media?.genres || entry.genres || []
      if (Array.isArray(genres)) {
        for (const g of genres) {
          if (typeof g === 'string' && g.trim()) {
            genresSet.add(g.trim())
          }
        }
      }
    }

    // Deduplicated streaming links by site (from streamingLinks and externalLinks)
    const streamingMap = new Map()
    for (const { entry } of group.items) {
      const links = entry.media?.streamingLinks || entry.streamingLinks || []
      if (Array.isArray(links)) {
        for (const link of links) {
          if (link?.site && !streamingMap.has(link.site)) {
            streamingMap.set(link.site, link)
          }
        }
      }

      const externalLinks = entry.media?.externalLinks || entry.externalLinks || []
      if (Array.isArray(externalLinks)) {
        for (const link of externalLinks) {
          if (link?.site && link?.type === 'STREAMING' && !streamingMap.has(link.site)) {
            streamingMap.set(link.site, { site: link.site, url: link.url })
          }
        }
      }
    }

    const mergedMedia = {
      ...baseMedia,
      title: mergedTitle,
      genres: Array.from(genresSet),
      streamingLinks: Array.from(streamingMap.values()),
    }

    // Fill missing properties from other entries
    for (const { entry } of group.items) {
      const m = entry.media || entry || {}
      if (!mergedMedia.description && m.description) mergedMedia.description = m.description
      if (!mergedMedia.coverImage && m.coverImage) mergedMedia.coverImage = m.coverImage
      if (!mergedMedia.bannerImage && m.bannerImage) mergedMedia.bannerImage = m.bannerImage
      if (!mergedMedia.episodes && m.episodes) mergedMedia.episodes = m.episodes
      if (!mergedMedia.format && m.format) mergedMedia.format = m.format
      if (!mergedMedia.status && m.status) mergedMedia.status = m.status
      if (!mergedMedia.averageScore && m.averageScore) mergedMedia.averageScore = m.averageScore
      if (!mergedMedia.seasonYear && m.seasonYear) mergedMedia.seasonYear = m.seasonYear
      if (!mergedMedia.startDate && m.startDate) mergedMedia.startDate = m.startDate
      if (!mergedMedia.idMal && m.idMal) mergedMedia.idMal = m.idMal
    }

    const providerUrls = {}
    for (const { entry, provider } of group.items) {
      const m = entry.media || entry || {}
      const url = m.siteUrl || entry.siteUrl
      if (url) {
        providerUrls[provider] = url
      } else if (provider === 'anilist' && (m.id || entry.id)) {
        providerUrls[provider] = `https://anilist.co/anime/${m.id || entry.id}`
      } else if (provider === 'kitsu' && (m.id || entry.id)) {
        providerUrls[provider] = `https://kitsu.io/anime/${m.id || entry.id}`
      } else if (provider === 'mal' && (m.id || entry.id || m.idMal || entry.idMal)) {
        providerUrls[provider] = `https://myanimelist.net/anime/${m.id || entry.id || m.idMal || entry.idMal}`
      }
    }
    if (!providerUrls.mal && mergedMedia.idMal) {
      providerUrls.mal = `https://myanimelist.net/anime/${mergedMedia.idMal}`
    }

    mergedMedia.providerUrls = providerUrls

    const mergedEntry = {
      ...bestEntry,
      status: bestStatus,
      score: finalScore,
      planningProviders: Array.from(group.planningProviders),
      sourceProviders: Array.from(group.providers),
      providerUrls,
      media: mergedMedia,
    }

    merged.push(mergedEntry)
  }

  return merged
}

/**
 * Boosts predicted scores for planning recommendations that are present in multiple providers.
 *
 * @param {object[]} recommendations - Array of recommendation items
 * @param {number} [k=0.05] - Multiplier step factor per additional provider
 * @returns {object[]} Recommendations with boosted predicted scores and presenceMultiplier attached
 */
export function applyMultiPresenceBoost(recommendations = [], k = 0.05) {
  if (!Array.isArray(recommendations)) return []

  return recommendations.map((rec) => {
    if (!rec) return rec
    const providersCount = Array.isArray(rec.planningProviders) ? rec.planningProviders.length : 1
    if (providersCount <= 1) {
      return { ...rec, presenceMultiplier: 1.0 }
    }

    const multiplier = 1 + k * (providersCount - 1)
    const base = rec.predictedScore ?? rec.communityScore ?? 0
    const boosted = Math.min(10.0, Math.round(base * multiplier * 100) / 100)

    return {
      ...rec,
      predictedScore: boosted,
      presenceMultiplier: Math.round(multiplier * 100) / 100,
    }
  })
}
