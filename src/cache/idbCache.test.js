import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  readIdbCache,
  writeIdbCache,
  clearIdbCache,
  buildProviderCacheKey,
  MAX_IDB_ENTRIES,
} from './idbCache.js'
import { DEFAULT_CACHE_TTL } from './apiCache.js'

function createFakeIndexedDB() {
  const stores = new Map()

  const createObjectStoreInstance = (name) => {
    if (!stores.has(name)) {
      stores.set(name, new Map())
    }
    const map = stores.get(name)

    return {
      get(key) {
        const req = { result: undefined, onsuccess: null, onerror: null }
        queueMicrotask(() => {
          req.result = map.get(key)
          req.onsuccess?.({ target: req })
        })
        return req
      },
      put(record) {
        const req = { result: record.cacheKey, onsuccess: null, onerror: null }
        map.set(record.cacheKey, record)
        queueMicrotask(() => {
          req.onsuccess?.({ target: req })
        })
        return req
      },
      delete(key) {
        const req = { result: undefined, onsuccess: null, onerror: null }
        map.delete(key)
        queueMicrotask(() => {
          req.onsuccess?.({ target: req })
        })
        return req
      },
      getAll() {
        const req = { result: [], onsuccess: null, onerror: null }
        queueMicrotask(() => {
          req.result = Array.from(map.values())
          req.onsuccess?.({ target: req })
        })
        return req
      },
    }
  }

  return {
    _stores: stores,
    open() {
      const req = {
        result: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null,
      }
      queueMicrotask(() => {
        const db = {
          objectStoreNames: {
            contains: (name) => stores.has(name),
          },
          createObjectStore: (name) => createObjectStoreInstance(name),
          transaction: () => ({
            objectStore: (name) => createObjectStoreInstance(name),
          }),
        }
        req.result = db
        if (!stores.has('anime_lists')) {
          req.onupgradeneeded?.({ target: req })
        }
        req.onsuccess?.({ target: req })
      })
      return req
    },
  }
}

describe('idbCache', () => {
  let fakeIdb

  beforeEach(() => {
    localStorage.clear()
    fakeIdb = createFakeIndexedDB()
    vi.stubGlobal('indexedDB', fakeIdb)
    if (typeof window !== 'undefined') {
      window.indexedDB = fakeIdb
    }
    vi.useRealTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    if (typeof window !== 'undefined') {
      delete window.indexedDB
    }
    vi.useRealTimers()
  })

  it('monta a chave padronizada por provedor via buildProviderCacheKey', () => {
    expect(buildProviderCacheKey('anilist', 'WagUser')).toBe('animatch_cache_waguser')
    expect(buildProviderCacheKey('kitsu', 'WagUser')).toBe('animatch_kitsu_cache_waguser')
    expect(buildProviderCacheKey('mal', 'WagUser')).toBe('animatch_mal_cache_waguser')
  })

  it('grava e lê dados frescos (< 6h) a partir do IndexedDB', async () => {
    const key = buildProviderCacheKey('anilist', 'alice')
    const entries = [{ status: 'PLANNING', media: { id: 10 } }]

    await writeIdbCache(key, entries, { provider: 'anilist', username: 'alice' })
    const cached = await readIdbCache(key, DEFAULT_CACHE_TTL)

    expect(cached).not.toBeNull()
    expect(cached.value).toEqual(entries)
    expect(cached.isFresh).toBe(true)
    expect(cached.isStale).toBe(false)
    expect(cached.source).toBe('idb')
  })

  it('retorna entrada expirada (>= 6h) com isStale=true e isFresh=false para SWR offline', async () => {
    const key = buildProviderCacheKey('kitsu', 'bob')
    const entries = [{ status: 'COMPLETED', score: 9, media: { id: 20 } }]
    const sevenHoursAgo = Date.now() - 7 * 60 * 60 * 1000

    await writeIdbCache(key, entries, { timestamp: sevenHoursAgo })
    const cached = await readIdbCache(key, DEFAULT_CACHE_TTL)

    expect(cached).not.toBeNull()
    expect(cached.value).toEqual(entries)
    expect(cached.isFresh).toBe(false)
    expect(cached.isStale).toBe(true)
    expect(cached.source).toBe('idb')
  })

  it('evicta entradas mais antigas quando excede MAX_IDB_ENTRIES', async () => {
    const baseTime = Date.now() - 100_000
    for (let i = 0; i <= MAX_IDB_ENTRIES; i++) {
      await writeIdbCache(`key-${i}`, [{ id: i }], { timestamp: baseTime + i * 1000 })
    }

    // Limpa localStorage para testar exclusivamente a retenção no IndexedDB
    localStorage.clear()

    const oldest = await readIdbCache('key-0')
    const newest = await readIdbCache(`key-${MAX_IDB_ENTRIES}`)

    expect(oldest).toBeNull()
    expect(newest).not.toBeNull()
    expect(newest.value).toEqual([{ id: MAX_IDB_ENTRIES }])
  })

  it('remove do IndexedDB e localStorage ao chamar clearIdbCache', async () => {
    const key = buildProviderCacheKey('mal', 'carol')
    await writeIdbCache(key, [{ id: 1 }])

    await clearIdbCache(key)
    const afterClear = await readIdbCache(key)
    expect(afterClear).toBeNull()
  })

  it('faz fallback transparente para localStorage quando IndexedDB não está disponível', async () => {
    vi.stubGlobal('indexedDB', undefined)
    if (typeof window !== 'undefined') {
      delete window.indexedDB
    }

    const key = buildProviderCacheKey('anilist', 'dave')
    await writeIdbCache(key, [{ id: 99 }])

    const result = await readIdbCache(key)
    expect(result).not.toBeNull()
    expect(result.value).toEqual([{ id: 99 }])
    expect(result.source).toBe('localStorage')
  })
})
