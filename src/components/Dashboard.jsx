import TasteProfile from './TasteProfile.jsx'
import RecommendationGrid from './RecommendationGrid.jsx'
import './Dashboard.css'

export default function Dashboard({ tasteProfile = new Map(), recommendations = [], username, onLogout, isLoading }) {
  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <span className="dashboard__username">{username}</span>
        <button className="dashboard__logout" onClick={onLogout}>
          Trocar conta
        </button>
      </header>
      <main className="dashboard__main">
        {!isLoading && tasteProfile.size > 0 && (
          <TasteProfile profile={tasteProfile} />
        )}
        <RecommendationGrid
          recommendations={recommendations}
          isLoading={isLoading}
        />
      </main>
    </div>
  )
}
