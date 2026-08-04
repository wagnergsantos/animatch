// statistics.js — normalization and aggregation helpers for Statistics page

export function normalizeScore(raw) {
  if (raw == null) return null
  const n = Number(raw)
  if (Number.isNaN(n)) return null
  // AniList averageScore may be 0-100; predictedScore likely 0-10
  if (n > 10) return +(n / 10).toFixed(2)
  return +n
}

export function normalizeEntry(entry) {
  // Accept different shapes: entry.media (anilist) or flat
  const media = entry.media || entry
  const id = media?.id ?? entry?.id ?? null
  const title = media?.title?.english || media?.title?.romaji || media?.title || entry?.title || 'Untitled'
  const episodes = media?.episodes ?? entry?.episodes ?? null
  const genres = media?.genres ?? entry?.genres ?? []
  const predictedScoreRaw = entry?.predictedScore ?? entry?.score ?? null
  const communityRaw = media?.averageScore ?? entry?.communityScore ?? null

  return {
    id,
    title,
    episodes: typeof episodes === 'number' ? episodes : episodes == null ? null : Number(episodes) || null,
    genres: Array.isArray(genres) ? genres.filter(Boolean) : [],
    predictedScore: normalizeScore(predictedScoreRaw),
    communityScore: normalizeScore(communityRaw),
    status: entry?.status ?? null,
    provider: entry?.provider ?? null,
  }
}

export function normalizeEntries(entries = []) {
  return (entries || []).map(normalizeEntry)
}

export function dedupeByMediaId(entries = []) {
  const map = new Map()
  for (const e of entries || []) {
    if (!e || e.id == null) continue
    if (!map.has(e.id)) map.set(e.id, e)
  }
  return Array.from(map.values())
}

export function aggregateGenreStats(entries = []) {
  // entries: normalized, deduped
  const stats = new Map()
  for (const e of entries) {
    const pred = typeof e.predictedScore === 'number' ? e.predictedScore : null
    const comm = typeof e.communityScore === 'number' ? e.communityScore : null
    for (const g of e.genres || []) {
      if (!stats.has(g)) stats.set(g, { genre: g, count: 0, predictedSum: 0, communitySum: 0, predictedCount: 0, communityCount: 0 })
      const s = stats.get(g)
      s.count += 1
      if (pred != null) { s.predictedSum += pred; s.predictedCount += 1 }
      if (comm != null) { s.communitySum += comm; s.communityCount += 1 }
    }
  }

  const arr = Array.from(stats.values()).map((s) => ({
    genre: s.genre,
    count: s.count,
    avgPredicted: s.predictedCount > 0 ? +(s.predictedSum / s.predictedCount).toFixed(2) : null,
    avgCommunity: s.communityCount > 0 ? +(s.communitySum / s.communityCount).toFixed(2) : null,
  }))

  // sort by count desc
  arr.sort((a, b) => b.count - a.count)
  return arr
}

export function buildHistogram(entries = [], bins = 10) {
  const values = (entries || []).map((e) => e.predictedScore).filter((v) => typeof v === 'number')
  const result = []
  if (values.length === 0) {
    for (let i = 0; i < bins; i++) result.push({ binStart: i * (10 / bins), binEnd: (i + 1) * (10 / bins), count: 0 })
    return result
  }
  const min = 0
  const max = 10
  const width = (max - min) / bins
  for (let i = 0; i < bins; i++) result.push({ binStart: +(min + i * width).toFixed(2), binEnd: +(+min + (i + 1) * width).toFixed(2), count: 0 })
  for (const v of values) {
    let idx = Math.floor((v - min) / width)
    if (idx < 0) idx = 0
    if (idx >= bins) idx = bins - 1
    result[idx].count += 1
  }
  return result
}

export function buildMetricsSummary(entries = [], recomputeInfo = { count: 0, totalMs: 0 }) {
  const unique = dedupeByMediaId(entries || [])
  const totalSeen = unique.filter((e) => (e.status || '').toUpperCase() === 'COMPLETED').length
  const totalEpisodes = unique.reduce((acc, e) => acc + (typeof e.episodes === 'number' ? e.episodes : 0), 0)
  return {
    totalSeen,
    totalEpisodes,
    uniqueMedia: unique.length,
    recomputes: recomputeInfo,
  }
}

export function toCSV(rows = [], headers = []) {
  const escapeCell = (v) => {
    if (v == null) return ''
    const s = typeof v === 'string' ? v : String(v)
    if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const headerLine = headers.join(',')
  const lines = rows.map((r) => headers.map((h) => escapeCell(r[h])).join(','))
  return '\uFEFF' + [headerLine, ...lines].join('\n')
}

export function downloadCSV(filename, rows = [], headers = []) {
  const csv = toCSV(rows, headers)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
