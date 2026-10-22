# Pré-Spec — AniMatch: Correções e Melhorias

**Repositório:** wagnergsantos/animatch
**Data:** 22/10/2026 (revisado)
**Escopo:** Revisão de código existente + propostas de novas funcionalidades

**Changelog desta revisão:**
- **Débitos técnicos e features concluídas:** A1 (LRU Cache), A2 (Erros tipados), A3 (predictionSource/badges), A4 (Constantes), A5 (useLocalStorage), A6 (Cleanup legados), A9 (SEO/OG/a11y), A10 (Code-splitting/LCP), B1 (Justificativas), B2 (Modo Decisão & Descoberta #9/#20), B4 (Filtro de inéditos `NOT_YET_RELEASED` nas recomendações e anos #22), B5 (Exportação Visual Wrapped #15), B6 (Supabase Auth & Settings), B7 (Recomendação Unificada Multi-Provider / Ensemble Recommender #14), B8 (Persistência Offline-First IndexedDB & Supabase Sync #16) e Média Bayesiana com Lower Bound `C=25` (#17, #18, #19).
- **A7 (Web Worker #3) e A8 (OpenTelemetry #2):** Avaliados e arquivados — `A7` tem ganho imperceptível (~2-4ms vs overhead de `postMessage`) e `A8` adiciona peso/infra desnecessários frente aos erros tipados (`A2`) e cache offline SWR (`B8`).
- **B8 (Persistência Offline-First & Supabase Sync):** Proposta técnica detalhada adicionada à Frente B (#16) para migração do `localStorage` para IndexedDB com sincronização e backup em nuvem no Supabase.
- Seção 4: Tabela de prioridades e backlog de issues sincronizados.

---

## 1. Contexto

AniMatch é uma SPA em React 19 + Vite que conecta-se a listas de anime (AniList,
Kitsu, MAL), calcula um "perfil de gosto" por gênero com suavização Bayesiana, e
usa esse perfil para prever notas em animes da lista "Plan to Watch".

Stack: React 19, Vite, i18next (pt-BR/en/ja), Supabase (edge functions), Vitest +
Testing Library, oxlint.

Este documento separa o trabalho em duas frentes: **(A) correções** — bugs,
riscos e débitos técnicos no código atual — e **(B) melhorias/novas features** —
propostas de evolução do produto.

---

## 2. Frente A — Correções e débitos técnicos

### [x] A1. Cache em `localStorage` nunca é limpo por conta antiga (Concluído ✅)

**Onde:** `src/cache/apiCache.js` (extraído e consumido por todos os providers)

**Problema:** cada usuário consultado gera uma chave `animatch_cache_<username>`
com TTL de 5 minutos, mas o TTL só é checado *na leitura* — a entrada nunca é
removida do `localStorage` se expirar sem ser reconsultada. Com o uso do app
(múltiplos `recentUsers`, cf. `App.jsx`), o storage cresce indefinidamente. O
`catch` de escrita (linha 209-211) engole silenciosamente erros de quota, então
o sintoma seria "cache parou de funcionar" sem nenhum log.

**Correção proposta (revisado):**
Varrer todas as chaves `animatch_cache_*` a cada escrita é O(n) sobre o
`localStorage` inteiro e fica pesado conforme o cache cresce — descartado.
Em vez disso, usar uma estratégia de **LRU com índice explícito**:
- Manter uma única chave, ex. `animatch_cache_index`, com um array
  `cachedUsernames` (máx. 10–20 entradas, mesmo teto de `recentUsers` em
  `App.jsx`).
- A cada escrita: mover o username pro topo do array; se exceder o limite,
  remover o mais antigo do array **e** sua chave de cache correspondente
  (uma única remoção, não uma varredura).
- Alternativa mais robusta, se o volume de dados por usuário crescer: consolidar
  todos os caches em **uma única chave JSON** (`{ [username]: { data, expiresAt } }`)
  com a mesma lógica de eviction aplicada sobre o objeto — evita múltiplas
  chaves soltas no `localStorage` e simplifica a leitura/escrita.
- Se o payload por usuário for grande (listas extensas), considerar migrar
  para IndexedDB, que não tem o limite prático de ~5MB do `localStorage` e
  suporta escrita assíncrona.
- Logar (`console.warn`) quando a escrita falhar por quota, em vez de
  silenciar — ajuda a diagnosticar em produção.
- Repetir o mesmo padrão em `kitsu.js` e `mal.js` (checar se têm cache
  próprio equivalente).

**Esforço estimado:** pequeno-médio (0,5–1 dia — a versão com índice único é
simples; a migração para IndexedDB, se necessária, é a parte que mais adiciona tempo).

---

### [x] A2. Lógica de retry frágil e baseada em comparação de string (Concluído ✅)

**Onde:** `src/api/errors.js` e `src/api/providers/{anilist,kitsu,mal}.js`

---

### [x] A3. Fallback silencioso do `predictedScore` para nota da comunidade (Concluído ✅)

**Onde:** `src/logic/recommender.js`, `scoreRecommendations()`

---

### [x] A4. Constantes do algoritmo fixas no código (Concluído ✅)

**Onde:** `src/logic/recommender.js`, export de `DEFAULT_MIN_GENRE_COUNT` e `DEFAULT_CONFIDENCE_CONSTANT` + `options` em `buildTasteProfile()`

---

### [x] A5. Duplicação do padrão `typeof window !== 'undefined' && window.localStorage` (Concluído ✅)

**Onde:** `src/hooks/useLocalStorage.js` (hook reutilizável e testado)

---

### [x] A6. Arquivos legados na raiz do repositório (Concluído ✅)

**Onde:** Raiz do repositório (`test-fetch-dub.js` e `scrape_anilistanimealt.xml` deletados).

---

## 3. Frente B — Melhorias e novas funcionalidades

Priorizadas da mais simples/barata para a mais ambiciosa. Todas reaproveitam
peças que já existem no repo.

### [x] B1. Explicação da recomendação ("Por que esse anime?") (Concluído ✅)

**Reaproveita:** `matchingGenres` e histórico de notas do usuário em `scoreRecommendations()`.

Ao clicar ou expandir um card/modal de recomendação, apresentar a justificativa de compatibilidade em **camadas de experiência**:

1. **Nível 1 — Síntese Curta (Card principal)**: Frase direta de 1 linha (ex: *"Esta é uma das recomendações mais fortes com base nas suas avaliações anteriores."* ou *"Pelos seus gostos recentes, este parece o próximo passo natural."*).
2. **Nível 2 — Justificativa Personalizada (Detalhamento estatístico)**:
   - **Similaridade**: *"Você avaliou muito bem Monster (10) e Death Note (9)."*
   - **Gêneros**: Decomposição da nota prevista (ex: *"Mistério: 8.9 · Drama: 8.4"*).
   - **Estúdio/Público**: Afinidade com o estúdio ou perfil maduro.
3. **Nível 3 — Engajamento Humano (Modo Decisão / Hero)**: Copy opinativa e provocativa (ex: *"Se eu tivesse que escolher apenas um anime do seu Planning hoje, seria este."* ou *"Você acumulou este anime no Planning por tempo demais. Está na hora."*).
4. **Nível 4 — Contexto de Sorteio (Top 20 Ponderado)**: Transparência quando o anime for sorteado (ex: *"Sorteado entre o seu Top 20 de maior compatibilidade para garantir variabilidade com alta qualidade."*).

**Esforço:** Pequeno. Expor detalhamento em `scoreRecommendations()` + componente `RecommendationReason.jsx` com suporte a i18n em `src/locales/`.

---

### [x] B2. Modo Decisão & Descoberta ("Escolha pra mim") (Concluído ✅)

Em listas extensas (200+ itens no Planning), a ordenação tradicional gera **paralisia por análise**. O Modo Decisão resolve esse problema oferecendo um botão flutuante/destacado `✨ Escolher por mim` com suporte a 3 modos principais:

1. 🎯 **Melhor Escolha**: Retorna estritamente o recomendador #1 com alta compatibilidade.
2. 🎲 **Surpreenda-me (Sorteio Ponderado Top 20)**: Amostragem probabilística decrescente entre o Top 20 da recomendação (ex.: #1 tem ~15% de chance, #2 ~12%, ..., #20 ~1%), evitando repetir sempre o #1 sem cair no aleatório puro.
3. ⚡ **Quero Começar Hoje**: Prioriza animes do Planning com poucos episódios ($\le$ 12-24 eps), disponíveis nas assinaturas ativas do usuário e não iniciados.

**Filtro por Serviços de Streaming Assinados**:
- Permite ao usuário marcar no `FilterBar.jsx` / `SettingsMenu.jsx` quais plataformas ele assina (ex: ☑ Crunchyroll, ☑ Netflix, ☑ Prime Video).
- **Recálculo de Ranking**:
  - Modo estrito: Oculta títulos indisponíveis nas assinaturas marcadas.
  - Modo priorização (boost): Concede bônus de pontuação aos títulos disponíveis, reordenando o ranking para destacar obras prontas para assistir agora.

**Card de Resposta & Justificativa ("Por quê?")**:
- Exibe o anime sorteado/escolhido com compatibilidade (%).
- Detalha a justificativa com bullets ("Você deu 10 para X", "Você curte gênero Y", "Disponível na sua Crunchyroll").
- Oferece atalhos diretos: `[Assistir]`, `[Escolher outro]`.

**Esforço:** Médio. Requer amostragem ponderada em `recommender.js`, persistência de assinaturas do usuário, filtro dinâmico de duração/streaming, modal/card interativo e botão flutuante (FAB).

---

### B3. Comparação de perfil de gosto entre dois usuários

Comparar o `tasteProfile` de dois usuários AniList (compatibilidade de gosto,
recomendações cruzadas: "animes que ele completou e você ainda não viu, no seu
perfil de gosto").

**Reaproveita:** `buildTasteProfile()` já é uma função pura reutilizável para
qualquer usuário; bastaria chamá-la duas vezes.

**Esforço:** médio. Precisa de tela nova, dois fluxos de fetch em paralelo, e
lógica de interseção/diferença de listas.

---

### [x] B4. Filtragem de inéditos (`NOT_YET_RELEASED`) e status de temporada (#22) (Concluído ✅)

**Ressalva:** a proposta original (Web Push em background) subestimava o
custo real. Web Push funcional de verdade exige infraestrutura persistente:
Supabase Edge Function com cron, tabela de `subscriptions` no banco, geração
e gestão de chaves VAPID, e tratamento de subscriptions expiradas/revogadas
pelo navegador. É a feature de maior custo de manutenção contínua da lista —
por isso desce para **última prioridade** (ver tabela da seção 4).

**Alternativa mais barata, sugerida no lugar (v1):** checagem **client-side**
ao abrir o app, sem backend novo:
- Ao carregar o Dashboard, para os animes com status "Planning"/"Plan to
  Watch", consultar a API do provider (que já é chamada) por mudanças de
  status/próxima temporada anunciada.
- Mostrar um indicador simples na UI (badge "nova temporada" no
  `AnimeCard.jsx`) — sem push, sem opt-in, sem infra nova.
- Web Push real (versão descrita acima) fica como evolução futura *se* essa
  v1 client-side validar que há demanda pela feature.

**Esforço estimado:**
- v1 (client-side, badge no card): pequeno-médio.
- v2 (Web Push completo, background): alto — mantido como item de backlog,
  não como próxima entrega.

---

### [x] B5. Exportar/compartilhar perfil de gosto (estilo "Wrapped") (Concluído ✅)

Gerar uma imagem ou link compartilhável com o Taste Profile e top
recomendações.

**Reaproveita:** `ExportSnapshotButton.jsx`, `Dashboard.jsx`, `wrappedGenerator.js` e `WrappedModal.jsx` (Canvas 2D `1200x630` com download PNG, cópia de imagem e cópia de link).

**Esforço:** médio. Concluído (#15).

### [x] B6. Login Animatch + Sync de Configurações (Supabase Auth & Settings) (Concluído ✅)

**Reaproveita:** A infraestrutura do Supabase já está ativa no projeto (usada pela Edge Function `mal-proxy`).

Sincronizar as preferências do usuário entre diferentes navegadores e dispositivos em vez de mantê-las apenas no `localStorage`.

- **Auth:** Supabase Auth (Email/Senha e Google OAuth).
- **Settings sincronizados:** `default_provider`, usernames cadastrados (`anilist`, `kitsu`, `mal`), `language`, `theme` e `filter_prefs`.
- **Precedência:** Usuário logado -> Supabase (com debounce nas alterações). Usuário anônimo -> `localStorage` (comportamento atual sem regressão).

**Esforço:** Médio. Requer `AuthContext.jsx`, `AuthModal.jsx` e a tabela `user_settings` (JSONB) no Supabase.

---

### [x] B7. Recomendação Unificada Multi-Provider (Ensemble Recommender) (Concluído ✅)

**Reaproveita:** `B6` (usernames vinculados na conta), providers existentes (`anilist.js`, `kitsu.js`, `mal.js`) e `recommender.js`.

Permitir consolidar os dados de múltiplas plataformas (AniList, Kitsu, MyAnimeList) em uma única visão integrada e gerar recomendações ponderadas pelo conjunto.

- **Deduplicação & Identidade:** Mapear e agrupar animes usando `idMal` (exposto por AniList e Kitsu) com fallback em títulos normalizados.
- **Perfil de Gosto Consolidado:** Unir listas de `Completed` dos 3 providers (removendo duplicatas ou calculando média de notas) para gerar um `tasteProfile` Bayesiano com maior densidade estatística.
- **Planning Agregado:** Consolidar itens únicos de "Plan to Watch" de todas as contas conectadas.
- **Multi-presence Boost:** Ponderar a nota prevista pelo número de plataformas em que a obra foi adicionada ao Planning:
  $$\text{FinalScore} = \text{PredictedScore} \times (1 + k \cdot (\text{countProviders} - 1))$$
  *(Exemplo: anime presente no Planning dos 3 serviços ganha maior prioridade que o presente em apenas um).*

**Esforço:** Médio-Alto (1–2 dias). Requer normalizador multi-provider, `Promise.allSettled` nos fetches e UI com badges indicando os provedores de origem.

---

### [x] B8. Persistência Offline-First e Sincronização em Nuvem (IndexedDB + Supabase Sync) (#16) (Concluído ✅)

**Reaproveita:** `apiCache.js`, `idbCache.js`, `cloudListSync.js`, `useEnsembleData.js`, Supabase Auth (`useAuth`) e banco Supabase Postgres (`user_anime_lists`).

Transformar o armazenamento transitório de 5 minutos do `localStorage` em uma arquitetura offline-first resiliente com **TTL de 6 horas (`DEFAULT_CACHE_TTL`)**, complementada por sincronização em nuvem para usuários autenticados.

- **Problema resolvido:** O `localStorage` tinha cota estreita (~5MB) e TTL curto de 5 minutos. Agora o app utiliza TTL de 6 horas e fallback *Stale-While-Revalidate* caso o usuário fique sem rede.
- **Camada 1 — Armazenamento Local (`src/cache/idbCache.js` / Stale-While-Revalidate):**
  - Armazena payloads completos de animes no IndexedDB do navegador (`animatch_db` -> `anime_lists`) com eviction LRU (`MAX_IDB_ENTRIES = 20`) e espelho/fallback em `localStorage`.
  - Estratégia de cache *Stale-While-Revalidate*: na ausência de rede ou falha retentável da API externa, carrega imediatamente os dados salvos localmente mesmo se expirados.
  - Indicador de status na interface: badge discreto `📴 Modo Offline · dados locais` no cabeçalho do `Dashboard.jsx` com ação rápida de reconexão.
- **Camada 2 — Sincronização em Nuvem (`src/cache/cloudListSync.js` + `user_anime_lists`):**
  - Tabela `user_anime_lists` no Supabase Postgres vinculada a `auth.uid()`, protegida por Row Level Security (RLS).
  - Cache compartilhado multi-dispositivo (< 6h) e backup em nuvem com sincronização em segundo plano (*background sync* debounced e *last-write-wins*).

**Esforço:** Médio-Alto. Concluído (#16).

---

### [⏸️] A7. Web Worker para processamento estatístico pesado (Arquivado / Backlog)

**Onde:** `src/logic/analytics.js` e `src/logic/recommender.js`

**Avaliação técnica (08/10/2026):**
- **Complexidade $O(N)$ linear**: As funções `buildTasteProfile` e `scoreRecommendations` são puras e fazem operações aritméticas simples sobre arrays em memória.
- **Tempo de execução irrisório**: Em listas grandes (ex: 2.000 assistidos + 500 no planning), a engine V8 executa os loops em **~2 a 4ms**, imperceptível para o usuário.
- **Overhead de serialização**: O custo de clonar e transferir o payload via `postMessage` (`structuredClone`) entre threads consome ~1 a 3ms, anulando qualquer ganho prático.
- **Decisão**: Classificado como **otimização prematura**. Item mantido arquivado/backlog caso o produto venha a integrar datasets externos offline com dezenas de milhares de itens.

**Esforço estimado:** Médio (0,5–1 dia).

---

### [⏸️] A8. Observabilidade — OpenTelemetry Browser (Arquivado / Backlog) (#2)

Monitorar latência de APIs externas (AniList/Kitsu/MAL), taxas de erro de renderização e performance dos algoritmos de recomendação em produção.

- Browser SDK com exportador OTLP/HTTP.
- Tracking de latência p50/p95/p99 dos providers.
- **Privacidade estrita:** Hash dos usernames, sampling de 1-5% e chave de opt-in visível no `SettingsMenu.jsx`.

**Esforço estimado:** Médio.

---

### [x] A9. Auditoria de Web Quality — SEO, OpenGraph & Acessibilidade (Concluído ✅)

**Onde:** `index.html`, `src/index.css`, `src/components/LoginScreen.jsx`

---

### [x] A10. Otimização de Performance e Core Web Vitals (Concluído ✅)

**Onde:** `vite.config.js` (`manualChunks`), `src/components/AnimeCard.jsx` (`priority` LCP eager + high priority)

---

## 4. Status e Ordem sugerida de execução

| # | Item | Frente | Prioridade | Status | Motivo |
|---|------|--------|------------|--------|--------|
| 1 | A3 + B1 (#4) | Correção + Melhoria | 🔥 Alta | ✅ Concluído | Badges + justificativas e animes âncora no card e modal. |
| 2 | A2 — erros tipados (#5) | Correção | 🔥 Alta | ✅ Concluído | Erros tipados e retry protegidos contra quebra de copy. |
| 3 | A9 — Web Quality & SEO (#11) | Correção / UX | 🔥 Alta | ✅ Concluído | Metadados sociais OpenGraph/Twitter, preconnect e a11y em tabs. |
| 4 | A10 — Core Web Vitals & Bundle (#12) | Correção / Perf | 🔥 Alta | ✅ Concluído | Code-splitting Rollup (`manualChunks`) e LCP com `priority`. |
| 5 | A5 — hook `useLocalStorage` (#6) | Correção | 🟡 Média | ✅ Concluído | Hook centralizado e limpo em `App.jsx`. |
| 6 | A1 + A4 (#7) | Correção | 🟡 Média | ✅ Concluído | LRU cache com índice + desacoplamento de constantes e options. |
| 7 | A6 — cleanup legados (#8) | Correção | 🟡 Média | ✅ Concluído | Remoção de artefatos legados na raiz do repositório. |
| 8 | B2 — Modo Decisão (#9) | Melhoria | 🚀 Features | ✅ Concluído | Sorteio ponderado Top 20, filtros de streaming e modo rápido. |
| 9 | B6 — Sync Supabase (#1, #10) | Melhoria | 🚀 Features | ✅ Concluído | Login Supabase Auth, settings sync, multi-provider accounts e SettingsPage. |
| 10 | B7 — Recomendação Multi-Provider (#14) | Melhoria | 🚀 Features | ✅ Concluído | Fusão de perfis e deduplicação com multi-presence boost. |
| 11 | B8 — Offline-First & Supabase Sync (#16) | Melhoria / Infra | 🚀 Features | ✅ Concluído | IndexedDB (TTL 6h + SWR offline) + persistência multi-dispositivo no Supabase. |
| 12 | B5 — Exportação Visual ("Wrapped") (#15) | Melhoria | 🚀 Features | ✅ Concluído | Exportação visual 1200x630 de perfil de gosto e top animes em PNG/Clipboard. |
| 13 | B3 — comparação entre usuários (#21) | Melhoria | 🚀 Features | ⏳ Pendente | Recomendações cruzadas entre dois perfis. |
| 14 | A7 — Web Worker Performance (#3) | Correção/Infra | ⏸️ Baixa | 🛑 Arquivado | Ganho nulo (~2ms de CPU vs ~2ms de overhead de serialização). |
| 15 | A8 — OpenTelemetry (#2) | Infra | ⏸️ Baixa | 🛑 Arquivado | Overengineering para SPA client-side; coberto por A2 e B8. |
| 16 | B4 — filtrar `NOT_YET_RELEASED` (#22) | Melhoria | 🚀 Features | ✅ Concluído | Ocultar animes não lançados das sugestões e filtros de ano (ex: 2027). |
| 17 | B4 — Web Push completo (v2) | Backlog | ⏸️ Baixa | 🛑 Arquivado | Exige infra persistente (cron, VAPID, tabela de subscriptions). |

P = pequeno, M = médio, A = alto.

---

## 5. Próximos passos

- Backlog ativo no GitHub Issues:
  - **#21 (B3)**: Comparação de perfil de gosto entre dois usuários.
  - **#22 (B4)**: Concluído — exclusão de animes `NOT_YET_RELEASED` das recomendações e filtros de ano/gênero.
  - **#2 (A8)**: Arquivado — Observabilidade OpenTelemetry Browser.
- O progresso e conclusão das tarefas são gerenciados diretamente via GitHub Issues (`gh issue list`, `gh issue close <id>`).
- Este documento funciona como pré-especificação técnica dos epics e deve ser mantido atualizado conforme novas ideias surgirem.

