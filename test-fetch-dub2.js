const DUB_QUERY = `
query ($idIn: [Int]) {
  Page(page: 1, perPage: 50) {
    media(id_in: $idIn) {
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
}
`
fetch('https://graphql.anilist.co', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: DUB_QUERY, variables: { idIn: [154587] } })
}).then(r => r.json()).then(d => {
  const chars = d.data.Page.media[0].characters.edges;
  const hasPtBr = chars.some(char => char?.voiceActors && char.voiceActors.length > 0);
  console.log("hasPtBr:", hasPtBr);
  console.log(JSON.stringify(d.data.Page.media[0], null, 2));
});
