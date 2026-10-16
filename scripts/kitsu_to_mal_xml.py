#!/usr/bin/env python3
"""
Exportador da biblioteca de animes do Kitsu para o formato XML (.xml.gz / .xml)
compatível com a importação do MyAnimeList e do AniList (Schema MAL v1.1.0).
"""

import argparse
import gzip
import json
import math
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

STATUS_MAP_KITSU_TO_MAL = {
    "current": "Watching",
    "completed": "Completed",
    "on_hold": "On-Hold",
    "dropped": "Dropped",
    "planned": "Plan to Watch",
}

SUBTYPE_MAP_KITSU_TO_MAL = {
    "tv": "TV",
    "movie": "Movie",
    "ova": "OVA",
    "ona": "ONA",
    "special": "Special",
    "music": "Music",
}


def cdata(text: str) -> str:
    """Formata string dentro de bloco CDATA escapando eventuais sequências ']]>'."""
    safe = (text or "").replace("]]>", "]]]]><![CDATA[>")
    return f"<![CDATA[{safe}]]>"


def format_date(iso_str: str | None) -> str:
    """Converte timestamp ISO-8601 do Kitsu para YYYY-MM-DD ou 0000-00-00."""
    if not iso_str or not isinstance(iso_str, str):
        return "0000-00-00"
    date_part = iso_str[:10]
    if len(date_part) == 10 and date_part[4] == "-" and date_part[7] == "-":
        return date_part
    return "0000-00-00"


def convert_score(rating_twenty: int | float | str | None) -> int:
    """
    Converte ratingTwenty do Kitsu (2..20) para escala inteira 0..10 do MAL.
    Arredonda .5 para cima (ex: 15 -> 7.5 -> 8).
    """
    if rating_twenty is None or rating_twenty == "":
        return 0
    try:
        val = float(rating_twenty) / 2.0
        if val <= 0:
            return 0
        return min(10, int(math.floor(val + 0.5)))
    except (ValueError, TypeError):
        return 0


def request_json(url: str, headers: dict, data: bytes | None = None, retries: int = 4) -> dict:
    """Executa requisição HTTP retornando JSON com retry automático para 429/5xx."""
    for attempt in range(retries):
        req = urllib.request.Request(url, data=data, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt < retries - 1:
                retry_after = e.headers.get("Retry-After") if e.headers else None
                wait = int(retry_after) if (retry_after and retry_after.isdigit()) else 3 * (attempt + 1)
                print(f"[!] HTTP {e.code} em {url}. Aguardando {wait}s...", file=sys.stderr)
                time.sleep(wait)
                continue
            raise
        except urllib.error.URLError:
            if attempt < retries - 1:
                time.sleep(2)
                continue
            raise
    return {}


def batch_resolve_mal_ids_via_anilist(pending_items: list[dict], batch_size: int = 15) -> dict[str, str]:
    """
    Resolve múltiplos animes sem mal_id em lote usando aliases GraphQL no AniList.
    Retorna dict { kitsu_id: mal_id }.
    """
    if not pending_items:
        return {}

    url = "https://graphql.anilist.co"
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "AnimatchKitsuExporter/1.0",
    }
    resolved: dict[str, str] = {}

    for i in range(0, len(pending_items), batch_size):
        chunk = pending_items[i : i + batch_size]
        var_defs = []
        fields = []
        variables = {}

        for idx, item in enumerate(chunk):
            alias = f"q{idx}"
            if item.get("anilist_id"):
                var_name = f"id{idx}"
                var_defs.append(f"${var_name}: Int")
                fields.append(f"{alias}: Page(perPage: 1) {{ media(id: ${var_name}, type: ANIME) {{ idMal }} }}")
                variables[var_name] = int(item["anilist_id"])
            else:
                var_name = f"s{idx}"
                var_defs.append(f"${var_name}: String")
                fields.append(f"{alias}: Page(perPage: 1) {{ media(search: ${var_name}, type: ANIME) {{ idMal }} }}")
                variables[var_name] = item["search_title"]

        query = f"query ({', '.join(var_defs)}) {{\n  " + "\n  ".join(fields) + "\n}"
        payload = json.dumps({"query": query, "variables": variables}).encode("utf-8")

        try:
            res = request_json(url, headers=headers, data=payload, retries=3)
            data = res.get("data") or {}
            for idx, item in enumerate(chunk):
                page_obj = data.get(f"q{idx}") or {}
                media_list = page_obj.get("media") or []
                if media_list and media_list[0].get("idMal"):
                    resolved[item["kitsu_id"]] = str(media_list[0]["idMal"])
        except Exception as e:
            print(f"[!] Aviso: falha no lote AniList fallback: {e}", file=sys.stderr)

        if i + batch_size < len(pending_items):
            time.sleep(0.6)

    return resolved


