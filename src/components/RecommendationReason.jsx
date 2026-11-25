import { useTranslation } from 'react-i18next'
import { translateGenre } from '../lib/genreTranslations.js'
import styles from './RecommendationReason.module.css'

export default function RecommendationReason({ anime }) {
  const { t } = useTranslation()

  if (!anime) return null

  const isCommunity = anime.predictionSource === 'community'
  const matchingGenres = anime.matchingGenres ?? []
  const topGenres = anime.topContributingGenres ?? []
  const anchors = anime.anchorAnimes ?? []

  const sortedMatchingGenres = [...matchingGenres].sort((a, b) => b.score - a.score)
  const maxGenreScore = sortedMatchingGenres.length > 0 ? sortedMatchingGenres[0].score : 0

  const genreNames = topGenres.slice(0, 2).map((g) => translateGenre(g.genre, t)).join(', ')
  const anchorTitles = anchors.map((a) => a.title).join(', ')
  const sharedGenresText = sortedMatchingGenres.map((g) => translateGenre(g.genre, t)).join(', ')

  let summaryText = ''
  if (isCommunity) {
    summaryText = t('labels.reasonSummaryFallback')
  } else if (anchors.length > 0) {
    summaryText = t('labels.reasonSummaryAnchor', { animes: anchorTitles })
  } else if (topGenres.length > 0) {
    summaryText = t('labels.reasonSummaryTaste', { genres: genreNames })
  }

  return (
    <div className={styles['reason-box']} data-testid="recommendation-reason">
      <div className={styles['reason-header']}>
        <span className={styles['reason-icon']}>{isCommunity ? '🌐' : '💡'}</span>
        <h4 className={styles['reason-title']}>{t('labels.reasonTitle')}</h4>
      </div>

      {summaryText && (
        <p className={styles['reason-summary']}>{summaryText}</p>
      )}

      {!isCommunity && anchors.length > 0 && sharedGenresText && (
        <p className={styles['reason-genres-link']}>
          {t('labels.sharedGenresExplanation', {
            genres: sharedGenresText,
            defaultValue: `Pelos gêneros em comum: ${sharedGenresText}.`,
          })}
        </p>
      )}

      {isCommunity ? (
        <p className={styles['fallback-note']}>
          🌐 {t('labels.fallbackTooltip')}
        </p>
      ) : (
        <>
          <div className={styles['weights-bar']}>
            <span>
              🎯 {t('labels.tasteWeight', { score: anime.baseTasteScore != null ? anime.baseTasteScore.toFixed(2) : '-' })}
            </span>
            <span>
              🌐 {t('labels.communityWeight', { score: anime.communityScore != null ? anime.communityScore.toFixed(2) : '-' })}
            </span>
          </div>

          {sortedMatchingGenres.length > 0 && (
            <div className={styles['genres-breakdown']}>
              {sortedMatchingGenres.map((item) => {
                const isTop = item.score === maxGenreScore
                return (
                  <span
                    key={item.genre}
                    className={`${styles['genre-chip']} ${isTop ? styles['genre-chip--top'] : ''}`}
                    title={isTop ? t('labels.topGenreScore', 'Maior nota por gênero') : undefined}
                  >
                    <span>{translateGenre(item.genre, t)}:</span>
                    <span className={styles['genre-chip__score']}>{item.score.toFixed(2)}</span>
                  </span>
                )
              })}
            </div>
          )}

          {anchors.length > 0 && (
            <div className={styles['anchors-section']}>
              <div className={styles['anchors-title']}>{t('labels.anchorAnimesTitle')}</div>
              <div className={styles['anchors-list']}>
                {anchors.map((item) => (
                  <span key={item.id} className={styles['anchor-chip']}>
                    {item.coverImage && (
                      <img
                        src={item.coverImage}
                        alt={item.title}
                        className={styles['anchor-chip__cover']}
                      />
                    )}
                    <span className={styles['anchor-chip__title']}>{item.title}</span>
                    <span className={styles['anchor-chip__score']}>★ {item.score}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
