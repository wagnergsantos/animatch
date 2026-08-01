# Menu de Configurações — Dublagem Favorita Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let each user pick a favorite dub language (or "nenhuma") in a new settings menu, persisted in `localStorage`, generalizing the existing PT-BR-only dub bonus/badge/filter mechanism to any of 8 languages.

**Architecture:** `fetchDubInfo` in `src/api/anilist.js` gains a `language` parameter (default `'pt-br'`) and a per-language `localStorage` cache. A new `SettingsMenu.jsx` component (gear icon + dropdown panel) lets the user pick a favorite dub language; `Dashboard.jsx` owns that preference as state (read/written to `localStorage`) and passes it down to `RecommendationGrid.jsx`, which already has the bonus/sort/badge machinery — it just gets parametrized by the chosen language instead of hardcoded PT-BR, plus a new "only show favorite dub" filter checkbox. `AnimeCard.jsx`'s badge text becomes language-aware.

**Tech Stack:** React (Vite), Vitest + Testing Library, plain CSS with existing design tokens (`--space-*`, `--radius-*`, `--surface-*`, `--text-*`).

---

## Reference: full spec

See `docs/superpowers/specs/2026-07-31-favorite-dub-settings-design.md` for the approved design this plan implements.

## Reference: shared language data

Both `src/api/anilist.js` and the UI components need consistent language codes/labels:

| code | AniList `languageV2` value | Label (pt-BR) |
|------|------------------------------|----------------|
| `pt-br` | `Portuguese` | Português (Brasil) |
| `en` | `English` | Inglês |
| `ja` | `Japanese` | Japonês |
| `es` | `Spanish` | Espanhol |
| `de` | `German` | Alemão |
| `ko` | `Korean` | Coreano |
| `fr` | `French` | Francês |
| `it` | `Italian` | Italiano |

Plus a special value `'nenhuma'` (no favorite dub — the default), which never triggers a `fetchDubInfo` call.

---

### Task 1: Parametrize `fetchDubInfo` by language in `src/api/anilist.js`

**Files:**
- Modify: `src\api\anilist.js`
- Test: `src\api\anilist.test.js`

- [ ] **Step 1: Write the failing tests for the new language parameter and cache shape**

Replace the entire existing `describe('fetchDubInfo', ...)` block in `src\api\anilist.test.js` with:

