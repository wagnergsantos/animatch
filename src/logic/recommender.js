const MIN_GENRE_COUNT = 2
const CONFIDENCE_CONSTANT = 15

export function buildTasteProfile(completedEntries = []) {
  const genreStats = new Map()
  let globalTotal = 0
  let globalScoredCount = 0

  for (const entry of completedEntries) {
    if (!entry?.media) continue
    const genres = entry.media.genres ?? []
    const score = entry.score ?? 0

    if (score > 0) {
      globalTotal += score
      globalScoredCount += 1
    }

    for (const genre of genres) {
      if (!genreStats.has(genre)) {
        genreStats.set(genre, { total: 0, count: 0, scoredCount: 0 })
      }
      const stats = genreStats.get(genre)
      stats.count += 1

      if (score > 0) {
        stats.total += score
        stats.scoredCount += 1
      }
    }
  }

  const userGlobalAverage = globalScoredCount > 0 ? globalTotal / globalScoredCount : 7.0

  const profile = new Map()

  for (const [genre, stats] of genreStats) {
    if (stats.scoredCount >= MIN_GENRE_COUNT) {
      const realAverage = stats.total / stats.scoredCount
      const adjustedAverage =
        (CONFIDENCE_CONSTANT * userGlobalAverage + stats.total) /
        (CONFIDENCE_CONSTANT + stats.scoredCount)

      profile.set(genre, {
        average: Math.round(realAverage * 100) / 100,
        adjustedAverage: Math.round(adjustedAverage * 100) / 100,
        count: stats.count,
        scoredCount: stats.scoredCount,
      })
    }
  }

  return profile
}

export function scoreRecommendations(planningEntries = [], tasteProfile = new Map()) {
  const validPlanning = planningEntries.filter((entry) => {
    const score = entry?.media?.averageScore
    return score != null && score > 0
  })

  const scored = validPlanning.map((entry) => {
    const media = entry?.media ?? {}
    const genres = media?.genres ?? []
    const matchingGenres = genres.filter((g) => tasteProfile.has(g))

    let predictedScore
    if (matchingGenres.length > 0) {
      const sum = matchingGenres.reduce(
        (acc, g) => acc + (tasteProfile.get(g).adjustedAverage ?? tasteProfile.get(g).average),
        0
      )
      predictedScore = Math.round((sum / matchingGenres.length) * 100) / 100
    } else {
      predictedScore = Math.round((media.averageScore / 10) * 100) / 100
    }

    const communityScore = Math.round((media.averageScore / 10) * 100) / 100

    return {
      id: media.id,
      title: media.title?.english || media.title?.romaji || 'Untitled',
      coverImage: media.coverImage?.large ?? '',
      genres,
      predictedScore,
      communityScore,
      siteUrl: media.siteUrl || (media.id ? `https://anilist.co/anime/${media.id}` : '#'),
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
