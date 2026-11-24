import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import BadgeIcon from './BadgeIcon.jsx'

describe('BadgeIcon', () => {
  it('renders line SVGs for all badge types', () => {
    const types = ['topMatch', 'ACCLAIMED', 'STRONG_CONSENSUS', 'DISCOVERY', 'PERSONAL_BET', 'COMMUNITY']

    types.forEach((type) => {
      const { container } = render(<BadgeIcon type={type} />)
      const svg = container.querySelector('svg')
      expect(svg).toBeInTheDocument()
      expect(svg).toHaveAttribute('aria-hidden', 'true')
      expect(svg).toHaveAttribute('fill', 'none')
      expect(svg).toHaveAttribute('stroke', 'currentColor')
    })
  })

  it('renders default star SVG for unknown type', () => {
    const { container } = render(<BadgeIcon type="unknown" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})
