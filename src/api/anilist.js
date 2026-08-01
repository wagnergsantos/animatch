const ANILIST_API = 'https://graphql.anilist.co'
const CACHE_KEY_PREFIX = 'animatch_cache_'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos em ms
export const CACHE_KEY_DUB = 'animatch_dub_cache'
export const CACHE_DUB_TTL = 24 * 60 * 60 * 1000 // 24 horas em ms

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
          coverImage { large }
          averageScore
          popularity
          siteUrl
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
      const response = await fetch(ANILIST_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables }),
      })

      if (!response) {
        throw new Error('Erro ao conectar com o AniList.')
      }

      if (response.status === 429) {
        throw new Error('O AniList está temporariamente indisponível.')
      }
      if (response.status === 404) {
        throw new Error('Usuário não encontrado no AniList.')
      }
      if (response.status === 403) {
        throw new Error('A lista deste usuário é privada.')
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
          throw new Error('Usuário não encontrado no AniList.')
        }
        if (error.status === 403 || msg.includes('private')) {
          throw new Error('A lista deste usuário é privada.')
        }
        throw new Error(error.message || 'Erro desconhecido da API.')
      }

      if (!response.ok) {
        if (response.status >= 500 && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)))
          continue
        }
        throw new Error('Erro ao conectar com o AniList.')
      }

      return json?.data
    } catch (err) {
      lastError = err

      // Non-retryable user/validation/API business errors
      const isNonRetryable =
        err.message === 'Usuário não encontrado no AniList.' ||
        err.message === 'A lista deste usuário é privada.' ||
        err.message === 'O AniList está temporariamente indisponível.' ||
        err.message === 'Erro ao conectar com o AniList.' ||
        (err.message && err.message !== 'Failed to fetch' && !err.message.includes('fetch'))

      if (isNonRetryable) {
        throw err
      }

      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, attempt)))
      }
    }
  }

  throw lastError || new Error('Erro ao conectar com o AniList.')
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

const DUB_QUERY = `
query ($idIn: [Int]) {
  Page(page: 1, perPage: 50) {
    media(id_in: $idIn) {
      id
      characters(sort: ROLE, perPage: 15) {
        edges {
          node { id }
          voiceActors {
            languageV2
          }
        }
      }
    }
  }
}
`

export async function fetchDubInfo(mediaIds) {
  if (!mediaIds || mediaIds.length === 0) return new Map()

  const dubMap = new Map()
  let cachedDubs = {}

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const cached = window.localStorage.getItem(CACHE_KEY_DUB)
      if (cached) {
        const { timestamp, dubs } = JSON.parse(cached)
        if (Date.now() - timestamp < CACHE_DUB_TTL && dubs) {
          cachedDubs = dubs
        }
      }
    } catch (e) {
      // Ignore cache read error
    }
  }

  const missingIds = []
  for (const id of mediaIds) {
    if (id in cachedDubs) {
      dubMap.set(id, cachedDubs[id])
    } else {
      missingIds.push(id)
    }
  }

  if (missingIds.length === 0) {
    return dubMap
  }

  try {
    const data = await queryAniList(DUB_QUERY, { idIn: missingIds })
    const mediaList = data?.Page?.media ?? []

    for (const media of mediaList) {
      const chars = media?.characters?.edges ?? []
      const hasPtBr = chars.some(
        (char) => char?.voiceActors && char.voiceActors.some((va) => va?.languageV2 === 'Portuguese')
      )
      dubMap.set(media.id, hasPtBr)
      cachedDubs[media.id] = hasPtBr
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(
          CACHE_KEY_DUB,
          JSON.stringify({
            timestamp: Date.now(),
            dubs: cachedDubs,
          })
        )
      } catch (e) {
        // Ignore cache write error
      }
    }
  } catch (err) {
    console.error('Failed to fetch dub info', err)
  }

  return dubMap
}
