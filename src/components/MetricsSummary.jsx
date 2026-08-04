import React from 'react'
import './MetricsSummary.css'

export default function MetricsSummary({ summary = {} }) {
  return (
    <div className="metrics-summary">
      <h3>Resumo</h3>
      <div className="metrics-grid">
        <div className="metric">
          <div className="metric-value">{summary.uniqueMedia ?? 0}</div>
          <div className="metric-label">Mídias únicas</div>
        </div>
        <div className="metric">
          <div className="metric-value">{summary.totalSeen ?? 0}</div>
          <div className="metric-label">Vistos (COMPLETED)</div>
        </div>
        <div className="metric">
          <div className="metric-value">{summary.totalEpisodes ?? 0}</div>
          <div className="metric-label">Episódios totais</div>
        </div>
        <div className="metric">
          <div className="metric-value">{summary.recomputes?.count ?? 0}</div>
          <div className="metric-label">Recomputes</div>
        </div>
      </div>
    </div>
  )
}
