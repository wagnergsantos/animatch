import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ThemeToggle from './ThemeToggle.jsx'

describe('ThemeToggle', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  it('renders theme toggle button and toggles between dark and light', () => {
    render(<ThemeToggle />)
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()

    // Toggle theme
    fireEvent.click(button)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    fireEvent.click(button)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })
})
