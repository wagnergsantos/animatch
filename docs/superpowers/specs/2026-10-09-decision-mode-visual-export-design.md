# Especificação Técnica — B2 + B5: Modo Decisão ("Escolha pra mim") & Exportação Visual

**Issue:** #9  
**Data:** 09/10/2026  
**Status:** Em Revisão  

---

## 1. Visão Geral

Implementação dos módulos B2 e B5 do roadmap AniMatch:
1. **Filtro e Boost de Streaming:** Configuração de assinaturas ativas (`Crunchyroll`, `Netflix`, `Prime Video`, `Disney+`, `Max`, `HIDIVE`), filtro rápido na `FilterBar` ("Apenas assinados") e boost opcional de nota nas configurações.
2. **Modo Decisão & Descoberta ("Escolha pra mim"):** Botão FAB flutuante + modal interativo com 3 modos (🎯 *Melhor Escolha*, 🎲 *Surpreenda-me* via amostragem probabilística Top 20 decrescente, ⚡ *Quero Começar Hoje* com $\le$ 24 episódios e disponível em streaming assinado). Justificativas B1 e atalhos rápidos.
3. **Exportação Visual (Wrapped):** Geração de card visual estilizado (PNG) usando Canvas 2D nativo com tratamento de CORS/fallbacks, exibindo avatar/user, score global, Top 3 Gêneros e Top 3 Animes recomendados.

---

## 2. Arquitetura e Componentes

### 2.1. Streaming & Assinaturas
- **Constantes:** `STREAMING_SERVICES = ['Crunchyroll', 'Netflix', 'Prime Video', 'Disney+', 'Max', 'HIDIVE']` em `src/logic/constants.js`.
- **Storage:** Hook `useLocalStorage` para:
  - `animatch_subscriptions`: Array de serviços selecionados (default: `['Crunchyroll', 'Netflix']`).
  - `animatch_streaming_boost`: Booleano para ativar/desativar boost no ranking (default: `false`).
  - `animatch_streaming_only`: Booleano para filtro estrito na `FilterBar` (default: `false`).
- **Normalização de Streaming:** Helper `matchesUserSubscriptions(anime, subscriptions)` que normaliza os sites dos `streamingLinks` do anime.
- **Boost de Pontuação:** Se ativado, `scoreRecommendations` ou pipeline de ordenação aplica multiplicador/bônus (+0.25 a +0.50 pts) em títulos disponíveis nas assinaturas ativas.

### 2.2. Modo Decisão ("Escolha pra mim")
- **Componentes:**
  - `FloatingRandomizerButton.jsx`: Botão flutuante animado (FAB) no canto inferior direito do Dashboard + atalho no header/FilterBar.
  - `DecisionModal.jsx`: Modal dedicado com seletor de modo (🎯 / 🎲 / ⚡), exibição do card de anime sorteado, badges de compatibilidade %, justificativa personalizada Nível 3/4 ("Por quê?"), links diretos de streaming e botão `[🎲 Escolher Outro]` com animação de shuffle.
- **Lógica de Amostragem (`src/logic/decision.js`):**
  - `pickBestRecommendation(recommendations)`: Retorna o #1.
  - `pickWeightedTop20(recommendations)`: Amostragem ponderada com pesos decrescentes ($w_i = (21 - i)^{1.5} / \sum w$).
  - `pickQuickStart(recommendations, subscriptions)`: Filtra $\le$ 24 eps + streaming disponível + amostragem no Top filtrado.

### 2.3. Exportação Visual (Perfil Wrapped / Card Social)
- **Componente / Helper (`src/logic/exportImage.js` e `ExportSnapshotButton.jsx`):**
  - Geração via Canvas 2D nativo (1200x630px formato OpenGraph / Social Share).
  - Background com gradiente escuro moderno + estética AniMatch.
  - Branding AniMatch + Username do usuário.
  - Seção 1: Métricas de gosto (Total assistido, Média global, Top gêneros com percentuais).
  - Seção 2: Top 3 animes recomendados (títulos, compatibilidade %, ano, gêneros).
  - Download automático do PNG `animatch-profile-<username>.png`.

---

## 3. i18n & Acessibilidade
- Novas chaves de tradução adicionadas em `src/locales/{pt-BR,en,ja}.json` para:
  - Rótulos dos modos de decisão.
  - Mensagens do card do sorteio ("Por que este anime?", "Assistir agora", "Sortear outro").
  - Opções de streaming e botões de exportação de imagem.
- Modais com suporte a `Esc`, `aria-modal="true"`, foco gerenciado e contraste visual nos temas dark/light.

---

## 4. Testes
- Testes unitários para algoritmo de amostragem ponderada e filtros de streaming (`decision.test.js`).
- Testes de componentes para `FloatingRandomizerButton.test.jsx`, `DecisionModal.test.jsx` e `ExportSnapshotButton.test.jsx`.
