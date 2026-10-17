import { useEffect, useRef, useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  buildWrappedData,
  renderWrappedCanvas,
  downloadWrappedPng,
  copyWrappedPngToClipboard,
} from '../logic/wrappedGenerator.js'
import styles from './WrappedModal.module.css'

export default function WrappedModal({
  isOpen,
  onClose,
  username = '',
  providerLabel = 'AniList',
  isEnsemble = false,
  activeProviders = [],
  entries = [],
  tasteProfile = new Map(),
  recommendations = [],
  titlePref = 'english',
}) {
  const { t } = useTranslation()
  const canvasRef = useRef(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [imageCopyState, setImageCopyState] = useState('idle') // 'idle' | 'copied' | 'error'
  const [linkCopied, setLinkCopied] = useState(false)

  const wrappedData = useMemo(() => {
    if (!isOpen) return null
    return buildWrappedData({
      username,
      providerLabel,
      isEnsemble,
      activeProviders,
      entries,
      tasteProfile,
      recommendations,
      titlePref,
    })
  }, [
    isOpen,
    username,
    providerLabel,
    isEnsemble,
    activeProviders,
    entries,
    tasteProfile,
    recommendations,
    titlePref,
  ])

  const canvasLabels = useMemo(
    () => ({
      completed: t('wrapped.completed', 'Concluídos'),
      episodes: t('wrapped.episodes', 'Episódios'),
      meanScore: t('wrapped.meanScore', 'Média Pessoal'),
      topGenresTitle: t('wrapped.topGenresTitle', 'Top Gêneros (Média Bayesiana)'),
      topRecsTitle: t('wrapped.topRecsTitle', 'Top 3 Recomendações para Assistir'),
      noGenres: t('wrapped.noGenres', 'Avalie mais animes para gerar seu perfil de gêneros.'),
      noRecs: t('wrapped.noRecs', 'Adicione animes ao Planning para ver recomendações.'),
      footer: t(
        'wrapped.footer',
        'Gerado por AniMatch • Descubra o que assistir baseado no seu gosto real'
      ),
      matchLabel: t('labels.match', 'Match'),
    }),
    [t]
  )

  useEffect(() => {
    if (!isOpen || !wrappedData || !canvasRef.current) return
    setImageCopyState('idle')
    setLinkCopied(false)
    renderWrappedCanvas(canvasRef.current, wrappedData, canvasLabels)
  }, [isOpen, wrappedData, canvasLabels])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleDownloadPng = async () => {
    if (!canvasRef.current || isDownloading) return
    setIsDownloading(true)
    try {
      const safeName = (username || 'user').toLowerCase().replace(/[^a-z0-9_-]/g, '-')
      await downloadWrappedPng(canvasRef.current, `animatch-wrapped-${safeName}.png`)
    } catch {
      // Fallback silent
    } finally {
      setIsDownloading(false)
    }
  }

  const handleCopyImage = async () => {
    if (!canvasRef.current) return
    try {
      await copyWrappedPngToClipboard(canvasRef.current)
      setImageCopyState('copied')
      setTimeout(() => setImageCopyState('idle'), 2500)
    } catch {
      setImageCopyState('error')
      setTimeout(() => setImageCopyState('idle'), 3000)
    }
  }

  const handleCopyLink = () => {
    if (typeof window !== 'undefined' && navigator.clipboard?.writeText) {
      const url = new URL(window.location.href)
      if (username) {
        url.searchParams.set('user', username)
      }
      navigator.clipboard
        .writeText(url.toString())
        .then(() => {
          setLinkCopied(true)
          setTimeout(() => setLinkCopied(false), 2500)
        })
        .catch(() => {})
    }
  }

  return (
    <div
      className={styles.backdrop}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.()
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wrapped-modal-title"
      >
        <header className={styles.header}>
          <div>
            <h2 id="wrapped-modal-title" className={styles.title}>
              {t('wrapped.modalTitle', 'Seu AniMatch Wrapped')}
            </h2>
            <p className={styles.subtitle}>
              {t(
                'wrapped.modalSubtitle',
                'Card visual 1200×630 pronto para compartilhar nas redes sociais.'
              )}
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label={t('wrapped.close', 'Fechar')}
          >
            ✕
          </button>
        </header>

        <div className={styles.previewWrapper}>
          <canvas
            ref={canvasRef}
            width={1200}
            height={630}
            className={styles.canvasPreview}
          />
        </div>

        <footer className={styles.actions}>
          <button
            type="button"
            data-testid="wrapped-download-btn"
            className={styles.primaryBtn}
            onClick={handleDownloadPng}
            disabled={isDownloading}
          >
            {isDownloading
              ? t('wrapped.downloading', 'Gerando PNG...')
              : t('wrapped.downloadPng', '📥 Baixar PNG')}
          </button>

          <button
            type="button"
            data-testid="wrapped-copy-image-btn"
            className={styles.secondaryBtn}
            onClick={handleCopyImage}
          >
            {imageCopyState === 'copied'
              ? t('wrapped.imageCopied', '✅ Imagem copiada!')
              : imageCopyState === 'error'
                ? t('wrapped.copyError', 'Use Baixar PNG neste navegador')
                : t('wrapped.copyImage', '🖼️ Copiar Imagem')}
          </button>

          <button
            type="button"
            data-testid="wrapped-copy-link-btn"
            className={styles.secondaryBtn}
            onClick={handleCopyLink}
          >
            {linkCopied
              ? t('wrapped.linkCopied', '✅ Link copiado!')
              : t('wrapped.copyLink', '🔗 Copiar Link')}
          </button>
        </footer>
      </div>
    </div>
  )
}
