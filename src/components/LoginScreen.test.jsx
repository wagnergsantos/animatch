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
    expect(button.querySelector('[data-testid="login-spinner"]')).toBeInTheDocument()
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
    expect(anilistBtn.className).toMatch(/provider-pill--active/)
    expect(kitsuBtn.className).not.toMatch(/provider-pill--active/)
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
    localStorage.setItem('animatch_provider', JSON.stringify('kitsu'))
    render(<LoginScreen onSubmit={() => {}} isLoading={false} error={null} />)
    
    expect(screen.getByRole('button', { name: 'Kitsu' }).className).toMatch(/provider-pill--active/)
    expect(screen.getByPlaceholderText('Seu usuário no Kitsu...')).toBeInTheDocument()
  })

  it('renders recent users with provider label and handles click', () => {
    const onSubmit = vi.fn()
    const recent = [
      { username: 'user1', provider: 'anilist' },
      { username: 'user2', provider: 'kitsu' },
    ]
    render(<LoginScreen onSubmit={onSubmit} isLoading={false} error={null} recentUsers={recent} />)

    const btn1 = screen.getByRole('button', { name: '@user1 (AniList)' })
    const btn2 = screen.getByRole('button', { name: '@user2 (Kitsu)' })

    expect(btn1).toBeInTheDocument()
    expect(btn2).toBeInTheDocument()

    fireEvent.click(btn2)
    expect(onSubmit).toHaveBeenCalledWith('user2', 'kitsu')
  })
})
