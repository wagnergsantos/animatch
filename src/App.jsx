import { useEffect, useState } from 'react'
import { fetchUserEntries } from './api/index.js'
import LoginScreen from './components/LoginScreen.jsx'
import Dashboard from './components/Dashboard.jsx'
import useLocalStorage from './hooks/useLocalStorage.js'
import { useAsyncAction } from './hooks/useAsyncAction.js'

export default function App() {
  const [screen, setScreen] = useState('login')
  const [storedUsername, setStoredUsername] = useLocalStorage('animatch_username', null)
  const [username, setUsername] = useState('')
  const [provider, setProvider] = useLocalStorage('animatch_provider', 'anilist')
  const [titlePref, setTitlePref] = useLocalStorage('animatch_title_pref', 'english')
  const [allEntries, setAllEntries] = useState([])
  const [recentUsers, setRecentUsers] = useLocalStorage('animatch_recent_users', [])

  // Normalizar recentUsers de arrays legados
  const normalizedRecentUsers = (recentUsers || []).map((item) =>
    typeof item === 'string' ? { username: item, provider: 'anilist' } : item
  )

  function addRecentUser(user, prov) {
    setRecentUsers((prev) => {
      const current = (prev || []).map((item) =>
        typeof item === 'string' ? { username: item, provider: 'anilist' } : item
      )
      const filtered = current.filter(
        (u) => !(u.username.toLowerCase() === user.toLowerCase() && u.provider === prov)
      )
      return [{ username: user, provider: prov }, ...filtered].slice(0, 5)
    })
  }

  // isLoading/error ficam encapsulados no hook — ver convenção em
  // docs/roadmap_v2.md e arquitetura_inicial/docs/ARQUITETURA-UNIFICADA.md.
  const {
    execute: handleLogin,
    isLoading,
    error,
    setError,
  } = useAsyncAction(async (inputUsername, inputProvider = 'anilist', options = {}) => {
    try {
      const entries = await fetchUserEntries(inputUsername, inputProvider, options)

      const planning = entries.filter((e) => e.status === 'PLANNING')
      if (planning.length === 0) {
        const providerNames = { anilist: 'AniList', kitsu: 'Kitsu', mal: 'MyAnimeList' }
        const providerName = providerNames[inputProvider] ?? inputProvider
        throw new Error(`Adicione animes à sua lista 'Plan to Watch' no ${providerName}.`)
      }

      setUsername(inputUsername)
      setProvider(inputProvider)
      setStoredUsername(inputUsername)
      setAllEntries(entries)
      setScreen('dashboard')
      addRecentUser(inputUsername, inputProvider)

      // Update URL with ?user=username&provider=provider
      if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
        const url = new URL(window.location.href)
        url.searchParams.set('user', inputUsername)
        url.searchParams.set('provider', inputProvider)
        window.history.replaceState({}, '', url.toString())
      }
    } catch (err) {
      setStoredUsername(null)
      throw err
    }
  })

  useEffect(() => {
    // Check URL parameters for ?user=username&provider=provider
    const params = new URLSearchParams(window.location.search)
    const urlUser = params.get('user')
    const urlProvider = params.get('provider')
    const validProviders = ['anilist', 'kitsu', 'mal']

    if (urlUser) {
      if (urlProvider && validProviders.includes(urlProvider.toLowerCase())) {
        handleLogin(urlUser, urlProvider.toLowerCase())
      } else {
        setUsername(urlUser)
      }
    } else if (storedUsername) {
      handleLogin(storedUsername, provider || 'anilist')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleRefresh() {
    handleLogin(username, provider, { forceRefresh: true })
  }

  function handleLogout() {
    setScreen('login')
    setUsername('')
    setStoredUsername(null)
    setAllEntries([])
    setError(null)

    if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
      const url = new URL(window.location.href)
      url.searchParams.delete('user')
      url.searchParams.delete('provider')
      window.history.replaceState({}, '', url.toString())
    }
  }

  const handleTitlePrefChange = (newPref) => {
    setTitlePref(newPref)
  }

  if (screen === 'login') {
    return (
      <LoginScreen
        onSubmit={(user, prov) => handleLogin(user, prov)}
        isLoading={isLoading}
        error={error}
        recentUsers={normalizedRecentUsers}
        initialUsername={username}
      />
    )
  }

  return (
    <Dashboard
      allEntries={allEntries}
      username={username}
      provider={provider}
      titlePref={titlePref}
      onTitlePrefChange={handleTitlePrefChange}
      onLogout={handleLogout}
      onRefresh={handleRefresh}
      isLoading={isLoading}
    />
  )
}


