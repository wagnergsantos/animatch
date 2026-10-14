import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import RecommendationReason from './RecommendationReason.jsx'
import styles from './AnimeDetailModal.module.css'

const PROVIDER_SHORT_LABELS = {
  mal: 'MAL',
  kitsu: 'Kitsu',
  anilist: 'AniList',
}

const PROVIDER_FULL_LABELS = {
  mal: 'MyAnimeList',
  kitsu: 'Kitsu',
  anilist: 'AniList',
}

export default function AnimeDetailModal({ anime, titlePref = 'english', onClose }) {
  const { t } = useTranslation()

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!anime) return null

  const rawTitleObj = anime?.titleObj || (typeof anime?.title === 'object' ? anime?.title : null) || anime?.media?.title || {}
  const englishTitle = rawTitleObj.english && typeof rawTitleObj.english === 'string' ? rawTitleObj.english : ''
  const romajiTitle = rawTitleObj.romaji && typeof rawTitleObj.romaji === 'string' ? rawTitleObj.romaji : (typeof anime?.title === 'string' ? anime.title : '')

  let mainTitle = ''
  let subTitle = ''

  if (titlePref === 'romaji') {
    mainTitle = romajiTitle || englishTitle || (typeof anime?.title === 'string' ? anime.title : '') || t('labels.untitled')
    subTitle = englishTitle && englishTitle !== mainTitle ? englishTitle : ''
  } else {
    mainTitle = englishTitle || romajiTitle || (typeof anime?.title === 'string' ? anime.title : '') || t('labels.untitled')
    subTitle = romajiTitle && romajiTitle !== mainTitle ? romajiTitle : ''
  }

  const title = mainTitle
  const siteUrl = anime?.siteUrl || (anime?.id ? `https://anilist.co/anime/${anime.id}` : '#')
  const genres = anime?.genres ?? []
  const providerKey = anime?.provider || 'anilist'
  const providerLabel = t(`providers.${providerKey}`, { defaultValue: PROVIDER_FULL_LABELS[providerKey] || 'AniList' })
  const planningProviders = Array.isArray(anime?.planningProviders) ? anime.planningProviders : []
  const hasMultiProviders = planningProviders.length > 1
  const presenceMultiplier = typeof anime?.presenceMultiplier === 'number' ? anime.presenceMultiplier : 1
  const presencePercent = Math.round((presenceMultiplier - 1) * 100)

  
  const streamingLinks = []
  const seenSites = new Set()
  for (const link of (anime?.streamingLinks ?? [])) {
    if (!seenSites.has(link.site)) {
      seenSites.add(link.site)
      streamingLinks.push(link)
    }
  }

  const year = anime?.year ?? anime?.seasonYear ?? anime?.startDate?.year
  const statusMap = {
    FINISHED: t('status.FINISHED'),
    RELEASING: t('status.RELEASING'),
    NOT_YET_RELEASED: t('status.NOT_YET_RELEASED'),
    CANCELLED: t('status.CANCELLED'),
    HIATUS: t('status.HIATUS'),
  }
  const statusLabel = anime?.status ? (statusMap[anime.status] || anime.status) : null

  const cleanDescription = anime?.description
    ? anime.description.replace(/<br\s*\/?/gi, '\n').replace(/<[^>]+>/g, '')
    : t('labels.noDescription')

  return (
    <div className={styles['anime-modal-overlay']} onClick={onClose} data-testid="anime-detail-modal-overlay">
      <div className={styles['anime-modal']} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className={styles['anime-modal__close']} onClick={onClose} aria-label={t('labels.closeModal')}>
          ✕
        </button>

        <div className={styles['anime-modal__header']}>
          {anime?.coverImage && (
            <img className={styles['anime-modal__cover']} src={anime.coverImage} alt={t('labels.coverAlt', { title })} />
          )}
          <div className={styles['anime-modal__header-info']}>
            <h2 id="modal-title" className={styles['anime-modal__title']}>{title}</h2>
            {subTitle && <div className={styles['anime-modal__subtitle']} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginBottom: 'var(--space-2)' }}>{subTitle}</div>}
            
            <div className={styles['anime-modal__meta-pills']}>
              {year && <span className={styles['anime-modal__pill']}>{year}</span>}
              {anime?.episodes && <span className={styles['anime-modal__pill']}>{anime.episodes} {anime.episodes === 1 ? t('labels.ep') : t('labels.eps')}</span>}
              {statusLabel && <span className={styles['anime-modal__pill']}>{statusLabel}</span>}
              {anime?.format && <span className={styles['anime-modal__pill']}>{anime.format}</span>}
            </div>

            {hasMultiProviders && (
              <div
                className={styles['anime-modal__presence']}
                data-testid="modal-provider-badges"
                title={t('ensemble.presence_badge_tooltip', {
                  providers: planningProviders
                    .map((p) => t(`providers.${p}`, { defaultValue: PROVIDER_FULL_LABELS[p] || p }))
                    .join(', '),
                  percent: presencePercent,
                  defaultValue: `Presente no seu Planning em: ${planningProviders.map((p) => PROVIDER_FULL_LABELS[p] || p).join(', ')} (+${presencePercent}%)`,
                })}
              >
                <div className={styles['anime-modal__presence-pills']}>
                  {planningProviders.map((p) => (
                    <span
                      key={p}
                      className={`${styles['provider-pill']} ${styles[`provider-pill--${p}`] || ''}`}
                    >
                      {PROVIDER_SHORT_LABELS[p] || p}
                    </span>
                  ))}
                </div>
                {presencePercent > 0 && (
                  <span className={styles['anime-modal__presence-boost']}>
                    +{presencePercent}%
                  </span>
                )}
              </div>
            )}

            <div className={styles['anime-modal__scores']}>
              {typeof anime?.predictedScore === 'number' && !isNaN(anime.predictedScore) && (
                <span className={`${styles['anime-modal__score']} ${styles['anime-modal__score--match']}`}>
                  {t('labels.match')}: {anime.predictedScore.toFixed(2)}/10
                </span>
              )}
              {typeof anime?.communityScore === 'number' && !isNaN(anime.communityScore) && (
                <span className={`${styles['anime-modal__score']} ${styles['anime-modal__score--community']}`}>
                  {t('labels.community')}: {anime.communityScore.toFixed(2)}/10
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={styles['anime-modal__body']}>
          <RecommendationReason anime={anime} />

          <h3 className={styles['anime-modal__section-title']}>{t('labels.synopsis')}</h3>
          <p className={styles['anime-modal__description']}>{cleanDescription}</p>

          {genres.length > 0 && (!anime?.matchingGenres || anime.matchingGenres.length === 0) && (
            <div className={styles['anime-modal__genres-section']}>
              <h3 className={styles['anime-modal__section-title']}>{t('labels.genres')}</h3>
              <div className={styles['anime-modal__genres']}>
                {genres.map((g) => (
                  <span key={g} className={styles['anime-modal__genre-tag']}>{g}</span>
                ))}
              </div>
            </div>
          )}

          {streamingLinks.length > 0 && (
            <div className={styles['anime-modal__streaming-section']}>
              <h3 className={styles['anime-modal__section-title']}>{t('labels.whereToWatch')}</h3>
              <div className={styles['anime-modal__streaming-links']}>
                {streamingLinks.map((link) => (
                  <a
                    key={link.site}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles['anime-modal__streaming-btn']}
                  >
                    ▶ {link.site}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className={styles['anime-modal__footer']}>
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={styles['anime-modal__anilist-btn']}
          >
            🔗 {t('labels.viewMoreOn', { provider: providerLabel })} ↗
          </a>
        </div>
      </div>
    </div>
  )
}
