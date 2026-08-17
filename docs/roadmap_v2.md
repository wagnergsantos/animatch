# Pré-Spec — AniMatch: Correções e Melhorias

**Repositório:** wagnergsantos/animatch
**Data:** 16/08/2026 (revisado)
**Escopo:** Revisão de código existente + propostas de novas funcionalidades

**Changelog desta revisão:**
- A1: trocada varredura completa do `localStorage` a cada escrita por
  estratégia de LRU com índice explícito (ou consolidação em chave JSON única).
- A6: arquivos legados de dublagem passam de "mover para `scripts/`" para
  "deletar", já que a feature de preferência de dublagem foi removida do produto.
- B4: rebaixada para última prioridade e redesenhada como checagem client-side
  (v1) em vez de Web Push completo (v2, backlog) — dado o custo de infra
  persistente que a versão original exigiria.
- Seção 4: ordem de execução reorganizada por prioridade de entrega de valor
  (A3+B1 e A2 primeiro), não apenas por esforço/tamanho técnico.

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

### A1. Cache em `localStorage` nunca é limpo por conta antiga (risco de quota)

**Onde:** `src/api/providers/anilist.js`, `fetchAllLists()` (linhas ~179-215)

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

### A2. Lógica de retry frágil e baseada em comparação de string

**Onde:** `src/api/providers/anilist.js`, função `queryAniList()`,
bloco `isNonRetryable` (linhas 136-146)

**Problema:**
```js
const isNonRetryable =
  err.message === 'Usuário não encontrado no AniList.' ||
  err.message === 'A lista deste usuário é privada.' ||
  err.message === 'O AniList está temporariamente indisponível.' ||
  err.message === 'Erro ao conectar com o AniList.' ||
  (err.message && err.message !== 'Failed to fetch' && !err.message.includes('fetch'))
```
A decisão de tentar de novo ou não depende do **texto exato** da mensagem de
erro. Qualquer alteração de copy (inclusive futura tradução via i18next) quebra
a lógica de retry silenciosamente — passa a tentar de novo erros que não
deveriam, ou desiste de erros que deveriam ser retentados.

**Correção proposta:**
- Criar uma classe `RetryableError extends Error` (para timeouts/5xx/rede) e
  lançar erros de negócio (`UserNotFoundError`, `PrivateListError`, etc.) como
  classes próprias.
- `catch` passa a checar `err instanceof RetryableError` em vez de comparar
  string.
- Bônus: essas classes tipadas facilitam tratar erros de forma diferente na UI
  (ex.: mostrar botão "tentar novamente" só para erros retryable).

**Esforço estimado:** pequeno-médio (0,5–1 dia, inclui ajustar testes existentes
em `anilist.test.js`).

---

### A3. Fallback silencioso do `predictedScore` para nota da comunidade

**Onde:** `src/logic/recommender.js`, `scoreRecommendations()` (linhas 96-105)

```js
if (matchingGenres.length > 0) {
  // ... calcula pela média Bayesiana dos gêneros
} else {
  predictedScore = Math.round((media.averageScore / 10) * 100) / 100
}
```

**Problema:** quando nenhum gênero do anime está no perfil de gosto do usuário
(ex.: usuário nunca assistiu esse gênero), a nota "prevista" vira a nota da
comunidade — mas nada na UI indica que essa previsão não é personalizada. Do
ponto de vista do usuário, ele não sabe diferenciar "eu realmente previ que
você vai gostar" de "não sei, então usei a nota geral".

**Correção proposta:**
- Retornar também um flag `predictionSource: 'taste' | 'community'` no objeto
  de recomendação.
- Na UI (`AnimeCard.jsx` / `RecommendationGrid.jsx`), sinalizar visualmente
  (ex. badge discreto "sem histórico nesse gênero") quando `predictionSource
  === 'community'`.
- Documentar esse comportamento no `DESIGN.md`, já que hoje ele não está
  explícito em nenhum lugar do repo.

**Esforço estimado:** pequeno (meio dia, lógica + ajuste visual simples).

---

### A4. Constantes do algoritmo fixas no código

**Onde:** `src/logic/recommender.js`, topo do arquivo

```js
const MIN_GENRE_COUNT = 2
const CONFIDENCE_CONSTANT = 15
```

**Problema:** não é um bug, mas é um débito de flexibilidade. `SettingsMenu.jsx`
já existe como superfície de configuração — hoje esses dois parâmetros centrais
do algoritmo (quantos animes de um gênero são necessários para contar, e o quão
"conservador" é o ajuste Bayesiano) não são visíveis nem ajustáveis por ninguém.

