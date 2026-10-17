const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 630

function normalizeEntryScore(raw) {
  if (raw == null) return null
  const num = Number(raw)
  if (Number.isNaN(num) || num <= 0) return null
  return num > 10 ? +(num / 10).toFixed(2) : +num.toFixed(2)
}

function resolveRecTitle(rec, titlePref = 'english') {
  const titleObj =
    rec?.titleObj ||
    (typeof rec?.title === 'object' ? rec.title : null) ||
    rec?.media?.title ||
    {}
  const english = typeof titleObj.english === 'string' ? titleObj.english.trim() : ''
  const romaji = typeof titleObj.romaji === 'string' ? titleObj.romaji.trim() : ''
  const direct = typeof rec?.title === 'string' ? rec.title.trim() : ''

  if (titlePref === 'romaji') {
    return romaji || english || direct || 'Untitled'
  }
  return english || romaji || direct || 'Untitled'
}

function resolveCoverImage(rec) {
  if (typeof rec?.coverImage === 'string' && rec.coverImage) return rec.coverImage
  if (rec?.coverImage?.large) return rec.coverImage.large
  if (rec?.coverImage?.medium) return rec.coverImage.medium
  if (typeof rec?.media?.coverImage === 'string' && rec.media.coverImage) return rec.media.coverImage
  if (rec?.media?.coverImage?.large) return rec.media.coverImage.large
  if (rec?.media?.coverImage?.medium) return rec.media.coverImage.medium
  return null
}

export function buildWrappedData({
  username = '',
  providerLabel = 'AniList',
  isEnsemble = false,
  activeProviders = [],
  entries = [],
  tasteProfile = new Map(),
  recommendations = [],
  titlePref = 'english',
} = {}) {
  const safeEntries = Array.isArray(entries) ? entries : []

  let completedCount = 0
  let totalEpisodes = 0
  let scoreSum = 0
  let scoredCount = 0

  for (const entry of safeEntries) {
    if (!entry) continue
    const status = String(entry.status || '').toUpperCase()
    const media = entry.media || entry
    const episodes = Number(media?.episodes ?? entry?.episodes ?? 0)

    if (status === 'COMPLETED') {
      completedCount += 1
      if (episodes > 0) totalEpisodes += episodes
    } else if (status === 'CURRENT') {
      const progress = Number(entry.progress ?? episodes ?? 0)
      if (progress > 0) totalEpisodes += progress
    }

    const score = normalizeEntryScore(entry.score ?? entry.userScore)
    if (score != null) {
      scoreSum += score
      scoredCount += 1
    }
  }

  const meanScore = scoredCount > 0 ? +(scoreSum / scoredCount).toFixed(2) : 0

  const profileEntries =
    tasteProfile && typeof tasteProfile.entries === 'function'
      ? Array.from(tasteProfile.entries())
      : []

  const topGenres = profileEntries
    .map(([genre, stats]) => {
      const score = Number(stats?.adjustedAverage ?? stats?.average ?? 0)
      const count = Number(stats?.count ?? 0)
      return {
        genre,
        score: +score.toFixed(2),
        count,
        percentage: Math.min(100, Math.max(0, Math.round((score / 10) * 100))),
      }
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return b.count - a.count
    })
    .slice(0, 5)

  const safeRecs = Array.isArray(recommendations) ? recommendations : []
  const topRecommendations = safeRecs.slice(0, 3).map((rec, index) => {
    const media = rec?.media || rec || {}
    const predictedScore = Number(rec?.predictedScore ?? 0)
    const communityScore = Number(rec?.communityScore ?? media?.averageScore ?? 0)
    const normalizedComm =
      communityScore > 10 ? +(communityScore / 10).toFixed(1) : +communityScore.toFixed(1)

    return {
      rank: index + 1,
      id: rec?.id ?? media?.id ?? index + 1,
      title: resolveRecTitle(rec, titlePref),
      predictedScore: +predictedScore.toFixed(1),
      communityScore: normalizedComm,
      format: rec?.format ?? media?.format ?? null,
      year: rec?.year ?? rec?.seasonYear ?? media?.seasonYear ?? null,
      genres: (rec?.genres || media?.genres || []).slice(0, 3),
      coverImage: resolveCoverImage(rec),
    }
  })

  return {
    username: username || 'User',
    providerLabel,
    isEnsemble: Boolean(isEnsemble),
    activeProviders: Array.isArray(activeProviders) ? activeProviders : [],
    metrics: {
      completedCount,
      totalEpisodes,
      meanScore,
    },
    topGenres,
    topRecommendations,
  }
}

