# Design Spec: Menu de Configurações — Dublagem Favorita

> **Data:** 2026-07-31
> **Status:** Aprovado
> **Escopo:** Nova preferência de usuário (dublagem favorita), persistida em `localStorage`, generalizando o bônus/badge de dublagem hoje fixo em PT-BR.

---

## 📌 Objetivo

Hoje o AniMatch já detecta se um anime tem dublagem em Português (BR) via AniList (`fetchDubInfo`), aplica um pequeno bônus de nota (+0.1) que influencia a ordenação, e mostra um badge "🎙️ Dublado PT-BR" no card. Isso é fixo para todos os usuários.

Como a ferramenta é usada por múltiplas pessoas com gostos diferentes, cada usuário deve poder escolher sua **dublagem favorita** (ou "nenhuma") em um menu de configurações, com a escolha salva localmente no navegador (`localStorage`). O idioma escolhido passa a ser o critério usado no mecanismo de bônus/ordenação/badge/filtro que já existe hoje — sem mudar a mecânica em si, apenas o idioma-alvo.

**Fora de escopo:** suportar múltiplos idiomas favoritos simultâneos, sincronizar a preferência entre dispositivos/contas, e detectar automaticamente o idioma do usuário.

---

## 🏗️ Detalhamento dos Componentes

### 1. `src/api/anilist.js` — parametrizar o idioma verificado

* `fetchDubInfo(mediaIds, language = 'pt-br')`: mesma assinatura de retorno de hoje (`Map<id, boolean>`), mas em vez de checar sempre `languageV2 === 'Portuguese'`, compara contra o idioma recebido via um mapa:
  ```js
  const LANGUAGE_MAP = {
    'pt-br': 'Portuguese',
    'en': 'English',
    'ja': 'Japanese',
    'es': 'Spanish',
    'de': 'German',
    'ko': 'Korean',
    'fr': 'French',
    'it': 'Italian',
  }
  ```
  (valores de `languageV2` a confirmar/ajustar durante a implementação, comparando com os testes existentes — `'pt-br'` deve continuar mapeando para o mesmo valor já usado hoje, preservando o comportamento atual quando o idioma passado for `'pt-br'`).
* Cache: substituir `CACHE_KEY_DUB` por `CACHE_KEY_DUB_V2 = 'animatch_dub_cache_v2'`, guardando um objeto por idioma:
  ```json
  {
    "pt-br": { "timestamp": 0, "dubs": { "101": true } },
    "en": { "timestamp": 0, "dubs": { "101": false } }
  }
  ```
  Cada idioma mantém seu próprio TTL de 24h (`CACHE_DUB_TTL`, inalterado). Trocar de idioma favorito pode gerar uma nova consulta à API na primeira vez (aceitável); consultas subsequentes ao mesmo idioma usam o cache.
* Se `language` não estiver em `LANGUAGE_MAP`, a função retorna um `Map` vazio sem chamar a API (guarda de segurança).

### 2. Preferência do usuário — armazenamento e estado

* Chave de `localStorage`: `animatch_favorite_dub`, valores possíveis: `'nenhuma' | 'pt-br' | 'en' | 'ja' | 'es' | 'de' | 'ko' | 'fr' | 'it'`.
* **Valor padrão: `'nenhuma'`** (usuários novos ou que nunca configuraram não recebem bônus/badge/filtro de dublagem até escolherem explicitamente um idioma).
* Estado vive em `src/components/Dashboard.jsx` (mesmo padrão usado hoje para preferências locais, ex. `ThemeToggle`):
  ```js
  const [favoriteDub, setFavoriteDub] = useState(() =>
    localStorage.getItem('animatch_favorite_dub') || 'nenhuma'
  )
  useEffect(() => {
    localStorage.setItem('animatch_favorite_dub', favoriteDub)
  }, [favoriteDub])
  ```
* `favoriteDub` e `setFavoriteDub` são passados como props para `SettingsMenu`, `RecommendationGrid` (efeitos de bônus/badge/filtro).

### 3. `src/components/SettingsMenu.jsx` (novo componente)

