import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SettingsMenu from './SettingsMenu.jsx'

describe('SettingsMenu', () => {

  it('renders sync button text based on provider', () => {
    const onRefresh = vi.fn()
    const { rerender } = render(<SettingsMenu provider="anilist" isLoading={false} onRefresh={onRefresh} />)
    fireEvent.click(screen.getByRole('button', { name: /Configura/i }))
    expect(screen.getByRole('button', { name: /Sincronizar AniList/i })).toBeInTheDocument()

    rerender(<SettingsMenu provider="kitsu" isLoading={false} onRefresh={onRefresh} />)
    expect(screen.getByRole('button', { name: /Sincronizar Kitsu/i })).toBeInTheDocument()
    
    rerender(<SettingsMenu provider="kitsu" isLoading={true} onRefresh={onRefresh} />)
    expect(screen.getByRole('button', { name: /Sincronizando com Kitsu/i })).toBeInTheDocument()
  })

  it('renders a gear button and keeps the panel hidden until clicked', () => {
    render(<SettingsMenu />)
    expect(screen.getByRole('button', { name: /configurações/i })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the settings panel when the gear button is clicked', () => {
    render(<SettingsMenu />)
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
