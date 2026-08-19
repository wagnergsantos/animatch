import { useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { scoreRecommendations } from '../logic/recommender.js'
import RecommendationGrid from './RecommendationGrid.jsx'
import styles from './GenreRecommendationModal.module.css'
import overlayStyles from './ModalOverlay.module.css'

export default function GenreRecommendationModal({ genre, planningEntries, tasteProfile, provider = 'anilist', titlePref = 'english', onClose }) {
  const { t } = useTranslation()
  const modalRef = useRef(null)
  const providerLabel = t(`providers.${provider}`, provider === 'mal' ? 'MyAnimeList' : provider === 'kitsu' ? 'Kitsu' : 'AniList')

  useEffect(() => {
    if (!genre) return

    const modalElement = modalRef.current
    if (!modalElement) return

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
  }, [genre, onClose])

  const genreRecommendations = useMemo(() => {
    if (!genre) return []
    // Filter planning entries by selected genre
    const matchingPlanning = planningEntries.filter((e) =>
      e?.media?.genres?.includes(genre)
    )
    return scoreRecommendations(matchingPlanning, tasteProfile, 'ALL')
  }, [genre, planningEntries, tasteProfile])

  if (!genre) return null

  return (
    <div className={overlayStyles.overlay} onClick={onClose}>
      <div
        ref={modalRef}
        className={styles['modal-container']}
        role="dialog"
        aria-modal="true"
        aria-labelledby="genre-recommendation-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles['modal-header']}>
          <h2 id="genre-recommendation-modal-title">{t('modals.genreRecommendation.title', { genre })}</h2>
          <button className={styles['modal-close-btn']} onClick={onClose} aria-label={t('labels.closeModal')}>✕</button>
        </header>
        <main className={styles['modal-body']}>
          {genreRecommendations.length > 0 ? (
            <RecommendationGrid recommendations={genreRecommendations} provider={provider} titlePref={titlePref} />
          ) : (
            <div className={styles['modal-empty-msg']}>
              <p>{t('modals.genreRecommendation.none', { genre })}</p>
              <p>{t('modals.genreRecommendation.prompt', { provider: providerLabel })}</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
