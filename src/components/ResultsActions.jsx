import { useTranslation } from 'react-i18next'
import styles from './ResultsActions.module.css'

/** View-mode toggle + icon-only CSV export, shown in the results header. */
export default function ResultsActions({ viewMode = 'grid', onViewModeChange, onExportCSV }) {
  const { t } = useTranslation()

  return (
    <div className={styles['results-actions']}>
      {onViewModeChange && (
        <div className={styles['view-mode-toggle']} role="group" aria-label="Modo de visualização">
          <button
            id="view-mode-grid"
            type="button"
            className={`${styles['icon-btn']} ${viewMode === 'grid' ? styles['icon-btn--active'] : ''}`}
            onClick={() => onViewModeChange('grid')}
            aria-label={t('labels.viewGrid')}
            aria-pressed={viewMode === 'grid'}
            title={t('labels.viewGrid')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </button>
          <button
            id="view-mode-list"
            type="button"
            className={`${styles['icon-btn']} ${viewMode === 'list' ? styles['icon-btn--active'] : ''}`}
            onClick={() => onViewModeChange('list')}
            aria-label={t('labels.viewList')}
            aria-pressed={viewMode === 'list'}
            title={t('labels.viewList')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
            </svg>
          </button>
        </div>
      )}

      {onExportCSV && (
        <button
          id="export-csv-btn"
          type="button"
          className={`${styles['icon-btn']} ${styles['icon-btn--standalone']}`}
          onClick={onExportCSV}
          aria-label={t('filter.exportCSV')}
          title={t('filter.exportCSV')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
          </svg>
        </button>
      )}
    </div>
  )
}
