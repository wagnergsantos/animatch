import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AnimeDetailModal from './AnimeDetailModal.jsx'
import './AnimeCard.css'

export default function AnimeCard({ anime, titlePref = 'english', onCardClick }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { t } = useTranslation()

  const genres = anime?.genres ?? []

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
  const siteUrl = anime?.siteUrl || (anime?.id ? `https://anilist.co/anime/${anime.id}` : '#')
  const providerKey = anime?.provider || 'anilist'
  const providerLabel = t(`providers.${providerKey}`, providerKey === 'mal' ? 'MyAnimeList' : providerKey === 'kitsu' ? 'Kitsu' : 'AniList')
  
  // Deduplicate streaming links by site
  const streamingLinks = []
  const seenSites = new Set()
  for (const link of (anime?.streamingLinks ?? [])) {
    if (!seenSites.has(link.site)) {
      seenSites.add(link.site)
      streamingLinks.push(link)
    }
  }

  const handleCardClick = (e) => {
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

  const handleDirectAnilistClick = (e) => {
    e.stopPropagation()
    window.open(siteUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <>
      <article
        className="anime-card"
        onClick={handleCardClick}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="link"
        style={{ cursor: 'pointer' }}
        title={title}
      >
        <div className="anime-card__image-wrapper">
          <img
            className="anime-card__image"
            src={anime?.coverImage || undefined}
            alt={t('labels.coverAlt', { title })}
            loading="lazy"
          />
          <div className="anime-card__badges-overlay">
            {anime?.predictionSource === 'community' ? (
              <span
                className="anime-card__badge-floating anime-card__badge-floating--community"
                title={t('labels.fallbackTooltip')}
              >
                <span className="anime-card__badge-icon">🌐</span>
                <span className="anime-card__badge-label">{t('labels.fallbackBadge')}</span>
              </span>
            ) : (
              anime?.badges?.map((badgeKey) => {
                const iconMap = {
                  ACCLAIMED: '💎',
                  PERSONAL_BET: '🧪',
                  STRONG_CONSENSUS: '🔥',
                }
                const labelText = t(`labels.badge_${badgeKey}`).replace(/^[^\w\s\u00C0-\u00FF]+/u, '').trim()
                return (
                  <span
                    key={badgeKey}
                    className={`anime-card__badge-floating anime-card__badge-floating--${badgeKey.toLowerCase()}`}
                    title={t(`labels.badge_${badgeKey}`)}
                  >
                    <span className="anime-card__badge-icon">{iconMap[badgeKey] || '⭐'}</span>
                    <span className="anime-card__badge-label">{labelText}</span>
                  </span>
                )
              })
            )}
          </div>
          <button
            className="anime-card__anilist-quickbtn"
            onClick={handleDirectAnilistClick}
            title={t('labels.openProvider', { provider: providerLabel })}
            aria-label={t('labels.openProvider', { provider: providerLabel })}
          >
            🔗 {providerLabel} ↗
          </button>
        </div>
        <div className="anime-card__body">
          <h3 className="anime-card__title">{mainTitle}</h3>
          {subTitle && <div className="anime-card__subtitle">{subTitle}</div>}
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
            return <div className="anime-card__meta">{parts.join(' • ')}</div>
          })()}
          {typeof anime?.predictedScore === 'number' && anime.predictedScore != null && !isNaN(anime.predictedScore) && (
            <p className="anime-card__predicted">
              {t('labels.match')}: {(anime.predictedScore).toFixed(2)}/10
            </p>
          )}
          {typeof anime?.communityScore === 'number' && anime.communityScore != null && !isNaN(anime.communityScore) && (
            <p className="anime-card__community">
              {t('labels.community')}: {(anime.communityScore).toFixed(2)}/10
            </p>
          )}

          {genres.length > 0 && (
            <div className="anime-card__genres">
              {genres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="anime-card__genre-pill"
                >
                  {genre}
                </span>
              ))}
              {genres.length > 3 && (
                <span className="anime-card__genre-pill anime-card__genre-pill--more">
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

