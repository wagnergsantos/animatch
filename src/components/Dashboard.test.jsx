import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import Dashboard from './Dashboard.jsx'
import { useEnsembleData } from '../hooks/useEnsembleData.js'

vi.mock('../hooks/useEnsembleData.js', () => ({
  useEnsembleData: vi.fn(() => ({
    entriesByProvider: {},
    consolidatedEntries: [],
    failedProviders: [],
    isLoading: false,
    refetch: vi.fn(),
  })),
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
  beforeEach(() => {
    vi.clearAllMocks()
    useEnsembleData.mockReturnValue({
      entriesByProvider: {},
      consolidatedEntries: [],
      failedProviders: [],
      isLoading: false,
      refetch: vi.fn(),
    })
  })

  it('renders the provider badge and profile link correctly', () => {
    render(<Dashboard username="testuser" provider="kitsu" />)
    const kitsuLink = screen.getByRole('link', { name: /testuser \(Kitsu\)/i })
    expect(kitsuLink).toHaveAttribute('href', 'https://kitsu.app/users/testuser')
    expect(kitsuLink).toHaveAttribute('target', '_blank')

    render(<Dashboard username="testuser2" provider="anilist" />)
    const anilistLink = screen.getByRole('link', { name: /testuser2 \(AniList\)/i })
    expect(anilistLink).toHaveAttribute('href', 'https://anilist.co/user/testuser2')

    render(<Dashboard username="testuser3" provider="mal" />)
    const malLink = screen.getByRole('link', { name: /testuser3 \(MyAnimeList\)/i })
    expect(malLink).toHaveAttribute('href', 'https://myanimelist.net/profile/testuser3')
  })




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

  it.skip('clicking a taste profile badge filters the grid by that genre instead of opening a modal', async () => {
    render(<Dashboard allEntries={mockEntries} username="testuser" onLogout={() => {}} />)

    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    })

    const adventureBadge = screen.getAllByText(/Adventure/)[0]
    fireEvent.click(adventureBadge)

    // The FilterBar's "Adventure" pill button should become active as a result.
    const adventureFilterButtons = screen.getAllByRole('button', { name: 'Adventure' })
    expect(adventureFilterButtons.some((btn) => btn.className.includes('filter-bar__btn--active'))).toBe(true)

    // No modal/dialog should be rendered.
    expect(screen.queryByLabelText('Fechar modal')).not.toBeInTheDocument()
  })

  it('renders recommendation cards, opens modal on card click and opens AniList on quick button click', async () => {
    window.open = vi.fn()
    render(<Dashboard allEntries={mockEntries} username="testuser" onLogout={vi.fn()} />)
    
    // Wait for the skeleton to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Steins;Gate')).toBeInTheDocument()

    const article = screen.getByText('Made in Abyss').closest('article')
    fireEvent.click(article)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    const quickBtn = article.querySelector('[data-testid="anime-card-quick-link"]')
    fireEvent.click(quickBtn)
    expect(window.open).toHaveBeenCalledWith('https://anilist.co/anime/10', '_blank', 'noopener,noreferrer')
  })

  it('calls onLogout when the logout button is clicked in the settings tab', () => {
    const onLogout = vi.fn()
    render(
      <Dashboard
        allEntries={mockEntries}
        username="testuser"
        onLogout={onLogout}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    fireEvent.click(screen.getByRole('button', { name: /trocar de conta/i }))

    expect(onLogout).toHaveBeenCalled()
  })

  it('renders force refresh button in settings page and calls onRefresh when clicked', () => {
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

    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    const refreshButton = screen.getByRole('button', { name: /sincronizar anilist/i })
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

    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    const refreshButton = screen.getByRole('button', { name: /sincronizando com anilist/i })
    expect(refreshButton).toBeInTheDocument()
    expect(refreshButton).toBeDisabled()
  })

  it('renders the settings tab in the navigation and allows switching between tabs', () => {
    render(<Dashboard allEntries={mockEntries} username="testuser" onLogout={() => {}} />)
    const settingsTabBtn = screen.getByRole('button', { name: /configurações/i })
    expect(settingsTabBtn).toBeInTheDocument()

    // Click settings tab -> SettingsPage sections rendered
    fireEvent.click(settingsTabBtn)
    expect(screen.getByRole('heading', { name: /Contas Vinculadas/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Streaming.*Assinaturas/i })).toBeInTheDocument()

    // Click recommendations tab -> returns to recommendation view
    const recTabBtn = screen.getByRole('button', { name: /recomendações/i })
    fireEvent.click(recTabBtn)
    expect(screen.queryByRole('heading', { name: /Contas Vinculadas/i })).not.toBeInTheDocument()
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

    expect(screen.getByRole('option', { name: /Cyberpunk/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Mecha/ })).toBeInTheDocument()
  })

  it('renders filter bar genres with planning counts', () => {
    const mockEntries = [
      { id: 1, status: 'PLANNING', media: { id: 1, title: { romaji: 'Anime 1' }, genres: ['Action', 'Comedy'] } },
      { id: 2, status: 'PLANNING', media: { id: 2, title: { romaji: 'Anime 2' }, genres: ['Action'] } },
      { id: 3, status: 'COMPLETED', media: { id: 3, title: { romaji: 'Anime 3' }, genres: ['Drama'] } },
    ]

    render(<Dashboard allEntries={mockEntries} username="testuser" />)

    expect(screen.getByRole('option', { name: /Todos os Gêneros \(2\)/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Action \(2\)/i })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /Comedy \(1\)/i })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: /Drama/i })).not.toBeInTheDocument()
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

    const sortSelect = screen.getByDisplayValue('Predicted Score')

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

    const sortSelect = screen.getByDisplayValue('Predicted Score')

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

  it("filters recommendations by seasonal filter when isSeasonOnly toggle is enabled", async () => {
    const currentYear = new Date().getFullYear()
    const customEntries = [
      { status: "COMPLETED", score: 9, media: { id: 1, title: { romaji: "A" }, genres: ["Action"] } },
      { status: "PLANNING", year: currentYear, media: { id: 10, title: { romaji: "Current Season Anime" }, genres: ["Action"], averageScore: 80 } },
      { status: "PLANNING", year: 2015, media: { id: 11, status: "RELEASING", title: { romaji: "Releasing Anime" }, genres: ["Action"], averageScore: 85 } },
      { status: "PLANNING", year: 2010, media: { id: 12, status: "FINISHED", title: { romaji: "Old Finished Anime" }, genres: ["Action"], averageScore: 90 } },
    ]

    render(
      <Dashboard
        allEntries={customEntries}
        username="testuser"
        onLogout={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText("Current Season Anime")).toBeInTheDocument()
    })

    expect(screen.getByText("Releasing Anime")).toBeInTheDocument()
    expect(screen.getByText("Old Finished Anime")).toBeInTheDocument()

    const seasonCheckbox = screen.getByLabelText(/Apenas da Temporada/i)
    fireEvent.click(seasonCheckbox)

    expect(screen.getByText("Current Season Anime")).toBeInTheDocument()
    expect(screen.getByText("Releasing Anime")).toBeInTheDocument()
    expect(screen.queryByText("Old Finished Anime")).not.toBeInTheDocument()
  })
  it('filters recommendations by seasonal filter correctly when year is a string', async () => {
    const currentYear = new Date().getFullYear()
    const customEntries = [
      { status: 'COMPLETED', score: 9, media: { id: 1, title: { romaji: 'A' }, genres: ['Action'] } },
      { status: 'PLANNING', media: { id: 10, seasonYear: String(currentYear), title: { romaji: 'String Year Anime' }, genres: ['Action'], averageScore: 80 } },
      { status: 'PLANNING', media: { id: 12, seasonYear: 2010, status: 'FINISHED', title: { romaji: 'Old Anime' }, genres: ['Action'], averageScore: 90 } },
    ]

    render(
      <Dashboard
        allEntries={customEntries}
        username='testuser'
        onLogout={vi.fn()}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('String Year Anime')).toBeInTheDocument()
    })

    const seasonCheckbox = screen.getByLabelText(/Apenas da Temporada/i)
    fireEvent.click(seasonCheckbox)

    expect(screen.getByText('String Year Anime')).toBeInTheDocument()
    expect(screen.queryByText('Old Anime')).not.toBeInTheDocument()
  })

  it('renders FloatingRandomizerButton and opens and closes DecisionModal', async () => {
    render(<Dashboard allEntries={mockEntries} username="testuser" onLogout={vi.fn()} />)

    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    })

    const fab = screen.getByRole('button', { name: /Modo Decisão|Decision Mode/i })
    expect(fab).toBeInTheDocument()

    fireEvent.click(fab)

    const modalTitle = screen.getByRole('heading', { name: /Escolha pra mim/i })
    expect(modalTitle).toBeInTheDocument()

    const closeBtn = screen.getByRole('button', { name: /Fechar/i })
    fireEvent.click(closeBtn)

    expect(screen.queryByRole('heading', { name: /Escolha pra mim/i })).not.toBeInTheDocument()
  })

  it('filters recommendations by streaming subscriptions when isStreamingOnly toggle is enabled', async () => {
    const entriesWithStreaming = [
      { status: 'COMPLETED', score: 9, media: { id: 1, title: { romaji: 'A' }, genres: ['Action'] } },
      {
        status: 'PLANNING',
        media: {
          id: 10,
          title: { romaji: 'Crunchy Anime' },
          genres: ['Action'],
          averageScore: 85,
          streamingLinks: [{ site: 'Crunchyroll', url: 'https://crunchyroll.com/anime' }],
        },
      },
      {
        status: 'PLANNING',
        media: {
          id: 11,
          title: { romaji: 'Unstreamable Anime' },
          genres: ['Action'],
          averageScore: 80,
          streamingLinks: [],
        },
      },
    ]

    render(<Dashboard allEntries={entriesWithStreaming} username="testuser" onLogout={vi.fn()} />)

    await waitFor(() => {
      expect(screen.getByText('Crunchy Anime')).toBeInTheDocument()
      expect(screen.getByText('Unstreamable Anime')).toBeInTheDocument()
    })

    const streamingCheckbox = screen.getByLabelText(/Somente assinados/i)
    fireEvent.click(streamingCheckbox)

    expect(screen.getByText('Crunchy Anime')).toBeInTheDocument()
    expect(screen.queryByText('Unstreamable Anime')).not.toBeInTheDocument()
  })

  it('renders ProviderTabs when linkedUsernames has >= 2 accounts', () => {
    const linkedUsernames = { anilist: 'alice', mal: 'bob', kitsu: '' }
    useEnsembleData.mockReturnValue({
      entriesByProvider: { anilist: [], mal: [] },
      consolidatedEntries: [],
      failedProviders: [],
      isLoading: false,
      refetch: vi.fn(),
    })

    render(
      <Dashboard
        username="alice"
        provider="anilist"
        linkedUsernames={linkedUsernames}
      />
    )

    const scopeRegion = screen.getByRole('region', { name: /Escopo de Provedor/i })
    expect(scopeRegion).toBeInTheDocument()
    expect(within(scopeRegion).getByRole('button', { name: /Consolidado \(2\)/i })).toBeInTheDocument()
    expect(within(scopeRegion).getByRole('button', { name: 'AniList' })).toBeInTheDocument()
    expect(within(scopeRegion).getByRole('button', { name: 'MyAnimeList' })).toBeInTheDocument()
    expect(screen.getAllByText(/Consolidado/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.queryByRole('link', { name: /alice \(AniList\)/i })).not.toBeInTheDocument()
  })

  it('switching scope between ensemble and individual provider updates displayed recommendations', async () => {
    const linkedUsernames = { anilist: 'alice', kitsu: 'alice_kitsu', mal: '' }
    const anilistEntry = {
      status: 'PLANNING',
      media: {
        id: 101,
        title: { romaji: 'Anilist Only Anime' },
        genres: ['Action'],
        averageScore: 85,
        siteUrl: 'https://anilist.co/anime/101',
      },
    }
    const kitsuEntry = {
      status: 'PLANNING',
      media: {
        id: 102,
        title: { romaji: 'Kitsu Only Anime' },
        genres: ['Action'],
        averageScore: 80,
        siteUrl: 'https://kitsu.app/anime/102',
      },
    }
    const consolidated = [anilistEntry, kitsuEntry]

    useEnsembleData.mockReturnValue({
      entriesByProvider: {
        anilist: [anilistEntry],
        kitsu: [kitsuEntry],
      },
      consolidatedEntries: consolidated,
      failedProviders: [],
      isLoading: false,
      refetch: vi.fn(),
    })

    render(
      <Dashboard
        username="alice"
        provider="anilist"
        linkedUsernames={linkedUsernames}
      />
    )

    // Initial scope is ensemble: both recommendations are rendered
    await waitFor(() => {
      expect(screen.getByText('Anilist Only Anime')).toBeInTheDocument()
      expect(screen.getByText('Kitsu Only Anime')).toBeInTheDocument()
    })

    const scopeRegion = screen.getByRole('region', { name: /Escopo de Provedor/i })

    // Switch to Kitsu scope
    const kitsuTab = within(scopeRegion).getByRole('button', { name: /Kitsu/i })
    fireEvent.click(kitsuTab)

    // Now only Kitsu recommendation should be rendered
    expect(screen.getByText('Kitsu Only Anime')).toBeInTheDocument()
    expect(screen.queryByText('Anilist Only Anime')).not.toBeInTheDocument()

    // Header link reflects Kitsu scoped user
    const kitsuLink = screen.getByRole('link', { name: /alice_kitsu \(Kitsu\)/i })
    expect(kitsuLink).toHaveAttribute('href', 'https://kitsu.app/users/alice_kitsu')

    // Switch to AniList scope
    const anilistTab = within(scopeRegion).getByRole('button', { name: /AniList/i })
    fireEvent.click(anilistTab)

    expect(screen.getByText('Anilist Only Anime')).toBeInTheDocument()
    expect(screen.queryByText('Kitsu Only Anime')).not.toBeInTheDocument()

    // Switch back to ensemble scope
    const ensembleTab = within(scopeRegion).getByRole('button', { name: /Consolidado \(2\)/i })
    fireEvent.click(ensembleTab)

    expect(screen.getByText('Anilist Only Anime')).toBeInTheDocument()
    expect(screen.getByText('Kitsu Only Anime')).toBeInTheDocument()
  })

  it('applies multi-presence boost when activeScope is ensemble', async () => {
    const linkedUsernames = { anilist: 'alice', mal: 'alice_mal', kitsu: '' }
    const sharedAnime = {
      id: 201,
      status: 'PLANNING',
      planningProviders: ['anilist', 'mal'],
      sourceProviders: ['anilist', 'mal'],
      media: {
        id: 201,
        title: { romaji: 'Cross-Platform Anime' },
        genres: ['Sci-Fi'],
        averageScore: 80, // community = 8.0, predicted = 8.0 -> boosted with k=0.05 (2-1=1) => 8.4
      },
    }
    const singleAnime = {
      id: 202,
      status: 'PLANNING',
      planningProviders: ['anilist'],
      sourceProviders: ['anilist'],
      media: {
        id: 202,
        title: { romaji: 'Single Provider Anime' },
        genres: ['Sci-Fi'],
        averageScore: 80, // community = 8.0, predicted = 8.0 -> no boost => 8.0
      },
    }

    useEnsembleData.mockReturnValue({
      entriesByProvider: {
        anilist: [sharedAnime, singleAnime],
        mal: [sharedAnime],
      },
      consolidatedEntries: [sharedAnime, singleAnime],
      failedProviders: [],
      isLoading: false,
      refetch: vi.fn(),
    })

    render(
      <Dashboard
        username="alice"
        provider="anilist"
        linkedUsernames={linkedUsernames}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Cross-Platform Anime')).toBeInTheDocument()
      expect(screen.getByText('Single Provider Anime')).toBeInTheDocument()
    })

    // In ensemble mode, Cross-Platform Anime has higher score due to multi-presence boost (8.4 vs 8.0),
    // and displays its presence badge with +5% in tooltip
    const badgeContainer = screen.getByTestId('card-provider-badges')
    expect(badgeContainer).toBeInTheDocument()
    expect(badgeContainer).toHaveAttribute('title', expect.stringContaining('+5%'))
    expect(within(badgeContainer).getByText('AniList')).toBeInTheDocument()
    expect(within(badgeContainer).getByText('MAL')).toBeInTheDocument()

    // Assert that Cross-Platform Anime has boosted score 8.40/10 and Single has 8.00/10
    expect(screen.getByText(/(Match|Afinidade): 8\.40\/10/i)).toBeInTheDocument()
    expect(screen.getByText(/(Match|Afinidade): 8\.00\/10/i)).toBeInTheDocument()
  })

  it('calls refetchEnsemble when refreshing while activeScope is ensemble', () => {
    const linkedUsernames = { anilist: 'alice', mal: 'alice_mal', kitsu: '' }
    const refetchEnsemble = vi.fn()
    const onRefresh = vi.fn()

    useEnsembleData.mockReturnValue({
      entriesByProvider: { anilist: [], mal: [] },
      consolidatedEntries: [],
      failedProviders: [],
      isLoading: false,
      refetch: refetchEnsemble,
    })

    render(
      <Dashboard
        username="alice"
        provider="anilist"
        linkedUsernames={linkedUsernames}
        onRefresh={onRefresh}
      />
    )

    // Switch to settings tab
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))

    // Click refresh button in settings
    const refreshButton = screen.getByRole('button', { name: /sincronizar/i })
    fireEvent.click(refreshButton)

    expect(refetchEnsemble).toHaveBeenCalled()
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('displays loading skeleton in grid when isEnsembleLoading is true and currentEntries is empty', () => {
    const linkedUsernames = { anilist: 'alice', mal: 'alice_mal', kitsu: '' }
    useEnsembleData.mockReturnValue({
      entriesByProvider: { anilist: [], mal: [] },
      consolidatedEntries: [],
      failedProviders: [],
      isLoading: true,
      refetch: vi.fn(),
    })

    render(
      <Dashboard
        username="alice"
        provider="anilist"
        linkedUsernames={linkedUsernames}
      />
    )

    expect(screen.getAllByTestId('skeleton').length).toBeGreaterThan(0)
  })
})
