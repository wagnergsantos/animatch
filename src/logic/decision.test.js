import { describe, it, expect } from 'vitest'
import {
  DECISION_MODES,
  pickBestRecommendation,
  pickWeightedTop20,
  pickSurpriseRecommendation,
  pickQuickStart,
  makeDecision,
} from './decision.js'

describe('decision engine logic', () => {
  describe('DECISION_MODES', () => {
    it('defines expected decision modes', () => {
      expect(DECISION_MODES).toEqual({
        BEST: 'best',
        SURPRISE: 'surprise',
        QUICK: 'quick',
      })
    })
  })

  describe('pickBestRecommendation', () => {
    it('returns the top recommendation (#1)', () => {
      const recs = [
        { id: 1, title: 'Anime 1', predictedScore: 9.5 },
        { id: 2, title: 'Anime 2', predictedScore: 9.0 },
      ]
      expect(pickBestRecommendation(recs)).toEqual(recs[0])
    })

    it('returns null when recommendations array is empty or invalid', () => {
      expect(pickBestRecommendation([])).toBeNull()
      expect(pickBestRecommendation(null)).toBeNull()
      expect(pickBestRecommendation(undefined)).toBeNull()
    })
  })

  describe('pickWeightedTop20', () => {
    const mockRecs = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      title: `Anime ${i + 1}`,
      predictedScore: 10 - i * 0.1,
    }))

    it('returns null when recommendations array is empty or null', () => {
      expect(pickWeightedTop20([])).toBeNull()
      expect(pickWeightedTop20(null)).toBeNull()
      expect(pickWeightedTop20(undefined)).toBeNull()
    })

    it('returns the #1 item when randomFn produces low value (near 0)', () => {
      const selected = pickWeightedTop20(mockRecs, () => 0.0001)
      expect(selected?.id).toBe(1)
    })

    it('returns the #20 item when randomFn produces high value (near 1)', () => {
      const selected = pickWeightedTop20(mockRecs, () => 0.9999)
      expect(selected?.id).toBe(20)
    })

    it('never picks beyond the top 20 even if more items are provided', () => {
      const selected = pickWeightedTop20(mockRecs, () => 0.99999)
      expect(selected?.id).toBe(20)
    })

    it('works correctly when fewer than 20 items are available', () => {
      const smallList = [
        { id: 101, title: 'A' },
        { id: 102, title: 'B' },
        { id: 103, title: 'C' },
      ]
      expect(pickWeightedTop20(smallList, () => 0.0001)?.id).toBe(101)
      expect(pickWeightedTop20(smallList, () => 0.9999)?.id).toBe(103)
    })
  })

  describe('pickSurpriseRecommendation', () => {
    it('prioritizes candidates with DISCOVERY badge over regular recommendations', () => {
      const recs = [
        { id: 1, title: 'Comfort 1', predictedScore: 9.5, badges: ['STRONG_CONSENSUS'] },
        { id: 2, title: 'Discovery 1', predictedScore: 8.1, badges: ['DISCOVERY'] },
        { id: 3, title: 'Discovery 2', predictedScore: 7.9, badges: ['ACCLAIMED', 'DISCOVERY'] },
      ]

      const firstPick = pickSurpriseRecommendation(recs, () => 0.0001)
      expect(firstPick?.id).toBe(2)

      const secondPick = pickSurpriseRecommendation(recs, () => 0.9999)
      expect(secondPick?.id).toBe(3)
    })

    it('falls back to general pickWeightedTop20 when no anime has DISCOVERY badge', () => {
      const recs = [
        { id: 10, title: 'Comfort 1', predictedScore: 9.5, badges: [] },
        { id: 11, title: 'Comfort 2', predictedScore: 9.0, badges: ['STRONG_CONSENSUS'] },
      ]

      const pick = pickSurpriseRecommendation(recs, () => 0.0001)
      expect(pick?.id).toBe(10)
    })

    it('respects excludeId within DISCOVERY pool', () => {
      const recs = [
        { id: 1, title: 'Comfort 1', predictedScore: 9.5, badges: [] },
        { id: 2, title: 'Discovery 1', predictedScore: 8.1, badges: ['DISCOVERY'] },
        { id: 3, title: 'Discovery 2', predictedScore: 7.9, badges: ['DISCOVERY'] },
      ]

      const pick = pickSurpriseRecommendation(recs, () => 0.0001, 2)
      expect(pick?.id).toBe(3)
    })
  })

  describe('pickQuickStart', () => {
    const mockRecs = [
      {
        id: 1,
        title: 'Long Running 1',
        episodes: 50,
        streamingLinks: [{ site: 'Crunchyroll' }],
      },
      {
        id: 2,
        title: 'Quick CR 1',
        episodes: 12,
        streamingLinks: [{ site: 'Crunchyroll' }],
      },
      {
        id: 3,
        title: 'Quick Netflix 1',
        episodes: 24,
        streamingLinks: [{ site: 'Netflix' }],
      },
      {
        id: 4,
        title: 'Quick None',
        episodes: 12,
        streamingLinks: [{ site: 'OtherSite' }],
      },
      {
        id: 5,
        title: 'Long Running 2',
        media: { episodes: 100 },
        streamingLinks: [{ site: 'Crunchyroll' }],
      },
      {
        id: 6,
        title: 'Quick Media Prop',
        media: { episodes: 13 },
        streamingLinks: [{ site: 'Crunchyroll' }],
      },
    ]

    it('filters <= 24 episodes and matching user subscriptions', () => {
      const selected = pickQuickStart(mockRecs, ['Crunchyroll'], 24, () => 0.0001)
      expect(selected?.id).toBe(2)
    })

    it('supports custom maxEpisodes parameter', () => {
      const selected = pickQuickStart(mockRecs, ['Crunchyroll'], 10, () => 0.0001)
      // Since no CR anime has <= 10 eps (mockRecs CR has 12 and 13), it fallbacks cleanly
      expect(selected).not.toBeNull()
    })

    it('falls back to short anime regardless of streaming if no subscription match', () => {
      const selected = pickQuickStart(mockRecs, ['Disney+'], 24, () => 0.0001)
      expect(selected?.episodes || selected?.media?.episodes).toBeLessThanOrEqual(24)
      expect(selected?.id).toBe(2)
    })

    it('falls back to any recommendation if no anime has <= maxEpisodes', () => {
      const longOnly = [
        { id: 91, episodes: 100, streamingLinks: [{ site: 'Netflix' }] },
        { id: 92, episodes: 500, streamingLinks: [{ site: 'Netflix' }] },
      ]
      const selected = pickQuickStart(longOnly, ['Netflix'], 24, () => 0.0001)
      expect(selected?.id).toBe(91)
    })

    it('returns null when recommendations are empty', () => {
      expect(pickQuickStart([], ['Crunchyroll'])).toBeNull()
      expect(pickQuickStart(null, ['Crunchyroll'])).toBeNull()
    })
  })

  describe('makeDecision', () => {
    const mockRecs = [
      { id: 1, title: 'Anime 1', episodes: 100, streamingLinks: [{ site: 'Crunchyroll' }] },
      { id: 2, title: 'Anime 2', episodes: 12, streamingLinks: [{ site: 'Netflix' }] },
      { id: 3, title: 'Anime 3', episodes: 24, streamingLinks: [{ site: 'Crunchyroll' }] },
    ]

    it('dispatches to BEST mode', () => {
      const decision = makeDecision(DECISION_MODES.BEST, mockRecs, ['Crunchyroll'])
      expect(decision?.id).toBe(1)
    })

    it('dispatches to SURPRISE mode', () => {
      const decision = makeDecision(DECISION_MODES.SURPRISE, mockRecs, ['Crunchyroll'], () => 0.9999)
      expect(decision?.id).toBe(3)
    })

    it('dispatches to QUICK mode', () => {
      const decision = makeDecision(DECISION_MODES.QUICK, mockRecs, ['Crunchyroll'], () => 0.0001)
      expect(decision?.id).toBe(3)
    })

    it('falls back to SURPRISE mode for unknown modes', () => {
      const decision = makeDecision('unknown_mode', mockRecs, ['Crunchyroll'], () => 0.0001)
      expect(decision?.id).toBe(1)
    })

    it('respects excludeId across modes', () => {
      const decisionBest = makeDecision(DECISION_MODES.BEST, mockRecs, ['Crunchyroll'], Math.random, 1)
      expect(decisionBest?.id).toBe(2)

      const decisionSurprise = makeDecision(DECISION_MODES.SURPRISE, mockRecs, ['Crunchyroll'], () => 0.0001, 1)
      expect(decisionSurprise?.id).not.toBe(1)
    })

    it('handles empty recommendations cleanly', () => {
      expect(makeDecision(DECISION_MODES.BEST, [])).toBeNull()
      expect(makeDecision(DECISION_MODES.SURPRISE, [])).toBeNull()
      expect(makeDecision(DECISION_MODES.QUICK, [])).toBeNull()
    })
  })
})
