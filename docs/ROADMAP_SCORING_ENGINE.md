# Roadmap de Melhorias Técnicas: Animatch Web

Este documento consolida todas as melhorias técnicas, matemáticas e de interface mapeadas a partir de três bases de código de referência analisadas. Cada item possui sua **Origem**, **Racional de Decisão**, **Ação Técnica** e **Arquivos Afetados** para garantir rastreabilidade futura.

---

## Fontes de Referência (Proveniência das Ideias)

| ID | Repositório / Caminho | Descrição do Conteúdo |
| :--- | :--- | :--- |
| **Fonte A** | `C:\Sistemas\ProjetosCaesb\AniMatch\lib\data\repositories\` | Motor vetorial Flutter on-device (`scoring_engine.dart`), deduplicação de rede (`anime_repository.dart`) e repositório de listas (`watchlist_repository.dart`). |
| **Fonte B** | `modelos/Animatch/src/components/Recommendations/` | Componentes React de UI (`RecommendationCard.jsx` e `SimilarAnime.jsx`) com resiliência visual e badges de afinidade. |
| **Fonte C** | `modelos/Animatch/backend/recommendation_system/` e `src/pages/` | Motor Python/ML com diversidade de gêneros (`recommender.py`) e tela detalhada de personagens/elenco (`AnimeDetails.jsx`). |
| **Fonte D** | Script standalone de Descoberta (`genres.js`) | Módulo interativo **Genre Mixer** com seleção dual de gêneros ($G_1 \times G_2$), 10 presets lendários de combo e ticker dinâmico. |

---

## 1. Motor de Recomendação & Matemática (`src/logic/recommender.js`)

> Evolui a inferência de gosto estática para um modelo sensível ao tempo, resistente a outliers de poucos votos, tolerante a listas sem notas e imune a monopólio de gêneros repetidos.

### 1.1 Decaimento Temporal de Preferências
- **Origem**: [Fonte A] `scoring_engine.dart` (`_temporalPreferenceVector`).
- **Racional**: O Animatch tratava um anime assistido há 5 anos com o mesmo peso de um assistido ontem. Se o gosto do usuário mudou para *Seinen/Romance*, o histórico antigo de *Shounen* continuava dominando.
- **Conceito Matemático**: $w_i = e^{-\lambda \cdot \text{daysAgo}}$ com $\lambda = 0.04$ (meia-vida ~17 dias).
- **Ação Técnica**: Ponderar cada nota pela data de conclusão/atualização (`completedAt` ou `updatedAt` de AniList/MAL/Kitsu) na construção do `buildTasteProfile`.
- **Arquivos**: `src/logic/recommender.js`, `src/logic/recommender.test.js`.
- **Complexidade**: Média.

### 1.2 Amortecimento Bayesiano de Popularidade por Membros
- **Origem**: [Fonte A] `scoring_engine.dart` (`_popularityScore`).
- **Racional**: O score da comunidade bruto (`media.averageScore / 10`) infla obras obscuras com 30 votos nota 9.5 em detrimento de clássicos aclamados com 500k membros nota 8.9.
- **Conceito Matemático**: $B = \frac{v \cdot R + m \cdot C}{v + m}$, onde $C = 7.0$ (média global), $m = 10.000$ (limiar de confiança), $v = \text{members}$ e $R = \text{score} / 10$.
- **Ação Técnica**: Aplicar amortecimento Bayesiano na nota de comunidade antes de compor o blend de recomendação.
- **Arquivos**: `src/logic/recommender.js`.
- **Complexidade**: Baixa.

### 1.3 Proxy de Notas por Status (Resgate de Listas Sem Avaliação)
- **Origem**: [Fonte A] `scoring_engine.dart` (`_ratingWeight`).
- **Racional**: Usuários que não preenchem notas numéricas e apenas marcam animes como "Completed" ou "Watching" ficavam sem perfil de gosto (o Animatch descartava notas $\le 0$).
- **Mapeamento de Notas Implícitas**:
  - `COMPLETED`: 0.80 (equivale a nota 8.0)
  - `CURRENT` / `WATCHING`: 0.70 (nota 7.0)
  - `PLANNING` / `ON_HOLD`: 0.50 (nota 5.0)
  - `DROPPED`: 0.20 (penaliza levemente o gênero abandonado)
- **Ação Técnica**: Usar o proxy de status quando `entry.score` for ausente ou zero, viabilizando recomendações imediatas no primeiro login.
- **Arquivos**: `src/logic/recommender.js`.
- **Complexidade**: Baixa.

### 1.4 Fator de Novidade Anti-Repetição (Anti-Fadiga)
- **Origem**: [Fonte A] `scoring_engine.dart` (`_noveltyScore`).
- **Racional**: Evita que obras exatamente idênticas às últimas 10 assistidas cansem o usuário.
- **Conceito Matemático**: $S_{\text{novelty}} = 1 - \max_{i \in \text{recent}(10)} \text{Jaccard}(genres_a, genres_i)$.
- **Ação Técnica**: Injetar leve bonificação proporcional para obras que variam a fórmula dos últimos animes concluídos.
- **Arquivos**: `src/logic/recommender.js`.
- **Complexidade**: Média.

### 1.5 Fator de Diversidade (`diversity_factor`) Anti-Monotonia
- **Origem**: [Fonte C] `modelos/Animatch/backend/recommendation_system/recommender.py` (`diversity_factor`).
- **Racional**: Se a maior média histórica do usuário for *Isekai/Fantasia*, o Top 10 atual é monopolizado por 10 obras do mesmo subgênero.
- **Ação Técnica**: No momento da ordenação/seleção das recomendações em `scoreRecommendations`:
  - Contabilizar as ocorrências de cada gênero no ranking em formação.
  - Se um gênero ultrapassar $\ge 3$ aparições no Top 5, aplicar atenuação progressiva ($10\%$ a $20\%$) na pontuação dos próximos concorrentes exclusivos daquele mesmo gênero.
  - Obras de gêneros secundários bem avaliados ganham espaço no Top 10.
- **Arquivos**: `src/logic/recommender.js`.
- **Complexidade**: Baixa/Média.

### 1.6 Recomendações Item-a-Item ("Obras Semelhantes")
- **Origem**: [Fonte B] `SimilarAnime.jsx`.
- **Racional**: O Animatch só recomenda no sentido *Usuário $\rightarrow$ Watchlist*. Falta descoberta contextual ("Gostei desse anime aqui, o que mais existe parecido com ele?").
- **Ação Técnica**: Criar módulo de busca de animes similares via endpoint Jikan `/anime/{id}/recommendations` ou similaridade Jaccard/gêneros calculada no cache local.
- **Arquivos**: `src/api/`, `src/components/AnimeDetailModal.jsx`.
- **Complexidade**: Média.

---

## 2. Decisão, Confiança & Explicabilidade (`src/logic/decision.js` + UI)

> Torna a escolha de "O que assistir agora" assertiva, clara e semanticamente explicada na interface.

### 2.1 Tratamento Estruturado de Cold Start
- **Origem**: [Fonte A] `anime_repository.dart` (`getHeroRecommendation`).
- **Racional**: Usuários com $< 3$ animes avaliados recebiam notas extrapoladas sem base amostral estável.
- **Ação Técnica**: Detectar watchlist escassa, ativar modo `explore`, priorizar animes universalmente aclamados e emitir mensagem: *"Avalie mais obras para afinar seu perfil"*.
- **Arquivos**: `src/logic/decision.js`, `src/components/DecisionModal.jsx`.
- **Complexidade**: Baixa.

### 2.2 Power Sharpening & Margin Enforcement (Desempate Categórico)
- **Origem**: [Fonte A] `scoring_engine.dart` (`_pow`, `_kMarginBoost`).
- **Racional**: Scores em combinações lineares tendem a se agrupar em faixas estreitas (ex: 8.15 vs 8.14 vs 8.13), gerando empates visuais imperceptíveis.
- **Conceito Matemático**:
  - $S' = S^\tau$ ($\tau = 2.5$) para abrir o leque de distribuição das notas.
  - Se $\text{gap}(1º, 2º) < 0.05$, adicionar boost $+0.10$ ao vencedor.
- **Ação Técnica**: Aplicar afiação de notas antes da ordenação final em `pickBestRecommendation`.
- **Arquivos**: `src/logic/decision.js`.
- **Complexidade**: Baixa.

### 2.3 Explicabilidade Dinâmica por Fator Dominante
- **Origem**: [Fonte A] `scoring_engine.dart` (`dominantFactor`, `buildHeroExplanation`).
- **Racional**: Substitui textos genéricos de "Recomendado para você" por explicações semânticas baseadas na matemática do score.
- **Categorias de Copy**:
  - `content`: *"Combina perfeitamente com seu gosto por [Gênero 1] & [Gênero 2]"*
  - `temporal`: *"Alinhado com a sua vibe recente"*
  - `popularity`: *"Aclamado mundialmente por mais de 1M de fãs"*
  - `novelty`: *"Uma aposta fresca fora da sua zona de conforto"*
- **Ação Técnica**: Expor a chave do fator dominante no card e no modal de decisão.
- **Arquivos**: `src/components/RecommendationReason.jsx`, `src/components/DecisionModal.jsx`.
- **Complexidade**: Média.

### 2.4 Runner-ups / Top 3 Alternativas no Modal de Decisão
- **Origem**: [Fonte A] `anime_repository.dart` (`alts = ranked.skip(1).take(3)`).
- **Racional**: Se o usuário não gostar do anime sorteado no `DecisionModal`, hoje ele precisa fechar ou re-sortear tudo do zero.
- **Ação Técnica**: Retornar o campeão e os 3 concorrentes imediatos que quase venceram (`alternatives`), renderizando-os como mini-cards opcionais no rodapé do modal.
- **Arquivos**: `src/components/DecisionModal.jsx`, `src/logic/decision.js`.
- **Complexidade**: Baixa.

### 2.5 Confiança com Penalidade de Entropia Normalizada
- **Origem**: [Fonte A] `scoring_engine.dart` (`normalizedEntropy`).
- **Racional**: Se o modelo ranqueou 20 animes e todos ficaram com exatamente a mesma nota (distribuição plana/ruído alto), o índice de confiança deve cair automaticamente.
- **Conceito Matemático**: $H = -\sum p_i \ln p_i$. Entropia normalizada $H / \ln(N)$ subtrai da confiança sigmoide.
- **Ação Técnica**: Reduzir a % de confiança exibida se a incerteza do ranqueamento for estatisticamente alta.
- **Arquivos**: `src/logic/decision.js`.
- **Complexidade**: Média.

---

## 3. Interface, Resiliência Visual & UX dos Cards (`src/components/`)

> Elimina imagens quebradas, adiciona hierarquia visual instantânea e introduz elenco de voz sem poluir a interface.

### 3.1 Fallback Resiliente de Imagens em 3 Camadas
- **Origem**: [Fonte B] `RecommendationCard.jsx` e `SimilarAnime.jsx`.
- **Racional**: Quando o CDN de AniList ou Kitsu cai, retorna 404 ou links de thumbnail expiram, o card fica preto/cinza ou quebrado.
- **Mecanismo de Resiliência**:
  1. **Tier 1**: URL original de capa da API (`media.coverImage.large`).
  2. **Tier 2 (On Error)**: Chamada leve sob demanda à Jikan API (`https://api.jikan.moe/v4/anime/{malId}`) resgatando `images.jpg.large_image_url`.
  3. **Tier 3 (Fallback Final)**: Geração instantânea de banner SVG via `ui-avatars.com` com as iniciais do título e fundo na cor do tema Animatch (`#6366f1` / `#ff3366`).
