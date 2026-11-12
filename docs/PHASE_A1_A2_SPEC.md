# Especificação Detalhada: Fase A1 e A2 — Rendering Progressivo

**Data:** 12/11/2026  
**Status:** Planejamento antes de implementação  
**Objetivo:** Alcançar **Time to First Recommendation <300ms** (vs. 1.5–2s atual)

---

## 📋 Visão Geral

### Problema Atual
```
[App carrega] → [Calcula scores de 500+ animes] → [Renderiza tudo] → [Usuário vê recomendações]
     ↓                    ~500–800ms                   ~200–300ms
              BLOQUEANTE — usuário vê "Calculating..."
```

### Solução A1 + A2
```
[App carrega] → [Score batch de 15] → [Renderiza 15] → [Cache restante em background]
     ↓              ~100–150ms          ~50–100ms         [Carregando mais...]
         INSTANTÂNEO — usuário vê recomendações já!
         
         Phase 1 completo em ~200–300ms ✅
         Phase 2 (background) + caching até ~1s (sem bloquear)
```

---

## A1: Hook `useProgressiveRecommendationPipeline`

### O que é?
Um novo hook que **separa o scoring em 2 fases**:

**Phase 1 (Instant — <200ms):**
- Calcula `tasteProfile` (profile do gosto do usuário baseado no histórico)
- Score apenas dos **primeiros 15 animes**
- Renderiza instantaneamente
- **Retorno ao componente:** `recommendations = [anime1, anime2, ..., anime15]`, `isLoadingMore = true`

**Phase 2 (Background — próx. 1–2s):**
- Continua scoring dos animes restantes (16, 17, ..., 500+)
- Aplica boosters (streaming, multi-presence, etc.)
- Cria versão completa scored
- **Retorno:** `recommendations = [anime1, ..., anime500]`, `isLoadingMore = false`

### Localização
```
src/hooks/useProgressiveRecommendationPipeline.js  (NOVO)
```

### Assinatura
```javascript
export function useProgressiveRecommendationPipeline({
  entries = [],                    // Lista completa de animes do usuário
  activeScope = 'anilist',         // 'anilist' | 'myanimelist' | 'ensemble'
  selectedFilterGenre = null,      // Gênero filtrado (se houver)
  recommenderOptions = {},         // Opções do recomendador
  subscriptions = [],              // Para applyStreamingBoost
  tasteProfile = null,             // Cache do perfil (opcional)
  batchSize = 15,                  // Quantos animes no Phase 1 (default: 15)
  onLoadComplete = null,           // Callback quando Phase 2 termina
} = {}) {
  
  return {
    recommendations,    // [anime1, ..., animeN] — cresce de 15 → N conforme Phase 2 progride
    isLoadingMore,      // true enquanto Phase 2 está rodando
    tasteProfile,       // Salvo para cache posterior (A3)
    totalCount,         // Quantos animes existem no total
    error,              // Erro se houver
  }
}
```

### O que muda em relação ao atual `useRecommendationPipeline`?

**Atual (bloqueante):**
```javascript
const recommendations = useMemo(() => {
  // Calcula tudão (500+ animes)
  const scored = scoreRecommendations(entries, tasteProfile, ...)
  const boosted = applyStreamingBoost(scored, subscriptions)
  return applyMultiPresenceBoost(boosted)
}, [entries, ...deps])
// ← Bloqueia render até tudo estar pronto
```

**A1 (progressivo):**
```javascript
// Phase 1: Instant
const firstBatch = scoreRecommendations(
  entries.slice(0, Math.min(100, entries.length)),  // Primeiros 100
  tasteProfile, 
  selectedFilterGenre, 
  recommenderOptions
).slice(0, batchSize)  // Pega só os 15 melhores

setRecommendations(firstBatch)  // ← Renderiza NOW

// Phase 2: Background (setTimeout, não bloqueia)
setTimeout(() => {
  const full = scoreRecommendations(entries, tasteProfile, ...)
  const boosted = applyStreamingBoost(full, subscriptions)
  setRecommendations(applyMultiPresenceBoost(boosted))
  setIsLoadingMore(false)
}, 10)  // Microtask, deixa Phase 1 renderizar primeiro
```

