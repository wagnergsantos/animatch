import AnimeCard from './AnimeCard.jsx'
import './RecommendationGrid.css'

function SkeletonCard() {
  return (
    <div className="anime-card anime-card--skeleton">
      <div className="anime-card__image-wrapper skeleton" />
      <div className="anime-card__body">
        <div className="skeleton" style={{ height: '1.2rem', width: '80%', marginBottom: 'var(--space-2)' }} />
        <div className="skeleton" style={{ height: '1rem', width: '50%', marginBottom: 'var(--space-1)' }} />
        <div className="skeleton" style={{ height: '0.8rem', width: '40%' }} />
      </div>
    </div>
  )
}

export default function RecommendationGrid({ recommendations = [], isLoading, onGenreClick }) {
  return (
    <section className="recommendation-grid">
      <h2 className="recommendation-grid__title">
        Recomendações — O Que Assistir Agora
      </h2>
      <div className="recommendation-grid__grid">
        {isLoading
          ? Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} />)
          : recommendations.map((anime) => (
              <AnimeCard key={anime.id} anime={anime} onGenreClick={onGenreClick} />
            ))}
      </div>
    </section>
  )
}
