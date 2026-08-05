import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { normalizeEntries, dedupeByMediaId, aggregateGenreStats, buildMetricsSummary } from '../logic/statistics'
import ExportSnapshotButton from './ExportSnapshotButton.jsx'
import StatisticsView from './StatisticsView.jsx'
import './StatisticsPage.css'

export default function StatisticsPage({ entries = [], user = '', onSelectGenre }) {
  const { t } = useTranslation()

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
          <ExportSnapshotButton user={user} summary={summary} genreStats={genreStats} details={unique} />
        </div>
      </header>

      {/* Always show table-only view */}
      <StatisticsView entries={entries} onSelectGenre={onSelectGenre} />
    </section>
  )
}
