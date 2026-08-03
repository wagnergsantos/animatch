const fs = require('fs');
let testContent = fs.readFileSync('src/api/providers/kitsu.test.js', 'utf8');

const replacement = `  it('returns dub info and caches it', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: '1' }] })
    })

    const result = await kitsuFetchDubInfo([999], 'pt-br')
    
    // VERIFY EXACT URL
    expect(mockFetch).toHaveBeenCalledWith(
      'https://kitsu.io/api/edge/castings?filter[media_id]=999&filter[media_type]=Anime&filter[language]=Portuguese&include=person&page[limit]=5',
      expect.anything()
    )
    
    expect(result.get(999)).toBe(true)
    
    const cached = JSON.parse(localStorage.getItem(KITSU_CACHE_KEY_DUB))
    expect(cached.data['pt-br']['999']).toBe(true)
  })`;

testContent = testContent.replace(
  /it\('returns dub info and caches it', async \(\) => \{[\s\S]*?expect\(cached\.data\['pt-br'\]\['999'\]\)\.toBe\(true\)\n  \}\)/,
  replacement
);

fs.writeFileSync('src/api/providers/kitsu.test.js', testContent, 'utf8');
console.log('Update kitsu.test.js finished');