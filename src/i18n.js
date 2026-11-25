import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { detectBrowserLanguage } from './lib/languageDetector.js'
import ptBR from './locales/pt-BR.json'
import en from './locales/en.json'
import ja from './locales/ja.json'

export { detectBrowserLanguage }

i18n
  .use(initReactI18next)
  .init({
    resources: {
      'pt-BR': { translation: ptBR },
      en: { translation: en },
      ja: { translation: ja },
    },
    lng: detectBrowserLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  })

export default i18n
