# Spec: Filtro de Animes Não Lançados e Cards Clicáveis do AniList

## 1. Visão Geral e Objetivo

1. **Filtrar Animes Não Lançados**: Desconsiderar animes da lista "Quero Assistir" (Planning) que ainda não foram lançados ou não possuem nota da comunidade (`averageScore === null` ou `averageScore === 0`).
2. **Cards Clicáveis**: Transformar cada `AnimeCard` em um link clicável (`<a>` com `target="_blank" rel="noopener noreferrer"`) direcionando para a página do anime no AniList (`siteUrl` ou `https://anilist.co/anime/${id}`).

---

## 2. Detalhamento das Alterações

### 2.1 API AniList (`src/api/anilist.js`)
- Incluir o campo `siteUrl` na `PLANNING_QUERY` GraphQL para obter a URL oficial do AniList.

### 2.2 Lógica de Recomendação (`src/logic/recommender.js`)
- Em `scoreRecommendations(planningEntries, tasteProfile)`:
  - Filtrar `planningEntries` ignorando qualquer entrada onde `media.averageScore == null` ou `media.averageScore === 0`.
  - Propagar `siteUrl: media.siteUrl || https://anilist.co/anime/${media.id}` no objeto de retorno do card.

### 2.3 Componente `AnimeCard` (`src/components/AnimeCard.jsx` e `AnimeCard.css`)
- O elemento raiz do `AnimeCard` passa a ser uma tag `<a>` clicável:
  ```jsx
  <a
    href={anime.siteUrl}
    target="_blank"
    rel="noopener noreferrer"
    className="anime-card"
  >
    ...
  </a>
  ```
- No `AnimeCard.css`:
  - `text-decoration: none;`
  - `color: inherit;`
  - `cursor: pointer;`
  - Manter transição com hover glow (`box-shadow: 0 0 20px 2px var(--color-primary-glow);`).

---

## 3. Matriz de Testes (TDD)

- **`anilist.test.js`**: Verificar que `siteUrl` é retornado na query de Planning.
- **`recommender.test.js`**: Verificar que `scoreRecommendations` filtra animes com `averageScore: null` ou `0`, e propaga `siteUrl`.
- **`Dashboard.test.jsx` / `AnimeCard.test.jsx`**: Verificar que o card renderiza a tag `<a>` com `href` correto, `target="_blank"` e `rel="noopener noreferrer"`.
- **`App.test.jsx`**: Verificar integração completa.
