import { corsHeaders } from '../_shared/cors.ts'

const MAL_CLIENT_ID = Deno.env.get('MAL_CLIENT_ID') ?? ''
const MAL_API = 'https://api.myanimelist.net/v2'

const STATUS_MAP: Record<string, string> = {
  completed: 'COMPLETED',
  plan_to_watch: 'PLANNING',
  watching: 'CURRENT',
  on_hold: 'PAUSED',
  dropped: 'DROPPED',
}

const FORMAT_MAP: Record<string, string> = {
  tv: 'TV',
  movie: 'MOVIE',
  ova: 'OVA',
  ona: 'ONA',
  special: 'SPECIAL',
  music: 'OTHER',
  unknown: 'TV',
}

const MEDIA_STATUS_MAP: Record<string, string> = {
  finished_airing: 'FINISHED',
  currently_airing: 'RELEASING',
  not_yet_aired: 'NOT_YET_RELEASED',
}

interface MALNode {
  id: number
  title: string
  main_picture?: { large?: string; medium?: string }
  genres?: Array<{ id: number; name: string }>
  mean?: number
  num_episodes?: number
  start_date?: string
  status?: string
  media_type?: string
  synopsis?: string
  num_list_users?: number
}

interface MALListEntry {
  node: MALNode
  list_status: {
    status: string
    score: number
    updated_at: string
  }
}

function normalizeEntry(entry: MALListEntry) {
  const { node, list_status } = entry
  const startDate = node.start_date
    ? (() => {
        const parts = node.start_date.split('-')
        return {
          year: parts[0] ? parseInt(parts[0], 10) : null,
          month: parts[1] ? parseInt(parts[1], 10) : null,
          day: parts[2] ? parseInt(parts[2], 10) : null,
        }
      })()
    : null

  // node.title é o titulo padrao do MAL (geralmente Romaji)
  // alternative_titles contem en (ingles) e ja (japones)
  const malNode = node as MALNode & { alternative_titles?: { en?: string; ja?: string } }
  const englishTitle = malNode.alternative_titles?.en?.trim() || node.title
  const romajiTitle = node.title || malNode.alternative_titles?.en?.trim() || ''

  return {
    status: STATUS_MAP[list_status.status] ?? 'PLANNING',
    score: list_status.score ?? 0,
    media: {
      id: node.id,
      provider: 'mal',
      title: {
        romaji: romajiTitle,
        english: englishTitle,
      },
      genres: (node.genres ?? []).map((g) => g.name),
      averageScore: node.mean != null ? Math.round(node.mean * 10) : 0,
      episodes: node.num_episodes ?? 0,
      status: MEDIA_STATUS_MAP[node.status ?? ''] ?? 'NOT_YET_RELEASED',
      format: FORMAT_MAP[node.media_type ?? ''] ?? 'TV',
      seasonYear: startDate?.year ?? null,
      startDate,
      coverImage: { large: node.main_picture?.large ?? node.main_picture?.medium ?? '' },
      siteUrl: `https://myanimelist.net/anime/${node.id}`,
      description: node.synopsis ?? '',
      streamingLinks: [],
    },
  }
}

async function fetchAllPages(username: string, status: string): Promise<MALListEntry[]> {
  const fields = 'list_status,genres,main_picture,num_episodes,start_date,status,media_type,synopsis,mean,num_list_users,alternative_titles'
  const limit = 1000
  let url: string | null =
    `${MAL_API}/users/${encodeURIComponent(username)}/animelist?status=${status}&fields=${fields}&limit=${limit}&nsfw=true`

  const all: MALListEntry[] = []

  while (url) {
    const res = await fetch(url, {
      headers: { 'X-MAL-CLIENT-ID': MAL_CLIENT_ID },
    })

    if (res.status === 403) throw new Error('A lista deste usuário é privada.')
    if (res.status === 404) throw new Error('Usuário não encontrado no MyAnimeList.')
    if (!res.ok) throw new Error('Erro ao conectar com o MyAnimeList.')

    const json = await res.json()
    all.push(...(json.data ?? []))
    url = json.paging?.next ?? null
  }

  return all
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (!MAL_CLIENT_ID) {
      return new Response(
        JSON.stringify({ error: 'MAL_CLIENT_ID não configurado.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { username, status } = await req.json() as { username: string; status: string }

    if (!username || !status) {
      return new Response(
        JSON.stringify({ error: 'username e status são obrigatórios.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const validStatuses = ['completed', 'plan_to_watch', 'watching', 'on_hold', 'dropped']
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: `status inválido: ${status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rawEntries = await fetchAllPages(username, status)
    const normalized = rawEntries.map(normalizeEntry)

    return new Response(JSON.stringify({ data: normalized }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido.'
    const status =
      message.includes('não encontrado') ? 404 :
      message.includes('privada') ? 403 : 500

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
