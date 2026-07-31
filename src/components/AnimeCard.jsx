import './AnimeCard.css'

export default function AnimeCard({ anime, onGenreClick }) {
  const genres = anime?.genres ?? []
  const title = anime?.title || 'Untitled'
  const siteUrl = anime?.siteUrl || (anime?.id ? `https://anilist.co/anime/${anime.id}` : '#')

  return (
    <a
      href={siteUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="anime-card"
    >
      <div className="anime-card__image-wrapper">
        <img
          className="anime-card__image"
          src={anime?.coverImage}
          alt={`Capa de ${title}`}
          loading="lazy"
        />
      </div>
      <div className="anime-card__body">
        <h3 className="anime-card__title">{title}</h3>
        <p className="anime-card__predicted">
          Match: {(anime?.predictedScore ?? 0).toFixed(2)}/10
        </p>
        <p className="anime-card__community">
          Comunidade: {(anime?.communityScore ?? 0).toFixed(2)}/10
        </p>
        <div className="anime-card__genres">
          {genres.map((genre) => (
            <span
              key={genre}
              className="anime-card__genre-pill"
              onClick={(e) => {
                if (onGenreClick) {
                  e.preventDefault()
                  onGenreClick(genre)
                }
              }}
              style={{ cursor: onGenreClick ? 'pointer' : 'default' }}
            >
              {genre}
            </span>
          ))}
        </div>
      </div>
    </a>
  )
}
