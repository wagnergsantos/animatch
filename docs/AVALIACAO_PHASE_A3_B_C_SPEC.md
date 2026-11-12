# 📋 Avaliação: PHASE_A3_B_C_SPEC.md

**Data:** 12/11/2026, 20:36  
**Avaliador:** Copilot CLI  
**Status:** ✅ **EXCELENTE — Pronto para implementação com observações**

---

## 🎯 Síntese

A especificação é **muito bem estruturada**, com:
- ✅ Escopo claro e decomposição realista
- ✅ Gates de decisão objetivos (A0 medições)
- ✅ Riscos identificados e mitigações propostas
- ✅ Ordem de execução sensata (A0 → A4 → B/C condicionais)
- ✅ Critérios de aceite testáveis
- ✅ Rastreabilidade de issues

**Recomendação:** Implementar nesta ordem:
1. **A0** (2–4h): Instrumentação e medições
2. **A4** (1h): Imagens (sem gate, alta prioridade)
3. **B4** (1–2h): Acessibilidade filtros
4. **B2** (30min): Motion/Focus
5. **B1** (1h): UI — destaque scores
6. **A3** (3–4h condicional): Só se A0 provar Phase 2 > 100ms
7. **C1** (4–6h condicional): Só se A0 provar Phase 1 > 200ms mobile

---

## ✅ Pontos Fortes

### 1. **A0: Instrumentação é Prerequisito Sólido**
```javascript
// Proposta sensata
- performance.mark() / performance.measure() com flag DEV/debug
- Zero overhead em produção (marks desligadas)
- Pontos bem escolhidos (phase1:start/end, phase2:start/end)
- Protocolo de medição claro (4x throttle, 5 cold + 5 warm, mediana)
```
**Qualidade:** ⭐⭐⭐⭐⭐ — Profissional, pronto pra copiar.

### 2. **A4: Mudanças Práticas e Baseadas em Feedback Real**
```javascript
// Problema real: "as imagens vêm de outros sites"
// Solução é sensata:
- preconnect só no CDN principal (AniList)
- dns-prefetch nos demais
- fetchpriority="high" nas capas prioritárias (top 4)
- width/height reservados (evita CLS)
```
**Qualidade:** ⭐⭐⭐⭐ — Bem pensada. Recomendação: verificar hosts reais antes de aplicar `preconnect`.

### 3. **A3: Cache de Recomendações — Correções Inteligentes**

| Proposta Original | Problema Identificado | Correção Proposta |
|-------------------|----------------------|------------------|
| Reusar store `anime_lists` | Conflito LRU | Store dedicada `recommendations` |
| Hash do tasteProfile | Computar profile já é custo | Hash das entries (barato) |
| Cache por `(gênero, formato, ano, badge, busca)` | Explosão de chaves | Cachear base pontuada; filtros em memória |
| Espelho localStorage | Estoura cota 5MB | Sem espelho; apenas IDB |
| Sem versionamento | Scores antigos se algoritmo mudar | `RECOMMENDER_VERSION` na chave |

**Qualidade:** ⭐⭐⭐⭐⭐ — **Excelente mitigação de riscos**. Mostra profundidade de design.

**Chave de cache proposta:**
```
recs:<scope>:<entriesHash>:<RECOMMENDER_VERSION>:<optionsHash>:<genre>
```
✅ Simples, identificadora, suporta upgrade de versão.

**Política:** TTL 24h + Max 5 entries LRU — bom balanço entre utilidade e overhead de IDB.

### 4. **B4: Acessibilidade — Diagnóstico Preciso**

| Controle | Situação | Correção |
|----------|----------|----------|
| Search | Só `placeholder`, sem label acessível | Adicionar `aria-label` |
| Gênero | Label genérico demais | Mudar para `filterLabel` |
| Resultados | Sem anúncio em leitor tela | Live region `aria-live="polite"` |

**Qualidade:** ⭐⭐⭐⭐ — WCAG-compliant, com testes concretos (`getByRole`, axe DevTools).

### 5. **B2: Motion & Focus — Escopo Reduzido, Bem Definido**
```css
.anime-card:hover,
.anime-card:focus-visible {
  box-shadow: 0 0 20px 2px var(--color-primary-glow);
  transform: translateY(-2px);
}
@media (prefers-reduced-motion: reduce) {
  transform: none;  /* Respeita preferência do usuário */
}
```
**Qualidade:** ⭐⭐⭐⭐ — Simples, acessível, WCAG 2.4.7.

### 6. **B1: Scores Excelentes — Abordagem Pragmática**

Dois caminhos propostos:
- **Simples (MVP):** `scoreTier = predictedScore >= 8.5`
- **Robusto:** `scoreTier = predictedScore >= 8.5 AND percentil >= p90` (evita inflação)

