import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import GenreOriginModal from './GenreOriginModal'
import './TasteProfile.css'

export default function TasteProfile({ profile = new Map(), onGenreClick }) {
  const { t } = useTranslation()
  const [selectedModalGenre, setSelectedModalGenre] = useState(null)

  const entries = profile?.entries ? [...profile.entries()] : []
  const sorted = entries.sort((a, b) => {
    const scoreA = a[1]?.adjustedAverage ?? a[1]?.average ?? 0
    const scoreB = b[1]?.adjustedAverage ?? b[1]?.average ?? 0
    if (scoreB !== scoreA) return scoreB - scoreA
    return (b[1]?.count ?? 0) - (a[1]?.count ?? 0)
  })

  const countAbove8 = sorted.filter(([_, stats]) => (stats?.adjustedAverage ?? stats?.average ?? 0) >= 8.00).length
  const limit = Math.min(10, Math.max(5, countAbove8))
  const displayBadges = sorted.slice(0, limit)

  return (
    <section className="taste-profile">
      <h2 className="taste-profile__title">{t('tasteProfile.title')}</h2>
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
              onClick={() => setSelectedModalGenre({ genre, stats })}
              style={{ cursor: 'pointer' }}>
              {genre} &#9733; {realAvg.toFixed(2)} ({count})
            </span>
          )
        })}
      </div>

      {selectedModalGenre && (
        <GenreOriginModal
          genre={selectedModalGenre.genre}
          stats={selectedModalGenre.stats}
          onClose={() => setSelectedModalGenre(null)}
          onFilterGenre={onGenreClick}
        />
      )}
    </section>
  )
}
