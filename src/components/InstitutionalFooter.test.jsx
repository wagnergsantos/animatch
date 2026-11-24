import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InstitutionalFooter from './InstitutionalFooter.jsx'

describe('InstitutionalFooter', () => {
  it('renders institutional anchor links with hrefs and intercepts click to open modal when onOpenLegalModal is provided', () => {
    const onOpenLegalModal = vi.fn()
    render(<InstitutionalFooter onOpenLegalModal={onOpenLegalModal} />)

    const sobreLink = screen.getByRole('link', { name: 'Sobre' })
    const privacidadeLink = screen.getByRole('link', { name: 'Política de Privacidade' })
    const termosLink = screen.getByRole('link', { name: 'Termos de Uso' })
    const githubLink = screen.getByRole('link', { name: 'GitHub' })

    expect(sobreLink).toHaveAttribute('href', '/sobre.html')
    expect(privacidadeLink).toHaveAttribute('href', '/privacidade.html')
    expect(termosLink).toHaveAttribute('href', '/termos.html')
    expect(githubLink).toHaveAttribute('href', 'https://github.com/wagnergsantos/animatch')

    fireEvent.click(sobreLink)
    expect(onOpenLegalModal).toHaveBeenCalledWith('sobre')

    fireEvent.click(privacidadeLink)
    expect(onOpenLegalModal).toHaveBeenCalledWith('privacidade')

    fireEvent.click(termosLink)
    expect(onOpenLegalModal).toHaveBeenCalledWith('termos')
  })

  it('renders standard links without interception when onOpenLegalModal is null', () => {
    render(<InstitutionalFooter onOpenLegalModal={null} />)

    expect(screen.getByRole('link', { name: 'Sobre' })).toHaveAttribute('href', '/sobre.html')
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade.html')
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos.html')
  })
})
