import { useTranslation } from 'react-i18next'
import styles from './RecommendationReason.module.css'

export default function RecommendationReason({ anime }) {
  const { t } = useTranslation()

  if (!anime) return null

  const isCommunity = anime.predictionSource === 'community'
  const topGenres = anime.topContributingGenres ?? []
  const anchors = anime.anchorAnimes ?? []

  const genreNames = topGenres.slice(0, 2).map((g) => g.genre).join(', ')
  const anchorTitles = anchors.slice(0, 2).map((a) => a.title).join(', ')

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
    </div>
  )
}
