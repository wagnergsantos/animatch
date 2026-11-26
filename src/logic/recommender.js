export const DEFAULT_MIN_GENRE_COUNT = 2
export const DEFAULT_CONFIDENCE_CONSTANT = 25
export const DEFAULT_SCORE_STD_DEV = 1.2
export const CONFIDENCE_Z = 1.96
export const WATCHING_SCORE_WEIGHT = 0.7
export const DISCOVERY_MAX_SCORED_COUNT = 15
export const DISCOVERY_MIN_REAL_AVERAGE = 8.0
export const DISCOVERY_MIN_COMMUNITY_SCORE = 7.5
export const DISCOVERY_FALLBACK_COMMUNITY_SCORE = 8.0
export const DEFAULT_TASTE_WEIGHT = 0.85
export const DEFAULT_COMMUNITY_WEIGHT = 0.15
export const DEFAULT_BAYESIAN_GLOBAL_MEAN = 7.0
export const DEFAULT_BAYESIAN_MIN_VOTES = 10000

export const GENRE_GLOBAL_PRIORS = Object.freeze({
  Action: 0.20,
  Adventure: 0.14,
  Comedy: 0.22,
  Drama: 0.16,
  Fantasy: 0.18,
  Horror: 0.04,
  Mystery: 0.07,
  Romance: 0.13,
  'Sci-Fi': 0.10,
  'Slice of Life': 0.11,
  Sports: 0.05,
  Supernatural: 0.12,
  Suspense: 0.05,
  Mecha: 0.04,
  Psychological: 0.06,
  Ecchi: 0.08,
  DEFAULT: 0.08,
})

export const STATUS_SCORE_PROXY = Object.freeze({
  COMPLETED: 7.8,
  CURRENT: 7.0,
  WATCHING: 7.0,
  ON_HOLD: 6.0,
  PAUSED: 6.0,
  DROPPED: 4.5,
})

export const STATUS_PROXY_WEIGHT = Object.freeze({
  COMPLETED: 0.50,
  CURRENT: 0.25,
  WATCHING: 0.25,
  ON_HOLD: 0.25,
  PAUSED: 0.25,
  DROPPED: 0.50,
})

/**
 * Avalia o sinal de proxy de uma obra não avaliada com base no status e progresso.
 *
 * @param {object} entry
 * @returns {{ status: string, baseScore: number, baseWeight: number, isDropped: boolean } | null}
 */
export function evaluateStatusProxy(entry) {
  if (!entry) return null
  const rawStatus = (entry.status || 'COMPLETED').toUpperCase()
  if (rawStatus === 'PLANNING' || rawStatus === 'PLAN_TO_WATCH' || rawStatus === 'PLANNED') {
    return null
  }

  const progress = Number(entry.progress ?? entry.episodesWatched ?? 0) || 0
  const totalEpisodes = Number(entry.media?.episodes ?? entry.totalEpisodes ?? 0) || 0
  const progressRatio = totalEpisodes > 0 ? progress / totalEpisodes : null

  if (rawStatus === 'COMPLETED') {
    return {
      status: 'COMPLETED',
      baseScore: 7.8,
      baseWeight: 0.50,
      isDropped: false,
    }
  }

  if (rawStatus === 'CURRENT' || rawStatus === 'WATCHING') {
    // Ignora sinal fraco se progresso for menor que 30%
    if (progressRatio != null && progressRatio < 0.30) {
      return null
    }
    return {
      status: 'WATCHING',
      baseScore: 7.0,
      baseWeight: 0.25,
      isDropped: false,
    }
  }

  if (rawStatus === 'ON_HOLD' || rawStatus === 'PAUSED') {
    return {
      status: 'ON_HOLD',
      baseScore: 6.0,
      baseWeight: 0.25,
      isDropped: false,
    }
  }

  if (rawStatus === 'DROPPED') {
    let baseScore = 4.5
    if (progressRatio != null) {
      if (progressRatio < 0.25) {
        baseScore = 4.0 // Abandono precoce = rejeição clara
      } else if (progressRatio <= 0.75) {
        baseScore = 4.5 // Sinal ambíguo
      } else {
        baseScore = 6.0 // Abandono no final = cansaço/falta de tempo
      }
    }
    return {
      status: 'DROPPED',
      baseScore,
      baseWeight: 0.50,
      isDropped: true,
    }
  }

  return null
}

