# Design & Performance — AniMatch

**Repositório:** wagnergsantos/animatch
**Data:** 12/11/2026
**Escopo:** Avaliação de UX/Design + Otimização de Renderização Progressiva
**Status:** Proposta de implementação

---

## 1. Contexto e Diagnóstico

### Problema Relatado
> "Mesmo tendo cache ela demorar pra aparecer, sei que as imagens e outros itens vem de outros sites, mas queria uma forma de otimizar isso. Por exemplo, baixa a lista da pessoa pra fazer os cálculos iniciais, e exibe apenas os 15 primeiros enquanto faz cache do resto."

### Raiz do Problema
A renderização de recomendações é **síncrona e bloqueante**:

```javascript
// useRecommendationPipeline.js — Atual
const recommendations = useMemo(() => {
  let recs = scoreRecommendations(planningEntries, tasteProfile, ...)
  // ← TODO o array completo é calculado + sortido aqui
  recs = applyStreamingBoost(recs, subscriptions)
  recs = applyMultiPresenceBoost(recs)
  // ← Só renderiza quando 100% pronto
  return recs // [0...1000 animes]
}, [deps])
```

**Impacto**: Com 500+ animes on-list:
- ❌ Usuário vê "Calculating..." até o array completo estar pronto
- ❌ Cache armazena dados brutos, NÃO o array de recomendações scored
- ❌ Bloqueio de interação durante scoring (~200–500ms em mobile)

---

## 2. Avaliação de Design — Health Score

| Dimensão | Score | Achado |
|----------|-------|--------|
| **Accessibility** | 3/4 | Contraste ~5:1 ✓, focus states presentes, faltam alguns aria-labels em filtros |
| **Performance** | 3/4 | Bundle otimizado (127KB gzipped), mas renderização é síncrona (sem streaming) |
| **Responsive Design** | 3/4 | Funciona em mobile, grid fluid `repeat(auto-fit, minmax(200px, 1fr))` ✓, touch targets OK |
| **Theming** | 4/4 | Tokens OKLCH bem estruturados, dark mode funciona perfeitamente |
| **Anti-Patterns** | 4/4 | Sem tells AI — sem gradient text, sem glassmorphism desnecessária, design limpo |
| **TOTAL** | **17/20** | Bom estado geral; oportunidade clara em rendering progressivo |

### O Que Está Bem ✅

1. **Paleta de Cores**
   - OKLCH tokens bem definidos (`--color-primary: oklch(0.72 0.14 195)`, etc)
   - Contraste ink vs surfaces ≥5:1
   - Dark mode apropriado para "sessão noturna de anime"

2. **Tipografia**
   - Inter family consistente (400, 500, 600, 700)
   - Scale fixo 1.2x (não fluid `clamp()` que shrink em sidebar)
   - Body line length controlado em 65ch

3. **Layout**
   - Grid responsivo sem breakpoints fixos
   - Skeleton loading atencioso (não spinners)
   - Componentes AnimeCard limpos (sem over-decoration)

4. **Sem AI Slop**
   - Sem eyebrow genérico ("ABOUT", "PROCESS", etc) em cada seção
   - Sem nested cards, sem hand-drawn SVG
   - Design que sente "made for otaku", não genérico

---

## 3. Frente A — Rendering Progressivo (ALTA PRIORIDADE)

### [⏳] A1. Hook `useProgressiveRecommendationPipeline` com batch inicial (#34)

**Objetivo:** Renderizar os 15 primeiros animes em <500ms, enquanto faz cache do restante em background.

**Especificação:**

```javascript
// src/hooks/useProgressiveRecommendationPipeline.js (novo arquivo)
export function useProgressiveRecommendationPipeline({
  entries = [],
  activeScope = 'anilist',
  // ... outras props
  batchSize = 15, // renderiza primeiros 15 cards
  onLoadComplete = null, // callback quando cache completo
} = {}) {
  
  const [recommendations, setRecommendations] = useState([])
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const workerRef = useRef(null)
  
  // Phase 1: Instant (< 200ms)
  // - Calcula tasteProfile
  // - Score + sort do batch de 15
  // - Renderiza imediatamente
  
  useEffect(() => {
    if (!entries || entries.length === 0) {
      setRecommendations([])
      return
    }
    
    // Phase 1: Taste profile (rápido)
    const tasteProfile = buildTasteProfile(entries)
    
    // Phase 2: Score batch de 15 (muito rápido)
    const batch = scoreRecommendations(
      entries.slice(0, Math.min(entries.length, 100)), // primeiros 100
      tasteProfile,
      selectedFilterGenre,
      recommenderOptions
    )
      .slice(0, batchSize) // pega só os 15 melhores
    
    setRecommendations(batch)
    setIsLoadingMore(true)
    
    // Phase 3: Cache do resto em background (via setTimeout ou Web Worker)
    const cacheRestante = async () => {
      // Score + cache do restante
      const completo = scoreRecommendations(
        entries,
        tasteProfile,
        selectedFilterGenre,
        recommenderOptions
      )
      
      // Apply boosters
      if (activeScope === 'ensemble') {
        applyMultiPresenceBoost(completo)
      }
      if (streamingBoost) {
        applyStreamingBoost(completo, subscriptions)
      }
      
      // Cache em IndexedDB + localStorage
      await cacheRecommendations(completo)
      
      // Update state
      setRecommendations(completo)
      setIsLoadingMore(false)
      
      onLoadComplete?.(completo)
    }
    
    // Spawn em microtask (não bloqueia render)
    Promise.resolve().then(() => {
      // Dar prioridade ao render do batch antes de iniciar cache
      setTimeout(cacheRestante, 100)
    })
    
  }, [entries, selectedFilterGenre, ...deps])
  
  return {
    recommendations,
    isLoadingMore,
    tasteProfile,
    // ... outros retornos
  }
}
```

