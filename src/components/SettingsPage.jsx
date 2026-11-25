import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { STREAMING_SERVICES } from '../logic/streaming.js'
import { clearProviderCache } from '../api/index.js'
import { deleteCloudAnimeList } from '../cache/cloudListSync.js'
import { clearAllLocalData, readIdbCache, buildProviderCacheKey } from '../cache/idbCache.js'
import { deleteOwnAccount } from '../auth/session.js'
import { STORAGE_KEYS } from '../lib/storageKeys.js'
import styles from './SettingsPage.module.css'

const LANG_OPTIONS = [
  { id: 'pt-BR' },
  { id: 'en' },
  { id: 'ja' },
]

function SyncIcon({ size = 14, style = {} }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '5px', ...style }}>
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  )
}

function SpinnerIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '5px' }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  )
}

function SunIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '5px' }}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  )
}

function MoonIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '5px' }}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  )
}

function MonitorIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '5px' }}>
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </svg>
  )
}

function GlobeIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '5px' }}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  )
}

function LogOutIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '5px' }}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  )
}

function BroomIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '5px' }}>
      <path d="m3 21 7-7" />
      <path d="m15 4 5 5-8 8H7v-5l8-8Z" />
    </svg>
  )
}

function TrashIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: '5px' }}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  )
}

function formatRelativeSyncTime(timestamp, t) {
  if (!timestamp || typeof timestamp !== 'number') return null
  const diffMs = Math.max(0, Date.now() - timestamp)
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return t('settings.sync_just_now', { defaultValue: 'Sincronizado há instantes' })
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return t('settings.sync_minutes_ago', { count: diffMin, defaultValue: `Sincronizado há ${diffMin} min` })
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return t('settings.sync_hours_ago', { count: diffHours, defaultValue: `Sincronizado há ${diffHours} h` })
  const diffDays = Math.floor(diffHours / 24)
  return t('settings.sync_days_ago', { count: diffDays, defaultValue: `Sincronizado há ${diffDays} d` })
}

