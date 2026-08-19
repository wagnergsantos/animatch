import { UserNotFoundError, RetryableError, ProviderError } from '../errors.js'

const KITSU_API = 'https://kitsu.io/api/edge'
import { readCache, writeCache, clearCache } from '../../cache/apiCache.js'

const KITSU_CACHE_PREFIX = 'animatch_kitsu_cache_'
const KITSU_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const KITSU_HEADERS = {
  'Accept': 'application/vnd.api+json',
  'Content-Type': 'application/vnd.api+json',
}

const STATUS_MAP = {
  completed: 'COMPLETED',
  planned: 'PLANNING',
  current: 'CURRENT',
  on_hold: 'PAUSED',
  dropped: 'DROPPED',
}

const MEDIA_STATUS_MAP = {
  finished: 'FINISHED',
  current: 'RELEASING',
  upcoming: 'NOT_YET_RELEASED',
  unreleased: 'NOT_YET_RELEASED',
  tba: 'NOT_YET_RELEASED',
}

const FORMAT_MAP = {
  TV: 'TV',
  tv: 'TV',
  movie: 'MOVIE',
  OVA: 'OVA',
  ova: 'OVA',
  ONA: 'ONA',
  ona: 'ONA',
  special: 'SPECIAL',
  music: 'OTHER',
}
const CANONICAL_GENRES = new Set([
  'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Horror', 'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller'
])

export function clearKitsuCache(username) {
  clearCache(KITSU_CACHE_PREFIX + username)
}

function normalizeEntry(entry, included) {
  const animeRef = entry.relationships?.anime?.data
  if (!animeRef) return null
  const anime = included.find(inc => inc.type === 'anime' && inc.id === animeRef.id)
  
  if (!anime) return null

  // Resolve Categories (Genres)
  const genres = []
  if (anime.relationships?.categories?.data) {
    anime.relationships.categories.data.forEach(catRef => {
      const cat = included.find(inc => inc.type === 'categories' && inc.id === catRef.id)
      if (cat?.attributes?.title && !genres.includes(cat.attributes.title)) {
        genres.push(cat.attributes.title)
      }
    })
  }

  // Resolve Streaming Links
  const streamingLinks = []
  if (anime.relationships?.streamingLinks?.data) {
    anime.relationships.streamingLinks.data.forEach(slRef => {
      const sl = included.find(inc => inc.type === 'streamingLinks' && inc.id === slRef.id)
      if (sl) {
        const streamerRef = sl.relationships?.streamer?.data
        let siteName = 'Unknown'
        if (streamerRef) {
          const streamer = included.find(inc => inc.type === 'streamers' && inc.id === streamerRef.id)
          if (streamer?.attributes?.siteName) {
            siteName = streamer.attributes.siteName
          }
        }
        streamingLinks.push({
          site: siteName,
          url: sl.attributes.url
        })
      }
    })
  }

  let startDateObj = null
  let seasonYear = null
  if (anime.attributes.startDate) {
    const parts = anime.attributes.startDate.split('-')
    if (parts.length === 3) {
      startDateObj = {
        year: parseInt(parts[0], 10),
        month: parseInt(parts[1], 10),
        day: parseInt(parts[2], 10)
      }
      seasonYear = startDateObj.year
    }
  }

  const score = entry.attributes.ratingTwenty ? entry.attributes.ratingTwenty / 2 : 0

  return {
    status: STATUS_MAP[entry.attributes.status] || 'PLANNING',
    score: score,
    media: {
      id: parseInt(animeRef.id, 10),
      provider: 'kitsu',
      title: {
        english: anime.attributes.titles?.en || anime.attributes.canonicalTitle,
        romaji: anime.attributes.titles?.en_jp || anime.attributes.canonicalTitle,
      },
      episodes: anime.attributes.episodeCount || 0,
      status: MEDIA_STATUS_MAP[anime.attributes.status] || 'NOT_YET_RELEASED',
      format: FORMAT_MAP[anime.attributes.subtype] || 'TV',
      seasonYear: seasonYear,
      startDate: startDateObj,
      genres: genres,
      averageScore: anime.attributes.averageRating ? Math.round(parseFloat(anime.attributes.averageRating)) : 0,
      coverImage: {
        large: anime.attributes.posterImage?.large || ''
      },
      siteUrl: `https://kitsu.io/anime/${animeRef.id}`,
      description: anime.attributes.description || '',
      streamingLinks: streamingLinks
    }
  }
}

export async function kitsuFetchAll(username, options = {}) {
  const cacheKey = KITSU_CACHE_PREFIX + username
  if (!options.forceRefresh) {
    const cached = readCache(cacheKey, KITSU_CACHE_TTL)
    if (Array.isArray(cached)) return cached
  }

  try {
    const userRes = await fetch(`${KITSU_API}/users?filter[name]=${encodeURIComponent(username)}`, {
      headers: KITSU_HEADERS
    })
    if (!userRes.ok) throw new RetryableError('Erro ao conectar com o Kitsu.')
    
    const userData = await userRes.json()
    if (!userData.data || userData.data.length === 0) {
      throw new UserNotFoundError('Kitsu')
    }
    
    const userId = userData.data[0].id
    
    let entries = []
    let nextUrl = `${KITSU_API}/library-entries?filter[userId]=${userId}&filter[kind]=anime&include=anime,anime.categories,anime.streamingLinks,anime.streamingLinks.streamer&page[limit]=500`
    
    while (nextUrl) {
      const res = await fetch(nextUrl, { headers: KITSU_HEADERS })
      if (!res.ok) throw new RetryableError('Erro ao conectar com o Kitsu.')
      const data = await res.json()
      
      const included = data.included || []
      
      data.data.forEach(entry => {
        if (entry.type === 'libraryEntries') {
          const normalized = normalizeEntry(entry, included)
          if (normalized) {
            entries.push(normalized)
          }
        }
      })
      
      nextUrl = data.links?.next || null
    }

    const seen = new Set()
    const deduped = entries.filter((entry) => {
      if (seen.has(entry.media.id)) return false
      seen.add(entry.media.id)
      return true
    })

    writeCache(cacheKey, deduped)

    return deduped
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    throw new RetryableError('Erro ao conectar com o Kitsu.', { cause: error })
  }
}