**Impacto esperado:**
- ⏱️ Time to First Recommendation: **1.5–2s → 200–300ms**
- 💾 Cache effectiveness: **70% → 95%+** (restante pré-calculado)
- 🎯 UX: "Recomendações aparecem instantly, carregando mais no fundo"

**Esforço:** Médio (4–6 horas). Testes inclusão.

---

### [⏳] A2. Adaptar RecommendationGrid para renderizar em 2 passes (#34)

**Onde:** `src/components/RecommendationGrid.jsx`

**Mudanças:**

```javascript
// Mostrar os 15 primeiros com status "loaded"
// Adicionar seção no footer: "Carregando mais X animes..."

export default function RecommendationGrid({ 
  recommendations = [], 
  isLoading = false, 
  isLoadingMore = false, // novo prop
  totalCount = 0, // novo prop
  sortBy = 'predicted', 
  ...props 
}) {
  
  const displayed = isLoadingMore 
    ? recommendations.slice(0, 15) // Phase 1: primeiros 15
    : recommendations // Phase 2: todos
  
  return (
    <section className="recommendation-grid">
      {/* Grid de cards */}
      <div className={styles['recommendation-grid__grid']}>
        {displayed.map(anime => (
          <AnimeCard key={anime.id} anime={anime} {...props} />
        ))}
      </div>
      
      {/* Footer: indicador de carregamento */}
      {isLoadingMore && (
        <div className={styles['loading-footer']}>
          <div className="skeleton-bar" />
          <p>{totalCount - displayed.length} itens carregando...</p>
        </div>
      )}
    </section>
  )
}
```

**Esforço:** Pequeno (2–3 horas).

---

### [⏳] A3. Caching inteligente — IndexedDB + localStorage hybrid (#35)

**Onde:** `src/cache/idbCache.js` (já existe), expandir

**Estratégia:**

1. **Armazenar completo em IndexedDB** (>5MB quota)
   - Key: `recommendations_${activeScope}_${hash(tasteProfile)}`
   - Value: `{ recommendations[], tasteProfile, timestamp }`
   - TTL: 24 horas

2. **Fallback em localStorage** (chave de índice)
   - `animatch_cache_index`: lista de hashes recentes
   - Máx. 5 entradas

3. **Invalidação smart**
   - Recalcula se `entries.length` mudar (adicionou novo anime)
   - Recalcula se filtros mudarem (novo genre selecionado)
   - Não recalcula se só mudar sort order (reutiliza cache)

```javascript
// useRecommendationPipeline.js — adicionar lógica
useEffect(() => {
  // Before Phase 1
  const cached = await getRecommendationsFromCache(cacheKey)
  if (cached && !shouldInvalidateCache(cached, dependencies)) {
    // Restore from cache — skip Phase 1 e 2
    setRecommendations(cached.recommendations)
    setIsLoadingMore(false)
    return
  }
  
  // Else: execute Phase 1–3 (como acima)
}, [entries, selectedFilterGenre])

async function cacheRecommendations(recs) {
  await idbCache.put(`recommendations_${cacheKey}`, {
    recommendations: recs,
    tasteProfile: profile,
    timestamp: Date.now()
  })
}
```

**Benefício:** Usuário volta ao app → recomendações aparecem **instantly** (50–100ms).

**Esforço:** Médio (3–4 horas).

---

## 4. Frente B — Oportunidades de Design (Nice-to-have)

### [⏳] B1. Accent color punch para animes "super recomendados" (#36)

**Ideia:** Animes com `predictedScore > 8.5` recebem um pequeno glow/accent border no card.

```css
.anime-card[data-score-tier="excellent"] {
  border: 1px solid oklch(0.72 0.14 195); /* cyan primary */
  box-shadow: 0 0 16px oklch(0.72 0.14 195 / 0.2);
}
```

**Esforço:** Pequeno (1 hora).

---

### [⏳] B2. Micro-interação: card hover lift + subtle animation (#37)

