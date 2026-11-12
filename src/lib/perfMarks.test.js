import { describe, it, expect, beforeEach, vi } from 'vitest'
import { isPerfEnabled, mark, measure, clearPerfMarks } from './perfMarks.js'

describe('perfMarks', () => {
  beforeEach(() => {
    localStorage.clear()
    clearPerfMarks()
  })

  it('detects isPerfEnabled based on DEV or localStorage flag', () => {
    // In test environment with import.meta.env.DEV:
    expect(isPerfEnabled()).toBe(true)

    // With explicit localStorage flag:
    localStorage.setItem('animatch_debug_perf', '1')
    expect(isPerfEnabled()).toBe(true)
  })

  it('marks and measures performance durations cleanly', () => {
    mark('test_start')
    mark('test_end')

    const duration = measure('test_op', 'test_start', 'test_end')
    expect(typeof duration).toBe('number')
    expect(duration).toBeGreaterThanOrEqual(0)
  })

  it('handles invalid or non-existent marks gracefully returning null', () => {
    const duration = measure('non_existent', 'invalid_start', 'invalid_end')
    expect(duration).toBeNull()
  })

  it('handles environment when performance API throws or is unavailable', () => {
    const originalMark = performance.mark
    try {
      performance.mark = vi.fn().mockImplementation(() => {
        throw new Error('Performance disabled')
      })
      expect(() => mark('error_test')).not.toThrow()
    } finally {
      performance.mark = originalMark
    }
  })

  it('clears performance marks and measures without errors', () => {
    mark('m1')
    expect(() => clearPerfMarks()).not.toThrow()
  })
})
