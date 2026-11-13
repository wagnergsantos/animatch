import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AnimeCard from './AnimeCard.jsx'

describe('AnimeCard', () => {
  it('renders scores when scores are non-zero numbers', () => {
    const anime = {
      title: 'Test Anime',
      predictedScore: 8.5,
      communityScore: 7.5,
      description: 'Long description text',
    }
    render(<AnimeCard anime={anime} />)
    expect(screen.getByText('Match: 8.50/10')).toBeInTheDocument()
    expect(screen.getByText('Comunidade: 7.50/10')).toBeInTheDocument()
  })

  it('renders scores correctly when predictedScore or communityScore is 0', () => {
    const anime = {
      title: 'Zero Score Anime',
      predictedScore: 0,
      communityScore: 0,
    }
    render(<AnimeCard anime={anime} />)
    expect(screen.getByText('Match: 0.00/10')).toBeInTheDocument()
    expect(screen.getByText('Comunidade: 0.00/10')).toBeInTheDocument()
  })

  it('does not render score paragraphs when predictedScore or communityScore is null/undefined', () => {
    const anime = {
      title: 'No Score Anime',
      predictedScore: null,
      communityScore: undefined,
    }
    render(<AnimeCard anime={anime} />)
    expect(screen.queryByText(/Match:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Comunidade:/)).not.toBeInTheDocument()
  })

  it('does not render score paragraphs when scores are NaN or invalid types', () => {
    const anime = {
      title: 'Invalid Score Anime',
      predictedScore: NaN,
      communityScore: '7.5',
    }
    render(<AnimeCard anime={anime} />)
    expect(screen.queryByText(/Match:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Comunidade:/)).not.toBeInTheDocument()
  })

  it('uses title attribute with only title instead of long description', () => {
    const anime = {
      title: 'Short Title',
      description: 'This is a very long wall of text description',
    }
    const { container } = render(<AnimeCard anime={anime} />)
    const article = container.querySelector('article')
    expect(article).toHaveAttribute('title', 'Short Title')
  })

  it('has keyboard accessibility attributes and triggers card activation (Enter key)', () => {
    const anime = {
      id: 123,
      title: 'Keyboard Test Anime',
      description: 'Test description',
    }
    render(<AnimeCard anime={anime} />)
    const card = screen.getByRole('link', { name: /Keyboard Test Anime/i })
    expect(card).toHaveAttribute('tabindex', '0')

    fireEvent.keyDown(card, { key: 'Enter' })
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })



  it('renders metadata row (year, episodes, status) correctly', () => {
    const anime = {
      title: 'Meta Test Anime',
      year: 2024,
      episodes: 12,
      status: 'RELEASING',
    }
    render(<AnimeCard anime={anime} />)
    expect(screen.getByText('2024 • 12 eps • Em exibição')).toBeInTheDocument()
  })

  it('opens modal on card click and allows opening AniList directly via button', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {})
    const anime = {
      id: 456,
      title: 'Modal Anime',
      description: 'Modal synopsis test',
      siteUrl: 'https://anilist.co/anime/456',
    }
    render(<AnimeCard anime={anime} />)

    // Click card to open modal
    fireEvent.click(screen.getByText('Modal Anime'))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText('Modal synopsis test')).toBeInTheDocument()

    // Click direct AniList quick button
    const quickBtn = screen.getByRole('button', { name: /Abrir no AniList/i })
    fireEvent.click(quickBtn)
    expect(openSpy).toHaveBeenCalledWith('https://anilist.co/anime/456', '_blank', 'noopener,noreferrer')

    openSpy.mockRestore()
  })

  it('renders quick button correctly for kitsu provider', () => {
    const anime = {
      id: 789,
      title: 'Kitsu Anime',
      provider: 'kitsu',
      siteUrl: 'https://kitsu.io/anime/789',
    }
    render(<AnimeCard anime={anime} />)
    const quickBtn = screen.getByRole('button', { name: /Abrir no Kitsu/i })
    expect(quickBtn).toBeInTheDocument()
    expect(quickBtn).toHaveTextContent(/Kitsu/i)
  })

  it('renders anchor anime reason synthesis when anchorAnimes are available', () => {
    const anime = {
      title: 'Steins;Gate 0',
      predictionSource: 'taste',
      anchorAnimes: [{ id: 1, title: 'Steins;Gate' }],
    }
    render(<AnimeCard anime={anime} />)
    expect(screen.getByText(/Porque você amou Steins;Gate/i)).toBeInTheDocument()
  })

  it('renders taste genres reason synthesis when only topContributingGenres are available', () => {
    const anime = {
      title: 'Cyberpunk Anime',
      predictionSource: 'taste',
      topContributingGenres: [{ genre: 'Sci-Fi' }, { genre: 'Action' }],
    }
    render(<AnimeCard anime={anime} />)
    expect(screen.getByText(/Combina com seu gosto por Sci-Fi, Action/i)).toBeInTheDocument()
  })

  it('renders community fallback reason when predictionSource is community', () => {
    const anime = {
      title: 'Random Popular Anime',
      predictionSource: 'community',
    }
    render(<AnimeCard anime={anime} />)
    expect(screen.getByText(/Destaque da comunidade/i)).toBeInTheDocument()
  })

  it('renders provider badges when planningProviders has multiple services', () => {
    const anime = {
      id: 1,
      title: 'Frieren',
      planningProviders: ['anilist', 'mal'],
      presenceMultiplier: 1.05,
      badges: [],
    }

    render(<AnimeCard anime={anime} />)
    expect(screen.getByText('AniList')).toBeInTheDocument()
    expect(screen.getByText('MAL')).toBeInTheDocument()

    const badgeContainer = screen.getByTestId('card-provider-badges')
    expect(badgeContainer).toBeInTheDocument()
    expect(badgeContainer).toHaveAttribute(
      'title',
      'Presente no seu Planning em: AniList, MyAnimeList (+5% de afinidade)'
    )
  })

  it('does not render provider badges when planningProviders has only 1 service or none', () => {
    const animeSingle = {
      id: 2,
      title: 'Solo Provider Anime',
      planningProviders: ['anilist'],
      badges: [],
    }
    const { rerender } = render(<AnimeCard anime={animeSingle} />)
    expect(screen.queryByTestId('card-provider-badges')).not.toBeInTheDocument()

    const animeNone = {
      id: 3,
      title: 'No Provider Anime',
      badges: [],
    }
    rerender(<AnimeCard anime={animeNone} />)
    expect(screen.queryByTestId('card-provider-badges')).not.toBeInTheDocument()
  })

  it('renders badges for three providers with 10% boost', () => {
    const anime = {
      id: 4,
      title: 'Dungeon Meshi',
      planningProviders: ['anilist', 'kitsu', 'mal'],
      presenceMultiplier: 1.10,
    }

    render(<AnimeCard anime={anime} />)
    expect(screen.getByText('AniList')).toBeInTheDocument()
    expect(screen.getByText('Kitsu')).toBeInTheDocument()
    expect(screen.getByText('MAL')).toBeInTheDocument()

    const badgeContainer = screen.getByTestId('card-provider-badges')
    expect(badgeContainer).toHaveAttribute(
      'title',
      'Presente no seu Planning em: AniList, Kitsu, MyAnimeList (+10% de afinidade)'
    )
  })

  it('renders multi-presence info in detail modal when card is opened', () => {
    const anime = {
      id: 5,
      title: 'Apothecary Diaries',
      description: 'Modal presence test',
      planningProviders: ['anilist', 'mal'],
      presenceMultiplier: 1.05,
    }

    render(<AnimeCard anime={anime} />)
    fireEvent.click(screen.getByText('Apothecary Diaries'))

    const modal = screen.getByRole('dialog')
    expect(modal).toBeInTheDocument()

    const modalBadges = screen.getByTestId('modal-provider-badges')
    expect(modalBadges).toBeInTheDocument()
    expect(modalBadges).toHaveAttribute(
      'title',
      'Presente no seu Planning em: AniList, MyAnimeList (+5% de afinidade)'
    )
    expect(screen.getByText('+5%')).toBeInTheDocument()
  })

  it('renders DISCOVERY floating badge on taste and community predictions', () => {
    const anime = {
      id: 99,
      title: 'Discovery Anime',
      predictionSource: 'community',
      badges: ['DISCOVERY'],
    }

    render(<AnimeCard anime={anime} />)
    expect(screen.getByTitle('🧭 Fora da Zona')).toBeInTheDocument()
  })

  it('blocks unsafe javascript: URLs in provider quick-link and modal streaming links', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    const unsafeAnime = {
      id: 77,
      title: 'Unsafe Links Anime',
      provider: 'anilist',
      siteUrl: 'javascript:alert(1)',
      providerUrls: { anilist: 'javascript:alert(2)' },
      streamingLinks: [
        { site: 'Crunchyroll', url: 'javascript:alert(3)' },
        { site: 'Netflix', url: 'https://www.netflix.com/title/77' },
      ],
    }

    render(<AnimeCard anime={unsafeAnime} />)
    const quickLinkBtn = screen.getByTestId('anime-card-quick-link')
    fireEvent.click(quickLinkBtn)
    expect(openSpy).not.toHaveBeenCalledWith(expect.stringMatching(/^javascript:/i), expect.anything(), expect.anything())

    // Open modal and check streaming links
    fireEvent.click(screen.getByRole('link'))
    expect(screen.queryByRole('link', { name: /Crunchyroll/i })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Netflix/i })).toHaveAttribute('href', 'https://www.netflix.com/title/77')
    openSpy.mockRestore()
  })

  it('renders image with priority attributes when priority=true', () => {
    const anime = {
      title: 'Priority Anime',
      coverImage: 'https://s4.anilist.co/cover.jpg',
    }
    render(<AnimeCard anime={anime} priority />)
    const img = screen.getByRole('img', { name: /Priority Anime/i })
    expect(img).toHaveAttribute('loading', 'eager')
    expect(img).toHaveAttribute('fetchpriority', 'high')
    expect(img).toHaveAttribute('decoding', 'async')
    expect(img).toHaveAttribute('width', '230')
    expect(img).toHaveAttribute('height', '325')
  })

  it('renders image with lazy loading when priority is false', () => {
    const anime = {
      title: 'Non Priority Anime',
      coverImage: 'https://s4.anilist.co/cover2.jpg',
    }
    render(<AnimeCard anime={anime} priority={false} />)
    const img = screen.getByRole('img', { name: /Non Priority Anime/i })
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img).toHaveAttribute('fetchpriority', 'auto')
    expect(img).toHaveAttribute('decoding', 'async')
  })

  it('renders top match badge and data-score-tier when scoreTier="excellent"', () => {
    const anime = {
      title: 'Top Tier Anime',
      predictedScore: 9.2,
      scoreTier: 'excellent',
    }
    const { container } = render(<AnimeCard anime={anime} />)
    const article = container.querySelector('article')
    expect(article).toHaveAttribute('data-score-tier', 'excellent')
    expect(screen.getByTestId('top-match-badge')).toBeInTheDocument()
    expect(screen.getByTestId('top-match-badge')).toHaveTextContent(/Top Match/i)
  })

  it('does not render top match badge when scoreTier is not excellent', () => {
    const anime = {
      title: 'Normal Anime',
      predictedScore: 7.2,
    }
    const { container } = render(<AnimeCard anime={anime} />)
    const article = container.querySelector('article')
    expect(article).not.toHaveAttribute('data-score-tier')
    expect(screen.queryByTestId('top-match-badge')).not.toBeInTheDocument()
  })
})



