import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Dashboard from './Dashboard.jsx'

vi.mock('../api/anilist.js', () => ({
  fetchDubInfo: vi.fn().mockResolvedValue(new Map()),
}))

const mockEntries = [
  { status: 'COMPLETED', score: 9, media: { id: 1, title: { romaji: 'A', english: 'A' }, genres: ['Adventure', 'Fantasy'] } },
  { status: 'COMPLETED', score: 8, media: { id: 2, title: { romaji: 'B', english: 'B' }, genres: ['Adventure', 'Drama'] } },
  { status: 'COMPLETED', score: 5, media: { id: 3, title: { romaji: 'C', english: 'C' }, genres: ['Action'] } },
  { status: 'COMPLETED', score: 4, media: { id: 4, title: { romaji: 'D', english: 'D' }, genres: ['Action'] } },
  { status: 'PLANNING', media: { id: 10, title: { romaji: 'Made in Abyss', english: 'Made in Abyss' }, genres: ['Adventure'], averageScore: 84, siteUrl: 'https://anilist.co/anime/10' } },
  { status: 'PLANNING', media: { id: 11, title: { romaji: 'Steins;Gate', english: 'Steins;Gate' }, genres: ['Drama'], averageScore: 91, siteUrl: 'https://anilist.co/anime/11' } },
]

