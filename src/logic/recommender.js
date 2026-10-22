export const DEFAULT_MIN_GENRE_COUNT = 2
export const DEFAULT_CONFIDENCE_CONSTANT = 25
export const DEFAULT_SCORE_STD_DEV = 1.2
export const CONFIDENCE_Z = 1.96
export const WATCHING_SCORE_WEIGHT = 0.7
export const DISCOVERY_MAX_SCORED_COUNT = 15
export const DISCOVERY_MIN_REAL_AVERAGE = 8.0
export const DISCOVERY_MIN_COMMUNITY_SCORE = 7.5
export const DISCOVERY_FALLBACK_COMMUNITY_SCORE = 8.0

export function resolveYear(item) {
  if (!item) return null
  return (
    item?.year ??
    item?.seasonYear ??
    item?.startDate?.year ??
    item?.media?.year ??
    item?.media?.seasonYear ??
    item?.media?.startDate?.year ??
    null
  )
}

export function buildTasteProfile(entries = [], options = {}) {
  const {
    minGenreCount = DEFAULT_MIN_GENRE_COUNT,
    confidenceConstant = DEFAULT_CONFIDENCE_CONSTANT,
    scoreStdDev = DEFAULT_SCORE_STD_DEV,
    confidenceZ = CONFIDENCE_Z,
  } = options
  const genreStats = new Map()
  let globalWeightedTotal = 0
  let globalTotalWeight = 0

  for (const entry of entries) {
    if (!entry?.media) continue

    const rawStatus = (entry.status || 'COMPLETED').toUpperCase()

    if (
      rawStatus === 'DROPPED' ||
      rawStatus === 'PAUSED' ||
      rawStatus === 'PLANNING' ||
      rawStatus === 'PLAN_TO_WATCH' ||
      rawStatus === 'ON_HOLD'
    ) {
      continue
    }

    const isWatching = rawStatus === 'CURRENT' || rawStatus === 'WATCHING'
    const rawScore = entry.score ?? 0

    if (isWatching && rawScore <= 0) {
      continue
    }

    const weight = isWatching ? WATCHING_SCORE_WEIGHT : 1.0
    const genres = entry.media.genres ?? []

    if (rawScore > 0) {
      globalWeightedTotal += rawScore * weight
      globalTotalWeight += weight
    }

    const animeInfo = {
      id: entry.media.id,
      title: entry.media.title?.english || entry.media.title?.romaji || 'Untitled',
      titleObj: {
        english: entry.media.title?.english || '',
        romaji: entry.media.title?.romaji || '',
      },
      score: rawScore,
      coverImage: entry.media.coverImage?.large ?? '',
      status: entry.status || 'COMPLETED',
    }

    for (const genre of genres) {
      if (!genreStats.has(genre)) {
        genreStats.set(genre, { total: 0, weightTotal: 0, count: 0, scoredCount: 0, sourceAnimes: [] })
      }
      const stats = genreStats.get(genre)
      stats.count += 1
      stats.sourceAnimes.push(animeInfo)

      if (rawScore > 0) {
        stats.total += rawScore * weight
        stats.weightTotal += weight
        stats.scoredCount += 1
      }
    }
  }

  const userGlobalAverage = globalTotalWeight > 0 ? globalWeightedTotal / globalTotalWeight : 7.0

  const profile = new Map()

  for (const [genre, stats] of genreStats) {
    if (stats.scoredCount >= minGenreCount) {
      const realAverage = stats.total / stats.weightTotal
      const bayesianAverage =
        (confidenceConstant * userGlobalAverage + stats.total) /
        (confidenceConstant + stats.weightTotal)
      const standardError = scoreStdDev / Math.sqrt(confidenceConstant + stats.weightTotal)
      const lowerBound = Math.max(0, bayesianAverage - confidenceZ * standardError)

      const roundedAverage = Math.round(realAverage * 100) / 100
      const roundedBayesianAverage = Math.round(bayesianAverage * 100) / 100
      const roundedLowerBound = Math.round(lowerBound * 100) / 100

      profile.set(genre, {
        average: roundedAverage,
        bayesianAverage: roundedBayesianAverage,
        lowerBound: roundedLowerBound,
        adjustedAverage: roundedLowerBound,
        count: stats.count,
        scoredCount: stats.scoredCount,
        sourceAnimes: stats.sourceAnimes,
      })
    }
  }

  return profile
}

export function isEligiblePlanningMedia(entry) {
  if (!entry?.media) return false
  if (entry.media.status === 'NOT_YET_RELEASED') return false
  const score = entry.media.averageScore
  return score != null && score > 0
}

export function isEligiblePlanningEntry(entry) {
  const rawStatus = (entry?.status || '').toUpperCase()
  const isPlanning = rawStatus === 'PLANNING' || rawStatus === 'PLAN_TO_WATCH' || rawStatus === 'PLANNED'
  return isPlanning && isEligiblePlanningMedia(entry)
}

