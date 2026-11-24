// Cloudflare Pages Function: /api/mal-proxy
// Executa no Edge Runtime da Cloudflare sem cold start e sem problemas de CORS.

interface Env {
  MAL_CLIENT_ID: string
}

const MAL_API = 'https://api.myanimelist.net/v2'
export const MAX_PAGES = 10

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 30
const ipRateLimits = new Map<string, { count: number; resetAt: number }>()

export function checkIpRateLimit(ip: string, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
  if (ipRateLimits.size > 1000) {
    for (const [k, v] of ipRateLimits.entries()) {
      if (now >= v.resetAt) ipRateLimits.delete(k)
    }
  }

  const record = ipRateLimits.get(ip)
  if (!record || now >= record.resetAt) {
    ipRateLimits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return { allowed: true, retryAfterSec: 0 }
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    const retryAfterSec = Math.max(1, Math.ceil((record.resetAt - now) / 1000))
    return { allowed: false, retryAfterSec }
  }

  record.count += 1
  return { allowed: true, retryAfterSec: 0 }
}

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
  nsfw?: string
  alternative_titles?: { en?: string; ja?: string }
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

  const englishTitle = node.alternative_titles?.en?.trim() || node.title
  const romajiTitle = node.title || node.alternative_titles?.en?.trim() || ''

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

async function fetchAllPages(username: string, status: string, clientId: string): Promise<MALListEntry[]> {
  const fields = 'list_status,genres,main_picture,num_episodes,start_date,status,media_type,synopsis,mean,num_list_users,alternative_titles,nsfw'
  const limit = 1000
  let url: string | null =
    `${MAL_API}/users/${encodeURIComponent(username)}/animelist?status=${status}&fields=${fields}&limit=${limit}`

  const all: MALListEntry[] = []
  let pageCount = 0

  while (url && pageCount < MAX_PAGES) {
    pageCount += 1
    const res = await fetch(url, {
      headers: { 'X-MAL-CLIENT-ID': clientId },
    })

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') || '60'
      const err = new Error('O MyAnimeList bloqueou temporariamente a requisição (429).')
      ;(err as any).retryAfter = retryAfter
      throw err
    }
    if (res.status === 403) throw new Error('A lista deste usuário é privada.')
    if (res.status === 404) throw new Error('Usuário não encontrado no MyAnimeList.')
    if (!res.ok) throw new Error('Erro ao conectar com o MyAnimeList.')

    const json = (await res.json()) as { data?: MALListEntry[]; paging?: { next?: string } }
    all.push(...(json.data ?? []))
    const nextCandidate = json.paging?.next ?? null
    url =
      typeof nextCandidate === 'string' && nextCandidate.startsWith('https://api.myanimelist.net/v2/')
        ? nextCandidate
        : null
  }

  return all.filter((entry) => {
    if (entry?.node?.nsfw === 'black') return false
    const genres = entry?.node?.genres ?? []
    if (genres.some((g) => g.name === 'Hentai' || g.name === 'Erotica')) return false
    return true
  })
}

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const { request, env } = context

  const responseHeaders = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  }

  try {
    const clientIp =
      request.headers.get('cf-connecting-ip')?.trim() ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown'

    const rateCheck = checkIpRateLimit(clientIp)
    if (!rateCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Muitas requisições ao proxy do MyAnimeList. Tente novamente em instantes.',
          retryAfter: String(rateCheck.retryAfterSec),
        }),
        {
          status: 429,
          headers: {
            ...responseHeaders,
            'Retry-After': String(rateCheck.retryAfterSec),
          },
        }
      )
    }

    const clientId = env.MAL_CLIENT_ID
    if (!clientId) {
      return new Response(
        JSON.stringify({ error: 'MAL_CLIENT_ID não configurado na Cloudflare.' }),
        { status: 500, headers: responseHeaders }
      )
    }

    const body = (await request.json().catch(() => ({}))) as { username?: string; status?: string }
    const { username, status } = body

    if (!username || !status) {
      return new Response(
        JSON.stringify({ error: 'username e status são obrigatórios.' }),
        { status: 400, headers: responseHeaders }
      )
    }

    if (typeof username !== 'string' || !/^[a-zA-Z0-9_.-]{1,50}$/.test(username.trim())) {
      return new Response(
        JSON.stringify({ error: 'Nome de usuário inválido.' }),
        { status: 400, headers: responseHeaders }
      )
    }

    const validStatuses = ['completed', 'plan_to_watch', 'watching', 'on_hold', 'dropped']
    if (!validStatuses.includes(status)) {
      return new Response(
        JSON.stringify({ error: `status inválido: ${status}` }),
        { status: 400, headers: responseHeaders }
      )
    }

    const rawEntries = await fetchAllPages(username.trim(), status, clientId)
    const normalized = rawEntries.map(normalizeEntry)

    return new Response(JSON.stringify({ data: normalized }), {
      headers: responseHeaders,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido.'
    const retryAfter = (err as any)?.retryAfter

    if (retryAfter || message.includes('429') || message.includes('temporariamente')) {
      return new Response(
        JSON.stringify({ error: message, retryAfter: retryAfter || '60' }),
        {
          status: 429,
          headers: {
            ...responseHeaders,
            'Retry-After': String(retryAfter || '60'),
          },
        }
      )
    }

    const status =
      message.includes('não encontrado') ? 404 :
      message.includes('privada') ? 403 : 500

    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: responseHeaders,
    })
  }
}
