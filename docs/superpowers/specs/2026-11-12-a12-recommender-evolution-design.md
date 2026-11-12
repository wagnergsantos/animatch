# Design Document — A12: Evolução do Algoritmo de Recomendação

**Data:** 12 de novembro de 2026  
**Status:** Aprovado para Planejamento  
**Issue vinculada:** #23  
**Arquivos de impacto:**
- `src/logic/recommender.js`
- `src/logic/recommender.test.js`
- `src/logic/streaming.js`
- `src/logic/streaming.test.js`
- `src/hooks/useRecommendationPipeline.js`

---

## 1. Contexto & Motivação

O motor de recomendação do AniMatch calcula o perfil de gosto do usuário com média Bayesiana e Lower Bound (`C=25`), gerando notas previstas para obras da lista *Plan to Watch*. A revisão técnica identificou quatro oportunidades de aprimoramento matemático:

1. **Média simples de gêneros desconsidera volume:** Se um anime possui dois gêneros coincidentes (ex.: Ação com 50 animes assistidos vs Psicológico com apenas 2), ambos tinham peso de 50% na nota base (`baseTasteScore`), distorcendo a nota para baixo por amostras marginais.
2. **Pesos híbridos engessados:** A proporção `85% gosto pessoal + 15% comunidade` estava hardcoded na função `scoreRecommendations()`, impedindo customizações e testes paramétricos.
3. **Assimetria nos boosts:** O boost multi-provedor (`applyMultiPresenceBoost`) utiliza abordagem multiplicativa com teto estrito em 10.0, enquanto o boost de streaming (`applyStreamingBoost`) utilizava soma aditiva `+0.3` sem teto, permitindo notas acima de 10.0.
4. **Descarte de animes sem média comunitária:** Obras já lançadas sem `averageScore` na API externa (clássicos cult, obras independentes ou lançamentos recentes com poucas avaliações públicas) eram descartadas de `isEligiblePlanningMedia()`, tornando-se invisíveis mesmo quando compatíveis com o gosto do usuário.

---

## 2. Decisões de Design

### 2.1 Ponderação Sublinear de Gêneros por Volume
Em `scoreRecommendations()`, a nota base do gosto (`baseTasteScore`) passa a ponderar as notas de cada gênero coincidente pela raiz quadrada do volume de avaliações do usuário naquele gênero:
$$w_g = \sqrt{\max(1, \text{scoredCount}_g)}$$
$$\text{baseTasteScore} = \frac{\sum (s_g \cdot w_g)}{\sum w_g}$$

- **Por que raiz quadrada?** Evita tanto a média ingênua (onde 2 avaliações pesam igual a 100) quanto a dominância excessiva de gêneros massivos (onde 300 avaliações esmagariam gêneros secundários legítimos).
- **Fallback:** Se `scoredCount` for nulo ou ausente, adota $w_g = 1$, preservando comportamento uniforme.

### 2.2 Pesos Híbridos Configuráveis com Valores Padrão
Constantes nomeadas exportadas:
```javascript
export const DEFAULT_TASTE_WEIGHT = 0.85
export const DEFAULT_COMMUNITY_WEIGHT = 0.15
```
A função `scoreRecommendations(planningEntries, tasteProfile, selectedGenre, options)` passa a receber `options = {}`:
```javascript
const tasteWeight = Number.isFinite(options.tasteWeight) ? options.tasteWeight : DEFAULT_TASTE_WEIGHT
const communityWeight = Number.isFinite(options.communityWeight) ? options.communityWeight : DEFAULT_COMMUNITY_WEIGHT
```

### 2.3 Padronização do Boost de Streaming
Em `src/logic/streaming.js`:
- Constante: `STREAMING_BOOST_MULTIPLIER = 1.02` (+2% de impulso para animes disponíveis nos streamings ativos do usuário).
- Novo cálculo:
$$\text{predictedScore}_{\text{boosted}} = \min(10.0, \text{round}_2(\text{predictedScore} \cdot 1.02))$$
- Alinhamento pleno com a regra de teto do `applyMultiPresenceBoost()`.

### 2.4 Resgate e Recomendação de Obras sem Nota Comunitária
- Em `isEligiblePlanningMedia(entry, tasteProfile)`:
  - Condição de lançamento: `entry.media.status !== 'NOT_YET_RELEASED'` (obras futuras não lançadas continuam filtradas).
  - Condição de nota:
    - Se `media.averageScore > 0`: elegível normalmente.
    - Se `media.averageScore == null || media.averageScore === 0`: elegível caso o usuário possua ao menos um gênero coincidente no `tasteProfile`.
- Cálculo da nota prevista para obras sem média comunitária:
  - `predictedScore = baseTasteScore`
  - `communityScore = null`
  - `predictionSource = 'taste'`
  - Interface exibe indicador neutro de comunidade (`-` ou `Sem nota`) sem prejudicar a ordenação.

---

## 3. Arquitetura e Contrato das Funções

### `src/logic/recommender.js`
- Adicionar helper puro:
  `calculateWeightedGenreAverage(scoredMatchingGenres, tasteProfile)`
- Atualizar `isEligiblePlanningMedia(entry, tasteProfile)` e `isEligiblePlanningEntry(entry, tasteProfile)`
- Atualizar `scoreRecommendations(planningEntries, tasteProfile, selectedGenre, options)`
- Exportar:
  - `DEFAULT_TASTE_WEIGHT`
  - `DEFAULT_COMMUNITY_WEIGHT`
  - `calculateWeightedGenreAverage`

### `src/logic/streaming.js`
- Exportar:
  - `STREAMING_BOOST_MULTIPLIER = 1.02`
- Atualizar `applyStreamingBoost(recommendations, userSubscriptions, options)` com teto rígido em 10.0 e arredondamento a 2 casas decimais.

### `src/hooks/useRecommendationPipeline.js`
- Passar `tasteProfile` para `isEligiblePlanningEntry(entry, tasteProfile)` e permitir `options` com pesos híbridos.

---

## 4. Estratégia de Testes

1. **Testes Unitários em `recommender.test.js`:**
   - Testar `calculateWeightedGenreAverage` com raiz quadrada de contagens discrepantes (ex.: 50 vs 2 amostras).
   - Testar `scoreRecommendations` com `options: { tasteWeight: 0.7, communityWeight: 0.3 }`.
   - Testar recomendação de anime sem `averageScore` (assegurar que `predictedScore === baseTasteScore` e `communityScore === null`).
   - Atualizar testes antigos que usavam expectativas numéricas fixas de média simples para os novos valores ponderados.
2. **Testes Unitários em `streaming.test.js`:**
   - Testar `applyStreamingBoost` com nota 9.9 garantindo que o teto 10.0 não é ultrapassado.
   - Testar incremento proporcional `score * 1.02`.
3. **Testes de Integração em `useRecommendationPipeline.test.js` e `Dashboard.test.jsx`:**
   - Garantir que a suíte completa de 437 testes passe sem falhas ou warnings.

---

## 5. Checklist de Conclusão da Spec
- [x] Zero placeholders (TODO/TBD)
- [x] Sem contradições de arquitetura
- [x] Escopo delimitado ao algoritmo (sem refatorações não relacionadas)
- [x] Contratos de API interna explícitos e retrocompatíveis
