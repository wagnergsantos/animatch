import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { STREAMING_SERVICES } from '../logic/streaming.js'
import { clearProviderCache } from '../api/index.js'
import { deleteCloudAnimeList } from '../cache/cloudListSync.js'
import { clearAllLocalData } from '../cache/idbCache.js'
import { deleteOwnAccount } from '../auth/session.js'
import { STORAGE_KEYS } from '../lib/storageKeys.js'
import styles from './SettingsPage.module.css'

const LANG_OPTIONS = [
  { id: 'pt-BR' },
  { id: 'en' },
  { id: 'ja' },
]

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
            <span aria-hidden="true">☁️</span> {t('settings.accountSection', { defaultValue: 'Conta & Sincronização em Nuvem' })}
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
              <span className={styles['settings-page__auth-avatar']} aria-hidden="true">👤</span>
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
            🔗 {t('settings.linkedAccounts', { defaultValue: 'Contas vinculadas' })}
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
                      {isSyncingAni ? '⏳ Sincronizando...' : '✓ Conectada'}
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles['settings-page__btn-subtle']}
                    disabled={!linkedUsernames?.anilist?.trim() || isSyncingAni}
                    onClick={() => (onRefreshProvider ? onRefreshProvider('anilist') : onRefresh?.())}
                    title={t('settings.sync_provider_title', { provider: 'AniList', defaultValue: 'Sincronizar AniList' })}
                  >
                    {isSyncingAni
                      ? `⏳ ${t('settings.syncing_short', { defaultValue: 'Sincronizando...' })}`
                      : `🔄 ${t('settings.sync_short', { defaultValue: 'Sincronizar' })}`}
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
                      {isSyncingKitsu ? '⏳ Sincronizando...' : '✓ Conectada'}
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles['settings-page__btn-subtle']}
                    disabled={!linkedUsernames?.kitsu?.trim() || isSyncingKitsu}
                    onClick={() => (onRefreshProvider ? onRefreshProvider('kitsu') : onRefresh?.())}
                    title={t('settings.sync_provider_title', { provider: 'Kitsu', defaultValue: 'Sincronizar Kitsu' })}
                  >
                    {isSyncingKitsu
                      ? `⏳ ${t('settings.syncing_short', { defaultValue: 'Sincronizando...' })}`
                      : `🔄 ${t('settings.sync_short', { defaultValue: 'Sincronizar' })}`}
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
                      {isSyncingMal ? '⏳ Sincronizando...' : '✓ Conectada'}
                    </span>
                  )}
                  <button
                    type="button"
                    className={styles['settings-page__btn-subtle']}
                    disabled={!linkedUsernames?.mal?.trim() || isSyncingMal}
                    onClick={() => (onRefreshProvider ? onRefreshProvider('mal') : onRefresh?.())}
                    title={t('settings.sync_provider_title', { provider: 'MyAnimeList', defaultValue: 'Sincronizar MyAnimeList' })}
                  >
                    {isSyncingMal
                      ? `⏳ ${t('settings.syncing_short', { defaultValue: 'Sincronizando...' })}`
                      : `🔄 ${t('settings.sync_short', { defaultValue: 'Sincronizar' })}`}
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
            📺 {t('settings.streamingSection', { defaultValue: 'Streaming & Assinaturas' })}
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
            🎨 {t('settings.uiSection', { defaultValue: 'Preferências de Interface' })}
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
                ☀️ {t('settings.theme_light', 'Claro')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={themeMode === 'dark'}
                className={`${styles['settings-page__segment-btn']} ${themeMode === 'dark' ? styles['settings-page__segment-btn--active'] : ''}`}
                onClick={() => setThemeMode('dark')}
              >
                🌙 {t('settings.theme_dark', 'Escuro')}
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={themeMode === 'system'}
                className={`${styles['settings-page__segment-btn']} ${themeMode === 'system' ? styles['settings-page__segment-btn--active'] : ''}`}
                onClick={() => setThemeMode('system')}
              >
                💻 {t('settings.theme_system', 'Sistema')}
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
            📦 {t('settings.dataSection', { defaultValue: 'Dados da Lista' })}
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
              {(isLoading || loadingProviders.length > 0)
                ? isMultiProvider
                  ? t('settings.syncing_all', { defaultValue: '⏳ Sincronizando todos os provedores...' })
                  : t('settings.syncing', { provider: providerLabel })
                : isMultiProvider
                ? t('settings.sync_all', { defaultValue: '🌐 Sincronizar todos os provedores' })
                : t('settings.sync', { provider: providerLabel })}
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
              {isMultiProvider
                ? t('settings.logout_session', { defaultValue: '🚪 Desconectar sessão atual' })
                : t('settings.logout', { defaultValue: 'Trocar de conta' })}
            </button>
          )}
        </div>
      </section>

      {/* Seção 6: Zona de risco */}
      <section className={`${styles['settings-page__card']} ${styles['settings-page__card--danger']}`} aria-labelledby="settings-danger-title">
        <div className={styles['settings-page__card-header']}>
          <h2 id="settings-danger-title" className={styles['settings-page__card-title']} style={{ color: 'var(--color-danger, #ef4444)' }}>
            🚨 {t('settings.dangerZone', { defaultValue: 'Zona de risco' })}
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
            <span aria-hidden="true">🧹</span> {t('settings.clearLocalData', { defaultValue: 'Limpar dados locais' })}
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
                  🗑️ {t('settings.deleteCloudAccount', { defaultValue: 'Excluir conta' })}
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
