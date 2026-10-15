#!/usr/bin/env python3
"""
Exportador de listas de animes (AniList, MyAnimeList, Kitsu) para CSV.
Exporta: id, mal_id, nome, minha_nota, status, source
"""

import argparse
import csv
import sys
import time
import urllib.request
import urllib.parse
import json

STATUS_MAP_ANILIST = {
    "CURRENT": "watching",
    "COMPLETED": "completed",
    "PAUSED": "on_hold",
    "DROPPED": "dropped",
    "PLANNING": "plan_to_watch",
    "REPEATING": "rewatching"
}

STATUS_MAP_MAL = {
    1: "watching",
    2: "completed",
    3: "on_hold",
    4: "dropped",
    6: "plan_to_watch"
}

STATUS_MAP_KITSU = {
    "current": "watching",
    "completed": "completed",
    "on_hold": "on_hold",
    "dropped": "dropped",
    "planned": "plan_to_watch"
}

def fetch_anilist(username: str):
    print(f"[*] Buscando AniList para '{username}'...")
    url = "https://graphql.anilist.co"
    query = """
    query ($userName: String) {
      MediaListCollection(userName: $userName, type: ANIME) {
        lists {
          name
          entries {
            score(format: POINT_10_DECIMAL)
            status
            media {
              id
              idMal
              title {
                romaji
                english
                native
              }
            }
          }
        }
      }
    }
    """
    data = json.dumps({"query": query, "variables": {"userName": username}}).encode("utf-8")
    req = urllib.request.Request(
        url,
        data=data,
        headers={"Content-Type": "application/json", "User-Agent": "AnimatchExporter/1.0"}
    )
    
    try:
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[!] Erro ao buscar AniList: {e}", file=sys.stderr)
        return []

    items = []
    seen = set()
    lists = res.get("data", {}).get("MediaListCollection", {}).get("lists", [])
    for lst in lists:
        for entry in lst.get("entries", []):
            media = entry.get("media", {})
            anilist_id = media.get("id")
            if anilist_id in seen:
                continue
            seen.add(anilist_id)
            
            mal_id = media.get("idMal")
            title_obj = media.get("title", {})
            name = title_obj.get("romaji") or title_obj.get("english") or title_obj.get("native") or ""
            score = entry.get("score", 0)
            raw_status = entry.get("status", "")
            status = STATUS_MAP_ANILIST.get(raw_status, str(raw_status).lower())

            items.append({
                "source": "anilist",
                "id": str(anilist_id or ""),
                "mal_id": str(mal_id or ""),
                "nome": name,
                "minha_nota": str(score if score is not None else ""),
                "status": status
            })

    print(f"[+] AniList: {len(items)} animes encontrados.")
    return items

def fetch_mal(username: str):
    print(f"[*] Buscando MyAnimeList para '{username}'...")
    items = []
    offset = 0
    limit = 300
    
    while True:
        url = f"https://myanimelist.net/animelist/{urllib.parse.quote(username)}/load.json?offset={offset}&status=7"
        req = urllib.request.Request(
            url,
            headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "X-Requested-With": "XMLHttpRequest"
            }
        )
        
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"[!] Erro ao buscar MAL (offset {offset}): {e}", file=sys.stderr)
            break
            
        if not data:
            break
            
        for row in data:
            mal_id = row.get("anime_id")
            name = row.get("anime_title", "")
            score = row.get("score", "")
            raw_status = row.get("status")
            status = STATUS_MAP_MAL.get(raw_status, str(raw_status) if raw_status is not None else "")

            items.append({
                "source": "mal",
                "id": str(mal_id or ""),
                "mal_id": str(mal_id or ""),
                "nome": name,
                "minha_nota": str(score if score is not None else ""),
                "status": status
            })
            
        if len(data) < limit:
            break
            
        offset += len(data)
        time.sleep(0.5)

    print(f"[+] MyAnimeList: {len(items)} animes encontrados.")
    return items

