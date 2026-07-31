# Design Spec: Fase 4.1 — Estabilidade, Bugs de UI e Atualização de Lista (forceRefresh)

> **Data:** 2026-07-31  
> **Status:** Aprovado  
> **Escopo:** Fase 4.1 do plano de melhorias do AniMatch

---

## 📌 Objetivos

1. **Garantir Conformidade com Rules of Hooks:** Mover a execução de `useMemo` em `RecommendationGrid.jsx` para antes dos retornos condicionais.
2. **Corrigir Exibição de Notas Zeradas:** Ajustar as checagens em `AnimeCard.jsx` de truthy (`&&`) para checagem estrita de não-nulo (`!= null`).
3. **Expor Sincronização em Tempo Real (forceRefresh):** Adicionar botão "Atualizar Lista" no Dashboard para forçar a re-busca de dados na API AniList ignorando o cache local.

---

## 🏗️ Alterações Arquiteturais & Componentes

### 1. `src/components/RecommendationGrid.jsx`
* Mover a chamada do `useMemo` de `displayRecommendations` para antes das checagens `if (isLoading)` e `if (recommendations.length === 0)`.
* Tratar lista vazia dentro da dependência ou cálculo do `useMemo`.

### 2. `src/components/AnimeCard.jsx`
* Alterar `anime?.predictedScore &&` por `anime?.predictedScore != null`.
* Alterar `anime?.communityScore &&` por `anime?.communityScore != null`.
* Melhorar atributo `title` para usar o título limpo do anime e mover descrição longa de forma acessível.

### 3. `src/App.jsx`
* Atualizar a função `handleLogin(inputUsername, options = {})` para aceitar parâmetros adicionais e repassá-los para `fetchAllLists(inputUsername, options)`.
* Passar uma callback `onRefresh` para o componente `Dashboard`.

### 4. `src/components/Dashboard.jsx`
* Receber a prop `onRefresh` e a flag `isRefreshing`.
* Adicionar um botão no cabeçalho: `🔄 Atualizar Lista` com suporte a feedback visual de carregamento.

---

## 🧪 Plano de Testes

* **Testes de Unidade:** Executar `npm test` para validar suíte Vitest.
* **Teste de Integração de Refresh:** Adicionar/atualizar teste verificando a chamada de `fetchAllLists` com `{ forceRefresh: true }`.
