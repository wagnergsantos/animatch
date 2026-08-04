import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import ptBR from './locales/pt-BR.json'
import en from './locales/en.json'
import ja from './locales/ja.json'

function detectInitialLang() {
  try {
    const stored = localStorage.getItem('animatch_lang')
    if (stored) return stored
  } catch (e) {
    // ignore
  }
  const nav = (navigator.language || navigator.userLanguage || 'pt-BR').toLowerCase()
  if (nav.startsWith('en')) return 'en'
  if (nav.startsWith('pt')) return 'pt-BR'
  if (nav.startsWith('ja')) return 'ja'
  return 'pt-BR'
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      en: { translation: en },
      ja: { translation: ja },
    },
    lng: detectInitialLang(),
    fallbackLng: 'pt-BR',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })

export default i18n