def resolve_kitsu_user(username: str, headers: dict) -> tuple[str, str]:
    """Busca o ID e nome do usuário no Kitsu por filter[name] ou filter[slug]."""
    for filter_key in ("name", "slug"):
        user_url = f"https://kitsu.io/api/edge/users?filter[{filter_key}]={urllib.parse.quote(username)}"
        try:
            user_data = request_json(user_url, headers=headers)
            data = user_data.get("data", [])
            if data:
                user_id = str(data[0]["id"])
                resolved_name = data[0].get("attributes", {}).get("name") or username
                return user_id, resolved_name
        except Exception as e:
            print(f"[!] Erro ao consultar usuario Kitsu ({filter_key}): {e}", file=sys.stderr)
    return "", username


def fetch_kitsu_library(
    username: str,
    kitsu_token: str = "",
    use_anilist_fallback: bool = True,
) -> tuple[list[dict], list[dict], str]:
    """
    Busca todas as entradas de anime do usuário no Kitsu, resolvendo o mal_id.
    Retorna: (lista_mapeada, lista_sem_mal_id, nome_usuario_kitsu)
    """
    print(f"[*] Buscando usuário Kitsu '{username}'...")
    headers = {
        "User-Agent": "AnimatchKitsuExporter/1.0",
        "Accept": "application/vnd.api+json",
    }
    if kitsu_token:
        headers["Authorization"] = f"Bearer {kitsu_token}"

    user_id, resolved_name = resolve_kitsu_user(username, headers)
    if not user_id:
        print(f"[!] Usuário Kitsu '{username}' não encontrado.", file=sys.stderr)
        return [], [], username

    print(f"[+] Usuário encontrado: {resolved_name} (ID: {user_id})")

    url = (
        f"https://kitsu.io/api/edge/library-entries?"
        f"filter[userId]={user_id}&filter[kind]=anime&"
        f"include=anime,anime.mappings&page[limit]=500&sort=id"
    )

    raw_records = []
    page_num = 1

    while url:
        print(f"[*] Baixando página {page_num} da biblioteca Kitsu...")
        try:
            res = request_json(url, headers=headers)
        except Exception as e:
            print(f"[!] Erro ao buscar biblioteca Kitsu: {e}", file=sys.stderr)
            break

        entries = res.get("data", [])
        if not entries:
            break

        included_raw = res.get("included", [])
        animes_by_id = {}
        mappings_by_id = {}

        for inc in included_raw:
            inc_type = inc.get("type")
            inc_id = str(inc.get("id", ""))
            if inc_type == "anime":
                animes_by_id[inc_id] = inc
            elif inc_type == "mappings":
                mappings_by_id[inc_id] = inc

        for entry in entries:
            attr = entry.get("attributes", {})
            anime_rel = entry.get("relationships", {}).get("anime", {}).get("data")
            kitsu_anime_id = str(anime_rel.get("id", "")) if anime_rel else ""
            anime_obj = animes_by_id.get(kitsu_anime_id, {})
            anime_attr = anime_obj.get("attributes", {})

            titles_obj = anime_attr.get("titles") or {}
            canonical_title = anime_attr.get("canonicalTitle") or ""
            en_jp = titles_obj.get("en_jp") or ""
            en_title = titles_obj.get("en") or ""
            ja_jp = titles_obj.get("ja_jp") or ""
            title = canonical_title or en_jp or en_title or ja_jp or f"Kitsu Anime #{kitsu_anime_id}"

            mal_id = ""
            anilist_id = ""
            mapping_rels = (
                anime_obj.get("relationships", {})
                .get("mappings", {})
                .get("data", [])
            )
            for m_ref in mapping_rels:
                m_obj = mappings_by_id.get(str(m_ref.get("id", "")), {})
                m_attr = m_obj.get("attributes", {})
                ext_site = m_attr.get("externalSite")
                ext_id = m_attr.get("externalId")
                if ext_site == "myanimelist/anime" and ext_id:
                    mal_id = str(ext_id)
                    break
                elif ext_site == "anilist/anime" and ext_id and str(ext_id).isdigit():
                    anilist_id = str(ext_id)

            raw_status = attr.get("status", "planned")
            mal_status = STATUS_MAP_KITSU_TO_MAL.get(raw_status, "Plan to Watch")

            raw_subtype = str(anime_attr.get("subtype") or "TV").lower()
            series_type = SUBTYPE_MAP_KITSU_TO_MAL.get(raw_subtype, "TV")
            total_episodes = int(anime_attr.get("episodeCount") or 0)
            progress = int(attr.get("progress") or 0)
            if mal_status == "Completed" and progress == 0 and total_episodes > 0:
                progress = total_episodes

            rating_twenty = attr.get("ratingTwenty") or attr.get("rating")
            score = convert_score(rating_twenty)

            start_date = format_date(attr.get("startedAt"))
            finish_date = format_date(attr.get("finishedAt"))
            comments = attr.get("notes") or ""
            times_watched = int(attr.get("reconsumeCount") or 0)
            rewatching = 1 if attr.get("reconsuming") else 0

            raw_records.append({
                "kitsu_id": kitsu_anime_id,
                "mal_id": mal_id,
                "anilist_id": anilist_id,
                "search_title": en_jp or canonical_title or en_title or ja_jp,
                "series_title": title,
                "series_type": series_type,
                "series_episodes": total_episodes,
                "my_watched_episodes": progress,
                "my_start_date": start_date,
                "my_finish_date": finish_date,
                "my_score": score,
                "my_status": mal_status,
                "my_comments": comments,
                "my_times_watched": times_watched,
                "my_rewatching": rewatching,
            })

        url = res.get("links", {}).get("next")
        page_num += 1
        if url:
            time.sleep(0.3)

    # Resolve em lote via AniList os que não possuem mal_id no Kitsu
    if use_anilist_fallback:
        missing = [r for r in raw_records if not r["mal_id"] and (r["anilist_id"] or r["search_title"])]
        if missing:
            print(f"[*] Consultando fallback AniList em lote para {len(missing)} anime(s) sem mapping no Kitsu...")
            resolved_map = batch_resolve_mal_ids_via_anilist(missing)
            for r in raw_records:
                if not r["mal_id"] and r["kitsu_id"] in resolved_map:
                    r["mal_id"] = resolved_map[r["kitsu_id"]]
                    print(f"  [~] Fallback AniList resolveu MAL ID {r['mal_id']} para '{r['series_title']}'")

    mapped_entries = []
    unmapped_entries = []
    seen_mal_ids = set()

    for r in raw_records:
        mal_id = r["mal_id"]
        if not mal_id:
            unmapped_entries.append({
                "kitsu_id": r["kitsu_id"],
                "title": r["series_title"],
                "status": r["my_status"],
            })
            continue
        if mal_id in seen_mal_ids:
            continue
        seen_mal_ids.add(mal_id)
        mapped_entries.append(r)

    return mapped_entries, unmapped_entries, resolved_name


