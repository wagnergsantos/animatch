import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import WrappedModal from '../components/WrappedModal.jsx'
import * as wrappedGenerator from '../logic/wrappedGenerator.js'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, fallback) => (typeof fallback === 'string' ? fallback : key),
  }),
}))

describe('WrappedModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(wrappedGenerator, 'renderWrappedCanvas').mockResolvedValue()
    vi.spyOn(wrappedGenerator, 'downloadWrappedPng').mockResolvedValue(new Blob())
    vi.spyOn(wrappedGenerator, 'copyWrappedPngToClipboard').mockResolvedValue(true)
  })

  it('does not render when isOpen is false', () => {
    const { container } = render(<WrappedModal isOpen={false} onClose={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders canvas and action buttons when open, and triggers download and copy actions', async () => {
    const onClose = vi.fn()
    const writeText = vi.fn().mockResolvedValue()
    Object.assign(navigator, {
      clipboard: { writeText },
    })

    render(
      <WrappedModal
        isOpen={true}
        onClose={onClose}
        username="wagner"
        providerLabel="AniList"
        entries={[{ id: 1, status: 'COMPLETED', score: 9, episodes: 12 }]}
        tasteProfile={new Map([['Action', { adjustedAverage: 8.5, count: 5 }]])}
        recommendations={[{ id: 10, title: 'Steins;Gate', predictedScore: 9.2 }]}
      />
    )

    expect(screen.getByRole('dialog')).toBeTruthy()
    await waitFor(() => {
      expect(wrappedGenerator.renderWrappedCanvas).toHaveBeenCalled()
    })

    const downloadBtn = screen.getByTestId('wrapped-download-btn')
    fireEvent.click(downloadBtn)
    await waitFor(() => {
      expect(wrappedGenerator.downloadWrappedPng).toHaveBeenCalled()
    })

    const copyImgBtn = screen.getByTestId('wrapped-copy-image-btn')
    fireEvent.click(copyImgBtn)
    await waitFor(() => {
      expect(wrappedGenerator.copyWrappedPngToClipboard).toHaveBeenCalled()
    })

    const copyLinkBtn = screen.getByTestId('wrapped-copy-link-btn')
    fireEvent.click(copyLinkBtn)
    await waitFor(() => {
      expect(writeText).toHaveBeenCalled()
    })
  })
})
