# Substituir barra TasteProfile por ordenação de gêneros por afinidade/nota no filtro Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remover a barra "O que você mais gosta" (`TasteProfile`) da tela principal de recomendações e integrar a ordenação por afinidade/nota diretamente no filtro de gêneros (`FilterBar`), com ordenação por nota como padrão e alternador para A-Z.

**Issue:** Ref #35

---

### Task 1: Enriquecer `availableGenres` nos hooks de recomendação com a nota do `tasteProfile`

**Files to modify:**
- `src/hooks/useProgressiveRecommendationPipeline.js`
- `src/hooks/useRecommendationPipeline.js`
- `src/hooks/useProgressiveRecommendationPipeline.test.js`
- `src/hooks/useRecommendationPipeline.test.js`

**Step 1:** Adicionar teste unitário em `useProgressiveRecommendationPipeline.test.js` e `useRecommendationPipeline.test.js` validando que cada item de `availableGenres` possui a propriedade `score` correspondente à nota ajustada/média do `tasteProfile` (ou `null` se o gênero não foi avaliado).
**Step 2:** Executar testes para confirmar falha nos novos asserts.
**Step 3:** Atualizar o cálculo de `availableGenres` em `useProgressiveRecommendationPipeline.js` e `useRecommendationPipeline.js` para mapear `{ name, count, score }` usando `tasteProfile.get(name)`.
**Step 4:** Executar testes para garantir sucesso.
**Step 5:** Commit: `feat(pipeline): enrich availableGenres with tasteProfile score (Ref #35)`

---

### Task 2: Implementar ordenação por afinidade e toggle no `FilterBar`

**Files to modify:**
- `src/lib/storageKeys.js`
- `src/components/FilterBar.jsx`
- `src/components/FilterBar.module.css`
- `src/locales/pt-BR.json`
- `src/locales/en.json`
- `src/locales/ja.json`
- `src/components/FilterBar.test.jsx`

**Step 1:** Adicionar chave `GENRE_SORT_MODE: 'animatch_genre_sort_mode'` em `src/lib/storageKeys.js`.
**Step 2:** Adicionar chaves de i18n nos arquivos `src/locales/*.json` para os labels e tooltips do alternador de ordenação de gênero.
**Step 3:** Escrever testes em `src/components/FilterBar.test.jsx` testando:
  - Ordenação padrão por nota (`genreSortMode="score"`): gêneros com maior score no topo com `★ score.toFixed(2)` no label, seguidos por gêneros sem nota.
  - Alternância para ordem alfabética (`genreSortMode="alphabetical"`): gêneros ordenados por A-Z.
  - Disparo de `onGenreSortModeChange` ao clicar no botão de toggle.
**Step 4:** Executar testes e confirmar falha.
**Step 5:** Implementar o toggle e a ordenação em `FilterBar.jsx` e estilizar o botão em `FilterBar.module.css`.
**Step 6:** Executar testes do `FilterBar` e confirmar aprovação.
**Step 7:** Commit: `feat(filter): add affinity score sort and toggle to genre filter (Ref #35)`

---

### Task 3: Remover `TasteProfile` do `Dashboard.jsx` e conectar estado de ordenação

**Files to modify:**
- `src/components/Dashboard.jsx`
- `src/components/Dashboard.test.jsx`

**Step 1:** Atualizar `Dashboard.test.jsx` substituindo os testes que dependiam da presença da barra `TasteProfile` para validar a remoção da barra e a integração da ordenação de gêneros no filtro.
**Step 2:** Executar testes para confirmar falha.
**Step 3:** Em `Dashboard.jsx`:
  - Remover a renderização do componente `<TasteProfile ... />` e o handler `handleTasteProfileGenreClick`.
  - Adicionar estado persistido `const [genreSortMode, setGenreSortMode] = useLocalStorage(STORAGE_KEYS.GENRE_SORT_MODE, 'score')`.
  - Passar `genreSortMode` e `onGenreSortModeChange={setGenreSortMode}` para `<FilterBar />`.
**Step 4:** Executar `npm test` em `src/components/Dashboard.test.jsx`.
**Step 5:** Commit: `refactor(dashboard): remove TasteProfile bar and connect genre sort mode (Ref #35)`

---

### Task 4: Validação geral, linting e encerramento da issue

**Files to check:**
- Executar suíte completa de testes: `npm test`
- Executar linter: `npm run lint`
- Fechar issue no GitHub: `gh issue close 35`
- Commit final / verificação de git status.
