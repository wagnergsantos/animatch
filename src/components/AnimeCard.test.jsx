import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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

  it('uses title attribute with only title instead of long description', () => {
    const anime = {
      title: 'Short Title',
      description: 'This is a very long wall of text description',
    }
    const { container } = render(<AnimeCard anime={anime} />)
    const article = container.querySelector('article')
    expect(article).toHaveAttribute('title', 'Short Title')
  })
})
