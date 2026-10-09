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
/**
 * Returns the highest ranked recommendation (#1) or next best if excludeId is provided.
 * @param {Array<Object>} recommendations
 * @param {number|string|null} [excludeId=null]
 * @returns {Object|null}
 */
export function pickBestRecommendation(recommendations, excludeId = null) {
  if (!recommendations || recommendations.length === 0) {
    return null
  }
  if (excludeId != null && recommendations.length > 1) {
    const nextBest = recommendations.find((r) => (r.id ?? r.media?.id) !== excludeId)
    if (nextBest) return nextBest
  }
  return recommendations[0]
}

/**
 * Draws an item from the top 20 recommendations using decreasing power weights:
 * w_i = (N - i)^1.5 where N = min(recommendations.length, 20).
 * Excludes excludeId if pool has more than 1 item.
 * @param {Array<Object>} recommendations
 * @param {Function} [randomFn=Math.random]
 * @param {number|string|null} [excludeId=null]
 * @returns {Object|null}
 */
export function pickWeightedTop20(recommendations, randomFn = Math.random, excludeId = null) {
  if (!recommendations || recommendations.length === 0) {
    return null
  }

  let pool = recommendations.slice(0, 20)
  if (excludeId != null && pool.length > 1) {
    const filteredPool = pool.filter((r) => (r.id ?? r.media?.id) !== excludeId)
    if (filteredPool.length > 0) {
      pool = filteredPool
    }
  }

  const n = pool.length
  if (n === 0) return null
  if (n === 1) return pool[0]

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
 * @param {number|string|null} [excludeId=null]
 * @returns {Object|null}
 */
export function pickQuickStart(
  recommendations = [],
  userSubscriptions = [],
  maxEpisodes = 24,
  randomFn = Math.random,
  excludeId = null
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

  return pickWeightedTop20(candidates, randomFn, excludeId)
}

/**
 * Dispatches recommendation decision based on mode.
 * @param {string} mode
 * @param {Array<Object>} recommendations
 * @param {Array<string>} [userSubscriptions=[]]
 * @param {Function} [randomFn=Math.random]
 * @param {number|string|null} [excludeId=null]
 * @returns {Object|null}
 */
export function makeDecision(
  mode,
  recommendations = [],
  userSubscriptions = [],
  randomFn = Math.random,
  excludeId = null
) {
  if (!recommendations || recommendations.length === 0) {
    return null
  }

  switch (mode) {
    case DECISION_MODES.BEST:
      return pickBestRecommendation(recommendations, excludeId)
    case DECISION_MODES.SURPRISE:
      return pickWeightedTop20(recommendations, randomFn, excludeId)
    case DECISION_MODES.QUICK:
      return pickQuickStart(recommendations, userSubscriptions, 24, randomFn, excludeId)
    default:
      return pickWeightedTop20(recommendations, randomFn, excludeId)
  }
}
