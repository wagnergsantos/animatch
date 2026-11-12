import { useMemo } from 'react'
import {
  buildTasteProfile,
  scoreRecommendations,
  resolveYear,
  isEligiblePlanningEntry,
} from '../logic/recommender.js'
import { applyStreamingBoost, matchesUserSubscriptions } from '../logic/streaming.js'
import { applyMultiPresenceBoost } from '../logic/ensemble.js'

/**
 * Hook dedicado para o pipeline de recomendação, filtragem e ordenação.
 * Extraído do `Dashboard.jsx` (A11 / #25) para permitir testes isolados e reuso
 * (ex.: comparação de perfil entre dois usuários em B3).
 */
export function useRecommendationPipeline({
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
} = {}) {
  const safeEntries = useMemo(() => (Array.isArray(entries) ? entries : []), [entries])

  const tasteProfile = useMemo(() => {
    return buildTasteProfile(safeEntries)
  }, [safeEntries])

  const planningEntries = useMemo(() => {
    return safeEntries.filter(isEligiblePlanningEntry)
  }, [safeEntries])

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

  const recommendations = useMemo(() => {
    let recs = scoreRecommendations(planningEntries, tasteProfile, selectedFilterGenre)
    const planningMap = new Map()
    for (const e of planningEntries) {
      if (e.media?.id != null) planningMap.set(e.media.id, e)
      if (e.id != null) planningMap.set(e.id, e)
    }

    recs = recs.map((r) => {
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

    if (activeScope === 'ensemble') {
      recs = applyMultiPresenceBoost(recs)
    }

    if (streamingBoost) {
      recs = applyStreamingBoost(recs, subscriptions)
    }

    if (isStreamingOnly) {
      recs = recs.filter((r) => matchesUserSubscriptions(r, subscriptions))
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      recs = recs.filter((r) => r.title && r.title.toLowerCase().includes(q))
    }

    if (selectedFormat !== 'ALL') {
      recs = recs.filter((r) => r.format === selectedFormat)
    }

    if (selectedYear !== 'ALL') {
      if (selectedYear === 'NONE') {
        recs = recs.filter((r) => !resolveYear(r))
      } else {
        recs = recs.filter((r) => resolveYear(r) == selectedYear)
      }
    }

    if (selectedBadge !== 'ALL') {
      recs = recs.filter((r) => r.badges && r.badges.includes(selectedBadge))
    }

    if (isSeasonOnly) {
      recs = recs.filter((rec) => {
        const isCurrentYear = Number(rec.year) === currentYear
        const status = rec.status || rec.media?.status
        const isReleasing = status === 'RELEASING'
        return isCurrentYear || isReleasing
      })
    }

    recs.sort((a, b) => {
      if (b.predictedScore !== a.predictedScore) {
        return (b.predictedScore || 0) - (a.predictedScore || 0)
      }
      return (b.communityScore || 0) - (a.communityScore || 0)
    })

    return recs
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
  ])

  return {
    tasteProfile,
    planningEntries,
    availableGenres,
    availableYears,
    recommendations,
  }
}

export default useRecommendationPipeline
