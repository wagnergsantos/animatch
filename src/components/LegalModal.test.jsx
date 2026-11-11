import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LegalModal from './LegalModal.jsx'

describe('LegalModal', () => {
  it('renders nothing when isOpen is false', () => {
    const { container } = render(<LegalModal isOpen={false} onClose={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the 4 legal/privacy sections when isOpen is true and closes on Escape or close button', () => {
    const onClose = vi.fn()
    render(<LegalModal isOpen={true} onClose={onClose} />)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Sobre.*Direitos Autorais/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Privacidade.*Dados/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Termos.*Idade Mínima/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /Contato.*Código-Fonte/i })).toBeInTheDocument()

    // Mentions 16+ age requirement and API attributions
    expect(screen.getByText(/16 anos/i)).toBeInTheDocument()
    expect(screen.getByText(/AniList, Kitsu e MyAnimeList/i)).toBeInTheDocument()

    const closeBtn = screen.getByRole('button', { name: /Fechar/i })
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledTimes(1)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })
})
