import React from 'react'
import { useTranslation } from 'react-i18next'
import { downloadCSV } from '../logic/statistics'

export default function ExportSnapshotButton({
  user = '',
  summary = {},
  genreStats = [],
  details = [],
  onOpenWrapped,
}) {
  const { t } = useTranslation()

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

  const buttonStyle = {
    padding: 'var(--space-2) var(--space-4)',
    fontSize: 'var(--text-sm)',
    fontWeight: 600,
    borderRadius: 'var(--radius-md)',
    background: 'var(--surface-2)',
    border: '1px solid var(--color-border)',
    color: 'var(--text-1)',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  }

  return (
    <div className="export-buttons" style={{ display: 'flex', gap: 'var(--space-3, 12px)', flexWrap: 'wrap' }}>
      {onOpenWrapped && (
        <button
          type="button"
          onClick={onOpenWrapped}
          data-testid="export-wrapped-btn"
          style={buttonStyle}
        >
          <span aria-hidden="true">✨ </span>
          {t('wrapped.buttonText', t('wrapped.button', 'Compartilhar Wrapped').replace(/^✨\s*/, ''))}
        </button>
      )}
      <button type="button" onClick={handleExportCSV} style={buttonStyle}>
        {t('stats.exportCSV', 'Exportar CSV')}
      </button>
      <button type="button" onClick={handleExportJSON} style={buttonStyle}>
        {t('stats.exportJSON', 'Exportar JSON')}
      </button>
    </div>
  )
}
