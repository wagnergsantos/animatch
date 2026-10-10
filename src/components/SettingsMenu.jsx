import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { STREAMING_SERVICES } from '../logic/streaming.js'
import styles from './SettingsMenu.module.css'

export const LANG_OPTIONS = [
  { id: 'pt-BR' },
  { id: 'en' },
  { id: 'ja' },
]

export default function SettingsMenu({
  provider = 'anilist',
  titlePref = 'english',
  onTitlePrefChange,
  onRefresh,
  isLoading,
  onLogout,
  subscriptions = [],
  onSubscriptionsChange,
  streamingBoost = false,
  onStreamingBoostChange,
  user = null,
  syncStatus = 'idle',
  onOpenAuthModal,
  onSignOut,
  linkedUsernames = { anilist: '', kitsu: '', mal: '' },
  onLinkedUsernamesChange,
}) {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem('animatch_theme')
      if (saved) return saved
    }
    if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    return 'dark'
  })

  const currentLang = i18n.language || 'pt-BR'

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('animatch_theme', theme)
    }
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
    try {
      localStorage.setItem('animatch_lang', lng)
    } catch (e) {
      // ignore
    }
    setIsOpen(false)
  }

  const wasLoadingRef = useRef(isLoading)

  useEffect(() => {
    // If it was loading and finished, close panel
    if (wasLoadingRef.current && !isLoading) {
      setIsOpen(false)
    }
    wasLoadingRef.current = isLoading
  }, [isLoading])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  const toggleSubscription = (service) => {
    if (!onSubscriptionsChange) return
    if (subscriptions.includes(service)) {
      onSubscriptionsChange(subscriptions.filter((s) => s !== service))
    } else {
      onSubscriptionsChange([...subscriptions, service])
    }
  }

  const getSyncStatusBadge = () => {
    switch (syncStatus) {
      case 'syncing':
        return { text: t('auth.sync_status_syncing'), icon: '⏳' }
      case 'error':
        return { text: t('auth.sync_status_error'), icon: '⚠️' }
      case 'offline':
        return { text: t('auth.sync_status_offline'), icon: '📴' }
      case 'synced':
      case 'idle':
      default:
        return { text: t('auth.sync_status_synced'), icon: '☁️' }
    }
  }

  const providerLabel = t(`providers.${provider}`, provider === 'mal' ? 'MyAnimeList' : provider === 'kitsu' ? 'Kitsu' : 'AniList')
  const syncBadge = getSyncStatusBadge()

  return (
    <div className={styles['settings-menu']} ref={containerRef}>
      <button
        type="button"
        className={styles['settings-menu__trigger']}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={t('settings.title')}
        title={t('settings.title')}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        ⚙️
      </button>

      {isOpen && (
        <div className={styles['settings-menu__panel']} role="dialog" aria-label={t('settings.title')}>
          {/* Cloud Account Status Section */}
          {!user ? (
            <div className={styles['settings-menu__auth-banner']}>
              <div className={styles['settings-menu__auth-info']}>
                <span className={styles['settings-menu__auth-title']}>☁️ {t('auth.sync_title')}</span>
                <span className={styles['settings-menu__auth-desc']}>{t('auth.sync_desc')}</span>
              </div>
              <button
                type="button"
                className={styles['settings-menu__auth-btn']}
                onClick={() => {
                  onOpenAuthModal && onOpenAuthModal()
                }}
              >
                {t('auth.login')}
              </button>
            </div>
          ) : (
            <div className={styles['settings-menu__auth-user']}>
              <div className={styles['settings-menu__auth-user-header']}>
                <span className={styles['settings-menu__auth-avatar']}>👤</span>
                <div className={styles['settings-menu__auth-user-details']}>
                  <span className={styles['settings-menu__auth-email']}>{user.email}</span>
                  <span className={`${styles['settings-menu__sync-badge']} ${styles[`settings-menu__sync-badge--${syncStatus}`]}`}>
                    {syncBadge.icon} {syncBadge.text}
                  </span>
                </div>
              </div>
              <button
                type="button"
                className={`${styles['settings-menu__btn']} ${styles['settings-menu__btn--sm']}`}
                onClick={() => {
                  onSignOut && onSignOut()
                  setIsOpen(false)
                }}
              >
                {t('auth.logout')}
              </button>
            </div>
          )}

          <div className={styles['settings-menu__divider']} />

          {/* Linked Accounts Section */}
          <div className={styles['settings-menu__section']}>
            <span className={styles['settings-menu__label']}>
              {t('settings.linkedAccounts')}
            </span>
            <span className={styles['settings-menu__sublabel']}>
              {t('settings.linkedAccountsDesc')}
            </span>
            <div className={styles['settings-menu__inputs-stack']}>
              <div className={styles['settings-menu__input-group']}>
                <label className={styles['settings-menu__input-label']} htmlFor="linked-anilist-input">
                  {t('settings.anilistUsername')}
                </label>
                <input
                  id="linked-anilist-input"
                  type="text"
                  className={styles['settings-menu__input']}
                  placeholder="AniList"
                  value={linkedUsernames?.anilist || ''}
                  onChange={(e) =>
                    onLinkedUsernamesChange &&
                    onLinkedUsernamesChange({
                      ...linkedUsernames,
                      anilist: e.target.value,
                    })
                  }
                />
              </div>

              <div className={styles['settings-menu__input-group']}>
                <label className={styles['settings-menu__input-label']} htmlFor="linked-kitsu-input">
                  {t('settings.kitsuUsername')}
                </label>
                <input
                  id="linked-kitsu-input"
                  type="text"
                  className={styles['settings-menu__input']}
                  placeholder="Kitsu"
                  value={linkedUsernames?.kitsu || ''}
                  onChange={(e) =>
                    onLinkedUsernamesChange &&
                    onLinkedUsernamesChange({
                      ...linkedUsernames,
                      kitsu: e.target.value,
                    })
                  }
                />
              </div>

              <div className={styles['settings-menu__input-group']}>
                <label className={styles['settings-menu__input-label']} htmlFor="linked-mal-input">
                  {t('settings.malUsername')}
                </label>
                <input
                  id="linked-mal-input"
                  type="text"
                  className={styles['settings-menu__input']}
                  placeholder="MyAnimeList"
                  value={linkedUsernames?.mal || ''}
                  onChange={(e) =>
                    onLinkedUsernamesChange &&
                    onLinkedUsernamesChange({
                      ...linkedUsernames,
                      mal: e.target.value,
                    })
                  }
                />
              </div>
            </div>
          </div>

          <div className={styles['settings-menu__divider']} />

          <div className={styles['settings-menu__section']}>
            <label className={styles['settings-menu__label']} htmlFor="language-select">
              {t('settings.language')}
            </label>
            <select
              id="language-select"
              className={styles['settings-menu__select']}
              value={currentLang}
              onChange={(e) => changeLanguage(e.target.value)}
            >
              {LANG_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {t(`settings.lang.${opt.id}`) || opt.id}
                </option>
              ))}
            </select>
          </div>

          <div className={styles['settings-menu__divider']} />

          <div className={styles['settings-menu__section']}>
            <label className={styles['settings-menu__label']} htmlFor="title-pref-select">
              {t('settings.titleLanguage')}
            </label>
            <select
              id="title-pref-select"
              className={styles['settings-menu__select']}
              value={titlePref}
              onChange={(e) => onTitlePrefChange && onTitlePrefChange(e.target.value)}
            >
              <option value="english">{t('settings.titleLanguage_english')}</option>
              <option value="romaji">{t('settings.titleLanguage_romaji')}</option>
            </select>
          </div>

          <div className={styles['settings-menu__divider']} />

          <div className={styles['settings-menu__row']}>
            <span className={styles['settings-menu__label']}>{t('settings.theme')}</span>
            <button
              type="button"
              className={styles['settings-menu__theme-btn']}
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('settings.theme_light') : t('settings.theme_dark')}
            >
              {theme === 'dark' ? `☀️ ${t('settings.theme_light')}` : `🌙 ${t('settings.theme_dark')}`}
            </button>
          </div>

          <div className={styles['settings-menu__divider']} />

          <div className={styles['settings-menu__section']}>
            <span className={styles['settings-menu__label']}>
              {t('settings.streamingSubscriptions')}
            </span>
            <div className={styles['settings-menu__services-grid']}>
              {STREAMING_SERVICES.map((service) => {
                const isChecked = subscriptions.includes(service)
                return (
                  <label
                    key={service}
                    className={`${styles['settings-menu__checkbox-label']} ${isChecked ? styles['settings-menu__checkbox-label--active'] : ''}`}
                  >
                    <input
                      type="checkbox"
                      className={styles['settings-menu__checkbox-input']}
                      checked={isChecked}
                      onChange={() => toggleSubscription(service)}
                    />
                    <span>{service}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div className={styles['settings-menu__section']}>
            <label className={styles['settings-menu__boost-label']}>
              <input
                type="checkbox"
                className={styles['settings-menu__checkbox-input']}
                checked={Boolean(streamingBoost)}
                onChange={(e) => onStreamingBoostChange && onStreamingBoostChange(e.target.checked)}
              />
              <span className={styles['settings-menu__boost-text']}>
                {t('settings.streamingBoost')}
              </span>
            </label>
          </div>

          <div className={styles['settings-menu__divider']} />

          {onRefresh && (
            <button
              type="button"
              className={styles['settings-menu__btn']}
              onClick={() => {
                onRefresh()
              }}
              disabled={isLoading}
            >
              {isLoading ? `${t('settings.syncing', { provider: providerLabel })}` : `${t('settings.sync', { provider: providerLabel })}`}
            </button>
          )}

          {onLogout && (
            <button
              type="button"
              className={`${styles['settings-menu__btn']} ${styles['settings-menu__btn--danger']}`}
              onClick={() => {
                onLogout()
                setIsOpen(false)
              }}
            >
              {t('settings.logout')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
