import './TasteProfile.css'

export default function TasteProfile({ profile = new Map() }) {
  const entries = profile?.entries ? [...profile.entries()] : []
  const sorted = entries
    .sort((a, b) => {
      const scoreA = a[1]?.adjustedAverage ?? a[1]?.average ?? 0
      const scoreB = b[1]?.adjustedAverage ?? b[1]?.average ?? 0
      if (scoreB !== scoreA) return scoreB - scoreA
      return (b[1]?.count ?? 0) - (a[1]?.count ?? 0)
    })
    .slice(0, 5)

  return (
    <section className="taste-profile">
      <h2 className="taste-profile__title">Seu Perfil de Gosto</h2>
      <div className="taste-profile__badges">
        {sorted.map(([genre, stats], index) => (
          <span
            key={genre}
            className={`taste-badge ${index < 3 ? 'taste-badge--filled' : 'taste-badge--outline'}`}
          >
            {genre} ★ {(stats?.average ?? 0).toFixed(1)} ({stats?.count ?? 0})
          </span>
        ))}
      </div>
    </section>
  )
}

