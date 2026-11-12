/**
 * Utilitário de instrumentação e medição de performance do AniMatch (Fase A0).
 * Desativado em produção por padrão; habilitado em DEV ou via localStorage 'animatch_debug_perf' === '1'.
 */

export function isPerfEnabled() {
  if (typeof performance === 'undefined' || typeof performance.mark !== 'function') {
    return false
  }
  try {
    const isDev = Boolean(import.meta?.env?.DEV)
    const isExplicitlyEnabled =
      typeof localStorage !== 'undefined' &&
      localStorage.getItem('animatch_debug_perf') === '1'
    return isDev || isExplicitlyEnabled
  } catch {
    return false
  }
}

export function mark(name) {
  if (!isPerfEnabled()) return
  try {
    performance.mark(`animatch:${name}`)
  } catch {
    // Falha silenciosa para nunca quebrar a UI
  }
}

export function measure(name, startMark, endMark) {
  if (!isPerfEnabled()) return null
  try {
    const start = startMark ? `animatch:${startMark}` : undefined
    const end = endMark ? `animatch:${endMark}` : undefined
    const m = performance.measure(`animatch:${name}`, start, end)
    const duration = m?.duration ?? null
    if (typeof duration === 'number' && typeof console !== 'undefined' && console.debug) {
      console.debug(`[perf] ${name}: ${duration.toFixed(1)}ms`)
    }
    return duration
  } catch {
    return null
  }
}

export function clearPerfMarks() {
  if (typeof performance === 'undefined' || typeof performance.clearMarks !== 'function') {
    return
  }
  try {
    performance.clearMarks()
    if (typeof performance.clearMeasures === 'function') {
      performance.clearMeasures()
    }
  } catch {
    // noop
  }
}
