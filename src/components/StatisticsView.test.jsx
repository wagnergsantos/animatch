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
})
