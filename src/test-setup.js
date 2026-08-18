import '@testing-library/jest-dom'
import { beforeEach, vi } from 'vitest'
import ptBR from './locales/pt-BR.json'

// Mock react-i18next globally for tests to return Portuguese strings
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, opts) => {
      try {
        const parts = key.split('.')
        let v = parts.reduce((obj, k) => (obj && obj[k] !== undefined ? obj[k] : undefined), ptBR)
        if (v === undefined && opts && typeof opts === 'object' && opts.defaultValue !== undefined) {
          v = opts.defaultValue
        }
        if (v === undefined) v = key
        if (typeof v === 'string' && opts) {
          Object.keys(opts).forEach((k) => {
            v = v.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(opts[k]))
          })
        }
        return v
      } catch (e) {
        return key
      }
    },
    i18n: {
      language: 'pt-BR',
      changeLanguage: (lng) => {
        // noop for tests; if needed, tests can mock localStorage separately
        return Promise.resolve()
      }
    }
  }),
  Trans: ({ children }) => children,
  initReactI18next: { type: '3rdParty' }
}))

const createLocalStorageMock = () => {
  let store = {}
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = String(value)
    },
    removeItem: (key) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    }
  }
}

const localStorageMock = createLocalStorageMock()

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

if (typeof globalThis !== 'undefined') {
  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorageMock,
    writable: true
  })
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// jsdom does not implement scrollIntoView; polyfill as a no-op so components
// that scroll to elements (e.g. Dashboard's taste-profile -> grid sync) don't throw.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

beforeEach(() => {
  window.localStorage.clear()
})

