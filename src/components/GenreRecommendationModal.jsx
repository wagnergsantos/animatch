import { useMemo, useEffect } from 'react'
import { scoreRecommendations } from '../logic/recommender.js'
import RecommendationGrid from './RecommendationGrid.jsx'
import './GenreRecommendationModal.css'

export default function GenreRecommendationModal({ genre, planningEntries, tasteProfile, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const genreRecommendations = useMemo(() => {
    if (!genre) return []
    // Filter planning entries by selected genre
    const matchingPlanning = planningEntries.filter((e) =>
      e?.media?.genres?.includes(genre)
    )
    return scoreRecommendations(matchingPlanning, tasteProfile, 'ALL')
  }, [genre, planningEntries, tasteProfile])

  if (!genre) return null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <header className="modal-header">
          <h2>Recomendações do Gênero: <span>{genre}</span></h2>
          <button className="modal-close-btn" onClick={onClose} aria-label="Fechar modal">✕</button>
        </header>
        <main className="modal-body">
          {genreRecommendations.length > 0 ? (
            <RecommendationGrid recommendations={genreRecommendations} />
          ) : (
            <div className="modal-empty-msg">
              <p>Nenhum anime na sua lista 'Planning' possui o gênero <strong>{genre}</strong>.</p>
              <p>Adicione mais animes à sua lista no AniList para ver recomendações aqui.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
