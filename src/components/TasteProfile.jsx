import './TasteProfile.css'

export default function TasteProfile({ profile = new Map(), onGenreClick }) {
  const entries = profile?.entries ? [...profile.entries()] : []
  const sorted = entries.sort((a, b) => {
    const scoreA = a[1]?.adjustedAverage ?? a[1]?.average ?? 0
    const scoreB = b[1]?.adjustedAverage ?? b[1]?.average ?? 0
    if (scoreB !== scoreA) return scoreB - scoreA
    return (b[1]?.count ?? 0) - (a[1]?.count ?? 0)
  })

  const countAbove8 = sorted.filter(([_, stats]) => (stats?.adjustedAverage ?? stats?.average ?? 0) >= 8.00).length
  const limit = Math.max(5, countAbove8)
  const displayBadges = sorted.slice(0, limit)

  return (
    <section className="taste-profile">
      <h2 className="taste-profile__title">Seu Perfil de Gosto</h2>
      <div className="taste-profile__badges">
        {displayBadges.map(([genre, stats]) => {
          const score = stats?.adjustedAverage ?? stats?.average ?? 0
          const isFilled = score >= 8.00
          const realAvg = stats?.average ?? 0
          const count = stats?.count ?? 0

          return (
            <span
              key={genre}
              className={`taste-badge ${isFilled ? 'taste-badge--filled' : 'taste-badge--outline'}`}
              onClick={() => onGenreClick?.(genre)}
              style={{ cursor: onGenreClick ? 'pointer' : 'default' }}
            >
              {genre} ★ {realAvg.toFixed(2)} ({count})
            </span>
          )
        })}
      </div>
    </section>
  )
}


