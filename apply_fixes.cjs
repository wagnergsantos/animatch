const fs = require('fs');

let kitsuContent = fs.readFileSync('src/api/providers/kitsu.js', 'utf8');

kitsuContent = kitsuContent.replace(
  'const animeRef = entry.relationships.anime.data\n  const anime = included.find(inc => inc.type === \'anime\' && inc.id === animeRef.id)\n  \n  if (!anime) return null',
  'const animeRef = entry.relationships?.anime?.data\n  if (!animeRef) return null\n  const anime = included.find(inc => inc.type === \'anime\' && inc.id === animeRef.id)\n  \n  if (!anime) return null'
);

kitsuContent = kitsuContent.replace(
  'localStorage.setItem(cacheKey, JSON.stringify({\n      timestamp: Date.now(),\n      data: entries\n    }))\n\n    return entries',
  'const seen = new Set()\n    const deduped = entries.filter((entry) => {\n      if (seen.has(entry.media.id)) return false\n      seen.add(entry.media.id)\n      return true\n    })\n\n    localStorage.setItem(cacheKey, JSON.stringify({\n      timestamp: Date.now(),\n      data: deduped\n    }))\n\n    return deduped'
);

kitsuContent = kitsuContent.replace(
  'export async function kitsuFetchDubInfo(mediaIds, language) {',
  'export async function kitsuFetchDubInfo(mediaIds, language = \'pt-br\') {'
);

fs.writeFileSync('src/api/providers/kitsu.js', kitsuContent, 'utf8');

let testContent = fs.readFileSync('src/api/providers/kitsu.test.js', 'utf8');

testContent = testContent.replace(
  'import { kitsuFetchAll, kitsuFetchDubInfo, KITSU_CACHE_KEY_DUB } from \'./kitsu.js\'',
  'import { kitsuFetchAll, kitsuFetchDubInfo, clearKitsuCache, KITSU_CACHE_KEY_DUB } from \'./kitsu.js\''
);

const addTests = `
describe('clearKitsuCache', () => {
  it('removes correct localStorage key', () => {
    localStorage.setItem('animatch_kitsu_cache_user', 'data')
    clearKitsuCache('user')
    expect(localStorage.getItem('animatch_kitsu_cache_user')).toBeNull()
  })
})

describe('kitsuFetchDubInfo', () => {
  it('returns dub info and caches it', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: '1' }] })
    })

    const result = await kitsuFetchDubInfo([999], 'pt-br')
    expect(result.get(999)).toBe(true)
    
    const cached = JSON.parse(localStorage.getItem(KITSU_CACHE_KEY_DUB))
    expect(cached.data['pt-br']['999']).toBe(true)
  })

  it('handles missing dubs', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [] })
    })

    const result = await kitsuFetchDubInfo([888], 'en')
    expect(result.get(888)).toBe(false)
  })
})
`;
testContent = testContent + '\n' + addTests;

fs.writeFileSync('src/api/providers/kitsu.test.js', testContent, 'utf8');
console.log('Update finished');