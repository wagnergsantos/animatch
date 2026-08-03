import { useEffect, useRef } from 'react'
import './GenreOriginModal.css'

export default function GenreOriginModal({ genre, stats, onClose, onFilterGenre }) {
  const modalRef = useRef(null)

  useEffect(() => {
    if (!genre || !stats) return

    const modalElement = modalRef.current
    if (!modalElement) return

    // Focus first focusable element or modal container
    const focusableElements = modalElement.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    if (firstElement) {
      firstElement.focus()
    } else {
      modalElement.focus()
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
        return
      }

      if (e.key === 'Tab' && focusableElements.length > 0) {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [genre, stats, onClose])

  if (!genre || !stats) return null

  const sourceAnimes = stats.sourceAnimes || []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        ref={modalRef}
        className="genre-origin-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="genre-origin-modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="genre-origin-modal__header">
          <h2 id="genre-origin-modal-title">Origem da nota: {genre}</h2>
          <button className="genre-origin-modal__close-btn" onClick={onClose} aria-label="Fechar modal">
            &times;
          </button>
        </div>

        <div className="genre-origin-modal__summary">
          <p>Média Real: <strong>&#9733; {(stats.average ?? 0).toFixed(2)}</strong></p>
          <p>Animes avaliados: <strong>{stats.scoredCount ?? sourceAnimes.length}</strong></p>
        </div>

        <div className="genre-origin-modal__list">
          {sourceAnimes.map((anime) => {
            const siteUrl = anime.siteUrl || (anime.id ? `https://anilist.co/anime/${anime.id}` : '#')
            const providerLabel = anime.provider === 'kitsu' ? 'Kitsu' : 'AniList'

            return (
              <a
                key={anime.id}
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="genre-origin-card"
                title={`Abrir ${anime.title} no ${providerLabel}`}
              >
                {anime.coverImage && (
                  <img src={anime.coverImage} alt={anime.title} className="genre-origin-card__cover" />
                )}
                <div className="genre-origin-card__info">
                  <span className="genre-origin-card__title">
                    {anime.title}
                    <span className="genre-origin-card__link-icon" aria-hidden="true"> ↗</span>
                  </span>
                  <span className="genre-origin-card__score">Sua Nota: &#9733; {anime.score ?? 'N/A'}</span>
                </div>
              </a>
            )
          })}
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
