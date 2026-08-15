import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import RecommendationGrid from './RecommendationGrid.jsx'

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

  describe('year sorting', () => {
    it('sorts by year_desc using top-level year field', () => {
      const mockRecs = [
        { id: 1, title: 'Older', predictedScore: 8.5, communityScore: 8.0, year: 2015 },
        { id: 2, title: 'Newer', predictedScore: 8.5, communityScore: 8.0, year: 2022 },
        { id: 3, title: 'Middle', predictedScore: 8.5, communityScore: 8.0, year: 2018 },
      ]
      render(<RecommendationGrid isLoading={false} recommendations={mockRecs} sortBy="year_desc" />)
      const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent)
      expect(titles).toEqual(['Newer', 'Middle', 'Older'])
    })

    it('sorts by year_asc using top-level year field', () => {
      const mockRecs = [
        { id: 1, title: 'Older', predictedScore: 8.5, communityScore: 8.0, year: 2015 },
        { id: 2, title: 'Newer', predictedScore: 8.5, communityScore: 8.0, year: 2022 },
        { id: 3, title: 'Middle', predictedScore: 8.5, communityScore: 8.0, year: 2018 },
      ]
      render(<RecommendationGrid isLoading={false} recommendations={mockRecs} sortBy="year_asc" />)
      const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent)
      expect(titles).toEqual(['Older', 'Middle', 'Newer'])
    })

    it('resolves year via fallback chain (seasonYear, startDate.year, media.*) when sorting', () => {
      const mockRecs = [
        { id: 1, title: 'ViaSeasonYear', predictedScore: 8.5, communityScore: 8.0, seasonYear: 2016 },
        { id: 2, title: 'ViaStartDate', predictedScore: 8.5, communityScore: 8.0, startDate: { year: 2023 } },
        { id: 3, title: 'ViaMediaYear', predictedScore: 8.5, communityScore: 8.0, media: { year: 2019 } },
      ]
      render(<RecommendationGrid isLoading={false} recommendations={mockRecs} sortBy="year_desc" />)
      const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent)
      expect(titles).toEqual(['ViaStartDate', 'ViaMediaYear', 'ViaSeasonYear'])
    })

    it('places items without a resolvable year at the end regardless of sort direction', () => {
      const mockRecs = [
        { id: 1, title: 'NoYear', predictedScore: 9.9, communityScore: 9.9 },
        { id: 2, title: 'HasYear', predictedScore: 8.5, communityScore: 8.0, year: 2020 },
      ]
      render(<RecommendationGrid isLoading={false} recommendations={mockRecs} sortBy="year_asc" />)
      const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent)
      expect(titles).toEqual(['HasYear', 'NoYear'])
    })
  })