Sugestão sensata: começar com MVP absoluto, depois refinar se necessário.

**Qualidade:** ⭐⭐⭐⭐ — Reconhece tradeoff (simplicity vs. robustez).

### 7. **C1: Web Worker — Condicional, Bem Justificado**

Proposta evita implementar prematuramente:
- "Implementar só se A0 provar necessidade"
- Fallback síncrono automático (jsdom)
- Reconhece overhead de `postMessage` + structured clone

**Qualidade:** ⭐⭐⭐⭐⭐ — Mostra maturidade: não otimiza sem dados.

### 8. **Rastreabilidade GitHub Issues**

Propõe criar issues para cada item. Essencial para backlog visual.

---

## ⚠️ Observações / Riscos Identificados

### 1. **A0: Protocol de Medição Requer Disciplina**
```
Menciona: "5 execuções cold + 5 warm, mediana"
```
**Risco:** Fácil não seguir rigorosamente, gerar baseline incerto.

**Recomendação:**
- Criar script automatizado em `scripts/measure-perf.js` que executa 10x, calcula mediana
- Armazenar resultados em `docs/PERF_BASELINE.md` com timestamp
- Rever baseline a cada sprint maior

### 2. **A4: Verificação de Hosts Reais**
```
"Confirmar hosts reais inspecionando coverImage nas respostas..."
```
**Risco:** Se hosts mudarem (CDNs migram), `preconnect` fica obsoleto.

**Recomendação:**
- Adicionar comentário no `index.html` indicando data de verificação
- Teste de CI: verificar se hosts reais da resposta coincidem com `preconnect`

### 3. **A3: Complexidade de Cache — Múltiplos Pontos de Falha**
```
- Chave com 5 componentes (escopo, entries hash, versão, options hash, gênero)
- Upgrade DB v1 → v2
- Corrida entre Phase 2 assíncrono e IDB read
```

**Risco:** Debugging difícil se cache ficar stale, ou se upgrade falhar.

**Recomendação:**
- Adicionar `localStorage.setItem('animatch_cache_debug', '1')` flag para logar hits/misses no console
- Teste de upgrade DB: rodar em dev, testar com dados reais (`npm run test` só cobre fake-indexeddb)
- Considerar adicionar métrica `cache:hit` / `cache:miss` em A0

### 4. **B4: Live Region — Debounce não é Trivial**
```
"Debounce implícito: só anuncia quando isLoadingMore muda..."
```

**Risco:** Se muito agressivo, perde-se feedback. Se muito conservador, spam de anúncios.

**Recomendação:**
- Proposta: anunciar quando `isLoadingMore` muda de true → false (fim do carregamento)
- Não anunciar a cada tecla de busca (usar `useDeferredValue` ou debounce 500ms na contagem)
- Teste: verificar se leitor de tela anuncia corretamente

### 5. **B2: Reduced-Motion Apenas no transform, Não na Sombra**
```css
@media (prefers-reduced-motion: reduce) {
  transform: none;  /* OK */
  box-shadow: ... ainda anima?
}
```

**Risco:** Sombra pode estar em transição (200ms), conflita com intent de reduced-motion.

**Recomendação:**
```css
@media (prefers-reduced-motion: reduce) {
  .anime-card {
    --transition-default: 0ms;  /* Ou: transition: none; */
  }
  transform: none;
  box-shadow: none;  /* Remover efeito inteiro */
}
```

### 6. **C1: Structured Clone de tasteProfile (Map)**
```
"tasteProfile é Map → structured clone suporta"
```

**Risco:** Maps não são nativamente serializáveis para `postMessage`. Precisa converter para Object ou usar suporte de custom structured cloning (não universal).

**Recomendação:**
- Converter `tasteProfile` (Map) → `tasteProfileObj` (Object) antes de `postMessage`
- Validar no teste: `typeof tasteProfileObj === 'object'` (não Map)

### 7. **Issue Rastreabilidade — Backlog Vazio**
```
"gh issue list retorna apenas #21 aberta. Criar/confirmar issues..."
```

**Risco:** Se issues não forem criadas, fácil perder escopo.

**Recomendação:**
- Executar antes de iniciar cada fase: `gh issue create --title "A0: Instrumentação..." --body "..."`

---

## 🎬 Ordem de Execução Recomendada

