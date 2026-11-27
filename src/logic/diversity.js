import { calculateJaccardSimilarity, extractAnimeGenres } from './similarity.js'

/**
 * Maximal Marginal Relevance (MMR) for anti-monotony reordering.
 * Rebalances recommendation list so consecutive items don't repeat the exact same sub-genres,
 * without modifying the displayed predictedScore.
 *
 * MMR formula:
 * MMR(d) = λ * Relevance(d) - (1 - λ) * max_{s ∈ S} Similarity(d, s)
 *
 * @param {Array<Object>} recommendations
 * @param {Object} [options]
 * @param {number} [options.lambda=0.75] - Balance between relevance [0.0..1.0] and diversity. 1.0 = pure relevance.
 * @param {number} [options.windowSize=4] - Compare candidate only with the last N items in the selected list (local diversity).
 * @returns {Array<Object>}
 */
export function applyMMRDiversity(recommendations, options = {}) {
  if (!Array.isArray(recommendations) || recommendations.length <= 2) {
    return recommendations || []
  }

  const lambda = typeof options.lambda === 'number' ? Math.max(0, Math.min(1, options.lambda)) : 0.75
  const windowSize = typeof options.windowSize === 'number' ? Math.max(1, options.windowSize) : 4

  // If lambda is 1.0, no diversity adjustment is needed
  if (lambda >= 1.0) {
    return [...recommendations]
  }

  // Pre-normalize scores between 0 and 1 for relevance term
  const maxScore = Math.max(...recommendations.map((r) => r.predictedScore ?? 0), 10)
  const minScore = Math.min(...recommendations.map((r) => r.predictedScore ?? 0), 0)
  const scoreRange = maxScore - minScore || 1

  // Pre-extract genre sets for fast Jaccard computation
  const items = recommendations.map((r) => ({
    original: r,
    relevance: ((r.predictedScore ?? 0) - minScore) / scoreRange,
    genres: extractAnimeGenres(r),
  }))

  const selected = []
  const remaining = new Set(items)

  // Pick 1st item: the absolute highest relevance item always stays #1
  const first = items[0]
  selected.push(first.original)
  remaining.delete(first)

  while (remaining.size > 0) {
    let bestCandidate = null
    let bestMMR = -Infinity

    // We only penalize similarity against the recent window (e.g. last 4 items)
    const recentWindow = selected.slice(-windowSize)

    for (const candidate of remaining) {
      let maxSim = 0
      for (const sel of recentWindow) {
        const selGenres = extractAnimeGenres(sel)
        const sim = calculateJaccardSimilarity(candidate.genres, selGenres)
        if (sim > maxSim) {
          maxSim = sim
        }
      }

      // MMR score
      const mmrScore = lambda * candidate.relevance - (1 - lambda) * maxSim

      if (mmrScore > bestMMR) {
        bestMMR = mmrScore
        bestCandidate = candidate
      }
    }

    if (bestCandidate) {
      selected.push(bestCandidate.original)
      remaining.delete(bestCandidate)
    } else {
      break
    }
  }

  return selected
}
