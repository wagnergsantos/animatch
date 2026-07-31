import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import App from './App.jsx'

// Mock the API module
vi.mock('./api/anilist.js', () => ({
  fetchCompletedList: vi.fn(),
  fetchPlanningList: vi.fn(),
}))

import { fetchCompletedList, fetchPlanningList } from './api/anilist.js'

const completedData = [
  { score: 9, media: { id: 1, title: { romaji: 'A', english: 'A' }, genres: ['Adventure', 'Fantasy'], coverImage: { large: '' } } },
  { score: 8, media: { id: 2, title: { romaji: 'B', english: 'B' }, genres: ['Adventure', 'Drama'], coverImage: { large: '' } } },
  { score: 5, media: { id: 3, title: { romaji: 'C', english: 'C' }, genres: ['Action'], coverImage: { large: '' } } },
  { score: 4, media: { id: 4, title: { romaji: 'D', english: 'D' }, genres: ['Action'], coverImage: { large: '' } } },
]

const planningData = [
  { media: { id: 10, title: { romaji: 'Rec1', english: 'Rec1' }, genres: ['Adventure'], coverImage: { large: 'r1.jpg' }, averageScore: 85, popularity: 100 } },
  { media: { id: 11, title: { romaji: 'Rec2', english: 'Rec2' }, genres: ['Action'], coverImage: { large: 'r2.jpg' }, averageScore: 70, popularity: 50 } },
]

beforeEach(() => {
  fetchCompletedList.mockReset()
  fetchPlanningList.mockReset()
})

describe('App', () => {
  it('shows login screen initially', () => {
    render(<App />)

    expect(screen.getByLabelText('Username do AniList')).toBeInTheDocument()
  })

  it('transitions to dashboard after successful login', async () => {
    fetchCompletedList.mockResolvedValueOnce(completedData)
    fetchPlanningList.mockResolvedValueOnce(planningData)

    render(<App />)

    fireEvent.change(screen.getByLabelText('Username do AniList'), {
      target: { value: 'testuser' },
    })
    fireEvent.click(screen.getByRole('button', { name: /gerar recomendações/i }))

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })

    expect(screen.getByText('Rec1')).toBeInTheDocument()
  })

  it('shows error on login screen when API fails', async () => {
    fetchCompletedList.mockRejectedValueOnce(new Error('Usuário não encontrado no AniList.'))

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
    fetchCompletedList.mockResolvedValueOnce(completedData)
    fetchPlanningList.mockResolvedValueOnce(planningData)

    render(<App />)

    fireEvent.change(screen.getByLabelText('Username do AniList'), {
      target: { value: 'testuser' },
    })
    fireEvent.click(screen.getByRole('button', { name: /gerar recomendações/i }))

    await waitFor(() => {
      expect(screen.getByText('testuser')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /trocar conta/i }))

    expect(screen.getByLabelText('Username do AniList')).toBeInTheDocument()
  })

  it('shows error when completed list has no scored anime', async () => {
    fetchCompletedList.mockResolvedValueOnce([
      { score: 0, media: { id: 1, title: { romaji: 'X', english: 'X' }, genres: ['Action'], coverImage: { large: '' } } },
    ])
    fetchPlanningList.mockResolvedValueOnce(planningData)

    render(<App />)

    fireEvent.change(screen.getByLabelText('Username do AniList'), {
      target: { value: 'testuser' },
    })
    fireEvent.click(screen.getByRole('button', { name: /gerar recomendações/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Avalie mais animes no AniList')
    })
  })

  it('shows error when planning list is empty', async () => {
    fetchCompletedList.mockResolvedValueOnce(completedData)
    fetchPlanningList.mockResolvedValueOnce([])

    render(<App />)

    fireEvent.change(screen.getByLabelText('Username do AniList'), {
      target: { value: 'testuser' },
    })
    fireEvent.click(screen.getByRole('button', { name: /gerar recomendações/i }))

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent("Adicione animes à sua lista 'Planning'")
    })
  })
})