export function defaultLoadCorsImage(url, timeoutMs = 2500) {
  return new Promise((resolve) => {
    if (!url || typeof Image === 'undefined') {
      resolve(null)
      return
    }
    let settled = false
    const finish = (val) => {
      if (!settled) {
        settled = true
        resolve(val)
      }
    }
    const timer = setTimeout(() => finish(null), timeoutMs)
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      clearTimeout(timer)
      finish(img)
    }
    img.onerror = () => {
      clearTimeout(timer)
      finish(null)
    }
    img.src = url
  })
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath()
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, width, height, radius)
  } else {
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.arcTo(x + width, y, x + width, y + radius, radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.arcTo(x + width, y + height, x + width - radius, y + height, radius)
    ctx.lineTo(x + radius, y + height)
    ctx.arcTo(x, y + height, x, y + height - radius, radius)
    ctx.lineTo(x, y + radius)
    ctx.arcTo(x, y, x + radius, y, radius)
  }
  ctx.closePath()
}

function truncateText(ctx, text, maxWidth) {
  const str = String(text || '')
  if (!str) return ''
  if (ctx.measureText(str).width <= maxWidth) return str
  let truncated = str
  while (truncated.length > 1 && ctx.measureText(`${truncated}…`).width > maxWidth) {
    truncated = truncated.slice(0, -1)
  }
  return `${truncated.trim()}…`
}

