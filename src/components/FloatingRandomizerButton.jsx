import React from 'react'
import { useTranslation } from 'react-i18next'
import styles from './FloatingRandomizerButton.module.css'

export default function FloatingRandomizerButton({
  onClick,
  disabled = false,
  count,
}) {
  const { t } = useTranslation()

  const ariaLabel = t('decision.fab_aria', { defaultValue: t('decision.title', 'Escolha pra mim') })
  const title = t('decision.title', 'Escolha pra mim')

  return (
    <button
      type="button"
      className={styles.fab}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
    >
      <span className={styles.icon} aria-hidden="true">
        🎲
      </span>
      <span className={styles.label}>{title}</span>
      {count != null && count > 0 && (
        <span className={styles.badge} aria-label={`${count} animes`}>
          {count}
        </span>
      )}
    </button>
  )
}
