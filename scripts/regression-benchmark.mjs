import fs from 'fs'
import path from 'path'
import { buildTasteProfile, scoreRecommendations } from '../src/logic/recommender.js'

function parseCSVLine(line) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function parseCSV(content) {
  const lines = content.trim().split(/\r?\n/)
  if (lines.length < 2) return []
  const headers = parseCSVLine(lines[0])
  const rows = []

  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i].trim()
    if (!rawLine) continue
    const values = parseCSVLine(rawLine)
    const row = {}
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? ''
    })
    rows.push(row)
  }
  return rows
}

// 1. Carregar biblioteca de animes assistidos
const detailsPath = path.resolve('audit', 'animatch-details-Consolidado.csv')
const recsPath = path.resolve('audit', 'animatch-recomendacoes-1795698324414.csv')

if (!fs.existsSync(detailsPath) || !fs.existsSync(recsPath)) {
  console.error('Arquivos CSV necessários não encontrados em audit/.')
  process.exit(1)
}

const detailsRows = parseCSV(fs.readFileSync(detailsPath, 'utf8'))
const recsRows = parseCSV(fs.readFileSync(recsPath, 'utf8'))

console.log(`Carregados ${detailsRows.length} registros da biblioteca e ${recsRows.length} candidatos do planning.`)

// 2. Normalizar entradas da biblioteca
const userEntries = detailsRows.map((r, idx) => {
  const genres = r.genres ? r.genres.split('|').map((g) => g.trim()).filter(Boolean) : []
  const score = Number(r.predictedScore || r.minha_nota || 0) // no CSV de details do export, 'predictedScore' guarda a nota do user
  const status = (r.status || 'COMPLETED').toUpperCase()

  return {
    id: Number(r.id) || idx + 1,
    score: Number.isFinite(score) ? score : 0,
    status,
    media: {
      id: Number(r.id) || idx + 1,
      title: { romaji: r.title, english: r.title },
      genres,
      episodes: Number(r.episodes) || null,
      averageScore: Number(r.communityScore) ? Number(r.communityScore) * 10 : 70,
    },
  }
})

// 3. Normalizar candidatos do planning
const planningEntries = recsRows.map((r, idx) => {
  const genres = r.Gêneros ? r.Gêneros.split('|').map((g) => g.trim()).filter(Boolean) : []
  const communityScore = Number(r.Comunidade) || 7.0

  return {
    status: 'PLANNING',
    media: {
      id: 10000 + idx,
      title: { romaji: r.Título, english: r.Título },
      genres,
      format: r.Formato || 'TV',
      year: Number(r.Ano) || null,
      averageScore: communityScore * 10,
      popularity: 50000, // proxy de popularidade média caso não haja campo
    },
    appPredictedScore: Number(r['Nota Prevista']) || null,
  }
})

// 4. Executar motor com agrupamento DESLIGADO (matemática pura)
const tasteProfile = buildTasteProfile(userEntries, { useStatusProxy: true })
const scored = scoreRecommendations(planningEntries, tasteProfile, 'ALL', {
  isGroupFranchisesEnabled: false,
})

const top50 = scored.slice(0, 50).map((item, rank) => ({
  rank: rank + 1,
  title: item.title,
  match: item.predictedScore,
  communityScore: item.communityScore,
  baseTasteScore: item.baseTasteScore,
  tasteWeight: item.tasteWeight,
  communityWeight: item.communityWeight,
  format: item.format,
  year: item.year,
  genres: item.genres,
}))

const outputPath = path.resolve('audit', 'top50_snapshot.json')
fs.writeFileSync(outputPath, JSON.stringify(top50, null, 2), 'utf8')

console.log(`\n✅ Snapshot do Top 50 gerado com sucesso em ${outputPath}!`)
console.log(`Confiança do perfil (c): ${tasteProfile.confidence?.toFixed(3)} | Peso do Gosto: ${(tasteProfile.dynamicTasteWeight * 100).toFixed(1)}% | Peso Comunidade: ${(tasteProfile.dynamicCommunityWeight * 100).toFixed(1)}%`)
console.log('\nTop 10 do Snapshot:')
console.table(
  top50.slice(0, 10).map((t) => ({
    Rank: t.rank,
    Título: t.title,
    Match: t.match.toFixed(1),
    'Gosto (82%)': t.baseTasteScore?.toFixed(1) ?? '-',
    'Comunidade (18%)': t.communityScore.toFixed(1),
    Ano: t.year,
  }))
)
