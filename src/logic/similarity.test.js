import { describe, it, expect } from 'vitest'
import {
  toNormalizedSet,
  calculateJaccardSimilarity,
  calculateAnimeSimilarity,
  rankAnimesBySimilarity,
} from './similarity.js'

describe('similarity.js', () => {
  describe('toNormalizedSet', () => {
    it('normalizes string arrays to lowercased unique set', () => {
      const set = toNormalizedSet(['Action', 'ACTION', '  Drama ', 'Sci-Fi'])
      expect(Array.from(set).sort()).toEqual(['action', 'drama', 'sci-fi'])
    })

    it('handles empty or null inputs', () => {
      expect(toNormalizedSet(null).size).toBe(0)
      expect(toNormalizedSet([]).size).toBe(0)
    })
  })

  describe('calculateJaccardSimilarity', () => {
    it('returns 1.0 for identical sets', () => {
      const sim = calculateJaccardSimilarity(['Action', 'Sci-Fi'], ['action', 'sci-fi'])
      expect(sim).toBe(1.0)
    })

    it('returns 0.0 for disjoint sets', () => {
      const sim = calculateJaccardSimilarity(['Action', 'Sci-Fi'], ['Drama', 'Romance'])
      expect(sim).toBe(0.0)
    })

    it('computes intersection / union correctly', () => {
      // A: [Action, Sci-Fi, Thriller, Drama] = 4
      // B: [Mystery, Thriller, Supernatural, Drama] = 4
      // Inter: [Thriller, Drama] = 2
      // Union: [Action, Sci-Fi, Thriller, Drama, Mystery, Supernatural] = 6
      // Jaccard = 2 / 6 = 0.3333...
      const sim = calculateJaccardSimilarity(
        ['Action', 'Sci-Fi', 'Thriller', 'Drama'],
        ['Mystery', 'Thriller', 'Supernatural', 'Drama']
      )
      expect(sim).toBeCloseTo(2 / 6, 4)
    })

    it('returns 0.0 when both sets are empty', () => {
      expect(calculateJaccardSimilarity([], [])).toBe(0.0)
    })
  })

  describe('calculateAnimeSimilarity', () => {
    it('calculates weighted similarity including studio and format', () => {
      const target = {
        title: 'Steins;Gate',
        genres: ['Sci-Fi', 'Thriller'],
        studio: 'White Fox',
        format: 'TV',
      }
      const candidateSameStudio = {
        title: 'Re:Zero',
        genres: ['Fantasy', 'Thriller', 'Drama'],
        studio: 'White Fox',
        format: 'TV',
      }

      const res = calculateAnimeSimilarity(target, candidateSameStudio)
      // Jaccard of genres:
      // A: [sci-fi, thriller] (2)
      // B: [fantasy, thriller, drama] (3)
      // Inter: [thriller] (1), Union: 4 => 0.25
      // 0.25 * 0.8 = 0.20
      // Same studio = 0.15
      // Same format = 0.05
      // Total = 0.40
      expect(res.similarity).toBeCloseTo(0.4, 2)
      expect(res.commonGenres).toEqual(['Thriller'])
    })
  })

  describe('rankAnimesBySimilarity', () => {
    const target = {
      id: 1,
      title: 'Psycho-Pass',
      genres: ['Action', 'Sci-Fi', 'Psychological'],
      studio: 'Production I.G',
      format: 'TV',
    }

    const pool = [
      {
        id: 1, // Target itself
        title: 'Psycho-Pass',
        genres: ['Action', 'Sci-Fi', 'Psychological'],
        predictedScore: 8.5,
      },
      {
        id: 2,
        title: 'Ghost in the Shell: SAC',
        genres: ['Action', 'Sci-Fi', 'Psychological', 'Police'],
        studio: 'Production I.G',
        format: 'TV',
        predictedScore: 8.4,
      },
      {
        id: 3,
        title: 'Non Non Biyori',
        genres: ['Slice of Life', 'Comedy'],
        studio: 'Silver Link',
        format: 'TV',
        predictedScore: 7.9,
      },
      {
        id: 4,
        title: 'Ergo Proxy',
        genres: ['Sci-Fi', 'Psychological', 'Mystery'],
        studio: 'Manglobe',
        format: 'TV',
        predictedScore: 8.1,
      },
    ]

    it('excludes target and ranks candidates by similarity', () => {
      const ranked = rankAnimesBySimilarity(target, pool)

      expect(ranked.length).toBe(2) // Non Non Biyori has 0 similarity, target excluded
      expect(ranked[0].id).toBe(2) // Ghost in the Shell top match
      expect(ranked[1].id).toBe(4) // Ergo Proxy second match
      expect(ranked[0].similarityScore).toBeGreaterThan(ranked[1].similarityScore)
    })
  })
})
