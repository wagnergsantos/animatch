import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Dashboard from './Dashboard.jsx'

const mockEntries = [
  { status: 'COMPLETED', score: 9, media: { id: 1, title: { romaji: 'A', english: 'A' }, genres: ['Adventure', 'Fantasy'] } },
  { status: 'COMPLETED', score: 8, media: { id: 2, title: { romaji: 'B', english: 'B' }, genres: ['Adventure', 'Drama'] } },
  { status: 'COMPLETED', score: 5, media: { id: 3, title: { romaji: 'C', english: 'C' }, genres: ['Action'] } },
  { status: 'COMPLETED', score: 4, media: { id: 4, title: { romaji: 'D', english: 'D' }, genres: ['Action'] } },
  { status: 'PLANNING', media: { id: 10, title: { romaji: 'Made in Abyss', english: 'Made in Abyss' }, genres: ['Adventure'], averageScore: 84, siteUrl: 'https://anilist.co/anime/10' } },
  { status: 'PLANNING', media: { id: 11, title: { romaji: 'Steins;Gate', english: 'Steins;Gate' }, genres: ['Drama'], averageScore: 91, siteUrl: 'https://anilist.co/anime/11' } },
]

describe('Dashboard', () => {
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

  it('renders recommendation cards as links opening in a new tab', () => {
    render(
      <Dashboard
        allEntries={mockEntries}
        username="testuser"
        onLogout={() => {}}
      />
    )

    expect(screen.getByText('Made in Abyss')).toBeInTheDocument()
    expect(screen.getByText('Steins;Gate')).toBeInTheDocument()
    
    const link1 = screen.getByRole('link', { name: /Made in Abyss/i })
    expect(link1).toHaveAttribute('href', 'https://anilist.co/anime/10')
    expect(link1).toHaveAttribute('target', '_blank')
    expect(link1).toHaveAttribute('rel', 'noopener noreferrer')

    const link2 = screen.getByRole('link', { name: /Steins;Gate/i })
    expect(link2).toHaveAttribute('href', 'https://anilist.co/anime/11')
    expect(link2).toHaveAttribute('target', '_blank')
    expect(link2).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('calls onLogout when the logout button is clicked', () => {
    const onLogout = vi.fn()
    render(
      <Dashboard
        allEntries={mockEntries}
        username="testuser"
        onLogout={onLogout}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /trocar conta/i }))

    expect(onLogout).toHaveBeenCalled()
  })
})
