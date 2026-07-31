import './TasteProfile.css'

export default function TasteProfile({ profile }) {
  const sorted = [...profile.entries()]
    .sort((a, b) => b[1].average - a[1].average)
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
            {genre} ★ {stats.average.toFixed(1)}
          </span>
        ))}
      </div>
    </section>
  )
}
