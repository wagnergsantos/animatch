import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { STREAMING_SERVICES } from '../logic/streaming.js'
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
            ☁️ {t('settings.accountSection', { defaultValue: 'Conta & Sincronização em Nuvem' })}
          </h2>
          <p className={styles['settings-page__card-desc']}>
            {t('auth.sync_desc', { defaultValue: 'Suas preferências e contas vinculadas são salvas com segurança na sua conta.' })}
          </p>
        </div>

        {!user ? (
          <div className={styles['settings-page__auth-banner']}>
            <div className={styles['settings-page__auth-info']}>
              <span className={styles['settings-page__auth-title']}>{t('auth.account', { defaultValue: 'Conta AniMatch' })}</span>
              <span className={styles['settings-page__auth-desc']}>
                {t('auth.sync_desc', { defaultValue: 'Faça login para sincronizar configurações em múltiplos dispositivos.' })}
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
              <span className={styles['settings-page__auth-avatar']}>👤</span>
              <div className={styles['settings-page__auth-user-details']}>
                <span className={styles['settings-page__auth-email']}>{user.email}</span>
                <span
                  className={`${styles['settings-page__sync-badge']} ${styles[`settings-page__sync-badge--${syncStatus}`]}`}
                >
                  {syncBadge.icon} {syncBadge.text}
                </span>
              </div>
            </div>
            <button
              type="button"
              className={styles['settings-page__btn']}
              onClick={() => onSignOut?.()}
            >
              {t('auth.logout', { defaultValue: 'Sair da conta' })}
            </button>
          </div>
        )}
      </section>

      {/* Seção 2: Contas Vinculadas (Multi-Provider) */}
      <section className={styles['settings-page__card']} aria-labelledby="settings-linked-title">
        <div className={styles['settings-page__card-header']}>
          <h2 id="settings-linked-title" className={styles['settings-page__card-title']}>
            🔗 {t('settings.linkedAccounts', { defaultValue: 'Contas Vinculadas (Multi-Provider)' })}
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
                      onClick={() =>
                        onLinkedUsernamesChange?.({
                          ...linkedUsernames,
                          anilist: '',
                        })
                      }
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
                      onClick={() =>
                        onLinkedUsernamesChange?.({
                          ...linkedUsernames,
                          kitsu: '',
                        })
                      }
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
                      onClick={() =>
                        onLinkedUsernamesChange?.({
                          ...linkedUsernames,
                          mal: '',
                        })
                      }
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
            <label className={styles['settings-page__field-label']} htmlFor="page-theme-btn">
              {t('settings.theme', { defaultValue: 'Tema' })}
            </label>
            <button
              id="page-theme-btn"
              type="button"
              className={styles['settings-page__theme-btn']}
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? t('settings.theme_light') : t('settings.theme_dark')}
            >
              {theme === 'dark' ? `☀️ ${t('settings.theme_light')}` : `🌙 ${t('settings.theme_dark')}`}
            </button>
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
            {t('settings.dataDesc', { defaultValue: 'Atualize os animes salvos ou troque de usuário/provedor' })}
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

          {onLogout && (
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
    </div>
  )
}
