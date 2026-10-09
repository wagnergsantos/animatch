import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import FloatingRandomizerButton from './FloatingRandomizerButton.jsx'

describe('FloatingRandomizerButton', () => {
  it('renders button with icon and localized title/aria-label', () => {
    const handleClick = vi.fn()
    render(<FloatingRandomizerButton onClick={handleClick} />)

    const btn = screen.getByRole('button', { name: /escolha|choose/i })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('aria-label')
    expect(btn.textContent).toMatch(/🎲|✨/)
  })

  it('handles click event and calls onClick', () => {
    const handleClick = vi.fn()
    render(<FloatingRandomizerButton onClick={handleClick} />)

    const btn = screen.getByRole('button', { name: /escolha|choose/i })
    fireEvent.click(btn)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('respects disabled state and cannot be clicked when disabled', () => {
    const handleClick = vi.fn()
    render(<FloatingRandomizerButton onClick={handleClick} disabled={true} />)

    const btn = screen.getByRole('button', { name: /escolha|choose/i })
    expect(btn).toBeDisabled()
    fireEvent.click(btn)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('renders count badge when count is provided and positive', () => {
    render(<FloatingRandomizerButton onClick={vi.fn()} count={42} />)

    expect(screen.getByText('42')).toBeInTheDocument()
  })
})
