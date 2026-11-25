import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Prende o foco de teclado (Tab / Shift+Tab) dentro de um modal aberto,
 * fecha ao pressionar Escape, trava a rolagem do body de fundo
 * e restaura o foco ao elemento acionador (ou ao triggerRef) ao fechar.
 *
 * @param {boolean} isOpen
 * @param {import('react').RefObject<HTMLElement>} modalRef
 * @param {() => void} [onClose]
 * @param {import('react').RefObject<HTMLElement>} [triggerRef]
 */
export function useModalFocusTrap(isOpen, modalRef, onClose, triggerRef) {
  const previousFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    const triggerEl = triggerRef?.current
    if (typeof document !== 'undefined') {
      previousFocusRef.current = triggerEl || document.activeElement
    }

    // Trava rolagem do fundo (background scroll lock)
    const originalOverflow = typeof document !== 'undefined' ? document.body.style.overflow : ''
    if (typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden'
    }

    const modalElement = modalRef?.current
    if (modalElement) {
      const focusable = modalElement.querySelectorAll(FOCUSABLE_SELECTOR)
      if (focusable.length > 0) {
        focusable[0].focus()
      } else if (typeof modalElement.focus === 'function') {
        modalElement.focus()
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.()
        return
      }

      if (e.key === 'Tab' && modalRef?.current) {
        const focusableElements = Array.from(modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR))
        if (focusableElements.length === 0) {
          e.preventDefault()
          return
        }

        const firstElement = focusableElements[0]
        const lastElement = focusableElements[focusableElements.length - 1]

        if (e.shiftKey) {
          if (document.activeElement === firstElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault()
            lastElement?.focus()
          }
        } else {
          if (document.activeElement === lastElement || !modalRef.current.contains(document.activeElement)) {
            e.preventDefault()
            firstElement?.focus()
          }
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (typeof document !== 'undefined') {
        document.body.style.overflow = originalOverflow
      }

      const prev = triggerEl || previousFocusRef.current
      if (prev && typeof prev.focus === 'function') {
        try {
          prev.focus()
        } catch {
          // ignore
        }
      }
    }
  }, [isOpen, modalRef, triggerRef])
}

export default useModalFocusTrap
