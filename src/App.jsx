import { useEffect, useState, useContext } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchUserEntries } from './api/index.js'
import LoginScreen from './components/LoginScreen.jsx'
import Dashboard from './components/Dashboard.jsx'
import AuthModal from './components/AuthModal.jsx'
import useLocalStorage from './hooks/useLocalStorage.js'
import { useAsyncAction } from './hooks/useAsyncAction.js'
import { AuthContext, AuthProvider, useAuth } from './auth/AuthContext.jsx'
import useUserSettings from './hooks/useUserSettings.js'

export function AppContent() {
  const { user, signOut } = useAuth()
  const { settings, updateSetting, syncStatus } = useUserSettings()
  const { i18n } = useTranslation()
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const [screen, setScreen] = useState(() => {
    if (typeof window === 'undefined') return 'login'
    const params = new URLSearchParams(window.location.search)
    const urlUser = params.get('user')
    const urlProvider = params.get('provider')
    const validProviders = ['anilist', 'kitsu', 'mal']
    const hasUrlAuth = urlUser && urlProvider && validProviders.includes(urlProvider.toLowerCase())

    let localUser = null
    try {
      const item = window.localStorage.getItem('animatch_username')
      localUser = item ? JSON.parse(item) : null
    } catch {
      localUser = null
    }

    return (hasUrlAuth || localUser) ? 'loading' : 'login'
  })
  const [storedUsername, setStoredUsername] = useLocalStorage('animatch_username', null)
  const [username, setUsername] = useState('')
  const [provider, setProvider] = useLocalStorage('animatch_provider', settings?.default_provider || 'anilist')
  const [allEntries, setAllEntries] = useState([])
  const [recentUsers, setRecentUsers] = useLocalStorage('animatch_recent_users', [])

  // Sync theme to DOM
  useEffect(() => {
    if (settings?.theme) {
      document.documentElement.setAttribute('data-theme', settings.theme)
      try {
        localStorage.setItem('animatch_theme', settings.theme)
      } catch {}
    }
  }, [settings?.theme])

  // Sync language to i18n
  useEffect(() => {
    if (settings?.language && i18n.language !== settings.language) {
      i18n.changeLanguage(settings.language)
      try {
        localStorage.setItem('animatch_lang', settings.language)
      } catch {}
    }
  }, [settings?.language, i18n])

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
      setScreen('login')
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
        setScreen('login')
      }
    } else if (storedUsername) {
      handleLogin(storedUsername, provider || 'anilist')
    } else {
      setScreen('login')
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

  return (
    <>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {screen === 'loading' && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem', color: '#fff' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid rgba(255,255,255,0.2)', borderTopColor: '#6366f1', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p>Carregando dados...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {screen === 'login' && (
        <LoginScreen
          onSubmit={(user, prov) => handleLogin(user, prov)}
          isLoading={isLoading}
          error={error}
          recentUsers={normalizedRecentUsers}
          initialUsername={username || settings?.linked_usernames?.[provider] || ''}
          user={user}
          syncStatus={syncStatus}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          linkedUsernames={settings?.linked_usernames}
        />
      )}

      {screen === 'dashboard' && (
        <Dashboard
          allEntries={allEntries}
          username={username}
          provider={provider}
          titlePref={settings.title_pref}
          onTitlePrefChange={(newPref) => updateSetting('title_pref', newPref)}
          subscriptions={settings.subscriptions}
          onSubscriptionsChange={(newSubs) => updateSetting('subscriptions', newSubs)}
          streamingBoost={settings.streaming_boost}
          onStreamingBoostChange={(newBoost) => updateSetting('streaming_boost', newBoost)}
          viewMode={settings.view_mode}
          onViewModeChange={(newMode) => updateSetting('view_mode', newMode)}
          user={user}
          syncStatus={syncStatus}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          onSignOut={signOut}
          linkedUsernames={settings.linked_usernames}
          onLinkedUsernamesChange={(newUsernames) => updateSetting('linked_usernames', newUsernames)}
          onLogout={handleLogout}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />
      )}
    </>
  )
}

export default function App() {
  const existingAuth = useContext(AuthContext)
  if (existingAuth) {
    return <AppContent />
  }
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}