```js
describe('fetchDubInfo', () => {
  it('returns empty map when mediaIds is empty or falsy', async () => {
    expect(await fetchDubInfo([])).toEqual(new Map())
    expect(await fetchDubInfo(null)).toEqual(new Map())
  })

  it('returns empty map for an unsupported language without calling the API', async () => {
    const result = await fetchDubInfo([101], 'xx')
    expect(result).toEqual(new Map())
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('defaults to pt-br when no language is passed', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          Page: {
            media: [
              {
                id: 101,
                characters: {
                  edges: [
                    { node: { id: 1 }, voiceActors: [{ languageV2: 'Portuguese' }] }
                  ]
                }
              }
            ]
          }
        }
      })
    })

    const dubMap = await fetchDubInfo([101])
    expect(dubMap.get(101)).toBe(true)
  })

  it('uses dub cache from localStorage when available within 24h TTL', async () => {
    const mockCache = {
      'pt-br': { timestamp: Date.now(), dubs: { 101: true, 102: false } }
    }
    localStorage.setItem(CACHE_KEY_DUB, JSON.stringify(mockCache))

    const dubMap = await fetchDubInfo([101, 102], 'pt-br')
    expect(dubMap.get(101)).toBe(true)
    expect(dubMap.get(102)).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it('fetches only uncached media IDs and updates localStorage cache', async () => {
    const mockCache = {
      'pt-br': { timestamp: Date.now(), dubs: { 101: true } }
    }
    localStorage.setItem(CACHE_KEY_DUB, JSON.stringify(mockCache))

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          Page: {
            media: [
              {
                id: 102,
                characters: {
                  edges: [
                    {
                      node: { id: 1 },
                      voiceActors: [{ languageV2: 'Portuguese' }]
                    }
                  ]
                }
              }
            ]
          }
        }
      })
    })

    const dubMap = await fetchDubInfo([101, 102], 'pt-br')

    expect(dubMap.get(101)).toBe(true)
    expect(dubMap.get(102)).toBe(true)

    expect(mockFetch).toHaveBeenCalledTimes(1)
    const bodyStr = mockFetch.mock.calls[0][1].body
    const parsedBody = JSON.parse(bodyStr)
    expect(parsedBody.variables.idIn).toEqual([102])

    const savedCache = JSON.parse(localStorage.getItem(CACHE_KEY_DUB))
    expect(savedCache['pt-br'].dubs[101]).toBe(true)
    expect(savedCache['pt-br'].dubs[102]).toBe(true)
  })

  it('refetches expired cache entries (older than 24h)', async () => {
    const EXPIRED_TIMESTAMP = Date.now() - (25 * 60 * 60 * 1000)
    const mockCache = {
      'pt-br': { timestamp: EXPIRED_TIMESTAMP, dubs: { 101: true } }
    }
    localStorage.setItem(CACHE_KEY_DUB, JSON.stringify(mockCache))

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          Page: {
            media: [
              {
                id: 101,
                characters: { edges: [] }
              }
            ]
          }
        }
      })
    })

    const dubMap = await fetchDubInfo([101], 'pt-br')

    expect(dubMap.get(101)).toBe(false)
    expect(mockFetch).toHaveBeenCalledTimes(1)
    const bodyStr = mockFetch.mock.calls[0][1].body
    const parsedBody = JSON.parse(bodyStr)
    expect(parsedBody.variables.idIn).toEqual([101])
  })

  it('fetches dub info for a non-default language (English) using the correct languageV2 value', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        data: {
          Page: {
            media: [
              {
                id: 201,
                characters: {
                  edges: [
                    { node: { id: 1 }, voiceActors: [{ languageV2: 'English' }] }
                  ]
                }
              },
              {
                id: 202,
                characters: {
                  edges: [
                    { node: { id: 2 }, voiceActors: [{ languageV2: 'Japanese' }] }
                  ]
                }
              }
            ]
          }
        }
      })
    })

    const dubMap = await fetchDubInfo([201, 202], 'en')
    expect(dubMap.get(201)).toBe(true)
    expect(dubMap.get(202)).toBe(false)

    const savedCache = JSON.parse(localStorage.getItem(CACHE_KEY_DUB))
    expect(savedCache['en'].dubs[201]).toBe(true)
    expect(savedCache['en'].dubs[202]).toBe(false)
  })

  it('keeps cache entries for different languages isolated from one another', async () => {
    const mockCache = {
      'pt-br': { timestamp: Date.now(), dubs: { 101: true } },
      'en': { timestamp: Date.now(), dubs: { 101: false } },
    }
    localStorage.setItem(CACHE_KEY_DUB, JSON.stringify(mockCache))

    const ptBrMap = await fetchDubInfo([101], 'pt-br')
    const enMap = await fetchDubInfo([101], 'en')

    expect(ptBrMap.get(101)).toBe(true)
    expect(enMap.get(101)).toBe(false)
    expect(mockFetch).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/api/anilist.test.js`
Expected: FAIL — several assertions fail because `fetchDubInfo` still ignores the `language` argument, always checks `'Portuguese'`, and reads/writes the old flat cache shape under the old `CACHE_KEY_DUB` value.

- [ ] **Step 3: Implement the language-aware `fetchDubInfo`**

In `src\api\anilist.js`, replace:

```js
export const CACHE_KEY_DUB = 'animatch_dub_cache'
export const CACHE_DUB_TTL = 24 * 60 * 60 * 1000 // 24 horas em ms
```

with:

