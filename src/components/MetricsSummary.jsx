import React from 'react'
import styles from './MetricsSummary.module.css'

export default function MetricsSummary({ summary = {} }) {
  return (
    <div className={styles['metrics-summary']}>
      <h3>Resumo</h3>
      <div className={styles['metrics-grid']}>
        <div className={styles.metric}>
          <div className={styles['metric-value']}>{summary.uniqueMedia ?? 0}</div>
          <div className={styles['metric-label']}>Mídias únicas</div>
        </div>
        <div className={styles.metric}>
          <div className={styles['metric-value']}>{summary.totalSeen ?? 0}</div>
          <div className={styles['metric-label']}>Vistos (COMPLETED)</div>
        </div>
        <div className={styles.metric}>
          <div className={styles['metric-value']}>{summary.totalEpisodes ?? 0}</div>
          <div className={styles['metric-label']}>Episódios totais</div>
        </div>
        <div className={styles.metric}>
          <div className={styles['metric-value']}>{summary.recomputes?.count ?? 0}</div>
          <div className={styles['metric-label']}>Recomputes</div>
        </div>
      </div>
    </div>
  )
}
