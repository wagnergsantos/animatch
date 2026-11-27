import { describe, it, expect } from 'vitest'
import { applyMMRDiversity } from './diversity.js'

describe('diversity.js — applyMMRDiversity', () => {
  it('returns original array when empty or small', () => {
    expect(applyMMRDiversity([])).toEqual([])
    expect(applyMMRDiversity([{ id: 1 }])).toEqual([{ id: 1 }])
  })

  it('keeps the #1 top recommendation unchanged', () => {
    const list = [
      { id: 1, title: 'Top 1', predictedScore: 9.0, genres: ['Action', 'Shounen'] },
      { id: 2, title: 'Top 2', predictedScore: 8.9, genres: ['Action', 'Shounen'] },
      { id: 3, title: 'Top 3', predictedScore: 8.8, genres: ['Romance', 'Drama'] },
    ]
    const reordered = applyMMRDiversity(list, { lambda: 0.7 })
    expect(reordered[0].id).toBe(1)
  })

  it('promotes diverse genre candidates ahead of redundant clones', () => {
    // 3 nearly identical Action/Shounen animes with scores 9.0, 8.9, 8.85
    // 1 Romance/Drama anime with score 8.80
    // With pure relevance, order is: 1, 2, 3, 4
    // With MMR (diversity), anime 4 should be promoted before anime 3 because 2 is already Action/Shounen!
    const list = [
      { id: 1, title: 'Shounen A', predictedScore: 9.0, genres: ['Action', 'Shounen'] },
      { id: 2, title: 'Shounen B', predictedScore: 8.95, genres: ['Action', 'Shounen'] },
      { id: 3, title: 'Shounen C', predictedScore: 8.90, genres: ['Action', 'Shounen'] },
      { id: 4, title: 'Romance A', predictedScore: 8.85, genres: ['Romance', 'Drama'] },
    ]

    const reordered = applyMMRDiversity(list, { lambda: 0.6, windowSize: 2 })

    // Check that Romance A (id: 4) gets pushed up ahead of Shounen C (id: 3)
    const ids = reordered.map((r) => r.id)
    expect(ids[0]).toBe(1) // Top stays top
    expect(ids.indexOf(4)).toBeLessThan(ids.indexOf(3))
  })

  it('preserves exact predictedScores without altering values', () => {
    const list = [
      { id: 1, predictedScore: 8.5, genres: ['Action'] },
      { id: 2, predictedScore: 8.4, genres: ['Action'] },
      { id: 3, predictedScore: 8.3, genres: ['Drama'] },
    ]

    const reordered = applyMMRDiversity(list, { lambda: 0.7 })
    expect(reordered.find((r) => r.id === 1).predictedScore).toBe(8.5)
    expect(reordered.find((r) => r.id === 2).predictedScore).toBe(8.4)
    expect(reordered.find((r) => r.id === 3).predictedScore).toBe(8.3)
  })

  it('returns clone when lambda is 1.0 (pure relevance)', () => {
    const list = [
      { id: 1, predictedScore: 9.0, genres: ['Action'] },
      { id: 2, predictedScore: 8.9, genres: ['Action'] },
      { id: 3, predictedScore: 8.8, genres: ['Action'] },
    ]
    const reordered = applyMMRDiversity(list, { lambda: 1.0 })
    expect(reordered.map((r) => r.id)).toEqual([1, 2, 3])
  })
})
