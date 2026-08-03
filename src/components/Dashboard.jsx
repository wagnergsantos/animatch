import { useState, useMemo, useRef, useEffect } from 'react'
import { buildTasteProfile, scoreRecommendations, resolveYear } from '../logic/recommender.js'
import TasteProfile from './TasteProfile.jsx'
import RecommendationGrid from './RecommendationGrid.jsx'
import FilterBar from './FilterBar.jsx'
import StatisticsView from './StatisticsView.jsx'
import GenreRecommendationModal from './GenreRecommendationModal.jsx'
import ThemeToggle from './ThemeToggle.jsx'
import SettingsMenu from './SettingsMenu.jsx'
import './Dashboard.css'

function exportRecommendationsToCSV(recommendations) {
  if (!recommendations || recommendations.length === 0) return

  const headers = ['Título', 'Nota Prevista', 'Nota Comunitária', 'Formato', 'Ano', 'Gêneros']
  const rows = recommendations.map((r) => [
    `"${(r.title || '').replace(/"/g, '""')}"`,
    r.predictedScore ? r.predictedScore.toFixed(1) : 'N/A',
    r.communityScore || 'N/A',
    r.format || 'N/A',
    r.year || 'N/A',
    `"${(r.genres || []).join(' | ')}"`,
  ])

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', `animatch-recomendacoes-${Date.now()}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function Dashboard({ allEntries = [], username, provider = 'anilist', onLogout, onRefresh, isLoading }) {
  const [activeTab, setActiveTab] = useState('recommendations')
  const [selectedFilterGenre, setSelectedFilterGenre] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('ALL')
  const [selectedYear, setSelectedYear] = useState('ALL')
  const [sortBy, setSortBy] = useState('predicted')
  const [modalGenre, setModalGenre] = useState(null)
  const [copied, setCopied] = useState(false)
  const [isSeasonOnly, setIsSeasonOnly] = useState(false)
  const currentYear = new Date().getFullYear()
  const gridRef = useRef(null)

  const [favoriteDub, setFavoriteDub] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('animatch_favorite_dub') || 'nenhuma'
    }
    return 'nenhuma'
  })

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('animatch_favorite_dub', favoriteDub)
    }
  }, [favoriteDub])

  const tasteProfile = useMemo(() => {
    const completed = allEntries.filter((e) => e.status === 'COMPLETED')
    return buildTasteProfile(completed)
  }, [allEntries])

  const planningEntries = useMemo(() => {
    return allEntries.filter((e) => e.status === 'PLANNING')
  }, [allEntries])

  const availableGenres = useMemo(() => {
    const set = new Set()
    for (const entry of planningEntries) {
      const genres = entry.genres || entry.media?.genres || []
      for (const genre of genres) {
        if (genre) set.add(genre)
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
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

    // Map year, seasonYear, startDate to recs from planningEntries if not present
    recs = recs.map((r) => {
      const match = planningEntries.find((e) => (e.media?.id ?? e.id) === r.id)
      const seasonYear = r.seasonYear ?? match?.seasonYear ?? match?.media?.seasonYear
      const startDate = r.startDate ?? match?.startDate ?? match?.media?.startDate
      const year = resolveYear(r) ?? resolveYear(match)
      const status = r.status ?? match?.status ?? match?.media?.status
      return { ...r, seasonYear, startDate, year, status }
    })

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

    if (isSeasonOnly) {
      recs = recs.filter((rec) => {
        const year = rec.year ?? rec.seasonYear ?? rec.startDate?.year ?? rec.media?.year ?? rec.media?.seasonYear ?? rec.media?.startDate?.year
        const isCurrentYear = year === currentYear
        const status = rec.status || rec.media?.status
        const isReleasing = status === "RELEASING"
        return isCurrentYear || isReleasing
      })
    }

    return recs
  }, [planningEntries, tasteProfile, selectedFilterGenre, searchQuery, selectedFormat, selectedYear, isSeasonOnly, currentYear])

  const handleTasteProfileGenreClick = (genre) => {
    setSelectedFilterGenre(genre)
    gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const providerLabel = provider === 'kitsu' ? 'Kitsu' : 'AniList'

  const handleShare = () => {
    if (typeof window !== 'undefined' && navigator.clipboard) {
      const url = new URL(window.location.href)
      url.searchParams.set('user', username)
      navigator.clipboard.writeText(url.toString()).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {})
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <div className="dashboard__header-left">
          <span className="dashboard__username">{username} <span className="dashboard__provider-badge">({providerLabel})</span></span>
          <nav className="dashboard__nav">
            <button
              className={activeTab === 'recommendations' ? 'active' : ''}
              onClick={() => setActiveTab('recommendations')}
            >
              Recomendações
            </button>
            <button
              className={activeTab === 'statistics' ? 'active' : ''}
              onClick={() => setActiveTab('statistics')}
            >
              Estatísticas
            </button>
          </nav>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button
            type="button"
            onClick={handleShare}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--color-border)',
              color: 'var(--text-1)',
              padding: 'var(--space-2) var(--space-3)',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              cursor: 'pointer',
            }}
            title="Copiar link das suas recomendações"
          >
            {copied ? '✅ Link copiado!' : '🔗 Compartilhar'}
          </button>
          <SettingsMenu
            provider={provider}
            favoriteDub={favoriteDub}
            onChangeFavoriteDub={setFavoriteDub}
            onRefresh={onRefresh}
            isLoading={isLoading}
            onLogout={onLogout}
          />
        </div>
      </header>

      <main className="dashboard__main">
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
              onSelectGenre={setSelectedFilterGenre}
              availableGenres={availableGenres}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedFormat={selectedFormat}
              onSelectFormat={setSelectedFormat}
              availableYears={availableYears}
              selectedYear={selectedYear}
              onSelectYear={setSelectedYear}
              sortBy={sortBy}
              onSortChange={setSortBy}
              isSeasonOnly={isSeasonOnly}
              onSeasonOnlyChange={setIsSeasonOnly}
              onExportCSV={() => exportRecommendationsToCSV(recommendations)}
            />
            <div ref={gridRef}>
              <RecommendationGrid
                recommendations={recommendations}
                isLoading={false}
                sortBy={sortBy}
                favoriteDub={favoriteDub}
                provider={provider}
              />
            </div>
          </>
        ) : (
          <StatisticsView
            entries={allEntries}
            onSelectGenre={setModalGenre}
          />
        )}
      </main>

      <GenreRecommendationModal
        genre={modalGenre}
        planningEntries={planningEntries}
        tasteProfile={tasteProfile}
        onClose={() => setModalGenre(null)}
      />
    </div>
  )
}
