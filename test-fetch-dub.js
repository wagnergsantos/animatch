import { fetchDubInfo } from './src/api/anilist.js';

fetchDubInfo([154587, 113415, 1]).then(map => {
  console.log("Result Map:");
  for (const [k, v] of map.entries()) {
    console.log(k, v);
  }
}).catch(console.error);
