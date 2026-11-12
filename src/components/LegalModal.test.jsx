import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LegalModal from './LegalModal.jsx'

describe('LegalModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<LegalModal isOpen={false} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the 3 legal tabs and allows switching between Sobre, Privacidade and Termos', () => {
    const onClose = vi.fn()
    render(<LegalModal isOpen={true} onClose={onClose} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()

    // 3 tabs present
    const aboutTab = screen.getByRole('tab', { name: /Sobre o AniMatch/i })
    const privacyTab = screen.getByRole('tab', { name: /Política de Privacidade/i })
    const termsTab = screen.getByRole('tab', { name: /Termos de Uso/i })
    expect(aboutTab).toBeInTheDocument()
    expect(privacyTab).toBeInTheDocument()
    expect(termsTab).toBeInTheDocument()

    // Initially on "Sobre" tab
    expect(screen.getByRole('heading', { name: /1\. O que é o AniMatch/i })).toBeInTheDocument()
    expect(screen.getAllByText(/AniList, Kitsu e MyAnimeList/i).length).toBeGreaterThanOrEqual(1)

    // Switch to "Privacidade" tab
    fireEvent.click(privacyTab)
    expect(screen.getByRole('heading', { name: /1\. Responsável pelo tratamento/i })).toBeInTheDocument()
    expect(screen.getByText(/Wagner Santos/i)).toBeInTheDocument()
    expect(screen.getAllByText(/IndexedDB/i).length).toBeGreaterThanOrEqual(1)

    // Switch to "Termos" tab
    fireEvent.click(termsTab)
    expect(screen.getByRole('heading', { name: /4\. Idade mínima/i })).toBeInTheDocument()
    expect(screen.getAllByText(/16 anos/i).length).toBeGreaterThanOrEqual(1)

    // Close button & Escape key
    const closeBtn = screen.getByRole('button', { name: /Fechar/i })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
