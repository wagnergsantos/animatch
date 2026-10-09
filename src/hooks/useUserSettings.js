import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../auth/AuthContext'
import { supabaseClient } from '../supabase'

export const DEFAULT_SETTINGS = {
  default_provider: 'anilist',
  linked_usernames: {
    anilist: '',
    kitsu: '',
    mal: '',
  },
  language: 'pt-BR',
  theme: 'dark',
  title_pref: 'english',
  subscriptions: ['Crunchyroll', 'Netflix'],
  streaming_boost: false,
  view_mode: 'grid',
}

export const SETTINGS_STORAGE_KEY = 'animatch_settings'

function mergeSettings(base, incoming) {
  if (!incoming) return { ...base }
  return {
    ...base,
    ...incoming,
    linked_usernames: {
      ...(base?.linked_usernames || {}),
      ...(incoming?.linked_usernames || {}),
    },
    subscriptions: incoming?.subscriptions ?? base?.subscriptions ?? ['Crunchyroll', 'Netflix'],
  }
}

function loadInitialSettings() {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_SETTINGS
  }
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return mergeSettings(DEFAULT_SETTINGS, parsed)
    }
  } catch (err) {
    console.warn('[useUserSettings] Error loading settings from localStorage:', err)
  }
  return DEFAULT_SETTINGS
}

function saveToLocalStorage(settings) {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch (err) {
    console.warn('[useUserSettings] Error saving settings to localStorage:', err)
  }
}

export function useUserSettings({ debounceMs = 400 } = {}) {
  const { user } = useAuth()
  const isLoggedIn = Boolean(user)

  const [settings, setSettings] = useState(loadInitialSettings)
  const [syncStatus, setSyncStatus] = useState(isLoggedIn ? 'syncing' : 'idle')

  const debounceTimerRef = useRef(null)
  const settingsRef = useRef(settings)
  const isMountedRef = useRef(true)

  // Keep settingsRef in sync
  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Sync on auth state changes (login / logout)
  useEffect(() => {
    if (!user) {
      setSyncStatus('idle')
      return
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setSyncStatus('offline')
      return
    }

    let isSubscribed = true
    setSyncStatus('syncing')

    async function fetchCloudSettings() {
      try {
        const { data, error } = await supabaseClient
          .from('user_settings')
          .select('settings')
          .eq('user_id', user.id)
          .single()

        if (!isSubscribed || !isMountedRef.current) return

        if (error) {
          const isNotFound =
            error.code === 'PGRST116' ||
            error.message?.includes('PGRST116') ||
            error.message?.includes('JSON object requested')

          if (isNotFound) {
            // First time user: push initial local settings to cloud
            const current = settingsRef.current
            const { error: upsertError } = await supabaseClient
              .from('user_settings')
              .upsert({
                user_id: user.id,
                settings: current,
                updated_at: new Date().toISOString(),
              })

            if (!isSubscribed || !isMountedRef.current) return

            if (upsertError) {
              setSyncStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error')
            } else {
              setSyncStatus('synced')
            }
          } else {
            setSyncStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error')
          }
          return
        }

        // Cloud settings exist: merge cloud settings into local state & storage
        const cloudSettings = data?.settings || {}
        const merged = mergeSettings(settingsRef.current, cloudSettings)
        setSettings(merged)
        settingsRef.current = merged
        saveToLocalStorage(merged)
        setSyncStatus('synced')
      } catch (err) {
        if (isSubscribed && isMountedRef.current) {
          setSyncStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error')
        }
      }
    }

    fetchCloudSettings()

    return () => {
      isSubscribed = false
    }
  }, [user])

  const updateSettings = useCallback(
    (partial) => {
      setSettings((prev) => {
        const next = mergeSettings(prev, partial)
        settingsRef.current = next
        saveToLocalStorage(next)

        if (user) {
          if (typeof navigator !== 'undefined' && navigator.onLine === false) {
            setSyncStatus('offline')
            return next
          }

          setSyncStatus('syncing')
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current)
          }

          debounceTimerRef.current = setTimeout(async () => {
            try {
              if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                if (isMountedRef.current) setSyncStatus('offline')
                return
              }

              const { error } = await supabaseClient
                .from('user_settings')
                .upsert({
                  user_id: user.id,
                  settings: next,
                  updated_at: new Date().toISOString(),
                })

              if (!isMountedRef.current) return

              if (error) {
                setSyncStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error')
              } else {
                setSyncStatus('synced')
              }
            } catch (err) {
              if (isMountedRef.current) {
                setSyncStatus(typeof navigator !== 'undefined' && navigator.onLine === false ? 'offline' : 'error')
              }
            }
          }, debounceMs)
        }

        return next
      })
    },
    [user, debounceMs]
  )

  const updateSetting = useCallback(
    (key, value) => {
      updateSettings({ [key]: value })
    },
    [updateSettings]
  )

  return {
    settings,
    updateSetting,
    updateSettings,
    syncStatus,
    isLoggedIn,
    user,
  }
}

export default useUserSettings
