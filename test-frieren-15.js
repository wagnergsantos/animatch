const query = `
query {
  Media(id: 154587) {
    characters(sort: ROLE, perPage: 15) {
      edges {
        node { name { full } }
        voiceActors(language: PORTUGUESE) {
          languageV2
        }
      }
    }
  }
}`;

fetch('https://graphql.anilist.co', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)));
