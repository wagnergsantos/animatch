const query = `
query {
  Media(id: 113415) {
    id
    title { english }
    externalLinks {
      site
      url
      type
      language
    }
  }
}`;

fetch('https://graphql.anilist.co', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)));
