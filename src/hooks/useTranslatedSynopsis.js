import { useState, useEffect, useRef } from 'react'
import { sanitizeSynopsis } from '../lib/synopsisSanitizer.js'
import { translateSynopsis, getCachedSynopsis } from '../api/synopsisTranslator.js'

/**
 * Hook para gerenciar e traduzir sob demanda a sinopse do anime.
 *
 * @param {object} anime - Objeto do anime
 * @param {string} [currentLang='pt-BR'] - Idioma ativo na aplicação
 * @param {boolean} [enabled=true] - Se a tradução automática deve ser executada
 */
export function useTranslatedSynopsis(anime, currentLang = 'pt-BR', enabled = true) {
  const rawDescription = anime?.description || ''
  const animeId = anime?.id || anime?.idMal || anime?.kitsuId || null

  const sanitized = sanitizeSynopsis(rawDescription)
  const isEligibleForTranslation = Boolean(
    enabled &&
    sanitized.text &&
    sanitized.isEnglish &&
    currentLang.startsWith('pt')
  )

  const cachedTranslation = isEligibleForTranslation
    ? getCachedSynopsis(animeId, sanitized.text, 'pt-BR')
    : null

  const [translatedText, setTranslatedText] = useState(cachedTranslation || null)
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationError, setTranslationError] = useState(null)
  const [showOriginal, setShowOriginal] = useState(false)

  const abortControllerRef = useRef(null)

  useEffect(() => {
    // Se o anime mudar, reinicia estado
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (!isEligibleForTranslation) {
      setTranslatedText(null)
      setIsTranslating(false)
      setTranslationError(null)
      setShowOriginal(false)
      return
    }

    const cached = getCachedSynopsis(animeId, sanitized.text, 'pt-BR')
    if (cached) {
      setTranslatedText(cached)
      setIsTranslating(false)
      setTranslationError(null)
      return
    }

    const controller = new AbortController()
    abortControllerRef.current = controller

    setIsTranslating(true)
    setTranslationError(null)

    translateSynopsis(sanitized.text, {
      targetLang: 'pt-BR',
      animeId,
      signal: controller.signal,
    })
      .then((res) => {
        if (!controller.signal.aborted) {
          setTranslatedText(res.translatedText)
          setIsTranslating(false)
        }
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setIsTranslating(false)
          setTranslationError(err.message)
        }
      })

    return () => {
      controller.abort()
    }
  }, [animeId, sanitized.text, isEligibleForTranslation])

  const hasTranslation = Boolean(translatedText && translatedText !== sanitized.text)
  const activeSynopsis = (hasTranslation && !showOriginal)
    ? translatedText
    : sanitized.text

  return {
    synopsis: activeSynopsis,
    originalSynopsis: sanitized.text,
    source: sanitized.source,
    isEnglish: sanitized.isEnglish,
    isTranslated: hasTranslation && !showOriginal,
    isTranslating,
    translationError,
    showOriginal,
    hasTranslation,
    toggleShowOriginal: () => setShowOriginal((prev) => !prev),
  }
}
