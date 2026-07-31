# Design Spec: Fase 4.2 — Gêneros Dinâmicos, Filtros de Ano (com fallback nulo) e Cache de Dublagem

> **Data:** 2026-07-31  
> **Status:** Aprovado com Observação do Usuário  
> **Escopo:** Fase 4.2 do plano de melhorias do AniMatch

---

## 📌 Objetivos

1. **Gêneros Dinâmicos:** Substituir os 8 gêneros hardcoded no `FilterBar.jsx` por uma lista gerada dinamicamente com base nas recomendações do usuário.
2. **Filtros e Ordenação por Ano:**
   * Permitir filtrar por ano de lançamento (`seasonYear` ou `startDate.year`).
   * Adicionar opção para animes sem ano cadastrado ("Sem Ano").
   * Adicionar opções de ordenação por ano ("Ano: Mais Recente" e "Ano: Mais Antigo"), tratando `null`/`undefined` graciosamente no final da ordenação.
3. **Cache de Dublagem em `localStorage`:** Salvar as respostas de dublagem PT-BR em `localStorage` com TTL de 24h para evitar requisições repetidas ao AniList.

---

## 🏗️ Detalhamento dos Componentes

### 1. `src/api/anilist.js`
* Implementar `CACHE_KEY_DUB = 'animatch_dub_cache'`.
* Atualizar `fetchDubInfo(mediaIds)` para verificar e aproveitar IDs já salvos no cache de dublagem.
* Fazer o fetch GraphQL apenas dos IDs pendentes e atualizar o cache local em `localStorage`.

### 2. `src/components/FilterBar.jsx`
* Receber as props:
  * `availableGenres`: lista de strings de gêneros extraídos.
  * `availableYears`: lista de anos ordenados decrescente extraídos das recomendações.
  * `selectedYear`, `onSelectYear`.
* Renderizar dinamicamente as pílulas de gêneros e o `<select>` de anos (incluindo "Todos os Anos" e "Sem Ano").
* Adicionar as opções `year_desc` e `year_asc` no dropdown de ordenação (`sortBy`).

### 3. `src/components/Dashboard.jsx` & `src/components/RecommendationGrid.jsx`
* Extrair `availableGenres` e `availableYears` a partir de `planningEntries`.
* Aplicar o filtro por ano no `useMemo` de recomendações (`Dashboard.jsx`).
* Atualizar o `useMemo` de ordenação (`RecommendationGrid.jsx` / `Dashboard.jsx`) para suportar `year_desc` e `year_asc`.

---

## 🧪 Plano de Testes

* **`anilist.test.js`:** Verificar leitura e gravação do cache de dublagem em `localStorage`.
* **`FilterBar.test.jsx`:** Verificar renderização dinâmica de gêneros e opções de anos.
* **`Dashboard.test.jsx`:** Verificar filtragem e ordenação por ano (inclusive tratamento de animes com ano `null`).
