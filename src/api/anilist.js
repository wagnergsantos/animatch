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

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('O AniList está temporariamente indisponível.')
    }
    throw new Error('Erro ao conectar com o AniList.')
  }

  const json = await response.json()

  if (json.errors) {
    const error = json.errors[0]
    if (error.status === 404) {
      throw new Error('Usuário não encontrado no AniList.')
    }
    if (error.status === 403) {
      throw new Error('A lista deste usuário é privada.')
    }
    throw new Error(error.message || 'Erro desconhecido da API.')
  }

  return json.data
}

function flattenEntries(data) {
  const lists = data.MediaListCollection?.lists ?? []
  return lists.flatMap((list) => list.entries)
}

export async function fetchCompletedList(userName) {
  const data = await queryAniList(COMPLETED_QUERY, { userName })
  return flattenEntries(data)
}

export async function fetchPlanningList(userName) {
  const data = await queryAniList(PLANNING_QUERY, { userName })
  return flattenEntries(data)
}
