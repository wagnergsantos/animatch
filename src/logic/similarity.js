/**
 * Logic for calculating item-to-item similarity using Jaccard index.
 * Used for "Similar Animes" filtering in the recommendation grid.
 */

/**
 * Normalizes an array or Set of strings to lower-cased unique tokens.
 * @param {Array<string>|Set<string>} items
 * @returns {Set<string>}
 */
export function toNormalizedSet(items) {
  if (!items) return new Set()
  const arr = Array.isArray(items) ? items : Array.from(items)
  const set = new Set()
  for (const item of arr) {
    if (typeof item === 'string') {
      const trimmed = item.trim().toLowerCase()
      if (trimmed) set.add(trimmed)
    }
  }
  return set
}

/**
 * Computes standard Jaccard similarity between two sets: |A ∩ B| / |A ∪ B|.
 * Returns a value between 0.0 and 1.0.
 * @param {Array<string>|Set<string>} setA
 * @param {Array<string>|Set<string>} setB
 * @returns {number}
 */
export function calculateJaccardSimilarity(setA, setB) {
  const normA = toNormalizedSet(setA)
  const normB = toNormalizedSet(setB)

  if (normA.size === 0 && normB.size === 0) return 0.0

  let intersectionCount = 0
  for (const item of normA) {
    if (normB.has(item)) {
      intersectionCount++
    }
  }

  // Union size = |A| + |B| - |A ∩ B|
  const unionCount = normA.size + normB.size - intersectionCount
  if (unionCount === 0) return 0.0

  return intersectionCount / unionCount
}

/**
 * Extracts genres array from an anime or recommendation item.
 * @param {Object} anime
 * @returns {Array<string>}
 */
export function extractAnimeGenres(anime) {
  if (!anime) return []
  if (Array.isArray(anime.genres)) return anime.genres
  if (Array.isArray(anime.media?.genres)) return anime.media.genres
  return []
}

/**
 * Computes multi-attribute similarity between target anime and a candidate.
 * Primary signal: Genre Jaccard (80% weight).
 * Secondary signal: Studio match (15% weight) and Format match (5% weight).
 * @param {Object} target
 * @param {Object} candidate
 * @returns {{ similarity: number, commonGenres: Array<string> }}
 */
export function calculateAnimeSimilarity(target, candidate) {
  if (!target || !candidate) {
    return { similarity: 0.0, commonGenres: [] }
  }

  const genresA = extractAnimeGenres(target)
  const genresB = extractAnimeGenres(candidate)

  const normA = toNormalizedSet(genresA)
  const normB = toNormalizedSet(genresB)

  const commonGenres = []
  for (const g of genresA) {
    if (normB.has(typeof g === 'string' ? g.trim().toLowerCase() : '')) {
      commonGenres.push(g)
    }
  }

  const genreJaccard = calculateJaccardSimilarity(normA, normB)

  // Secondary signals (studio, format) only apply if there is thematic genre overlap
  if (genreJaccard === 0) {
    return {
      similarity: 0.0,
      commonGenres: [],
    }
  }

  // Secondary signals
  const studioA = (target.studio || target.media?.studio || '').trim().toLowerCase()
  const studioB = (candidate.studio || candidate.media?.studio || '').trim().toLowerCase()
  const studioMatch = studioA && studioB && studioA === studioB ? 1.0 : 0.0

  const formatA = (target.format || target.media?.format || '').trim().toUpperCase()
  const formatB = (candidate.format || candidate.media?.format || '').trim().toUpperCase()
  const formatMatch = formatA && formatB && formatA === formatB ? 1.0 : 0.0

  // 80% genre overlap + 15% same studio + 5% same format
  const similarity = genreJaccard * 0.8 + studioMatch * 0.15 + formatMatch * 0.05

  return {
    similarity: Math.round(similarity * 1000) / 1000,
    commonGenres,
  }
}

/**
 * Ranks an anime pool by similarity to a target anime.
 * Excludes the target itself.
 * Secondary sort by predictedScore and communityScore.
 * @param {Object} targetAnime
 * @param {Array<Object>} pool
 * @param {Object} [options]
 * @param {number} [options.minSimilarity=0.01]
 * @returns {Array<Object>}
 */
export function rankAnimesBySimilarity(targetAnime, pool, options = {}) {
  if (!targetAnime || !Array.isArray(pool) || pool.length === 0) {
    return []
  }

  const targetId = targetAnime.id ?? targetAnime.media?.id
  const targetTitle = (targetAnime.title || targetAnime.media?.title?.romaji || '').toLowerCase().trim()
  const minSimilarity = options.minSimilarity ?? 0.05

  const ranked = []

  for (const item of pool) {
    const itemId = item.id ?? item.media?.id
    const itemTitle = (item.title || item.media?.title?.romaji || '').toLowerCase().trim()

    // Skip the target anime itself
    if (targetId && itemId && targetId === itemId) continue
    if (targetTitle && itemTitle && targetTitle === itemTitle) continue

    const { similarity, commonGenres } = calculateAnimeSimilarity(targetAnime, item)

    if (similarity >= minSimilarity) {
      ranked.push({
        ...item,
        similarityScore: similarity,
        commonGenres,
      })
    }
  }

  ranked.sort((a, b) => {
    // 1. Similarity score descending
    if (b.similarityScore !== a.similarityScore) {
      return b.similarityScore - a.similarityScore
    }
    // 2. Predicted match score descending
    const scoreA = a.predictedScore ?? 0
    const scoreB = b.predictedScore ?? 0
    if (scoreB !== scoreA) {
      return scoreB - scoreA
    }
    // 3. Community score descending
    const commA = a.communityScore ?? 0
    const commB = b.communityScore ?? 0
    return commB - commA
  })

  return ranked
}
