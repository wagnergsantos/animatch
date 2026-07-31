# Spec: Ajuste de Precisão (2 Casas Decimais), C=15 e Exibição Dinâmica do Perfil de Gosto

## 1. Visão Geral e Objetivo

1. **Constante de Confiança $C = 15$**: Ajustar a constante de suavização por amostragem para $C = 15$ em `src/logic/recommender.js`, proporcionando maior estabilidade estatística em perfis com grande volume de animes assistidos.
2. **Precisão de 2 Casas Decimais**: Exibir notas no formato com 2 casas decimais (ex: `8.28/10` nas recomendações e `Adventure ★ 8.29 (113)` nos badges do Perfil de Gosto).
3. **Exibição Dinâmica no Perfil de Gosto (`TasteProfile.jsx`)**:
   - Exibir todos os gêneros com nota ajustada (Bayesiana) $\ge 8.00$.
   - Garantir um **mínimo de 5 gêneros** (se houver menos de 5 gêneros com nota $\ge 8.00$, incluir os próximos gêneros de maior nota até completar 5).
   - Se houver 5 ou mais gêneros com nota $\ge 8.00$, exibir todos eles.
   - Gêneros com nota $\ge 8.00$ recebem o estilo `taste-badge--filled`, enquanto os demais (caso incluídos para fechar o mínimo de 5) recebem `taste-badge--outline`.

---

## 2. Detalhamento Técnico

### 2.1 Média Bayesiana com $C = 15$ (`src/logic/recommender.js`)
- Alterar `CONFIDENCE_CONSTANT` de `5` para `15`.
- Arredondar `average` e `adjustedAverage` para 2 casas decimais (`Math.round(val * 100) / 100`) ou manter precisão suficiente para `toFixed(2)`.

### 2.2 Recomendações e Renderização (`AnimeCard.jsx`)
- Formatar Match e Comunidade com 2 casas decimais:
  - `Match: {(anime.predictedScore ?? 0).toFixed(2)}/10`
  - `Comunidade: {(anime.communityScore ?? 0).toFixed(2)}/10`

### 2.3 Perfil de Gosto Dinâmico (`TasteProfile.jsx`)
- Lógica de seleção dos badges:
  ```js
  const sorted = entries.sort((a, b) => {
    const scoreA = a[1]?.adjustedAverage ?? a[1]?.average ?? 0
    const scoreB = b[1]?.adjustedAverage ?? b[1]?.average ?? 0
    if (scoreB !== scoreA) return scoreB - scoreA
    return (b[1]?.count ?? 0) - (a[1]?.count ?? 0)
  })

  // Seleciona gêneros com score >= 8.00 ou garante no mínimo 5 gêneros
  const countAbove8 = sorted.filter(([_, stats]) => (stats.adjustedAverage ?? stats.average) >= 8.00).length
  const limit = Math.max(5, countAbove8)
  const displayBadges = sorted.slice(0, limit)
  ```
- Estilo dos badges:
  - `isFilled = (stats.adjustedAverage ?? stats.average) >= 8.00`
  - `className={`taste-badge ${isFilled ? 'taste-badge--filled' : 'taste-badge--outline'}`}`

---

## 3. Matriz de Testes (TDD)

- `recommender.test.js`: Atualizar testes para verificar $C = 15$ e precisão de 2 casas decimais.
- `TasteProfile.test.jsx`:
  - Testar quando há 3 gêneros $\ge 8.00$ -> exibe 5 gêneros (top 3 preenchidos, 2 adicionais em outline).
  - Testar quando há 7 gêneros $\ge 8.00$ -> exibe todos os 7 gêneros preenchidos.
- `Dashboard.test.jsx` e `AnimeCard.test.jsx`: Verificar renderização com 2 casas decimais.
- `App.test.jsx`: Verificar integração completa.
