# Plano de Implementação — Aba de Estatísticas (AniMatch)

Data: 2026-08-04
Autor: Copilot (esboço)

Objetivo
--------
Melhorar a aba "Estatísticas" para fornecer visões acionáveis sobre o perfil do usuário, comparações com a média comunitária, histogramas de scores e exportação/snapshots. Incluir auditoria para discrepâncias em contadores (ex.: episódios, vistos).

Visão geral da UI
------------------
- Top bar: Seletor de período (Tudo / 30d / 90d / Custom), botão Exportar (CSV/JSON), botão Salvar Snapshot.
- Painel esquerdo (gráficos):
  - GenreBarChart: barras por gênero (count, avg predicted, avg community)
  - CommunityCompareChart: comparação predicted vs community (line/bar)
  - ScoresHistogram: histograma de predicted scores
- Painel direito:
  - MetricsSummary: contadores (total vistos, total episódios, mídias únicas, recomputes count/duração)
  - StatsTable: tabela detalhada com paginação e filtros
- Interatividade: clicar numa barra filtra a tabela (drill-down); filtros por ano/format/gênero/search.

Componentes (arquitetura)
-------------------------
- src/components/StatisticsPage.jsx (container)
- src/components/TimeRangeSelector.jsx
- src/components/GenreBarChart.jsx
- src/components/CommunityCompareChart.jsx
- src/components/ScoresHistogram.jsx
- src/components/StatsTable.jsx
- src/components/ExportSnapshotButton.jsx
- src/workers/aggregation.worker.js (opcional: Web Worker)
- src/logic/statistics.js (normalização e agregação)

Esquema de dados interno
-------------------------
- MetricsSummary: { totalSeen:int, totalEpisodes:int, uniqueMedia:int, recomputes:{count:int, totalMs:int} }
- GenreStats: [{ genre:string, count:int, avgPredicted:float, avgCommunity:float }]
- ScoreHistogram: [{ binStart:float, binEnd:float, count:int }]
- DetailedRow: { id:int, title:string, genres:[string], predictedScore:number|null, communityScore:number|null, episodes:int|null, provider:string, status:string }

Funções principais (src/logic/statistics.js)
-------------------------------------------
- normalizeEntries(entries):
  - Extrai: id (media.id), title, episodes (media.episodes || null), genres, predictedScore, communityScore, provider, status
  - Garante tipos e valores default
- dedupeByMediaId(entries): retorna array sem duplicatas por id
- aggregateGenreStats(entries): calcula count e médias (predicted/community)
- buildHistogram(entries, bins=10): cria buckets para predictedScore
- buildMetricsSummary(entries, recomputeInfo): soma episódios (uma vez por id), total vistos (count status COMPLETED)

Como detectar e corrigir discrepâncias (contadores)
---------------------------------------------------
- Regra de verdade: contar mídias por media.id único (não por list entries). Use dedupeByMediaId.
- Episodes total: usar media.episodes quando disponível; somar apenas uma vez por media.id.
- Auditoria: gerar relatório `audit/discrepancies-${user}.json` com campos { id, title, episodes_api, episodes_local, status_api, status_local }.
- Comando sugerido para auditoria: criar script `scripts/audit-entries.js` que chama fetchUserEntries(username) e grava diff.

Export & Snapshot
------------------
- JSON snapshot: { generatedAt, user, metricsSummary, genreStats, scoreHistogram, detailedRows }
- CSV: details.csv (linhas por media), summary.csv (contadores)
- Botões: Exportar (gera e baixa CSV/JSON), Salvar Snapshot (gera no formato JSON e oferece download)

Testes
------
- Unit tests (vitest): normalizeEntries, dedupeByMediaId, aggregateGenreStats, buildHistogram
- Integration: render StatisticsPage com fixture (ex.: 500 entries) validar contadores e filtros
- Testes de auditoria: comparar 20 amostras de API vs normalized

Performance
-----------
- Para >= 500 itens, usar Web Worker para agregação
- Memoizar agregações com useMemo([entries, timeRange, filters])
- Virtualize tabela (react-window) se detailedRows for grande

Entrega e Cronograma sugerido
-----------------------------
- Fase 1 (1-2 dias): scaffolding UI + normalizeEntries + GenreBarChart + metrics summary + CSV export
- Fase 2 (1-2 dias): CommunityCompareChart + ScoresHistogram + StatsTable + testes unitários
- Fase 3 (1 dia): Web Worker + auditoria de discrepâncias + snapshots e refinamento

Notas de implementação
----------------------
- Usar Chart.js ou Recharts para gráficos (Recharts mais React-friendly). Evitar bibliotecas pesadas sem tree-shaking.
- Internacionalização: usar t(...) para textos (i18n já integrado).
- Privacidade: não enviar PII; snapshots locais apenas.

Comandos úteis
--------------
- rodar testes: npm test
- gerar auditoria: node scripts/audit-entries.js <username>

Próximos passos sugeridos (quando pronto para implementar)
---------------------------------------------------------
1. Criar arquivo `src/logic/statistics.js` com funções de normalização e escrever testes unitários.
2. Criar `StatisticsPage.jsx` com layout estático e fixtures.
3. Implementar GenreBarChart e MetricSummary.
4. Implementar export/snapshot e auditoria básica.

---

(Arquivo gerado automaticamente pelo Copilot CLI)