- **Ação Técnica**: Criar hook compartilhado `useImageFallback(anime)` e plugar no `onError` de `AnimeCard.jsx` e `AnimeDetailModal.jsx`.
- **Arquivos**: `src/hooks/useImageFallback.js`, `src/components/AnimeCard.jsx`, `src/components/AnimeDetailModal.jsx`.
- **Complexidade**: Baixa.

### 3.2 Escala Semântica de Cores para o Match Badge
- **Origem**: [Fonte B] `RecommendationCard.jsx` (`getScoreColor`).
- **Racional**: A nota prevista tinha estilização cinza/monocromática; o usuário precisava ler o número para saber se o match era bom.
- **Escala Visual Semântica**:
  - $\ge 80\%$: Gradiente Esmeralda/Verde (`#10b981` $\rightarrow$ `#059669`) — Afinidade máxima.
  - $\ge 60\%$: Gradiente Azul/Ciano (`#3b82f6` $\rightarrow$ `#0891b2`) — Afinidade sólida.
  - $\ge 40\%$: Gradiente Laranja/Âmbar (`#f59e0b` $\rightarrow$ `#d97706`) — Afinidade neutra.
  - $< 40\%$: Gradiente Carmesim/Vermelho (`#ef4444` $\rightarrow$ `#dc2626`) — Fora da zona.
