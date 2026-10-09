import { describe, it, expect } from 'vitest'
import {
  STREAMING_SERVICES,
  normalizeServiceName,
  getAnimeStreamingServices,
  matchesUserSubscriptions,
  applyStreamingBoost,
} from './streaming.js'

describe('streaming logic', () => {
  it('defines STREAMING_SERVICES array', () => {
    expect(STREAMING_SERVICES).toEqual([
      'Crunchyroll',
      'Netflix',
      'Prime Video',
      'Disney+',
      'Max',
      'HIDIVE',
    ])
  })

  it('normalizes common streaming service variations', () => {
    expect(normalizeServiceName('crunchyroll')).toBe('Crunchyroll')
    expect(normalizeServiceName('Netflix')).toBe('Netflix')
    expect(normalizeServiceName('Amazon Prime Video')).toBe('Prime Video')
    expect(normalizeServiceName('amazon')).toBe('Prime Video')
    expect(normalizeServiceName('HBO Max')).toBe('Max')
    expect(normalizeServiceName('hbo')).toBe('Max')
    expect(normalizeServiceName('Disney Plus')).toBe('Disney+')
    expect(normalizeServiceName('disney+')).toBe('Disney+')
    expect(normalizeServiceName('disney')).toBe('Disney+')
    expect(normalizeServiceName('HIDIVE')).toBe('HIDIVE')
    expect(normalizeServiceName('Unknown Platform')).toBe('Unknown Platform')
    expect(normalizeServiceName('')).toBe('')
    expect(normalizeServiceName(null)).toBe('')
    expect(normalizeServiceName(undefined)).toBe('')
  })

  it('extracts streaming services from anime object (root and media properties)', () => {
    const anime1 = {
      streamingLinks: [
        { site: 'Crunchyroll', url: 'https://crunchyroll.com/anime' },
        { site: 'Netflix', url: 'https://netflix.com/anime' },
      ],
    }
    expect(getAnimeStreamingServices(anime1)).toEqual(['Crunchyroll', 'Netflix'])

    const anime2 = {
      media: {
        streamingLinks: [
          { site: 'HBO Max', url: 'https://max.com/anime' },
          { site: 'Amazon Prime Video', url: 'https://amazon.com/anime' },
        ],
      },
    }
    expect(getAnimeStreamingServices(anime2)).toEqual(['Max', 'Prime Video'])

    expect(getAnimeStreamingServices(null)).toEqual([])
    expect(getAnimeStreamingServices({})).toEqual([])
  })

  it('checks if anime matches user subscriptions', () => {
    const anime = {
      streamingLinks: [{ site: 'Crunchyroll', url: 'https://crunchyroll.com/anime' }],
    }
    expect(matchesUserSubscriptions(anime, ['Crunchyroll', 'Netflix'])).toBe(true)
    expect(matchesUserSubscriptions(anime, ['Netflix', 'Prime Video'])).toBe(false)
    expect(matchesUserSubscriptions(anime, [])).toBe(false)
    expect(matchesUserSubscriptions(anime, null)).toBe(false)
    expect(matchesUserSubscriptions(null, ['Crunchyroll'])).toBe(false)
  })

  it('applies boost to recommendations available on user subscriptions', () => {
    const recs = [
      { id: 1, predictedScore: 8.0, streamingLinks: [{ site: 'Netflix' }] },
      { id: 2, predictedScore: 8.2, streamingLinks: [{ site: 'Hulu' }] },
    ]
    const boosted = applyStreamingBoost(recs, ['Netflix'], 0.3)
    expect(boosted[0].id).toBe(1)
    expect(boosted[0].predictedScore).toBe(8.3)
    expect(boosted[0].hasStreamingBoost).toBe(true)
    expect(boosted[1].predictedScore).toBe(8.2)
    expect(boosted[1].hasStreamingBoost).toBeUndefined()
  })

  it('handles edge cases in applyStreamingBoost gracefully', () => {
    const recs = [
      { id: 1, predictedScore: 8.0, streamingLinks: [{ site: 'Netflix' }] },
    ]
    expect(applyStreamingBoost(recs, [])).toBe(recs)
    expect(applyStreamingBoost(recs, null)).toBe(recs)
    expect(applyStreamingBoost(recs, ['Netflix'], 0)).toBe(recs)
    expect(applyStreamingBoost([], ['Netflix'], 0.3)).toEqual([])
  })
})
