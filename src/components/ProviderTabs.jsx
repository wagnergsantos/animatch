import { useTranslation } from 'react-i18next'
import styles from './ProviderTabs.module.css'

const PROVIDER_NAMES = {
  anilist: 'AniList',
  kitsu: 'Kitsu',
  mal: 'MyAnimeList',
}

const KNOWN_ORDER = ['anilist', 'kitsu', 'mal']

function SyncIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  )
}

export default function ProviderTabs({
  linkedUsernames = {},
  activeScope = 'ensemble',
  onScopeChange,
  failedProviders = [],
  onRetryProvider,
  onSyncProvider,
  loadingProviders = [],
  isEnsembleLoading = false,
}) {
  const { t } = useTranslation()

  const activeEntries = Object.entries(linkedUsernames || {})
    .filter(([, name]) => typeof name === 'string' && name.trim().length > 0)

  activeEntries.sort(([a], [b]) => {
    const idxA = KNOWN_ORDER.indexOf(a)
    const idxB = KNOWN_ORDER.indexOf(b)
    if (idxA !== -1 && idxB !== -1) return idxA - idxB
    if (idxA !== -1) return -1
    if (idxB !== -1) return 1
    return a.localeCompare(b)
  })

  const configuredProviders = activeEntries.map(([provider, name]) => ({
    provider,
    username: name.trim(),
  }))

  if (configuredProviders.length < 2) {
    return null
  }

  const safeFailedProviders = Array.isArray(failedProviders) ? failedProviders : []
  const safeLoadingProviders = Array.isArray(loadingProviders) ? loadingProviders : []
  const isSyncingAll = Boolean(isEnsembleLoading || safeLoadingProviders.length > 0)

  const getProviderDisplayName = (provider) => {
    return t(`providers.${provider}`, PROVIDER_NAMES[provider] || provider)
  }

  const failedDisplayNames = safeFailedProviders
    .map((p) => getProviderDisplayName(p))
    .join(', ')

  const syncHandler = onSyncProvider || onRetryProvider

  return (
    <div
      className={styles['provider-tabs']}
      role="region"
      aria-label={t('ensemble.scope_region_label', { defaultValue: 'Escopo de Provedor' })}
    >
      <div className={styles['tabs-bar']}>
        <div
          className={`${styles['tab-group']} ${activeScope === 'ensemble' ? styles['tab-group--active'] : ''}`}
        >
          <button
            type="button"
            className={`${styles['tab-btn']} ${activeScope === 'ensemble' ? `${styles.active} active` : ''}`}
            aria-pressed={activeScope === 'ensemble'}
            onClick={() => onScopeChange?.('ensemble')}
          >
            <span className={`${styles['badge-dot']} ${styles['badge-dot-ensemble']}`} />
            🌐 {t('ensemble.tab_consolidated_count', {
              count: configuredProviders.length,
              defaultValue: `Consolidado (${configuredProviders.length})`,
            })}
          </button>
          {typeof syncHandler === 'function' && (
            <button
              type="button"
              data-testid="sync-tab-ensemble"
              className={`${styles['tab-sync-btn']} ${isSyncingAll ? styles['tab-sync-btn--spinning'] : ''}`}
              disabled={isSyncingAll}
              onClick={() => syncHandler('ensemble')}
              aria-label={
                isSyncingAll
                  ? t('settings.syncing_short', { defaultValue: 'Sincronizando...' })
                  : t('settings.sync_short', { defaultValue: 'Sincronizar' })
              }
              title={t('settings.sync_all_providers', { defaultValue: 'Sincronizar todos os provedores' })}
            >
              <SyncIcon />
            </button>
          )}
        </div>

        {configuredProviders.map(({ provider, username }) => {
          const isFailed = safeFailedProviders.includes(provider)
          const isSyncingProvider = safeLoadingProviders.includes(provider)
          const displayName = getProviderDisplayName(provider)
          const dotClass = styles[`badge-dot-${provider}`] || ''

          return (
            <div
              key={provider}
              className={`${styles['tab-group']} ${activeScope === provider ? styles['tab-group--active'] : ''}`}
            >
              <button
                type="button"
                className={`${styles['tab-btn']} ${activeScope === provider ? `${styles.active} active` : ''}`}
                aria-pressed={activeScope === provider}
                onClick={() => onScopeChange?.(provider)}
                title={`@${username} (${displayName})`}
              >
                <span className={`${styles['badge-dot']} ${dotClass}`} />
                {displayName}
                {isFailed && (
                  <span className={styles['failed-indicator']} aria-hidden="true">
                    ⚠️
                  </span>
                )}
              </button>
              {typeof syncHandler === 'function' && (
                <button
                  type="button"
                  data-testid={`sync-tab-${provider}`}
                  className={`${styles['tab-sync-btn']} ${isSyncingProvider ? styles['tab-sync-btn--spinning'] : ''}`}
                  disabled={isSyncingProvider}
                  onClick={() => syncHandler(provider)}
                  aria-label={
                    isSyncingProvider
                      ? t('settings.syncing_short', { defaultValue: 'Sincronizando...' })
                      : t('settings.sync_short', { defaultValue: 'Sincronizar' })
                  }
                  title={t('settings.sync_provider_title', {
                    provider: displayName,
                    defaultValue: `Sincronizar ${displayName}`,
                  })}
                >
                  <SyncIcon />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {failedProviders.length > 0 && activeScope === 'ensemble' && (
        <div className={styles['failed-banner']} role="alert">
          <span>
            ⚠️ {t('ensemble.partial_failure', {
              providers: failedDisplayNames,
              defaultValue: `Não foi possível carregar dados de ${failedDisplayNames}. Mostrando dados disponíveis.`,
            })}
          </span>
          {typeof onRetryProvider === 'function' && (
            <button
              type="button"
              className={styles['retry-btn']}
              onClick={() => onRetryProvider(failedProviders[0])}
            >
              {t('ensemble.retry_provider', {
                provider: getProviderDisplayName(failedProviders[0]),
                defaultValue: `Tentar novamente ${getProviderDisplayName(failedProviders[0])}`,
              })}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
