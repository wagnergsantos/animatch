# Especificação Técnica: Arquitetura Multi-Provedores (AniList & Kitsu)

**Data:** 2026-08-02  
**Status:** Aprovado  
**Projeto:** Animatch  

---

## 1. Visão Geral e Objetivos

Expandir a arquitetura da aplicação Animatch para permitir a integração agnóstica de múltiplos provedores de dados de animes. Inicialmente, dará suporte a dois provedores:
1. **AniList** (via GraphQL API)
2. **Kitsu** (via REST JSON:API v1)

A aplicação continuará a oferecer recomendações personalizadas baseadas no perfil de sabor do usuário, suporte a filtro de dublagem por idioma (PT-BR, Inglês, etc.) e modal de detalhes completo, independente de onde a lista do usuário seja oriunda.

---

## 2. Arquitetura da Camada de API (`src/api/`)

A camada de API será refatorada no padrão **Adapter (Provedores Pluggáveis)** com a seguinte estrutura de arquivos:

```
src/api/
  ├── index.js               <-- Ponto de entrada unificado: fetchUserEntries(username, provider, options)
  ├── adapter.js             <-- Utilitários de normalização de dados e gerenciamento de cache
  └── providers/
      ├── anilist.js         <-- Adaptador GraphQL AniList + consulta de dubladores (voice actors)
      └── kitsu.js           <-- Adaptador REST JSON:API Kitsu + consulta de dubladores/relacionamentos
```

### 2.1 Modelo de Dados Unificado (`AnimeEntry`)

Independentemente da origem (AniList ou Kitsu), os adaptadores devolverão objetos com a mesma estrutura uniforme:

```js
{
  status: 'COMPLETED' | 'PLANNING' | 'CURRENT' | 'DROPPED' | 'PAUSED',
  score: 8.5, // Escala de 0 a 10
  media: {
    id: 1234, // ID original do provedor
    provider: 'anilist' | 'kitsu',
    title: { romaji: '...', english: '...' },
    status: 'FINISHED' | 'RELEASING' | 'NOT_YET_RELEASED' | 'CANCELLED' | 'HIATUS',
    format: 'TV' | 'MOVIE' | 'OVA' | 'SPECIAL' | 'OTHER',
    episodes: 24,
    seasonYear: 2024,
    startDate: { year: 2024, month: 1, day: 10 },
    genres: ['Action', 'Sci-Fi'],
    description: '...',
    coverImage: { large: 'https://...' },
    averageScore: 82, // Escala 0-100 da comunidade
    siteUrl: 'https://kitsu.io/anime/1234', // URL de origem do anime
    streamingLinks: [
      { site: 'Crunchyroll', url: 'https://...' }
    ]
  }
}
```

---

## 3. Especificação do Adaptador Kitsu (`src/api/providers/kitsu.js`)

### 3.1 Consulta de Perfil do Usuário
1. Requisição: `GET https://kitsu.io/api/edge/users?filter[name]={username}`
2. Validação: Caso não encontre nenhum usuário ou o array retornado seja vazio, dispara o erro em português: `"Usuário não encontrado no Kitsu."`.

### 3.2 Consulta da Lista da Biblioteca (`library-entries`)
1. Requisição: `GET https://kitsu.io/api/edge/library-entries?filter[userId]={userId}&include=anime,anime.categories,anime.streamingLinks&page[limit]=500`
2. Mapeamento de Status da Biblioteca:
   - `completed` ➔ `COMPLETED`
   - `planned` ➔ `PLANNING`
   - `current` ➔ `CURRENT`
   - `on_hold` ➔ `PAUSED`
   - `dropped` ➔ `DROPPED`
3. Mapeamento de Atributos do Anime:
   - `canonicalTitle` / `titles.en` / `titles.en_jp` ➔ `title`
   - `episodeCount` ➔ `episodes`
   - `status` (`finished`, `current`, `upcoming`, `unreleased`) ➔ Normalizado para `FINISHED`, `RELEASING`, etc.
   - `startDate` (extrai o ano) ➔ `seasonYear` / `startDate.year`
   - `averageRating` (multiplica por 10 para converter em escala 0-100) ➔ `averageScore`

### 3.3 Suporte à Informação de Dublagem (`fetchDubInfo`) no Kitsu
A verificação de dublagem para o Kitsu utilizará os endpoints de relacionamentos de elenco e dubladores da API v1 do Kitsu:
1. Endpoint: `GET https://kitsu.io/api/edge/anime/{id}/castings?include=person,character`
2. Filtro de Idioma: Checa se a propriedade `language` da pessoa/dublador ou papel bate com a linguagem mapeada (ex: `Portuguese` / `Japanese`).
3. Estrutura de Cache: Utilizará uma chave de cache independente `animatch_kitsu_dub_cache_v1` no `localStorage` por 24 horas, idêntica ao mecanismo resiliente do AniList.

---

## 4. Alterações na Interface do Usuário (UI/UX)

### 4.1 Tela de Login ([LoginScreen.jsx](file:///C:/Sistemas/Projetos/animes/src/components/LoginScreen.jsx))
- **Seletor de Provedor Ativo:**
  - Botões/Pills para alternar entre **AniList** e **Kitsu**.
  - Exibe o placeholder dinâmico: *"Seu usuário no AniList..."* ou *"Seu usuário no Kitsu..."*.
- **Persistência de Preferência:**
  - Armazena a última escolha do provedor no `localStorage` sob a chave `animatch_provider`.

### 4.2 Dashboard ([Dashboard.jsx](file:///C:/Sistemas/Projetos/animes/src/components/Dashboard.jsx))
- Header exibe o selo/badge da plataforma ativa (ex: `@wagnergsantos (Kitsu)`).
- Botão "Trocar de Provedor / Sair" na barra de navegação.
- O recomendador (`recommender.js`) processa as entradas sem necessidade de alteração na lógica de pontuação bayesiana.

---

## 5. Estratégia de Testes

1. **Testes do Adaptador Kitsu (`kitsu.test.js`):**
   - Cobertura de requisições REST mockadas (`fetch`).
   - Mapeamento correto de erros (usuário não encontrado, erro HTTP 500, etc.).
   - Mapeamento e normalização das categorias Kitsu em array de gêneros.
   - Teste do extrator de dublagem `fetchDubInfo` para o Kitsu.
2. **Testes Unificados da API (`index.test.js`):**
   - Garantir que `fetchUserEntries(username, provider)` encaminhe para o adaptador correto.
3. **Testes de Regressão da Interface:**
   - Garantir que todos os 130 testes existentes em `AnimeCard`, `Dashboard`, `TasteProfile`, e `Recommender` continuem passando sem alterações quebrantes.