def build_mal_xml(
    entries: list[dict],
    mal_user_id: str = "21113840",
    mal_username: str = "wagnergsantos78",
    update_on_import: int = 1,
) -> str:
    """
    Constrói o conteúdo XML seguindo exatamente o formato v1.1.0 de exportação do MyAnimeList.
    """
    counts = {
        "Watching": 0,
        "Completed": 0,
        "On-Hold": 0,
        "Dropped": 0,
        "Plan to Watch": 0,
    }
    for item in entries:
        st = item.get("my_status", "Plan to Watch")
        if st in counts:
            counts[st] += 1

    total_anime = len(entries)

    lines = [
        '<?xml version="1.0" encoding="UTF-8" ?>',
        "\t\t<!--",
        "\t\t Created by XML Export feature at MyAnimeList.net",
        "\t\t Version 1.1.0",
        "\t\t-->",
        "\t\t",
        "\t\t<myanimelist>",
        "\t\t",
        "\t\t\t<myinfo>",
        f"\t\t\t\t<user_id>{mal_user_id}</user_id>",
        f"\t\t\t\t<user_name>{mal_username}</user_name>",
        "\t\t\t\t<user_export_type>1</user_export_type>",
        f"\t\t\t\t<user_total_anime>{total_anime}</user_total_anime>",
        f"\t\t\t\t<user_total_watching>{counts['Watching']}</user_total_watching>",
        f"\t\t\t\t<user_total_completed>{counts['Completed']}</user_total_completed>",
        f"\t\t\t\t<user_total_onhold>{counts['On-Hold']}</user_total_onhold>",
        f"\t\t\t\t<user_total_dropped>{counts['Dropped']}</user_total_dropped>",
        f"\t\t\t\t<user_total_plantowatch>{counts['Plan to Watch']}</user_total_plantowatch>",
        "\t\t\t</myinfo>",
        "\t\t",
        "\t\t",
    ]

    for item in entries:
        lines.extend([
            "\t\t\t\t<anime>",
            f"\t\t\t\t\t<series_animedb_id>{item['mal_id']}</series_animedb_id>",
            f"\t\t\t\t\t<series_title>{cdata(item['series_title'])}</series_title>",
            f"\t\t\t\t\t<series_type>{item['series_type']}</series_type>",
            f"\t\t\t\t\t<series_episodes>{item['series_episodes']}</series_episodes>",
            "\t\t\t\t\t<my_id>0</my_id>",
            f"\t\t\t\t\t<my_watched_episodes>{item['my_watched_episodes']}</my_watched_episodes>",
            f"\t\t\t\t\t<my_start_date>{item['my_start_date']}</my_start_date>",
            f"\t\t\t\t\t<my_finish_date>{item['my_finish_date']}</my_finish_date>",
            "\t\t\t\t\t<my_rated></my_rated>",
            f"\t\t\t\t\t<my_score>{item['my_score']}</my_score>",
            "\t\t\t\t\t<my_storage></my_storage>",
            "\t\t\t\t\t<my_storage_value>0.00</my_storage_value>",
            f"\t\t\t\t\t<my_status>{item['my_status']}</my_status>",
            f"\t\t\t\t\t<my_comments>{cdata(item['my_comments'])}</my_comments>",
            f"\t\t\t\t\t<my_times_watched>{item['my_times_watched']}</my_times_watched>",
            "\t\t\t\t\t<my_rewatch_value></my_rewatch_value>",
            "\t\t\t\t\t<my_priority>LOW</my_priority>",
            f"\t\t\t\t\t<my_tags>{cdata('')}</my_tags>",
            f"\t\t\t\t\t<my_rewatching>{item['my_rewatching']}</my_rewatching>",
            "\t\t\t\t\t<my_rewatching_ep>0</my_rewatching_ep>",
            "\t\t\t\t\t<my_discuss>1</my_discuss>",
            "\t\t\t\t\t<my_sns>default</my_sns>",
            f"\t\t\t\t\t<update_on_import>{update_on_import}</update_on_import>",
            "\t\t\t\t</anime>",
            "\t\t\t",
        ])

    lines.append("\t\t</myanimelist>\n")
    return "\n".join(lines)


