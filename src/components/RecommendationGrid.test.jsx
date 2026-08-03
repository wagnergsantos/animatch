import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import RecommendationGrid from './RecommendationGrid.jsx'
import { fetchDubInfo } from '../api/index.js'

vi.mock('../api/index.js', () => ({
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

  describe('favorite dub integration', () => {
    beforeEach(() => {
      fetchDubInfo.mockClear()
      fetchDubInfo.mockResolvedValue(new Map())
    })

    it('does not call fetchDubInfo when favoriteDub is "nenhuma" (default)', async () => {
      const mockRecs = [{ id: 1, title: 'Anime 1', predictedScore: 8.5, communityScore: 8.0 }]
      render(<RecommendationGrid recommendations={mockRecs} />)
      await waitFor(() => {
        expect(screen.getByText('Anime 1')).toBeInTheDocument()
      })
      expect(fetchDubInfo).not.toHaveBeenCalled()
    })

    it('calls fetchDubInfo with the selected favorite language', async () => {
      const mockRecs = [{ id: 1, title: 'Anime 1', predictedScore: 8.5, communityScore: 8.0 }]
      render(<RecommendationGrid recommendations={mockRecs} favoriteDub="en" />)
      await waitFor(() => {
        expect(fetchDubInfo).toHaveBeenCalledWith([1], 'en')
      })
    })

    it('shows the dub badge with the correct language label when the anime has the favorite dub', async () => {
      fetchDubInfo.mockResolvedValueOnce(new Map([[1, true]]))
      const mockRecs = [{ id: 1, title: 'Anime 1', predictedScore: 8.5, communityScore: 8.0 }]
      render(<RecommendationGrid recommendations={mockRecs} favoriteDub="ja" />)
      await waitFor(() => {
        expect(screen.getByText('🎙️ Dublado Japonês')).toBeInTheDocument()
      })
    })

    it('shows the "somente com minha dublagem favorita" checkbox only when favoriteDub is set', async () => {
      const mockRecs = [{ id: 1, title: 'Anime 1', predictedScore: 8.5, communityScore: 8.0 }]
      const { rerender } = render(<RecommendationGrid recommendations={mockRecs} />)
      expect(screen.queryByLabelText(/somente com minha dublagem favorita/i)).not.toBeInTheDocument()

      rerender(<RecommendationGrid recommendations={mockRecs} favoriteDub="pt-br" />)
      await waitFor(() => {
        expect(screen.getByLabelText(/somente com minha dublagem favorita/i)).toBeInTheDocument()
      })
    })

    it('filters out non-dubbed recommendations when "somente com minha dublagem favorita" is checked', async () => {
      fetchDubInfo.mockResolvedValueOnce(new Map([[1, true], [2, false]]))
      const mockRecs = [
        { id: 1, title: 'Dubbed Anime', predictedScore: 8.5, communityScore: 8.0 },
        { id: 2, title: 'Not Dubbed Anime', predictedScore: 9.0, communityScore: 8.8 },
      ]
      render(<RecommendationGrid recommendations={mockRecs} favoriteDub="pt-br" />)

      await waitFor(() => {
        expect(screen.getByText('Not Dubbed Anime')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByLabelText(/somente com minha dublagem favorita/i))

      expect(screen.getByText('Dubbed Anime')).toBeInTheDocument()
      expect(screen.queryByText('Not Dubbed Anime')).not.toBeInTheDocument()
    })
  })
})

