import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AnimeCard from './AnimeCard.jsx'
import AnimeRow from './AnimeRow.jsx'
import { resolveYear } from '../logic/recommender.js'
import styles from './RecommendationGrid.module.css'
import cardStyles from './AnimeCard.module.css'

// Progressive rendering: mostra apenas os primeiros itens imediatamente e
// revela o restante conforme o usuário rola (via IntersectionObserver).
// Isso reduz drasticamente o número de requisições de capas (que vêm de
// anilist.co / kitsu.io / myanimelist.net) no primeiro paint.
export const INITIAL_BATCH_SIZE = 15
const BATCH_STEP = 15

// O skeleton de loading reaproveita classes reais de AnimeCard.module.css
// (anime-card, anime-card__image-wrapper, anime-card__body) pra ter a mesma
// "silhueta" visual do card de verdade enquanto carrega. `anime-card--skeleton`
// e `skeleton` (via .skeleton global de src/index.css) não têm equivalente
// local — o primeiro é um className sem estilo correspondente em lugar
// nenhum (já era assim antes da migração pra CSS Modules, não modifiquei);
// o segundo é intencionalmente global, não precisa de import.
function SkeletonCard() {
  return (
    <div className={`${cardStyles['anime-card']} anime-card--skeleton`} data-testid="skeleton">
      <div className={`${cardStyles['anime-card__image-wrapper']} skeleton`} />
      <div className={cardStyles['anime-card__body']}>
        <div className="skeleton" style={{ height: '1.2rem', width: '80%', marginBottom: 'var(--space-2)' }} />
        <div className="skeleton" style={{ height: '1rem', width: '50%', marginBottom: 'var(--space-1)' }} />
        <div className="skeleton" style={{ height: '0.8rem', width: '40%' }} />
      </div>
    </div>
  )
}

export default function RecommendationGrid({ 
  recommendations = [], 
  isLoading = false, 
  sortBy = 'predicted', 
  provider = 'anilist', 
  titlePref = 'english', 
  viewMode = 'grid', 
  headerActions = null, 
  isLoadingMore = false,
  initialBatchSize = INITIAL_BATCH_SIZE 
}) {
  const { t } = useTranslation()

  // Garantir que sempre temos um array
  const safeRecommendations = useMemo(
    () => (Array.isArray(recommendations) ? recommendations : []),
    [recommendations]
  )

  // Lote visível (progressive rendering). Reinicia ao trocar de lista/filtro.
  const [visibleCount, setVisibleCount] = useState(initialBatchSize)
  const sentinelRef = useRef(null)

  const listKey = `${provider}|${viewMode}|${sortBy}|${safeRecommendations.length}:${safeRecommendations[0]?.id ?? ''}`

  useEffect(() => {
    setVisibleCount(initialBatchSize)
  }, [listKey, initialBatchSize])

  // Observa o "sentinela" no fim da lista: quando ele aparece na viewport,
  // libera mais um lote. Assim as capas do resto só são requisitadas à medida
  // que o usuário rola — em vez de dezenas de imagens externas de uma vez.
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      // Ambiente sem IO (ex.: jsdom): mostra tudo para não esconder conteúdo.
      setVisibleCount(Number.POSITIVE_INFINITY)
      return undefined
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleCount((prev) => (Number.isFinite(prev) ? prev + BATCH_STEP : prev))
        }
      },
      { rootMargin: '600px 0px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [listKey, visibleCount])

  const displayRecommendations = useMemo(() => {
    if (!safeRecommendations || safeRecommendations.length === 0) return []

    const sorted = [...safeRecommendations].sort((a, b) => {
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
  }, [safeRecommendations, sortBy])

  const visibleRecommendations = useMemo(
    () => displayRecommendations.slice(0, visibleCount),
    [displayRecommendations, visibleCount]
  )
  const hasMore = displayRecommendations.length > visibleRecommendations.length

  if (isLoading) {
    return (
      <section className="recommendation-grid">
        <h2 className={styles['recommendation-grid__title']}>{t('recommendationGrid.calculating')}</h2>
        <div className={styles['recommendation-grid__grid']}>
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
        <h2 className={styles['recommendation-grid__title']}>{t('recommendationGrid.none')}</h2>
        <p>{t('recommendationGrid.planToWatchPrompt', { provider: providerLabel })}</p>
      </section>
    )
  }

  return (
    <section className="recommendation-grid">
      <div className={styles['recommendation-grid__header']}>
        <h2 className={styles['recommendation-grid__title']} style={{ marginBottom: 0 }}>
          {t('recommendationGrid.header', { count: displayRecommendations.length })}
        </h2>
        {headerActions}
      </div>
      {viewMode === 'list' ? (
        <div className={styles['recommendation-grid__list']}>
          {visibleRecommendations.map((rec, index) => (
            <AnimeRow
              key={rec.id}
              anime={rec}
              titlePref={titlePref}
              priority={index < 4}
            />
          ))}
        </div>
      ) : (
        <div className={styles['recommendation-grid__grid']}>
          {visibleRecommendations.map((rec, index) => (
            <AnimeCard
              key={rec.id}
              anime={rec}
              titlePref={titlePref}
              priority={index < 4}
            />
          ))}
        </div>
      )}
      {hasMore && <div ref={sentinelRef} data-testid="grid-sentinel" aria-hidden="true" style={{ height: 1 }} />}
      {isLoadingMore && (
        <div className={styles['loading-footer']}>
          <div className="skeleton" style={{ height: '1.5rem', width: '60%', margin: 'var(--space-4) auto' }} />
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            {t('recommendationGrid.loadingMore', { count: displayRecommendations.length - visibleRecommendations.length })}
          </p>
        </div>
      )}
    </section>
  )
}
