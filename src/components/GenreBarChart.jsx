import React from 'react'
import styles from './GenreBarChart.module.css'

export default function GenreBarChart({ data = [], onClickGenre }) {
  const max = data.length > 0 ? Math.max(...data.map((d) => d.count)) : 0
  return (
    <div className={styles['genre-bar-chart']}>
      <h3>Gêneros</h3>
      <ul className={styles['genre-list']}>
        {data.map((d) => (
          <li key={d.genre} className={styles['genre-row']} role="button" tabIndex={0}
            onClick={() => onClickGenre && onClickGenre(d.genre)}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && onClickGenre) { e.preventDefault(); onClickGenre(d.genre) } }}
          >
            <div className={styles['genre-label']}>{d.genre}</div>
            <div className={styles['genre-bar-wrap']}>
              <div className={styles['genre-bar']} style={{ width: `${max > 0 ? (d.count / max) * 100 : 0}%` }} />
            </div>
            <div className={styles['genre-count']}>{d.count}</div>
          </li>
        ))}
        {data.length === 0 && <li className={styles.empty}>Sem dados</li>}
      </ul>
    </div>
  )
}
