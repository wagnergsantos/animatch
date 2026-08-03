import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import TasteProfile from './TasteProfile.jsx'

describe('TasteProfile Component', () => {
  it('renders top 5 genre badges when fewer than 5 have score >= 8.00', () => {
    const profile = new Map([
      ['Comedy', { average: 9.0, adjustedAverage: 6.5, count: 2 }],
      ['Action', { average: 8.0, adjustedAverage: 7.8, count: 10 }],
      ['Drama', { average: 7.5, adjustedAverage: 7.2, count: 5 }],
      ['Sci-Fi', { average: 7.0, adjustedAverage: 7.0, count: 4 }],
      ['Horror', { average: 6.8, adjustedAverage: 6.8, count: 3 }],
      ['Romance', { average: 6.0, adjustedAverage: 6.0, count: 1 }],
    ])

    render(<TasteProfile profile={profile} />)

    // Action (7.80), Drama (7.20), Sci-Fi (7.00), Horror (6.80), Comedy (6.50) should be shown (5 total)
    // Romance (6.00) should be sliced out (6th)
    expect(screen.getByText('Action ★ 8.00 (10)')).toBeInTheDocument()
    expect(screen.getByText('Drama ★ 7.50 (5)')).toBeInTheDocument()
    expect(screen.getByText('Sci-Fi ★ 7.00 (4)')).toBeInTheDocument()
    expect(screen.getByText('Horror ★ 6.80 (3)')).toBeInTheDocument()
    expect(screen.getByText('Comedy ★ 9.00 (2)')).toBeInTheDocument()
    expect(screen.queryByText(/Romance/)).not.toBeInTheDocument()
  })

  it('renders 5 badges when 3 genres >= 8.00 (top 3 filled, 2 outline)', () => {
    const profile = new Map([
      ['G1', { average: 9.5, adjustedAverage: 9.5, count: 10 }],
      ['G2', { average: 8.8, adjustedAverage: 8.8, count: 8 }],
      ['G3', { average: 8.0, adjustedAverage: 8.0, count: 5 }],
      ['G4', { average: 7.5, adjustedAverage: 7.5, count: 4 }],
      ['G5', { average: 6.0, adjustedAverage: 6.0, count: 3 }],
      ['G6', { average: 5.0, adjustedAverage: 5.0, count: 2 }],
    ])

    render(<TasteProfile profile={profile} />)

    const g1Badge = screen.getByText('G1 ★ 9.50 (10)')
    const g2Badge = screen.getByText('G2 ★ 8.80 (8)')
    const g3Badge = screen.getByText('G3 ★ 8.00 (5)')
    const g4Badge = screen.getByText('G4 ★ 7.50 (4)')
    const g5Badge = screen.getByText('G5 ★ 6.00 (3)')

    expect(g1Badge).toHaveClass('taste-badge--filled')
    expect(g2Badge).toHaveClass('taste-badge--filled')
    expect(g3Badge).toHaveClass('taste-badge--filled')
    expect(g4Badge).toHaveClass('taste-badge--outline')
    expect(g5Badge).toHaveClass('taste-badge--outline')

    expect(screen.queryByText(/G6/)).not.toBeInTheDocument()
  })

  it('renders 7 badges when 7 genres >= 8.00 (all 7 filled)', () => {
    const profile = new Map([
      ['G1', { average: 9.5, adjustedAverage: 9.5, count: 10 }],
      ['G2', { average: 9.0, adjustedAverage: 9.0, count: 9 }],
      ['G3', { average: 8.7, adjustedAverage: 8.7, count: 8 }],
      ['G4', { average: 8.5, adjustedAverage: 8.5, count: 7 }],
      ['G5', { average: 8.3, adjustedAverage: 8.3, count: 6 }],
      ['G6', { average: 8.2, adjustedAverage: 8.2, count: 5 }],
      ['G7', { average: 8.0, adjustedAverage: 8.0, count: 4 }],
      ['G8', { average: 7.0, adjustedAverage: 7.0, count: 3 }],
    ])

    render(<TasteProfile profile={profile} />)

    for (let i = 1; i <= 7; i++) {
      const badge = screen.getByText(new RegExp(`G${i} ★`))
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveClass('taste-badge--filled')
    }

    expect(screen.queryByText(/G8/)).not.toBeInTheDocument()
  })

  it('formats average rating with 2 decimal places precision', () => {
    const profile = new Map([
      ['Action', { average: 8, adjustedAverage: 8, count: 10 }],
      ['Drama', { average: 7.1234, adjustedAverage: 7.1234, count: 5 }],
    ])

    render(<TasteProfile profile={profile} />)

    expect(screen.getByText('Action ★ 8.00 (10)')).toBeInTheDocument()
    expect(screen.getByText('Drama ★ 7.12 (5)')).toBeInTheDocument()
  })

  it('falls back to average when adjustedAverage is missing', () => {
    const profile = new Map([
      ['Action', { average: 8.0, count: 10 }],
      ['Drama', { average: 9.0, count: 5 }],
    ])

    render(<TasteProfile profile={profile} />)

    expect(screen.getByText('Drama ★ 9.00 (5)')).toBeInTheDocument()
    expect(screen.getByText('Action ★ 8.00 (10)')).toBeInTheDocument()
  })

  it('renders gracefully with an empty or default profile', () => {
    render(<TasteProfile />)
    expect(screen.getByText('Seu Perfil de Gosto')).toBeInTheDocument()
  })

  it('renders gracefully when profile is null', () => {
    render(<TasteProfile profile={null} />)
    expect(screen.getByText('Seu Perfil de Gosto')).toBeInTheDocument()
  })

  it('opens GenreOriginModal when a genre badge is clicked', () => {
    const profile = new Map([
      ['Action', { average: 8.5, adjustedAverage: 8.5, count: 10, sourceAnimes: [{ id: 1, title: 'Attack on Titan', score: 9 }] }],
    ])

    render(<TasteProfile profile={profile} />)

    const badge = screen.getByText('Action \u2605 8.50 (10)')
    fireEvent.click(badge)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Origem da nota: Action/i)).toBeInTheDocument()
  })
})
