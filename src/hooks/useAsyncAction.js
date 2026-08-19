import { useCallback, useState } from 'react'

/**
 * Encapsula o par `isLoading`/`error` ao redor de uma ação assíncrona
 * disparada por evento do usuário (clique, submit, parâmetro de URL) — não
 * por mount automático. É o par de `useItems()` (template em
 * arquitetura_inicial/) para o caso "ação", não "consulta": `handleLogin` do
 * AniMatch é acionado por clique/URL, não por efeito de montagem, então o
 * hook de fetch-automático do template não se encaixa aqui.
 *
 * `actionFn` deve tratar seus próprios efeitos colaterais de sucesso
 * (`setState` de dados, navegação etc.) e relançar (`throw`) em caso de
 * erro — o hook só cuida de `isLoading`/`error` de forma uniforme.
 *
 * @param {(...args: unknown[]) => Promise<void>} actionFn
 */
export function useAsyncAction(actionFn) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)

  const execute = useCallback(
    async (...args) => {
      setIsLoading(true)
      setError(null)
      try {
        await actionFn(...args)
      } catch (err) {
        setError(err.message || String(err))
      } finally {
        setIsLoading(false)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- actionFn vem do chamador a cada render
    [actionFn]
  )

  return { execute, isLoading, error, setError }
}
