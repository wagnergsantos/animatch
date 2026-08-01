import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SettingsMenu from './SettingsMenu.jsx'

describe('SettingsMenu', () => {
  it('renders a gear button and keeps the panel hidden until clicked', () => {
    render(<SettingsMenu favoriteDub="nenhuma" onChangeFavoriteDub={() => {}} />)
    expect(screen.getByRole('button', { name: /configurações/i })).toBeInTheDocument()
    expect(screen.queryByLabelText(/dublagem favorita/i)).not.toBeInTheDocument()
  })

  it('opens the settings panel when the gear button is clicked', () => {
    render(<SettingsMenu favoriteDub="nenhuma" onChangeFavoriteDub={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    expect(screen.getByLabelText(/dublagem favorita/i)).toBeInTheDocument()
  })

  it('shows the current favoriteDub value as the selected option', () => {
    render(<SettingsMenu favoriteDub="ja" onChangeFavoriteDub={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    expect(screen.getByLabelText(/dublagem favorita/i).value).toBe('ja')
  })

  it('calls onChangeFavoriteDub with the new value when an option is selected', () => {
    const onChange = vi.fn()
    render(<SettingsMenu favoriteDub="nenhuma" onChangeFavoriteDub={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    fireEvent.change(screen.getByLabelText(/dublagem favorita/i), { target: { value: 'en' } })
    expect(onChange).toHaveBeenCalledWith('en')
  })

  it('closes the panel automatically after an option is selected', () => {
    const onChange = vi.fn()
    render(<SettingsMenu favoriteDub="nenhuma" onChangeFavoriteDub={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    fireEvent.change(screen.getByLabelText(/dublagem favorita/i), { target: { value: 'en' } })
    expect(onChange).toHaveBeenCalledWith('en')
    expect(screen.queryByLabelText(/dublagem favorita/i)).not.toBeInTheDocument()
  })

  it('renders all 9 dub options (including "Nenhuma") in a fixed order', () => {
    render(<SettingsMenu favoriteDub="nenhuma" onChangeFavoriteDub={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /configurações/i }))
    const select = screen.getByLabelText(/dublagem favorita/i)
    const values = Array.from(select.querySelectorAll('option')).map((opt) => opt.value)
    expect(values).toEqual(['nenhuma', 'pt-br', 'en', 'ja', 'es', 'de', 'ko', 'fr', 'it'])
  })
})
