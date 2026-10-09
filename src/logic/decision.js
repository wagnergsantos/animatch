import { matchesUserSubscriptions } from './streaming.js'

export const DECISION_MODES = {
  BEST: 'best',
  SURPRISE: 'surprise',
  QUICK: 'quick',
}

/**
 * Returns the highest ranked recommendation (#1).
 * @param {Array<Object>} recommendations
 * @returns {Object|null}
 */
export function pickBestRecommendation(recommendations) {
  if (!recommendations || recommendations.length === 0) {
    return null
  }
  return recommendations[0]
}

/**
 * Draws an item from the top 20 recommendations using decreasing power weights:
 * w_i = (N - i)^1.5 where N = min(recommendations.length, 20).
 * @param {Array<Object>} recommendations
 * @param {Function} [randomFn=Math.random]
 * @returns {Object|null}
 */
export function pickWeightedTop20(recommendations, randomFn = Math.random) {
  if (!recommendations || recommendations.length === 0) {
    return null
  }

  const pool = recommendations.slice(0, 20)
  const n = pool.length
  if (n === 0) return null

  const weights = pool.map((_, i) => Math.pow(n - i, 1.5))
  const totalWeight = weights.reduce((sum, w) => sum + w, 0)

  const rand = typeof randomFn === 'function' ? randomFn() : Math.random()
  const target = rand * totalWeight

  let cumulative = 0
  for (let i = 0; i < pool.length; i++) {
    cumulative += weights[i]
    if (target < cumulative) {
      return pool[i]
    }
  }

  return pool[pool.length - 1]
}

/**
 * Returns a quick start recommendation (short series matching subscriptions).
 * Fallbacks cleanly to short series or general recommendations if no candidates match.
 * @param {Array<Object>} recommendations
 * @param {Array<string>} [userSubscriptions=[]]
 * @param {number} [maxEpisodes=24]
 * @param {Function} [randomFn=Math.random]
 * @returns {Object|null}
 */
export function pickQuickStart(
  recommendations = [],
  userSubscriptions = [],
  maxEpisodes = 24,
  randomFn = Math.random
) {
  if (!recommendations || recommendations.length === 0) {
    return null
  }

  const isShort = (anime) => {
    const ep = anime?.episodes ?? anime?.media?.episodes
    return typeof ep === 'number' && ep > 0 && ep <= maxEpisodes
  }

  // Tier 1: Short episodes AND matches user subscriptions
  let candidates = recommendations.filter(
    (anime) => isShort(anime) && matchesUserSubscriptions(anime, userSubscriptions)
  )

  // Tier 2: Short episodes regardless of subscription
  if (candidates.length === 0) {
    candidates = recommendations.filter(isShort)
  }

  // Tier 3: Fallback to all recommendations
  if (candidates.length === 0) {
    candidates = recommendations
  }

  return pickWeightedTop20(candidates, randomFn)
}

/**
 * Dispatches recommendation decision based on mode.
 * @param {string} mode
 * @param {Array<Object>} recommendations
 * @param {Array<string>} [userSubscriptions=[]]
 * @param {Function} [randomFn=Math.random]
 * @returns {Object|null}
 */
export function makeDecision(
  mode,
  recommendations = [],
  userSubscriptions = [],
  randomFn = Math.random
) {
  if (!recommendations || recommendations.length === 0) {
    return null
  }

  switch (mode) {
    case DECISION_MODES.BEST:
      return pickBestRecommendation(recommendations)
    case DECISION_MODES.SURPRISE:
      return pickWeightedTop20(recommendations, randomFn)
    case DECISION_MODES.QUICK:
      return pickQuickStart(recommendations, userSubscriptions, 24, randomFn)
    default:
      return pickBestRecommendation(recommendations)
  }
}
