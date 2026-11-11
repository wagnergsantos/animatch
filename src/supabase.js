import { createClient } from '@supabase/supabase-js'

export function validateSupabaseAnonKey(key) {
  if (
    typeof key === 'string' &&
    (key.startsWith('sb_secret_') || key.toLowerCase().includes('service_role'))
  ) {
    throw new Error('[supabase] ERRO CRÍTICO DE SEGURANÇA: chave secreta/service_role detectada no bundle cliente.')
  }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder'

validateSupabaseAnonKey(supabaseAnonKey)

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn('[supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não definidos. Usando fallback.')
}

export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