describe('Dashboard', () => {
  it('renders the username in the header', () => {
    render(
      <Dashboard
        allEntries={mockEntries}
        username="testuser"
        onLogout={() => {}}
      />
    )

    expect(screen.getByText('testuser')).toBeInTheDocument()
  })

  it('renders top genre badges sorted by average', () => {
    render(
      <Dashboard
        allEntries={mockEntries}
        username="testuser"
        onLogout={() => {}}
      />
    )

    expect(screen.getAllByText(/Adventure/)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/Action/)[0]).toBeInTheDocument()
  })

  it('renders recommendation cards and opens window on click', async () => {
    window.open = vi.fn()
    render(<Dashboard allEntries={mockEntries} username="testuser" onLogout={vi.fn()} />)
    
    // Wait for the skeleton to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Steins;Gate')).toBeInTheDocument()

    const article = screen.getByText('Made in Abyss').closest('article')
    fireEvent.click(article)
    expect(window.open).toHaveBeenCalledWith('https://anilist.co/anime/10', '_blank', 'noopener,noreferrer')
  })

  it('calls onLogout when the logout button is clicked', () => {
    const onLogout = vi.fn()
    render(
      <Dashboard
        allEntries={mockEntries}
        username="testuser"
        onLogout={onLogout}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /trocar conta/i }))

    expect(onLogout).toHaveBeenCalled()
  })

  it('renders force refresh button and calls onRefresh when clicked', () => {
    const onRefresh = vi.fn()
    render(
      <Dashboard
        allEntries={mockEntries}
        username="testuser"
        onLogout={vi.fn()}
        onRefresh={onRefresh}
        isLoading={false}
      />
    )

    const refreshButton = screen.getByRole('button', { name: /atualizar lista/i })
    expect(refreshButton).toBeInTheDocument()
    expect(refreshButton).not.toBeDisabled()

    fireEvent.click(refreshButton)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('disables force refresh button and shows updating state when isLoading is true', () => {
    render(
      <Dashboard
        allEntries={mockEntries}
        username="testuser"
        onLogout={vi.fn()}
        onRefresh={vi.fn()}
        isLoading={true}
      />
    )

    const refreshButton = screen.getByRole('button', { name: /atualizando/i })
    expect(refreshButton).toBeInTheDocument()
    expect(refreshButton).toBeDisabled()
  })

  it('extracts dynamic genres from planning entries and renders them in filter bar', () => {
    const customEntries = [
      { status: 'COMPLETED', score: 9, media: { id: 1, title: { romaji: 'A' }, genres: ['Action'] } },
      { status: 'PLANNING', media: { id: 10, title: { romaji: 'Cyberpunk Edgerunners' }, genres: ['Cyberpunk'], averageScore: 80 } },
      { status: 'PLANNING', media: { id: 11, title: { romaji: 'Gundam' }, genres: ['Mecha'], averageScore: 90 } },
    ]

    render(
      <Dashboard
        allEntries={customEntries}
        username="testuser"
        onLogout={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: 'Cyberpunk' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mecha' })).toBeInTheDocument()
  })

  it('filters recommendations by selected year including NONE', async () => {
    const customEntries = [
      { status: 'COMPLETED', score: 9, media: { id: 1, title: { romaji: 'A' }, genres: ['Action'] } },
      { status: 'PLANNING', media: { id: 10, title: { romaji: 'Anime 2024' }, seasonYear: 2024, genres: ['Action'], averageScore: 80 } },
      { status: 'PLANNING', media: { id: 11, title: { romaji: 'Anime 2020' }, startDate: { year: 2020 }, genres: ['Action'], averageScore: 90 } },
      { status: 'PLANNING', media: { id: 12, title: { romaji: 'Anime No Year' }, genres: ['Action'], averageScore: 85 } },
    ]

    render(
      <Dashboard
        allEntries={customEntries}
        username="testuser"
        onLogout={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Anime 2024')).toBeInTheDocument()
    })

    const yearSelect = screen.getByDisplayValue('Todos os Anos')
    
    // Filter by year 2024
    fireEvent.change(yearSelect, { target: { value: '2024' } })
    expect(screen.getByText('Anime 2024')).toBeInTheDocument()
    expect(screen.queryByText('Anime 2020')).not.toBeInTheDocument()
    expect(screen.queryByText('Anime No Year')).not.toBeInTheDocument()

    // Filter by NONE
    fireEvent.change(yearSelect, { target: { value: 'NONE' } })
    expect(screen.getByText('Anime No Year')).toBeInTheDocument()
    expect(screen.queryByText('Anime 2024')).not.toBeInTheDocument()
    expect(screen.queryByText('Anime 2020')).not.toBeInTheDocument()
  })

  it('sorts recommendations by year_desc and year_asc placing entries without year last', async () => {
    const customEntries = [
      { status: 'COMPLETED', score: 9, media: { id: 1, title: { romaji: 'A' }, genres: ['Action'] } },
      { status: 'PLANNING', media: { id: 10, title: { romaji: 'Anime 2024' }, seasonYear: 2024, genres: ['Action'], averageScore: 80 } },
      { status: 'PLANNING', media: { id: 11, title: { romaji: 'Anime 2020' }, startDate: { year: 2020 }, genres: ['Action'], averageScore: 90 } },
      { status: 'PLANNING', media: { id: 12, title: { romaji: 'Anime No Year' }, genres: ['Action'], averageScore: 85 } },
    ]

    render(
      <Dashboard
        allEntries={customEntries}
        username="testuser"
        onLogout={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Anime 2024')).toBeInTheDocument()
    })

    const sortSelect = screen.getByDisplayValue('Ordenar: Predicted Score')

    // Sort by year_desc
    fireEvent.change(sortSelect, { target: { value: 'year_desc' } })
    let titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual(['Anime 2024', 'Anime 2020', 'Anime No Year'])

    // Sort by year_asc
    fireEvent.change(sortSelect, { target: { value: 'year_asc' } })
    titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual(['Anime 2020', 'Anime 2024', 'Anime No Year'])
  })

  it('sorts recommendations by predictedScore as secondary sort when entries share same year or have no year', async () => {
    const customEntries = [
      { status: 'COMPLETED', score: 10, media: { id: 1, title: { romaji: 'Action Fav' }, genres: ['Action'] } },
      { status: 'COMPLETED', score: 2, media: { id: 2, title: { romaji: 'Drama Low' }, genres: ['Drama'] } },
      { status: 'PLANNING', media: { id: 10, title: { romaji: 'Anime 2024 Low' }, seasonYear: 2024, genres: ['Drama'], averageScore: 50 } },
      { status: 'PLANNING', media: { id: 11, title: { romaji: 'Anime 2024 High' }, seasonYear: 2024, genres: ['Action'], averageScore: 90 } },
      { status: 'PLANNING', media: { id: 12, title: { romaji: 'Anime No Year Low' }, genres: ['Drama'], averageScore: 50 } },
      { status: 'PLANNING', media: { id: 13, title: { romaji: 'Anime No Year High' }, genres: ['Action'], averageScore: 90 } },
    ]

    render(
      <Dashboard
        allEntries={customEntries}
        username="testuser"
        onLogout={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Anime 2024 High')).toBeInTheDocument()
    })

    const sortSelect = screen.getByDisplayValue('Ordenar: Predicted Score')

    // Sort by year_desc
    fireEvent.change(sortSelect, { target: { value: 'year_desc' } })
    let titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual(['Anime 2024 High', 'Anime 2024 Low', 'Anime No Year High', 'Anime No Year Low'])

    // Sort by year_asc
    fireEvent.change(sortSelect, { target: { value: 'year_asc' } })
    titles = screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)
    expect(titles).toEqual(['Anime 2024 High', 'Anime 2024 Low', 'Anime No Year High', 'Anime No Year Low'])
  })

  it('resolves year from all 6 possible properties (year, seasonYear, startDate.year, media.year, media.seasonYear, media.startDate.year)', async () => {
    const customEntries = [
      { status: 'COMPLETED', score: 9, media: { id: 99, title: { romaji: 'Comp' }, genres: ['Action'] } },
      { status: 'PLANNING', year: 2025, media: { id: 1, title: { romaji: 'Anime Prop Year' }, genres: ['Action'], averageScore: 80 } },
      { status: 'PLANNING', seasonYear: 2024, media: { id: 2, title: { romaji: 'Anime Prop SeasonYear' }, genres: ['Action'], averageScore: 80 } },
      { status: 'PLANNING', startDate: { year: 2023 }, media: { id: 3, title: { romaji: 'Anime Prop StartDate' }, genres: ['Action'], averageScore: 80 } },
      { status: 'PLANNING', media: { id: 4, title: { romaji: 'Anime Media Year' }, year: 2022, genres: ['Action'], averageScore: 80 } },
      { status: 'PLANNING', media: { id: 5, title: { romaji: 'Anime Media SeasonYear' }, seasonYear: 2021, genres: ['Action'], averageScore: 80 } },
      { status: 'PLANNING', media: { id: 6, title: { romaji: 'Anime Media StartDate' }, startDate: { year: 2020 }, genres: ['Action'], averageScore: 80 } },
    ]

    render(
      <Dashboard
        allEntries={customEntries}
        username="testuser"
        onLogout={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Anime Prop Year')).toBeInTheDocument()
    })

    const yearSelect = screen.getByDisplayValue('Todos os Anos')
    const options = Array.from(yearSelect.querySelectorAll('option')).map((opt) => opt.value)

    expect(options).toEqual(['ALL', 'NONE', '2025', '2024', '2023', '2022', '2021', '2020'])

    // Filter by year 2025 (from entry.year)
    fireEvent.change(yearSelect, { target: { value: '2025' } })
    expect(screen.getByText('Anime Prop Year')).toBeInTheDocument()
    expect(screen.queryByText('Anime Prop SeasonYear')).not.toBeInTheDocument()

    // Filter by year 2022 (from entry.media.year)
    fireEvent.change(yearSelect, { target: { value: '2022' } })
    expect(screen.getByText('Anime Media Year')).toBeInTheDocument()
    expect(screen.queryByText('Anime Prop Year')).not.toBeInTheDocument()
  })
})
