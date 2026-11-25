# Directrizes para Agentes — Animatch

Guia de contexto, arquitetura e convenções técnicas para agentes de IA operando no repositório **Animatch**.

---

## 1. Visão Geral e Arquitetura

O **Animatch** é uma Single Page Application (SPA) para recomendação e análise de animes a partir do histórico de usuários em provedores externos (AniList, Kitsu e MyAnimeList).

- **Stack**: React 19 (`react`, `react-dom`), Vite 5, CSS Modules (`*.module.css`), plain JavaScript/JSX.
- **Navegação & Telas**: SPA sem React Router. O controle de fluxo reside em `src/App.jsx` através do estado `screen` (`login`, `loading`, `dashboard`, `settings`, `statistics`) e gerenciamento de modais (`AnimeDetailModal`, `DecisionModal`, `WrappedModal`, `AuthModal`, etc.).
- **Backend & BaaS**: Supabase (PostgreSQL com RLS, Autenticação e Edge Functions) + Cloudflare Pages Functions.

---

## 2. Estrutura de Camadas (`src/`)

```
src/
├── api/             # Integração com APIs externas (AniList, Kitsu, MAL via proxy) e errors.js
│   └── providers/   # Adapters unificados para normalização de formato de animes
├── auth/            # AuthContext, gerenciamento de sessão e integração com Supabase Auth
├── cache/           # Estratégia de cache em 3 níveis (Memória, IndexedDB e Supabase)
├── components/      # Componentes UI organizados com CSS Modules correspondentes (*.module.css)
├── hooks/           # Hooks reutilizáveis (useRecommendationPipeline, useAsyncAction, useModalFocusTrap)
├── lib/             # Utilitários (sanitização, detecção de idioma, medição de performance)
├── locales/         # Dicionários de internacionalização i18next (pt-BR, en, ja)
└── logic/           # Core de domínio (recommender, ensemble, analytics, decision, statistics)
```

---

## 3. Estratégia de Cache e Dados

Para minimizar requisições a APIs externas e contornar rate limits:

1. **Memória (`src/cache/apiCache.js`)**: Cache volátil em memória para resultados de busca durante a sessão.
2. **Local (`src/cache/idbCache.js`)**: Armazenamento offline estruturado em IndexedDB para listas de animes e metadados.
3. **Nuvem (`src/cache/cloudListSync.js`)**: Sincronização automática das listas de animes e configurações do usuário no Supabase (`user_anime_lists`, `user_settings`) sob políticas de Row Level Security (RLS).

---

## 4. Integrações Externas & Edge Functions

- **MyAnimeList (MAL)**: Devido a restrições de CORS da API do MAL, as chamadas obrigatoriamente passam por um proxy:
  - Desenvolvimento/Supabase: `supabase/functions/mal-proxy/index.ts`
  - Cloudflare Pages / Deploy: `functions/api/mal-proxy.ts`
- **AniList**: GraphQL direto via client HTTP padrão.
- **Kitsu**: REST API v3 com endpoints de paginação e filtros normalizados.

---

## 5. Convenções de Código e Boas Práticas

- **Estilização**: Utilizar exclusivamente **CSS Modules** (`[Componente].module.css`) com design tokens e variáveis globais definidas em `src/index.css`. Evitar classes globais arbitrárias.
- **Acessibilidade (a11y)**:
  - Modais devem obrigatoriamente implementar trap de foco via `useModalFocusTrap`.
  - Elementos interativos precisam de atributos ARIA adequados e suporte completo a navegação por teclado (`Escape` para fechar modais).
- **Internacionalização**: Todas as strings visíveis devem ser consumidas via `useTranslation()` (`i18n.js`). Não inserir textos fixos em português ou inglês diretamente nos componentes JSX sem mapeamento em `src/locales/`.
- **Validação de Inputs**: Sanitizar sinopses e conteúdos HTML com `src/lib/synopsisSanitizer.js` antes de renderizar para prevenir XSS.

---

## 6. Gestão de Tarefas e Backlog

- **GitHub Issues**: Fonte da verdade para backlog, tarefas ativas e bugs.
- **GitHub CLI (`gh`)**: Agentes devem utilizar o `gh` para consultar e gerenciar o backlog:
  - Listar tarefas ativas: `gh issue list`
  - Consultar especificações de uma tarefa: `gh issue view <id>`
  - Criar novos bugs ou features identificadas: `gh issue create`
  - Concluir tarefas: `gh issue close <id>`
- **Commits**: Seguir Conventional Commits e referenciar a issue correspondente (`Fixes #X` ou `Ref #X`).

---

## 7. Testes e Validação Obrigatória

Antes de submeter qualquer alteração ou finalizar tarefas:

- **Linter**: `npm run lint` (executa `oxlint`, deve passar sem erros).
- **Testes Unitários**: `npm run test` (executa `vitest run`, todos os testes devem passar).
- **Build**: `npm run build` (garantir que não há quebras de compilação no Vite).
- **CI/CD**: GitHub Actions acionado automaticamente a cada push na `main`/`master`.
