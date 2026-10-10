import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../auth/AuthContext.jsx'
import styles from './AuthModal.module.css'

export default function AuthModal({
  isOpen,
  onClose,
  initialTab = 'login',
}) {
  const { t } = useTranslation()
  const { signInWithPassword, signUpWithPassword, signInWithOAuth } = useAuth()

  const [activeTab, setActiveTab] = useState(initialTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)

  // Reset or sync state when modal opens or initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || 'login')
      setEmail('')
      setPassword('')
      setError(null)
      setSuccessMessage(null)
      setIsLoading(false)
    }
  }, [isOpen, initialTab])

  // Handle Escape key to close modal
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const handleTabChange = (tab) => {
    setActiveTab(tab)
    setError(null)
    setSuccessMessage(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)

    if (!email || !password) {
      return
    }

    if (password.length < 6) {
      setError(t('auth.password_min_length', 'A senha deve ter pelo menos 6 caracteres'))
      return
    }

    setIsLoading(true)

    try {
      if (activeTab === 'login') {
        const { error: signInError } = await signInWithPassword({ email, password })
        if (signInError) {
          setError(signInError.message || t('auth.error_generic', 'Ocorreu um erro. Tente novamente.'))
        } else {
          onClose?.()
        }
      } else {
        const { error: signUpError } = await signUpWithPassword({ email, password })
        if (signUpError) {
          setError(signUpError.message || t('auth.error_generic', 'Ocorreu um erro. Tente novamente.'))
        } else {
          setSuccessMessage(
            t('auth.signup_success_check_email', 'Conta criada! Verifique seu email para confirmar o cadastro.')
          )
        }
      }
    } catch (err) {
      setError(err?.message || t('auth.error_generic', 'Ocorreu um erro. Tente novamente.'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    setError(null)
    setSuccessMessage(null)
    setIsLoading(true)

    try {
      const { error: oauthError } = await signInWithOAuth({ provider: 'google' })
      if (oauthError) {
        setError(oauthError.message || t('auth.error_generic', 'Ocorreu um erro. Tente novamente.'))
      }
    } catch (err) {
      setError(err?.message || t('auth.error_generic', 'Ocorreu um erro. Tente novamente.'))
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className={styles.overlay}
      onClick={onClose}
      data-testid="auth-modal-overlay"
    >
      <div
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
      >
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label={t('auth.close', 'Fechar')}
        >
          ✕
        </button>

        <div className={styles.header}>
          <h2 id="auth-modal-title" className={styles.title}>
            {t('auth.account', 'Conta AniMatch')}
          </h2>
          <p className={styles.subtitle}>
            {t('auth.sync_desc', 'Suas preferências e contas vinculadas são salvas com segurança na sua conta.')}
          </p>
        </div>

        {/* Tab selection */}
        <div className={styles.tabsList} role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'login'}
            className={`${styles.tabButton} ${activeTab === 'login' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('login')}
            type="button"
          >
            {t('auth.login', 'Entrar')}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'signup'}
            className={`${styles.tabButton} ${activeTab === 'signup' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('signup')}
            type="button"
          >
            {t('auth.signup', 'Criar Conta')}
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className={styles.errorAlert} role="alert">
            {error}
          </div>
        )}

        {successMessage && (
          <div className={styles.successAlert} role="status">
            {successMessage}
          </div>
        )}

        {/* Email & Password Form */}
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.fieldGroup}>
            <label htmlFor="auth-email-input" className={styles.label}>
              {t('auth.email', 'Email')}
            </label>
            <input
              id="auth-email-input"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="seu.email@exemplo.com"
              disabled={isLoading}
            />
          </div>

          <div className={styles.fieldGroup}>
            <label htmlFor="auth-password-input" className={styles.label}>
              {t('auth.password', 'Senha')}
            </label>
            <input
              id="auth-password-input"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={activeTab === 'login' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isLoading}
          >
            {isLoading
              ? '...'
              : activeTab === 'login'
                ? t('auth.login', 'Entrar')
                : t('auth.signup', 'Criar Conta')}
          </button>
        </form>

        <div className={styles.divider}>
          <span>{t('auth.or', 'ou')}</span>
        </div>

        {/* Google OAuth Button */}
        <button
          type="button"
          className={styles.oauthButton}
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <svg className={styles.googleIcon} viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          {t('auth.continue_with_google', 'Continuar com Google')}
        </button>

        {/* Tab switch link helper */}
        <button
          type="button"
          className={styles.switchLink}
          onClick={() => handleTabChange(activeTab === 'login' ? 'signup' : 'login')}
        >
          {activeTab === 'login'
            ? t('auth.switch_to_signup', 'Não tem uma conta? Cadastre-se')
            : t('auth.switch_to_login', 'Já tem uma conta? Entre')}
        </button>
      </div>
    </div>
  )
}