**Correção proposta:**
- Extrair para valores default exportados (`DEFAULT_MIN_GENRE_COUNT`,
  `DEFAULT_CONFIDENCE_CONSTANT`) e permitir override via parâmetro nas funções
  `buildTasteProfile()` / `scoreRecommendations()`.
- Não necessariamente expor na UI nesta fase — só desacoplar do hardcode já
  destrava a melhoria futura (ver B1).

**Esforço estimado:** pequeno (poucas horas).

---

### A5. Duplicação do padrão `typeof window !== 'undefined' && window.localStorage`

**Onde:** `src/App.jsx` — repetido nas linhas 12, 18, 25, 54, 56, 68, 101,
115, 133, 147 (10 ocorrências)

**Problema:** o mesmo guard de SSR/ambiente de teste é copiado manualmente em
cada leitura/escrita de `localStorage`. Além de poluir o componente, aumenta a
chance de esquecer o guard em um novo `useState` futuro.

**Correção proposta:**
- Extrair um hook `useLocalStorage(key, defaultValue)` (padrão comum, com
  `try/catch` interno e checagem de `window` uma única vez) e substituir os
  `useState` com inicializador manual por ele.
- Reduz `App.jsx` de ~178 linhas para uma fração disso, e o hook pode ser
  testado isoladamente.

**Esforço estimado:** pequeno-médio (0,5 dia, inclui migrar os ~5 estados
afetados e re-rodar `App.test.jsx`).

---

### A6. Arquivos legados na raiz do repositório

**Atualização de contexto:** o conceito de preferência de dublagem foi removido
do produto (cf. commits/PR recentes). Isso muda a recomendação original de
"mover para `scripts/`" para **deletar diretamente**:

- `test-fetch-dub.js` — script de teste manual referente à feature de
  dublagem, que não existe mais. Remover, não arquivar.
- `scrape_anilistanimealt.xml` (356K) — artefato de scraping legado. Se
  também estiver ligado à feature removida (títulos alternativos por
  dublagem), remover junto. Se for usado por outro fluxo ainda ativo,
  confirmar antes de apagar.

**Correção proposta:** deletar os dois arquivos da raiz numa PR de limpeza,
e conferir se não há import/script no `package.json` (`scripts`) ainda
referenciando `test-fetch-dub.js` antes de remover.

**Verificação adicional (mantida):** `mal.js` e `kitsu.js` — confirmar se
implementam o mesmo padrão de cache/TTL e tratamento de erro de `anilist.js`,
ou se há assimetria entre providers (ex.: um provider sem retry, outro sem
cache).

---

## 3. Frente B — Melhorias e novas funcionalidades

Priorizadas da mais simples/barata para a mais ambiciosa. Todas reaproveitam
peças que já existem no repo.

### B1. Explicação da recomendação ("por quê esse anime?")

**Reaproveita:** `matchingGenres` já calculado dentro de `scoreRecommendations()`.

Ao clicar/expandir um card de recomendação, mostrar quais gêneros pesaram na
nota prevista e a contribuição de cada um (ex.: "Ação: 8.4 · Drama: 7.9").
Aumenta a confiança do usuário no algoritmo e é praticamente só expor um dado
que já existe internamente — hoje `scoreRecommendations()` calcula
`matchingGenres` e descarta o detalhamento, devolvendo só a média final.

**Esforço:** pequeno. Ajuste no retorno de `scoreRecommendations()` +
componente novo (modal ou tooltip) em `AnimeCard.jsx`/`AnimeDetailModal.jsx`.

---

### B2. Filtro de descoberta ("surpreenda-me")

Um modo de ordenação alternativo que prioriza animes de gêneros com baixo
`scoredCount` no perfil do usuário (pouco explorados) mas com `communityScore`
alto — o oposto do modo "mais do mesmo" atual.

**Esforço:** pequeno-médio. Nova função de scoring em `recommender.js`
reaproveitando o `tasteProfile`, mais um toggle na `FilterBar.jsx`.

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

### B4. Novidades de temporada — rebaixada e simplificada

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

### B5. Exportar/compartilhar perfil de gosto (estilo "Wrapped")

Gerar uma imagem ou link compartilhável com o Taste Profile e top
recomendações.

**Reaproveita:** já existe `ExportSnapshotButton.jsx` — hoje provavelmente
limitado a CSV (`exportRecommendationsToCSV` em `Dashboard.jsx`); a ideia é
estender esse botão para gerar uma imagem visual, não só dado tabular.

