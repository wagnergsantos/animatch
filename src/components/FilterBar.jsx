import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './FilterBar.module.css'

const DEFAULT_MAIN_GENRES = [
  { id: 'ALL', key: 'filter.allGenres' },
  { id: 'Action', key: 'genres.Action' },
  { id: 'Adventure', key: 'genres.Adventure' },
  { id: 'Comedy', key: 'genres.Comedy' },
  { id: 'Drama', key: 'genres.Drama' },
  { id: 'Fantasy', key: 'genres.Fantasy' },
  { id: 'Romance', key: 'genres.Romance' },
  { id: 'Sci-Fi', key: 'genres.SciFi' },
  { id: 'Slice of Life', key: 'genres.SliceOfLife' },
]

const FORMATS = [
  { id: 'ALL', key: 'formats.ALL' },
  { id: 'TV', key: 'formats.TV' },
  { id: 'MOVIE', key: 'formats.MOVIE' },
  { id: 'OVA', key: 'formats.OVA' },
  { id: 'ONA', key: 'formats.ONA' },
  { id: 'SPECIAL', key: 'formats.SPECIAL' },
]

const BADGES = [
  { id: 'ALL', key: 'filter.allBadges' },
  { id: 'ACCLAIMED', key: 'labels.badge_ACCLAIMED' },
  { id: 'PERSONAL_BET', key: 'labels.badge_PERSONAL_BET' },
  { id: 'STRONG_CONSENSUS', key: 'labels.badge_STRONG_CONSENSUS' },
  { id: 'DISCOVERY', key: 'labels.badge_DISCOVERY' },
]

const SORT_OPTIONS = [
  { id: 'predicted', key: 'sort.predicted' },
  { id: 'community', key: 'sort.community' },
  { id: 'year_desc', key: 'sort.year_desc' },
  { id: 'year_asc', key: 'sort.year_asc' },
  { id: 'title', key: 'sort.title' },
]

