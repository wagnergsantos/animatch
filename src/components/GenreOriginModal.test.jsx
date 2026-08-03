import { render, screen, fireEvent } from '@testing-library/react'
import { describe, test, expect, vi } from 'vitest'
import GenreOriginModal from './GenreOriginModal'

describe('GenreOriginModal', () => {
  const mockStats = {
    average: 8.5,
    adjustedAverage: 8.2,
    count: 2,
    sourceAnimes: [
      { id: 1, title: 'Attack on Titan', score: 9, coverImage: 'titan.jpg', status: 'COMPLETED' },
      { id: 2, title: 'Demon Slayer', score: 8, coverImage: 'slayer.jpg', status: 'COMPLETED' }
    ]
  }

  test('renders genre details and source animes as clickable links', () => {
    render(<GenreOriginModal genre="Action" stats={mockStats} onClose={vi.fn()} onFilterGenre={vi.fn()} />)

    expect(screen.getByText(/Origem da nota: Action/i)).toBeInTheDocument()
    const titanLink = screen.getByText(/Attack on Titan/i).closest('a')
    expect(titanLink).toHaveAttribute('href', 'https://anilist.co/anime/1')
    expect(titanLink).toHaveAttribute('target', '_blank')
    expect(titanLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  test('calls onClose when close button clicked', () => {
    const handleClose = vi.fn()
    render(<GenreOriginModal genre="Action" stats={mockStats} onClose={handleClose} onFilterGenre={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /fechar/i }))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  test('calls onFilterGenre and onClose when filter button is clicked', () => {
    const handleClose = vi.fn()
    const handleFilterGenre = vi.fn()
    render(<GenreOriginModal genre="Action" stats={mockStats} onClose={handleClose} onFilterGenre={handleFilterGenre} />)

    fireEvent.click(screen.getByRole('button', { name: /filtrar recomendações por action/i }))
    expect(handleFilterGenre).toHaveBeenCalledWith('Action')
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
