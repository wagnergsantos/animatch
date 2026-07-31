import { useState, useMemo } from 'react'
import {
  computeOverviewStats,
  computeStatusDistribution,
  computeYearDistribution,
  computeBayesianGenreStats,
} from '../logic/analytics.js'
import './StatisticsView.css'

export default function StatisticsView({ entries = [], onSelectGenre }) {
  const [confidenceC, setConfidenceC] = useState(15)

  const overview = useMemo(() => computeOverviewStats(entries), [entries])
  const statuses = useMemo(() => computeStatusDistribution(entries), [entries])
  const yearDistribution = useMemo(() => computeYearDistribution(entries), [entries])

  const genreStats = useMemo(() => {
    const completedEntries = entries.filter((e) => e.status === 'COMPLETED')
    return computeBayesianGenreStats(completedEntries, confidenceC)
  }, [entries, confidenceC])

  const maxYearCount = Math.max(...yearDistribution.map((y) => y.count), 1)

  return (
    <div className="statistics-view">
      {/* Overview Cards */}
      <section className="stats-overview">
        <div className="stat-card">
          <span className="stat-card__value">{overview.totalAnimes}</span>
          <span className="stat-card__label">Total de Animes</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{overview.totalEpisodes}</span>
          <span className="stat-card__label">Total de Episódios</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{overview.userAverageScore}</span>
          <span className="stat-card__label">Média Pessoal</span>
        </div>
      </section>

      {/* Distribution by Status */}
      <section className="stats-section">
        <h3 className="stats-section__title">Distribuição por Status</h3>
        <div className="status-grid">
          <div className="status-item status-completed">
            <span>Completo</span>
            <strong>{statuses.COMPLETED}</strong>
          </div>
          <div className="status-item status-planning">
            <span>Planejando</span>
            <strong>{statuses.PLANNING}</strong>
          </div>
          <div className="status-item status-current">
            <span>Assistindo</span>
            <strong>{statuses.CURRENT}</strong>
          </div>
          <div className="status-item status-dropped">
            <span>Dropped</span>
            <strong>{statuses.DROPPED}</strong>
          </div>
          <div className="status-item status-paused">
            <span>Pausado</span>
            <strong>{statuses.PAUSED}</strong>
          </div>
        </div>
      </section>

      {/* Year Chart */}
      <section className="stats-section">
        <h3 className="stats-section__title">Lançamentos por Ano</h3>
        <div className="year-chart-container">
          <div className="year-chart">
            {yearDistribution.map(({ year, count }) => (
              <div key={year} className="year-chart__bar-wrapper" title={`${year}: ${count} animes`}>
                <div
                  className="year-chart__bar"
                  style={{ height: `${(count / maxYearCount) * 100}%` }}
                ></div>
                <span className="year-chart__label">{year}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Genres Table */}
      <section className="stats-section">
        <div className="stats-section__header">
          <h3 className="stats-section__title">Gêneros Favoritos (Média Bayesiana)</h3>
          <div className="bayesian-controls">
            <label htmlFor="confidence-c">C = {confidenceC}</label>
            <input
              id="confidence-c"
              type="range"
              min="1"
              max="50"
              value={confidenceC}
              onChange={(e) => setConfidenceC(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="genre-table-container">
          <table className="genre-table">
            <thead>
              <tr>
                <th>Gênero</th>
                <th>Assistidos</th>
                <th>Avaliados</th>
                <th>Média Real</th>
                <th>Média Bayesiana</th>
              </tr>
            </thead>
            <tbody>
              {genreStats.map((item) => (
                <tr
                  key={item.genre}
                  className="genre-table__row"
                  onClick={() => onSelectGenre && onSelectGenre(item.genre)}
                >
                  <td className="genre-table__genre">{item.genre} 🔍</td>
                  <td>{item.count}</td>
                  <td>{item.scoredCount}</td>
                  <td>{item.realAverage.toFixed(2)}</td>
                  <td className="genre-table__bayesian">{item.bayesianAverage.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
