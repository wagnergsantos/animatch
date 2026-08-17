import { useTranslation } from 'react-i18next'
import './FilterBar.css'

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
]

const SORT_OPTIONS = [
  { id: 'predicted', key: 'sort.predicted' },
  { id: 'community', key: 'sort.community' },
  { id: 'year_desc', key: 'sort.year_desc' },
  { id: 'year_asc', key: 'sort.year_asc' },
  { id: 'title', key: 'sort.title' },
]

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
  onExportCSV,
}) {
  const { t } = useTranslation()

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

  const isFiltered =
    selectedGenre !== 'ALL' ||
    selectedFormat !== 'ALL' ||
    selectedYear !== 'ALL' ||
    selectedBadge !== 'ALL' ||
    searchQuery.trim() !== '' ||
    isSeasonOnly

  const handleResetFilters = () => {
    onSelectGenre?.('ALL')
    onSelectFormat?.('ALL')
    onSelectYear?.('ALL')
    onSelectBadge?.('ALL')
    onSearchChange?.('')
    onSeasonOnlyChange?.(false)
  }

  return (
    <div className="filter-container">
      <div className="filter-controls">
        <div className="filter-controls__group">
          <input
            type="text"
            className="filter-search"
            placeholder={t('filter.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />

          <select
            className="filter-select filter-select--genre"
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

          {onSelectFormat && (
            <select
              className="filter-select"
              value={selectedFormat}
              onChange={(e) => onSelectFormat(e.target.value)}
            >
              {FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {t(f.key)}
                </option>
              ))}
            </select>
          )}

          {availableYears && availableYears.length > 0 && (
            <select
              className="filter-select"
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
          )}

          {onSelectBadge && (
            <select
              className="filter-select"
              value={selectedBadge}
              onChange={(e) => onSelectBadge(e.target.value)}
            >
              {BADGES.map((b) => (
                <option key={b.id} value={b.id}>
                  {t(b.key)}
                </option>
              ))}
            </select>
          )}

          {onSortChange && (
            <select
              className="filter-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {t(s.key)}
                </option>
              ))}
            </select>
          )}

          <div className="filter-bar__group filter-bar__checkbox-group">
            <label className="filter-bar__checkbox-label">
              <input
                type="checkbox"
                checked={isSeasonOnly}
                onChange={(e) => onSeasonOnlyChange?.(e.target.checked)}
                className="filter-bar__checkbox"
              />
              {t('filter.seasonOnly')}
            </label>
          </div>

          {isFiltered && (
            <button
              className="filter-clear-btn"
              onClick={handleResetFilters}
              title={t('filter.clearAll')}
            >
              ✕ {t('filter.clear')}
            </button>
          )}
        </div>

        {onExportCSV && (
          <button className="export-csv-btn" onClick={onExportCSV} title={t('filter.exportCSV')}>
            📥 {t('filter.exportCSV')}
          </button>
        )}
      </div>
    </div>
  )
}