def fetch_kitsu(username: str, kitsu_token: str = ""):
    print(f"[*] Buscando Kitsu para '{username}'...")
    headers = {"User-Agent": "AnimatchExporter/1.0"}
    if kitsu_token:
        headers["Authorization"] = f"Bearer {kitsu_token}"

    user_url = f"https://kitsu.io/api/edge/users?filter[name]={urllib.parse.quote(username)}"
    req = urllib.request.Request(user_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req) as resp:
            user_data = json.loads(resp.read().decode("utf-8"))
    except Exception as e:
        print(f"[!] Erro ao buscar usuario Kitsu: {e}", file=sys.stderr)
        return []

    data = user_data.get("data", [])
    if not data:
        print(f"[!] Usuario Kitsu '{username}' nao encontrado.")
        return []

    user_id = data[0]["id"]
    items = []
    
    # 1. Aumentamos o limit para 500 (busca toda a sua lista de uma vez só)
    # 2. Ordenamos por id fixo para evitar inconsistências
    url = (
        f"https://kitsu.io/api/edge/library-entries?"
        f"filter[userId]={user_id}&filter[kind]=anime&include=anime&"
        f"page[limit]=500&sort=id"
    )

    while url:
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req) as resp:
                res = json.loads(resp.read().decode("utf-8"))
        except Exception as e:
            print(f"[!] Erro ao buscar biblioteca Kitsu: {e}", file=sys.stderr)
            break

        entries = res.get("data", [])
        included = {item["id"]: item for item in res.get("included", []) if item.get("type") == "anime"}

        if not entries:
            break

        for entry in entries:
            rating = entry.get("attributes", {}).get("ratingTwenty") or entry.get("attributes", {}).get("rating")
            score = ""
            if rating:
                try:
                    score = str(float(rating) / 2.0)
                except ValueError:
                    score = str(rating)

            raw_status = entry.get("attributes", {}).get("status", "")
            status = STATUS_MAP_KITSU.get(raw_status, str(raw_status).lower())

            anime_rel = entry.get("relationships", {}).get("anime", {}).get("data")
            kitsu_anime_id = anime_rel.get("id") if anime_rel else ""

            name = ""
            if kitsu_anime_id and kitsu_anime_id in included:
                anime_attr = included[kitsu_anime_id].get("attributes", {})
                titles = anime_attr.get("titles", {})
                name = (
                    anime_attr.get("canonicalTitle")
                    or titles.get("en")
                    or titles.get("en_jp")
                    or titles.get("ja_jp")
                    or ""
                )

            items.append({
                "source": "kitsu",
                "id": str(kitsu_anime_id or entry.get("id", "")),
                "mal_id": "",
                "nome": name,
                "minha_nota": score,
                "status": status
            })

        # Utiliza o cursor oficial da API do Kitsu para a próxima página
        url = res.get("links", {}).get("next")
        time.sleep(0.3)

    print(f"[+] Kitsu: {len(items)} animes encontrados.")
    return items

def export_csv(records, output_file: str, merge_by_mal: bool = False):
    if merge_by_mal:
        merged = {}
        for r in records:
            key = (r["mal_id"] or r["nome"]).lower().strip()
            if not key:
                continue
            if key not in merged:
                merged[key] = {
                    "id": r["id"],
                    "mal_id": r["mal_id"],
                    "nome": r["nome"],
                    "minha_nota": r["minha_nota"],
                    "status": r["status"],
                    "source": r["source"]
                }
            else:
                if not merged[key]["mal_id"] and r["mal_id"]:
                    merged[key]["mal_id"] = r["mal_id"]
                if not merged[key]["minha_nota"] and r["minha_nota"]:
                    merged[key]["minha_nota"] = r["minha_nota"]
                if not merged[key]["status"] and r["status"]:
                    merged[key]["status"] = r["status"]
                merged[key]["source"] += f",{r['source']}"
        rows = list(merged.values())
    else:
        rows = records

    fieldnames = ["id", "mal_id", "nome", "minha_nota", "status", "source"]
    with open(output_file, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({
                "id": row.get("id", ""),
                "mal_id": row.get("mal_id", ""),
                "nome": row.get("nome", ""),
                "minha_nota": row.get("minha_nota", ""),
                "status": row.get("status", ""),
                "source": row.get("source", "")
            })
    print(f"[OK] Exportado para '{output_file}' com {len(rows)} linhas.")

def main():
    parser = argparse.ArgumentParser(description="Exporta listas de animes para CSV")
    parser.add_argument("--anilist", help="Nome de usuario AniList", default="")
    parser.add_argument("--mal", help="Nome de usuario MyAnimeList", default="")
    parser.add_argument("--kitsu", help="Nome de usuario Kitsu", default="")
    parser.add_argument("--output", help="Arquivo CSV de saida", default="animes.csv")
    parser.add_argument("--merge", action="store_true", help="Mescla entradas duplicadas entre plataformas")

    args = parser.parse_args()

    if not (args.anilist or args.mal or args.kitsu):
        print("Erro: Forneca ao menos um usuario (--anilist, --mal ou --kitsu).")
        print("Exemplo: python scripts/export_anime_lists.py --anilist seu_user --mal seu_user --output animes.csv")
        sys.exit(1)

    all_records = []

    if args.anilist:
        all_records.extend(fetch_anilist(args.anilist))
    if args.mal:
        all_records.extend(fetch_mal(args.mal))
    if args.kitsu:
        all_records.extend(fetch_kitsu(args.kitsu))

    export_csv(all_records, args.output, merge_by_mal=args.merge)

if __name__ == "__main__":
    main()
