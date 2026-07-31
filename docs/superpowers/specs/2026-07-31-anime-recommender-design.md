# Dashboard de Recomendações Personalizadas de Anime

## Especificação de Design

### 1. Visão Geral

Uma aplicação web single-page (SPA) que gera recomendações personalizadas a partir da lista "Quero Assistir" do usuário no AniList. O sistema calcula um **Perfil de Gosto** baseado nas notas que o usuário deu aos animes já completados, e usa esse perfil para prever uma nota para cada anime não assistido da lista de planejamento.

### 2. Stack Técnica

| Camada | Tecnologia | Justificativa |
|---|---|---|
| Framework | React + Vite | SPA moderna, rápida, sem backend |
| Estilização | Vanilla CSS | Tema escuro, acentos ciano cyberpunk e âmbar quente (tokens definidos em DESIGN.md) |
| Dados | AniList GraphQL API | API pública, sem necessidade de OAuth para listas públicas |
| Deploy | Estático (Vercel, GitHub Pages, ou local) | Sem servidor necessário |
| Estado | React hooks (`useState`, `useEffect`) | Simplicidade, sem libs extras |

### 3. Fluxo de Dados e Lógica

#### 3.1 Entrada do Usuário
O usuário informa seu **username do AniList** em um campo de texto. Nenhuma autenticação é necessária — a API do AniList permite consultar listas públicas sem token.

#### 3.2 Buscar Lista de Completados

Query GraphQL para `MediaListCollection` com `status: COMPLETED`:

```graphql
query ($userName: String) {
  MediaListCollection(userName: $userName, type: ANIME, status: COMPLETED) {
    lists {
      entries {
        score(format: POINT_10_DECIMAL)
        media {
          id
          title { romaji english }
          genres
          coverImage { large }
        }
      }
    }
  }
}
```

> [!IMPORTANT]
> A query `MediaListCollection` retorna **toda a lista de uma vez** (agrupada por status). Não é necessário implementar paginação manual.

**Extrair de cada entrada:**
- `score` — nota do usuário normalizada para escala 0-10 (formato `POINT_10_DECIMAL`).
- `genres` — array de strings (ex: `["Action", "Adventure", "Fantasy"]`).
- Entradas com `score == 0` (não avaliadas) devem ser **ignoradas** no cálculo do perfil.

#### 3.3 Calcular Perfil de Gosto

1. Agrupar todos os animes completados por gênero.
2. Para cada gênero, calcular:
   - **Média das notas** (`average`): apenas dos animes completados que possuem nota > 0 naquele gênero.
   - **Quantidade total assistida** (`count`): todos os animes completados naquele gênero (mesmo sem nota).
   - **Quantidade de avaliados** (`scoredCount`): animes completados que possuem nota > 0 naquele gênero.
3. **Filtro de relevância:** Ignorar gêneros com `scoredCount` menor que **2 animes** avaliados — evita que uma única nota distorça o perfil.

**Exemplo:**

| Gênero | Completados Total (`count`) | Avaliados (`scoredCount`) | Notas | Média (`average`) |
|---|---|---|---|---|
| Action | 20 | 15 | [5, 6, 5, 4, 5, 6, 5, 5, 7, 4, 5, 6, 5, 4, 5] | 5.1 |
| Adventure | 5 | 4 | [9, 8, 9, 10] | 9.0 |
| Mecha | 3 | 1 | [3] | *(ignorado, scoredCount < 2)* |

#### 3.4 Buscar Lista "Quero Assistir"

Mesma estrutura de query, mas com `status: PLANNING`:

```graphql
query ($userName: String) {
  MediaListCollection(userName: $userName, type: ANIME, status: PLANNING) {
    lists {
      entries {
        media {
          id
          title { romaji english }
          genres
          coverImage { large }
          averageScore
          popularity
        }
      }
    }
  }
}
```

**Extrair de cada entrada:** `id`, `title`, `coverImage`, `genres`, `averageScore` (nota média da comunidade, como fallback visual).

#### 3.5 Previsão de Nota e Ordenação

Para cada anime da lista "Quero Assistir":

1. Pegar os gêneros do anime.
2. Filtrar apenas os gêneros que existem no Perfil de Gosto (ignorar gêneros desconhecidos).
3. Calcular a **Nota Prevista** = média das notas do Perfil de Gosto para os gêneros daquele anime.
4. Se nenhum gênero do anime estiver no perfil, usar a `averageScore` da comunidade como fallback.

