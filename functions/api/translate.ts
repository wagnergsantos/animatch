// Cloudflare Pages Function: /api/translate
// Traduz sinopses de animes para pt-BR (ou outro idioma solicitado)
// utilizando Cloudflare Workers AI com Edge Cache, Rate Limiting e proteções anti-abuso.

interface Env {
  AI?: any
  TRANSLATE_KV?: any
  CF_ACCOUNT_ID?: string
  CF_API_TOKEN?: string
}

interface TranslationRequestBody {
  text?: string
  targetLang?: string
  animeId?: string | number
  title?: string
  provider?: string
}

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX_REQUESTS = 60
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

function isAllowedOrigin(originStr: string): boolean {
  if (!originStr) return true
  try {
    const u = new URL(originStr)
    return (
      u.hostname === 'animatch-app.pages.dev' ||
      u.hostname.endsWith('.pages.dev') ||
      u.hostname === 'localhost' ||
      u.hostname === '127.0.0.1'
    )
  } catch {
    return false
  }
}

function getCorsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get('Origin') || ''
  const allowOrigin = (origin && isAllowedOrigin(origin)) ? origin : 'https://animatch-app.pages.dev'
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Requested-With',
  }
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestOptions: PagesFunction = async (context) => {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(context.request),
  })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const corsHeaders = getCorsHeaders(request)
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown'
  const origin = request.headers.get('Origin') || ''
  const referer = request.headers.get('Referer') || ''
  const secFetchSite = request.headers.get('Sec-Fetch-Site')
  const requestedWith = request.headers.get('X-Requested-With')

  // 1. Proteção contra uso arbitrário / chamadas externas
  if ((origin && !isAllowedOrigin(origin)) || (referer && !isAllowedOrigin(referer))) {
    return new Response(
      JSON.stringify({ error: 'Acesso negado: origem não autorizada.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (secFetchSite && secFetchSite !== 'same-origin' && secFetchSite !== 'same-site' && secFetchSite !== 'none') {
    return new Response(
      JSON.stringify({ error: 'Acesso negado: requisições cross-origin não são permitidas.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Permite chamada do cliente web oficial
  if (requestedWith && requestedWith !== 'Animatch-Client') {
    return new Response(
      JSON.stringify({ error: 'Acesso negado: cliente inválido.' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 2. Rate Limiting por IP
  const rateCheck = checkIpRateLimit(clientIp)
  if (!rateCheck.allowed) {
    return new Response(
      JSON.stringify({ error: 'Muitas requisições de tradução. Aguarde um instante.' }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json; charset=utf-8',
          'Retry-After': String(rateCheck.retryAfterSec),
        },
      }
    )
  }

  let body: TranslationRequestBody
  try {
    body = (await request.json()) as TranslationRequestBody
  } catch {
    return new Response(
      JSON.stringify({ error: 'JSON de requisição inválido.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { text, targetLang = 'pt-BR', animeId, title } = body

  // 3. Validação estrita: exige dados da sinopse e do anime
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'Texto para tradução é obrigatório.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!animeId || !title || typeof title !== 'string' || title.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'O endpoint aceita apenas sinopses vinculadas a um anime válido (animeId e title obrigatórios).' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const cleanText = text.trim()
  const cleanTitle = title.trim()

  if (cleanText.length > 4000) {
    return new Response(
      JSON.stringify({ error: 'Texto excede o limite máximo permitido de 4000 caracteres.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 4. Cache Global via Cloudflare KV (se configurado)
  const kvKey = `synopsis:${targetLang}:${animeId}`
  if (env.TRANSLATE_KV) {
    try {
      const kvCached = await env.TRANSLATE_KV.get(kvKey)
      if (kvCached) {
        return new Response(
          JSON.stringify({
            translatedText: kvCached,
            targetLang,
            source: 'kv-cache',
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'public, max-age=2592000, s-maxage=2592000',
            },
          }
        )
      }
    } catch {
      // Ignora erro de KV e segue para caches.default / IA
    }
  }

  // 5. Edge Caching com caches.default
  const requestUrl = new URL(request.url)
  const textHash = await sha256(`${targetLang}:${animeId}:${cleanText}`)
  const syntheticCacheUrl = `https://${requestUrl.hostname}/api/translate-cache?h=${textHash}`
  const cacheKey = new Request(syntheticCacheUrl, { method: 'GET' })

  const cache = (caches as any)?.default
  if (cache) {
    try {
      const cachedResponse = await cache.match(cacheKey)
      if (cachedResponse) {
        return cachedResponse
      }
    } catch {
      // Ignora falhas de leitura no cache e prossegue com a IA
    }
  }

  // 6. Prompt especializado: regras estritas para não traduzir nomes de franquias (ex: One Piece)
  const systemPrompt = `You are a professional localization and translation expert specializing in anime, manga, and Japanese media for the Brazilian Portuguese (pt-BR) audience.
Translate the provided anime synopsis into natural, fluent, engaging Brazilian Portuguese (pt-BR).

CRITICAL RULES:
- NEVER translate franchise titles, series names, or iconic proper nouns literally. For example:
  * "One Piece" must ALWAYS remain "One Piece" (NEVER "pequeno príncipe" or "um pedaço").
  * "Death Note" must remain "Death Note".
  * "Bleach" must remain "Bleach".
  * "Dragon Ball" must remain "Dragon Ball".
  * "Grand Line" must remain "Grand Line".
  * "Straw Hat" can be translated as "Chapéu de Palha".
  * "Devil Fruit" can be translated as "Fruta do Diabo" or "Akuma no Mi".
- Preserve character names (e.g. Luffy, Zoro, Naruto, Goku) and attack names accurately.
- Preserve standard Japanese terms and cultural loanwords (e.g. shinigami, stand, quirk, jutsu, sensei, kouhai, nakama) where standard in the anime community.
- Maintain formatting and paragraph breaks.
- If the provided text is clearly NOT an anime, manga, or animated story synopsis, output exactly: [INVALID_SYNOPSIS].
- Return ONLY the translated synopsis text without any introductory commentary, notes, or quotation wrappers.`

  const userPrompt = `Anime: ${cleanTitle}\n\nSynopsis to translate:\n${cleanText}`

  let translatedText = ''
  try {
    if (env.AI && typeof env.AI.run === 'function') {
      const aiRes = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0,
        max_tokens: 1024,
      })
      translatedText = (aiRes?.response || '').trim()
    } else if (env.CF_ACCOUNT_ID && env.CF_API_TOKEN) {
      const cfRes = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-3b-instruct`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.CF_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0,
            max_tokens: 1024,
          }),
        }
      )
      const data = (await cfRes.json()) as any
      translatedText = (data?.result?.response || '').trim()
    } else {
      return new Response(
        JSON.stringify({
          error: 'Cloudflare Workers AI não está configurado neste ambiente.',
          translatedText: cleanText,
          source: 'original',
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro na inferência da IA'
    return new Response(
      JSON.stringify({ error: message }),
      {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }

  if (translatedText.includes('[INVALID_SYNOPSIS]')) {
    return new Response(
      JSON.stringify({ error: 'O texto fornecido não foi reconhecido como uma sinopse de anime.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  if (!translatedText) {
    return new Response(
      JSON.stringify({ error: 'Não foi possível gerar a tradução.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const successResponse = new Response(
    JSON.stringify({
      translatedText,
      targetLang,
      source: 'workers-ai',
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'public, max-age=2592000, s-maxage=2592000',
      },
    }
  )

  if (cache && context.waitUntil) {
    try {
      context.waitUntil(cache.put(cacheKey, successResponse.clone()))
    } catch {
      // Ignora falhas de escrita no cache
    }
  }

  if (env.TRANSLATE_KV && context.waitUntil) {
    try {
      context.waitUntil(env.TRANSLATE_KV.put(kvKey, translatedText, { expirationTtl: 2592000 }))
    } catch {
      // Ignora falhas de escrita no KV
    }
  }

  return successResponse
}