/**
 * Calcula os ajustes de Lift para cada gênero com base na proporção assistida vs catálogo.
 *
 * Lift(g) = P(gênero | usuário) / P(gênero | catálogo)
 * ajuste_g = clamp(0.7 * ln(Lift(g)), -1.0, +1.0)
 *
 * @param {Array} entries
 * @returns {Map<string, number>}
 */
export function calculateGenreLiftAdjustments(entries = []) {
  const watchedGenreWeights = new Map()
  const droppedGenreWeights = new Map()

  for (const entry of entries) {
    if (!entry?.media?.genres) continue
    const proxy = evaluateStatusProxy(entry)
    if (!proxy) continue

    const genres = Array.isArray(entry.media.genres) ? entry.media.genres : []
    for (const g of genres) {
      if (!g) continue
      if (proxy.isDropped) {
        droppedGenreWeights.set(g, (droppedGenreWeights.get(g) || 0) + proxy.baseWeight)
      } else {
        watchedGenreWeights.set(g, (watchedGenreWeights.get(g) || 0) + proxy.baseWeight)
      }
    }
  }

  const allGenres = new Set([...watchedGenreWeights.keys(), ...droppedGenreWeights.keys()])
  let totalUserWeight = 0
  const netGenreWeights = new Map()

  for (const g of allGenres) {
    const wWatched = watchedGenreWeights.get(g) || 0
    const wDropped = droppedGenreWeights.get(g) || 0
    const netWeight = Math.max(0.01, wWatched - 0.5 * wDropped)
    netGenreWeights.set(g, netWeight)
    totalUserWeight += netWeight
  }

  const liftAdjustments = new Map()
  if (totalUserWeight > 0) {
    for (const [g, netWeight] of netGenreWeights.entries()) {
      const pUser = netWeight / totalUserWeight
      const pCatalog = GENRE_GLOBAL_PRIORS[g] || GENRE_GLOBAL_PRIORS.DEFAULT
      const lift = pCatalog > 0 ? pUser / pCatalog : 1
      const rawAdj = 0.7 * Math.log(lift || 1)
      const clampedAdj = Math.max(-1.0, Math.min(1.0, rawAdj))
      liftAdjustments.set(g, Math.round(clampedAdj * 100) / 100)
    }
  }

  return liftAdjustments
}

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

export function normalizeFranchiseTitle(title) {
  if (!title || typeof title !== 'string') return ''
  return title
    .toLowerCase()
    .replace(/\s*(\(|\[).*?(\)|\])/g, '')
    .replace(/\s*(:| - | -|–|—).*$/, '')
    .replace(/\s+(season|the movie|movie|ova|ona|special|2nd season|3rd season|part \d+).*$/i, '')
    .trim()
}

export function isSameFranchise(title1, title2) {
  const norm1 = normalizeFranchiseTitle(title1)
  const norm2 = normalizeFranchiseTitle(title2)
  if (!norm1 || !norm2) return false
  if (norm1 === norm2) return true
  if (norm1.length >= 4 && norm2.length >= 4) {
    if (norm1.startsWith(norm2) || norm2.startsWith(norm1)) return true
  }
  return false
}

