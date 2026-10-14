import { describe, it, expect } from 'vitest'
import {
  normalizeAnimeKey,
  mergeAnimeEntries,
  applyMultiPresenceBoost,
} from './ensemble.js'

describe('ensemble logic', () => {
  describe('normalizeAnimeKey', () => {
    it('uses idMal when available on media', () => {
      const entry = { media: { id: 10, idMal: 5114, title: { english: 'Fullmetal Alchemist' } } }
      expect(normalizeAnimeKey(entry)).toBe('mal:5114')
    })

    it('uses idMal when available directly on anime entry or media object', () => {
      const directAnime = { id: 20, idMal: 9253, title: { english: 'Steins;Gate' } }
      expect(normalizeAnimeKey(directAnime)).toBe('mal:9253')
    })

    it('uses media.id when provider is mal', () => {
      const entry = { media: { id: 5114, provider: 'mal', title: { english: 'Fullmetal Alchemist' } } }
      expect(normalizeAnimeKey(entry)).toBe('mal:5114')
    })

    it('uses id when provider is mal on direct anime object', () => {
      const directMal = { id: 1535, provider: 'mal', title: 'Death Note' }
      expect(normalizeAnimeKey(directMal)).toBe('mal:1535')
    })

    it('ignores falsy idMal and falls back to normalized title and year', () => {
      const entryWithNullIdMal = {
        media: { id: 99, idMal: null, title: { english: 'Toradora!' }, seasonYear: 2008 },
      }
      expect(normalizeAnimeKey(entryWithNullIdMal)).toBe('title:toradora_2008')

      const entryWithZeroIdMal = {
        media: { id: 99, idMal: 0, title: { english: 'Toradora!' }, seasonYear: 2008 },
      }
      expect(normalizeAnimeKey(entryWithZeroIdMal)).toBe('title:toradora_2008')
    })

    it('falls back to normalized alphanumeric title and year', () => {
      const entry = { media: { id: 99, title: { english: 'Steins;Gate 0!' }, seasonYear: 2018 } }
      expect(normalizeAnimeKey(entry)).toBe('title:steinsgate0_2018')
    })

    it('resolves year from startDate.year when seasonYear is absent', () => {
      const entry = {
        media: {
          id: 42,
          title: { english: 'Mob Psycho 100' },
          startDate: { year: 2016, month: 7, day: 11 },
        },
      }
      expect(normalizeAnimeKey(entry)).toBe('title:mobpsycho100_2016')
    })

    it('resolves year from media.year if present', () => {
      const entry = { media: { id: 42, title: { english: 'Evangelion' }, year: 1995 } }
      expect(normalizeAnimeKey(entry)).toBe('title:evangelion_1995')
    })

    it('handles missing year with any in fallback title', () => {
      const entry = { media: { id: 99, title: { romaji: 'Toradora!' } } }
      expect(normalizeAnimeKey(entry)).toBe('title:toradora_any')
    })

    it('handles title as a raw string', () => {
      const entry = { media: { id: 99, title: 'Cowboy Bebop', seasonYear: 1998 } }
      expect(normalizeAnimeKey(entry)).toBe('title:cowboybebop_1998')
    })

    it('defensively handles null, undefined, or empty entry', () => {
      expect(normalizeAnimeKey(null)).toBe('title:unknown_any')
      expect(normalizeAnimeKey(undefined)).toBe('title:unknown_any')
      expect(normalizeAnimeKey({})).toBe('title:unknown_any')
      expect(normalizeAnimeKey({ media: { title: '!!!' } })).toBe('title:unknown_any')
    })
  })

  describe('mergeAnimeEntries', () => {
    it('handles empty or non-object input gracefully', () => {
      expect(mergeAnimeEntries()).toEqual([])
      expect(mergeAnimeEntries(null)).toEqual([])
      expect(mergeAnimeEntries({})).toEqual([])
    })

    it('ignores null entries or non-array provider values', () => {
      const input = {
        anilist: null,
        mal: [null, { status: 'COMPLETED', score: 8, media: { id: 1, provider: 'mal', title: 'Solo' } }],
      }
      const merged = mergeAnimeEntries(input)
      expect(merged).toHaveLength(1)
      expect(merged[0].score).toBe(8)
    })

    it('gives COMPLETED precedence over PLANNING', () => {
      const entriesByProvider = {
        anilist: [
          { status: 'PLANNING', score: 0, media: { id: 1, idMal: 100, title: { english: 'Death Note' }, genres: ['Mystery'] } },
        ],
        mal: [
          { status: 'COMPLETED', score: 9, media: { id: 100, provider: 'mal', title: { english: 'Death Note' }, genres: ['Mystery', 'Supernatural'] } },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(1)
      expect(merged[0].status).toBe('COMPLETED')
      expect(merged[0].score).toBe(9)
      expect(merged[0].media.genres).toEqual(['Mystery', 'Supernatural'])
    })

    it('gives CURRENT precedence over PAUSED, DROPPED and PLANNING', () => {
      const entriesByProvider = {
        anilist: [
          { status: 'PLANNING', score: 0, media: { id: 1, idMal: 100, title: { english: 'Bleach' } } },
        ],
        kitsu: [
          { status: 'CURRENT', score: 7, media: { id: 50, title: { english: 'Bleach' }, seasonYear: 2004 } },
        ],
        mal: [
          { status: 'DROPPED', score: 4, media: { id: 100, provider: 'mal', title: { english: 'Bleach' } } },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(1)
      expect(merged[0].status).toBe('CURRENT')
    })

    it('gives PAUSED precedence over DROPPED and PLANNING', () => {
      const entriesByProvider = {
        anilist: [
          { status: 'PLANNING', score: 0, media: { id: 1, idMal: 100, title: { english: 'Gintama' } } },
        ],
        mal: [
          { status: 'PAUSED', score: 8, media: { id: 100, provider: 'mal', title: { english: 'Gintama' } } },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(1)
      expect(merged[0].status).toBe('PAUSED')
    })

    it('gives DROPPED precedence over PLANNING', () => {
      const entriesByProvider = {
        anilist: [
          { status: 'PLANNING', score: 0, media: { id: 1, idMal: 100, title: { english: 'Boruto' } } },
        ],
        mal: [
          { status: 'DROPPED', score: 3, media: { id: 100, provider: 'mal', title: { english: 'Boruto' } } },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(1)
      expect(merged[0].status).toBe('DROPPED')
    })

    it('calculates arithmetic average of user scores across providers', () => {
      const entriesByProvider = {
        anilist: [
          { status: 'COMPLETED', score: 10, media: { id: 1, idMal: 100, title: { english: 'Monster' } } },
        ],
        mal: [
          { status: 'COMPLETED', score: 8, media: { id: 100, provider: 'mal', title: { english: 'Monster' } } },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(1)
      expect(merged[0].score).toBe(9)
    })

    it('averages only scores > 0 and rounds to 2 decimals', () => {
      const entriesByProvider = {
        anilist: [
          { status: 'COMPLETED', score: 0, media: { id: 1, idMal: 200, title: { english: 'Vinland Saga' } } },
        ],
        kitsu: [
          { status: 'COMPLETED', score: 8.5, media: { id: 2, title: { english: 'Vinland Saga' }, seasonYear: 2019 } },
        ],
        mal: [
          { status: 'COMPLETED', score: 9, media: { id: 200, provider: 'mal', title: { english: 'Vinland Saga' } } },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(1)
      // (8.5 + 9) / 2 = 8.75
      expect(merged[0].score).toBe(8.75)
    })

    it('returns score 0 when no scores > 0 exist', () => {
      const entriesByProvider = {
        anilist: [
          { status: 'PLANNING', score: 0, media: { id: 1, idMal: 300, title: { english: 'Pluto' } } },
        ],
        mal: [
          { status: 'PLANNING', score: 0, media: { id: 300, provider: 'mal', title: { english: 'Pluto' } } },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(1)
      expect(merged[0].score).toBe(0)
    })

    it('tracks planningProviders when item is in PLANNING in multiple providers', () => {
      const entriesByProvider = {
        anilist: [
          { status: 'PLANNING', score: 0, media: { id: 1, idMal: 200, title: { english: 'Frieren' }, genres: ['Fantasy'] } },
        ],
        kitsu: [
          { status: 'PLANNING', score: 0, media: { id: 999, title: { english: 'Frieren' }, genres: ['Adventure'], seasonYear: 2023 } },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(1)
      expect(merged[0].status).toBe('PLANNING')
      expect(merged[0].planningProviders).toContain('anilist')
      expect(merged[0].planningProviders).toContain('kitsu')
      expect(merged[0].planningProviders).toHaveLength(2)
      expect(merged[0].sourceProviders).toEqual(expect.arrayContaining(['anilist', 'kitsu']))
    })

    it('does not include completed/watching providers in planningProviders', () => {
      const entriesByProvider = {
        anilist: [
          { status: 'PLANNING', score: 0, media: { id: 1, idMal: 200, title: { english: 'Frieren' } } },
        ],
        mal: [
          { status: 'COMPLETED', score: 10, media: { id: 200, provider: 'mal', title: { english: 'Frieren' } } },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(1)
      expect(merged[0].planningProviders).toEqual(['anilist'])
      expect(merged[0].sourceProviders).toEqual(expect.arrayContaining(['anilist', 'mal']))
    })

    it('deduplicates streamingLinks by site across providers', () => {
      const entriesByProvider = {
        anilist: [
          {
            status: 'PLANNING',
            media: {
              id: 1,
              idMal: 100,
              title: { english: 'Chainsaw Man' },
              streamingLinks: [
                { site: 'Crunchyroll', url: 'https://crunchyroll.com/csm-ani' },
                { site: 'Netflix', url: 'https://netflix.com/csm' },
              ],
            },
          },
        ],
        mal: [
          {
            status: 'PLANNING',
            media: {
              id: 100,
              provider: 'mal',
              title: { english: 'Chainsaw Man' },
              streamingLinks: [
                { site: 'Crunchyroll', url: 'https://crunchyroll.com/csm-mal' },
                { site: 'Hulu', url: 'https://hulu.com/csm' },
              ],
            },
          },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(1)
      const sites = merged[0].media.streamingLinks.map((link) => link.site)
      expect(sites).toEqual(['Crunchyroll', 'Netflix', 'Hulu'])
      expect(merged[0].media.streamingLinks[0].url).toBe('https://crunchyroll.com/csm-ani')
    })

    it('preserves base media properties from most complete entry', () => {
      const entriesByProvider = {
        kitsu: [
          {
            status: 'PLANNING',
            media: {
              id: 888,
              title: { english: 'Spy x Family' },
              seasonYear: 2022,
              coverImage: { large: 'https://kitsu.io/poster.jpg' },
              // Missing description
            },
          },
        ],
        anilist: [
          {
            status: 'PLANNING',
            media: {
              id: 140960,
              idMal: 50265,
              title: { english: 'Spy x Family' },
              seasonYear: 2022,
              description: 'A spy must build a fake family.',
              coverImage: { large: 'https://anilist.co/cover.jpg' },
              bannerImage: 'https://anilist.co/banner.jpg',
            },
          },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(1)
      expect(merged[0].media.description).toBe('A spy must build a fake family.')
      expect(merged[0].media.bannerImage).toBe('https://anilist.co/banner.jpg')
    })
  })

  describe('applyMultiPresenceBoost', () => {
    it('returns empty array when recommendations is empty or invalid', () => {
      expect(applyMultiPresenceBoost([])).toEqual([])
      expect(applyMultiPresenceBoost(null)).toEqual([])
      expect(applyMultiPresenceBoost(undefined)).toEqual([])
    })

    it('applies no boost when present in only 1 provider', () => {
      const recs = [{ id: 1, predictedScore: 8.0, planningProviders: ['anilist'] }]
      const boosted = applyMultiPresenceBoost(recs, 0.05)
      expect(boosted[0].predictedScore).toBe(8.0)
      expect(boosted[0].presenceMultiplier).toBe(1.0)
    })

    it('applies no boost when planningProviders is missing or empty', () => {
      const recs = [{ id: 1, predictedScore: 7.5 }]
      const boosted = applyMultiPresenceBoost(recs)
      expect(boosted[0].predictedScore).toBe(7.5)
      expect(boosted[0].presenceMultiplier).toBe(1.0)
    })

    it('applies 5% boost when present in 2 providers with default k=0.05', () => {
      const recs = [{ id: 1, predictedScore: 8.0, planningProviders: ['anilist', 'mal'] }]
      const boosted = applyMultiPresenceBoost(recs)
      // 8.0 * (1 + 0.05 * 1) = 8.4
      expect(boosted[0].predictedScore).toBe(8.4)
      expect(boosted[0].presenceMultiplier).toBe(1.05)
    })

    it('applies 10% boost when present in 3 providers, capped at 10.0', () => {
      const recs = [{ id: 1, predictedScore: 9.5, planningProviders: ['anilist', 'kitsu', 'mal'] }]
      const boosted = applyMultiPresenceBoost(recs, 0.05)
      // 9.5 * (1 + 0.05 * 2) = 10.45 -> capped at 10.0
      expect(boosted[0].predictedScore).toBe(10.0)
      expect(boosted[0].presenceMultiplier).toBe(1.1)
    })

    it('supports custom k multiplier parameter', () => {
      const recs = [{ id: 1, predictedScore: 8.0, planningProviders: ['anilist', 'mal'] }]
      const boosted = applyMultiPresenceBoost(recs, 0.10)
      // 8.0 * (1 + 0.10 * 1) = 8.8
      expect(boosted[0].predictedScore).toBe(8.8)
      expect(boosted[0].presenceMultiplier).toBe(1.1)
    })

    it('falls back to communityScore if predictedScore is null/undefined', () => {
      const recs = [{ id: 1, communityScore: 7.0, planningProviders: ['anilist', 'mal'] }]
      const boosted = applyMultiPresenceBoost(recs, 0.05)
      // 7.0 * (1 + 0.05 * 1) = 7.35
      expect(boosted[0].predictedScore).toBe(7.35)
      expect(boosted[0].presenceMultiplier).toBe(1.05)
    })

    it('caps score at 10.0 even when raw boost exceeds 10', () => {
      const recs = [{ id: 1, predictedScore: 9.8, planningProviders: ['anilist', 'mal'] }]
      const boosted = applyMultiPresenceBoost(recs, 0.05)
      // 9.8 * 1.05 = 10.29 -> 10.0
      expect(boosted[0].predictedScore).toBe(10.0)
    })
  })

  describe('additional edge cases', () => {
    it('matches anime using romaji and english titles across providers', () => {
      const entriesByProvider = {
        anilist: [
          {
            status: 'PLANNING',
            media: {
              id: 16498,
              title: { romaji: 'Shingeki no Kyojin', english: 'Attack on Titan' },
              seasonYear: 2013,
            },
          },
        ],
        kitsu: [
          {
            status: 'COMPLETED',
            score: 9,
            media: {
              id: 7442,
              title: { canonicalTitle: 'Shingeki no Kyojin' },
              seasonYear: 2013,
            },
          },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(1)
      expect(merged[0].status).toBe('COMPLETED')
      expect(merged[0].score).toBe(9)
    })

    it('handles PLAN_TO_WATCH, ON_HOLD, and WATCHING aliases correctly', () => {
      const entriesByProvider = {
        mal: [
          { status: 'plan_to_watch', score: 0, media: { id: 1, provider: 'mal', title: 'Test 1' } },
          { status: 'on_hold', score: 7, media: { id: 2, provider: 'mal', title: 'Test 2' } },
          { status: 'watching', score: 8, media: { id: 3, provider: 'mal', title: 'Test 3' } },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(3)

      const entry1 = merged.find((e) => e.media.id === 1)
      const entry2 = merged.find((e) => e.media.id === 2)
      const entry3 = merged.find((e) => e.media.id === 3)

      expect(entry1.status).toBe('PLANNING')
      expect(entry1.planningProviders).toEqual(['mal'])
      expect(entry2.status).toBe('PAUSED')
      expect(entry3.status).toBe('CURRENT')
    })

    it('gracefully handles entries with missing or non-array genres and streamingLinks', () => {
      const entriesByProvider = {
        anilist: [
          { status: 'COMPLETED', score: 10, media: { id: 1, idMal: 10, genres: null, streamingLinks: null } },
        ],
        mal: [
          { status: 'COMPLETED', score: 10, media: { id: 10, provider: 'mal', genres: undefined, streamingLinks: [null, { site: '' }] } },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(1)
      expect(merged[0].media.genres).toEqual([])
      expect(merged[0].media.streamingLinks).toEqual([])
    })

    it('uses canonicalTitle in normalizeAnimeKey when other title fields are absent', () => {
      const entry = { media: { id: 700, title: { canonicalTitle: 'Baccano!' }, seasonYear: 2007 } }
      expect(normalizeAnimeKey(entry)).toBe('title:baccano_2007')

      const direct = { id: 700, title: { canonicalTitle: 'Durarara!!' }, seasonYear: 2010 }
      expect(normalizeAnimeKey(direct)).toBe('title:durarara_2010')
    })

    it('guards against string "0" in idMal and mal provider id in normalizeAnimeKey', () => {
      const entryWithStringZeroIdMal = {
        media: { id: 1, idMal: '0', title: { english: 'Haikyuu!!' }, seasonYear: 2014 },
      }
      expect(normalizeAnimeKey(entryWithStringZeroIdMal)).toBe('title:haikyuu_2014')

      const entryWithStringZeroMalId = {
        media: { id: '0', provider: 'mal', title: { english: 'Haikyuu!!' }, seasonYear: 2014 },
      }
      expect(normalizeAnimeKey(entryWithStringZeroMalId)).toBe('title:haikyuu_2014')
    })

    it('aggregates streaming links from AniList externalLinks with type STREAMING', () => {
      const entriesByProvider = {
        anilist: [
          {
            status: 'PLANNING',
            media: {
              id: 1,
              idMal: 500,
              title: { english: 'Jujutsu Kaisen' },
              externalLinks: [
                { site: 'Crunchyroll', url: 'https://crunchyroll.com/jjk', type: 'STREAMING' },
                { site: 'Twitter', url: 'https://twitter.com/jjk', type: 'INFO' },
              ],
            },
          },
        ],
        kitsu: [
          {
            status: 'PLANNING',
            media: {
              id: 2,
              title: { english: 'Jujutsu Kaisen' },
              seasonYear: 2020,
              streamingLinks: [
                { site: 'Crunchyroll', url: 'https://crunchyroll.com/jjk-kitsu' },
                { site: 'Netflix', url: 'https://netflix.com/jjk' },
              ],
            },
          },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(1)
      const sites = merged[0].media.streamingLinks.map((l) => l.site)
      expect(sites).toEqual(['Crunchyroll', 'Netflix'])
      expect(merged[0].media.streamingLinks[0].url).toBe('https://crunchyroll.com/jjk')
    })

    it('merges title.english and title.romaji subfields across providers when bestEntry lacks one', () => {
      const entriesByProvider = {
        kitsu: [
          {
            status: 'PLANNING',
            media: {
              id: 1,
              title: { romaji: 'Kimetsu no Yaiba' },
              seasonYear: 2019,
              description: 'Rich description making it bestEntry',
            },
          },
        ],
        anilist: [
          {
            status: 'PLANNING',
            media: {
              id: 101302,
              idMal: 38000,
              title: { english: 'Demon Slayer: Kimetsu no Yaiba', romaji: 'Kimetsu no Yaiba' },
              seasonYear: 2019,
            },
          },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(1)
      expect(merged[0].media.title.romaji).toBe('Kimetsu no Yaiba')
      expect(merged[0].media.title.english).toBe('Demon Slayer: Kimetsu no Yaiba')
    })

    it('recognizes PLANNED status as PLANNING and records it in planningProviders', () => {
      const entriesByProvider = {
        kitsu: [
          {
            status: 'PLANNED',
            score: 0,
            media: { id: 1, title: { english: 'Solo Leveling' }, seasonYear: 2024 },
          },
        ],
      }

      const merged = mergeAnimeEntries(entriesByProvider)
      expect(merged).toHaveLength(1)
      expect(merged[0].status).toBe('PLANNING')
      expect(merged[0].planningProviders).toEqual(['kitsu'])
    })
  })
})


