import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LoginScreen from './LoginScreen.jsx'

describe('LoginScreen', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders username input and submit button', () => {
    render(<LoginScreen onSubmit={() => {}} isLoading={false} error={null} />)

    expect(screen.getByLabelText('Username do AniList')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gerar recomendações/i })).toBeInTheDocument()
  })

  it('calls onSubmit with the username and default provider when form is submitted', () => {
    const onSubmit = vi.fn()
    render(<LoginScreen onSubmit={onSubmit} isLoading={false} error={null} />)

    fireEvent.change(screen.getByLabelText('Username do AniList'), {
      target: { value: 'testuser' },
    })
    fireEvent.click(screen.getByRole('button', { name: /gerar recomendações/i }))

    expect(onSubmit).toHaveBeenCalledWith('testuser', 'anilist')
  })

  it('does not call onSubmit when username is empty', () => {
    const onSubmit = vi.fn()
    render(<LoginScreen onSubmit={onSubmit} isLoading={false} error={null} />)

    fireEvent.click(screen.getByRole('button', { name: /gerar recomendações/i }))

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('trims whitespace from username on submit', () => {
    const onSubmit = vi.fn()
    render(<LoginScreen onSubmit={onSubmit} isLoading={false} error={null} />)

    fireEvent.change(screen.getByLabelText('Username do AniList'), {
      target: { value: '  testuser  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: /gerar recomendações/i }))

    expect(onSubmit).toHaveBeenCalledWith('testuser', 'anilist')
  })

  it('disables the button and input when loading', () => {
    render(<LoginScreen onSubmit={() => {}} isLoading={true} error={null} />)

    const button = screen.getByRole('button', { name: /carregando/i })
    const input = screen.getByLabelText('Username do AniList')
    expect(button).toBeDisabled()
    expect(input).toBeDisabled()
    expect(button.querySelector('.login-spinner')).toBeInTheDocument()
  })

  it('displays an error message when error prop is set', () => {
    render(<LoginScreen onSubmit={() => {}} isLoading={false} error="Usuário não encontrado no AniList." />)

    expect(screen.getByRole('alert')).toHaveTextContent('Usuário não encontrado no AniList.')
  })

  it('renders provider pills and defaults to AniList', () => {
    render(<LoginScreen onSubmit={() => {}} isLoading={false} error={null} />)
    
    const anilistBtn = screen.getByRole('button', { name: 'AniList' })
    const kitsuBtn = screen.getByRole('button', { name: 'Kitsu' })
    
    expect(anilistBtn).toBeInTheDocument()
    expect(kitsuBtn).toBeInTheDocument()
    expect(anilistBtn).toHaveClass('provider-pill--active')
    expect(kitsuBtn).not.toHaveClass('provider-pill--active')
  })

  it('changes dynamic placeholder when provider changes', () => {
    render(<LoginScreen onSubmit={() => {}} isLoading={false} error={null} />)
    
    expect(screen.getByPlaceholderText('Seu usuário no AniList...')).toBeInTheDocument()
    
    fireEvent.click(screen.getByRole('button', { name: 'Kitsu' }))
    
    expect(screen.getByPlaceholderText('Seu usuário no Kitsu...')).toBeInTheDocument()
    expect(screen.getByLabelText('Username do Kitsu')).toBeInTheDocument()
  })

  it('persists selected provider in localStorage and submits correct provider', () => {
    const onSubmit = vi.fn()
    render(<LoginScreen onSubmit={onSubmit} isLoading={false} error={null} />)
    
    fireEvent.click(screen.getByRole('button', { name: 'Kitsu' }))
    
    expect(localStorage.getItem('animatch_provider')).toBe('kitsu')
    
    fireEvent.change(screen.getByLabelText('Username do Kitsu'), {
      target: { value: 'testuser' },
    })
    fireEvent.click(screen.getByRole('button', { name: /gerar recomendações/i }))

    expect(onSubmit).toHaveBeenCalledWith('testuser', 'kitsu')
  })

  it('restores provider from localStorage on mount', () => {
    localStorage.setItem('animatch_provider', 'kitsu')
    render(<LoginScreen onSubmit={() => {}} isLoading={false} error={null} />)
    
    expect(screen.getByRole('button', { name: 'Kitsu' })).toHaveClass('provider-pill--active')
    expect(screen.getByPlaceholderText('Seu usuário no Kitsu...')).toBeInTheDocument()
  })
})
