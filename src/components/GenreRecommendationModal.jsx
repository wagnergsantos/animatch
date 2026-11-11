import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { scoreRecommendations } from '../logic/recommender.js'
import RecommendationGrid from './RecommendationGrid.jsx'
import { useModalFocusTrap } from '../hooks/useModalFocusTrap.js'
import styles from './GenreRecommendationModal.module.css'
import overlayStyles from './ModalOverlay.module.css'

export default function GenreRecommendationModal({ genre, planningEntries, tasteProfile, provider = 'anilist', titlePref = 'english', onClose }) {
  const { t } = useTranslation()
  const modalRef = useRef(null)
  const providerLabel = t(`providers.${provider}`, provider === 'mal' ? 'MyAnimeList' : provider === 'kitsu' ? 'Kitsu' : 'AniList')

  useModalFocusTrap(Boolean(genre), modalRef, onClose)

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
