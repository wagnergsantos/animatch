# Spec Técnica — B1: Explicação da Recomendação ("Por que esse anime?")

- **Feature:** Explicação multinível da recomendação personalizada (B1)
- **Status:** Proposta para aprovação
- **Data:** 08/10/2026

## 1. Visão Geral e Arquitetura

Fornecer transparência ao usuário sobre por que uma obra da lista "Plan to Watch" foi recomendada, conectando o cálculo Bayesiano às preferências e notas históricas do usuário.

### Camadas de Apresentação
1. **Nível 1 — Síntese no Card (`AnimeCard.jsx`)**:
   - Frase curta e direta abaixo das notas (ex: *"Compatível com seu apreço por Drama e Sci-Fi."* ou *"Baseado nas suas notas altas em Cyberpunk e Steins;Gate."*).
   - Se for fallback de comunidade: *"Recomendado pela alta avaliação geral da comunidade."*.

2. **Nível 2 — Detalhamento Completo (`AnimeDetailModal.jsx` / `RecommendationReason.jsx`)**:
   - **Gêneros determinantes**: Chips/barras com as notas ajustadas de cada gênero correspondente.
   - **Animes de Referência (Âncoras)**: Lista de até 2-3 animes concluídos e bem avaliados pelo usuário que compartilham esses gêneros (extraídos de `tasteProfile.get(genre).sourceAnimes`).
   - **Distribuição de Peso**: Peso do gosto pessoal (85%) vs Comunidade (15%).

---

## 2. Modelagem de Dados e Recommender

No arquivo `src/logic/recommender.js`:
- Enriquecer o retorno de `scoreRecommendations`:
  - `topContributingGenres`: Lista ordenada dos gêneros com maior impacto positivo no score.
  - `anchorAnimes`: Top 2 ou 3 animes concluídos com maior nota do usuário nos gêneros coincidentes (sem duplicatas).
  - Dados estruturados para compor a síntese i18n no client.

---

## 3. Componentes e UI

- **`src/components/RecommendationReason.jsx`**:
  - Renderiza a justificativa detalhada no modal:
    - Box estilizado com ícone 💡/🎯.
    - Frase de síntese personalizada.
    - Seção "Animes que você assistiu e amou neste estilo: [Anime 1 (Nota 10), Anime 2 (Nota 9)]".
    - Detalhamento de notas por gênero.
- **`src/components/AnimeCard.jsx`**:
  - Exibe mini-síntese compacta (1 linha) com ícone sutil.
- **i18n (`src/locales/{pt-BR,en,ja}.json`)**:
  - Novas chaves para síntese, âncoras e fallbacks.

---

## 4. Casos de Teste (TDD)
- Testes unitários em `recommender.test.js`:
  - Validação de `anchorAnimes` e `topContributingGenres`.
  - Fallback limpo quando não há animes avaliados no gênero ou quando a fonte é puramente comunidade.
- Testes de componentes em `AnimeCard.test.jsx`, `AnimeDetailModal.test.jsx` e `RecommendationReason.test.jsx`.
