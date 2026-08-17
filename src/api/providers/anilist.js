import {
  RetryableError,
  UserNotFoundError,
  PrivateListError,
  RateLimitError,
  NonRetryableError,
  ProviderError,
} from '../errors.js'

const _DEV = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV) || false
const ANILIST_API = _DEV ? '/anilist-api' : 'https://graphql.anilist.co'
const CACHE_KEY_PREFIX = 'animatch_cache_'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos em ms

const COMPLETED_QUERY = `
query ($userName: String) {
  MediaListCollection(userName: $userName, type: ANIME, status: COMPLETED) {
    lists {
      entries {
        score(format: POINT_10_DECIMAL)
        media {
          id
          title { romaji english }
          genres
          coverImage { large }
        }
      }
    }
  }
}
`

const PLANNING_QUERY = `
query ($userName: String) {
  MediaListCollection(userName: $userName, type: ANIME, status: PLANNING) {
    lists {
      entries {
        media {
          id
          title { romaji english }
          genres
          episodes
          status
          format
          seasonYear
          startDate { year month day }
          averageScore
          coverImage { large }
          siteUrl
          description
          streamingEpisodes { site url }
        }
      }
    }
  }
}
`

const ALL_LISTS_QUERY = `
query ($userName: String) {
  MediaListCollection(userName: $userName, type: ANIME) {
    lists {
      entries {
        status
        score(format: POINT_10_DECIMAL)
        media {
          id
          title { romaji english }
          status
          format
          episodes
          seasonYear
          startDate { year month day }
          genres
          description(asHtml: false)
          coverImage { large }
          averageScore
          popularity
          siteUrl
          externalLinks {
            site
            url
            type
          }
        }
      }
    }
  }
}
`

async function queryAniList(query, variables, retries = 2, delayMs = 100) {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      let response
      try {
        response = await fetch(ANILIST_API, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({ query, variables }),
        })
      } catch (fetchErr) {
        throw new RetryableError('Erro ao conectar com o AniList.', { cause: fetchErr })
      }

      if (!response) {
        throw new RetryableError('Erro ao conectar com o AniList.')
      }

      if (response.status === 429) {
        throw new NonRetryableError('O AniList está temporariamente indisponível.')
      }
      if (response.status === 404) {
        throw new UserNotFoundError('AniList')
      }
      if (response.status === 403) {
        throw new RateLimitError('AniList', 1)
      }

      let json = null
      try {
        json = await response.json()
      } catch {
        // Body is not JSON
      }

      if (json?.errors?.length) {
        const error = json.errors[0]
        const msg = error.message ? error.message.toLowerCase() : ''
        if (error.status === 404 || msg.includes('not found')) {
          throw new UserNotFoundError('AniList')
        }
        if (msg.includes('private')) {
          throw new PrivateListError('AniList')
        }
        throw new NonRetryableError(error.message || 'Erro desconhecido da API.')
      }

      if (!response.ok) {
        if (response.status >= 500 && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)))
          continue
        }
        throw new RetryableError('Erro ao conectar com o AniList.')
      }

      return json?.data
    } catch (err) {
      lastError = err

      if (err instanceof ProviderError && !err.isRetryable) {
        throw err
      }

      if (!(err instanceof ProviderError)) {
        // Erro inesperado / não encapsulado trata como não-retentável
        throw err
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)))
      }
    }
  }

  throw lastError || new RetryableError('Erro ao conectar com o AniList.')
}

export function flattenEntries(data) {
  const lists = data?.MediaListCollection?.lists ?? []
  const entries = lists.flatMap((list) => list?.entries ?? [])
  const seen = new Set()
  return entries.filter((entry) => {
    const id = entry?.media?.id
    if (!id || seen.has(id)) return false
    seen.add(id)
    return true
  })
}

export async function fetchCompletedList(userName) {
  const data = await queryAniList(COMPLETED_QUERY, { userName })
  return flattenEntries(data)
}

export async function fetchPlanningList(userName) {
  const data = await queryAniList(PLANNING_QUERY, { userName })
  return flattenEntries(data)
}

export async function fetchAllLists(userName, options = {}) {
  const { forceRefresh = false } = options
  const cacheKey = `${CACHE_KEY_PREFIX}${userName.toLowerCase()}`

  if (!forceRefresh && typeof window !== 'undefined' && window.localStorage) {
    try {
      const cached = window.localStorage.getItem(cacheKey)
      if (cached) {
        const { timestamp, entries } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_TTL && Array.isArray(entries)) {
          return entries
        }
      }
    } catch (e) {
      // Ignore cache read error
    }
  }

  const data = await queryAniList(ALL_LISTS_QUERY, { userName })
  const entries = flattenEntries(data)

  if (typeof window !== 'undefined' && window.localStorage && entries.length > 0) {
    try {
      window.localStorage.setItem(
        cacheKey,
        JSON.stringify({
          timestamp: Date.now(),
          entries,
        })
      )
    } catch (e) {
      // Ignore cache write error (e.g. quota exceeded)
    }
  }

  return entries
}

export function clearUserCache(userName) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(`${CACHE_KEY_PREFIX}${userName.toLowerCase()}`)
    } catch (e) {
      // Ignore
    }
  }
}

