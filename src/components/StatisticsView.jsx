import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  computeOverviewStats,
  computeStatusDistribution,
  computeYearDistribution,
  computeBayesianGenreStats,
} from '../logic/analytics.js'
import './StatisticsView.css'

export default function StatisticsView({ entries = [], onSelectGenre }) {
  const [sortBy, setSortBy] = useState('bayesian')
  const [sortDir, setSortDir] = useState('desc')

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortBy(key)
      setSortDir('desc')
    }
  }
  const [confidenceC, setConfidenceC] = useState(15)
  const { t } = useTranslation()

  const overview = useMemo(() => computeOverviewStats(entries), [entries])
  const statuses = useMemo(() => computeStatusDistribution(entries), [entries])
  const yearDistribution = useMemo(() => computeYearDistribution(entries), [entries])

  const genreStats = useMemo(() => {
    return computeBayesianGenreStats(entries, confidenceC)
  }, [entries, confidenceC])

  const sortedGenreStats = useMemo(() => {
    const arr = [...genreStats]
    const dir = sortDir === 'desc' ? -1 : 1
    arr.sort((a, b) => {
      switch (sortBy) {
        case 'genre':
          return dir * (a.genre.localeCompare(b.genre))
        case 'watched':
          return dir * ((a.count || 0) - (b.count || 0))
        case 'scored':
          return dir * ((a.scoredCount || 0) - (b.scoredCount || 0))
        case 'planned':
          return dir * ((a.plannedCount || 0) - (b.plannedCount || 0))
        case 'realAverage':
          return dir * ((a.realAverage || 0) - (b.realAverage || 0))
        case 'bayesian':
        default:
          return dir * ((a.bayesianAverage || 0) - (b.bayesianAverage || 0))
      }
    })
    return arr
  }, [genreStats, sortBy, sortDir])

  const maxYearCount = Math.max(...yearDistribution.map((y) => y.count), 1)

  return (
    <div className="statistics-view">
      {/* Overview Cards */}
      <section className="stats-overview">
        <div className="stat-card">
          <span className="stat-card__value">{overview.totalAnimes}</span>
          <span className="stat-card__label">{t('stats.totalAnimes')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{overview.totalEpisodes}</span>
          <span className="stat-card__label">{t('stats.totalEpisodes')}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{overview.userAverageScore}</span>
          <span className="stat-card__label">{t('stats.userAverageScore')}</span>
        </div>
      </section>

      {/* Distribution by Status */}
      <section className="stats-section">
        <h3 className="stats-section__title">{t('stats.statusDistribution')}</h3>
        <div className="status-grid">
          <div className="status-item status-completed">
            <span>{t('stats.status.completed')}</span>
            <strong>{statuses.COMPLETED}</strong>
          </div>
          <div className="status-item status-planning">
            <span>{t('stats.status.planning')}</span>
            <strong>{statuses.PLANNING}</strong>
          </div>
          <div className="status-item status-current">
            <span>{t('stats.status.current')}</span>
            <strong>{statuses.CURRENT}</strong>
          </div>
          <div className="status-item status-dropped">
            <span>{t('stats.status.dropped')}</span>
            <strong>{statuses.DROPPED}</strong>
          </div>
          <div className="status-item status-paused">
            <span>{t('stats.status.paused')}</span>
            <strong>{statuses.PAUSED}</strong>
          </div>
        </div>
      </section>

      {/* Year Chart */}
      <section className="stats-section">
        <h3 className="stats-section__title">{t('stats.releasesByYear')}</h3>
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
          <h3 className="stats-section__title">{t('stats.favoriteGenresTitle')}</h3>
          <div className="bayesian-controls" title={t('stats.confidence') }>
            <label htmlFor="confidence-c">{t('stats.confidence', { c: confidenceC })}</label>
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
                <th onClick={() => toggleSort('genre')} role="button">{t('stats.genre')} {sortBy === 'genre' ? (sortDir === 'desc' ? '▼' : '▲') : ''}</th>
                <th onClick={() => toggleSort('watched')} role="button">{t('stats.watched')} {sortBy === 'watched' ? (sortDir === 'desc' ? '▼' : '▲') : ''}</th>
                <th onClick={() => toggleSort('scored')} role="button">{t('stats.scored')} {sortBy === 'scored' ? (sortDir === 'desc' ? '▼' : '▲') : ''}</th>
                <th onClick={() => toggleSort('planned')} role="button">{t('stats.planned')} {sortBy === 'planned' ? (sortDir === 'desc' ? '▼' : '▲') : ''}</th>
                <th onClick={() => toggleSort('realAverage')} role="button">{t('stats.realAverage')} {sortBy === 'realAverage' ? (sortDir === 'desc' ? '▼' : '▲') : ''}</th>
                <th onClick={() => toggleSort('bayesian')} role="button">{t('stats.bayesianAverage')} {sortBy === 'bayesian' ? (sortDir === 'desc' ? '▼' : '▲') : ''}</th>
              </tr>
            </thead>
            <tbody>
                {sortedGenreStats.map((item) => (
                <tr
                  key={item.genre}
                  className="genre-table__row"
                  tabIndex={0}
                  role="button"
                  onClick={() => onSelectGenre && onSelectGenre(item.genre)}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && onSelectGenre) {
                      e.preventDefault()
                      onSelectGenre(item.genre)
                    }
                  }}
                  title={t('stats.viewRecommendationsFor', { genre: item.genre })}
                >
                  <td className="genre-table__genre">{item.genre} 🔍</td>
                  <td>{item.count}</td>
                  <td>{item.scoredCount}</td>
                  <td>{item.plannedCount}</td>
                  <td>{typeof item.realAverage === 'number' ? item.realAverage.toFixed(2) : '—'}</td>
                  <td className="genre-table__bayesian">{typeof item.bayesianAverage === 'number' ? item.bayesianAverage.toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
