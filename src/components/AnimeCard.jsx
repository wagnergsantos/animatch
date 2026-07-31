import './AnimeCard.css'

export default function AnimeCard({ anime }) {
  const genres = anime?.genres ?? []
  return (
    <article className="anime-card">
      <div className="anime-card__image-wrapper">
        <img
          className="anime-card__image"
          src={anime.coverImage}
          alt={`Capa de ${anime.title}`}
          loading="lazy"
        />
      </div>
      <div className="anime-card__body">
        <h3 className="anime-card__title">{anime.title}</h3>
        <p className="anime-card__predicted">
          Match: {anime.predictedScore.toFixed(1)}/10
        </p>
        <p className="anime-card__community">
          Comunidade: {anime.communityScore.toFixed(1)}/10
        </p>
        <div className="anime-card__genres">
          {genres.map((genre) => (
            <span key={genre} className="anime-card__genre-pill">
              {genre}
            </span>
          ))}
        </div>
      </div>
    </article>
  )
}
