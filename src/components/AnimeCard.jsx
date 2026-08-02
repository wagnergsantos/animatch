import { useState } from 'react'
import AnimeDetailModal from './AnimeDetailModal.jsx'
import './AnimeCard.css'

const DUB_LABELS = {
  'pt-br': 'PT-BR',
  'en': 'Inglês',
  'ja': 'Japonês',
  'es': 'Espanhol',
  'de': 'Alemão',
  'ko': 'Coreano',
  'fr': 'Francês',
  'it': 'Italiano',
}

export default function AnimeCard({ anime, hasDub, dubLanguage = 'pt-br', onCardClick }) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const genres = anime?.genres ?? []
  const title = anime?.title || 'Untitled'
  const siteUrl = anime?.siteUrl || (anime?.id ? `https://anilist.co/anime/${anime.id}` : '#')
  
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
            alt={`Capa de ${title}`}
            loading="lazy"
          />
          <button
            className="anime-card__anilist-quickbtn"
            onClick={handleDirectAnilistClick}
            title="Abrir diretamente no AniList"
            aria-label="Abrir no AniList"
          >
            🔗 AniList ↗
          </button>
        </div>
        <div className="anime-card__body">
          <h3 className="anime-card__title">{title}</h3>
          {(() => {
            const parts = []
            const year = anime?.year ?? anime?.seasonYear ?? anime?.startDate?.year
            if (year) parts.push(year)

            if (anime?.episodes) {
              parts.push(`${anime.episodes} ${anime.episodes === 1 ? 'ep' : 'eps'}`)
            }

            if (anime?.status) {
              const statusMap = {
                FINISHED: 'Concluído',
                RELEASING: 'Em exibição',
                NOT_YET_RELEASED: 'Em breve',
                CANCELLED: 'Cancelado',
                HIATUS: 'Em hiato',
              }
              parts.push(statusMap[anime.status] || anime.status)
            }

            if (parts.length === 0) return null
            return <div className="anime-card__meta">{parts.join(' • ')}</div>
          })()}
          {typeof anime?.predictedScore === 'number' && !isNaN(anime.predictedScore) && (
            <p className="anime-card__predicted">
              Match: {(anime.predictedScore).toFixed(2)}/10
            </p>
          )}
          {typeof anime?.communityScore === 'number' && !isNaN(anime.communityScore) && (
            <p className="anime-card__community">
              Comunidade: {(anime.communityScore).toFixed(2)}/10
            </p>
          )}

          {hasDub && (
            <div className="anime-card__dub-badge">
              🎙️ Dublado {DUB_LABELS[dubLanguage] || dubLanguage}
            </div>
          )}

          {streamingLinks.length > 0 && (
            <div className="anime-card__streaming">
              <span className="anime-card__streaming-label">Onde assistir:</span>
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

