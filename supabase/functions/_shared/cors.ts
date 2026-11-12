export const ALLOWED_ORIGINS = [
  'https://wagnergsantos.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
]

export const DEFAULT_ALLOWED_ORIGIN = 'https://wagnergsantos.github.io'

export function getCorsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers.get('origin')?.trim() ?? ''
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : DEFAULT_ALLOWED_ORIGIN

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

export const corsHeaders = getCorsHeaders()
