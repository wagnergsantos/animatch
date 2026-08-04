import React from 'react'
import './GenreBarChart.css'

export default function GenreBarChart({ data = [], onClickGenre }) {
  const max = data.length > 0 ? Math.max(...data.map((d) => d.count)) : 0
  return (
    <div className="genre-bar-chart">
      <h3>Gêneros</h3>
      <ul className="genre-list">
        {data.map((d) => (
          <li key={d.genre} className="genre-row" role="button" tabIndex={0}
            onClick={() => onClickGenre && onClickGenre(d.genre)}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onClickGenre) { e.preventDefault(); onClickGenre(d.genre) } }}
          >
            <div className="genre-label">{d.genre}</div>
            <div className="genre-bar-wrap">
              <div className="genre-bar" style={{ width: `${max > 0 ? (d.count / max) * 100 : 0}%` }} />
            </div>
            <div className="genre-count">{d.count}</div>
          </li>
        ))}
        {data.length === 0 && <li className="empty">Sem dados</li>}
      </ul>
    </div>
  )
}