```js
export const CACHE_KEY_DUB = 'animatch_dub_cache_v2'
export const CACHE_DUB_TTL = 24 * 60 * 60 * 1000 // 24 horas em ms

export const DUB_LANGUAGE_MAP = {
  'pt-br': 'Portuguese',
  'en': 'English',
  'ja': 'Japanese',
  'es': 'Spanish',
  'de': 'German',
  'ko': 'Korean',
  'fr': 'French',
  'it': 'Italian',
}
```

Then replace the entire `fetchDubInfo` function body with:

```js
export async function fetchDubInfo(mediaIds, language = 'pt-br') {
  if (!mediaIds || mediaIds.length === 0) return new Map()

  const languageV2Value = DUB_LANGUAGE_MAP[language]
  if (!languageV2Value) return new Map()

  const dubMap = new Map()
  let cacheByLanguage = {}
  let cachedDubs = {}

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const cached = window.localStorage.getItem(CACHE_KEY_DUB)
      if (cached) {
        cacheByLanguage = JSON.parse(cached) || {}
        const entry = cacheByLanguage[language]
        if (entry && Date.now() - entry.timestamp < CACHE_DUB_TTL && entry.dubs) {
          cachedDubs = entry.dubs
        }
      }
    } catch (e) {
      // Ignore cache read error
    }
  }

  const missingIds = []
  for (const id of mediaIds) {
    if (id in cachedDubs) {
      dubMap.set(id, cachedDubs[id])
    } else {
      missingIds.push(id)
    }
  }

  if (missingIds.length === 0) {
    return dubMap
  }

  try {
    const data = await queryAniList(DUB_QUERY, { idIn: missingIds })
    const mediaList = data?.Page?.media ?? []

    for (const media of mediaList) {
      const chars = media?.characters?.edges ?? []
      const hasDub = chars.some(
        (char) => char?.voiceActors && char.voiceActors.some((va) => va?.languageV2 === languageV2Value)
      )
      dubMap.set(media.id, hasDub)
      cachedDubs[media.id] = hasDub
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        cacheByLanguage[language] = {
          timestamp: Date.now(),
          dubs: cachedDubs,
        }
        window.localStorage.setItem(CACHE_KEY_DUB, JSON.stringify(cacheByLanguage))
      } catch (e) {
        // Ignore cache write error
      }
    }
  } catch (err) {
    console.error('Failed to fetch dub info', err)
  }

  return dubMap
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/api/anilist.test.js`
Expected: PASS — all `fetchDubInfo` tests (including the new ones) green.

- [ ] **Step 5: Commit**

```bash
git add src/api/anilist.js src/api/anilist.test.js
git commit -m "feat: parametrize fetchDubInfo by dub language"
```

---

### Task 2: Language-aware dub badge in `AnimeCard.jsx`

**Files:**
- Modify: `src\components\AnimeCard.jsx`
- Test: `src\components\AnimeCard.test.jsx`

- [ ] **Step 1: Write the failing tests**

Add to `src\components\AnimeCard.test.jsx` (inside the existing `describe('AnimeCard', ...)` block):

```js
  it('shows the PT-BR badge by default when hasDub is true and no dubLanguage is passed', () => {
    const anime = { title: 'Dubbed Anime' }
    render(<AnimeCard anime={anime} hasDub={true} />)
    expect(screen.getByText('🎙️ Dublado PT-BR')).toBeInTheDocument()
  })

  it('shows the badge with the label matching the given dubLanguage', () => {
    const anime = { title: 'Dubbed Anime' }
    render(<AnimeCard anime={anime} hasDub={true} dubLanguage="ja" />)
    expect(screen.getByText('🎙️ Dublado Japonês')).toBeInTheDocument()
  })

  it('does not show the dub badge when hasDub is false', () => {
    const anime = { title: 'Not Dubbed Anime' }
    render(<AnimeCard anime={anime} hasDub={false} dubLanguage="en" />)
    expect(screen.queryByText(/Dublado/)).not.toBeInTheDocument()
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/AnimeCard.test.jsx`
Expected: FAIL on the "Japonês" case — current badge text is hardcoded to `Dublado PT-BR` regardless of `dubLanguage`.

