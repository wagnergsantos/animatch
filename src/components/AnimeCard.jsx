import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AnimeDetailModal from './AnimeDetailModal.jsx'
import './AnimeCard.css'

export default function AnimeCard({ anime, hasDub, dubLanguage = 'pt-br', onCardClick }) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { t } = useTranslation()

  const genres = anime?.genres ?? []
  const title = anime?.title || t('labels.untitled')
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
          <h3 className="anime-card__title">{title}</h3>
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

          {hasDub && (
            <div className="anime-card__dub-badge">
              🎙️ {t('labels.dubbed', { lang: t(`dub.${dubLanguage}`) })}
            </div>
          )}

          {streamingLinks.length > 0 && (
            <div className="anime-card__streaming">
              <span className="anime-card__streaming-label">{t('labels.whereToWatch')}</span>
              <div className="anime-card__streaming-links">
                {streamingLinks.map(link => (
                  <a
                    key={link.site}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="anime-card__streaming-link"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {link.site}
                  </a>
                ))}
              </div>
            </div>
          )}
          <div className="anime-card__genres">
            {genres.map((genre) => (
              <span
                key={genre}
                className="anime-card__genre-pill"
              >
                {genre}
              </span>
            ))}
          </div>
        </div>
      </article>

      {isModalOpen && (
        <AnimeDetailModal
          anime={anime}
          hasDub={hasDub}
          dubLanguage={dubLanguage}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </>
  )
}

