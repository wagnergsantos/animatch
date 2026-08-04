# Avaliação Geral e Propostas de Melhoria — AniMatch

> **Projeto:** AniMatch ([wagnergsantos/animatch](https://github.com/wagnergsantos/animatch/))
> **Data de Consolidação:** 04/08/2026
> **Status:** App SPA React com lógica de recomendação e estatísticas; melhorias recomendadas em i18n, observabilidade e telemetria.

---

## 🎯 O que é o AniMatch (resumo curto)
AniMatch é uma SPA React que consome listas AniList do usuário para construir um perfil de gosto (médias por gênero, média Bayesiana) e gerar recomendações, além de mostrar badges (ex.: dublagem PT‑BR). A maior parte da lógica (recomendações e analytics) roda no frontend.

---

## ✅ Entendimento rápido sobre OpenTelemetry e necessidade de backend
- Não é necessário ter um backend para começar a instrumentar com OpenTelemetry: o browser SDK (opentelemetry-js) permite coletar traces/metrics no cliente. Para enviar esses dados você pode:
  - Exportar diretamente para um SaaS compatível (Honeycomb, Datadog, Grafana Cloud) usando os exporters que aceitam ingestão via HTTP/OTLP.
  - Ou rodar um Collector local/externo (OTel Collector) para transformar/encaminhar dados (recomendado se quiser Prometheus/Grafana on‑prem).
- Resumo prático: instrumentação é útil mesmo sem backend — trazé visibilidade sobre latência de chamadas externas (AniList), custo de recomputação (computeBayesianGenreStats) e eventos UI (cliques em gêneros, aplicação de filtros).

---

## 🛑 1. Bugs e problemas já identificados (mantidos)
(Manter/validar a tabela de bugs já existente e priorizar B1, B2, B3 como emergenciais.)

| # | Bug | Impacto | Local | Solução Recomendada |
|---|---|---|---|---|
| **B1** | **Hook Condicional** | Alto | `RecommendationGrid.jsx` | Mover `useMemo` antes de retornos condicionais. |
| **B2** | **Nota 0 Invisível nos Cards** | Médio | `AnimeCard.jsx` | Usar checagem `!= null` para scores. |
| **B3** | **Parâmetro `forceRefresh` Órfão** | Médio | `anilist.js` / UI | Botão "Atualizar Lista" que chama com `{ forceRefresh: true }`. |

---

## 💡 2. Prioridades de Melhoria (resumido com foco em i18n, estatísticas e observabilidade)

1) Internacionalização (i18n) — Alto
- Externalizar todas as strings UI em arquivos de recursos (JSON/PO). Usar ICU MessageFormat para plurais e interpolação.
- Biblioteca recomendada: `react-i18next` (fácil integração) ou `formatjs`/`react-intl` se precisar de MessageFormat mais puro.
- Locale detection: Accept‑Language header (navegador) + preferência no `SettingsMenu` persistida em `localStorage`.
- CI: checagem de chaves faltantes e placeholders em PRs; testes unitários das traduções essenciais.
- Tornar badges e rótulos (ex.: dublagem) dependentes do locale (não hardcoded `pt-br`).

2) Estatísticas & Telemetria — Alto
- Instrumentar pontos-chave no frontend: chamadas a AniList/kitsu, `computeBayesianGenreStats`, recomputações (slider C), erro na UI e eventos de interação (genre click, apply filter).
- Métricas mínimas: contador de requests, contador de erros, histograma de latência (p50/p95/p99), eventos de recompute (contagem + duração).
- Implementação sem backend: usar OTel Browser SDK + OTLP/HTTP exporter para um Collector ou enviar direto para SaaS. Para Prometheus, instalar Collector para receber e expor métricas.
- Privacidade: hash/anonymize user IDs, sampling (ex.: 1% ou adaptativo), consentimento opt‑in para telemetria.

3) Performance do Frontend — Médio
- Debounce no slider de confiança (C) e mover cálculo pesado para Web Worker quando necessário.
- Evitar recomputações desnecessárias: memoização cuidadosa e extrair lógica pura para módulos testáveis.

4) Qualidade & CI — Médio
- ESLint + Prettier + configuração Husky (opcional). GitHub Actions: lint → test → build → deploy.
- Testes unitários focados em `logic/analytics.js` (cobertura de borda: sem scores, anos inválidos, C extremos).

---

## 🔧 Recomendações práticas — Como começar (ações imediatas)
1. i18n scaffold: instalar `react-i18next`, criar `locales/pt-BR.json` e `locales/en.json`, migrar `index.html lang` e componentes mais visíveis (`SettingsMenu`, `AnimeCard`, `StatisticsView`).
2. Telemetria mínima: adicionar pacote `@opentelemetry/api` + `@opentelemetry/sdk-trace-web` e configurar um tracer que emita spans ao buscar AniList e ao executar `computeBayesianGenreStats`.
3. Métricas básicas: contador de requests/erros e histograma de latência com exportador OTLP para Collector (ou usar um SDK SaaS com ingestão HTTP para simplicidade).
4. Testes: adicionar casos unitários para `computeBayesianGenreStats` cobrindo pluralidade de cenários (nenhum score, poucos scores, muitos scores).
5. UX: debounce no slider de confiança e considerar Web Worker para run heavy compute.

---

## ✅ Checklist de itens a incluir no repositório (podemos aplicar automaticamente)
- [x] locales/pt-BR.json + locales/en.json (string keys)
- [x] i18n provider (react-i18next) + detector (localStorage + Accept-Language)
- [ ] Instrumentação básica OpenTelemetry (browser) com exemplo de span + metric
- [ ] Testes unitários adicionais para analytics.js
- [ ] GitHub Actions: workflow `ci.yml` (lint/test/build)
- [ ] Script de export CSV/JSON das estatísticas (opcional)

---

## 📌 Fase i18n — Concluída
- Status: Concluído em 2026-08-04
- O que foi feito: scaffold i18n (src/i18n.js), recursos pt-BR/en/ja, migração de componentes principais (SettingsMenu, AnimeCard, AnimeDetailModal, FilterBar, StatisticsView, RecommendationGrid, Dashboard, LoginScreen, TasteProfile, modals) e persistência de idioma em localStorage.
- Observações: Dependências i18next/react-i18next adicionadas; testes atualizados para suportar i18n. Recomendado: rodar `npm install` e revisar componentes restantes com conteúdo dinâmico (gêneros, datas, números).

---

## Privacidade & Operações
- Documentar a política de telemetria (o que é coletado, retenção, como anonimizar). Oferecer un opt‑out nas configurações.
- Usar sampling e hashing para reduzir exposição de PII.

---

## Próximos passos (sugestão operacional)
Escolher 1–2 entregáveis imediatos. Recomenda-se iniciar por:
1) Scaffold i18n + migrar 5 componentes críticos (SettingsMenu, AnimeCard, AnimeDetailModal, StatisticsView, FilterBar).
2) Instrumentação mínima: tracer + contador de requests/erros; rodar local Collector ou apontar para trial de SaaS.

Deseja que eu:
- gere o scaffold i18n (arquivos + provider) agora?
- ou gere um exemplo mínimo de instrumentação OpenTelemetry no frontend (sem backend) e um README curto explicando onde apontar os dados?

Responda: "i18n", "telemetria", "ambos" ou "nenhum".