# Protocolo e Baseline de Performance (Fase A0)

**Data:** 12/11/2026  
**Status:** Instrumentação ativa (`perfMarks.js`) — Aguardando medição com dados reais  
**Referência:** [PHASE_A3_B_C_SPEC.md](./PHASE_A3_B_C_SPEC.md)

---

## 1. Como Ativar as Medições

As medições de performance usam a User Timing API (`performance.mark` / `performance.measure`).  
Em ambiente de desenvolvimento (`npm run dev`), os logs são emitidos automaticamente no console (`[perf] phase1: Xms`).

Para ativar em produção ou em auditoria no navegador:
```javascript
localStorage.setItem('animatch_debug_perf', '1')
location.reload()
```

Para inspecionar as marcas no Chrome DevTools:
1. Abra **DevTools** > aba **Performance**.
2. Grave o carregamento da lista de recomendações.
3. Abra a trilha **Timings** para visualizar:
   - `animatch:phase1:start` / `animatch:phase1:end` (`animatch:phase1`)
   - `animatch:phase2:start` / `animatch:phase2:end` (`animatch:phase2`)

---

## 2. Protocolo de Teste Padronizado

- **Hardware/Perfil:** Simular dispositivo móvel intermediário (Chrome DevTools: **CPU Throttling 4x** + **Network Fast 4G**).
- **Cenário A:** Conta AniList com **500+** entradas.
- **Cenário B:** Conta Ensemble com **~1.000** entradas combinadas.
- **Execuções:** 5 cold (primeiro carregamento após limpar cache) e 5 warm (cache de listas ativo no IndexedDB). Registrar mediana.

---

## 3. Tabela de Medições

### Cenário A: Single Provider (AniList 500+ animes)

| Execução | Phase 1 Cold (ms) | Phase 2 Cold (ms) | Phase 1 Warm (ms) | Phase 2 Warm (ms) | Long Task >50ms? |
|---|---|---|---|---|---|
| Run 1 | - | - | - | - | - |
| Run 2 | - | - | - | - | - |
| Run 3 | - | - | - | - | - |
| Run 4 | - | - | - | - | - |
| Run 5 | - | - | - | - | - |
| **MEDIANA** | **-** | **-** | **-** | **-** | **-** |

### Cenário B: Ensemble (Multi-provider ~1.000 animes)

| Execução | Phase 1 Cold (ms) | Phase 2 Cold (ms) | Phase 1 Warm (ms) | Phase 2 Warm (ms) | Long Task >50ms? |
|---|---|---|---|---|---|
| Run 1 | - | - | - | - | - |
| Run 2 | - | - | - | - | - |
| Run 3 | - | - | - | - | - |
| Run 4 | - | - | - | - | - |
| Run 5 | - | - | - | - | - |
| **MEDIANA** | **-** | **-** | **-** | **-** | **-** |

---

## 4. Avaliação dos Gates de Decisão

| Gate | Critério | Mediana Medida | Decisão |
|---|---|---|---|
| **Gate G1 (Cache A3)** | Mediana Phase 2 > 100ms (throttled 4x) | *Aguardando teste* | [ ] Aprovado para A3 / [ ] Descartado |
| **Gate G2 (Worker C1)** | Mediana Phase 1 > 200ms ou Long Task > 50ms | *Aguardando teste* | [ ] Aprovado para C1 / [ ] Descartado |