- [ ] **Step 3: Implement the dynamic badge**

In `src\components\AnimeCard.jsx`, add above the `export default function AnimeCard` line:

```js
const DUB_LABELS = {
  'pt-br': 'PT-BR',
  'en': 'Inglês',
  'ja': 'Japonês',
  'es': 'Espanhol',
  'de': 'Alemão',
  'ko': 'Coreano',
  'fr': 'Francês',
  'it': 'Italiano',
}
```

Change the function signature from:

```js
export default function AnimeCard({ anime, hasDub }) {
```

to:

```js
export default function AnimeCard({ anime, hasDub, dubLanguage = 'pt-br' }) {
```

Replace:

```jsx
        {hasDub && (
          <div className="anime-card__dub-badge">
            🎙️ Dublado PT-BR
          </div>
        )}
```

with:

```jsx
        {hasDub && (
          <div className="anime-card__dub-badge">
            🎙️ Dublado {DUB_LABELS[dubLanguage] || dubLanguage}
          </div>
        )}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/AnimeCard.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/AnimeCard.jsx src/components/AnimeCard.test.jsx
git commit -m "feat: make AnimeCard dub badge language-aware"
```

---

### Task 3: Create the `SettingsMenu` component

**Files:**
- Create: `src\components\SettingsMenu.jsx`
- Create: `src\components\SettingsMenu.css`
- Test: `src\components\SettingsMenu.test.jsx`

- [ ] **Step 1: Write the failing tests**

Create `src\components\SettingsMenu.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SettingsMenu from './SettingsMenu.jsx'

describe('SettingsMenu', () => {
  it('renders a gear button and keeps the panel hidden until clicked', () => {
    render(<SettingsMenu favoriteDub="nenhuma" onChangeFavoriteDub={() => {}} />)
    expect(screen.getByRole('button', { name: /configurações/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/dublagem favorita/i)).not.toBeInTheDocument()
  })

  it('opens the settings panel when the gear button is clicked', () => {
    render(<SettingsMenu favoriteDub="nenhuma" onChangeFavoriteDub={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    expect(screen.getByLabelText(/dublagem favorita/i)).toBeInTheDocument()
  })

  it('shows the current favoriteDub value as the selected option', () => {
    render(<SettingsMenu favoriteDub="ja" onChangeFavoriteDub={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    expect(screen.getByLabelText(/dublagem favorita/i).value).toBe('ja')
  })

  it('calls onChangeFavoriteDub with the new value when an option is selected', () => {
    const onChange = vi.fn()
    render(<SettingsMenu favoriteDub="nenhuma" onChangeFavoriteDub={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    fireEvent.change(screen.getByLabelText(/dublagem favorita/i), { target: { value: 'en' } })
    expect(onChange).toHaveBeenCalledWith('en')
  })

  it('closes the panel when the close button is clicked', () => {
    render(<SettingsMenu favoriteDub="nenhuma" onChangeFavoriteDub={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    fireEvent.click(screen.getByRole('button', { name: /fechar/i }))
    expect(screen.queryByLabelText(/dublagem favorita/i)).not.toBeInTheDocument()
  })

  it('renders all 9 dub options (including "Nenhuma") in a fixed order', () => {
    render(<SettingsMenu favoriteDub="nenhuma" onChangeFavoriteDub={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    const select = screen.getByLabelText(/dublagem favorita/i)
    const values = Array.from(select.querySelectorAll('option')).map((opt) => opt.value)
    expect(values).toEqual(['nenhuma', 'pt-br', 'en', 'ja', 'es', 'de', 'ko', 'fr', 'it'])
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/SettingsMenu.test.jsx`
Expected: FAIL with "Failed to resolve import "./SettingsMenu.jsx"" (file does not exist yet).

- [ ] **Step 3: Implement `SettingsMenu.jsx`**

Create `src\components\SettingsMenu.jsx`:

```jsx
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
            onChange={(e) => onChangeFavoriteDub(e.target.value)}
          >
            {DUB_LANGUAGE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="settings-menu__close"
            onClick={() => setIsOpen(false)}
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  )
}
```

