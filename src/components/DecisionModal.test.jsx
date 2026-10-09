import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DecisionModal from './DecisionModal.jsx'

const sampleRecs = [
  {
    id: 1,
    title: 'Steins;Gate',
    titleObj: { english: 'Steins;Gate', romaji: 'Steins;Gate' },
    predictedScore: 9.5,
    communityScore: 9.0,
    genres: ['Sci-Fi', 'Thriller'],
    format: 'TV',
    episodes: 24,
    streamingLinks: [
      { site: 'Crunchyroll', url: 'https://crunchyroll.com/steinsgate' },
    ],
    coverImage: 'https://img.test/steins.jpg',
    predictionSource: 'taste',
    matchingGenres: [{ genre: 'Sci-Fi', score: 9.5 }],
  },
  {
    id: 2,
    title: 'Death Note',
    titleObj: { english: 'Death Note', romaji: 'Death Note' },
    predictedScore: 8.8,
    communityScore: 8.7,
    genres: ['Mystery', 'Supernatural'],
    format: 'TV',
    episodes: 37,
    streamingLinks: [
      { site: 'Netflix', url: 'https://netflix.com/deathnote' },
    ],
    coverImage: 'https://img.test/deathnote.jpg',
  },
]

describe('DecisionModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(
      <DecisionModal
        isOpen={false}
        onClose={vi.fn()}
        recommendations={sampleRecs}
      />
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders modal dialog when isOpen is true with mode selector tabs and description', () => {
    render(
      <DecisionModal
        isOpen={true}
        onClose={vi.fn()}
        recommendations={sampleRecs}
        subscriptions={['Crunchyroll']}
        titlePref="english"
      />
    )

    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()

    // Mode tabs
    expect(screen.getByRole('tab', { name: /Melhor Escolha|Best Match/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Surpreenda|Surprise/i })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Quero Começar Hoje|Start Today/i })).toBeInTheDocument()

    // Anime details
    expect(screen.getByText('Steins;Gate')).toBeInTheDocument()
    expect(screen.getByText(/95%/)).toBeInTheDocument()
    expect(screen.getByText(/24\s*(ep|eps)/i)).toBeInTheDocument()
    expect(screen.getByText('TV')).toBeInTheDocument()
  })

  it('displays streaming link with target="_blank" and rel="noopener noreferrer"', () => {
    render(
      <DecisionModal
        isOpen={true}
        onClose={vi.fn()}
        recommendations={sampleRecs}
        subscriptions={['Crunchyroll']}
        titlePref="english"
      />
    )

    const link = screen.getByRole('link', { name: /Crunchyroll/i })
    expect(link).toHaveAttribute('href', 'https://crunchyroll.com/steinsgate')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'))
  })

  it('allows switching mode tabs and updates the selected anime accordingly', () => {
    render(
      <DecisionModal
        isOpen={true}
        onClose={vi.fn()}
        recommendations={sampleRecs}
        subscriptions={['Crunchyroll']}
        titlePref="english"
      />
    )

    const quickTab = screen.getByRole('tab', { name: /Quero Começar Hoje|Start Today/i })
    fireEvent.click(quickTab)
    expect(quickTab).toHaveAttribute('aria-selected', 'true')
  })

  it('triggers a new decision draw when clicking "Sortear outro" / "Pick another"', () => {
    render(
      <DecisionModal
        isOpen={true}
        onClose={vi.fn()}
        recommendations={sampleRecs}
        subscriptions={['Crunchyroll']}
        titlePref="english"
      />
    )

    const pickAnotherBtn = screen.getByRole('button', { name: /Sortear outro|Pick another/i })
    expect(pickAnotherBtn).toBeInTheDocument()
    fireEvent.click(pickAnotherBtn)
  })

  it('handles empty recommendations state gracefully', () => {
    render(
      <DecisionModal
        isOpen={true}
        onClose={vi.fn()}
        recommendations={[]}
        subscriptions={[]}
      />
    )

    expect(screen.getByText(/Nenhum anime|No anime/i)).toBeInTheDocument()
  })

  it('calls onClose when close button or overlay is clicked', () => {
    const handleClose = vi.fn()
    render(
      <DecisionModal
        isOpen={true}
        onClose={handleClose}
        recommendations={sampleRecs}
      />
    )

    const closeBtn = screen.getByLabelText(/Fechar/i)
    fireEvent.click(closeBtn)
    expect(handleClose).toHaveBeenCalled()

    const overlay = screen.getByTestId('decision-modal-overlay')
    fireEvent.click(overlay)
    expect(handleClose).toHaveBeenCalledTimes(2)
  })

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn()
    render(
      <DecisionModal
        isOpen={true}
        onClose={handleClose}
        recommendations={sampleRecs}
      />
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  it('calls onSelectAnime when anime card or action is clicked if callback provided', () => {
    const handleSelect = vi.fn()
    render(
      <DecisionModal
        isOpen={true}
        onClose={vi.fn()}
        recommendations={sampleRecs}
        onSelectAnime={handleSelect}
      />
    )

    const detailsBtn = screen.getByRole('button', { name: /Expandir detalhes|Ver detalhes|details|Steins;Gate/i })
    fireEvent.click(detailsBtn)
    expect(handleSelect).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })
})
