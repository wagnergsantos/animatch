# Pré-Spec — AniMatch: Correções e Melhorias

**Repositório:** wagnergsantos/animatch
**Data:** 22/10/2026 (revisado)
**Escopo:** Revisão de código existente + propostas de novas funcionalidades

**Changelog desta revisão:**
- **Débitos técnicos e features concluídas:** A1 (LRU Cache), A2 (Erros tipados), A3 (predictionSource/badges), A4 (Constantes), A5 (useLocalStorage), A6 (Cleanup legados), A9 (SEO/OG/a11y), A10 (Code-splitting/LCP), B1 (Justificativas), B2 (Modo Decisão & Descoberta #9/#20), B4a (Filtro de inéditos `NOT_YET_RELEASED` nas recomendações e anos #22), B5 (Exportação Visual Wrapped #15), B6 (Supabase Auth & Settings), B7 (Recomendação Unificada Multi-Provider / Ensemble Recommender #14), B8 (Persistência Offline-First IndexedDB & Supabase Sync #16) e Média Bayesiana com Lower Bound `C=25` (#17, #18, #19).
- **Novas Melhorias Técnicas mapeadas (Issues #23–#25):** Adicionadas à Frente A (`A11` Refatoração/Hooks/StorageKeys, `A12` Evolução do Algoritmo, `A13` Higiene de Lint/Kitsu/Testes).
- **Roadmaps dedicados de Segurança e Privacidade:** O item `A14` (#26) foi movido e expandido para [roadmap_seguranca.md](./roadmap_seguranca.md) (`S1–S4`, Issues `#26`, `#31–#33`), acompanhado por [roadmap_legal_privacidade.md](./roadmap_legal_privacidade.md) (`L1–L4`, Issues `#27–#30`).
- **Sugestões de Funcionalidades (Frente C — Candidatas ao Roadmap v3):** Seção dedicada separando evoluções de produto (`C1–C7`) das melhorias técnicas (`A11–A14`).
- **A7 (Web Worker #3) e A8 (OpenTelemetry #2):** Avaliados e arquivados — `A7` tem ganho imperceptível (~2-4ms vs overhead de `postMessage`) e `A8` adiciona peso/infra desnecessários frente aos erros tipados (`A2`) e cache offline SWR (`B8`).
- Seções `A2–A6` restauradas com suas especificações originais e `B4` dividido em `B4a` (filtro de inéditos) e `B4b` (notificações de estreia).

---

## 1. Contexto

AniMatch é uma SPA em React 19 + Vite que conecta-se a listas de anime (AniList,
Kitsu, MAL), calcula um "perfil de gosto" por gênero com suavização Bayesiana, e
usa esse perfil para prever notas em animes da lista "Plan to Watch".

Stack: React 19, Vite, i18next (pt-BR/en/ja), Supabase (edge functions), Vitest +
Testing Library, oxlint.

Este documento separa o trabalho em três frentes:
- **(A) Melhorias Técnicas, Código e Segurança** — correções, arquitetura, algoritmo, higiene e infra.
- **(B) Funcionalidades de Produto (Roadmap v2)** — features principais do ciclo v2.
- **(C) Sugestões de Funcionalidades (Candidatas ao Roadmap v3)** — novas capacidades voltadas ao usuário.

---

## 2. Frente A — Melhorias Técnicas, Código e Segurança

### [x] A1. Cache em `localStorage` nunca é limpo por conta antiga (#7) (Concluído ✅)

**Onde:** `src/cache/apiCache.js` (extraído e consumido por todos os providers)

**Problema:** cada usuário consultado gera uma chave `animatch_cache_<username>`
com TTL de 5 minutos, mas o TTL só é checado *na leitura* — a entrada nunca é
removida do `localStorage` se expirar sem ser reconsultada. Com o uso do app
(múltiplos `recentUsers`, cf. `App.jsx`), o storage cresce indefinidamente. O
`catch` de escrita (linha 209-211) engole silenciosamente erros de quota, então
o sintoma seria "cache parou de funcionar" sem nenhum log.

**Correção aplicada:**
Estratégia de **LRU com índice explícito** (`animatch_cache_index`, máx. 15 entradas), complementada posteriormente pelo cache IndexedDB (`B8`).

---

### [x] A2. Lógica de retry frágil e baseada em comparação de string (#5) (Concluído ✅)

**Onde:** `src/api/errors.js` e `src/api/providers/{anilist,kitsu,mal}.js`

**Problema resolvido:** O controle de retry dependia de checar substrings em `err.message`, quebrando caso as mensagens fossem traduzidas ou alteradas.
**Solução aplicada:** Hierarquia de classes de erro tipadas (`ProviderError`, `RetryableError`, `NonRetryableError`, `UserNotFoundError`, `PrivateListError`, `RateLimitError`) com flag explícita `isRetryable`.

---

### [x] A3. Fallback silencioso do `predictedScore` para nota da comunidade (#4) (Concluído ✅)

**Onde:** `src/logic/recommender.js`, `scoreRecommendations()`

**Problema resolvido:** Animes sem interseção de gêneros com o `tasteProfile` recebiam `communityScore` como `predictedScore` sem transparência para o usuário.
**Solução aplicada:** Exposição de `predictionSource` (`'taste'` vs `'community'`), `baseTasteScore` e sistema de badges contextuais (`ACCLAIMED`, `PERSONAL_BET`, `STRONG_CONSENSUS`, `DISCOVERY`).

---

### [x] A4. Constantes do algoritmo fixas no código (#7) (Concluído ✅)

**Onde:** `src/logic/recommender.js`

**Problema resolvido:** Parâmetros estatísticos ficavam embutidos dentro de `buildTasteProfile()`.
**Solução aplicada:** Exportação de constantes nomeadas (`DEFAULT_MIN_GENRE_COUNT`, `DEFAULT_CONFIDENCE_CONSTANT`, `DEFAULT_SCORE_STD_DEV`, `CONFIDENCE_Z`, `WATCHING_SCORE_WEIGHT`) e suporte ao objeto `options` em `buildTasteProfile(entries, options)`.

---

### [x] A5. Duplicação do padrão `typeof window !== 'undefined' && window.localStorage` (#6) (Concluído ✅)

**Onde:** `src/hooks/useLocalStorage.js`

**Problema resolvido:** Leitura e escrita direta no `localStorage` com `try/catch` repetidos em vários componentes.
**Solução aplicada:** Extração de hook customizado e testado `useLocalStorage(key, initialValue)`.

---

### [x] A6. Arquivos legados na raiz do repositório (#8) (Concluído ✅)

**Onde:** Raiz do repositório

**Solução aplicada:** Remoção de scripts e dumps temporários legados (`test-fetch-dub.js` e `scrape_anilistanimealt.xml`).

---

### [⏸️] A7. Web Worker para processamento estatístico pesado (#3) (Arquivado / Backlog)

**Onde:** `src/logic/analytics.js` e `src/logic/recommender.js`

**Avaliação técnica (08/10/2026):**
- **Complexidade $O(N)$ linear**: As funções `buildTasteProfile` e `scoreRecommendations` são puras e fazem operações aritméticas simples sobre arrays em memória.
- **Tempo de execução irrisório**: Em listas grandes (ex: 2.000 assistidos + 500 no planning), a engine V8 executa os loops em **~2 a 4ms**, imperceptível para o usuário.
- **Overhead de serialização**: O custo de clonar e transferir o payload via `postMessage` (`structuredClone`) entre threads consome ~1 a 3ms, anulando qualquer ganho prático.
- **Decisão**: Classificado como **otimização prematura**.

---

### [⏸️] A8. Observabilidade — OpenTelemetry Browser (#2) (Arquivado / Backlog)

Monitorar latência de APIs externas (AniList/Kitsu/MAL), taxas de erro de renderização e performance dos algoritmos de recomendação em produção. Arquivado por adicionar peso/infra desnecessários frente aos erros tipados (`A2`) e cache offline SWR (`B8`).

---

### [x] A9. Auditoria de Web Quality — SEO, OpenGraph & Acessibilidade (#11) (Concluído ✅)

**Onde:** `index.html`, `src/index.css`, `src/components/LoginScreen.jsx`

**Solução aplicada:** Metadados OpenGraph/Twitter Cards, `preconnect` de fontes/APIs e atributos ARIA de acessibilidade nas abas e controles interativos.

---

### [x] A10. Otimização de Performance e Core Web Vitals (#12) (Concluído ✅)

**Onde:** `vite.config.js` (`manualChunks`), `src/components/AnimeCard.jsx` (`priority` LCP eager + high priority)

**Solução aplicada:** Separação de chunks de vendor no Rollup e carregamento prioritário (`fetchPriority="high"`, `loading="eager"`) nos primeiros cards visíveis da grade.

---

### [ ] A11. Refatoração de Arquitetura — Hook `useRecommendationPipeline`, `STORAGE_KEYS` e Normalização (#25)

**Onde:** `src/components/Dashboard.jsx`, `src/lib/storageKeys.js`, `src/api/providers/*`, `src/logic/statistics.js`

- **Extrair pipeline do `Dashboard.jsx` (God Component):** Mover derivação de `tasteProfile`, `scoreRecommendations`, `applyMultiPresenceBoost`, `applyStreamingBoost`, filtragem multi-critério e ordenação para um hook dedicado (`useRecommendationPipeline`).
- **Centralizar chaves de armazenamento (`STORAGE_KEYS`):** Criar `src/lib/storageKeys.js` como fonte única para todas as chaves `animatch_*` e adotá-lo em `App.jsx`, `Dashboard.jsx`, `useUserSettings.js`, `i18n.js` e `apiCache.js`.
- **Unificar normalização de entrada:** Alinhar o contrato de objetos `entry`/`media` entre os providers (`anilist.js`, `kitsu.js`, `mal.js`), `ensemble.js` e `statistics.js`.

**Esforço estimado:** Médio (0,5–1 dia).

---

### [ ] A12. Evolução do Algoritmo de Recomendação (#23)

**Onde:** `src/logic/recommender.js`, `src/logic/streaming.js`, `src/logic/ensemble.js`

- **Ponderação da média de gêneros:** Em `scoreRecommendations()`, ponderar `baseTasteScore` pelo peso/volume de avaliações (`scoredCount`) de cada gênero coincidente em vez de média aritmética simples (`sum / matchingGenres.length`), evitando que gêneros com poucas amostras tenham o mesmo peso que gêneros consolidados.
- **Pesos híbridos configuráveis:** Exportar `TASTE_WEIGHT = 0.85` e `COMMUNITY_WEIGHT = 0.15` e aceitá-los via `options` em `scoreRecommendations(planningEntries, tasteProfile, selectedGenre, options)`.
- **Padronização das escalas de boost:** Alinhar `applyStreamingBoost()` (atualmente aditivo `+0.3` sem teto) com `applyMultiPresenceBoost()` (multiplicativo com teto `Math.min(10.0, ...)`).
- **Recomendar animes sem nota da comunidade:** Em `isEligiblePlanningMedia()` e `scoreRecommendations()`, permitir recomendar obras já lançadas sem `averageScore` da comunidade quando o usuário possuir `matchingGenres` no `tasteProfile` (usando `predictedScore = baseTasteScore`).

**Esforço estimado:** Pequeno-Médio (0,5 dia).

---

### [ ] A13. Higiene de Código — Zerar Warnings de Lint, Bug `CANONICAL_GENRES` no Kitsu e Teste Pulado (#24)

**Onde:** `src/api/providers/kitsu.js`, `src/components/Dashboard.test.jsx`, `src/auth/AuthContext.jsx` e arquivos de teste/hooks

- **Bug de gêneros no Kitsu (`kitsu.js`):** Aplicar `CANONICAL_GENRES.has(cat.attributes.title)` em `normalizeEntry()` para filtrar micro-categorias do Kitsu (`Earth`, `Swordplay`, `School Life`) que hoje entram como gêneros e poluem o `tasteProfile` e o `FilterBar`.
- **Zerar os 12 warnings do `oxlint`:** Limpar imports e variáveis não utilizadas (`statistics.test.js`, `index.test.js`, `useAsyncAction.test.js`, `useUserSettings.js`, `i18n.js`, `test-setup.js`, `generate-tokens.cjs`) e adequar exports do `AuthContext.jsx` para Fast Refresh.
- **Resolver teste pulado:** Atualizar ou remover o `it.skip` em `src/components/Dashboard.test.jsx:82`.

**Esforço estimado:** Pequeno (2–3 horas).

> **Nota sobre Segurança e Privacidade:** O item `A14` (#26) foi movido e expandido para [roadmap_seguranca.md](./roadmap_seguranca.md) (`S1–S4`, Issues `#26`, `#31–#33`), junto ao [roadmap_legal_privacidade.md](./roadmap_legal_privacidade.md) (`L1–L4`, Issues `#27–#30`).

---

## 3. Frente B — Funcionalidades de Produto (Roadmap v2)

Priorizadas da mais simples/barata para a mais ambiciosa. Todas reaproveitam
peças que já existem no repo.

### [x] B1. Explicação da recomendação ("Por que esse anime?") (#4) (Concluído ✅)

**Reaproveita:** `matchingGenres` e histórico de notas do usuário em `scoreRecommendations()`.

Ao clicar ou expandir um card/modal de recomendação, apresentar a justificativa de compatibilidade em **camadas de experiência**:

1. **Nível 1 — Síntese Curta (Card principal)**: Frase direta de 1 linha (ex: *"Esta é uma das recomendações mais fortes com base nas suas avaliações anteriores."*).
2. **Nível 2 — Justificativa Personalizada (Detalhamento estatístico)**:
   - **Similaridade**: *"Você avaliou muito bem Monster (10) e Death Note (9)."*
   - **Gêneros**: Decomposição da nota prevista (ex: *"Mistério: 8.9 · Drama: 8.4"*).
3. **Nível 3 — Engajamento Humano (Modo Decisão / Hero)**: Copy opinativa e provocativa.
4. **Nível 4 — Contexto de Sorteio (Top 20 Ponderado)**: Transparência quando o anime for sorteado.

---

### [x] B2. Modo Decisão & Descoberta ("Escolha pra mim") (#9, #20) (Concluído ✅)

Em listas extensas (200+ itens no Planning), a ordenação tradicional gera **paralisia por análise**. O Modo Decisão resolve esse problema oferecendo um botão flutuante/destacado `✨ Escolher por mim` com suporte a 3 modos principais:

1. 🎯 **Melhor Escolha**: Retorna estritamente o recomendador #1 com alta compatibilidade.
2. 🎲 **Surpreenda-me (Sorteio Ponderado Top 20)**: Amostragem probabilística decrescente entre o Top 20 da recomendação.
3. ⚡ **Quero Começar Hoje**: Prioriza animes do Planning com poucos episódios ($\le$ 12-24 eps), disponíveis nas assinaturas ativas do usuário.

---

### [ ] B3. Comparação de perfil de gosto entre dois usuários (#21)

Comparar o `tasteProfile` de dois usuários (compatibilidade de gosto,
recomendações cruzadas: "animes que ele completou e você ainda não viu, no seu
perfil de gosto").

**Reaproveita:** `buildTasteProfile()` já é uma função pura reutilizável para
qualquer usuário; bastaria chamá-la duas vezes.

**Esforço:** Médio. Precisa de tela nova, dois fluxos de fetch em paralelo, e
lógica de interseção/diferença de listas. Mantido em backlog aguardando validação de demanda.

---

### [x] B4a. Filtragem de inéditos (`NOT_YET_RELEASED`) nas recomendações e filtros (#22) (Concluído ✅)

**Onde:** `src/logic/recommender.js` (`isEligiblePlanningMedia`, `isEligiblePlanningEntry`) e `src/components/Dashboard.jsx`

**Problema resolvido:** Animes ainda não lançados (`NOT_YET_RELEASED`, ex: estreias futuras de 2027) apareciam nas recomendações e poluíam os seletores de ano e gênero.
**Solução aplicada:** Helpers de elegibilidade centralizados que filtram obras não lançadas tanto do ranking de recomendações quanto da extração de anos/gêneros disponíveis no `Dashboard.jsx`.

---

### [⏸️] B4b. Alertas de novas temporadas / estreias do Planning (Web Push — Arquivado)

**Ressalva:** Web Push funcional exige infraestrutura persistente (Supabase Edge Function com cron, tabela de `subscriptions`, chaves VAPID e gestão de revogação). Arquivado em favor da abordagem client-side in-app (`C5` na Frente C).

---

### [x] B5. Exportar/compartilhar perfil de gosto (estilo "Wrapped") (#15) (Concluído ✅)

Gerar uma imagem ou link compartilhável com o Taste Profile e top
recomendações (`wrappedGenerator.js` e `WrappedModal.jsx` — Canvas 2D `1200x630` com download PNG e cópia para área de transferência).

---

### [x] B6. Login Animatch + Sync de Configurações (Supabase Auth & Settings) (#1, #10) (Concluído ✅)

Sincronizar as preferências do usuário (`default_provider`, usernames vinculados `anilist`/`kitsu`/`mal`, `language`, `theme`, `subscriptions`, `view_mode`) entre dispositivos via Supabase Auth e tabela `user_settings`.

---

### [x] B7. Recomendação Unificada Multi-Provider (Ensemble Recommender) (#14) (Concluído ✅)

Consolidar dados de múltiplas plataformas (AniList, Kitsu, MyAnimeList) em uma visão integrada (`src/logic/ensemble.js` + `useEnsembleData.js`) com deduplicação por `idMal`/título e `applyMultiPresenceBoost`.

---

### [x] B8. Persistência Offline-First e Sincronização em Nuvem (IndexedDB + Supabase Sync) (#16) (Concluído ✅)

Arquitetura em 3 camadas com TTL de 6 horas (`DEFAULT_CACHE_TTL`), armazenamento local em IndexedDB (`src/cache/idbCache.js`) com fallback *Stale-While-Revalidate* offline e sincronização em nuvem na tabela `user_anime_lists` (`src/cache/cloudListSync.js`).

---

## 4. Frente C — Sugestões de Funcionalidades (Candidatas ao Roadmap v3)

Novas funcionalidades sugeridas para evolução de produto, separadas das melhorias técnicas da Frente A:

| ID | Funcionalidade | Descrição de Produto & Reaproveitamento | Prioridade / Esforço |
|----|----------------|-----------------------------------------|----------------------|
| **C1** | **PWA (App Instalável)** | Transformar a SPA em Progressive Web App instalável (`manifest.webmanifest`, ícones e Service Worker), aproveitando o cache offline-first (`B8`) já existente. | 🔥 Alta / Esforço P |
| **C2** | **Exportação XML (Formato MAL)** | Download da lista `Planning` (ou recomendações filtradas) no formato XML padrão do MyAnimeList, complementando a exportação CSV atual. | 🔥 Alta / Esforço P |
| **C3** | **Watch Queue (Fila de Exibição)** | Fila manual curta ("Assistir em seguida") com ordenação arrastável (drag-and-drop), sincronizada no `user_settings` do Supabase. | 🔥 Alta / Esforço M |
| **C4** | **Feedback Loop (👍/👎)** | Botões rápidos nos cards para calibrar pesos de gêneros por usuário ou descartar recomendações indesejadas. | 🟡 Média / Esforço M |
| **C5** | **Notificações In-App (Diff Local)** | Alertas internos sobre estreias comparando o snapshot anterior do IndexedDB com o novo fetch (`NOT_YET_RELEASED` → `RELEASING`), sem custo de Web Push (`B4b`). | 🟡 Média / Esforço P-M |
| **C6** | **Recomendações Pós-Conclusão** | Exibir recomendações imediatas ("O que assistir depois de X") ao detectar novos animes concluídos no sync ou via ação rápida local. | 🟡 Média / Esforço M |
| **C7** | **Calendário de Temporada ("Airing Now")** | Aba dedicada para animes em exibição na temporada atual, destacando obras do `Planning`/`Watching` por dia da semana. | 💤 Nice-to-Have / Esforço M-A |

---

## 5. Status Consolidado e Ordem de Execução

| # | Item | Frente | Prioridade | Status | Motivo |
|---|------|--------|------------|--------|--------|
| 1 | A3 + B1 (#4) | Correção + Melhoria | 🔥 Alta | ✅ Concluído | Badges + justificativas e animes âncora no card e modal. |
| 2 | A2 — erros tipados (#5) | Correção | 🔥 Alta | ✅ Concluído | Erros tipados e retry protegidos contra quebra de copy. |
| 3 | A9 — Web Quality & SEO (#11) | Correção / UX | 🔥 Alta | ✅ Concluído | Metadados sociais OpenGraph/Twitter, preconnect e a11y em tabs. |
| 4 | A10 — Core Web Vitals & Bundle (#12) | Correção / Perf | 🔥 Alta | ✅ Concluído | Code-splitting Rollup (`manualChunks`) e LCP com `priority`. |
| 5 | A5 — hook `useLocalStorage` (#6) | Correção | 🟡 Média | ✅ Concluído | Hook centralizado e limpo em `App.jsx`. |
| 6 | A1 + A4 (#7) | Correção | 🟡 Média | ✅ Concluído | LRU cache com índice + desacoplamento de constantes e options. |
| 7 | A6 — cleanup legados (#8) | Correção | 🟡 Média | ✅ Concluído | Remoção de artefatos legados na raiz do repositório. |
| 8 | B2 — Modo Decisão (#9, #20) | Produto (v2) | 🚀 Features | ✅ Concluído | Sorteio ponderado Top 20, filtros de streaming e modo rápido. |
| 9 | B6 — Sync Supabase (#1, #10) | Produto (v2) | 🚀 Features | ✅ Concluído | Login Supabase Auth, settings sync, multi-provider accounts e SettingsPage. |
| 10 | B7 — Recomendação Multi-Provider (#14) | Produto (v2) | 🚀 Features | ✅ Concluído | Fusão de perfis e deduplicação com multi-presence boost. |
| 11 | B8 — Offline-First & Supabase Sync (#16) | Produto / Infra | 🚀 Features | ✅ Concluído | IndexedDB (TTL 6h + SWR offline) + persistência multi-dispositivo no Supabase. |
| 12 | B5 — Exportação Visual ("Wrapped") (#15) | Produto (v2) | 🚀 Features | ✅ Concluído | Exportação visual 1200x630 de perfil de gosto e top animes em PNG/Clipboard. |
| 13 | B4a — filtrar `NOT_YET_RELEASED` (#22) | Produto (v2) | 🚀 Features | ✅ Concluído | Ocultar animes não lançados das sugestões e filtros de ano (ex: 2027). |
| 14 | A13 — Higiene, Lint & Bug Kitsu (#24) | Melhoria Técnica | 🔥 Alta | 📋 Aberto | Corrige poluição de gêneros no Kitsu, zera 12 warnings e resolve teste pulado. |
| 15 | A12 — Evolução do Algoritmo (#23) | Melhoria Técnica | 🟡 Média | 📋 Aberto | Ponderação de gêneros, pesos configuráveis, boost unificado e animes sem nota. |
| 16 | A11 — Refatoração Dashboard & Keys (#25) | Arquitetura | 🟡 Média | 📋 Aberto | Extrai `useRecommendationPipeline`, centraliza `STORAGE_KEYS` e normalização. |
| 17 | B3 — comparação entre usuários (#21) | Produto (v2/v3) | 💤 Nice-to-Have | 🛑 Backlog | Reusa `buildTasteProfile()`; aguardando validação de demanda. |
| 18 | C1–C7 — Novas Features (Roadmap v3) | Produto (v3) | 🚀 Backlog v3 | 💡 Proposto | PWA (`C1`), Export XML (`C2`), Watch Queue (`C3`), Feedback (`C4`), Diff (`C5`). |
| 19 | A7 — Web Worker Performance (#3) | Correção/Infra | ⏸️ Baixa | 🛑 Arquivado | Ganho nulo (~2ms de CPU vs ~2ms de overhead de serialização). |
| 20 | A8 — OpenTelemetry (#2) | Infra | ⏸️ Baixa | 🛑 Arquivado | Overengineering para SPA client-side; coberto por A2 e B8. |
| 21 | B4b — Web Push completo (v2) | Backlog | ⏸️ Baixa | 🛑 Arquivado | Exige infra persistente (cron, VAPID, tabela de subscriptions); preferir `C5`. |

P = pequeno, M = médio, A = alto.

---

## 6. Próximos passos

- **Backlog Técnico ativo neste Roadmap:**
  - **#24 (A13)**: Higiene de código — zerar 12 warnings de lint, aplicar `CANONICAL_GENRES` no Kitsu e resolver teste pulado.
  - **#23 (A12)**: Algoritmo — ponderação de gêneros, pesos configuráveis, padronização de boost e suporte a animes sem nota da comunidade.
  - **#25 (A11)**: Refatoração de arquitetura — extrair `useRecommendationPipeline`, centralizar `STORAGE_KEYS` e unificar normalização.
- **Roadmaps Dedicados de Segurança e Adequação Legal:**
  - [roadmap_seguranca.md](./roadmap_seguranca.md): **#26 (`S1/A14`)**, **#31 (`S2`)**, **#32 (`S3`)** e **#33 (`S4`)**.
  - [roadmap_legal_privacidade.md](./roadmap_legal_privacidade.md): **#27 (`L1`)**, **#28 (`L2`)**, **#29 (`L3`)**, **#30 (`L4`)** e **#34 (`L5`)**.
- **Backlog de Funcionalidades (Produto):**
  - **#21 (B3)**: Comparação de perfil de gosto entre dois usuários (Nice-to-Have).
  - **Frente C (`C1–C7`)**: Candidatas ao Roadmap v3 (priorizando `C1` PWA, `C2` Exportação XML e `C3` Watch Queue).
- O progresso e conclusão das tarefas são gerenciados diretamente via GitHub Issues (`gh issue list`, `gh issue close <id>`).
- Este documento funciona como pré-especificação técnica dos epics e deve ser mantido atualizado conforme novas ideias surgirem.
