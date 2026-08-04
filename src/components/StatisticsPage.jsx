import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeEntries, dedupeByMediaId, aggregateGenreStats, buildMetricsSummary } from '../logic/statistics'
import GenreBarChart from './GenreBarChart.jsx'
import MetricsSummary from './MetricsSummary.jsx'
import ExportSnapshotButton from './ExportSnapshotButton.jsx'
import StatisticsView from './StatisticsView.jsx'
import './StatisticsPage.css'

export default function StatisticsPage({ entries = [], user = '', onSelectGenre }) {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState('table') // default to 'table' per preference ('chart' or 'table')

  const normalized = useMemo(() => normalizeEntries(entries), [entries])
  const unique = useMemo(() => dedupeByMediaId(normalized), [normalized])
  const completedUnique = useMemo(() => (unique || []).filter((e) => (e.status || '').toUpperCase() === 'COMPLETED'), [unique])
  const genreStats = useMemo(() => aggregateGenreStats(completedUnique), [completedUnique])
  const summary = useMemo(() => buildMetricsSummary(unique), [unique])

  return (
    <section className="statistics-page">
      <header className="statistics-header">
        <h2>{t('statistics.title', 'Estatísticas')}</h2>
        <div className="statistics-actions">
          <div className="view-toggle" role="tablist" aria-label="view mode">
            <button type="button" aria-pressed={viewMode === 'chart'} onClick={() => setViewMode('chart')}>Gráfico</button>
            <button type="button" aria-pressed={viewMode === 'table'} onClick={() => setViewMode('table')}>Tabela</button>
          </div>
          <ExportSnapshotButton user={user} summary={summary} genreStats={genreStats} details={unique} />
        </div>
      </header>

      {viewMode === 'chart' ? (
        <div className="statistics-grid">
          <div className="statistics-left">
            <GenreBarChart data={genreStats} onClickGenre={onSelectGenre} />
          </div>
          <aside className="statistics-right">
            <MetricsSummary summary={summary} />
          </aside>
        </div>
      ) : (
        // Table mode: reuse existing StatisticsView for comprehensive table layout
        <StatisticsView entries={entries} onSelectGenre={onSelectGenre} />
      )}
    </section>
  )
}