export async function renderWrappedCanvas(
  canvas,
  wrappedData,
  labels = {},
  imageLoader = defaultLoadCorsImage
) {
  if (!canvas) return
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT

  if (
    typeof HTMLCanvasElement !== 'undefined' &&
    canvas instanceof HTMLCanvasElement &&
    typeof navigator !== 'undefined' &&
    /jsdom/i.test(navigator.userAgent || '')
  ) {
    return
  }

  let ctx = null
  try {
    ctx = canvas.getContext('2d')
  } catch {
    return
  }
  if (!ctx) return

  const copy = {
    subtitle: labels.subtitle || 'Taste Profile & Top Recommendations',
    completed: labels.completed || 'Concluídos',
    episodes: labels.episodes || 'Episódios',
    meanScore: labels.meanScore || 'Média Pessoal',
    topGenresTitle: labels.topGenresTitle || 'Top Gêneros (Média Bayesiana)',
    topRecsTitle: labels.topRecsTitle || 'Top 3 Recomendações para Assistir',
    noGenres: labels.noGenres || 'Avalie mais animes para gerar seu perfil de gêneros.',
    noRecs: labels.noRecs || 'Adicione animes à sua lista Planning para ver recomendações.',
    footer: labels.footer || 'Gerado por AniMatch • Descubra o que assistir baseado no seu gosto real',
    matchLabel: labels.matchLabel || 'Match',
  }

  // 1. Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  bgGrad.addColorStop(0, '#090d16')
  bgGrad.addColorStop(0.55, '#111827')
  bgGrad.addColorStop(1, '#1e1b4b')
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Subtle decorative glow circles
  const glow1 = ctx.createRadialGradient(1080, 90, 10, 1080, 90, 260)
  glow1.addColorStop(0, 'rgba(99, 102, 241, 0.22)')
  glow1.addColorStop(1, 'rgba(99, 102, 241, 0)')
  ctx.fillStyle = glow1
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  const glow2 = ctx.createRadialGradient(140, 560, 10, 140, 560, 260)
  glow2.addColorStop(0, 'rgba(139, 92, 246, 0.18)')
  glow2.addColorStop(1, 'rgba(139, 92, 246, 0)')
  ctx.fillStyle = glow2
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

  // Outer border frame
  drawRoundedRect(ctx, 20, 20, CANVAS_WIDTH - 40, CANVAS_HEIGHT - 40, 20)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // 2. Header
  ctx.fillStyle = '#818cf8'
  ctx.font = '700 15px system-ui, -apple-system, sans-serif'
  ctx.fillText('✨ ANIMATCH WRAPPED', 48, 58)

  ctx.fillStyle = '#f8fafc'
  ctx.font = '800 30px system-ui, -apple-system, sans-serif'
  const profileHeading = wrappedData.isEnsemble
    ? `🌐 ${wrappedData.username}`
    : `@${wrappedData.username}`
  ctx.fillText(truncateText(ctx, profileHeading, 680), 48, 94)

  // Provider badge pill
  const providerBadgeText =
    wrappedData.isEnsemble && wrappedData.activeProviders?.length > 0
      ? wrappedData.activeProviders.join(' · ')
      : wrappedData.providerLabel || 'AniList'

  ctx.font = '600 14px system-ui, -apple-system, sans-serif'
  const badgeWidth = ctx.measureText(providerBadgeText).width + 28
  drawRoundedRect(ctx, CANVAS_WIDTH - 48 - badgeWidth, 52, badgeWidth, 34, 17)
  ctx.fillStyle = 'rgba(99, 102, 241, 0.18)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(129, 140, 248, 0.4)'
  ctx.lineWidth = 1
  ctx.stroke()

  ctx.fillStyle = '#c7d2fe'
  ctx.fillText(providerBadgeText, CANVAS_WIDTH - 48 - badgeWidth + 14, 74)

  // Divider line
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.fillRect(48, 112, CANVAS_WIDTH - 96, 1)

  // 3. Left Column: Global KPIs (x: 48..572)
  const kpiCards = [
    {
      label: copy.completed,
      value: String(wrappedData.metrics?.completedCount ?? 0),
      accent: '#38bdf8',
    },
    {
      label: copy.episodes,
      value: String(wrappedData.metrics?.totalEpisodes ?? 0),
      accent: '#a78bfa',
    },
    {
      label: copy.meanScore,
      value:
        wrappedData.metrics?.meanScore > 0
          ? `★ ${wrappedData.metrics.meanScore.toFixed(2)}`
          : '—',
      accent: '#fbbf24',
    },
  ]

  const kpiWidth = 166
  const kpiGap = 13
  kpiCards.forEach((kpi, idx) => {
    const kx = 48 + idx * (kpiWidth + kpiGap)
    const ky = 130
    drawRoundedRect(ctx, kx, ky, kpiWidth, 82, 14)
    ctx.fillStyle = 'rgba(30, 41, 59, 0.72)'
    ctx.fill()
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)'
    ctx.lineWidth = 1
    ctx.stroke()

    ctx.fillStyle = '#94a3b8'
    ctx.font = '600 12px system-ui, -apple-system, sans-serif'
    ctx.fillText(truncateText(ctx, kpi.label.toUpperCase(), kpiWidth - 24), kx + 14, ky + 28)

    ctx.fillStyle = kpi.accent
    ctx.font = '800 24px system-ui, -apple-system, sans-serif'
    ctx.fillText(kpi.value, kx + 14, ky + 62)
  })

  // 4. Left Column: Top 5 Genres (y: 236..550)
  ctx.fillStyle = '#e2e8f0'
  ctx.font = '700 17px system-ui, -apple-system, sans-serif'
  ctx.fillText(copy.topGenresTitle, 48, 252)

  const genres = wrappedData.topGenres || []
  if (genres.length === 0) {
    drawRoundedRect(ctx, 48, 268, 524, 120, 14)
    ctx.fillStyle = 'rgba(30, 41, 59, 0.45)'
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.font = '500 14px system-ui, -apple-system, sans-serif'
    ctx.fillText(truncateText(ctx, copy.noGenres, 490), 68, 332)
  } else {
    genres.forEach((g, idx) => {
      const gy = 268 + idx * 56
      drawRoundedRect(ctx, 48, gy, 524, 46, 10)
      ctx.fillStyle = 'rgba(30, 41, 59, 0.65)'
      ctx.fill()

      // Progress bar inside card
      const barMaxW = 524
      const barFillW = Math.max(40, Math.round((g.percentage / 100) * barMaxW))
      drawRoundedRect(ctx, 48, gy, barFillW, 46, 10)
      ctx.fillStyle =
        g.score >= 8.0 ? 'rgba(99, 102, 241, 0.28)' : 'rgba(148, 163, 184, 0.14)'
      ctx.fill()

      ctx.fillStyle = '#f8fafc'
      ctx.font = '700 15px system-ui, -apple-system, sans-serif'
      ctx.fillText(`#${idx + 1}  ${g.genre}`, 64, gy + 28)

      const rightText = `★ ${g.score.toFixed(2)}  (${g.count})`
      ctx.font = '600 14px system-ui, -apple-system, sans-serif'
      const rw = ctx.measureText(rightText).width
      ctx.fillStyle = g.score >= 8.0 ? '#a5b4fc' : '#cbd5e1'
      ctx.fillText(rightText, 48 + 524 - rw - 16, gy + 28)
    })
  }

  // 5. Right Column: Top 3 Recommendations (x: 604..1152)
  ctx.fillStyle = '#e2e8f0'
  ctx.font = '700 17px system-ui, -apple-system, sans-serif'
  ctx.fillText(copy.topRecsTitle, 604, 150)

  const recs = wrappedData.topRecommendations || []
  const loadedImages = await Promise.all(
    recs.map((r) => (r.coverImage ? imageLoader(r.coverImage) : Promise.resolve(null)))
  )

  if (recs.length === 0) {
    drawRoundedRect(ctx, 604, 168, 548, 160, 14)
    ctx.fillStyle = 'rgba(30, 41, 59, 0.45)'
    ctx.fill()
    ctx.fillStyle = '#94a3b8'
    ctx.font = '500 14px system-ui, -apple-system, sans-serif'
    ctx.fillText(truncateText(ctx, copy.noRecs, 510), 624, 252)
  } else {
    recs.forEach((rec, idx) => {
      const rx = 604
      const ry = 168 + idx * 128
      const rw = 548
      const rh = 114

      drawRoundedRect(ctx, rx, ry, rw, rh, 14)
      ctx.fillStyle = 'rgba(30, 41, 59, 0.78)'
      ctx.fill()
      ctx.strokeStyle =
        idx === 0 ? 'rgba(129, 140, 248, 0.45)' : 'rgba(255, 255, 255, 0.07)'
      ctx.lineWidth = idx === 0 ? 1.5 : 1
      ctx.stroke()

      // Cover thumbnail or Rank Fallback Box (68x90)
      const thumbX = rx + 12
      const thumbY = ry + 12
      const thumbW = 68
      const thumbH = 90
      const img = loadedImages[idx]

      ctx.save()
      drawRoundedRect(ctx, thumbX, thumbY, thumbW, thumbH, 8)
      ctx.clip()
      if (img) {
        try {
          ctx.drawImage(img, thumbX, thumbY, thumbW, thumbH)
        } catch {
          ctx.fillStyle = '#312e81'
          ctx.fillRect(thumbX, thumbY, thumbW, thumbH)
        }
      } else {
        const rankGrad = ctx.createLinearGradient(
          thumbX,
          thumbY,
          thumbX + thumbW,
          thumbY + thumbH
        )
        rankGrad.addColorStop(0, '#4f46e5')
        rankGrad.addColorStop(1, '#7c3aed')
        ctx.fillStyle = rankGrad
        ctx.fillRect(thumbX, thumbY, thumbW, thumbH)

        ctx.fillStyle = '#ffffff'
        ctx.font = '800 24px system-ui, -apple-system, sans-serif'
        ctx.fillText(`#${rec.rank}`, thumbX + 18, thumbY + 54)
      }
      ctx.restore()

      // Title & metadata
      const contentX = thumbX + thumbW + 16
      const maxTitleW = 335

      ctx.fillStyle = '#818cf8'
      ctx.font = '700 12px system-ui, -apple-system, sans-serif'
      const metaParts = [`#${rec.rank}`]
      if (rec.format) metaParts.push(rec.format)
      if (rec.year) metaParts.push(String(rec.year))
      ctx.fillText(metaParts.join(' • '), contentX, ry + 30)

      ctx.fillStyle = '#f8fafc'
      ctx.font = '700 18px system-ui, -apple-system, sans-serif'
      ctx.fillText(truncateText(ctx, rec.title, maxTitleW), contentX, ry + 56)

      // Genres pills text
      if (rec.genres && rec.genres.length > 0) {
        ctx.fillStyle = '#94a3b8'
        ctx.font = '500 13px system-ui, -apple-system, sans-serif'
        ctx.fillText(truncateText(ctx, rec.genres.join(' · '), maxTitleW), contentX, ry + 84)
      }

      // Score badge on right side of card
      const badgeW = 94
      const badgeH = 54
      const badgeX = rx + rw - badgeW - 14
      const badgeY = ry + 30
      drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 10)
      ctx.fillStyle = 'rgba(99, 102, 241, 0.2)'
      ctx.fill()

      ctx.fillStyle = '#fbbf24'
      ctx.font = '800 18px system-ui, -apple-system, sans-serif'
      const scoreStr = `★ ${rec.predictedScore.toFixed(1)}`
      ctx.fillText(scoreStr, badgeX + 16, badgeY + 26)

      ctx.fillStyle = '#cbd5e1'
      ctx.font = '600 11px system-ui, -apple-system, sans-serif'
      const matchPercent = Math.round((rec.predictedScore / 10) * 100)
      ctx.fillText(`${matchPercent}% ${copy.matchLabel}`, badgeX + 16, badgeY + 44)
    })
  }

  // 6. Footer
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)'
  ctx.fillRect(48, 562, CANVAS_WIDTH - 96, 1)

  ctx.fillStyle = '#64748b'
  ctx.font = '500 13px system-ui, -apple-system, sans-serif'
  ctx.fillText(copy.footer, 48, 588)
}

export function canvasToPngBlob(canvas) {
  return new Promise((resolve, reject) => {
    if (!canvas || typeof canvas.toBlob !== 'function') {
      reject(new Error('Canvas toBlob not supported'))
      return
    }
    try {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Failed to generate PNG blob'))
      }, 'image/png')
    } catch (err) {
      reject(err)
    }
  })
}

export async function downloadWrappedPng(canvas, filename = 'animatch-wrapped.png') {
  const blob = await canvasToPngBlob(canvas)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  return blob
}

export async function copyWrappedPngToClipboard(canvas) {
  if (
    typeof navigator === 'undefined' ||
    !navigator.clipboard?.write ||
    typeof window === 'undefined' ||
    typeof window.ClipboardItem === 'undefined'
  ) {
    throw new Error('Clipboard image write not supported')
  }
  const blob = await canvasToPngBlob(canvas)
  const item = new window.ClipboardItem({ 'image/png': blob })
  await navigator.clipboard.write([item])
  return true
}