### Integração com A2 (RecommendationGrid)

O hook retorna `recommendations` que **cresce progressivamente**:
- **T=0–200ms:** `recommendations.length = 15`
- **T=200–500ms:** `recommendations.length = 50+` (Phase 2 vai adicionando)
- **T=1000ms:** `recommendations.length = 500+` (tudo pronto)

O componente `RecommendationGrid` recebe isso e renderiza conforme cresce.

---

## A2: Adaptar `RecommendationGrid` para 2 Passes

### O que é?
Modificar `RecommendationGrid.jsx` para:

1. **Renderizar 2 passes de UI:**
   - **Pass 1:** Os primeiros 15 cards (já do state)
   - **Pass 2 (conforme scroll):** Próximos lotes via `IntersectionObserver`

2. **Indicador visual enquanto carrega:**
   - "Carregando mais X animes..."
   - Skeleton placeholder no footer

3. **Sincronizar com A1:**
   - Recebe `isLoadingMore` do hook
   - Se `isLoadingMore = true`, mostra indicator
   - Se `isLoadingMore = false`, faz scroll mais agressivo (carrega próximos batches)

### Localização
```
src/components/RecommendationGrid.jsx  (MODIFICAR)
```

### O que já vem do Patch

**✅ Já implementado no patch:**
```javascript
// Renderização progressiva com IntersectionObserver
const [visibleCount, setVisibleCount] = useState(initialBatchSize)
const sentinelRef = useRef(null)

// Observer que libera mais itens ao rolar
useEffect(() => {
  if (!sentinelRef.current) return
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some(e => e.isIntersecting)) {
        setVisibleCount(prev => prev + BATCH_STEP)  // +15 itens
      }
    },
    { rootMargin: '600px 0px' }  // Carrega antes de ficar visível
  )
  observer.observe(sentinelRef.current)
  return () => observer.disconnect()
}, [])

// Renderiza só os primeiros N
const visibleRecommendations = displayRecommendations.slice(0, visibleCount)
```

**❌ Falta:** Integrar com `isLoadingMore` do hook A1

### Como A2 Muda com A1

**Antes (patch isolado):**
```javascript
<RecommendationGrid recommendations={staticArray} />
// Renderiza: 15 → (scroll) → 30 → (scroll) → 45
// Mas o array é COMPLETO desde o início (500 items)
```

**Depois (A1 + A2):**
```javascript
const { recommendations, isLoadingMore } = useProgressiveRecommendationPipeline(...)

<RecommendationGrid 
  recommendations={recommendations}  // Cresce: 15 → 50 → 100 → 500
  isLoadingMore={isLoadingMore}        // true enquanto Phase 2 roda
  onBatchLoad={...}                    // Callback ao terminar
/>
```

**Novo comportamento:**
- **T=0–200ms:** Grid mostra 15 cards + "Carregando mais 485 animes..."
- **T=200–300ms:** Phase 2 termina → Grid tem 500 itens, esconde indicator
- **Usuario rola:** Sentinel dispara → Próximo batch de 15 renderiza

---

## 📊 Comparação: Patch vs. A1+A2

| Métrica | Patch Isolado | A1 + A2 Completo |
|---------|---|---|
| **Time to First Recommendation** | 1.2–1.5s | **200–300ms** ✅ |
| **Causa da melhoria** | DNS prefetch + menos DOM nodes | Scoring progressivo + UI progressiva |
| **Array já é completo?** | Sim (500 items) | Não (15 → 500 conforme Phase 2) |
| **Cache no background?** | Não | Sim (A3 depois) |
| **Indicador "carregando"?** | Não | Sim |
| **Compatível com ensemble?** | Sim (agnóstico) | Sim (A1 checa `activeScope`) |

---

## 🔧 O que Reutilizar do Patch

### ✅ Elementos já implementados no patch

