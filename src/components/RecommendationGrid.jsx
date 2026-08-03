import { useState, useEffect, useMemo } from 'react'
import AnimeCard from './AnimeCard.jsx'
import { fetchDubInfo } from '../api/index.js'
import { resolveYear } from '../logic/recommender.js'
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

export default function RecommendationGrid({ recommendations = [], isLoading = false, sortBy = 'predicted', favoriteDub = 'nenhuma', provider = 'anilist' }) {
  const [dubMap, setDubMap] = useState(new Map())
  const [ignoreDub, setIgnoreDub] = useState(false)
  const [showOnlyFavoriteDub, setShowOnlyFavoriteDub] = useState(false)

  useEffect(() => {
    if (!recommendations || recommendations.length === 0) return

    if (favoriteDub === 'nenhuma') {
      setDubMap(new Map())
      return
    }

    const fetchDubs = async () => {
      // Fetch up to 100 recommendations
      const ids = recommendations.slice(0, 100).map((r) => r.id)

      const newMap = new Map()
      // Fetch in chunks of 50
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50)
        const chunkMap = await fetchDubInfo(chunk, favoriteDub, provider)
        for (const [key, val] of chunkMap.entries()) {
          newMap.set(key, val)
        }
      }
      setDubMap(newMap)
    }

    fetchDubs()
  }, [recommendations, favoriteDub, provider])

  const displayRecommendations = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return []

    const list = [...recommendations].map((rec) => {
      const hasDub = dubMap.get(rec.id) ?? false
      const adjustedScore = hasDub && !ignoreDub ? Math.min(10, rec.predictedScore + 0.1) : rec.predictedScore
      return {
        ...rec,
        predictedScore: adjustedScore,
      }
    })

    const sorted = list.sort((a, b) => {
      if (sortBy === 'year_desc') {
        const yA = resolveYear(a)
        const yB = resolveYear(b)
        if (yA != null && yB != null) {
          if (yA !== yB) return yB - yA
          return (b.predictedScore || 0) - (a.predictedScore || 0)
        }
        if (yA != null) return -1
        if (yB != null) return 1
        return (b.predictedScore || 0) - (a.predictedScore || 0)
      }
      if (sortBy === 'year_asc') {
        const yA = resolveYear(a)
        const yB = resolveYear(b)
        if (yA != null && yB != null) {
          if (yA !== yB) return yA - yB
          return (b.predictedScore || 0) - (a.predictedScore || 0)
        }
        if (yA != null) return -1
        if (yB != null) return 1
        return (b.predictedScore || 0) - (a.predictedScore || 0)
      }
      if (sortBy === 'community') {
        if (b.communityScore !== a.communityScore) {
          return (b.communityScore || 0) - (a.communityScore || 0)
        }
        return (b.predictedScore || 0) - (a.predictedScore || 0)
      }
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '')
      }
      // default: predicted score
      if (b.predictedScore !== a.predictedScore) {
        return (b.predictedScore || 0) - (a.predictedScore || 0)
      }
      return (b.communityScore || 0) - (a.communityScore || 0)
    })

    if (favoriteDub !== 'nenhuma' && showOnlyFavoriteDub) {
      return sorted.filter((rec) => dubMap.get(rec.id) === true)
    }

    return sorted
  }, [recommendations, dubMap, ignoreDub, sortBy, favoriteDub, showOnlyFavoriteDub])

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

  if (!recommendations || recommendations.length === 0) {
    return (
      <section className="recommendation-grid">
        <h2 className="recommendation-grid__title">Sem recomendações no momento</h2>
        <p>Adicione mais animes na sua lista "Plan to Watch" no AniList!</p>
      </section>
    )
  }

  return (
    <section className="recommendation-grid">
      <div className="recommendation-grid__header">
        <h2 className="recommendation-grid__title" style={{ marginBottom: 0 }}>
          Recomendações — O Que Assistir Agora ({displayRecommendations.length})
        </h2>
        {favoriteDub !== 'nenhuma' && (
          <>
            <label className="dub-toggle">
              <input
                type="checkbox"
                checked={ignoreDub}
                onChange={(e) => setIgnoreDub(e.target.checked)}
              />
              Ignorar bônus de dublagem
            </label>
            <label className="dub-toggle">
              <input
                type="checkbox"
                checked={showOnlyFavoriteDub}
                onChange={(e) => setShowOnlyFavoriteDub(e.target.checked)}
              />
              Mostrar somente com minha dublagem favorita
            </label>
          </>
        )}
      </div>
      <div className="recommendation-grid__grid">
        {displayRecommendations.map((rec) => (
          <AnimeCard
            key={rec.id}
            anime={rec}
            hasDub={dubMap.get(rec.id) ?? false}
            dubLanguage={favoriteDub === 'nenhuma' ? 'pt-br' : favoriteDub}
          />
        ))}
      </div>
    </section>
  )
}

