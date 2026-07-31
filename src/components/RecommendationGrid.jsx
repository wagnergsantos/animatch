import { useState, useEffect } from 'react'
import AnimeCard from './AnimeCard.jsx'
import { fetchDubInfo } from '../api/anilist.js'
import './RecommendationGrid.css'

function SkeletonCard() {
  return (
    <div className="anime-card anime-card--skeleton" data-testid="skeleton">
      <div className="anime-card__image-wrapper skeleton" />
      <div className="anime-card__body">
        <div className="skeleton" style={{ height: '1.2rem', width: '80%', marginBottom: 'var(--space-2)' }} />
        <div className="skeleton" style={{ height: '1rem', width: '50%', marginBottom: 'var(--space-1)' }} />
        <div className="skeleton" style={{ height: '0.8rem', width: '40%' }} />
      </div>
    </div>
  )
}

export default function RecommendationGrid({ recommendations = [], isLoading = false }) {
  const [dubMap, setDubMap] = useState(new Map())

  useEffect(() => {
    if (recommendations.length === 0) return

    const fetchDubs = async () => {
      // Fetch up to 100 recommendations
      const ids = recommendations.slice(0, 100).map(r => r.id)
      
      const newMap = new Map()
      // Fetch in chunks of 50
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50)
        const chunkMap = await fetchDubInfo(chunk)
        for (const [key, val] of chunkMap.entries()) {
          newMap.set(key, val)
        }
      }
      setDubMap(newMap)
    }

    fetchDubs()
  }, [recommendations])

  if (isLoading) {
    return (
      <section className="recommendation-grid">
        <h2 className="recommendation-grid__title">Calculando suas Recomendações...</h2>
        <div className="recommendation-grid__grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    )
  }

  if (recommendations.length === 0) {
    return (
      <section className="recommendation-grid">
        <h2 className="recommendation-grid__title">Sem recomendações no momento</h2>
        <p>Adicione mais animes na sua lista "Plan to Watch" no AniList!</p>
      </section>
    )
  }

  return (
    <section className="recommendation-grid">
      <h2 className="recommendation-grid__title">Recomendações — O Que Assistir Agora</h2>
      <div className="recommendation-grid__grid">
        {recommendations.map((rec) => (
          <AnimeCard 
            key={rec.id} 
            anime={rec} 
            hasDub={dubMap.get(rec.id) ?? false}
          />
        ))}
      </div>
    </section>
  )
}
