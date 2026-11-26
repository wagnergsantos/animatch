import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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

  it('renders AnimeRow components when viewMode is list', () => {
    const mockRecs = [
      { id: 1, title: 'List Anime 1', predictedScore: 8.5, communityScore: 8.0, coverImage: '' },
      { id: 2, title: 'List Anime 2', predictedScore: 9.0, communityScore: 8.8, coverImage: '' },
    ]
    render(<RecommendationGrid isLoading={false} recommendations={mockRecs} viewMode="list" />)
    const rows = screen.getAllByTestId('anime-row')
    expect(rows).toHaveLength(2)
  })

  it('announces filtered recommendations count in aria-live region (WCAG B4)', () => {
    const mockRecs = [
      { id: 1, title: 'Anime 1', predictedScore: 8.5, coverImage: '' },
      { id: 2, title: 'Anime 2', predictedScore: 9.0, coverImage: '' },
    ]
    const { container, rerender } = render(<RecommendationGrid isLoading={false} recommendations={mockRecs} />)
    const liveRegion = container.querySelector('[aria-live="polite"]')
    expect(liveRegion).toBeInTheDocument()
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
    expect(liveRegion).toHaveTextContent('2 recomendações encontradas')

    rerender(<RecommendationGrid isLoading={false} recommendations={mockRecs} isLoadingMore={true} />)
    expect(liveRegion).toHaveTextContent('Atualizando recomendações...')
  })

  it('renders load more button when items exceed initialBatchSize and reveals more on click', () => {
    const mockRecs = Array.from({ length: 30 }, (_, i) => ({
      id: i + 1,
      title: `Anime #${i.toString().padStart(3, '0')} Unique`,
      predictedScore: 8.0,
      communityScore: 7.5,
    }))
    render(<RecommendationGrid isLoading={false} recommendations={mockRecs} initialBatchSize={24} />)

    const loadMoreBtn = screen.getByTestId('load-more-btn')
    expect(loadMoreBtn).toBeInTheDocument()
    expect(loadMoreBtn).toHaveTextContent(/Carregar mais animes/i)

    // Inicialmente mostra 24 cards
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(24)

    // Clica para carregar o restante
    fireEvent.click(loadMoreBtn)
    expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(30)
    expect(screen.queryByTestId('load-more-btn')).not.toBeInTheDocument()
  })

  describe('franchise grouping', () => {
    const franchiseRecs = [
      { id: 101, title: 'Made in Abyss', predictedScore: 8.8, communityScore: 8.5 },
      { id: 102, title: 'Steins;Gate', predictedScore: 8.7, communityScore: 9.0 },
      { id: 103, title: 'Made in Abyss: Golden City of the Scorching Sun', predictedScore: 8.4, communityScore: 8.6 },
    ]

    it('groups franchise sequels under the root entry and toggles expansion inline', () => {
      render(<RecommendationGrid isLoading={false} recommendations={franchiseRecs} sortBy="predicted" />)

      // Inicialmente, apenas Made in Abyss e Steins;Gate estão no nível raiz
      const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
      expect(headings).toEqual(['Made in Abyss', 'Steins;Gate'])

      // O card de Made in Abyss deve exibir o pill de franquia "+1 na franquia"
      const toggleBtn = screen.getByTestId('franchise-toggle-btn')
      expect(toggleBtn).toBeInTheDocument()
      expect(toggleBtn).toHaveTextContent(/\+1 na franquia/i)

      // Clicar no botão expande a sequência inline
      fireEvent.click(toggleBtn)
      const expandedHeadings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
      expect(expandedHeadings).toEqual([
        'Made in Abyss',
        'Made in Abyss: Golden City of the Scorching Sun',
        'Steins;Gate',
      ])
      expect(toggleBtn).toHaveTextContent(/Ocultar 1 da franquia/i)

      // Clicar novamente recolhe
      fireEvent.click(toggleBtn)
      const collapsedHeadings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
      expect(collapsedHeadings).toEqual(['Made in Abyss', 'Steins;Gate'])
    })

    it('disables franchise grouping when isFiltered is true', () => {
      render(
        <RecommendationGrid
          isLoading={false}
          recommendations={franchiseRecs}
          sortBy="predicted"
          isFiltered={true}
        />
      )

      const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
      expect(headings).toHaveLength(3)
      expect(screen.queryByTestId('franchise-toggle-btn')).not.toBeInTheDocument()
    })

    it('disables franchise grouping when sortBy is manual (e.g. community)', () => {
      render(
        <RecommendationGrid
          isLoading={false}
          recommendations={franchiseRecs}
          sortBy="community"
        />
      )

      const headings = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
      expect(headings).toHaveLength(3)
      expect(screen.queryByTestId('franchise-toggle-btn')).not.toBeInTheDocument()
    })
  })
})