Create `src\components\SettingsMenu.css`:

```css
.settings-menu {
  position: relative;
  display: inline-flex;
}

.settings-menu__trigger {
  background: var(--surface-2);
  color: var(--text-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-full);
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  cursor: pointer;
  transition: background var(--transition-default), transform var(--transition-default);
}

.settings-menu__trigger:hover {
  background: var(--color-border);
  transform: scale(1.05);
}

.settings-menu__panel {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  background: var(--surface-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-3);
  min-width: 220px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  z-index: 100;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.settings-menu__label {
  font-size: var(--text-sm);
  color: var(--text-2);
  font-weight: 600;
}

.settings-menu__select {
  background: var(--surface-2);
  color: var(--text-1);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: var(--space-2);
  font-size: var(--text-sm);
}

.settings-menu__close {
  align-self: flex-end;
  background: none;
  border: none;
  color: var(--text-2);
  font-size: var(--text-sm);
  cursor: pointer;
  padding: var(--space-1) var(--space-2);
}

.settings-menu__close:hover {
  color: var(--text-1);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/SettingsMenu.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/SettingsMenu.jsx src/components/SettingsMenu.css src/components/SettingsMenu.test.jsx
git commit -m "feat: add SettingsMenu component for favorite dub selection"
```

---

### Task 4: Wire the favorite-dub preference into `Dashboard.jsx`

**Files:**
- Modify: `src\components\Dashboard.jsx`
- Test: `src\components\Dashboard.test.jsx`

- [ ] **Step 1: Write the failing tests**

Add to `src\components\Dashboard.test.jsx` (inside the existing `describe('Dashboard', ...)` block):

```jsx
  it('renders the settings gear button in the header', () => {
    render(<Dashboard allEntries={mockEntries} username="testuser" onLogout={() => {}} />)
    expect(screen.getByRole('button', { name: /configurações/i })).toBeInTheDocument()
  })

  it('defaults favoriteDub to "nenhuma" when nothing is stored in localStorage', () => {
    render(<Dashboard allEntries={mockEntries} username="testuser" onLogout={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    expect(screen.getByLabelText(/dublagem favorita/i).value).toBe('nenhuma')
  })

  it('reads favoriteDub from localStorage on mount', () => {
    window.localStorage.setItem('animatch_favorite_dub', 'ja')
    render(<Dashboard allEntries={mockEntries} username="testuser" onLogout={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    expect(screen.getByLabelText(/dublagem favorita/i).value).toBe('ja')
  })

  it('persists favoriteDub to localStorage when changed via the settings menu', () => {
    render(<Dashboard allEntries={mockEntries} username="testuser" onLogout={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    fireEvent.change(screen.getByLabelText(/dublagem favorita/i), { target: { value: 'en' } })
    expect(window.localStorage.getItem('animatch_favorite_dub')).toBe('en')
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Dashboard.test.jsx`
Expected: FAIL — no settings button exists yet in `Dashboard`.

- [ ] **Step 3: Implement the wiring in `Dashboard.jsx`**

Add the import at the top of `src\components\Dashboard.jsx`, alongside the other component imports:

```js
import SettingsMenu from './SettingsMenu.jsx'
```

Add the `favoriteDub` state right after the existing state declarations (after `const gridRef = useRef(null)`):

```js
  const [favoriteDub, setFavoriteDub] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      return localStorage.getItem('animatch_favorite_dub') || 'nenhuma'
    }
    return 'nenhuma'
  })

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('animatch_favorite_dub', favoriteDub)
    }
  }, [favoriteDub])
```

Add `useEffect` to the React import at the top of the file — change:

```js
import { useState, useMemo, useRef } from 'react'
```

to:

```js
import { useState, useMemo, useRef, useEffect } from 'react'
```

Render `SettingsMenu` next to `ThemeToggle` in the header. Change:

```jsx
          <ThemeToggle />
          <button className="dashboard__logout" onClick={onLogout}>
```

