# Spec: Perfil de Gosto e Recomendações Ponderadas por Média Bayesiana

## 1. Visão Geral e Objetivo

Ajustar o cálculo do Perfil de Gosto (`buildTasteProfile`) e a pontuação de Recomendações (`scoreRecommendations`) para levar em consideração o **volume/quantidade de animes assistidos por gênero** utilizando **Média Bayesiana (Suavização por Confiança)**.

Gêneros com amostra menor de avaliações (ex: 15 animes de Thriller) terão suas médias levemente suavizadas em direção à média global do usuário, permitindo que gêneros com grande amostra e consistência (ex: 114 animes de Fantasia) recebam o devido destaque no ranking e na pontuação de recomendações.

---

## 2. Alterações nas Fórmulas e Lógica (`src/logic/recommender.js`)

### 2.1 Média Global do Usuário (`userGlobalAverage`)

Antes de agrupar por gênero, calcular a média global de todas as avaliações VÁLIDAS do usuário (`score > 0`):

$$\text{userGlobalAverage} = \frac{\sum \text{todas as notas } > 0 \text{ na biblioteca completada}}{\text{quantidade total de animes avaliados com nota } > 0}$$

Se o usuário não possuir nenhuma avaliação com nota > 0, `userGlobalAverage` assume o valor padrão de `7.0`.

### 2.2 Média Bayesiana por Gênero (`adjustedAverage`)

Para cada gênero, além da média aritmética real (`average`), calcular a **Média Ajustada (Bayesiana)**:

$$\text{adjustedAverage} = \frac{C \cdot \text{userGlobalAverage} + \sum \text{notas do gênero}}{C + \text{scoredCount}}$$

Onde:
- **$C$** (Constante de peso de confiança) = **$5$**
- **$\text{scoredCount}$**: quantidade de animes completados com nota > 0 naquele gênero.
- **$\text{count}$**: quantidade total de animes completados naquele gênero (mesmo sem nota).
- **$\text{average}$**: média aritmética real das notas do gênero.

### 2.3 Estrutura do TasteProfile Map

O `Map` retornado por `buildTasteProfile(completedEntries)` conterá:

```js
profile.set(genre, {
  average: Math.round((stats.total / stats.scoredCount) * 10) / 10,       // Média real
  adjustedAverage: Math.round(adjustedAverage * 10) / 10,                 // Média Bayesiana (para ordenação/match)
  count: stats.count,                                                     // Total completados
  scoredCount: stats.scoredCount,                                         // Total avaliados
})
```

### 2.4 Reordenação no Perfil e Pontuação de Recomendações

1. **badges no `TasteProfile.jsx`**:
   - Ordenados por `adjustedAverage` (decrescente).
   - O badge continua exibindo a `average` real e a quantidade para o usuário.
2. **`scoreRecommendations`**:
   - Calcula a pontuação prevista do anime utilizando a média do `adjustedAverage` dos gêneros correspondentes em vez de `average`.

---

## 3. Matriz de Testes (TDD)

- `buildTasteProfile`:
  - Calcula a `userGlobalAverage` corretamente.
  - Calcula `adjustedAverage` com $C = 5$.
  - Verifica que gênero com alto volume (ex: 114 animes, média 8.2) fica acima de gênero com baixo volume (ex: 15 animes, média 8.3) se a média Bayesiana do primeiro for maior.
- `scoreRecommendations`:
  - Utiliza `adjustedAverage` para pontuação das recomendações.
