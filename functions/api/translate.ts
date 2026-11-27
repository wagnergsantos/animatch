// Cloudflare Pages Function: /api/translate
// Traduz sinopses de animes para pt-BR (ou outro idioma solicitado)
// utilizando Cloudflare Workers AI com Edge Cache e Rate Limiting.

interface Env {
  AI?: any
  CF_ACCOUNT_ID?: string
  CF_API_TOKEN?: string
}

interface TranslationRequestBody {
  text?: string
  targetLang?: string
  animeId?: string | number
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

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message)
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  })
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown'

  // Rate Limiting
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

  const { text, targetLang = 'pt-BR' } = body
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return new Response(
      JSON.stringify({ error: 'Texto para tradução é obrigatório.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const cleanText = text.trim()
  if (cleanText.length > 4000) {
    return new Response(
      JSON.stringify({ error: 'Texto excede o limite máximo permitido de 4000 caracteres.' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // 1. Edge Caching com caches.default
  const textHash = await sha256(`${targetLang}:${cleanText}`)
  const syntheticCacheUrl = `https://animatch.internal/api/translate?h=${textHash}&lang=${encodeURIComponent(targetLang)}`
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

  // 2. Execução da IA no Cloudflare
  const systemPrompt = `You are a professional translator specializing in anime, manga, and Japanese pop culture.
Translate the following anime synopsis into natural, fluent Brazilian Portuguese (pt-BR).
Rules:
- Preserve Japanese terms and honorifics (e.g. shinigami, stand, quirk, jutsu, sensei, kouhai) where appropriate.
- Preserve character names, attack names, and place names accurately without translating them literally.
- Maintain formatting and paragraph breaks.
- Return ONLY the translated synopsis text without any introductory commentary, notes, or quotation wrappers.`

  let translatedText = ''
  try {
    if (env.AI && typeof env.AI.run === 'function') {
      const aiRes = await env.AI.run('@cf/meta/llama-3.2-3b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: cleanText },
        ],
        max_tokens: 1024,
      })
      translatedText = (aiRes?.response || '').trim()
    } else if (env.CF_ACCOUNT_ID && env.CF_API_TOKEN) {
      // Fallback via API REST Cloudflare caso não haja binding AI direto
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
              { role: 'user', content: cleanText },
            ],
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

  return successResponse
}
