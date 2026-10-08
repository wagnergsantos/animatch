# B1.1 + Row Expansion: Visão em Linhas Expansíveis e Consolidação da Justificativa Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unificar toda a justificativa de recomendação em `RecommendationReason.jsx` e criar o modo de visualização em Lista/Tabela com linhas expansíveis (Accordion inline), mantendo notas/scores visíveis no topo e detalhes revelados ao expandir.

**Architecture:**
- `RecommendationReason.jsx`: consolida frase síntese, decomposição 85%/15%, breakdown de gêneros e animes âncora.
- `AnimeRow.jsx`: componente de linha horizontal com scores/badges à vista e painel accordion expansível contendo `RecommendationReason.jsx`, sinopse e streaming.
- `RecommendationGrid.jsx` + `FilterBar.jsx`: toggle de visualização (Grid ⊞ / Lista ☰) com persistência no `localStorage`.
- `AnimeDetailModal.jsx`: consome a nova versão unificada sem seções duplicadas.

**Architecture Diagram:**

```mermaid
graph TD
    FilterBar[FilterBar / Header: Toggle Grid ⊞ vs Lista ☰] --> ViewState[viewMode: 'grid' | 'list']
    ViewState --> Grid[RecommendationGrid]
    Grid -->|viewMode === 'grid'| AnimeCard[AnimeCard + Modal com Reason unificado]
    Grid -->|viewMode === 'list'| AnimeRow[AnimeRow: Scores visíveis + Accordion inline com Reason/Sinopse/Links]
    AnimeCard --> Reason[RecommendationReason: Consolidado]
    AnimeRow --> Reason
```

## Global Constraints
- React 19, CSS Modules, i18next (pt-BR, en, ja), Vitest.

---

### Task 1: Consolidar `RecommendationReason.jsx` e limpar duplicidade no `AnimeDetailModal.jsx`

**Files:**
- Modify: `src/components/RecommendationReason.jsx`
- Modify: `src/components/RecommendationReason.module.css`
- Modify: `src/components/RecommendationReason.test.jsx`
- Modify: `src/components/AnimeDetailModal.jsx`

- [ ] **Step 1: Atualizar testes de `RecommendationReason.test.jsx` para cobrir pesos 85%/15% e chips de gênero**
- [ ] **Step 2: Implementar unificação em `RecommendationReason.jsx`**
- [ ] **Step 3: Remover seção redundante de breakdown em `AnimeDetailModal.jsx`**
- [ ] **Step 4: Executar testes de modal e reason (`npm run test`)**

---

### Task 2: Criar componente `AnimeRow.jsx` (Linha Expansível com Accordion)

**Files:**
- Create: `src/components/AnimeRow.jsx`
- Create: `src/components/AnimeRow.module.css`
- Create: `src/components/AnimeRow.test.jsx`

- [ ] **Step 1: Escrever testes unitários em `AnimeRow.test.jsx` (renderização compacta, toggle de expansão, acessibilidade por teclado)**
- [ ] **Step 2: Implementar `AnimeRow.jsx` e estilos CSS Modules responsivos**
- [ ] **Step 3: Executar testes de `AnimeRow.test.jsx`**

---

### Task 3: Integrar Toggle Grid/Lista em `FilterBar.jsx` e `RecommendationGrid.jsx`

**Files:**
- Modify: `src/components/FilterBar.jsx`
- Modify: `src/components/FilterBar.module.css`
- Modify: `src/components/RecommendationGrid.jsx`
- Modify: `src/components/RecommendationGrid.module.css`
- Modify: `src/components/Dashboard.jsx`
- Modify: `src/locales/{pt-BR,en,ja}.json`
- Test: `src/components/RecommendationGrid.test.jsx`
- Test: `src/components/FilterBar.test.jsx`

- [ ] **Step 1: Adicionar traduções de view mode em pt-BR, en, ja**
- [ ] **Step 2: Adicionar botões de toggle Grid / Lista no FilterBar/Dashboard com `useLocalStorage`**
- [ ] **Step 3: Atualizar `RecommendationGrid.jsx` para renderizar `AnimeRow` quando `viewMode === 'list'`**
- [ ] **Step 4: Executar suíte completa de testes (`npm run test` e `npm run lint`)**
- [ ] **Step 5: Commit semântico**