export function buildTasteProfile(entries = [], options = {}) {
  const {
    minGenreCount = DEFAULT_MIN_GENRE_COUNT,
    confidenceConstant = DEFAULT_CONFIDENCE_CONSTANT,
    scoreStdDev = DEFAULT_SCORE_STD_DEV,
    confidenceZ = CONFIDENCE_Z,
    useStatusProxy = false,
  } = options

  const enableProxy = Boolean(useStatusProxy)

  // 1. Contagem de notas explícitas para cálculo do decaimento gradual
  let nExplicit = 0
  for (const e of entries) {
    if (typeof e?.score === 'number' && e.score > 0) {
      nExplicit++
    }
  }

  // Decaimento contínuo: decay = 10 / (nExplicit + 10)
  // 0 notas → 1.0 | 10 notas → 0.5 | 100 notas → 0.09
  const proxyDecay = 10 / (nExplicit + 10)

  // 2. Ajustes de Lift por frequência de gênero (diferencia gêneros em obras sem nota)
  const genreLiftAdjustments = enableProxy ? calculateGenreLiftAdjustments(entries) : new Map()

  const genreStats = new Map()
  let globalWeightedTotal = 0
  let globalTotalWeight = 0
  let proxyWeightSum = 0

  for (const entry of entries) {
    if (!entry?.media) continue

    const rawStatus = (entry.status || 'COMPLETED').toUpperCase()

    if (
      rawStatus === 'PLANNING' ||
      rawStatus === 'PLAN_TO_WATCH' ||
      rawStatus === 'PLANNED'
    ) {
      continue
    }

    if (!enableProxy) {
      if (
        rawStatus === 'DROPPED' ||
        rawStatus === 'PAUSED' ||
        rawStatus === 'ON_HOLD'
      ) {
        continue
      }
    }

    const rawScore = typeof entry.score === 'number' ? entry.score : 0
    const hasExplicitScore = rawScore > 0

    let effectiveScore = 0
    let weight = 0

    if (hasExplicitScore) {
      const isWatching = rawStatus === 'CURRENT' || rawStatus === 'WATCHING'
      effectiveScore = rawScore
      weight = isWatching ? WATCHING_SCORE_WEIGHT : 1.0
    } else if (enableProxy) {
      const proxy = evaluateStatusProxy(entry)
      if (proxy) {
        effectiveScore = proxy.baseScore
        weight = proxy.baseWeight * proxyDecay
        proxyWeightSum += weight
      }
    }

    const isScored = weight > 0 && effectiveScore > 0

    if (isScored) {
      globalWeightedTotal += effectiveScore * weight
      globalTotalWeight += weight
    }

    const genres = entry.media.genres ?? []

    const animeInfo = {
      id: entry.media.id,
      title: entry.media.title?.english || entry.media.title?.romaji || 'Untitled',
      titleObj: {
        english: entry.media.title?.english || '',
        romaji: entry.media.title?.romaji || '',
      },
      score: effectiveScore,
      coverImage: entry.media.coverImage?.large ?? '',
      status: entry.status || 'COMPLETED',
      genres,
    }

    for (const genre of genres) {
      if (!genreStats.has(genre)) {
        genreStats.set(genre, {
          total: 0,
          weightTotal: 0,
          count: 0,
          scoredCount: 0,
          explicitCount: 0,
          sourceAnimes: [],
        })
      }
      const stats = genreStats.get(genre)
      stats.count += 1
      stats.sourceAnimes.push(animeInfo)

      if (isScored) {
        // Se for score derivado de proxy, aplica o ajuste de lift deste gênero
        let itemScore = effectiveScore
        if (!hasExplicitScore && genreLiftAdjustments.has(genre)) {
          const liftAdj = genreLiftAdjustments.get(genre)
          itemScore = Math.max(1.0, Math.min(10.0, effectiveScore + liftAdj))
        }

        stats.scoredCount += 1
        if (hasExplicitScore) {
          stats.explicitCount += 1
        }
        stats.total += itemScore * weight
        stats.weightTotal += weight
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
        explicitCount: stats.explicitCount,
        sourceAnimes: stats.sourceAnimes,
      })
    }
  }

  // Cálculo de tamanho efetivo (nEff) e confiança contínua (c)
  const nEff = Math.round((nExplicit + proxyWeightSum) * 100) / 100
  const confidence = nEff > 0 ? nEff / (nEff + 10) : 0
  const dynamicTasteWeight = Math.round(0.85 * confidence * 100) / 100
  const dynamicCommunityWeight = Math.round((1.0 - dynamicTasteWeight) * 100) / 100

  profile.nExplicit = nExplicit
  profile.nEff = nEff
  profile.confidence = Math.round(confidence * 100) / 100
  profile.dynamicTasteWeight = dynamicTasteWeight
  profile.dynamicCommunityWeight = dynamicCommunityWeight
  profile.isLowConfidence = confidence < 0.5

  return profile
}

