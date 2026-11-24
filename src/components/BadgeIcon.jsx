/**
 * Ícones vetoriais de linha para os badges do AniMatch
 * Mantém consistência visual entre Landing Page e Tela de Recomendações
 */
export default function BadgeIcon({ type, className = '', size = 14 }) {
  const iconProps = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: '2',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': 'true',
  }

  switch (type) {
    case 'topMatch':
    case 'TOP_MATCH':
    case 'EXCELLENT':
    case 'star':
      // Estrela de linha nítida
      return (
        <svg {...iconProps}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )

    case 'ACCLAIMED':
    case 'diamond':
    case 'gem':
      // Diamante de linha (estilo gema lapidada)
      return (
        <svg {...iconProps}>
          <path d="M6 3h12l4 7-10 11L2 10l4-7z" />
          <path d="M2 10h20" />
          <path d="m7.5 3 4.5 7 4.5-7" />
          <path d="M12 21 7.5 10" />
          <path d="m12 21 4.5-11" />
        </svg>
      )

    case 'STRONG_CONSENSUS':
    case 'flame':
    case 'fire':
      // Chama de linha
      return (
        <svg {...iconProps}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z" />
        </svg>
      )

    case 'DISCOVERY':
    case 'compass':
      // Bússola de linha
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      )

    case 'PERSONAL_BET':
    case 'flask':
      // Frasco laboratorial de linha
      return (
        <svg {...iconProps}>
          <path d="M10 2v7.31L4.69 19.46A2 2 0 0 0 6.44 22h11.12a2 2 0 0 0 1.75-2.54L14 9.31V2" />
          <path d="M8.5 2h7" />
          <path d="M14 9.3h-4" />
        </svg>
      )

    case 'COMMUNITY':
    case 'globe':
      // Globo terrestre de linha
      return (
        <svg {...iconProps}>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      )

    default:
      return (
        <svg {...iconProps}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      )
  }
}
