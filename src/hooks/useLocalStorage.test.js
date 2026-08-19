import { renderHook, act } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import useLocalStorage from './useLocalStorage'

describe('useLocalStorage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('retorna initialValue quando localStorage está vazio', () => {
    const { result } = renderHook(() => useLocalStorage('test_key', 'default_val'))
    expect(result.current[0]).toBe('default_val')
  })

  it('lê valor existente no localStorage', () => {
    window.localStorage.setItem('test_key', JSON.stringify('saved_val'))
    const { result } = renderHook(() => useLocalStorage('test_key', 'default_val'))
    expect(result.current[0]).toBe('saved_val')
  })

  it('atualiza valor no state e no localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('test_key', 'initial'))
    act(() => {
      result.current[1]('updated')
    })
    expect(result.current[0]).toBe('updated')
    expect(window.localStorage.getItem('test_key')).toBe('updated')
  })

  it('suporta updater function em setValue', () => {
    const { result } = renderHook(() => useLocalStorage('count', 1))
    act(() => {
      result.current[1]((prev) => prev + 1)
    })
    expect(result.current[0]).toBe(2)
  })

  it('trata graciosamente dados de string legada ou não-JSON', () => {
    window.localStorage.setItem('invalid_json', 'legacy_string')
    const { result } = renderHook(() => useLocalStorage('invalid_json', 'fallback'))
    expect(result.current[0]).toBe('legacy_string')
    expect(window.localStorage.getItem('invalid_json')).toBe('legacy_string')
  })
})