**Esforço:** médio. Requer lib de renderização (Canvas API ou
`html-to-image`), mas o gatilho de UI já existe.

### B6. Login Animatch + Sync de Configurações (Supabase Auth & Settings)

**Reaproveita:** A infraestrutura do Supabase já está ativa no projeto (usada pela Edge Function `mal-proxy`).

Sincronizar as preferências do usuário entre diferentes navegadores e dispositivos em vez de mantê-las apenas no `localStorage`.

- **Auth:** Supabase Auth (Email/Senha e Google OAuth).
- **Settings sincronizados:** `default_provider`, usernames cadastrados (`anilist`, `kitsu`, `mal`), `language`, `theme` e `filter_prefs`.
- **Precedência:** Usuário logado -> Supabase (com debounce nas alterações). Usuário anônimo -> `localStorage` (comportamento atual sem regressão).

**Esforço:** Médio. Requer `AuthContext.jsx`, `AuthModal.jsx` e a tabela `user_settings` (JSONB) no Supabase.

---

### A7. Web Worker para processamento estatístico pesado

**Onde:** `src/logic/analytics.js` e `src/logic/recommender.js`

**Problema:** Em contas com listas extensas (ex. >500-1000 animes), os cálculos repetitivos de `computeBayesianGenreStats` e `scoreRecommendations()` na thread principal podem causar pequenos travamentos na UI durante a renderização inicial ou filtragem.

**Correção proposta:**
- Mover a execução desses cálculos para um Web Worker dedicado via `Worker` API / Vite plugin.
- Manter a versão síncrona como fallback caso Web Workers não estejam disponíveis.

**Esforço estimado:** Médio (0,5–1 dia).

---

### A8. Observabilidade — OpenTelemetry Browser (Opt-in)

Monitorar latência de APIs externas (AniList/Kitsu/MAL), taxas de erro de renderização e performance dos algoritmos de recomendação em produção.

- Browser SDK com exportador OTLP/HTTP.
- Tracking de latência p50/p95/p99 dos providers.
- **Privacidade estrita:** Hash dos usernames, sampling de 1-5% e chave de opt-in visível no `SettingsMenu.jsx`.

**Esforço estimado:** Médio.

---

## 4. Ordem sugerida de execução

| # | Item | Frente | Prioridade | Motivo |
|---|------|--------|------------|--------|
| 1 | A3 + B1 (entregues juntos) | Correção + Melhoria | 🔥 Alta | Ganho imediato de UX com esforço mínimo — expõe a justificativa da nota. |
| 2 | A2 — erros tipados | Correção | 🔥 Alta | Previne regressão silenciosa de retry por mudança de copy/i18n. |
| 3 | A5 — hook `useLocalStorage` | Correção | 🟡 Média | Limpeza de código e refatoração de `App.jsx`. |
| 4 | A1 + A4 (agrupados por porte) | Correção | 🟡 Média | LRU cache com índice + desacoplamento de constantes do algoritmo. |
| 5* | A6 — cleanup de artefatos legados | Correção | 🟢 Rápida | Deletar `test-fetch-dub.js` e XML de scraping da dublagem. |
| 6 | B2 + B5 | Melhoria | 🚀 Features | Modo descoberta e exportação visual de perfil. |
| 7 | B6 — Sync Supabase | Melhoria | 🚀 Features | Login e sincronização de configurações cross-device. |
| 8 | B3 — comparação entre usuários | Melhoria | 🚀 Features | Recomendações cruzadas entre dois perfis. |
| 9 | A7 — Web Worker Performance | Correção/Infra | 🟡 Média | Otimização para grandes volumes de dados. |
| 10 | A8 — OpenTelemetry | Infra | ⏸️ Baixa | Telemetria e observabilidade client-side. |
| 11 | B4 — novidades de temporada (v1 client-side) | Melhoria | 🚀 Features | Checagem de novas temporadas ao carregar a lista. |
| 12 | B4 — Web Push completo (v2) | Backlog | ⏸️ Baixa | Exige infra persistente (cron, VAPID, tabela de subscriptions). |

P = pequeno, M = médio, A = alto.

---

## 5. Próximos passos

- Abrir issues no GitHub (`gh issue create`) seguindo a ordem priorizada acima.
- O progresso e conclusão das tarefas devem ser gerenciados diretamente no GitHub Issues (`gh issue list`, `gh issue close <id>`).
- Este documento funciona como pré-especificação técnica dos epics e deve ser mantido atualizado conforme novas ideias surgirem.

