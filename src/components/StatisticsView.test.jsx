import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import StatisticsView from './StatisticsView.jsx'

const sampleEntries = [
  { status: 'COMPLETED', score: 9, media: { id: 1, episodes: 12, genres: ['Action'], seasonYear: 2022 } },
  { status: 'COMPLETED', score: 7, media: { id: 2, episodes: 24, genres: ['Drama'], seasonYear: 2023 } },
]

describe('StatisticsView accessibility', () => {
  it('supports keyboard sorting on table headers with tabIndex=0 and aria-sort', () => {
    render(<StatisticsView entries={sampleEntries} onSelectGenre={vi.fn()} />)

    const genreHeader = screen.getByRole('button', { name: /^Gênero$/i })
    expect(genreHeader).toHaveAttribute('tabindex', '0')
    expect(genreHeader).toHaveAttribute('aria-sort', 'none')

    fireEvent.keyDown(genreHeader, { key: 'Enter' })
    expect(genreHeader).toHaveAttribute('aria-sort', 'descending')

    fireEvent.keyDown(genreHeader, { key: ' ' })
    expect(genreHeader).toHaveAttribute('aria-sort', 'ascending')
  })

  it('renders score distribution and translated genre table with top-10 pagination toggle', () => {
    // Generate 12 distinct genres with 2 scored entries each to satisfy minScoredCount
    const manyEntries = []
    for (let i = 0; i < 12; i++) {
      manyEntries.push(
        {
          status: 'COMPLETED',
          score: (i % 10) + 1,
          media: { id: i * 2 + 1, episodes: 12, genres: [`Genre_${i}`], seasonYear: 2020 + (i % 4) },
        },
        {
          status: 'COMPLETED',
          score: ((i + 1) % 10) + 1,
          media: { id: i * 2 + 2, episodes: 12, genres: [`Genre_${i}`], seasonYear: 2020 + (i % 4) },
        }
      )
    }

    render(<StatisticsView entries={manyEntries} onSelectGenre={vi.fn()} />)

    // Score distribution rendered
    expect(screen.getByText(/Distribuição de Notas/i)).toBeInTheDocument()
    // By default first 10 genres shown, with button to expand
    expect(screen.getByRole('button', { name: /Ver todos os 12 gêneros/i })).toBeInTheDocument()

    // Expand table
    fireEvent.click(screen.getByRole('button', { name: /Ver todos os 12 gêneros/i }))
    expect(screen.getByRole('button', { name: /Mostrar menos/i })).toBeInTheDocument()
  })
})
