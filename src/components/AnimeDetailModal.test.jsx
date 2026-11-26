import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AnimeDetailModal from './AnimeDetailModal.jsx'

describe('AnimeDetailModal synopsis sanitization & labeling', () => {
  const baseAnime = {
    id: 101,
    title: 'Gintama',
    predictedScore: 8.5,
    communityScore: 8.9,
    description: '> The Amanto, aliens from outer space, have invaded Earth.\n>\n> Gintoki Sakata works as an odd-jobs freelancer. (Source: Sentai Filmworks)',
    genres: ['Action', 'Comedy'],
  }

  it('labels english synopsis as "Sinopse (em inglês)" when locale is pt-BR and renders source credit', () => {
    render(<AnimeDetailModal anime={baseAnime} onClose={vi.fn()} />)

    // O título deve ser "Sinopse (em inglês)" para textos em inglês no locale padrão pt-BR
    expect(screen.getByRole('heading', { name: /sinopse \(em inglês\)/i })).toBeInTheDocument()

    // O texto limpo não deve conter marcadores ">"
    expect(screen.getByText(/the amanto, aliens from outer space/i)).toBeInTheDocument()
    expect(screen.queryByText(/^>/)).not.toBeInTheDocument()

    // A fonte deve ser exibida separadamente
    expect(screen.getByText(/Fonte: Sentai Filmworks/i)).toBeInTheDocument()
  })

  it('renders fallback when no description is present', () => {
    const animeWithoutDesc = { ...baseAnime, description: '' }
    render(<AnimeDetailModal anime={animeWithoutDesc} onClose={vi.fn()} />)

    expect(screen.getByText(/sem descrição disponível/i)).toBeInTheDocument()
  })

  it('filters regional blocked streaming platforms and highlights subscribed services', () => {
    const animeWithStreams = {
      ...baseAnime,
      streamingLinks: [
        { site: 'YouTube', url: 'https://youtube.com/watch' },
        { site: 'Hulu', url: 'https://hulu.com/watch' },
        { site: 'Netflix', url: 'https://netflix.com/title/123' },
        { site: 'Crunchyroll', url: 'https://crunchyroll.com/series/abc' },
      ],
    }

    render(
      <AnimeDetailModal
        anime={animeWithStreams}
        subscriptions={['Crunchyroll']}
        onClose={vi.fn()}
      />
    )

    // Hulu e YouTube devem ser filtrados na região BR
    expect(screen.queryByText(/Hulu/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/YouTube/i)).not.toBeInTheDocument()

    // Crunchyroll e Netflix devem ser exibidos
    expect(screen.getByText(/Crunchyroll/i)).toBeInTheDocument()
    expect(screen.getByText(/Netflix/i)).toBeInTheDocument()

    // Crunchyroll é a assinatura do usuário e deve ter o badge
    expect(screen.getByText(/Na sua assinatura/i)).toBeInTheDocument()
  })

  it('renders modal cover fallback when image fails completely', () => {
    const anime = {
      ...baseAnime,
      coverImage: 'https://broken.cdn/modal.jpg',
    }

    render(<AnimeDetailModal anime={anime} onClose={vi.fn()} />)
    const img = screen.getByRole('img', { name: /Gintama/i })

    // Tier 1 -> Tier 3
    fireEvent.error(img)
    // Tier 3 -> Tier 4
    fireEvent.error(img)

    expect(screen.getByTestId('modal-cover-fallback')).toBeInTheDocument()
    expect(screen.getByTestId('modal-cover-fallback')).toHaveTextContent('Gintama')
  })
})
