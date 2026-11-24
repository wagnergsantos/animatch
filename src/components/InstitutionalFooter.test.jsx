import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import InstitutionalFooter from './InstitutionalFooter.jsx'

describe('InstitutionalFooter', () => {
  it('renders institutional links as buttons when onOpenLegalModal is provided', () => {
    const onOpenLegalModal = vi.fn()
    render(<InstitutionalFooter onOpenLegalModal={onOpenLegalModal} />)

    const sobreBtn = screen.getByRole('button', { name: 'Sobre' })
    const privacidadeBtn = screen.getByRole('button', { name: 'Política de Privacidade' })
    const termosBtn = screen.getByRole('button', { name: 'Termos de Uso' })
    const githubLink = screen.getByRole('link', { name: 'GitHub' })

    expect(sobreBtn).toBeInTheDocument()
    expect(privacidadeBtn).toBeInTheDocument()
    expect(termosBtn).toBeInTheDocument()
    expect(githubLink).toHaveAttribute('href', 'https://github.com/wagnergsantos/animatch')

    fireEvent.click(sobreBtn)
    expect(onOpenLegalModal).toHaveBeenCalledWith('sobre')

    fireEvent.click(privacidadeBtn)
    expect(onOpenLegalModal).toHaveBeenCalledWith('privacidade')

    fireEvent.click(termosBtn)
    expect(onOpenLegalModal).toHaveBeenCalledWith('termos')
  })

  it('renders fallback links to html files when onOpenLegalModal is not provided', () => {
    render(<InstitutionalFooter onOpenLegalModal={null} />)

    expect(screen.getByRole('link', { name: 'Sobre' })).toHaveAttribute('href', '/sobre.html')
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade.html')
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos.html')
  })
})
