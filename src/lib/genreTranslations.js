export const GENRE_MAP_PT = {
  Action: 'Ação',
  Adventure: 'Aventura',
  Comedy: 'Comédia',
  Drama: 'Drama',
  Ecchi: 'Ecchi',
  Fantasy: 'Fantasia',
  Hentai: 'Hentai',
  Horror: 'Terror',
  'Mahou Shoujo': 'Garotas Mágicas',
  Mecha: 'Mecha',
  Music: 'Música',
  Mystery: 'Mistério',
  Psychological: 'Psicológico',
  Romance: 'Romance',
  'Sci-Fi': 'Sci-Fi',
  SciFi: 'Sci-Fi',
  'Slice of Life': 'Slice of Life',
  SliceOfLife: 'Slice of Life',
  Sports: 'Esportes',
  Supernatural: 'Sobrenatural',
  Thriller: 'Suspense',
  Suspense: 'Suspense',
  'Award Winning': 'Premiado',
  'Boys Love': 'Boys Love',
  'Girls Love': 'Girls Love',
  Gourmet: 'Culinária',
  'Avant Garde': 'Vanguarda',
  Historical: 'Histórico',
  Military: 'Militar',
  Parody: 'Paródia',
  Police: 'Policial',
  Samurai: 'Samurai',
  School: 'Escolar',
  Space: 'Espacial',
  'Super Power': 'Superpoderes',
  Vampire: 'Vampiro',
}

/**
 * Traduz nome de gênero para o idioma ativo (padrão pt-BR)
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
