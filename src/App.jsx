import { useState } from 'react'
import { fetchAllLists } from './api/anilist.js'
import LoginScreen from './components/LoginScreen.jsx'
import Dashboard from './components/Dashboard.jsx'

export default function App() {
  const [screen, setScreen] = useState('login')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [username, setUsername] = useState('')
  const [allEntries, setAllEntries] = useState([])

  async function handleLogin(inputUsername) {
    setIsLoading(true)
    setError(null)

    try {
      const entries = await fetchAllLists(inputUsername)

      const planning = entries.filter(e => e.status === 'PLANNING')
      if (planning.length === 0) {
        setError("Adicione animes à sua lista 'Planning' no AniList.")
        setIsLoading(false)
        return
      }

      setUsername(inputUsername)
      setAllEntries(entries)
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
    setAllEntries([])
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
      allEntries={allEntries}
      username={username}
      onLogout={handleLogout}
    />
  )
}
