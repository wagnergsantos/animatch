import { useState, useEffect, useMemo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { DECISION_MODES, makeDecision } from '../logic/decision.js'
import RecommendationReason from './RecommendationReason.jsx'
import styles from './DecisionModal.module.css'

export default function DecisionModal({
  isOpen,
  onClose,
  recommendations = [],
  subscriptions = [],
  titlePref = 'english',
  onSelectAnime,
}) {
  const { t } = useTranslation()
  const [activeMode, setActiveMode] = useState(DECISION_MODES.BEST)
  const [rollCount, setRollCount] = useState(0)
  const [isShuffling, setIsShuffling] = useState(false)

  // Reset or initialize state when opening
  useEffect(() => {
    if (isOpen) {
      setActiveMode(DECISION_MODES.BEST)
      setRollCount(0)
      setIsShuffling(false)
    }
  }, [isOpen])

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Draw decision anime based on activeMode and rollCount
  const selectedAnime = useMemo(() => {
    if (!isOpen || !recommendations || recommendations.length === 0) {
      return null
    }
    // rollCount is an input dependency so makeDecision runs a new randomized draw
    return makeDecision(activeMode, recommendations, subscriptions)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, activeMode, rollCount, recommendations, subscriptions])

  const handlePickAnother = useCallback(() => {
    setIsShuffling(true)
    setRollCount((prev) => prev + 1)
    setTimeout(() => {
      setIsShuffling(false)
    }, 300)
  }, [])

  const handleModeChange = (mode) => {
    if (mode === activeMode) return
    setActiveMode(mode)
    setIsShuffling(true)
    setRollCount((prev) => prev + 1)
    setTimeout(() => {
      setIsShuffling(false)
    }, 300)
  }

  if (!isOpen) return null

  // Title localization
  const rawTitleObj =
    selectedAnime?.titleObj ||
    (typeof selectedAnime?.title === 'object' ? selectedAnime?.title : null) ||
    selectedAnime?.media?.title ||
    {}
  const englishTitle =
    rawTitleObj.english && typeof rawTitleObj.english === 'string'
      ? rawTitleObj.english
      : ''
  const romajiTitle =
    rawTitleObj.romaji && typeof rawTitleObj.romaji === 'string'
      ? rawTitleObj.romaji
      : typeof selectedAnime?.title === 'string'
        ? selectedAnime.title
        : ''

  let mainTitle = ''
  let subTitle = ''

  if (titlePref === 'romaji') {
    mainTitle =
      romajiTitle ||
      englishTitle ||
      (typeof selectedAnime?.title === 'string' ? selectedAnime.title : '') ||
      t('labels.untitled')
    subTitle = englishTitle && englishTitle !== mainTitle ? englishTitle : ''
  } else {
    mainTitle =
      englishTitle ||
      romajiTitle ||
      (typeof selectedAnime?.title === 'string' ? selectedAnime.title : '') ||
      t('labels.untitled')
    subTitle = romajiTitle && romajiTitle !== mainTitle ? romajiTitle : ''
  }

  const compatibilityPercent =
    typeof selectedAnime?.predictedScore === 'number' &&
    !isNaN(selectedAnime.predictedScore)
      ? Math.round((selectedAnime.predictedScore / 10) * 100)
      : null

  const episodes = selectedAnime?.episodes ?? selectedAnime?.media?.episodes
  const format = selectedAnime?.format ?? selectedAnime?.media?.format
  const genres = selectedAnime?.genres ?? selectedAnime?.media?.genres ?? []

  // Deduplicate streaming links by site
  const streamingLinks = []
  const seenSites = new Set()
  for (const link of selectedAnime?.streamingLinks ?? selectedAnime?.media?.streamingLinks ?? []) {
    if (link?.site && !seenSites.has(link.site)) {
      seenSites.add(link.site)
      streamingLinks.push(link)
    }
  }

  const modeDescriptions = {
    [DECISION_MODES.BEST]: t('decision.mode_best_desc'),
    [DECISION_MODES.SURPRISE]: t('decision.mode_surprise_desc'),
    [DECISION_MODES.QUICK]: t('decision.mode_quick_desc'),
  }

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      data-testid="decision-modal-overlay"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="decision-modal-title"
      >
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label={t('decision.close')}
        >
          ✕
        </button>

        <div className={styles.modalHeader}>
          <h2 id="decision-modal-title" className={styles.modalTitle}>
            ✨ {t('decision.title')}
          </h2>
        </div>

        {/* Strategy Tabs */}
        <div className={styles.tabsList} role="tablist">
          <button
            role="tab"
            aria-selected={activeMode === DECISION_MODES.BEST}
            className={`${styles.tabButton} ${activeMode === DECISION_MODES.BEST ? styles.activeTab : ''}`}
            onClick={() => handleModeChange(DECISION_MODES.BEST)}
          >
            {t('decision.mode_best')}
          </button>
          <button
            role="tab"
            aria-selected={activeMode === DECISION_MODES.SURPRISE}
            className={`${styles.tabButton} ${activeMode === DECISION_MODES.SURPRISE ? styles.activeTab : ''}`}
            onClick={() => handleModeChange(DECISION_MODES.SURPRISE)}
          >
            {t('decision.mode_surprise')}
          </button>
          <button
            role="tab"
            aria-selected={activeMode === DECISION_MODES.QUICK}
            className={`${styles.tabButton} ${activeMode === DECISION_MODES.QUICK ? styles.activeTab : ''}`}
            onClick={() => handleModeChange(DECISION_MODES.QUICK)}
          >
            {t('decision.mode_quick')}
          </button>
        </div>

        <p className={styles.modeDescription}>{modeDescriptions[activeMode]}</p>

        {/* Decision Result Card */}
        {selectedAnime ? (
          <div
            className={`${styles.cardContainer} ${isShuffling ? styles.shuffling : ''}`}
          >
            <div className={styles.cardMain}>
              {selectedAnime.coverImage && (
                <img
                  className={styles.coverImage}
                  src={selectedAnime.coverImage}
                  alt={t('labels.coverAlt', { title: mainTitle })}
                />
              )}
              <div className={styles.cardInfo}>
                <h3 className={styles.animeTitle}>{mainTitle}</h3>
                {subTitle && (
                  <div className={styles.animeSubtitle}>{subTitle}</div>
                )}

                <div className={styles.metaRow}>
                  {compatibilityPercent != null && (
                    <span className={styles.compatibilityPill}>
                      {t('decision.compatibility', {
                        percent: compatibilityPercent,
                      })}
                    </span>
                  )}
                  {format && <span className={styles.pill}>{format}</span>}
                  {episodes != null && (
                    <span className={styles.pill}>
                      {episodes}{' '}
                      {episodes === 1 ? t('labels.ep') : t('labels.eps')}
                    </span>
                  )}
                </div>

                {genres.length > 0 && (
                  <div className={styles.genresList}>
                    {genres.slice(0, 4).map((g) => (
                      <span key={g} className={styles.genreTag}>
                        {g}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recommendation Reason if available */}
            {selectedAnime &&
              (selectedAnime.predictionSource ||
                (selectedAnime.topContributingGenres &&
                  selectedAnime.topContributingGenres.length > 0) ||
                (selectedAnime.anchorAnimes &&
                  selectedAnime.anchorAnimes.length > 0) ||
                (selectedAnime.matchingGenres &&
                  selectedAnime.matchingGenres.length > 0)) && (
                <RecommendationReason anime={selectedAnime} />
              )}

            {/* Streaming links */}
            <div className={styles.streamingSection}>
              {streamingLinks.length > 0 ? (
                <div className={styles.streamingLinks}>
                  {streamingLinks.map((link) => (
                    <a
                      key={link.site + link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.streamingButton}
                    >
                      ▶ {t('decision.watch_now', { service: link.site })}
                    </a>
                  ))}
                </div>
              ) : (
                <span className={styles.noStreamingText}>
                  {t('decision.no_streaming')}
                </span>
              )}
            </div>

            {/* Actions */}
            <div className={styles.actionsRow}>
              <button
                className={styles.rerollButton}
                onClick={handlePickAnother}
              >
                {t('decision.pick_another')}
              </button>
              {onSelectAnime && (
                <button
                  className={styles.detailsButton}
                  onClick={() => onSelectAnime(selectedAnime)}
                >
                  {t('labels.expandDetails')}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className={styles.emptyState}>{t('decision.no_results')}</div>
        )}
      </div>
    </div>
  )
}