export function isEligiblePlanningMedia(entry, tasteProfile = null) {
  if (!entry?.media) return false
  if (entry.media.status === 'NOT_YET_RELEASED') return false
  const score = entry.media.averageScore
  if (score != null && score > 0) return true

  // Resgate de obras sem nota comunitária compatíveis com o perfil de gosto
  if (tasteProfile && tasteProfile.size > 0) {
    const genres = entry.media.genres ?? []
    return genres.some((g) => tasteProfile.has(g))
  }

  return false
}

/**
 * Calcula o score da comunidade com amortecimento Bayesiano pelo volume de membros/votos.
 *
 * Fórmula: B = (v * R + m * C) / (v + m)
 * onde:
 * - R: nota média da obra (escala 0-10)
 * - v: volume de membros/avaliações (members, popularity ou voteCount)
 * - C: média global (default: 7.0)
 * - m: votos mínimos de confiança estatística (default: 10000)
 *
 * @param {object} media - Objeto media do anime
 * @param {object} [options]
 * @param {number} [options.globalMean=DEFAULT_BAYESIAN_GLOBAL_MEAN]
 * @param {number} [options.minVotes=DEFAULT_BAYESIAN_MIN_VOTES]
 * @returns {number|null} Score amortecido na escala 0-10, ou null se não houver nota válida
 */
export function calculateDampedCommunityScore(media, options = {}) {
  const averageScore = media?.averageScore
  if (averageScore == null || averageScore <= 0) return null

  // Normaliza averageScore para escala 0-10 (AniList usa 0-100, MAL usa 0-10)
  const rawR = averageScore > 10 ? averageScore / 10 : averageScore
  const R = Math.max(0, Math.min(10, rawR))

  const globalMean =
    Number.isFinite(options?.globalMean) && options.globalMean > 0
      ? options.globalMean
      : DEFAULT_BAYESIAN_GLOBAL_MEAN
  const minVotes =
    Number.isFinite(options?.minVotes) && options.minVotes >= 0
      ? options.minVotes
      : DEFAULT_BAYESIAN_MIN_VOTES

  const votes =
    Number(media?.members ?? media?.popularity ?? media?.voteCount) || 0

  if (votes <= 0 || minVotes <= 0) {
    return Math.round(R * 100) / 100
  }

  const damped = (votes * R + minVotes * globalMean) / (votes + minVotes)
  return Math.round(damped * 100) / 100
}

export function calculateWeightedGenreAverage(scoredMatchingGenres, tasteProfile) {
  if (!scoredMatchingGenres || scoredMatchingGenres.length === 0) return null
  let weightedSum = 0
  let totalWeight = 0

  for (const item of scoredMatchingGenres) {
    const stats = tasteProfile?.get?.(item.genre)
    const count = stats?.scoredCount ?? stats?.count ?? 1
    const weight = Math.sqrt(Math.max(1, count))
    weightedSum += item.score * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 100) / 100 : null
}

export function isEligiblePlanningEntry(entry, tasteProfile = null) {
  const rawStatus = (entry?.status || '').toUpperCase()
  const isPlanning = rawStatus === 'PLANNING' || rawStatus === 'PLAN_TO_WATCH' || rawStatus === 'PLANNED'
  return isPlanning && isEligiblePlanningMedia(entry, tasteProfile)
}

