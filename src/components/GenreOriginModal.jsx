import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import styles from './GenreOriginModal.module.css'
import overlayStyles from './ModalOverlay.module.css'

export default function GenreOriginModal({ genre, stats, onClose, onFilterGenre }) {
  const { t } = useTranslation()
  const modalRef = useRef(null)

  useEffect(() => {
    if (!genre || !stats) return

    const modalElement = modalRef.current
    if (!modalElement) return

    // Focus first focusable element or modal container
    const focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (firstElement) {
      firstElement.focus()
    } else {
      modalElement.focus()
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }

      if (e.key === 'Tab' && focusableElements.length > 0) {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [genre, stats, onClose])

  if (!genre || !stats) return null

  const sourceAnimes = stats.sourceAnimes || []

  return (
    <div className={overlayStyles.overlay} onClick={onClose}>
      <div
        ref={modalRef}
        className={styles['genre-origin-modal']}
        role="dialog"
        aria-modal="true"
        aria-labelledby="genre-origin-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles['genre-origin-modal__header']}>
          <h2 id="genre-origin-modal-title">{t('modals.genreOrigin.title', { genre })}</h2>
          <button className={styles['genre-origin-modal__close-btn']} onClick={onClose} aria-label={t('labels.closeModal')}>
            &times;
          </button>
        </div>

        <div className={styles['genre-origin-modal__summary']}>
          <p>{t('modals.genreOrigin.average', { avg: (stats.average ?? 0).toFixed(2) })}</p>
          <p>{t('modals.genreOrigin.scoredCount', { count: stats.scoredCount ?? sourceAnimes.length })}</p>
        </div>

        <div className={styles['genre-origin-modal__list']}>
          {sourceAnimes.map((anime) => {
            const siteUrl = anime.siteUrl || (anime.id ? `https://anilist.co/anime/${anime.id}` : '#')
            const animeProvider = anime.provider || 'anilist'
            const providerLabel = t(`providers.${animeProvider}`, animeProvider === 'mal' ? 'MyAnimeList' : animeProvider === 'kitsu' ? 'Kitsu' : 'AniList')

            return (
              <a
                key={anime.id}
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={styles['genre-origin-card']}
                title={t('labels.openProvider', { provider: providerLabel })}
              >
                {anime.coverImage && (
                  <img src={anime.coverImage} alt={anime.title} className={styles['genre-origin-card__cover']} />
                )}
                <div className={styles['genre-origin-card__info']}>
                  <span className={styles['genre-origin-card__title']}>
                    {anime.title}
                    <span className={styles['genre-origin-card__link-icon']} aria-hidden="true"> ↗</span>
                  </span>
                  <span className={styles['genre-origin-card__score']}>{t('modals.genreOrigin.yourScore', { score: anime.score ?? 'N/A' })}</span>
                </div>
              </a>
            )
          })}
        </div>

        <div className={styles['genre-origin-modal__actions']}>
          {onFilterGenre && (
            <button
              className={styles['genre-origin-modal__filter-btn']}
              onClick={() => {
                onFilterGenre(genre)
                onClose()
              }}
            >
              {t('modals.genreOrigin.filterBtn', { genre })}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
