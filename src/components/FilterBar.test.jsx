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
    expect(screen.getByText('📥 Exportar CSV')).toBeInTheDocument()

    // Test search change
    fireEvent.change(screen.getByPlaceholderText('🔍 Buscar por nome...'), {
      target: { value: 'Frieren' },
    })
    expect(onSearchChange).toHaveBeenCalledWith('Frieren')

    // Test genre button click
    fireEvent.click(screen.getByText('Ação'))
    expect(onSelectGenre).toHaveBeenCalledWith('Action')

    // Test export click
    fireEvent.click(screen.getByText('📥 Exportar CSV'))
    expect(onExportCSV).toHaveBeenCalled()
  })
})
