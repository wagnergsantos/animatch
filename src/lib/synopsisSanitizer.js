/**
 * Sanitiza a sinopse de anime vinda dos provedores (AniList, Kitsu, MAL).
 * - Remove tags HTML e decodifica entidades
 * - Limpa marcadores de citação ('>' soltos no início de linhas)
 * - Extrai fontes discretas tipo "(Source: ...)" ou "[Written by ...]"
 * - Detecta se o texto está predominantemente em inglês
 */

const HTML_ENTITIES = {
  '&quot;': '"',
  '&#039;': "'",
  '&apos;': "'",
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&mdash;': '—',
  '&ndash;': '–',
  '&hellip;': '…',
  '&nbsp;': ' ',
}

const COMMON_EN_WORDS = new Set([
  'the', 'and', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'with',
  'from', 'by', 'of', 'that', 'this', 'it', 'he', 'she', 'they', 'his', 'her',
  'their', 'after', 'before', 'when', 'while', 'who', 'which', 'an', 'as', 'into',
  'about', 'out', 'all', 'one', 'has', 'have', 'had', 'but', 'not', 'world', 'school',
  'life', 'years', 'day', 'time', 'student', 'friends'
])

const COMMON_PT_WORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'de', 'do', 'da', 'dos', 'das', 'em', 'no',
  'na', 'nos', 'nas', 'por', 'para', 'com', 'que', 'se', 'ele', 'ela', 'eles',
  'elas', 'seu', 'sua', 'seus', 'suas', 'quando', 'depois', 'antes', 'sobre',
  'como', 'mas', 'não', 'foi', 'eram', 'está', 'estão', 'vida', 'mundo', 'escola'
])

export function sanitizeSynopsis(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { text: '', source: null, isEnglish: false }
  }

  // 1. Converter quebras de linha HTML
  let processed = rawText.replace(/<br\s*\/?>/gi, '\n')

  // 2. Decodificar entidades HTML comuns
  for (const [entity, replacement] of Object.entries(HTML_ENTITIES)) {
    processed = processed.replaceAll(entity, replacement)
  }

  // 3. Remover tags HTML remanescentes
  processed = processed.replace(/<[^>]+>/g, '')

  // 4. Limpar marcas de citação soltas no início de linhas (ex: "> Texto" ou ">")
  processed = processed
    .split('\n')
    .map((line) => line.replace(/^[ \t]*(?:>|&gt;)[ \t]*/, '').trimEnd())
    .join('\n')

  // 5. Extrair menções de fonte / créditos
  let extractedSource = null

  // Padrão (Source: ...)
  const parenSourceMatch = processed.match(/\(\s*(?:Source|Fonte)\s*:\s*([^)]+)\)/i)
  if (parenSourceMatch) {
    extractedSource = parenSourceMatch[1].trim()
    processed = processed.replace(parenSourceMatch[0], '')
  }

  // Padrão [Written by ...] ou [Source: ...]
  if (!extractedSource) {
    const bracketSourceMatch = processed.match(/\[\s*(?:Source|Fonte|Written by)\s*:?\s*([^\]]+)\]/i)
    if (bracketSourceMatch) {
      extractedSource = bracketSourceMatch[1].trim()
      processed = processed.replace(bracketSourceMatch[0], '')
    }
  }

  // Padrão "Source: ..." no fim do texto ou linha isolada
  if (!extractedSource) {
    const lineSourceMatch = processed.match(/(?:^|\n)\s*(?:Source|Fonte)\s*:\s*([^\n\r]+)$/i)
    if (lineSourceMatch) {
      extractedSource = lineSourceMatch[1].trim()
      processed = processed.replace(lineSourceMatch[0], '')
    }
  }

  // 6. Normalizar quebras de linha e espaços
  processed = processed
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  // 7. Heurística de idioma (Inglês vs Português)
  const words = (processed.toLowerCase().match(/\b[\p{L}'-]+\b/gu) || [])
  let enCount = 0
  let ptCount = 0

  for (const w of words) {
    if (COMMON_EN_WORDS.has(w)) enCount++
    if (COMMON_PT_WORDS.has(w)) ptCount++
  }

  const isEnglish = enCount >= 3 && enCount > ptCount

  return {
    text: processed,
    source: extractedSource,
    isEnglish,
  }
}
