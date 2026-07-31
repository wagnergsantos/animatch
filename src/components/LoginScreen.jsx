import { useState } from 'react'
import './LoginScreen.css'

export default function LoginScreen({ onSubmit, isLoading, error }) {
  const [username, setUsername] = useState('')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = username.trim()
    if (trimmed) {
      onSubmit(trimmed)
    }
  }

  return (
    <div className="login-screen">
      <div className="login-container">
        <h1 className="login-title">Anime Recommender</h1>
        <p className="login-subtitle">
          Descubra o que assistir baseado no seu gosto real.
        </p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label htmlFor="username-input" className="login-label">
            Username do AniList
          </label>
          <input
            id="username-input"
            className={`login-input ${error ? 'login-input--error' : ''}`}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="seu username"
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
      </div>
    </div>
  )
}
