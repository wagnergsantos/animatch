import { useState, useEffect } from 'react'
import { fetchUserEntries } from './api/index.js'
import LoginScreen from './components/LoginScreen.jsx'
import Dashboard from './components/Dashboard.jsx'

export default function App() {
  const [screen, setScreen] = useState('login')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [username, setUsername] = useState('')
  const [provider, setProvider] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('animatch_provider') || 'anilist'
    }
    return 'anilist'
  })
  const [allEntries, setAllEntries] = useState([])
  const [recentUsers, setRecentUsers] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem('animatch_recent_users')
        return saved ? JSON.parse(saved) : []
      } catch (e) {
        return []
      }
    }
    return []
  })

  useEffect(() => {
    // Check URL parameters for ?user=username
    const params = new URLSearchParams(window.location.search)
    const urlUser = params.get('user')
    const savedUsername = urlUser || (typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('animatch_username') : null)

    if (savedUsername) {
      const savedProvider = (typeof window !== 'undefined' && window.localStorage ? localStorage.getItem('animatch_provider') : null) || 'anilist'
      handleLogin(savedUsername, savedProvider)
    }
  }, [])

  function addRecentUser(user) {
    setRecentUsers((prev) => {
      const filtered = prev.filter((u) => u.toLowerCase() !== user.toLowerCase())
      const updated = [user, ...filtered].slice(0, 5)
      if (typeof window !== 'undefined' && window.localStorage) {
        try {
          localStorage.setItem('animatch_recent_users', JSON.stringify(updated))
        } catch (e) {
          // Ignore storage errors
        }
      }
      return updated
    })
  }

  async function handleLogin(inputUsername, inputProvider = 'anilist', options = {}) {
    setIsLoading(true)
    setError(null)

    try {
      const entries = await fetchUserEntries(inputUsername, inputProvider, options)

      const planning = entries.filter((e) => e.status === 'PLANNING')
      if (planning.length === 0) {
        const providerName = inputProvider === 'kitsu' ? 'Kitsu' : 'AniList';
        setError(`Adicione animes à sua lista 'Planning' no ${providerName}.`)
        setIsLoading(false)
        return
      }

      setUsername(inputUsername)
      setProvider(inputProvider)
      setAllEntries(entries)
      setScreen('dashboard')
      addRecentUser(inputUsername)

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('animatch_username', inputUsername)
        localStorage.setItem('animatch_provider', inputProvider)
      }

      // Update URL with ?user=username
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        const url = new URL(window.location.href)
        url.searchParams.set('user', inputUsername)
        window.history.replaceState({}, '', url.toString())
      }
    } catch (err) {
      setError(err.message)
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem('animatch_username')
      }
    } finally {
      setIsLoading(false)
    }
  }

  function handleRefresh() {
    handleLogin(username, provider, { forceRefresh: true })
  }

  function handleLogout() {
    setScreen('login')
    setUsername('')
    setAllEntries([])
    setError(null)

    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem('animatch_username')
    }

    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      const url = new URL(window.location.href)
      url.searchParams.delete('user')
      window.history.replaceState({}, '', url.toString())
    }
  }

  if (screen === 'login') {
    return (
      <LoginScreen
        onSubmit={(user, prov) => handleLogin(user, prov)}
        isLoading={isLoading}
        error={error}
        recentUsers={recentUsers}
      />
    )
  }

  return (
    <Dashboard
      allEntries={allEntries}
      username={username}
      provider={provider}
      onLogout={handleLogout}
      onRefresh={handleRefresh}
      isLoading={isLoading}
    />
  )
}

