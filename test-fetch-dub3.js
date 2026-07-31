const DUB_QUERY = `
query ($id: Int) {
  Media(id: $id) {
    id
    characters(sort: ROLE, perPage: 15) {
      edges {
        voiceActors(language: PORTUGUESE) {
          id
        }
      }
    }
  }
}
`
fetch('https://graphql.anilist.co', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: DUB_QUERY, variables: { id: 154587 } })
}).then(r => r.json()).then(d => {
  console.log(JSON.stringify(d, null, 2));
});
