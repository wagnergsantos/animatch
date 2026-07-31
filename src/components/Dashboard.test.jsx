import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Dashboard from './Dashboard.jsx'

const mockProfile = new Map([
  ['Adventure', { average: 9.0, adjustedAverage: 9.0, count: 5, scoredCount: 5 }],
  ['Drama', { average: 8.5, adjustedAverage: 8.5, count: 8, scoredCount: 8 }],
  ['Action', { average: 7.0, adjustedAverage: 7.0, count: 15, scoredCount: 10 }],
  ['Fantasy', { average: 6.5, adjustedAverage: 6.5, count: 3, scoredCount: 3 }],
  ['Comedy', { average: 6.0, adjustedAverage: 6.0, count: 4, scoredCount: 4 }],
  ['Slice of Life', { average: 5.0, adjustedAverage: 5.0, count: 2, scoredCount: 2 }],
])

const mockRecommendations = [
  {
    id: 1,
    title: 'Made in Abyss',
    coverImage: 'https://img.example.com/mia.jpg',
    genres: ['Adventure', 'Fantasy'],
    predictedScore: 7.8,
    communityScore: 8.4,
  },
  {
    id: 2,
    title: 'Steins;Gate',
    coverImage: 'https://img.example.com/sg.jpg',
    genres: ['Drama', 'Sci-Fi'],
    predictedScore: 8.5,
    communityScore: 9.1,
  },
]

describe('Dashboard', () => {
  it('renders the username in the header', () => {
    render(
      <Dashboard
        tasteProfile={mockProfile}
        recommendations={mockRecommendations}
        username="testuser"
        onLogout={() => {}}
        isLoading={false}
      />
    )

    expect(screen.getByText('testuser')).toBeInTheDocument()
  })

  it('renders top 5 genre badges sorted by average', () => {
    render(
      <Dashboard
        tasteProfile={mockProfile}
        recommendations={mockRecommendations}
        username="testuser"
        onLogout={() => {}}
        isLoading={false}
      />
    )

    expect(screen.getAllByText(/Adventure/)[0]).toBeInTheDocument()
    expect(screen.getAllByText(/Drama/)[0]).toBeInTheDocument()
    expect(screen.getByText(/Action/)).toBeInTheDocument()
    // "Slice of Life" is the 6th genre, should NOT appear (top 5 only)
    expect(screen.queryByText(/Slice of Life/)).not.toBeInTheDocument()
  })

  it('renders recommendation cards', () => {
    render(
      <Dashboard
        tasteProfile={mockProfile}
        recommendations={mockRecommendations}
        username="testuser"
        onLogout={() => {}}
        isLoading={false}
      />
    )

    expect(screen.getByText('Made in Abyss')).toBeInTheDocument()
    expect(screen.getByText('Steins;Gate')).toBeInTheDocument()
  })

  it('calls onLogout when the logout button is clicked', () => {
    const onLogout = vi.fn()
    render(
      <Dashboard
        tasteProfile={mockProfile}
        recommendations={mockRecommendations}
        username="testuser"
        onLogout={onLogout}
        isLoading={false}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /trocar conta/i }))

    expect(onLogout).toHaveBeenCalled()
  })

  it('renders skeleton cards when loading', () => {
    const { container } = render(
      <Dashboard
        tasteProfile={new Map()}
        recommendations={[]}
        username="testuser"
        onLogout={() => {}}
        isLoading={true}
      />
    )

    const skeletons = container.querySelectorAll('.skeleton')
    expect(skeletons.length).toBeGreaterThan(0)
  })
})
