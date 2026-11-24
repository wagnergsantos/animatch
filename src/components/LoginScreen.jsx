import { useState, useEffect, useRef } from 'react'
import ThemeToggle from './ThemeToggle.jsx'
import { useTranslation } from 'react-i18next'
import useLocalStorage from '../hooks/useLocalStorage.js'
import { STORAGE_KEYS } from '../lib/storageKeys.js'
import styles from './LoginScreen.module.css'

export default function LoginScreen({
  onSubmit,
  isLoading,
  error,
  recentUsers = [],
  onClearRecentUsers,
  initialUsername = '',
  user = null,
  syncStatus = 'idle',
  onOpenAuthModal,
  onOpenLegalModal,
  linkedUsernames = null,
}) {
  const { t } = useTranslation()
  const [provider, setProvider] = useLocalStorage(STORAGE_KEYS.PROVIDER, 'anilist')
  const [username, setUsername] = useState(() => initialUsername || (linkedUsernames && linkedUsernames[provider]) || '')
  const inputRef = useRef(null)

  const handleProviderChange = (newProvider) => {
    setProvider(newProvider)
    if (linkedUsernames && linkedUsernames[newProvider] && (!username || username === linkedUsernames[provider])) {
      setUsername(linkedUsernames[newProvider])
    }
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  useEffect(() => {
    if (initialUsername) {
      setUsername(initialUsername)
    } else if (linkedUsernames && linkedUsernames[provider]) {
      setUsername((prev) => (prev ? prev : linkedUsernames[provider]))
    }
  }, [initialUsername, linkedUsernames, provider])

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = username.trim()
    if (trimmed) {
      onSubmit(trimmed, provider)
    }
  }

  const providerNames = { anilist: 'AniList', kitsu: 'Kitsu', mal: 'MyAnimeList' }
  const providerLabel = t(`providers.${provider}`) || providerNames[provider] || provider

  return (
    <div className={styles['login-screen']}>
      <div className={styles['login-header-actions']}>
        {!user ? (
          <button
            type="button"
            className={styles['cloud-auth-btn']}
            onClick={() => onOpenAuthModal?.()}
            aria-label={t('auth.login', 'Entrar / Sincronizar')}
          >
            <span aria-hidden="true">☁️</span> {t('auth.login', 'Entrar / Sincronizar')}
          </button>
        ) : (
          <div className={styles['cloud-user-badge']}>
            <span className={styles['cloud-user-email']}><span aria-hidden="true">👤</span> {user.email}</span>
            <span
              className={`${styles['cloud-sync-status']} ${styles[`cloud-sync-status--${syncStatus}`]}`}
              title={
                syncStatus === 'syncing'
                  ? t('auth.sync_status_syncing', 'Sincronizando...')
                  : syncStatus === 'error'
                  ? t('auth.sync_status_error', 'Erro ao sincronizar')
                  : syncStatus === 'offline'
                  ? t('auth.sync_status_offline', 'Modo Offline (LocalStorage)')
                  : t('auth.sync_status_synced', 'Sincronizado na nuvem')
              }
            >
              <span aria-hidden="true">
                {syncStatus === 'syncing' ? '⏳' : syncStatus === 'error' ? '⚠️' : syncStatus === 'offline' ? '📴' : '☁️'}
              </span>
            </span>
          </div>
        )}
        <ThemeToggle />
      </div>
      <div className={styles['login-container']}>
        <h1 className={styles['login-title']}>{t('login.title')}</h1>
        <p className={styles['login-subtitle']}>{t('login.subtitle')}</p>
        <form className={styles['login-form']} onSubmit={handleSubmit}>
          <div className={styles['provider-selector']} role="tablist" aria-label={t('login.providerSelectorLabel') || 'Provedor de animes'}>
            <button
              type="button"
              role="tab"
              aria-selected={provider === 'anilist'}
              className={`${styles['provider-pill']} ${provider === 'anilist' ? styles['provider-pill--active'] : ''}`}
              onClick={() => handleProviderChange('anilist')}
              disabled={isLoading}
            >
              {t('providers.anilist')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={provider === 'kitsu'}
              className={`${styles['provider-pill']} ${provider === 'kitsu' ? styles['provider-pill--active'] : ''}`}
              onClick={() => handleProviderChange('kitsu')}
              disabled={isLoading}
            >
              {t('providers.kitsu')}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={provider === 'mal'}
              className={`${styles['provider-pill']} ${provider === 'mal' ? styles['provider-pill--active'] : ''}`}
              onClick={() => handleProviderChange('mal')}
              disabled={isLoading}
            >
              {t('providers.mal')}
            </button>
          </div>
          <label htmlFor="username-input" className={styles['login-label']}>
            {t('login.usernameLabel', { provider: providerLabel })}
          </label>
          <input
            ref={inputRef}
            id="username-input"
            className={`${styles['login-input']} ${error ? styles['login-input--error'] : ''}`}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder={t('login.usernamePlaceholder', { provider: providerLabel })}
            autoComplete="off"
            disabled={isLoading}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'username-error' : undefined}
          />
          {error && (
            <p id="username-error" className={styles['login-error']} role="alert">
              {error}
            </p>
          )}
          <button
            className={styles['login-button']}
            type="submit"
            disabled={isLoading || !username.trim()}
          >
            {isLoading ? (
              <>
                <span className={styles['login-spinner']} aria-hidden="true" data-testid="login-spinner" />
                {t('login.loading')}
              </>
            ) : (
              t('login.submit')
            )}
          </button>
        </form>

        {recentUsers.length > 0 && (
          <div className="recent-users" style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-2)', margin: 0 }}>
                {t('login.recentQueries')}
              </p>
              <button
                type="button"
                data-testid="clear-recent-users-btn"
                onClick={() => {
                  try {
                    localStorage.removeItem(STORAGE_KEYS.RECENT_USERS)
                  } catch {
                    // ignore
                  }
                  onClearRecentUsers?.()
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-3, #94a3b8)',
                  fontSize: 'var(--text-xs)',
                  textDecoration: 'underline',
                  cursor: 'pointer',
                  padding: '0 0.25rem',
                }}
              >
                {t('login.clearHistory', 'Limpar histórico')}
              </button>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'center', flexWrap: 'wrap' }}>
              {recentUsers.map((item) => {
                const uName = typeof item === 'string' ? item : item.username
                const uProv = typeof item === 'string' ? 'anilist' : item.provider
                const provLabel = t(`providers.${uProv}`, uProv)
                return (
                  <button
                    key={`${uName}-${uProv}`}
                    type="button"
                    onClick={() => onSubmit(uName, uProv)}
                    disabled={isLoading}
                    style={{
                      background: 'var(--surface-2)',
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-primary)',
                      padding: 'var(--space-1) var(--space-3)',
                      borderRadius: 'var(--radius-full)',
                      fontSize: 'var(--text-sm)',
                      cursor: 'pointer',
                    }}
                  >
                    @{uName} ({provLabel})
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <footer style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
          <button
            type="button"
            data-testid="open-legal-modal-btn"
            onClick={() => onOpenLegalModal?.()}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-3, #94a3b8)',
              fontSize: 'var(--text-xs)',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: '0.25rem 0.5rem',
            }}
          >
            {t('legal.footer_link', 'Sobre, Privacidade & Termos')}
          </button>
        </footer>
      </div>

      {/* Conteúdo textual rico para SEO, rastreadores do AdSense e apresentação */}
      <section className={styles['landing-content']}>
        <div>
          <h2 className={styles['section-heading']}>Como o AniMatch funciona</h2>
          <p className={styles['section-subheading']}>Recomendações baseadas na sua afinidade real, sem depender de popularidade ou algoritmos opacos.</p>
          <div className={styles['feature-grid']}>
            <div className={styles['feature-card']}>
              <span className={styles['feature-icon']} aria-hidden="true">🔗</span>
              <h3 className={styles['feature-title']}>1. Conecte sua lista pública</h3>
              <p className={styles['feature-desc']}>
                Informe seu usuário do AniList, Kitsu ou MyAnimeList. Sem senhas ou permissões invasivas, usamos apenas os dados públicos das suas obras concluídas e planejadas.
              </p>
            </div>
            <div className={styles['feature-card']}>
              <span className={styles['feature-icon']} aria-hidden="true">📊</span>
              <h3 className={styles['feature-title']}>2. Perfil Bayesiano de Gosto</h3>
              <p className={styles['feature-desc']}>
                Calculamos sua nota média por gênero com suavização Bayesiana. Gêneros com poucos animes assistidos não distorcem seu perfil, garantindo precisão matemática.
              </p>
            </div>
            <div className={styles['feature-card']}>
              <span className={styles['feature-icon']} aria-hidden="true">🎯</span>
              <h3 className={styles['feature-title']}>3. Predição na sua lista</h3>
              <p className={styles['feature-desc']}>
                Cruzamos seu perfil com cada título da sua lista <em>Plan to Watch</em>, calculando a nota prevista estimada que você daria para cada anime e indicando onde assistir.
              </p>
            </div>
          </div>
        </div>

        <div className={styles['demo-container']}>
          <div>
            <h2 className={styles['section-heading']} style={{ margin: 0, textAlign: 'left' }}>Exemplo de Previsão</h2>
            <p className={styles['section-subheading']} style={{ margin: 0, textAlign: 'left', marginTop: 'var(--space-1)' }}>
              Como uma obra do seu <em>Plan to Watch</em> é pontuada e ordenada:
            </p>
          </div>
          <div className={styles['demo-card']}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <strong style={{ color: 'var(--color-ink)', fontSize: 'var(--text-base)' }}>Frieren: Beyond Journey's End</strong>
                <span className={styles['demo-badge']}>Aposta Pessoal</span>
              </div>
              <p style={{ margin: 'var(--space-1) 0 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-muted)' }}>
                Gêneros: Aventura, Fantasia, Drama • Base: Afinidade Alta nos Gêneros
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-muted)', display: 'block' }}>Nota prevista</span>
              <strong style={{ fontSize: 'var(--text-xl)', color: 'var(--color-primary)' }}>★ 9.4</strong>
            </div>
          </div>
        </div>

        <div>
          <h2 className={styles['section-heading']}>Perguntas Frequentes (FAQ)</h2>
          <div className={styles['faq-list']}>
            <details className={styles['faq-item']}>
              <summary className={styles['faq-question']}>Preciso criar conta ou informar minha senha?</summary>
              <p className={styles['faq-answer']}>
                Não. Para obter recomendações e explorar suas estatísticas, basta informar o nome de usuário público do AniList, Kitsu ou MyAnimeList. O login é opcional apenas para quem deseja sincronizar configurações na nuvem.
              </p>
            </details>
            <details className={styles['faq-item']}>
              <summary className={styles['faq-question']}>O que significa a nota prevista (predictedScore)?</summary>
              <p className={styles['faq-answer']}>
                É uma estimativa estatística de qual nota você atribuiria àquele anime, calculada a partir do cruzamento entre os gêneros da obra e o seu histórico de notas nos animes concluídos.
              </p>
            </details>
            <details className={styles['faq-item']}>
              <summary className={styles['faq-question']}>Por que o AniMatch usa cálculo Bayesiano?</summary>
              <p className={styles['faq-answer']}>
                Para evitar distorções estatísticas. Se você assistiu a apenas 1 anime de Mecha e deu nota 10, a média simples sugeriria que você ama Mecha acima de tudo. A suavização Bayesiana equilibra isso com base na sua média geral de notas.
              </p>
            </details>
            <details className={styles['faq-item']}>
              <summary className={styles['faq-question']}>Onde meus dados são armazenados?</summary>
              <p className={styles['faq-answer']}>
                Por padrão, todo o processamento e armazenamento ocorrem no navegador do próprio visitante (IndexedDB e localStorage). Nenhum dado pessoal é comercializado.
              </p>
            </details>
          </div>
        </div>

        <footer className={styles['landing-footer']}>
          <nav className={styles['footer-nav']} aria-label="Navegação institucional">
            <a href="/sobre.html" className={styles['footer-link']}>Sobre</a>
            <a href="/privacidade.html" className={styles['footer-link']}>Política de Privacidade</a>
            <a href="/termos.html" className={styles['footer-link']}>Termos de Uso</a>
            <a href="https://github.com/wagnergsantos/animatch" target="_blank" rel="noopener noreferrer" className={styles['footer-link']}>GitHub</a>
          </nav>
          <p>© 2026 AniMatch — Recomendações personalizadas e inteligentes de anime.</p>
        </footer>
      </section>
    </div>
  )
}
