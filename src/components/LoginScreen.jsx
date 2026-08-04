import { useState, useEffect } from 'react'
import ThemeToggle from './ThemeToggle.jsx'
import { useTranslation } from 'react-i18next'
import './LoginScreen.css'

export default function LoginScreen({ onSubmit, isLoading, error, recentUsers = [], initialUsername = '' }) {
  const { t } = useTranslation()
  const [username, setUsername] = useState(initialUsername)
  const [provider, setProvider] = useState(() => localStorage.getItem('animatch_provider') || 'anilist')

  useEffect(() => {
    localStorage.setItem('animatch_provider', provider)
  }, [provider])

  useEffect(() => {
    if (initialUsername) {
      setUsername(initialUsername)
    }
  }, [initialUsername])

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = username.trim()
    if (trimmed) {
      onSubmit(trimmed, provider)
    }
  }

  const providerLabel = provider === 'anilist' ? t('providers.anilist') : t('providers.kitsu')

  return (
    <div className="login-screen">
      <div style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)' }}>
        <ThemeToggle />
      </div>
      <div className="login-container">
        <h1 className="login-title">{t('login.title')}</h1>
        <p className="login-subtitle">{t('login.subtitle')}</p>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="provider-selector">
            <button
              type="button"
              className={`provider-pill ${provider === 'anilist' ? 'provider-pill--active' : ''}`}
              onClick={() => setProvider('anilist')}
              disabled={isLoading}
            >
              {t('providers.anilist')}
            </button>
            <button
              type="button"
              className={`provider-pill ${provider === 'kitsu' ? 'provider-pill--active' : ''}`}
              onClick={() => setProvider('kitsu')}
              disabled={isLoading}
            >
              {t('providers.kitsu')}
            </button>
          </div>
          <label htmlFor="username-input" className="login-label">
            {t('login.usernameLabel', { provider: providerLabel })}
          </label>
          <input
            id="username-input"
            className={`login-input ${error ? 'login-input--error' : ''}`}
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
            <p id="username-error" className="login-error" role="alert">
              {error}
            </p>
          )}
          <button
            className="login-button"
            type="submit"
            disabled={isLoading || !username.trim()}
          >
            {isLoading ? (
              <>
                <span className="login-spinner" aria-hidden="true" />
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
                const provLabel = uProv === 'kitsu' ? t('providers.kitsu') : t('providers.anilist')
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