- **Ação Técnica**: Adicionar classes dinâmicas em `AnimeCard.module.css`.
- **Arquivos**: `src/components/AnimeCard.jsx`, `src/components/AnimeCard.module.css`.
- **Complexidade**: Baixa.

### 3.3 Badge Visual de Posição (#Rank) no Grid
- **Origem**: [Fonte B] `RecommendationCard.jsx` (`#rank badge`).
- **Racional**: O usuário não identificava visualmente e com rapidez qual era a recomendação #1, #2 ou #3 no meio da grade de cards.
- **Ação Técnica**: Adicionar selo discreto `#1`, `#2`, `#3` no canto superior esquerdo de cada card no grid de recomendações.
- **Arquivos**: `src/components/RecommendationGrid.jsx`, `src/components/AnimeCard.jsx`.
- **Complexidade**: Baixa.

### 3.4 Personagens e Dubladores (*Seiyuus*) no Modal de Detalhes
- **Origem**: [Fonte C] `modelos/Animatch/src/pages/AnimeDetails.jsx`.
- **Decisão de Design (Não Poluir o Card)**:
  - ⚠️ **Regra**: O card do Dashboard e a visão principal do modal **NÃO** receberão essa lista para manter o visual limpo, leve e focado na decisão.
  - **Localização**: Ficará exclusivamente dentro de uma aba secundária recolhível (*accordion/drawer* "Elenco & Dubladores") dentro do `AnimeDetailModal.jsx`.
  - **Carregamento sob demanda**: A lista só é buscada via API (`/v4/anime/{id}/characters`) quando o usuário clicar para expandir a aba de elenco.
