import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readCache, writeCache, clearCache } from './apiCache.js'

const INDEX_KEY = 'animatch_cache_index'

beforeEach(() => {
  localStorage.clear()
  vi.useRealTimers()
})

describe('readCache / writeCache', () => {
  it('retorna null quando não há nada cacheado', () => {
    expect(readCache('missing-key', 5000)).toBeNull()
  })

  it('retorna o valor gravado enquanto dentro do TTL', () => {
    writeCache('key-a', { entries: [1, 2, 3] })
    expect(readCache('key-a', 5000)).toEqual({ entries: [1, 2, 3] })
  })

  it('retorna null quando o TTL expirou', () => {
    vi.useFakeTimers()
    writeCache('key-b', ['x'])
    vi.advanceTimersByTime(10_000)
    expect(readCache('key-b', 5000)).toBeNull()
    vi.useRealTimers()
  })

  it('retorna null (não quebra) para uma entrada com JSON corrompido', () => {
    localStorage.setItem('key-c', '{not valid json')
    expect(readCache('key-c', 5000)).toBeNull()
  })

  it('retorna null para formato antigo sem campo `value` (schema anterior à extração)', () => {
    // formato usado antes da extração deste módulo (ex.: { timestamp, entries })
    localStorage.setItem('key-d', JSON.stringify({ timestamp: Date.now(), entries: [1] }))
    expect(readCache('key-d', 5000)).toBeNull()
  })
})

describe('clearCache', () => {
  it('remove a entrada e tira do índice', () => {
    writeCache('key-e', ['a'])
    expect(readCache('key-e', 5000)).toEqual(['a'])

    clearCache('key-e')
    expect(readCache('key-e', 5000)).toBeNull()
    expect(JSON.parse(localStorage.getItem(INDEX_KEY))).not.toContain('key-e')
  })
})

describe('eviction LRU (A1)', () => {
  it('mantém no máximo 15 chaves no índice, removendo a mais antiga', () => {
    for (let i = 0; i < 16; i++) {
      writeCache(`user-${i}`, [`data-${i}`])
    }

    const index = JSON.parse(localStorage.getItem(INDEX_KEY))
    expect(index).toHaveLength(15)

    // a primeira chave gravada (mais antiga) foi evictada
    expect(readCache('user-0', 5000)).toBeNull()
    expect(localStorage.getItem('user-0')).toBeNull()

    // a mais recente continua lá
    expect(readCache('user-15', 5000)).toEqual(['data-15'])
  })

  it('reescrever uma chave existente move ela para o topo (não conta como nova entrada)', () => {
    for (let i = 0; i < 15; i++) {
      writeCache(`user-${i}`, [i])
    }
    // reescreve a mais antiga (user-0) — ela deve voltar ao topo, não ser evictada
    writeCache('user-0', ['atualizado'])
    // grava mais uma chave nova, o que deve evictar a agora-mais-antiga (user-1)
    writeCache('user-16', ['novo'])

    expect(readCache('user-0', 5000)).toEqual(['atualizado']) // sobreviveu
    expect(readCache('user-1', 5000)).toBeNull() // foi evictada no lugar
  })
})
