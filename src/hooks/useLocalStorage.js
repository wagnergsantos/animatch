import { useState, useCallback } from 'react'

export default function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return typeof initialValue === 'function' ? initialValue() : initialValue
    }
    try {
      const item = window.localStorage.getItem(key)
      if (item === null) return typeof initialValue === 'function' ? initialValue() : initialValue
      return JSON.parse(item)
    } catch (error) {
      console.warn(`Erro ao ler localStorage key "${key}":`, error)
      return typeof initialValue === 'function' ? initialValue() : initialValue
    }
  })

  const setValue = useCallback((value) => {
    try {
      setStoredValue((prev) => {
        const valueToStore = typeof value === 'function' ? value(prev) : value
        if (typeof window !== 'undefined' && window.localStorage) {
          if (valueToStore === undefined || valueToStore === null) {
            window.localStorage.removeItem(key)
          } else {
            const payload = typeof valueToStore === 'string' ? valueToStore : JSON.stringify(valueToStore)
            window.localStorage.setItem(key, payload)
          }
        }
        return valueToStore
      })
    } catch (error) {
      console.warn(`Erro ao escrever no localStorage key "${key}":`, error)
    }
  }, [key])

  return [storedValue, setValue]
}
