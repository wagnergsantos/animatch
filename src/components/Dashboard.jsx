import { useState, useMemo, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocalStorage } from '../hooks/useLocalStorage.js'
import { useEnsembleData } from '../hooks/useEnsembleData.js'
import { buildTasteProfile, scoreRecommendations, resolveYear } from '../logic/recommender.js'
import { applyStreamingBoost, matchesUserSubscriptions } from '../logic/streaming.js'
import { applyMultiPresenceBoost } from '../logic/ensemble.js'
import ProviderTabs from './ProviderTabs.jsx'
import TasteProfile from './TasteProfile.jsx'
import RecommendationGrid from './RecommendationGrid.jsx'
import FilterBar from './FilterBar.jsx'
import StatisticsPage from './StatisticsPage.jsx'
import GenreRecommendationModal from './GenreRecommendationModal.jsx'
import SettingsPage from './SettingsPage.jsx'
import FloatingRandomizerButton from './FloatingRandomizerButton.jsx'
import DecisionModal from './DecisionModal.jsx'
import AnimeDetailModal from './AnimeDetailModal.jsx'
import WrappedModal from './WrappedModal.jsx'
import styles from './Dashboard.module.css'

function exportRecommendationsToCSV(recommendations, t, prefix) {
  if (!recommendations || recommendations.length === 0) return

  const headers = [t('labels.title'), t('labels.predictedScore'), t('labels.community'), t('labels.format'), t('labels.year'), t('labels.genres')]
  const rows = recommendations.map((r) => [
    `"${(r.title || '').replace(/"/g, '""')}"`,
    r.predictedScore != null ? r.predictedScore.toFixed(1) : 'N/A',
    r.communityScore != null ? r.communityScore : 'N/A',
    r.format || 'N/A',
    r.year || 'N/A',
    `"${(r.genres || []).join(' | ')}"`,
  ])

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `${prefix}-${Date.now()}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function Dashboard({
  allEntries = [],
  username,
  provider = 'anilist',
  titlePref = 'english',
  onTitlePrefChange,
  onLogout,
  onRefresh,
  isLoading,
  subscriptions: propsSubscriptions,
  onSubscriptionsChange: propsOnSubscriptionsChange,
  streamingBoost: propsStreamingBoost,
  onStreamingBoostChange: propsOnStreamingBoostChange,
  viewMode: propsViewMode,
  onViewModeChange: propsOnViewModeChange,
  user = null,
  syncStatus = 'idle',
  onOpenAuthModal,
  onSignOut,
  linkedUsernames = { anilist: '', kitsu: '', mal: '' },
  onLinkedUsernamesChange,
}) {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('recommendations')
  const [selectedFilterGenre, setSelectedFilterGenre] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('ALL')
  const [selectedYear, setSelectedYear] = useState('ALL')
  const [selectedBadge, setSelectedBadge] = useState('ALL')
  const [sortBy, setSortBy] = useState('predicted')

  const [localViewMode, setLocalViewMode] = useLocalStorage('animatch_view_mode', 'grid')
  const [localSubscriptions, setLocalSubscriptions] = useLocalStorage('animatch_subscriptions', ['Crunchyroll', 'Netflix'])
  const [localStreamingBoost, setLocalStreamingBoost] = useLocalStorage('animatch_streaming_boost', false)

  const viewMode = propsViewMode !== undefined ? propsViewMode : localViewMode
  const setViewMode = propsOnViewModeChange || setLocalViewMode

  const subscriptions = propsSubscriptions !== undefined ? propsSubscriptions : localSubscriptions
  const setSubscriptions = propsOnSubscriptionsChange || setLocalSubscriptions

  const streamingBoost = propsStreamingBoost !== undefined ? propsStreamingBoost : localStreamingBoost
  const setStreamingBoost = propsOnStreamingBoostChange || setLocalStreamingBoost

  const [isStreamingOnly, setIsStreamingOnly] = useState(false)
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false)
  const [selectedAnimeDetail, setSelectedAnimeDetail] = useState(null)
  const [modalGenre, setModalGenre] = useState(null)
  const [isWrappedModalOpen, setIsWrappedModalOpen] = useState(false)
  const [isSeasonOnly, setIsSeasonOnly] = useState(false)
  const currentYear = new Date().getFullYear()
  const gridRef = useRef(null)

  const activeAccountsCount = useMemo(() => {
    return Object.values(linkedUsernames || {}).filter(
      (name) => typeof name === 'string' && name.trim().length > 0
    ).length
  }, [linkedUsernames])

  const hasMultiAccounts = activeAccountsCount >= 2

  const {
    entriesByProvider,
    consolidatedEntries,
    failedProviders,
    isLoading: isEnsembleLoading,
    loadingProviders = [],
    refetch: refetchEnsemble,
  } = useEnsembleData(linkedUsernames, { enabled: Boolean(hasMultiAccounts) })

  const [activeScope, setActiveScope] = useState(() => (hasMultiAccounts ? 'ensemble' : provider))
  const prevHasMultiRef = useRef(hasMultiAccounts)

  useEffect(() => {
    if (!prevHasMultiRef.current && hasMultiAccounts) {
      setActiveScope('ensemble')
    } else if (!hasMultiAccounts && activeScope !== provider) {
      setActiveScope(provider)
    } else if (hasMultiAccounts) {
      const validProviders = Object.entries(linkedUsernames || {})
        .filter(([, name]) => typeof name === 'string' && name.trim().length > 0)
        .map(([p]) => p)
      if (activeScope !== 'ensemble' && !validProviders.includes(activeScope)) {
        setActiveScope('ensemble')
      }
    }
    prevHasMultiRef.current = hasMultiAccounts
  }, [hasMultiAccounts, activeScope, linkedUsernames, provider])

  const currentEntries = useMemo(() => {
    if (hasMultiAccounts) {
      if (activeScope === 'ensemble') {
        return consolidatedEntries
      }
      return entriesByProvider[activeScope] || (activeScope === provider ? allEntries : [])
    }
    return allEntries
  }, [hasMultiAccounts, activeScope, consolidatedEntries, entriesByProvider, allEntries, provider])

  const tasteProfile = useMemo(() => {
    return buildTasteProfile(currentEntries)
  }, [currentEntries])

  const planningEntries = useMemo(() => {
    return currentEntries.filter((e) => e.status === 'PLANNING')
  }, [currentEntries])

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

    // Map year, seasonYear, startDate, streamingLinks to recs from planningEntries if not present
    recs = recs.map((r) => {
      const match = planningMap.get(r.id)
      const seasonYear = r.seasonYear ?? match?.seasonYear ?? match?.media?.seasonYear
      const startDate = r.startDate ?? match?.startDate ?? match?.media?.startDate
      const year = resolveYear(r) ?? resolveYear(match)
      const status = r.status ?? match?.status ?? match?.media?.status
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

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      recs = recs.filter((r) => r.title && r.title.toLowerCase().includes(q))
    }

    // Filter by format
    if (selectedFormat !== 'ALL') {
      recs = recs.filter((r) => r.format === selectedFormat)
    }

    // Filter by year
    if (selectedYear !== 'ALL') {
      if (selectedYear === 'NONE') {
        recs = recs.filter((r) => {
          const year = resolveYear(r)
          return !year
        })
      } else {
        recs = recs.filter((r) => {
          const year = resolveYear(r)
          return year == selectedYear
        })
      }
    }

    // Filter by badge
    if (selectedBadge !== 'ALL') {
      recs = recs.filter((r) => r.badges && r.badges.includes(selectedBadge))
    }

    if (isSeasonOnly) {
      recs = recs.filter((rec) => {
        const isCurrentYear = Number(rec.year) === currentYear
        const status = rec.status || rec.media?.status
        const isReleasing = status === "RELEASING"
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

  const handleTasteProfileGenreClick = (genre) => {
    setSelectedFilterGenre(genre)
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const currentScopedProvider = activeScope !== 'ensemble' ? activeScope : provider
  const currentScopedUsername =
    activeScope !== 'ensemble' && linkedUsernames[activeScope]?.trim()
      ? linkedUsernames[activeScope].trim()
      : username

  const scopedProviderLabel = t(
    `providers.${currentScopedProvider}`,
    currentScopedProvider === 'mal' ? 'MyAnimeList' : currentScopedProvider === 'kitsu' ? 'Kitsu' : 'AniList'
  )

  const scopedProfileUrl =
    currentScopedProvider === 'kitsu'
      ? `https://kitsu.app/users/${currentScopedUsername}`
      : currentScopedProvider === 'mal'
      ? `https://myanimelist.net/profile/${currentScopedUsername}`
      : `https://anilist.co/user/${currentScopedUsername}`

  const handleRefresh = () => {
    if (activeScope === 'ensemble') {
      return refetchEnsemble()
    }
    return onRefresh?.()
  }

  const isGridLoading = Boolean(
    isLoading || (hasMultiAccounts && isEnsembleLoading && currentEntries.length === 0)
  )

  const activeProviderLabels = useMemo(() => {
    return Object.entries(linkedUsernames || {})
      .filter(([, name]) => typeof name === 'string' && name.trim().length > 0)
      .map(([p]) =>
        t(`providers.${p}`, p === 'mal' ? 'MyAnimeList' : p === 'kitsu' ? 'Kitsu' : 'AniList')
      )
  }, [linkedUsernames, t])

  return (
    <div className={styles.dashboard}>
      <header className={styles.dashboard__header}>
        <div className={styles['dashboard__header-left']}>
          {hasMultiAccounts && activeScope === 'ensemble' ? (
            <span
              className={styles['dashboard__username-link']}
              title={t('ensemble.accounts_active', {
                count: activeAccountsCount,
                defaultValue: `${activeAccountsCount} contas ativas`,
              })}
            >
              <span className={styles.dashboard__username}>
                🌐 {t('ensemble.tab_consolidated', 'Consolidado')}{' '}
                <span className="dashboard__provider-badge">
                  ({t('ensemble.accounts_active', {
                    count: activeAccountsCount,
                    defaultValue: `${activeAccountsCount} contas ativas`,
                  })})
                </span>
              </span>
            </span>
          ) : (
            <a
              href={scopedProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles['dashboard__username-link']}
              title={`Abrir perfil no ${scopedProviderLabel}`}
            >
              <span className={styles.dashboard__username}>
                {currentScopedUsername}{' '}
                <span className="dashboard__provider-badge">({scopedProviderLabel})</span>
              </span>
            </a>
          )}
          <nav className={styles.dashboard__nav}>
            <button
              className={activeTab === 'recommendations' ? styles.active : ''}
              onClick={() => setActiveTab('recommendations')}
            >
              {t('dashboard.recommendationsTab')}
            </button>
            <button
              className={activeTab === 'statistics' ? styles.active : ''}
              onClick={() => setActiveTab('statistics')}
            >
              {t('dashboard.statisticsTab')}
            </button>
            <button
              className={activeTab === 'settings' ? styles.active : ''}
              onClick={() => setActiveTab('settings')}
            >
              {t('dashboard.settingsTab', 'Configurações')}
            </button>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            type="button"
            data-testid="dashboard-wrapped-btn"
            onClick={() => setIsWrappedModalOpen(true)}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--text-1)',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
            }}
            title={t('wrapped.buttonTitle', 'Gerar card visual Wrapped e compartilhar perfil')}
          >
            {t('wrapped.button', '✨ Compartilhar Wrapped')}
          </button>
        </div>
      </header>

      <main className={styles.dashboard__main}>
        {(activeTab === 'recommendations' || activeTab === 'statistics') && (
          <ProviderTabs
            linkedUsernames={linkedUsernames}
            activeScope={activeScope}
            onScopeChange={setActiveScope}
            failedProviders={failedProviders}
            onRetryProvider={(p) => refetchEnsemble(p)}
          />
        )}
        {activeTab === 'recommendations' ? (
          <>
            {tasteProfile.size > 0 && (
              <TasteProfile 
                profile={tasteProfile} 
                onGenreClick={handleTasteProfileGenreClick} 
              />
            )}
            <FilterBar
              selectedGenre={selectedFilterGenre}
              onSelectGenre={(genre) => {
                setSelectedFilterGenre(genre)
                setActiveTab('recommendations')
                gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              availableGenres={availableGenres}
              totalPlanningCount={planningEntries.length}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedFormat={selectedFormat}
              onSelectFormat={setSelectedFormat}
              availableYears={availableYears}
              selectedYear={selectedYear}
              onSelectYear={setSelectedYear}
              selectedBadge={selectedBadge}
              onSelectBadge={setSelectedBadge}
              sortBy={sortBy}
              onSortChange={setSortBy}
              isSeasonOnly={isSeasonOnly}
              onSeasonOnlyChange={setIsSeasonOnly}
              isStreamingOnly={isStreamingOnly}
              onStreamingOnlyChange={setIsStreamingOnly}
              onExportCSV={() => exportRecommendationsToCSV(recommendations, t, t('dashboard.exportFilenamePrefix'))}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />
            <div ref={gridRef}>
              <RecommendationGrid
                recommendations={recommendations}
                isLoading={isGridLoading}
                sortBy={sortBy}
                provider={currentScopedProvider}
                titlePref={titlePref}
                viewMode={viewMode}
              />
            </div>
          </>
        ) : activeTab === 'statistics' ? (
          <StatisticsPage
            entries={currentEntries}
            user={
              hasMultiAccounts && activeScope === 'ensemble'
                ? t('ensemble.tab_consolidated', 'Consolidado')
                : currentScopedUsername || username
            }
            onSelectGenre={setModalGenre}
            onOpenWrapped={() => setIsWrappedModalOpen(true)}
          />
        ) : (
          <SettingsPage
            provider={provider}
            titlePref={titlePref}
            onTitlePrefChange={onTitlePrefChange}
            onRefresh={handleRefresh}
            onRefreshProvider={(p) => (hasMultiAccounts ? refetchEnsemble(p) : handleRefresh())}
            hasMultiAccounts={hasMultiAccounts}
            isLoading={Boolean(isLoading || (hasMultiAccounts && isEnsembleLoading))}
            loadingProviders={loadingProviders}
            onLogout={onLogout}
            subscriptions={subscriptions}
            onSubscriptionsChange={setSubscriptions}
            streamingBoost={streamingBoost}
            onStreamingBoostChange={setStreamingBoost}
            user={user}
            syncStatus={syncStatus}
            onOpenAuthModal={onOpenAuthModal}
            onSignOut={onSignOut}
            linkedUsernames={linkedUsernames}
            onLinkedUsernamesChange={onLinkedUsernamesChange}
          />
        )}
      </main>

      {activeTab === 'recommendations' && recommendations.length > 0 && (
        <FloatingRandomizerButton
          onClick={() => setIsDecisionModalOpen(true)}
          count={recommendations.length}
        />
      )}

      <DecisionModal
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        recommendations={recommendations}
        subscriptions={subscriptions}
        titlePref={titlePref}
        onSelectAnime={(anime) => setSelectedAnimeDetail(anime)}
      />

      {selectedAnimeDetail && (
        <AnimeDetailModal
          anime={selectedAnimeDetail}
          titlePref={titlePref}
          onClose={() => setSelectedAnimeDetail(null)}
        />
      )}

      <GenreRecommendationModal
        genre={modalGenre}
        planningEntries={planningEntries}
        tasteProfile={tasteProfile}
        provider={currentScopedProvider}
        titlePref={titlePref}
        onClose={() => setModalGenre(null)}
      />

      <WrappedModal
        isOpen={isWrappedModalOpen}
        onClose={() => setIsWrappedModalOpen(false)}
        username={
          hasMultiAccounts && activeScope === 'ensemble'
            ? t('ensemble.tab_consolidated', 'Consolidado')
            : currentScopedUsername || username
        }
        providerLabel={scopedProviderLabel}
        isEnsemble={Boolean(hasMultiAccounts && activeScope === 'ensemble')}
        activeProviders={activeProviderLabels}
        entries={currentEntries}
        tasteProfile={tasteProfile}
        recommendations={recommendations}
        titlePref={titlePref}
      />
    </div>
  )
}
