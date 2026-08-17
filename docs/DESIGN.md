# Design da Arquitetura de Recomendação — AniMatch

## Algoritmo de Pontuação Prevista (`scoreRecommendations`)

O AniMatch calcula a nota prevista de cada anime na lista "Plan to Watch" combinando o perfil de gosto do usuário (gerado via média Bayesiana por gênero) com os gêneros do anime avaliado.

### 1. Previsão por Modelo Híbrido (`predictionSource: 'taste'`)
Quando o anime possui 1 ou mais gêneros presentes no perfil de gosto do usuário (`tasteProfile`), calcula-se a nota base do seu gosto ($\text{BaseTasteScore}$) como a média do `adjustedAverage` desses gêneros:

$$\text{BaseTasteScore} = \frac{\sum_{g \in \text{matchingGenres}} \text{adjustedAverage}(g)}{|\text{matchingGenres}|}$$

A pontuação final prevista ($\text{PredictedScore}$) combina $85\%$ do gosto pessoal com $15\%$ do filtro de realidade da nota comunitária:

$$\text{PredictedScore} = (\text{BaseTasteScore} \times 0.85) + (\text{CommunityScore} \times 0.15)$$

- **Badges de Discrepância/Destaque (`badges`)**:
  - `💎 Aclamado pela crítica` (`ACCLAIMED`): quando $\text{CommunityScore} \ge 8.5$ e $\text{CommunityScore} - \text{BaseTasteScore} \ge 1.0$.
  - `🧪 Aposta Pessoal` (`PERSONAL_BET`): quando $\text{BaseTasteScore} - \text{CommunityScore} \ge 1.5$.
  - `🔥 Recomendação Forte` (`STRONG_CONSENSUS`): quando $\text{BaseTasteScore} \ge 8.0$ e $\text{CommunityScore} \ge 8.0$.

### 2. Previsão por Fallback da Comunidade (`predictionSource: 'community'`)
Quando o usuário não possui histórico avaliado nos gêneros do anime (nenhum gênero coincide com o perfil), o sistema utiliza 100% da nota da comunidade convertida para a escala 0-10 (`media.averageScore / 10`) como previsão.

- **Sinalização Visual (UI)**:
  - Nos cards (`AnimeCard.jsx`), são exibidos badges de discrepância ou o aviso `🌐 Nota da comunidade`.
  - Ao expandir os detalhes (`AnimeDetailModal.jsx`), a seção "Justificativa da Recomendação" exibe o resumo da divisão proporcional (Gosto 85% vs Comunidade 15%) e o detalhamento de cada gênero.
