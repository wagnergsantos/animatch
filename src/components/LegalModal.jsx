import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useModalFocusTrap } from '../hooks/useModalFocusTrap.js'
import styles from './LegalModal.module.css'

export default function LegalModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const modalRef = useRef(null)

  useModalFocusTrap(Boolean(isOpen), modalRef, onClose)

  if (!isOpen) return null

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

        <div className={styles.body}>
          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {t('legal.aboutTitle', '1. Sobre & Direitos Autorais')}
            </h3>
            <p className={styles.paragraph}>
              {t(
                'legal.aboutText',
                'O AniMatch é uma ferramenta independente, 100% gratuita e sem fins comerciais para descoberta e organização pessoal de animes. Os metadados, capas e sinopses são carregados das APIs públicas de AniList, Kitsu e MyAnimeList para uso estritamente informativo e de catalogação pessoal. Todas as marcas, títulos e imagens pertencem aos seus respectivos titulares e serviços de streaming, sem qualquer vínculo ou endosso oficial.'
              )}
            </p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {t('legal.privacyTitle', '2. Privacidade & Dados (LGPD / GDPR)')}
            </h3>
            <p className={styles.paragraph}>
              {t(
                'legal.privacyText',
                'Consultamos apenas listas públicas de animes (com filtro +18 / Safe Mode ativo por padrão). Para funcionamento rápido e offline, os dados são armazenados localmente no seu navegador (localStorage e IndexedDB), sem cookies publicitários ou rastreadores de terceiros. A criação de conta na nuvem é opcional e sincroniza apenas contas vinculadas confirmadas pelo próprio usuário (infraestrutura Supabase em sa-east-1 e subprocessadores nos EUA como GitHub Pages e Google OAuth sob Cláusulas-Padrão Contratuais — SCCs). Você pode limpar os dados locais, desvincular provedores, revogar o acesso OAuth na sua conta Google ou excluir permanentemente sua conta e dados da nuvem a qualquer momento nas Configurações.'
              )}
            </p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {t('legal.termsTitle', '3. Termos & Idade Mínima')}
            </h3>
            <p className={styles.paragraph}>
              {t(
                'legal.termsText',
                'O serviço é fornecido "no estado em que se encontra" (as is), sem garantias de disponibilidade contínua. Para criar uma conta de sincronização na nuvem, é exigido ter 16 anos ou mais (LGPD Art. 14 / GDPR Art. 8).'
              )}
            </p>
          </section>

          <section className={styles.section}>
            <h3 className={styles.sectionTitle}>
              {t('legal.contactTitle', '4. Contato & Código-Fonte')}
            </h3>
            <p className={styles.paragraph}>
              {t(
                'legal.contactText',
                'Controlador responsável: Wagner Santos. Para solicitações relativas à LGPD/GDPR, dúvidas de privacidade ou pedidos de remoção de conteúdo autoral (DMCA/Takedown), utilize o canal oficial no GitHub:'
              )}{' '}
              <a
                href="https://github.com/wagnergsantos/animatch/issues"
                target="_blank"
                rel="noopener noreferrer"
              >
                github.com/wagnergsantos/animatch
              </a>
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
