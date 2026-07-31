import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Dashboard from './Dashboard.jsx'

vi.mock('../api/anilist.js', () => ({
  fetchDubInfo: vi.fn().mockResolvedValue(new Map()),
}))

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

  it('renders recommendation cards and opens window on click', async () => {
    window.open = vi.fn()
    render(<Dashboard allEntries={mockEntries} username="testuser" onLogout={vi.fn()} />)
    
    // Wait for the skeleton to disappear
    await waitFor(() => {
      expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument()
    })

    expect(screen.getByText('Steins;Gate')).toBeInTheDocument()

    const article = screen.getByText('Made in Abyss').closest('article')
    fireEvent.click(article)
    expect(window.open).toHaveBeenCalledWith('https://anilist.co/anime/10', '_blank', 'noopener,noreferrer')
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

  it('renders force refresh button and calls onRefresh when clicked', () => {
    const onRefresh = vi.fn()
    render(
      <Dashboard
        allEntries={mockEntries}
        username="testuser"
        onLogout={vi.fn()}
        onRefresh={onRefresh}
        isLoading={false}
      />
    )

    const refreshButton = screen.getByRole('button', { name: /atualizar lista/i })
    expect(refreshButton).toBeInTheDocument()
    expect(refreshButton).not.toBeDisabled()

    fireEvent.click(refreshButton)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('disables force refresh button and shows updating state when isLoading is true', () => {
    render(
      <Dashboard
        allEntries={mockEntries}
        username="testuser"
        onLogout={vi.fn()}
        onRefresh={vi.fn()}
        isLoading={true}
      />
    )

    const refreshButton = screen.getByRole('button', { name: /atualizando/i })
    expect(refreshButton).toBeInTheDocument()
    expect(refreshButton).toBeDisabled()
  })
})