- **Arquivos**: `src/components/AnimeDetailModal.jsx`, `src/components/AnimeCastSection.jsx`.
- **Complexidade**: Média.

### 3.5 Filtro de Nota Mínima de Afinidade (Minimum Match Score)
- **Origem**: [Fonte C] `modelos/Animatch/src/pages/AIRecommendations.jsx`.
- **Racional**: O `FilterBar.jsx` permite filtrar por gênero, ano e formato, mas não permite filtrar por nível de afinidade. Se a lista de planejamento do usuário tiver 100 animes, ele não consegue isolar rapidamente apenas o que tem match $\ge 8.0$.
- **Ação Técnica**: Adicionar seletor dropdown ou chips de nota mínima no `FilterBar.jsx` (Todos, $\ge 7.0$, $\ge 8.0$, $\ge 9.0$) filtrando `predictedScore`.
- **Arquivos**: `src/components/FilterBar.jsx`.
- **Complexidade**: Baixa.

### 3.6 Empty State com Ação Educativa (Explore / Reset)
- **Origem**: [Fonte C] `modelos/Animatch/src/pages/AIRecommendations.jsx`.
- **Racional**: Quando o usuário aplica filtros excessivos ou a lista de recomendações fica vazia, a tela não deve ficar em branco sem saída.
- **Ação Técnica**: Renderizar componente visual amigável com botão de CTA direto (*"Limpar Filtros"* ou *"Adicionar animes ao Planejamento"*).
- *(Nota de Decisão: O banner redundante 'Como Funciona' foi descartado por já estar coberto integralmente no FAQ da Landing Page em `landing.faq_q3`).*
- **Arquivos**: `src/components/RecommendationGrid.jsx`.
- **Complexidade**: Baixa.

---

## 4. Rede, Cache & Performance (`src/cache/`)

> Garante velocidade percebida de 0ms e proteção total contra rate limits (429) de AniList, MAL e Kitsu.

### 4.1 Single-Flight Request Deduplication (Promise Coalescing)
- **Origem**: [Fonte A] `anime_repository.dart` (`Map<String, Future<...>>`).
- **Racional**: Se dois componentes renderizam ao mesmo tempo e pedem a mesma busca ou lista, ocorrem 2 requisições HTTP paralelas idênticas antes de salvar em cache, gerando desperdício e risco de Rate Limit (429).
- **Ação Técnica**: Manter um `Map<string, Promise>` em `apiCache.js`. Se uma requisição com a mesma chave já estiver em andamento, retorna a mesma Promise existente e limpa a chave no `.finally()`.
- **Arquivos**: `src/cache/apiCache.js`, `src/cache/apiCache.test.js`.
- **Complexidade**: Baixa.

