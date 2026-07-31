import { useState, useMemo } from 'react'
import { buildTasteProfile, scoreRecommendations } from '../logic/recommender.js'
import TasteProfile from './TasteProfile.jsx'
import RecommendationGrid from './RecommendationGrid.jsx'
import FilterBar from './FilterBar.jsx'
import StatisticsView from './StatisticsView.jsx'
import GenreRecommendationModal from './GenreRecommendationModal.jsx'
import ThemeToggle from './ThemeToggle.jsx'
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

export default function Dashboard({ allEntries = [], username, onLogout }) {
  const [activeTab, setActiveTab] = useState('recommendations')
  const [selectedFilterGenre, setSelectedFilterGenre] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFormat, setSelectedFormat] = useState('ALL')
  const [sortBy, setSortBy] = useState('predicted')
  const [modalGenre, setModalGenre] = useState(null)
  const [copied, setCopied] = useState(false)

  const tasteProfile = useMemo(() => {
    const completed = allEntries.filter((e) => e.status === 'COMPLETED')
    return buildTasteProfile(completed)
  }, [allEntries])

  const planningEntries = useMemo(() => {
    return allEntries.filter((e) => e.status === 'PLANNING')
  }, [allEntries])

  const recommendations = useMemo(() => {
    let recs = scoreRecommendations(planningEntries, tasteProfile, selectedFilterGenre)

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim()
      recs = recs.filter((r) => r.title && r.title.toLowerCase().includes(q))
    }

    // Filter by format
    if (selectedFormat !== 'ALL') {
      recs = recs.filter((r) => r.format === selectedFormat)
    }

    return recs
  }, [planningEntries, tasteProfile, selectedFilterGenre, searchQuery, selectedFormat])

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
          <span className="dashboard__username">{username}</span>
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
          <ThemeToggle />
          <button className="dashboard__logout" onClick={onLogout}>
            Trocar conta
          </button>
        </div>
      </header>

      <main className="dashboard__main">
        {activeTab === 'recommendations' ? (
          <>
            {tasteProfile.size > 0 && (
              <TasteProfile 
                profile={tasteProfile} 
                onGenreClick={setModalGenre} 
              />
            )}
            <FilterBar
              selectedGenre={selectedFilterGenre}
              onSelectGenre={setSelectedFilterGenre}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedFormat={selectedFormat}
              onSelectFormat={setSelectedFormat}
              sortBy={sortBy}
              onSortChange={setSortBy}
              onExportCSV={() => exportRecommendationsToCSV(recommendations)}
            />
            <RecommendationGrid
              recommendations={recommendations}
              isLoading={false}
              sortBy={sortBy}
            />
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