/** Closes a floating panel on outside click or Escape. */
function useDismiss(isOpen, close, refs) {
  useEffect(() => {
    if (!isOpen) return undefined
    const onPointer = (e) => {
      if (refs.every((r) => !r.current || !r.current.contains(e.target))) close()
    }
    const onKey = (e) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [isOpen, close, refs])
}

export default function FilterBar({
  selectedGenre = 'ALL',
  onSelectGenre,
  availableGenres,
  totalPlanningCount,
  searchQuery = '',
  onSearchChange,
  selectedFormat = 'ALL',
  onSelectFormat,
  availableYears,
  selectedYear = 'ALL',
  onSelectYear,
  selectedBadge = 'ALL',
  onSelectBadge,
  sortBy = 'predicted',
  onSortChange,
  isSeasonOnly = false,
  onSeasonOnlyChange,
  isStreamingOnly = false,
  onStreamingOnlyChange,
}) {
  const { t } = useTranslation()
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const filtersBtnRef = useRef(null)
  const filtersPanelRef = useRef(null)
  const [filtersRefs] = useState(() => [filtersBtnRef, filtersPanelRef])
  const closeFilters = useRef(() => setIsFiltersOpen(false)).current

  useDismiss(isFiltersOpen, closeFilters, filtersRefs)

  const genresToRender =
    availableGenres && availableGenres.length > 0
      ? [
          {
            id: 'ALL',
            label: totalPlanningCount != null ? t('filter.allGenresWithCount', { count: totalPlanningCount }) : t('filter.allGenres'),
          },
          ...availableGenres.map((g) => {
            if (typeof g === 'object' && g !== null) {
              return { id: g.name, label: `${g.name} (${g.count})` }
            }
            return { id: g, label: g }
          }),
        ]
      : DEFAULT_MAIN_GENRES.map((g) => ({ id: g.id, label: t(g.key) }))

  const hasYears = availableYears && availableYears.length > 0
  const hasSecondaryFilters =
    Boolean(onSelectFormat) || hasYears || Boolean(onSelectBadge) || Boolean(onSeasonOnlyChange) || Boolean(onStreamingOnlyChange)

  // Chips for every active filter except search (already visible in its input)
  const activeChips = []
  if (selectedGenre !== 'ALL') {
    activeChips.push({ id: 'genre', label: selectedGenre, clear: () => onSelectGenre?.('ALL') })
  }
  if (selectedFormat !== 'ALL') {
    const f = FORMATS.find((x) => x.id === selectedFormat)
    activeChips.push({
      id: 'format',
      label: `${t('filter.format')}: ${f ? t(f.key) : selectedFormat}`,
      clear: () => onSelectFormat?.('ALL'),
      secondary: true,
    })
  }
  if (selectedYear !== 'ALL') {
    activeChips.push({
      id: 'year',
      label: `${t('filter.year')}: ${selectedYear === 'NONE' ? t('filter.noYear') : selectedYear}`,
      clear: () => onSelectYear?.('ALL'),
      secondary: true,
    })
  }
  if (selectedBadge !== 'ALL') {
    const b = BADGES.find((x) => x.id === selectedBadge)
    activeChips.push({ id: 'badge', label: b ? t(b.key) : selectedBadge, clear: () => onSelectBadge?.('ALL'), secondary: true })
  }
  if (isSeasonOnly) {
    activeChips.push({ id: 'season', label: t('filter.seasonOnly'), clear: () => onSeasonOnlyChange?.(false), secondary: true })
  }
  if (isStreamingOnly) {
    activeChips.push({ id: 'streaming', label: t('filter.streamingOnly'), clear: () => onStreamingOnlyChange?.(false), secondary: true })
  }
  const secondaryActiveCount = activeChips.filter((c) => c.secondary).length
  const isFiltered = activeChips.length > 0 || searchQuery.trim() !== ''

  const handleResetFilters = () => {
    onSelectGenre?.('ALL')
    onSelectFormat?.('ALL')
    onSelectYear?.('ALL')
    onSelectBadge?.('ALL')
    onSearchChange?.('')
    onSeasonOnlyChange?.(false)
    onStreamingOnlyChange?.(false)
  }

  const handleResetSecondary = () => {
    onSelectFormat?.('ALL')
    onSelectYear?.('ALL')
    onSelectBadge?.('ALL')
    onSeasonOnlyChange?.(false)
    onStreamingOnlyChange?.(false)
  }

  return (
    <div className={styles['filter-container']}>
      <div className={styles['filter-row']}>
        <input
          id="filter-search"
          type="search"
          className={styles['filter-search']}
          placeholder={t('filter.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
        />

        <select
          id="filter-genre"
          className={`${styles['filter-select']} ${styles['filter-select--genre']}`}
          value={selectedGenre}
          onChange={(e) => onSelectGenre && onSelectGenre(e.target.value)}
          aria-label={t('filter.allGenres')}
        >
          {genresToRender.map((genre) => (
            <option key={genre.id} value={genre.id}>
              {genre.label}
            </option>
          ))}
        </select>

        {onSortChange && (
          <select
            id="filter-sort"
            className={styles['filter-select']}
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            aria-label={t('filter.sortLabel')}
            title={t('filter.sortLabel')}
          >
            {SORT_OPTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {t(s.key)}
              </option>
            ))}
          </select>
        )}

        {hasSecondaryFilters && (
          <div className={styles['filter-popover-anchor']}>
            <button
              id="filter-more-btn"
              ref={filtersBtnRef}
              type="button"
              className={`${styles['filter-select']} ${styles['filter-more-btn']} ${secondaryActiveCount > 0 ? styles['filter-more-btn--active'] : ''}`}
              aria-haspopup="dialog"
              aria-expanded={isFiltersOpen}
              onClick={() => setIsFiltersOpen((v) => !v)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
                <path d="M4 6h16M7 12h10M10 18h4" />
              </svg>
              <span>
                {t('filter.moreFilters')}
                {secondaryActiveCount > 0 && ` (${secondaryActiveCount})`}
              </span>
            </button>

            {isFiltersOpen && (
              <>
                <div className={styles['filter-backdrop']} aria-hidden="true" />
                <div ref={filtersPanelRef} role="dialog" aria-label={t('filter.filtersTitle')} className={styles['filter-popover']}>
                  <div className={styles['filter-popover__header']}>
                    <h2 className={styles['filter-popover__title']}>{t('filter.filtersTitle')}</h2>
                    {secondaryActiveCount > 0 && (
                      <button type="button" className={styles['filter-link-btn']} onClick={handleResetSecondary}>
                        {t('filter.clear')}
                      </button>
                    )}
                  </div>

                  <div className={styles['filter-popover__grid']}>
                    {onSelectFormat && (
                      <label className={styles['filter-field']}>
                        <span className={styles['filter-field__label']}>{t('filter.format')}</span>
                        <select
                          id="filter-format"
                          className={styles['filter-select']}
                          value={selectedFormat}
                          onChange={(e) => onSelectFormat(e.target.value)}
                        >
                          {FORMATS.map((f) => (
                            <option key={f.id} value={f.id}>
                              {t(f.key)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {hasYears && (
                      <label className={styles['filter-field']}>
                        <span className={styles['filter-field__label']}>{t('filter.year')}</span>
                        <select
                          id="filter-year"
                          className={styles['filter-select']}
                          value={selectedYear}
                          onChange={(e) => onSelectYear && onSelectYear(e.target.value)}
                        >
                          <option value="ALL">{t('filter.allYears')}</option>
                          <option value="NONE">{t('filter.noYear')}</option>
                          {availableYears.map((year) => (
                            <option key={year} value={year}>
                              {year}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    {onSelectBadge && (
                      <label className={`${styles['filter-field']} ${styles['filter-field--wide']}`}>
                        <span className={styles['filter-field__label']}>{t('filter.badge')}</span>
                        <select
                          id="filter-badge"
                          className={styles['filter-select']}
                          value={selectedBadge}
                          onChange={(e) => onSelectBadge(e.target.value)}
                        >
                          {BADGES.map((b) => (
                            <option key={b.id} value={b.id}>
                              {t(b.key)}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                  </div>

                  {(onSeasonOnlyChange || onStreamingOnlyChange) && (
                    <div className={styles['filter-popover__toggles']}>
                      {onSeasonOnlyChange && (
                        <label className={styles['filter-toggle']}>
                          <input
                            id="filter-season-only"
                            type="checkbox"
                            checked={isSeasonOnly}
                            onChange={(e) => onSeasonOnlyChange(e.target.checked)}
                          />
                          <span className={styles['filter-toggle__track']} aria-hidden="true" />
                          {t('filter.seasonOnly')}
                        </label>
                      )}
                      {onStreamingOnlyChange && (
                        <label className={styles['filter-toggle']}>
                          <input
                            id="filter-streaming-only"
                            type="checkbox"
                            checked={isStreamingOnly}
                            onChange={(e) => onStreamingOnlyChange(e.target.checked)}
                          />
                          <span className={styles['filter-toggle__track']} aria-hidden="true" />
                          {t('filter.streamingOnly')}
                        </label>
                      )}
                    </div>
                  )}

                  <button type="button" className={styles['filter-popover__done']} onClick={closeFilters}>
                    {t('filter.done')}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {isFiltered && (
        <div className={styles['filter-chips']}>
          {activeChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={styles['filter-chip']}
              onClick={chip.clear}
              aria-label={t('filter.removeFilter', { label: chip.label })}
            >
              {chip.label}
              <span aria-hidden="true">✕</span>
            </button>
          ))}
          <button type="button" className={styles['filter-link-btn']} onClick={handleResetFilters} title={t('filter.clearAll')}>
            {t('filter.clear')}
          </button>
        </div>
      )}
    </div>
  )
}
