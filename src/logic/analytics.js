export function computeOverviewStats(entries = []) {
  let totalAnimes = 0
  let totalEpisodes = 0
  let scoreSum = 0
  let scoredCount = 0

  for (const entry of entries) {
    if (entry?.status === 'PLANNING') continue

    totalAnimes += 1
    
    if (entry?.media?.episodes) {
      totalEpisodes += entry.media.episodes
    }

    if (entry?.status !== 'DROPPED') {
      const score = entry?.score ?? 0
      if (score > 0) {
        scoreSum += score
        scoredCount += 1
      }
    }
  }

  const userAverageScore = scoredCount > 0 ? Math.round((scoreSum / scoredCount) * 10) / 10 : 0

  return { totalAnimes, totalEpisodes, userAverageScore }
}

export function computeStatusDistribution(entries = []) {
  const dist = {
    COMPLETED: 0,
    PLANNING: 0,
    CURRENT: 0,
    DROPPED: 0,
    PAUSED: 0,
  }

  for (const entry of entries) {
    const st = entry?.status
    if (st && dist[st] !== undefined) {
      dist[st] += 1
    }
  }

  return dist
}

export function computeYearDistribution(entries = []) {
  const yearCounts = new Map()

  for (const entry of entries) {
    const year = entry?.media?.seasonYear || entry?.media?.startDate?.year
    if (year && year > 1960 && year <= 2030) {
      yearCounts.set(year, (yearCounts.get(year) || 0) + 1)
    }
  }

  const sortedYears = Array.from(yearCounts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year)

  return sortedYears
}

export function computeBayesianGenreStats(entries = [], confidenceC = 15) {
  const completedEntries = entries.filter((e) => e?.status === 'COMPLETED')
  const planningEntries = entries.filter((e) => e?.status === 'PLANNING')

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
        genreStats.set(genre, { total: 0, count: 0, scoredCount: 0, plannedCount: 0 })
      }
      const stats = genreStats.get(genre)
      stats.count += 1

      if (score > 0) {
        stats.total += score
        stats.scoredCount += 1
      }
    }
  }

  for (const entry of planningEntries) {
    if (!entry?.media) continue
    const genres = entry.media.genres ?? []
    for (const genre of genres) {
      if (genreStats.has(genre)) {
        const stats = genreStats.get(genre)
        stats.plannedCount += 1
      }
    }
  }

  const userGlobalAverage = globalScoredCount > 0 ? globalTotal / globalScoredCount : 7.0
  const result = []

  for (const [genre, stats] of genreStats) {
    if (stats.scoredCount >= 2) {
      const realAverage = stats.total / stats.scoredCount
      const bayesianAverage =
        (confidenceC * userGlobalAverage + stats.total) / (confidenceC + stats.scoredCount)

      result.push({
        genre,
        count: stats.count,
        scoredCount: stats.scoredCount,
        plannedCount: stats.plannedCount,
        realAverage: Math.round(realAverage * 100) / 100,
        bayesianAverage: Math.round(bayesianAverage * 100) / 100,
      })
    }
  }

  result.sort((a, b) => b.bayesianAverage - a.bayesianAverage)

  return result
}
