# Implementation Plan: Fase 4.1 — Estabilidade, Bugs de UI e Atualização de Lista (forceRefresh)

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os bugs de UI/Hooks em `RecommendationGrid` e `AnimeCard`, e implementar a opção de atualizar a lista (forçar sincronização furando o cache) na tela de Dashboard.

**Architecture:** Mover a chamada do `useMemo` em `RecommendationGrid.jsx` para garantir conformidade com as regras dos React Hooks. Ajustar checagem de nota 0 em `AnimeCard.jsx`. Expandir a ação de login em `App.jsx` para aceitar opções de re-busca e expor um botão de sincronização no `Dashboard.jsx`.

**Architecture Diagram:**

```mermaid
graph TD
    subgraph "Dashboard UI"
        D[Dashboard.jsx] --> |clique em 'Atualizar'| A[App.jsx]
        D --> R[RecommendationGrid.jsx]
        R --> C[AnimeCard.jsx]
    end

    subgraph "Data & API Layer"
        A --> |handleLogin(user, { forceRefresh: true })| API[anilist.js: fetchAllLists]
        API --> |Bypasses localStorage| AniList[AniList GraphQL API]
    end
```

**Tech Stack:** React, Vite, Vitest, Testing Library.

## Global Constraints

- Manter compatibilidade com os testes unitários existentes.
- Executar `npm test` para verificação TDD a cada passo.

---

### Task 1: Fix Rules of Hooks in `RecommendationGrid.jsx`

**Files:**
- Modify: [`src/components/RecommendationGrid.jsx`](file:///C:/Sistemas/Projetos/animes/src/components/RecommendationGrid.jsx)
- Test: [`src/components/__tests__/RecommendationGrid.test.jsx`](file:///C:/Sistemas/Projetos/animes/src/components/__tests__/RecommendationGrid.test.jsx) (se existir ou criar teste simples em `App.test.jsx`)

**Interfaces:**
- Consumes: `recommendations`, `isLoading`, `sortBy`
- Produces: Grid de `AnimeCard` renderizado de forma estável.

- [ ] **Step 1: Write the failing unit test or verify hook condition**

Verificar se a ordem dos hooks causa instabilidade ou criar/executar o teste Vitest:
`npx vitest run src/App.test.jsx`

- [ ] **Step 2: Adjust `RecommendationGrid.jsx` to move `useMemo` before conditional returns**

```jsx
// src/components/RecommendationGrid.jsx
export default function RecommendationGrid({ recommendations = [], isLoading = false, sortBy = 'predicted' }) {
  const [dubMap, setDubMap] = useState(new Map())
  const [ignoreDub, setIgnoreDub] = useState(false)

  useEffect(() => {
    if (recommendations.length === 0) return

    const fetchDubs = async () => {
      const ids = recommendations.slice(0, 100).map((r) => r.id)
      const newMap = new Map()
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
      if (sortBy === 'community') {
        if (b.communityScore !== a.communityScore) {
          return (b.communityScore || 0) - (a.communityScore || 0)
        }
        return (b.predictedScore || 0) - (a.predictedScore || 0)
      }
      if (sortBy === 'title') {
        return (a.title || '').localeCompare(b.title || '')
      }
      if (b.predictedScore !== a.predictedScore) {
        return (b.predictedScore || 0) - (a.predictedScore || 0)
      }
      return (b.communityScore || 0) - (a.communityScore || 0)
    })
  }, [recommendations, dubMap, ignoreDub, sortBy])

  if (isLoading) {
    return (
      <section className="recommendation-grid">
        <h2 className="recommendation-grid__title">Calculando suas Recomendações...</h2>
        <div className="recommendation-grid__grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </section>
    )
  }

  if (recommendations.length === 0) {
    return (
      <section className="recommendation-grid">
        <h2 className="recommendation-grid__title">Sem recomendações no momento</h2>
        <p>Adicione mais animes na sua lista "Plan to Watch" no AniList!</p>
      </section>
    )
  }

  // Render ...
```

- [ ] **Step 3: Run Vitest to verify all tests pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/RecommendationGrid.jsx
git commit -m "fix(grid): move useMemo before conditional returns to comply with rules of hooks"
```

---

### Task 2: Fix 0 Score Check and Improve Accessibility in `AnimeCard.jsx`

**Files:**
- Modify: [`src/components/AnimeCard.jsx`](file:///C:/Sistemas/Projetos/animes/src/components/AnimeCard.jsx)

- [ ] **Step 1: Update condition checks for score rendering**

```diff
-        {anime?.predictedScore && (
+        {anime?.predictedScore != null && (
          <p className="anime-card__predicted">
            Match: {(anime.predictedScore).toFixed(2)}/10
          </p>
        )}
-        {anime?.communityScore && (
+        {anime?.communityScore != null && (
          <p className="anime-card__community">
            Comunidade: {(anime.communityScore).toFixed(2)}/10
          </p>
        )}
```

- [ ] **Step 2: Improve accessibility attribute `title`**

```diff
    <article
      className="anime-card"
      onClick={handleCardClick}
      style={{ cursor: 'pointer' }}
-     title={anime?.description || title}
+     title={title}
    >
```

- [ ] **Step 3: Run tests**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/components/AnimeCard.jsx
git commit -m "fix(card): fix zero score display check and clean title attribute for a11y"
```

---

### Task 3: Add `forceRefresh` Button to Dashboard and Support in `App.jsx`

**Files:**
- Modify: [`src/App.jsx`](file:///C:/Sistemas/Projetos/animes/src/App.jsx)
- Modify: [`src/components/Dashboard.jsx`](file:///C:/Sistemas/Projetos/animes/src/components/Dashboard.jsx)

- [ ] **Step 1: Modify `App.jsx` to pass `options` to `fetchAllLists` and export `handleRefresh`**

```jsx
  async function handleLogin(inputUsername, options = {}) {
    setIsLoading(true)
    setError(null)

    try {
      const entries = await fetchAllLists(inputUsername, options)

      const planning = entries.filter((e) => e.status === 'PLANNING')
      if (planning.length === 0) {
        setError("Adicione animes à sua lista 'Planning' no AniList.")
        setIsLoading(false)
        return
      }

      setUsername(inputUsername)
      setAllEntries(entries)
      setScreen('dashboard')
      addRecentUser(inputUsername)

      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('animatch_username', inputUsername)
      }

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
    if (username) {
      handleLogin(username, { forceRefresh: true })
    }
  }
```

E repassar `onRefresh={handleRefresh}` e `isLoading={isLoading}` para o `<Dashboard />`.

- [ ] **Step 2: Add "Atualizar Lista" button in `Dashboard.jsx` header**

```jsx
export default function Dashboard({ allEntries = [], username, onLogout, onRefresh, isLoading }) {
  // ...
  // No header:
  <button
    type="button"
    onClick={onRefresh}
    disabled={isLoading}
    style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--color-border)',
      color: 'var(--text-1)',
      padding: 'var(--space-2) var(--space-3)',
      borderRadius: 'var(--radius-md)',
      fontSize: 'var(--text-sm)',
      cursor: isLoading ? 'not-allowed' : 'pointer',
      opacity: isLoading ? 0.7 : 1,
    }}
    title="Forçar atualização da lista com o AniList"
  >
    {isLoading ? '⏳ Atualizando...' : '🔄 Atualizar Lista'}
  </button>
```

- [ ] **Step 3: Run Vitest to verify all tests pass**

Run: `npm test`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/App.jsx src/components/Dashboard.jsx
git commit -m "feat(dashboard): add force refresh button to re-sync data with AniList API"
```
