import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Shared in-memory cache for Jikan image lookups.
 * key: malId (number|string) -> value: string URL | null (if not found/failed)
 */
export const jikanImageCache = new Map()

/**
 * Builds dynamic avatar URL via UI-Avatars service
 */
export function getUiAvatarUrl(title) {
  const cleanTitle = (typeof title === 'string' ? title : 'Anime')
    .replace(/[^\w\s\u00C0-\u00FF]/gi, '')
    .trim()
    .slice(0, 30) || 'Anime'
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanTitle)}&size=300&background=1e293b&color=94a3b8&bold=true&length=2`
}

/**
 * Resolves malId from anime object
 */
export function extractMalId(anime) {
  if (!anime) return null
  return anime.idMal ?? anime.media?.idMal ?? (anime.provider === 'mal' ? (anime.id ?? anime.media?.id) : null) ?? null
}

/**
 * 3-Tier Resilient Image Fallback Hook
 * Tier 1: Original source (coverImage)
 * Tier 2: Jikan API fallback by malId (with shared memory cache)
 * Tier 3: UI-Avatars dynamic graphic placeholder
 * Tier 4: Local static SVG fallback (currentSrc = null, isError = true)
 */
export function useImageFallback(anime, options = {}) {
  const initialSrc = options.initialSrc ?? (anime?.coverImage || anime?.media?.coverImage?.large || anime?.media?.coverImage?.medium || null)
  const malId = options.malId ?? extractMalId(anime)
  const title = options.title ?? (typeof anime?.title === 'string' ? anime.title : anime?.title?.english || anime?.title?.romaji || '')
  const fallbackToAvatar = options.fallbackToAvatar ?? true

  const [tier, setTier] = useState(() => (initialSrc ? 1 : (malId ? 2 : (fallbackToAvatar ? 3 : 4))))
  const [currentSrc, setCurrentSrc] = useState(() => {
    if (initialSrc) return initialSrc
    if (malId && jikanImageCache.has(malId)) {
      return jikanImageCache.get(malId)
    }
    if (fallbackToAvatar) {
      return getUiAvatarUrl(title)
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(() => Boolean(initialSrc || malId || fallbackToAvatar))
  const [isError, setIsError] = useState(() => !initialSrc && !malId && !fallbackToAvatar)

  const lastInitialSrcRef = useRef(initialSrc)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (initialSrc !== lastInitialSrcRef.current) {
      lastInitialSrcRef.current = initialSrc
      if (initialSrc) {
        setTier(1)
        setCurrentSrc(initialSrc)
        setIsLoading(true)
        setIsError(false)
      } else if (malId) {
        setTier(2)
        const cached = jikanImageCache.get(malId)
        if (cached) {
          setCurrentSrc(cached)
          setIsLoading(true)
          setIsError(false)
        } else if (cached === null) {
          if (fallbackToAvatar) {
            setTier(3)
            setCurrentSrc(getUiAvatarUrl(title))
            setIsLoading(true)
            setIsError(false)
          } else {
            setTier(4)
            setCurrentSrc(null)
            setIsLoading(false)
            setIsError(true)
          }
        }
      } else if (fallbackToAvatar) {
        setTier(3)
        setCurrentSrc(getUiAvatarUrl(title))
        setIsLoading(true)
        setIsError(false)
      } else {
        setTier(4)
        setCurrentSrc(null)
        setIsLoading(false)
        setIsError(true)
      }
    }
  }, [initialSrc, malId, title, fallbackToAvatar])

  const tryJikan = useCallback(async (id) => {
    if (!id) return null
    if (jikanImageCache.has(id)) {
      return jikanImageCache.get(id)
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)
      const res = await fetch(`https://api.jikan.moe/v4/anime/${id}`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      if (!res.ok) {
        jikanImageCache.set(id, null)
        return null
      }
      const data = await res.json()
      const imageUrl =
        data?.data?.images?.jpg?.large_image_url ||
        data?.data?.images?.jpg?.image_url ||
        data?.data?.images?.webp?.large_image_url ||
        null

      jikanImageCache.set(id, imageUrl)
      return imageUrl
    } catch {
      jikanImageCache.set(id, null)
      return null
    }
  }, [])

  const handleImageLoad = useCallback(() => {
    if (!isMountedRef.current) return
    setIsLoading(false)
    setIsError(false)
  }, [])

  const handleImageError = useCallback(async () => {
    if (!isMountedRef.current) return

    // Transition from Tier 1 -> Tier 2 (Jikan) or Tier 3 (Avatar)
    if (tier === 1) {
      if (malId) {
        setTier(2)
        setIsLoading(true)
        const jikanUrl = await tryJikan(malId)
        if (!isMountedRef.current) return
        if (jikanUrl) {
          setCurrentSrc(jikanUrl)
          return
        }
      }
      if (fallbackToAvatar) {
        setTier(3)
        setCurrentSrc(getUiAvatarUrl(title))
        setIsLoading(true)
        return
      }
      setTier(4)
      setCurrentSrc(null)
      setIsLoading(false)
      setIsError(true)
      return
    }

    // Transition from Tier 2 -> Tier 3
    if (tier === 2) {
      if (fallbackToAvatar) {
        setTier(3)
        setCurrentSrc(getUiAvatarUrl(title))
        setIsLoading(true)
        return
      }
      setTier(4)
      setCurrentSrc(null)
      setIsLoading(false)
      setIsError(true)
      return
    }

    // Transition from Tier 3 -> Tier 4
    if (tier === 3) {
      setTier(4)
      setCurrentSrc(null)
      setIsLoading(false)
      setIsError(true)
    }
  }, [tier, malId, title, fallbackToAvatar, tryJikan])

  return {
    currentSrc,
    isLoading,
    isError,
    tier,
    handleImageLoad,
    handleImageError,
  }
}
