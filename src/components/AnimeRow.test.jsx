import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AnimeRow from './AnimeRow.jsx'

describe('AnimeRow', () => {
  const mockAnime = {
    id: 101,
    title: 'Steins;Gate',
    year: 2011,
    episodes: 24,
    status: 'FINISHED',
    predictedScore: 9.25,
    communityScore: 8.9,
    description: 'A scientist discovers time travel through a microwave.',
    coverImage: 'sg.jpg',
    siteUrl: 'https://anilist.co/anime/101',
    provider: 'anilist',
    badges: ['STRONG_CONSENSUS'],
    topContributingGenres: [{ genre: 'Sci-Fi', score: 9.5 }],
    anchorAnimes: [{ id: 1, title: 'Steins;Gate' }],
    streamingLinks: [{ site: 'Crunchyroll', url: 'https://crunchyroll.com/steinsgate' }],
  }

  it('renders compact row with title, year, scores and synthesis', () => {
    render(<AnimeRow anime={mockAnime} />)

    expect(screen.getByText('Steins;Gate')).toBeInTheDocument()
    expect(screen.getByText(/2011 • 24 eps • Concluído/i)).toBeInTheDocument()
    expect(screen.getByText('Match: 9.25/10')).toBeInTheDocument()
    expect(screen.getByText('Comunidade: 8.90/10')).toBeInTheDocument()
    expect(screen.getByText(/Porque você amou Steins;Gate/i)).toBeInTheDocument()
    // Accordion details should not be in document initially
    expect(screen.queryByText(/A scientist discovers time travel/i)).not.toBeInTheDocument()
  })

  it('toggles expansion panel on row click or chevron button', () => {
    render(<AnimeRow anime={mockAnime} />)

    const toggleBtn = screen.getByRole('button', { name: /expandir detalhes/i })
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false')

    // Click to expand
    fireEvent.click(toggleBtn)
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText(/A scientist discovers time travel/i)).toBeInTheDocument()
    expect(screen.getByText(/Por que esse anime\?/i)).toBeInTheDocument()
    expect(screen.getByText(/Crunchyroll/i)).toBeInTheDocument()

    // Click to collapse
    fireEvent.click(toggleBtn)
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText(/A scientist discovers time travel/i)).not.toBeInTheDocument()
  })

  it('supports keyboard expansion (Enter key on header)', () => {
    render(<AnimeRow anime={mockAnime} />)

    const header = screen.getByRole('region', { name: /Steins;Gate/i })
    fireEvent.keyDown(header, { key: 'Enter' })
    expect(screen.getByText(/A scientist discovers time travel/i)).toBeInTheDocument()
  })

  it('opens external provider link without toggling accordion', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {})
    render(<AnimeRow anime={mockAnime} />)

    const quickBtn = screen.getByRole('button', { name: /Abrir no AniList/i })
    fireEvent.click(quickBtn)
    expect(openSpy).toHaveBeenCalledWith('https://anilist.co/anime/101', '_blank', 'noopener,noreferrer')
    expect(screen.queryByText(/A scientist discovers time travel/i)).not.toBeInTheDocument()

    openSpy.mockRestore()
  })
})
