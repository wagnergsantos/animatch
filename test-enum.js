const query = `{ __type(name: "StaffLanguage") { enumValues { name } } }`;
fetch('https://graphql.anilist.co', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ query })
}).then(r => r.json()).then(d => console.log(d.data.__type.enumValues.map(e => e.name).join(', ')));
