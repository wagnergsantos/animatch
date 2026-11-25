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
      <button
        type="button"
        onClick={handleExportCSV}
        style={{ ...buttonStyle, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>{t('stats.exportCSV', 'Exportar CSV').replace(/^[^\w\s\u00C0-\u00FF]+/u, '').trim()}</span>
      </button>
      <button
        type="button"
        onClick={handleExportJSON}
        style={{ ...buttonStyle, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>{t('stats.exportJSON', 'Exportar JSON').replace(/^[^\w\s\u00C0-\u00FF]+/u, '').trim()}</span>
      </button>
    </div>
  )
}
