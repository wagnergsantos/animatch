import { useState, useEffect, useRef } from 'react'
import ThemeToggle from './ThemeToggle.jsx'
import { useTranslation } from 'react-i18next'
import useLocalStorage from '../hooks/useLocalStorage.js'
import { STORAGE_KEYS } from '../lib/storageKeys.js'
import InstitutionalFooter from './InstitutionalFooter.jsx'
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
      {/* 1. Barra de Navegação Superior */}
      <header className={styles['top-nav']}>
        <a href="/" className={styles['brand-logo']}>
          <img src="/favicon.svg" alt="AniMatch Logo" className={styles['brand-icon']} />
          <span className={styles['brand-text']}>AniMatch</span>
        </a>

        <div className={styles['top-nav-actions']}>
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
      </header>

      {/* 2. Hero: Chamada Expressiva + Slogan */}
      <section className={styles['hero-section']}>
        <h1 className={styles['hero-headline']}>
          Seu gosto por anime é único.<br />
          <span className={styles['hero-headline-accent']}>Suas recomendações também.</span>
        </h1>
        <div className={styles['hero-divider']} aria-hidden="true" />
      </section>

      {/* Conteúdo Principal */}
      <main className={styles['content-wrapper']}>
        {/* 3. Como o AniMatch funciona & Os três cards */}
        <section aria-labelledby="how-it-works-title">
          <div className={styles['section-header']}>
            <h2 id="how-it-works-title" className={styles['section-title']}>Como o AniMatch funciona</h2>
            <p className={styles['section-subtitle']}>
              Descubra animes que combinam com o seu gosto, não apenas com o que é popular.
            </p>
          </div>
          <div className={styles['feature-grid']}>
            <div className={styles['feature-card']}>
              <div className={`${styles['feature-icon-wrapper']} ${styles['feature-icon-wrapper--muted']}`} aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.2929 5.7071C16.4743 3.88849 13.5257 3.88849 11.7071 5.7071L10.7071 6.7071C10.3166 7.09763 9.68341 7.09763 9.29289 6.7071C8.90236 6.31658 8.90236 5.68341 9.29289 5.29289L10.2929 4.29289C12.8926 1.69322 17.1074 1.69322 19.7071 4.29289C22.3068 6.89255 22.3068 11.1074 19.7071 13.7071L18.7071 14.7071C18.3166 15.0976 17.6834 15.0976 17.2929 14.7071C16.9024 14.3166 16.9024 13.6834 17.2929 13.2929L18.2929 12.2929C20.1115 10.4743 20.1115 7.52572 18.2929 5.7071ZM15.7071 8.29289C16.0976 8.68341 16.0976 9.31658 15.7071 9.7071L9.7071 15.7071C9.31658 16.0976 8.68341 16.0976 8.29289 15.7071C7.90236 15.3166 7.90236 14.6834 8.29289 14.2929L14.2929 8.29289C14.6834 7.90236 15.3166 7.90236 15.7071 8.29289ZM6.7071 9.29289C7.09763 9.68341 7.09763 10.3166 6.7071 10.7071L5.7071 11.7071C3.88849 13.5257 3.88849 16.4743 5.7071 18.2929C7.52572 20.1115 10.4743 20.1115 12.2929 18.2929L13.2929 17.2929C13.6834 16.9024 14.3166 16.9024 14.7071 17.2929C15.0976 17.6834 15.0976 18.3166 14.7071 18.7071L13.7071 19.7071C11.1074 22.3068 6.89255 22.3068 4.29289 19.7071C1.69322 17.1074 1.69322 12.8926 4.29289 10.2929L5.29289 9.29289C5.68341 8.90236 6.31658 8.90236 6.7071 9.29289Z" />
                </svg>
              </div>
              <h3 className={`${styles['feature-title']} ${styles['feature-title--muted']}`}>1. Conecte sua lista</h3>
              <p className={styles['feature-desc']}>
                Informe seu usuário do AniList, Kitsu ou MyAnimeList. Utilizamos apenas os dados públicos das suas listas.
              </p>
            </div>
            <div className={styles['feature-card']}>
              <div className={`${styles['feature-icon-wrapper']} ${styles['feature-icon-wrapper--muted']}`} aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.33 5H12.66C13.2123 5 13.66 5.44771 13.66 6V19H10.33V6C10.33 5.44772 10.7777 5 11.33 5ZM15.66 19V9H18C18.5523 9 19 9.44772 19 10V18C19 18.5523 18.5523 19 18 19H15.66ZM15.66 7V6C15.66 4.34315 14.3169 3 12.66 3H11.33C9.67315 3 8.33 4.34315 8.33 6V11H6C4.34314 11 3 12.3431 3 14V18C3 19.6569 4.34315 21 6 21H18C19.6569 21 21 19.6569 21 18V10C21 8.34315 19.6569 7 18 7H15.66ZM8.33 13V19H6C5.44772 19 5 18.5523 5 18V14C5 13.4477 5.44771 13 6 13H8.33Z" />
                </svg>
              </div>
              <h3 className={`${styles['feature-title']} ${styles['feature-title--muted']}`}>2. Descubra seu perfil</h3>
              <p className={styles['feature-desc']}>
                Analisamos suas avaliações para identificar os gêneros que você mais gosta, utilizando uma análise estatística.
              </p>
            </div>
            <div className={styles['feature-card']}>
              <div className={`${styles['feature-icon-wrapper']} ${styles['feature-icon-wrapper--accent']}`} aria-hidden="true">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <circle cx="12" cy="12" r="6" />
                  <circle cx="12" cy="12" r="2" />
                </svg>
              </div>
              <h3 className={`${styles['feature-title']} ${styles['feature-title--accent']}`}>3. Encontre seu próximo anime</h3>
              <p className={styles['feature-desc']}>
                Comparamos seu perfil com sua lista para assistir e estimamos quais animes têm maior chance de agradar você.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Exemplo de recomendação */}
        <section className={styles['example-section']} aria-label="Exemplo de Recomendação">
          <div className={styles['example-header-row']}>
            <span className={styles['example-tag']}>EXEMPLO DE RECOMENDAÇÃO</span>
            <div className={styles['example-line']} aria-hidden="true"></div>
          </div>
          <div className={styles['example-card']}>
            <div className={styles['example-left']}>
              <img
                src="/frieren-sample.webp"
                alt="Frieren: Beyond Journey's End"
                className={styles['example-thumb']}
                loading="lazy"
              />
              <div className={styles['example-details']}>
                <div className={styles['example-title-row']}>
                  <h3 className={styles['example-title']}>Frieren: Beyond Journey's End</h3>
                  <span className={styles['example-badge']}>Alta afinidade</span>
                </div>
                <p className={styles['example-genres']}>Aventura • Fantasia • Drama</p>
              </div>
            </div>
            <div className={styles['example-divider']} aria-hidden="true"></div>
            <div className={styles['example-score-box']}>
              <div className={styles['example-score-val']}>
                <span className={styles['example-star']} aria-hidden="true">★</span>
                <span>9,4</span>
              </div>
              <span className={styles['example-score-label']}>NOTA PREVISTA</span>
            </div>
          </div>
        </section>

        {/* 5. Experimente o AniMatch (Search Box Neon) */}
        <section className={styles['experiment-box']} aria-labelledby="experiment-title">
          <h2 id="experiment-title" className={styles['experiment-title']}>Experimente o AniMatch</h2>
          <p className={styles['experiment-subtitle']}>
            Descubra quais animes da sua lista têm maior afinidade com você.
          </p>

          <form onSubmit={handleSubmit}>
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

            <label htmlFor="username-input" style={{ position: 'absolute', width: '1px', height: '1px', padding: 0, margin: '-1px', overflow: 'hidden', clip: 'rect(0, 0, 0, 0)', border: 0 }}>
              {t('login.usernameLabel', { provider: providerLabel })}
            </label>

            <div className={styles['input-wrapper']}>
              <svg className={styles['input-icon']} viewBox="0 0 20 20" fill="currentColor" width="16" height="16" aria-hidden="true">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
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
            </div>

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
            <div className={styles['recent-box']}>
              <div className={styles['recent-row']}>
                <span className={styles['recent-title']}>{t('login.recentQueries')}</span>
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
                  className={styles['clear-btn']}
                >
                  {t('login.clearHistory', 'Limpar histórico')}
                </button>
              </div>
              <div className={styles['recent-pills']}>
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
                      className={styles['recent-pill']}
                    >
                      @{uName} ({provLabel})
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* 6. Perguntas Frequentes (FAQ) */}
        <section className={styles['faq-section']} aria-labelledby="faq-title">
          <div className={styles['section-header']}>
            <h2 id="faq-title" className={styles['section-title']}>Perguntas Frequentes (FAQ)</h2>
          </div>
          <div className={styles['faq-list']}>
            <details className={styles['faq-item']}>
              <summary className={styles['faq-question']}>
                <span>Preciso criar conta ou informar minha senha?</span>
                <svg className={styles['faq-chevron']} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </summary>
              <p className={styles['faq-answer']}>
                Não. Para obter recomendações e explorar suas estatísticas, basta informar o nome de usuário público do AniList, Kitsu ou MyAnimeList. O login é opcional apenas para quem deseja sincronizar configurações na nuvem.
              </p>
            </details>
            <details className={styles['faq-item']}>
              <summary className={styles['faq-question']}>
                <span>O que significa a nota prevista (predictedScore)?</span>
                <svg className={styles['faq-chevron']} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </summary>
              <p className={styles['faq-answer']}>
                É uma estimativa estatística de qual nota você atribuiria àquele anime, calculada a partir do cruzamento entre os gêneros da obra e o seu histórico de notas nos animes concluídos.
              </p>
            </details>
            <details className={styles['faq-item']}>
              <summary className={styles['faq-question']}>
                <span>Por que o AniMatch usa cálculo Bayesiano?</span>
                <svg className={styles['faq-chevron']} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </summary>
              <p className={styles['faq-answer']}>
                Para evitar distorções estatísticas. Se você assistiu a apenas 1 anime de Mecha e deu nota 10, a média simples sugeriria que você ama Mecha acima de tudo. A suavização Bayesiana equilibra isso com base na sua média geral de notas.
              </p>
            </details>
            <details className={styles['faq-item']}>
              <summary className={styles['faq-question']}>
                <span>Onde meus dados são armazenados?</span>
                <svg className={styles['faq-chevron']} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </summary>
              <p className={styles['faq-answer']}>
                Por padrão, todo o processamento e armazenamento ocorrem no navegador do próprio visitante (IndexedDB e localStorage). Nenhum dado pessoal é comercializado.
              </p>
            </details>
          </div>
        </section>
      </main>

      {/* 7. Rodapé Institucional Alinhado */}
      <InstitutionalFooter onOpenLegalModal={onOpenLegalModal} />
    </div>
  )
}
