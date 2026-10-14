import { useState, useEffect, useCallback, useRef } from 'react'
import { fetchUserEntries } from '../api/index.js'
import { mergeAnimeEntries } from '../logic/ensemble.js'

/**
 * Hook to concurrently fetch anime library entries from multiple providers
 * using Promise.allSettled for fault tolerance and graceful degradation.
 *
 * @param {Record<string, string>} linkedUsernames - Mapping of provider to username
 * @param {object} [options]
 * @param {boolean} [options.enabled=true] - Whether the hook should perform fetching
 * @returns {{
 *   entriesByProvider: Record<string, object[]>,
 *   consolidatedEntries: object[],
 *   failedProviders: string[],
 *   isLoading: boolean,
 *   refetch: (provider?: string) => Promise<void>
 * }}
 */
export function useEnsembleData(linkedUsernames = {}, { enabled = true } = {}) {
  const [entriesByProvider, setEntriesByProvider] = useState({})
  const [consolidatedEntries, setConsolidatedEntries] = useState([])
  const [failedProviders, setFailedProviders] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const isMountedRef = useRef(true)
  const entriesByProviderRef = useRef({})
  const failedProvidersRef = useRef([])
  const fetchIdRef = useRef(0)

  useEffect(() => {
    entriesByProviderRef.current = entriesByProvider
  }, [entriesByProvider])

  useEffect(() => {
    failedProvidersRef.current = failedProviders
  }, [failedProviders])

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  const usernamesKey = Object.entries(linkedUsernames || {})
    .filter(([, name]) => typeof name === 'string' && name.trim().length > 0)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([p, name]) => `${p}:${name.trim()}`)
    .join('|')

  const loadData = useCallback(
    async (options = {}) => {
      const activeEntries = Object.entries(linkedUsernames || {}).filter(
        ([, name]) => typeof name === 'string' && name.trim().length > 0
      )

      if (!enabled || activeEntries.length < 2) {
        if (isMountedRef.current) {
          setEntriesByProvider({})
          setConsolidatedEntries([])
          setFailedProviders([])
          setIsLoading(false)
        }
        return
      }

      const targetProvider =
        typeof options.provider === 'string' && options.provider.trim().length > 0
          ? options.provider.trim()
          : null

      const entriesToFetch = targetProvider
        ? activeEntries.filter(([p]) => p === targetProvider)
        : activeEntries

      if (entriesToFetch.length === 0) {
        return
      }

      const fetchId = ++fetchIdRef.current

      if (isMountedRef.current) {
        setIsLoading(true)
      }

      const fetchOpts = options.forceRefresh ? { forceRefresh: true } : {}

      const promises = entriesToFetch.map(async ([provider, name]) => {
        const data = await fetchUserEntries(name.trim(), provider, fetchOpts)
        return { provider, data }
      })

      const results = await Promise.allSettled(promises)

      if (!isMountedRef.current || fetchId !== fetchIdRef.current) {
        return
      }

      if (targetProvider) {
        const newEntriesByProvider = { ...entriesByProviderRef.current }
        let newFailedProviders = [...failedProvidersRef.current]

        results.forEach((res) => {
          if (res.status === 'fulfilled') {
            newEntriesByProvider[targetProvider] = res.value.data
            newFailedProviders = newFailedProviders.filter((p) => p !== targetProvider)
          } else {
            delete newEntriesByProvider[targetProvider]
            if (!newFailedProviders.includes(targetProvider)) {
              newFailedProviders.push(targetProvider)
            }
          }
        })

        const consolidated = mergeAnimeEntries(newEntriesByProvider)

        entriesByProviderRef.current = newEntriesByProvider
        failedProvidersRef.current = newFailedProviders

        setEntriesByProvider(newEntriesByProvider)
        setConsolidatedEntries(consolidated)
        setFailedProviders(newFailedProviders)
        setIsLoading(false)
      } else {
        const successfulMap = {}
        const failedList = []

        results.forEach((res, index) => {
          const provider = entriesToFetch[index][0]
          if (res.status === 'fulfilled') {
            successfulMap[provider] = res.value.data
          } else {
            failedList.push(provider)
          }
        })

        const consolidated = mergeAnimeEntries(successfulMap)

        entriesByProviderRef.current = successfulMap
        failedProvidersRef.current = failedList

        setEntriesByProvider(successfulMap)
        setConsolidatedEntries(consolidated)
        setFailedProviders(failedList)
        setIsLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [usernamesKey, enabled]
  )

  useEffect(() => {
    loadData()
  }, [loadData])

  const refetch = useCallback(
    (targetProvider) => {
      const single =
        typeof targetProvider === 'string' && targetProvider.trim().length > 0
          ? targetProvider.trim()
          : undefined
      return loadData({ forceRefresh: true, provider: single })
    },
    [loadData]
  )

  return {
    entriesByProvider,
    consolidatedEntries,
    failedProviders,
    isLoading,
    refetch,
  }
}

export default useEnsembleData