### 4.2 Stale-While-Revalidate (SWR) no Pipeline Local
- **Origem**: [Fonte A] `anime_repository.dart` (`_refreshRecommendationsInBackground`).
- **Racional**: O usuário não deve esperar loading se já existem dados em cache IndexedDB.
- **Ação Técnica**: Retornar o cache local instantaneamente (0ms) e disparar revalidação assíncrona em background via worker/promessa paralela, atualizando a tela sem bloqueio.
- **Arquivos**: `src/hooks/useRecommendationPipeline.js`, `src/cache/cloudListSync.js`.
- **Complexidade**: Média.

### 4.3 Histórico de Busca Recente Persistido
- **Origem**: [Fonte A] `watchlist_repository.dart` (`getRecentSearches`, `addSearchTerm`).
- **Racional**: Agilidade para o usuário repetir buscas anteriores na barra de pesquisa sem reescrever texto.
- **Ação Técnica**: Persistir os últimos 10 termos únicos em IndexedDB/`localStorage`.
- **Arquivos**: `src/cache/idbCache.js`, `src/components/FilterBar.jsx`.
- **Complexidade**: Baixa.

---

## 5. Módulos de Descoberta & Gamificação (Genre Mixer)

> Transforma a navegação estática por gêneros em um laboratório interativo de alquimia de combos.

### 5.1 Genre Mixer: Alquimia de Gêneros ($G_1 \times G_2$)
- **Origem**: [Fonte D] `genres.js`.
- **Racional**: O `GenreRecommendationModal.jsx` atual filtra apenas 1 gênero isolado da lista do usuário. O Genre Mixer permite combinar dois eixos independentes para descobrir nichos específicos ou quebrar bloqueios de escolha.
- **Estrutura Funcional**:
  - **Dois Painéis Independentes**: Painel 1 (Gênero Primário, destaque Carmesim) $\times$ Painel 2 (Gênero Secundário, destaque Ciano).
  - **Modo Dual de Busca**:
    - *Aba 1 (No meu Planejamento)*: Filtra a lista de animes já salvos pelo usuário com interseção dos 2 gêneros e re-ranqueia por `predictedScore`.
    - *Aba 2 (Explorar Mundo / Descoberta)*: Busca animes mais bem avaliados globalmente via Jikan (`genres=g1,g2&order_by=score`) ou AniList GraphQL para trazer obras fora da bolha do usuário.
  - **10 Presets Lendários (Chips de 1 Toque)**:
    1. *Battle Scholar*: Action $\times$ School
    2. *Dark Fantasy*: Fantasy $\times$ Psychological
    3. *Love & Laughs*: Romance $\times$ Comedy
    4. *Space Horror*: Sci-Fi $\times$ Horror
    5. *Martial Mystic*: Martial Arts $\times$ Supernatural
    6. *Tragic Slice*: Slice of Life $\times$ Drama
    7. *Mecha War*: Mecha $\times$ Military
    8. *Isekai Quest*: Isekai $\times$ Adventure
    9. *Mind Games*: Suspense $\times$ Mystery
    10. *Sports Spirit*: Sports $\times$ Drama
  - **Destaque Visual nos Cards**: As tags dos 2 gêneros combinados ganham realce visual imediato ($G_1$ com badge carmesim, $G_2$ com badge ciano).
  - **Integração**: Ao clicar em qualquer anime resultante, abre o `AnimeDetailModal.jsx` existente.
- **Arquivos**: `src/components/GenreMixerModal.jsx`, `src/components/GenreMixerModal.module.css`.
- **Complexidade**: Média.

---

## 6. Expansão de Catálogo & Produto (Futuro)

### 6.1 Suporte Unificado a Mangás & Light Novels
- **Origem**: [Fonte A] `watchlist_repository.dart` (`isManga`, `chapters`, `volumes`).
- **Racional**: O Animatch atual foca exclusivamente em animes. Toda a lógica de listas e status pode ser espelhada para mangás futuramente.
- **Complexidade**: Alta.

---

## Matriz de Priorização (Esforço x Impacto)

