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

  it('has keyboard accessibility attributes and triggers link on keyboard activation (Enter key)', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => {})
    const anime = {
      id: 123,
      title: 'Keyboard Test Anime',
    }
    render(<AnimeCard anime={anime} />)
    const card = screen.getByRole('link', { name: /Keyboard Test Anime/i })
    expect(card).toHaveAttribute('tabindex', '0')

    fireEvent.keyDown(card, { key: 'Enter' })
    expect(openSpy).toHaveBeenLastCalledWith('https://anilist.co/anime/123', '_blank', 'noopener,noreferrer')

    fireEvent.keyDown(card, { key: ' ' })
    expect(openSpy).toHaveBeenLastCalledWith('https://anilist.co/anime/123', '_blank', 'noopener,noreferrer')

    openSpy.mockRestore()
  })
})
