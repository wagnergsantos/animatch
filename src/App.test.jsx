import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App.jsx'

// Mock the API module
vi.mock('./api/index.js', () => ({
  fetchUserEntries: vi.fn(),
}))

import { fetchUserEntries } from './api/index.js'

const allData = [
  { status: 'COMPLETED', score: 9, media: { id: 1, title: { romaji: 'A', english: 'A' }, genres: ['Adventure', 'Fantasy'], coverImage: { large: '' } } },
  { status: 'COMPLETED', score: 8, media: { id: 2, title: { romaji: 'B', english: 'B' }, genres: ['Adventure', 'Drama'], coverImage: { large: '' } } },
  { status: 'COMPLETED', score: 5, media: { id: 3, title: { romaji: 'C', english: 'C' }, genres: ['Action'], coverImage: { large: '' } } },
  { status: 'COMPLETED', score: 4, media: { id: 4, title: { romaji: 'D', english: 'D' }, genres: ['Action'], coverImage: { large: '' } } },
  { status: 'PLANNING', media: { id: 10, title: { romaji: 'Rec1', english: 'Rec1' }, genres: ['Adventure'], coverImage: { large: 'r1.jpg' }, averageScore: 85, popularity: 100 } },
  { status: 'PLANNING', media: { id: 11, title: { romaji: 'Rec2', english: 'Rec2' }, genres: ['Action'], coverImage: { large: 'r2.jpg' }, averageScore: 70, popularity: 50 } },
]

beforeEach(() => {
  fetchUserEntries.mockReset()
  window.localStorage.clear()
  if (typeof window !== 'undefined' && window.history) {
    window.history.replaceState({}, '', '/')
  }
})

describe('App', () => {
  it('shows login screen initially', () => {
    render(<App />)

    expect(screen.getByLabelText('Username do AniList')).toBeInTheDocument()
  })

  it('transitions to dashboard after successful login', async () => {
    fetchUserEntries.mockResolvedValueOnce(allData)

    render(<App />)

    fireEvent.change(screen.getByLabelText('Username do AniList'), {
      target: { value: 'testuser' },
    })
    fireEvent.click(screen.getByRole('button', { name: /gerar recomendações/i }))

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })

    expect(window.location.search).toContain('user=testuser')
    expect(window.location.search).toContain('provider=anilist')

    expect(screen.getByText('Rec1')).toBeInTheDocument()
    expect(screen.getByText('Match: 7.00/10')).toBeInTheDocument()
    expect(screen.getByText('Comunidade: 8.50/10')).toBeInTheDocument()
  })

  it('shows error on login screen when API fails', async () => {
    fetchUserEntries.mockRejectedValueOnce(new Error('Usuário não encontrado no AniList.'))

    render(<App />)

    fireEvent.change(screen.getByLabelText('Username do AniList'), {
      target: { value: 'baduser' },
    })
    fireEvent.click(screen.getByRole('button', { name: /gerar recomendações/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Usuário não encontrado no AniList.')
    })
  })

  it('returns to login screen when logout is clicked', async () => {
    fetchUserEntries.mockResolvedValueOnce(allData)

    render(<App />)

    fireEvent.change(screen.getByLabelText('Username do AniList'), {
      target: { value: 'testuser' },
    })
    fireEvent.click(screen.getByRole('button', { name: /gerar recomendações/i }))

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    fireEvent.click(screen.getByRole('button', { name: /trocar de conta/i }))

    expect(screen.getByLabelText('Username do AniList')).toBeInTheDocument()
    expect(window.location.search).not.toContain('user=')
    expect(window.location.search).not.toContain('provider=')
  })

  it('shows error when planning list is empty', async () => {
    fetchUserEntries.mockResolvedValueOnce(allData.filter(e => e.status !== 'PLANNING'))

    render(<App />)

    fireEvent.change(screen.getByLabelText('Username do AniList'), {
      target: { value: 'testuser' },
    })
    fireEvent.click(screen.getByRole('button', { name: /gerar recomendações/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent("Adicione animes à sua lista 'Plan to Watch' no AniList")
    })
  })
  it('calls fetchAllLists with forceRefresh: true when handleRefresh is triggered', async () => {
    fetchUserEntries.mockResolvedValue(allData)

    render(<App />)

    fireEvent.change(screen.getByLabelText('Username do AniList'), {
      target: { value: 'testuser' },
    })
    fireEvent.click(screen.getByRole('button', { name: /gerar recomendações/i }))

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })

    expect(fetchUserEntries).toHaveBeenCalledWith('testuser', 'anilist', {})

    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    fireEvent.click(screen.getByRole('button', { name: /sincronizar anilist/i }))

    await waitFor(() => {
      expect(fetchUserEntries).toHaveBeenCalledWith('testuser', 'anilist', { forceRefresh: true })
    })
  })

  it('auto-logins when ?user=testuser&provider=kitsu is in URL', async () => {
    fetchUserEntries.mockResolvedValueOnce(allData)
    window.history.replaceState({}, '', '/?user=testuser&provider=kitsu')
    
    render(<App />)
    
    await waitFor(() => {
      expect(fetchUserEntries).toHaveBeenCalledWith('testuser', 'kitsu', {})
    })
    
    expect(screen.getByText('testuser')).toBeInTheDocument()
  })

  it('fills username input but does not auto-login when ?user=testuser is in URL without provider', async () => {
    window.history.replaceState({}, '', '/?user=testuser')
    
    render(<App />)
    
    // fetchUserEntries should NOT be called
    expect(fetchUserEntries).not.toHaveBeenCalled()
    
    // The username input should have the value
    const input = await screen.findByDisplayValue('testuser')
    expect(input).toBeInTheDocument()
  })
})


