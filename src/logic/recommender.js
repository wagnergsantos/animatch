const MIN_GENRE_COUNT = 2
const CONFIDENCE_CONSTANT = 15
export const WATCHING_SCORE_WEIGHT = 0.7

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

export function buildTasteProfile(entries = []) {
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
    if (stats.scoredCount >= MIN_GENRE_COUNT) {
      const realAverage = stats.total / stats.weightTotal
      const adjustedAverage =
        (CONFIDENCE_CONSTANT * userGlobalAverage + stats.total) /
        (CONFIDENCE_CONSTANT + stats.weightTotal)

      profile.set(genre, {
        average: Math.round(realAverage * 100) / 100,
        adjustedAverage: Math.round(adjustedAverage * 100) / 100,
        count: stats.count,
        scoredCount: stats.scoredCount,
        sourceAnimes: stats.sourceAnimes,
      })
    }
  }

  return profile
}

export function scoreRecommendations(planningEntries = [], tasteProfile = new Map(), selectedGenre = 'ALL') {
  const filtered = planningEntries.filter((entry) => {
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

    if (matchingGenres.length > 0) {
      const sum = scoredMatchingGenres.reduce((acc, item) => acc + item.score, 0)
      baseTasteScore = Math.round((sum / matchingGenres.length) * 100) / 100
      
      // Híbrido: 85% perfil de gosto + 15% nota da comunidade
      predictedScore = Math.round((baseTasteScore * 0.85 + communityScore * 0.15) * 100) / 100
      predictionSource = 'taste'

      // Badges baseados em discrepância
      if (communityScore >= 8.5 && (communityScore - baseTasteScore >= 1.0)) {
        badges.push('ACCLAIMED')
      } else if (baseTasteScore - communityScore >= 1.5) {
        badges.push('PERSONAL_BET')
      } else if (baseTasteScore >= 8.0 && communityScore >= 8.0) {
        badges.push('STRONG_CONSENSUS')
      }
    } else {
      baseTasteScore = null
      predictedScore = communityScore
      predictionSource = 'community'
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
