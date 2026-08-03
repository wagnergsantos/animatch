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

  it('shows the PT-BR badge by default when hasDub is true and no dubLanguage is passed', () => {
    const anime = { title: 'Dubbed Anime' }
    render(<AnimeCard anime={anime} hasDub={true} />)
    expect(screen.getByText('🎙️ Dublado PT-BR')).toBeInTheDocument()
  })

  it('shows the badge with the label matching the given dubLanguage', () => {
    const anime = { title: 'Dubbed Anime' }
    render(<AnimeCard anime={anime} hasDub={true} dubLanguage="ja" />)
    expect(screen.getByText('🎙️ Dublado Japonês')).toBeInTheDocument()
  })

  it('does not show the dub badge when hasDub is false', () => {
    const anime = { title: 'Not Dubbed Anime' }
    render(<AnimeCard anime={anime} hasDub={false} dubLanguage="en" />)
    expect(screen.queryByText(/Dublado/)).not.toBeInTheDocument()
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
    expect(quickBtn).toHaveTextContent('🔗 Kitsu ↗')
  })
})
