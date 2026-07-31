import './FilterBar.css'

const MAIN_GENRES = [
  { id: 'ALL', label: 'Todos os Gêneros' },
  { id: 'Action', label: 'Ação' },
  { id: 'Adventure', label: 'Aventura' },
  { id: 'Comedy', label: 'Comédia' },
  { id: 'Drama', label: 'Drama' },
  { id: 'Fantasy', label: 'Fantasia' },
  { id: 'Romance', label: 'Romance' },
  { id: 'Sci-Fi', label: 'Ficção' },
  { id: 'Slice of Life', label: 'Slice of Life' },
]

const FORMATS = [
  { id: 'ALL', label: 'Todos Formatos' },
  { id: 'TV', label: 'TV' },
  { id: 'MOVIE', label: 'Filmes' },
  { id: 'OVA', label: 'OVA' },
  { id: 'ONA', label: 'ONA' },
  { id: 'SPECIAL', label: 'Especial' },
]

const SORT_OPTIONS = [
  { id: 'predicted', label: 'Predicted Score' },
  { id: 'community', label: 'Nota Comunitária' },
  { id: 'title', label: 'Título (A-Z)' },
]

export default function FilterBar({
  selectedGenre = 'ALL',
  onSelectGenre,
  searchQuery = '',
  onSearchChange,
  selectedFormat = 'ALL',
  onSelectFormat,
  sortBy = 'predicted',
  onSortChange,
  onExportCSV,
}) {
  return (
    <div className="filter-container">
      <div className="filter-controls">
        <div className="filter-controls__group">
          <input
            type="text"
            className="filter-search"
            placeholder="🔍 Buscar por nome..."
            value={searchQuery}
            onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
          />

          {onSelectFormat && (
            <select
              className="filter-select"
              value={selectedFormat}
              onChange={(e) => onSelectFormat(e.target.value)}
            >
              {FORMATS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          )}

          {onSortChange && (
            <select
              className="filter-select"
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  Ordenar: {s.label}
                </option>
              ))}
            </select>
          )}
        </div>

        {onExportCSV && (
          <button className="export-csv-btn" onClick={onExportCSV} title="Exportar recomendações em CSV">
            📥 Exportar CSV
          </button>
        )}
      </div>

      <div className="filter-bar">
        {MAIN_GENRES.map((genre) => (
          <button
            key={genre.id}
            className={`filter-bar__btn ${selectedGenre === genre.id ? 'filter-bar__btn--active' : ''}`}
            onClick={() => onSelectGenre(genre.id)}
          >
            {genre.label}
          </button>
        ))}
      </div>
    </div>
  )
}
