# Especificação: Exportador Kitsu para MAL XML.gz (`kitsu_to_mal_xml.py`)

## 1. Objetivo
Gerar arquivo `.xml.gz` (e opcionalmente `.xml`) no formato oficial do MyAnimeList (`Version 1.1.0`) a partir da biblioteca de animes atualizada do usuário no Kitsu, permitindo importação direta no MyAnimeList e no AniList quando o MAL-Sync falha na sincronização.

## 2. Arquitetura e Arquivos
- **`scripts/kitsu_to_mal_xml.py`** (novo): Script CLI em Python 3 (apenas biblioteca padrão: `urllib`, `json`, `gzip`, `math`, `argparse`) que busca a biblioteca Kitsu, resolve `mal_id` via `mappings` do Kitsu com fallback na API GraphQL do AniList, e gera o arquivo `.xml.gz` idêntico ao schema de exportação do MAL.
- **`scripts/export_anime_lists.py`** (atualização): Atualiza `fetch_kitsu()` para incluir `anime.mappings` na consulta à API do Kitsu e preencher `mal_id` no CSV exportado.

## 3. Fluxo de Dados
1. **Resolução do Usuário Kitsu**:
   - Busca `GET https://kitsu.io/api/edge/users?filter[name]=<username>` (com fallback para `filter[slug]=<username>`).
2. **Paginação da Biblioteca Kitsu**:
   - `GET https://kitsu.io/api/edge/library-entries?filter[userId]=<id>&filter[kind]=anime&include=anime,anime.mappings&page[limit]=500&sort=id`
   - Percorre `links.next` até concluir todas as entradas.
3. **Resolução de `mal_id`**:
   - Primário: Busca nos objetos `included` (`type == "mappings"`) vinculados ao anime aquele com `attributes.externalSite == "myanimelist/anime"` e extrai `attributes.externalId`.
   - Fallback: Caso o anime não possua mapeamento `myanimelist/anime` no Kitsu, executa query GraphQL no AniList (`Media(search: $title, type: ANIME) { idMal }`) usando o `canonicalTitle` (ou `en_jp`).
   - Se ainda não encontrar `mal_id`, registra o anime na lista de ignorados e exibe aviso detalhado ao final da execução.
4. **Mapeamento de Campos para XML (Schema MAL v1.1.0)**:
   - Header `<myinfo>`:
     - `<user_id>`: default `21113840` (configurável via `--mal-user-id`)
     - `<user_name>`: username informado (ou `--mal-username`, default `wagnergsantos78`)
     - `<user_export_type>`: `1`
     - Contadores calculados (`user_total_anime`, `user_total_watching`, `user_total_completed`, `user_total_onhold`, `user_total_dropped`, `user_total_plantowatch`).
   - Nós `<anime>`:
     - `<series_animedb_id>`: `mal_id`
     - `<series_title>`: `<![CDATA[{titulo}]]>`
     - `<series_type>`: `TV`, `OVA`, `Movie`, `Special`, `ONA`, `Music` (normalizado a partir de `subtype` do Kitsu)
     - `<series_episodes>`: `episodeCount` (ou `0`)
     - `<my_id>`: `0`
     - `<my_watched_episodes>`: `progress` (se status for `Completed` e `progress == 0` com `episodeCount > 0`, usa `episodeCount`)
     - `<my_start_date>` / `<my_finish_date>`: `YYYY-MM-DD` extraído de `startedAt` / `finishedAt` ou `0000-00-00`
     - `<my_score>`: inteiro `0`–`10` calculado com `math.floor(ratingTwenty / 2 + 0.5)` (`0` quando sem nota)
     - `<my_status>`: `Watching`, `Completed`, `On-Hold`, `Dropped`, `Plan to Watch`
     - `<my_comments>`: `<![CDATA[{notes}]]>`
     - `<my_times_watched>`: `reconsumeCount` (`0` default)
     - `<my_rewatching>`: `1` se `reconsuming` for true, senão `0`
     - `<update_on_import>`: `1` por padrão (sobrescreve/atualiza entradas existentes no MAL na importação; flag `--no-update-on-import` para usar `0`)
5. **Saída**:
   - Gera `<output>.xml.gz` compactado com `gzip` e, opcionalmente via `--raw-xml`, também salva o `.xml` descompactado.

## 4. Tratamento de Erros e Testes
- Tratamento de rate-limit (HTTP 429) com retry e backoff.
- Escapamento seguro de `]]>` dentro de blocos `CDATA`.
- Validação da estrutura XML gerada e descompressão `.gz` com testes automatizados.
