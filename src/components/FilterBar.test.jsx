import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FilterBar from './FilterBar.jsx'
import ResultsActions from './ResultsActions.jsx'

const openFilters = () => fireEvent.click(screen.getByRole('button', { name: /^Filtros/ }))

describe('FilterBar', () => {
  it('renders search input, genre filter, sort selector, and format filter in popover', () => {
    const onSelectGenre = vi.fn()
    const onSearchChange = vi.fn()
    const onSelectFormat = vi.fn()
    const onSortChange = vi.fn()

    render(
      <FilterBar
        selectedGenre="ALL"
        onSelectGenre={onSelectGenre}
        searchQuery=""
        onSearchChange={onSearchChange}
        selectedFormat="ALL"
        onSelectFormat={onSelectFormat}
        sortBy="predicted"
        onSortChange={onSortChange}
      />
    )

    expect(screen.getByPlaceholderText('🔍 Buscar por nome...')).toBeInTheDocument()

    // Test search change
    fireEvent.change(screen.getByPlaceholderText('🔍 Buscar por nome...'), {
      target: { value: 'Frieren' },
    })
    expect(onSearchChange).toHaveBeenCalledWith('Frieren')

    // Test genre select change
    const genreSelect = screen.getByDisplayValue('Todos os Gêneros')
    fireEvent.change(genreSelect, { target: { value: 'Action' } })
    expect(onSelectGenre).toHaveBeenCalledWith('Action')

    // Test format select inside Filters popover
    openFilters()
    const formatSelect = screen.getByDisplayValue('Todos Formatos')
    fireEvent.change(formatSelect, { target: { value: 'TV' } })
    expect(onSelectFormat).toHaveBeenCalledWith('TV')
  })

  it('renders dynamic genres when availableGenres prop is provided', () => {
    const onSelectGenre = vi.fn()
    render(
      <FilterBar
        availableGenres={['Mecha', 'Psychological']}
        onSelectGenre={onSelectGenre}
      />
    )

    expect(screen.getByText('Todos os Gêneros')).toBeInTheDocument()
    expect(screen.getByText('Mecha')).toBeInTheDocument()
    expect(screen.getByText('Psychological')).toBeInTheDocument()
    expect(screen.queryByText('Ação')).not.toBeInTheDocument()

    const genreSelect = screen.getByDisplayValue('Todos os Gêneros')
    fireEvent.change(genreSelect, { target: { value: 'Mecha' } })
    expect(onSelectGenre).toHaveBeenCalledWith('Mecha')
  })

  it('renders year selector when availableYears is provided', () => {
    const onSelectYear = vi.fn()
    render(
      <FilterBar
        availableYears={[2024, 2023]}
        selectedYear="ALL"
        onSelectYear={onSelectYear}
      />
    )

    openFilters()
    const yearSelect = screen.getByDisplayValue('Todos os Anos')
    expect(yearSelect).toBeInTheDocument()
    expect(screen.getByText('Sem Ano')).toBeInTheDocument()
    expect(screen.getByText('2024')).toBeInTheDocument()
    expect(screen.getByText('2023')).toBeInTheDocument()

    fireEvent.change(yearSelect, { target: { value: '2024' } })
    expect(onSelectYear).toHaveBeenCalledWith('2024')
  })

  it('renders year sort options in sort selector', () => {
    const onSortChange = vi.fn()
    render(
      <FilterBar
        sortBy="predicted"
        onSortChange={onSortChange}
      />
    )

    expect(screen.getByText('Ano (Mais Recente)')).toBeInTheDocument()
    expect(screen.getByText('Ano (Mais Antigo)')).toBeInTheDocument()

    const sortSelect = screen.getByDisplayValue('Score previsto')
    fireEvent.change(sortSelect, { target: { value: 'year_desc' } })
    expect(onSortChange).toHaveBeenCalledWith('year_desc')
  })

  it('calls onSeasonOnlyChange when season toggle is clicked', () => {
    const handleSeasonChange = vi.fn()
    render(
      <FilterBar
        selectedGenre="ALL"
        onSelectGenre={vi.fn()}
        isSeasonOnly={false}
        onSeasonOnlyChange={handleSeasonChange}
      />
    )

    openFilters()
    const seasonToggle = screen.getByLabelText(/Apenas da Temporada/i)
    fireEvent.click(seasonToggle)
    expect(handleSeasonChange).toHaveBeenCalledWith(true)
  })

  it('renders genre select options with counts when provided as objects', () => {
    const genres = [
      { name: 'Action', count: 5 },
      { name: 'Comedy', count: 3 },
    ]

    render(
      <FilterBar
        availableGenres={genres}
        totalPlanningCount={8}
        selectedGenre="ALL"
        onSelectGenre={() => {}}
      />
    )

    expect(screen.getByText('Todos os Gêneros (8)')).toBeInTheDocument()
    expect(screen.getByText('Action (5)')).toBeInTheDocument()
    expect(screen.getByText('Comedy (3)')).toBeInTheDocument()
  })

  it('renders view mode toggle and export icon button in ResultsActions', () => {
    const handleViewModeChange = vi.fn()
    const handleExportCSV = vi.fn()
    render(
      <ResultsActions
        viewMode="grid"
        onViewModeChange={handleViewModeChange}
        onExportCSV={handleExportCSV}
      />
    )

    const listBtn = screen.getByRole('button', { name: 'Lista' })
    fireEvent.click(listBtn)
    expect(handleViewModeChange).toHaveBeenCalledWith('list')

    const exportBtn = screen.getByRole('button', { name: 'Exportar lista atual (CSV)' })
    fireEvent.click(exportBtn)
    expect(handleExportCSV).toHaveBeenCalled()
  })

  it('calls onStreamingOnlyChange when streaming filter checkbox is clicked', () => {
    const handleStreamingChange = vi.fn()
    render(
      <FilterBar
        selectedGenre="ALL"
        isStreamingOnly={false}
        onStreamingOnlyChange={handleStreamingChange}
      />
    )

    openFilters()
    const streamingToggle = screen.getByLabelText(/Somente assinados/i)
    fireEvent.click(streamingToggle)
    expect(handleStreamingChange).toHaveBeenCalledWith(true)
  })

  it('resets streaming filter and other filters when clear button is clicked', () => {
    const handleGenreChange = vi.fn()
    const handleFormatChange = vi.fn()
    const handleYearChange = vi.fn()
    const handleBadgeChange = vi.fn()
    const handleSearchChange = vi.fn()
    const handleSeasonChange = vi.fn()
    const handleStreamingChange = vi.fn()

    render(
      <FilterBar
        selectedGenre="Action"
        onSelectGenre={handleGenreChange}
        selectedFormat="TV"
        onSelectFormat={handleFormatChange}
        selectedYear="2024"
        onSelectYear={handleYearChange}
        selectedBadge="ACCLAIMED"
        onSelectBadge={handleBadgeChange}
        searchQuery="Naruto"
        onSearchChange={handleSearchChange}
        isSeasonOnly={true}
        onSeasonOnlyChange={handleSeasonChange}
        isStreamingOnly={true}
        onStreamingOnlyChange={handleStreamingChange}
      />
    )

    const clearButton = screen.getByRole('button', { name: /Limpar Filtros/i })
    expect(clearButton).toBeInTheDocument()
    fireEvent.click(clearButton)

    expect(handleGenreChange).toHaveBeenCalledWith('ALL')
    expect(handleFormatChange).toHaveBeenCalledWith('ALL')
    expect(handleYearChange).toHaveBeenCalledWith('ALL')
    expect(handleBadgeChange).toHaveBeenCalledWith('ALL')
    expect(handleSearchChange).toHaveBeenCalledWith('')
    expect(handleSeasonChange).toHaveBeenCalledWith(false)
    expect(handleStreamingChange).toHaveBeenCalledWith(false)
  })

  it('shows active filter count as "Filtros (2)", chips and removes a single filter via chip', () => {
    const handleFormatChange = vi.fn()
    render(
      <FilterBar
        selectedFormat="TV"
        onSelectFormat={handleFormatChange}
        isSeasonOnly={true}
        onSeasonOnlyChange={vi.fn()}
      />
    )

    expect(screen.getByRole('button', { name: /^Filtros/ })).toHaveTextContent('Filtros (2)')
    fireEvent.click(screen.getByRole('button', { name: 'Remover filtro Formato: TV' }))
    expect(handleFormatChange).toHaveBeenCalledWith('ALL')
  })

  it('closes the filters popover on Escape', () => {
    render(<FilterBar onSelectFormat={vi.fn()} />)
    openFilters()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('renders DISCOVERY badge option in badge selector and triggers onSelectBadge', () => {
    const handleBadgeChange = vi.fn()
    render(
      <FilterBar
        selectedBadge="ALL"
        onSelectBadge={handleBadgeChange}
      />
    )

    openFilters()
    expect(screen.getByText('🧭 Fora da Zona')).toBeInTheDocument()
    const badgeSelect = screen.getByDisplayValue('Todos os Destaques')
    fireEvent.change(badgeSelect, { target: { value: 'DISCOVERY' } })
    expect(handleBadgeChange).toHaveBeenCalledWith('DISCOVERY')
  })
})


