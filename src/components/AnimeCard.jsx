import './AnimeCard.css'

export default function AnimeCard({ anime, hasDub }) {
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

  const handleCardClick = () => {
    window.open(siteUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <article
      className="anime-card"
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
      title={anime?.description || title}
    >
      <div className="anime-card__image-wrapper">
        <img
          className="anime-card__image"
          src={anime?.coverImage || undefined}
          alt={`Capa de ${title}`}
          loading="lazy"
        />
      </div>
      <div className="anime-card__body">
        <h3 className="anime-card__title">{title}</h3>
        {anime?.predictedScore && (
          <p className="anime-card__predicted">
            Match: {(anime.predictedScore).toFixed(2)}/10
          </p>
        )}
        {anime?.communityScore && (
          <p className="anime-card__community">
            Comunidade: {(anime.communityScore).toFixed(2)}/10
          </p>
        )}

        {hasDub && (
          <div className="anime-card__dub-badge">
            🎙️ Dublado PT-BR
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
  )
}
