import { useState } from 'react'
import { fetchCompletedList, fetchPlanningList } from './api/anilist.js'
import { buildTasteProfile, scoreRecommendations } from './logic/recommender.js'
import LoginScreen from './components/LoginScreen.jsx'
import Dashboard from './components/Dashboard.jsx'

export default function App() {
  const [screen, setScreen] = useState('login')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [username, setUsername] = useState('')
  const [tasteProfile, setTasteProfile] = useState(new Map())
  const [recommendations, setRecommendations] = useState([])

  async function handleLogin(inputUsername) {
    setIsLoading(true)
    setError(null)

    try {
      const [completed, planning] = await Promise.all([
        fetchCompletedList(inputUsername),
        fetchPlanningList(inputUsername),
      ])

      const profile = buildTasteProfile(completed)

      if (profile.size === 0) {
        setError('Avalie mais animes no AniList para gerar seu perfil de gosto.')
        setIsLoading(false)
        return
      }

      if (planning.length === 0) {
        setError("Adicione animes à sua lista 'Planning' no AniList.")
        setIsLoading(false)
        return
      }

      const scored = scoreRecommendations(planning, profile)

      setUsername(inputUsername)
      setTasteProfile(profile)
      setRecommendations(scored)
      setScreen('dashboard')
    } catch (err) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  function handleLogout() {
    setScreen('login')
    setUsername('')
    setTasteProfile(new Map())
    setRecommendations([])
    setError(null)
  }

  if (screen === 'login') {
    return (
      <LoginScreen
        onSubmit={handleLogin}
        isLoading={isLoading}
        error={error}
      />
    )
  }

  return (
    <Dashboard
      tasteProfile={tasteProfile}
      recommendations={recommendations}
      username={username}
      onLogout={handleLogout}
      isLoading={isLoading}
    />
  )
}

