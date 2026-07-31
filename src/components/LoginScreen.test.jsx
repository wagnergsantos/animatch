import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LoginScreen from './LoginScreen.jsx'

describe('LoginScreen', () => {
  it('renders username input and submit button', () => {
    render(<LoginScreen onSubmit={() => {}} isLoading={false} error={null} />)

    expect(screen.getByLabelText('Username do AniList')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /gerar recomendações/i })).toBeInTheDocument()
  })

  it('calls onSubmit with the username when form is submitted', () => {
    const onSubmit = vi.fn()
    render(<LoginScreen onSubmit={onSubmit} isLoading={false} error={null} />)

    fireEvent.change(screen.getByLabelText('Username do AniList'), {
      target: { value: 'testuser' },
    })
    fireEvent.click(screen.getByRole('button', { name: /gerar recomendações/i }))

    expect(onSubmit).toHaveBeenCalledWith('testuser')
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

    expect(onSubmit).toHaveBeenCalledWith('testuser')
  })

  it('disables the button and input when loading', () => {
    render(<LoginScreen onSubmit={() => {}} isLoading={true} error={null} />)

    const button = screen.getByRole('button')
    const input = screen.getByLabelText('Username do AniList')
    expect(button).toBeDisabled()
    expect(input).toBeDisabled()
    expect(button.querySelector('.login-spinner')).toBeInTheDocument()
  })

  it('displays an error message when error prop is set', () => {
    render(<LoginScreen onSubmit={() => {}} isLoading={false} error="Usuário não encontrado no AniList." />)

    expect(screen.getByRole('alert')).toHaveTextContent('Usuário não encontrado no AniList.')
  })
})
