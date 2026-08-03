import { useEffect } from 'react'
import './AnimeDetailModal.css'

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

export default function AnimeDetailModal({ anime, hasDub, dubLanguage = 'pt-br', onClose }) {
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

  const title = anime?.title || 'Untitled'
  const siteUrl = anime?.siteUrl || (anime?.id ? `https://anilist.co/anime/${anime.id}` : '#')
  const genres = anime?.genres ?? []
  const providerLabel = anime?.provider === 'kitsu' ? 'Kitsu' : 'AniList'
  
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
    FINISHED: 'Concluído',
    RELEASING: 'Em exibição',
    NOT_YET_RELEASED: 'Em breve',
    CANCELLED: 'Cancelado',
    HIATUS: 'Em hiato',
  }
  const statusLabel = anime?.status ? (statusMap[anime.status] || anime.status) : null

  const cleanDescription = anime?.description
    ? anime.description.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')
    : 'Sem descrição disponível.'

  return (
    <div className="anime-modal-overlay" onClick={onClose} data-testid="anime-detail-modal-overlay">
      <div className="anime-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button className="anime-modal__close" onClick={onClose} aria-label="Fechar modal">
          ✕
        </button>

        <div className="anime-modal__header">
          {anime?.coverImage && (
            <img className="anime-modal__cover" src={anime.coverImage} alt={`Capa de ${title}`} />
          )}
          <div className="anime-modal__header-info">
            <h2 id="modal-title" className="anime-modal__title">{title}</h2>
            
            <div className="anime-modal__meta-pills">
              {year && <span className="anime-modal__pill">{year}</span>}
              {anime?.episodes && <span className="anime-modal__pill">{anime.episodes} {anime.episodes === 1 ? 'ep' : 'eps'}</span>}
              {statusLabel && <span className="anime-modal__pill">{statusLabel}</span>}
              {anime?.format && <span className="anime-modal__pill">{anime.format}</span>}
            </div>

            <div className="anime-modal__scores">
              {typeof anime?.predictedScore === 'number' && !isNaN(anime.predictedScore) && (
                <span className="anime-modal__score anime-modal__score--match">
                  Match: {anime.predictedScore.toFixed(2)}/10
                </span>
              )}
              {typeof anime?.communityScore === 'number' && !isNaN(anime.communityScore) && (
                <span className="anime-modal__score anime-modal__score--community">
                  Comunidade: {anime.communityScore.toFixed(2)}/10
                </span>
              )}
            </div>

            {hasDub && (
              <div className="anime-modal__dub">
                🎙️ Dublado {DUB_LABELS[dubLanguage] || dubLanguage}
              </div>
            )}
          </div>
        </div>

        <div className="anime-modal__body">
          <h3 className="anime-modal__section-title">Sinopse</h3>
          <p className="anime-modal__description">{cleanDescription}</p>

          {genres.length > 0 && (
            <div className="anime-modal__genres-section">
              <h3 className="anime-modal__section-title">Gêneros</h3>
              <div className="anime-modal__genres">
                {genres.map((g) => (
                  <span key={g} className="anime-modal__genre-tag">{g}</span>
                ))}
              </div>
            </div>
          )}

          {streamingLinks.length > 0 && (
            <div className="anime-modal__streaming-section">
              <h3 className="anime-modal__section-title">Onde assistir</h3>
              <div className="anime-modal__streaming-links">
                {streamingLinks.map((link) => (
                  <a
                    key={link.site}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="anime-modal__streaming-btn"
                  >
                    ▶ {link.site}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="anime-modal__footer">
          <a
            href={siteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="anime-modal__anilist-btn"
          >
            🔗 Ver mais no {providerLabel} ↗
          </a>
        </div>
      </div>
    </div>
  )
}
