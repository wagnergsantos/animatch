import { Fragment, useEffect, useMemo, useState, useDeferredValue } from 'react'
import { useTranslation } from 'react-i18next'
import AnimeCard from './AnimeCard.jsx'
import AnimeRow from './AnimeRow.jsx'
import { resolveYear, groupRecommendationsByFranchise } from '../logic/recommender.js'
import styles from './RecommendationGrid.module.css'
import cardStyles from './AnimeCard.module.css'

// Paginação progressiva por lote:
// Mostra 24 animes inicialmente e adiciona botão explícito "Carregar mais"
// para garantir que o rodapé institucional e anúncios AdSense sejam sempre alcançáveis.
export const INITIAL_BATCH_SIZE = 24
const BATCH_STEP = 24

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
  subscriptions = [],
  viewMode = 'grid', 
  headerActions = null, 
  isLoadingMore = false,
  totalCount = 0,
  initialBatchSize = INITIAL_BATCH_SIZE,
  isFiltered = false,
  isGroupFranchisesEnabled = true
}) {
  const { t } = useTranslation()

  // Estado para franquias expandidas inline
  const [expandedFranchises, setExpandedFranchises] = useState(() => new Set())

  const toggleFranchise = (id, e) => {
    if (e && typeof e.stopPropagation === 'function') {
      e.stopPropagation()
    }
    setExpandedFranchises((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Garantir que sempre temos um array
  const safeRecommendations = useMemo(
    () => (Array.isArray(recommendations) ? recommendations : []),
    [recommendations]
  )

  // Lote visível controlado por botão ou observador opcional
  const [visibleCount, setVisibleCount] = useState(initialBatchSize)

  const listKey = `${provider}|${viewMode}|${sortBy}|${safeRecommendations.length}:${safeRecommendations[0]?.id ?? ''}`

  useEffect(() => {
    setVisibleCount(initialBatchSize)
  }, [listKey, initialBatchSize])

  const handleLoadMore = () => {
    setVisibleCount((prev) => (Number.isFinite(prev) ? prev + BATCH_STEP : prev))
  }

  const shouldGroupFranchises = isGroupFranchisesEnabled && sortBy === 'predicted' && !isFiltered

  const baseRecommendations = useMemo(() => {
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

    return shouldGroupFranchises ? groupRecommendationsByFranchise(sorted, true) : sorted
  }, [safeRecommendations, sortBy, shouldGroupFranchises])

  const visibleRoots = useMemo(
    () => baseRecommendations.slice(0, visibleCount),
    [baseRecommendations, visibleCount]
  )
  const hasMore = baseRecommendations.length > visibleCount
  const deferredCount = useDeferredValue(baseRecommendations.length)

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
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoadingMore
          ? t('recommendationGrid.srLoading')
          : t('recommendationGrid.srCount', { count: deferredCount })}
      </p>
      <div className={styles['recommendation-grid__header']}>
        <h2 className={styles['recommendation-grid__title']} style={{ marginBottom: 0 }}>
          {shouldGroupFranchises && baseRecommendations.length < safeRecommendations.length
            ? t('recommendationGrid.headerWithGroups', {
                groupsCount: baseRecommendations.length,
                totalCount: safeRecommendations.length,
                defaultValue: `Recomendações — O Que Assistir Agora (${baseRecommendations.length} recomendações, ${safeRecommendations.length} animes no total)`,
              })
            : t('recommendationGrid.header', { count: baseRecommendations.length })}
        </h2>
        {headerActions}
      </div>
      {viewMode === 'list' ? (
        <div className={styles['recommendation-grid__list']}>
          {visibleRoots.map((rec, index) => {
            const isExpanded = expandedFranchises.has(rec.id)
            const hasChildren = shouldGroupFranchises && Array.isArray(rec.franchiseChildren) && rec.franchiseChildren.length > 0
            return (
              <Fragment key={rec.id}>
                <AnimeRow
                  anime={rec}
                  titlePref={titlePref}
                  subscriptions={subscriptions}
                  priority={index < 8}
                  isFranchiseExpanded={isExpanded}
                  onToggleFranchise={(e) => toggleFranchise(rec.id, e)}
                />
                {isExpanded && hasChildren && (
                  <div id={`franchise-children-${rec.id}`} style={{ display: 'contents' }}>
                    {rec.franchiseChildren.map((child) => (
                      <AnimeRow
                        key={`${child.id}-franchise-child`}
                        anime={{
                          ...child,
                          _isFranchiseChild: true,
                          _parentFranchiseTitle: rec.title,
                        }}
                        titlePref={titlePref}
                        subscriptions={subscriptions}
                        priority={false}
                        isFranchiseExpanded={false}
                      />
                    ))}
                  </div>
                )}
              </Fragment>
            )
          })}
        </div>
      ) : (
        <div className={styles['recommendation-grid__grid']}>
          {visibleRoots.map((rec, index) => {
            const isExpanded = expandedFranchises.has(rec.id)
            const hasChildren = shouldGroupFranchises && Array.isArray(rec.franchiseChildren) && rec.franchiseChildren.length > 0
            return (
              <Fragment key={rec.id}>
                <AnimeCard
                  anime={rec}
                  titlePref={titlePref}
                  subscriptions={subscriptions}
                  priority={index < 8}
                  isFranchiseExpanded={isExpanded}
                  onToggleFranchise={(e) => toggleFranchise(rec.id, e)}
                />
                {isExpanded && hasChildren && (
                  <div id={`franchise-children-${rec.id}`} style={{ display: 'contents' }}>
                    {rec.franchiseChildren.map((child) => (
                      <AnimeCard
                        key={`${child.id}-franchise-child`}
                        anime={{
                          ...child,
                          _isFranchiseChild: true,
                          _parentFranchiseTitle: rec.title,
                        }}
                        titlePref={titlePref}
                        subscriptions={subscriptions}
                        priority={false}
                        isFranchiseExpanded={false}
                      />
                    ))}
                  </div>
                )}
              </Fragment>
            )
          })}
        </div>
      )}
      {hasMore && (
        <div className={styles['load-more-container']}>
          <button
            type="button"
            className={styles['load-more-btn']}
            onClick={handleLoadMore}
            data-testid="load-more-btn"
          >
            {t('recommendationGrid.loadMoreWithCount', {
              count: Math.min(BATCH_STEP, baseRecommendations.length - visibleCount),
              remaining: Math.max(0, baseRecommendations.length - visibleCount),
              defaultValue: `${t('recommendationGrid.loadMore', 'Carregar mais animes')} (${Math.min(BATCH_STEP, baseRecommendations.length - visibleCount)} de ${Math.max(0, baseRecommendations.length - visibleCount)} restantes)`,
            })}
          </button>
        </div>
      )}
      {isLoadingMore && (
        <div className={styles['loading-footer']}>
          <div className="skeleton" style={{ height: '1.5rem', width: '60%', margin: 'var(--space-4) auto' }} />
          <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--font-size-sm)' }}>
            {t('recommendationGrid.loadingMore', {
              count: Math.max(0, (totalCount > 0 ? totalCount : baseRecommendations.length) - visibleRoots.length),
            })}
          </p>
        </div>
      )}
    </section>
  )
}
