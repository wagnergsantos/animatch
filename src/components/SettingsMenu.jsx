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

export default function SettingsMenu({ favoriteDub, onChangeFavoriteDub }) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  return (
    <div className="settings-menu" ref={containerRef}>
      <button
        type="button"
        className="settings-menu__trigger"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Configurações"
        title="Configurações"
      >
        ⚙️
      </button>

      {isOpen && (
        <div className="settings-menu__panel" role="dialog" aria-label="Configurações">
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
      )}
    </div>
  )
}
