import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import RecommendationReason from './RecommendationReason.jsx'

describe('RecommendationReason', () => {
  it('renders community fallback reason when predictionSource is community', () => {
    const anime = {
      predictionSource: 'community',
      topContributingGenres: [],
      anchorAnimes: [],
      communityScore: 8.5,
    }

    render(<RecommendationReason anime={anime} />)
    expect(screen.getAllByText(/comunidade/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Sem histórico suficiente/i)).toBeInTheDocument()
  })

  it('renders consolidated taste breakdown with weights, genres, and anchor animes', () => {
    const anime = {
      predictionSource: 'taste',
      baseTasteScore: 9.1,
      communityScore: 8.0,
      matchingGenres: [
        { genre: 'Sci-Fi', score: 9.5 },
        { genre: 'Drama', score: 8.7 },
      ],
      topContributingGenres: [
        { genre: 'Sci-Fi', score: 9.5 },
        { genre: 'Drama', score: 8.7 },
      ],
      anchorAnimes: [
        { id: 1, title: 'Steins;Gate', score: 10, coverImage: 'sg.jpg' },
        { id: 2, title: 'Monster', score: 9, coverImage: 'm.jpg' },
      ],
    }

    render(<RecommendationReason anime={anime} />)
    expect(screen.getByText(/Por que esse anime\?/i)).toBeInTheDocument()
    expect(screen.getAllByText(/Steins;Gate/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Monster/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Seu Gosto \(85%\): 9.10/i)).toBeInTheDocument()
    expect(screen.getByText(/Comunidade \(15%\): 8.00/i)).toBeInTheDocument()
    expect(screen.getByText(/Sci-Fi:/i)).toBeInTheDocument()
    expect(screen.getByText(/9.50/i)).toBeInTheDocument()
    expect(screen.getByText(/Drama:/i)).toBeInTheDocument()
    expect(screen.getByText(/8.70/i)).toBeInTheDocument()
  })
})
