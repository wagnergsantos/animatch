import {
  DEFAULT_CACHE_TTL,
  readStaleCache,
  writeCache,
  clearCache,
  clearAllApiCache,
} from './apiCache.js'
import {
  CACHE_PREFIXES,
  IDB_CONFIG,
  KNOWN_LOCAL_STORAGE_KEYS,
} from '../lib/storageKeys.js'

const DB_NAME = IDB_CONFIG.DB_NAME
const DB_VERSION = 1
const STORE_NAME = IDB_CONFIG.STORE_NAME
export const MAX_IDB_ENTRIES = 20

function getIdbFactory() {
  if (typeof window !== 'undefined' && window.indexedDB) {
    return window.indexedDB
  }
  if (typeof globalThis !== 'undefined' && globalThis.indexedDB) {
    return globalThis.indexedDB
  }
  return null
}

function openDatabase() {
  const idb = getIdbFactory()
  if (!idb) return Promise.resolve(null)

  return new Promise((resolve) => {
    try {
      const request = idb.open(DB_NAME, DB_VERSION)

      request.onupgradeneeded = (event) => {
        const db = event.target?.result || request.result
        if (db && !db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'cacheKey' })
        }
      }

      request.onsuccess = () => {
        resolve(request.result || null)
      }

      request.onerror = () => {
        resolve(null)
      }
    } catch {
      resolve(null)
    }
  })
}

export function buildProviderCacheKey(provider = 'anilist', username = '') {
  const normUser = String(username).trim().toLowerCase()
  const normProvider = String(provider).trim().toLowerCase()
  if (normProvider === 'kitsu') return `${CACHE_PREFIXES.KITSU}${normUser}`
  if (normProvider === 'mal') return `${CACHE_PREFIXES.MAL}${normUser}`
  if (normProvider === 'ensemble') return `${CACHE_PREFIXES.ENSEMBLE}${normUser}`
  return `${CACHE_PREFIXES.ANILIST}${normUser}`
}

/**
 * Lê entrada do IndexedDB (com fallback para localStorage/apiCache).
 * Retorna tanto dados frescos quanto expirados (`isFresh`, `isStale`) para Stale-While-Revalidate.
 *
 * @param {string} cacheKey
 * @param {number} [ttlMs=DEFAULT_CACHE_TTL]
 * @returns {Promise<{ value: unknown, timestamp: number, isFresh: boolean, isStale: boolean, source: 'idb' | 'localStorage' } | null>}
 */
export async function readIdbCache(cacheKey, ttlMs = DEFAULT_CACHE_TTL) {
  const db = await openDatabase()

  if (db) {
    const idbRecord = await new Promise((resolve) => {
      try {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(cacheKey)
        req.onsuccess = () => resolve(req.result || null)
        req.onerror = () => resolve(null)
      } catch {
        resolve(null)
      }
    })

    if (
      idbRecord &&
      typeof idbRecord.timestamp === 'number' &&
      idbRecord.value !== undefined
    ) {
      const isFresh = Date.now() - idbRecord.timestamp < ttlMs
      return {
        value: idbRecord.value,
        timestamp: idbRecord.timestamp,
        isFresh,
        isStale: !isFresh,
        source: 'idb',
      }
    }
  }

  const fallback = readStaleCache(cacheKey, ttlMs)
  if (!fallback) return null
  return {
    ...fallback,
    source: 'localStorage',
  }
}

/**
 * Grava entrada no IndexedDB (com eviction LRU até MAX_IDB_ENTRIES) e sincroniza espelho em localStorage.
 *
 * @param {string} cacheKey
 * @param {unknown} value
 * @param {{ timestamp?: number, provider?: string, username?: string }} [meta]
 * @returns {Promise<boolean>}
 */
export async function writeIdbCache(cacheKey, value, meta = {}) {
  const timestamp = typeof meta.timestamp === 'number' ? meta.timestamp : Date.now()

  // Mantém espelho em localStorage (se couber na cota) para compatibilidade síncrona
  writeCache(cacheKey, value, timestamp)

  const db = await openDatabase()
  if (!db) return false

  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)

      store.put({
        cacheKey,
        value,
        timestamp,
        provider: meta.provider || null,
        username: meta.username || null,
      })

      const getAllReq = typeof store.getAll === 'function' ? store.getAll() : null
      if (getAllReq) {
        getAllReq.onsuccess = () => {
          const allRecords = Array.isArray(getAllReq.result) ? getAllReq.result : []
          if (allRecords.length > MAX_IDB_ENTRIES) {
            const sorted = [...allRecords].sort(
              (a, b) => (a.timestamp || 0) - (b.timestamp || 0)
            )
            const toDelete = sorted.slice(0, allRecords.length - MAX_IDB_ENTRIES)
            for (const item of toDelete) {
              if (item?.cacheKey) {
                store.delete(item.cacheKey)
              }
            }
          }
          resolve(true)
        }
        getAllReq.onerror = () => resolve(true)
      } else {
        resolve(true)
      }
    } catch {
      resolve(false)
    }
  })
}

/**
 * Remove entrada do IndexedDB e do localStorage.
 * @param {string} cacheKey
 * @returns {Promise<void>}
 */
export async function clearIdbCache(cacheKey) {
  clearCache(cacheKey)

  const db = await openDatabase()
  if (!db) return

  await new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      const req = store.delete(cacheKey)
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
    } catch {
      resolve()
    }
  })
}

/**
 * Remove todos os dados locais do AniMatch:
 * - Limpa todas as entradas do object store `anime_lists` no IndexedDB (`animatch_db`)
 * - Remove todas as chaves `animatch_*` do `localStorage`
 *
 * @returns {Promise<void>}
 */
export async function clearAllLocalData() {
  try {
    clearAllApiCache()
    if (typeof localStorage !== 'undefined') {
      for (const knownKey of KNOWN_LOCAL_STORAGE_KEYS) {
        localStorage.removeItem(knownKey)
      }
      const keysToRemove = []
      if (typeof localStorage.length === 'number' && typeof localStorage.key === 'function') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && key.startsWith('animatch_')) {
            keysToRemove.push(key)
          }
        }
      }
      for (const key of Object.keys(localStorage)) {
        if (key && key.startsWith('animatch_')) {
          keysToRemove.push(key)
        }
      }
      for (const key of keysToRemove) {
        localStorage.removeItem(key)
      }
    }
  } catch {
    // ignore storage errors
  }

  const db = await openDatabase()
  if (!db) return

  await new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)
      if (typeof store.clear === 'function') {
        const req = store.clear()
        req.onsuccess = () => resolve()
        req.onerror = () => resolve()
      } else if (typeof store.getAll === 'function') {
        const getAllReq = store.getAll()
        getAllReq.onsuccess = () => {
          const allRecords = Array.isArray(getAllReq.result) ? getAllReq.result : []
          for (const item of allRecords) {
            if (item?.cacheKey) {
              store.delete(item.cacheKey)
            }
          }
          resolve()
        }
        getAllReq.onerror = () => resolve()
      } else {
        resolve()
      }
    } catch {
      resolve()
    }
  })
}