```javascript
// 1. DNS prefetch (index.html) — USE COMO ESTÁ
<link rel="preconnect" href="https://s4.anilist.co" crossorigin />

// 2. decoding="async" em imagens — USE COMO ESTÁ
<img src={...} decoding="async" loading="lazy" />

// 3. IntersectionObserver + Sentinel (RecommendationGrid.jsx) — REUTILIZE
const [visibleCount, setVisibleCount] = useState(initialBatchSize)
const observer = new IntersectionObserver(...)  // ← Pattern bom

// 4. Testes de IO — EXPANDA COM A1
it('renderiza apenas os 15 primeiros itens...', () => {...})
```

### ⚠️ Mudar / Adaptar

```javascript
// ANTES (patch): array completo recebido, só corta renderização
const visibleRecommendations = displayRecommendations.slice(0, visibleCount)

// DEPOIS (A1+A2): array cresce dinamicamente do hook
const visibleRecommendations = recommendations.slice(0, visibleCount)
// recommendations vem de A1 e cresce conforme Phase 2 progride
```

---

## 📝 Implementação: Ordem de Passos

### Ordem Recomendada

**1. A1 Primeiro** (cria o hook, garante Phase 1 + Phase 2)
   - Criar `useProgressiveRecommendationPipeline.js`
   - Testes unitários (fases 1 e 2)
   - Integrar no Dashboard/RecList

**2. A2 Depois** (adapta Grid para novos dados)
   - Usar IntersectionObserver do patch
   - Adaptar Grid props
   - Adicionar indicador "carregando"
   - Integrar `isLoadingMore` do A1

**3. Validar Perf**
   - Medir LCP (Largest Contentful Paint)
   - Verificar TTI (Time to Interactive)
   - Teste com 500+ animes

---

## 📐 Diagrama de Fluxo (A1 + A2)

```
Dashboard monta
    ↓
A1: useProgressiveRecommendationPipeline()
    ├─ Phase 1 (<200ms)
    │   ├─ buildTasteProfile()
    │   ├─ scoreRecommendations(primeiros 100)
    │   ├─ setRecommendations([15 melhores])  ← Retorna ao componente
    │   └─ setIsLoadingMore(true)
    │
    ├─ [RENDER AQUI] → Grid mostra 15 cards
    │
    └─ Phase 2 (background, ~1s)
        ├─ scoreRecommendations(todos 500+)
        ├─ applyStreamingBoost()
        ├─ applyMultiPresenceBoost()
        ├─ setRecommendations([500])  ← State cresce
        └─ setIsLoadingMore(false)

A2: RecommendationGrid(<recommendations>, <isLoadingMore>)
    ├─ Renderiza recommendations.slice(0, visibleCount)
    │   ├─ Inicial: visibleCount = 15 (do INITIAL_BATCH_SIZE)
    │   └─ Ao rolar: visibleCount += 15 (via Sentinel + IO)
    │
    └─ Se isLoadingMore:
        └─ Mostra footer "Carregando mais X animes..."
```

---

## ✅ Checklist Antes de Começar

- [ ] Entender que A1 é **scoring progressivo** (não só UI)
- [ ] Entender que A2 é **UI progressiva** + integração com A1
- [ ] Confirmar que patch será **reutilizado** (IntersectionObserver pattern)
- [ ] Confirmar order: **A1 antes de A2**
- [ ] Confirmar que `isLoadingMore` é essencial para UX (feedback visual)

---

## 🎯 Métrica de Sucesso

**Ao terminar A1 + A2:**

✅ Time to First Recommendation: **<300ms**  
✅ LCP: **<400ms**  
✅ TTI: **<500ms**  
✅ Indicador de carregamento funciona  
✅ Patch integrado (DNS, decoding, IO reaproveitado)  
✅ Testes passam (unit + perf)  

---

Pronto pra começar? Posso fazer assim:

1. ✅ Criar `useProgressiveRecommendationPipeline.js` (A1)
2. ✅ Adaptar `RecommendationGrid.jsx` (A2) + integrar com A1
3. ✅ Rodas testes e validação de perf

Vai ser? 🚀
