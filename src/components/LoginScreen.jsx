import { useState, useEffect, useRef } from 'react'
import ThemeToggle from './ThemeToggle.jsx'
import { useTranslation } from 'react-i18next'
import useLocalStorage from '../hooks/useLocalStorage.js'
import styles from './LoginScreen.module.css'

export default function LoginScreen({
  onSubmit,
  isLoading,
  error,
  recentUsers = [],
  initialUsername = '',
  user = null,
  syncStatus = 'idle',
  onOpenAuthModal,
  linkedUsernames = null,
}) {
  const { t } = useTranslation()
  const [provider, setProvider] = useLocalStorage('animatch_provider', 'anilist')
  const [username, setUsername] = useState(() => initialUsername || (linkedUsernames && linkedUsernames[provider]) || '')
  const inputRef = useRef(null)

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider)
    if (linkedUsernames && linkedUsernames[newProvider] && (!username || username === linkedUsernames[provider])) {
      setUsername(linkedUsernames[newProvider])
    }
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  useEffect(() => {
    if (initialUsername) {
      setUsername(initialUsername)
    } else if (linkedUsernames && linkedUsernames[provider]) {
      setUsername((prev) => (prev ? prev : linkedUsernames[provider]))
    }
  }, [initialUsername, linkedUsernames, provider])

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = username.trim()
    if (trimmed) {
      onSubmit(trimmed, provider)
    }
  }

  const providerNames = { anilist: 'AniList', kitsu: 'Kitsu', mal: 'MyAnimeList' }
  const providerLabel = t(`providers.${provider}`) || providerNames[provider] || provider

  return (
    <div className={styles['login-screen']}>
      <div className={styles['login-header-actions']}>
        {!user ? (
          <button
            type="button"
            className={styles['cloud-auth-btn']}
            onClick={() => onOpenAuthModal?.()}
            aria-label={t('auth.login', 'Entrar / Sincronizar')}
          >
            ☁️ {t('auth.login', 'Entrar / Sincronizar')}
          </button>
        ) : (
          <div className={styles['cloud-user-badge']}>
            <span className={styles['cloud-user-email']}>👤 {user.email}</span>
            <span
              className={`${styles['cloud-sync-status']} ${styles[`cloud-sync-status--${syncStatus}`]}`}
              title={
                syncStatus === 'syncing'
                  ? t('auth.sync_status_syncing', 'Sincronizando...')
                  : syncStatus === 'error'
                  ? t('auth.sync_status_error', 'Erro ao sincronizar')
                  : syncStatus === 'offline'
                  ? t('auth.sync_status_offline', 'Modo Offline (LocalStorage)')
                  : t('auth.sync_status_synced', 'Sincronizado na nuvem')
              }
            >
              {syncStatus === 'syncing' ? '⏳' : syncStatus === 'error' ? '⚠️' : syncStatus === 'offline' ? '📴' : '☁️'}
            </span>
          </div>
        )}
        <ThemeToggle />
      </div>
      <div className={styles['login-container']}>
        <h1 className={styles['login-title']}>{t('login.title')}</h1>
        <p className={styles['login-subtitle']}>{t('login.subtitle')}</p>
        <form className={styles['login-form']} onSubmit={handleSubmit}>
          <div className={styles['provider-selector']} role="tablist" aria-label={t('login.providerSelectorLabel') || 'Provedor de animes'}>
            <button
              type="button"
              role="tab"
              aria-selected={provider === 'anilist'}
              className={`${styles['provider-pill']} ${provider === 'anilist' ? styles['provider-pill--active'] : ''}`}
              onClick={() => handleProviderChange('anilist')}
              disabled={isLoading}
            >
              {t('providers.anilist')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={provider === 'kitsu'}
              className={`${styles['provider-pill']} ${provider === 'kitsu' ? styles['provider-pill--active'] : ''}`}
              onClick={() => handleProviderChange('kitsu')}
              disabled={isLoading}
            >
              {t('providers.kitsu')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={provider === 'mal'}
              className={`${styles['provider-pill']} ${provider === 'mal' ? styles['provider-pill--active'] : ''}`}
              onClick={() => handleProviderChange('mal')}
              disabled={isLoading}
            >
              {t('providers.mal')}
            </button>
          </div>
          <label htmlFor="username-input" className={styles['login-label']}>
            {t('login.usernameLabel', { provider: providerLabel })}
          </label>
          <input
            ref={inputRef}
            id="username-input"
            className={`${styles['login-input']} ${error ? styles['login-input--error'] : ''}`}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('login.usernamePlaceholder', { provider: providerLabel })}
            autoComplete="off"
            disabled={isLoading}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'username-error' : undefined}
          />
          {error && (
            <p id="username-error" className={styles['login-error']} role="alert">
              {error}
            </p>
          )}
          <button
            className={styles['login-button']}
            type="submit"
            disabled={isLoading || !username.trim()}
          >
            {isLoading ? (
              <>
                <span className={styles['login-spinner']} aria-hidden="true" data-testid="login-spinner" />
                {t('login.loading')}
              </>
            ) : (
              t('login.submit')
            )}
          </button>
        </form>

        {recentUsers.length > 0 && (
          <div className="recent-users" style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginBottom: 'var(--space-2)' }}>
              {t('login.recentQueries')}
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
              {recentUsers.map((item) => {
                const uName = typeof item === 'string' ? item : item.username
                const uProv = typeof item === 'string' ? 'anilist' : item.provider
                const provLabel = t(`providers.${uProv}`, uProv)
                return (
                  <button
                    key={`${uName}-${uProv}`}
                    type="button"
                    onClick={() => onSubmit(uName, uProv)}
                    disabled={isLoading}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-primary)',
                      padding: 'var(--space-1) var(--space-3)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 'var(--text-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    @{uName} ({provLabel})
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
