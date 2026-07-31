import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import RecommendationGrid from './RecommendationGrid.jsx'

vi.mock('../api/anilist.js', () => ({
  fetchDubInfo: vi.fn().mockResolvedValue(new Map()),
}))

describe('RecommendationGrid', () => {
  it('renders loading state correctly when isLoading is true', () => {
    render(<RecommendationGrid isLoading={true} recommendations={[]} />)
    expect(screen.getByText('Calculando suas Recomendações...')).toBeInTheDocument()
  })

  it('renders empty state when recommendations array is empty', () => {
    render(<RecommendationGrid isLoading={false} recommendations={[]} />)
    expect(screen.getByText('Sem recomendações no momento')).toBeInTheDocument()
  })

  it('handles null/undefined recommendations gracefully without throwing hook errors', () => {
    render(<RecommendationGrid isLoading={false} recommendations={null} />)
    expect(screen.getByText('Sem recomendações no momento')).toBeInTheDocument()
  })

  it('renders recommendations grid when items are provided', () => {
    const mockRecs = [
      { id: 1, title: 'Anime 1', predictedScore: 8.5, communityScore: 8.0, coverImage: '' },
      { id: 2, title: 'Anime 2', predictedScore: 9.0, communityScore: 8.8, coverImage: '' },
    ]
    render(<RecommendationGrid isLoading={false} recommendations={mockRecs} />)
    expect(screen.getByText(/Recomendações — O Que Assistir Agora/)).toBeInTheDocument()
    expect(screen.getByText('Anime 1')).toBeInTheDocument()
    expect(screen.getByText('Anime 2')).toBeInTheDocument()
  })

  it('allows state transitions from loading to empty without hook violations', () => {
    const { rerender } = render(<RecommendationGrid isLoading={true} recommendations={[]} />)
    expect(screen.getByText('Calculando suas Recomendações...')).toBeInTheDocument()

    rerender(<RecommendationGrid isLoading={false} recommendations={[]} />)
    expect(screen.getByText('Sem recomendações no momento')).toBeInTheDocument()
  })
})
