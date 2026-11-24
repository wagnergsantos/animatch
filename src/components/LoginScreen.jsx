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
          Descubra animes que combinam com seu gosto
        </h1>
        <p className={styles['hero-slogan']}>
          Seu gosto por anime é único. Suas recomendações também deveriam ser.
        </p>
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
              <span className={styles['feature-icon']} aria-hidden="true">🔗</span>
              <h3 className={styles['feature-title']}>1. Conecte sua lista</h3>
              <p className={styles['feature-desc']}>
                Informe seu usuário do AniList, Kitsu ou MyAnimeList. Utilizamos apenas os dados públicos das suas listas.
              </p>
            </div>
            <div className={styles['feature-card']}>
              <span className={styles['feature-icon']} aria-hidden="true">📊</span>
              <h3 className={styles['feature-title']}>2. Descubra seu perfil</h3>
              <p className={styles['feature-desc']}>
                Analisamos suas avaliações para identificar os gêneros que você mais gosta, utilizando uma análise estatística.
              </p>
            </div>
            <div className={styles['feature-card']}>
              <span className={styles['feature-icon']} aria-hidden="true">🎯</span>
              <h3 className={styles['feature-title']}>3. Encontre seu próximo anime</h3>
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
          <h2 id="faq-title" className={styles['section-title']}>Perguntas Frequentes (FAQ)</h2>
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
        </section>
      </main>

      {/* 7. Rodapé Institucional Alinhado */}
      <footer className={styles['landing-footer']}>
        <nav className={styles['footer-nav']} aria-label="Navegação institucional">
          {onOpenLegalModal ? (
            <>
              <button
                type="button"
                onClick={() => onOpenLegalModal('sobre')}
                className={styles['footer-link-btn']}
              >
                Sobre
              </button>
              <span className={styles['footer-bullet']} aria-hidden="true">•</span>
              <button
                type="button"
                onClick={() => onOpenLegalModal('privacidade')}
                className={styles['footer-link-btn']}
              >
                Política de Privacidade
              </button>
              <span className={styles['footer-bullet']} aria-hidden="true">•</span>
              <button
                type="button"
                onClick={() => onOpenLegalModal('termos')}
                className={styles['footer-link-btn']}
              >
                Termos de Uso
              </button>
            </>
          ) : (
            <>
              <a href="/sobre.html" className={styles['footer-link']}>Sobre</a>
              <span className={styles['footer-bullet']} aria-hidden="true">•</span>
              <a href="/privacidade.html" className={styles['footer-link']}>Política de Privacidade</a>
              <span className={styles['footer-bullet']} aria-hidden="true">•</span>
              <a href="/termos.html" className={styles['footer-link']}>Termos de Uso</a>
            </>
          )}
          <span className={styles['footer-bullet']} aria-hidden="true">•</span>
          <a href="https://github.com/wagnergsantos/animatch" target="_blank" rel="noopener noreferrer" className={styles['footer-link']}>GitHub</a>
        </nav>

        <p className={styles['footer-copy']}>
          © 2026 AniMatch — Recomendações personalizadas e inteligentes de anime.
        </p>
      </footer>
    </div>
  )
}
