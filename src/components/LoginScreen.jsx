import { useState, useEffect } from 'react'
import ThemeToggle from './ThemeToggle.jsx'
import './LoginScreen.css'

export default function LoginScreen({ onSubmit, isLoading, error, recentUsers = [] }) {
  const [username, setUsername] = useState('')
  const [provider, setProvider] = useState(() => localStorage.getItem('animatch_provider') || 'anilist')

  useEffect(() => {
    localStorage.setItem('animatch_provider', provider)
  }, [provider])

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = username.trim()
    if (trimmed) {
      onSubmit(trimmed, provider)
    }
  }

  const providerLabel = provider === 'anilist' ? 'AniList' : 'Kitsu'

  return (
    <div className="login-screen">
      <div style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)' }}>
        <ThemeToggle />
      </div>
      <div className="login-container">
        <h1 className="login-title">AniMatch</h1>
        <p className="login-subtitle">
          Descubra o que assistir baseado no seu gosto real.
        </p>
        <form className="login-form" onSubmit={handleSubmit}>
          <div className="provider-selector">
            <button
              type="button"
              className={`provider-pill ${provider === 'anilist' ? 'provider-pill--active' : ''}`}
              onClick={() => setProvider('anilist')}
              disabled={isLoading}
            >
              AniList
            </button>
            <button
              type="button"
              className={`provider-pill ${provider === 'kitsu' ? 'provider-pill--active' : ''}`}
              onClick={() => setProvider('kitsu')}
              disabled={isLoading}
            >
              Kitsu
            </button>
          </div>
          <label htmlFor="username-input" className="login-label">
            Username do {providerLabel}
          </label>
          <input
            id="username-input"
            className={`login-input ${error ? 'login-input--error' : ''}`}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={`Seu usuário no ${providerLabel}...`}
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
                Carregando…
              </>
            ) : (
              'Gerar Recomendações'
            )}
          </button>
        </form>

        {recentUsers.length > 0 && (
          <div className="recent-users" style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', marginBottom: 'var(--space-2)' }}>
              Consultas recentes:
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
              {recentUsers.map((user) => (
                <button
                  key={user}
                  type="button"
                  onClick={() => onSubmit(user, provider)}
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
                  @{user}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
