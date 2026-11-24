# Roadmap — Migração para Cloudflare Pages & Domínio Próprio

**Repositório:** wagnergsantos/animatch  
**Data:** 23/11/2026 (Atualizado)  
**Objetivo:** Migrar o hosting do frontend para o Cloudflare Pages, migrar a proxy function para o Edge, atualizar integrações e preparar o terreno para domínio próprio futuro.

---

## 1. Premissas e Motivação

1. **Permissão de Monetização:** Termos da Cloudflare Pages autorizam monetização/AdSense no plano 100% gratuito (diferente da Vercel Hobby e GitHub Pages).
2. **Largura de Banda Ilimitada:** Sem limite de tráfego mensal ou cobrança por excesso.
3. **Rotas SPA Nativas:** Eliminação de 404 em recarregamento de páginas (`/* /index.html 200`) sem gambiarras.
4. **Deploy Nativo Cloudflare:** Conexão direta com o Git dispensa workflows manuais de CI/CD.

---

## 2. Fases de Execução

### Fase CF1 — Ajustes de Caminho Raiz no Código (Desacoplamento do GitHub Pages)
- [ ] **`vite.config.js`**: Alterar `base: '/animatch/'` para `base: '/'`. Remover `server.hmr.path: '/animatch/'`.
- [ ] **`index.html`**: Remover prefixos `/animatch/` dos links estáticos:
  - `href="/animatch/favicon.svg"` → `href="/favicon.svg"`
  - `href="/animatch/manifest.json"` → `href="/manifest.json"`
  - `content="/animatch/favicon.svg"` → `content="/favicon.svg"`
- [ ] **`src/main.jsx`**: Alterar registro do Service Worker de `navigator.serviceWorker.register('/animatch/sw.js')` para `navigator.serviceWorker.register('/sw.js')`.
- [ ] **Fallback de Rotas SPA (`public/_redirects`)**: Criar o arquivo `public/_redirects` com:
  ```text
  /*    /index.html   200
  ```
- [ ] **Validação local**: Rodar `npm run build` e `npm run test`.

---

### Fase CF2 — Deploy Nativo no Cloudflare Pages
- [ ] Já conectado via **Connect to Git** na Cloudflare (o build e deploy a cada push ocorrem sozinhos, dispensando GitHub Actions).
- [ ] **Variáveis de Ambiente na Cloudflare**:
  - Acessar o projeto no Cloudflare Pages > **Settings > Environment variables**.
  - Adicionar `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- [ ] Validar carregamento do site na URL `*.pages.dev`.

---

### Fase CF3 — Migração do `mal-proxy` para Cloudflare Pages Functions
- [ ] Criar a pasta `functions/api/` no repositório.
- [ ] Criar `functions/api/mal-proxy.ts` portando a lógica do proxy MyAnimeList:
  - Injetar o header `X-MAL-CLIENT-ID` vindo de variável de ambiente da Cloudflare (`MAL_CLIENT_ID`).
  - Executar no mesmo domínio (`/api/mal-proxy`), eliminando problemas de CORS e cold start do Supabase.
- [ ] Atualizar chamadas em `src/api/providers/mal.js` para usar o endpoint relativo `/api/mal-proxy` quando em produção.

---

### Fase CF4 — Atualização de Integrações Externas (Obrigatório para `*.pages.dev`)
*(Necessário imediatamente para o login e requisições funcionarem na Cloudflare)*
- [ ] **Supabase Auth**:
  - No painel Supabase > **Authentication > URL Configuration > Redirect URLs**:
  - Adicionar a URL da Cloudflare: `https://*.pages.dev/**` (e `https://animatch-77k.pages.dev/**`).
- [ ] **CORS do Supabase (`supabase/functions/_shared/cors.ts`)**:
  - Adicionar `https://*.pages.dev` e `https://animatch-77k.pages.dev` na lista de origens permitidas (necessário enquanto o `mal-proxy` ou outras functions ainda rodarem no Supabase).

---

### Fase CF5 (Futuro) — Registro de Domínio Próprio & DNS
- [ ] Escolher e registrar domínio internacional no Cloudflare Registrar (ex: `animatch.app` ou `animatch.com`).
- [ ] Adicionar o domínio em **Custom domains** no Cloudflare Pages (ativação automática de SSL/TLS).
- [ ] Atualizar `link[rel="canonical"]` e `og:url` em `index.html`.
- [ ] Incluir o domínio próprio final nas Redirect URLs do Supabase Auth e nas diretivas CSP.
