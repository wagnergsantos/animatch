# Roadmap & Avaliação — AniMatch

> **Projeto:** AniMatch ([wagnergsantos/animatch](https://github.com/wagnergsantos/animatch/))
> **Última atualização:** 14/08/2026

---

## 🛑 Bugs identificados

| # | Bug | Impacto | Local | Solução |
|---|---|---|---|---|
| **B1** | Hook condicional (`useMemo` após return condicional) | Alto | `RecommendationGrid.jsx` | Mover `useMemo` antes de retornos condicionais |
| **B2** | Nota 0 invisível nos cards | Médio | `AnimeCard.jsx` | Usar checagem `!= null` para scores |
| **B3** | `forceRefresh` parâmetro órfão | Médio | `anilist.js` / UI | Botão "Atualizar Lista" que chama com `{ forceRefresh: true }` |

---

## ✅ Concluído

### i18n — Fase 1 (2026-08-04)
- Scaffold `src/i18n.js` com react-i18next
- Recursos pt-BR / en / ja
- Migração de todos os componentes principais
- Persistência de idioma em localStorage + `Accept-Language` detection

### Kitsu — Provider alternativo
- REST JSON:API com paginação automática
- Include de categorias/gêneros em única paginação
- Normalização para formato padrão AniList

### MAL — MyAnimeList como 3º provider (2026-08-14)
- Provedor MAL integrado via MAL API v2 oficial
- Supabase Edge Function (`mal-proxy`) atuando como proxy seguro do `client_id` (sem expor no bundle)
- Suporte a todos os status (`completed`, `plan_to_watch`, `watching`, `on_hold`, `dropped`) buscados em paralelo com cache no cliente (5 min)
- Suporte a títulos em Inglês e Romaji (via `alternative_titles`)
- Pill seletor no `LoginScreen`, suporte no `App.jsx` e URLs compartilháveis (`?user=x&provider=mal`)
- Suíte de testes unitários dedicada (`mal.test.js`)

### Estatísticas (parcial)
- `logic/analytics.js`: `computeBayesianGenreStats`, `computeOverviewStats`
- `StatisticsView`, `GenreBarChart`, `MetricsSummary`
- Plano completo em `docs/plano_implementacao_estatisticas.md`

---

## 🚧 Em andamento / Próximas features

### Fix de Bugs Emergenciais (B1, B2, B3)
- B1: Mover `useMemo` antes de retornos condicionais (`RecommendationGrid.jsx`)
- B2: Checagem `!= null` para notas 0 nos cards (`AnimeCard.jsx`)
- B3: Ajustar parâmetro `forceRefresh` na UI e APIs

---

## 📋 Backlog

### Login Animatch + Sync de Configurações (Supabase — Fase 2)

**Pré-requisito:** Supabase já estará criado e configurado pelo MAL. Esta fase adiciona auth + tabelas em cima da infra existente.

**Motivação:** Settings hoje ficam presos no browser (localStorage). Login real permite sync entre dispositivos.

**Escopo aprovado:**

#### Auth
- Email/senha (conta própria Animatch)
- Google OAuth
- Supabase Auth (zero backend próprio)

#### Settings sincronizados
- `provider_configs`: username por provider (AniList, Kitsu, MAL)
- `default_provider`
- `language` (idioma da interface)
- `theme` (dark/light)
- `filter_prefs` (gênero favoritado, formato, ano mínimo)

#### Arquitetura proposta
```
src/
  auth/
    AuthContext.jsx         ← React context: user, session, login/logout
    AuthModal.jsx           ← Modal: tabs "Entrar" | "Criar conta" | Google
  hooks/
    useUserSettings.js      ← lê/escreve settings no Supabase (debounced 2s)
```
*(o `supabase.js` client singleton já existirá do MAL)*

#### Fluxo de dados
- Usuário logado → load settings do Supabase ao entrar
- Cada mudança → debounce 2s → upsert no Supabase
- Usuário não logado → comportamento atual (localStorage), sem regressão
- **Precedência:** Supabase (logado) > localStorage (não logado)

#### UI
- Botão "Entrar / Criar conta" no canto superior da LoginScreen (ao lado do ThemeToggle)
- Usuário logado → avatar/nome substituem o botão
- `AuthModal`: modal com tabs Email | Google

#### Infra adicional (além do que já existe do MAL)
- Habilitar Supabase Auth (Google OAuth provider)
- Tabela: `user_settings` (1 row por user_id, JSONB)

**Status:** Design aprovado, aguardando MAL ser entregue primeiro

---

### ⚠️ Remover feature de Dublagem — Prioridade Alta

**Motivação:** A detecção de dub é não-confiável — falsos positivos (marca PT-BR animes sem dub real) e inconsistente entre providers (AniList usa voice actors por personagem, Kitsu usa castings, MAL teria lógica diferente). UX degradada: usuário vê badge PT-BR, vai assistir e não tem dub.

**Escopo da remoção:**
- `src/api/providers/anilist.js`: remover `fetchDubInfo` + `DUB_QUERY` + `DUB_LANGUAGE_MAP`
- `src/api/providers/kitsu.js`: remover `kitsuFetchDubInfo` + `KITSU_CACHE_KEY_DUB` + lógica de castings
- `src/api/index.js`: remover `fetchDubInfo` + `clearProviderCache` dub-related + export `DUB_LANGUAGE_MAP`
- `src/components/AnimeCard.jsx`: remover badge de dub
- `src/components/AnimeDetailModal.jsx`: remover menção a dub
- `src/components/SettingsMenu.jsx`: remover seletor de dub favorita
- `src/components/Dashboard.jsx`: remover chamada a `fetchDubInfo`
- `src/components/FilterBar.jsx`: remover filtro de dub (se existir)
- Locales: remover keys relacionadas a dub
- Testes: atualizar/remover testes de dub

**Status:** Concluído (2026-08-14)

---

### Observabilidade — OpenTelemetry Browser
- Browser SDK + OTLP/HTTP para SaaS (Honeycomb / Grafana Cloud)
- Spans: chamadas AniList/Kitsu/MAL, `computeBayesianGenreStats`, eventos UI
- Métricas: contadores de req/erro, histograma de latência p50/p95/p99
- Privacidade: hash de usernames, sampling 1-5%, opt-in no SettingsMenu

### Performance
- Debounce no slider de confiança (C)
- Web Worker para `computeBayesianGenreStats` em listas grandes
- Memoização revisada em `RecommendationGrid`

### CI/CD
- GitHub Actions: lint → test → build → deploy
- Cobertura de testes para `analytics.js` (casos de borda: sem scores, C extremos)

---

## Checklist geral
- [x] i18n (pt-BR / en / ja)
- [x] Provider Kitsu
- [x] **MAL como provider (MAL API v2 + Supabase Edge Function)**
- [x] Estatísticas básicas
- [x] ⚠️ **Remover feature de Dublagem**
- [ ] Fix B1/B2/B3
- [ ] Login Supabase + sync de settings
- [ ] OpenTelemetry browser
- [ ] GitHub Actions CI
- [ ] Web Worker para compute pesado