to:

```jsx
          <ThemeToggle />
          <SettingsMenu favoriteDub={favoriteDub} onChangeFavoriteDub={setFavoriteDub} />
          <button className="dashboard__logout" onClick={onLogout}>
```

Pass `favoriteDub` down to `RecommendationGrid`. Change:

```jsx
              <RecommendationGrid
                recommendations={recommendations}
                isLoading={false}
                sortBy={sortBy}
              />
```

to:

```jsx
              <RecommendationGrid
                recommendations={recommendations}
                isLoading={false}
                sortBy={sortBy}
                favoriteDub={favoriteDub}
              />
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/Dashboard.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Dashboard.jsx src/components/Dashboard.test.jsx
git commit -m "feat: wire favorite dub preference into Dashboard"
```

---

### Task 5: Apply the favorite dub to bonus/sort/badge/filter in `RecommendationGrid.jsx`

**Files:**
- Modify: `src\components\RecommendationGrid.jsx`
- Test: `src\components\RecommendationGrid.test.jsx`

- [ ] **Step 1: Write the failing tests**

In `src\components\RecommendationGrid.test.jsx`, change the top of the file from:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import RecommendationGrid from './RecommendationGrid.jsx'

vi.mock('../api/anilist.js', () => ({
  fetchDubInfo: vi.fn().mockResolvedValue(new Map()),
}))
```

to:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RecommendationGrid from './RecommendationGrid.jsx'
import { fetchDubInfo } from '../api/anilist.js'

vi.mock('../api/anilist.js', () => ({
  fetchDubInfo: vi.fn().mockResolvedValue(new Map()),
}))
```

Then add this new `describe` block at the end of the file, before the final closing of the outer `describe('RecommendationGrid', ...)` block (i.e. as a sibling of `describe('year sorting', ...)`, still inside `describe('RecommendationGrid', ...)`):

```jsx
  describe('favorite dub integration', () => {
    beforeEach(() => {
      fetchDubInfo.mockClear()
      fetchDubInfo.mockResolvedValue(new Map())
    })

    it('does not call fetchDubInfo when favoriteDub is "nenhuma" (default)', async () => {
      const mockRecs = [{ id: 1, title: 'Anime 1', predictedScore: 8.5, communityScore: 8.0 }]
      render(<RecommendationGrid recommendations={mockRecs} />)
      await waitFor(() => {
        expect(screen.getByText('Anime 1')).toBeInTheDocument()
      })
      expect(fetchDubInfo).not.toHaveBeenCalled()
    })

    it('calls fetchDubInfo with the selected favorite language', async () => {
      const mockRecs = [{ id: 1, title: 'Anime 1', predictedScore: 8.5, communityScore: 8.0 }]
      render(<RecommendationGrid recommendations={mockRecs} favoriteDub="en" />)
      await waitFor(() => {
        expect(fetchDubInfo).toHaveBeenCalledWith([1], 'en')
      })
    })

    it('shows the dub badge with the correct language label when the anime has the favorite dub', async () => {
      fetchDubInfo.mockResolvedValueOnce(new Map([[1, true]]))
      const mockRecs = [{ id: 1, title: 'Anime 1', predictedScore: 8.5, communityScore: 8.0 }]
      render(<RecommendationGrid recommendations={mockRecs} favoriteDub="ja" />)
      await waitFor(() => {
        expect(screen.getByText('🎙️ Dublado Japonês')).toBeInTheDocument()
      })
    })

    it('shows the "somente com minha dublagem favorita" checkbox only when favoriteDub is set', async () => {
      const mockRecs = [{ id: 1, title: 'Anime 1', predictedScore: 8.5, communityScore: 8.0 }]
      const { rerender } = render(<RecommendationGrid recommendations={mockRecs} />)
      expect(screen.queryByLabelText(/somente com minha dublagem favorita/i)).not.toBeInTheDocument()

      rerender(<RecommendationGrid recommendations={mockRecs} favoriteDub="pt-br" />)
      await waitFor(() => {
        expect(screen.getByLabelText(/somente com minha dublagem favorita/i)).toBeInTheDocument()
      })
    })

    it('filters out non-dubbed recommendations when "somente com minha dublagem favorita" is checked', async () => {
      fetchDubInfo.mockResolvedValueOnce(new Map([[1, true], [2, false]]))
      const mockRecs = [
        { id: 1, title: 'Dubbed Anime', predictedScore: 8.5, communityScore: 8.0 },
        { id: 2, title: 'Not Dubbed Anime', predictedScore: 9.0, communityScore: 8.8 },
      ]
      render(<RecommendationGrid recommendations={mockRecs} favoriteDub="pt-br" />)

      await waitFor(() => {
        expect(screen.getByText('Not Dubbed Anime')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByLabelText(/somente com minha dublagem favorita/i))

      expect(screen.getByText('Dubbed Anime')).toBeInTheDocument()
      expect(screen.queryByText('Not Dubbed Anime')).not.toBeInTheDocument()
    })
  })
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/RecommendationGrid.test.jsx`
Expected: FAIL — `RecommendationGrid` still always calls `fetchDubInfo(chunk)` without a language arg, doesn't skip on `'nenhuma'`, `AnimeCard` isn't given a `dubLanguage`, and there's no "somente com minha dublagem favorita" checkbox.

