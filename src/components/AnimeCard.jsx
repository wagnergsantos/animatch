import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AnimeDetailModal from './AnimeDetailModal.jsx'
import styles from './AnimeCard.module.css'

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

export default function AnimeCard({ anime, titlePref = 'english', priority = false, onCardClick }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { t } = useTranslation()

  const genres = anime?.genres ?? []
  const planningProviders = Array.isArray(anime?.planningProviders) ? anime.planningProviders : []
  const sourceProviders = Array.isArray(anime?.sourceProviders) ? anime.sourceProviders : []
  const hasMultiProviders = planningProviders.length > 1
  const presenceMultiplier = typeof anime?.presenceMultiplier === 'number' ? anime.presenceMultiplier : 1
  const presencePercent = Math.round((presenceMultiplier - 1) * 100)

  // Determina provedores a exibir no card
  const activeProviders = planningProviders.length > 0
    ? planningProviders
    : (sourceProviders.length > 0 ? sourceProviders : (anime?.provider ? [anime.provider] : ['anilist']))

  const getProviderUrl = (providerKey) => {
    if (anime?.providerUrls && anime.providerUrls[providerKey]) {
      return anime.providerUrls[providerKey]
    }
    if (anime?.provider === providerKey && anime?.siteUrl) {
      return anime.siteUrl
    }
    if (providerKey === 'anilist') {
      const id = (anime?.provider === 'anilist' ? anime?.id : null) || anime?.media?.id || anime?.id
      return id ? `https://anilist.co/anime/${id}` : (anime?.siteUrl || '#')
    }
    if (providerKey === 'mal') {
      const malId = anime?.idMal || anime?.media?.idMal || (anime?.provider === 'mal' ? (anime?.id || anime?.media?.id) : null)
      return malId ? `https://myanimelist.net/anime/${malId}` : (anime?.siteUrl || '#')
    }
    if (providerKey === 'kitsu') {
      const kitsuId = (anime?.provider === 'kitsu' ? (anime?.id || anime?.media?.id) : null)
      return kitsuId ? `https://kitsu.io/anime/${kitsuId}` : (anime?.siteUrl || '#')
    }
    return anime?.siteUrl || '#'
  }

  // Extrai titulo principal e secundario
  const rawTitleObj = anime?.titleObj || (typeof anime?.title === 'object' ? anime?.title : null) || anime?.media?.title || {}
  const englishTitle = rawTitleObj.english && typeof rawTitleObj.english === 'string' ? rawTitleObj.english : ''
  const romajiTitle = rawTitleObj.romaji && typeof rawTitleObj.romaji === 'string' ? rawTitleObj.romaji : (typeof anime?.title === 'string' ? anime.title : '')

  let mainTitle = ''
  let subTitle = ''

  if (titlePref === 'romaji') {
    mainTitle = romajiTitle || englishTitle || (typeof anime?.title === 'string' ? anime.title : '') || t('labels.untitled')
    subTitle = englishTitle && englishTitle !== mainTitle ? englishTitle : ''
  } else {
    // default: english
    mainTitle = englishTitle || romajiTitle || (typeof anime?.title === 'string' ? anime.title : '') || t('labels.untitled')
    subTitle = romajiTitle && romajiTitle !== mainTitle ? romajiTitle : ''
  }

  const title = mainTitle

  // Deduplicate streaming links by site
  const streamingLinks = []
  const seenSites = new Set()
  for (const link of (anime?.streamingLinks ?? [])) {
    if (!seenSites.has(link.site)) {
      seenSites.add(link.site)
      streamingLinks.push(link)
    }
  }

  const handleCardClick = (_e) => {
    // If selecting text, don't open modal
    const selection = window.getSelection()
    if (selection && selection.toString().length > 0) return

    if (onCardClick) {
      onCardClick(anime)
    } else {
      setIsModalOpen(true)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleCardClick(e)
    }
  }

  const handleProviderLinkClick = (e, providerKey) => {
    e.stopPropagation()
    const url = getProviderUrl(providerKey)
    if (url && url !== '#') {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <>
      <article
        className={styles['anime-card']}
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="link"
        style={{ cursor: 'pointer' }}
        title={title}
      >
        <div className={styles['anime-card__image-wrapper']}>
          <img
            className={styles['anime-card__image']}
            src={anime?.coverImage || undefined}
            alt={t('labels.coverAlt', { title })}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
          />
          <div className={styles['anime-card__badges-overlay']}>
            {anime?.predictionSource === 'community' ? (
              <span
                className={`${styles['anime-card__badge-floating']} ${styles['anime-card__badge-floating--community']}`}
                title={t('labels.fallbackTooltip')}
              >
                <span className={styles['anime-card__badge-icon']}>🌐</span>
                <span className={styles['anime-card__badge-label']}>{t('labels.fallbackBadge')}</span>
              </span>
            ) : (
              anime?.badges?.map((badgeKey) => {
                const iconMap = {
                  ACCLAIMED: '💎',
                  PERSONAL_BET: '🧪',
                  STRONG_CONSENSUS: '🔥',
                }
                const labelText = t(`labels.badge_${badgeKey}`).replace(/^[^\w\s\u00C0-\u00FF]+/u, '').trim()
                const modifierClass = styles[`anime-card__badge-floating--${badgeKey.toLowerCase()}`] || ''
                return (
                  <span
                    key={badgeKey}
                    className={`${styles['anime-card__badge-floating']} ${modifierClass}`}
                    title={t(`labels.badge_${badgeKey}`)}
                  >
                    <span className={styles['anime-card__badge-icon']}>{iconMap[badgeKey] || '⭐'}</span>
                    <span className={styles['anime-card__badge-label']}>{labelText}</span>
                  </span>
                )
              })
            )}
          </div>
          <div
            className={styles['card-provider-actions']}
            {...(hasMultiProviders ? { 'data-testid': 'card-provider-badges' } : {})}
            title={hasMultiProviders ? t('ensemble.presence_badge_tooltip', {
              providers: planningProviders
                .map((p) => t(`providers.${p}`, { defaultValue: PROVIDER_FULL_LABELS[p] || p }))
                .join(', '),
              percent: presencePercent,
              defaultValue: `Presente no seu Planning em: ${planningProviders.map((p) => PROVIDER_FULL_LABELS[p] || p).join(', ')} (+${presencePercent}%)`,
            }) : undefined}
          >
            {activeProviders.map((p) => {
              const fullLabel = t(`providers.${p}`, { defaultValue: PROVIDER_FULL_LABELS[p] || p })
              const shortLabel = PROVIDER_SHORT_LABELS[p] || p
              return (
                <button
                  key={p}
                  type="button"
                  className={`${styles['provider-pill-btn']} ${styles[`provider-pill-btn--${p}`] || ''}`}
                  onClick={(e) => handleProviderLinkClick(e, p)}
                  title={t('labels.openProvider', { provider: fullLabel })}
                  aria-label={t('labels.openProvider', { provider: fullLabel })}
                  data-testid="anime-card-quick-link"
                >
                  <span className={styles['provider-pill-btn__label']}>{shortLabel}</span>
                  <span className={styles['provider-pill-btn__icon']}>↗</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className={styles['anime-card__body']}>
          <h3 className={styles['anime-card__title']}>{mainTitle}</h3>
          {subTitle && <div className={styles['anime-card__subtitle']}>{subTitle}</div>}
          {(() => {
            const parts = []
            const year = anime?.year ?? anime?.seasonYear ?? anime?.startDate?.year
            if (year) parts.push(year)

            if (anime?.episodes) {
              parts.push(`${anime.episodes} ${anime.episodes === 1 ? t('labels.ep') : t('labels.eps')}`)
            }

            if (anime?.status) {
              const statusMap = {
                FINISHED: t('status.FINISHED'),
                RELEASING: t('status.RELEASING'),
                NOT_YET_RELEASED: t('status.NOT_YET_RELEASED'),
                CANCELLED: t('status.CANCELLED'),
                HIATUS: t('status.HIATUS'),
              }
              parts.push(statusMap[anime.status] || anime.status)
            }

            if (parts.length === 0) return null
            return <div className={styles['anime-card__meta']}>{parts.join(' • ')}</div>
          })()}
          {typeof anime?.predictedScore === 'number' && anime.predictedScore != null && !isNaN(anime.predictedScore) && (
            <p className={styles['anime-card__predicted']}>
              {t('labels.match')}: {(anime.predictedScore).toFixed(2)}/10
            </p>
          )}
          {typeof anime?.communityScore === 'number' && anime.communityScore != null && !isNaN(anime.communityScore) && (
            <p className={styles['anime-card__community']}>
              {t('labels.community')}: {(anime.communityScore).toFixed(2)}/10
            </p>
          )}

          {(() => {
            if (anime?.predictionSource === 'community') {
              return (
                <div className={styles['anime-card__reason']}>
                  {t('labels.cardReasonFallback')}
                </div>
              )
            }
            if (anime?.anchorAnimes && anime.anchorAnimes.length > 0) {
              return (
                <div className={styles['anime-card__reason']}>
                  {t('labels.cardReasonAnchor', { title: anime.anchorAnimes[0].title })}
                </div>
              )
            }
            if (anime?.topContributingGenres && anime.topContributingGenres.length > 0) {
              const gList = anime.topContributingGenres.slice(0, 2).map((g) => g.genre).join(', ')
              return (
                <div className={styles['anime-card__reason']}>
                  {t('labels.cardReasonTaste', { genres: gList })}
                </div>
              )
            }
            return null
          })()}

          {genres.length > 0 && (
            <div className={styles['anime-card__genres']}>
              {genres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className={styles['anime-card__genre-pill']}
                >
                  {genre}
                </span>
              ))}
              {genres.length > 3 && (
                <span className={`${styles['anime-card__genre-pill']} ${styles['anime-card__genre-pill--more']}`}>
                  +{genres.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </article>

      {isModalOpen && (
        <AnimeDetailModal
          anime={anime}
          titlePref={titlePref}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}

