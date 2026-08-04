#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const [,, username, provider = 'anilist'] = process.argv
if (!username) {
  console.error('Usage: node scripts/audit-entries.mjs <username> [provider]')
  process.exit(1)
}

const outDir = path.resolve('audit')
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true })

// dynamic import of project modules
const api = await import('../src/api/index.js')
const stats = await import('../src/logic/statistics.js')

async function run() {
  console.log(`Fetching entries for ${username} (${provider})...`)
  let entries
  try {
    entries = await api.fetchUserEntries(username, provider)
  } catch (e) {
    console.error('Error fetching entries:', e.message || e)
    process.exit(2)
  }

  const normalized = stats.normalizeEntries(entries)
  const unique = stats.dedupeByMediaId(normalized)

  const totalEntriesRaw = entries.length
  const uniqueMediaCount = unique.length
  const totalEpisodesBySumEntries = entries.reduce((acc, e) => acc + (Number(e.media?.episodes ?? e.episodes) || 0), 0)
  const totalEpisodesByUnique = unique.reduce((acc, e) => acc + (Number(e.episodes) || 0), 0)

  // find duplicates with differing episode counts or statuses
  const dupMap = new Map()
  for (const e of entries) {
    const id = e.media?.id ?? e.id
    if (!id) continue
    if (!dupMap.has(id)) dupMap.set(id, { id, title: e.media?.title?.english || e.media?.title?.romaji || e.media?.title || e.title || null, occurrences: [] })
    const rec = dupMap.get(id)
    rec.occurrences.push({ episodes: e.media?.episodes ?? e.episodes ?? null, status: e.status ?? null })
  }

  const duplicates = []
  for (const [id, info] of dupMap.entries()) {
    const occ = info.occurrences
    if (occ.length > 1) {
      const episodesSet = Array.from(new Set(occ.map(o => (o.episodes == null ? null : Number(o.episodes)))))
      const statusSet = Array.from(new Set(occ.map(o => o.status)))
      if (episodesSet.length > 1 || statusSet.length > 1) {
        duplicates.push({ id: id, title: info.title, occurrences: occ, episodeValues: episodesSet, statusValues: statusSet, count: occ.length })
      }
    }
  }

  const missingEpisodes = unique.filter((u) => u.episodes == null).map((u) => ({ id: u.id, title: u.title }))

  const result = {
    generatedAt: new Date().toISOString(),
    username,
    provider,
    totalEntriesRaw,
    uniqueMediaCount,
    totalEpisodesBySumEntries,
    totalEpisodesByUnique,
    duplicates,
    missingEpisodes,
  }

  const fileName = `discrepancies-${username}-${Date.now()}.json`
  const outPath = path.join(outDir, fileName)
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf-8')
  console.log(`Audit written to ${outPath}`)
  console.log(`Summary: rawEntries=${totalEntriesRaw}, uniqueMedia=${uniqueMediaCount}, episodes(rawSum)=${totalEpisodesBySumEntries}, episodes(uniqueSum)=${totalEpisodesByUnique}, duplicatesFound=${duplicates.length}, missingEpisodes=${missingEpisodes.length}`)
}

run().catch((e) => { console.error(e); process.exit(3) })
