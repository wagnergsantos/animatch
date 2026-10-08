# Spec Técnica — Modo Lista/Tabela com Expansão em Linhas (Row Expansion Accordion)

- **Feature:** Modo de visualização em Lista com expansão inline (Accordion)
- **Status:** Proposta para aprovação
- **Data:** 08/10/2026

## 1. Visão Geral

Permitir ao usuário alternar entre o modo clássico de **Cards em Grid** (⊞) e o modo **Linhas Expansíveis** (☰). No modo lista/linha, cada anime ocupa uma linha compacta e clicável que expande suavemente um painel accordion com todos os detalhes (sinopse, justificativa B1 com animes âncora, streaming e links) sem abrir modal sobreposto.

---

## 2. Componentes e Estrutura

1. **Controle de Visualização (`viewMode`)**:
   - Alternância `grid` vs `list`.
   - Persistência no `localStorage` via hook `useLocalStorage('animatch_view_mode', 'grid')`.
   - Adicionado no `FilterBar.jsx` ou header do `RecommendationGrid.jsx`.

2. **Componente `AnimeRow.jsx`**:
   - Linha compacta horizontal:
     - Capa miniatura (48x68px).
     - Título, metadados (ano, episódios, status).
     - Tags de Match / Comunidade / Badges.
     - Síntese rápida da recomendação.
     - Chevron de expansão (▼/▲).
   - Painel de Expansão (Accordion):
     - Renderiza inline `RecommendationReason.jsx`.
     - Sinopse completa.
     - Gêneros e links de streaming / provedor.

3. **`RecommendationGrid.jsx`**:
   - Renderiza grid de `AnimeCard` quando `viewMode === 'grid'`.
   - Renderiza lista de `AnimeRow` quando `viewMode === 'list'`.
   - Suporta expandir múltiplas linhas ou modo acordeão simples.

---

## 3. i18n
- Chaves para alternador de visualização (`viewGrid`, `viewList`, `expandDetails`, `collapseDetails`).

---

## 4. Testes
- Testes unitários para `AnimeRow.test.jsx`.
- Testes de alternância de modo em `RecommendationGrid.test.jsx` e `FilterBar.test.jsx`.
