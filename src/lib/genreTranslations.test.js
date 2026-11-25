import { describe, it, expect } from 'vitest'
import { translateGenre } from './genreTranslations.js'

describe('genreTranslations', () => {
  it('translates common anime genres to Portuguese', () => {
    expect(translateGenre('Action')).toBe('Ação')
    expect(translateGenre('Adventure')).toBe('Aventura')
    expect(translateGenre('Comedy')).toBe('Comédia')
    expect(translateGenre('Drama')).toBe('Drama')
    expect(translateGenre('Fantasy')).toBe('Fantasia')
    expect(translateGenre('Sci-Fi')).toBe('Sci-Fi')
    expect(translateGenre('Slice of Life')).toBe('Slice of Life')
    expect(translateGenre('Mystery')).toBe('Mistério')
    expect(translateGenre('Psychological')).toBe('Psicológico')
    expect(translateGenre('Thriller')).toBe('Suspense')
    expect(translateGenre('Gag Humor')).toBe('Comédia Pastelão')
    expect(translateGenre('Survival')).toBe('Sobrevivência')
  })

  it('translates correctly when t represents english or japanese locale', () => {
    const tEn = (key) => {
      const map = {
        'genres.Supernatural': 'Supernatural',
        'genres.Psychological': 'Psychological',
        'genres.Mystery': 'Mystery',
      }
      return map[key] || key
    }
    expect(translateGenre('Supernatural', tEn)).toBe('Supernatural')
    expect(translateGenre('Psychological', tEn)).toBe('Psychological')

    const tJa = (key) => {
      const map = {
        'genres.Ecchi': 'エッチ',
        'genres.Mecha': 'メカ',
        'genres.Horror': 'ホラー',
      }
      return map[key] || key
    }
    expect(translateGenre('Ecchi', tJa)).toBe('エッチ')
    expect(translateGenre('Mecha', tJa)).toBe('メカ')
    expect(translateGenre('Horror', tJa)).toBe('ホラー')
  })

  it('falls back to original genre name if not mapped', () => {
    expect(translateGenre('UnknownGenre')).toBe('UnknownGenre')
    expect(translateGenre('')).toBe('')
    expect(translateGenre(null)).toBe('')
  })

  it('uses t translation function when provided and available', () => {
    const mockT = (key) => (key === 'genres.Custom' ? 'Personalizado' : key)
    expect(translateGenre('Custom', mockT)).toBe('Personalizado')
  })
})