* Botão ⚙️ no header do `Dashboard`, ao lado do `ThemeToggle`, que abre um painel/modal simples (dropdown ou modal leve, seguindo o padrão visual de `GenreRecommendationModal`).
* Conteúdo: um `<select>` (ou lista de opções) "Dublagem favorita" com as opções:
  * Nenhuma (`'nenhuma'`)
  * Português (Brasil) (`'pt-br'`)
  * Inglês (`'en'`)
  * Japonês (`'ja'`)
  * Espanhol (`'es'`)
  * Alemão (`'de'`)
  * Coreano (`'ko'`)
  * Francês (`'fr'`)
  * Italiano (`'it'`)
* Componente controlado: recebe `favoriteDub` e `onChange` via props; não gerencia `localStorage` diretamente (isso é responsabilidade do `Dashboard`, que já centraliza a persistência).
* Fecha ao clicar fora ou em um botão "Fechar".

### 4. `src/components/RecommendationGrid.jsx` — efeitos (destacar/reordenar + filtrar)

* Recebe `favoriteDub` como prop (vindo do `Dashboard`).
* `useEffect` de busca de dublagem: se `favoriteDub === 'nenhuma'`, não chama `fetchDubInfo` (mantém `dubMap` vazio). Caso contrário, chama `fetchDubInfo(ids, favoriteDub)` como hoje.
* Bônus de nota (+0.1) e reordenação: mecanismo idêntico ao atual, só que `hasDub` agora reflete o idioma escolhido em vez de PT-BR fixo. Isso já reordena a lista (efeito "destacar") sem lógica nova de sort.
* Checkbox existente "Ignorar bônus de dublagem" permanece; só é exibido/tem efeito quando `favoriteDub !== 'nenhuma'`.
* Novo checkbox "Mostrar somente com minha dublagem favorita" (exibido apenas quando `favoriteDub !== 'nenhuma'`): quando marcado, filtra `displayRecommendations` para `hasDub === true` (efeito "filtrar").

### 5. `src/components/AnimeCard.jsx` — badge dinâmico

* Texto do badge passa de fixo "🎙️ Dublado PT-BR" para dinâmico, usando um mapa de rótulos:
  ```js
  const DUB_LABELS = { 'pt-br': 'PT-BR', 'en': 'Inglês', 'ja': 'Japonês', 'es': 'Espanhol', 'de': 'Alemão', 'ko': 'Coreano', 'fr': 'Francês', 'it': 'Italiano' }
  ```
  Exibido como "🎙️ Dublado {label}" apenas quando `hasDub` é `true` (prop já existente, sem mudança de contrato).
* `AnimeCard` recebe o idioma atual (via prop nova `dubLanguage`, vinda de `RecommendationGrid` → `favoriteDub`) só para escolher o rótulo — não decide sozinho se há dublagem.

---

## 🧪 Plano de Testes

* **`anilist.test.js`:** Atualizar testes de `fetchDubInfo` para passar o parâmetro de idioma; garantir que o default `'pt-br'` preserva as asserções já existentes; adicionar casos para os demais idiomas (`'en'`, `'ja'`, `'es'`, `'de'`, `'ko'`, `'fr'`, `'it'`) e para cache namespaced por idioma (TTL expirado por idioma, idiomas diferentes não colidem no cache).
* **`SettingsMenu.test.jsx` (novo):** Renderização das opções, seleção dispara `onChange` com o valor correto, estado controlado reflete a prop `favoriteDub`.
* **`Dashboard.test.jsx`:** Verificar que a preferência é lida/gravada em `localStorage['animatch_favorite_dub']` e propagada para `RecommendationGrid`.
* **`RecommendationGrid.test.jsx`:** Verificar que `fetchDubInfo` não é chamado quando `favoriteDub === 'nenhuma'`; que o bônus/reordenação funciona para idiomas diferentes de PT-BR; e o novo filtro "somente com minha dublagem favorita".
* **`AnimeCard.test.jsx`:** Badge exibe o rótulo correto conforme `dubLanguage`.
