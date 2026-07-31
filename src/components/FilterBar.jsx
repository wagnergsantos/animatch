import './FilterBar.css'

const FORMATS = [
  { id: 'ALL', label: 'Todos os Estilos' },
  { id: 'TV', label: 'Séries (TV)' },
  { id: 'MOVIE', label: 'Filmes' },
  { id: 'OVA', label: 'OVAs' },
  { id: 'ONA', label: 'ONAs' },
  { id: 'SPECIAL', label: 'Especiais' },
]

export default function FilterBar({ selectedFormat, onSelectFormat }) {
  return (
    <div className="filter-bar">
      {FORMATS.map((fmt) => (
        <button
          key={fmt.id}
          className={`filter-bar__btn ${selectedFormat === fmt.id ? 'filter-bar__btn--active' : ''}`}
          onClick={() => onSelectFormat(fmt.id)}
        >
          {fmt.label}
        </button>
      ))}
    </div>
  )
}
