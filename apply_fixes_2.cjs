const fs = require('fs');

let kitsuContent = fs.readFileSync('src/api/providers/kitsu.js', 'utf8');

// Fix 1: Typo in URL
// In my script I had: \`${KITSU_API}/castings?filter[media_id]=${id}&filter[media_type]=Anime&filter[language]=${languageValue}&include=person&page[limit]=5\`
// Let me just replace `Anime}` with `Anime` if it exists. Actually, I'll just regex replace.
kitsuContent = kitsuContent.replace(/filter\[media_type\]=Anime\}/g, 'filter[media_type]=Anime');
// Also wait, did I have Anime} in my string? No, my string was 'filter[media_type]=Anime&'
// Let's check my previous script:
// `${KITSU_API}/castings?filter[media_id]=${id}&filter[media_type]=Anime&filter[language]=${languageValue}&include=person&page[limit]=5`
// Ah, the reviewer says "remove the extra closing brace } after Anime: change filter[media_type]=Anime} to filter[media_type]=Anime". 
// Maybe I did have it? Let's just fix it anyway if it's there.

// Fix 4: Encode username
kitsuContent = kitsuContent.replace(
  '`${KITSU_API}/users?filter[name]=${username}`',
  '`${KITSU_API}/users?filter[name]=${encodeURIComponent(username)}`'
);

// Fix 2: Defensive localStorage in clearKitsuCache
kitsuContent = kitsuContent.replace(
  'export function clearKitsuCache(username) {\n  localStorage.removeItem(KITSU_CACHE_PREFIX + username)\n}',
  'export function clearKitsuCache(username) {\n  try {\n    localStorage.removeItem(KITSU_CACHE_PREFIX + username)\n  } catch(e) {}\n}'
);

// Fix 2: Defensive localStorage in kitsuFetchAll
kitsuContent = kitsuContent.replace(
  '  const cached = localStorage.getItem(cacheKey)\n  if (!options.forceRefresh && cached) {\n    const parsed = JSON.parse(cached)\n    if (Date.now() - parsed.timestamp < KITSU_CACHE_TTL) {\n      return parsed.data\n    }\n  }',
  '  if (!options.forceRefresh) {\n    try {\n      const cached = localStorage.getItem(cacheKey)\n      if (cached) {\n        const parsed = JSON.parse(cached)\n        if (Date.now() - parsed.timestamp < KITSU_CACHE_TTL) {\n          return parsed.data\n        }\n      }\n    } catch(e) {}\n  }'
);

kitsuContent = kitsuContent.replace(
  '    localStorage.setItem(cacheKey, JSON.stringify({\n      timestamp: Date.now(),\n      data: deduped\n    }))',
  '    try {\n      localStorage.setItem(cacheKey, JSON.stringify({\n        timestamp: Date.now(),\n        data: deduped\n      }))\n    } catch(e) {}'
);

// Fix 2 & 3: Defensive localStorage in kitsuFetchDubInfo and Parallelize
// Let's replace the whole kitsuFetchDubInfo
const oldDubInfo = `export async function kitsuFetchDubInfo(mediaIds, language = 'pt-br') {
  let cache = {}
  const cachedStr = localStorage.getItem(KITSU_CACHE_KEY_DUB)
  if (cachedStr) {
    const parsed = JSON.parse(cachedStr)
    if (Date.now() - parsed.timestamp < KITSU_CACHE_DUB_TTL) {
      cache = parsed.data || {}
    }
  }

  const result = new Map()
  const toFetch = []
  
  for (const id of mediaIds) {
    const langCache = cache[language] || {}
    if (langCache[id] !== undefined) {
      result.set(id, langCache[id])
    } else {
      toFetch.push(id)
    }
  }
  
  if (toFetch.length === 0) return result

  const languageValue = DUB_LANGUAGE_MAP[language] || 'Portuguese'

  for (const id of toFetch) {
    try {
      const res = await fetch(\`\${KITSU_API}/castings?filter[media_id]=\${id}&filter[media_type]=Anime&filter[language]=\${languageValue}&include=person&page[limit]=5\`, {
        headers: KITSU_HEADERS
      })
      if (!res.ok) continue
      
      const data = await res.json()
      const hasDub = data.data && data.data.length > 0
      result.set(id, hasDub)
      
      if (!cache[language]) cache[language] = {}
      cache[language][id] = hasDub
      
    } catch (e) {
      // Ignora falhas de dublagem individuais
    }
  }
  
  localStorage.setItem(KITSU_CACHE_KEY_DUB, JSON.stringify({
    timestamp: Date.now(),
    data: cache
  }))

  return result
}`;

const newDubInfo = `export async function kitsuFetchDubInfo(mediaIds, language = 'pt-br') {
  let cache = {}
  try {
    const cachedStr = localStorage.getItem(KITSU_CACHE_KEY_DUB)
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr)
      if (Date.now() - parsed.timestamp < KITSU_CACHE_DUB_TTL) {
        cache = parsed.data || {}
      }
    }
  } catch(e) {}

  const result = new Map()
  const toFetch = []
  
  for (const id of mediaIds) {
    const langCache = cache[language] || {}
    if (langCache[id] !== undefined) {
      result.set(id, langCache[id])
    } else {
      toFetch.push(id)
    }
  }
  
  if (toFetch.length === 0) return result

  const languageValue = DUB_LANGUAGE_MAP[language] || 'Portuguese'

  await Promise.all(toFetch.map(async (id) => {
    try {
      const res = await fetch(\`\${KITSU_API}/castings?filter[media_id]=\${id}&filter[media_type]=Anime&filter[language]=\${languageValue}&include=person&page[limit]=5\`, {
        headers: KITSU_HEADERS
      })
      if (!res.ok) return
      
      const data = await res.json()
      const hasDub = data.data && data.data.length > 0
      result.set(id, hasDub)
      
      if (!cache[language]) cache[language] = {}
      cache[language][id] = hasDub
      
    } catch (e) {
      // Ignora falhas de dublagem individuais
    }
  }))
  
  try {
    localStorage.setItem(KITSU_CACHE_KEY_DUB, JSON.stringify({
      timestamp: Date.now(),
      data: cache
    }))
  } catch(e) {}

  return result
}`;

kitsuContent = kitsuContent.replace(oldDubInfo, newDubInfo);

fs.writeFileSync('src/api/providers/kitsu.js', kitsuContent, 'utf8');

console.log('Update kitsu.js finished');