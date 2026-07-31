import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import TasteProfile from './TasteProfile.jsx'

describe('TasteProfile Component', () => {
  it('renders top 5 genre badges sorted by adjustedAverage', () => {
    const profile = new Map([
      ['Comedy', { average: 9.0, adjustedAverage: 6.5, count: 2 }],
      ['Action', { average: 8.0, adjustedAverage: 7.8, count: 10 }],
      ['Drama', { average: 7.5, adjustedAverage: 7.2, count: 5 }],
      ['Sci-Fi', { average: 7.0, adjustedAverage: 7.0, count: 4 }],
      ['Horror', { average: 6.8, adjustedAverage: 6.8, count: 3 }],
      ['Romance', { average: 6.0, adjustedAverage: 6.0, count: 1 }],
    ])

    render(<TasteProfile profile={profile} />)

    // Action (7.8), Drama (7.2), Sci-Fi (7.0), Horror (6.8), Comedy (6.5) should be shown
    // Romance (6.0) should be sliced out (6th)
    expect(screen.getByText('Action ★ 8.0 (10)')).toBeInTheDocument()
    expect(screen.getByText('Drama ★ 7.5 (5)')).toBeInTheDocument()
    expect(screen.getByText('Sci-Fi ★ 7.0 (4)')).toBeInTheDocument()
    expect(screen.getByText('Horror ★ 6.8 (3)')).toBeInTheDocument()
    expect(screen.getByText('Comedy ★ 9.0 (2)')).toBeInTheDocument()
    expect(screen.queryByText(/Romance/)).not.toBeInTheDocument()
  })

  it('falls back to average when adjustedAverage is missing', () => {
    const profile = new Map([
      ['Action', { average: 8.0, count: 10 }],
      ['Drama', { average: 9.0, count: 5 }],
    ])

    render(<TasteProfile profile={profile} />)

    expect(screen.getByText('Drama ★ 9.0 (5)')).toBeInTheDocument()
    expect(screen.getByText('Action ★ 8.0 (10)')).toBeInTheDocument()
  })

  it('applies taste-badge--filled to top 3 and taste-badge--outline to 4th and 5th', () => {
    const profile = new Map([
      ['G1', { average: 9.0, adjustedAverage: 9.0, count: 5 }],
      ['G2', { average: 8.0, adjustedAverage: 8.0, count: 5 }],
      ['G3', { average: 7.0, adjustedAverage: 7.0, count: 5 }],
      ['G4', { average: 6.0, adjustedAverage: 6.0, count: 5 }],
      ['G5', { average: 5.0, adjustedAverage: 5.0, count: 5 }],
    ])

    render(<TasteProfile profile={profile} />)

    const g1Badge = screen.getByText('G1 ★ 9.0 (5)')
    const g4Badge = screen.getByText('G4 ★ 6.0 (5)')

    expect(g1Badge).toHaveClass('taste-badge--filled')
    expect(g4Badge).toHaveClass('taste-badge--outline')
  })

  it('renders gracefully with an empty or default profile', () => {
    render(<TasteProfile />)
    expect(screen.getByText('Seu Perfil de Gosto')).toBeInTheDocument()
  })

  it('renders gracefully when profile is null', () => {
    render(<TasteProfile profile={null} />)
    expect(screen.getByText('Seu Perfil de Gosto')).toBeInTheDocument()
  })
})
