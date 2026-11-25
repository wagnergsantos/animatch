import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  computeOverviewStats,
  computeStatusDistribution,
  computeYearDistribution,
  computeBayesianGenreStats,
  computeScoreDistribution,
} from '../logic/analytics.js'
import { buildTasteProfile } from '../logic/recommender.js'
import { translateGenre } from '../lib/genreTranslations.js'
import styles from './StatisticsView.module.css'

export default function StatisticsView({ entries = [], onSelectGenre }) {
  const [sortBy, setSortBy] = useState('lowerBound')
  const [sortDir, setSortDir] = useState('desc')
  const [showAllGenres, setShowAllGenres] = useState(false)
  const [yearFilterMode, setYearFilterMode] = useState('watched')

  const toggleSort = (key) => {
    if (sortBy === key) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))
    } else {
      setSortBy(key)
      setSortDir('desc')
    }
  }
  const [confidenceC, setConfidenceC] = useState(25)
  const { t } = useTranslation()

  const tasteProfile = useMemo(() => buildTasteProfile(entries), [entries])
  const overview = useMemo(() => computeOverviewStats(entries), [entries])
  const statuses = useMemo(() => computeStatusDistribution(entries, tasteProfile), [entries, tasteProfile])

  const filteredYearEntries = useMemo(() => {
    if (yearFilterMode === 'watched') {
      return entries.filter((e) => {
        const s = (e?.status || '').toUpperCase()
        return s === 'COMPLETED' || s === 'CURRENT' || s === 'DROPPED' || s === 'PAUSED'
      })
    }
    return entries
  }, [entries, yearFilterMode])

  const yearDistribution = useMemo(() => computeYearDistribution(filteredYearEntries, tasteProfile), [filteredYearEntries, tasteProfile])
  const scoreDistribution = useMemo(() => computeScoreDistribution(entries), [entries])

  const genreStats = useMemo(() => {
    return computeBayesianGenreStats(entries, confidenceC)
  }, [entries, confidenceC])

  const sortedGenreStats = useMemo(() => {
    const arr = [...genreStats]
    const dir = sortDir === 'desc' ? -1 : 1
    arr.sort((a, b) => {
      switch (sortBy) {
        case 'genre':
          return dir * translateGenre(a.genre, t).localeCompare(translateGenre(b.genre, t))
        case 'watched':
          return dir * ((a.count || 0) - (b.count || 0))
        case 'scored':
          return dir * ((a.scoredCount || 0) - (b.scoredCount || 0))
        case 'planned':
          return dir * ((a.plannedCount || 0) - (b.plannedCount || 0))
        case 'realAverage':
          return dir * ((a.realAverage || 0) - (b.realAverage || 0))
        case 'bayesian':
          return dir * ((a.bayesianAverage || 0) - (b.bayesianAverage || 0))
        case 'lowerBound':
        default:
          return dir * ((a.lowerBound || 0) - (b.lowerBound || 0))
      }
    })
    return arr
  }, [genreStats, sortBy, sortDir, t])

  const displayedGenreStats = useMemo(() => {
    return showAllGenres ? sortedGenreStats : sortedGenreStats.slice(0, 10)
  }, [sortedGenreStats, showAllGenres])

  const maxYearCount = Math.max(...yearDistribution.map((y) => y.count), 1)
  const maxScoreCount = Math.max(...scoreDistribution.map((s) => s.count), 1)

  return (
    <div className={styles['statistics-view']}>
      {/* Overview Cards */}
      <section className={styles['stats-overview']}>
        <div className={styles['stat-card']}>
          <span className={styles['stat-card__value']}>{overview.totalAnimes}</span>
          <span className={styles['stat-card__label']}>{t('stats.totalAnimes', 'Animes assistidos')}</span>
        </div>
        <div className={styles['stat-card']}>
          <span className={styles['stat-card__value']}>{overview.totalEpisodes}</span>
          <span className={styles['stat-card__label']}>{t('stats.totalEpisodes')}</span>
        </div>
        <div className={styles['stat-card']}>
          <span className={styles['stat-card__value']}>{overview.userAverageScore}</span>
          <span className={styles['stat-card__label']}>{t('stats.userAverageScore')}</span>
        </div>
      </section>

      {/* Distribution by Status */}
      <section className={styles['stats-section']}>
        <h3 className={styles['stats-section__title']}>{t('stats.statusDistribution')}</h3>
        <div className={styles['status-grid']}>
          <div className={`${styles['status-item']} ${styles['status-completed']}`}>
            <span>{t('stats.status.completed')}</span>
            <strong>{statuses.COMPLETED}</strong>
          </div>
          <div className={`${styles['status-item']} ${styles['status-planning']}`}>
            <span>{t('stats.status.planning')}</span>
            <strong>{statuses.PLANNING}</strong>
          </div>
          <div className={`${styles['status-item']} ${styles['status-current']}`}>
            <span>{t('stats.status.current')}</span>
            <strong>{statuses.CURRENT}</strong>
          </div>
          <div className={`${styles['status-item']} ${styles['status-dropped']}`}>
            <span>{t('stats.status.dropped')}</span>
            <strong>{statuses.DROPPED}</strong>
          </div>
          <div className={`${styles['status-item']} ${styles['status-paused']}`}>
            <span>{t('stats.status.paused')}</span>
            <strong>{statuses.PAUSED}</strong>
          </div>
        </div>
      </section>

      {/* Score Distribution Histogram */}
      <section className={styles['stats-section']}>
        <h3 className={styles['stats-section__title']}>{t('stats.scoreDistributionTitle', 'Distribuição de Notas (1 a 10)')}</h3>
        <div className={styles['score-chart-container']}>
          <div className={styles['score-chart']}>
            {scoreDistribution.map(({ score, count }) => (
              <div key={score} className={styles['score-chart__bar-wrapper']} title={`Nota ${score}: ${count} animes`}>
                <span className={styles['score-chart__count']}>{count}</span>
                <div
                  className={styles['score-chart__bar']}
                  style={{ height: `${(count / maxScoreCount) * 100}%` }}
                ></div>
                <span className={styles['score-chart__label']}>★ {score}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Year Chart */}
      <section className={styles['stats-section']}>
        <div className={styles['stats-section__header']}>
          <div>
            <h3 className={styles['stats-section__title']}>{t('stats.releasesByYear')}</h3>
            <p className={styles['section-subtitle']}>
              {yearFilterMode === 'watched'
                ? t('stats.releasesByYearDescWatched', 'Distribuição dos animes assistidos por ano de lançamento')
                : t('stats.releasesByYearDesc', 'Distribuição de todos os animes da sua lista por ano de lançamento')}
            </p>
          </div>
          <div className={styles['year-toggle-group']} role="radiogroup" aria-label={t('stats.releasesByYear')}>
            <button
              type="button"
              role="radio"
              aria-checked={yearFilterMode === 'watched'}
              className={`${styles['year-toggle-btn']} ${yearFilterMode === 'watched' ? styles['year-toggle-btn--active'] : ''}`}
              onClick={() => setYearFilterMode('watched')}
            >
              {t('stats.releasesByYearFilterWatched', 'Assistidos')}
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={yearFilterMode === 'all'}
              className={`${styles['year-toggle-btn']} ${yearFilterMode === 'all' ? styles['year-toggle-btn--active'] : ''}`}
              onClick={() => setYearFilterMode('all')}
            >
              {t('stats.releasesByYearFilterAll', 'Todos')}
            </button>
          </div>
        </div>

        <div className={styles['year-chart-container']}>
          <div className={styles['year-chart']}>
            {yearDistribution.map(({ year, count }, index) => {
              const isLast = index === yearDistribution.length - 1
              const prevYear = index > 0 ? yearDistribution[index - 1].year : null
              const prevWasLabeled = prevYear != null && (index - 1 === 0 || prevYear % 5 === 0)
              const showYearLabel =
                index === 0 ||
                (year % 5 === 0 && (!isLast || !prevWasLabeled || year - prevYear >= 2)) ||
                (isLast && !prevWasLabeled && (prevYear == null || year - prevYear >= 2))

              return (
                <div key={year} className={styles['year-chart__bar-wrapper']} title={`${year}: ${count} animes`}>
                  <div
                    className={styles['year-chart__bar']}
                    style={{ height: `${(count / maxYearCount) * 100}%` }}
                  ></div>
                  <span className={styles['year-chart__label']}>{showYearLabel ? year : '·'}</span>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Genres Table */}
      <section className={styles['stats-section']}>
        <div className={styles['stats-section__header']}>
          <h3 className={styles['stats-section__title']}>{t('stats.favoriteGenresTitle', 'Gêneros Favoritos')}</h3>
          <div className={styles['bayesian-controls']} title={t('stats.confidenceTooltip', 'Quantidade de avaliações necessárias para que o gênero tenha peso total')}>
            <label htmlFor="confidence-c">{t('stats.confidence', { c: confidenceC })}</label>
            <input
              id="confidence-c"
              type="range"
              min="1"
              max="100"
              value={confidenceC}
              onChange={(e) => setConfidenceC(Number(e.target.value))}
            />
          </div>
        </div>

        <p className={styles['genre-explanation']}>
          💡 {t('stats.favoriteGenresDesc', 'Ordenado pela pontuação ajustada (limite inferior) para priorizar gêneros consistentes com mais avaliações.')}
        </p>

        <div className={styles['genre-table-container']}>
          <table className={styles['genre-table']}>
            <thead>
              <tr>
                {[
                  { key: 'genre', label: t('stats.genre') },
                  { key: 'watched', label: t('stats.watched') },
                  { key: 'scored', label: t('stats.scored') },
                  { key: 'planned', label: t('stats.planned') },
                  { key: 'realAverage', label: t('stats.realAverage') },
                  { key: 'bayesian', label: t('stats.bayesianAverage'), tooltip: t('stats.bayesianAverageTooltip') },
                  { key: 'lowerBound', label: t('stats.lowerBound'), tooltip: t('stats.lowerBoundTooltip') },
                ].map((col) => {
                  const isSorted = sortBy === col.key
                  const ariaSort = isSorted ? (sortDir === 'desc' ? 'descending' : 'ascending') : 'none'
                  return (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          toggleSort(col.key)
                        }
                      }}
                      tabIndex={0}
                      role="button"
                      aria-sort={ariaSort}
                      title={col.tooltip}
                    >
                      {col.label}{' '}
                      <span aria-hidden="true">
                        {isSorted ? (sortDir === 'desc' ? '▼' : '▲') : ' ↕'}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {displayedGenreStats.map((item) => {
                const translated = translateGenre(item.genre, t)
                return (
                  <tr
                    key={item.genre}
                    className={styles['genre-table__row']}
                    tabIndex={0}
                    role="button"
                    onClick={() => onSelectGenre && onSelectGenre(item.genre)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && onSelectGenre) {
                        e.preventDefault()
                        onSelectGenre(item.genre)
                      }
                    }}
                    title={t('stats.viewRecommendationsFor', { genre: translated })}
                  >
                    <td className={styles['genre-table__genre']}>
                      <span>{translated}</span>
                      <span
                        className={styles['genre-filter-icon']}
                        title={t('stats.viewRecommendationsFor', { genre: translated })}
                        aria-label={t('stats.viewRecommendationsFor', { genre: translated })}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                      </span>
                    </td>
                    <td>{item.count}</td>
                    <td>{item.scoredCount}</td>
                    <td>{item.plannedCount}</td>
                    <td>{typeof item.realAverage === 'number' ? item.realAverage.toFixed(2) : '—'}</td>
                    <td className={styles['genre-table__bayesian']}>{typeof item.bayesianAverage === 'number' ? item.bayesianAverage.toFixed(2) : '—'}</td>
                    <td className={styles['genre-table__lower-bound']}>{typeof item.lowerBound === 'number' ? item.lowerBound.toFixed(2) : '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {sortedGenreStats.length > 10 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--space-4)' }}>
            <button
              type="button"
              className={styles['toggle-genres-btn']}
              onClick={() => setShowAllGenres((prev) => !prev)}
            >
              {showAllGenres
                ? t('stats.showLess', 'Mostrar menos')
                : t('stats.showAll', { count: sortedGenreStats.length, defaultValue: `Ver todos os ${sortedGenreStats.length} gêneros` })}
            </button>
          </div>
        )}
      </section>
    </div>
  )
}
