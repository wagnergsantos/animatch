import { useEffect, useMemo, useRef, useState } from 'react'
import {
  buildTasteProfile,
  scoreRecommendations,
  resolveYear,
  isEligiblePlanningEntry,
} from '../logic/recommender.js'
import { applyStreamingBoost, matchesUserSubscriptions } from '../logic/streaming.js'
import { applyMultiPresenceBoost } from '../logic/ensemble.js'

/**
 * Hook para rendering progressivo de recomendações.
 * 
 * Phase 1 (instantânea, <200ms): Score dos 15 primeiros animes
 * Phase 2 (background, ~1s): Score dos restantes + cache
 * 
 * Uso: const { recommendations, isLoadingMore } = useProgressiveRecommendationPipeline(...)
 */
export const INITIAL_BATCH_SIZE = 15

export function useProgressiveRecommendationPipeline({
  entries = [],
  activeScope = 'anilist',
  selectedFilterGenre = 'ALL',
  searchQuery = '',
  selectedFormat = 'ALL',
  selectedYear = 'ALL',
  selectedBadge = 'ALL',
  streamingBoost = false,
  subscriptions = [],
  isStreamingOnly = false,
  isSeasonOnly = false,
  currentYear = new Date().getFullYear(),
  recommenderOptions = {},
  batchSize = INITIAL_BATCH_SIZE,
  onLoadComplete = null,
} = {}) {
  const safeEntries = useMemo(() => (Array.isArray(entries) ? entries : []), [entries])

  // Phase 1 data
  const [recommendations, setRecommendations] = useState([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState(null)
  const timeoutRef = useRef(null)

  const tasteProfile = useMemo(() => {
    return buildTasteProfile(safeEntries)
  }, [safeEntries])

  const planningEntries = useMemo(() => {
    return safeEntries.filter((entry) => isEligiblePlanningEntry(entry, tasteProfile))
  }, [safeEntries, tasteProfile])

  const availableGenres = useMemo(() => {
    const genreCounts = new Map()
    for (const entry of planningEntries) {
      const genres = entry.genres || entry.media?.genres || []
      for (const genre of genres) {
        if (genre) {
          genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1)
        }
      }
    }
    return Array.from(genreCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [planningEntries])

  const availableYears = useMemo(() => {
    const set = new Set()
    for (const entry of planningEntries) {
      const year = resolveYear(entry)
      if (year != null) set.add(Number(year))
    }
    return Array.from(set).sort((a, b) => b - a)
  }, [planningEntries])

  // Função auxiliar para enriquecer recomendações
  const enrichRecommendations = (recs, sourcePlanningEntries) => {
    const planningMap = new Map()
    for (const e of sourcePlanningEntries) {
      if (e.media?.id != null) planningMap.set(e.media.id, e)
      if (e.id != null) planningMap.set(e.id, e)
    }

    return recs.map((r) => {
      const match = planningMap.get(r.id)
      const seasonYear = r.seasonYear ?? match?.seasonYear ?? match?.media?.seasonYear
      const startDate = r.startDate ?? match?.startDate ?? match?.media?.startDate
      const year = resolveYear(r) ?? resolveYear(match)
      const status = r.status ?? match?.media?.status
      const titleObj = r.titleObj ?? match?.media?.title ?? match?.titleObj
      const title = r.title ?? match?.media?.title?.english ?? match?.media?.title?.romaji
      const streamingLinks = r.streamingLinks ?? match?.streamingLinks ?? match?.media?.streamingLinks
      const planningProviders = r.planningProviders ?? match?.planningProviders ?? []
      const sourceProviders = r.sourceProviders ?? match?.sourceProviders ?? []
      const providerUrls = r.providerUrls ?? match?.providerUrls ?? match?.media?.providerUrls ?? {}
      return {
        ...r,
        seasonYear,
        startDate,
        year,
        status,
        titleObj,
        title,
        streamingLinks,
        planningProviders,
        sourceProviders,
        providerUrls,
      }
    })
  }

  // Função auxiliar para aplicar filtros
  const applyFilters = useMemo(
    () =>
      (recs) => {
        let filtered = [...recs]

        if (activeScope === 'ensemble') {
          filtered = applyMultiPresenceBoost(filtered)
        }

        if (streamingBoost) {
          filtered = applyStreamingBoost(filtered, subscriptions)
        }

        if (isStreamingOnly) {
          filtered = filtered.filter((r) => matchesUserSubscriptions(r, subscriptions))
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim()
          filtered = filtered.filter((r) => r.title && r.title.toLowerCase().includes(q))
        }

        if (selectedFormat !== 'ALL') {
          filtered = filtered.filter((r) => r.format === selectedFormat)
        }

        if (selectedYear !== 'ALL') {
          if (selectedYear === 'NONE') {
            filtered = filtered.filter((r) => !resolveYear(r))
          } else {
            filtered = filtered.filter((r) => resolveYear(r) == selectedYear)
          }
        }

        if (selectedBadge !== 'ALL') {
          filtered = filtered.filter((r) => r.badges && r.badges.includes(selectedBadge))
        }

        if (isSeasonOnly) {
          filtered = filtered.filter((rec) => {
            const isCurrentYear = Number(rec.year) === currentYear
            const status = rec.status || rec.media?.status
            const isReleasing = status === 'RELEASING'
            return isCurrentYear || isReleasing
          })
        }

        // Sort
        filtered.sort((a, b) => {
          if (b.predictedScore !== a.predictedScore) {
            return (b.predictedScore || 0) - (a.predictedScore || 0)
          }
          return (b.communityScore || 0) - (a.communityScore || 0)
        })

        return filtered
      },
    [
      activeScope,
      streamingBoost,
      subscriptions,
      isStreamingOnly,
      searchQuery,
      selectedFormat,
      selectedYear,
      selectedBadge,
      isSeasonOnly,
      currentYear,
    ]
  )

  // Phase 1 + Phase 2: Progressive scoring
  useEffect(() => {
    // Cleanup previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (!planningEntries || planningEntries.length === 0) {
      setRecommendations([])
      setIsLoadingMore(false)
      return
    }

    try {
      // ===== PHASE 1: Instant (< 200ms) =====
      // Score apenas dos primeiros 100 animes (para ter 15 bons no top)
      const firstBatchPlanningEntries = planningEntries.slice(
        0,
        Math.min(100, planningEntries.length)
      )

      let phase1Recs = scoreRecommendations(
        firstBatchPlanningEntries,
        tasteProfile,
        selectedFilterGenre,
        recommenderOptions
      )

      // Enrich e filtrar
      phase1Recs = enrichRecommendations(phase1Recs, planningEntries)
      phase1Recs = applyFilters(phase1Recs)

      // Pega só os N primeiros (default: 15)
      const batchRecs = phase1Recs.slice(0, batchSize)

      setRecommendations(batchRecs)
      setIsLoadingMore(planningEntries.length > firstBatchPlanningEntries.length)
      setError(null)

      // ===== PHASE 2: Background (próx. 1–2s) =====
      // Score de TODOS os animes
      if (planningEntries.length > firstBatchPlanningEntries.length || selectedFilterGenre !== 'ALL' || searchQuery.trim() || selectedFormat !== 'ALL' || selectedYear !== 'ALL' || selectedBadge !== 'ALL') {
        timeoutRef.current = setTimeout(() => {
          try {
            let phase2Recs = scoreRecommendations(
              planningEntries,
              tasteProfile,
              selectedFilterGenre,
              recommenderOptions
            )

            // Enrich e filtrar
            phase2Recs = enrichRecommendations(phase2Recs, planningEntries)
            phase2Recs = applyFilters(phase2Recs)

            setRecommendations(phase2Recs)
            setIsLoadingMore(false)
            onLoadComplete?.(phase2Recs)
          } catch (err) {
            console.error('Error in Phase 2 (background scoring):', err)
            setError(err)
            setIsLoadingMore(false)
          }
        }, 0) // Microtask: permite Phase 1 renderizar antes de iniciar Phase 2
      }
    } catch (err) {
      console.error('Error in Phase 1 (initial scoring):', err)
      setError(err)
      setIsLoadingMore(false)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [
    planningEntries,
    tasteProfile,
    selectedFilterGenre,
    activeScope,
    streamingBoost,
    subscriptions,
    isStreamingOnly,
    searchQuery,
    selectedFormat,
    selectedYear,
    selectedBadge,
    isSeasonOnly,
    currentYear,
    recommenderOptions,
    batchSize,
    applyFilters,
    onLoadComplete,
  ])

  return {
    tasteProfile,
    planningEntries,
    availableGenres,
    availableYears,
    recommendations,
    isLoadingMore,
    error,
    totalCount: planningEntries.length,
  }
}

export default useProgressiveRecommendationPipeline
