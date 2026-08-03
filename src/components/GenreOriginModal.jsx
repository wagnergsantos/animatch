import './GenreOriginModal.css'

export default function GenreOriginModal({ genre, stats, onClose, onFilterGenre }) {
  if (!genre || !stats) return null

  const sourceAnimes = stats.sourceAnimes || []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="genre-origin-modal" onClick={(e) => e.stopPropagation()}>
        <div className="genre-origin-modal__header">
          <h2>Origem da nota: {genre}</h2>
          <button className="genre-origin-modal__close-btn" onClick={onClose} aria-label="Fechar">
            &times;
          </button>
        </div>

        <div className="genre-origin-modal__summary">
          <p>M)dia Real: <strong>&#9733; {stats.average?.toFixed(2)}</strong></p>
          <p>Animes avaliados: <strong>{stats.scoredCount || sourceAnimes.length}</strong></p>
        </div>

        <div className="genre-origin-modal__list">
          {sourceAnimes.map((anime) => (
            <div key={anime.id} className="genre-origin-card">
              {anime.coverImage && (
                <img src={anime.coverImage} alt={anime.title} className="genre-origin-card__cover" />
              )}
              <div className="genre-origin-card__info">
                <span className="genre-origin-card__title">{anime.title}</span>
                <span className="genre-origin-card__score">Sua Nota: &#9733; {anime.score || 'N/A'}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="genre-origin-modal__actions">
          {onFilterGenre && (
            <button
              className="genre-origin-modal__filter-btn"
              onClick={() => {
                onFilterGenre(genre)
                onClose()
              }}
            >
              Filtrar recomendações por {genre}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