def write_export_files(xml_content: str, output_path: str, write_raw_xml: bool = False) -> list[str]:
    """Salva o arquivo compactado .xml.gz (e opcionalmente o .xml puro)."""
    written = []
    xml_bytes = xml_content.encode("utf-8")

    if output_path.endswith(".xml"):
        gz_path = output_path + ".gz"
        raw_path = output_path
    elif output_path.endswith(".xml.gz"):
        gz_path = output_path
        raw_path = output_path[:-3]
    else:
        gz_path = output_path + ".xml.gz"
        raw_path = output_path + ".xml"

    with gzip.open(gz_path, "wb") as gz_file:
        gz_file.write(xml_bytes)
    written.append(gz_path)

    if write_raw_xml or output_path.endswith(".xml"):
        with open(raw_path, "wb") as raw_file:
            raw_file.write(xml_bytes)
        if raw_path not in written:
            written.append(raw_path)

    return written


def main():
    parser = argparse.ArgumentParser(
        description="Exporta lista de animes do Kitsu para o formato XML.gz do MyAnimeList / AniList."
    )
    parser.add_argument("--kitsu", default="wagnergsantos", help="Nome de usuário ou slug no Kitsu (padrão: wagnergsantos)")
    parser.add_argument("--token", default="", help="Bearer token opcional do Kitsu (para listas privadas)")
    parser.add_argument(
        "--output",
        default="kitsu_mal_export.xml.gz",
        help="Caminho do arquivo de saída (.xml.gz)",
    )
    parser.add_argument("--raw-xml", action="store_true", help="Gera também o arquivo .xml descompactado")
    parser.add_argument("--mal-user-id", default="21113840", help="ID de usuário no MAL para o header <myinfo>")
    parser.add_argument("--mal-username", default="wagnergsantos78", help="Username no MAL para o header <myinfo>")
    parser.add_argument(
        "--no-update-on-import",
        action="store_true",
        help="Define <update_on_import>0</update_on_import> (padrão é 1 para atualizar entradas existentes)",
    )
    parser.add_argument(
        "--no-anilist-fallback",
        action="store_true",
        help="Desativa fallback na API do AniList para animes sem mapping no Kitsu",
    )

    args = parser.parse_args()

    mapped, unmapped, _ = fetch_kitsu_library(
        username=args.kitsu,
        kitsu_token=args.token,
        use_anilist_fallback=not args.no_anilist_fallback,
    )

    if not mapped:
        print("[!] Nenhum anime exportável encontrado.", file=sys.stderr)
        sys.exit(1)

    update_flag = 0 if args.no_update_on_import else 1
    xml_content = build_mal_xml(
        entries=mapped,
        mal_user_id=args.mal_user_id,
        mal_username=args.mal_username,
        update_on_import=update_flag,
    )

    files = write_export_files(xml_content, args.output, write_raw_xml=args.raw_xml)
    for fpath in files:
        print(f"[OK] Arquivo gerado: {fpath} ({len(mapped)} animes)")

    if unmapped:
        print(f"\n[!] {len(unmapped)} anime(s) ignorado(s) por não possuírem MAL ID:")
        for item in unmapped:
            print(f"  - [Kitsu #{item['kitsu_id']}] {item['title']} ({item['status']})")


if __name__ == "__main__":
    main()
