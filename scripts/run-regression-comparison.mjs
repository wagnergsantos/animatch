import fs from 'fs'
import path from 'path'
import * as currentRecommender from '../src/logic/recommender.js'
import * as oldRecommender from '../audit/recommender_old.js'

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

function calculateSpearman(arr1, arr2) {
  const n = arr1.length
  if (n < 2) return 1.0

  let d2Sum = 0
  for (let i = 0; i < n; i++) {
    const d = arr1[i] - arr2[i]
    d2Sum += d * d
  }
  return 1 - (6 * d2Sum) / (n * (n * n - 1))
}

const detailsPath = path.resolve('audit', 'animatch-details-Consolidado.csv')
const recsPath = path.resolve('audit', 'animatch-recomendacoes-1795698324414.csv')

const detailsRows = parseCSV(fs.readFileSync(detailsPath, 'utf8'))
const recsRows = parseCSV(fs.readFileSync(recsPath, 'utf8'))

const userEntries = detailsRows.map((r, idx) => {
  const genres = r.genres ? r.genres.split('|').map((g) => g.trim()).filter(Boolean) : []
  const score = Number(r.predictedScore || r.minha_nota || 0)
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
      popularity: 30000,
    },
  }
})

// 1. Motor Antigo (0b8efdd)
const oldTasteProfile = oldRecommender.buildTasteProfile(userEntries, { useStatusProxy: true })
const oldScored = oldRecommender.scoreRecommendations(planningEntries, oldTasteProfile, 'ALL')

// 2. Motor Atual (cb9704d / master)
const currentTasteProfile = currentRecommender.buildTasteProfile(userEntries, { useStatusProxy: true })
const currentScored = currentRecommender.scoreRecommendations(planningEntries, currentTasteProfile, 'ALL', {
  isGroupFranchisesEnabled: false,
})

// Mapear ranks do Top 50 atual
const oldRankMap = new Map()
oldScored.forEach((item, idx) => {
  oldRankMap.set(item.title, idx + 1)
})

const currentRankMap = new Map()
currentScored.forEach((item, idx) => {
  currentRankMap.set(item.title, idx + 1)
})

const top50Current = currentScored.slice(0, 50)
const ranksOld = []
const ranksNew = []
let scoreDiffSum = 0
let scoreDiffSqSum = 0

const comparisonItems = top50Current.map((item, idx) => {
  const newRank = idx + 1
  const oldRank = oldRankMap.get(item.title) || 200
  const oldItem = oldScored.find((o) => o.title === item.title)
  const diff = item.predictedScore - (oldItem?.predictedScore || item.predictedScore)

  ranksNew.push(newRank)
  ranksOld.push(oldRank)
  scoreDiffSum += Math.abs(diff)
  scoreDiffSqSum += diff * diff

  return {
    rankAtual: newRank,
    rankAntigo: oldRank,
    deltaRank: oldRank - newRank, // positivo = subiu de posição
    titulo: item.title,
    scoreAtual: item.predictedScore,
    scoreAntigo: oldItem?.predictedScore,
    deltaScore: Number(diff.toFixed(3)),
    comunidade: item.communityScore,
  }
})

const spearman = calculateSpearman(ranksNew, ranksOld)
const mae = scoreDiffSum / 50
const rmse = Math.sqrt(scoreDiffSqSum / 50)

console.log('==================================================')
console.log('       RELATÓRIO DE REGRESSÃO (0b8efdd vs ATUAL)   ')
console.log('==================================================')
console.log(`Correlação de Spearman no Top 50: ${spearman.toFixed(4)}`)
console.log(`Erro Médio Absoluto (MAE):         ${mae.toFixed(4)}`)
console.log(`Raiz do Erro Quadrático (RMSE):    ${rmse.toFixed(4)}`)
console.log(`Confiança Perfil (Antigo vs Atual): ${oldTasteProfile.confidence?.toFixed(3)} vs ${currentTasteProfile.confidence?.toFixed(3)}`)
console.log('==================================================\n')

console.log('Top 15 Atual vs Antigo:')
console.table(
  comparisonItems.slice(0, 15).map((c) => ({
    'Rank Atual': c.rankAtual,
    'Rank Antigo': c.rankAntigo,
    'Delta Rank': c.deltaRank > 0 ? `+${c.deltaRank}` : c.deltaRank,
    'Título': c.titulo,
    'Match Atual': c.scoreAtual.toFixed(1),
    'Match Antigo': c.scoreAntigo != null ? c.scoreAntigo.toFixed(1) : '-',
    'Comunidade': c.comunidade.toFixed(1),
  }))
)

fs.writeFileSync(
  path.resolve('audit', 'regression_report.json'),
  JSON.stringify({ spearman, mae, rmse, comparison: comparisonItems }, null, 2),
  'utf8'
)
console.log('\nRelatório completo salvo em audit/regression_report.json.')
