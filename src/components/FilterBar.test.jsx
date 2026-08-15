import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FilterBar from './FilterBar.jsx'

describe('FilterBar', () => {
  it('renders search input, format filter, sort selector, and export button', () => {
    const onSelectGenre = vi.fn()
    const onSearchChange = vi.fn()
    const onSelectFormat = vi.fn()
    const onSortChange = vi.fn()
    const onExportCSV = vi.fn()

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
        onExportCSV={onExportCSV}
      />
    )

    expect(screen.getByPlaceholderText('🔍 Buscar por nome...')).toBeInTheDocument()
    expect(screen.getByText('📥 Exportar recomendações em CSV')).toBeInTheDocument()

    // Test search change
    fireEvent.change(screen.getByPlaceholderText('🔍 Buscar por nome...'), {
      target: { value: 'Frieren' },
    })
    expect(onSearchChange).toHaveBeenCalledWith('Frieren')

    // Test genre select change
    const genreSelect = screen.getByDisplayValue('Todos os Gêneros')
    fireEvent.change(genreSelect, { target: { value: 'Action' } })
    expect(onSelectGenre).toHaveBeenCalledWith('Action')

    // Test export click
    fireEvent.click(screen.getByText('📥 Exportar recomendações em CSV'))
    expect(onExportCSV).toHaveBeenCalled()
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

    const sortSelect = screen.getByDisplayValue('Predicted Score')
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
})