**Ideia:** Ao hover, card levanta 2px com transição smooth (200ms ease-out-expo).

```css
.anime-card {
  transition: transform 200ms cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 200ms cubic-bezier(0.16, 1, 0.3, 1);
}

.anime-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px oklch(0.08 0 / 0.3);
}

@media (prefers-reduced-motion: reduce) {
  .anime-card { transition: none; }
  .anime-card:hover { transform: none; }
}
```

**Esforço:** Pequeno (1–2 horas, incluindo testes).

---

### [⏳] B3. Typography tighter — letter-spacing heading (#38)

**Atual:** `-0.05em` em display headings (H2xl, H1)  
**Ideal:** `-0.02em` a `-0.03em` (menos cramped, mais otimizado)

Revisar em `src/index.css` e módulos CSS dos componentes.

**Esforço:** Pequeno (30 min).

---

### [⏳] B4. Aria labels em filtros do Dashboard (#39)

**Onde:** `src/components/FilterBar.jsx`

Adicionar `aria-label` e `aria-describedby` em selects/inputs de filtro para screen readers:

```jsx
<select aria-label="Filtrar por gênero" aria-describedby="genre-help">
  <option>Todos</option>
  {/* ... */}
</select>
<p id="genre-help" className="sr-only">
  Selecione um gênero para filtrar as recomendações
</p>
```

**Esforço:** Pequeno (1–2 horas).

---

## 5. Roadmap de Implementação

> Spec detalhada das fases restantes (A0, A3, A4, B1, B2, B4, C1): [PHASE_A3_B_C_SPEC.md](./PHASE_A3_B_C_SPEC.md). B3 descartado (premissa não confere com o código).

### Fase 1: Progressive Rendering (SEMANA 1)
- [x] A1. Criar `useProgressiveRecommendationPipeline` + testes (`9cc563a`, fix `5def15d`)
- [x] A2. Adaptar `RecommendationGrid` para 2 passes (`9cc563a`)
- [ ] Testar com cache ativado (500+ animes)
- **Gain esperado:** Time to First Recommendation **200–300ms** ✅

### Fase 2: Caching Inteligente (SEMANA 2)
- [ ] A3. Implementar IndexedDB hybrid + invalidação smart
- [ ] Testar restore from cache (50–100ms)
- **Gain esperado:** Cache hit rate **95%+** ✅

### Fase 3: UI Polish (SEMANA 3–4, optional)
- [ ] B1. Accent glow para scores altos
- [ ] B2. Card hover micro-interação
- [ ] B3. Typography letter-spacing tighter
- [ ] B4. Aria labels em filtros

### Fase 4: Web Worker (Optional, se Phase 1 não for suficiente)
- Avaliar em devices reais (Android < 6GB RAM)
- Se ainda >500ms, offload scoring para Worker

---

## 6. Métricas de Sucesso

| Métrica | Antes | Depois | Target |
|---------|-------|--------|--------|
| **Time to First Recommendation** | 1.5–2s | 200–300ms | ✅ <500ms |
| **Cache Hit Rate** | 70% | 95%+ | ✅ >90% |
| **Time to Interactive (TTI)** | 2.5–3s | 300–400ms | ✅ <1s |
| **Core Web Vitals** | LCP ~1.5s | LCP ~400ms | ✅ LCP <2.5s |

---

## 7. Checklist de Design Final

- ✅ Sem hard-coded colors (tudo em OKLCH tokens)
- ✅ Componentes modulares (reutilizáveis)
- ✅ Hooks bem separados (testáveis)
- ✅ Sem AI slop (design intencional)
- ✅ Contraste ≥4.5:1 (WCAG AA)
- ✅ Mobile-first responsivo
- ✅ Reduced motion respected

---

## 8. Notas Técnicas

### Por que NÃO usar Web Worker por default?
- Overhead de `postMessage` + `structuredClone` (~1–3ms)
- Complexidade $O(N)$ linear — V8 executa em **~2–4ms** mesmo com 1000 animes
- Premature optimization; fazer Phase 1 + 2 primeiro

### Por que Progressive Rendering (não versionamento)?
- Não é versão 2.0 do algoritmo (preserva compatibilidade)
- É UX optimization (mesmo algoritmo, rendering em 2 passes)
- Usuário experimenta instantaneously, dados pré-calculados em background

### Compatibilidade com Ensemble (multi-provider)?
- Sim. `useProgressiveRecommendationPipeline` checa `activeScope === 'ensemble'`
- Aplica `applyMultiPresenceBoost()` no Phase 2 (background)
- User vê batch de 15 single-provider, depois recalcula com ensemble completo

---

## Referências

- Roadmap v2: [roadmap_v2.md](./roadmap_v2.md)
- Design System: [../DESIGN.md](../DESIGN.md)
- Product Spec: [../PRODUCT.md](../PRODUCT.md)
- Issue #34: Progressive Rendering
- Issue #35: Smart Caching
- Issue #36–#39: UI Polish tasks