export function scoreRecommendations(planningEntries = [], tasteProfile = new Map(), selectedGenre = 'ALL', options = {}) {
  const tasteWeight =
    Number.isFinite(options?.tasteWeight) && options.tasteWeight >= 0
      ? options.tasteWeight
      : (typeof tasteProfile?.dynamicTasteWeight === 'number' ? tasteProfile.dynamicTasteWeight : DEFAULT_TASTE_WEIGHT)
  const communityWeight =
    Number.isFinite(options?.communityWeight) && options.communityWeight >= 0
      ? options.communityWeight
      : (typeof tasteProfile?.dynamicCommunityWeight === 'number' ? tasteProfile.dynamicCommunityWeight : DEFAULT_COMMUNITY_WEIGHT)

  const filtered = planningEntries.filter((entry) => {
    if (!isEligiblePlanningMedia(entry, tasteProfile)) return false
    const genres = entry?.media?.genres ?? []
    const matchesGenre = selectedGenre === 'ALL' || genres.includes(selectedGenre)
    return matchesGenre
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

    const communityScore = calculateDampedCommunityScore(media, options)

    let baseTasteScore
    let predictedScore
    let predictionSource
    const badges = []
    let topContributingGenres = []
    let anchorAnimes = []

    if (matchingGenres.length > 0) {
      baseTasteScore = calculateWeightedGenreAverage(scoredMatchingGenres, tasteProfile)
      
      if (communityScore != null) {
        // Híbrido: tasteWeight * perfil de gosto + communityWeight * nota da comunidade
        predictedScore = Math.round((baseTasteScore * tasteWeight + communityScore * communityWeight) * 100) / 100
      } else {
        // Obra sem nota comunitária: 100% inferência do perfil de gosto
        predictedScore = baseTasteScore
      }
      predictionSource = 'taste'

      // Gêneros com maior pontuação
      topContributingGenres = [...scoredMatchingGenres].sort((a, b) => b.score - a.score)

      // Animes âncora (avaliados pelo usuário nos gêneros coincidentes)
      const seenAnimeIds = new Set()
      const collectedAnchors = []
      const candidateGenresSet = new Set(genres)
      const candidateTitleRomaji = media.title?.romaji || ''
      const candidateTitleEnglish = media.title?.english || ''
      const candidateTitleFlat = typeof entry.title === 'string' ? entry.title : ''

      for (const item of topContributingGenres) {
        const stats = tasteProfile.get(item.genre)
        const sources = stats?.sourceAnimes ?? []
        for (const anime of sources) {
          if (anime?.id && !seenAnimeIds.has(anime.id) && anime.score > 0) {
            seenAnimeIds.add(anime.id)
            const anchorTitle = anime.title || ''
            if (
              (candidateTitleRomaji && isSameFranchise(candidateTitleRomaji, anchorTitle)) ||
              (candidateTitleEnglish && isSameFranchise(candidateTitleEnglish, anchorTitle)) ||
              (candidateTitleFlat && isSameFranchise(candidateTitleFlat, anchorTitle))
            ) {
              continue
            }
            const animeGenres = anime.genres ?? []
            let sharedCount = 0
            for (const g of animeGenres) {
              if (candidateGenresSet.has(g)) sharedCount++
            }
            const unionSize = new Set([...genres, ...animeGenres]).size
            const jaccard = unionSize > 0 ? sharedCount / unionSize : 0

            collectedAnchors.push({
              anime,
              score: anime.score ?? 0,
              sharedCount,
              jaccard,
            })
          }
        }
      }

      collectedAnchors.sort((a, b) => {
        const weightA = a.score * (1 + (a.jaccard || 0) * 2.0)
        const weightB = b.score * (1 + (b.jaccard || 0) * 2.0)
        if (Math.abs(weightB - weightA) > 0.001) {
          return weightB - weightA
        }
        if (b.score !== a.score) {
          return b.score - a.score
        }
        if (b.jaccard !== a.jaccard) {
          return b.jaccard - a.jaccard
        }
        return b.sharedCount - a.sharedCount
      })
      anchorAnimes = collectedAnchors.slice(0, 3).map((item) => item.anime)

      // Badges baseados em discrepância (somente com communityScore válido)
      if (communityScore != null) {
        if (communityScore >= 8.5 && (communityScore - baseTasteScore >= 1.0)) {
          badges.push('ACCLAIMED')
        } else if (baseTasteScore - communityScore >= 1.5) {
          badges.push('PERSONAL_BET')
        } else if (baseTasteScore >= 8.0 && communityScore >= 8.0) {
          badges.push('STRONG_CONSENSUS')
        }
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

      if (hasPromisingGenre && isMajorityLowWatched && communityScore != null && communityScore >= DISCOVERY_MIN_COMMUNITY_SCORE) {
        badges.push('DISCOVERY')
      }
    } else {
      baseTasteScore = null
      predictedScore = communityScore
      predictionSource = 'community'
      if (genres.length > 0 && communityScore != null && communityScore >= DISCOVERY_FALLBACK_COMMUNITY_SCORE) {
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
      year: resolveYear(entry),
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