- [ ] **Step 3: Implement the changes in `RecommendationGrid.jsx`**

Change the function signature from:

```jsx
export default function RecommendationGrid({ recommendations = [], isLoading = false, sortBy = 'predicted' }) {
  const [dubMap, setDubMap] = useState(new Map())
  const [ignoreDub, setIgnoreDub] = useState(false)
```

to:

```jsx
export default function RecommendationGrid({ recommendations = [], isLoading = false, sortBy = 'predicted', favoriteDub = 'nenhuma' }) {
  const [dubMap, setDubMap] = useState(new Map())
  const [ignoreDub, setIgnoreDub] = useState(false)
  const [showOnlyFavoriteDub, setShowOnlyFavoriteDub] = useState(false)
```

Change the fetch `useEffect` from:

```jsx
  useEffect(() => {
    if (!recommendations || recommendations.length === 0) return

    const fetchDubs = async () => {
      // Fetch up to 100 recommendations
      const ids = recommendations.slice(0, 100).map((r) => r.id)

      const newMap = new Map()
      // Fetch in chunks of 50
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50)
        const chunkMap = await fetchDubInfo(chunk)
        for (const [key, val] of chunkMap.entries()) {
          newMap.set(key, val)
        }
      }
      setDubMap(newMap)
    }

    fetchDubs()
  }, [recommendations])
```

to:

```jsx
  useEffect(() => {
    if (!recommendations || recommendations.length === 0) return

    if (favoriteDub === 'nenhuma') {
      setDubMap(new Map())
      return
    }

    const fetchDubs = async () => {
      // Fetch up to 100 recommendations
      const ids = recommendations.slice(0, 100).map((r) => r.id)

      const newMap = new Map()
      // Fetch in chunks of 50
      for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50)
        const chunkMap = await fetchDubInfo(chunk, favoriteDub)
        for (const [key, val] of chunkMap.entries()) {
          newMap.set(key, val)
        }
      }
      setDubMap(newMap)
    }

    fetchDubs()
  }, [recommendations, favoriteDub])
```

Change the `displayRecommendations` `useMemo` from:

```jsx
  const displayRecommendations = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return []

    const list = [...recommendations].map((rec) => {
      const hasDub = dubMap.get(rec.id) ?? false
      const adjustedScore = hasDub && !ignoreDub ? Math.min(10, rec.predictedScore + 0.1) : rec.predictedScore
      return {
        ...rec,
        predictedScore: adjustedScore,
      }
    })

    return list.sort((a, b) => {
```

to:

