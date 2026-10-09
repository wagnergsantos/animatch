import React from 'react'
import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useUserSettings, DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from './useUserSettings'
import * as authModule from '../auth/AuthContext'
import { supabaseClient } from '../supabase'

vi.mock('../auth/AuthContext', () => ({
  useAuth: vi.fn(),
}))

vi.mock('../supabase', () => ({
  supabaseClient: {
    from: vi.fn(),
  },
}))

describe('useUserSettings', () => {
  let mockAuthUser = null
  let mockSupabaseSelect
  let mockSupabaseUpsert

  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    mockAuthUser = null

    authModule.useAuth.mockImplementation(() => ({
      user: mockAuthUser,
      isLoading: false,
    }))

    mockSupabaseSelect = vi.fn()
    mockSupabaseUpsert = vi.fn()

    supabaseClient.from.mockImplementation((table) => {
      if (table === 'user_settings') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: mockSupabaseSelect,
            }),
          }),
          upsert: mockSupabaseUpsert,
        }
      }
      return {}
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Anonymous mode (logged out)', () => {
    it('returns DEFAULT_SETTINGS when localStorage is empty', () => {
      const { result } = renderHook(() => useUserSettings())

      expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
      expect(result.current.isLoggedIn).toBe(false)
      expect(result.current.user).toBeNull()
      expect(result.current.syncStatus).toBe('idle')
    })

    it('loads saved settings from localStorage', () => {
      const customSettings = {
        default_provider: 'kitsu',
        theme: 'light',
        linked_usernames: { kitsu: 'kitsuUser' },
      }
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(customSettings))

      const { result } = renderHook(() => useUserSettings())

      expect(result.current.settings.default_provider).toBe('kitsu')
      expect(result.current.settings.theme).toBe('light')
      expect(result.current.settings.linked_usernames.kitsu).toBe('kitsuUser')
      expect(result.current.settings.linked_usernames.anilist).toBe('')
      expect(result.current.settings.language).toBe('pt-BR')
    })

    it('updates single setting and persists immediately to localStorage', () => {
      const { result } = renderHook(() => useUserSettings())

      act(() => {
        result.current.updateSetting('theme', 'light')
      })

      expect(result.current.settings.theme).toBe('light')
      const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY))
      expect(stored.theme).toBe('light')
      expect(result.current.syncStatus).toBe('idle')
      expect(supabaseClient.from).not.toHaveBeenCalled()
    })

    it('updates multiple settings via updateSettings and merges linked_usernames', () => {
      const { result } = renderHook(() => useUserSettings())

      act(() => {
        result.current.updateSettings({
          language: 'en',
          linked_usernames: { mal: 'myMalUser' },
        })
      })

      expect(result.current.settings.language).toBe('en')
      expect(result.current.settings.linked_usernames.mal).toBe('myMalUser')
      expect(result.current.settings.linked_usernames.anilist).toBe('')
      const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY))
      expect(stored.language).toBe('en')
      expect(stored.linked_usernames.mal).toBe('myMalUser')
    })
  })

  describe('Logged in mode (cloud sync on login)', () => {
    it('fetches cloud settings and merges into local state & localStorage', async () => {
      mockAuthUser = { id: 'user-123', email: 'user@test.com' }
      const cloudSettings = {
        default_provider: 'mal',
        theme: 'light',
        linked_usernames: { mal: 'malMaster' },
      }
      mockSupabaseSelect.mockResolvedValue({
        data: { settings: cloudSettings },
        error: null,
      })

      const { result } = renderHook(() => useUserSettings())

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('synced')
      })

      expect(result.current.settings.default_provider).toBe('mal')
      expect(result.current.settings.theme).toBe('light')
      expect(result.current.settings.linked_usernames.mal).toBe('malMaster')
      expect(result.current.isLoggedIn).toBe(true)

      const stored = JSON.parse(window.localStorage.getItem(SETTINGS_STORAGE_KEY))
      expect(stored.default_provider).toBe('mal')
    })

    it('upserts local settings if cloud record does not exist (PGRST116)', async () => {
      mockAuthUser = { id: 'user-new', email: 'new@test.com' }
      mockSupabaseSelect.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' },
      })
      mockSupabaseUpsert.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useUserSettings())

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('synced')
      })

      expect(mockSupabaseUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-new',
          settings: expect.objectContaining({ default_provider: 'anilist' }),
        })
      )
    })

    it('sets syncStatus to error if cloud fetch fails with other error', async () => {
      mockAuthUser = { id: 'user-err', email: 'err@test.com' }
      mockSupabaseSelect.mockResolvedValue({
        data: null,
        error: { code: '500', message: 'Internal Server Error' },
      })

      const { result } = renderHook(() => useUserSettings())

      await waitFor(() => {
        expect(result.current.syncStatus).toBe('error')
      })

      // Local state is preserved
      expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
    })
  })

  describe('Logged in mode (debounced updates)', () => {
    it('debounces cloud upsert when updating settings while logged in', async () => {
      vi.useFakeTimers()
      mockAuthUser = { id: 'user-debounce', email: 'deb@test.com' }
      mockSupabaseSelect.mockResolvedValue({
        data: { settings: DEFAULT_SETTINGS },
        error: null,
      })
      mockSupabaseUpsert.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useUserSettings({ debounceMs: 300 }))

      // Wait for initial sync
      await act(async () => {
        await vi.runAllTimersAsync()
      })
      expect(result.current.syncStatus).toBe('synced')

      // Update setting
      act(() => {
        result.current.updateSetting('theme', 'light')
      })

      expect(result.current.settings.theme).toBe('light')
      expect(result.current.syncStatus).toBe('syncing')
      expect(mockSupabaseUpsert).not.toHaveBeenCalled()

      // Fast forward time
      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      expect(mockSupabaseUpsert).toHaveBeenCalledTimes(1)
      expect(mockSupabaseUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-debounce',
          settings: expect.objectContaining({ theme: 'light' }),
        })
      )
      expect(result.current.syncStatus).toBe('synced')
    })

    it('batches rapid updates into a single cloud save with latest values', async () => {
      vi.useFakeTimers()
      mockAuthUser = { id: 'user-rapid', email: 'rapid@test.com' }
      mockSupabaseSelect.mockResolvedValue({
        data: { settings: DEFAULT_SETTINGS },
        error: null,
      })
      mockSupabaseUpsert.mockResolvedValue({ error: null })

      const { result } = renderHook(() => useUserSettings({ debounceMs: 300 }))
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      act(() => {
        result.current.updateSetting('theme', 'light')
      })
      act(() => {
        result.current.updateSetting('language', 'ja')
      })
      act(() => {
        result.current.updateSetting('streaming_boost', true)
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      expect(mockSupabaseUpsert).toHaveBeenCalledTimes(1)
      expect(mockSupabaseUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user-rapid',
          settings: expect.objectContaining({
            theme: 'light',
            language: 'ja',
            streaming_boost: true,
          }),
        })
      )
    })

    it('sets syncStatus to error if cloud save fails', async () => {
      vi.useFakeTimers()
      mockAuthUser = { id: 'user-fail', email: 'fail@test.com' }
      mockSupabaseSelect.mockResolvedValue({
        data: { settings: DEFAULT_SETTINGS },
        error: null,
      })
      mockSupabaseUpsert.mockResolvedValue({ error: { message: 'Network error' } })

      const { result } = renderHook(() => useUserSettings({ debounceMs: 300 }))
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      act(() => {
        result.current.updateSetting('theme', 'light')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      expect(result.current.syncStatus).toBe('error')
      // Local state is preserved
      expect(result.current.settings.theme).toBe('light')
    })

    it('sets syncStatus to offline if navigator is offline', async () => {
      vi.useFakeTimers()
      const originalOnLine = navigator.onLine
      Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })

      mockAuthUser = { id: 'user-offline', email: 'off@test.com' }

      const { result } = renderHook(() => useUserSettings({ debounceMs: 300 }))
      await act(async () => {
        await vi.runAllTimersAsync()
      })

      expect(result.current.syncStatus).toBe('offline')

      act(() => {
        result.current.updateSetting('theme', 'light')
      })

      await act(async () => {
        await vi.advanceTimersByTimeAsync(350)
      })

      expect(result.current.syncStatus).toBe('offline')
      expect(result.current.settings.theme).toBe('light')

      Object.defineProperty(navigator, 'onLine', { value: originalOnLine, configurable: true })
    })
  })
})