export default function SettingsPage({
  user = null,
  syncStatus = 'idle',
  onOpenAuthModal,
  onSignOut,
  onDeleteAccount,
  linkedUsernames = { anilist: '', kitsu: '', mal: '' },
  onLinkedUsernamesChange,
  subscriptions = [],
  onSubscriptionsChange,
  streamingBoost = false,
  onStreamingBoostChange,
  titlePref = 'english',
  onTitlePrefChange,
  onRefresh,
  onRefreshProvider,
  hasMultiAccounts,
  isLoading = false,
  loadingProviders = [],
  onLogout,
  provider = 'anilist',
}) {
  const { t, i18n } = useTranslation()
  const [confirmingDeleteAccount, setConfirmingDeleteAccount] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [syncTimestamps, setSyncTimestamps] = useState({})

  useEffect(() => {
    let isMounted = true
    const providers = ['anilist', 'kitsu', 'mal']
    Promise.all(
      providers.map(async (prov) => {
        const u = linkedUsernames?.[prov]?.trim()
        if (!u) return [prov, null]
        try {
          const cached = await readIdbCache(buildProviderCacheKey(prov, u))
          return [prov, cached?.timestamp || null]
        } catch {
          return [prov, null]
        }
      })
    ).then((entries) => {
      if (isMounted) {
        setSyncTimestamps(Object.fromEntries(entries))
      }
    })
    return () => {
      isMounted = false
    }
  }, [linkedUsernames, loadingProviders])

  const [themeMode, setThemeMode] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = localStorage.getItem(STORAGE_KEYS.THEME)
      if (saved) return saved
    }
    return 'dark'
  })

  const currentLang = i18n.language || 'pt-BR'

  useEffect(() => {
    const applyTheme = (mode) => {
      let resolvedTheme = mode
      if (mode === 'system' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        resolvedTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
      }
      document.documentElement.setAttribute('data-theme', resolvedTheme)
    }

    applyTheme(themeMode)
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(STORAGE_KEYS.THEME, themeMode)
    }

    if (themeMode === 'system' && typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
      const mq = window.matchMedia('(prefers-color-scheme: light)')
      const handler = () => applyTheme('system')
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [themeMode])

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng)
    try {
      localStorage.setItem(STORAGE_KEYS.LANG, lng)
    } catch {
      // ignore
    }
  }

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

  const activeAccountsCount = Object.values(linkedUsernames || {}).filter(
    (v) => typeof v === 'string' && v.trim().length > 0
  ).length
  const isMultiProvider = hasMultiAccounts ?? activeAccountsCount >= 2

  const handleUnlinkProvider = (prov) => {
    const oldUsername = linkedUsernames?.[prov]?.trim()
    if (oldUsername) {
      clearProviderCache(oldUsername, prov)
      if (user?.id) {
        deleteCloudAnimeList(user.id, prov, oldUsername)
      }
    }
    onLinkedUsernamesChange?.({
      ...linkedUsernames,
      [prov]: '',
    })
  }

  const handleClearLocalData = async () => {
    await clearAllLocalData()
    onLogout?.()
  }

  const handleConfirmDeleteAccount = async () => {
    setIsDeletingAccount(true)
    try {
      if (onDeleteAccount) {
        await onDeleteAccount()
      } else {
        await deleteOwnAccount()
        await clearAllLocalData()
        await onSignOut?.()
      }
      setConfirmingDeleteAccount(false)
      onLogout?.()
    } finally {
      setIsDeletingAccount(false)
    }
  }

  return (
    <div className={styles['settings-page']}>
      <header className={styles['settings-page__header']}>
        <h1 className={styles['settings-page__title']}>{t('settings.title', 'Configurações')}</h1>
        <p className={styles['settings-page__subtitle']}>
          {t('settings.subtitle', 'Gerencie sua conta, integrações, preferências de streaming e interface')}
        </p>
      </header>

      {/* Seção 1: Conta & Sincronização em Nuvem */}
      <section className={styles['settings-page__card']} aria-labelledby="settings-auth-title">
        <div className={styles['settings-page__card-header']}>
          <h2 id="settings-auth-title" className={styles['settings-page__card-title']}>
            <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '6px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
              </svg>
            </span>
            {t('settings.accountSection', { defaultValue: 'Conta & Sincronização em Nuvem' })}
          </h2>
          <p className={styles['settings-page__card-desc']}>
            {t('auth.sync_desc', { defaultValue: 'Sincronize suas preferências e contas vinculadas na nuvem.' })}
          </p>
        </div>

        {!user ? (
          <div className={styles['settings-page__auth-banner']}>
            <div className={styles['settings-page__auth-info']}>
              <span className={styles['settings-page__auth-title']}>{t('auth.account', { defaultValue: 'Conta AniMatch' })}</span>
              <span className={styles['settings-page__auth-desc']}>
                {t('auth.sync_desc', { defaultValue: 'Sincronize suas preferências e contas vinculadas na nuvem.' })}
              </span>
            </div>
            <button
              type="button"
              className={`${styles['settings-page__btn']} ${styles['settings-page__btn--primary']}`}
              onClick={() => onOpenAuthModal?.()}
            >
              {t('auth.login', { defaultValue: 'Entrar' })}
            </button>
          </div>
        ) : (
          <div className={styles['settings-page__auth-user']}>
            <div className={styles['settings-page__auth-user-header']}>
              <span className={styles['settings-page__auth-avatar']} aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <div className={styles['settings-page__auth-user-details']}>
                <span className={styles['settings-page__auth-email']}>{user.email}</span>
                <span
                  className={`${styles['settings-page__sync-badge']} ${styles[`settings-page__sync-badge--${syncStatus}`]}`}
                >
                  <span aria-hidden="true">{syncBadge.icon}</span> {syncBadge.text}
                </span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap', alignItems: 'center' }}>
              <button
                type="button"
                className={styles['settings-page__btn']}
                onClick={() => {
                  onSignOut?.()
                  onLogout?.()
                }}
              >
                {t('auth.logout', { defaultValue: 'Sair da conta' })}
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Seção 2: Contas vinculadas */}
      <section className={styles['settings-page__card']} aria-labelledby="settings-linked-title">
        <div className={styles['settings-page__card-header']}>
          <h2 id="settings-linked-title" className={styles['settings-page__card-title']}>
            <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '6px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </span>
            {t('settings.linkedAccounts', { defaultValue: 'Contas vinculadas' })}
          </h2>
          <p className={styles['settings-page__card-desc']}>
            {t('settings.linkedAccountsDesc', { defaultValue: 'Cadastre seus usuários para unificar recomendações e históricos.' })}
          </p>
        </div>

        {(() => {
          const isSyncingAni = loadingProviders.includes('anilist')
          const isSyncingKitsu = loadingProviders.includes('kitsu')
          const isSyncingMal = loadingProviders.includes('mal')

          return (
            <div className={styles['settings-page__inputs-grid']}>
              {/* AniList */}
              <div className={styles['settings-page__field']}>
                <label className={styles['settings-page__field-label']} htmlFor="page-linked-anilist">
                  {t('settings.anilistUsername', { defaultValue: 'Usuário AniList' })}
                </label>
                <input
                  id="page-linked-anilist"
                  type="text"
                  className={styles['settings-page__input']}
                  placeholder="Ex: seu_usuario"
                  value={linkedUsernames?.anilist || ''}
                  onChange={(e) =>
                    onLinkedUsernamesChange?.({
                      ...linkedUsernames,
                      anilist: e.target.value,
                    })
                  }
                />
                <div className={styles['settings-page__field-actions']}>
                  {Boolean(linkedUsernames?.anilist?.trim()) && (
                    <span
                      className={`${styles['settings-page__field-status']} ${isSyncingAni ? styles['settings-page__field-status--syncing'] : ''}`}
                    >
                      {isSyncingAni
                        ? '⏳ Sincronizando...'
                        : `✓ Conectada${syncTimestamps.anilist ? ` • ${formatRelativeSyncTime(syncTimestamps.anilist, t)}` : ''}`}
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles['settings-page__btn-subtle']}
                    disabled={!linkedUsernames?.anilist?.trim() || isSyncingAni}
                    onClick={() => (onRefreshProvider ? onRefreshProvider('anilist') : onRefresh?.())}
                    title={t('settings.sync_provider_title', { provider: 'AniList', defaultValue: 'Sincronizar AniList' })}
                  >
                    {isSyncingAni ? (
                      <>
                        <SpinnerIcon />
                        {t('settings.syncing_short', { defaultValue: 'Sincronizando...' })}
                      </>
                    ) : (
                      <>
                        <SyncIcon />
                        {t('settings.sync_short', { defaultValue: 'Sincronizar' })}
                      </>
                    )}
                  </button>
                  {Boolean(linkedUsernames?.anilist?.trim()) && (
                    <button
                      type="button"
                      className={`${styles['settings-page__btn-subtle']} ${styles['settings-page__btn-subtle--danger']}`}
                      disabled={isSyncingAni}
                      onClick={() => handleUnlinkProvider('anilist')}
                      title={t('settings.unlink_provider_title', { provider: 'AniList', defaultValue: 'Desvincular conta do AniList' })}
                    >
                      ✕ {t('settings.unlink_provider', { defaultValue: 'Desvincular' })}
                    </button>
                  )}
                </div>
              </div>

              {/* Kitsu */}
              <div className={styles['settings-page__field']}>
                <label className={styles['settings-page__field-label']} htmlFor="page-linked-kitsu">
                  {t('settings.kitsuUsername', { defaultValue: 'Usuário Kitsu' })}
                </label>
                <input
                  id="page-linked-kitsu"
                  type="text"
                  className={styles['settings-page__input']}
                  placeholder="Ex: seu_usuario"
                  value={linkedUsernames?.kitsu || ''}
                  onChange={(e) =>
                    onLinkedUsernamesChange?.({
                      ...linkedUsernames,
                      kitsu: e.target.value,
                    })
                  }
                />
                <div className={styles['settings-page__field-actions']}>
                  {Boolean(linkedUsernames?.kitsu?.trim()) && (
                    <span
                      className={`${styles['settings-page__field-status']} ${isSyncingKitsu ? styles['settings-page__field-status--syncing'] : ''}`}
                    >
                      {isSyncingKitsu
                        ? '⏳ Sincronizando...'
                        : `✓ Conectada${syncTimestamps.kitsu ? ` • ${formatRelativeSyncTime(syncTimestamps.kitsu, t)}` : ''}`}
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles['settings-page__btn-subtle']}
                    disabled={!linkedUsernames?.kitsu?.trim() || isSyncingKitsu}
                    onClick={() => (onRefreshProvider ? onRefreshProvider('kitsu') : onRefresh?.())}
                    title={t('settings.sync_provider_title', { provider: 'Kitsu', defaultValue: 'Sincronizar Kitsu' })}
                  >
                    {isSyncingKitsu ? (
                      <>
                        <SpinnerIcon />
                        {t('settings.syncing_short', { defaultValue: 'Sincronizando...' })}
                      </>
                    ) : (
                      <>
                        <SyncIcon />
                        {t('settings.sync_short', { defaultValue: 'Sincronizar' })}
                      </>
                    )}
                  </button>
                  {Boolean(linkedUsernames?.kitsu?.trim()) && (
                    <button
                      type="button"
                      className={`${styles['settings-page__btn-subtle']} ${styles['settings-page__btn-subtle--danger']}`}
                      disabled={isSyncingKitsu}
                      onClick={() => handleUnlinkProvider('kitsu')}
                      title={t('settings.unlink_provider_title', { provider: 'Kitsu', defaultValue: 'Desvincular conta do Kitsu' })}
                    >
                      ✕ {t('settings.unlink_provider', { defaultValue: 'Desvincular' })}
                    </button>
                  )}
                </div>
              </div>

              {/* MyAnimeList */}
              <div className={styles['settings-page__field']}>
                <label className={styles['settings-page__field-label']} htmlFor="page-linked-mal">
                  {t('settings.malUsername', { defaultValue: 'Usuário MyAnimeList' })}
                </label>
                <input
                  id="page-linked-mal"
                  type="text"
                  className={styles['settings-page__input']}
                  placeholder="Ex: seu_usuario"
                  value={linkedUsernames?.mal || ''}
                  onChange={(e) =>
                    onLinkedUsernamesChange?.({
                      ...linkedUsernames,
                      mal: e.target.value,
                    })
                  }
                />
                <div className={styles['settings-page__field-actions']}>
                  {Boolean(linkedUsernames?.mal?.trim()) && (
                    <span
                      className={`${styles['settings-page__field-status']} ${isSyncingMal ? styles['settings-page__field-status--syncing'] : ''}`}
                    >
                      {isSyncingMal
                        ? '⏳ Sincronizando...'
                        : `✓ Conectada${syncTimestamps.mal ? ` • ${formatRelativeSyncTime(syncTimestamps.mal, t)}` : ''}`}
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles['settings-page__btn-subtle']}
                    disabled={!linkedUsernames?.mal?.trim() || isSyncingMal}
                    onClick={() => (onRefreshProvider ? onRefreshProvider('mal') : onRefresh?.())}
                    title={t('settings.sync_provider_title', { provider: 'MyAnimeList', defaultValue: 'Sincronizar MyAnimeList' })}
                  >
                    {isSyncingMal ? (
                      <>
                        <SpinnerIcon />
                        {t('settings.syncing_short', { defaultValue: 'Sincronizando...' })}
                      </>
                    ) : (
                      <>
                        <SyncIcon />
                        {t('settings.sync_short', { defaultValue: 'Sincronizar' })}
                      </>
                    )}
                  </button>
                  {Boolean(linkedUsernames?.mal?.trim()) && (
                    <button
                      type="button"
                      className={`${styles['settings-page__btn-subtle']} ${styles['settings-page__btn-subtle--danger']}`}
                      disabled={isSyncingMal}
                      onClick={() => handleUnlinkProvider('mal')}
                      title={t('settings.unlink_provider_title', { provider: 'MyAnimeList', defaultValue: 'Desvincular conta do MyAnimeList' })}
                    >
                      ✕ {t('settings.unlink_provider', { defaultValue: 'Desvincular' })}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })()}
      </section>

      {/* Seção 3: Streaming & Assinaturas */}
      <section className={styles['settings-page__card']} aria-labelledby="settings-streaming-title">
        <div className={styles['settings-page__card-header']}>
          <h2 id="settings-streaming-title" className={styles['settings-page__card-title']}>
            <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '6px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
                <polyline points="17 2 12 7 7 2" />
              </svg>
            </span>
            {t('settings.streamingSection', { defaultValue: 'Streaming & Assinaturas' })}
          </h2>
          <p className={styles['settings-page__card-desc']}>
            {t('settings.streamingSubscriptions', { defaultValue: 'Selecione os serviços que você assina para filtrar animes disponíveis.' })}
          </p>
        </div>

        <div className={styles['settings-page__services-grid']}>
          {STREAMING_SERVICES.map((service) => {
            const isChecked = subscriptions.includes(service)
            return (
              <label
                key={service}
                className={`${styles['settings-page__service-chip']} ${isChecked ? styles['settings-page__service-chip--active'] : ''}`}
              >
                <input
                  type="checkbox"
                  className={styles['settings-page__checkbox-input']}
                  checked={isChecked}
                  onChange={() => toggleSubscription(service)}
                />
                <span>{service}</span>
              </label>
            )
          })}
        </div>

        <div className={styles['settings-page__boost-box']}>
          <label className={styles['settings-page__boost-label']}>
            <input
              type="checkbox"
              className={styles['settings-page__checkbox-input']}
              checked={Boolean(streamingBoost)}
              onChange={(e) => onStreamingBoostChange?.(e.target.checked)}
            />
            <span>{t('settings.streamingBoost')}</span>
          </label>
        </div>
      </section>

      {/* Seção 4: Preferências de Interface */}
      <section className={styles['settings-page__card']} aria-labelledby="settings-ui-title">
        <div className={styles['settings-page__card-header']}>
          <h2 id="settings-ui-title" className={styles['settings-page__card-title']}>
            <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '6px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
                <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
                <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
                <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
              </svg>
            </span>
            {t('settings.uiSection', { defaultValue: 'Preferências de Interface' })}
          </h2>
          <p className={styles['settings-page__card-desc']}>
            {t('settings.uiDesc', { defaultValue: 'Personalize o visual, idioma e padrão de nomenclatura dos títulos' })}
          </p>
        </div>

        <div className={styles['settings-page__ui-grid']}>
          <div className={styles['settings-page__field']}>
            <label className={styles['settings-page__field-label']}>
              {t('settings.theme', { defaultValue: 'Tema' })}
            </label>
            <div className={styles['settings-page__segmented-control']} role="radiogroup" aria-label={t('settings.theme', 'Tema')}>
              <button
                type="button"
                role="radio"
                aria-checked={themeMode === 'light'}
                className={`${styles['settings-page__segment-btn']} ${themeMode === 'light' ? styles['settings-page__segment-btn--active'] : ''}`}
                onClick={() => setThemeMode('light')}
              >
                <SunIcon />
                {t('settings.theme_light', 'Claro')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={themeMode === 'dark'}
                className={`${styles['settings-page__segment-btn']} ${themeMode === 'dark' ? styles['settings-page__segment-btn--active'] : ''}`}
                onClick={() => setThemeMode('dark')}
              >
                <MoonIcon />
                {t('settings.theme_dark', 'Escuro')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={themeMode === 'system'}
                className={`${styles['settings-page__segment-btn']} ${themeMode === 'system' ? styles['settings-page__segment-btn--active'] : ''}`}
                onClick={() => setThemeMode('system')}
              >
                <MonitorIcon />
                {t('settings.theme_system', 'Sistema')}
              </button>
            </div>
          </div>

          <div className={styles['settings-page__field']}>
            <label className={styles['settings-page__field-label']} htmlFor="page-language-select">
              {t('settings.language', { defaultValue: 'Idioma' })}
            </label>
            <select
              id="page-language-select"
              className={styles['settings-page__select']}
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

          <div className={styles['settings-page__field']}>
            <label className={styles['settings-page__field-label']} htmlFor="page-title-pref-select">
              {t('settings.titleLanguage', { defaultValue: 'Título dos Animes' })}
            </label>
            <select
              id="page-title-pref-select"
              className={styles['settings-page__select']}
              value={titlePref}
              onChange={(e) => onTitlePrefChange?.(e.target.value)}
            >
              <option value="english">{t('settings.titleLanguage_english')}</option>
              <option value="romaji">{t('settings.titleLanguage_romaji')}</option>
            </select>
          </div>
        </div>
      </section>

      {/* Seção 5: Dados da Lista */}
      <section className={styles['settings-page__card']} aria-labelledby="settings-data-title">
        <div className={styles['settings-page__card-header']}>
          <h2 id="settings-data-title" className={styles['settings-page__card-title']}>
            <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '6px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
            </span>
            {t('settings.dataSection', { defaultValue: 'Dados da Lista' })}
          </h2>
          <p className={styles['settings-page__card-desc']}>
            {t('settings.dataDesc', { defaultValue: 'Atualize a lista de animes a partir dos provedores conectados.' })}
          </p>
        </div>

        <div className={styles['settings-page__actions']}>
          {onRefresh && (
            <button
              type="button"
              className={`${styles['settings-page__btn']} ${styles['settings-page__btn--primary']}`}
              onClick={onRefresh}
              disabled={isLoading || loadingProviders.length > 0}
            >
              {(isLoading || loadingProviders.length > 0) ? (
                <>
                  <SpinnerIcon />
                  {isMultiProvider
                    ? t('settings.syncing_all', { defaultValue: 'Sincronizando todos os provedores...' })
                    : t('settings.syncing', { provider: providerLabel })}
                </>
              ) : (
                <>
                  {isMultiProvider ? <GlobeIcon /> : <SyncIcon />}
                  {isMultiProvider
                    ? t('settings.sync_all', { defaultValue: 'Sincronizar todos os provedores' })
                    : t('settings.sync', { provider: providerLabel })}
                </>
              )}
            </button>
          )}

          {!user && onLogout && (
            <button
              type="button"
              className={`${styles['settings-page__btn']} ${styles['settings-page__btn--danger']}`}
              onClick={onLogout}
              title={
                isMultiProvider
                  ? t('settings.logout_session_title', {
                      defaultValue:
                        'Desconecta os animes exibidos e volta à tela inicial. As contas vinculadas salvas permanecem seguras.',
                    })
                  : undefined
              }
            >
              <LogOutIcon />
              {isMultiProvider
                ? t('settings.logout_session', { defaultValue: 'Desconectar sessão atual' })
                : t('settings.logout', { defaultValue: 'Trocar de conta' })}
            </button>
          )}
        </div>
      </section>

      {/* Seção 6: Zona de risco */}
      <section className={`${styles['settings-page__card']} ${styles['settings-page__card--danger']}`} aria-labelledby="settings-danger-title">
        <div className={styles['settings-page__card-header']}>
          <h2 id="settings-danger-title" className={styles['settings-page__card-title']} style={{ color: 'var(--color-danger, #ef4444)' }}>
            <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: '6px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </span>
            {t('settings.dangerZone', { defaultValue: 'Zona de risco' })}
          </h2>
          <p className={styles['settings-page__card-desc']}>
            {t('settings.dangerZoneDesc', { defaultValue: 'Ações irreversíveis e limpeza de armazenamento.' })}
          </p>
        </div>

        <div className={styles['settings-page__danger-item']}>
          <div className={styles['settings-page__danger-info']}>
            <span className={styles['settings-page__danger-title']}>
              {t('settings.clearLocalDataTitle', { defaultValue: 'Limpar dados locais do navegador' })}
            </span>
            <span className={styles['settings-page__danger-desc']}>
              {t('settings.clearLocalDataDesc', { defaultValue: 'Apaga os animes e configurações salvos em cache neste navegador (IndexedDB e LocalStorage). Não afeta sua conta nem dados na nuvem.' })}
            </span>
          </div>
          <button
            type="button"
            data-testid="clear-local-data-btn"
            className={`${styles['settings-page__btn']} ${styles['settings-page__btn--danger-outline']}`}
            onClick={handleClearLocalData}
          >
            <BroomIcon />
            {t('settings.clearLocalData', { defaultValue: 'Limpar dados locais' })}
          </button>
        </div>

        {user && (
          <div className={styles['settings-page__danger-item']} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
              <div className={styles['settings-page__danger-info']}>
                <span className={styles['settings-page__danger-title']} style={{ color: 'var(--color-danger, #ef4444)' }}>
                  {t('settings.deleteCloudAccount', { defaultValue: 'Excluir minha conta e dados da nuvem' })}
                </span>
                <span className={styles['settings-page__danger-desc']}>
                  {t('settings.deleteCloudAccountDesc', { defaultValue: 'Exclui permanentemente sua conta no AniMatch, preferências sincronizadas e dados na nuvem. Suas contas nos provedores externos não são modificadas.' })}
                </span>
              </div>
              {!confirmingDeleteAccount && (
                <button
                  type="button"
                  data-testid="delete-cloud-account-btn"
                  className={`${styles['settings-page__btn']} ${styles['settings-page__btn--danger-solid']}`}
                  onClick={() => setConfirmingDeleteAccount(true)}
                >
                  <TrashIcon />
                  {t('settings.deleteCloudAccount', { defaultValue: 'Excluir conta' })}
                </button>
              )}
            </div>

            {confirmingDeleteAccount && (
              <div className={styles['settings-page__confirm-box']} data-testid="delete-account-confirm-box">
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-danger, #ef4444)', fontWeight: 600 }}>
                  {t('settings.deleteCloudAccountConfirmPrompt', { defaultValue: 'Tem certeza? Esta ação é irreversível.' })}
                </span>
                <label style={{ fontSize: 'var(--text-xs)', color: 'var(--text-2)' }} htmlFor="delete-account-input">
                  {t('settings.typeExcluirToConfirm', { defaultValue: 'Para confirmar, digite "excluir" abaixo:' })}
                </label>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    id="delete-account-input"
                    data-testid="delete-account-input"
                    type="text"
                    className={styles['settings-page__confirm-input']}
                    placeholder="excluir"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                  />
                  <button
                    type="button"
                    data-testid="confirm-delete-account-btn"
                    className={`${styles['settings-page__btn']} ${styles['settings-page__btn--danger-solid']}`}
                    disabled={isDeletingAccount || deleteConfirmText.trim().toLowerCase() !== 'excluir'}
                    onClick={handleConfirmDeleteAccount}
                  >
                    {t('settings.confirmDeleteAccount', { defaultValue: 'Confirmar exclusão permanente' })}
                  </button>
                  <button
                    type="button"
                    data-testid="cancel-delete-account-btn"
                    className={styles['settings-page__btn']}
                    disabled={isDeletingAccount}
                    onClick={() => {
                      setConfirmingDeleteAccount(false)
                      setDeleteConfirmText('')
                    }}
                  >
                    {t('auth.close', { defaultValue: 'Cancelar' })}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
