import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useAsyncAction } from './useAsyncAction.js'

describe('useAsyncAction', () => {
  it('inicia com isLoading false e fica true durante a execução', async () => {
    let resolvePromise
    const actionFn = vi.fn(() => new Promise((resolve) => { resolvePromise = resolve }))
    const { result } = renderHook(() => useAsyncAction(actionFn))

    expect(result.current.isLoading).toBe(false)

    act(() => {
      result.current.execute('user1')
    })
    expect(result.current.isLoading).toBe(true)

    await act(async () => {
      resolvePromise()
    })
    expect(result.current.isLoading).toBe(false)
    expect(actionFn).toHaveBeenCalledWith('user1')
  })

  it('expõe error quando actionFn lança, e limpa isLoading', async () => {
    const actionFn = vi.fn().mockRejectedValue(new Error('usuário não encontrado'))
    const { result } = renderHook(() => useAsyncAction(actionFn))

    await act(async () => {
      await result.current.execute('user-invalido')
    })

    expect(result.current.error).toBe('usuário não encontrado')
    expect(result.current.isLoading).toBe(false)
  })

  it('limpa o error anterior ao iniciar uma nova execução', async () => {
    const actionFn = vi.fn().mockRejectedValueOnce(new Error('falhou')).mockResolvedValueOnce()
    const { result } = renderHook(() => useAsyncAction(actionFn))

    await act(async () => {
      await result.current.execute()
    })
    expect(result.current.error).toBe('falhou')

    await act(async () => {
      await result.current.execute()
    })
    expect(result.current.error).toBeNull()
  })

  it('setError permite limpar o erro manualmente (ex.: no logout)', async () => {
    const actionFn = vi.fn().mockRejectedValue(new Error('falhou'))
    const { result } = renderHook(() => useAsyncAction(actionFn))

    await act(async () => {
      await result.current.execute()
    })
    expect(result.current.error).toBe('falhou')

    act(() => {
      result.current.setError(null)
    })
    expect(result.current.error).toBeNull()
  })
})