**Ordenação:**
- Primária: Nota Prevista (decrescente).
- Secundária (desempate): Nota da comunidade (`averageScore`, decrescente).

### 4. Interface (UI)

A interface é composta por **duas telas**, sem sidebar de navegação (YAGNI — é uma SPA simples). Todos os tokens visuais (cores, tipografia, espaçamento, raio, motion) estão definidos no `DESIGN.md` do projeto e devem ser implementados como CSS custom properties em `src/index.css`.

#### 4.1 Tela de Login
- Campo de texto centralizado para o username do AniList.
- Botão "Gerar Recomendações" (background: `--color-primary`, texto: `--color-ink`).
- **Loading:** spinner inline no botão durante a busca (a tela de login não tem conteúdo para exibir skeletons).

#### 4.2 Dashboard Principal
Uma única página com seções verticais:

- **Cabeçalho:** Nome do usuário e botão para trocar de conta.
- **Seção "Seu Perfil de Gosto":**
  - Badges inline dos **top 5 gêneros** com suas médias (ex: "Adventure ★ 9.0").
  - Os top 3 gêneros usam badge preenchido (`--color-primary`, texto branco).
  - Demais usam badge transparente (`--color-primary` a 15% de opacidade, texto `--color-primary`).
- **Seção "Recomendações — O Que Assistir Agora":**
  - **Loading:** skeleton shimmer nos cards enquanto os dados carregam (não spinner).
  - Grid responsivo (`repeat(auto-fit, minmax(200px, 1fr))`, gap `1.5rem`). Cada card mostra:
    - Imagem de capa (do AniList), aspect ratio 3:4.
    - Título (preferência: `english`, fallback: `romaji`).
    - **Nota Prevista** (ex: "Match: 8.5/10"), cor `--color-primary`, peso 600.
    - Nota da comunidade (cor `--color-muted`, tamanho `--text-sm`).
    - Gêneros como pills pequenas (background `--color-surface`, borda `--color-muted`).
  - Hover nos cards: box-shadow glow com `--color-primary` a baixa opacidade. Sem transform em imagens.

### 5. Tratamento de Erros

| Cenário | Comportamento |
|---|---|
| Username inválido | Mensagem: "Usuário não encontrado no AniList." |
| Lista privada | Mensagem: "A lista deste usuário é privada. Configure como pública no AniList." |
| Nenhum anime completado (ou todos sem nota) | Mensagem: "Avalie mais animes no AniList para gerar seu perfil de gosto." |
| Lista "Quero Assistir" vazia | Mensagem: "Adicione animes à sua lista 'Planning' no AniList." |
| Rate limit da API | Mensagem: "O AniList está temporariamente indisponível. Tente novamente em alguns segundos." |

### 6. Acessibilidade

- Contraste de texto ≥4.5:1 em todo o app (ink vs bg, muted vs bg verificados no DESIGN.md).
- `@media (prefers-reduced-motion: reduce)`: todas as transições e animações ficam instantâneas.
- Labels acessíveis em todos os inputs e botões.
- Navegação por teclado funcional (focus visível com borda `--color-primary`).

### 7. Estrutura de Arquivos do Projeto

```
animes/
├── index.html
├── package.json
├── vite.config.js
├── PRODUCT.md              # Contexto estratégico (register, users, personality)
├── DESIGN.md               # Sistema visual (paleta OKLCH, tipografia, motion, componentes)
└── src/
    ├── main.jsx            # Entry point React
    ├── App.jsx             # Componente raiz, gerencia estado global
    ├── index.css           # Tokens do DESIGN.md como CSS custom properties + reset + tema
    ├── api/
    │   └── anilist.js      # Queries GraphQL e funções de fetch
    ├── logic/
    │   └── recommender.js  # Cálculo do perfil de gosto e previsão de notas
    └── components/
        ├── LoginScreen.jsx       # Tela de entrada do username
        ├── Dashboard.jsx         # Layout principal do dashboard
        ├── TasteProfile.jsx      # Seção do perfil de gosto (badges)
        ├── RecommendationGrid.jsx # Grid de cards de recomendação (com skeleton)
        └── AnimeCard.jsx         # Card individual de anime
```

### 8. Fora de Escopo (v1)

- Autenticação OAuth.
- Uso de tags (além de gêneros) no cálculo — possível melhoria futura.
- Persistência de dados (localStorage ou banco).
- Filtros avançados na UI (por gênero, por nota mínima, etc.).
