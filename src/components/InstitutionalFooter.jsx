import React from 'react'
import styles from './InstitutionalFooter.module.css'

export default function InstitutionalFooter({ onOpenLegalModal }) {
  const handleClick = (e, tab) => {
    if (onOpenLegalModal) {
      e.preventDefault()
      onOpenLegalModal(tab)
    }
  }

  return (
    <footer className={styles['institutional-footer']}>
      <nav className={styles['footer-nav']} aria-label="Navegação institucional">
        <a
          href="/sobre.html"
          onClick={(e) => handleClick(e, 'sobre')}
          className={styles['footer-link']}
        >
          Sobre
        </a>
        <span className={styles['footer-bullet']} aria-hidden="true">•</span>
        <a
          href="/privacidade.html"
          onClick={(e) => handleClick(e, 'privacidade')}
          className={styles['footer-link']}
        >
          Política de Privacidade
        </a>
        <span className={styles['footer-bullet']} aria-hidden="true">•</span>
        <a
          href="/termos.html"
          onClick={(e) => handleClick(e, 'termos')}
          className={styles['footer-link']}
        >
          Termos de Uso
        </a>
        <span className={styles['footer-bullet']} aria-hidden="true">•</span>
        <a
          href="https://github.com/wagnergsantos/animatch"
          target="_blank"
          rel="noopener noreferrer"
          className={styles['footer-link']}
        >
          GitHub
        </a>
      </nav>

      <p className={styles['footer-copy']}>
        © 2026 AniMatch — Recomendações personalizadas e inteligentes de anime.
      </p>
    </footer>
  )
}
