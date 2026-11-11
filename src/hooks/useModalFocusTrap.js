import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Prende o foco de teclado (Tab / Shift+Tab) dentro de um modal aberto,
 * fecha ao pressionar Escape e restaura o foco ao elemento acionador ao fechar.
 *
 * @param {boolean} isOpen
 * @param {import('react').RefObject<HTMLElement>} modalRef
 * @param {() => void} [onClose]
 */
export function useModalFocusTrap(isOpen, modalRef, onClose) {
  const previousFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return

    if (typeof document !== 'undefined') {
      previousFocusRef.current = document.activeElement
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
        const focusableElements = modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR)
        if (focusableElements.length === 0) return

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
      const prev = previousFocusRef.current
      if (prev && typeof prev.focus === 'function') {
        try {
          prev.focus()
        } catch {
          // ignore
        }
      }
    }
  }, [isOpen, modalRef])
}

export default useModalFocusTrap
