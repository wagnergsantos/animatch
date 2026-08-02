import { useState, useRef, useEffect } from 'react'
import './SettingsMenu.css'

export const DUB_LANGUAGE_OPTIONS = [
  { id: 'nenhuma', label: 'Nenhuma' },
  { id: 'pt-br', label: 'Português (Brasil)' },
  { id: 'en', label: 'Inglês' },
  { id: 'ja', label: 'Japonês' },
  { id: 'es', label: 'Espanhol' },
  { id: 'de', label: 'Alemão' },
  { id: 'ko', label: 'Coreano' },
  { id: 'fr', label: 'Francês' },
  { id: 'it', label: 'Italiano' },
]

export default function SettingsMenu({
  favoriteDub,
  onChangeFavoriteDub,
  onRefresh,
  isLoading,
  onLogout,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('animatch_theme')
      if (saved) return saved
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    return 'dark'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('animatch_theme', theme)
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const wasLoadingRef = useRef(isLoading)

  useEffect(() => {
    // Se estava carregando e finalizou, fecha o menu de configurações
    if (wasLoadingRef.current && !isLoading) {
      setIsOpen(false)
    }
    wasLoadingRef.current = isLoading
  }, [isLoading])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className="settings-menu" ref={containerRef}>
      <button
        type="button"
        className="settings-menu__trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Configurações"
        title="Configurações"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        ⚙️
      </button>

      {isOpen && (
        <div className="settings-menu__panel" role="dialog" aria-label="Configurações">
          <div className="settings-menu__section">
            <label className="settings-menu__label" htmlFor="favorite-dub-select">
              Dublagem favorita
            </label>
            <select
              id="favorite-dub-select"
              className="settings-menu__select"
              value={favoriteDub}
              onChange={(e) => {
                onChangeFavoriteDub(e.target.value)
                setIsOpen(false)
              }}
            >
              {DUB_LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="settings-menu__divider" />

          <div className="settings-menu__row">
            <span className="settings-menu__label">Tema</span>
            <button
              type="button"
              className="settings-menu__theme-btn"
              onClick={toggleTheme}
              aria-label={`Alternar para tema ${theme === 'dark' ? 'claro' : 'escuro'}`}

            >
              {theme === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Escuro'}
            </button>
          </div>

          <div className="settings-menu__divider" />

          {onRefresh && (
            <button
              type="button"
              className="settings-menu__btn"
              onClick={() => {
                onRefresh()
              }}
              disabled={isLoading}
            >
              {isLoading ? '⏳ Sincronizando com AniList...' : '🔄 Sincronizar AniList'}
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              className="settings-menu__btn settings-menu__btn--danger"
              onClick={() => {
                onLogout()
                setIsOpen(false)
              }}
            >
              🚪 Trocar de conta
            </button>
          )}
        </div>
      )}
    </div>
  )
}