```jsx
  const displayRecommendations = useMemo(() => {
    if (!recommendations || recommendations.length === 0) return []

    const list = [...recommendations].map((rec) => {
      const hasDub = dubMap.get(rec.id) ?? false
      const adjustedScore = hasDub && !ignoreDub ? Math.min(10, rec.predictedScore + 0.1) : rec.predictedScore
      return {
        ...rec,
        predictedScore: adjustedScore,
      }
    })

    const sorted = list.sort((a, b) => {
```

and change the closing of that same block, from:

```jsx
      // default: predicted score
      if (b.predictedScore !== a.predictedScore) {
        return (b.predictedScore || 0) - (a.predictedScore || 0)
      }
      return (b.communityScore || 0) - (a.communityScore || 0)
    })
  }, [recommendations, dubMap, ignoreDub, sortBy])
```

to:

```jsx
      // default: predicted score
      if (b.predictedScore !== a.predictedScore) {
        return (b.predictedScore || 0) - (a.predictedScore || 0)
      }
      return (b.communityScore || 0) - (a.communityScore || 0)
    })

    if (favoriteDub !== 'nenhuma' && showOnlyFavoriteDub) {
      return sorted.filter((rec) => dubMap.get(rec.id) === true)
    }

    return sorted
  }, [recommendations, dubMap, ignoreDub, sortBy, favoriteDub, showOnlyFavoriteDub])
```

Change the header/checkbox JSX from:

```jsx
        <label className="dub-toggle">
          <input
            type="checkbox"
            checked={ignoreDub}
            onChange={(e) => setIgnoreDub(e.target.checked)}
          />
          Ignorar bônus de dublagem
        </label>
      </div>
      <div className="recommendation-grid__grid">
        {displayRecommendations.map((rec) => (
          <AnimeCard
            key={rec.id}
            anime={rec}
            hasDub={dubMap.get(rec.id) ?? false}
          />
        ))}
      </div>
```

to:

```jsx
        {favoriteDub !== 'nenhuma' && (
          <>
            <label className="dub-toggle">
              <input
                type="checkbox"
                checked={ignoreDub}
                onChange={(e) => setIgnoreDub(e.target.checked)}
              />
              Ignorar bônus de dublagem
            </label>
            <label className="dub-toggle">
              <input
                type="checkbox"
                checked={showOnlyFavoriteDub}
                onChange={(e) => setShowOnlyFavoriteDub(e.target.checked)}
              />
              Mostrar somente com minha dublagem favorita
            </label>
          </>
        )}
      </div>
      <div className="recommendation-grid__grid">
        {displayRecommendations.map((rec) => (
          <AnimeCard
            key={rec.id}
            anime={rec}
            hasDub={dubMap.get(rec.id) ?? false}
            dubLanguage={favoriteDub === 'nenhuma' ? 'pt-br' : favoriteDub}
          />
        ))}
      </div>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/RecommendationGrid.test.jsx`
Expected: PASS.

- [ ] **Step 5: Run the full test suite to confirm no regressions**

Run: `npx vitest run`
Expected: PASS — all existing and new tests green (including `App.test.jsx`, `Dashboard.test.jsx`, `AnimeCard.test.jsx`, `anilist.test.js`, `SettingsMenu.test.jsx`).

- [ ] **Step 6: Commit**

```bash
git add src/components/RecommendationGrid.jsx src/components/RecommendationGrid.test.jsx
git commit -m "feat: apply favorite dub language to bonus, sort, badge and filter"
```

---

## Final Verification

- [ ] **Run the complete test suite one more time**

Run: `npx vitest run`
Expected: All test files pass.

- [ ] **Manual smoke test**

Run: `npm run dev`, open the app, log in, click the ⚙️ icon next to the theme toggle, select a dub language (e.g. "Japonês"), and confirm:
1. The select shows the chosen value after closing/reopening the panel (persisted via `localStorage`).
2. Recommendation cards that have that dub show the "🎙️ Dublado Japonês" badge.
3. The "Mostrar somente com minha dublagem favorita" checkbox appears and filters the grid when checked.
4. Reloading the page keeps the previously chosen language selected.
