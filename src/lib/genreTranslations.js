export const GENRE_MAP_PT = {
  Action: 'Ação',
  Adventure: 'Aventura',
  'Avant Garde': 'Vanguarda',
  'Award Winning': 'Premiado',
  'Boys Love': 'Boys Love',
  Comedy: 'Comédia',
  Drama: 'Drama',
  Ecchi: 'Ecchi',
  Fantasy: 'Fantasia',
  'Gag Humor': 'Comédia Pastelão',
  GagHumor: 'Comédia Pastelão',
  'Girls Love': 'Girls Love',
  Gourmet: 'Culinária',
  Hentai: 'Hentai',
  Historical: 'Histórico',
  Horror: 'Terror',
  Isekai: 'Isekai',
  Josei: 'Josei',
  'Mahou Shoujo': 'Garotas Mágicas',
  MahouShoujo: 'Garotas Mágicas',
  Mecha: 'Mecha',
  Military: 'Militar',
  Music: 'Música',
  Mystery: 'Mistério',
  Mythology: 'Mitologia',
  'Otaku Culture': 'Cultura Otaku',
  Parody: 'Paródia',
  Police: 'Policial',
  Psychological: 'Psicológico',
  Romance: 'Romance',
  Samurai: 'Samurai',
  School: 'Escolar',
  'Sci-Fi': 'Sci-Fi',
  SciFi: 'Sci-Fi',
  Seinen: 'Seinen',
  Shoujo: 'Shoujo',
  Shounen: 'Shounen',
  'Slice of Life': 'Slice of Life',
  SliceOfLife: 'Slice of Life',
  Space: 'Espacial',
  Sports: 'Esportes',
  'Super Power': 'Superpoderes',
  SuperPower: 'Superpoderes',
  Supernatural: 'Sobrenatural',
  Survival: 'Sobrevivência',
  Suspense: 'Suspense',
  Thriller: 'Suspense',
  'Time Travel': 'Viagem no Tempo',
  'Urban Fantasy': 'Fantasia Urbana',
  Vampire: 'Vampiro',
  Workplace: 'Ambiente de Trabalho',
}

/**
 * Traduz nome de gênero para o idioma ativo (com fallback seguro).
 * @param {string} genre
 * @param {Function} [t]
 * @returns {string}
 */
export function translateGenre(genre, t) {
  if (!genre || typeof genre !== 'string') return ''
  if (t) {
    const fromI18n = t(`genres.${genre}`, { defaultValue: '' })
    if (fromI18n && fromI18n !== `genres.${genre}`) return fromI18n
  }
  return GENRE_MAP_PT[genre] || genre
}
