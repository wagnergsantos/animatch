import { useState, useMemo } from 'react'
import { buildTasteProfile, scoreRecommendations } from '../logic/recommender.js'
import TasteProfile from './TasteProfile.jsx'
import RecommendationGrid from './RecommendationGrid.jsx'
import FilterBar from './FilterBar.jsx'
import StatisticsView from './StatisticsView.jsx'
import GenreRecommendationModal from './GenreRecommendationModal.jsx'
import './Dashboard.css'

export default function Dashboard({ allEntries = [], username, onLogout }) {
  const [activeTab, setActiveTab] = useState('recommendations')
  const [selectedFilterGenre, setSelectedFilterGenre] = useState('ALL')
  const [modalGenre, setModalGenre] = useState(null)

  const tasteProfile = useMemo(() => {
    const completed = allEntries.filter((e) => e.status === 'COMPLETED')
    return buildTasteProfile(completed)
  }, [allEntries])

  const planningEntries = useMemo(() => {
    return allEntries.filter((e) => e.status === 'PLANNING')
  }, [allEntries])

  const recommendations = useMemo(() => {
    return scoreRecommendations(planningEntries, tasteProfile, selectedFilterGenre)
  }, [planningEntries, tasteProfile, selectedFilterGenre])

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
        <button className="dashboard__logout" onClick={onLogout}>
          Trocar conta
        </button>
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
            />
            <RecommendationGrid
              recommendations={recommendations}
              isLoading={false}
              onGenreClick={setSelectedFilterGenre}
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
