import React from 'react'
import { toCSV, downloadCSV } from '../logic/statistics'

export default function ExportSnapshotButton({ user = '', summary = {}, genreStats = [], details = [] }) {
  const handleExportCSV = () => {
    const headers = ['id', 'title', 'genres', 'predictedScore', 'communityScore', 'episodes', 'status']
    const rows = (details || []).map((d) => ({
      id: d.id,
      title: d.title,
      genres: (d.genres || []).join(' | '),
      predictedScore: d.predictedScore,
      communityScore: d.communityScore,
      episodes: d.episodes,
      status: d.status,
    }))
    downloadCSV(`animatch-details-${user || 'snapshot'}.csv`, rows, headers)
  }

  const handleExportJSON = () => {
    const payload = { generatedAt: new Date().toISOString(), user, summary, genreStats, details }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `animatch-snapshot-${user || 'snapshot'}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="export-buttons">
      <button type="button" onClick={handleExportCSV}>Exportar CSV</button>
      <button type="button" onClick={handleExportJSON}>Exportar JSON</button>
    </div>
  )
}
