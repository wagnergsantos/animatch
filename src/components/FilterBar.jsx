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

export default function FilterBar({ selectedGenre, onSelectGenre }) {
  return (
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
  )
}
