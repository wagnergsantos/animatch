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
const EMPTY_ARRAY = []
const EMPTY_OBJECT = {}

/**
 * Assinatura barata (O(N)) dos campos que afetam scoring/elegibilidade.
 * Permite estabilizar a referência de `entries` quando o consumidor recria o
 * array a cada render com o mesmo conteúdo — evita loop Phase 1 ↔ Phase 2.
 */
function buildEntriesSignature(list) {
  let sig = `${list.length}`
  for (const e of list) {
    const m = e?.media
    sig += `|${m?.id ?? e?.id}:${e?.status}:${e?.score ?? ''}:${m?.averageScore ?? ''}:${m?.status ?? ''}:${e?.planningProviders?.length ?? 0}`
  }
  return sig
}

export const INITIAL_BATCH_SIZE = 15

export function useProgressiveRecommendationPipeline({
  entries = EMPTY_ARRAY,
  activeScope = 'anilist',
  selectedFilterGenre = 'ALL',
  searchQuery = '',
  selectedFormat = 'ALL',
  selectedYear = 'ALL',
  selectedBadge = 'ALL',
  streamingBoost = false,
  subscriptions = EMPTY_ARRAY,
  isStreamingOnly = false,
  isSeasonOnly = false,
  currentYear = new Date().getFullYear(),
  recommenderOptions = EMPTY_OBJECT,
  batchSize = INITIAL_BATCH_SIZE,
  onLoadComplete = null,
} = EMPTY_OBJECT) {
  const stableEntriesRef = useRef({ signature: '0', value: EMPTY_ARRAY })
  const safeEntries = useMemo(() => {
    if (!Array.isArray(entries) || entries.length === 0) {
      stableEntriesRef.current = { signature: '0', value: EMPTY_ARRAY }
      return EMPTY_ARRAY
    }
    const signature = buildEntriesSignature(entries)
    if (signature === stableEntriesRef.current.signature) {
      return stableEntriesRef.current.value
    }
    stableEntriesRef.current = { signature, value: entries }
    return entries
  }, [entries])

  // Callback via ref: consumidor pode passar função inline sem re-disparar o pipeline
  const onLoadCompleteRef = useRef(onLoadComplete)
  useEffect(() => {
    onLoadCompleteRef.current = onLoadComplete
  }, [onLoadComplete])

  const tasteProfile = useMemo(() => {
    return buildTasteProfile(safeEntries)
  }, [safeEntries])

  const planningEntries = useMemo(() => {
    if (safeEntries.length === 0) return EMPTY_ARRAY
    const filtered = safeEntries.filter((entry) => isEligiblePlanningEntry(entry, tasteProfile))
    return filtered.length === 0 ? EMPTY_ARRAY : filtered
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

  const computePhase1 = (planningList, profile) => {
    if (!planningList || planningList.length === 0) return EMPTY_ARRAY
    const firstBatch = planningList.slice(0, Math.min(100, planningList.length))
    let recs = scoreRecommendations(
      firstBatch,
      profile,
      selectedFilterGenre,
      recommenderOptions
    )
    recs = enrichRecommendations(recs, planningList)
    recs = applyFilters(recs)
    return recs.slice(0, batchSize)
  }

  // Phase 1 data
  const [recommendations, setRecommendations] = useState(() =>
    computePhase1(planningEntries, tasteProfile)
  )
  const [isLoadingMore, setIsLoadingMore] = useState(() =>
    planningEntries.length > batchSize
  )
  const [error, setError] = useState(null)
  const timeoutRef = useRef(null)

  // Phase 1 + Phase 2: Progressive scoring
  useEffect(() => {
    // Cleanup previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    if (!planningEntries || planningEntries.length === 0) {
      setRecommendations((prev) => (prev.length === 0 ? prev : EMPTY_ARRAY))
      setIsLoadingMore((prev) => (prev ? false : prev))
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

      setRecommendations((prev) => {
        if (prev === batchRecs) return prev
        if (
          prev.length === batchRecs.length &&
          prev.every((item, idx) => item.id === batchRecs[idx]?.id && item.predictedScore === batchRecs[idx]?.predictedScore)
        ) {
          return prev
        }
        return batchRecs
      })

      const hasMoreToLoad =
        planningEntries.length > batchSize ||
        planningEntries.length > firstBatchPlanningEntries.length

      setIsLoadingMore((prev) => (prev !== hasMoreToLoad ? hasMoreToLoad : prev))
      setError(null)

      if (!hasMoreToLoad) {
        onLoadCompleteRef.current?.(batchRecs)
      } else {
        // ===== PHASE 2: Background (próx. 1–2s) =====
        // Score de TODOS os animes
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

            setRecommendations((prev) => {
              if (prev === phase2Recs) return prev
              if (
                prev.length === phase2Recs.length &&
                prev.every((item, idx) => item.id === phase2Recs[idx]?.id && item.predictedScore === phase2Recs[idx]?.predictedScore)
              ) {
                return prev
              }
              return phase2Recs
            })
            setIsLoadingMore(false)
            onLoadCompleteRef.current?.(phase2Recs)
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
