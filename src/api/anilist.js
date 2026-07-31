const ANILIST_API = 'https://graphql.anilist.co'

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

async function queryAniList(query, variables) {
  const response = await fetch(ANILIST_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })

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
    throw new Error('Erro ao conectar com o AniList.')
  }

  return json?.data
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

export async function fetchAllLists(userName) {
  const data = await queryAniList(ALL_LISTS_QUERY, { userName })
  return flattenEntries(data)
}

