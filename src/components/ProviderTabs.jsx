import { useTranslation } from 'react-i18next'
import styles from './ProviderTabs.module.css'

const PROVIDER_NAMES = {
  anilist: 'AniList',
  kitsu: 'Kitsu',
  mal: 'MyAnimeList',
}

const KNOWN_ORDER = ['anilist', 'kitsu', 'mal']

export default function ProviderTabs({
  linkedUsernames = {},
  activeScope = 'ensemble',
  onScopeChange,
  failedProviders = [],
  onRetryProvider,
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

  const getProviderDisplayName = (provider) => {
    return t(`providers.${provider}`, PROVIDER_NAMES[provider] || provider)
  }

  const failedDisplayNames = safeFailedProviders
    .map((p) => getProviderDisplayName(p))
    .join(', ')

  return (
    <div
      className={styles['provider-tabs']}
      role="region"
      aria-label={t('ensemble.scope_region_label', { defaultValue: 'Escopo de Provedor' })}
    >
      <div className={styles['tabs-bar']}>
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

        {configuredProviders.map(({ provider, username }) => {
          const isFailed = safeFailedProviders.includes(provider)
          const displayName = getProviderDisplayName(provider)
          const dotClass = styles[`badge-dot-${provider}`] || ''

          return (
            <button
              key={provider}
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
