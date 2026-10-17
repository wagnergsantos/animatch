import { describe, it, expect, vi } from 'vitest'
import {
  buildWrappedData,
  renderWrappedCanvas,
  canvasToPngBlob,
  downloadWrappedPng,
  copyWrappedPngToClipboard,
} from '../logic/wrappedGenerator.js'

describe('wrappedGenerator', () => {
  it('buildWrappedData aggregates metrics, top 5 genres, and top 3 recommendations', () => {
    const entries = [
      { id: 1, status: 'COMPLETED', score: 9, episodes: 24 },
      { id: 2, status: 'COMPLETED', score: 8, episodes: 12 },
      { id: 3, status: 'CURRENT', score: 0, episodes: 10 },
      { id: 4, status: 'PLANNING', score: 0, episodes: 12 },
    ]
    const tasteProfile = new Map([
      ['Action', { adjustedAverage: 8.65, average: 8.8, count: 15 }],
      ['Sci-Fi', { adjustedAverage: 8.42, average: 8.5, count: 10 }],
      ['Drama', { adjustedAverage: 8.1, average: 8.2, count: 8 }],
      ['Mystery', { adjustedAverage: 7.9, average: 8.0, count: 6 }],
      ['Comedy', { adjustedAverage: 7.5, average: 7.6, count: 12 }],
      ['Horror', { adjustedAverage: 6.8, average: 7.0, count: 4 }],
    ])
    const recommendations = [
      {
        id: 101,
        title: 'Steins;Gate',
        predictedScore: 9.2,
        communityScore: 9.1,
        format: 'TV',
        year: 2011,
        genres: ['Sci-Fi', 'Drama'],
        coverImage: 'https://example.com/sg.jpg',
      },
      {
        id: 102,
        title: 'Monster',
        predictedScore: 8.9,
        communityScore: 8.9,
        format: 'TV',
        year: 2004,
        genres: ['Mystery', 'Drama'],
      },
      {
        id: 103,
        title: 'Pluto',
        predictedScore: 8.7,
        communityScore: 8.6,
        format: 'ONA',
        year: 2023,
        genres: ['Sci-Fi', 'Mystery'],
      },
      {
        id: 104,
        title: 'Extra Anime',
        predictedScore: 8.1,
        communityScore: 8.0,
        format: 'TV',
        year: 2020,
        genres: ['Action'],
      },
    ]

    const data = buildWrappedData({
      username: 'wagner',
      providerLabel: 'AniList',
      isEnsemble: false,
      activeProviders: ['AniList'],
      entries,
      tasteProfile,
      recommendations,
      titlePref: 'english',
    })

    expect(data.username).toBe('wagner')
    expect(data.metrics.completedCount).toBe(2)
    expect(data.metrics.totalEpisodes).toBe(46)
    expect(data.metrics.meanScore).toBe(8.5)
    expect(data.topGenres).toHaveLength(5)
    expect(data.topGenres[0]).toMatchObject({ genre: 'Action', score: 8.65, count: 15 })
    expect(data.topRecommendations).toHaveLength(3)
    expect(data.topRecommendations[0]).toMatchObject({
      rank: 1,
      title: 'Steins;Gate',
      predictedScore: 9.2,
    })
  })

  it('handles romaji title preference and nested media properties', () => {
    const entries = [
      {
        id: 1,
        status: 'COMPLETED',
        score: 90,
        media: { episodes: 13 },
      },
    ]
    const recommendations = [
      {
        id: 200,
        titleObj: { english: 'Attack on Titan', romaji: 'Shingeki no Kyojin' },
        predictedScore: 9.5,
        media: {
          coverImage: { large: 'https://example.com/aot.jpg' },
          format: 'TV',
          seasonYear: 2013,
          genres: ['Action', 'Drama'],
        },
      },
    ]

    const data = buildWrappedData({
      username: 'user2',
      providerLabel: 'Consolidado',
      isEnsemble: true,
      activeProviders: ['AniList', 'MyAnimeList'],
      entries,
      tasteProfile: new Map(),
      recommendations,
      titlePref: 'romaji',
    })

    expect(data.metrics.completedCount).toBe(1)
    expect(data.metrics.totalEpisodes).toBe(13)
    expect(data.metrics.meanScore).toBe(9)
    expect(data.topRecommendations[0].title).toBe('Shingeki no Kyojin')
    expect(data.topRecommendations[0].coverImage).toBe('https://example.com/aot.jpg')
  })

  it('renderWrappedCanvas draws 1200x630 card without throwing even when image loader returns null', async () => {
    const ctxMock = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      arcTo: vi.fn(),
      roundRect: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      clip: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      fillText: vi.fn(),
      drawImage: vi.fn(),
      measureText: vi.fn((text) => ({ width: String(text).length * 8 })),
      createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      createRadialGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
    }
    const canvasMock = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ctxMock),
      toBlob: vi.fn((cb) => cb(new Blob(['png'], { type: 'image/png' }))),
    }

    const data = buildWrappedData({
      username: 'wagner',
      providerLabel: 'AniList',
      entries: [{ id: 1, status: 'COMPLETED', score: 9, episodes: 12 }],
      tasteProfile: new Map([['Action', { adjustedAverage: 8.5, count: 5 }]]),
      recommendations: [
        { id: 10, title: 'Cowboy Bebop', predictedScore: 9.0, genres: ['Action'] },
      ],
    })

    await renderWrappedCanvas(canvasMock, data, {}, async () => null)

    expect(canvasMock.width).toBe(1200)
    expect(canvasMock.height).toBe(630)
    expect(ctxMock.fillText).toHaveBeenCalled()

    const blob = await canvasToPngBlob(canvasMock)
    expect(blob).toBeInstanceOf(Blob)
    expect(typeof downloadWrappedPng).toBe('function')
    expect(typeof copyWrappedPngToClipboard).toBe('function')
  })
})
