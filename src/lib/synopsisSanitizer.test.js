import { describe, it, expect } from 'vitest'
import { sanitizeSynopsis } from './synopsisSanitizer.js'

describe('sanitizeSynopsis', () => {
  it('handles empty or non-string inputs safely', () => {
    expect(sanitizeSynopsis('')).toEqual({ text: '', source: null, isEnglish: false })
    expect(sanitizeSynopsis(null)).toEqual({ text: '', source: null, isEnglish: false })
    expect(sanitizeSynopsis(undefined)).toEqual({ text: '', source: null, isEnglish: false })
  })

  it('removes stray blockquote markers ">" on separate or start of lines', () => {
    const raw = `> This is a quote line.
>
> Another paragraph with text.
Regular line here.`

    const res = sanitizeSynopsis(raw)
    expect(res.text).not.toContain('>')
    expect(res.text).toBe(`This is a quote line.

Another paragraph with text.
Regular line here.`)
  })

  it('decodes HTML entities and strips HTML tags', () => {
    const raw = `<i>Gintama</i> &amp; its &#039;humor&#039; is &quot;great&quot;.<br><br>Second paragraph.`
    const res = sanitizeSynopsis(raw)
    expect(res.text).toBe(`Gintama & its 'humor' is "great".\n\nSecond paragraph.`)
  })

  it('extracts source in parentheses and cleans synopsis', () => {
    const raw = `The Amanto, aliens from outer space, have invaded Earth. (Source: Sentai Filmworks)`
    const res = sanitizeSynopsis(raw)
    expect(res.source).toBe('Sentai Filmworks')
    expect(res.text).toBe('The Amanto, aliens from outer space, have invaded Earth.')
  })

  it('extracts source in brackets like [Written by MAL Rewrite]', () => {
    const raw = `High school student Light Yagami finds a notebook.\n\n[Written by MAL Rewrite]`
    const res = sanitizeSynopsis(raw)
    expect(res.source).toBe('MAL Rewrite')
    expect(res.text).toBe('High school student Light Yagami finds a notebook.')
  })

  it('detects English synopsis properly', () => {
    const enText = `The Amanto, aliens from outer space, have invaded Earth and taken over feudal Japan.`
    expect(sanitizeSynopsis(enText).isEnglish).toBe(true)

    const ptText = `Os alienígenas invadiram a Terra e dominaram o Japão feudal com suas naves e robôs.`
    expect(sanitizeSynopsis(ptText).isEnglish).toBe(false)
  })
})
