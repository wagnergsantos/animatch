import { useState, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useModalFocusTrap } from '../hooks/useModalFocusTrap.js'
import { legalContent } from '../locales/legalContent.jsx'
import styles from './LegalModal.module.css'

export default function LegalModal({ isOpen, onClose, initialTab = 'about' }) {
  const { t, i18n } = useTranslation()
  const normalizeTab = (tab) => {
    if (tab === 'termos' || tab === 'terms') return 'terms'
    if (tab === 'privacidade' || tab === 'privacy') return 'privacy'
    return 'about'
  }
  const [activeTab, setActiveTab] = useState(() => normalizeTab(initialTab))
  const modalRef = useRef(null)

  // Sincroniza aba ativa se a prop initialTab mudar ao abrir
  const prevInitialTabRef = useRef(initialTab)
  if (prevInitialTabRef.current !== initialTab) {
    prevInitialTabRef.current = initialTab
    setActiveTab(normalizeTab(initialTab))
  }

  useModalFocusTrap(Boolean(isOpen), modalRef, onClose)

  if (!isOpen) return null

  const lang = (i18n.language || 'pt-BR').startsWith('en')
    ? 'en'
    : (i18n.language || '').startsWith('ja')
    ? 'ja'
    : 'pt-BR'
  const content = legalContent[lang] || legalContent['pt-BR']

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      data-testid="legal-modal-overlay"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        tabIndex={-1}
      >
        <header className={styles.header}>
          <h2 id="legal-modal-title" className={styles.title}>
            {t('legal.modalTitle', 'Sobre, Privacidade & Termos')}
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label={t('auth.close', 'Fechar')}
          >
            ✕
          </button>
        </header>

        <nav className={styles.tabs} role="tablist" aria-label={t('legal.tabsAriaLabel', 'Seções legais')}>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'about'}
            aria-controls="panel-about"
            id="tab-about"
            className={`${styles.tabBtn} ${activeTab === 'about' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('about')}
          >
            {t('legal.aboutTab', 'Sobre o AniMatch')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'privacy'}
            aria-controls="panel-privacy"
            id="tab-privacy"
            className={`${styles.tabBtn} ${activeTab === 'privacy' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            {t('legal.privacyTab', 'Política de Privacidade')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'terms'}
            aria-controls="panel-terms"
            id="tab-terms"
            className={`${styles.tabBtn} ${activeTab === 'terms' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('terms')}
          >
            {t('legal.termsTab', 'Termos de Uso')}
          </button>
        </nav>

        <div className={styles.body}>
          {activeTab === 'about' && (
            <div id="panel-about" role="tabpanel" aria-labelledby="tab-about" className={styles.section}>
              {content.about.sections.map((section, idx) => (
                <div key={idx} className={styles.subsection}>
                  <h3 className={styles.sectionTitle}>{section.title}</h3>
                  {section.paragraphs.map((p, pIdx) => (
                    <p key={pIdx} className={styles.paragraph}>{p}</p>
                  ))}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'privacy' && (
            <div id="panel-privacy" role="tabpanel" aria-labelledby="tab-privacy" className={styles.section}>
              <h3 className={styles.sectionTitle}>{content.privacy.title}</h3>
              <p className={styles.lastUpdated}>{content.privacy.lastUpdated}</p>
              {content.privacy.intro && <p className={styles.paragraph}>{content.privacy.intro}</p>}
              {content.privacy.sections.map((section, idx) => (
                <div key={idx} className={styles.subsection}>
                  <h4 className={styles.subHeading}>{section.title}</h4>
                  {section.paragraphs.map((p, pIdx) => (
                    <p key={pIdx} className={styles.paragraph}>{p}</p>
                  ))}
                  {section.list && (
                    <ul className={styles.list}>
                      {section.list.map((item, lIdx) => (
                        <li key={lIdx}>{item}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'terms' && (
            <div id="panel-terms" role="tabpanel" aria-labelledby="tab-terms" className={styles.section}>
              <h3 className={styles.sectionTitle}>{content.terms.title}</h3>
              <p className={styles.lastUpdated}>{content.terms.lastUpdated}</p>
              {content.terms.intro && <p className={styles.paragraph}>{content.terms.intro}</p>}
              {content.terms.sections.map((section, idx) => (
                <div key={idx} className={styles.subsection}>
                  <h4 className={styles.subHeading}>{section.title}</h4>
                  {section.paragraphs.map((p, pIdx) => (
                    <p key={pIdx} className={styles.paragraph}>{p}</p>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
