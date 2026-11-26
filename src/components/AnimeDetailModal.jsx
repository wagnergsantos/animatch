import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import RecommendationReason from './RecommendationReason.jsx'
import { useModalFocusTrap } from '../hooks/useModalFocusTrap.js'
import { isSafeExternalUrl, filterRegionalStreamingLinks, normalizeServiceName } from '../logic/streaming.js'
import { translateGenre } from '../lib/genreTranslations.js'
import { sanitizeSynopsis } from '../lib/synopsisSanitizer.js'
import { STORAGE_KEYS } from '../lib/storageKeys.js'
import { useImageFallback } from '../hooks/useImageFallback.js'
import styles from './AnimeDetailModal.module.css'

const PROVIDER_SHORT_LABELS = {
  mal: 'MAL',
  kitsu: 'Kitsu',
  anilist: 'AniList',
}

const PROVIDER_FULL_LABELS = {
  mal: 'MyAnimeList',
  kitsu: 'Kitsu',
  anilist: 'AniList',
}

export default function AnimeDetailModal({
  anime,
  titlePref = 'english',
  subscriptions: propSubscriptions = null,
  onClose,
  triggerRef,
}) {
  const { t, i18n } = useTranslation()
  const modalRef = useRef(null)

  const subscriptions = propSubscriptions ?? (() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBSCRIPTIONS))
        if (Array.isArray(saved)) return saved
      } catch {
        // ignore
      }
    }
    return []
  })()

  useModalFocusTrap(Boolean(anime), modalRef, onClose, triggerRef)

  const rawTitleObj = anime?.titleObj || (typeof anime?.title === 'object' ? anime?.title : null) || anime?.media?.title || {}
  const englishTitle = rawTitleObj.english && typeof rawTitleObj.english === 'string' ? rawTitleObj.english : ''
  const romajiTitle = rawTitleObj.romaji && typeof rawTitleObj.romaji === 'string' ? rawTitleObj.romaji : (typeof anime?.title === 'string' ? anime.title : '')

  let mainTitle = ''
  let subTitle = ''

  if (titlePref === 'romaji') {
    mainTitle = romajiTitle || englishTitle || (typeof anime?.title === 'string' ? anime.title : '') || t('labels.untitled')
    subTitle = englishTitle && englishTitle !== mainTitle ? englishTitle : ''
  } else {
    mainTitle = englishTitle || romajiTitle || (typeof anime?.title === 'string' ? anime.title : '') || t('labels.untitled')
    subTitle = romajiTitle && romajiTitle !== mainTitle ? romajiTitle : ''
  }

  const title = mainTitle

  const {
    currentSrc,
    isError: isImgError,
    handleImageLoad,
    handleImageError,
  } = useImageFallback(anime, { title })

  if (!anime) return null

  const genres = anime?.genres ?? []
  const planningProviders = Array.isArray(anime?.planningProviders) ? anime.planningProviders : []
  const sourceProviders = Array.isArray(anime?.sourceProviders) ? anime.sourceProviders : []
  const hasMultiProviders = planningProviders.length > 1

  const getProviderUrl = (providerKey) => {
    if (anime?.providerUrls && isSafeExternalUrl(anime.providerUrls[providerKey])) {
      return anime.providerUrls[providerKey]
    }
    if (anime?.provider === providerKey && isSafeExternalUrl(anime?.siteUrl)) {
      return anime.siteUrl
    }
    if (providerKey === 'anilist') {
      const id = (anime?.provider === 'anilist' ? anime?.id : null) || anime?.media?.id || anime?.id
      return id ? `https://anilist.co/anime/${id}` : (isSafeExternalUrl(anime?.siteUrl) ? anime.siteUrl : null)
    }
    if (providerKey === 'mal') {
      const malId = anime?.idMal || anime?.media?.idMal || (anime?.provider === 'mal' ? (anime?.id || anime?.media?.id) : null)
      return malId ? `https://myanimelist.net/anime/${malId}` : null
    }
    if (providerKey === 'kitsu') {
      const kitsuId = (anime?.provider === 'kitsu' ? (anime?.id || anime?.media?.id) : null) || anime?.kitsuId || anime?.media?.kitsuId
      return kitsuId ? `https://kitsu.io/anime/${kitsuId}` : null
    }
    return null
  }

  const candidateProviders = Array.from(new Set([
    ...planningProviders,
    ...sourceProviders,
    ...(anime?.providerUrls ? Object.keys(anime.providerUrls) : []),
    ...(anime?.provider ? [anime.provider] : ['anilist']),
  ])).filter(Boolean)

  const activeProviders = candidateProviders.filter((p) => Boolean(getProviderUrl(p)))


  const region = (i18n.language || 'pt-BR').startsWith('pt') ? 'BR' : 'ALL'
  const rawLinks = anime?.streamingLinks ?? anime?.media?.streamingLinks ?? []
  const regionalLinks = filterRegionalStreamingLinks(rawLinks, region)

  const streamingLinks = []
  const seenSites = new Set()
  for (const link of regionalLinks) {
    if (link?.site && isSafeExternalUrl(link?.url) && !seenSites.has(link.site)) {
      seenSites.add(link.site)
      const normalized = normalizeServiceName(link.site)
      const isSubscribed = Array.isArray(subscriptions) && subscriptions.includes(normalized)
      streamingLinks.push({
        ...link,
        normalizedSite: normalized,
        isSubscribed,
      })
    }
  }

  streamingLinks.sort((a, b) => {
    if (a.isSubscribed && !b.isSubscribed) return -1
    if (!a.isSubscribed && b.isSubscribed) return 1
    return 0
  })

  const year = anime?.year ?? anime?.seasonYear ?? anime?.startDate?.year
  const statusMap = {
    FINISHED: t('status.FINISHED'),
    RELEASING: t('status.RELEASING'),
    NOT_YET_RELEASED: t('status.NOT_YET_RELEASED'),
    CANCELLED: t('status.CANCELLED'),
    HIATUS: t('status.HIATUS'),
  }
  const statusLabel = anime?.status ? (statusMap[anime.status] || anime.status) : null

  const sanitizedSynopsis = sanitizeSynopsis(anime?.description)
  const cleanDescription = sanitizedSynopsis.text || t('labels.noDescription')
  const synopsisSource = sanitizedSynopsis.source
  const isEnglishSynopsis = sanitizedSynopsis.isEnglish
  const currentLang = i18n.language || 'pt-BR'
  const synopsisTitle = isEnglishSynopsis && currentLang.startsWith('pt')
    ? t('labels.synopsisEn', { defaultValue: 'Sinopse (em inglês)' })
    : t('labels.synopsis')

  return (
    <div className={styles['anime-modal-overlay']} onClick={onClose} data-testid="anime-detail-modal-overlay">
      <div
        ref={modalRef}
        className={styles['anime-modal']}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        <button className={styles['anime-modal__close']} onClick={onClose} aria-label={t('labels.closeModal')}>
          ✕
        </button>

        <div className={styles['anime-modal__header']}>
          {isImgError || !currentSrc ? (
            <div className={styles['anime-modal__cover-fallback']} data-testid="modal-cover-fallback">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18" />
                <line x1="7" y1="2" x2="7" y2="22" />
                <line x1="17" y1="2" x2="17" y2="22" />
                <line x1="2" y1="12" x2="22" y2="12" />
              </svg>
              <span className={styles['anime-modal__cover-fallback-title']} aria-hidden="true">{title}</span>
            </div>
          ) : (
            <img
              className={styles['anime-modal__cover']}
              src={currentSrc}
              alt={t('labels.coverAlt', { title })}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}
          <div className={styles['anime-modal__header-info']}>
            <h2 id="modal-title" className={styles['anime-modal__title']}>{title}</h2>
            {subTitle && <div className={styles['anime-modal__subtitle']} style={{ fontSize: 'var(--text-sm)', color: 'var(--color-muted)', marginBottom: 'var(--space-2)' }}>{subTitle}</div>}
            
            <div className={styles['anime-modal__meta-pills']}>
              {year && <span className={styles['anime-modal__pill']}>{year}</span>}
              {anime?.episodes && <span className={styles['anime-modal__pill']}>{anime.episodes} {anime.episodes === 1 ? t('labels.ep') : t('labels.eps')}</span>}
              {statusLabel && <span className={styles['anime-modal__pill']}>{statusLabel}</span>}
              {anime?.format && <span className={styles['anime-modal__pill']}>{anime.format}</span>}
            </div>

            {hasMultiProviders && (
              <div
                className={styles['anime-modal__presence']}
                data-testid="modal-provider-badges"
                title={t('ensemble.presence_badge_tooltip', {
                  providers: planningProviders
                    .map((p) => t(`providers.${p}`, { defaultValue: PROVIDER_FULL_LABELS[p] || p }))
                    .join(', '),
                  defaultValue: `Presente no seu Planning em: ${planningProviders.map((p) => PROVIDER_FULL_LABELS[p] || p).join(', ')}`,
                })}
              >
                <div className={styles['anime-modal__presence-pills']}>
                  {planningProviders.map((p) => {
                    const url = getProviderUrl(p)
                    const pillClass = `${styles['provider-pill']} ${styles[`provider-pill--${p}`] || ''}`
                    if (url) {
                      return (
                        <a
                          key={p}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`${pillClass} ${styles['provider-pill--link']}`}
                          title={PROVIDER_FULL_LABELS[p] || p}
                        >
                          <span>{PROVIDER_SHORT_LABELS[p] || p}</span>
                          <span className={styles['provider-pill__icon']}> ↗</span>
                        </a>
                      )
                    }
                    return (
                      <span key={p} className={pillClass}>
                        {PROVIDER_SHORT_LABELS[p] || p}
                      </span>
                    )
                  })}
                </div>
              </div>
            )}

            <div className={styles['anime-modal__scores']}>
              {typeof anime?.predictedScore === 'number' && !isNaN(anime.predictedScore) && (
                <span className={`${styles['anime-modal__score']} ${styles['anime-modal__score--match']}`}>
                  {t('labels.match')}: {anime.predictedScore.toFixed(1)}/10
                </span>
              )}
              {typeof anime?.communityScore === 'number' && !isNaN(anime.communityScore) && (
                <span className={`${styles['anime-modal__score']} ${styles['anime-modal__score--community']}`}>
                  {t('labels.community')}: {anime.communityScore.toFixed(1)}/10
                </span>
              )}
            </div>
          </div>
        </div>

        <div className={styles['anime-modal__body']}>
          <RecommendationReason anime={anime} />

          <h3 className={styles['anime-modal__section-title']}>{synopsisTitle}</h3>
          <p className={styles['anime-modal__description']}>{cleanDescription}</p>
          {synopsisSource && (
            <span className={styles['anime-modal__synopsis-source']}>
              {t('labels.source', { defaultValue: 'Fonte' })}: {synopsisSource}
            </span>
          )}

          {genres.length > 0 && (!anime?.matchingGenres || anime.matchingGenres.length === 0) && (
            <div className={styles['anime-modal__genres-section']}>
              <h3 className={styles['anime-modal__section-title']}>{t('labels.genres')}</h3>
              <div className={styles['anime-modal__genres']}>
                {genres.map((g) => (
                  <span key={g} className={styles['anime-modal__genre-tag']}>{translateGenre(g, t)}</span>
                ))}
              </div>
            </div>
          )}

          {streamingLinks.length > 0 && (
            <div className={styles['anime-modal__streaming-section']}>
              <h3 className={styles['anime-modal__section-title']}>{t('labels.whereToWatch')}</h3>
              <div className={styles['anime-modal__streaming-links']}>
                {streamingLinks.map((link) => (
                  <a
                    key={link.site}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${styles['anime-modal__streaming-btn']} ${
                      link.isSubscribed
                        ? styles['anime-modal__streaming-btn--subscribed']
                        : styles['anime-modal__streaming-btn--other']
                    }`}
                  >
                    <span>▶ {link.site}</span>
                    {link.isSubscribed && (
                      <span className={styles['anime-modal__streaming-badge']}>
                        {t('labels.inYourSubscription', { defaultValue: 'Na sua assinatura' })}
                      </span>
                    )}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {activeProviders.length > 0 && (
          <div className={styles['anime-modal__footer']}>
            {activeProviders.map((p) => {
              const label = t(`providers.${p}`, { defaultValue: PROVIDER_FULL_LABELS[p] || p })
              const url = getProviderUrl(p)
              return (
                <a
                  key={p}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${styles['anime-modal__provider-btn']} ${styles[`anime-modal__provider-btn--${p}`] || ''}`}
                >
                  🔗 {label} ↗
                </a>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
