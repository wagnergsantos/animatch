import { useRef, useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useModalFocusTrap } from './useModalFocusTrap.js'

function TestModalApp() {
  const [open, setOpen] = useState(false)
  const modalRef = useRef(null)
  useModalFocusTrap(open, modalRef, () => setOpen(false))

  return (
    <div>
      <button type="button" data-testid="open-btn" onClick={() => setOpen(true)}>
        Abrir Modal
      </button>
      {open && (
        <div ref={modalRef} role="dialog" tabIndex={-1}>
          <button type="button" data-testid="first-btn">Primeiro</button>
          <button type="button" data-testid="last-btn" onClick={() => setOpen(false)}>Último</button>
        </div>
      )}
    </div>
  )
}

describe('useModalFocusTrap', () => {
  it('traps Tab and Shift+Tab inside modal and restores focus to trigger on close', () => {
    render(<TestModalApp />)
    const openBtn = screen.getByTestId('open-btn')
    openBtn.focus()
    expect(document.activeElement).toBe(openBtn)

    fireEvent.click(openBtn)

    const firstBtn = screen.getByTestId('first-btn')
    const lastBtn = screen.getByTestId('last-btn')
    expect(document.activeElement).toBe(firstBtn)

    // Shift+Tab on first element wraps to last element
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(lastBtn)

    // Tab on last element wraps to first element
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: false })
    expect(document.activeElement).toBe(firstBtn)

    // Escape closes and restores focus to openBtn
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(document.activeElement).toBe(openBtn)
  })
})
