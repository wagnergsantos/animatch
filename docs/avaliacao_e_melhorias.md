# Avaliação Geral e Propostas de Melhoria — AniMatch

> **Projeto:** AniMatch ([wagnergsantos/animatch](https://github.com/wagnergsantos/animatch/))  
> **Data de Consolidação:** 31/07/2026  
> **Status:** Fases 1 a 3 concluídas | Fase 4 em planejamento (Bugs, Otimizações & Qualidade)

---

## 🎯 Visão Geral do Projeto

O **AniMatch** é uma aplicação web React que recomenda animes aos usuários com base em seus perfis do AniList utilizando **Média Bayesiana** para calcular pontuações previstas.

* **Arquitetura & Design:** Separação limpa (`api/`, `logic/`, `components/`), CSS puro utilizando variáveis nativas e **OKLCH**, animações e loaders fluidos (Skeleton Loading).
* **Testes & Cobertura:** Suíte unitária com Vitest + Testing Library e mocks da API AniList.

---

## 🛑 1. Bugs Identificados no Estado Atual

| # | Bug | Impacto | Local | Solução Recomendada |
|---|---|---|---|---|
| **B1** | **Hook Condicional** | Alto (Crash / Estado inconsistente) | `RecommendationGrid.jsx` | Mover `useMemo` para antes dos retornos condicionais (`if (loading)`, `if (empty)`). |
| **B2** | **Nota 0 Invisível nos Cards** | Médio (UX / Exibição incorreta) | `AnimeCard.jsx` | Trocar checagem de truthiness (`&&`) por checagem estrita (`!= null`). |
| **B3** | **Parâmetro `forceRefresh` Órfão** | Médio (Funcionalidade inacessível) | `anilist.js` / UI | Conectar um botão "Atualizar Lista" no Dashboard que passe `{ forceRefresh: true }`. |

---

## 💡 2. Oportunidades de Melhoria & Funcionalidades (Fase 4)

### A. Experiência do Usuário (UX) e Filtros
1. **Botão "Atualizar Lista":** Permitir re-sincronizar os dados com o AniList furando o cache de 5min sem precisar limpar o `localStorage`.
2. **Gêneros Dinâmicos no `FilterBar`:** Derivar gêneros disponíveis diretamente do `tasteProfile` ou da lista retornada, em vez de depender da lista fixa de 8 gêneros.
3. **Filtro & Ordenação por Ano:** Permitir filtrar e ordenar por ano de lançamento (`seasonYear`), que já é retornado pela API.
4. **Busca Ampliada:** Expandir a busca de texto para considerar sinopse/descrição e gêneros, além dos títulos.

### B. Consistência Algorítmica & Cache
5. **Integração do Slider de Confiança Bayesian C:** Conectar a constante $C$ alterada na tela de estatísticas diretamente ao motor de recomendação (`recommender.js`).
6. **Cache Local para Dublagem (`fetchDubInfo`):** Salvar as informações de dublagem no `localStorage` com TTL longo para evitar chamadas de rede redundantes.

### C. Qualidade de Código, Performance & Acessibilidade (a11y)
7. **Desduplicação da Agregação de Gêneros:** Criar `genreStats.js` compartilhado entre `recommender.js` e `analytics.js`.
8. **Resiliência de Rede & Cancelamento:** Adicionar `AbortController` nos `useEffect` e timeout na camada de fetch.
9. **Acessibilidade do Modal:** Implementar *focus trap* e `aria-modal="true"` no `GenreRecommendationModal.jsx`.
10. **Adoção Gradual de TypeScript:** Tipar primeiramente as camadas de dados puras (`logic/` e `api/`).
11. **CI via GitHub Actions:** Workflow automático rodando `lint`, `test` e `build` nos PRs.

---

## 📋 Roteiro de Execução Recomendado (Fase 4)

1. **Sprint 1 — Correção de Bugs & Botão Refresh (Prioridade Máxima)**
   * Corrigir Hook condicional em `RecommendationGrid.jsx` (B1).
   * Corrigir nota 0 em `AnimeCard.jsx` (B2).
   * Adicionar botão "Atualizar Lista" no Dashboard e integrar `forceRefresh` (B3).
2. **Sprint 2 — Filtros Otimizados & Cache Complementar**
   * Implementar gêneros dinâmicos no `FilterBar`.
   * Adicionar filtro por ano (`seasonYear`) e busca ampliada.
   * Adicionar cache com TTL para o `fetchDubInfo`.
3. **Sprint 3 — Consistência Algorítmica & Qualidade / a11y**
   * Conectar slider Bayesian C ao recomendador.
   * Extrair agregador comum de gêneros (`genreStats.js`).
   * Adicionar `AbortController` e foco acessível no modal.
   * Configurar CI no GitHub Actions.

---
