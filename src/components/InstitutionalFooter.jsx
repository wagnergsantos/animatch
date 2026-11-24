import React from 'react'
import styles from './InstitutionalFooter.module.css'

export default function InstitutionalFooter({ onOpenLegalModal }) {
  return (
    <footer className={styles['institutional-footer']}>
      <nav className={styles['footer-nav']} aria-label="Navegação institucional">
        {onOpenLegalModal ? (
          <>
            <button
              type="button"
              onClick={() => onOpenLegalModal('sobre')}
              className={styles['footer-link-btn']}
            >
              Sobre
            </button>
            <span className={styles['footer-bullet']} aria-hidden="true">•</span>
            <button
              type="button"
              onClick={() => onOpenLegalModal('privacidade')}
              className={styles['footer-link-btn']}
            >
              Política de Privacidade
            </button>
            <span className={styles['footer-bullet']} aria-hidden="true">•</span>
            <button
              type="button"
              onClick={() => onOpenLegalModal('termos')}
              className={styles['footer-link-btn']}
            >
              Termos de Uso
            </button>
          </>
        ) : (
          <>
            <a href="/sobre.html" className={styles['footer-link']}>Sobre</a>
            <span className={styles['footer-bullet']} aria-hidden="true">•</span>
            <a href="/privacidade.html" className={styles['footer-link']}>Política de Privacidade</a>
            <span className={styles['footer-bullet']} aria-hidden="true">•</span>
            <a href="/termos.html" className={styles['footer-link']}>Termos de Uso</a>
          </>
        )}
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
