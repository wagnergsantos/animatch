import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import AnimeCard from './AnimeCard.jsx'
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

export default function RecommendationGrid({ recommendations = [], isLoading = false, sortBy = 'predicted', provider = 'anilist', titlePref = 'english' }) {
  const { t } = useTranslation()

  const displayRecommendations = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return []

    const sorted = [...recommendations].sort((a, b) => {
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

    return sorted
  }, [recommendations, sortBy])

  if (isLoading) {
    return (
      <section className="recommendation-grid">
        <h2 className="recommendation-grid__title">{t('recommendationGrid.calculating')}</h2>
        <div className="recommendation-grid__grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    )
  }

  const providerLabel = t(`providers.${provider}`, provider === 'mal' ? 'MyAnimeList' : provider === 'kitsu' ? 'Kitsu' : 'AniList')

  if (!recommendations || recommendations.length === 0) {
    return (
      <section className="recommendation-grid">
        <h2 className="recommendation-grid__title">{t('recommendationGrid.none')}</h2>
        <p>{t('recommendationGrid.planToWatchPrompt', { provider: providerLabel })}</p>
      </section>
    )
  }

  return (
    <section className="recommendation-grid">
      <div className="recommendation-grid__header">
        <h2 className="recommendation-grid__title" style={{ marginBottom: 0 }}>
          {t('recommendationGrid.header', { count: displayRecommendations.length })}
        </h2>
      </div>
      <div className="recommendation-grid__grid">
        {displayRecommendations.map((rec) => (
          <AnimeCard
            key={rec.id}
            anime={rec}
            titlePref={titlePref}
          />
        ))}
      </div>
    </section>
  )
}
