import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import RecommendationReason from './RecommendationReason.jsx'
import { translateGenre } from '../lib/genreTranslations.js'
import { isSafeExternalUrl, filterRegionalStreamingLinks, normalizeServiceName } from '../logic/streaming.js'
import styles from './AnimeRow.module.css'

export default function AnimeRow({
  anime,
  titlePref = 'english',
  priority = false,
  subscriptions = [],
  isFranchiseExpanded = false,
  onToggleFranchise,
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { t, i18n } = useTranslation()

  if (!anime) return null

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
  const siteUrl = anime?.siteUrl || (anime?.id ? `https://anilist.co/anime/${anime.id}` : '#')
  const providerKey = anime?.provider || 'anilist'
  const providerLabel = t(`providers.${providerKey}`, providerKey === 'mal' ? 'MyAnimeList' : providerKey === 'kitsu' ? 'Kitsu' : 'AniList')

  const metaParts = []
  const year = anime?.year ?? anime?.seasonYear ?? anime?.startDate?.year
  if (year) metaParts.push(year)
  if (anime?.episodes) metaParts.push(`${anime.episodes} ${anime.episodes === 1 ? t('labels.ep') : t('labels.eps')}`)
  if (anime?.status) {
    const statusMap = {
      FINISHED: t('status.FINISHED'),
      RELEASING: t('status.RELEASING'),
      NOT_YET_RELEASED: t('status.NOT_YET_RELEASED'),
      CANCELLED: t('status.CANCELLED'),
      HIATUS: t('status.HIATUS'),
    }
    metaParts.push(statusMap[anime.status] || anime.status)
  }

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

  const cleanDescription = anime?.description
    ? anime.description.replace(/<br\s*\/?/gi, '\n').replace(/<[^>]+>/g, '')
    : t('labels.noDescription')

  const handleToggle = () => {
    setIsExpanded((prev) => !prev)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleToggle()
    }
  }

  const handleDirectProviderClick = (e) => {
    e.stopPropagation()
    window.open(siteUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <div
      className={styles['anime-row-container']}
      data-testid="anime-row"
    >
      <div
        className={styles['anime-row-header']}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="region"
        aria-label={title}
      >
        <img
          className={styles['anime-row-cover']}
          src={anime?.coverImage || undefined}
          alt={t('labels.coverAlt', { title })}
          width={52}
          height={74}
          decoding="async"
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
        />

        <div className={styles['anime-row-main']}>
          <div className={styles['anime-row-title-group']}>
            {anime?._isFranchiseChild && (
              <span className={styles['anime-row-franchise-badge']} title={t('labels.franchiseBadge', 'Franquia')}>
                🔗 {t('labels.franchiseBadge', 'Franquia')}
              </span>
            )}
            <h3 className={styles['anime-row-title']}>{mainTitle}</h3>
            {subTitle && <span className={styles['anime-row-subtitle']}>({subTitle})</span>}
          </div>

          {metaParts.length > 0 && (
            <div className={styles['anime-row-meta']}>{metaParts.join(' • ')}</div>
          )}

          {(() => {
            if (anime?.predictionSource === 'community') {
              return (
                <div className={styles['anime-row-reason-line']}>
                  {t('labels.cardReasonFallback')}
                </div>
              )
            }
            if (anime?.anchorAnimes && anime.anchorAnimes.length > 0) {
              return (
                <div className={styles['anime-row-reason-line']}>
                  {t('labels.cardReasonAnchor', { title: anime.anchorAnimes[0].title })}
                </div>
              )
            }
            if (anime?.topContributingGenres && anime.topContributingGenres.length > 0) {
              const gList = anime.topContributingGenres.slice(0, 2).map((g) => translateGenre(g.genre, t)).join(', ')
              const reasonText = t('labels.cardReasonTaste', { genres: gList })
              return (
                <div className={styles['anime-row-reason-line']} title={reasonText}>
                  {reasonText}
                </div>
              )
            }
            return null
          })()}
        </div>

        <div className={styles['anime-row-scores']}>
          {typeof anime?.predictedScore === 'number' && !isNaN(anime.predictedScore) && (
            <span className={`${styles['anime-row-score-badge']} ${styles['anime-row-score-badge--match']}`}>
              {t('labels.match')}: {anime.predictedScore.toFixed(1)}/10
            </span>
          )}
          {typeof anime?.communityScore === 'number' && !isNaN(anime.communityScore) && (
            <span className={`${styles['anime-row-score-badge']} ${styles['anime-row-score-badge--community']}`}>
              {t('labels.community')}: {anime.communityScore.toFixed(1)}/10
            </span>
          )}
        </div>

        <div className={styles['anime-row-actions']}>
          {Array.isArray(anime?.franchiseChildren) && anime.franchiseChildren.length > 0 && (
            <button
              type="button"
              className={styles['anime-row-franchise-btn']}
              onClick={(e) => {
                e.stopPropagation()
                onToggleFranchise?.(e)
              }}
              data-testid="franchise-toggle-btn"
              aria-expanded={isFranchiseExpanded}
              title={
                isFranchiseExpanded
                  ? t('labels.franchiseCollapse', { count: anime.franchiseChildren.length, defaultValue: `Ocultar ${anime.franchiseChildren.length} da franquia` })
                  : t('labels.franchiseCount', { count: anime.franchiseChildren.length, defaultValue: `+${anime.franchiseChildren.length} na franquia` })
              }
            >
              <span aria-hidden="true">{isFranchiseExpanded ? '▲' : '▼'}</span>
              <span>
                {isFranchiseExpanded
                  ? t('labels.franchiseCollapse', { count: anime.franchiseChildren.length, defaultValue: `Ocultar ${anime.franchiseChildren.length} da franquia` })
                  : t('labels.franchiseCount', { count: anime.franchiseChildren.length, defaultValue: `+${anime.franchiseChildren.length} na franquia` })}
              </span>
            </button>
          )}

          <button
            className={styles['anime-row-quick-btn']}
            onClick={handleDirectProviderClick}
            title={t('labels.openProvider', { provider: providerLabel })}
            aria-label={t('labels.openProvider', { provider: providerLabel })}
          >
            🔗 {providerLabel} ↗
          </button>

          <button
            className={`${styles['anime-row-expand-btn']} ${isExpanded ? styles['anime-row-expand-btn--open'] : ''}`}
            onClick={(e) => {
              e.stopPropagation()
              handleToggle()
            }}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? t('labels.collapseDetails') : t('labels.expandDetails')}
          >
            ▼
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className={styles['anime-row-body']}>
          <RecommendationReason anime={anime} />

          <h4 className={styles['anime-row-synopsis-title']}>{t('labels.synopsis')}</h4>
          <p className={styles['anime-row-synopsis']}>{cleanDescription}</p>

          {streamingLinks.length > 0 && (
            <div className={styles['anime-row-streaming']}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
                {t('labels.whereToWatch')}
              </span>
              {streamingLinks.map((link) => (
                <a
                  key={link.site}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles['anime-row-streaming-btn']}
                >
                  ▶ {link.site}
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
