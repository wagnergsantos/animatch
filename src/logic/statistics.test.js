import { normalizeEntry, normalizeEntries, dedupeByMediaId, aggregateGenreStats, buildHistogram, buildMetricsSummary } from './statistics'

const sample = [
  { media: { id: 1, title: { english: 'A' }, episodes: 12, genres: ['Action', 'Sci-Fi'], averageScore: 80 }, predictedScore: 8.5, status: 'COMPLETED' },
  { media: { id: 2, title: { romaji: 'B' }, episodes: 24, genres: ['Drama'], averageScore: 70 }, predictedScore: 7.2, status: 'COMPLETED' },
  { media: { id: 1, title: { english: 'A' }, episodes: 12, genres: ['Action', 'Sci-Fi'], averageScore: 80 }, predictedScore: 8.5, status: 'COMPLETED' },
  { media: { id: 3, title: { english: 'C' }, episodes: null, genres: [], averageScore: null }, predictedScore: null, status: 'PLANNING' },
]

test('normalize and dedupe', () => {
  const norm = normalizeEntries(sample)
  expect(norm.length).toBe(4)
  const dedup = dedupeByMediaId(norm)
  expect(dedup.length).toBe(3)
  const ids = dedup.map((d) => d.id).sort()
  expect(ids).toEqual([1, 2, 3])
})

test('aggregateGenreStats', () => {
  const norm = normalizeEntries(sample)
  const dedup = dedupeByMediaId(norm)
  const stats = aggregateGenreStats(dedup)
  // Action should have count 1 (media id 1)
  const action = stats.find((s) => s.genre === 'Action')
  expect(action).toBeDefined()
  expect(action.count).toBe(1)
  expect(action.avgPredicted).toBeCloseTo(8.5)
  const drama = stats.find((s) => s.genre === 'Drama')
  expect(drama.count).toBe(1)
})

test('buildHistogram', () => {
  const norm = normalizeEntries(sample)
  const dedup = dedupeByMediaId(norm)
  const hist = buildHistogram(dedup, 5)
  expect(hist.length).toBe(5)
  const total = hist.reduce((s, b) => s + b.count, 0)
  // two entries with numeric predictedScore: 8.5 and 7.2
  expect(total).toBe(2)
})

test('buildMetricsSummary', () => {
  const norm = normalizeEntries(sample)
  const summary = buildMetricsSummary(norm)
  expect(summary.uniqueMedia).toBe(3)
  expect(summary.totalSeen).toBe(2)
  expect(summary.totalEpisodes).toBe(36)
})