```mermaid
quadrantChart
    title Matriz de Decisão: Melhorias Técnicas Animatch
    x-axis Baixo Esforço --> Alto Esforço
    y-axis Baixo Impacto --> Alto Impacto
    quadrant-1 Prioridade 2 (Planejar)
    quadrant-2 Prioridade 1 (Ganhos Rápidos)
    quadrant-3 Prioridade 4 (Secundário)
    quadrant-4 Prioridade 3 (Repensar)
    "Single-Flight Cache": [0.15, 0.88]
    "Proxy Notas por Status": [0.20, 0.85]
    "Bayesiano com Membros": [0.25, 0.90]
    "Sharpening & Margem": [0.22, 0.75]
    "Top 3 Alternativas": [0.18, 0.70]
    "Cores Semânticas Badge": [0.12, 0.65]
    "#Rank Badge Grid": [0.10, 0.60]
    "Fallback Imagens 3 Camadas": [0.24, 0.88]
    "Filtro Nota Mínima": [0.14, 0.72]
    "Empty State com CTA": [0.12, 0.60]
    "Fator Diversidade": [0.30, 0.82]
    "Genre Mixer (Alquimia)": [0.42, 0.86]
    "Obras Semelhantes Modal": [0.38, 0.78]
    "Decaimento Temporal": [0.45, 0.92]
    "Explicabilidade Dinâmica": [0.40, 0.78]
    "SWR Assíncrono": [0.50, 0.80]
    "Elenco/Seiyuus em Drawer": [0.48, 0.62]
    "Histórico de Busca": [0.18, 0.40]
    "Suporte a Mangás": [0.90, 0.65]
```

---

## Ordem de Implementação Sugerida

### Sprint 1: Robustez Imediata, Imagens & Resgate de Listas (Ganhos Rápidos)
- [x] **Single-Flight Promise Coalescing** em [apiCache.js](file:///C:/Sistemas/Projetos/animes/src/cache/apiCache.js) *(evita chamadas duplicadas)*
- [x] **Amortecimento Bayesiano por Membros** em [recommender.js](file:///C:/Sistemas/Projetos/animes/src/logic/recommender.js) *(proteção contra nichos irrelevantes)*
- [x] **Proxy de Notas por Status** em [recommender.js](file:///C:/Sistemas/Projetos/animes/src/logic/recommender.js) *(recomendações ativas para listas sem notas)*
- [x] **Fallback de Imagens em 3 Camadas** via `useImageFallback.js` *(fim dos cards com imagens quebradas)*

### Sprint 2: Assertividade, Diversidade & UI de Ranking
- [ ] **Fator de Diversidade (`diversity_factor`)** em [recommender.js](file:///C:/Sistemas/Projetos/animes/src/logic/recommender.js) *(evita saturação de um único gênero)*
- [ ] **Power Sharpening & Margin Boost** em [decision.js](file:///C:/Sistemas/Projetos/animes/src/logic/decision.js) *(desempate categórico do #1)*
- [ ] **Tratamento de Cold Start & Modos de Confiança** em [decision.js](file:///C:/Sistemas/Projetos/animes/src/logic/decision.js)
- [ ] **Top 3 Alternativas** no [DecisionModal.jsx](file:///C:/Sistemas/Projetos/animes/src/components/DecisionModal.jsx)
- [ ] **Escala Semântica de Cores no Match Badge** e **Selo #Rank no Grid**
- [ ] **Filtro de Nota Mínima de Afinidade** no [FilterBar.jsx](file:///C:/Sistemas/Projetos/animes/src/components/FilterBar.jsx)
- [ ] **Empty State com CTA de Ação** no [RecommendationGrid.jsx](file:///C:/Sistemas/Projetos/animes/src/components/RecommendationGrid.jsx)

### Sprint 3: Gamificação, Similaridade & Explicação
- [ ] **Genre Mixer (Alquimia de Gêneros $G_1 \times G_2$)** com 10 Presets Lendários e Modo Dual (Watchlist + Global)
- [ ] **Seção "Obras Semelhantes"** no [AnimeDetailModal.jsx](file:///C:/Sistemas/Projetos/animes/src/components/AnimeDetailModal.jsx)
- [ ] **Explicabilidade Dinâmica por Fator Dominante** nos cards
- [ ] **Aba Recolhível de Dubladores (*Seiyuus*)** sob demanda no modal (sem poluir o card principal)

### Sprint 4: Inteligência Temporal, Performance de Cache & Histórico
- [ ] **Decaimento Temporal ($e^{-\lambda t}$)** no `buildTasteProfile` *(afinidade com o momento presente)*
- [ ] **Stale-While-Revalidate (SWR)** no pipeline de dados
- [ ] **Histórico de buscas recentes** persistido no IndexedDB
