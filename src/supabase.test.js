import { describe, it, expect } from 'vitest'
import { validateSupabaseAnonKey } from './supabase.js'

describe('Supabase Client Security', () => {
  it('allows safe public anon keys or placeholders', () => {
    expect(() => validateSupabaseAnonKey('placeholder')).not.toThrow()
    expect(() => validateSupabaseAnonKey('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')).not.toThrow()
  })

  it('throws critical security error if key starts with sb_secret_', () => {
    expect(() => validateSupabaseAnonKey('sb_secret_1234567890abcdef')).toThrow(
      /ERRO CRÍTICO DE SEGURANÇA/
    )
  })

  it('throws critical security error if key contains service_role', () => {
    expect(() => validateSupabaseAnonKey('eyJhbGciOiJIUzI1NiIsIn...service_role...')).toThrow(
      /ERRO CRÍTICO DE SEGURANÇA/
    )
  })
})
