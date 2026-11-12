# Roadmap — Segurança da Informação, Hardening e Infraestrutura

**Repositório:** wagnergsantos/animatch
**Data:** 10/11/2026
**Escopo:** Revisão das "5 Portas Abertas" (Chave no navegador, Tabela sem RLS, Servidor sem firewall, Consulta sem parâmetro e Configuração de teste no ar) + unificação do item `A14` (#26) movido do `docs/roadmap_v2.md`.
**Documento complementar:** Ver [roadmap_legal_privacidade.md](./roadmap_legal_privacidade.md) para os itens de Adequação Legal, Privacidade e LGPD/GDPR/ECA (`L1–L4`, Issues `#27–#30`).

---

## 1. Diagnóstico das 5 Portas Abertas

| Porta | O que já está protegido | O que precisa ser fechado | Issue |
| :--- | :--- | :--- | :--- |
| **1. Chave de API no navegador** | `MAL_CLIENT_ID` fica apenas na Edge Function (`mal-proxy`); `.env.local` e `supabase/functions/.env` estão no `.gitignore`; front usa apenas `VITE_SUPABASE_ANON_KEY` (pública por design); histórico do Git limpo de chaves reais. | `.env.development` segue rastreado no Git; `.env.example` traz valores preenchidos; falta `.env.example` para a Edge Function (`MAL_CLIENT_ID=`); falta trava em `src/supabase.js` impedindo uso acidental de chave secreta (`sb_secret_` / `service_role`) em variável `VITE_`. | **#33 (`S4`)** |
| **2. Tabela sem RLS** | `public.user_settings` e `public.user_anime_lists` têm RLS ativo (`auth.uid() = user_id`). | Falta policy `FOR DELETE` em `user_settings` (coberto em **#29 / L3**) e faltam constraints `CHECK` limitando o tamanho dos campos `jsonb` (`settings` e `entries`) contra ataques de exaustão de storage. | **#32 (`S3`)** + **#29 (`L3`)** |
| **3. Servidor sem firewall** | Chamadas do MAL passam pela Edge Function `mal-proxy`. | CORS com wildcard `*` (`cors.ts`), ausência de rate-limit por IP, ausência de teto de páginas nos loops `while (url)` (`mal-proxy` e `kitsu.js`), falta de retry em HTTP `429` (`A14`) e ausência de `Content-Security-Policy` (CSP) em `index.html`. | **#26 (`S1`)** |
| **4. Consulta sem parâmetro** | Queries GraphQL (`anilist.js`) e PostgREST usam variáveis/filtros parametrizados; URLs usam `encodeURIComponent`. | `username` não passa por validação de regex/tamanho; paginação `paging.next` do `mal-proxy` envia `X-MAL-CLIENT-ID` sem validar o domínio de destino; `streamingLinks` e `siteUrl` não validam protocolo `http/https` antes de abrir. | **#31 (`S2`)** |
| **5. Configuração de teste no ar** | Testes rodam isolados em Vitest/jsdom. | Job `deploy` em `.github/workflows/ci.yml` faz fallback silencioso para `https://placeholder.supabase.co` se os secrets falharem; `supabase/config.toml` tem `enable_confirmations = false`, senha mínima de 6 caracteres e apenas `localhost` nos redirects. | **#33 (`S4`)** |

---

## 2. Itens de Implementação

### [ ] S1 (antigo A14) — Firewall, CORS Restrito, Rate-Limit, Teto de Paginação, Retry 429 e CSP (#26)

**Onde:** `supabase/functions/_shared/cors.ts`, `supabase/functions/mal-proxy/index.ts`, `src/api/errors.js`, `src/api/providers/anilist.js`, `src/api/providers/kitsu.js`, `index.html`

1. **Restringir CORS (`supabase/functions/_shared/cors.ts`)**:
   - Substituir `'Access-Control-Allow-Origin': '*'` por função `getCorsHeaders(req)` que valida o header `Origin` contra uma allowlist (`https://wagnergsantos.github.io`, `http://localhost:5173`, `http://127.0.0.1:5173`).
2. **Proteger Edge Function `mal-proxy` (`supabase/functions/mal-proxy/index.ts`)**:
   - Validar presença de header `apikey` / `Authorization` e implementar rate-limit por IP (`x-forwarded-for`) em memória para proteger o `MAL_CLIENT_ID` sem impedir o modo visitante.
   - Limitar paginação no loop `while (url)` (`MAX_PAGES = 10` no `mal-proxy` e `MAX_PAGES = 20` em `src/api/providers/kitsu.js`) para evitar exaustão de memória/timeout em listas gigantes.
   - Repassar status `429` e header `Retry-After` da API do MyAnimeList ao cliente em vez de erro genérico `500`.
3. **Resiliência a HTTP `429` no Cliente (`src/api/errors.js`, `src/api/providers/anilist.js`)**:
   - Ajustar `RateLimitError` para suportar `statusCode` (403/429) e flag `isRetryable`.
   - Em `anilist.js`, tratar status `429` como retentável respeitando `Retry-After` com backoff exponencial.
4. **Content Security Policy (`index.html`)**:
   - Adicionar meta tag `Content-Security-Policy` restringindo `default-src 'self'`, `script-src`, `style-src`, `img-src` e `connect-src` aos domínios estritamente necessários.

---

### [x] S2 — Validação de Parâmetros (`username`), Prevenção de SSRF em Paginação e Sanitização de URLs (#31)

**Onde:** `src/api/index.js`, `src/App.jsx`, `supabase/functions/mal-proxy/index.ts`, `src/api/providers/kitsu.js`, `src/logic/streaming.js`, `src/components/AnimeCard.jsx`, `src/components/AnimeDetailModal.jsx`, `src/components/DecisionModal.jsx`

1. **Validação estrita de `username`**:
   - Criar validador `isValidUsername(username)` (`/^[a-zA-Z0-9_.-]{1,50}$/`) e aplicá-lo na leitura de `?user=` em `App.jsx`, em `fetchUserEntries()` (`src/api/index.js`) e no body do `mal-proxy`.
2. **Validação de URL de paginação (`paging.next` / `links.next`)**:
   - Em `supabase/functions/mal-proxy/index.ts`: garantir que `json.paging?.next` começa estritamente com `https://api.myanimelist.net/v2/` antes de seguir a próxima página enviando `X-MAL-CLIENT-ID`.
   - Em `src/api/providers/kitsu.js`: garantir que `data.links?.next` começa com `https://kitsu.io/api/edge/`.
3. **Sanitização de links externos contra `javascript:`**:
   - Criar helper `isSafeExternalUrl(url)` (`/^https?:\/\//i.test(url)`) e validar todos os `streamingLinks` e `siteUrl` antes de renderizar em `<a href>` ou acionar `window.open()`.

---

### [x] S3 — Hardening de Banco de Dados: Limites de Payload JSONB e Constraints nas Tabelas RLS (#32)

**Onde:** `supabase/migrations/`

1. **Constraints de tamanho e formato em `public.user_settings` e `public.user_anime_lists`**:
   - `user_settings`: `CHECK (pg_column_size(settings) <= 65536)` (máx. 64 KB).
   - `user_anime_lists`:
     - `CHECK (pg_column_size(entries) <= 5242880)` (máx. 5 MB).
     - `CHECK (provider in ('anilist', 'kitsu', 'mal', 'ensemble'))`.
     - `CHECK (char_length(username) between 1 and 60)`.
   - *(Complementa a migration da Issue **#29 / L3**, que adiciona a policy `FOR DELETE` em `user_settings` e a RPC `delete_own_account()`).*

---

### [x] S4 — Segurança de Deploy, Segredos, Config de Auth e Documentação (#33)

**Onde:** `.env.development`, `.env.example`, `supabase/functions/.env.example`, `.gitignore`, `src/supabase.js`, `.github/workflows/ci.yml`, `supabase/config.toml`, `src/components/AuthModal.jsx`, `README.md`

1. **Higiene de Arquivos `.env` e Templates sem Valores**:
   - Executar `git rm --cached .env.development` para que o Git pare de rastrear o arquivo e respeite a regra `.env.*` do `.gitignore`.
   - Atualizar `.env.example` mantendo **apenas os nomes das variáveis sem valores** (`VITE_SUPABASE_URL=` e `VITE_SUPABASE_ANON_KEY=`).
   - Criar `supabase/functions/.env.example` apenas com `MAL_CLIENT_ID=` (e adicionar exceção `!supabase/functions/.env.example` no `.gitignore`).
2. **Trava contra Vazamento de Chave Secreta no Navegador (`src/supabase.js`)**:
   - Adicionar verificação em `src/supabase.js` que bloqueia a criação do cliente e lança erro claro caso `VITE_SUPABASE_ANON_KEY` comece com `sb_secret_` ou contenha role `service_role`.
3. **Travar Deploy de Produção sem Secrets (`.github/workflows/ci.yml`)**:
   - Manter o fallback `|| 'https://placeholder.supabase.co'` apenas no job `lint-test-build` (para execução de testes em PRs).
   - No job `deploy`, remover o fallback silencioso e adicionar step de verificação que falha o deploy caso `VITE_SUPABASE_URL` ou `VITE_SUPABASE_ANON_KEY` estejam vazios.
4. **Hardening de Autenticação (`supabase/config.toml` e `src/components/AuthModal.jsx`)**:
   - Em `supabase/config.toml`: adicionar `https://wagnergsantos.github.io/animatch/**` em `additional_redirect_urls`, definir `enable_confirmations = true` e elevar `minimum_password_length = 8` (alinhando validação mínima no `AuthModal.jsx`).
5. **Documentação de Infraestrutura (`README.md`)**:
   - Documentar configuração completa de variáveis `.env`, migrations SQL/RLS e deploy da Edge Function `mal-proxy`.

---

## 3. Ordem Recomendada de Execução (Segurança)

| Ordem | Issue | Código | Entrega | Prioridade | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **#26** | **S1 (A14)** | CORS restrito, rate-limit por IP, teto de paginação, retry `429` e CSP | 🔥 Crítica | 📋 Aberto |
| **2** | **#31** | **S2** | Validação de `username`, proteção SSRF em `paging.next` e sanitização de URLs | 🔥 Alta | ✅ Concluído |
| **3** | **#32** | **S3** | Constraints SQL de tamanho máximo (`jsonb`) e formato nas tabelas com RLS | 🟡 Alta | ✅ Concluído |
| **4** | **#33** | **S4** | Desrastrear `.env.development`, travar deploy sem secrets, `config.toml` e docs | 🟡 Alta | ✅ Concluído |