export function scoreRecommendations(planningEntries = [], tasteProfile = new Map(), selectedGenre = 'ALL') {
  const filtered = planningEntries.filter((entry) => {
    if (!isEligiblePlanningMedia(entry)) return false
    const score = entry?.media?.averageScore
    const genres = entry?.media?.genres ?? []
    const matchesGenre = selectedGenre === 'ALL' || genres.includes(selectedGenre)
    return score != null && score > 0 && matchesGenre
  })

  const scored = filtered.map((entry) => {
    const media = entry?.media ?? {}
    const genres = media?.genres ?? []
    const matchingGenres = genres.filter((g) => tasteProfile.has(g))

    const scoredMatchingGenres = matchingGenres.map((g) => {
      const stats = tasteProfile.get(g)
      return {
        genre: g,
        score: stats.adjustedAverage ?? stats.average,
      }
    })

    const communityScore = Math.round((media.averageScore / 10) * 100) / 100

    let baseTasteScore
    let predictedScore
    let predictionSource
    const badges = []
    let topContributingGenres = []
    let anchorAnimes = []

    if (matchingGenres.length > 0) {
      const sum = scoredMatchingGenres.reduce((acc, item) => acc + item.score, 0)
      baseTasteScore = Math.round((sum / matchingGenres.length) * 100) / 100
      
      // Híbrido: 85% perfil de gosto + 15% nota da comunidade
      predictedScore = Math.round((baseTasteScore * 0.85 + communityScore * 0.15) * 100) / 100
      predictionSource = 'taste'

      // Gêneros com maior pontuação
      topContributingGenres = [...scoredMatchingGenres].sort((a, b) => b.score - a.score)

      // Animes âncora (avaliados pelo usuário nos gêneros coincidentes)
      const seenAnimeIds = new Set()
      const collectedAnchors = []

      for (const item of topContributingGenres) {
        const stats = tasteProfile.get(item.genre)
        const sources = stats?.sourceAnimes ?? []
        for (const anime of sources) {
          if (anime?.id && !seenAnimeIds.has(anime.id) && anime.score > 0) {
            seenAnimeIds.add(anime.id)
            collectedAnchors.push(anime)
          }
        }
      }

      collectedAnchors.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      anchorAnimes = collectedAnchors.slice(0, 3)

      // Badges baseados em discrepância
      if (communityScore >= 8.5 && (communityScore - baseTasteScore >= 1.0)) {
        badges.push('ACCLAIMED')
      } else if (baseTasteScore - communityScore >= 1.5) {
        badges.push('PERSONAL_BET')
      } else if (baseTasteScore >= 8.0 && communityScore >= 8.0) {
        badges.push('STRONG_CONSENSUS')
      }

      // Badge de Descoberta / Fora da Zona (gêneros promissores pouco assistidos)
      const hasPromisingGenre = matchingGenres.some((g) => {
        const stats = tasteProfile.get(g)
        const scoredCount = stats?.scoredCount ?? stats?.count ?? 0
        const realAvg = stats?.average ?? 0
        return scoredCount > 0 && scoredCount <= DISCOVERY_MAX_SCORED_COUNT && realAvg >= DISCOVERY_MIN_REAL_AVERAGE
      })
      const lowWatchedGenresCount = genres.filter((g) => {
        if (!tasteProfile.has(g)) return true
        const stats = tasteProfile.get(g)
        const scoredCount = stats?.scoredCount ?? stats?.count ?? 0
        return scoredCount <= DISCOVERY_MAX_SCORED_COUNT
      }).length
      const isMajorityLowWatched = genres.length > 0 && (lowWatchedGenresCount / genres.length) >= 0.5

      if (hasPromisingGenre && isMajorityLowWatched && communityScore >= DISCOVERY_MIN_COMMUNITY_SCORE) {
        badges.push('DISCOVERY')
      }
    } else {
      baseTasteScore = null
      predictedScore = communityScore
      predictionSource = 'community'
      if (genres.length > 0 && communityScore >= DISCOVERY_FALLBACK_COMMUNITY_SCORE) {
        badges.push('DISCOVERY')
      }
    }

    const externalLinks = media.externalLinks ?? []
    const streamingLinks = externalLinks
      .filter(link => link.type === 'STREAMING')
      .map(link => ({ site: link.site, url: link.url }))

    return {
      id: media.id,
      title: media.title?.english || media.title?.romaji || 'Untitled',
      titleObj: {
        english: media.title?.english || '',
        romaji: media.title?.romaji || '',
      },
      description: media.description,
      coverImage: media.coverImage?.large ?? '',
      genres,
      matchingGenres: scoredMatchingGenres,
      topContributingGenres,
      anchorAnimes,
      baseTasteScore,
      predictionSource,
      badges,
      format: media.format || 'OTHER',
      year: media.seasonYear || media.startDate?.year || null,
      episodes: media.episodes || null,
      status: media.status || null,
      predictedScore,
      communityScore,
      siteUrl: media.siteUrl || (media.id ? `https://anilist.co/anime/${media.id}` : '#'),
      streamingLinks: media.streamingLinks || streamingLinks,
      provider: media.provider || 'anilist',
      planningProviders: entry.planningProviders || media.planningProviders || [],
      sourceProviders: entry.sourceProviders || media.sourceProviders || [],
      providerUrls: entry.providerUrls || media.providerUrls || (media.siteUrl ? { [media.provider || 'anilist']: media.siteUrl } : {}),
    }
  })

  scored.sort((a, b) => {
    if (b.predictedScore !== a.predictedScore) {
      return b.predictedScore - a.predictedScore
    }
    return b.communityScore - a.communityScore
  })

  return scored
}