| Fase | Esforço | Bloqueador | Prioridade | Status |
|------|---------|-----------|-----------|--------|
| **A0** | 2–4h | — | 🔴 **Primeiro** | Criar script automatizado |
| **A4** | 1h | — | 🔴 **Alta** | Sem gate, impacto real visível |
| **B4** | 1–2h | — | 🟠 **Alta** | WCAG compliance |
| **B2** | 30min | — | 🟠 **Média** | Acessibilidade |
| **B1** | 1h | — | 🟡 **Baixa** | Nice-to-have UI |
| **A3** | 3–4h | **A0** (Gate G1) | 🟡 **Condicional** | Implementar só se Phase 2 > 100ms |
| **C1** | 4–6h | **A0** (Gate G2) | ⚪ **Condicional** | Implementar só se Phase 1 > 200ms mobile |

**Timeline Esperado:**
- Sem A3/C1 (cenário melhor): **~6–7 horas** (1–2 dias)
- Com A3 (cenário pior): **+3–4 horas** (total 10–11h)
- Com A3+C1 (cenário muito pior): **+7–10 horas** (total 13–17h)

---

## ✅ Validações Técnicas

### 1. **React 19 e `fetchPriority`**
**Spec menciona:** "Verificar se React 19 aceita `fetchPriority` (camelCase)"

**Status:** ✅ React 19 suporta `fetchPriority` como string enum (`"low"`, `"auto"`, `"high"`)

**Referência:** [React HTML Attributes](https://react.dev/reference/react-dom/components/common#image-props)

### 2. **IDB Upgrade (v1 → v2)**
**Proposta:** "Upgrade DB v1 → v2 preserva `anime_lists`"

**Análise:**
```javascript
// Usando idb library (já presente?)
const db = await openDB('animatch', 2, {
  upgrade(db, oldVersion, newVersion) {
    if (oldVersion < 2) {
      db.createObjectStore('recommendations', { keyPath: 'cacheKey' })
    }
  },
})
```

**Status:** ✅ Padrão seguro, preserva v1 automaticamente.

### 3. **Vite Worker Imports**
**Proposta:** `new Worker(new URL('../workers/scoring.worker.js', import.meta.url), { type: 'module' })`

**Status:** ✅ Padrão correto para Vite.

---

## 🚀 Readiness Assessment

| Critério | Resultado | Evidência |
|----------|-----------|-----------|
| **Escopo bem definido?** | ✅ Sim | Cada item tem localização, mudanças, critérios aceite |
| **Riscos identificados?** | ✅ Sim | Alertas em A0, A3, B4, C1 |
| **Ordem lógica?** | ✅ Sim | Gates validados (A0 → A3/C1 condicional) |
| **Testes mencionados?** | ✅ Sim | Cada item tem "Critérios de aceite" com testes |
| **I18N considerado?** | ✅ Sim | "i18n nos 3 idiomas quando houver texto" |
| **Pronto para começar?** | ✅ Sim | Com observações menores |

---

## 📋 Recomendações Finais

### Antes de Começar A0

1. ✅ **Criar issues no GitHub**
   ```bash
   gh issue create --title "A0: Instrumentação de performance" \
     --body "Implementar performance.mark/measure com protocol de medição..."
   ```

2. ✅ **Preparar estrutura de branch**
   - Feature branch: `feat/a0-instrumentation`
   - Após A0: `feat/a4-images`, `feat/b4-a11y`, etc.

3. ✅ **Documentar medições esperadas**
   - Criar template em `docs/PERF_BASELINE.md`:
     ```
     | Métrica | Antes | Depois | Gain |
     | Phase 1 (desktop) | — | <100ms | — |
     | Phase 2 (desktop) | ~1000ms | <1000ms | — |
     | Phase 1 (4x throttle) | — | <200ms | — |
     | Phase 2 (4x throttle) | ~1000ms | <1000ms | — |
     ```

### Implementar Nesta Ordem

```
1. A0 (2–4h)
   └─ Gate G1, G2 decidem A3, C1

2. A4 (1h) — paralelo com A0 final

3. B4 (1–2h) — paralelo com A4

4. B2 (30min)

5. B1 (1h)

6. A3 IF G1 (3–4h) — bloqueado por A0

7. C1 IF G2 (4–6h) — bloqueado por A0
```

### Monitoramento Pós-Implementação

- Manter `PERF_BASELINE.md` atualizado
- Adicionar CI check: `npm run perf:measure` antes de merge
- Validar em produção: Sentry/Vercel Analytics

---

## 🎉 Conclusão

**Especificação é excelente.** Combina:
- ✅ Rigor técnico (gates, métricas, testes)
- ✅ Pragmatismo (condicional, MVP-first)
- ✅ Acessibilidade & performance (holisticamente)
- ✅ Documentação clara (pronta para executar)

**Recomendação:** ✅ **Aprovado para implementação**

Com observações menores (A0 script automatizado, A4 verificação de hosts, B4/C1 refinamentos), está **pronto para começar amanhã**.

